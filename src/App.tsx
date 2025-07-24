import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importe suas páginas
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import Tasks from './pages/Tasks';
import Projects from './pages/Projects';
// ... importe todas as suas páginas
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import NotFound from './pages/NotFound';
import SettingsPage from './pages/Settings'; // <-- Importe o componente Settings
import NotificationsPage from './pages/Notifications'; // <-- Importe a página de Notificações

// Importe o componente de rota protegida e seu layout principal
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout'; // Vamos criar este layout a seguir

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Rotas Protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/projects" element={<Projects />} />
            {/* Adicione a rota /settings aqui dentro das rotas protegidas */}
            <Route path="/settings" element={<SettingsPage />} /> {/* <-- Nova rota para Configurações */}
            {/* Adicione a rota /notifications aqui dentro das rotas protegidas */}
            <Route path="/notifications" element={<NotificationsPage />} /> {/* <-- Rota para Notificações */}
            {/* Adicione aqui todas as outras rotas que devem ser protegidas */}
          </Route>
        </Route>

        {/* Rota para páginas não encontradas */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
