import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Notification } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setNotifications(data as Notification[] || []);
    } catch (err: any) {
      console.error('Erro ao buscar notificações:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (err: any) {
      console.error('Erro ao marcar notificação como lida:', err);
      toast.error('Erro ao marcar notificação como lida');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (updateError) {
        throw updateError;
      }

      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    } catch (err: any) {
      console.error('Erro ao marcar todas como lidas:', err);
      toast.error('Erro ao marcar todas como lidas');
    }
  }, [user?.id]);

  const updateNotification = useCallback(async (id: string, updates: Partial<Notification>) => {
    try {
      // attempt to merge data client-side if provided
      const existing = notifications.find(n => n.id === id);
      let mergedData = (existing && (existing.data as any)) || {};
      if (updates.data && typeof updates.data === 'object') {
        mergedData = { ...mergedData, ...(updates.data as any) };
      }

      const payload: any = { ...updates };
      if (Object.keys(mergedData).length > 0) payload.data = mergedData;

      const { data, error } = await supabase.from('notifications').update(payload).eq('id', id).single();
      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === id ? (data as Notification) : n));
      return data as Notification;
    } catch (err: any) {
      console.error('Erro atualizando notificação:', err);
      throw err;
    }
  }, [notifications]);

  const archiveNotification = useCallback(async (id: string) => {
    return updateNotification(id, { data: { archived: true } } as any);
  }, [updateNotification]);

  const setNotificationPriority = useCallback(async (id: string, priority: 'low' | 'normal' | 'high') => {
    return updateNotification(id, { data: { priority } } as any);
  }, [updateNotification]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time: inscrever em eventos de INSERT/UPDATE para a tabela de notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`public:notifications:user=${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        try {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
        } catch (e) {
          console.warn('Erro processando notificação recebida via realtime (INSERT):', e);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        try {
          const updated = payload.new as Notification;
          setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
        } catch (e) {
          console.warn('Erro processando notificação recebida via realtime (UPDATE):', e);
        }
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch (e) { /* ignore */ }
    };
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    unreadCount,
    updateNotification,
    archiveNotification,
    setNotificationPriority,
  };
}