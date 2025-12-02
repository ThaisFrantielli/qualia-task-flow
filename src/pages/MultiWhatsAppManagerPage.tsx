import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  QrCode, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Power,
  RefreshCw,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppInstance {
  instanceId: string;
  isConnected: boolean;
  connectedNumber: string | null;
  hasQRCode: boolean;
}

const WHATSAPP_SERVICE_URL = 'http://localhost:3006';

export default function MultiWhatsAppManagerPage() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstanceType, setNewInstanceType] = useState('');
  const [newInstancePhone, setNewInstancePhone] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const { toast } = useToast();

  const fetchInstances = async () => {
    try {
      console.log('Fetching WhatsApp instances from local service...');
      // Use WhatsApp service API directly since Supabase types are not up to date
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/instances`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const serviceData = await response.json();
      console.log('Instances fetched:', serviceData);
      setInstances(serviceData.instances || []);
    } catch (error) {
      console.error('Error fetching WhatsApp instances:', error);
      setInstances([]);
    } finally {
      setIsLoading(false);
    }
  };

    const createInstance = async () => {
    if (!newInstanceName.trim() || !newInstanceType.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setIsCreatingInstance(true);
      console.log('Creating new WhatsApp instance:', { 
        instance_name: newInstanceName,
        instance_type: newInstanceType,
        phone_number: newPhoneNumber
      });

      // Create instance via WhatsApp service
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/instances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceId: newInstanceName,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Instance created:', result);
      
      setNewInstanceName('');
      setNewInstanceType('');
      setNewPhoneNumber('');
      
      // Refresh the instances list
      await fetchInstances();
      
      alert('Instância criada com sucesso!');
    } catch (error) {
      console.error('Error creating WhatsApp instance:', error);
      alert('Erro ao criar instância: ' + error);
    } finally {
      setIsCreatingInstance(false);
    }
  };

  const disconnectInstance = async (instanceId: string, instanceName: string) => {
    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/instances/${instanceId}/disconnect`, {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: "WhatsApp desconectado",
          description: `Instância ${instanceName} foi desconectada com sucesso.`,
        });
        
        setTimeout(() => {
          fetchInstances();
        }, 1000);
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: `Falha ao desconectar a instância ${instanceName}`,
        variant: "destructive"
      });
    }
  };

  const resetSession = async (instanceId: string, instanceName: string) => {
    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/instances/${instanceId}/reset`, {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: "Sessão reiniciada",
          description: `Novo QR code será gerado para ${instanceName}`,
        });
        
        setTimeout(() => {
          fetchInstances();
        }, 2000);
      } else {
        throw new Error('Failed to reset session');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: `Falha ao reiniciar sessão para ${instanceName}`,
        variant: "destructive"
      });
    }
  };

  const showQRCode = async (instance: WhatsAppInstance) => {
    try {
      // Get QR code from API
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/instances/${instance.instanceId}/qr`);
      if (!response.ok) {
        alert('Erro ao obter QR Code. Tente gerar um novo QR.');
        return;
      }
      
      const data = await response.json();
      if (data.qr) {
        // Create a new window with the QR code
        const qrWindow = window.open('', 'qrcode', 'width=500,height=600');
        if (qrWindow) {
          qrWindow.document.write(`
            <html>
              <head><title>QR Code - ${instance.instanceId}</title></head>
              <body style="margin:0;padding:20px;background-color:#f0f0f0;">
                <h2>${instance.instanceId}</h2>
                <div style="background-color:white;padding:20px;border-radius:8px;text-align:center;">
                  <p style="margin-bottom:20px;">Escaneie este QR Code com seu WhatsApp:</p>
                  <div id="qrcode"></div>
                  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
                  <script>
                    document.addEventListener('DOMContentLoaded', function() {
                      QRCode.toCanvas(document.getElementById('qrcode'), '${data.qr}', {
                        width: 256,
                        margin: 2,
                        color: {
                          dark: '#000000',
                          light: '#FFFFFF'
                        }
                      });
                    });
                  </script>
                </div>
              </body>
            </html>
          `);
          qrWindow.document.close();
        }
      } else {
        alert('QR Code não disponível. Tente gerar um novo QR.');
      }
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      alert('Erro ao obter QR Code.');
    }
  };

  useEffect(() => {
    fetchInstances();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('whatsapp_config_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'whatsapp_config' },
        (payload) => {
          console.log('Real-time update:', payload);
          fetchInstances();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando instâncias...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciador Multi-WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie múltiplas instâncias do WhatsApp - inspirado no sistema Eloca
          </p>
        </div>
      </div>

      {/* Create New Instance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova Instância WhatsApp
          </CardTitle>
          <CardDescription>
            Crie uma nova instância para conectar outro número do WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="instanceName">Nome da Instância</Label>
              <Input
                id="instanceName"
                placeholder="Ex: WhatsApp Vendas"
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="instancePhone">Número do Telefone</Label>
              <Input
                id="instancePhone"
                placeholder="Ex: 5561999999999"
                value={newInstancePhone}
                onChange={(e) => setNewInstancePhone(e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={createInstance} 
            disabled={isCreatingInstance}
            className="w-full md:w-auto"
          >
            {isCreatingInstance ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Criar Instância
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Instances Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {instances.map((instance) => (
          <Card key={instance.instanceId} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {instance.instanceId}
                </CardTitle>
                <Badge 
                  variant={instance.isConnected ? "default" : "secondary"}
                  className={instance.isConnected ? "bg-green-500" : "bg-gray-500"}
                >
                  {instance.isConnected ? "Conectado" : "Desconectado"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connection Status */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <div className="flex items-center gap-2">
                  {instance.isConnected ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">Online</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span className="text-orange-600">Offline</span>
                    </>
                  )}
                </div>
              </div>

              {/* Connected Number */}
              {instance.connectedNumber && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Número:</span>
                  <span className="font-mono">{instance.connectedNumber}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                {!instance.isConnected && instance.hasQRCode && (
                  <Button 
                    onClick={() => showQRCode(instance)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Escanear QR CODE
                  </Button>
                )}
                
                {!instance.isConnected && !instance.hasQRCode && (
                  <Button 
                    onClick={() => resetSession(instance.instanceId, instance.instanceId)}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Gerar QR Code
                  </Button>
                )}

                {instance.isConnected && (
                  <Button 
                    onClick={() => disconnectInstance(instance.instanceId, instance.instanceId)}
                    variant="destructive"
                    className="w-full"
                  >
                    <Power className="mr-2 h-4 w-4" />
                    Desconectar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {instances.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma instância encontrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie sua primeira instância do WhatsApp para começar
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}