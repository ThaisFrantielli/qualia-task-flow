
import React, { useState } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Globe, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

const Settings = () => {
  const [profile, setProfile] = useState({
    name: 'Usuário Admin',
    email: 'admin@quality.com',
    company: 'Quality Tech',
    timezone: 'America/Sao_Paulo'
  });

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

  const handleSaveProfile = () => {
    // In a real app, this would save to the database
    toast({
      title: "Perfil atualizado",
      description: "Suas informações de perfil foram salvas com sucesso.",
    });
  };

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
                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={profile.company}
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <select
                    id="timezone"
                    value={profile.timezone}
                    onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
                <Button onClick={handleSaveProfile}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Perfil
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
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
                  />
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Notificações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
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
                  />
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSaveAppearance}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Aparência
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
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
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-lg font-medium">Alterar Senha</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currentPassword">Senha Atual</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                </div>
                <Button variant="outline">
                  Alterar Senha
                </Button>
              </div>

              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSaveSecurity}>
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
