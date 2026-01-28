import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  FileText, 
  HelpCircle, 
  CheckCircle, 
  Upload, 
  Image as ImageIcon,
  Eye,
  FileUp,
  Trash2,
  Settings
} from 'lucide-react';
import { 
  useDefaultTemplate, 
  usePropostaTemplates,
  uploadMinuta 
} from '@/hooks/usePropostaTemplates';
import { PropostaTemplateWithDetails, SecoesConfig } from '@/types/proposta-template';
import { toast } from 'sonner';

interface PersonalizarStepProps {
  template: PropostaTemplateWithDetails | null;
  onTemplateChange: (template: PropostaTemplateWithDetails) => void;
  minutaEspecifica?: { url: string; nome: string } | null;
  onMinutaChange: (minuta: { url: string; nome: string } | null) => void;
}

export const PersonalizarStep: React.FC<PersonalizarStepProps> = ({
  template,
  onTemplateChange,
  minutaEspecifica,
  onMinutaChange
}) => {
  const { data: templates, isLoading: loadingTemplates } = usePropostaTemplates();
  const { data: defaultTemplate, isLoading: loadingDefault } = useDefaultTemplate();
  const [localTemplate, setLocalTemplate] = useState<PropostaTemplateWithDetails | null>(template);
  const [uploadingMinuta, setUploadingMinuta] = useState(false);
  
  // Inicializar com template padrão se não houver template selecionado
  useEffect(() => {
    if (!template && defaultTemplate) {
      setLocalTemplate(defaultTemplate);
      onTemplateChange(defaultTemplate);
    }
  }, [defaultTemplate, template, onTemplateChange]);

  // Sincronizar template local
  useEffect(() => {
    if (template) {
      setLocalTemplate(template);
    }
  }, [template]);

  const handleTemplateSelect = (selectedTemplate: PropostaTemplateWithDetails) => {
    setLocalTemplate(selectedTemplate);
    onTemplateChange(selectedTemplate);
  };

  const handleConfigChange = (section: keyof SecoesConfig, value: boolean) => {
    if (!localTemplate) return;
    
    const newConfig = {
      ...localTemplate.secoes_config,
      [section]: { visivel: value }
    };
    
    const updatedTemplate = {
      ...localTemplate,
      secoes_config: newConfig
    };
    
    setLocalTemplate(updatedTemplate);
    onTemplateChange(updatedTemplate);
  };

  const handleMinutaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      toast.error('Por favor, selecione um arquivo PDF');
      return;
    }
    
    setUploadingMinuta(true);
    try {
      const result = await uploadMinuta(file, 'especifica');
      onMinutaChange(result);
      toast.success('Minuta carregada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload da minuta:', error);
      toast.error('Erro ao fazer upload da minuta');
    } finally {
      setUploadingMinuta(false);
    }
  };

  const handleRemoveMinuta = () => {
    onMinutaChange(null);
    toast.info('Minuta removida');
  };

  if (loadingTemplates || loadingDefault) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Personalizar Proposta</h2>
          <p className="text-muted-foreground text-sm">
            Configure o template e adicione a minuta de contrato
          </p>
        </div>
        {localTemplate && (
          <Badge variant="outline" className="gap-1">
            <Palette className="h-3 w-3" />
            {localTemplate.nome}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="template" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="template" className="gap-2">
            <Palette className="h-4 w-4" />
            Template
          </TabsTrigger>
          <TabsTrigger value="secoes" className="gap-2">
            <Settings className="h-4 w-4" />
            Seções
          </TabsTrigger>
          <TabsTrigger value="minuta" className="gap-2">
            <FileText className="h-4 w-4" />
            Minuta
          </TabsTrigger>
        </TabsList>

        {/* Tab: Template */}
        <TabsContent value="template" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selecionar Template</CardTitle>
              <CardDescription>
                Escolha o modelo visual para sua proposta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates?.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      // Precisamos buscar os detalhes do template
                      if (localTemplate?.id === t.id) return;
                      // Para simplificar, usamos o template padrão se for ele
                      if (t.is_padrao && defaultTemplate) {
                        handleTemplateSelect(defaultTemplate);
                      }
                    }}
                    className={`
                      relative p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${localTemplate?.id === t.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    {t.is_padrao && (
                      <Badge className="absolute -top-2 -right-2 text-xs">
                        Padrão
                      </Badge>
                    )}
                    
                    {/* Preview visual */}
                    <div 
                      className="h-24 rounded-md mb-3 flex items-center justify-center"
                      style={{ backgroundColor: t.cor_primaria }}
                    >
                      {t.logo_url ? (
                        <img 
                          src={t.logo_url} 
                          alt="Logo" 
                          className="max-h-16 max-w-full object-contain"
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-white/50" />
                      )}
                    </div>
                    
                    <h3 className="font-medium text-sm">{t.nome}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {t.descricao || t.slogan}
                    </p>
                    
                    {/* Cores */}
                    <div className="flex gap-2 mt-3">
                      <div 
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: t.cor_primaria }}
                        title="Cor primária"
                      />
                      <div 
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: t.cor_secundaria }}
                        title="Cor secundária"
                      />
                    </div>

                    {localTemplate?.id === t.id && (
                      <div className="absolute top-2 left-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Seções */}
        <TabsContent value="secoes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configurar Seções</CardTitle>
              <CardDescription>
                Escolha quais seções serão exibidas no PDF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {localTemplate && (
                <>
                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Capa</p>
                        <p className="text-xs text-muted-foreground">
                          Página inicial com logo e nome do cliente
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={localTemplate.secoes_config.capa?.visivel ?? true}
                      onCheckedChange={(checked) => handleConfigChange('capa', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Proposta</p>
                        <p className="text-xs text-muted-foreground">
                          Dados do cliente, veículos e valores
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={localTemplate.secoes_config.proposta?.visivel ?? true}
                      onCheckedChange={(checked) => handleConfigChange('proposta', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Benefícios</p>
                        <p className="text-xs text-muted-foreground">
                          Lista de benefícios inclusos ({localTemplate.beneficios.length} itens)
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={localTemplate.secoes_config.beneficios?.visivel ?? true}
                      onCheckedChange={(checked) => handleConfigChange('beneficios', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">FAQ</p>
                        <p className="text-xs text-muted-foreground">
                          Perguntas frequentes ({localTemplate.faqs.length} itens)
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={localTemplate.secoes_config.faq?.visivel ?? true}
                      onCheckedChange={(checked) => handleConfigChange('faq', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <FileUp className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Minuta de Contrato</p>
                        <p className="text-xs text-muted-foreground">
                          Anexar minuta ao final do PDF
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={localTemplate.secoes_config.minuta?.visivel ?? true}
                      onCheckedChange={(checked) => handleConfigChange('minuta', checked)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Minuta */}
        <TabsContent value="minuta" className="mt-4">
          <div className="grid gap-4">
            {/* Minuta Padrão */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Minuta Padrão
                </CardTitle>
                <CardDescription>
                  Minuta de contrato configurada no template
                </CardDescription>
              </CardHeader>
              <CardContent>
                {localTemplate?.minuta_padrao_url ? (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-red-500" />
                      <div>
                        <p className="font-medium text-sm">
                          {localTemplate.minuta_padrao_nome || 'Minuta Padrão'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Será anexada automaticamente
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.open(localTemplate.minuta_padrao_url, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhuma minuta padrão configurada</p>
                    <p className="text-xs mt-1">
                      Configure no gerenciador de templates
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Minuta Específica */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Minuta Específica
                </CardTitle>
                <CardDescription>
                  Envie uma minuta personalizada para esta proposta
                </CardDescription>
              </CardHeader>
              <CardContent>
                {minutaEspecifica ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">{minutaEspecifica.nome}</p>
                        <p className="text-xs text-green-600">
                          Esta minuta será usada no lugar da padrão
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(minutaEspecifica.url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleRemoveMinuta}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleMinutaUpload}
                      className="hidden"
                      id="minuta-upload"
                      disabled={uploadingMinuta}
                    />
                    <label 
                      htmlFor="minuta-upload"
                      className="cursor-pointer"
                    >
                      {uploadingMinuta ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                          <p className="text-sm text-muted-foreground">
                            Enviando arquivo...
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-10 w-10 text-muted-foreground" />
                          <p className="text-sm font-medium">
                            Clique para enviar ou arraste o arquivo
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Apenas arquivos PDF
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <div className="flex gap-3">
                <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Como funciona?
                  </p>
                  <ul className="mt-2 space-y-1 text-blue-700 dark:text-blue-300 text-xs">
                    <li>• Se você enviar uma minuta específica, ela será usada nesta proposta</li>
                    <li>• Caso contrário, a minuta padrão do template será anexada</li>
                    <li>• A minuta aparece como páginas finais do PDF gerado</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PersonalizarStep;
