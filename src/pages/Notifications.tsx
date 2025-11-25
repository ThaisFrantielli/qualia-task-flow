import { useEffect } from 'react';
import { Bell, Check, Clock, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { requiresAction } from '@/utils/notificationUtils';

import { useNotifications } from '@/hooks/useNotifications';


const Notifications = () => {
  const { notifications, loading, markAsRead, markAllAsRead, archiveNotification, setNotificationPriority } = useNotifications();

  useEffect(() => {
    // Effect can be added later if needed
  }, []);

  // Function to format timestamp (using created_at)
  const formatTimestamp = (timestamp: string) => { // Expecting string from DB
    const now = new Date();
    const time = new Date(timestamp); // Convert string to Date

    if (isNaN(time.getTime())) {
      return 'Data inválida';
    }

    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} min atrás`;
    } else if (hours < 24) {
      return `${hours}h atrás`;
    } else {
      return `${days}d atrás`;
    }
  };

  // Helper function to determine if a notification requires action
  // Based on your original code, you had actionRequired.
  // Since the column doesn't exist, we need another way to determine this.
  // For now, let's assume notifications of type 'warning' or 'error' require action.
  // ADJUST THIS LOGIC based on how you truly determine if a notification requires action.




  // Calculate unread and action required notifications based on actual data
  // Excluir notificações arquivadas da lista principal
  const visibleNotifications = notifications.filter(n => !(n.data as any)?.archived);
  const unreadNotifications = visibleNotifications.filter(n => !n.read);
  // Use the requiresAction helper
  const actionRequiredNotifications = visibleNotifications.filter(n => requiresAction(n) && !n.read);


  // ... (keep getNotificationIcon and getBadgeVariant functions as they were) ...
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };


  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando notificações...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notificações</h1>
          <p className="text-gray-600">Acompanhe atualizações e ações necessárias</p>
        </div>
        <div className="flex space-x-2">
          {/* Botões usam as funções do hook */}
          <Button variant="outline" onClick={markAllAsRead} disabled={notifications.length === 0}>
            <Check className="w-4 h-4 mr-2" />
            Marcar todas como lidas
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
            <p className="text-xs text-muted-foreground">Notificações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Não Lidas</CardTitle>
            {/* Usar ícone apropriado, talvez um olho ou um ponto */}
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{unreadNotifications.length}</div>
            <p className="text-xs text-muted-foreground">Requerem atenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ação Necessária</CardTitle>
            {/* Usar ícone apropriado, talvez um alerta */}
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{actionRequiredNotifications.length}</div>
            <p className="text-xs text-muted-foreground">Requerem ação</p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todas ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Não Lidas ({unreadNotifications.length})</TabsTrigger>
          <TabsTrigger value="action">Ação Necessária ({actionRequiredNotifications.length})</TabsTrigger>
        </TabsList>

        {/* Aba Todas */}
        <TabsContent value="all" className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma notificação</h3>
              <p className="text-gray-500">Você está em dia com tudo!</p>
            </div>
          ) : (
            visibleNotifications.map((notification) => (
              <Card key={notification.id} className={`${!notification.read ? 'border-l-4 border-l-blue-500' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-base">{notification.title}</CardTitle>
                          {/* Usar o helper requiresAction */}
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
                        <CardDescription className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(notification.created_at)} {/* Use created_at */}
                      </span>
                      {/* Botão Marcar como Lida usa a função do hook */}
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      {/* Priority selector */}
                      <select
                        value={(notification.data as any)?.priority || 'normal'}
                        onChange={async (e) => {
                          const v = e.target.value as 'low' | 'normal' | 'high';
                          try { await setNotificationPriority(notification.id, v); } catch (err) { console.warn(err); }
                        }}
                        className="text-xs border rounded px-2 py-1"
                      >
                        <option value="low">Baixa</option>
                        <option value="normal">Normal</option>
                        <option value="high">Alta</option>
                      </select>

                      {/* Archive button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!confirm('Arquivar esta notificação?')) return;
                          try { await archiveNotification(notification.id); } catch (err) { console.warn(err); }
                        }}
                      >
                        Arquivar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Aba Não Lidas */}
        <TabsContent value="unread" className="space-y-4">
          {unreadNotifications.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tudo em dia!</h3>
              <p className="text-gray-500">Você não tem notificações não lidas.</p>
            </div>
          ) : (
            unreadNotifications.map((notification) => (
              <Card key={notification.id} className="border-l-4 border-l-blue-500">
                {/* Same notification card content */}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-base">{notification.title}</CardTitle>
                          {/* Usar o helper requiresAction */}
                          {requiresAction(notification) && (
                            <Badge variant="destructive" className="text-xs">
                              Ação necessária
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            Nova
                          </Badge>
                        </div>
                        <CardDescription className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(notification.created_at)} {/* Use created_at */}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Aba Ação Necessária */}
        <TabsContent value="action" className="space-y-4">
          {actionRequiredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma ação necessária!</h3>
              <p className="text-gray-500">Você não tem notificações que requerem ação.</p>
            </div>
          ) : (
            actionRequiredNotifications.map((notification) => (
              <Card key={notification.id} className="border-l-4 border-l-red-500">
                {/* Mesmíssimo conteúdo do Card de Notificação */}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-base">{notification.title}</CardTitle>
                          <Badge variant="destructive" className="text-xs">
                            Ação necessária
                          </Badge>
                          {/* Manter badge "Nova" apenas se a notificação for nova E não lida */}
                          {!notification.read && (
                            <Badge variant="secondary" className="text-xs">
                              Nova
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(notification.created_at)} {/* Use created_at */}
                      </span>
                      {/* Botão Marcar como Lida usa a função do hook */}
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notifications;
