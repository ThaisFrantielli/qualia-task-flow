import React from 'react';
import { Module } from '@/hooks/useModules';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import * as Icons from 'lucide-react';
interface ModuleCardProps {
  module: Module;
  onEdit: (module: Module) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, is_active: boolean) => void;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ module, onEdit, onDelete, onToggleActive }) => {
  // Pega o ícone dinamicamente
  const IconComponent = (Icons as any)[module.icon] || Icons.Box;

  return (
    <Card className={!module.is_active ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <IconComponent className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{module.name}</h3>
              <p className="text-xs text-muted-foreground">{module.key}</p>
            </div>
          </div>
          <Badge variant={module.is_active ? 'default' : 'secondary'}>
            {module.is_active ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">{module.description || 'Sem descrição'}</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Rota:</span> {module.route}
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Ordem:</span> {module.display_order}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm">Ativo</span>
            <Switch
              checked={module.is_active}
              onCheckedChange={(checked) => onToggleActive(module.id, checked)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(module)}
            >
              <Icons.Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(module.id)}
            >
              <Icons.Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModuleCard;
