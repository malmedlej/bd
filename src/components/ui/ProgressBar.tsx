import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'teal' | 'blue' | 'amber' | 'red' | 'emerald';
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const COLOR_CLASSES = {
  teal:    'bg-teal-500',
  blue:    'bg-blue-500',
  amber:   'bg-amber-500',
  red:     'bg-red-500',
  emerald: 'bg-emerald-500',
};

export function ProgressBar({ value, max = 100, color = 'teal', size = 'sm', showLabel = false }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor = pct >= 80 ? 'emerald' : pct >= 50 ? color : pct >= 25 ? 'amber' : 'red';
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-slate-100 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className={`${heightClass} rounded-full transition-all duration-500 ${COLOR_CLASSES[barColor]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-slate-500 w-8 text-right">{Math.round(pct)}%</span>
      )}
    </div>
  );
}
