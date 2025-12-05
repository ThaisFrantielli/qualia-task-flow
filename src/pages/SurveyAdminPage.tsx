import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, Send, List, AlertTriangle, Settings } from 'lucide-react';
import { SurveyDashboard } from '@/components/surveys/SurveyDashboard';
import { SurveysList } from '@/components/surveys/SurveysList';
import { DetractorAlerts } from '@/components/surveys/DetractorAlerts';
import SurveyGeneratorForm from '@/components/surveys/SurveyGeneratorForm';
import { SurveyCampaignsConfig } from '@/components/surveys/SurveyCampaignsConfig';

interface AppUserWithPermissions {
  permissoes?: {
    is_admin?: boolean;
    [key: string]: any;
  };
  isAdmin?: boolean;
  [key: string]: any;
}

const SurveyAdminPage = () => {
  const { user } = useAuth() as { user: AppUserWithPermissions | null };
  const [activeTab, setActiveTab] = useState('dashboard');

  const isAdmin = !!user?.isAdmin || !!user?.permissoes?.is_admin;

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">Sistema de Satisfação</h1>
        <p className="text-muted-foreground">Gerencie pesquisas CSAT/NPS e acompanhe a satisfação dos clientes.</p>
      </header>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart2 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="generate" className="gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Enviar</span>
          </TabsTrigger>
          <TabsTrigger value="surveys" className="gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Pesquisas</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Alertas</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <SurveyDashboard />
        </TabsContent>

        <TabsContent value="generate" className="mt-6">
          <div className="max-w-2xl">
            <SurveyGeneratorForm onSuccess={() => setActiveTab('surveys')} />
          </div>
        </TabsContent>

        <TabsContent value="surveys" className="mt-6">
          <SurveysList isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <DetractorAlerts />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <SurveyCampaignsConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SurveyAdminPage;
