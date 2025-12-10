import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, MessageSquare } from 'lucide-react';
import {
  useWhatsAppTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  extractTemplateVariables,
  type WhatsAppTemplate
} from '@/hooks/useWhatsAppTemplates';

const CATEGORY_OPTIONS = [
  { value: 'saudacao', label: 'Saudação' },
  { value: 'faq', label: 'FAQ' },
  { value: 'encerramento', label: 'Encerramento' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'confirmacao', label: 'Confirmação' },
  { value: 'outro', label: 'Outro' },
];

export default function WhatsAppTemplatesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'saudacao' as WhatsAppTemplate['category'],
    content: '',
  });

  const { data: templates, isLoading } = useWhatsAppTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const detectedVariables = extractTemplateVariables(formData.content);

  const handleSubmit = async () => {
    const variables = detectedVariables.map(name => ({
      name,
      description: `Variável ${name}`,
      example: 'Exemplo'
    }));

    if (editingTemplate) {
      await updateTemplate.mutateAsync({
        id: editingTemplate.id,
        ...formData,
        variables
      });
    } else {
      await createTemplate.mutateAsync({
        ...formData,
        variables,
        is_active: true
      });
    }

    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'saudacao',
      content: '',
    });
    setEditingTemplate(null);
  };

  const handleEdit = (template: WhatsAppTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      content: template.content,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este template?')) {
      await deleteTemplate.mutateAsync(id);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Templates de Mensagem WhatsApp</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie respostas rápidas e padronizadas
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Template</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Saudação Inicial"
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="content">Conteúdo</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Digite o conteúdo do template. Use {{variavel}} para criar variáveis dinâmicas."
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use <code className="bg-muted px-1 py-0.5 rounded">{'{{nome}}'}</code> para criar variáveis dinâmicas
                </p>
              </div>

              {detectedVariables.length > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Variáveis detectadas:</p>
                  <div className="flex flex-wrap gap-2">
                    {detectedVariables.map(v => (
                      <Badge key={v} variant="secondary">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium mb-1">Preview:</p>
                <p className="text-sm whitespace-pre-wrap">{formData.content || 'Digite o conteúdo acima...'}</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name.trim() || !formData.content.trim()}
              >
                {editingTemplate ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        {isLoading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : templates?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Nenhum template criado</h3>
              <p className="text-muted-foreground mb-4">
                Crie templates para agilizar o atendimento
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates?.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_OPTIONS.find(c => c.value === template.category)?.label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {template.usage_count} usos
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm whitespace-pre-wrap line-clamp-4">
                    {template.content}
                  </CardDescription>
                  {template.variables.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {template.variables.map(v => (
                        <Badge key={v.name} variant="secondary" className="text-xs">
                          {v.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
