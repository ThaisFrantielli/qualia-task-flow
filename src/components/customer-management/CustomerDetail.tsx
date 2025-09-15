import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Mail, 
  Phone, 
  User, 
  Edit, 
  Clock, 
  FileText,
  MessageCircle,
  Activity,
  Plus,
  Trash2
} from 'lucide-react';

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
      return 'bg-green-50 text-green-700 border-green-200';
    case 'Em Análise':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'Solicitação':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const CustomerDetail: React.FC<CustomerDetailProps> = ({
  name,
  phone,
  email,
  department,
  createdAt,
  updatedAt,
  motivo,
  origem,
  resumo,
  anexos,
  resolucao,
  onEdit,
  status,
  activities,
  tab,
  onTabChange
}) => {
  const [newActivity, setNewActivity] = useState({
    subject: '',
    type: 'Call',
    date: '',
    time: '',
    location: '',
    description: ''
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleCreateActivity = () => {
    console.log('Creating activity:', newActivity);
    // Reset form
    setNewActivity({
      subject: '',
      type: 'Call',
      date: '',
      time: '',
      location: '',
      description: ''
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="bg-card rounded-lg border h-full flex flex-col">
      {/* Customer Header */}
      <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-secondary/5">
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
                {email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{email}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4 border-b">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Progresso do Atendimento</span>
            <span className="text-muted-foreground">
              {status === 'Resolvido' ? '100%' : status === 'Em Análise' ? '50%' : '25%'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                status === 'Resolvido' ? 'bg-green-500 w-full' : 
                status === 'Em Análise' ? 'bg-yellow-500 w-1/2' : 
                'bg-blue-500 w-1/4'
              }`}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Solicitação</span>
            <span>Em Análise</span>
            <span>Resolvido</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={tab} onValueChange={onTabChange} className="h-full flex flex-col">
          <TabsList className="mx-6 mt-4 grid w-full grid-cols-5">
            <TabsTrigger value="Atividades">Atividades</TabsTrigger>
            <TabsTrigger value="Detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="Nova Atividade">Nova Atividade</TabsTrigger>
            <TabsTrigger value="Anexos">Anexos</TabsTrigger>
            <TabsTrigger value="Histórico">Histórico</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Activities Tab */}
            <TabsContent value="Atividades" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Atividades Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.length > 0 ? (
                    <div className="space-y-4">
                      {activities.map((activity, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                          <div className={`w-3 h-3 rounded-full ${activity.done ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <div className="flex-1">
                            <p className="font-medium">{activity.label}</p>
                            <p className="text-sm text-muted-foreground">{activity.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma atividade encontrada</h3>
                      <p className="text-muted-foreground">Crie uma nova atividade para começar</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="Detalhes" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Informações do Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Nome</Label>
                      <p className="text-sm">{name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-sm">{email || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
                      <p className="text-sm">{phone || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Departamento</Label>
                      <p className="text-sm">{department || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Detalhes do Atendimento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Motivo</Label>
                      <p className="text-sm">{motivo || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Origem</Label>
                      <p className="text-sm">{origem || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Criado em</Label>
                      <p className="text-sm">{formatDate(createdAt)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Atualizado em</Label>
                      <p className="text-sm">{formatDate(updatedAt)}</p>
                    </div>
                  </CardContent>
                </Card>

                {resumo && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        Resumo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed">{resumo}</p>
                    </CardContent>
                  </Card>
                )}

                {resolucao && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Resolução
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed">{resolucao}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* New Activity Tab */}
            <TabsContent value="Nova Atividade" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Nova Atividade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="subject">Assunto</Label>
                      <Input
                        id="subject"
                        value={newActivity.subject}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Digite o assunto da atividade"
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Tipo</Label>
                      <Select 
                        value={newActivity.type} 
                        onValueChange={(value) => setNewActivity(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Call">Call</SelectItem>
                          <SelectItem value="Email">Email</SelectItem>
                          <SelectItem value="Encontro">Encontro</SelectItem>
                          <SelectItem value="Texto">Texto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="date">Data</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newActivity.date}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="time">Horário</Label>
                      <Input
                        id="time"
                        type="time"
                        value={newActivity.time}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, time: e.target.value }))}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="location">Localização</Label>
                      <Input
                        id="location"
                        value={newActivity.location}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Digite a localização (opcional)"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={newActivity.description}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Adicione detalhes sobre a atividade (opcional)"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setNewActivity({
                        subject: '',
                        type: 'Call',
                        date: '',
                        time: '',
                        location: '',
                        description: ''
                      })}
                    >
                      Limpar
                    </Button>
                    <Button onClick={handleCreateActivity}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Atividade
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Anexos Tab */}
            <TabsContent value="Anexos" className="mt-0">
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
                      {anexos.map((anexo, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{anexo.filename}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">Nenhum anexo encontrado</h3>
                      <p className="text-muted-foreground">Anexos aparecerão aqui quando adicionados</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Histórico Tab */}
            <TabsContent value="Histórico" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Histórico de Alterações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Histórico vazio</h3>
                    <p className="text-muted-foreground">O histórico de alterações aparecerá aqui</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerDetail;