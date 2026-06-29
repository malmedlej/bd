import { Bell, LogOut, Zap } from 'lucide-react';
import { Screen } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useAlerts } from '../../hooks/useAlerts';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: React.ReactNode;
  current: Screen;
  onChange: (s: Screen) => void;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
}

export function AppLayout({ children, current, onChange, title, subtitle, headerRight }: AppLayoutProps) {
  const { profile, signOut } = useAuth();
  const { unreadCount } = useAlerts();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <Sidebar current={current} onChange={onChange} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 flex-shrink-0 lg:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            {title && (
              <span className="font-bold text-slate-900 text-sm truncate max-w-[140px]">{title}</span>
            )}
          </div>

          <div className="hidden lg:block flex-1 min-w-0">
            {title && (
              <div>
                <h1 className="font-bold text-slate-900 text-lg leading-tight">{title}</h1>
                {subtitle && <p className="text-slate-500 text-xs">{subtitle}</p>}
              </div>
            )}
          </div>

          <div className="flex-1 lg:hidden" />

          <div className="flex items-center gap-2">
            {headerRight}
            <button
              onClick={() => onChange('alerts')}
              className="relative p-2 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {profile && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="hidden lg:flex p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav current={current} onChange={onChange} />
    </div>
  );
}
