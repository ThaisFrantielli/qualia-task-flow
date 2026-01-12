import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Info, Users, Settings, MessageSquare, Search, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { CreateBroadcastData } from '@/hooks/useBroadcasts';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  message_template: z.string().min(1, 'Mensagem é obrigatória'),
  instance_id: z.string().min(1, 'Selecione uma instância'),
});

interface WhatsAppInstance {
  id: string;
  name: string;
  status: string;
}

interface Cliente {
  id: string;
  nome_fantasia: string | null;
  razao_social: string | null;
  whatsapp_number: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
}

interface BroadcastFormProps {
  onSuccess: (broadcastId: string) => void;
  onCancel: () => void;
  createBroadcast: (data: CreateBroadcastData) => Promise<string | null>;
}

export function BroadcastForm({ onSuccess, onCancel, createBroadcast }: BroadcastFormProps) {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClientes, setSelectedClientes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(true);

  const [minDelay, setMinDelay] = useState(8);
  const [maxDelay, setMaxDelay] = useState(25);
  const [dailyLimit, setDailyLimit] = useState(100);
  const [batchSize, setBatchSize] = useState(10);
  const [batchPause, setBatchPause] = useState(5);
  const [useBusinessHours, setUseBusinessHours] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      message_template: 'Olá {{nome}}, {{saudacao}}!\n\n',
      instance_id: '',
    },
  });

  useEffect(() => {
    supabase
      .from('whatsapp_instances')
      .select('id, name, status')
      .eq('status', 'connected')
      .then(({ data }) => {
        setInstances((data as WhatsAppInstance[]) || []);
      });

    setLoadingClientes(true);
    supabase
      .from('clientes')
      .select('id, nome_fantasia, razao_social, whatsapp_number, telefone, cidade, estado')
      .or('whatsapp_number.neq.,telefone.neq.')
      .order('nome_fantasia', { ascending: true })
      .then(({ data }) => {
        setClientes((data as Cliente[]) || []);
        setLoadingClientes(false);
      });
  }, []);

  const filteredClientes = clientes.filter((c) => {
    const name = c.nome_fantasia || c.razao_social || '';
    const phone = c.whatsapp_number || c.telefone || '';
    const search = searchTerm.toLowerCase();
    return name.toLowerCase().includes(search) || phone.includes(search);
  });

  const toggleCliente = (id: string) => {
    const newSelected = new Set(selectedClientes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedClientes(newSelected);
  };

  const selectAll = () => {
    const allIds = filteredClientes.map((c) => c.id);
    setSelectedClientes(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedClientes(new Set());
  };

  const formatPhone = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 || cleaned.length === 10) {
      cleaned = '55' + cleaned;
    }
    return cleaned;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (selectedClientes.size === 0) {
      form.setError('root', { message: 'Selecione pelo menos um destinatário' });
      return;
    }

    setLoading(true);

    try {
      const recipients = clientes
        .filter((c) => selectedClientes.has(c.id))
        .map((c) => ({
          cliente_id: c.id,
          phone_number: formatPhone(c.whatsapp_number || c.telefone || ''),
          variables: {
            nome: c.nome_fantasia || c.razao_social || 'Cliente',
            empresa: c.razao_social || c.nome_fantasia || '',
            cidade: c.cidade || '',
            estado: c.estado || '',
          },
        }))
        .filter((r) => r.phone_number.length >= 12);

      if (recipients.length === 0) {
        form.setError('root', { message: 'Nenhum cliente com telefone válido' });
        setLoading(false);
        return;
      }

      const broadcastId = await createBroadcast({
        name: values.name,
        message_template: values.message_template,
        instance_id: values.instance_id,
        recipients,
        settings: {
          min_delay_seconds: minDelay,
          max_delay_seconds: maxDelay,
          daily_limit: dailyLimit,
          batch_size: batchSize,
          batch_pause_minutes: batchPause,
          use_business_hours: useBusinessHours,
        },
      });

      if (broadcastId) {
        onSuccess(broadcastId);
      }
    } finally {
      setLoading(false);
    }
  };

  const insertVariable = (variable: string) => {
    const currentMessage = form.getValues('message_template');
    form.setValue('message_template', currentMessage + `{{${variable}}}`);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="message" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="message" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Mensagem
          </TabsTrigger>
          <TabsTrigger value="recipients" className="gap-2">
            <Users className="h-4 w-4" />
            Destinatários ({selectedClientes.size})
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="message" className="space-y-4 mt-4">
          <div>
            <Label htmlFor="name">Nome da Campanha</Label>
            <Input
              id="name"
              placeholder="Ex: Promoção de Janeiro"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="instance_id">Instância WhatsApp</Label>
            <Select
              value={form.watch('instance_id')}
              onValueChange={(value) => form.setValue('instance_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma instância" />
              </SelectTrigger>
              <SelectContent>
                {instances.map((instance) => (
                  <SelectItem key={instance.id} value={instance.id}>
                    {instance.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {instances.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Nenhuma instância conectada. Configure o WhatsApp primeiro.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="message_template">Mensagem</Label>
              <div className="flex gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable('nome')}
                      >
                        {'{{nome}}'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Nome do cliente</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable('empresa')}
                      >
                        {'{{empresa}}'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Razão Social</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable('saudacao')}
                      >
                        {'{{saudacao}}'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Bom dia / Boa tarde / Boa noite</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <Textarea
              id="message_template"
              placeholder="Digite sua mensagem aqui..."
              className="min-h-[150px]"
              {...form.register('message_template')}
            />
            {form.formState.errors.message_template && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.message_template.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              💡 Use as variáveis acima para personalizar a mensagem para cada cliente.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="recipients" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={selectAll}>
              <CheckSquare className="h-4 w-4 mr-1" />
              Todos
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={deselectAll}>
              <Square className="h-4 w-4 mr-1" />
              Nenhum
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            {filteredClientes.length} clientes encontrados • {selectedClientes.size} selecionados
          </div>

          <ScrollArea className="h-[300px] border rounded-lg p-2">
            {loadingClientes ? (
              <div className="text-center py-4 text-muted-foreground">Carregando clientes...</div>
            ) : filteredClientes.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">Nenhum cliente encontrado</div>
            ) : (
              <div className="space-y-1">
                {filteredClientes.map((cliente) => {
                  const phone = cliente.whatsapp_number || cliente.telefone || '';
                  const isSelected = selectedClientes.has(cliente.id);
                  
                  return (
                    <div
                      key={cliente.id}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted transition-colors ${
                        isSelected ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => toggleCliente(cliente.id)}
                    >
                      <Checkbox checked={isSelected} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {cliente.nome_fantasia || cliente.razao_social || 'Sem nome'}
                        </p>
                        <p className="text-sm text-muted-foreground">{phone}</p>
                      </div>
                      {cliente.cidade && (
                        <Badge variant="outline" className="text-xs">
                          {cliente.cidade}/{cliente.estado}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex gap-2">
              <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200">Proteção Anti-Banimento</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Estas configurações ajudam a evitar que seu número seja banido pelo WhatsApp.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Delay entre mensagens</Label>
                  <span className="text-sm text-muted-foreground">{minDelay}s - {maxDelay}s</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Mínimo</Label>
                    <Slider
                      value={[minDelay]}
                      onValueChange={([v]) => setMinDelay(v)}
                      min={5}
                      max={30}
                      step={1}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Máximo</Label>
                    <Slider
                      value={[maxDelay]}
                      onValueChange={([v]) => setMaxDelay(Math.max(v, minDelay + 5))}
                      min={10}
                      max={60}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label>Limite diário de envios</Label>
                  <span className="text-sm text-muted-foreground">{dailyLimit} mensagens</span>
                </div>
                <Slider
                  value={[dailyLimit]}
                  onValueChange={([v]) => setDailyLimit(v)}
                  min={20}
                  max={500}
                  step={10}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recomendado: até 100 mensagens/dia para contas novas
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Tamanho do lote</Label>
                  <span className="text-sm text-muted-foreground">{batchSize} mensagens</span>
                </div>
                <Slider
                  value={[batchSize]}
                  onValueChange={([v]) => setBatchSize(v)}
                  min={5}
                  max={30}
                  step={1}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label>Pausa entre lotes</Label>
                  <span className="text-sm text-muted-foreground">{batchPause} minutos</span>
                </div>
                <Slider
                  value={[batchPause]}
                  onValueChange={([v]) => setBatchPause(v)}
                  min={1}
                  max={15}
                  step={1}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label>Apenas horário comercial</Label>
                  <p className="text-xs text-muted-foreground">Enviar somente entre 8h e 18h</p>
                </div>
                <Switch checked={useBusinessHours} onCheckedChange={setUseBusinessHours} />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {form.formState.errors.root && (
        <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || selectedClientes.size === 0}>
          {loading ? 'Criando...' : `Criar Campanha (${selectedClientes.size} destinatários)`}
        </Button>
      </div>
    </form>
  );
}
