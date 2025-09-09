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

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    unreadCount,
  };
}