import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Alert } from '../types';
import { useAuth } from './useAuth';

export function useAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data, error: err } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (err) {
      setError(err.message);
      return;
    }
    const items = (data ?? []) as Alert[];
    setAlerts(items);
    setUnreadCount(items.filter((a) => !a.is_read).length);
    setError(null);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const markRead = async (id: string) => {
    const { error: err } = await supabase.from('alerts').update({ is_read: true }).eq('id', id);
    if (err) {
      setError(err.message);
      return;
    }
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_read: true } : a));
    setUnreadCount((n) => Math.max(0, n - 1));
  };

  const markAllRead = async () => {
    if (!user) return;
    const { error: err } = await supabase.from('alerts').update({ is_read: true }).eq('user_id', user.id);
    if (err) {
      setError(err.message);
      return;
    }
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    setUnreadCount(0);
  };

  return { alerts, unreadCount, error, markRead, markAllRead, refetch: fetch };
}
