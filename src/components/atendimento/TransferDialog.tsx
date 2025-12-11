import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Search, Users, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notificationService } from '@/utils/notificationService';

interface Agent {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  funcao: string | null;
}

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  customerName?: string | null;
  currentAgentId?: string | null;
  onTransferComplete: () => void;
}

export const TransferDialog: React.FC<TransferDialogProps> = ({
  open,
  onOpenChange,
  conversationId,
  customerName,
  currentAgentId,
  onTransferComplete
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [transferNote, setTransferNote] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<Agent | null>(null);

  useEffect(() => {
    if (open) {
      fetchAgents();
      fetchCurrentUserProfile();
    }
  }, [open]);

  const fetchCurrentUserProfile = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, funcao')
      .eq('id', user.id)
      .single();
    if (data) setCurrentUserProfile(data);
  };

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, funcao')
        .order('full_name', { ascending: true });

      if (error) throw error;
      
      // Filter out current agent and current user
      const filteredAgents = (data || []).filter(
        a => a.id !== currentAgentId && a.id !== user?.id
      );
      
      setAgents(filteredAgents);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(agent => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      agent.full_name?.toLowerCase().includes(term) ||
      agent.email?.toLowerCase().includes(term)
    );
  });

  const handleTransfer = async () => {
    if (!selectedAgentId) return;

    setIsTransferring(true);
    try {
      // Update conversation with new agent and return updated row to inspect
      const { data: updatedRow, error: updateError, status, statusText } = await supabase
        .from('whatsapp_conversations')
        .update({
          assigned_agent_id: selectedAgentId,
          assigned_at: new Date().toISOString(),
          status: 'active'
        })
        .eq('id', conversationId)
        .select()
        .single();

      if (updateError) {
        // Log details to help debugging the 400 from Supabase REST
        console.error('Transfer update error:', {
          message: updateError.message,
          details: (updateError as any).details,
          hint: (updateError as any).hint,
          status,
          statusText
        });
        throw updateError;
      }

      // Get selected agent info and send notification
      const selectedAgent = agents.find(a => a.id === selectedAgentId);
      
      // Send notification to the new agent
      await notificationService.notifyConversationTransfer({
        toAgentId: selectedAgentId,
        fromAgentName: currentUserProfile?.full_name || 'Agente',
        clientName: customerName || 'Cliente',
        conversationId: conversationId,
      });
      
      toast({
        title: 'Conversa transferida',
        description: `Transferida para ${selectedAgent?.full_name || 'agente'}`
      });

      onOpenChange(false);
      setSelectedAgentId(null);
      setTransferNote('');
      onTransferComplete();
    } catch (error: any) {
      toast({
        title: 'Erro ao transferir',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Transferir Conversa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar agente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-64 border rounded-md">
            {loading ? (
              <div className="p-3 space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'Nenhum agente encontrado' : 'Nenhum agente disponível'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredAgents.map(agent => (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                      selectedAgentId === agent.id && "bg-primary/5 border-l-2 border-l-primary"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={agent.avatar_url || undefined} />
                      <AvatarFallback className="bg-muted text-xs">
                        {getInitials(agent.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {agent.full_name || 'Sem nome'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {agent.funcao || agent.email || 'Agente'}
                      </p>
                    </div>
                    {selectedAgentId === agent.id && (
                      <Badge variant="default" className="shrink-0">
                        Selecionado
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div>
            <Label>Nota de transferência (opcional)</Label>
            <Textarea
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              placeholder="Adicione uma nota para o próximo agente..."
              rows={2}
              className="mt-1.5"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!selectedAgentId || isTransferring}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Transferir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};