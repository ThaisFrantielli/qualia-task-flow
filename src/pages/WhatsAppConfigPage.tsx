import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WHATSAPP } from '@/integrations/whatsapp/config';
import { WhatsAppInstanceCard } from '@/components/whatsapp/WhatsAppInstanceCard';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface WhatsAppInstance {
  id: string;
  name: string;
  status: string;
  qr_code: string | null;
  phone_number: string | null;
  updated_at: string;
}

const SERVICE_URL = WHATSAPP.SERVICE_URL;

type ServiceStatusInstance = {
  id?: string;
  instanceId?: string;
  name?: string;
  status?: string;
  phone_number?: string | null;
  connectedNumber?: string | null;
};

export default function WhatsAppConfigPage() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [serviceProbeDisabled, setServiceProbeDisabled] = useState(false);
  const { toast } = useToast();

  const fetchInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const dbInstances = data || [];
      setInstances(dbInstances);

      // Also reconcile with live service status so number/status appears immediately.
      await checkServiceStatus(dbInstances);
    } catch (error) {
      console.error('Error fetching instances:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar instâncias.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkServiceStatus = async (
    baseInstances: WhatsAppInstance[] = instances,
    options?: { force?: boolean }
  ) => {
    const force = Boolean(options?.force);
    if (serviceProbeDisabled && !force) {
      return;
    }

    try {
      const response = await fetch(`${SERVICE_URL}/status`);
      // Just check if the service responds, no need to track state
      if (!response.ok) {
        console.log('WhatsApp service not responding');
        if (!force) setServiceProbeDisabled(true);
        return;
      }

      const payload = await response.json().catch(() => null);
      const serviceInstances = Array.isArray(payload?.instances)
        ? (payload.instances as ServiceStatusInstance[])
        : [];

      if (serviceInstances.length === 0) {
        return;
      }

      const merged = baseInstances.map((dbItem) => {
        const serviceItem = serviceInstances.find((svc) => (svc.id || svc.instanceId) === dbItem.id);

        if (!serviceItem) {
          return dbItem;
        }

        return {
          ...dbItem,
          status: serviceItem.status || dbItem.status,
          phone_number: serviceItem.phone_number || serviceItem.connectedNumber || dbItem.phone_number || null,
        };
      });

      setInstances(merged);
      setServiceProbeDisabled(false);
    } catch (error) {
      console.log('WhatsApp service offline');
      if (!force) setServiceProbeDisabled(true);
    }
  };

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) return;

    setIsCreating(true);
    try {
      const id = crypto.randomUUID();

      const { error: dbError } = await supabase
        .from('whatsapp_instances')
        .insert({
          id,
          name: newInstanceName,
          status: 'disconnected'
        });

      if (dbError) throw dbError;

      try {
        await fetch(`${SERVICE_URL}/instances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, name: newInstanceName })
        });
      } catch (serviceError) {
        console.warn('Service might be offline, but DB record created');
      }

      toast({
        title: "Sucesso",
        description: "Nova conexão criada. Aguarde o QR Code.",
      });

      setNewInstanceName('');
      setIsDialogOpen(false);
      fetchInstances();
    } catch (error) {
      console.error('Error creating instance:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar nova conexão.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteInstance = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta conexão? Todas as conversas e mensagens associadas serão perdidas.')) {
      return;
    }

    try {
      console.log('🗑️ Iniciando exclusão da instância:', id);
      
      // With CASCADE foreign keys, we can simply delete the instance
      // and all related records will be automatically deleted
      const { error, count } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Erro ao deletar instância:', error);
        throw error;
      }

      console.log('✅ Instância deletada com sucesso. Registros afetados:', count);

      setInstances(prev => prev.filter(i => i.id !== id));
      toast({ 
        title: "Removido", 
        description: "Conexão e todos os dados relacionados foram removidos com sucesso." 
      });
    } catch (error: any) {
      console.error('❌ Error deleting instance:', error);
      
      // Show detailed error message
      const errorMessage = error?.message || error?.details || 'Falha ao remover conexão';
      
      toast({ 
        title: "Erro ao Remover", 
        description: errorMessage,
        variant: "destructive" 
      });
    }
  };

  useEffect(() => {
    fetchInstances();

    const channel = supabase
      .channel('whatsapp-instances-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_instances' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setInstances(prev => [...prev, payload.new as WhatsAppInstance]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedInstance = payload.new as WhatsAppInstance;
            const previousInstance = payload.old as WhatsAppInstance | undefined;

            if (updatedInstance.status === 'connected' && previousInstance?.status !== 'connected') {
              toast({
                title: '✅ WhatsApp Conectado!',
                description: `${updatedInstance.name || 'Instância'} está pronto para uso.`
              });
            }

            setInstances(prev => prev.map(i => i.id === updatedInstance.id ? updatedInstance : i));
          } else if (payload.eventType === 'DELETE') {
            setInstances(prev => prev.filter(i => i.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuração WhatsApp Multi-Sessão</h1>
          <p className="text-muted-foreground">
            Gerencie múltiplas conexões do WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              fetchInstances();
              checkServiceStatus(undefined, { force: true });
            }}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nova Conexão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Nova Conexão</DialogTitle>
                <DialogDescription>
                  Dê um nome para esta conexão (ex: "Vendas", "Suporte").
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="name">Nome da Conexão</Label>
                <Input
                  id="name"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  placeholder="Ex: Comercial Principal"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateInstance} disabled={isCreating || !newInstanceName.trim()}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Offline warning removed - service status managed independently */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {instances.map(instance => (
          <WhatsAppInstanceCard
            key={instance.id}
            instance={instance}
            onRefresh={fetchInstances}
            onDelete={handleDeleteInstance}
          />
        ))}

        {instances.length === 0 && !isLoading && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg bg-slate-50">
            <p className="text-muted-foreground mb-4">Nenhuma conexão configurada.</p>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Primeira Conexão
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}