
import { useAtendimentosKanban } from "../hooks/useAtendimentosKanban";
import { KanbanMetricCard } from "../components/KanbanMetricCard";
import KanbanTaskCard from "../components/KanbanTaskCard";
import { ClipboardDocumentListIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const kanbanColumns = [
  { key: "solicitacao", title: "Solicitação", color: "bg-blue-50 border-blue-200", border: "border-blue-300", header: "text-blue-700" },
  { key: "em_analise", title: "Em Análise", color: "bg-yellow-50 border-yellow-200", border: "border-yellow-300", header: "text-yellow-700" },
  { key: "resolvido", title: "Resolvido", color: "bg-green-50 border-green-200", border: "border-green-300", header: "text-green-700" },
  { key: "atrasado", title: "Atrasados", color: "bg-red-50 border-red-200", border: "border-red-300", header: "text-red-700" },
];

export default function KanbanDemo() {
  const { data, loading, error } = useAtendimentosKanban();

  // Map status do banco para colunas do kanban
  function getStatusKey(status: string | null | undefined) {
    if (!status) return "solicitacao";
    if (status === "em_analise") return "em_analise";
    if (status === "resolvido") return "resolvido";
    if (status === "atrasado") return "atrasado";
    return "solicitacao";
  }

  // Fallback para mock enquanto carrega ou erro
  const cards = !loading && !error && data.length > 0 ? data.map((a) => ({
    id: a.id,
    cliente: a.client_name || "-",
    resumo: a.summary || undefined,
    data: a.created_at ? new Date(a.created_at).toLocaleDateString() : "-",
    status: getStatusKey(a.status as string),
    avatar: a.client_name ? a.client_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2) : "-",
    motivo: a.tipo_atendimento || "-",
  // campos extras removidos para compatibilidade
  })) : [
    {
      id: 1,
      cliente: "Thais Cabral",
      resumo: undefined,
      data: "06/08/2025",
      status: "solicitacao",
      avatar: "TC",
      motivo: "Solicitação",
  // prioridade: "Urgente",
  // atrasado: true,
  // anexos: 2,
  // comentarios: 1,
    },
    {
      id: 2,
      cliente: "SEAD",
      resumo: undefined,
      data: "06/08/2025",
      status: "solicitacao",
      avatar: "S",
      motivo: "Solicitação",
  // prioridade: "Média",
  // atrasado: false,
  // anexos: 0,
  // comentarios: 0,
    },
    {
      id: 3,
      cliente: "Empresa X",
      resumo: "não consegui contato no telefone da empresa (teste)",
      data: "24/07/2025",
      status: "solicitacao",
      avatar: "X",
      motivo: "Solicitação",
  // prioridade: "Baixa",
  // atrasado: false,
  // anexos: 1,
  // comentarios: 2,
    },
  ];

  // Métricas para painel superior
  const total = cards.length;
  const emAberto = cards.filter((c) => c.status === "solicitacao" || c.status === "em_analise").length;
  const resolvidos = cards.filter((c) => c.status === "resolvido").length;
  const atrasados = cards.filter((c) => c.status === "atrasado").length;

  return (
    <div className="p-0 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <ClipboardDocumentListIcon className="w-8 h-8 text-blue-500" /> Pós-Vendas <span className="text-base font-normal text-gray-500">(Kanban)</span>
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Gerencie o fluxo de atendimentos e reclamações de forma visual e intuitiva.</p>
        </div>
        {/* Painel de métricas */}
        <div className="flex gap-4 mb-8">
          <KanbanMetricCard value={emAberto} label="Em Aberto" color="text-blue-600" icon={<ClockIcon className="w-6 h-6" />} />
          <KanbanMetricCard value={resolvidos} label="Resolvidos" color="text-green-600" icon={<CheckCircleIcon className="w-6 h-6" />} />
          <KanbanMetricCard value={atrasados} label="Atrasados" color="text-red-600" icon={<ExclamationTriangleIcon className="w-6 h-6" />} highlight={atrasados > 0} />
          <div className="flex flex-col justify-center ml-auto">
            <span className="text-xs text-gray-400">Exibindo <span className="font-bold text-gray-700">{total}</span> tickets no total</span>
          </div>
        </div>
        {error && <div className="text-red-600 mb-4">Erro ao carregar atendimentos: {error}</div>}
        <div className="flex gap-6 items-start">
          {kanbanColumns.map((col, idx) => {
            const colCards = cards.filter((c) => c.status === col.key);
            return (
              <div
                key={col.key}
                className={`flex-1 rounded-2xl border ${col.border} min-h-[500px] pb-4 bg-white flex flex-col shadow-sm transition-all`}
              >
                <div className={`sticky top-0 z-10 px-4 py-3 border-b ${col.border} bg-white rounded-t-2xl flex items-center gap-2 ${col.header} font-semibold text-lg mb-2`}> 
                  {col.title}
                  <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${col.color} border ${col.border}`}>{colCards.length}</span>
                  {idx === 0 && (
                    <button className="ml-auto px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 transition font-semibold shadow" title="Novo Atendimento">+ Novo</button>
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-4 px-4 pt-2">
                  {colCards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[120px] border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm mt-8 p-4">
                      <span className="mb-2">Nenhum atendimento.</span>
                      <span className="text-xs">Arraste um card para cá</span>
                    </div>
                  ) : (
                    colCards.map((card) => (
                      <KanbanTaskCard key={card.id} {...card} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
