import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePropostas } from '@/hooks/usePropostas';
import { ClienteStep } from './steps/ClienteStep';
import { VeiculosStep } from './steps/VeiculosStep';
import { CondicoesStep } from './steps/CondicoesStep';
import { ProtecoesStep } from './steps/ProtecoesStep';
import { SimulacaoStep } from './steps/SimulacaoStep';
import { RevisaoStep } from './steps/RevisaoStep';
import type { Proposta, PropostaVeiculo } from '@/types/proposta';

interface PropostaWizardProps {
  open?: boolean;
  onClose?: () => void;
  propostaId?: string | null;
  asPage?: boolean;
}

const STEPS = [
  { id: 'cliente', title: 'Cliente', description: 'Dados do cliente' },
  { id: 'veiculos', title: 'Veículos', description: 'Adicionar veículos' },
  { id: 'condicoes', title: 'Condições', description: 'Condições comerciais' },
  { id: 'protecoes', title: 'Proteções', description: 'Proteções e taxas' },
  { id: 'simulacao', title: 'Simulação', description: 'Cenários e cálculos' },
  { id: 'revisao', title: 'Revisão', description: 'Revisar e enviar' },
];

export function PropostaWizard({ open = true, onClose = () => {}, propostaId, asPage = false }: PropostaWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const { propostas, createProposta, updateProposta } = usePropostas();

  useEffect(() => {
    console.debug('PropostaWizard mounted', { asPage, propostaId, open });
    return () => console.debug('PropostaWizard unmounted', { asPage, propostaId });
  }, [asPage, propostaId, open]);

  const editingProposta = propostaId
    ? propostas.find((p) => p.id === propostaId)
    : null;

  const [formData, setFormData] = useState<Partial<Proposta>>({
    cliente_nome: '',
    cliente_cnpj: '',
    cliente_email: '',
    cliente_telefone: '',
    cliente_endereco: '',
    vendedor_nome: '',
    prazo_contrato_meses: 24,
    vencimento_mensalidade: 10,
    indice_reajuste: 'IPCA',
    local_entrega: '',
    local_devolucao: '',
    veiculos_provisorios: 0,
    limite_substituicao_sinistro: 7,
    limite_substituicao_manutencao: 7,
    prazo_substituicao_sinistro_horas: 48,
    prazo_substituicao_manutencao_horas: 24,
    protecao_roubo: true,
    protecao_furto: true,
    protecao_colisao: true,
    protecao_incendio: true,
    limite_danos_materiais: 100000,
    limite_danos_morais: 100000,
    limite_danos_pessoais: 100000,
    limite_app_passageiro: 10000,
    taxa_administracao_multas: 0.1,
    taxa_reembolsaveis: 0.1,
    custo_remocao_forcada: 2000,
    custo_lavagem_simples: 50,
    custo_higienizacao: 300,
    observacoes: '',
  });

  const [veiculos, setVeiculos] = useState<Partial<PropostaVeiculo>[]>([]);

  useEffect(() => {
    if (editingProposta) {
      setFormData(editingProposta);
      setVeiculos([]);
    } else {
      setFormData({
        cliente_nome: '',
        cliente_cnpj: '',
        cliente_email: '',
        cliente_telefone: '',
        cliente_endereco: '',
        vendedor_nome: '',
        prazo_contrato_meses: 24,
        vencimento_mensalidade: 10,
        indice_reajuste: 'IPCA',
        local_entrega: '',
        local_devolucao: '',
        veiculos_provisorios: 0,
        limite_substituicao_sinistro: 7,
        limite_substituicao_manutencao: 7,
        prazo_substituicao_sinistro_horas: 48,
        prazo_substituicao_manutencao_horas: 24,
        protecao_roubo: true,
        protecao_furto: true,
        protecao_colisao: true,
        protecao_incendio: true,
        limite_danos_materiais: 100000,
        limite_danos_morais: 100000,
        limite_danos_pessoais: 100000,
        limite_app_passageiro: 10000,
        taxa_administracao_multas: 0.1,
        taxa_reembolsaveis: 0.1,
        custo_remocao_forcada: 2000,
        custo_lavagem_simples: 50,
        custo_higienizacao: 300,
        observacoes: '',
      });
      setVeiculos([]);
    }
    setCurrentStep(0);
  }, [editingProposta, open]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async (status: 'rascunho' | 'enviada' = 'rascunho') => {
    setIsSaving(true);
    try {
      const valorMensalTotal = veiculos.reduce(
        (sum, v) => sum + (v.aluguel_unitario || 0) * (v.quantidade || 1),
        0
      );

      const payload = {
        ...formData,
        status,
        quantidade_veiculos: veiculos.reduce((sum, v) => sum + (v.quantidade || 1), 0),
        valor_mensal_total: valorMensalTotal,
        valor_anual_total: valorMensalTotal * 12,
      };

      if (propostaId) {
        await updateProposta({ id: propostaId, ...payload });
      } else {
        await createProposta(payload as any);
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'cliente':
        return (
          <ClienteStep
            data={formData}
            onChange={(data) => setFormData({ ...formData, ...data })}
          />
        );
      case 'veiculos':
        return (
          <VeiculosStep
            veiculos={veiculos}
            onChange={setVeiculos}
          />
        );
      case 'condicoes':
        return (
          <CondicoesStep
            data={formData}
            onChange={(data) => setFormData({ ...formData, ...data })}
          />
        );
      case 'protecoes':
        return (
          <ProtecoesStep
            data={formData}
            onChange={(data) => setFormData({ ...formData, ...data })}
          />
        );
      case 'simulacao':
        return (
          <SimulacaoStep
            proposta={formData}
            veiculos={veiculos}
          />
        );
      case 'revisao':
        return (
          <RevisaoStep
            proposta={formData}
            veiculos={veiculos}
          />
        );
      default:
        return null;
    }
  };

  const inner = (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {propostaId ? 'Editar Proposta' : 'Nova Proposta Comercial'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Preencha as informações para gerar a proposta comercial
        </p>
      </div>

      {/* Modern Horizontal Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step */}
                <button
                  onClick={() => setCurrentStep(index)}
                  className="flex items-center gap-3 group"
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                      isActive && 'bg-primary text-primary-foreground shadow-lg shadow-primary/25',
                      isCompleted && 'bg-primary/20 text-primary',
                      !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className={cn(
                      'text-sm font-medium transition-colors',
                      isActive && 'text-foreground',
                      !isActive && 'text-muted-foreground group-hover:text-foreground'
                    )}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground hidden xl:block">
                      {step.description}
                    </p>
                  </div>
                </button>
                
                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div className="flex-1 mx-3 hidden sm:block">
                    <div className={cn(
                      'h-0.5 rounded-full transition-colors',
                      index < currentStep ? 'bg-primary' : 'bg-border'
                    )} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[450px] mb-6">
        {renderStep()}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave('rascunho')}
            disabled={isSaving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Salvar Rascunho</span>
            <span className="sm:hidden">Salvar</span>
          </Button>

          {currentStep === STEPS.length - 1 ? (
            <Button
              onClick={() => handleSave('enviada')}
              disabled={isSaving}
              className="gap-2"
            >
              Finalizar e Enviar
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-2">
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  if (asPage) {
    return <div className="py-6 px-4 md:px-8">{inner}</div>;
  }

  return (
    <Dialog open={!!open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] md:w-[85vw] max-w-[1100px] max-h-[90vh] overflow-y-auto">
        <div className="py-2">{inner}</div>
      </DialogContent>
    </Dialog>
  );
}
