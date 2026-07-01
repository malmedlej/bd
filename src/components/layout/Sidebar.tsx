import {
  Home, CheckSquare, BarChart2, Users, LayoutDashboard,
  Bell, CalendarDays, TrendingUp, BookOpen, Activity,
  LogOut, ChevronRight, Zap, Settings
} from 'lucide-react';
import { Screen } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useAlerts } from '../../hooks/useAlerts';

interface SidebarProps {
  current: Screen;
  onChange: (s: Screen) => void;
}

const MEMBER_ITEMS = [
  { id: 'home' as Screen,    label: 'My Week',     icon: Home },
  { id: 'actions' as Screen, label: 'My Actions',  icon: CheckSquare },
  { id: 'checkin' as Screen, label: 'Weekly Check-in', icon: CalendarDays },
  { id: 'kpis' as Screen,    label: 'KPIs',        icon: BarChart2 },
];

const MANAGER_ITEMS = [
  { id: 'home' as Screen,       label: 'My Week',        icon: Home },
  { id: 'actions' as Screen,    label: 'All Actions',    icon: CheckSquare },
  { id: 'kpis' as Screen,       label: 'KPI Tracker',    icon: BarChart2 },
  { id: 'manager' as Screen,    label: 'Manager Dashboard', icon: Users },
  { id: 'checkin' as Screen,    label: 'Check-ins',      icon: CalendarDays },
  { id: 'milestones' as Screen, label: 'Milestones',     icon: BookOpen },
  { id: 'wallet' as Screen,     label: 'Share of Wallet', icon: TrendingUp },
  { id: 'review' as Screen,     label: 'Monthly Review', icon: Activity },
  { id: 'director' as Screen,   label: 'Executive View', icon: LayoutDashboard },
];

const OWNER_ITEMS = [
  ...MANAGER_ITEMS,
  { id: 'admin' as Screen, label: 'User Management', icon: Settings },
];

export function Sidebar({ current, onChange }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const { unreadCount } = useAlerts();

  if (!profile) return null;

  const items = profile.role === 'owner'
    ? OWNER_ITEMS
    : profile.role === 'manager'
    ? MANAGER_ITEMS
    : MEMBER_ITEMS;

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-white h-screen sticky top-0 flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-teal-500 rounded-xl flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">BD Pulse</div>
            <div className="text-slate-400 text-[10px]">Command Center</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map(({ id, label, icon: Icon }) => {
          const active = current === id;
          const showBadge = id === 'alerts' && unreadCount > 0;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${active
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {showBadge && (
                <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </button>
          );
        })}

        <div className="pt-2 border-t border-slate-800 mt-2">
          <button
            onClick={() => onChange('alerts')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
              ${current === 'alerts' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Bell className="w-4 h-4" />
            <span className="flex-1 text-left">Alerts</span>
            {unreadCount > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800">
          <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate">{profile.full_name}</div>
            <div className="text-slate-400 text-[10px] capitalize">{profile.role}</div>
          </div>
          <button onClick={signOut} className="text-slate-500 hover:text-slate-300 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
