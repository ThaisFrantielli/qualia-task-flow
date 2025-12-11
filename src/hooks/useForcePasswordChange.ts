import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para verificar se o usuário precisa trocar a senha
 * e redirecioná-lo para a página de troca obrigatória
 */
export function useForcePasswordChange() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Não fazer nada se ainda estiver carregando
    if (loading) return;

    // Não fazer nada se não houver usuário
    if (!user) return;

    // Não redirecionar se já estiver na página de troca de senha
    if (location.pathname === '/force-password-change') return;

    // Se o perfil exigir troca de senha, redirecionar
    if (user.force_password_change === true) {
      console.log('Redirecionando para troca obrigatória de senha');
      navigate('/force-password-change', { replace: true });
    }
  }, [user, loading, navigate, location.pathname]);

  return {
    needsPasswordChange: user?.force_password_change === true,
    isLoading: loading,
  };
}
