import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClienteStats {
  ticketsAbertos: number;
  ticketsTotal: number;
  oportunidadesAbertas: number;
  valorTotalOportunidades: number;
  tarefasPendentes: number;
  ultimoContato: string | null;
}

export function useClienteStats(clienteId: string | null) {
  return useQuery({
    queryKey: ['cliente-stats', clienteId],
    queryFn: async (): Promise<ClienteStats> => {
      if (!clienteId) {
        return {
          ticketsAbertos: 0,
          ticketsTotal: 0,
          oportunidadesAbertas: 0,
          valorTotalOportunidades: 0,
          tarefasPendentes: 0,
          ultimoContato: null,
        };
      }

      const [ticketsRes, oportunidadesRes, tarefasRes, atendimentosRes] = await Promise.all([
        supabase
          .from('tickets')
          .select('id, status')
          .eq('cliente_id', clienteId),
        supabase
          .from('oportunidades')
          .select('id, status, valor_total')
          .eq('cliente_id', clienteId),
        supabase
          .from('tasks')
          .select('id, status')
          .eq('cliente_id', clienteId)
          .neq('status', 'done'),
        supabase
          .from('atendimentos')
          .select('created_at')
          .eq('cliente_id', clienteId)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const tickets = ticketsRes.data || [];
      const oportunidades = oportunidadesRes.data || [];
      const tarefas = tarefasRes.data || [];
      const ultimoAtendimento = atendimentosRes.data?.[0];

      const ticketsAbertos = tickets.filter(
        (t) => t.status && !['resolvido', 'fechado', 'cancelado'].includes(t.status.toLowerCase())
      ).length;

      const oportunidadesAbertas = oportunidades.filter(
        (o) => o.status && o.status.toLowerCase() === 'aberta'
      ).length;

      const valorTotalOportunidades = oportunidades.reduce(
        (acc, o) => acc + (Number(o.valor_total) || 0),
        0
      );

      return {
        ticketsAbertos,
        ticketsTotal: tickets.length,
        oportunidadesAbertas,
        valorTotalOportunidades,
        tarefasPendentes: tarefas.length,
        ultimoContato: ultimoAtendimento?.created_at || null,
      };
    },
    enabled: !!clienteId,
    staleTime: 30000,
  });
}

export function useClientesStats(clienteIds: string[]) {
  return useQuery({
    queryKey: ['clientes-stats-batch', clienteIds.join(',')],
    queryFn: async (): Promise<Record<string, ClienteStats>> => {
      if (clienteIds.length === 0) return {};

      const [ticketsRes, oportunidadesRes] = await Promise.all([
        supabase
          .from('tickets')
          .select('id, status, cliente_id')
          .in('cliente_id', clienteIds),
        supabase
          .from('oportunidades')
          .select('id, status, valor_total, cliente_id')
          .in('cliente_id', clienteIds),
      ]);

      const tickets = ticketsRes.data || [];
      const oportunidades = oportunidadesRes.data || [];

      const statsMap: Record<string, ClienteStats> = {};

      clienteIds.forEach((id) => {
        const clienteTickets = tickets.filter((t) => t.cliente_id === id);
        const clienteOportunidades = oportunidades.filter((o) => o.cliente_id === id);

        const ticketsAbertos = clienteTickets.filter(
          (t) => t.status && !['resolvido', 'fechado', 'cancelado'].includes(t.status.toLowerCase())
        ).length;

        const oportunidadesAbertas = clienteOportunidades.filter(
          (o) => o.status && o.status.toLowerCase() === 'aberta'
        ).length;

        const valorTotalOportunidades = clienteOportunidades.reduce(
          (acc, o) => acc + (Number(o.valor_total) || 0),
          0
        );

        statsMap[id] = {
          ticketsAbertos,
          ticketsTotal: clienteTickets.length,
          oportunidadesAbertas,
          valorTotalOportunidades,
          tarefasPendentes: 0,
          ultimoContato: null,
        };
      });

      return statsMap;
    },
    enabled: clienteIds.length > 0,
    staleTime: 30000,
  });
}
