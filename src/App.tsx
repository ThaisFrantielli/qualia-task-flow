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
import ContractsDashboard from '@/pages/analytics/ContractsDashboard';
import PurchasesDashboard from '@/pages/analytics/PurchasesDashboard';
import DataAudit from '@/pages/analytics/DataAudit';
import ChurnDashboard from '@/pages/analytics/ChurnDashboard';
import FinancialAnalytics from '@/pages/analytics/FinancialAnalytics';
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
import MaintenanceDashboard from '@/pages/analytics/MaintenanceDashboard';
import InfractionsDashboard from '@/pages/analytics/InfractionsDashboard';
import ClaimsDashboard from '@/pages/analytics/ClaimsDashboard';
import FinancialResult from '@/pages/analytics/FinancialResult';
import SalesDashboard from '@/pages/analytics/SalesDashboard';
import ClientsDashboard from '@/pages/analytics/ClientsDashboard';
import ExecutiveDashboard from '@/pages/analytics/ExecutiveDashboard';
import CommercialDashboard from '@/pages/analytics/CommercialDashboard';
import FundingDashboard from '@/pages/analytics/FundingDashboard';
import CustomerAnalytics from '@/pages/analytics/CustomerAnalytics';
import DREDashboard from '@/pages/analytics/DREDashboard';
import ModelosVeiculosPage from '@/pages/Configuracoes/ModelosVeiculosPage';
import PropostasPage from '@/pages/PropostasPage';
import PropostasFormPage from '@/pages/PropostasFormPage';
import { useEnabledModules } from '@/modules/registry';
import React from 'react';

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

              <Route path="/analytics">
                <Route index element={<AnalyticsIndex />} />
                <Route path="frota" element={<FleetDashboard />} />
                <Route path="compras" element={<PurchasesDashboard />} />
                <Route path="vendas" element={<SalesDashboard />} />
                <Route path="churn" element={<ChurnDashboard />} />
                <Route path="financeiro" element={<FinancialAnalytics />} />
                <Route path="resultado" element={<DREDashboard />} />
                <Route path="contratos" element={<ContractsDashboard />} />
                {/* Performance de Contratos agora integrado em /analytics/contratos */}
                <Route path="auditoria" element={<DataAudit />} />
                <Route path="manutencao" element={<MaintenanceDashboard />} />
                <Route path="multas" element={<InfractionsDashboard />} />
                <Route path="sinistros" element={<ClaimsDashboard />} />
                {/* Performance de Vendas consolidada em /analytics/vendas (SalesDashboard) */}
                {/* Performance de Vendas consolidada em /analytics/vendas (SalesDashboard) */}
                <Route path="clientes" element={<ClientsDashboard />} />
                {/* Commercial dashboard moved to module registry */}
                <Route path="executive" element={<ExecutiveDashboard />} />
                <Route path="funding" element={<FundingDashboard />} />
                <Route path="cliente" element={<CustomerAnalytics />} />
              </Route>

              <Route path="/clientes" element={<CustomerHubPage />} />
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