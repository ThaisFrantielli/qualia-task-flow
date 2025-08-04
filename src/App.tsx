// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';

// ... (todas as suas importações de páginas)
import SurveyGeneratorPage from './pages/SurveyGeneratorPage';
// ...

// Importe AMBOS os layouts
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import BlankLayout from './components/layout/BlankLayout'; // 1. Importe o novo layout

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* === ROTAS PÚBLICAS === */}
        {/* ... (suas rotas públicas) ... */}

        {/* === ROTAS PROTEGIDAS === */}
        <Route element={<ProtectedRoute />}>
          {/* 2. Rotas que USAM a Sidebar */}
          <Route element={<AppLayout />}> 
            <Route path="/" element={<Dashboard />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="/pos-vendas" element={<CrmPdvPage />} />
            <Route path="/pos-vendas/dashboard" element={<CrmDashboardPage />} />
            <Route path="/team" element={<Team />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          
          {/* 3. Rotas que NÃO USAM a Sidebar */}
          <Route element={<BlankLayout />}>
            <Route path="/pesquisas/gerador" element={<SurveyGeneratorPage />} />
          </Route>
        </Route>

        {/* ... */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;