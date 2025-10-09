// src/App.tsx 

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { OportunidadeProvider } from './contexts/OportunidadeContext';

import AppLayout from '@/components/layout/AppLayout';
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
import SurveyResponsePage from '@/pages/SurveyResponsePage';
import SurveyThankYouPage from '@/pages/SurveyThankYouPage';
import NotFound from '@/pages/NotFound';
import AtendimentoDetailPage from '@/pages/AtendimentoDetailPage';
import CustomerHubPage from '@/pages/CustomerHubPage';
import OportunidadesPage from '@/pages/OportunidadesPage';
import OportunidadeDetalhePage from '@/pages/OportunidadeDetalhePage';
import WhatsAppConfigPage from '@/pages/WhatsAppConfigPage';
import WhatsAppChatPage from '@/pages/WhatsAppChatPage';
import MultiWhatsAppManagerPage from '@/pages/MultiWhatsAppManagerPage';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/pesquisa/:surveyId" element={<SurveyResponsePage />} />
          <Route path="/obrigado" element={<SurveyThankYouPage />} />
          
          {/* Rotas Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route element={
              <OportunidadeProvider>
                <AppLayout />
              </OportunidadeProvider>
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/kanban" element={<Kanban />} />
              
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/tasks/:taskId" element={<TaskDetailPage />} />

              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
              
              <Route path="/oportunidades" element={<OportunidadesPage />} />
              <Route path="/oportunidades/:id" element={<OportunidadeDetalhePage />} />
              
              <Route path="/pos-vendas" element={<CrmPdvPage />} />
              <Route path="/pos-vendas/dashboard" element={<CrmDashboardPage />} />
              <Route path="/pos-vendas/novo" element={<CreateAtendimentoPage />} />
              <Route path="/pos-vendas/:id" element={<AtendimentoDetailPage />} />
              
              <Route path="/whatsapp" element={<WhatsAppChatPage />} />
                           
              <Route path="/clientes" element={<CustomerHubPage />} />
              
              <Route path="/pesquisas" element={<SurveyGeneratorPage />} />

              <Route path="/team" element={<Team />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} /> 
              <Route path="/settings/tasks" element={<TaskSettingsPage />} />
              <Route path="/configuracoes/whatsapp" element={<WhatsAppConfigPage />} />
              <Route path="/whatsapp-manager" element={<MultiWhatsAppManagerPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;