import React, { useState } from 'react';
import { useGroups } from '@/hooks/useGroups';
import { useModules } from '@/hooks/useModules';
import { useGroupModules, useModulePermissions } from '@/hooks/useModulePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';

const GroupPermissionMatrix: React.FC = () => {
  const { groups, isLoading: loadingGroups } = useGroups();
  const { modules, isLoading: loadingModules } = useModules();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const { data: groupModules, isLoading: loadingPermissions } = useGroupModules(selectedGroupId);
  const { assignMultipleModulesToGroup } = useModulePermissions();
  
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  // Atualiza os módulos selecionados quando carrega as permissões do grupo
    React.useEffect(() => {
      if (groupModules) {
        setSelectedModules(groupModules.filter((id): id is string => id !== null));
      }
    }, [groupModules]);

  const handleToggleModule = (moduleId: string, checked: boolean) => {
    if (checked) {
      setSelectedModules([...selectedModules, moduleId]);
    } else {
      setSelectedModules(selectedModules.filter(id => id !== moduleId));
    }
  };

  const handleSave = () => {
    if (!selectedGroupId) return;
    assignMultipleModulesToGroup({
      groupId: selectedGroupId,
      moduleIds: selectedModules,
    });
  };

  const isLoading = loadingGroups || loadingModules || loadingPermissions;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissões por Grupo</CardTitle>
        <p className="text-sm text-muted-foreground">
          Selecione um grupo e defina quais módulos ele pode acessar
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seletor de Grupo */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Selecione um Grupo</label>
          <Select
            value={selectedGroupId || ''}
            onValueChange={setSelectedGroupId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Escolha um grupo..." />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Matriz de Permissões */}
        {selectedGroupId && (
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

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Permissões
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {!selectedGroupId && (
          <div className="text-center py-8 text-muted-foreground">
            Selecione um grupo para gerenciar suas permissões
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GroupPermissionMatrix;
