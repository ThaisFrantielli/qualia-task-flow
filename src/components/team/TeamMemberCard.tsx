import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Edit, Trash2, ShieldCheck } from 'lucide-react';
import { TeamMember } from '@/types/team';

interface TeamMemberCardProps {
  member: TeamMember;
  onEdit: (member: TeamMember) => void;
  onDelete: (memberId: string) => void;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ member, onEdit, onDelete }) => {
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <Card key={member.id} className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    <CardDescription>{member.funcao}</CardDescription>
                </div>
            </div>
             <div className="flex items-center space-x-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(member)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(member.id)} disabled={member.tasksCount > 0}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
         <div className="flex items-center text-sm text-muted-foreground">
            <Mail className="w-4 h-4 mr-2" />
            {member.email}
          </div>
         <div className="flex items-center text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-md">
            <ShieldCheck className="w-4 h-4 mr-2" />
            Nível de Acesso: {member.nivelAcesso}
          </div>
          <div className="text-sm text-muted-foreground">
            {member.tasksCount} tarefas atribuídas
          </div>
      </CardContent>
    </Card>
  );
};

export default TeamMemberCard;