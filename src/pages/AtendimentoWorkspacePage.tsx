import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Layers, ListChecks, ShieldAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTickets } from "@/hooks/useTickets";
import FilaTriagem from "@/pages/FilaTriagem";
import { SLAGargalosPanel } from "@/components/tickets/SLAGargalosPanel";

export default function AtendimentoWorkspacePage() {
  const { user } = useAuth();
  const { data: meusTickets, isLoading } = useTickets({ atendente_id: user?.id });

  const myStats = useMemo(() => {
    const rows = meusTickets || [];
    const now = Date.now();
    const emAberto = rows.filter((t: any) => t.status !== "resolvido" && t.status !== "fechado");
    const slaVencido = emAberto.filter((t: any) => {
      const sla = t.sla_resolucao ? new Date(t.sla_resolucao).getTime() : 0;
      return sla > 0 && sla < now;
    });
    return { total: rows.length, emAberto: emAberto.length, slaVencido: slaVencido.length };
  }, [meusTickets]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Workspace de Atendimento</h1>
        <p className="text-sm text-muted-foreground">Visão unificada de fila, casos atribuídos e risco de SLA.</p>
      </div>

      <Tabs defaultValue="fila" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full md:w-auto">
          <TabsTrigger value="fila" className="gap-2"><Layers className="h-4 w-4" />Fila</TabsTrigger>
          <TabsTrigger value="meus-casos" className="gap-2"><ListChecks className="h-4 w-4" />Meus Casos</TabsTrigger>
          <TabsTrigger value="sla" className="gap-2"><ShieldAlert className="h-4 w-4" />SLA</TabsTrigger>
        </TabsList>

        <TabsContent value="fila">
          <FilaTriagem />
        </TabsContent>

        <TabsContent value="meus-casos" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{myStats.total}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Em aberto</p><p className="text-2xl font-bold">{myStats.emAberto}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">SLA vencido</p><p className="text-2xl font-bold text-rose-600">{myStats.slaVencido}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tickets atribuídos a mim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading && <p className="text-sm text-muted-foreground">Carregando casos...</p>}
              {!isLoading && (meusTickets || []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum caso atribuído no momento.</p>
              )}
              {(meusTickets || []).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{t.numero_ticket || t.id}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[600px]">{t.titulo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.status === "resolvido" || t.status === "fechado" ? "secondary" : "default"}>{t.status}</Badge>
                    <Link to={`/tickets/${t.id}`} className="text-xs text-primary underline">Abrir</Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla">
          <SLAGargalosPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
