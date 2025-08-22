// src/App.tsx (VERSÃO FINAL E AJUSTADA)

import { BrowserRouter, Routes, Route } from 'react-router-dom';

// --- CORREÇÃO: Padronização de todos os imports para usar o alias '@' ---
// Isso torna os caminhos mais consistentes e menos propensos a erros.
import AppLayout from '@/components/layout/AppLayout'; // <-- Usando o novo layout que você criou
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoginPage from '@/pages/Login';
import SignupPage from '@/pages/Signup';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import Dashboard from '@/pages/Dashboard';
import Kanban from '@/pages/Kanban';
import TasksPage from '@/pages/Tasks';
import TaskDetailPage from '@/pages/TaskDetailPage';
import ProjectsPage from '@/pages/Projects';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import Team from '@/pages/Team';
import Settings from '@/pages/Settings';
import TaskSettingsPage from '@/pages/TaskSettingsPage';
import Notifications from '@/pages/Notifications';
import CrmPdvPage from '@/pages/CrmPdvPage';
import CrmDashboardPage from '@/pages/CrmDashboardPage';
import CreateAtendimentoPage from '@/pages/CreateAtendimentoPage';
import SurveyGeneratorPage from '@/pages/SurveyGeneratorPage';
import SurveyResponsePage from '@/pages/SurveyResponsePage'; // <-- Adicionado para a rota de resposta
import SurveyThankYouPage from '@/pages/SurveyThankYouPage'; // <-- Adicionado para a rota de agradecimento
import NotFound from '@/pages/NotFound';
import CustomerManagementPage from '@/pages/CustomerManagementPage';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/pesquisa/:surveyId" element={<SurveyResponsePage />} /> {/* Rota pública para responder */}
          <Route path="/obrigado" element={<SurveyThankYouPage />} /> {/* Rota pública de agradecimento */}
          
          {/* Rotas Protegidas */}
          <Route element={<ProtectedRoute />}>
            {/* Todas as rotas aqui dentro usarão o AppLayout (com Sidebar e Header) */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/kanban" element={<Kanban />} />
              
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/tasks/:taskId" element={<TaskDetailPage />} />

              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
              
              <Route path="/pos-vendas" element={<CrmPdvPage />} />
              <Route path="/pos-vendas/dashboard" element={<CrmDashboardPage />} />
              <Route path="/pos-vendas/novo" element={<CreateAtendimentoPage />} />
              <Route path="/clientes" element={<CustomerManagementPage />} />
              
              <Route path="/pesquisas" element={<SurveyGeneratorPage />} />

              <Route path="/team" element={<Team />} />
              <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} /> 
              <Route path="/settings/tasks" element={<TaskSettingsPage />} />
            </Route>
          </Route>

          {/* Rota "Catch-all" para páginas não encontradas */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;