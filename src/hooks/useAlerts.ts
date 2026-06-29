import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Alert } from '../types';
import { useAuth } from './useAuth';

export function useAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    const items = (data ?? []) as Alert[];
    setAlerts(items);
    setUnreadCount(items.filter((a) => !a.is_read).length);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const markRead = async (id: string) => {
    await supabase.from('alerts').update({ is_read: true }).eq('id', id);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_read: true } : a));
    setUnreadCount((n) => Math.max(0, n - 1));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('alerts').update({ is_read: true }).eq('user_id', user.id);
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    setUnreadCount(0);
  };

  return { alerts, unreadCount, markRead, markAllRead, refetch: fetch };
}
