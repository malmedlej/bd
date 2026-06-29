import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  color?: 'default' | 'teal' | 'amber' | 'red' | 'blue' | 'emerald';
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
  compact?: boolean;
}

const COLOR_MAP = {
  default: { bg: 'bg-white', icon: 'bg-slate-100 text-slate-500', val: 'text-slate-900' },
  teal:    { bg: 'bg-white', icon: 'bg-teal-50 text-teal-600',   val: 'text-teal-700' },
  amber:   { bg: 'bg-white', icon: 'bg-amber-50 text-amber-600', val: 'text-amber-700' },
  red:     { bg: 'bg-white', icon: 'bg-red-50 text-red-600',     val: 'text-red-700' },
  blue:    { bg: 'bg-white', icon: 'bg-blue-50 text-blue-600',   val: 'text-blue-700' },
  emerald: { bg: 'bg-white', icon: 'bg-emerald-50 text-emerald-600', val: 'text-emerald-700' },
};

export function StatCard({ label, value, icon: Icon, color = 'default', onClick, compact = false }: StatCardProps) {
  const cls = COLOR_MAP[color];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`card ${cls.bg} ${compact ? 'p-3' : 'p-4'} flex items-center gap-3 w-full text-left ${onClick ? 'card-hover active:scale-[0.98]' : ''}`}
      onClick={onClick}
    >
      {Icon && (
        <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-xl flex items-center justify-center flex-shrink-0 ${cls.icon}`}>
          <Icon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        </div>
      )}
      <div className="min-w-0">
        <div className={`font-bold leading-none ${compact ? 'text-xl' : 'text-2xl'} ${cls.val}`}>{value}</div>
        <div className={`text-slate-500 mt-0.5 truncate ${compact ? 'text-xs' : 'text-xs'}`}>{label}</div>
      </div>
    </Tag>
  );
}
