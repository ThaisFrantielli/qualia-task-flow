import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import { useWhatsAppStats } from '@/hooks/useWhatsAppStats';
import { useWhatsAppAgents } from '@/hooks/useWhatsAppAgents';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import WhatsAppConversationQueue from '@/components/whatsapp/WhatsAppConversationQueue';
import WhatsAppChatPanel from '@/components/whatsapp/WhatsAppChatPanel';
import WhatsAppQuickActions from '@/components/whatsapp/WhatsAppQuickActions';
import WhatsAppAgentPanel from '@/components/whatsapp/WhatsAppAgentPanel';
import {
  MessageSquare,
  Users,
  Clock,
  Inbox,
  Search,
  Smartphone,
  Bell,
  Settings,
  RefreshCw
} from 'lucide-react';

interface WhatsAppInstance {
  id: string;
  name: string;
  status: string;
  phone_number: string | null;
}

export default function WhatsAppCentralPage() {
  useAuth(); // ensure auth context
  const { toast } = useToast();
  
  // State
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'queue' | 'mine' | 'unread'>('all');
  const [isLoadingInstances, setIsLoadingInstances] = useState(true);

  // Hooks
  const { conversations, loading: convLoading, refetch: refetchConversations } = useWhatsAppConversations(undefined, selectedInstanceId || undefined);
  const { stats, loading: statsLoading, refetch: refetchStats } = useWhatsAppStats(selectedInstanceId || undefined);
  const { agents, loading: agentsLoading } = useWhatsAppAgents();

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

        // Auto-select first connected instance
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

    // Real-time updates for instances
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

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.customer_name?.toLowerCase().includes(term) ||
        c.customer_phone?.includes(term) ||
        c.last_message?.toLowerCase().includes(term)
      );
    }

    // Apply tab filter
    switch (filter) {
      case 'queue':
        filtered = filtered.filter(c => c.status === 'waiting' || c.status === 'open');
        break;
      case 'unread':
        filtered = filtered.filter(c => (c.unread_count || 0) > 0);
        break;
      case 'mine':
        // Would need assignment system to filter by current user
        break;
    }

    return filtered;
  }, [conversations, searchTerm, filter]);

  // Selected conversation
  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  // Handle assign conversation
  const handleAssignConversation = async (conversationId: string) => {
    try {
      await supabase
        .from('whatsapp_conversations')
        .update({ status: 'active' })
        .eq('id', conversationId);

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

  // Handle refresh
  const handleRefresh = () => {
    refetchConversations();
    refetchStats();
  };

  const selectedInstance = instances.find(i => i.id === selectedInstanceId);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-background">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Central WhatsApp</h1>
            {selectedInstance && (
              <Badge 
                variant={selectedInstance.status === 'connected' ? 'default' : 'secondary'}
                className={selectedInstance.status === 'connected' ? 'bg-green-500' : ''}
              >
                {selectedInstance.status === 'connected' ? 'Conectado' : 'Desconectado'}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Instance Selector */}
            {instances.length > 0 && (
              <Select value={selectedInstanceId || undefined} onValueChange={setSelectedInstanceId}>
                <SelectTrigger className="w-[200px]">
                  <Smartphone className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Selecionar instância" />
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

            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" asChild>
              <a href="/configuracoes/whatsapp">
                <Settings className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="bg-muted/30">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{statsLoading ? '-' : stats.totalConversations}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Inbox className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Na Fila</p>
                <p className="text-lg font-bold">{statsLoading ? '-' : stats.queueConversations}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Bell className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Não Lidas</p>
                <p className="text-lg font-bold">{statsLoading ? '-' : stats.unreadMessages}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hoje</p>
                <p className="text-lg font-bold">{statsLoading ? '-' : stats.todayMessages}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Atendentes</p>
                <p className="text-lg font-bold">{statsLoading ? '-' : stats.activeAgents}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content - 3 Panel Layout */}
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
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Conversation Queue */}
          <div className="w-80 border-r flex flex-col bg-background">
            {/* Search and Filters */}
            <div className="p-3 border-b space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
                  <TabsTrigger value="queue" className="text-xs">
                    Fila
                    {stats.queueConversations > 0 && (
                      <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-[10px]">
                        {stats.queueConversations}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs">
                    Não lidas
                    {stats.unreadMessages > 0 && (
                      <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-[10px]">
                        {stats.unreadMessages > 9 ? '9+' : stats.unreadMessages}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="mine" className="text-xs">Meus</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-hidden">
              <WhatsAppConversationQueue
                conversations={filteredConversations}
                selectedId={selectedConversationId}
                onSelect={setSelectedConversationId}
                onAssign={handleAssignConversation}
                loading={convLoading}
                filter={filter}
              />
            </div>
          </div>

          {/* Center Panel - Chat */}
          <div className="flex-1 flex flex-col min-w-0">
            <WhatsAppChatPanel
              conversation={selectedConversation}
              instanceId={selectedInstanceId || undefined}
            />
          </div>

          {/* Right Panel - Actions & Agents */}
          <div className="w-72 border-l flex flex-col gap-4 p-4 bg-muted/20 overflow-y-auto">
            <WhatsAppQuickActions
              conversation={selectedConversation}
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
        </div>
      )}
    </div>
  );
}
