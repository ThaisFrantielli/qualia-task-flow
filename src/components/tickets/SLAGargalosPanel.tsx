import { useMemo } from "react";
import { AlertTriangle, Clock3, Layers3 } from "lucide-react";
import { useTickets } from "@/hooks/useTickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type BucketRow = { label: string; total: number };

function sortRows(rows: BucketRow[]) {
  return [...rows].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

export function SLAGargalosPanel() {
  const { data: tickets, isLoading } = useTickets();

  const metrics = useMemo(() => {
    const all = tickets || [];
    const now = Date.now();
    const abertos = all.filter(
      (t: any) => t.status !== "resolvido" && t.status !== "fechado",
    );

    const vencidos = abertos.filter((t: any) => {
      const sla = t.sla_resolucao ? new Date(t.sla_resolucao).getTime() : 0;
      return sla > 0 && sla < now;
    });

    const porPrioridadeMap = vencidos.reduce((acc: Record<string, number>, t: any) => {
      const key = t.prioridade || "sem_prioridade";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const porDepartamentoMap = vencidos.reduce((acc: Record<string, number>, t: any) => {
      const key = t.departamento || "sem_departamento";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const porPrioridade = sortRows(
      Object.entries(porPrioridadeMap).map(([label, total]) => ({ label, total })),
    );
    const porDepartamento = sortRows(
      Object.entries(porDepartamentoMap).map(([label, total]) => ({ label, total })),
    );

    const coberturaSla =
      abertos.length > 0 ? Math.round(((abertos.length - vencidos.length) / abertos.length) * 100) : 100;

    return {
      abertos: abertos.length,
      vencidos: vencidos.length,
      coberturaSla,
      porPrioridade,
      porDepartamento,
    };
  }, [tickets]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando painel de gargalos SLA...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Casos em aberto</p>
                <p className="text-2xl font-bold">{metrics.abertos}</p>
              </div>
              <Clock3 className="h-5 w-5 text-slate-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">SLA vencido</p>
                <p className="text-2xl font-bold text-rose-600">{metrics.vencidos}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Cobertura SLA</p>
                <p className={`text-2xl font-bold ${metrics.coberturaSla >= 95 ? "text-emerald-600" : "text-amber-600"}`}>
                  {metrics.coberturaSla}%
                </p>
              </div>
              <Layers3 className="h-5 w-5 text-slate-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Gargalos por Prioridade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.porPrioridade.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem gargalos de SLA no momento.</p>
            )}
            {metrics.porPrioridade.map((row) => (
              <div key={row.label} className="flex items-center justify-between border rounded-md px-3 py-2">
                <span className="text-sm capitalize">{row.label.replace(/_/g, " ")}</span>
                <Badge variant={row.total >= 5 ? "destructive" : "secondary"}>{row.total}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Gargalos por Departamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.porDepartamento.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem gargalos de SLA no momento.</p>
            )}
            {metrics.porDepartamento.map((row) => (
              <div key={row.label} className="flex items-center justify-between border rounded-md px-3 py-2">
                <span className="text-sm">{row.label}</span>
                <Badge variant={row.total >= 5 ? "destructive" : "secondary"}>{row.total}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
