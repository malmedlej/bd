import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';
import { ShareOfWallet } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { exportSowToCsv } from '../lib/csvExport';

const STATUS_COLORS: Record<string, string> = {
  'Growing':     'bg-emerald-50 text-emerald-700',
  'Flat':        'bg-slate-100 text-slate-600',
  'Declining':   'bg-red-50 text-red-700',
  'Opportunity': 'bg-teal-50 text-teal-700',
  'At Risk':     'bg-amber-50 text-amber-700',
};

function formatCurrency(n: number): string {
  if (n >= 1000000) return `SAR ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `SAR ${(n / 1000).toFixed(0)}K`;
  return `SAR ${n.toFixed(0)}`;
}

export function ShareOfWalletScreen() {
  const { profile } = useAuth();
  const isManager = profile?.role === 'admin' || profile?.role === 'manager';
  const [items, setItems] = useState<ShareOfWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setError('');
      const { data, error: err } = await supabase
        .from('share_of_wallet')
        .select('*, owner:profiles!share_of_wallet_owner_id_fkey(id, full_name)')
        .order('spend_2026_ytd', { ascending: false });
      if (err) {
        console.error('Unable to load share of wallet', err);
        setError('Unable to load share of wallet');
        setItems([]);
        setLoading(false);
        return;
      }
      setItems((data ?? []) as ShareOfWallet[]);
      setLoading(false);
    })();
  }, []);

  const totals = items.reduce((acc, i) => ({
    spend2025: acc.spend2025 + i.spend_2025,
    spend2026: acc.spend2026 + i.spend_2026_ytd,
  }), { spend2025: 0, spend2026: 0 });

  const totalGrowth = totals.spend2026 - totals.spend2025;
  const totalGrowthPct = totals.spend2025 > 0 ? (totalGrowth / totals.spend2025) * 100 : 0;

  if (loading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 space-y-4 lg:px-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-slate-900 text-lg">Share of Wallet</h1>
          <p className="text-xs text-slate-500">{items.length} clients tracked</p>
        </div>
        {isManager && (
          <button onClick={() => exportSowToCsv(items)} className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Summary card */}
      {items.length > 0 && (
        <div className="card p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="text-xs text-slate-400 mb-2">Portfolio Growth Summary</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-sm font-bold">{formatCurrency(totals.spend2025)}</div>
              <div className="text-[10px] text-slate-400">2025 Baseline</div>
            </div>
            <div>
              <div className="text-sm font-bold">{formatCurrency(totals.spend2026)}</div>
              <div className="text-[10px] text-slate-400">2026 YTD</div>
            </div>
            <div>
              <div className={`text-sm font-bold ${totalGrowthPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalGrowthPct >= 0 ? '+' : ''}{totalGrowthPct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-400">Growth</div>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No clients tracked" description="Share of Wallet data tracks growth per client." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {items.map(item => {
            const growth = item.spend_2026_ytd - item.spend_2025;
            const growthPct = item.spend_2025 > 0 ? (growth / item.spend_2025) * 100 : 0;
            const GrowthIcon = growthPct > 0 ? TrendingUp : growthPct < 0 ? TrendingDown : Minus;

            return (
              <div key={item.id} className="card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm">{item.client_name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] ?? STATUS_COLORS['Flat']}`}>
                    {item.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-slate-50 rounded-xl py-2">
                    <div className="text-xs font-bold text-slate-700">{formatCurrency(item.spend_2025)}</div>
                    <div className="text-[9px] text-slate-400">2025</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl py-2">
                    <div className="text-xs font-bold text-slate-700">{formatCurrency(item.spend_2026_ytd)}</div>
                    <div className="text-[9px] text-slate-400">2026 YTD</div>
                  </div>
                  <div className={`rounded-xl py-2 ${growthPct > 0 ? 'bg-emerald-50' : growthPct < 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <div className={`text-xs font-bold flex items-center justify-center gap-0.5 ${growthPct > 0 ? 'text-emerald-700' : growthPct < 0 ? 'text-red-700' : 'text-slate-500'}`}>
                      <GrowthIcon className="w-3 h-3" />
                      {growthPct >= 0 ? '+' : ''}{growthPct.toFixed(1)}%
                    </div>
                    <div className="text-[9px] text-slate-400">Growth</div>
                  </div>
                </div>

                {item.opportunity_identified && (
                  <div className="text-xs text-slate-500 mb-1">
                    <span className="font-medium text-slate-700">Opportunity:</span> {item.opportunity_identified}
                  </div>
                )}
                {item.next_action && (
                  <div className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">Next:</span> {item.next_action}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
