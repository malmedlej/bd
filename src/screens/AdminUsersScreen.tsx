import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Shield, UserCog, Users } from 'lucide-react';
import { Profile, Role } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';

const ROLES: Role[] = ['admin', 'director', 'manager', 'employee'];

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

  const isAdmin = profile?.role === 'admin';

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
    admins: profiles.filter((p) => p.role === 'admin').length,
  }), [profiles]);

  const updateProfile = async (target: Profile, patch: Partial<Pick<Profile, 'role' | 'is_active'>>) => {
    if (!isAdmin) return;

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

  if (!isAdmin) {
    return (
      <div className="w-full px-4 py-5 lg:px-6">
        <div className="max-w-3xl rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <h1 className="font-bold text-amber-950">Admin access required</h1>
              <p className="mt-1 text-sm text-amber-800">Only admins can manage user profiles and roles.</p>
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
            <div className="section-title">Admin</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage existing BD Pulse profiles, roles, and active status. Auth user invitations must be handled outside the frontend.
            </p>
          </div>
          <button onClick={loadProfiles} className="btn-secondary w-full lg:w-auto">
            Refresh
          </button>
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
                <div className="text-2xl font-black text-slate-900">{stats.admins}</div>
                <div className="text-xs font-semibold text-slate-500">Admins</div>
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

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <UserCog className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div className="text-sm text-blue-950">
              <div className="font-bold">Auth user creation</div>
              <p className="mt-1 text-blue-800">
                The frontend uses the Supabase anon key and cannot securely create Auth users. Invite or create users in Supabase Dashboard, then create or update the matching profile row here.
              </p>
            </div>
          </div>
        </div>

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
    </div>
  );
}
