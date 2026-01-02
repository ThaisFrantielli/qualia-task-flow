import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useModelosVeiculos } from '@/hooks/useModelosVeiculos';
import { ModeloCoresManager } from './ModeloCoresManager';
import { ModeloItensManager } from './ModeloItensManager';
import {
  CATEGORIAS_VEICULO,
  TIPOS_COMBUSTIVEL,
  TIPOS_TRANSMISSAO,
} from '@/types/modelos';
import { Car, Palette, Package, Settings } from 'lucide-react';

const formSchema = z.object({
  codigo: z.string().optional(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  montadora: z.string().min(1, 'Montadora é obrigatória'),
  categoria: z.string().optional(),
  ano_modelo: z.coerce.number().min(2000).max(2030),
  ano_fabricacao: z.coerce.number().min(2000).max(2030).optional(),
  preco_publico: z.coerce.number().min(0),
  percentual_desconto: z.coerce.number().min(0).max(1),
  valor_km_adicional: z.coerce.number().min(0).optional(),
  motor: z.string().optional(),
  potencia: z.string().optional(),
  transmissao: z.string().optional(),
  combustivel: z.string().optional(),
  consumo_urbano: z.coerce.number().optional(),
  consumo_rodoviario: z.coerce.number().optional(),
  imagem_url: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface ModeloVeiculoFormProps {
  open: boolean;
  onClose: () => void;
  modeloId?: string | null;
}

export function ModeloVeiculoForm({
  open,
  onClose,
  modeloId,
}: ModeloVeiculoFormProps) {
  const [activeTab, setActiveTab] = useState('dados');
  const { modelos, createModelo, updateModelo } = useModelosVeiculos();
  const [isSaving, setIsSaving] = useState(false);

  const editingModelo = modeloId
    ? modelos.find((m) => m.id === modeloId)
    : null;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: '',
      nome: '',
      montadora: '',
      categoria: '',
      ano_modelo: new Date().getFullYear() + 1,
      ano_fabricacao: new Date().getFullYear(),
      preco_publico: 0,
      percentual_desconto: 0,
      valor_km_adicional: 0.75,
      motor: '',
      potencia: '',
      transmissao: '',
      combustivel: '',
      consumo_urbano: undefined,
      consumo_rodoviario: undefined,
      imagem_url: '',
      observacoes: '',
      ativo: true,
    },
  });

  useEffect(() => {
    if (editingModelo) {
      form.reset({
        codigo: editingModelo.codigo || '',
        nome: editingModelo.nome,
        montadora: editingModelo.montadora,
        categoria: editingModelo.categoria || '',
        ano_modelo: editingModelo.ano_modelo,
        ano_fabricacao: editingModelo.ano_fabricacao || undefined,
        preco_publico: editingModelo.preco_publico,
        percentual_desconto: editingModelo.percentual_desconto,
        valor_km_adicional: editingModelo.valor_km_adicional || 0.75,
        motor: editingModelo.motor || '',
        potencia: editingModelo.potencia || '',
        transmissao: editingModelo.transmissao || '',
        combustivel: editingModelo.combustivel || '',
        consumo_urbano: editingModelo.consumo_urbano || undefined,
        consumo_rodoviario: editingModelo.consumo_rodoviario || undefined,
        imagem_url: editingModelo.imagem_url || '',
        observacoes: editingModelo.observacoes || '',
        ativo: editingModelo.ativo,
      });
    } else {
      form.reset();
    }
  }, [editingModelo, form]);

  const precoPublico = form.watch('preco_publico');
  const percentualDesconto = form.watch('percentual_desconto');
  const valorFinal = precoPublico * (1 - percentualDesconto);

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const payload = {
        ...data,
        valor_final: data.preco_publico * (1 - data.percentual_desconto),
      };

      if (modeloId) {
        await updateModelo({ id: modeloId, ...payload });
      } else {
        await createModelo(payload);
      }
    } finally {
      setIsSaving(false);
    }
    onClose();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] md:w-[50vw] max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {modeloId ? 'Editar Modelo' : 'Novo Modelo de Veículo'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dados" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Dados
            </TabsTrigger>
            <TabsTrigger
              value="cores"
              disabled={!modeloId}
              className="flex items-center gap-2"
            >
              <Palette className="h-4 w-4" />
              Cores
            </TabsTrigger>
            <TabsTrigger
              value="itens"
              disabled={!modeloId}
              className="flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              Itens
            </TabsTrigger>
            <TabsTrigger value="specs" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Specs
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <TabsContent value="dados" className="space-y-6 mt-6">
                {/* Identificação */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="codigo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código</FormLabel>
                        <FormControl>
                          <Input placeholder="COR-GLI-2025" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Modelo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Corolla GLI" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="montadora"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montadora *</FormLabel>
                        <FormControl>
                          <Input placeholder="Toyota" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="categoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIAS_VEICULO.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ativo"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <FormLabel>Ativo</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ano_fabricacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ano Fabricação</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ano_modelo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ano Modelo *</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Preços */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold">Precificação</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="preco_publico"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço Público (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="150000.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="percentual_desconto"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Desconto: {(field.value * 100).toFixed(1)}%
                          </FormLabel>
                          <FormControl>
                            <Slider
                              value={[field.value * 100]}
                              onValueChange={(v) =>
                                field.onChange(v[0] / 100)
                              }
                              max={50}
                              step={0.5}
                              className="py-4"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                    <span className="text-sm font-medium">Valor Final:</span>
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency(valorFinal)}
                    </span>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="valor_km_adicional"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor KM Adicional (R$/km)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.75"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          Valor cobrado por quilômetro excedente neste modelo
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observações adicionais..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="cores" className="mt-6">
                {modeloId ? (
                  <ModeloCoresManager modeloId={modeloId} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Salve o modelo primeiro para adicionar cores.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="itens" className="mt-6">
                {modeloId ? (
                  <ModeloItensManager modeloId={modeloId} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Salve o modelo primeiro para adicionar itens.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="specs" className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="motor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motor</FormLabel>
                        <FormControl>
                          <Input placeholder="2.0 16V" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="potencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Potência</FormLabel>
                        <FormControl>
                          <Input placeholder="177 cv" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="transmissao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transmissão</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIPOS_TRANSMISSAO.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="combustivel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Combustível</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIPOS_COMBUSTIVEL.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="consumo_urbano"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consumo Urbano (km/l)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="10.5"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="consumo_rodoviario"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consumo Rodoviário (km/l)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="14.2"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? 'Salvando...'
                    : modeloId
                    ? 'Salvar Alterações'
                    : 'Criar Modelo'}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
