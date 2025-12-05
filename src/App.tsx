import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { OportunidadeProvider } from './contexts/OportunidadeContext';
import { PresenceProvider } from './contexts/PresenceContext';

import Calendar from '@/pages/Calendar';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoginPage from '@/pages/Login';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import Dashboard from '@/pages/Dashboard';
import Kanban from '@/pages/Kanban';
import TasksPage from '@/pages/Tasks';
import TaskDetailPage from '@/pages/TaskDetailPage';
import ProjectsPage from '@/pages/Projects';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import EditProjectPage from '@/pages/EditProject';
import Team from '@/pages/Team';
import Settings from '@/pages/Settings';
import TaskSettingsPage from '@/pages/TaskSettingsPage';
import Notifications from '@/pages/Notifications';
import AnalyticsIndex from '@/pages/analytics';
import FleetDashboard from '@/pages/analytics/FleetDashboard';
import ContractsDashboard from '@/pages/analytics/ContractsDashboard';
import PurchasesDashboard from '@/pages/analytics/PurchasesDashboard';
import SalesPerformance from '@/pages/analytics/SalesPerformance';
import DataAudit from '@/pages/analytics/DataAudit';
import ChurnDashboard from '@/pages/analytics/ChurnDashboard';
import FinancialAnalytics from '@/pages/analytics/FinancialAnalytics';
import ContractPerformanceDashboard from '@/pages/analytics/ContractPerformanceDashboard';
import SurveyAdminPage from '@/pages/SurveyAdminPage';
import SurveyResponsePage from '@/pages/SurveyResponsePage';
import SurveyThankYouPage from '@/pages/SurveyThankYouPage';
import SurveyReportsPage from '@/pages/SurveyReportsPage';
import NotFound from '@/pages/NotFound';
import CustomerHubPage from '@/pages/CustomerHubPage';
import OportunidadesPage from '@/pages/OportunidadesPage';
import OportunidadeDetalhePage from '@/pages/OportunidadeDetalhePage';
import WhatsAppConfigPage from '@/pages/WhatsAppConfigPage';
import WhatsAppCentralPage from '@/pages/WhatsAppCentralPage';
import MultiWhatsAppManagerPage from '@/pages/MultiWhatsAppManagerPage';
import ControleAcessoPage from '@/pages/Configuracoes/ControleAcesso';
import GerenciarEquipesPage from '@/pages/Configuracoes/GerenciarEquipes';
import GerenciarDepartamentosPage from '@/pages/Configuracoes/GerenciarDepartamentos';
import ConfiguracoesEquipesPage from '@/pages/Configuracoes/ConfiguracoesEquipes';
import FilaTriagem from '@/pages/FilaTriagem';
import TicketsUnifiedPage from '@/pages/TicketsUnifiedPage';
import TicketDetailPage from '@/pages/TicketDetailPage';
import TicketsReportsDashboard from '@/pages/TicketsReportsDashboard';
import MaintenanceDashboard from '@/pages/analytics/MaintenanceDashboard';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/pesquisa/:surveyId" element={<SurveyResponsePage />} />
          <Route path="/obrigado" element={<SurveyThankYouPage />} />

          {/* Rotas Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route element={
              <PresenceProvider>
                <OportunidadeProvider>
                  <AppLayout />
                </OportunidadeProvider>
              </PresenceProvider>
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/kanban" element={<Kanban />} />

              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/tasks/:taskId" element={<TaskDetailPage />} />

              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="/projects/:id/edit" element={<EditProjectPage />} />

              <Route path="/oportunidades" element={<OportunidadesPage />} />
              <Route path="/oportunidades/:id" element={<OportunidadeDetalhePage />} />

              {/* Central de Tickets Unificada */}
              <Route path="/tickets" element={<TicketsUnifiedPage />} />
              <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
              <Route path="/tickets/reports" element={<TicketsReportsDashboard />} />

              <Route path="/whatsapp" element={<WhatsAppCentralPage />} />

              <Route path="/analytics">
                <Route index element={<AnalyticsIndex />} />
                <Route path="frota" element={<FleetDashboard />} />
                <Route path="compras" element={<PurchasesDashboard />} />
                <Route path="churn" element={<ChurnDashboard />} />
                <Route path="financeiro" element={<FinancialAnalytics />} />
                <Route path="contratos" element={<ContractsDashboard />} />
                <Route path="performance-contratos" element={<ContractPerformanceDashboard />} />
                <Route path="auditoria" element={<DataAudit />} />
                <Route path="manutencao" element={<MaintenanceDashboard />} />
                <Route path="performance-vendas" element={<SalesPerformance />} />
              </Route>

              <Route path="/clientes" element={<CustomerHubPage />} />
              <Route path="/triagem" element={<FilaTriagem />} />

              <Route path="/pesquisas" element={<SurveyAdminPage />} />
              <Route path="/pesquisas/relatorios" element={<SurveyReportsPage />} />

              <Route path="/team" element={<Team />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/tasks" element={<TaskSettingsPage />} />
              <Route path="/configuracoes/whatsapp" element={<WhatsAppConfigPage />} />
              <Route path="/configuracoes/controle-acesso" element={<ControleAcessoPage />} />
              <Route path="/configuracoes/equipes-hierarquia" element={<ConfiguracoesEquipesPage />} />

              <Route path="/configuracoes/equipes" element={<GerenciarEquipesPage />} />
              <Route path="/configuracoes/departamentos" element={<GerenciarDepartamentosPage />} />
              <Route path="/whatsapp-manager" element={<MultiWhatsAppManagerPage />} />
              <Route path="/calendar" element={<Calendar />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;