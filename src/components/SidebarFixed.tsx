// src/components/SidebarFixed.tsx
import { useState, useEffect, ElementType } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, List, Settings,
  Users, Bell, LogOut, FolderOpen, ChevronDown, BarChart3,
  ClipboardList, SlidersHorizontal, Target, MessageSquare, Calendar as CalendarIcon,
  PanelLeftClose, PanelRightClose, Ticket, Wrench, FileText, TrendingUp, Briefcase, Crown, Headphones, DollarSign, Car, FileCheck
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useEnabledModules } from '@/modules/registry';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import { useNotifications } from '@/hooks/useNotifications';
import { TeamPresenceWidget } from '@/components/presence/TeamPresenceWidget';
import type { Permissoes } from '@/types';

interface MenuItem {
  label: string;
  url: string;
  icon: ElementType;
  permissionKey?: keyof Permissoes;
  children?: MenuItem[];
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

// base menu groups (module menu groups will be merged in at render time)
const baseMenuGroups: MenuGroup[] = [
  { title: 'AGENDA', items: [{ label: 'Calendário', url: '/calendar', icon: CalendarIcon }] },
  {
    title: 'GERAL',
    items: [
      { label: 'Dashboard', url: '/', icon: LayoutDashboard, permissionKey: 'dashboard' },
      { label: 'Tarefas', url: '/tasks', icon: List, permissionKey: 'tasks' },
      { label: 'Projetos', url: '/projects', icon: FolderOpen },
      { label: 'Notificações', url: '/notifications', icon: Bell },
    ]
  },
  {
    title: 'ANALÍTICOS',
    items: [
      { 
        label: 'Visão Executiva', 
        url: '/analytics/executive', 
        icon: Crown,
        children: [
          { label: 'Auditoria de Dados', url: '/analytics/auditoria', icon: ClipboardList }
        ]
      },
      { 
        label: 'Operacional', 
        url: '/analytics/frota', 
        icon: FolderOpen,
        children: [
          { label: 'Frota', url: '/analytics/frota', icon: FolderOpen },
          { label: 'Manutenção', url: '/analytics/manutencao', icon: Wrench },
          { label: 'Multas', url: '/analytics/multas', icon: FileText },
          { label: 'Sinistros', url: '/analytics/sinistros', icon: Ticket },
        ]
      },
      { 
        label: 'Financeiro', 
        url: '/analytics/financeiro', 
        icon: DollarSign,
        children: [
          { label: 'Faturamento', url: '/analytics/financeiro', icon: BarChart3 },
          { label: 'DRE Gerencial', url: '/analytics/resultado', icon: DollarSign },
          { label: 'Gestão de Passivo', url: '/analytics/funding', icon: Briefcase },
          { label: 'Compras', url: '/analytics/compras', icon: BarChart3 },
          { label: 'Vendas', url: '/analytics/vendas', icon: TrendingUp },
        ]
      },
      { 
        label: 'Comercial', 
        url: '/analytics/comercial', 
        icon: Target,
        children: [
          { label: 'Pipeline', url: '/analytics/comercial', icon: Target },
          { label: 'Propostas', url: '/propostas', icon: FileCheck },
          { label: 'Contratos', url: '/analytics/contratos', icon: FileText },
          { label: 'Clientes', url: '/analytics/clientes', icon: Users },
          { label: 'Cancelamentos', url: '/analytics/churn', icon: Users },
        ]
      },
    ]
  },
  {
    title: 'CRM',
    items: [
      { label: 'Central de Atendimento', url: '/atendimento', icon: Headphones, permissionKey: 'crm' },
      { label: 'Central de Tickets', url: '/tickets', icon: Ticket, permissionKey: 'crm' },
      { label: 'Oportunidades', url: '/oportunidades', icon: Target, permissionKey: 'crm' },
      { label: 'Hub de Clientes', url: '/clientes', icon: Users, permissionKey: 'crm' },
      { label: 'Relatórios', url: '/tickets/reports', icon: BarChart3, permissionKey: 'crm' },
      { label: 'Pesquisas', url: '/pesquisas', icon: ClipboardList, permissionKey: 'crm' },
    ]
  },
  {
    title: 'CONFIGURAÇÕES',
    items: [
      { label: 'Ajustes Pessoais', url: '/settings', icon: Settings },
      { label: 'Usuários & Acessos', url: '/configuracoes/usuarios-acessos', icon: Users, permissionKey: 'team' },
      { label: 'Modelos de Veículos', url: '/configuracoes/modelos-veiculos', icon: Car, permissionKey: 'team' },
      { label: 'Tarefas e Projetos', url: '/settings/tasks', icon: SlidersHorizontal, permissionKey: 'team' },
      { label: 'Motivos de Tickets', url: '/configuracoes/ticket-motivos', icon: Ticket, permissionKey: 'team' },
      { label: 'Configuração WhatsApp', url: '/configuracoes/whatsapp', icon: MessageSquare, permissionKey: 'team' },
    ]
  }
];

  // getMenuGroups will be computed inside the component where hooks can be used

const SidebarFixed: React.FC = () => {
  const enabledModules = useEnabledModules();

  const getMenuGroups = (): MenuGroup[] => {
    const moduleGroups = (enabledModules || []).flatMap((m: any) => m.menuGroups || []);
    const map = new Map<string, MenuGroup>();
    baseMenuGroups.forEach(g => map.set(g.title, { ...g, items: [...g.items] }));
    moduleGroups.forEach(g => {
      if (map.has(g.title)) {
        const existing = map.get(g.title)!;
        existing.items = [...existing.items, ...g.items];
        map.set(g.title, existing);
      } else {
        map.set(g.title, g);
      }
    });
    return Array.from(map.values());
  };
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  // projects not needed in this component currently
  useProjects();

  const [isCollapsed, setIsCollapsed] = useState(false);
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
      try { localStorage.setItem('sidebar.openGroups', JSON.stringify(next)); } catch { }
      return next;
    });
  };

  // track open/closed state for menu items that have children (e.g. Analytics -> Compras)
  const [openItems, setOpenItems] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('sidebar.openItems');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const toggleItem = (label: string, value?: boolean) => {
    setOpenItems((prev) => {
      const next = { ...prev, [label]: typeof value === 'boolean' ? value : !prev[label] };
      try { localStorage.setItem('sidebar.openItems', JSON.stringify(next)); } catch { }
      return next;
    });
  };

  // If needed: open groups can be toggled based on route
  useEffect(() => {
    // preserve previous behavior optionally by opening Projects group when on /projects
    if (location.pathname.startsWith('/projects')) {
      try { const raw = localStorage.getItem('sidebar.openGroups'); const prev = raw ? JSON.parse(raw) : {}; prev['GERAL'] = true; localStorage.setItem('sidebar.openGroups', JSON.stringify(prev)); setOpenGroups(prev); } catch { }
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getInitials = (name?: string | null): string => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase();
    return user?.email?.[0].toUpperCase() || '?';
  };

  // projectList intentionally unused here; projects can be accessed via `projects` hook when necessary

  const { unreadCount } = useNotifications();

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
          {getMenuGroups().map((group) => {
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
                        {visibleItems.map((item) => {
                          const Icon = item.icon;
                          if (item.children && item.children.length > 0) {
                            const isOpen = !!openItems[item.label];
                            return (
                              <li key={item.label}>
                                <div className="flex items-center justify-between">
                                  <NavLink
                                    to={item.url}
                                    className={({ isActive }) =>
                                      `flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${isActive ? 'bg-[#FF8C00] text-white font-semibold' : 'text-[#C7C9D9] hover:bg-[#2C2854]'
                                      }`
                                    }
                                  >
                                    <Icon className="w-5 h-5" />
                                    {!isCollapsed && <span className="flex items-center gap-2">{item.label}</span>}
                                  </NavLink>

                                  {!isCollapsed && (
                                    <button
                                      onClick={() => toggleItem(item.label)}
                                      aria-expanded={isOpen}
                                      aria-label={`Toggle ${item.label}`}
                                      className="p-1 ml-2 text-[#C7C9D9] hover:text-white rounded"
                                    >
                                      <ChevronDown className={`w-4 h-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                  )}
                                </div>

                                {isOpen && (
                                  <ul className="pl-6 mt-1 space-y-1">
                                    {item.children.map((child) => {
                                      const ChildIcon = child.icon;
                                      return (
                                        <li key={child.label}>
                                          <NavLink
                                            to={child.url}
                                            className={({ isActive }) =>
                                              `flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${isActive ? 'bg-[#FF8C00] text-white font-semibold' : 'text-[#C7C9D9] hover:bg-[#2C2854]'
                                              }`
                                            }
                                          >
                                            <ChildIcon className="w-4 h-4" />
                                            {!isCollapsed && <span className="text-sm">{child.label}</span>}
                                          </NavLink>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </li>
                            );
                          }

                          return (
                            <li key={item.label}>
                              <NavLink
                                to={item.url}
                                className={({ isActive }) =>
                                  `flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${isActive ? 'bg-[#FF8C00] text-white font-semibold' : 'text-[#C7C9D9] hover:bg-[#2C2854]'
                                  }`
                                }
                              >
                                <Icon className="w-5 h-5" />
                                {!isCollapsed && <span className="flex items-center gap-2">{item.label}
                                  {item.label === 'Notificações' && unreadCount > 0 && (
                                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-blue-500 text-white">{unreadCount}</span>
                                  )}
                                </span>}
                              </NavLink>
                            </li>
                          );
                        })}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            );
          })}

          {/* Projetos link removed: kept central/general link elsewhere */}
        </div>
      </nav>

      <div className="p-4 border-t border-[#322E5C]">
        {/* Online Team Widget */}
        {!isCollapsed && (
          <div className="mb-4 py-2">
            <TeamPresenceWidget maxDisplay={4} />
          </div>
        )}

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
