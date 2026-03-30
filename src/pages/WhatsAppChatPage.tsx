import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, Clock, CheckCircle, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWhatsAppStats } from '@/hooks/useWhatsAppStats';

interface WhatsAppInstance {
  id: string;
  name: string;
  status: string;
  phone_number: string | null;
}

export default function WhatsAppChatPage() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { stats, loading: statsLoading } = useWhatsAppStats(selectedInstanceId || undefined);

  useEffect(() => {
    fetchInstances();

    // Real-time subscription for instance changes
    const channel = supabase
      .channel('whatsapp-instances-chat')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_instances' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setInstances(prev => [...prev, payload.new as WhatsAppInstance]);
          } else if (payload.eventType === 'UPDATE') {
            setInstances(prev => prev.map(i => i.id === payload.new.id ? payload.new as WhatsAppInstance : i));
          } else if (payload.eventType === 'DELETE') {
            setInstances(prev => prev.filter(i => i.id !== payload.old.id));
            if (selectedInstanceId === payload.old.id) {
              setSelectedInstanceId(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedInstanceId]);

  const fetchInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setInstances(data || []);

      // Auto-select first connected instance or first instance
      if (data && data.length > 0) {
        const connectedInstance = data.find(i => i.status === 'connected');
        setSelectedInstanceId(connectedInstance?.id || data[0].id);
      }
    } catch (error) {
      console.error('Error fetching instances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedInstance = instances.find(i => i.id === selectedInstanceId);
  const responseRate = stats.totalConversations > 0
    ? Math.round(((stats.totalConversations - stats.unreadMessages) / stats.totalConversations) * 100)
    : 0;

  const getInstanceColor = (id: string) => {
    const colors = [
      'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
      'bg-teal-500', 'bg-orange-500', 'bg-cyan-500', 'bg-rose-500'
    ];
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      connected: { label: 'Conectado', variant: 'default' as const, className: 'bg-green-500' },
      connecting: { label: 'Conectando', variant: 'secondary' as const, className: 'bg-yellow-500' },
      disconnected: { label: 'Desconectado', variant: 'destructive' as const, className: 'bg-red-500' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.disconnected;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            WhatsApp Chat Multi-Sessão
          </h1>
          <p className="text-muted-foreground">
            Gerencie conversas de múltiplas instâncias WhatsApp
          </p>
        </div>
      </div>

      {/* Instance Selector */}
      {instances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Selecionar Instância WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select value={selectedInstanceId || undefined} onValueChange={setSelectedInstanceId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Selecione uma instância" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map(instance => (
                    <SelectItem key={instance.id} value={instance.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getInstanceColor(instance.id)}`} />
                        <span>{instance.name}</span>
                        {instance.phone_number && (
                          <span className="text-xs text-muted-foreground">({instance.phone_number})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedInstance && (
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedInstance.status)}
                  {selectedInstance.phone_number && (
                    <span className="text-sm text-muted-foreground">
                      {selectedInstance.phone_number}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {instances.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma instância configurada</h3>
            <p className="text-muted-foreground mb-4">
              Configure uma instância WhatsApp para começar a usar o chat
            </p>
            <a
              href="/configuracoes/whatsapp"
              className="text-primary hover:underline"
            >
              Ir para Configuração WhatsApp →
            </a>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {selectedInstanceId && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Conversas</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats.totalConversations}</div>}
              <p className="text-xs text-muted-foreground">Dados em tempo real</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats.queueConversations}</div>}
              <p className="text-xs text-muted-foreground">Conversas em fila ativa</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mensagens Hoje</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats.todayMessages}</div>}
              <p className="text-xs text-muted-foreground">Atualizado automaticamente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Resposta</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{responseRate}%</div>}
              <p className="text-xs text-muted-foreground">Baseado em conversas sem pendências</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Componente legado descontinuado */}
      {selectedInstanceId && (
        <Card>
          <CardHeader>
            <CardTitle>Chat Unificado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Esta tela legada foi descontinuada. O atendimento oficial agora acontece na Central de Atendimento com o componente unificado.
            </p>
            <Button asChild>
              <a href="/atendimento-central?folder=whatsapp">Abrir Central de Atendimento</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}