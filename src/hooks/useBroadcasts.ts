import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Broadcast {
  id: string;
  name: string;
  message_template: string;
  instance_id: string | null;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  min_delay_seconds: number;
  max_delay_seconds: number;
  daily_limit: number;
  batch_size: number;
  batch_pause_minutes: number;
  use_business_hours: boolean;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  paused_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  whatsapp_instances?: {
    id: string;
    name: string;
    status: string;
  };
}

export interface BroadcastRecipient {
  id: string;
  broadcast_id: string;
  cliente_id: string | null;
  phone_number: string;
  variables: Record<string, string>;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  sent_at: string | null;
  error_message: string | null;
  whatsapp_message_id: string | null;
  processing_order: number;
  created_at: string;
  clientes?: {
    id: string;
    nome_fantasia: string | null;
    razao_social: string | null;
  };
}

export interface CreateBroadcastData {
  name: string;
  message_template: string;
  instance_id: string;
  recipients: Array<{
    cliente_id?: string;
    phone_number: string;
    variables?: Record<string, string>;
  }>;
  settings?: {
    min_delay_seconds?: number;
    max_delay_seconds?: number;
    daily_limit?: number;
    batch_size?: number;
    batch_pause_minutes?: number;
    use_business_hours?: boolean;
    scheduled_at?: string;
  };
}

export function useBroadcasts() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBroadcasts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_broadcasts')
        .select('*, whatsapp_instances(id, name, status)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBroadcasts((data as any[]) || []);
    } catch (error: any) {
      console.error('Erro ao buscar broadcasts:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as campanhas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createBroadcast = async (data: CreateBroadcastData): Promise<string | null> => {
    try {
      const response = await supabase.functions.invoke('whatsapp-broadcast', {
        body: {
          action: 'create',
          ...data,
        },
      });

      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || 'Erro ao criar campanha');

      toast({
        title: 'Sucesso!',
        description: `Campanha criada com ${data.recipients.length} destinatários`,
      });

      await fetchBroadcasts();
      return response.data.broadcast_id;
    } catch (error: any) {
      console.error('Erro ao criar broadcast:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar a campanha',
        variant: 'destructive',
      });
      return null;
    }
  };

  const startBroadcast = async (broadcastId: string): Promise<boolean> => {
    try {
      const response = await supabase.functions.invoke('whatsapp-broadcast', {
        body: { action: 'start', broadcast_id: broadcastId },
      });

      if (response.error) throw response.error;

      toast({ title: 'Campanha iniciada!' });
      await fetchBroadcasts();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível iniciar',
        variant: 'destructive',
      });
      return false;
    }
  };

  const pauseBroadcast = async (broadcastId: string): Promise<boolean> => {
    try {
      const response = await supabase.functions.invoke('whatsapp-broadcast', {
        body: { action: 'pause', broadcast_id: broadcastId },
      });

      if (response.error) throw response.error;

      toast({ title: 'Campanha pausada' });
      await fetchBroadcasts();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível pausar',
        variant: 'destructive',
      });
      return false;
    }
  };

  const resumeBroadcast = async (broadcastId: string): Promise<boolean> => {
    try {
      const response = await supabase.functions.invoke('whatsapp-broadcast', {
        body: { action: 'resume', broadcast_id: broadcastId },
      });

      if (response.error) throw response.error;

      toast({ title: 'Campanha retomada!' });
      await fetchBroadcasts();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível retomar',
        variant: 'destructive',
      });
      return false;
    }
  };

  const cancelBroadcast = async (broadcastId: string): Promise<boolean> => {
    try {
      const response = await supabase.functions.invoke('whatsapp-broadcast', {
        body: { action: 'cancel', broadcast_id: broadcastId },
      });

      if (response.error) throw response.error;

      toast({ title: 'Campanha cancelada' });
      await fetchBroadcasts();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível cancelar',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteBroadcast = async (broadcastId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('whatsapp_broadcasts')
        .delete()
        .eq('id', broadcastId);

      if (error) throw error;

      toast({ title: 'Campanha excluída' });
      await fetchBroadcasts();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  return {
    broadcasts,
    loading,
    fetchBroadcasts,
    createBroadcast,
    startBroadcast,
    pauseBroadcast,
    resumeBroadcast,
    cancelBroadcast,
    deleteBroadcast,
  };
}

export function useBroadcastRecipients(broadcastId: string | null) {
  const [recipients, setRecipients] = useState<BroadcastRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ pending: 0, sent: 0, failed: 0, skipped: 0 });

  const fetchRecipients = useCallback(async () => {
    if (!broadcastId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_broadcast_recipients')
        .select('*, clientes(id, nome_fantasia, razao_social)')
        .eq('broadcast_id', broadcastId)
        .order('processing_order', { ascending: true });

      if (error) throw error;
      
      const recipientData = (data as any[]) || [];
      setRecipients(recipientData);

      const newStats = { pending: 0, sent: 0, failed: 0, skipped: 0 };
      recipientData.forEach(r => {
        if (r.status in newStats) {
          newStats[r.status as keyof typeof newStats]++;
        }
      });
      setStats(newStats);
    } catch (error) {
      console.error('Erro ao buscar destinatários:', error);
    } finally {
      setLoading(false);
    }
  }, [broadcastId]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  useEffect(() => {
    if (!broadcastId) return;

    const channel = supabase
      .channel(`broadcast-recipients-${broadcastId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_broadcast_recipients',
          filter: `broadcast_id=eq.${broadcastId}`,
        },
        () => {
          fetchRecipients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [broadcastId, fetchRecipients]);

  return { recipients, loading, stats, fetchRecipients };
}

export function useBroadcastProcessor(broadcastId: string | null) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { toast } = useToast();

  const processNext = useCallback(async (): Promise<boolean> => {
    if (!broadcastId || isProcessing) return false;

    try {
      setIsProcessing(true);
      
      const response = await supabase.functions.invoke('whatsapp-broadcast', {
        body: { action: 'process', broadcast_id: broadcastId },
      });

      if (response.error) throw response.error;

      setLastResult(response.data);
      
      if (response.data?.completed) {
        toast({ title: 'Campanha concluída!' });
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Erro no processamento:', error);
      setLastResult({ error: error.message });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [broadcastId, isProcessing, toast]);

  return { isProcessing, lastResult, processNext };
}
