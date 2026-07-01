import { useEffect, useRef, useState } from 'react';
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
  const { user, profile, signOut } = useAuth();
  const { unreadCount } = useAlerts();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = (profile?.full_name || user?.email || 'BD')
    .split(/[ @.]+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
  };

  return (
    <div className="app-shell flex overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <Sidebar current={current} onChange={onChange} />

      {/* Main content */}
      <div className="safe-area-x flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-100 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 flex items-center gap-3 flex-shrink-0 lg:px-6">
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
              className="relative min-h-11 min-w-11 p-2 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors"
              aria-label="Open alerts"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {profile && (
              <div className="relative flex items-center gap-2" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="w-11 h-11 bg-teal-600 rounded-full flex items-center justify-center transition-all hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Open account menu"
                >
                  <span className="text-white text-xs font-bold">
                    {initials}
                  </span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="hidden lg:flex min-h-11 min-w-11 p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-100 bg-white p-3 shadow-2xl scale-in"
                  >
                    <div className="px-3 py-2">
                      <div className="text-sm font-bold text-slate-900 truncate">{profile.full_name || 'BD Pulse User'}</div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{profile.email || user?.email || 'Email unavailable'}</div>
                      <div className="mt-2 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-teal-700">
                        {profile.role || 'User'}
                      </div>
                    </div>
                    <div className="my-2 h-px bg-slate-100" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto overscroll-contain pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav current={current} onChange={onChange} />
    </div>
  );
}
