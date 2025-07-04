
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Edit, Trash2 } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  tasksCount: number;
}

interface TeamMemberCardProps {
  member: TeamMember;
  onEdit: (member: TeamMember) => void;
  onDelete: (memberId: string) => void;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ member, onEdit, onDelete }) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
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
                onClick={() => onEdit(member)}
                className="hover:bg-blue-50"
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(member.id)}
                className="hover:bg-red-50 hover:text-red-600"
                disabled={member.tasksCount > 0}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
          {member.tasksCount > 0 && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              Não é possível excluir: possui tarefas atribuídas
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamMemberCard;
