// src/components/SidebarFixed.tsx
import React, { useState, useEffect, ElementType } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, KanbanSquare, List, Settings,
  Users, Bell, LogOut, FolderOpen, ChevronDown, Headset, BarChart3,
  ClipboardList, SlidersHorizontal, Target, MessageSquare, Calendar as CalendarIcon,
  PanelLeftClose, PanelRightClose
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import type { Permissoes } from '@/types';

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

const menuGroups: MenuGroup[] = [
  { title: 'AGENDA', items: [{ label: 'Calendário', url: '/calendar', icon: CalendarIcon }] },
  {
    title: 'GERAL',
    items: [
      { label: 'Dashboard', url: '/', icon: LayoutDashboard, permissionKey: 'dashboard' },
      { label: 'Kanban', url: '/kanban', icon: KanbanSquare, permissionKey: 'kanban' },
      { label: 'Tarefas', url: '/tasks', icon: List, permissionKey: 'tasks' },
      { label: 'Projetos', url: '/projects', icon: FolderOpen },
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
      { label: 'Tarefas e Projetos', url: '/settings/tasks', icon: SlidersHorizontal, permissionKey: 'team' },
      { label: 'Config. WhatsApp', url: '/configuracoes/whatsapp', icon: MessageSquare, permissionKey: 'team' },
      { label: 'Multi-WhatsApp', url: '/whatsapp-manager', icon: MessageSquare, permissionKey: 'team' },
      { label: 'Configurações de usuário', url: '/team', icon: Users, permissionKey: 'team' },
      { label: 'Notificações', url: '/notifications', icon: Bell },
      { label: 'Ajustes Pessoais', url: '/settings', icon: Settings },
      { label: 'Configuração de Módulos', url: '/configuracoes/controle-acesso', icon: SlidersHorizontal, permissionKey: 'team' },
      { label: 'Equipes & Hierarquia', url: '/configuracoes/equipes-hierarquia', icon: Users, permissionKey: 'team' },
    ]
  }
];

const SidebarFixed: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects } = useProjects();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('sidebar.openGroups');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const toggleGroup = (title: string, value?: boolean) => {
    setOpenGroups(prev => {
      const next = { ...prev, [title]: typeof value === 'boolean' ? value : !prev[title] };
      try { localStorage.setItem('sidebar.openGroups', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (location.pathname.startsWith('/projects')) setIsProjectsOpen(true);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getInitials = (name?: string | null): string => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase();
    return user?.email?.[0].toUpperCase() || '?';
  };

  const projectList = (projects ?? []).filter(p => p?.id && p.id !== 'all');

  if (!user) return <div className={`transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-gradient-to-b from-[#1E1B3A] to-[#14122A] animate-pulse`}></div>;

  return (
    <div className={`h-screen flex flex-col bg-[#1D1B3F] text-white transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-4 border-b border-[#322E5C] flex items-center justify-between">
        <div className="flex flex-col items-center justify-center text-center w-full">
          {!isCollapsed ? (
            <>
              <Logo className="w-32 h-auto text-white mx-auto" />
              <p className="text-[#C7C9D9] text-xs mt-1">Conectada com você</p>
            </>
          ) : (
            <FolderOpen className="w-5 h-5" />
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 text-[#C7C9D9] hover:text-white hover:bg-[#2C2854] rounded-md ml-2"
        >
          {isCollapsed ? <PanelRightClose size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      <nav className="flex-1 py-6 px-3 overflow-y-auto">
        <div className="space-y-4">
          {menuGroups.map((group) => {
            const visibleItems = group.items.filter(item => {
              if (!item.permissionKey) return true;
              return user?.permissoes?.[item.permissionKey] === true;
            });
            if (visibleItems.length === 0) return null;

            const isOpen = !!openGroups[group.title];

            return (
              <div key={group.title}>
                {!isCollapsed && (
                  <Collapsible open={isOpen} onOpenChange={(v) => toggleGroup(group.title, v)}>
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-left text-xs font-semibold uppercase tracking-wider text-[#C7C9D9] hover:bg-[#2C2854]">
                        <span>{group.title}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                      <ul className="pt-1 pl-2 pr-2 space-y-1">
                        {visibleItems.map((item) => (
                          <li key={item.label}>
                            <NavLink
                              to={item.url}
                              className={({ isActive }) =>
                                `flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${
                                  isActive ? 'bg-[#FF8C00] text-white font-semibold' : 'text-[#C7C9D9] hover:bg-[#2C2854]'
                                }`
                              }
                            >
                              <item.icon className="w-5 h-5" />
                              {!isCollapsed && <span>{item.label}</span>}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            );
          })}

          {!isCollapsed && (
            <div>
              <h2 className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-[#C7C9D9]">PROJETOS</h2>
              <ul className="space-y-1">
                <li>
                  <div>
                    <button
                      onClick={() => setIsProjectsOpen(prev => !prev)}
                      className={`w-full flex items-center justify-between space-x-3 px-4 py-2.5 rounded-lg transition-all ${
                        location.pathname === '/projects' ? 'bg-[#FF8C00] text-white font-semibold' : 'text-[#C7C9D9] hover:bg-[#2C2854]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <FolderOpen className="w-5 h-5" />
                        <span>Visão Geral</span>
                      </div>
                      <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isProjectsOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isProjectsOpen && (
                      <ul className="pt-1 pl-6 pr-2 space-y-1">
                        {projectList.map((project: any) => (
                          <li key={project.id}>
                            <NavLink
                              to={`/projects/${project.id}`}
                              className={({ isActive }) =>
                                `flex items-center w-full gap-2 px-4 py-2 rounded-md text-sm ${
                                  isActive ? 'bg-[#FF8C00] text-white' : 'text-[#C7C9D9] hover:bg-[#2C2854]'
                                }`
                              }
                            >
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#808080' }} />
                              <span className="truncate">{project.name}</span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              </ul>
            </div>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-[#322E5C]">
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.user_metadata?.avatar_url ?? undefined} />
            <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate text-white">{user.full_name || 'Usuário'}</p>
              <div className="text-xs text-[#FF8C00]">{user.nivelAcesso}</div>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <button onClick={handleLogout} className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-[#C7C9D9] hover:bg-[#2C2854] hover:text-[#FF8C00]">
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SidebarFixed;
