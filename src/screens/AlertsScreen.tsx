import React from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useAlerts } from '../hooks/useAlerts';
import { EmptyState } from '../components/ui/EmptyState';

const ALERT_TYPE_ICONS: Record<string, string> = {
  overdue:      '🔴',
  blocked:      '🟠',
  due_today:    '📅',
  no_update:    '⏰',
  feedback:     '💬',
  support:      '🙋',
  kpi_off_track:'📉',
  checkin:      '✅',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AlertsScreen() {
  const { alerts, error, markRead, markAllRead } = useAlerts();
  const unread = alerts.filter(a => !a.is_read);

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-slate-900 text-lg">Alerts</h1>
          {unread.length > 0 && (
            <p className="text-xs text-slate-500">{unread.length} unread notification{unread.length > 1 ? 's' : ''}</p>
          )}
        </div>
        {unread.length > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-teal-600 font-semibold hover:underline"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No alerts"
          description="You're all caught up. Alerts about overdue tasks, feedback, and KPI status will appear here."
        />
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <button
              key={alert.id}
              onClick={() => !alert.is_read && markRead(alert.id)}
              className={`w-full text-left card p-4 flex items-start gap-3 transition-all
                ${!alert.is_read ? 'border-l-4 border-l-teal-400' : 'opacity-60'}`}
            >
              <div className="text-xl flex-shrink-0 mt-0.5">
                {ALERT_TYPE_ICONS[alert.alert_type] ?? '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${!alert.is_read ? 'text-slate-900' : 'text-slate-500'}`}>
                  {alert.title}
                </div>
                {alert.message && (
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{alert.message}</div>
                )}
                <div className="text-[10px] text-slate-400 mt-1">{timeAgo(alert.created_at)}</div>
              </div>
              {!alert.is_read && (
                <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-1.5" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
