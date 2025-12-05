import type { ClienteComContatos, Contato } from '@/types';
import { useClienteDetail } from '@/hooks/useClienteDetail';
import { useWhatsAppNumbers } from '@/hooks/useWhatsAppNumbers';
import { useTickets } from '@/hooks/useTickets';
import { useClienteStats } from '@/hooks/useClienteStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Building,
  User,
  Mail,
  Phone,
  Edit,
  Trash2,
  MapPin,
  MessageCircle,
  Info,
  History,
  DollarSign,
} from 'lucide-react';
import { WhatsAppTab } from './WhatsAppTab';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { CustomerSummaryCards } from './CustomerSummaryCards';
import { CustomerQuickActions } from './CustomerQuickActions';
import { CustomerTimeline } from './CustomerTimeline';
import { TicketCard } from '@/components/tickets/TicketCard';

interface CustomerDetailRedesignProps {
  customer: ClienteComContatos;
  onEdit: () => void;
  onDelete: () => void;
}

export function CustomerDetailRedesign({
  customer,
  onEdit,
  onDelete,
}: CustomerDetailRedesignProps) {
  useClienteDetail(customer);
  const { numbers: whatsappNumbers, loading: whatsappLoading } = useWhatsAppNumbers();
  const { data: tickets, isLoading: ticketsLoading } = useTickets({ cliente_id: customer.id });
  const { data: stats, isLoading: statsLoading } = useClienteStats(customer.id);
  const hasDynamicWhatsApp = !whatsappLoading && whatsappNumbers.length > 0;

  const fallbackNumberRaw =
    (customer as any)?.whatsapp_number ||
    (customer as any)?.telefone ||
    (customer?.cliente_contatos && customer.cliente_contatos[0]?.telefone_contato) ||
    null;
  const fallbackNumber = fallbackNumberRaw ? String(fallbackNumberRaw) : null;

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
    },
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="bg-card rounded-lg border h-full flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0">
              {getInitials(customer.nome_fantasia || customer.razao_social)}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground truncate">
                {customer.nome_fantasia || customer.razao_social}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {customer.cpf_cnpj && <span>{customer.cpf_cnpj}</span>}
                {customer.situacao && (
                  <Badge variant="outline" className="text-xs">
                    {customer.situacao}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <CustomerQuickActions
            clienteId={customer.id}
            whatsappNumber={fallbackNumber}
          />
        </div>

        {/* Summary Cards */}
        <div className="mt-3">
          <CustomerSummaryCards stats={stats} loading={statsLoading} />
        </div>
      </div>

      {/* Simplified Tabs */}
      <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-3 bg-muted/50">
          <TabsTrigger value="info" className="text-xs">
            <Info className="h-3.5 w-3.5 mr-1.5" />
            Informações
          </TabsTrigger>
          <TabsTrigger value="historico" className="text-xs">
            <History className="h-3.5 w-3.5 mr-1.5" />
            Histórico
          </TabsTrigger>
          {(hasDynamicWhatsApp || fallbackNumber) && (
            <TabsTrigger value="conversas" className="text-xs">
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
              Conversas
            </TabsTrigger>
          )}
          <TabsTrigger value="negocios" className="text-xs">
            <DollarSign className="h-3.5 w-3.5 mr-1.5" />
            Negócios
            {oportunidades.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {oportunidades.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Info Tab */}
          <TabsContent value="info" className="mt-0 space-y-4">
            {/* Contacts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contatos
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {customer.cliente_contatos && customer.cliente_contatos.length > 0 ? (
                  <div className="space-y-2">
                    {customer.cliente_contatos.map((contato: Contato) => (
                      <div key={contato.id} className="p-2 bg-muted/50 rounded-md text-sm">
                        <p className="font-medium">{contato.nome_contato}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs mt-1">
                          {contato.email_contato && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {contato.email_contato}
                            </span>
                          )}
                          {contato.telefone_contato && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {contato.telefone_contato}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhum contato cadastrado.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Company Info & Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Razão Social:</span>{' '}
                    {customer.razao_social || 'N/A'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Cód:</span>{' '}
                    {customer.codigo_cliente}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Tipo:</span>{' '}
                    {customer.tipo_cliente || 'N/A'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Natureza:</span>{' '}
                    {customer.natureza_cliente || 'N/A'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-1 text-sm">
                  <p>
                    {customer.endereco || 'N/A'}
                    {customer.numero && `, ${customer.numero}`}
                  </p>
                  <p>{customer.bairro || ''}</p>
                  <p>
                    {customer.cidade || ''} {customer.estado && `- ${customer.estado}`}
                  </p>
                  <p>
                    <span className="text-muted-foreground">CEP:</span>{' '}
                    {customer.cep || 'N/A'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="historico" className="mt-0">
            <CustomerTimeline customer={customer} />
          </TabsContent>

          {/* Conversations Tab */}
          <TabsContent value="conversas" className="mt-0">
            {hasDynamicWhatsApp ? (
              <div className="space-y-4">
                {whatsappNumbers.map((whatsapp) => (
                  <div key={whatsapp.id}>
                    <h4 className="text-sm font-medium mb-2">{whatsapp.displayName}</h4>
                    <WhatsAppTab
                      clienteId={customer.id}
                      whatsappNumber={whatsapp.number}
                      customerName={customer.nome_fantasia || customer.razao_social || undefined}
                      instanceId={whatsapp.id}
                    />
                  </div>
                ))}
              </div>
            ) : fallbackNumber ? (
              <WhatsAppTab
                clienteId={customer.id}
                whatsappNumber={fallbackNumber}
                customerName={customer.nome_fantasia || customer.razao_social || undefined}
                instanceId={undefined}
              />
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum canal de conversa disponível.
              </p>
            )}
          </TabsContent>

          {/* Business Tab */}
          <TabsContent value="negocios" className="mt-0 space-y-4">
            {/* Opportunities */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Oportunidades</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {oportunidadesLoading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : oportunidades.length > 0 ? (
                  <div className="space-y-2">
                    {oportunidades.map((opp: any) => (
                      <div
                        key={opp.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{opp.titulo}</span>
                          <Badge
                            variant={opp.status === 'aberta' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {opp.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(Number(opp.valor_total) || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma oportunidade.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Tickets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Tickets</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {ticketsLoading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : tickets && tickets.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {tickets.slice(0, 5).map((ticket) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        onClick={() => window.open(`/tickets/${ticket.id}`, '_blank')}
                      />
                    ))}
                    {tickets.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        +{tickets.length - 5} tickets
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum ticket.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
