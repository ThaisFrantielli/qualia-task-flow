import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
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
  Search,
  Smartphone,
  Settings,
  RefreshCw,
  Plus,
  Send,
  Loader2,
  Zap,
  MessageSquare as MessageSquareIcon,
  Inbox
} from 'lucide-react';
import FilaTriagem from '@/pages/FilaTriagem';

interface WhatsAppInstance {
  id: string;
  name: string;
  status: string;
  phone_number: string | null;
}

const normalizePhoneDigits = (value: string) => value.replace(/\D/g, '');

const getFunctionErrorMessage = async (error: any) => {
  const fallback = error?.message || 'Falha ao enviar mensagem';
  const context = error?.context;

  if (!context || typeof context.json !== 'function') {
    return fallback;
  }

  try {
    const payload = await context.json();
    if (payload?.error) return String(payload.error);
    if (payload?.message) return String(payload.message);
    return fallback;
  } catch {
    return fallback;
  }
};

export default function AtendimentoCentralPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const urlFolder = searchParams.get('folder');
  const urlConversationId = searchParams.get('conversation_id');
  const urlClienteId = searchParams.get('cliente_id');
  const urlTelefone = searchParams.get('telefone');

  // State
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'whatsapp' | 'queue' | 'mine' | 'unread' | 'others'>('all');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [assignedAgentNames, setAssignedAgentNames] = useState<Record<string, string>>({});
  const [isLoadingInstances, setIsLoadingInstances] = useState(true);
  const [activeFolder, setActiveFolder] = useState<'triagem' | 'whatsapp'>(
    urlFolder === 'whatsapp' || Boolean(urlConversationId) || (Boolean(urlClienteId) && Boolean(urlTelefone))
      ? 'whatsapp'
      : 'triagem'
  );
  const [pendingAutoOpen, setPendingAutoOpen] = useState<{
    clienteId?: string;
    telefone?: string;
    conversationId?: string;
  } | null>(
    urlConversationId || urlClienteId || urlTelefone
      ? {
          clienteId: urlClienteId || undefined,
          telefone: urlTelefone || undefined,
          conversationId: urlConversationId || undefined,
        }
      : null
  );

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [isSendingNewChat, setIsSendingNewChat] = useState(false);

  // Hooks - use first selected instance or null for all
  const effectiveInstanceId = selectedInstanceIds.length === 1 ? selectedInstanceIds[0] : (selectedInstanceId || undefined);
  const { conversations, loading: convLoading, refetch: refetchConversations } = useWhatsAppConversations(undefined, effectiveInstanceId);
  const { stats, refetch: refetchStats } = useWhatsAppStats(effectiveInstanceId);
  const { agents, loading: agentsLoading } = useWhatsAppAgents();

  // Calculate "my conversations" count
  const myConversationsCount = useMemo(() => {
    return conversations.filter(c => (c as any).assigned_agent_id === user?.id && c.status !== 'closed').length;
  }, [conversations, user?.id]);

  const whatsappConversationsCount = useMemo(() => {
    return conversations.filter((c) => Boolean(c.whatsapp_number || c.customer_phone) && c.status !== 'closed').length;
  }, [conversations]);

  const unreadConversationsCount = useMemo(() => {
    return conversations.filter((c) => {
      if (c.status === 'closed') return false;
      const unreadCount = Number(c.unread_count || 0);
      return unreadCount > 0 || c.status === 'waiting';
    }).length;
  }, [conversations]);

  const queueConversationsCount = useMemo(() => {
    return conversations.filter(c => (c.status === 'waiting' || c.status === 'open') && !c.assigned_agent_id).length;
  }, [conversations]);

  const othersConversationsCount = useMemo(() => {
    return conversations.filter((c) => {
      if (c.status === 'closed') return false;
      const unreadCount = Number(c.unread_count || 0);
      const isUnread = unreadCount > 0 || c.status === 'waiting';
      const isMine = c.assigned_agent_id === user?.id;
      const isQueue = (c.status === 'waiting' || c.status === 'open') && !c.assigned_agent_id;
      return !isUnread && !isMine && !isQueue;
    }).length;
  }, [conversations, user?.id]);

  useEffect(() => {
    const loadAssignedAgentNames = async () => {
      const ids = Array.from(new Set(conversations.map((c) => c.assigned_agent_id).filter(Boolean) as string[]));
      if (ids.length === 0) {
        setAssignedAgentNames({});
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids);

      if (error) {
        console.warn('Falha ao carregar nomes de agentes atribuídos:', error);
        return;
      }

      const map: Record<string, string> = {};
      (data || []).forEach((profile) => {
        if (profile.id) {
          map[profile.id] = profile.full_name || 'Agente';
        }
      });
      setAssignedAgentNames(map);
    };

    loadAssignedAgentNames();
  }, [conversations]);

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

  const handleStartNewConversation = async () => {
    if (!newChatPhone.trim() || !newChatMessage.trim()) return;
    if (!selectedInstanceId) {
      toast({ title: 'Erro', description: 'Nenhuma conexão WhatsApp selecionada.', variant: 'destructive' });
      return;
    }

    const selectedInstance = instances.find((instance) => instance.id === selectedInstanceId);
    if (!selectedInstance || selectedInstance.status !== 'connected') {
      toast({
        title: 'Instância desconectada',
        description: 'Conecte a instância WhatsApp selecionada antes de enviar.',
        variant: 'destructive'
      });
      return;
    }

    const normalizedPhone = normalizePhoneDigits(newChatPhone);
    if (normalizedPhone.length < 12) {
      toast({
        title: 'Número inválido',
        description: 'Informe o número com DDI + DDD + número (apenas dígitos). Ex.: 5511999999999.',
        variant: 'destructive'
      });
      return;
    }

    setIsSendingNewChat(true);
    try {
      const { error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          instance_id: selectedInstanceId,
          phoneNumber: normalizedPhone,
          message: newChatMessage.trim()
        }
      });

      if (error) {
        const parsedMessage = await getFunctionErrorMessage(error);
        throw new Error(parsedMessage);
      }

      toast({ title: 'Mensagem Enviada!', description: 'A conversa logo aparecerá na sua fila.' });
      setIsNewChatOpen(false);
      setNewChatPhone('');
      setNewChatMessage('');
      refetchConversations();
    } catch (err: any) {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    } finally {
      setIsSendingNewChat(false);
    }
  };

  // Auto-open conversation from URL
  useEffect(() => {
    if (urlFolder === 'whatsapp' || urlConversationId || urlClienteId || urlTelefone) {
      setActiveFolder('whatsapp');
    }

    if (urlConversationId || urlClienteId || urlTelefone) {
      setPendingAutoOpen({
        clienteId: urlClienteId || undefined,
        telefone: urlTelefone || undefined,
        conversationId: urlConversationId || undefined,
      });
    }
  }, [urlFolder, urlConversationId, urlClienteId, urlTelefone]);

  useEffect(() => {
    if (pendingAutoOpen && conversations.length > 0 && !convLoading) {
      const { clienteId, telefone, conversationId } = pendingAutoOpen;

      const existingConv = conversations.find(c =>
        c.id === conversationId ||
        (clienteId && c.cliente_id === clienteId) ||
        (telefone && (c.whatsapp_number === telefone || c.whatsapp_number === telefone.replace(/\D/g, '')))
      );

      if (existingConv) {
        setSelectedConversationId(existingConv.id);
        toast({
          title: 'Conversa aberta',
          description: `Abrindo conversa com ${existingConv.customer_name || telefone || 'cliente'}`,
        });
      } else {
        toast({
          title: 'Cliente selecionado',
          description: 'Nenhuma conversa existente encontrada.',
        });
        if (telefone) {
          setSearchTerm(telefone);
        }
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
      assigned_agent_name: (c as any).assigned_agent_id ? assignedAgentNames[(c as any).assigned_agent_id] || null : null,
    })) as WhatsAppConversation[];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.customer_name?.toLowerCase().includes(term) ||
        c.customer_phone?.includes(term) ||
        c.last_message?.toLowerCase().includes(term) ||
        c.assigned_agent_name?.toLowerCase().includes(term)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((c) => c.status === statusFilter);
    } else {
      filtered = filtered.filter((c) => c.status !== 'closed');
    }

    // Instance filter (when multiple selected)
    if (selectedInstanceIds.length > 0 && selectedInstanceIds.length < instances.length) {
      filtered = filtered.filter(c => selectedInstanceIds.includes(c.instance_id || ''));
    }

    // Tab filter
    switch (filter) {
      case 'whatsapp':
        filtered = filtered.filter(c => Boolean(c.whatsapp_number || c.customer_phone) && c.status !== 'closed');
        break;
      case 'queue':
        filtered = filtered.filter(c =>
          (c.status === 'waiting' || c.status === 'open') && !c.assigned_agent_id
        );
        break;
      case 'unread':
        filtered = filtered.filter(c => Number(c.unread_count || 0) > 0 || c.status === 'waiting');
        break;
      case 'mine':
        filtered = filtered.filter(c => c.assigned_agent_id === user?.id);
        break;
      case 'others':
        filtered = filtered.filter((c) => {
          const unreadCount = Number(c.unread_count || 0);
          const isUnread = unreadCount > 0 || c.status === 'waiting';
          const isMine = c.assigned_agent_id === user?.id;
          const isQueue = (c.status === 'waiting' || c.status === 'open') && !c.assigned_agent_id;
          return c.status !== 'closed' && !isUnread && !isMine && !isQueue;
        });
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
  }, [conversations, searchTerm, filter, selectedInstanceIds, instances.length, user?.id, assignedAgentNames, statusFilter]);

  const selectedConversation = (filteredConversations.find(c => c.id === selectedConversationId)
    || conversations.map(c => ({
      ...c,
      assigned_agent_name: (c as any).assigned_agent_id ? assignedAgentNames[(c as any).assigned_agent_id] || null : null,
    }) as WhatsAppConversation).find(c => c.id === selectedConversationId)
    || null);

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

      // Refetch list and also optimistically ensure current user's name is available
      refetchConversations();
      setAssignedAgentNames((prev) => ({
        ...prev,
        [user.id]: (user as any)?.full_name || 'Você'
      }));
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

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Inner Sidebar (Folders) */}
      <div className="w-64 border-r flex flex-col p-4 gap-6 shrink-0 bg-muted/10 hidden md:flex">
        <div>
          <div className="flex items-center justify-between pl-1 pr-0 mb-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Inbox className="w-5 h-5" /> Inbox
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" asChild>
                <a href="/configuracoes/whatsapp" title="Configurações">
                  <Settings className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground px-1 mb-6">Central Unificada</p>

          <div className="mb-6 px-1">
            <AgentStatusSelector variant="compact" />
          </div>

          <div className="space-y-1">
            <Button
              variant={activeFolder === 'triagem' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveFolder('triagem')}
            >
              <Zap className="mr-2 h-4 w-4 text-yellow-500" />
              Fila de Triagem
            </Button>
            <Button
              variant={activeFolder === 'whatsapp' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveFolder('whatsapp')}
            >
              <MessageSquareIcon className="mr-2 h-4 w-4 text-green-500" />
              WhatsApp (Conversas)
            </Button>
          </div>
        </div>

        {/* Instâncias Selector (apenas para WhatsApp) */}
        {activeFolder === 'whatsapp' && instances.length > 0 && (
          <div className="mt-auto p-3 rounded-xl border bg-background/50 space-y-2">
            <p className="text-xs font-medium text-muted-foreground px-1">Instância WhatsApp</p>
            <Select value={selectedInstanceId || undefined} onValueChange={setSelectedInstanceId}>
              <SelectTrigger className="w-full h-9 bg-background">
                <Smartphone className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[100]">
                {instances.map(instance => (
                  <SelectItem key={instance.id} value={instance.id}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${instance.status === 'connected' ? 'bg-green-500' : 'bg-muted'}`} />
                      <span className="truncate">{instance.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        {activeFolder === 'triagem' ? (
          <div className="flex-1 overflow-y-auto">
            <FilaTriagem />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Header Reduzido para WhatsApp */}
            <div className="px-4 py-3 border-b bg-background shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-green-500/10 hidden sm:block">
                  <MessageSquareIcon className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">Meus Atendimentos</h2>
                </div>
                {selectedInstance && (
                  <Badge
                    variant={selectedInstance.status === 'connected' ? 'default' : 'secondary'}
                    className={selectedInstance.status === 'connected' ? 'bg-green-500 text-[10px] h-5' : 'text-[10px] h-5'}
                  >
                    {selectedInstance.status === 'connected' ? 'Conectado' : 'Desconectado'}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Nova Conversa
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Iniciar Nova Conversa</DialogTitle>
                      <DialogDescription>Digite o número de WhatsApp e a primeira mensagem.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Número (com DDI + DDD)</label>
                        <Input
                          placeholder="Ex: 5511999999999"
                          value={newChatPhone}
                          onChange={e => setNewChatPhone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Mensagem de Abertura</label>
                        <Textarea
                          placeholder="Olá, como podemos ajudar?"
                          value={newChatMessage}
                          onChange={e => setNewChatMessage(e.target.value)}
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsNewChatOpen(false)}>Cancelar</Button>
                      <Button onClick={handleStartNewConversation} disabled={isSendingNewChat || !newChatPhone || !newChatMessage || selectedInstance?.status !== 'connected'}>
                        {isSendingNewChat ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        Enviar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Main Content WhatsApp */}
            {instances.length === 0 && !isLoadingInstances ? (
              <div className="flex-1 flex items-center justify-center bg-muted/5">
                <Card className="max-w-md">
                  <CardContent className="py-12 text-center">
                    <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma instância configurada</h3>
                    <p className="text-muted-foreground mb-4 text-sm">
                      Configure uma instância WhatsApp para começar a atender.
                    </p>
                    <Button asChild>
                      <a href="/configuracoes/whatsapp">Configurar WhatsApp</a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden min-h-0 bg-background">
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
                      <TabsList className="w-full grid grid-cols-6 h-8 bg-muted/50">
                        <TabsTrigger value="all" className="text-[10px] px-1">Todas</TabsTrigger>
                        <TabsTrigger value="whatsapp" className="text-[10px] px-1 relative">
                          WhatsApp
                          {whatsappConversationsCount > 0 && (
                            <Badge variant="secondary" className="ml-0.5 h-3 min-w-3 p-0 text-[8px] absolute -top-1 -right-0.5">
                              {whatsappConversationsCount > 9 ? '9+' : whatsappConversationsCount}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="queue" className="text-[10px] px-1 relative">
                          Aguardando
                          {queueConversationsCount > 0 && (
                            <Badge variant="destructive" className="ml-0.5 h-3 min-w-3 p-0 text-[8px] absolute -top-1 -right-0.5">
                              {queueConversationsCount}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="unread" className="text-[10px] px-1 relative">
                          Não Lidas
                          {unreadConversationsCount > 0 && (
                            <Badge variant="destructive" className="ml-0.5 h-3 min-w-3 p-0 text-[8px] absolute -top-1 -right-0.5">
                              {unreadConversationsCount > 9 ? '9+' : unreadConversationsCount}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="mine" className="text-[10px] px-1 relative">
                          Meus
                          {myConversationsCount > 0 && (
                            <Badge className="ml-0.5 h-3 min-w-3 p-0 text-[8px] absolute -top-1 -right-0.5 bg-green-500">
                              {myConversationsCount}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="others" className="text-[10px] px-1 relative">
                          Outros
                          {othersConversationsCount > 0 && (
                            <Badge variant="outline" className="ml-0.5 h-3 min-w-3 p-0 text-[8px] absolute -top-1 -right-0.5">
                              {othersConversationsCount > 9 ? '9+' : othersConversationsCount}
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
                <div className="w-72 border-l flex flex-col bg-muted/5 overflow-hidden shrink-0 hidden lg:flex">
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
        )}
      </div>
    </div>
  );
}
