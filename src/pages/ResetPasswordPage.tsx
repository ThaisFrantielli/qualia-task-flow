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
  const [status, setStatus] = useState<'verifying' | 'ready' | 'invalid'>('verifying');

  useEffect(() => {
    let cancelled = false;

    // Check if we have a recovery token in the URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');

    // If the URL has type=recovery with an access token, Supabase will process it
    // We listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setStatus('ready');
      }
    });

    // Also check current session - if user arrived via recovery link,
    // Supabase auto-processes the token and creates a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session && (type === 'recovery' || accessToken)) {
        setStatus('ready');
      }
    });

    // Fallback: if after 4 seconds we still don't have a valid session, mark as invalid
    const timer = setTimeout(() => {
      if (!cancelled && status === 'verifying') {
        // One final check
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!cancelled) {
            setStatus(session ? 'ready' : 'invalid');
          }
        });
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error('Erro ao redefinir a senha', { description: error.message });
    } else {
      toast.success('Senha redefinida com sucesso!', {
        description: 'Você será redirecionado para a página de login.',
      });
      await supabase.auth.signOut();
      setTimeout(() => navigate('/login'), 2000);
    }
    setLoading(false);
  };

  if (status === 'verifying') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando link de recuperação...</p>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
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
