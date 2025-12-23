import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Car,
  Calendar,
  Shield,
  FileText,
  CheckCircle,
} from 'lucide-react';
import type { Proposta, PropostaVeiculo } from '@/types/proposta';

interface RevisaoStepProps {
  proposta: Partial<Proposta>;
  veiculos: Partial<PropostaVeiculo>[];
}

export function RevisaoStep({ proposta, veiculos }: RevisaoStepProps) {
  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalVeiculos = veiculos.reduce((sum, v) => sum + (v.quantidade || 1), 0);
  const totalMensal = veiculos.reduce(
    (sum, v) => sum + (v.aluguel_unitario || 0) * (v.quantidade || 1),
    0
  );
  const totalAnual = totalMensal * 12;
  const valorContrato = totalMensal * (proposta.prazo_contrato_meses || 24);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Revisão da Proposta</h3>
          <p className="text-sm text-muted-foreground">
            Confira os dados antes de finalizar
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Cliente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Razão Social:</span>
              <span className="font-medium">{proposta.cliente_nome || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CNPJ:</span>
              <span>{proposta.cliente_cnpj || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">E-mail:</span>
              <span>{proposta.cliente_email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Telefone:</span>
              <span>{proposta.cliente_telefone || '-'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Condições */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Condições
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prazo:</span>
              <span className="font-medium">
                {proposta.prazo_contrato_meses} meses
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vencimento:</span>
              <span>Dia {proposta.vencimento_mensalidade}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reajuste:</span>
              <span>{proposta.indice_reajuste}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendedor:</span>
              <span>{proposta.vendedor_nome || '-'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Veículos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4" />
            Veículos ({totalVeiculos})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {veiculos.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum veículo adicionado</p>
          ) : (
            <div className="space-y-2">
              {veiculos.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {v.quantidade}x {v.montadora} {v.modelo_nome}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      ({v.ano_modelo})
                    </span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency((v.aluguel_unitario || 0) * (v.quantidade || 1))}
                    /mês
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proteções */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Proteções
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {proposta.protecao_roubo && <Badge variant="outline">Roubo</Badge>}
            {proposta.protecao_furto && <Badge variant="outline">Furto</Badge>}
            {proposta.protecao_colisao && (
              <Badge variant="outline">Colisão</Badge>
            )}
            {proposta.protecao_incendio && (
              <Badge variant="outline">Incêndio</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Totais */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Valor Mensal</p>
              <p className="text-2xl font-bold">{formatCurrency(totalMensal)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Anual</p>
              <p className="text-2xl font-bold">{formatCurrency(totalAnual)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Contrato</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(valorContrato)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle
              className={`h-4 w-4 ${
                proposta.cliente_nome ? 'text-green-500' : 'text-muted-foreground'
              }`}
            />
            <span className="text-sm">Cliente identificado</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle
              className={`h-4 w-4 ${
                veiculos.length > 0 ? 'text-green-500' : 'text-muted-foreground'
              }`}
            />
            <span className="text-sm">Veículos adicionados</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle
              className={`h-4 w-4 ${
                proposta.prazo_contrato_meses
                  ? 'text-green-500'
                  : 'text-muted-foreground'
              }`}
            />
            <span className="text-sm">Condições definidas</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
