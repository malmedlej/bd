import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Alert } from '../types';
import { useAuth } from './useAuth';

export function useAlerts() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!profile) return;
    const { data, error: err } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (err) {
      console.error('Unable to load alerts', err);
      setError('Unable to load alerts');
      return;
    }
    const items = (data ?? []) as Alert[];
    setAlerts(items);
    setUnreadCount(items.filter((a) => !a.is_read).length);
    setError(null);
  }, [profile]);

  useEffect(() => { fetch(); }, [fetch]);

  const markRead = async (id: string) => {
    const { error: err } = await supabase.from('alerts').update({ is_read: true }).eq('id', id);
    if (err) {
      console.error('Unable to mark alert as read', err);
      setError('Unable to update alerts');
      return;
    }
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_read: true } : a));
    setUnreadCount((n) => Math.max(0, n - 1));
  };

  const markAllRead = async () => {
    if (!profile) return;
    const { error: err } = await supabase.from('alerts').update({ is_read: true }).eq('user_id', profile.id);
    if (err) {
      console.error('Unable to mark all alerts as read', err);
      setError('Unable to update alerts');
      return;
    }
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    setUnreadCount(0);
  };

  return { alerts, unreadCount, error, markRead, markAllRead, refetch: fetch };
}
