// src/pages/Settings.tsx

import React, { useState, useEffect } from 'react'; // Importar useEffect
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Globe, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

import { useAuth } from '@/contexts/AuthContext'; // Importar o hook useAuth
import { supabase } from '@/integrations/supabase/client'; // Importar a instância do supabase

const Settings = () => {
  const { user } = useAuth(); // Obter o usuário logado
  const [profile, setProfile] = useState({
    name: '', // Começar vazio, será preenchido com dados do Supabase
    email: '', // Começar vazio
    company: '', // Pode não existir no Supabase Auth diretamente, talvez em uma tabela de perfis
    timezone: 'America/Sao_Paulo' // Manter valor padrão ou carregar de metadados/tabela
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false); // Estado para o botão de salvar perfil

  // --- Outros estados (notifications, appearance, security) permanecem os mesmos ---
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    taskReminders: true,
    weeklyReports: false,
    projectUpdates: true
  });

  const [appearance, setAppearance] = useState({
    theme: 'light',
    language: 'pt-BR',
    compactMode: false,
    showAvatars: true
  });

  const [security, setSecurity] = useState({
    twoFactorAuth: false,
    sessionTimeout: '30',
    loginNotifications: true
  });
  // --- Fim de outros estados ---


  // Efeito para carregar os dados do usuário logado ao montar o componente
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.user_metadata?.full_name || user.user_metadata?.name || '', // Tenta carregar o nome do metadados
        email: user.email || '', // Carrega email do objeto user
        company: profile.company, // Manter o valor atual ou carregar de outro lugar se aplicável
        timezone: profile.timezone // Manter o valor atual ou carregar de metadados/tabela
      });
      // TODO: Se houver uma tabela de perfis separada, carregar 'company' e 'timezone' daqui
    }
  }, [user]); // Executa sempre que o objeto user mudar

  // Função para lidar com a mudança no campo de nome
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, name: e.target.value });
  };


  const handleSaveProfile = async () => { // Tornar a função assíncrona
    if (!user) {
      toast({ title: "Erro", description: "Nenhum usuário logado.", variant: "destructive" });
      return;
    }

    setIsSavingProfile(true);
    try {
      // Atualiza o usuário no Supabase Auth
      const { data, error } = await supabase.auth.updateUser({
        data: { // Metadados personalizados vão dentro do objeto 'data'
          full_name: profile.name // Salva o nome completo no metadados
          // TODO: Se houver outros campos de perfil (empresa, fuso horário) na tabela de perfis, atualize-os aqui ou em outra função
        }
      });

      if (error) {
        throw error;
      }

      // Atualiza o estado do usuário no contexto de autenticação se necessário (useAuth deve lidar com isso)
      // if (data?.user) { /* O useAuth hook deve ouvir por mudanças ou você pode atualizar manualmente */ }


      toast({
        title: "Perfil atualizado",
        description: "Suas informações de perfil foram salvas com sucesso.",
      });

    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: "Erro ao salvar perfil",
        description: error.message || "Ocorreu um erro ao salvar suas informações de perfil.",
        variant: "destructive"
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- Outras funções handleSave... permanecem as mesmas ---
  const handleSaveNotifications = () => {
    toast({
      title: "Notificações atualizadas",
      description: "Suas preferências de notificação foram salvas.",
    });
  };

  const handleSaveAppearance = () => {
    toast({
      title: "Aparência atualizada",
      description: "Suas preferências de aparência foram salvas.",
    });
  };

  const handleSaveSecurity = () => {
    toast({
      title: "Segurança atualizada",
      description: "Suas configurações de segurança foram salvas.",
    });
  };
  // --- Fim de outras funções handleSave... ---


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações</h1>
        <p className="text-gray-600">Gerencie suas preferências e configurações da conta</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Informações do Perfil</span>
              </CardTitle>
              <CardDescription>
                Atualize suas informações pessoais e de contato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Campo Nome Completo agora usa o estado 'profile.name' real */}
                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={handleNameChange} // Usar a nova função de mudança
                    disabled={!user || isSavingProfile} // Desabilitar se não houver usuário logado ou estiver salvando
                  />
                </div>
                {/* Campo Email (geralmente não editável diretamente pelo usuário logado no Supabase Auth) */}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    readOnly // Tornar o email somente leitura, pois a mudança de email tem um fluxo diferente no Supabase Auth (confirmação por email)
                    disabled // Desabilitar também
                    className="cursor-not-allowed"
                  />
                </div>
                {/* Campo Empresa (Manter como está ou integrar com tabela de perfis) */}
                <div>
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={profile.company}
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                    disabled={!user || isSavingProfile}
                    // TODO: Gerenciar este campo se estiver em uma tabela de perfis separada
                  />
                </div>
                 {/* Campo Fuso Horário (Manter como está ou integrar com tabela de perfis) */}
                <div>
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <select
                    id="timezone"
                    value={profile.timezone}
                    onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={!user || isSavingProfile}
                    // TODO: Gerenciar este campo se estiver em uma tabela de perfis separada
                  >
                    <option value="America/Sao_Paulo">América/São Paulo</option>
                    <option value="America/New_York">América/Nova York</option>
                    <option value="Europe/London">Europa/Londres</option>
                    <option value="Asia/Tokyo">Ásia/Tóquio</option>
                  </select>
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={!user || isSavingProfile}> {/* Desabilitar se não houver usuário ou estiver salvando */}
                  <Save className="w-4 h-4 mr-2" />
                  {isSavingProfile ? 'Salvando...' : 'Salvar Perfil'} {/* Mostrar status de salvamento */}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* As outras abas (Notifications, Appearance, Security) permanecem as mesmas */}
        <TabsContent value="notifications" className="space-y-6">
           {/* ... Conteúdo da aba Notificações ... */}
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Preferências de Notificação</span>
              </CardTitle>
              <CardDescription>
                Configure como e quando você deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotifications">Notificações por Email</Label>
                    <p className="text-sm text-gray-500">Receba notificações importantes por email</p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailNotifications: checked })
                    }
                     disabled={!user}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="pushNotifications">Notificações Push</Label>
                    <p className="text-sm text-gray-500">Receba notificações no navegador</p>
                  </div>
                  <Switch
                    id="pushNotifications"
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, pushNotifications: checked })
                    }
                     disabled={!user}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="taskReminders">Lembretes de Tarefas</Label>
                    <p className="text-sm text-gray-500">Seja lembrado sobre tarefas próximas do vencimento</p>
                  </div>
                  <Switch
                    id="taskReminders"
                    checked={notifications.taskReminders}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, taskReminders: checked })
                    }
                     disabled={!user}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="weeklyReports">Relatórios Semanais</Label>
                    <p className="text-sm text-gray-500">Receba um resumo semanal do progresso</p>
                  </div>
                  <Switch
                    id="weeklyReports"
                    checked={notifications.weeklyReports}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, weeklyReports: checked })
                    }
                     disabled={!user}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="projectUpdates">Atualizações de Projetos</Label>
                    <p className="text-sm text-gray-500">Seja notificado sobre mudanças nos projetos</p>
                  </div>
                  <Switch
                    id="projectUpdates"
                    checked={notifications.projectUpdates}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, projectUpdates: checked })
                    }
                     disabled={!user}
                  />
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={!user}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Notificações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
           {/* ... Conteúdo da aba Aparência ... */}
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5" />
                <span>Aparência e Idioma</span>
              </CardTitle>
              <CardDescription>
                Personalize a aparência da interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="theme">Tema</Label>
                  <select
                    id="theme"
                    value={appearance.theme}
                    onChange={(e) => setAppearance({ ...appearance, theme: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                     disabled={!user}
                  >
                    <option value="light">Claro</option>
                    <option value="dark">Escuro</option>
                    <option value="auto">Automático</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="language">Idioma</Label>
                  <select
                    id="language"
                    value={appearance.language}
                    onChange={(e) => setAppearance({ ...appearance, language: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                     disabled={!user}
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="compactMode">Modo Compacto</Label>
                    <p className="text-sm text-gray-500">Interface mais compacta com menos espaçamento</p>
                  </div>
                  <Switch
                    id="compactMode"
                    checked={appearance.compactMode}
                    onCheckedChange={(checked) =>
                      setAppearance({ ...appearance, compactMode: checked })
                    }
                     disabled={!user}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="showAvatars">Mostrar Avatares</Label>
                    <p className="text-sm text-gray-500">Exibir avatares dos usuários nas tarefas</p>
                  </div>
                  <Switch
                    id="showAvatars"
                    checked={appearance.showAvatars}
                    onCheckedChange={(checked) =>
                      setAppearance({ ...appearance, showAvatars: checked })
                    }
                     disabled={!user}
                  />
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSaveAppearance} disabled={!user}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Aparência
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* ... Conteúdo da aba Segurança ... */}
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Segurança da Conta</span>
              </CardTitle>
              <CardDescription>
                Gerencie as configurações de segurança da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="twoFactorAuth">Autenticação de Dois Fatores</Label>
                    <p className="text-sm text-gray-500">Adicione uma camada extra de segurança</p>
                  </div>
                  <Switch
                    id="twoFactorAuth"
                    checked={security.twoFactorAuth}
                    onCheckedChange={(checked) =>
                      setSecurity({ ...security, twoFactorAuth: checked })
                    }
                     disabled={!user}
                  />
                </div>

                <div>
                  <Label htmlFor="sessionTimeout">Timeout de Sessão (minutos)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={security.sessionTimeout}
                    onChange={(e) => setSecurity({ ...security, sessionTimeout: e.target.value })}
                    className="mt-1"
                     disabled={!user}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Tempo para desconectar automaticamente por inatividade
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="loginNotifications">Notificações de Login</Label>
                    <p className="text-sm text-gray-500">Seja notificado sobre novos logins na sua conta</p>
                  </div>
                  <Switch
                    id="loginNotifications"
                    checked={security.loginNotifications}
                    onCheckedChange={(checked) =>
                      setSecurity({ ...security, loginNotifications: checked })
                    }
                     disabled={!user}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-lg font-medium">Alterar Senha</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currentPassword">Senha Atual</Label>
                    <Input id="currentPassword" type="password" disabled={!user} />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input id="newPassword" type="password" disabled={!user} />
                  </div>
                </div>
                <Button variant="outline" disabled={!user}>
                  Alterar Senha
                </Button>
              </div>

              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSaveSecurity} disabled={!user}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Segurança
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
