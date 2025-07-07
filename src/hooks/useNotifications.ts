
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Notification = Database['public']['Tables']['notifications']['Row'];

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
      await fetchNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao marcar notificação como lida');
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (error) throw error;
      await fetchNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao marcar todas como lidas');
    }
  };

  const createNotification = async (notification: {
    user_id: string;
    task_id?: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert(notification);

      if (error) throw error;
      
      // Show toast notification
      toast.success(notification.title, {
        description: notification.message,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar notificação');
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          
          // Show toast for new notification
          toast.info(newNotification.title, {
            description: newNotification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    createNotification,
    refetch: fetchNotifications,
    unreadCount: notifications.filter(n => !n.read).length
  };
};
