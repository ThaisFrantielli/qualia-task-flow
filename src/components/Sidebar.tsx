// src/components/Sidebar.tsx

import React, { useState, ElementType } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, KanbanSquare, List, Settings,
  Bell, LogOut, FolderOpen, Calendar as CalendarIcon,
  PanelLeftClose, PanelRightClose
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import type { Permissoes } from '@/types';
import Logo from './Logo';

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
    title: 'CONFIGURAÇÕES',
    items: [
      { label: 'Notificações', url: '/notifications', icon: Bell },
      { label: 'Ajustes Pessoais', url: '/settings', icon: Settings },
    ]
  },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects } = useProjects();

  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    navigate('/login'); 
  };

  const getInitials = (name?: string | null): string => { 
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase(); 
    return user?.email?.[0].toUpperCase() || '?'; 
  };

  const projectList = projects.filter(p => p.id !== 'all');

  if (!user) {
    return (
      <div className={`transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-[#1E1B3A] animate-pulse`} />
    );
  }

  return (
    <div
      className={`transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} 
      h-screen bg-gradient-to-b from-[#1E1B3A] to-[#14122A] bg-opacity-95 
      shadow-lg flex flex-col`}
    >
      {/* Header */}
<div className="p-4 border-b border-[#322E5C] flex items-center justify-between">
  <div className="flex flex-col items-center justify-center text-center w-full">
    {!isCollapsed && (
      <>
        <Logo className="w-32 h-auto text-white mx-auto" />
        <p className="text-[#C7C9D9] text-xs mt-1">Conectada com você</p>
      </>
    )}
  </div>

  <button
    onClick={() => setIsCollapsed(!isCollapsed)}
    className="p-1.5 text-[#C7C9D9] hover:text-white hover:bg-[#2C2854] rounded-md ml-2"
  >
    {isCollapsed ? <PanelRightClose size={20} /> : <PanelLeftClose size={20} />}
  </button>
</div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-3 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.title}>
            <h2
              className={`px-4 mb-2 text-xs font-semibold tracking-wider 
              ${isCollapsed ? 'hidden' : 'block text-[#7D7AA5]'}`}
            >
              {group.title}
            </h2>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.label}>
                  <NavLink
                    to={item.url}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 p-2 rounded-xl text-sm transition-all
                      ${isCollapsed ? 'justify-center' : ''}
                      ${
                        isActive
                          ? 'bg-[#FF8C00] text-white font-semibold shadow-md'
                          : 'text-[#C7C9D9] hover:bg-[#2C2854] hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Projetos */}
        <div>
          <h2
            className={`px-4 mb-2 text-xs font-semibold tracking-wider 
            ${isCollapsed ? 'hidden' : 'block text-[#7D7AA5]'}`}
          >
            PROJETOS
          </h2>
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/projects"
                className={({ isActive }) =>
                  `flex items-center space-x-3 p-2 rounded-xl text-sm transition-all
                  ${isCollapsed ? 'justify-center' : ''}
                  ${
                    isActive
                      ? 'bg-[#FF8C00] text-white font-semibold shadow-md'
                      : 'text-[#C7C9D9] hover:bg-[#2C2854] hover:text-white'
                  }`
                }
              >
                <FolderOpen className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>Visão Geral</span>}
              </NavLink>
            </li>

            {!isCollapsed &&
              projectList.map((project) => (
                <li key={project.id}>
                  <NavLink
                    to={`/projects/${project.id}`}
                    className={({ isActive }) =>
                      `flex items-center gap-3 pl-7 pr-2 py-2 rounded-xl text-sm transition-all
                      ${
                        isActive
                          ? 'bg-[#FF8C00] text-white font-semibold shadow-md'
                          : 'text-[#C7C9D9] hover:bg-[#2C2854] hover:text-white'
                      }`
                    }
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color || '#808080' }}
                    />
                    <span className="truncate">{project.name}</span>
                  </NavLink>
                </li>
              ))}
          </ul>
        </div>
      </nav>

      {/* Footer / Usuário */}
      <div className="p-4 border-t border-[#322E5C]">
        <div className="flex items-center">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarImage src={user.user_metadata?.avatar_url ?? undefined} />
            <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
          </Avatar>

          {!isCollapsed && (
            <div className="ml-3 flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate text-white">
                {user.full_name || 'Usuário'}
              </p>
              <p className="text-xs truncate text-[#C7C9D9]">
                {user.nivelAcesso || 'Colaborador'}
              </p>
            </div>
          )}

          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="ml-2 p-2 rounded-md text-[#C7C9D9] hover:bg-[#2C2854] hover:text-white"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
