
import React, { useState } from 'react';
import { useProjectChecklists } from '@/hooks/useProjectChecklists';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProjectChecklistProps {
  projectId: string;
}

const ProjectChecklist: React.FC<ProjectChecklistProps> = ({ projectId }) => {
  const { checklists, addChecklistItem, toggleChecklistItem, deleteChecklistItem } = useProjectChecklists(projectId);
  const [newItemTitle, setNewItemTitle] = useState('');

  const handleAddItem = async () => {
    if (newItemTitle.trim()) {
      await addChecklistItem(newItemTitle.trim());
      setNewItemTitle('');
    }
  };

  const completedCount = checklists.filter(item => item.completed).length;
  const progressPercentage = checklists.length > 0 ? (completedCount / checklists.length) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Checklist do Projeto</span>
          <span className="text-sm text-gray-500">
            {completedCount}/{checklists.length} concluídos
          </span>
        </CardTitle>
        {checklists.length > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Adicionar novo item..."
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
          />
          <Button onClick={handleAddItem} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          {checklists.map((item) => (
            <div key={item.id} className="flex items-center gap-2 p-2 border rounded">
              <Checkbox
                checked={item.completed}
                onCheckedChange={(checked) => toggleChecklistItem(item.id, checked as boolean)}
              />
              <span className={`flex-1 ${item.completed ? 'line-through text-gray-500' : ''}`}>
                {item.title}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteChecklistItem(item.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectChecklist;
