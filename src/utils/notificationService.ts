import { supabase } from '@/integrations/supabase/client';

export type NotificationType = 
  | 'task_assigned'
  | 'approval_request'
  | 'subtask_approved'
  | 'ticket_assigned'
  | 'ticket_created'
  | 'conversation_transfer'
  | 'mention'
  | 'due_today'
  | 'overdue'
  | 'system';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  data?: Record<string, any>;
}

export const notificationService = {
  /**
   * Create a notification for a user
   */
  async create(params: CreateNotificationParams): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          task_id: params.taskId || null,
          data: params.data || null,
          read: false,
        });

      if (error) {
        console.error('Error creating notification:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error in notificationService.create:', err);
      return false;
    }
  },

  /**
   * Notify when a ticket is created from Central de Atendimento
   */
  async notifyTicketCreated(params: {
    assigneeId: string;
    ticketId: number;
    clientName: string;
    createdBy: string;
  }): Promise<boolean> {
    return this.create({
      userId: params.assigneeId,
      type: 'ticket_created',
      title: 'Novo ticket criado',
      message: `Um ticket foi criado para o cliente: ${params.clientName}`,
      data: {
        atendimento_id: params.ticketId,
        client_name: params.clientName,
        created_by: params.createdBy,
      },
    });
  },

  /**
   * Notify when a conversation is transferred to another agent
   */
  async notifyConversationTransfer(params: {
    toAgentId: string;
    fromAgentName: string;
    clientName: string;
    conversationId: string;
  }): Promise<boolean> {
    return this.create({
      userId: params.toAgentId,
      type: 'conversation_transfer',
      title: 'Conversa transferida',
      message: `${params.fromAgentName} transferiu uma conversa de ${params.clientName} para você`,
      data: {
        conversation_id: params.conversationId,
        client_name: params.clientName,
        from_agent: params.fromAgentName,
      },
    });
  },

  /**
   * Request browser notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }
    return await Notification.requestPermission();
  },

  /**
   * Show browser push notification
   */
  showBrowserNotification(title: string, options?: NotificationOptions): void {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    }
  },

  /**
   * Get notification icon based on type
   */
  getIconForType(type: string): string {
    const icons: Record<string, string> = {
      task_assigned: 'CheckSquare',
      approval_request: 'ClipboardCheck',
      subtask_approved: 'CheckCircle',
      ticket_assigned: 'Ticket',
      ticket_created: 'Plus',
      conversation_transfer: 'ArrowRightLeft',
      mention: 'AtSign',
      due_today: 'Clock',
      overdue: 'AlertTriangle',
      system: 'Bell',
    };
    return icons[type] || 'Bell';
  },

  /**
   * Get color for notification type
   */
  getColorForType(type: string): string {
    const colors: Record<string, string> = {
      task_assigned: 'text-blue-500',
      approval_request: 'text-amber-500',
      subtask_approved: 'text-green-500',
      ticket_assigned: 'text-purple-500',
      ticket_created: 'text-indigo-500',
      conversation_transfer: 'text-cyan-500',
      mention: 'text-pink-500',
      due_today: 'text-orange-500',
      overdue: 'text-red-500',
      system: 'text-muted-foreground',
    };
    return colors[type] || 'text-muted-foreground';
  },
};
