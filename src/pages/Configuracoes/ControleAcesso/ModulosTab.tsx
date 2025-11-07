import React, { useState } from 'react';
import { useModules, Module } from '@/hooks/useModules';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import ModuleCard from './components/ModuleCard';
import ModuleFormDialog from './components/ModuleFormDialog';
import ModuleCreateDialog from './components/ModuleCreateDialog';

const ModulosTab: React.FC = () => {
  const { modules, isLoading, createModule, updateModule, deleteModule, toggleModuleActive } = useModules();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCustomCreateDialogOpen, setIsCustomCreateDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  const handleCreate = (data: Omit<Module, 'id' | 'created_at' | 'updated_at'>) => {
    createModule(data);
    setIsCreateDialogOpen(false);
  };

  // Novo handler para criar módulo com páginas selecionadas
  const handleCustomCreate = (data: any) => {
    // Aqui você pode integrar para salvar as páginas vinculadas ao módulo
    // Exemplo: createModule({ ...data, ...outrasPropriedades })
    createModule({
      name: data.name,
      key: data.key,
      description: data.description,
      icon: data.icon,
      display_order: data.display_order,
      route: data.route,
      pages: data.pages || [], // persiste as páginas selecionadas
    });
    setIsCustomCreateDialogOpen(false);
    // Adicione lógica para persistir vinculação das páginas se necessário
    console.log('Módulo criado com páginas:', data.pages);
  };

  const handleUpdate = (data: Partial<Module> & { id: string }) => {
    updateModule(data);
    setEditingModule(null);
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
          <h2 className="text-xl font-semibold">Módulos do Sistema</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os módulos disponíveis no sistema
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Módulo Simples
        </Button>
        <Button variant="outline" onClick={() => setIsCustomCreateDialogOpen(true)} className="ml-2">
          <Plus className="mr-2 h-4 w-4" />
          Novo Módulo com Páginas
        </Button>
      {/* Novo Dialog para criar módulo com seleção de páginas */}
      <ModuleCreateDialog
        open={isCustomCreateDialogOpen}
        onClose={() => setIsCustomCreateDialogOpen(false)}
        onCreate={handleCustomCreate}
      />
      </div>

      {/* Grid de módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            onEdit={setEditingModule}
            onDelete={(id) => {
              if (confirm('Tem certeza que deseja excluir este módulo?')) {
                deleteModule(id);
              }
            }}
            onToggleActive={(id, is_active) => toggleModuleActive({ id, is_active })}
          />
        ))}
      </div>

      {modules.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Nenhum módulo cadastrado</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar Primeiro Módulo
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <ModuleFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        title="Novo Módulo"
      />

      {editingModule && (
        <ModuleFormDialog
          open={!!editingModule}
          onOpenChange={(open) => !open && setEditingModule(null)}
          onSubmit={handleUpdate}
          initialData={editingModule}
          title="Editar Módulo"
        />
      )}
    </div>
  );
};

export default ModulosTab;
