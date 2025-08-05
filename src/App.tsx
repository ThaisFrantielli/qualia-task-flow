// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importe suas páginas
import Dashboard from '@/pages/Dashboard';
import Kanban from '@/pages/Kanban';
import Tasks from '@/pages/Tasks';
import Projects from '@/pages/Projects';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import LoginPage from '@/pages/Login';
import SignupPage from '@/pages/Signup';
import NotFound from '@/pages/NotFound';
import SettingsPage from '@/pages/Settings';
import NotificationsPage from '@/pages/Notifications';
import CrmPdvPage from '@/pages/CrmPdvPage';
import CrmDashboardPage from '@/pages/CrmDashboardPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import SurveyResponsePage from '@/pages/SurveyResponsePage';
import SurveyThankYouPage from '@/pages/SurveyThankYouPage';
import SurveyAdminPage from '@/pages/SurveyAdminPage';

// --- IMPORTAÇÃO QUE FALTAVA ---
import Team from '@/pages/Team'; 

// Importe componentes de layout e proteção
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* === ROTAS PÚBLICAS === */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/pesquisa/:surveyId" element={<SurveyResponsePage />} />
        <Route path="/obrigado" element={<SurveyThankYouPage />} />
        
        {/* === ROTAS PROTEGIDAS === */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}> 
            <Route path="/" element={<Dashboard />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="/pos-vendas" element={<CrmPdvPage />} />
            <Route path="/pos-vendas/dashboard" element={<CrmDashboardPage />} />
            <Route path="/pesquisas" element={<SurveyAdminPage />} />
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