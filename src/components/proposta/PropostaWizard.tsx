import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
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

  const progress = ((currentStep + 1) / STEPS.length) * 100;

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
    <>
      <div className={cn("w-full flex flex-col", !asPage && "max-w-5xl")}>
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{propostaId ? 'Editar Proposta' : 'Nova Proposta Comercial'}</h2>
          </div>

          {/* Progress */}
          <div className="space-y-4">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between">
              {STEPS.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(index)}
                  className={`flex flex-col items-center text-center transition-colors ${
                    index === currentStep
                      ? 'text-primary'
                      : index < currentStep
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground/50'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                      index === currentStep
                        ? 'border-primary bg-primary text-primary-foreground'
                        : index < currentStep
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-muted-foreground/30'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4 min-h-[400px]">
          {renderStep()}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave('rascunho')}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Rascunho
            </Button>

            {currentStep === STEPS.length - 1 ? (
              <Button
                onClick={() => handleSave('enviada')}
                disabled={isSaving}
              >
                Finalizar e Enviar
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );

  if (asPage) {
    return <div className="p-6">{inner}</div>;
  }

  return (
    <Dialog open={!!open} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] md:w-[50vw] max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">{inner}</DialogContent>
    </Dialog>
  );
}
