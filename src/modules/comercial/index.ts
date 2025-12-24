import PropostasPage from '@/pages/PropostasPage';
import PropostasFormPage from '@/pages/PropostasFormPage';
import CommercialDashboard from '@/pages/analytics/CommercialDashboard';
import { Route } from 'react-router-dom';
import React from 'react';
import { FileCheck, Target, FileText } from 'lucide-react';

const menuGroups = [
  {
    title: 'COMERCIAL',
    items: [
      { label: 'Propostas', url: '/propostas', icon: FileCheck },
      { label: 'Pipeline', url: '/analytics/comercial', icon: Target },
      { label: 'Contratos', url: '/analytics/contratos', icon: FileText },
    ],
  },
];

const routes = (
  <>
    <Route path="/propostas" element={<PropostasPage />} />
    <Route path="/propostas/nova" element={<PropostasFormPage />} />
    <Route path="/propostas/:id" element={<PropostasFormPage />} />
    <Route path="/analytics/comercial" element={<CommercialDashboard />} />
  </>
);

export default {
  key: 'comercial',
  name: 'Comercial',
  defaultEnabled: true,
  menuGroups,
  routes,
};
