import PropostasPage from '@/pages/PropostasPage';
import PropostasFormPage from '@/pages/PropostasFormPage';
import ContractsDashboard from '@/pages/analytics/ContractsDashboard';
import { Route } from 'react-router-dom';
import { FileCheck } from 'lucide-react';

// Menu groups are now defined in SidebarFixed.tsx to ensure consistency
// This module provides routes for commercial pages (Propostas remain accessible by route,
// but sidebar menu items were moved to base menu). We expose the new 'Contratos' route here.
const menuGroups = [
  {
    title: 'COMERCIAL',
    items: [
      { label: 'Contratos', url: '/analytics/contratos', icon: FileCheck, permissionKey: 'crm' },
    ],
  },
];

const routes = (
  <>
    <Route path="/propostas" element={<PropostasPage />} />
    <Route path="/propostas/nova" element={<PropostasFormPage />} />
    <Route path="/propostas/:id" element={<PropostasFormPage />} />
    <Route path="/analytics/contratos" element={<ContractsDashboard />} />
  </>
);

export default {
  key: 'comercial',
  name: 'Comercial',
  defaultEnabled: true,
  menuGroups,
  routes,
};
