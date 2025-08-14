// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import TasksPage from './pages/Tasks';
import TaskDetailPage from './pages/TaskDetailPage';
import CreateTaskPage from './pages/CreateTaskPage';
import ProjectsPage from './pages/Projects';
import ProjectDetailPage from './pages/ProjectDetailPage';
import Team from './pages/Team';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import CrmPdvPage from './pages/CrmPdvPage';
import CrmDashboardPage from './pages/CrmDashboardPage';
import CreateAtendimentoPage from './pages/CreateAtendimentoPage';
import SurveyGeneratorPage from './pages/SurveyGeneratorPage';
import NotFound from './pages/NotFound';
// --- IMPORTAÇÃO DA NOVA PÁGINA ---
import TaskSettingsPage from '@/pages/TaskSettingsPage'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        {/* Rotas Protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/kanban" element={<Kanban />} />
            
            <Route path="/tasks">
              <Route index element={<TasksPage />} />
              <Route path="new" element={<CreateTaskPage />} />
              <Route path=":taskId" element={<TaskDetailPage />} />
            </Route>

            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
            
            <Route path="/pos-vendas">
              <Route index element={<CrmPdvPage />} />
              <Route path="dashboard" element={<CrmDashboardPage />} />
              <Route path="novo" element={<CreateAtendimentoPage />} />
            </Route>
            
            <Route path="/pesquisas" element={<SurveyGeneratorPage />} />

            <Route path="/team" element={<Team />} />
            <Route path="/notifications" element={<Notifications />} />
            
            {/* --- ROTAS DE CONFIGURAÇÕES ATUALIZADAS --- */}
            <Route path="/settings" element={<Settings />} /> 
            {/* Rota para a nova página de Configurações de Tarefas */}
            <Route path="/settings/tasks" element={<TaskSettingsPage />} />

          </Route>
        </Route>

        {/* Rota não encontrada */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;