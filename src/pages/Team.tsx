
import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { User, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import TeamMemberCard from '@/components/team/TeamMemberCard';
import TeamMemberDialog from '@/components/team/TeamMemberDialog';

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
  const [formData, setFormData] = useState({ name: '', email: '', role: 'Desenvolvedor' });
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

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', role: 'Desenvolvedor' });
  };

  const handleAddMember = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome e email são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    const newTeamMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      tasksCount: 0
    };

    setTeamMembers([...teamMembers, newTeamMember]);
    resetForm();
    setIsAddMemberOpen(false);
    
    toast({
      title: 'Sucesso!',
      description: 'Membro adicionado à equipe.',
    });
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({ name: member.name, email: member.email, role: member.role });
  };

  const handleUpdateMember = () => {
    if (!editingMember) return;
    
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome e email são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    const updatedMembers = teamMembers.map(member =>
      member.id === editingMember.id
        ? { ...member, name: formData.name, email: formData.email, role: formData.role }
        : member
    );

    setTeamMembers(updatedMembers);
    setEditingMember(null);
    resetForm();
    
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
            <TeamMemberCard
              key={member.id}
              member={member}
              onEdit={handleEditMember}
              onDelete={handleDeleteMember}
            />
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

      {/* Dialogs */}
      <TeamMemberDialog
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        member={null}
        formData={formData}
        onFormChange={handleFormChange}
        onSubmit={handleAddMember}
        isEditing={false}
      />

      <TeamMemberDialog
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        member={editingMember}
        formData={formData}
        onFormChange={handleFormChange}
        onSubmit={handleUpdateMember}
        isEditing={true}
      />
    </div>
  );
};

export default Team;
