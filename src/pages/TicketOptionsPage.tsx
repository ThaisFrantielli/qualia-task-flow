import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  GripVertical,
  Loader2
} from "lucide-react";
import { 
  useTicketOrigens, 
  useTicketMotivos, 
  useTicketAnalises,
  useCreateTicketOrigem,
  useUpdateTicketOrigem,
  useDeleteTicketOrigem,
  useCreateTicketMotivo,
  useUpdateTicketMotivo,
  useDeleteTicketMotivo,
  useCreateTicketAnalise,
  useUpdateTicketAnalise,
  useDeleteTicketAnalise
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
        <TabsList className="grid w-full grid-cols-3">
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
      </Tabs>
    </div>
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
