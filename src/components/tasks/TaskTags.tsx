
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X } from 'lucide-react';

interface TaskTagsProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  readOnly?: boolean;
}

const TaskTags: React.FC<TaskTagsProps> = ({ tags, onTagsChange, readOnly = false }) => {
  const [newTag, setNewTag] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onTagsChange([...tags, newTag.trim()]);
      setNewTag('');
      setIsOpen(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    }
  };

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {tags.map((tag, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="flex items-center gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
        >
          {tag}
          {!readOnly && (
            <button
              onClick={() => handleRemoveTag(tag)}
              className="ml-1 text-blue-600 hover:text-blue-800"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </Badge>
      ))}
      
      {!readOnly && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Plus className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-2">
              <Input
                placeholder="Nome da tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
              />
              <div className="flex gap-2">
                <Button onClick={handleAddTag} size="sm">
                  Adicionar
                </Button>
                <Button onClick={() => setIsOpen(false)} variant="outline" size="sm">
                  Cancelar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default TaskTags;
