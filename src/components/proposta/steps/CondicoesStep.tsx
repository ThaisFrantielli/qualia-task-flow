import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, MapPin, Car } from 'lucide-react';
import type { Proposta } from '@/types/proposta';

interface CondicoesStepProps {
  data: Partial<Proposta>;
  onChange: (data: Partial<Proposta>) => void;
}

const PRAZOS = [
  { value: 12, label: '12 meses' },
  { value: 18, label: '18 meses' },
  { value: 24, label: '24 meses' },
  { value: 30, label: '30 meses' },
  { value: 36, label: '36 meses' },
  { value: 48, label: '48 meses' },
];

const INDICES = [
  { value: 'IPCA', label: 'IPCA' },
  { value: 'IGP-M', label: 'IGP-M' },
  { value: 'INPC', label: 'INPC' },
];

export function CondicoesStep({ data, onChange }: CondicoesStepProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Prazos e Reajuste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Prazo do Contrato</Label>
              <Select
                value={data.prazo_contrato_meses?.toString() || '24'}
                onValueChange={(v) =>
                  onChange({ prazo_contrato_meses: parseInt(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRAZOS.map((p) => (
                    <SelectItem key={p.value} value={p.value.toString()}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dia Vencimento</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={data.vencimento_mensalidade || 10}
                onChange={(e) =>
                  onChange({ vencimento_mensalidade: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Índice de Reajuste</Label>
              <Select
                value={data.indice_reajuste || 'IPCA'}
                onValueChange={(v) => onChange({ indice_reajuste: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDICES.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Locais de Entrega e Devolução
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Local de Entrega</Label>
              <Input
                placeholder="Endereço de entrega dos veículos"
                value={data.local_entrega || ''}
                onChange={(e) => onChange({ local_entrega: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Local de Devolução</Label>
              <Input
                placeholder="Endereço de devolução dos veículos"
                value={data.local_devolucao || ''}
                onChange={(e) => onChange({ local_devolucao: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Veículos Substitutos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Veículos Provisórios</Label>
              <Input
                type="number"
                min={0}
                value={data.veiculos_provisorios || 0}
                onChange={(e) =>
                  onChange({ veiculos_provisorios: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Quantidade de veículos para substituição
              </p>
            </div>
            <div className="space-y-2">
              <Label>Limite Substituição (Sinistro)</Label>
              <Input
                type="number"
                min={0}
                value={data.limite_substituicao_sinistro || 7}
                onChange={(e) =>
                  onChange({
                    limite_substituicao_sinistro: parseInt(e.target.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">Dias máximos</p>
            </div>
            <div className="space-y-2">
              <Label>Limite Substituição (Manutenção)</Label>
              <Input
                type="number"
                min={0}
                value={data.limite_substituicao_manutencao || 7}
                onChange={(e) =>
                  onChange({
                    limite_substituicao_manutencao: parseInt(e.target.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">Dias máximos</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Prazo Substituição (Sinistro)
              </Label>
              <Input
                type="number"
                min={0}
                value={data.prazo_substituicao_sinistro_horas || 48}
                onChange={(e) =>
                  onChange({
                    prazo_substituicao_sinistro_horas: parseInt(e.target.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">Horas</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Prazo Substituição (Manutenção)
              </Label>
              <Input
                type="number"
                min={0}
                value={data.prazo_substituicao_manutencao_horas || 24}
                onChange={(e) =>
                  onChange({
                    prazo_substituicao_manutencao_horas: parseInt(e.target.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">Horas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
