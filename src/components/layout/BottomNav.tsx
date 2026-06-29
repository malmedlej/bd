import { Home, CheckSquare, BarChart2, Users, LayoutDashboard, Bell, CalendarDays } from 'lucide-react';
import { Screen } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useAlerts } from '../../hooks/useAlerts';

interface BottomNavProps {
  current: Screen;
  onChange: (s: Screen) => void;
}

export function BottomNav({ current, onChange }: BottomNavProps) {
  const { profile } = useAuth();
  const { unreadCount } = useAlerts();

  const isManager = profile?.role === 'admin' || profile?.role === 'manager';
  const isDirector = profile?.role === 'director';

  const items = isDirector
    ? [
        { id: 'director' as Screen, label: 'Executive', icon: LayoutDashboard },
        { id: 'kpis' as Screen,     label: 'KPIs',      icon: BarChart2 },
        { id: 'alerts' as Screen,   label: 'Alerts',    icon: Bell, badge: unreadCount },
      ]
    : isManager
    ? [
        { id: 'home' as Screen,     label: 'Home',      icon: Home },
        { id: 'actions' as Screen,  label: 'Actions',   icon: CheckSquare },
        { id: 'kpis' as Screen,     label: 'KPIs',      icon: BarChart2 },
        { id: 'manager' as Screen,  label: 'Dashboard', icon: Users },
        { id: 'alerts' as Screen,   label: 'Alerts',    icon: Bell, badge: unreadCount },
      ]
    : [
        { id: 'home' as Screen,     label: 'Home',      icon: Home },
        { id: 'actions' as Screen,  label: 'Actions',   icon: CheckSquare },
        { id: 'checkin' as Screen,  label: 'Check-in',  icon: CalendarDays },
        { id: 'kpis' as Screen,     label: 'KPIs',      icon: BarChart2 },
        { id: 'alerts' as Screen,   label: 'Alerts',    icon: Bell, badge: unreadCount },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 lg:hidden"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-stretch">
        {items.map(({ id, label, icon: Icon, badge }) => {
          const active = current === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 relative transition-colors
                ${active ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium leading-none ${active ? 'text-teal-600' : ''}`}>{label}</span>
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-500 rounded-full" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
