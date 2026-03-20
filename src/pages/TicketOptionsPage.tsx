import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Trash2, 
  PhoneCall, 
  AlertTriangle, 
  CheckCircle,
  XCircle, 
  HelpCircle,
  Users,
  Shield,
  GripVertical,
  Loader2
} from "lucide-react";
import { 
  useTicketOrigens, 
  useTicketMotivos, 
  useTicketAnalises,
  useTicketDepartamentos,
  useTicketCustomFields,
  useCreateTicketOrigem,
  useUpdateTicketOrigem,
  useDeleteTicketOrigem,
  useCreateTicketMotivo,
  useUpdateTicketMotivo,
  useDeleteTicketMotivo,
  useCreateTicketAnalise,
  useUpdateTicketAnalise,
  useDeleteTicketAnalise,
  useCreateTicketDepartamento,
  useUpdateTicketDepartamento,
  useDeleteTicketDepartamento,
  useCreateTicketCustomField,
  useUpdateTicketCustomField,
  useDeleteTicketCustomField,
  useTicketConfigAuditLogs,
} from "@/hooks/useTicketOptions";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function TicketOptionsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações de Tickets</h1>
        <p className="text-muted-foreground">
          Gerencie as opções dinâmicas do sistema de tickets
        </p>
      </div>

      <Tabs defaultValue="origens" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="origens" className="gap-2">
            <PhoneCall className="w-4 h-4" />
            Origens
          </TabsTrigger>
          <TabsTrigger value="motivos" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Motivos
          </TabsTrigger>
          <TabsTrigger value="analises" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Análise Final
          </TabsTrigger>
          <TabsTrigger value="departamentos" className="gap-2">
            <Users className="w-4 h-4" />
            Departamentos
          </TabsTrigger>
          <TabsTrigger value="custom-fields" className="gap-2">
            <Plus className="w-4 h-4" />
            Campos Customizados
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="gap-2">
            <Shield className="w-4 h-4" />
            Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="origens" className="mt-4">
          <OrigensTab />
        </TabsContent>

        <TabsContent value="motivos" className="mt-4">
          <MotivosTab />
        </TabsContent>

        <TabsContent value="analises" className="mt-4">
          <AnalisesTab />
        </TabsContent>

        <TabsContent value="departamentos" className="mt-4">
          <DepartamentosTab />
        </TabsContent>

        <TabsContent value="custom-fields" className="mt-4">
          <CustomFieldsTab />
        </TabsContent>

        <TabsContent value="auditoria" className="mt-4">
          <AuditoriaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AuditoriaTab() {
  const [actionFilter, setActionFilter] = useState<'ALL' | 'INSERT' | 'UPDATE' | 'DELETE'>('ALL');
  const [tableFilter, setTableFilter] = useState('all');
  const { data: logs, isLoading } = useTicketConfigAuditLogs({
    action: actionFilter,
    tableName: tableFilter,
    limit: 150,
  });

  const tableOptions = [
    { value: 'all', label: 'Todas as tabelas' },
    { value: 'ticket_origens', label: 'Origens' },
    { value: 'ticket_motivos', label: 'Motivos' },
    { value: 'ticket_departamento_opcoes', label: 'Departamentos' },
    { value: 'ticket_custom_field_definitions', label: 'Campos customizados' },
  ];

  const formatDateTime = (value: string) => {
    try {
      return new Date(value).toLocaleString('pt-BR');
    } catch {
      return value;
    }
  };

  const getActionColor = (action: string) => {
    if (action === 'INSERT') return 'text-emerald-600';
    if (action === 'UPDATE') return 'text-amber-600';
    if (action === 'DELETE') return 'text-rose-600';
    return 'text-muted-foreground';
  };

  const fieldList = (changedFields: Record<string, any> | null) => {
    if (!changedFields) return '-';
    const keys = Object.keys(changedFields);
    if (keys.length === 0) return '-';
    if (keys.length <= 3) return keys.join(', ');
    return `${keys.slice(0, 3).join(', ')} +${keys.length - 3}`;
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditoria de Configurações</CardTitle>
        <CardDescription>
          Histórico técnico das mudanças em origens, motivos, departamentos e campos customizados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-muted rounded-lg">
          <div>
            <Label className="text-xs text-muted-foreground">Ação</Label>
            <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="INSERT">INSERT</SelectItem>
                <SelectItem value="UPDATE">UPDATE</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tabela</Label>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tableOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end text-xs text-muted-foreground">
            {logs?.length || 0} evento(s) encontrados
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-muted text-xs font-semibold">
            <div className="col-span-2">Data/Hora</div>
            <div className="col-span-2">Ação</div>
            <div className="col-span-3">Tabela</div>
            <div className="col-span-2">Registro</div>
            <div className="col-span-3">Campos alterados</div>
          </div>

          <div className="max-h-[520px] overflow-y-auto">
            {(logs || []).map((log) => (
              <div key={log.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-t text-sm">
                <div className="col-span-2 text-xs text-muted-foreground">{formatDateTime(log.changed_at)}</div>
                <div className={`col-span-2 font-medium ${getActionColor(log.action)}`}>{log.action}</div>
                <div className="col-span-3 text-xs">{log.table_name}</div>
                <div className="col-span-2 text-xs truncate">{log.record_id || '-'}</div>
                <div className="col-span-3 text-xs text-muted-foreground">{fieldList(log.changed_fields as any)}</div>
              </div>
            ))}

            {(logs || []).length === 0 && (
              <div className="p-8 text-sm text-muted-foreground text-center">
                Nenhum evento de auditoria encontrado para os filtros selecionados.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ===========================================
// Tab: Origens
// ===========================================
function OrigensTab() {
  const { data: origens, isLoading } = useTicketOrigens();
  const createOrigem = useCreateTicketOrigem();
  const updateOrigem = useUpdateTicketOrigem();
  const deleteOrigem = useDeleteTicketOrigem();

  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const handleCreate = async () => {
    if (!newValue.trim() || !newLabel.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    
    await createOrigem.mutateAsync({ 
      value: newValue.trim().toLowerCase().replace(/\s+/g, '_'), 
      label: newLabel.trim(),
      sort_order: (origens?.length || 0) + 1
    });
    setNewValue("");
    setNewLabel("");
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await updateOrigem.mutateAsync({ id, is_active: !isActive });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Origens de Lead</CardTitle>
        <CardDescription>
          Defina de onde os tickets podem originar (WhatsApp, Site, Ligação, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form para adicionar */}
        <div className="flex gap-2 p-4 bg-muted rounded-lg">
          <Input
            placeholder="Valor (ex: whatsapp)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Label (ex: WhatsApp)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleCreate} disabled={createOrigem.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>

        {/* Lista */}
        <div className="space-y-2">
          {origens?.map((origem) => (
            <div 
              key={origem.id} 
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                <div>
                  <p className="font-medium">{origem.label}</p>
                  <p className="text-xs text-muted-foreground">{origem.value}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`toggle-${origem.id}`} className="text-xs text-muted-foreground">
                    {origem.is_active ? "Ativo" : "Inativo"}
                  </Label>
                  <Switch
                    id={`toggle-${origem.id}`}
                    checked={origem.is_active}
                    onCheckedChange={() => handleToggle(origem.id, origem.is_active)}
                  />
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir origem?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. A origem "{origem.label}" será removida permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteOrigem.mutate(origem.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ===========================================
// Tab: Motivos
// ===========================================
function MotivosTab() {
  const { data: motivos, isLoading } = useTicketMotivos();
  const createMotivo = useCreateTicketMotivo();
  const updateMotivo = useUpdateTicketMotivo();
  const deleteMotivo = useDeleteTicketMotivo();

  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const handleCreate = async () => {
    if (!newValue.trim() || !newLabel.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    
    await createMotivo.mutateAsync({ 
      value: newValue.trim(), 
      label: newLabel.trim(),
      sort_order: (motivos?.length || 0) + 1
    });
    setNewValue("");
    setNewLabel("");
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await updateMotivo.mutateAsync({ id, is_active: !isActive });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Motivos de Reclamação</CardTitle>
        <CardDescription>
          Defina os motivos possíveis para abertura de tickets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form para adicionar */}
        <div className="flex gap-2 p-4 bg-muted rounded-lg">
          <Input
            placeholder="Valor (ex: Cobrança Indevida)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Label (ex: Cobrança Indevida)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleCreate} disabled={createMotivo.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>

        {/* Lista */}
        <div className="space-y-2">
          {motivos?.map((motivo) => (
            <div 
              key={motivo.id} 
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                <div>
                  <p className="font-medium">{motivo.label}</p>
                  <p className="text-xs text-muted-foreground">{motivo.value}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`toggle-motivo-${motivo.id}`} className="text-xs text-muted-foreground">
                    {motivo.is_active ? "Ativo" : "Inativo"}
                  </Label>
                  <Switch
                    id={`toggle-motivo-${motivo.id}`}
                    checked={motivo.is_active}
                    onCheckedChange={() => handleToggle(motivo.id, motivo.is_active)}
                  />
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir motivo?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O motivo "{motivo.label}" será removido permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMotivo.mutate(motivo.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ===========================================
// Tab: Análises Finais
// ===========================================
function AnalisesTab() {
  const { data: analises, isLoading } = useTicketAnalises();
  const createAnalise = useCreateTicketAnalise();
  const updateAnalise = useUpdateTicketAnalise();
  const deleteAnalise = useDeleteTicketAnalise();

  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("HelpCircle");
  const [newColor, setNewColor] = useState("text-gray-600");

  const ICON_OPTIONS = [
    { value: "CheckCircle", label: "Check", component: CheckCircle, color: "text-green-600" },
    { value: "XCircle", label: "X", component: XCircle, color: "text-red-600" },
    { value: "HelpCircle", label: "?", component: HelpCircle, color: "text-yellow-600" },
  ];

  const handleCreate = async () => {
    if (!newValue.trim() || !newLabel.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    
    await createAnalise.mutateAsync({ 
      value: newValue.trim().toLowerCase().replace(/\s+/g, '_'), 
      label: newLabel.trim(),
      icon: newIcon,
      color: newColor,
      sort_order: (analises?.length || 0) + 1
    });
    setNewValue("");
    setNewLabel("");
    setNewIcon("HelpCircle");
    setNewColor("text-gray-600");
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await updateAnalise.mutateAsync({ id, is_active: !isActive });
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "CheckCircle": return CheckCircle;
      case "XCircle": return XCircle;
      default: return HelpCircle;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise Final (Procedência)</CardTitle>
        <CardDescription>
          Defina as opções de classificação final do ticket (Procedente, Improcedente, Dúvida, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form para adicionar */}
        <div className="flex flex-wrap gap-2 p-4 bg-muted rounded-lg">
          <Input
            placeholder="Valor (ex: procedente)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="flex-1 min-w-[150px]"
          />
          <Input
            placeholder="Label (ex: Procedente)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="flex-1 min-w-[150px]"
          />
          <div className="flex gap-2">
            {ICON_OPTIONS.map((opt) => {
              const Icon = opt.component;
              return (
                <Button
                  key={opt.value}
                  type="button"
                  variant={newIcon === opt.value ? "default" : "outline"}
                  size="icon"
                  onClick={() => {
                    setNewIcon(opt.value);
                    setNewColor(opt.color);
                  }}
                >
                  <Icon className={`w-4 h-4 ${newIcon === opt.value ? "" : opt.color}`} />
                </Button>
              );
            })}
          </div>
          <Button onClick={handleCreate} disabled={createAnalise.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>

        {/* Lista */}
        <div className="space-y-2">
          {analises?.map((analise) => {
            const Icon = getIconComponent(analise.icon);
            return (
              <div 
                key={analise.id} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                  <Icon className={`w-5 h-5 ${analise.color}`} />
                  <div>
                    <p className="font-medium">{analise.label}</p>
                    <p className="text-xs text-muted-foreground">{analise.value}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`toggle-analise-${analise.id}`} className="text-xs text-muted-foreground">
                      {analise.is_active ? "Ativo" : "Inativo"}
                    </Label>
                    <Switch
                      id={`toggle-analise-${analise.id}`}
                      checked={analise.is_active}
                      onCheckedChange={() => handleToggle(analise.id, analise.is_active)}
                    />
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir análise?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A opção "{analise.label}" será removida permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteAnalise.mutate(analise.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DepartamentosTab() {
  const { data: departamentos, isLoading } = useTicketDepartamentos();
  const createDepartamento = useCreateTicketDepartamento();
  const updateDepartamento = useUpdateTicketDepartamento();
  const deleteDepartamento = useDeleteTicketDepartamento();

  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const handleCreate = async () => {
    if (!newValue.trim() || !newLabel.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    await createDepartamento.mutateAsync({
      value: newValue.trim().toLowerCase().replace(/\s+/g, '_'),
      label: newLabel.trim(),
      sort_order: (departamentos?.length || 0) + 1,
    });

    setNewValue("");
    setNewLabel("");
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await updateDepartamento.mutateAsync({ id, is_active: !isActive });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Departamentos</CardTitle>
        <CardDescription>
          Configure os departamentos disponíveis para abertura e encaminhamento de tickets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 p-4 bg-muted rounded-lg">
          <Input
            placeholder="Valor técnico (ex: operacao_sp)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Label (ex: Operação SP)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleCreate} disabled={createDepartamento.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {departamentos?.map((departamento) => (
            <div
              key={departamento.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                <div>
                  <p className="font-medium">{departamento.label}</p>
                  <p className="text-xs text-muted-foreground">{departamento.value}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`toggle-dep-${departamento.id}`} className="text-xs text-muted-foreground">
                    {departamento.is_active ? "Ativo" : "Inativo"}
                  </Label>
                  <Switch
                    id={`toggle-dep-${departamento.id}`}
                    checked={departamento.is_active}
                    onCheckedChange={() => handleToggle(departamento.id, departamento.is_active)}
                  />
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir departamento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O departamento "{departamento.label}" será removido.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteDepartamento.mutate(departamento.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CustomFieldsTab() {
  const { data: customFields, isLoading } = useTicketCustomFields();
  const createField = useCreateTicketCustomField();
  const updateField = useUpdateTicketCustomField();
  const deleteField = useDeleteTicketCustomField();

  const [fieldKey, setFieldKey] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");

  const handleCreate = async () => {
    if (!fieldKey.trim() || !fieldLabel.trim()) {
      toast.error("Preencha chave e nome do campo");
      return;
    }

    await createField.mutateAsync({
      field_key: fieldKey.trim().toLowerCase().replace(/\s+/g, '_'),
      label: fieldLabel.trim(),
      field_type: fieldType as any,
      entity: 'ticket',
      sort_order: (customFields?.length || 0) + 1,
      options: [],
      validation_rules: {},
    });

    setFieldKey("");
    setFieldLabel("");
    setFieldType("text");
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await updateField.mutateAsync({ id, is_active: !isActive });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campos Customizados de Ticket</CardTitle>
        <CardDescription>
          Crie campos extras sem deploy para evoluir o formulário de tickets no futuro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-4 bg-muted rounded-lg">
          <Input
            placeholder="Chave (ex: contrato_numero)"
            value={fieldKey}
            onChange={(e) => setFieldKey(e.target.value)}
          />
          <Input
            placeholder="Nome do campo"
            value={fieldLabel}
            onChange={(e) => setFieldLabel(e.target.value)}
          />
          <Select value={fieldType} onValueChange={setFieldType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Texto</SelectItem>
              <SelectItem value="textarea">Texto longo</SelectItem>
              <SelectItem value="number">Número</SelectItem>
              <SelectItem value="date">Data</SelectItem>
              <SelectItem value="datetime">Data e hora</SelectItem>
              <SelectItem value="select">Lista simples</SelectItem>
              <SelectItem value="multiselect">Lista múltipla</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleCreate} disabled={createField.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {customFields?.map((field) => (
            <div
              key={field.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium">{field.label}</p>
                <p className="text-xs text-muted-foreground">{field.field_key} · {field.field_type}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`toggle-custom-${field.id}`} className="text-xs text-muted-foreground">
                    {field.is_active ? 'Ativo' : 'Inativo'}
                  </Label>
                  <Switch
                    id={`toggle-custom-${field.id}`}
                    checked={field.is_active}
                    onCheckedChange={() => handleToggle(field.id, field.is_active)}
                  />
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir campo customizado?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação remove a definição do campo "{field.label}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteField.mutate(field.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
