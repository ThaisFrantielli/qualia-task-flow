import { useState, useMemo } from 'react';
import { 
  Bell, Check, Clock, AlertCircle, Info, CheckCircle, 
  Search, Trash2, CheckSquare, ClipboardCheck, 
  Ticket, ArrowRightLeft, AtSign, AlertTriangle, X, Zap, CheckCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { requiresAction } from '@/utils/notificationUtils';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

type NotificationTypeFilter = 'all' | 'task_assigned' | 'approval_request' | 'subtask_approved' | 'ticket_assigned' | 'ticket_created' | 'conversation_transfer' | 'mention' | 'system' | 'sla_warning' | 'task_completed' | 'ticket_urgent';
type PeriodFilter = 'all' | 'today' | 'week' | 'month';

const Notifications = () => {
  const { 
    notifications, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    deleteMultiple,
    markMultipleAsRead,
  } = useNotifications();
  const navigate = useNavigate();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<NotificationTypeFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);

    if (isNaN(time.getTime())) return 'Data inválida';

    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes} min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    return time.toLocaleDateString('pt-BR');
  };

  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <CheckSquare className="w-5 h-5 text-blue-500" />;
      case 'approval_request':
        return <ClipboardCheck className="w-5 h-5 text-amber-500" />;
      case 'subtask_approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'ticket_assigned':
      case 'ticket_created':
        return <Ticket className="w-5 h-5 text-purple-500" />;
      case 'ticket_urgent':
        return <Zap className="w-5 h-5 text-red-600" />;
      case 'ticket_resolved':
        return <CheckCheck className="w-5 h-5 text-green-600" />;
      case 'ticket_awaiting_department':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'conversation_transfer':
        return <ArrowRightLeft className="w-5 h-5 text-cyan-500" />;
      case 'task_completed':
      case 'subtask_completed':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'mention':
        return <AtSign className="w-5 h-5 text-pink-500" />;
      case 'due_today':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'overdue':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'sla_first_response_warning':
      case 'sla_resolution_warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-muted-foreground" />;
    }
  };

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let result = notifications.filter(n => !(n.data as any)?.archived);

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(query) || 
        n.message.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(n => n.type === typeFilter);
    }

    // Period filter
    if (periodFilter !== 'all') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      result = result.filter(n => {
        const notifDate = new Date(n.created_at);
        switch (periodFilter) {
          case 'today': return notifDate >= startOfDay;
          case 'week': return notifDate >= startOfWeek;
          case 'month': return notifDate >= startOfMonth;
          default: return true;
        }
      });
    }

    return result;
  }, [notifications, searchQuery, typeFilter, periodFilter]);

  const unreadNotifications = filteredNotifications.filter(n => !n.read);
  const actionRequiredNotifications = filteredNotifications.filter(n => requiresAction(n) && !n.read);

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleBatchMarkAsRead = async () => {
    if (selectedIds.size === 0) return;
    await markMultipleAsRead(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Deletar ${selectedIds.size} notificações?`)) return;
    await deleteMultiple(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  // Navigate to related item
  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    const data = notification.data as Record<string, any> | null;
    switch (notification.type) {
      case 'task_assigned':
      case 'task_completed':
        if (notification.task_id) navigate(`/tasks/${notification.task_id}`);
        break;
      case 'ticket_assigned':
      case 'ticket_created':
      case 'ticket_urgent':
      case 'ticket_resolved':
      case 'ticket_awaiting_department':
      case 'sla_first_response_warning':
      case 'sla_resolution_warning':
        if (data?.ticket_id) navigate(`/tickets?id=${data.ticket_id}`);
        else if (data?.atendimento_id) navigate(`/tickets?id=${data.atendimento_id}`);
        break;
      case 'conversation_transfer':
        if (data?.conversation_id) navigate(`/whatsapp?id=${data.conversation_id}`);
        break;
      case 'approval_request':
      case 'subtask_approved':
      case 'subtask_completed':
        if (data?.task_id) navigate(`/tasks/${data.task_id}`);
        else if (notification.task_id) navigate(`/tasks/${notification.task_id}`);
        break;
      case 'mention':
        if (data?.context_type === 'pos_venda' && data?.context_id) {
          navigate(`/tickets?id=${data.context_id}`);
        } else if (data?.task_id) {
          navigate(`/tasks/${data.task_id}`);
        }
        break;
    }
  };

  // Notification card component
  const NotificationCard = ({ notification, showCheckbox = false }: { notification: any; showCheckbox?: boolean }) => (
    <Card 
      className={cn(
        "transition-colors hover:bg-muted/50 cursor-pointer",
        !notification.read && "border-l-4 border-l-primary"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {showCheckbox && (
            <Checkbox
              checked={selectedIds.has(notification.id)}
              onCheckedChange={() => toggleSelect(notification.id)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
          )}
          <div 
            className="flex-1 flex items-start gap-3"
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="mt-0.5">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className={cn(
                  "text-base",
                  !notification.read && "font-semibold"
                )}>
                  {notification.title}
                </CardTitle>
                {requiresAction(notification) && (
                  <Badge variant="destructive" className="text-xs">
                    Ação necessária
                  </Badge>
                )}
                {!notification.read && (
                  <Badge variant="secondary" className="text-xs">
                    Nova
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                {notification.message}
              </CardDescription>
              <span className="text-xs text-muted-foreground/70 mt-2 block">
                {formatTimestamp(notification.created_at)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!notification.read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(notification.id);
                }}
                title="Marcar como lida"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                deleteNotification(notification.id);
              }}
              title="Deletar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );

  // Empty state component
  const EmptyState = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
    <div className="text-center py-12">
      <Icon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando notificações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Notificações</h1>
          <p className="text-muted-foreground">Acompanhe atualizações e ações necessárias</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={markAllAsRead} disabled={unreadNotifications.length === 0}>
            <Check className="w-4 h-4 mr-2" />
            Marcar todas como lidas
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredNotifications.length}</div>
            <p className="text-xs text-muted-foreground">Notificações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Não Lidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{unreadNotifications.length}</div>
            <p className="text-xs text-muted-foreground">Requerem atenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ação Necessária</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{actionRequiredNotifications.length}</div>
            <p className="text-xs text-muted-foreground">Requerem ação</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar notificações..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as NotificationTypeFilter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="task_assigned">Tarefas atribuídas</SelectItem>
            <SelectItem value="task_completed">Tarefas concluídas</SelectItem>
            <SelectItem value="approval_request">Aprovações</SelectItem>
            <SelectItem value="ticket_assigned">Tickets</SelectItem>
            <SelectItem value="ticket_urgent">Urgentes</SelectItem>
            <SelectItem value="sla_warning">Alertas SLA</SelectItem>
            <SelectItem value="conversation_transfer">Transferências</SelectItem>
            <SelectItem value="mention">Menções</SelectItem>
          </SelectContent>
        </Select>

        <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo período</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Batch Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <Checkbox
            checked={selectedIds.size === filteredNotifications.length}
            onCheckedChange={selectAll}
          />
          <span className="text-sm font-medium">{selectedIds.size} selecionadas</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={handleBatchMarkAsRead}>
            <Check className="h-4 w-4 mr-1" />
            Marcar como lidas
          </Button>
          <Button variant="outline" size="sm" onClick={handleBatchDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-1" />
            Deletar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Notifications List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todas ({filteredNotifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Não Lidas ({unreadNotifications.length})</TabsTrigger>
          <TabsTrigger value="action">Ação Necessária ({actionRequiredNotifications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {selectedIds.size === 0 && filteredNotifications.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox onCheckedChange={selectAll} />
              <span>Selecionar todas</span>
            </div>
          )}
          {filteredNotifications.length === 0 ? (
            <EmptyState 
              icon={Bell} 
              title="Nenhuma notificação" 
              description="Você está em dia com tudo!" 
            />
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationCard 
                key={notification.id} 
                notification={notification} 
                showCheckbox={selectedIds.size > 0}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-3">
          {unreadNotifications.length === 0 ? (
            <EmptyState 
              icon={CheckCircle} 
              title="Tudo em dia!" 
              description="Você não tem notificações não lidas." 
            />
          ) : (
            unreadNotifications.map((notification) => (
              <NotificationCard 
                key={notification.id} 
                notification={notification} 
                showCheckbox={selectedIds.size > 0}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="action" className="space-y-3">
          {actionRequiredNotifications.length === 0 ? (
            <EmptyState 
              icon={CheckCircle} 
              title="Nenhuma ação necessária!" 
              description="Você não tem notificações que requerem ação." 
            />
          ) : (
            actionRequiredNotifications.map((notification) => (
              <NotificationCard 
                key={notification.id} 
                notification={notification} 
                showCheckbox={selectedIds.size > 0}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notifications;
