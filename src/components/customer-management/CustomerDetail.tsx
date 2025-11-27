import React from 'react';
import type { ClienteComContatos, Contato, Atendimento } from '@/types';
import { useClienteDetail } from '@/hooks/useClienteDetail';
import { useWhatsAppNumbers } from '@/hooks/useWhatsAppNumbers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Building, User, Mail, Phone, Edit, Trash2, MapPin, CalendarDays, Headset, ListChecks, Target, DollarSign, Package, MessageCircle } from 'lucide-react';
import AtendimentosTable from '@/components/crm/AtendimentosTable';
import { WhatsAppTab } from './WhatsAppTab';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDateSafe } from '@/lib/dateUtils';

interface CustomerDetailProps {
  customer: ClienteComContatos;
  onEdit: () => void;
  onDelete: () => void;
}

const CustomerDetail: React.FC<CustomerDetailProps> = ({ customer, onEdit, onDelete }) => {
  const { detalhes, loading: detalhesLoading } = useClienteDetail(customer);
  const { numbers: whatsappNumbers, loading: whatsappLoading } = useWhatsAppNumbers();
  const hasDynamicWhatsApp = !whatsappLoading && whatsappNumbers.length > 0;

  // Fallback: se não houver instância WhatsApp detectada, ainda mostramos a aba usando o telefone do cliente
  const fallbackNumberRaw = (customer as any)?.whatsapp_number
    || (customer as any)?.telefone
    || (customer?.cliente_contatos && customer.cliente_contatos[0]?.telefone_contato)
    || null;
  const fallbackNumber = fallbackNumberRaw ? String(fallbackNumberRaw) : null;

  // Buscar oportunidades do cliente
  const { data: oportunidades = [], isLoading: oportunidadesLoading } = useQuery({
    queryKey: ['oportunidades-cliente', customer.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oportunidades')
        .select('*')
        .eq('cliente_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return formatDateSafe(dateString, 'dd/MM/yyyy');
  };

  return (
    <div className="bg-card rounded-lg border h-full flex flex-col">
      <div className="p-6 border-b flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-lg font-semibold">
            {getInitials(customer.nome_fantasia || customer.razao_social)}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">{customer.nome_fantasia || customer.razao_social}</h1>
            <p className="text-sm text-muted-foreground">{customer.razao_social}</p>
            {customer.situacao && <Badge variant="outline">{customer.situacao}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}> <Edit className="h-4 w-4 mr-2" /> Editar </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={onDelete}> <Trash2 className="h-4 w-4 mr-2" /> Excluir </Button>
        </div>
      </div>

      <Tabs defaultValue="detalhes" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-6 mt-4">
          <TabsTrigger value="detalhes">
            <User className="h-4 w-4 mr-2" />
            CLIENTE
          </TabsTrigger>

          {/* Tabs dinâmicas para cada WhatsApp */}
          {hasDynamicWhatsApp && whatsappNumbers.map((whatsapp) => (
            <TabsTrigger key={whatsapp.id} value={`whatsapp-${whatsapp.id}`}>
              <MessageCircle className="h-4 w-4 mr-2" />
              {whatsapp.displayName}
            </TabsTrigger>
          ))}
          {/* Aba fallback quando não há números detectados pelo serviço */}
          {!hasDynamicWhatsApp && fallbackNumber && (
            <TabsTrigger value={`whatsapp-fallback`}>
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </TabsTrigger>
          )}

          <TabsTrigger value="oportunidades">
            <Target className="h-4 w-4 mr-2" />
            Oportunidades <Badge variant="secondary" className="ml-2">{oportunidades.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="atendimentos">
            <Headset className="h-4 w-4 mr-2" />
            Atendimentos <Badge variant="secondary" className="ml-2">{detalhes?.atendimentos.length ?? 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tarefas">
            <ListChecks className="h-4 w-4 mr-2" />
            Tarefas <Badge variant="secondary" className="ml-2">{detalhes?.tarefas.length ?? 0}</Badge>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-6">
          <TabsContent value="detalhes" className="mt-0 space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5" /> Contatos</CardTitle></CardHeader>
              <CardContent>
                {customer.cliente_contatos && customer.cliente_contatos.length > 0 ? (
                  <div className="space-y-4">
                    {customer.cliente_contatos.map((contato: Contato) => (
                      <div key={contato.id} className="p-3 border rounded-md">
                        <p className="font-semibold">{contato.nome_contato}</p>
                        {contato.email_contato && <p className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="h-3 w-3" /> {contato.email_contato}</p>}
                        {contato.telefone_contato && <p className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="h-3 w-3" /> {contato.telefone_contato}</p>}
                      </div>
                    ))}
                  </div>
                ) : (<p className="text-sm text-muted-foreground text-center py-4">Nenhum contato cadastrado.</p>)}
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building className="h-4 w-4" /> Informações da Empresa</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>CNPJ/CPF:</strong> {customer.cpf_cnpj || 'N/A'}</p>
                  <p><strong>Cód. Cliente:</strong> {customer.codigo_cliente}</p>
                  <p><strong>Tipo:</strong> {customer.tipo_cliente || 'N/A'}</p>
                  <p><strong>Natureza:</strong> {customer.natureza_cliente || 'N/A'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" /> Endereço</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>{customer.endereco || 'N/A'}{customer.numero && `, ${customer.numero}`}</p>
                  <p>{customer.bairro || 'N/A'}</p>
                  <p>{customer.cidade || 'N/A'} - {customer.estado || 'UF'}</p>
                  <p><strong>CEP:</strong> {customer.cep || 'N/A'}</p>
                </CardContent>
              </Card>
              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4" /> Datas</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Data de Cadastro:</strong> {formatDate(customer.cadastro_cliente)}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="oportunidades" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5" /> Oportunidades de Negócio
                </CardTitle>
              </CardHeader>
              <CardContent>
                {oportunidadesLoading ? (
                  <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : oportunidades.length > 0 ? (
                  <div className="space-y-3">
                    {oportunidades.map((opp: any) => (
                      <div key={opp.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-base">{opp.titulo}</h4>
                          <Badge variant={
                            opp.status === 'aberta' ? 'default' :
                              opp.status === 'fechada' ? 'secondary' :
                                'destructive'
                          }>
                            {opp.status}
                          </Badge>
                        </div>
                        {opp.descricao && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {opp.descricao}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span>
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(Number(opp.valor_total) || 0)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            <span>Criado em {opp.created_at && formatDateSafe(opp.created_at, 'dd/MM/yyyy')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma oportunidade cadastrada para este cliente.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="atendimentos" className="mt-0">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Headset className="h-5 w-5" /> Histórico de Atendimentos</CardTitle></CardHeader>
              <CardContent>
                {detalhesLoading ? (
                  <div className="flex justify-center items-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  // CORREÇÃO: Adicionada a tipagem para 'at'
                  <AtendimentosTable atendimentos={detalhes?.atendimentos || []} onRowClick={(at: Atendimento) => alert(`Abrir detalhes do atendimento #${at.id}`)} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tarefas" className="mt-0">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ListChecks className="h-5 w-5" /> Tarefas Relacionadas</CardTitle></CardHeader>
              <CardContent>
                {detalhesLoading ? (
                  <div className="flex justify-center items-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  detalhes && detalhes.tarefas.length > 0 ? (
                    <div className="space-y-2">
                      {detalhes.tarefas.map(task => (
                        <div key={task.id} className="p-3 border rounded-md">
                          <p className="font-semibold">{task.title}</p>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                          <Badge variant="outline" className="mt-1">{task.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa encontrada para os atendimentos deste cliente.</p>
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tabs de WhatsApp dinâmicas */}
          {hasDynamicWhatsApp && whatsappNumbers.map((whatsapp) => (
            <TabsContent key={whatsapp.id} value={`whatsapp-${whatsapp.id}`} className="mt-0">
              <WhatsAppTab
                clienteId={customer.id}
                whatsappNumber={whatsapp.number}
                customerName={customer.nome_fantasia || customer.razao_social || undefined}
                instanceId={whatsapp.id}
              />
            </TabsContent>
          ))}
          {/* Tab fallback */}
          {!hasDynamicWhatsApp && fallbackNumber && (
            <TabsContent value={`whatsapp-fallback`} className="mt-0">
              <WhatsAppTab
                clienteId={customer.id}
                whatsappNumber={fallbackNumber}
                customerName={customer.nome_fantasia || customer.razao_social || undefined}
                instanceId={undefined}
              />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default CustomerDetail;