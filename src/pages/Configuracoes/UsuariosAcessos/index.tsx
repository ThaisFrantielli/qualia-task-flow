// Central de Usuários e Acessos - Página unificada
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Network, Building2, Shield, BarChart3 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import UsuariosTab from './UsuariosTab';
import HierarquiaTab from './HierarquiaTab';
import DepartamentosTab from './DepartamentosTab';
import ModulosGruposTab from './ModulosGruposTab';
import AnalyticsPermissionsTab from './AnalyticsPermissionsTab';
import { supabase } from '@/integrations/supabase/client';

const UsuariosAcessosPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'usuarios';
  const [kpis, setKpis] = useState({ users: 0, groups: 0, modules: 0 });

  useEffect(() => {
    const fetchKpis = async () => {
      const [uRes, gRes, mRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('groups').select('*', { count: 'exact', head: true }),
        supabase.from('modules').select('*', { count: 'exact', head: true }).eq('is_active', true)
      ]);
      setKpis({
        users: uRes.count || 0,
        groups: gRes.count || 0,
        modules: mRes.count || 0
      });
    };
    fetchKpis();
  }, []);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Central de Usuários e Acessos</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie usuários, hierarquia, departamentos e permissões do sistema
            </p>
          </div>
        </div>
        
        <div className="hidden md:flex gap-4">
          <div className="bg-muted px-4 py-2 rounded-lg flex flex-col items-center justify-center">
            <span className="text-xl font-bold">{kpis.users}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Usuários</span>
          </div>
          <div className="bg-muted px-4 py-2 rounded-lg flex flex-col items-center justify-center">
            <span className="text-xl font-bold">{kpis.groups}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Grupos</span>
          </div>
          <div className="bg-muted px-4 py-2 rounded-lg flex flex-col items-center justify-center">
            <span className="text-xl font-bold">{kpis.modules}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Módulos</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="usuarios" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Usuários</span>
          </TabsTrigger>
          <TabsTrigger value="hierarquia" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            <span className="hidden sm:inline">Hierarquia</span>
          </TabsTrigger>
          <TabsTrigger value="departamentos" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Departamentos</span>
          </TabsTrigger>
          <TabsTrigger value="modulos" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Controle de Acesso</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Permissões Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-6">
          <UsuariosTab />
        </TabsContent>

        <TabsContent value="hierarquia" className="mt-6">
          <HierarquiaTab />
        </TabsContent>

        <TabsContent value="departamentos" className="mt-6">
          <DepartamentosTab />
        </TabsContent>

        <TabsContent value="modulos" className="mt-6">
          <ModulosGruposTab />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsPermissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UsuariosAcessosPage;
