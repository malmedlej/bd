import { useState } from 'react';
import { X } from 'lucide-react';
import { Role } from '../../types';
import { supabase } from '../../lib/supabase';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface CreateUserModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const ROLES: Role[] = ['owner', 'manager', 'member'];

function roleLabel(role: Role) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

const ERROR_MESSAGES: Record<string, string> = {
  not_owner: 'Only owners can create users.',
  not_authenticated: 'Your session has expired. Please sign in again.',
  email_exists: 'A user with this email already exists.',
  full_name_required: 'Full name is required.',
  email_required: 'Email is required.',
  password_invalid: 'Temporary password must be at least 8 characters.',
  role_invalid: 'Role must be owner, manager, or member.',
  server_misconfigured: 'Server is misconfigured. Contact an administrator.',
  profile_upsert_failed: 'User was created but the profile could not be saved. Contact an administrator.',
  invalid_json: 'Unable to create user (bad request).',
  method_not_allowed: 'Unable to create user (bad request).',
};

// supabase-js wraps non-2xx Edge Function responses in a generic
// FunctionsHttpError whose .message is just "Edge Function returned a
// non-2xx status code" — the real { error: "..." } body only lives on
// error.context (the raw Response), so it has to be parsed out manually.
async function extractEdgeFunctionError(fnError: unknown): Promise<string> {
  if (fnError && typeof fnError === 'object' && 'context' in fnError) {
    const context = (fnError as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const body = await context.clone().json();
        if (body && typeof body.error === 'string') return body.error;
      } catch {
        // Response body wasn't JSON — fall through to the generic message.
      }
    }
  }
  return fnError instanceof Error ? fnError.message : 'Unable to create user';
}

export function CreateUserModal({ onClose, onCreated }: CreateUserModalProps) {
  useBodyScrollLock();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [department, setDepartment] = useState('Business Development');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const validate = (): string | null => {
    if (!fullName.trim()) return 'Full name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!password || password.length < 8) return 'Temporary password must be at least 8 characters.';
    if (!ROLES.includes(role)) return 'Role is required.';
    return null;
  };

  const handleCreate = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('admin-create-user', {
        body: {
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          role,
          department: department.trim() || 'Business Development',
          is_active: isActive,
        },
      });

      if (fnError) throw new Error(await extractEdgeFunctionError(fnError));
      if (data?.error) throw new Error(data.error);

      onCreated();
      onClose();
    } catch (e: unknown) {
      console.error('Unable to create user', e);
      const code = e instanceof Error ? e.message : 'unable_to_create_user';
      setError(ERROR_MESSAGES[code] ?? code);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden lg:items-center">
      <div className="absolute inset-0 bg-black/50 fade-in" onClick={onClose} />
      <div className="modal-sheet relative bg-white w-full lg:max-w-lg lg:rounded-2xl rounded-t-2xl slide-up overflow-hidden flex flex-col">
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-base">Create User</h2>
          <button onClick={onClose} className="min-h-11 min-w-11 p-2 rounded-xl hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-scroll flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="label">Full Name <span className="text-red-400">*</span></label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
          </div>

          <div>
            <label className="label">Email <span className="text-red-400">*</span></label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
          </div>

          <div>
            <label className="label">Temporary Password <span className="text-red-400">*</span></label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" />
          </div>

          <div>
            <label className="label">Role <span className="text-red-400">*</span></label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Department</label>
            <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Business Development" />
          </div>

          <label className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm font-semibold text-slate-700">Active</span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">{error}</div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-3"
             style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
          <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancel</button>
          <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}
