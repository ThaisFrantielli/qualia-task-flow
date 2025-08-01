// src/components/Sidebar.tsx

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, KanbanSquare, List, Settings,
  Users, Bell, LogOut, FolderOpen, ChevronDown, Headset, BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';

// --- ESTRUTURA DE MENU REORGANIZADA EM MÓDULOS ---
const menuGroups = [
  {
    title: 'PRINCIPAL',
    items: [
      { label: 'Dashboard', url: '/', icon: LayoutDashboard, permissionKey: 'dashboard' },
      { label: 'Kanban', url: '/kanban', icon: KanbanSquare, permissionKey: 'kanban' },
      { label: 'Tarefas', url: '/tasks', icon: List, permissionKey: 'tasks' },
    ]
  },
  {
    title: 'CRM',
    items: [
      { label: 'Pós-Vendas', url: '/pos-vendas', icon: Headset, permissionKey: 'crm' },
      // Corrigindo a URL para corresponder ao App.tsx
      { label: 'Dashboard PDV', url: '/pos-vendas/dashboard', icon: BarChart3, permissionKey: 'crm' },
    ]
  },
  {
    title: 'CONFIGURAÇÕES',
    items: [
      { label: 'Equipe', url: '/team', icon: Users, permissionKey: 'team' },
      { label: 'Notificações', url: '/notifications', icon: Bell, permissionKey: 'settings' },
      { label: 'Ajustes', url: '/settings', icon: Settings, permissionKey: 'settings' },
    ]
  }
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects } = useProjects();
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);

  useEffect(() => {
    // Abre a seção de projetos se a rota atual for de um projeto
    setIsProjectsOpen(location.pathname.startsWith('/projects'));
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getInitials = (name?: string | null): string => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase();
    return user?.email?.[0].toUpperCase() || '?';
  };

  // Filtra projetos para não mostrar a opção "Todos os Projetos"
  const projectList = projects.filter(p => p.id !== 'all');
  const isProjectsSectionActive = location.pathname.startsWith('/projects');

  // Mostra um skeleton/placeholder enquanto o usuário está sendo carregado
  if (!user) {
    return <div className="w-64 h-screen bg-gray-900 animate-pulse"></div>;
  }

  return (
    <div className="w-64 h-screen bg-gray-900 shadow-lg flex flex-col text-white">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <KanbanSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Quality</h1>
            <p className="text-gray-400 text-sm">Task Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 px-4 overflow-y-auto">
        <div className="space-y-6"> {/* Aumentado o espaçamento entre módulos */}
          {menuGroups.map((group) => {
            // Filtra os itens do menu com base nas permissões do usuário
            const visibleItems = group.items.filter(item => {
              if (!item.permissionKey) return true; // Itens sem chave de permissão são sempre visíveis
              // @ts-ignore - Supabase pode não inferir o tipo de 'permissoes' corretamente
              return user?.permissoes?.[item.permissionKey] === true;
            });
            
            // Não renderiza o título do módulo se não houver itens visíveis
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title}>
                <h2 className="px-4 mb-2 text-xs font-semibold uppercase text-gray-400 tracking-wider">
                  {group.title}
                </h2>
                <ul className="space-y-1">
                  {visibleItems.map((item) => (
                    <li key={item.label}>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) =>
                          `flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${
                            isActive ? 'bg-primary text-white font-semibold' : 'text-gray-300 hover:bg-gray-800'
                          }`
                        }
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Seção de Projetos (renderizada separadamente se houver projetos) */}
          {projectList.length > 0 && (
            <div>
              <h2 className="px-4 mb-2 text-xs font-semibold uppercase text-gray-400 tracking-wider">
                PROJETOS
              </h2>
              <Collapsible open={isProjectsOpen} onOpenChange={setIsProjectsOpen}>
                <CollapsibleTrigger className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all ${isProjectsSectionActive ? 'bg-gray-800' : 'text-gray-300 hover:bg-gray-800'}`}>
                  <div className="flex items-center space-x-3">
                    <FolderOpen className="w-5 h-5" />
                    <span>Meus Projetos</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isProjectsOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1 pl-6">
                  {projectList.map(project => (
                     <NavLink
                        key={project.id}
                        to={`/projects/${project.id}`}
                        className={({isActive}) => `flex items-center gap-3 text-sm py-2 px-2 rounded-md ${isActive ? 'bg-primary text-white' : 'hover:bg-gray-800 text-gray-400'}`}
                      >
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#6b7280' }} />
                        <span className="truncate">{project.name}</span>
                     </NavLink>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>
      </nav>

      {/* Perfil do Usuário e Logout */}
      <div className="p-4 border-t border-gray-700/50">
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.user_metadata?.avatar_url ?? undefined} />
             {/* @ts-ignore */}
            <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
             {/* @ts-ignore */}
            <p className="text-sm font-medium truncate">{user.full_name || 'Usuário'}</p>
             {/* @ts-ignore */}
            <div className="text-xs text-primary-300">{user.nivelAcesso || 'Nível não definido'}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors">
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;