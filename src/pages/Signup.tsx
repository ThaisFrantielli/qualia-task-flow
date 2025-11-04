// src/pages/Signup.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // Campo extra para o nome
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          // Passamos os dados extras aqui, que serão usados pelo nosso trigger no Supabase
          data: {
            full_name: fullName,
            avatar_url: '' // Opcional: pode adicionar uma URL de avatar padrão
          }
        }
      });

      if (error) throw error;
      
      setSuccess(true);

    } catch (error: any) {
      setError(error.message || 'Ocorreu um erro ao criar a conta.');
      console.error('Erro no cadastro:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Se o cadastro foi bem-sucedido, mostra uma mensagem de confirmação
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Verifique seu Email</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Enviamos um link de confirmação para o seu email. Por favor, clique no link para ativar sua conta.</p>
            <Button onClick={() => navigate('/login')} className="mt-4">
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Crie sua Conta</CardTitle>
          <CardDescription>É rápido e fácil. Vamos começar!</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input id="fullName" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Já tem uma conta?{' '}
            <Link to="/login" className="underline">
              Faça login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignupPage;