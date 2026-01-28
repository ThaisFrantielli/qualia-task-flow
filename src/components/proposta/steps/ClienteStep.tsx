import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, User, Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import { ClienteCombobox } from '@/components/common/ClienteCombobox';
import type { Proposta } from '@/types/proposta';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClienteStepProps {
  data: Partial<Proposta>;
  onChange: (data: Partial<Proposta>) => void;
}

// Monta endereço completo a partir dos campos separados
const buildEnderecoCompleto = (cliente: any): string => {
  const parts: string[] = [];
  
  if (cliente.endereco) {
    let linha = cliente.endereco;
    if (cliente.numero) linha += `, ${cliente.numero}`;
    parts.push(linha);
  }
  
  if (cliente.bairro) parts.push(cliente.bairro);
  
  if (cliente.cidade || cliente.estado) {
    const cidadeEstado = [cliente.cidade, cliente.estado].filter(Boolean).join('/');
    if (cidadeEstado) parts.push(cidadeEstado);
  }
  
  if (cliente.cep) parts.push(`CEP: ${cliente.cep}`);
  
  return parts.join(' - ');
};

export function ClienteStep({ data, onChange }: ClienteStepProps) {
  const [clienteExistente, setClienteExistente] = useState<any>(null);
  
  // Busca dados do cliente e contatos secundários
  const loadClienteData = useCallback(async (clienteId: string) => {
    try {
      // Buscar cliente com todos os campos necessários
      const { data: cliente, error } = await supabase
        .from('clientes')
        .select(`
          id, razao_social, nome_fantasia, cpf_cnpj,
          email, telefone, whatsapp_number,
          endereco, numero, bairro, cidade, estado, cep
        `)
        .eq('id', clienteId)
        .maybeSingle();

      if (error || !cliente) {
        console.error('Erro ao buscar cliente:', error);
        return;
      }

      setClienteExistente(cliente);

      // Preparar dados base
      let clienteEmail = cliente.email || '';
      let clienteTelefone = cliente.telefone || cliente.whatsapp_number || '';

      // Fallback: buscar contato secundário se email/telefone vazios
      if (!clienteEmail || !clienteTelefone) {
        const { data: contatos } = await supabase
          .from('cliente_contatos')
          .select('email_contato, telefone_contato')
          .eq('cliente_id', clienteId)
          .order('is_gestor', { ascending: false })
          .limit(1);

        if (contatos?.length) {
          if (!clienteEmail && contatos[0].email_contato) {
            clienteEmail = contatos[0].email_contato;
          }
          if (!clienteTelefone && contatos[0].telefone_contato) {
            clienteTelefone = contatos[0].telefone_contato;
          }
        }
      }

      // Montar endereço completo
      const enderecoCompleto = buildEnderecoCompleto(cliente);

      // Atualizar formulário com dados corretos
      onChange({
        cliente_id: clienteId,
        cliente_nome: cliente.razao_social || cliente.nome_fantasia || '',
        cliente_cnpj: cliente.cpf_cnpj || '',
        cliente_email: clienteEmail,
        cliente_telefone: clienteTelefone,
        cliente_endereco: enderecoCompleto
      });

    } catch (err) {
      console.error('Erro ao carregar dados do cliente:', err);
    }
  }, [onChange]);

  // Carregar dados quando cliente_id mudar
  useEffect(() => {
    if (data.cliente_id && !clienteExistente) {
      loadClienteData(data.cliente_id);
    }
  }, [data.cliente_id, clienteExistente, loadClienteData]);

  const handleClienteSelect = (clienteId: string | null) => {
    if (clienteId) {
      loadClienteData(clienteId);
    } else {
      handleManualInput();
    }
  };

  const handleManualInput = () => {
    setClienteExistente(null);
    onChange({ 
      cliente_id: undefined,
      cliente_nome: '',
      cliente_cnpj: '',
      cliente_email: '',
      cliente_telefone: '',
      cliente_endereco: ''
    });
  };

  const isClienteVinculado = !!data.cliente_id && !!clienteExistente;

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Dados do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Busca de Cliente */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Buscar Cliente Existente</Label>
            <ClienteCombobox
              value={data.cliente_id || null}
              onChange={handleClienteSelect}
              placeholder="Buscar por nome, CNPJ ou telefone..."
            />
            
            {isClienteVinculado && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm">
                  Cliente vinculado: <strong>{clienteExistente.razao_social || clienteExistente.nome_fantasia}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleManualInput}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Desvincular
                </button>
              </div>
            )}
          </div>

          {/* Grid de Campos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente_nome" className="text-sm">
                Razão Social / Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cliente_nome"
                placeholder="Nome do cliente"
                value={data.cliente_nome || ''}
                onChange={(e) => onChange({ cliente_nome: e.target.value })}
                disabled={isClienteVinculado}
                className={isClienteVinculado ? 'bg-muted' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cliente_cnpj" className="text-sm">CNPJ / CPF</Label>
              <Input
                id="cliente_cnpj"
                placeholder="00.000.000/0000-00"
                value={data.cliente_cnpj || ''}
                onChange={(e) => onChange({ cliente_cnpj: e.target.value })}
                disabled={isClienteVinculado}
                className={isClienteVinculado ? 'bg-muted' : ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente_email" className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                E-mail
              </Label>
              <Input
                id="cliente_email"
                type="email"
                placeholder="email@empresa.com"
                value={data.cliente_email || ''}
                onChange={(e) => onChange({ cliente_email: e.target.value })}
                disabled={isClienteVinculado}
                className={isClienteVinculado ? 'bg-muted' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cliente_telefone" className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Telefone
              </Label>
              <Input
                id="cliente_telefone"
                placeholder="(00) 00000-0000"
                value={data.cliente_telefone || ''}
                onChange={(e) => onChange({ cliente_telefone: e.target.value })}
                disabled={isClienteVinculado}
                className={isClienteVinculado ? 'bg-muted' : ''}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente_endereco" className="flex items-center gap-2 text-sm">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              Endereço Completo
            </Label>
            <Textarea
              id="cliente_endereco"
              placeholder="Endereço completo do cliente"
              value={data.cliente_endereco || ''}
              onChange={(e) => onChange({ cliente_endereco: e.target.value })}
              disabled={isClienteVinculado}
              className={`min-h-[80px] resize-none ${isClienteVinculado ? 'bg-muted' : ''}`}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Vendedor Responsável
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="vendedor_nome" className="text-sm">Nome do Vendedor</Label>
            <Input
              id="vendedor_nome"
              placeholder="Nome do vendedor responsável"
              value={data.vendedor_nome || ''}
              onChange={(e) => onChange({ vendedor_nome: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
