import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProjectSections, ProjectSection } from '@/hooks/useProjectSections';
import { Plus, GripVertical, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SectionManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

export function SectionManager({ open, onOpenChange, projectId }: SectionManagerProps) {
  const { sections, isLoading, createSection, updateSection, deleteSection, reorderSections } = useProjectSections(projectId);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionColor, setNewSectionColor] = useState('#6366f1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newSectionName.trim()) {
      toast.error('Nome da seção é obrigatório');
      return;
    }
    setCreating(true);
    try {
      await createSection({ name: newSectionName.trim(), color: newSectionColor });
      setNewSectionName('');
      setNewSectionColor('#6366f1');
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (section: ProjectSection) => {
    setEditingId(section.id);
    setEditingName(section.name);
    setEditingColor(section.color || '#6366f1');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    await updateSection({ id: editingId, updates: { name: editingName.trim(), color: editingColor } });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta seção? As tarefas associadas não serão excluídas.')) return;
    await deleteSection(id);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (sourceIndex === targetIndex) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const updates = reordered.map((s, i) => ({ id: s.id, order: i }));
    await reorderSections(updates);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] md:w-[50vw] max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Seções</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new section */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <Label>Nova Seção</Label>
            <div className="flex gap-2">
              <Input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Nome da seção"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={creating} size="sm">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    newSectionColor === color ? 'border-primary scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewSectionColor(color)}
                />
              ))}
            </div>
          </div>

          {/* Sections list */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sections.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma seção criada. Crie uma seção acima.
              </p>
            ) : (
              sections.map((section, index) => (
                <div
                  key={section.id}
                  className="flex items-center gap-2 p-3 border rounded-lg bg-background hover:bg-muted/30 transition-colors"
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: section.color || '#6366f1' }}
                  />

                  {editingId === section.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 h-8"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        {PRESET_COLORS.slice(0, 5).map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-5 h-5 rounded-full border ${
                              editingColor === color ? 'border-primary' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setEditingColor(color)}
                          />
                        ))}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveEdit}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium truncate">{section.name}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEdit(section)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(section.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
