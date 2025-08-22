import React from 'react';
import { useCustomerComments } from '@/hooks/useCustomerComments';
import { useCustomerNotifications } from '@/hooks/useCustomerNotifications';
import { useCustomerSurveys } from '@/hooks/useCustomerSurveys';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import { useCustomerTeams } from '@/hooks/useCustomerTeams';

interface CustomerDetailProps {
  name: string;
  cnpj: string;
  phone: string;
  email?: string;
  department?: string | null;
  responsible?: string | null;
  createdAt?: string;
  updatedAt?: string;
  motivo?: string | null;
  origem?: string | null;
  resumo?: string | null;
  anexos?: { filename: string; url: string }[];
  resolucao?: string | null;
  onEdit: () => void;
  onCreateAtendimento: () => void;
  status: string;
  step: number;
  activities: { label: string; date: string; done: boolean }[];
  tab: string;
  onTabChange: (tab: string) => void;
}

const tabs = ["Atividades", "Detalhes", "Anexos", "Resolução", "Comentários", "Notificações", "Pesquisas", "Responsável", "Equipe"];

const CustomerDetail: React.FC<CustomerDetailProps> = ({
  name,
  cnpj,
  phone,
  email,
  department,
  responsible,
  createdAt,
  updatedAt,
  motivo,
  origem,
  resumo,
  anexos,
  resolucao,
  onEdit,
  onCreateAtendimento,
  status,
  step,
  activities,
  tab,
  onTabChange
}) => (
  <section className="col-span-6 bg-white rounded-lg shadow p-6 flex flex-col">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-xl font-bold">{name}</h2>
        <div className="text-sm text-gray-500">CNPJ: {cnpj} • Tel: {phone}</div>
      </div>
      <div className="flex gap-2">
        <button className="border px-3 py-1 rounded hover:bg-gray-100" onClick={onEdit}>Editar</button>
        <button className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700" onClick={onCreateAtendimento}>Criar Atendimento</button>
      </div>
    </div>
    {/* Stepper de status */}
    <div className="flex items-center gap-4 mb-6">
      <div className="flex-1 h-2 rounded bg-blue-100 relative">
        <div className="absolute left-0 top-0 h-2 bg-blue-600 rounded" style={{ width: `${step * 33}%` }} />
      </div>
      <div className="flex gap-2 text-xs">
        <span className={step === 1 ? "text-blue-600 font-semibold" : "text-gray-400"}>Em Atendimento</span>
        <span className={step === 2 ? "text-blue-600 font-semibold" : "text-gray-400"}>Concluído</span>
        <span className={step === 3 ? "text-blue-600 font-semibold" : "text-gray-400"}>Crítico</span>
      </div>
    </div>
    {/* Tabs */}
    <div className="flex gap-6 border-b mb-4">
      {tabs.map((t) => (
        <button
          key={t}
          className={`pb-2 ${tab === t ? 'border-b-2 border-blue-600 font-medium' : 'text-gray-500'}`}
          onClick={() => onTabChange(t)}
        >
          {t}
        </button>
      ))}
    </div>
    {/* Atividades */}
    {tab === "Atividades" && (
      <div className="flex-1 overflow-y-auto">
        {activities.length === 0 && <div className="text-gray-400">Nenhuma atividade encontrada.</div>}
        {activities.map((a, i) => (
          <div className="flex items-center gap-2 mb-2" key={i}>
            <input type="checkbox" checked={a.done} readOnly className="accent-blue-600" />
            <span className="font-medium">{a.label}</span>
            <span className="text-xs text-gray-400 ml-2">{a.date}</span>
          </div>
        ))}
      </div>
    )}
    {/* Detalhes */}
    {tab === "Detalhes" && (
      <div className="flex flex-col gap-2 text-sm">
        <div><b>Cliente:</b> {name}</div>
        <div><b>Contato:</b> {email || '-'}</div>
        <div><b>Telefone:</b> {phone || '-'}</div>
        <div><b>Status:</b> {status}</div>
        <div><b>Motivo:</b> {motivo || '-'}</div>
        <div><b>Departamento:</b> {department || '-'}</div>
        <div><b>Responsável:</b> {responsible || '-'}</div>
        <div><b>Criado em:</b> {createdAt ? new Date(createdAt).toLocaleString() : '-'}</div>
        <div><b>Atualizado em:</b> {updatedAt ? new Date(updatedAt).toLocaleString() : '-'}</div>
        <div><b>Origem:</b> {origem || '-'}</div>
        <div><b>Resumo:</b> {resumo || '-'}</div>
      </div>
    )}
    {/* Anexos */}
    {tab === "Anexos" && (
      <div className="flex flex-col gap-2">
        {anexos && anexos.length > 0 ? (
          anexos.map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{a.filename}</a>
          ))
        ) : (
          <div className="text-gray-400">Nenhum anexo encontrado.</div>
        )}
      </div>
    )}
    {/* Resolução */}
    {tab === "Resolução" && (
      <div className="text-sm">
        {resolucao ? resolucao : <span className="text-gray-400">Nenhuma resolução cadastrada.</span>}
      </div>
    )}
    {/* Comentários */}
    {tab === "Comentários" && (
      (() => {
        const { comments, loading } = useCustomerComments(Number(cnpj));
        if (loading) return <div>Carregando...</div>;
        return (
          <div className="flex flex-col gap-2">
            {comments.length === 0 && <div className="text-gray-400">Nenhum comentário encontrado.</div>}
            {comments.map((c) => (
              <div key={c.id} className="border rounded p-2">
                <div className="font-semibold text-xs">{c.author_name}</div>
                <div className="text-sm">{c.content}</div>
                <div className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        );
      })()
    )}

    {/* Notificações */}
    {tab === "Notificações" && (
      (() => {
        const { notifications, loading } = useCustomerNotifications(Number(cnpj));
        if (loading) return <div>Carregando...</div>;
        return (
          <div className="flex flex-col gap-2">
            {notifications.length === 0 && <div className="text-gray-400">Nenhuma notificação encontrada.</div>}
            {notifications.map((n) => (
              <div key={n.id} className="border rounded p-2">
                <div className="font-semibold text-xs">{n.title}</div>
                <div className="text-sm">{n.message}</div>
                <div className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        );
      })()
    )}

    {/* Pesquisas */}
    {tab === "Pesquisas" && (
      (() => {
        const { surveys, loading } = useCustomerSurveys(email || null);
        if (loading) return <div>Carregando...</div>;
        return (
          <div className="flex flex-col gap-2">
            {surveys.length === 0 && <div className="text-gray-400">Nenhuma pesquisa encontrada.</div>}
            {surveys.map((s) => (
              <div key={s.id} className="border rounded p-2">
                <div className="font-semibold text-xs">{s.client_name}</div>
                <div className="text-sm">NPS: {s.nps_score ?? '-'} | CSAT: {s.csat_score ?? '-'}</div>
                <div className="text-xs text-gray-400">{s.feedback_comment}</div>
                <div className="text-xs text-gray-400">{new Date(s.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        );
      })()
    )}

    {/* Responsável */}
    {tab === "Responsável" && (
      (() => {
        const { profile, loading } = useCustomerProfile(responsible || null);
        if (loading) return <div>Carregando...</div>;
        if (!profile) return <div className="text-gray-400">Nenhum responsável encontrado.</div>;
        return (
          <div className="flex flex-col gap-2 items-start">
            <div className="flex items-center gap-2">
              {profile.avatar_url && <img src={profile.avatar_url} alt="avatar" className="w-10 h-10 rounded-full" />}
              <div>
                <div className="font-semibold">{profile.full_name}</div>
                <div className="text-xs text-gray-500">{profile.email}</div>
                <div className="text-xs text-gray-500">{profile.funcao}</div>
              </div>
            </div>
          </div>
        );
      })()
    )}

    {/* Equipe */}
    {tab === "Equipe" && (
      (() => {
        const { teams, loading } = useCustomerTeams(responsible || null);
        if (loading) return <div>Carregando...</div>;
        return (
          <div className="flex flex-col gap-2">
            {teams.length === 0 && <div className="text-gray-400">Nenhuma equipe encontrada.</div>}
            {teams.map((t) => (
              <div key={t.id} className="border rounded p-2">
                <div className="font-semibold text-xs">{t.name}</div>
              </div>
            ))}
          </div>
        );
      })()
    )}
  </section>
);

export default CustomerDetail;
