// src/components/Sidebar.tsx

import React, { useState, useEffect, ElementType } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, KanbanSquare, List, Settings,
  Users, Bell, LogOut, FolderOpen, ChevronDown, Headset, BarChart3,
  ClipboardList, SlidersHorizontal, Target, MessageSquare, Calendar as CalendarIcon
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
  { label: 'Configurações de usuário', url: '/team', icon: Users, permissionKey: 'team' },
      { label: 'Notificações', url: '/notifications', icon: Bell },
      { label: 'Ajustes Pessoais', url: '/settings', icon: Settings },
        { 
          label: 'Configuração de Módulos', 
          url: '/configuracoes/controle-acesso', 
          icon: SlidersHorizontal, 
          permissionKey: 'team' // Apenas Admins/Gestores podem ver
        },
        { 
          label: 'Equipes & Hierarquia', 
          url: '/configuracoes/equipes-hierarquia', 
          icon: Users, 
          permissionKey: 'team' // Todos podem ver (conteúdo interno tem verificação)
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('sidebar.openGroups');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });

  const toggleGroup = (title: string, value?: boolean) => {
    setOpenGroups(prev => {
      const next = { ...prev, [title]: typeof value === 'boolean' ? value : !prev[title] };
      try { localStorage.setItem('sidebar.openGroups', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  useEffect(() => {
    if (location.pathname.startsWith('/projects')) setIsProjectsOpen(true);
  }, [location.pathname]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };
  
  const getInitials = (name?: string | null): string => { 
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase(); 
    return user?.email?.[0].toUpperCase() || '?'; 
  };

  const projectList = projects.filter(p => p.id !== 'all');

  // AJUSTE: Cor de fundo escura para o estado de carregamento
  if (!user) return <div className="w-64 h-screen bg-slate-800 animate-pulse"></div>;

  return (
    // AJUSTE: Cor de fundo principal da sidebar
    <div className="w-64 h-screen bg-slate-800 shadow-lg flex flex-col">
      {/* Logo */}
      {/* AJUSTE: Cor da borda e dos textos */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <svg className="w-10 h-10" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 50 L40 70 L80 30" fill="none" stroke="#F97316" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <h1 className="font-bold text-lg text-slate-100">Quality Conecta</h1>
            <p className="text-slate-400 text-sm">Conectada com você</p>
          </div>
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

            const isOpen = !!openGroups[group.title];

            return (
              <div key={group.title}>
                <Collapsible open={isOpen} onOpenChange={(v) => toggleGroup(group.title, v)}>
                  <CollapsibleTrigger asChild>
                    {/* AJUSTE: Cor do texto e do hover */}
                    <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-left text-xs font-semibold uppercase text-slate-400 tracking-wider hover:bg-slate-700">
                      <span>{group.title}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent asChild>
                    <ul className="pt-1 pl-2 pr-2 space-y-1">
                      {visibleItems.map((item) => (
                        <li key={item.label}>
                          {/* AJUSTE: Cores para item ativo e inativo/hover */}
                          <NavLink to={item.url} className={({isActive}) => `flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${isActive ? 'bg-orange-500 text-white font-semibold' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}

          {/* Seção de Projetos */}
          <div>
             {/* AJUSTE: Cor do texto */}
            <h2 className="px-4 mb-2 text-xs font-semibold uppercase text-slate-400 tracking-wider">PROJETOS</h2>
            <ul className="space-y-1">
              <li>
                <Collapsible open={isProjectsOpen} onOpenChange={setIsProjectsOpen}>
                  <CollapsibleTrigger asChild>
                    {/* AJUSTE: Cores para item ativo e inativo/hover */}
                    <NavLink to="/projects" end className={({isActive}) => `w-full flex items-center justify-between space-x-3 px-4 py-2.5 rounded-lg transition-all ${isActive && location.pathname === '/projects' ? 'bg-orange-500 text-white font-semibold' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                      <div className="flex items-center space-x-3"><FolderOpen className="w-5 h-5" /><span>Visão Geral</span></div>
                      <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isProjectsOpen ? 'rotate-180' : ''}`} />
                    </NavLink>
                  </CollapsibleTrigger>
                  <CollapsibleContent asChild>
                    <ul className="pt-1 pl-6 pr-2 space-y-1">
                      {projectList.map(project => (
                        <li key={project.id}>
                          {/* AJUSTE: Cores para item ativo e inativo/hover */}
                          <NavLink to={`/projects/${project.id}`} className={({isActive}) => `flex items-center w-full gap-2 px-4 py-2 rounded-md text-sm ${isActive ? 'bg-orange-500 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
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
       {/* AJUSTE: Cor da borda e dos textos */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.user_metadata?.avatar_url ?? undefined} />
            <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate text-slate-100">{user.full_name || 'Usuário'}</p>
            <div className="text-xs text-orange-500">{user.nivelAcesso}</div>
          </div>
        </div>
        {/* AJUSTE: Cores para o botão de logout */}
        <button onClick={handleLogout} className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors">
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;