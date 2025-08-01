// src/components/team/TeamMemberDialog.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TeamMember } from '@/pages/Team'; // Importar tipos da página

// --- A CORREÇÃO FINAL ESTÁ AQUI ---
interface TeamMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  // O formData agora espera um objeto com chaves que podem ser strings
  formData: {
    name: string;
    email: string;
    funcao: string;
    nivelAcesso: TeamMember['nivelAcesso'];
    [key: string]: any; // Permite outras chaves, como 'permissoes'
  };
  // A função onFormChange agora aceita 'field' como uma string genérica
  onFormChange: (field: string, value: any) => void;
  onSubmit: () => void;
  isEditing: boolean;
}

const TeamMemberDialog: React.FC<TeamMemberDialogProps> = ({
  isOpen,
  onClose,
  formData,
  onFormChange,
  onSubmit,
  isEditing
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Membro' : 'Adicionar Novo Membro'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações do membro' : 'Adicione um novo membro à equipe'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Nome Completo</Label>
            <Input id="name" value={formData.name} onChange={(e) => onFormChange('name', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formData.email} readOnly={isEditing} disabled={isEditing} className={isEditing ? 'cursor-not-allowed' : ''} />
          </div>
          <div>
            <Label htmlFor="funcao">Função</Label>
            <Input id="funcao" value={formData.funcao} onChange={(e) => onFormChange('funcao', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="nivelAcesso">Nível de Acesso</Label>
            <select
              id="nivelAcesso"
              value={formData.nivelAcesso}
              onChange={(e) => onFormChange('nivelAcesso', e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md"
            >
              <option value="Usuário">Usuário</option>
              <option value="Supervisão">Supervisão</option>
              <option value="Gestão">Gestão</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit}>
            {isEditing ? 'Salvar Alterações' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeamMemberDialog;