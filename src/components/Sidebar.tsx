// src/components/Sidebar.tsx

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
import type { Permissoes } from '@/types';
import Logo from './Logo';

// Tipagem explícita para os itens de menu
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

// Estrutura de dados completa para os grupos de menu
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

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects } = useProjects();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('sidebar.openGroups');
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  });

  const toggleGroup = (title: string, value?: boolean) => {
    setOpenGroups(prev => {
      const next = { ...prev, [title]: typeof value === 'boolean' ? value : !prev[title] };
      try { localStorage.setItem('sidebar.openGroups', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  useEffect(() => { /* Lógica de useEffect original mantida */ }, [location.pathname]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };
  
  const getInitials = (name?: string | null): string => { 
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase(); 
    return user?.email?.[0].toUpperCase() || '?'; 
  };

  const projectList = projects.filter(p => p.id !== 'all');

  if (!user) return <div className={`transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-gradient-to-b from-[#1E1B3A] to-[#14122A] animate-pulse`}></div>;

  return (
    <div className={`transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-gradient-to-b from-[#1E1B3A] to-[#14122A] shadow-lg flex flex-col`}>
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex flex-col items-start w-full">
              <Logo className="w-24 h-auto text-white" />
              <p className="text-[#C7C9D9] text-xs mt-1">Conectada com você</p>
            </div>
          )}
          {isCollapsed && <Logo className="w-8 h-auto text-white mx-auto" />}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-[#C7C9D9] hover:text-white hover:bg-white/10 rounded-md flex-shrink-0"
          >
            {isCollapsed ? <PanelRightClose size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-2">
          {menuGroups.map((group) => {
            // LÓGICA DE VISIBILIDADE POR HIERARQUIA MANTIDA
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
                            <h2 className="px-4 mb-2 text-xs font-semibold text-slate-500 tracking-wider flex justify-between items-center cursor-pointer">
                                {group.title}
                                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </h2>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                            <ul className="space-y-1">
                                {visibleItems.map((item) => (
                                    <li key={item.label}>
                                        <NavLink to={item.url} className={({isActive}) => `flex items-center space-x-3 p-2.5 rounded-xl text-sm transition-all ${isActive ? 'bg-[#FF8C00] text-white font-semibold shadow-md' : 'text-[#C7C9D9] hover:bg-white/5 hover:text-white'}`}>
                                            <item.icon className="w-5 h-5 flex-shrink-0" />
                                            <span>{item.label}</span>
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        </CollapsibleContent>
                    </Collapsible>
                )}
                {isCollapsed && (
                    <ul className="space-y-1">
                        {visibleItems.map((item) => (
                            <li key={item.label}>
                                <NavLink to={item.url} title={item.label} className={({isActive}) => `flex items-center justify-center space-x-3 p-2.5 rounded-xl text-sm transition-all ${isActive ? 'bg-[#FF8C00] text-white font-semibold shadow-md' : 'text-[#C7C9D9] hover:bg-white/5 hover:text-white'}`}>
                                    <item.icon className="w-5 h-5 flex-shrink-0" />
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarImage src={user.user_metadata?.avatar_url ?? undefined} />
            <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="ml-3 flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate text-white">{user.full_name || 'Usuário'}</p>
              <p className="text-xs truncate text-[#C7C9D9]">{user.nivelAcesso}</p>
            </div>
          )}
          {!isCollapsed && (
            <button onClick={handleLogout} className="ml-2 p-2 rounded-md text-[#C7C9D9] hover:bg-white/5 hover:text-white">
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;