import { Bell, Check, CheckSquare, ClipboardCheck, CheckCircle, Ticket, ArrowRightLeft, AtSign, Clock, AlertTriangle, Trash2, Zap, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const NotificationCenter = () => {
  const { notifications, loading, markAsRead, markAllAsRead, unreadCount, deleteNotification } = useNotifications();
  const handleBellClick = async () => {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        await import('@/utils/notificationService').then(mod => mod.notificationService.requestPermission());
      }
    } catch (e) {
      console.warn('Erro ao solicitar permissão de notificações:', e);
    }
  };
  const navigate = useNavigate();

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <CheckSquare className="h-4 w-4 text-blue-500" />;
      case 'approval_request':
        return <ClipboardCheck className="h-4 w-4 text-amber-500" />;
      case 'subtask_approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ticket_assigned':
      case 'ticket_created':
        return <Ticket className="h-4 w-4 text-purple-500" />;
      case 'ticket_urgent':
        return <Zap className="h-4 w-4 text-red-600" />;
      case 'ticket_resolved':
        return <CheckCheck className="h-4 w-4 text-green-600" />;
      case 'ticket_awaiting_department':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'conversation_transfer':
        return <ArrowRightLeft className="h-4 w-4 text-cyan-500" />;
      case 'task_completed':
      case 'subtask_completed':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'mention':
        return <AtSign className="h-4 w-4 text-pink-500" />;
      case 'due_today':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'sla_first_response_warning':
      case 'sla_resolution_warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    const data = notification.data as Record<string, any> | null;
    switch (notification.type) {
      case 'task_assigned':
      case 'task_completed':
        if (notification.task_id) {
          navigate(`/tasks?taskId=${notification.task_id}`);
        }
        break;
      case 'ticket_assigned':
      case 'ticket_created':
      case 'ticket_urgent':
      case 'ticket_resolved':
      case 'ticket_awaiting_department':
      case 'sla_first_response_warning':
      case 'sla_resolution_warning':
        if (data?.ticket_id) {
          navigate(`/tickets?id=${data.ticket_id}`);
        } else if (data?.atendimento_id) {
          navigate(`/tickets?id=${data.atendimento_id}`);
        }
        break;
      case 'conversation_transfer':
        if (data?.conversation_id) {
          navigate(`/whatsapp?id=${data.conversation_id}`);
        }
        break;
      case 'approval_request':
      case 'subtask_approved':
      case 'subtask_completed':
        if (data?.task_id) {
          navigate(`/tasks?taskId=${data.task_id}`);
        } else if (notification.task_id) {
          navigate(`/tasks?taskId=${notification.task_id}`);
        }
        break;
      case 'mention':
        if (data?.context_type === 'pos_venda' && data?.context_id) {
          navigate(`/tickets?id=${data.context_id}`);
        } else if (data?.task_id) {
          navigate(`/tasks?taskId=${data.task_id}`);
        }
        break;
      default:
        navigate('/notifications');
    }
  };

  // Only show last 10 notifications in dropdown
  const recentNotifications = notifications.slice(0, 10);

  return (
    <Popover>
        <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" onClick={handleBellClick}>
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Notificações</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs h-auto p-1"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Marcar todas
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Carregando notificações...
                </div>
              ) : recentNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                </div>
              ) : (
                <>
                  {recentNotifications.map((notification: any) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-3 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors group",
                        !notification.read && "bg-primary/5"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getIconForType(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={cn(
                              "text-sm truncate",
                              !notification.read ? "font-semibold" : "font-medium"
                            )}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <span className="text-xs text-muted-foreground/70 mt-1 block">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </ScrollArea>
            {notifications.length > 10 && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => navigate('/notifications')}
                >
                  Ver todas as notificações ({notifications.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
