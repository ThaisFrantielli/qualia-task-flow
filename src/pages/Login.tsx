// src/pages/Login.tsx ou LoginPage.tsx

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

// --- 1. Importar os componentes do Dialog ---
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // --- 2. Estados para o modal de recuperação de senha ---
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    console.log('Tentando login com:', { email, passwordLength: password.length });
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('Erro de login:', error);
      toast.error('Erro ao fazer login', { 
        description: error.message || 'Verifique suas credenciais e tente novamente.' 
      });
    } else {
      console.log('Login bem-sucedido:', data);
      toast.success('Login realizado com sucesso!');
      navigate('/');
    }
    setLoading(false);
  };

  // --- 3. Função para lidar com a recuperação de senha ---
  const handlePasswordRecovery = async () => {
    if (!recoveryEmail) {
      toast.error("Por favor, insira seu email.");
      return;
    }
    setIsSending(true);
    
    // É CRUCIAL informar ao Supabase para onde redirecionar o usuário
    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error('Erro ao enviar email', { description: error.message });
    } else {
      toast.success('Email de recuperação enviado!', { description: 'Verifique sua caixa de entrada para continuar.' });
      setIsDialogOpen(false); // Fecha o modal
    }
    setIsSending(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Acesse sua Conta</CardTitle>
          <CardDescription>Bem-vindo de volta! Faça login para continuar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {/* --- 4. Adicionar o link "Esqueci minha senha" --- */}
            <div className="text-right text-sm">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <button type="button" className="text-primary hover:underline">
                            Esqueci minha senha
                        </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Recuperar Senha</DialogTitle>
                            <DialogDescription>
                                Digite seu email para receber um link de recuperação.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-2">
                            <Label htmlFor="recovery-email">Email</Label>
                            <Input
                                id="recovery-email"
                                type="email"
                                value={recoveryEmail}
                                onChange={(e) => setRecoveryEmail(e.target.value)}
                                placeholder="seu.email@exemplo.com"
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancelar</Button>
                            </DialogClose>
                            <Button onClick={handlePasswordRecovery} disabled={isSending}>
                                {isSending ? 'Enviando...' : 'Enviar Link'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Não tem uma conta?{' '}
            <Link to="/signup" className="text-primary hover:underline">
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;