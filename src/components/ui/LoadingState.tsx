import React from 'react';

export function LoadingState({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
      <div className="h-3 bg-slate-100 rounded w-1/2 mb-2" />
      <div className="h-1.5 bg-slate-100 rounded w-full mt-3" />
    </div>
  );
}
