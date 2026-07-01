import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import { AuthScreen } from './screens/AuthScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ActionsScreen } from './screens/ActionsScreen';
import { KPIsScreen } from './screens/KPIsScreen';
import { ManagerDashboard } from './screens/ManagerDashboard';
import { DirectorView } from './screens/DirectorView';
import { WeeklyCheckinWizard } from './screens/WeeklyCheckinWizard';
import { MilestonesScreen } from './screens/MilestonesScreen';
import { ShareOfWalletScreen } from './screens/ShareOfWalletScreen';
import { AlertsScreen } from './screens/AlertsScreen';
import { AdminUsersScreen } from './screens/AdminUsersScreen';
import { ActionUpdateModal } from './components/actions/ActionUpdateModal';
import { ActionDetailModal } from './components/actions/ActionDetailModal';
import { Screen, WeeklyAction } from './types';

const SCREEN_TITLES: Record<Screen, string> = {
  home:       'My Week',
  actions:    'Actions',
  kpis:       'KPI Tracker',
  checkin:    'Weekly Check-in',
  manager:    'Manager Dashboard',
  director:   'Executive View',
  milestones: 'Milestones',
  wallet:     'Share of Wallet',
  review:     'Monthly Review',
  activity:   'Activity Plan',
  alerts:     'Alerts',
  audit:      'Audit Trail',
  admin:      'User Management',
};

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const [screen, setScreen] = useState<Screen>('home');
  const [updateAction, setUpdateAction] = useState<WeeklyAction | null>(null);
  const [detailAction, setDetailAction] = useState<WeeklyAction | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);
  const role = profile?.role;

  useEffect(() => {
    if (role === 'director') setScreen('director');
  }, [role]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-slate-700 border-t-teal-500 rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Loading BD Pulse...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!profile) {
    return (
      <div
        className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-4"
        style={{
          paddingTop: 'calc(1rem + env(safe-area-inset-top))',
          paddingRight: 'calc(1rem + env(safe-area-inset-right))',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
          paddingLeft: 'calc(1rem + env(safe-area-inset-left))',
        }}
      >
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <div className="text-xs font-bold uppercase tracking-widest text-teal-600">BD Pulse</div>
          <h1 className="mt-2 text-xl font-bold text-slate-900">Profile setup required</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your sign-in worked, but no active BD Pulse profile is linked to {user.email ?? 'this account'}.
          </p>
          <p className="mt-2 text-sm text-slate-500">Please ask an administrator to create or activate your profile.</p>
          <button onClick={signOut} className="btn-primary mt-5 w-full">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const isDirector = profile.role === 'director';
  const isAdmin = profile.role === 'admin';
  const isManager = profile.role === 'admin' || profile.role === 'manager';

  const handleNavigate = (s: Screen) => {
    if (isDirector && s !== 'director' && s !== 'kpis' && s !== 'alerts') return;
    if (s === 'admin' && !isAdmin) return;
    setScreen(s);
  };

  const handleUpdateAction = (a: WeeklyAction) => {
    if (isDirector) return;
    setDetailAction(null);
    setUpdateAction(a);
  };

  const handleDetailAction = (a: WeeklyAction) => {
    setDetailAction(a);
  };

  const handleSaved = () => {
    setUpdateAction(null);
    refresh();
  };

  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return <HomeScreen key={refreshKey} onNavigate={handleNavigate} onUpdateAction={handleUpdateAction} onDetailAction={handleDetailAction} />;
      case 'actions':
        return <ActionsScreen key={refreshKey} onUpdateAction={handleUpdateAction} onDetailAction={handleDetailAction} onNavigate={handleNavigate} />;
      case 'kpis':
        return <KPIsScreen key={refreshKey} />;
      case 'checkin':
        return <WeeklyCheckinWizard onComplete={() => { setScreen('home'); refresh(); }} />;
      case 'manager':
        if (!isManager) return <HomeScreen key={refreshKey} onNavigate={handleNavigate} onUpdateAction={handleUpdateAction} onDetailAction={handleDetailAction} />;
        return <ManagerDashboard key={refreshKey} onUpdateAction={handleUpdateAction} />;
      case 'director':
        return <DirectorView key={refreshKey} />;
      case 'milestones':
        return <MilestonesScreen key={refreshKey} />;
      case 'wallet':
        return <ShareOfWalletScreen key={refreshKey} />;
      case 'alerts':
        return <AlertsScreen key={refreshKey} />;
      case 'admin':
        return <AdminUsersScreen key={refreshKey} />;
      default:
        return (
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <div className="text-3xl mb-2">🚧</div>
              <div className="font-semibold text-slate-700">Coming Soon</div>
              <div className="text-xs text-slate-400 mt-1">This section is not enabled yet.</div>
              <button onClick={() => setScreen('home')} className="btn-primary mt-4">Back to Home</button>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <AppLayout current={screen} onChange={handleNavigate} title={SCREEN_TITLES[screen]}>
        {renderScreen()}
      </AppLayout>

      {detailAction && !updateAction && (
        <ActionDetailModal
          action={detailAction}
          onClose={() => setDetailAction(null)}
          onUpdate={handleUpdateAction}
        />
      )}

      {updateAction && (
        <ActionUpdateModal
          action={updateAction}
          onClose={() => setUpdateAction(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
