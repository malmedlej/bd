import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-slate-400" />
        </div>
      )}
      <h3 className="font-semibold text-slate-700 text-base">{title}</h3>
      {description && <p className="text-slate-400 text-sm mt-1 max-w-xs">{description}</p>}
      {action && (
        <button className="btn-primary mt-4" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
