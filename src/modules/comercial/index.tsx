import PropostasPage from '@/pages/PropostasPage';
import PropostasFormPage from '@/pages/PropostasFormPage';
import CommercialDashboard from '@/pages/analytics/CommercialDashboard';
import { Route } from 'react-router-dom';
import { FileCheck, Target, FileText, BarChart3, Users, AlertTriangle } from 'lucide-react';

// Menu groups are now defined in SidebarFixed.tsx to ensure consistency
// This module only provides routes for commercial pages
const menuGroups = [
  {
    title: 'COMERCIAL',
    items: [
      { label: 'Pipeline', url: '/analytics/comercial', icon: Target, permissionKey: 'crm' },
      { label: 'Propostas', url: '/propostas', icon: FileCheck, permissionKey: 'crm' },
      { label: 'Contratos', url: '/analytics/contratos', icon: FileText, permissionKey: 'crm' },
      { label: 'Análise de Contrato', url: '/analytics/analise-contratos', icon: BarChart3, permissionKey: 'crm' },
      { label: 'Clientes', url: '/analytics/clientes', icon: Users, permissionKey: 'crm' },
      { label: 'Cancelamentos', url: '/analytics/churn', icon: AlertTriangle, permissionKey: 'crm' },
    ],
  },
];

const routes = (
  <>
    <Route path="/propostas" element={<PropostasPage />} />
    <Route path="/propostas/nova" element={<PropostasFormPage />} />
    <Route path="/propostas/:id" element={<PropostasFormPage />} />
    <Route path="/analytics/comercial" element={<CommercialDashboard />} />
    {/* Rotas /analytics/contratos, /analytics/analise-contratos, /analytics/clientes, /analytics/churn já estão registradas em App.tsx */}
  </>
);

export default {
  key: 'comercial',
  name: 'Comercial',
  defaultEnabled: true,
  menuGroups,
  routes,
};
