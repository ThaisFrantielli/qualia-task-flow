import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useTeams } from '@/hooks/useTeams';
import { Target } from 'lucide-react';

interface TeamPerformanceProps {
  tasks: any[];
  users: any[];
}

const COLORS = {
  brandOrange: '#FF8C00',
  brandPurple: '#322E5C',
  todo: '#9CA3AF',
  progress: '#60A5FA',
  done: '#10B981',
  late: '#EF4444',
  warn: '#F59E0B',
  info: '#3B82F6'
};

const TeamPerformance: React.FC<TeamPerformanceProps> = ({ tasks, users }) => {
  const { teams } = useTeams();
  const [teamFilter, setTeamFilter] = useState<string>('all');

  const filteredTasks = useMemo(() => {
    if (teamFilter === 'all') return tasks;
    return tasks.filter(
      (t) => (t.team_id && t.team_id === teamFilter) || ((t.project as any)?.team_id && (t.project as any).team_id === teamFilter)
    );
  }, [tasks, teamFilter]);

  const teamUnassignedCount = useMemo(() => filteredTasks.filter((t) => !t.assignee_id && !(t.assignee)).length, [filteredTasks]);
  const teamLateCount = useMemo(() => filteredTasks.filter((t) => t.status === 'late').length, [filteredTasks]);
  const teamDonePct = useMemo(() => {
    const done = filteredTasks.filter((t) => t.status === 'done').length;
    return filteredTasks.length ? Math.round((done / filteredTasks.length) * 100) : 0;
  }, [filteredTasks]);

  const byUser = useMemo(
    () =>
      users
        .map((u) => {
          const assigned = filteredTasks.filter((t) => t.assignee_id === u.id || (t.assignee && t.assignee.id === u.id));
          const counts = {
            todo: assigned.filter((a) => a.status === 'todo').length,
            progress: assigned.filter((a) => a.status === 'progress').length,
            done: assigned.filter((a) => a.status === 'done').length,
            late: assigned.filter((a) => a.status === 'late').length,
          };
          const total = assigned.length;
          const pct = total > 0 ? Math.round((counts.done / total) * 100) : 0;
          return { user: u, total, counts, pct };
        })
        .filter((r) => r.total > 0)
        .sort((a, b) => b.pct - a.pct),
    [users, filteredTasks]
  );

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col items-start gap-3">
        <div className="flex items-center gap-3">
          <Target size={20} color={COLORS.brandOrange} />
          <div>
            <CardTitle>Desempenho da Equipe</CardTitle>
            <div className="text-sm text-muted-foreground">Ranking compacto por usuário — filtre por equipe</div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: COLORS.late }} />
              <span>Atrasadas</span>
              <span className="font-semibold text-foreground ml-1">{teamLateCount}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: COLORS.done }} />
              <span>Concl.</span>
              <span className="font-semibold text-foreground ml-1">{teamDonePct}%</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: COLORS.info }} />
              <span>Sem resp.</span>
              <span className="font-semibold text-foreground ml-1">{teamUnassignedCount}</span>
            </div>
          </div>

          <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todas as equipes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as equipes</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {byUser.map((row) => (
            <div key={row.user.id} className="flex items-start gap-3 py-2 border-b last:border-b-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: COLORS.brandPurple, color: '#fff' }}>
                {row.user.full_name ? row.user.full_name.split(' ').map((s: string) => s[0]).slice(0, 2).join('') : 'U'}
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium">{row.user.full_name}</div>
                    <div className="text-xs text-muted-foreground">{row.total} tarefas</div>
                  </div>

                  <div className="text-sm font-semibold">{row.pct}%</div>
                </div>

                <div className="w-full bg-gray-100 h-2 rounded mt-2 overflow-hidden">
                  <div className="h-2 transition-all duration-300" style={{ width: `${row.pct}%`, background: COLORS.brandPurple }} />
                </div>

                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS.todo }} />
                    <span>A Fazer</span>
                    <span className="font-semibold text-foreground ml-1">{row.counts.todo}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS.progress }} />
                    <span>Andamento</span>
                    <span className="font-semibold text-foreground ml-1">{row.counts.progress}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS.done }} />
                    <span>Concl.</span>
                    <span className="font-semibold text-foreground ml-1">{row.counts.done}</span>
                  </div>

                  {row.counts.late > 0 && (
                    <div className="flex items-center gap-1 text-rose-600">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS.late }} />
                      <span>Atras.</span>
                      <span className="font-semibold ml-1">{row.counts.late}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {byUser.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma tarefa atribuída encontrada.</div>}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamPerformance;
