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

// Postgres unique_violation
const UNIQUE_VIOLATION = '23505';

export function CreateUserModal({ onClose, onCreated }: CreateUserModalProps) {
  useBodyScrollLock();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [department, setDepartment] = useState('Business Development');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const validate = (): string | null => {
    if (!fullName.trim()) return 'Full name is required.';
    if (!username.trim()) return 'Username is required.';
    if (!pin || pin.length < 4) return 'PIN / password must be at least 4 characters.';
    if (!ROLES.includes(role)) return 'Role is required.';
    return null;
  };

  const handleCreate = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    setError('');

    try {
      // This is a simple internal tool: users are created directly as rows
      // in app_users using the public anon key -- no Supabase Auth account,
      // no Edge Function, no service role key involved.
      const { error: insertError } = await supabase.from('app_users').insert({
        full_name: fullName.trim(),
        username: username.trim(),
        pin,
        role,
        department: department.trim() || 'Business Development',
        is_active: isActive,
      });

      if (insertError) {
        if (insertError.code === UNIQUE_VIOLATION) {
          throw new Error('A user with this username already exists.');
        }
        throw new Error('Unable to create user.');
      }

      onCreated();
      onClose();
    } catch (e: unknown) {
      console.error('Unable to create user', e);
      setError(e instanceof Error ? e.message : 'Unable to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center overflow-hidden lg:items-center">
      <div className="absolute inset-0 bg-black/50 fade-in" onClick={onClose} />
      <div className="modal-sheet-fill relative bg-white w-full lg:max-w-lg lg:rounded-2xl rounded-t-2xl slide-up flex flex-col overflow-hidden">
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="flex-shrink-0 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-base">Create User</h2>
          <button onClick={onClose} className="min-h-11 min-w-11 p-2 rounded-xl hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-scroll flex-1 min-h-0 overflow-y-auto px-5 pt-4 pb-6 space-y-4">
          <div>
            <label className="label">Full Name <span className="text-red-400">*</span></label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
          </div>

          <div>
            <label className="label">Username <span className="text-red-400">*</span></label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. jane"
              autoCapitalize="none"
            />
          </div>

          <div>
            <label className="label">PIN / Password <span className="text-red-400">*</span></label>
            <input className="input" type="text" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="e.g. 1234" />
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

        <div
          className="flex-shrink-0 sticky bottom-0 z-10 bg-white px-5 py-4 border-t border-slate-100 flex gap-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancel</button>
          <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}
