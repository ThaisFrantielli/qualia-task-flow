import React, { useState } from 'react';
import { useUsersContext } from '@/contexts/UsersContext';
import { useModules } from '@/hooks/useModules';
import { useUserModulesPermissions, useModulePermissions } from '@/hooks/useModulePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const UserPermissionMatrix: React.FC = () => {
  const { users } = useUsersContext();
  const { modules, isLoading: loadingModules } = useModules();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { data: userModules, isLoading: loadingPermissions } = useUserModulesPermissions(selectedUserId);
  const { assignModuleToUser, removeModuleFromUser } = useModulePermissions();
  
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Atualiza os módulos selecionados quando carrega as permissões do usuário
  React.useEffect(() => {
    if (userModules) {
      setSelectedModules(userModules.filter((id): id is string => id !== null));
      setHasChanges(false);
    }
  }, [userModules]);

  const handleToggleModule = (moduleId: string, checked: boolean) => {
    const newSelected = checked
      ? [...selectedModules, moduleId]
      : selectedModules.filter(id => id !== moduleId);
    
    setSelectedModules(newSelected);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!selectedUserId || !userModules) return;

    const filteredUserModules = userModules.filter((id): id is string => id !== null);

    // Módulos a adicionar
    const toAdd = selectedModules.filter(id => !filteredUserModules.includes(id));
    // Módulos a remover
    const toRemove = filteredUserModules.filter(id => !selectedModules.includes(id));

    toAdd.forEach(moduleId => {
      assignModuleToUser({ userId: selectedUserId, moduleId });
    });

    toRemove.forEach(moduleId => {
      removeModuleFromUser({ userId: selectedUserId, moduleId });
    });

    setHasChanges(false);
  };

  const isLoading = loadingModules || loadingPermissions;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissões Individuais</CardTitle>
        <p className="text-sm text-muted-foreground">
          Conceda permissões específicas que sobrescrevem as permissões de grupo
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alert Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            As permissões individuais têm prioridade sobre as permissões de grupo. 
            Use com moderação.
          </AlertDescription>
        </Alert>

        {/* Seletor de Usuário */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Selecione um Usuário</label>
          <Select
            value={selectedUserId || ''}
            onValueChange={setSelectedUserId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Escolha um usuário..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Matriz de Permissões */}
        {selectedUserId && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {modules.filter(m => m.is_active).map((module) => (
                    <div
                      key={module.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={module.id}
                          checked={selectedModules.includes(module.id)}
                          onCheckedChange={(checked) =>
                            handleToggleModule(module.id, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={module.id}
                          className="font-medium cursor-pointer"
                        >
                          {module.name}
                        </label>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {module.route}
                      </span>
                    </div>
                  ))}
                </div>

                {hasChanges && (
                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Permissões
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!selectedUserId && (
          <div className="text-center py-8 text-muted-foreground">
            Selecione um usuário para gerenciar suas permissões individuais
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserPermissionMatrix;
