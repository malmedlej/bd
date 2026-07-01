import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Shield, UserPlus, Users } from 'lucide-react';
import { Profile, Role } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { CreateUserModal } from '../components/admin/CreateUserModal';

const ROLES: Role[] = ['owner', 'manager', 'member'];

function roleLabel(role: Role) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function AdminUsersScreen() {
  const { profile, refreshProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const isOwner = profile?.role === 'owner';

  const loadProfiles = async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (err) {
      console.error('Unable to load user profiles', err);
      setError('Unable to load user profiles');
      setProfiles([]);
      setLoading(false);
      return;
    }

    setProfiles((data ?? []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const stats = useMemo(() => ({
    total: profiles.length,
    active: profiles.filter((p) => p.is_active).length,
    owners: profiles.filter((p) => p.role === 'owner').length,
  }), [profiles]);

  const updateProfile = async (target: Profile, patch: Partial<Pick<Profile, 'role' | 'is_active'>>) => {
    if (!isOwner) return;

    setSavingId(target.id);
    setError('');
    setSuccess('');

    const { error: err } = await supabase
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', target.id);

    if (err) {
      console.error('Unable to update user profile', err);
      setError('Unable to update user profile');
      setSavingId(null);
      return;
    }

    setProfiles((current) => current.map((p) => p.id === target.id ? { ...p, ...patch } : p));
    if (target.id === profile?.id) await refreshProfile();
    setSuccess('Profile updated');
    setSavingId(null);
  };

  if (!isOwner) {
    return (
      <div className="w-full px-4 py-5 lg:px-6">
        <div className="max-w-3xl rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <h1 className="font-bold text-amber-950">Owner access required</h1>
              <p className="mt-1 text-sm text-amber-800">Only owners can manage user profiles and roles.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingState text="Loading user profiles..." />;

  return (
    <div className="w-full px-4 py-5 lg:px-6 fade-in">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="section-title">Owner</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage BD Pulse profiles, roles, and active status, or create new users below.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadProfiles} className="btn-secondary flex-1 lg:flex-none">
              Refresh
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex flex-1 items-center justify-center gap-1.5 lg:flex-none">
              <UserPlus className="h-4 w-4" />
              Create User
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-slate-400" />
              <div>
                <div className="text-2xl font-black text-slate-900">{stats.total}</div>
                <div className="text-xs font-semibold text-slate-500">Profiles</div>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <div className="text-2xl font-black text-slate-900">{stats.active}</div>
                <div className="text-xs font-semibold text-slate-500">Active</div>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-teal-600" />
              <div>
                <div className="text-2xl font-black text-slate-900">{stats.owners}</div>
                <div className="text-xs font-semibold text-slate-500">Owners</div>
              </div>
            </div>
          </div>
        </div>

        {(error || success) && (
          <div className={`rounded-xl border px-3 py-2 text-xs ${
            error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'
          }`}>
            {error || success}
          </div>
        )}

        {profiles.length === 0 ? (
          <EmptyState icon={Users} title="No profiles found" description="Create profiles linked to Supabase Auth users before assigning roles." />
        ) : (
          <div className="card overflow-hidden">
            <div className="hidden grid-cols-[minmax(220px,1fr)_180px_160px_120px] gap-3 border-b border-slate-100 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 lg:grid">
              <div>User</div>
              <div>Role</div>
              <div>Status</div>
              <div className="text-right">Updated</div>
            </div>
            <div className="divide-y divide-slate-100">
              {profiles.map((p) => (
                <div key={p.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(220px,1fr)_180px_160px_120px] lg:items-center">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{p.full_name || 'Unnamed user'}</div>
                    <div className="truncate text-xs text-slate-500">{p.email || 'No email on profile'}</div>
                    <div className="mt-1 truncate font-mono text-[10px] text-slate-400">{p.id}</div>
                  </div>

                  <label className="block">
                    <span className="label lg:hidden">Role</span>
                    <select
                      className="input-sm min-h-11"
                      value={p.role}
                      disabled={savingId === p.id}
                      onChange={(event) => updateProfile(p, { role: event.target.value as Role })}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>{roleLabel(role)}</option>
                      ))}
                    </select>
                  </label>

                  <label className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3">
                    <input
                      type="checkbox"
                      checked={p.is_active}
                      disabled={savingId === p.id}
                      onChange={(event) => updateProfile(p, { is_active: event.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm font-semibold text-slate-700">{p.is_active ? 'Active' : 'Inactive'}</span>
                  </label>

                  <div className="text-left text-xs text-slate-400 lg:text-right">
                    {p.updated_at ? new Date(p.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setSuccess('User created');
            loadProfiles();
          }}
        />
      )}
    </div>
  );
}
