
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  KanbanSquare, 
  List, 
  FileText, 
  Settings,
  Users,
  Bell,
  LogOut,
  Calendar
} from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Kanban', url: '/kanban', icon: KanbanSquare },
  { title: 'Lista de Tarefas', url: '/tasks', icon: List },
  { title: 'Calendário', url: '/calendar', icon: Calendar },
  { title: 'Relatórios', url: '/reports', icon: FileText },
  { title: 'Equipe', url: '/team', icon: Users },
  { title: 'Notificações', url: '/notifications', icon: Bell },
  { title: 'Configurações', url: '/settings', icon: Settings },
];

const Sidebar = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

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
      <nav className="flex-1 py-6 px-4">
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
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">U</span>
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-medium">Usuário Admin</p>
            <p className="text-gray-400 text-xs">admin@quality.com</p>
          </div>
        </div>
        <button className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
