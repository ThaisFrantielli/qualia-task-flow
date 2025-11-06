// src/components/Sidebar.tsx

import React, { useState, useEffect, ElementType } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, KanbanSquare, List, Settings,
  Users, Bell, LogOut, FolderOpen, ChevronDown, Headset, BarChart3,
  ClipboardList, SlidersHorizontal, Target, MessageSquare, Calendar as CalendarIcon // Ícone novo importado
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import type { Permissoes } from '@/types';

// Tipagem explícita para os itens de menu para maior segurança e autocompletar
interface MenuItem {
  label: string;
  url: string;
  icon: ElementType;
  permissionKey?: keyof Permissoes;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

// Estrutura de dados para os grupos de menu, agora com os ajustes
const menuGroups: MenuGroup[] = [
  {
    title: 'AGENDA',
    items: [
      { label: 'Calendário', url: '/calendar', icon: CalendarIcon },
    ]
  },
  {
    title: 'GERAL',
    items: [
      { label: 'Dashboard', url: '/', icon: LayoutDashboard, permissionKey: 'dashboard' },
      { label: 'Kanban', url: '/kanban', icon: KanbanSquare, permissionKey: 'kanban' },
      { label: 'Tarefas', url: '/tasks', icon: List, permissionKey: 'tasks' },
    ]
  },
  {
    title: 'CRM',
    items: [
      { label: 'Hub de Clientes', url: '/clientes', icon: Users, permissionKey: 'crm' },
      { label: 'WhatsApp', url: '/whatsapp', icon: MessageSquare, permissionKey: 'crm' },
      { label: 'Oportunidades', url: '/oportunidades', icon: Target, permissionKey: 'crm' },
      { label: 'Pós-Vendas', url: '/pos-vendas', icon: Headset, permissionKey: 'crm' },
      { label: 'Dashboard PDV', url: '/pos-vendas/dashboard', icon: BarChart3, permissionKey: 'crm' },
      { label: 'Pesquisas', url: '/pesquisas', icon: ClipboardList, permissionKey: 'crm' },
    ]
  },
  {
    title: 'CONFIGURAÇÕES',
    items: [
      { 
        label: 'Tarefas e Projetos', 
        url: '/settings/tasks', 
        icon: SlidersHorizontal, 
        permissionKey: 'team' // Apenas Admins e Gestores podem ver
      },
      { 
        label: 'Config. WhatsApp', 
        url: '/configuracoes/whatsapp', 
        icon: MessageSquare, 
        permissionKey: 'team' // Apenas Admins e Gestores podem ver
      },
      { 
        label: 'Multi-WhatsApp', 
        url: '/whatsapp-manager', 
        icon: MessageSquare, 
        permissionKey: 'team' // Apenas Admins e Gestores podem ver
      },
      { label: 'Equipe', url: '/team', icon: Users, permissionKey: 'team' },
      { label: 'Notificações', url: '/notifications', icon: Bell },
      { label: 'Ajustes Pessoais', url: '/settings', icon: Settings },
        { 
          label: 'Configuração de Módulos', 
          url: '/configuracoes/controle-acesso', 
          icon: SlidersHorizontal, 
          permissionKey: 'team' // Apenas Admins/Gestores podem ver
        },
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
    if (location.pathname.startsWith('/projects')) setIsProjectsOpen(true);
  }, [location.pathname]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };
  
  // CORREÇÃO: Usa 'full_name' para obter as iniciais
  const getInitials = (name?: string | null): string => { 
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase(); 
    return user?.email?.[0].toUpperCase() || '?'; 
  };

  const projectList = projects.filter(p => p.id !== 'all');

  if (!user) return <div className="w-64 h-screen bg-gray-900 animate-pulse"></div>;

  return (
    <div className="w-64 h-screen bg-gray-900 shadow-lg flex flex-col text-white">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center"><KanbanSquare className="w-6 h-6" /></div>
          <div><h1 className="font-bold text-lg">Quality Conecta</h1><p className="text-gray-400 text-sm">Conectada com você</p></div>
        </div>
      </div>

      {/* Navegação Principal */}
      <nav className="flex-1 py-6 px-4 overflow-y-auto">
        <div className="space-y-4">
          {menuGroups.map((group) => {
            const visibleItems = group.items.filter(item => {
              if (!item.permissionKey) return true;
              return user?.permissoes?.[item.permissionKey] === true;
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title}>
                <h2 className="px-4 mb-2 text-xs font-semibold uppercase text-gray-400 tracking-wider">{group.title}</h2>
                <ul className="space-y-1">
                  {visibleItems.map((item) => (
                    <li key={item.label}>
                      <NavLink to={item.url} className={({isActive}) => `flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${isActive ? 'bg-primary text-white font-semibold' : 'text-gray-300 hover:bg-gray-800'}`}>
                        <item.icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Seção de Projetos */}
          <div>
            <h2 className="px-4 mb-2 text-xs font-semibold uppercase text-gray-400 tracking-wider">PROJETOS</h2>
            <ul className="space-y-1">
              <li>
                <Collapsible open={isProjectsOpen} onOpenChange={setIsProjectsOpen}>
                  <CollapsibleTrigger asChild>
                    <NavLink to="/projects" end className={({isActive}) => `w-full flex items-center justify-between space-x-3 px-4 py-2.5 rounded-lg transition-all ${isActive && location.pathname === '/projects' ? 'bg-primary text-white font-semibold' : 'text-gray-300 hover:bg-gray-800'}`}>
                      <div className="flex items-center space-x-3"><FolderOpen className="w-5 h-5" /><span>Visão Geral</span></div>
                      <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isProjectsOpen ? 'rotate-180' : ''}`} />
                    </NavLink>
                  </CollapsibleTrigger>
                  <CollapsibleContent asChild>
                    <ul className="pt-1 pl-6 pr-2 space-y-1">
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
          </div>
        </div>
      </nav>

      {/* Perfil do Usuário e Logout */}
      <div className="p-4 border-t border-gray-700/50">
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.user_metadata?.avatar_url ?? undefined} />
            {/* CORREÇÃO: Usa 'full_name' */}
            <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            {/* CORREÇÃO: Usa 'full_name' */}
            <p className="text-sm font-medium truncate">{user.full_name || 'Usuário'}</p>
            <div className="text-xs text-primary-300">{user.nivelAcesso}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-400">
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;