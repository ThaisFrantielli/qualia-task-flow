// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importe suas páginas
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import Tasks from './pages/Tasks';
import Projects from './pages/Projects';
import ProjectDetailPage from './pages/ProjectDetailPage';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import NotFound from './pages/NotFound';
import SettingsPage from './pages/Settings';
import NotificationsPage from './pages/Notifications';
import Team from './pages/Team'; 
import CrmPdvPage from './pages/CrmPdvPage';
import CrmDashboardPage from './pages/CrmDashboardPage';
// --- 1. IMPORTE A PÁGINA DE REDEFINIÇÃO DE SENHA ---
import ResetPasswordPage from './pages/ResetPasswordPage';

// Importe componentes de layout e proteção
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout'; // Ou o seu componente de Layout

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* === ROTAS PÚBLICAS === */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        {/* --- 2. ADICIONE A NOVA ROTA PÚBLICA AQUI --- */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {/* ------------------------------------------- */}

        {/* === ROTAS PROTEGIDAS === */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}> 
            {/* Rotas Principais */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/tasks" element={<Tasks />} />
            
            {/* Rotas de Projetos */}
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
            
            {/* Rotas de CRM / Pós-Vendas */}
            <Route path="/pos-vendas" element={<CrmPdvPage />} />
            <Route path="/pos-vendas/dashboard" element={<CrmDashboardPage />} /> {/* Renomeei para /pos-vendas/dashboard para consistência */}

            {/* Rotas de Gerenciamento */}
            <Route path="/team" element={<Team />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Rota para páginas não encontradas */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;