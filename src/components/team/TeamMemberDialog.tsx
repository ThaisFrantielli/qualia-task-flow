// src/components/team/TeamMemberDialog.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox'; // MUDANÇA: Importando Checkbox
import { Separator } from '@/components/ui/separator';
import type { TeamMember, Permissoes } from '@/pages/Team';

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

import { useUsersContext } from '@/contexts/UsersContext';

const TeamMemberDialog: React.FC<TeamMemberDialogProps> = ({
  isOpen,
  onClose,
  member,
  formData,
  onFormChange,
  onSubmit,
  isEditing
}) => {
  const { users } = useUsersContext();
  const handlePermissionChange = (permissionKey: keyof Permissoes, checked: boolean) => {
    const updatedPermissions = { ...formData.permissoes, [permissionKey]: checked };
    onFormChange('permissoes', updatedPermissions);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Membro' : 'Adicionar Novo Membro'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações e permissões do membro.' : 'Preencha os dados do novo membro.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* SEÇÃO DE INFORMAÇÕES PESSOAIS */}
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
          </div>
          
          <Separator />

          {/* --- SEÇÃO DE PERMISSÕES COM GRID E CHECKBOXES --- */}
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
          <div>
            <Separator />
            <h3 className="text-md font-medium">Supervisor</h3>
            <div className="mt-2">
              <Label htmlFor="supervisor">Supervisor</Label>
              <select
                id="supervisor"
                value={formData.supervisor_id || ''}
                onChange={(e) => onFormChange('supervisor_id', e.target.value || null)}
                className="w-full mt-1 block px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value="">Nenhum</option>
                {users.map(u => (
                  <option key={u.id} value={u.id} disabled={member?.id === u.id}>
                    {u.full_name || u.email}
                  </option>
                ))}
              </select>
              {member && <p className="text-xs text-muted-foreground mt-1">Você não pode selecionar o próprio usuário como supervisor.</p>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit}>
            {isEditing ? 'Salvar Alterações' : 'Adicionar Membro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeamMemberDialog;