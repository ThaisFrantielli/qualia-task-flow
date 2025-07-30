// src/components/Sidebar.tsx

// 1. UMA ÚNICA IMPORTAÇÃO LIMPA PARA O REACT
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

// 2. UMA ÚNICA IMPORTAÇÃO LIMPA PARA OS ÍCONES
import { 
  LayoutDashboard, KanbanSquare, List, Settings,
  Users, Bell, LogOut, FolderOpen, ChevronDown, Headset, BarChart3
} from 'lucide-react';

// 3. RESTO DAS IMPORTAÇÕES
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import type { AppUser } from '@/contexts/AuthContext';

// Lista de itens de menu que não mudam
const staticMenuItems = [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard, permissionKey: 'dashboard' },
    { title: 'Kanban', url: '/kanban', icon: KanbanSquare, permissionKey: 'kanban' },
    { title: 'Tarefas', url: '/tasks', icon: List, permissionKey: 'tasks' },
    { title: 'Pós-Vendas', url: '/pos-vendas', icon: Headset }, // Adicionado o link para o Kanban de Pós-Vendas
    { title: 'Dashboard PDV', url: '/pos-vendas/dashboard', icon: BarChart3 }, // Adicionado o link para o Dashboard
    { title: 'Equipe', url: '/team', icon: Users, permissionKey: 'team' },
    { title: 'Notificações', url: '/notifications', icon: Bell },
    { title: 'Configurações', url: '/settings', icon: Settings },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects } = useProjects();
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);

  // Efeito para abrir a lista de projetos se o usuário estiver em uma página de detalhes
  useEffect(() => {
    if (location.pathname.startsWith('/projects')) {
      setIsProjectsOpen(true);
    }
  }, [location.pathname]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };
  const getInitials = (name?: string | null): string => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase();
    return user?.email?.[0].toUpperCase() || '?';
  };

  // Filtra os itens estáticos com base nas permissões
  const visibleStaticItems = staticMenuItems.filter(item => {
    if (!item.permissionKey) return true;
    // @ts-ignore - Assumindo que o objeto user terá as permissões
    return (user as AppUser)?.permissoes?.[item.permissionKey] === true;
  });

  const projectList = projects.filter(p => p.id !== 'all');
  const isProjectsSectionActive = location.pathname.startsWith('/projects');

  if (!user) {
    return <div className="w-64 h-screen bg-gray-900 animate-pulse"></div>;
  }

  return (
    <div className="w-64 h-screen bg-gray-900 shadow-lg flex flex-col text-white">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center"><KanbanSquare className="w-6 h-6" /></div>
          <div><h1 className="font-bold text-lg">Quality</h1><p className="text-gray-400 text-sm">Task Manager</p></div>
        </div>
      </div>

      <nav className="flex-1 py-6 px-4 overflow-y-auto">
        <ul className="space-y-1">
          {/* Renderiza os itens estáticos */}
          {visibleStaticItems.map((item) => (
            <li key={item.title}>
              <NavLink to={item.url} className={({isActive}) => `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'bg-primary text-white font-semibold' : 'text-gray-300 hover:bg-gray-800'}`}>
                <item.icon className="w-5 h-5" />
                <span>{item.title}</span>
              </NavLink>
            </li>
          ))}

          {/* Seção Dinâmica e Colapsável para Projetos */}
          <li className="space-y-1">
            <Collapsible open={isProjectsOpen} onOpenChange={setIsProjectsOpen}>
              <CollapsibleTrigger className={`w-full flex items-center justify-between space-x-3 px-4 py-3 rounded-lg transition-all ${isProjectsSectionActive ? 'bg-primary text-white font-semibold' : 'text-gray-300 hover:bg-gray-800'}`}>
                <div className="flex items-center space-x-3">
                  <FolderOpen className="w-5 h-5" />
                  <span>Projetos</span>
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isProjectsOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent asChild>
                <ul className="py-2 pl-6 pr-2 space-y-1">
                  <li>
                    <NavLink to="/projects" end className={({isActive}) => `flex items-center w-full px-4 py-2 rounded-md text-sm ${isActive ? 'bg-primary/80 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                      Visão Geral
                    </NavLink>
                  </li>
                  {projectList.map(project => (
                    <li key={project.id}>
                      <NavLink to={`/projects/${project.id}`} className={({isActive}) => `flex items-center w-full gap-2 px-4 py-2 rounded-md text-sm ${isActive ? 'bg-primary/80 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#808080' }} />
                        <span className="truncate">{project.name}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </li>
        </ul>
      </nav>

      {/* Perfil do Usuário e Logout */}
      <div className="p-4 border-t border-gray-700/50">
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="w-10 h-10"><AvatarImage src={(user as AppUser).avatar_url ?? undefined} /><AvatarFallback>{getInitials((user as AppUser).name)}</AvatarFallback></Avatar>
          <div className="flex-1 overflow-hidden"><p className="text-sm font-medium truncate">{(user as AppUser).name || 'Usuário'}</p><div className="text-xs text-primary-300">{(user as AppUser).nivelAcesso}</div></div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-400"><LogOut className="w-4 h-4" /><span>Sair</span></button>
      </div>
    </div>
  );
};

export default Sidebar;