import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import type { TeamMember, Permissoes } from '@/types/team';

import { useUsersContext } from '@/contexts/UsersContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TeamMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  formData: {
    name: string;
    email: string;
    funcao: string;
    nivelAcesso: TeamMember['nivelAcesso'];
    supervisor_id?: string | null;
    permissoes: Permissoes;
  };
  onFormChange: (field: string, value: any) => void;
  onSubmit: () => void;
  isEditing: boolean;
}

const permissionLabels: { key: keyof Permissoes; label: string; description: string }[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Visão geral.' },
  { key: 'kanban', label: 'Kanban', description: 'Quadro Kanban.' },
  { key: 'tasks', label: 'Lista de Tarefas', description: 'Acesso às tarefas.' },
  { key: 'crm', label: 'Módulo CRM', description: 'Pós-Vendas e dashboard.' },
  { key: 'projects', label: 'Gerenciar Projetos', description: 'Criar e editar projetos.' },
  { key: 'team', label: 'Gerenciar Equipe', description: 'Gerenciar membros.' },
  { key: 'settings', label: 'Configurações', description: 'Ajustes gerais.' },
];

const TeamMemberDialog: React.FC<TeamMemberDialogProps> = ({
  isOpen,
  onClose,
  member,
  formData,
  onFormChange,
  onSubmit,
  isEditing,
}) => {
  const { users } = useUsersContext();
  const [teamMembersSelected, setTeamMembersSelected] = useState<string[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const handlePermissionChange = (permissionKey: keyof Permissoes, checked: boolean) => {
    const updatedPermissions = { ...formData.permissoes, [permissionKey]: checked };
    onFormChange('permissoes', updatedPermissions);
  };

  useEffect(() => {
    let mounted = true;
    async function loadTeam() {
      setLoadingTeam(true);
      setTeamMembersSelected([]);
      if (!member) { setLoadingTeam(false); return; }

      const { data: uhData, error: uhError } = await supabase
        .from('user_hierarchy')
        .select('user_id')
        .eq('supervisor_id', member.id);

      if (!mounted) return;
      if (!uhError && Array.isArray(uhData)) {
        setTeamMembersSelected((uhData as any[]).map((r) => String(r.user_id)));
      } else {
        setTeamMembersSelected([]);
      }
      setLoadingTeam(false);
    }
    loadTeam();
    return () => { mounted = false; };
  }, [member]);

  const handleToggleTeamMember = (userId: string) => {
    setTeamMembersSelected(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleSave = async () => {
    if (!member) return;
    try {
      setLoadingTeam(true);

      const { data: existingUH, error: existingError } = await supabase
        .from('user_hierarchy')
        .select('user_id')
        .eq('supervisor_id', member.id);

      const existing = (!existingError && Array.isArray(existingUH)) ? (existingUH as any[]).map(r => String(r.user_id)) : [];
      const toAdd = teamMembersSelected.filter(id => !existing.includes(id));
      const toRemove = existing.filter(id => !teamMembersSelected.includes(id));

      if (toAdd.length > 0) {
        const { error: delErr } = await supabase.from('user_hierarchy').delete().in('user_id', toAdd);
        if (delErr) throw delErr;
        const inserts = toAdd.map(uId => ({ user_id: uId, supervisor_id: member.id }));
        const { error: insertErr } = await supabase.from('user_hierarchy').insert(inserts);
        if (insertErr) throw insertErr;
      }

      if (toRemove.length > 0) {
        const { error: deleteErr } = await supabase
          .from('user_hierarchy')
          .delete()
          .eq('supervisor_id', member.id)
          .in('user_id', toRemove);
        if (deleteErr) throw deleteErr;
      }

      await onSubmit();
      toast.success('Alterações salvas com sucesso!');
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar equipe/supervisor:', err?.message || err);
      toast.error('Erro ao salvar equipe do supervisor', { description: err?.message });
    } finally {
      setLoadingTeam(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] md:w-[50vw] max-w-[900px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Membro' : 'Adicionar Novo Membro'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações e permissões do membro.' : 'Preencha os dados do novo membro.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome Completo</Label>
              <Input id="name" value={formData.name} onChange={(e) => onFormChange('name', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} readOnly={isEditing} disabled={isEditing} className={isEditing ? 'cursor-not-allowed bg-muted' : ''} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="funcao">Função</Label>
                <Input id="funcao" value={formData.funcao} onChange={(e) => onFormChange('funcao', e.target.value)} placeholder="Ex: Desenvolvedor" />
              </div>
              <div>
                <Label htmlFor="nivelAcesso">Nível de Acesso</Label>
                <select
                  id="nivelAcesso"
                  value={formData.nivelAcesso}
                  onChange={(e) => onFormChange('nivelAcesso', e.target.value as TeamMember['nivelAcesso'])}
                  className="w-full mt-1 block px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="Usuário">Usuário</option>
                  <option value="Supervisão">Supervisão</option>
                  <option value="Gestão">Gestão</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="supervisor">Supervisor</Label>
              <Select
                value={formData.supervisor_id ?? 'none'}
                onValueChange={(v) => onFormChange('supervisor_id', v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id} disabled={member?.id === u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {member && <p className="text-xs text-muted-foreground mt-1">Você não pode selecionar o próprio usuário como supervisor.</p>}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-md font-medium">Permissões Detalhadas</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-md border p-4">
              {permissionLabels.map(({ key, label, description }) => (
                <div key={key} className="flex items-start space-x-2">
                  <Checkbox
                    id={key}
                    checked={formData.permissoes[key] || false}
                    onCheckedChange={(checked) => handlePermissionChange(key, checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor={key} className="font-medium cursor-pointer">
                      {label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {member ? (
            <div className="space-y-4">
              <h3 className="text-md font-medium">Equipe de {formData.name || (member as any)?.name || member?.id}</h3>
              {loadingTeam ? (
                <div className="text-sm text-muted-foreground">Carregando membros...</div>
              ) : (
                <div className="grid gap-2 max-h-48 overflow-auto rounded-md border p-2">
                  {users.filter(u => u.id !== member.id).map(u => (
                    <label key={u.id} className="flex items-center space-x-2">
                      <Checkbox checked={teamMembersSelected.includes(u.id)} onCheckedChange={() => handleToggleTeamMember(u.id)} />
                      <div className="text-sm">{u.full_name || u.email}</div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loadingTeam}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loadingTeam}>
            {loadingTeam ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Adicionar Membro')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeamMemberDialog;