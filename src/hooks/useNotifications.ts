import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Notification } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/utils/notificationService';

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
        .order('created_at', { ascending: false })
        .limit(100);

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
      // notify other hook instances to refresh
      try { window.dispatchEvent(new CustomEvent('notifications:refresh')); } catch {}
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
      toast.success('Todas as notificações marcadas como lidas');
      // notify other hook instances to refresh
      try { window.dispatchEvent(new CustomEvent('notifications:refresh')); } catch {}
    } catch (err: any) {
      console.error('Erro ao marcar todas como lidas:', err);
      toast.error('Erro ao marcar todas como lidas');
    }
  }, [user?.id]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
      try { window.dispatchEvent(new CustomEvent('notifications:refresh')); } catch {}
    } catch (err: any) {
      console.error('Erro ao deletar notificação:', err);
      toast.error('Erro ao deletar notificação');
    }
  }, []);

  const deleteMultiple = useCallback(async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', ids);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      toast.success(`${ids.length} notificações deletadas`);
      try { window.dispatchEvent(new CustomEvent('notifications:refresh')); } catch {}
    } catch (err: any) {
      console.error('Erro ao deletar notificações:', err);
      toast.error('Erro ao deletar notificações');
    }
  }, []);

  const markMultipleAsRead = useCallback(async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', ids);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n)
      );
      toast.success(`${ids.length} notificações marcadas como lidas`);
      try { window.dispatchEvent(new CustomEvent('notifications:refresh')); } catch {}
    } catch (err: any) {
      console.error('Erro ao marcar notificações como lidas:', err);
      toast.error('Erro ao marcar notificações como lidas');
    }
  }, []);

  const updateNotification = useCallback(async (id: string, updates: Partial<Notification>) => {
    try {
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
      try { window.dispatchEvent(new CustomEvent('notifications:refresh')); } catch {}
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

  // Listen for cross-instance refresh events (triggered when another component updates notifications)
  useEffect(() => {
    const handler = () => fetchNotifications();
    window.addEventListener('notifications:refresh', handler as EventListener);
    return () => window.removeEventListener('notifications:refresh', handler as EventListener);
  }, [fetchNotifications]);

  // Real-time: subscribe to INSERT/UPDATE events
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`notifications:user=${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${user.id}` 
      }, (payload) => {
        try {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          
          // Show toast notification
          toast.info(newNotif.title, {
            description: newNotif.message,
            duration: 5000,
            action: {
              label: 'Ver',
              onClick: () => {
                markAsRead(newNotif.id);
                // Navigate to notifications page or related item
                window.location.href = '/notifications';
              },
            },
          });

          // Show browser push notification if permitted
          notificationService.showBrowserNotification(newNotif.title, {
            body: newNotif.message,
            tag: newNotif.id,
          });
        } catch (e) {
          console.warn('Erro processando notificação recebida via realtime (INSERT):', e);
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${user.id}` 
      }, (payload) => {
        try {
          const updated = payload.new as Notification;
          setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
        } catch (e) {
          console.warn('Erro processando notificação recebida via realtime (UPDATE):', e);
        }
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${user.id}` 
      }, (payload) => {
        try {
          const deleted = payload.old as { id: string };
          setNotifications(prev => prev.filter(n => n.id !== deleted.id));
        } catch (e) {
          console.warn('Erro processando notificação deletada via realtime:', e);
        }
      })
      .subscribe();

    // Browser permission is requested on user gesture (bell click) in NotificationCenter

    return () => {
      try { supabase.removeChannel(channel); } catch (e) { /* ignore */ }
    };
  }, [user?.id, markAsRead]);

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
    deleteNotification,
    deleteMultiple,
    markMultipleAsRead,
    refetch: fetchNotifications,
  };
}
