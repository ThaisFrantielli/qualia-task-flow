import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  RefreshCw,
  AlertCircle,
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

export default function WhatsAppConfigPage() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceOnline, setServiceOnline] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setInstances(data || []);
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

  const checkServiceStatus = async () => {
    try {
      const response = await fetch(`${SERVICE_URL}/status`);
      if (response.ok) {
        setServiceOnline(true);
      } else {
        setServiceOnline(false);
      }
    } catch (error) {
      setServiceOnline(false);
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
    try {
      // Clean up any references before deleting to avoid foreign-key / policy errors
      try {
        await supabase
          .from('whatsapp_conversations')
          .update({ instance_id: null })
          .eq('instance_id', id);
      } catch (err) {
        console.warn('Falha ao limpar whatsapp_conversations.instance_id:', err);
      }

      try {
        await supabase
          .from('whatsapp_messages')
          .update({ instance_id: null })
          .eq('instance_id', id);
      } catch (err) {
        console.warn('Falha ao limpar whatsapp_messages.instance_id:', err);
      }

      const { error } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInstances(prev => prev.filter(i => i.id !== id));
      toast({ title: "Removido", description: "Conexão removida com sucesso." });
    } catch (error) {
      console.error('Error deleting instance:', error);
      toast({ title: "Erro", description: "Falha ao remover conexão.", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchInstances();
    checkServiceStatus();

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
            onClick={() => { fetchInstances(); checkServiceStatus(); }}
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

      {!serviceOnline && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900 mb-2">Serviço WhatsApp Offline</p>
              <p className="text-sm text-amber-800 mb-3">
                O serviço local do WhatsApp não está respondendo em {SERVICE_URL}.
              </p>
              <div className="bg-amber-100 border border-amber-200 rounded-lg p-3 mt-2">
                <p className="font-semibold text-amber-900 text-sm mb-2">Como iniciar o serviço:</p>
                <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
                  <li>Abra o terminal na pasta do projeto</li>
                  <li>Execute: <code className="bg-amber-200 px-1.5 py-0.5 rounded font-mono text-xs">cd whatsapp-service</code></li>
                  <li>Instale as dependências (se necessário): <code className="bg-amber-200 px-1.5 py-0.5 rounded font-mono text-xs">npm install</code></li>
                  <li>Inicie o serviço: <code className="bg-amber-200 px-1.5 py-0.5 rounded font-mono text-xs">npm start</code></li>
                  <li>Aguarde a mensagem: "WhatsApp Multi-Session Service running on port 3005"</li>
                </ol>
                <p className="text-xs text-amber-700 mt-2">
                  📝 Documentação completa: <code className="font-mono">whatsapp-service/README.md</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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