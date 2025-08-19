import React from 'react';
import { FolderOpen } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import ProjectsListCascade from '@/components/projects/ProjectsListCascade';
import { CreateProjectForm } from '@/components/CreateProjectForm';
import { Skeleton } from '@/components/ui/skeleton';

import { useNavigate } from 'react-router-dom';

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { projects, loading: projectsLoading, refetch: refetchProjects, error } = useProjects();

  const handleProjectCreated = () => {
    if (refetchProjects) {
      refetchProjects();
    }
  };

  const [busca, setBusca] = React.useState("");
  const [status, setStatus] = React.useState("todos");
  const [modoLista, setModoLista] = React.useState(false);
  const [modoFoco, setModoFoco] = React.useState(false);

  // Filtro local (client-side) para busca, status e modo foco
  let projetosFiltrados = projects.filter((p) => {
    const nomeMatch = p.name.toLowerCase().includes(busca.toLowerCase());
    let statusMatch = true;
    if (status === "ativos") statusMatch = p.task_count > 0;
    if (status === "concluidos") statusMatch = p.completed_count === p.task_count && p.task_count > 0;
    if (status === "atrasados") statusMatch = p.late_count > 0;
    return nomeMatch && statusMatch;
  });
  // Modo foco: apenas para visualização em cascata (lista)
  // O filtro será passado como prop para o componente ProjectsListCascade

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Erro ao carregar projetos</h1>
        <p className="text-red-500">{String(error)}</p>
      </div>
    );
  }

  if (projectsLoading) {
    return (
      <div className="p-6">
        <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded mb-4">Carregando projetos...</div>
        <Skeleton className="h-40 w-full rounded-xl mb-2" />
        <Skeleton className="h-40 w-full rounded-xl mb-2" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!projects || !Array.isArray(projects)) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Nenhum dado de projeto retornado</h1>
        <p className="text-red-500">Verifique o backend ou a conexão.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Projetos</h1>
          <p className="text-gray-600">Organize e acompanhe o andamento das suas iniciativas.</p>
        </div>
        <CreateProjectForm onProjectCreated={handleProjectCreated} />
      </div>

      {/* Busca, Filtros e Alternância de Visualização */}
      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Buscar projetos..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full md:w-80 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            className={`px-3 py-2 rounded-md border text-sm font-medium transition ${modoLista ? 'bg-primary text-white' : 'bg-white text-primary border-primary'}`}
            onClick={() => setModoLista(m => !m)}
            title={modoLista ? 'Ver em cards' : 'Ver em lista/cascata'}
          >
            {modoLista ? 'Ver em cards' : 'Ver em lista'}
          </button>
          <button
            type="button"
            className={`px-3 py-2 rounded-md border text-sm font-medium transition ${modoFoco ? 'bg-red-600 text-white' : 'bg-white text-red-600 border-red-600'}`}
            onClick={() => setModoFoco(f => !f)}
            title={modoFoco ? 'Sair do modo foco' : 'Ativar modo foco (prioridade alta)'}
          >
            {modoFoco ? 'Modo Foco Ativo' : 'Modo Foco Prioridade'}
          </button>
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="todos">Todos</option>
          <option value="ativos">Com tarefas</option>
          <option value="concluidos">100% concluídos</option>
          <option value="atrasados">Com atrasos</option>
        </select>
      </div>

      {modoLista ? (
        <ProjectsListCascade projetos={projetosFiltrados} modoFoco={modoFoco} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)
          ) : projetosFiltrados.length > 0 ? (
            projetosFiltrados.map((project) => (
              <div
                  key={project.id}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-2 hover:shadow-md transition cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: project.color || '#A1A1AA' }} />
                  <span className="font-semibold text-base text-gray-900 truncate" title={project.name}>{project.name}</span>
                </div>
                {project.description && (
                  <span className="text-xs text-gray-500 mb-1 truncate" title={project.description}>{project.description}</span>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex flex-col text-xs text-gray-500">
                    <span>Progresso</span>
                    <div className="w-24 h-2 bg-gray-100 rounded-full mt-1">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${Math.round((project.completed_count / (project.task_count || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col text-xs text-gray-500">
                    <span>Total</span>
                    <span className="font-semibold text-gray-700">{project.task_count}</span>
                  </div>
                  <div className="flex flex-col text-xs text-gray-500">
                    <span>Concluídas</span>
                    <span className="font-semibold text-green-600">{project.completed_count}</span>
                  </div>
                  {project.late_count > 0 && (
                    <div className="flex flex-col text-xs text-red-500">
                      <span>Atrasadas</span>
                      <span className="font-semibold">{project.late_count}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg mt-8">
              <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold">Nenhum projeto encontrado</h3>
              <p className="text-gray-500 mt-2 mb-4">Ajuste sua busca ou filtros para ver resultados.</p>
              <CreateProjectForm onProjectCreated={handleProjectCreated} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;