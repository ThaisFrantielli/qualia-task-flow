import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  useWhatsAppTemplates,
  replaceTemplateVariables,
  incrementTemplateUsage,
  type WhatsAppTemplate,
  type TemplateVariable
} from '@/hooks/useWhatsAppTemplates';
import { MessageSquare, Search, Star, Clock, Check, HelpCircle, Plus } from 'lucide-react';

interface TemplatePickerProps {
  onSelect: (message: string, templateId: string) => void;
  clientName?: string;
  customerData?: Record<string, string>; // Dados do cliente para preencher automaticamente
}

const CATEGORY_LABELS = {
  saudacao: { label: 'Saudação', icon: MessageSquare, color: 'bg-blue-500' },
  faq: { label: 'FAQ', icon: HelpCircle, color: 'bg-purple-500' },
  encerramento: { label: 'Encerramento', icon: Check, color: 'bg-green-500' },
  followup: { label: 'Follow-up', icon: Clock, color: 'bg-orange-500' },
  confirmacao: { label: 'Confirmação', icon: Star, color: 'bg-yellow-500' },
  outro: { label: 'Outro', icon: Plus, color: 'bg-gray-500' },
};

export function TemplatePicker({ onSelect, clientName, customerData = {} }: TemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  const { data: templates, isLoading } = useWhatsAppTemplates(
    selectedCategory === 'all' ? undefined : selectedCategory
  );

  const filteredTemplates = templates?.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleTemplateClick = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    
    // Preencher valores automáticos
    const autoValues: Record<string, string> = {};
    template.variables.forEach(v => {
      if (v.name === 'nome' && clientName) {
        autoValues[v.name] = clientName;
      } else if (customerData[v.name]) {
        autoValues[v.name] = customerData[v.name];
      } else {
        autoValues[v.name] = '';
      }
    });
    setVariableValues(autoValues);
  };

  const handleUseTemplate = () => {
    if (!selectedTemplate) return;

    const variables: TemplateVariable[] = Object.entries(variableValues).map(([name, value]) => ({
      name,
      value
    }));

    const finalMessage = replaceTemplateVariables(selectedTemplate.content, variables);
    
    // Incrementar contador de uso
    incrementTemplateUsage(selectedTemplate.id);
    
    onSelect(finalMessage, selectedTemplate.id);
    setOpen(false);
    setSelectedTemplate(null);
    setVariableValues({});
    setSearch('');
  };

  const renderPreview = () => {
    if (!selectedTemplate) return 'Selecione um template';

    const variables: TemplateVariable[] = Object.entries(variableValues).map(([name, value]) => ({
      name,
      value: value || `{{${name}}}`
    }));

    return replaceTemplateVariables(selectedTemplate.content, variables);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Templates de Mensagem</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Categories */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="all">Todos</TabsTrigger>
              {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="flex-1 flex gap-4 mt-4">
              {/* Template List */}
              <ScrollArea className="flex-1 border rounded-lg p-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : filteredTemplates?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum template encontrado
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTemplates?.map((template) => {
                      const categoryInfo = CATEGORY_LABELS[template.category];
                      const Icon = categoryInfo.icon;
                      
                      return (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateClick(template)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted ${
                            selectedTemplate?.id === template.id ? 'bg-muted border-primary' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded ${categoryInfo.color} text-white`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm">{template.name}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  {template.usage_count} usos
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {template.content}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Preview & Variables */}
              {selectedTemplate && (
                <div className="w-[400px] border rounded-lg p-4 space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Variáveis</h3>
                    <div className="space-y-3">
                      {selectedTemplate.variables.map((variable) => (
                        <div key={variable.name}>
                          <Label htmlFor={variable.name} className="text-xs">
                            {variable.description}
                          </Label>
                          <Input
                            id={variable.name}
                            value={variableValues[variable.name] || ''}
                            onChange={(e) =>
                              setVariableValues(prev => ({
                                ...prev,
                                [variable.name]: e.target.value
                              }))
                            }
                            placeholder={variable.example}
                            className="mt-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Preview</h3>
                    <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                      {renderPreview()}
                    </div>
                  </div>

                  <Button onClick={handleUseTemplate} className="w-full">
                    Usar Template
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
