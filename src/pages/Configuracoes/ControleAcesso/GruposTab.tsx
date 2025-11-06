import React, { useState } from 'react';
import { useGroups, Group } from '@/hooks/useGroups';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import GroupCard from './components/GroupCard';
import GroupFormDialog from './components/GroupFormDialog';

const GruposTab: React.FC = () => {
  const { groups, isLoading, createGroup, updateGroup, deleteGroup } = useGroups();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const handleCreate = (data: Omit<Group, 'id' | 'created_at' | 'updated_at'>) => {
    createGroup(data);
    setIsCreateDialogOpen(false);
  };

  const handleUpdate = (data: Partial<Group> & { id: string }) => {
    updateGroup(data);
    setEditingGroup(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Grupos de Usuários</h2>
          <p className="text-sm text-muted-foreground">
            Organize usuários em grupos para facilitar o gerenciamento de permissões
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Grupo
        </Button>
      </div>

      {/* Grid de grupos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            onEdit={setEditingGroup}
            onDelete={(id) => {
              if (confirm('Tem certeza que deseja excluir este grupo?')) {
                deleteGroup(id);
              }
            }}
          />
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Nenhum grupo cadastrado</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar Primeiro Grupo
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <GroupFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        title="Novo Grupo"
      />

      {editingGroup && (
        <GroupFormDialog
          open={!!editingGroup}
          onOpenChange={(open) => !open && setEditingGroup(null)}
          onSubmit={handleUpdate}
          initialData={editingGroup}
          title="Editar Grupo"
        />
      )}
    </div>
  );
};

export default GruposTab;
