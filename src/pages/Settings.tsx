// src/pages/Settings.tsx

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ClassificationManager from '@/components/settings/ClassificationManager';
import { PortfolioSettings } from '@/components/projects/PortfolioSettings';

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    funcao: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Estados para as outras abas (manter como estavam)
  const [notifications, setNotifications] = useState({ emailNotifications: true, pushNotifications: true });
  const [appearance, setAppearance] = useState({ theme: 'light', language: 'pt-BR' });
  const [security, setSecurity] = useState({ twoFactorAuth: false, loginNotifications: true });

  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name || '',
        email: user.email || '',
        funcao: user.funcao || '',
      });
    }
  }, [user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setProfile(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveProfile = async () => {
    if (!user) {
      toast.error("Nenhum usuário logado.");
      return;
    }

    setIsSavingProfile(true);
    try {
      // Atualiza os metadados no Supabase Auth (se full_name estiver lá)
      const { error: userError } = await supabase.auth.updateUser({
        data: { full_name: profile.full_name }
      });
      if (userError) throw userError;

      // Atualiza a tabela 'profiles'
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          funcao: profile.funcao
        })
        .eq('id', user.id);
      if (profileError) throw profileError;

      toast.success("Perfil atualizado com sucesso.");
    } catch (error: any) {
      toast.error("Erro ao salvar perfil", { description: error.message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (authLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando configurações...</p>
          </div>
        </div>
      );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações</h1>
        <p className="text-gray-600">Gerencie suas preferências e configurações da conta</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className={`grid w-full ${user?.nivelAcesso === 'Admin' ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          {user?.nivelAcesso === 'Admin' && (
            <TabsTrigger value="categories">Categorias</TabsTrigger>
          )}
          <TabsTrigger value="portfolios">Portfólios</TabsTrigger>
        </TabsList>

        {/* Aba de Perfil */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2"><User className="w-5 h-5" /><span>Informações do Perfil</span></CardTitle>
              <CardDescription>Atualize suas informações pessoais e de contato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input id="full_name" value={profile.full_name} onChange={handleProfileChange} disabled={isSavingProfile} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={profile.email} readOnly disabled className="cursor-not-allowed" />
                </div>
                <div>
                  <Label htmlFor="funcao">Função</Label>
                  <Input id="funcao" value={profile.funcao} onChange={handleProfileChange} disabled={isSavingProfile} />
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSavingProfile ? 'Salvando...' : 'Salvar Perfil'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Notificações */}
        <TabsContent value="notifications" className="space-y-6">
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2"><Bell className="w-5 h-5" /><span>Preferências de Notificação</span></CardTitle>
              <CardDescription>Configure como e quando você deseja receber notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center justify-between"><Label htmlFor="emailNotifications">Notificações por Email</Label><Switch id="emailNotifications" checked={notifications.emailNotifications} onCheckedChange={(c) => setNotifications(p => ({ ...p, emailNotifications: c }))} /></div>
               <div className="flex items-center justify-between"><Label htmlFor="pushNotifications">Notificações Push</Label><Switch id="pushNotifications" checked={notifications.pushNotifications} onCheckedChange={(c) => setNotifications(p => ({ ...p, pushNotifications: c }))} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Aparência */}
        <TabsContent value="appearance" className="space-y-6">
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2"><Palette className="w-5 h-5" /><span>Aparência e Idioma</span></CardTitle>
              <CardDescription>Personalize a aparência da interface</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="theme">Tema</Label><p className="text-sm text-muted-foreground">Em breve.</p></div>
              <div><Label htmlFor="language">Idioma</Label><p className="text-sm text-muted-foreground">Em breve.</p></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Segurança */}
        <TabsContent value="security" className="space-y-6">
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2"><Shield className="w-5 h-5" /><span>Segurança da Conta</span></CardTitle>
              <CardDescription>Gerencie as configurações de segurança da sua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between"><Label htmlFor="twoFactorAuth">Autenticação de Dois Fatores</Label><Switch id="twoFactorAuth" checked={security.twoFactorAuth} onCheckedChange={(c) => setSecurity(p => ({ ...p, twoFactorAuth: c }))} /></div>
              <div className="flex items-center justify-between"><Label htmlFor="loginNotifications">Notificações de Login</Label><Switch id="loginNotifications" checked={security.loginNotifications} onCheckedChange={(c) => setSecurity(p => ({ ...p, loginNotifications: c }))} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- NOVO CONTEÚDO DE ABA CONDICIONAL --- */}
        {user?.nivelAcesso === 'Admin' && (
          <TabsContent value="categories">
            <ClassificationManager />
          </TabsContent>
        )}
        <TabsContent value="portfolios">
          <PortfolioSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;