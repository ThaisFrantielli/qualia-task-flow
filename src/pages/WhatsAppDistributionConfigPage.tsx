import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDistributionRules, useAvailableAgents } from '@/hooks/useDistributionRules';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Edit, Trash2, Users, Settings, TrendingUp, BarChart } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { DistributionRule } from '@/hooks/useDistributionRules';

export default function WhatsAppDistributionConfigPage() {
  const navigate = useNavigate();
  const { rules, isLoading, createRule, updateRule, deleteRule } = useDistributionRules();
  const { data: agents = [] } = useAvailableAgents();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DistributionRule | null>(null);

  const [formData, setFormData] = useState({
    agent_id: '',
    is_active: true,
    max_concurrent_conversations: 5,
    priority: 5,
    available_hours: {
      monday: [9, 18] as [number, number],
      tuesday: [9, 18] as [number, number],
      wednesday: [9, 18] as [number, number],
      thursday: [9, 18] as [number, number],
      friday: [9, 18] as [number, number],
      saturday: null as [number, number] | null,
      sunday: null as [number, number] | null
    },
    instance_ids: [] as string[],
    tags: [] as string[]
  });

  const handleOpenDialog = (rule?: DistributionRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        agent_id: rule.agent_id,
        is_active: rule.is_active,
        max_concurrent_conversations: rule.max_concurrent_conversations,
        priority: rule.priority,
        available_hours: rule.available_hours as any,
        instance_ids: rule.instance_ids,
        tags: rule.tags
      });
    } else {
      setEditingRule(null);
      setFormData({
        agent_id: '',
        is_active: true,
        max_concurrent_conversations: 5,
        priority: 5,
        available_hours: {
          monday: [9, 18],
          tuesday: [9, 18],
          wednesday: [9, 18],
          thursday: [9, 18],
          friday: [9, 18],
          saturday: null,
          sunday: null
        },
        instance_ids: [],
        tags: []
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingRule) {
      updateRule({ id: editingRule.id, updates: formData });
    } else {
      createRule(formData);
    }
    setIsDialogOpen(false);
  };

  const handleToggleActive = (rule: DistributionRule) => {
    updateRule({ id: rule.id, updates: { is_active: !rule.is_active } });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta regra?')) {
      deleteRule(id);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Distribuição Automática
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure como as conversas são distribuídas automaticamente para os atendentes
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/configuracoes/whatsapp/distribuicao/dashboard')}
          >
            <BarChart className="h-4 w-4 mr-2" />
            Ver Dashboard
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Atendente
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] md:w-[50vw] max-w-[900px]">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Editar Configuração' : 'Adicionar Atendente'}
              </DialogTitle>
              <DialogDescription>
                Configure as regras de distribuição para este atendente
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Agent Selection */}
              {!editingRule && (
                <div className="space-y-2">
                  <Label>Atendente</Label>
                  <Select
                    value={formData.agent_id}
                    onValueChange={(value) => setFormData({ ...formData, agent_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um atendente" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.full_name || agent.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Active Switch */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Distribuição Ativa</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber conversas automaticamente
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              {/* Max Conversations */}
              <div className="space-y-2">
                <Label>Máximo de Conversas Simultâneas: {formData.max_concurrent_conversations}</Label>
                <Slider
                  value={[formData.max_concurrent_conversations]}
                  onValueChange={([value]) => setFormData({ ...formData, max_concurrent_conversations: value })}
                  min={1}
                  max={20}
                  step={1}
                />
                <p className="text-sm text-muted-foreground">
                  Limite de conversas ativas ao mesmo tempo
                </p>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Prioridade: {formData.priority}</Label>
                <Slider
                  value={[formData.priority]}
                  onValueChange={([value]) => setFormData({ ...formData, priority: value })}
                  min={0}
                  max={10}
                  step={1}
                />
                <p className="text-sm text-muted-foreground">
                  Atendentes com maior prioridade recebem conversas primeiro (0-10)
                </p>
              </div>

              {/* Working Hours Note */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Horários de trabalho:</strong> Segunda a Sexta das 9h às 18h (padrão)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Para configurações avançadas de horário, edite diretamente no banco de dados
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.agent_id && !editingRule}>
                {editingRule ? 'Salvar Alterações' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total de Atendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{rules.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {rules.filter(r => r.is_active).length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Inativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-muted-foreground">
              {rules.filter(r => !r.is_active).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Atendentes</CardTitle>
          <CardDescription>
            Gerencie as regras de distribuição automática para cada atendente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma regra configurada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione atendentes para começar a usar a distribuição automática
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar>
                      <AvatarImage src={rule.agent?.avatar_url || undefined} />
                      <AvatarFallback>
                        {rule.agent?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {rule.agent?.full_name || rule.agent?.email || 'Usuário'}
                        </p>
                        {rule.is_active ? (
                          <Badge variant="default" className="bg-green-600">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                        {rule.priority > 5 && (
                          <Badge variant="outline">Alta Prioridade</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>Max: {rule.max_concurrent_conversations} conversas</span>
                        <span>•</span>
                        <span>Prioridade: {rule.priority}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => handleToggleActive(rule)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(rule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm">Como funciona a distribuição automática?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            <strong>1. Prioridade:</strong> Atendentes com maior prioridade recebem conversas primeiro
          </p>
          <p>
            <strong>2. Carga de Trabalho:</strong> Entre atendentes de mesma prioridade, quem tem menos conversas ativas recebe a próxima
          </p>
          <p>
            <strong>3. Limite:</strong> Quando um atendente atinge o máximo de conversas, ele para de receber novas até liberar espaço
          </p>
          <p>
            <strong>4. Desativar:</strong> Para parar de receber conversas automaticamente, desative o switch "Distribuição Ativa"
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
