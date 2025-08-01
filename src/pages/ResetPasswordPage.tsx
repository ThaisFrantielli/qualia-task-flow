// src/pages/ResetPasswordPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Novo estado para controlar a verificação do token
  const [status, setStatus] = useState<'verifying' | 'ready' | 'invalid'>('verifying');

  useEffect(() => {
    // Flag para evitar múltiplas execuções em Strict Mode
    let subscribed = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!subscribed) return;

      // Evento que acontece quando o Supabase processa o token de recuperação da URL
      if (event === 'PASSWORD_RECOVERY') {
        if (session) {
          // Token válido, o usuário tem uma sessão temporária para mudar a senha
          setStatus('ready');
        } else {
          // Token inválido ou expirado
          setStatus('invalid');
        }
      }
    });

    // O useEffect do React Strict Mode pode rodar duas vezes.
    // O Supabase só dispara o evento PASSWORD_RECOVERY uma vez.
    // Se o evento não for capturado, verificamos manualmente após um delay.
    const timer = setTimeout(() => {
        if (status === 'verifying') {
            // Se o evento não disparou, é provável que o link esteja inválido ou já foi usado.
            setStatus('invalid');
        }
    }, 2000); // Espera 2 segundos pelo evento

    return () => {
      subscribed = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [status]); // Adicionado 'status' como dependência

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    // Como o usuário já tem uma sessão temporária, só precisamos atualizar a senha
    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      toast.error('Erro ao redefinir a senha', { description: error.message });
    } else {
      toast.success('Senha redefinida com sucesso!', {
        description: 'Você será redirecionado para a página de login.',
      });
      // Desloga o usuário da sessão temporária antes de navegar
      await supabase.auth.signOut();
      setTimeout(() => navigate('/login'), 2000);
    }
    setLoading(false);
  };

  // --- RENDERIZAÇÃO CONDICIONAL COM BASE NO STATUS ---

  if (status === 'verifying') {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Verificando link de recuperação...</p>
            </div>
        </div>
    );
  }

  if (status === 'invalid') {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="text-2xl text-destructive">Link Inválido</CardTitle>
                    <CardDescription>O link de recuperação de senha é inválido, expirou ou já foi utilizado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => navigate('/login')}>Voltar para o Login</Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  // Se o status for 'ready', mostra o formulário
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Redefinir sua Senha</CardTitle>
          <CardDescription>Digite sua nova senha abaixo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirme a Nova Senha</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;