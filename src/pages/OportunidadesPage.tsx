import { useState, useMemo } from 'react';
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useOportunidades } from '@/hooks/useOportunidades';
import { useFunis, useFunil } from '@/hooks/useFunis';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, LayoutGrid, LayoutList, Package, DollarSign, Calendar, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateSafe } from '@/lib/dateUtils';
import { ptBR } from 'date-fns/locale';
import { OportunidadeKanbanCard } from '@/components/oportunidades/OportunidadeKanbanCard';

// Componente de coluna Kanban com drop zone
function KanbanColumn({
  estagioId,
  estagioNome,
  estagioCor,
  oportunidades,
  onDrop
}: {
  estagioId: string;
  estagioNome: string;
  estagioCor: string;
  oportunidades: any[];
  onDrop: (oportunidadeId: string, estagioId: string) => void;
}) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'OPORTUNIDADE',
    drop: (item: { id: string }) => onDrop(item.id, estagioId),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`flex flex-col min-h-[500px] rounded-lg border-2 transition-colors ${isOver ? 'border-primary bg-primary/5' : 'border-border'
        }`}
    >
      <div
        className="p-3 rounded-t-lg font-semibold text-sm flex items-center justify-between"
        style={{ backgroundColor: estagioCor + '20', borderBottom: `2px solid ${estagioCor}` }}
      >
        <span>{estagioNome}</span>
        <Badge variant="secondary">{oportunidades.length}</Badge>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {oportunidades.map((opp) => (
          <OportunidadeKanbanCard
            key={opp.id}
            id={opp.id}
            titulo={opp.titulo}
            valor_total={opp.valor_total}
            cliente={opp.cliente}
            user={opp.user}
            created_at={opp.created_at}
            prioridade={opp.prioridade}
          />
        ))}
        {oportunidades.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            Nenhuma oportunidade
          </div>
        )}
      </div>
    </div>
  );
}

export default function OportunidadesPage() {
  const { oportunidades, isLoading, error, createOportunidade, updateOportunidadeEstagio } = useOportunidades();
  const { data: funis } = useFunis();

  const [view, setView] = useState<'grid' | 'kanban'>('kanban');
  const [selectedFunilId, setSelectedFunilId] = useState<string | null>(null);
  const { data: funilSelecionado } = useFunil(selectedFunilId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    valor_total: ''
  });

  // Selecionar funil padrão (vendas) ao carregar
  useState(() => {
    if (funis && funis.length > 0 && !selectedFunilId) {
      const funilVendas = funis.find(f => f.tipo === 'vendas');
      if (funilVendas) {
        setSelectedFunilId(funilVendas.id);
      } else {
        setSelectedFunilId(funis[0].id);
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Buscar primeiro estágio do funil selecionado
      const primeiroEstagio = funilSelecionado?.estagios?.[0];

      await createOportunidade({
        titulo: formData.titulo,
        descricao: formData.descricao,
        valor_total: formData.valor_total ? parseFloat(formData.valor_total) : 0,
        status: 'aberta',
      });

      setIsDialogOpen(false);
      setFormData({ titulo: '', descricao: '', valor_total: '' });
    } catch (err) {
      // Erro já tratado pelo hook
    }
  };

  const handleDrop = async (oportunidadeId: string, novoEstagioId: string) => {
    try {
      await updateOportunidadeEstagio({ oportunidadeId, estagioId: novoEstagioId });
      toast.success('Oportunidade movida!');
    } catch (err) {
      // Erro já tratado pelo hook
    }
  };

  // Agrupar oportunidades por estágio
  const oportunidadesPorEstagio = useMemo(() => {
    if (!funilSelecionado) return {};

    const grupos: Record<string, any[]> = {};
    funilSelecionado.estagios.forEach(estagio => {
      grupos[estagio.id] = oportunidades.filter((opp: any) => opp.estagio_id === estagio.id);
    });

    return grupos;
  }, [oportunidades, funilSelecionado]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberta': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'fechada': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'cancelada': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Oportunidades</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas oportunidades de negócio e acompanhe o progresso
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Oportunidade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Oportunidade</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Ex: Proposta de sistema de gestão"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Detalhes sobre a oportunidade..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor_total">Valor Total (R$)</Label>
                  <Input
                    id="valor_total"
                    type="number"
                    step="0.01"
                    value={formData.valor_total}
                    onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Criar Oportunidade
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-4">
          {/* Seletor de Funil */}
          <div className="flex-1">
            <Select value={selectedFunilId || undefined} onValueChange={setSelectedFunilId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione um funil" />
              </SelectTrigger>
              <SelectContent>
                {funis?.map((funil) => (
                  <SelectItem key={funil.id} value={funil.id}>
                    {funil.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Toggle de Visualização */}
          <div className="flex gap-2">
            <Button
              variant={view === 'kanban' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('kanban')}
            >
              <LayoutList className="h-4 w-4 mr-2" />
              Kanban
            </Button>
            <Button
              variant={view === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('grid')}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Grid
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin h-12 w-12" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Erro ao carregar oportunidades: {error.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Visualização Kanban */}
        {!isLoading && !error && view === 'kanban' && funilSelecionado && (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${funilSelecionado.estagios.length}, minmax(280px, 1fr))` }}>
            {funilSelecionado.estagios.map((estagio) => (
              <KanbanColumn
                key={estagio.id}
                estagioId={estagio.id}
                estagioNome={estagio.nome}
                estagioCor={estagio.cor || '#3b82f6'}
                oportunidades={oportunidadesPorEstagio[estagio.id] || []}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}

        {/* Empty State Kanban */}
        {!isLoading && !error && view === 'kanban' && !funilSelecionado && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Selecione um funil</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Escolha um funil acima para visualizar as oportunidades em formato Kanban.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Visualização Grid */}
        {!isLoading && !error && view === 'grid' && oportunidades.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {oportunidades.map((oportunidade) => (
              <Card key={oportunidade.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{oportunidade.titulo}</CardTitle>
                    <Badge className={getStatusColor(oportunidade.status || 'aberta')}>
                      {oportunidade.status || 'aberta'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {oportunidade.descricao && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {oportunidade.descricao || ''}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(Number(oportunidade.valor_total) || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{oportunidade.messages_count || 0} mensagens</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      <span>{oportunidade.produtos_count || 0} produtos</span>
                    </div>
                  </div>

                  {oportunidade.cliente && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="text-sm font-medium">
                        {oportunidade.cliente.nome_fantasia || oportunidade.cliente.razao_social}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {oportunidade.created_at && formatDateSafe(oportunidade.created_at, "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State Grid */}
        {!isLoading && !error && view === 'grid' && oportunidades.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma oportunidade encontrada</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Comece criando sua primeira oportunidade de negócio para acompanhar leads e propostas.
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Primeira Oportunidade
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DndProvider>
  );
}