import React from 'react';
import { useCustomerPosVendas } from '@/hooks/useCustomerPosVendas';
import { useCustomerComments } from '@/hooks/useCustomerComments';
import { useCustomerNotifications } from '@/hooks/useCustomerNotifications';
import { useCustomerSurveys } from '@/hooks/useCustomerSurveys';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import { useCustomerTeams } from '@/hooks/useCustomerTeams';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Phone, Building2, User, FileText, MessageCircle, Bell, BarChart3, Users, Edit, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface CustomerDetailProps {
  name: string;
  cnpj: string;
  phone: string;
  email?: string;
  department?: string | null;
  responsible?: string | null;
  createdAt?: string;
  updatedAt?: string;
  motivo?: string | null;
  origem?: string | null;
  resumo?: string | null;
  anexos?: { filename: string; url: string }[];
  resolucao?: string | null;
  onEdit: () => void;
  onCreateAtendimento: () => void;
  status: string;
  step: number;
  activities: { label: string; date: string; done: boolean }[];
  tab: string;
  onTabChange: (tab: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Resolvido':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Em Análise':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Solicitação':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const CustomerDetail: React.FC<CustomerDetailProps> = ({
  name,
  cnpj,
  phone,
  email,
  department,
  responsible,
  createdAt,
  updatedAt,
  motivo,
  origem,
  resumo,
  anexos,
  resolucao,
  onEdit,
  onCreateAtendimento,
  status,
  step,
  activities,
  tab,
  onTabChange
}) => {
  const { tickets: posVendasTickets, loading: loadingPosVendas } = useCustomerPosVendas(cnpj);
  const [showTicket, setShowTicket] = React.useState<number|null>(null);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="col-span-6 space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-none shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground">{name}</h1>
                  <Badge variant="outline" className={getStatusColor(status)}>
                    {status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {email || 'Não informado'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {phone}
                  </div>
                  {department && (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {department}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button size="sm" onClick={onCreateAtendimento}>
                Novo Atendimento
              </Button>
            </div>
          </div>
          
          {/* Progress Indicator */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progresso do Atendimento</span>
              <span>{Math.round((step / 3) * 100)}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300" 
                style={{ width: `${(step / 3) * 100}%` }} 
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className={step >= 1 ? "text-primary font-medium" : ""}>Solicitação</span>
              <span className={step >= 2 ? "text-primary font-medium" : ""}>Em Análise</span>
              <span className={step >= 3 ? "text-primary font-medium" : ""}>Resolvido</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={onTabChange} className="space-y-6">
        <TabsList className="grid grid-cols-5 lg:grid-cols-10 h-auto p-1 bg-muted/50">
          <TabsTrigger value="Atividades" className="flex items-center gap-2 text-xs">
            <Clock className="h-3 w-3" />
            Atividades
          </TabsTrigger>
          <TabsTrigger value="Pós-Vendas" className="flex items-center gap-2 text-xs">
            <BarChart3 className="h-3 w-3" />
            Pós-Vendas
          </TabsTrigger>
          <TabsTrigger value="Detalhes" className="flex items-center gap-2 text-xs">
            <FileText className="h-3 w-3" />
            Detalhes
          </TabsTrigger>
          <TabsTrigger value="Anexos" className="flex items-center gap-2 text-xs">
            <FileText className="h-3 w-3" />
            Anexos
          </TabsTrigger>
          <TabsTrigger value="Resolução" className="flex items-center gap-2 text-xs">
            <FileText className="h-3 w-3" />
            Resolução
          </TabsTrigger>
          <TabsTrigger value="Comentários" className="flex items-center gap-2 text-xs">
            <MessageCircle className="h-3 w-3" />
            Comentários
          </TabsTrigger>
          <TabsTrigger value="Notificações" className="flex items-center gap-2 text-xs">
            <Bell className="h-3 w-3" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="Pesquisas" className="flex items-center gap-2 text-xs">
            <BarChart3 className="h-3 w-3" />
            Pesquisas
          </TabsTrigger>
          <TabsTrigger value="Responsável" className="flex items-center gap-2 text-xs">
            <User className="h-3 w-3" />
            Responsável
          </TabsTrigger>
          <TabsTrigger value="Equipe" className="flex items-center gap-2 text-xs">
            <Users className="h-3 w-3" />
            Equipe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="Atividades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">Nenhuma atividade encontrada.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className={`w-2 h-2 rounded-full mt-2 ${activity.done ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <div className="flex-1">
                        <p className="font-medium">{activity.label}</p>
                        <p className="text-sm text-muted-foreground">{activity.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="Pós-Vendas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Tickets de Pós-Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPosVendas ? (
                <p className="text-muted-foreground text-center py-6">Carregando tickets...</p>
              ) : showTicket === null ? (
                <div className="space-y-3">
                  {posVendasTickets.length === 0 ? (
                    <p className="text-muted-foreground text-center py-6">Nenhum ticket de pós-venda encontrado.</p>
                  ) : (
                    posVendasTickets.map((ticket) => (
                      <div 
                        key={ticket.id} 
                        className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors" 
                        onClick={() => setShowTicket(ticket.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <h4 className="font-semibold">{ticket.summary || 'Ticket sem título'}</h4>
                            <p className="text-sm text-muted-foreground">{ticket.final_analysis || 'Sem análise'}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ''}</span>
                              <Badge variant="outline">
                                {ticket.status || 'Sem status'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                (() => {
                  const ticket = posVendasTickets.find(t => t.id === showTicket);
                  if (!ticket) return null;
                  return (
                    <div className="space-y-4">
                      <Button variant="ghost" size="sm" onClick={() => setShowTicket(null)}>
                        ← Voltar para lista
                      </Button>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">{ticket.summary || 'Ticket sem título'}</h3>
                          <Badge variant="outline">{ticket.status || 'Sem status'}</Badge>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Análise Final</h4>
                            <p className="text-sm text-muted-foreground">{ticket.final_analysis || 'Sem análise'}</p>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Detalhes da Resolução</h4>
                            <p className="text-sm text-muted-foreground">{ticket.resolution_details || 'Sem detalhes'}</p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Criado em: {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'Data não disponível'}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="Detalhes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informações Detalhadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                    <p className="text-sm mt-1">{name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="text-sm mt-1">{email || 'Não informado'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
                    <p className="text-sm mt-1">{phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className={getStatusColor(status)}>
                        {status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Motivo</Label>
                    <p className="text-sm mt-1">{motivo || 'Não informado'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Departamento</Label>
                    <p className="text-sm mt-1">{department || 'Não informado'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Responsável</Label>
                    <p className="text-sm mt-1">{responsible || 'Não atribuído'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Origem</Label>
                    <p className="text-sm mt-1">{origem || 'Não informado'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Criado em</Label>
                    <p className="text-sm mt-1">{createdAt ? new Date(createdAt).toLocaleString() : 'Não disponível'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Atualizado em</Label>
                    <p className="text-sm mt-1">{updatedAt ? new Date(updatedAt).toLocaleString() : 'Não disponível'}</p>
                  </div>
                </div>
              </div>
              {resumo && (
                <div className="mt-6">
                  <Label className="text-sm font-medium text-muted-foreground">Resumo</Label>
                  <p className="text-sm mt-2 p-3 bg-muted/50 rounded-lg">{resumo}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="Anexos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Anexos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {anexos && anexos.length > 0 ? (
                <div className="space-y-2">
                  {anexos.map((attachment, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline font-medium"
                      >
                        {attachment.filename}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6">Nenhum anexo encontrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="Resolução" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resolução
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resolucao ? (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm">{resolucao}</p>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6">Nenhuma resolução cadastrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="Comentários" className="space-y-4">
          {(() => {
            const { comments, loading } = useCustomerComments(Number(cnpj));
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Comentários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground text-center py-6">Carregando...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-6">Nenhum comentário encontrado.</p>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div key={comment.id} className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{comment.author_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        <TabsContent value="Notificações" className="space-y-4">
          {(() => {
            const { notifications, loading } = useCustomerNotifications(Number(cnpj));
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notificações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground text-center py-6">Carregando...</p>
                  ) : notifications.length === 0 ? (
                    <p className="text-muted-foreground text-center py-6">Nenhuma notificação encontrada.</p>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div key={notification.id} className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{notification.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(notification.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm">{notification.message}</p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        <TabsContent value="Pesquisas" className="space-y-4">
          {(() => {
            const { surveys, loading } = useCustomerSurveys(email || null);
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Pesquisas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground text-center py-6">Carregando...</p>
                  ) : surveys.length === 0 ? (
                    <p className="text-muted-foreground text-center py-6">Nenhuma pesquisa encontrada.</p>
                  ) : (
                    <div className="space-y-3">
                      {surveys.map((survey) => (
                        <div key={survey.id} className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{survey.client_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(survey.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span>NPS: {survey.nps_score ?? 'N/A'}</span>
                            <span>CSAT: {survey.csat_score ?? 'N/A'}</span>
                          </div>
                          {survey.feedback_comment && (
                            <p className="text-sm text-muted-foreground">{survey.feedback_comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        <TabsContent value="Responsável" className="space-y-4">
          {(() => {
            const { profile, loading } = useCustomerProfile(responsible || null);
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Responsável
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground text-center py-6">Carregando...</p>
                  ) : !profile ? (
                    <p className="text-muted-foreground text-center py-6">Nenhum responsável encontrado.</p>
                  ) : (
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(profile.full_name || 'N/A')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="font-medium">{profile.full_name}</p>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                        {profile.funcao && (
                          <p className="text-sm text-muted-foreground">{profile.funcao}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        <TabsContent value="Equipe" className="space-y-4">
          {(() => {
            const { teams, loading } = useCustomerTeams(responsible || null);
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Equipe
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground text-center py-6">Carregando...</p>
                  ) : teams.length === 0 ? (
                    <p className="text-muted-foreground text-center py-6">Nenhuma equipe encontrada.</p>
                  ) : (
                    <div className="space-y-3">
                      {teams.map((team) => (
                        <div key={team.id} className="p-4 border rounded-lg">
                          <span className="font-medium text-sm">{team.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerDetail;