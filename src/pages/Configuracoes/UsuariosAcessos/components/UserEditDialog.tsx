// Modal de Edição de Usuário - Baseado na imagem de referência
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { TeamMember, Permissoes } from '../UsuariosTab';

interface UserEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  formData: {
    name: string;
    email: string;
    funcao: string;
    nivelAcesso: TeamMember['nivelAcesso'];
    supervisor_id: string | null;
    permissoes: Permissoes;
  };
  onFormChange: (field: string, value: string | boolean | Permissoes | null) => void;
  onSubmit: () => void;
  teamMembers: TeamMember[];
}

const permissionLabels: Record<keyof Permissoes, { label: string; description: string }> = {
  dashboard: { label: 'Dashboard', description: 'Visão geral e estatísticas.' },
  kanban: { label: 'Kanban', description: 'Quadro Kanban de tarefas.' },
  tasks: { label: 'Lista de Tarefas', description: 'Acesso às tarefas.' },
  projects: { label: 'Gerenciar Projetos', description: 'Criar e editar projetos.' },
  crm: { label: 'Módulo CRM', description: 'Pós-Vendas e dashboard.' },
  team: { label: 'Gerenciar Equipe', description: 'Gerenciar membros e hierarquia.' },
  settings: { label: 'Configurações', description: 'Ajustes gerais do sistema.' },
  is_admin: { label: 'Administrador', description: 'Acesso total ao sistema.' },
};

const UserEditDialog = ({
  isOpen,
  onClose,
  member,
  formData,
  onFormChange,
  onSubmit,
  teamMembers,
}: UserEditDialogProps) => {
  if (!member) return null;

  const handlePermissionChange = (key: keyof Permissoes, checked: boolean) => {
    const newPermissions = { ...formData.permissoes, [key]: checked };
    onFormChange('permissoes', newPermissions);
  };

  // Filtrar supervisores potenciais (todos exceto o próprio usuário)
  const potentialSupervisors = teamMembers.filter(m => m.id !== member.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>{formData.email}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Nome e Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => onFormChange('name', e.target.value)}
                  placeholder="Nome do usuário"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="funcao">Função</Label>
                <Input
                  id="funcao"
                  value={formData.funcao}
                  onChange={(e) => onFormChange('funcao', e.target.value)}
                  placeholder="Ex: Desenvolvedor, Gerente..."
                />
              </div>
            </div>

            {/* Nível de Acesso */}
            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select
                value={formData.nivelAcesso}
                onValueChange={(value) => onFormChange('nivelAcesso', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Usuário">Usuário</SelectItem>
                  <SelectItem value="Supervisão">Supervisão</SelectItem>
                  <SelectItem value="Gestão">Gestão</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Supervisor */}
            <div className="space-y-2">
              <Label>Supervisor</Label>
              <Select
                value={formData.supervisor_id || 'none'}
                onValueChange={(value) => onFormChange('supervisor_id', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um supervisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {potentialSupervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.nivelAcesso})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Você não pode selecionar o próprio usuário como supervisor.
              </p>
            </div>

            <Separator />

            {/* Permissões Detalhadas */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Permissões Detalhadas</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
                {(Object.keys(permissionLabels) as (keyof Permissoes)[]).map((key) => {
                  if (key === 'is_admin') return null; // Não exibir is_admin aqui
                  const { label, description } = permissionLabels[key];
                  return (
                    <div
                      key={key}
                      className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => handlePermissionChange(key, !formData.permissoes[key])}
                    >
                      <Checkbox
                        id={key}
                        checked={!!formData.permissoes[key]}
                        onCheckedChange={(checked) => handlePermissionChange(key, !!checked)}
                      />
                      <div className="flex-1">
                        <label htmlFor={key} className="text-sm font-medium cursor-pointer">
                          {label}
                        </label>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserEditDialog;
