import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import { useWhatsAppStats } from '@/hooks/useWhatsAppStats';
import { useWhatsAppAgents } from '@/hooks/useWhatsAppAgents';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import WhatsAppChatPanel from '@/components/whatsapp/WhatsAppChatPanel';
import WhatsAppAgentPanel from '@/components/whatsapp/WhatsAppAgentPanel';
import { AgentStatusSelector } from '@/components/presence/AgentStatusSelector';
import { AtendimentoQueue, WhatsAppConversation } from '@/components/atendimento/AtendimentoQueue';
import { AtendimentoActions } from '@/components/atendimento/AtendimentoActions';
import { AtendimentoFilters } from '@/components/atendimento/AtendimentoFilters';
import {
  MessageSquare,
  Users,
  Clock,
  Inbox,
  Search,
  Smartphone,
  Bell,
  Settings,
  RefreshCw,
  Headphones,
  UserCheck
} from 'lucide-react';

interface WhatsAppInstance {
  id: string;
  name: string;
  status: string;
  phone_number: string | null;
}

export default function AtendimentoCentralPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  const urlClienteId = searchParams.get('cliente_id');
  const urlTelefone = searchParams.get('telefone');
  
  // State
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'queue' | 'mine' | 'unread'>('all');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isLoadingInstances, setIsLoadingInstances] = useState(true);
  const [pendingAutoOpen, setPendingAutoOpen] = useState<{clienteId: string; telefone: string} | null>(
    urlClienteId && urlTelefone ? { clienteId: urlClienteId, telefone: urlTelefone } : null
  );

  // Hooks - use first selected instance or null for all
  const effectiveInstanceId = selectedInstanceIds.length === 1 ? selectedInstanceIds[0] : (selectedInstanceId || undefined);
  const { conversations, loading: convLoading, refetch: refetchConversations } = useWhatsAppConversations(undefined, effectiveInstanceId);
  const { stats, loading: statsLoading, refetch: refetchStats } = useWhatsAppStats(effectiveInstanceId);
  const { agents, loading: agentsLoading } = useWhatsAppAgents();

  // Calculate "my conversations" count
  const myConversationsCount = useMemo(() => {
    return conversations.filter(c => (c as any).assigned_agent_id === user?.id && c.status !== 'closed').length;
  }, [conversations, user?.id]);

  // Fetch instances
  useEffect(() => {
    const fetchInstances = async () => {
      try {
        setIsLoadingInstances(true);
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;
        setInstances(data || []);

        if (data && data.length > 0 && !selectedInstanceId) {
          const connected = data.find(i => i.status === 'connected');
          setSelectedInstanceId(connected?.id || data[0].id);
        }
      } catch (error) {
        console.error('Error fetching instances:', error);
      } finally {
        setIsLoadingInstances(false);
      }
    };

    fetchInstances();

    const channel = supabase
      .channel('whatsapp-instances-central')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_instances' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setInstances(prev => prev.map(i => 
              i.id === payload.new.id ? payload.new as WhatsAppInstance : i
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-open conversation from URL
  useEffect(() => {
    if (pendingAutoOpen && conversations.length > 0 && !convLoading) {
      const { clienteId, telefone } = pendingAutoOpen;
      
      const existingConv = conversations.find(c => 
        c.cliente_id === clienteId || 
        c.whatsapp_number === telefone ||
        c.whatsapp_number === telefone.replace(/\D/g, '')
      );
      
      if (existingConv) {
        setSelectedConversationId(existingConv.id);
        toast({
          title: 'Conversa aberta',
          description: `Abrindo conversa com ${existingConv.customer_name || telefone}`,
        });
      } else {
        toast({
          title: 'Cliente selecionado',
          description: 'Nenhuma conversa existente encontrada.',
        });
        setSearchTerm(telefone);
      }
      
      setPendingAutoOpen(null);
    }
  }, [pendingAutoOpen, conversations, convLoading, toast]);

  // Filter conversations - cast to extended type
  const filteredConversations = useMemo(() => {
    let filtered = conversations.map(c => ({
      ...c,
      assigned_agent_id: (c as any).assigned_agent_id || null,
      assigned_at: (c as any).assigned_at || null,
    })) as WhatsAppConversation[];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.customer_name?.toLowerCase().includes(term) ||
        c.customer_phone?.includes(term) ||
        c.last_message?.toLowerCase().includes(term)
      );
    }

    // Instance filter (when multiple selected)
    if (selectedInstanceIds.length > 0 && selectedInstanceIds.length < instances.length) {
      filtered = filtered.filter(c => selectedInstanceIds.includes(c.instance_id || ''));
    }

    // Tab filter
    switch (filter) {
      case 'queue':
        filtered = filtered.filter(c => 
          (c.status === 'waiting' || c.status === 'open') && !c.assigned_agent_id
        );
        break;
      case 'unread':
        filtered = filtered.filter(c => (c.unread_count || 0) > 0);
        break;
      case 'mine':
        filtered = filtered.filter(c => c.assigned_agent_id === user?.id);
        break;
    }

    // Sort: unread first, then by date
    return filtered.sort((a, b) => {
      const aUnread = a.unread_count || 0;
      const bUnread = b.unread_count || 0;
      if (bUnread !== aUnread) return bUnread - aUnread;
      
      const aDate = new Date(a.last_message_at || a.created_at || '').getTime();
      const bDate = new Date(b.last_message_at || b.created_at || '').getTime();
      return bDate - aDate;
    });
  }, [conversations, searchTerm, filter, selectedInstanceIds, instances.length, user?.id]);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  const handleAssignConversation = async (conversationId: string) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ 
          status: 'active',
          assigned_agent_id: user.id,
          assigned_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: 'Conversa assumida',
        description: 'Você está agora atendendo esta conversa'
      });

      refetchConversations();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleRefresh = () => {
    refetchConversations();
    refetchStats();
  };

  const selectedInstance = instances.find(i => i.id === selectedInstanceId);
  const onlineAgentsCount = agents.filter(a => a.status === 'online').length;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-background shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Headphones className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Central de Atendimento</h1>
              <p className="text-xs text-muted-foreground">WhatsApp • Triagem • Tickets</p>
            </div>
            {selectedInstance && (
              <Badge 
                variant={selectedInstance.status === 'connected' ? 'default' : 'secondary'}
                className={selectedInstance.status === 'connected' ? 'bg-green-500' : ''}
              >
                {selectedInstance.status === 'connected' ? 'Conectado' : 'Desconectado'}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <AgentStatusSelector variant="compact" />

            {instances.length > 0 && (
              <Select value={selectedInstanceId || undefined} onValueChange={setSelectedInstanceId}>
                <SelectTrigger className="w-[180px] h-9">
                  <Smartphone className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Instância" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map(instance => (
                    <SelectItem key={instance.id} value={instance.id}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${instance.status === 'connected' ? 'bg-green-500' : 'bg-muted'}`} />
                        {instance.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
              <a href="/configuracoes/whatsapp">
                <Settings className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-6 gap-2">
          <Card className="bg-muted/30 border-0">
            <CardContent className="p-2 flex items-center gap-2">
              <div className="p-1.5 rounded bg-primary/10">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-bold">{statsLoading ? '-' : stats.totalConversations}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30 border-0">
            <CardContent className="p-2 flex items-center gap-2">
              <div className="p-1.5 rounded bg-yellow-500/10">
                <Inbox className="h-3.5 w-3.5 text-yellow-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Fila</p>
                <p className="text-sm font-bold">{statsLoading ? '-' : stats.queueConversations}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30 border-0">
            <CardContent className="p-2 flex items-center gap-2">
              <div className="p-1.5 rounded bg-red-500/10">
                <Bell className="h-3.5 w-3.5 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Não Lidas</p>
                <p className="text-sm font-bold">{statsLoading ? '-' : stats.unreadMessages}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30 border-0">
            <CardContent className="p-2 flex items-center gap-2">
              <div className="p-1.5 rounded bg-blue-500/10">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Hoje</p>
                <p className="text-sm font-bold">{statsLoading ? '-' : stats.todayMessages}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30 border-0">
            <CardContent className="p-2 flex items-center gap-2">
              <div className="p-1.5 rounded bg-green-500/10">
                <UserCheck className="h-3.5 w-3.5 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Meus</p>
                <p className="text-sm font-bold">{myConversationsCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30 border-0">
            <CardContent className="p-2 flex items-center gap-2">
              <div className="p-1.5 rounded bg-purple-500/10">
                <Users className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Online</p>
                <p className="text-sm font-bold">{onlineAgentsCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      {instances.length === 0 && !isLoadingInstances ? (
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="py-12 text-center">
              <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma instância configurada</h3>
              <p className="text-muted-foreground mb-4">
                Configure uma instância WhatsApp para começar
              </p>
              <Button asChild>
                <a href="/configuracoes/whatsapp">Configurar WhatsApp</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Panel - Queue */}
          <div className="w-80 border-r flex flex-col bg-background shrink-0">
            <div className="p-3 border-b space-y-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar conversas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <AtendimentoFilters
                  instances={instances}
                  selectedInstances={selectedInstanceIds}
                  onInstancesChange={setSelectedInstanceIds}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                />
              </div>

              <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
                <TabsList className="w-full grid grid-cols-4 h-8">
                  <TabsTrigger value="all" className="text-xs px-2">Todas</TabsTrigger>
                  <TabsTrigger value="queue" className="text-xs px-2 relative">
                    Fila
                    {stats.queueConversations > 0 && (
                      <Badge variant="destructive" className="ml-1 h-4 min-w-4 p-0 text-[10px] absolute -top-1 -right-1">
                        {stats.queueConversations}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs px-2 relative">
                    Novas
                    {stats.unreadMessages > 0 && (
                      <Badge variant="destructive" className="ml-1 h-4 min-w-4 p-0 text-[10px] absolute -top-1 -right-1">
                        {stats.unreadMessages > 9 ? '9+' : stats.unreadMessages}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="mine" className="text-xs px-2 relative">
                    Meus
                    {myConversationsCount > 0 && (
                      <Badge className="ml-1 h-4 min-w-4 p-0 text-[10px] absolute -top-1 -right-1 bg-green-500">
                        {myConversationsCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <ScrollArea className="flex-1">
              <AtendimentoQueue
                conversations={filteredConversations}
                selectedId={selectedConversationId}
                onSelect={setSelectedConversationId}
                onAssign={handleAssignConversation}
                loading={convLoading}
                filter={filter}
                currentUserId={user?.id}
              />
            </ScrollArea>
          </div>

          {/* Center Panel - Chat */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <WhatsAppChatPanel
              conversation={selectedConversation}
              instanceId={selectedInstanceId || undefined}
            />
          </div>

          {/* Right Panel - Actions & Agents */}
          <div className="w-72 border-l flex flex-col bg-muted/10 overflow-hidden shrink-0">
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-4">
                <AtendimentoActions
                  conversation={selectedConversation as any}
                  onActionComplete={() => {
                    refetchConversations();
                    refetchStats();
                  }}
                />

                <WhatsAppAgentPanel
                  agents={agents}
                  loading={agentsLoading}
                />
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
