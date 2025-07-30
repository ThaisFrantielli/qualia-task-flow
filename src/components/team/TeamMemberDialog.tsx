import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox'; // Importar Checkbox
import { TeamMember, Permissoes } from '@/pages/Team'; // Importar tipos de Team.tsx

interface TeamMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  formData: {
    name: string;
    email: string;
    funcao: string;
    nivelAcesso: TeamMember['nivelAcesso'];
    permissoes: Permissoes;
  };
  onFormChange: (field: string, value: any) => void;
  onSubmit: () => void;
  isEditing: boolean;
}

// Módulos disponíveis na aplicação
const modulos = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'kanban', label: 'Quadro Kanban' },
  { id: 'tasks', label: 'Lista de Tarefas' },
  { id: 'projects', label: 'Projetos' },
  { id: 'team', label: 'Gerenciar Equipe' },
  { id: 'settings', label: 'Configurações' },
];

const TeamMemberDialog: React.FC<TeamMemberDialogProps> = ({
  isOpen,
  onClose,
  formData,
  onFormChange,
  onSubmit,
  isEditing
}) => {
  const handlePermissionChange = (moduleId: keyof Permissoes, checked: boolean) => {
    const updatedPermissions = { ...formData.permissoes, [moduleId]: checked };
    onFormChange('permissoes', updatedPermissions);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Membro' : 'Adicionar Novo Membro'}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes e defina o nível de acesso e as permissões do membro.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nome</Label>
            <Input id="name" value={formData.name} onChange={(e) => onFormChange('name', e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => onFormChange('email', e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="funcao" className="text-right">Função</Label>
            <Input id="funcao" value={formData.funcao} onChange={(e) => onFormChange('funcao', e.target.value)} className="col-span-3" placeholder="Ex: Desenvolvedor Frontend" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nivelAcesso" className="text-right">Nível de Acesso</Label>
            <select
              id="nivelAcesso"
              value={formData.nivelAcesso}
              onChange={(e) => onFormChange('nivelAcesso', e.target.value)}
              className="col-span-3 w-full px-3 py-2 border border-input rounded-md"
            >
              <option value="Usuário">Usuário</option>
              <option value="Supervisão">Supervisão</option>
              <option value="Gestão">Gestão</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          
          {/* Checkboxes de Permissão */}
          <div className="grid grid-cols-4 items-start gap-4 pt-2">
            <Label className="text-right pt-2">Permissões</Label>
            <div className="col-span-3 grid grid-cols-2 gap-x-4 gap-y-2">
              {modulos.map((modulo) => (
                <div key={modulo.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={modulo.id}
                    checked={formData.permissoes[modulo.id as keyof Permissoes]}
                    onCheckedChange={(checked) => handlePermissionChange(modulo.id as keyof Permissoes, !!checked)}
                  />
                  <label htmlFor={modulo.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {modulo.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit}>{isEditing ? 'Salvar Alterações' : 'Adicionar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeamMemberDialog;