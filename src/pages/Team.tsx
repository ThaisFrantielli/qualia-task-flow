
import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { User, Mail, Plus, Edit, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  tasksCount: number;
}

const Team = () => {
  const { tasks } = useTasks();
  const { toast } = useToast();
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'Desenvolvedor' });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Initialize team members from tasks
  React.useEffect(() => {
    const members: TeamMember[] = Array.from(
      new Set(tasks.map(task => task.assignee_name).filter(Boolean))
    ).map((name, index) => ({
      id: `member-${index}`,
      name: name!,
      email: `${name!.toLowerCase().replace(/\s+/g, '.')}@company.com`,
      role: index === 0 ? 'Team Lead' : index === 1 ? 'Senior Developer' : 'Desenvolvedor',
      tasksCount: tasks.filter(task => task.assignee_name === name).length
    }));
    setTeamMembers(members);
  }, [tasks]);

  const handleAddMember = () => {
    if (!newMember.name.trim() || !newMember.email.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome e email são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    const newTeamMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: newMember.name,
      email: newMember.email,
      role: newMember.role,
      tasksCount: 0
    };

    setTeamMembers([...teamMembers, newTeamMember]);
    setNewMember({ name: '', email: '', role: 'Desenvolvedor' });
    setIsAddMemberOpen(false);
    
    toast({
      title: 'Sucesso!',
      description: 'Membro adicionado à equipe.',
    });
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setNewMember({ name: member.name, email: member.email, role: member.role });
  };

  const handleUpdateMember = () => {
    if (!editingMember) return;
    
    if (!newMember.name.trim() || !newMember.email.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome e email são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    const updatedMembers = teamMembers.map(member =>
      member.id === editingMember.id
        ? { ...member, name: newMember.name, email: newMember.email, role: newMember.role }
        : member
    );

    setTeamMembers(updatedMembers);
    setEditingMember(null);
    setNewMember({ name: '', email: '', role: 'Desenvolvedor' });
    
    toast({
      title: 'Sucesso!',
      description: 'Membro atualizado com sucesso.',
    });
  };

  const handleDeleteMember = (memberId: string) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;

    if (member.tasksCount > 0) {
      toast({
        title: 'Não é possível excluir',
        description: 'Este membro possui tarefas atribuídas. Reatribua as tarefas antes de excluir.',
        variant: 'destructive',
      });
      return;
    }

    const updatedMembers = teamMembers.filter(member => member.id !== memberId);
    setTeamMembers(updatedMembers);
    
    toast({
      title: 'Sucesso!',
      description: 'Membro removido da equipe.',
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Equipe</h1>
          <p className="text-gray-600">Gerencie os membros da sua equipe e suas atribuições</p>
        </div>
        <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Adicionar Membro</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Membro</DialogTitle>
              <DialogDescription>
                Adicione um novo membro à sua equipe
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  placeholder="email@empresa.com"
                />
              </div>
              <div>
                <Label htmlFor="role">Função</Label>
                <select
                  id="role"
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="Desenvolvedor">Desenvolvedor</option>
                  <option value="Senior Developer">Senior Developer</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Designer">Designer</option>
                  <option value="QA">QA</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddMember}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">Membros ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
            <p className="text-xs text-muted-foreground">Tarefas atribuídas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Membro</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.length > 0 ? Math.round(tasks.length / teamMembers.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Tarefas por membro</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members List */}
      <div className="bg-white rounded-xl shadow-quality p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Membros da Equipe</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map((member) => (
            <Card key={member.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-base">{member.name}</CardTitle>
                    <CardDescription>{member.role}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {member.email}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {member.tasksCount} tarefas atribuídas
                    </span>
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditMember(member)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMember(member.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {teamMembers.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum membro encontrado</h3>
            <p className="text-gray-500">Adicione membros à sua equipe para começar.</p>
          </div>
        )}
      </div>

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
            <DialogDescription>
              Atualize as informações do membro da equipe
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                placeholder="email@empresa.com"
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Função</Label>
              <select
                id="edit-role"
                value={newMember.role}
                onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="Desenvolvedor">Desenvolvedor</option>
                <option value="Senior Developer">Senior Developer</option>
                <option value="Team Lead">Team Lead</option>
                <option value="Designer">Designer</option>
                <option value="QA">QA</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateMember}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Team;
