// App entrypoint - v2
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { OportunidadeProvider } from './contexts/OportunidadeContext';
import { PresenceProvider } from './contexts/PresenceContext';

import Calendar from '@/pages/Calendar';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoginPage from '@/pages/Login';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import ForcePasswordChange from '@/pages/ForcePasswordChange';
import Dashboard from '@/pages/Dashboard';
import Kanban from '@/pages/Kanban';
import TasksPage from '@/pages/Tasks';
import TaskDetailPage from '@/pages/TaskDetailPage';
import ProjectsPage from '@/pages/Projects';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import EditProjectPage from '@/pages/EditProject';
// Team page migrado para UsuariosAcessos
import Settings from '@/pages/Settings';
import TaskSettingsPage from '@/pages/TaskSettingsPage';
import Notifications from '@/pages/Notifications';
import AnalyticsIndex from '@/pages/analytics';
import FleetDashboard from '@/pages/analytics/FleetDashboard';
import FleetIdleDashboard from '@/pages/analytics/FleetIdleDashboard';
import FleetMethodologyPage from '@/pages/analytics/FleetMethodologyPage';
import ContractsDashboard from '@/pages/analytics/ContractsDashboard';
import SurveyAdminPage from '@/pages/SurveyAdminPage';
import SurveyResponsePage from '@/pages/SurveyResponsePage';
import SurveyThankYouPage from '@/pages/SurveyThankYouPage';
import SurveyReportsPage from '@/pages/SurveyReportsPage';
import NotFound from '@/pages/NotFound';
import CustomerHubPage from '@/pages/CustomerHubPage';
import OportunidadesPage from '@/pages/OportunidadesPage';
import OportunidadeDetalhePage from '@/pages/OportunidadeDetalhePage';
import WhatsAppConfigPage from '@/pages/WhatsAppConfigPage';
import WhatsAppTemplatesPage from '@/pages/WhatsAppTemplatesPage';
import WhatsAppDistributionConfigPage from '@/pages/WhatsAppDistributionConfigPage';
import WhatsAppDistributionDashboard from '@/pages/WhatsAppDistributionDashboard';
import AtendimentoCentralPage from '@/pages/AtendimentoCentralPage';
import WhatsAppCentralPage from '@/pages/WhatsAppCentralPage';
import MultiWhatsAppManagerPage from '@/pages/MultiWhatsAppManagerPage';
// Páginas antigas redirecionadas para UsuariosAcessos
import UsuariosAcessosPage from '@/pages/Configuracoes/UsuariosAcessos';
import TicketOptionsPage from '@/pages/Configuracoes/TicketOptionsPage';
import FilaTriagem from '@/pages/FilaTriagem';
import TicketsUnifiedPage from '@/pages/TicketsUnifiedPage';
import TicketDetailPage from '@/pages/TicketDetailPage';
import TicketsReportsDashboard from '@/pages/TicketsReportsDashboard';

import ModelosVeiculosPage from '@/pages/Configuracoes/ModelosVeiculosPage';
import PropostasPage from '@/pages/PropostasPage';
import PropostasFormPage from '@/pages/PropostasFormPage';
import PrecificacaoConfigPage from '@/pages/PrecificacaoConfigPage';
// removed unused analytics/page imports to satisfy typecheck
import { useEnabledModules } from '@/modules/registry';
import React from 'react';
import EmailPage from '@/pages/EmailPage';
import Broadcasts from '@/pages/Broadcasts';

function App() {
  const enabledModules = useEnabledModules();

  return (
    <>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/pesquisa/:surveyId" element={<SurveyResponsePage />} />
          <Route path="/obrigado" element={<SurveyThankYouPage />} />

          {/* Rota de Troca Obrigatória de Senha (protegida, mas sem layout) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/force-password-change" element={<ForcePasswordChange />} />
          </Route>

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

              <Route path="/atendimento" element={<AtendimentoCentralPage />} />
              <Route path="/whatsapp" element={<WhatsAppCentralPage />} />
              <Route path="/triagem" element={<FilaTriagem />} />
              <Route path="/emails" element={<EmailPage />} />
              <Route path="/broadcasts" element={<Broadcasts />} />
              <Route path="/analytics">
                <Route index element={<AnalyticsIndex />} />
                <Route path="frota" element={<FleetDashboard />} />
                <Route path="frota-idle" element={<FleetIdleDashboard />} />
                <Route path="frota-metodologia" element={<FleetMethodologyPage />} />
                <Route path="contratos" element={<ContractsDashboard />} />
              </Route>

              <Route path="/clientes" element={<CustomerHubPage />} />

              <Route path="/propostas" element={<PropostasPage />} />
              <Route path="/propostas/nova" element={<PropostasFormPage />} />
              <Route path="/propostas/:id" element={<PropostasFormPage />} />

              <Route path="/precificacao/config" element={<PrecificacaoConfigPage />} />

              <Route path="/triagem" element={<FilaTriagem />} />

              <Route path="/pesquisas" element={<SurveyAdminPage />} />
              <Route path="/pesquisas/relatorios" element={<SurveyReportsPage />} />

              <Route path="/team" element={<Navigate to="/configuracoes/usuarios-acessos?tab=usuarios" replace />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/tasks" element={<TaskSettingsPage />} />
              <Route path="/configuracoes/whatsapp" element={<WhatsAppConfigPage />} />
              <Route path="/configuracoes/whatsapp/templates" element={<WhatsAppTemplatesPage />} />
              <Route path="/configuracoes/whatsapp/distribuicao" element={<WhatsAppDistributionConfigPage />} />
              <Route path="/configuracoes/whatsapp/distribuicao/dashboard" element={<WhatsAppDistributionDashboard />} />
              <Route path="/configuracoes/usuarios-acessos" element={<UsuariosAcessosPage />} />
              <Route path="/configuracoes/controle-acesso" element={<Navigate to="/configuracoes/usuarios-acessos?tab=modulos" replace />} />
              <Route path="/configuracoes/equipes-hierarquia" element={<Navigate to="/configuracoes/usuarios-acessos?tab=hierarquia" replace />} />
              <Route path="/configuracoes/ticket-motivos" element={<TicketOptionsPage />} />
              <Route path="/configuracoes/modelos-veiculos" element={<ModelosVeiculosPage />} />

              {/* module routes (loaded from modules table) */}
              {enabledModules && enabledModules.map((m: any, idx: number) => (
                <React.Fragment key={m.key || idx}>{m.routes}</React.Fragment>
              ))}

              <Route path="/configuracoes/equipes" element={<Navigate to="/configuracoes/usuarios-acessos?tab=departamentos" replace />} />
              <Route path="/configuracoes/departamentos" element={<Navigate to="/configuracoes/usuarios-acessos?tab=departamentos" replace />} />
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