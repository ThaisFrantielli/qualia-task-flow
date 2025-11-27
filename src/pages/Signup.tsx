// src/pages/Signup.tsx
// Página desabilitada: cadastro público foi removido (sistema fechado).
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SignupPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona para a página de login e evita cadastro público
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Cadastro desabilitado</h2>
        <p className="text-sm text-muted-foreground mt-2">O registro público foi desativado. Contate um administrador para criar contas.</p>
      </div>
    </div>
  );
};

export default SignupPage;