import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, User, Mail, Phone, MapPin } from 'lucide-react';
import type { Proposta } from '@/types/proposta';

interface ClienteStepProps {
  data: Partial<Proposta>;
  onChange: (data: Partial<Proposta>) => void;
}

export function ClienteStep({ data, onChange }: ClienteStepProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dados do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente_nome">Razão Social / Nome *</Label>
              <Input
                id="cliente_nome"
                placeholder="Nome do cliente"
                value={data.cliente_nome || ''}
                onChange={(e) => onChange({ cliente_nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cliente_cnpj">CNPJ / CPF</Label>
              <Input
                id="cliente_cnpj"
                placeholder="00.000.000/0000-00"
                value={data.cliente_cnpj || ''}
                onChange={(e) => onChange({ cliente_cnpj: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente_email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-mail
              </Label>
              <Input
                id="cliente_email"
                type="email"
                placeholder="email@empresa.com"
                value={data.cliente_email || ''}
                onChange={(e) => onChange({ cliente_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cliente_telefone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Input
                id="cliente_telefone"
                placeholder="(00) 00000-0000"
                value={data.cliente_telefone || ''}
                onChange={(e) => onChange({ cliente_telefone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente_endereco" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Endereço Completo
            </Label>
            <Textarea
              id="cliente_endereco"
              placeholder="Endereço completo do cliente"
              value={data.cliente_endereco || ''}
              onChange={(e) => onChange({ cliente_endereco: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Vendedor Responsável
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="vendedor_nome">Nome do Vendedor</Label>
            <Input
              id="vendedor_nome"
              placeholder="Nome do vendedor"
              value={data.vendedor_nome || ''}
              onChange={(e) => onChange({ vendedor_nome: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
