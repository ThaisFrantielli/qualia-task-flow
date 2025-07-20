// src/components/Sidebar.tsx

import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, KanbanSquare, List, FileText, Settings,
  Users, Bell, LogOut, Calendar, FolderOpen
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User } from '@supabase/supabase-js';

const menuItems = [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    { title: 'Kanban', url: '/kanban', icon: KanbanSquare },
    { title: 'Lista de Tarefas', url: '/tasks', icon: List },
    { title: 'Projetos', url: '/projects', icon: FolderOpen },
    { title: 'Calendário', url: '/calendar', icon: Calendar },
    { title: 'Relatórios', url: '/reports', icon: FileText },
    { title: 'Equipe', url: '/team', icon: Users },
    { title: 'Notificações', url: '/notifications', icon: Bell },
    { title: 'Configurações', url: '/settings', icon: Settings },
];

interface SidebarProps {
  user: User | null; // A prop pode ser User ou null
}

const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };
  
  // --- FUNÇÃO getInitials CORRIGIDA ---
  // Garante que sempre retornamos uma string.
  const getInitials = (name?: string | null): string => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    // Se não houver nome, usa a primeira letra do email.
    // Se não houver nem email, retorna um '?' como fallback final.
    return user?.email?.[0].toUpperCase() || '?';
  };

  // Se o usuário ainda não foi carregado, mostramos um esqueleto de UI.
  if (!user) {
    return (
      <div className="w-64 h-screen bg-gray-900 shadow-lg flex flex-col animate-pulse">
        <div className="p-6 border-b border-gray-700 h-[89px]"></div>
        <div className="flex-1 py-6 px-4">
          <div className="space-y-2">
            {menuItems.map((item) => <div key={item.title} className="h-[52px] bg-gray-700 rounded-lg"></div>)}
          </div>
        </div>
        <div className="p-4 border-t border-gray-700 h-[121px]"></div>
      </div>
    );
  }

  // A partir daqui, temos certeza que 'user' é um objeto válido.
  return (
    <div className="w-64 h-screen bg-gray-900 shadow-lg flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <KanbanSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Quality</h1>
            <p className="text-gray-300 text-sm">Task Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.title}>
              <NavLink
                to={item.url}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive(item.url)
                    ? 'bg-primary text-white font-medium'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="w-9 h-9">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-gray-600 text-white font-medium">
              {getInitials(user.user_metadata?.full_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 overflow-hidden">
            <p className="text-white text-sm font-medium truncate">
              {user.user_metadata?.full_name || 'Usuário'}
            </p>
            <p className="text-gray-400 text-xs truncate">
              {user.email}
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;