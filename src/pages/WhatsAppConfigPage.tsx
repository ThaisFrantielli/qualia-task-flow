import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  QrCode, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Power,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WHATSAPP } from '@/integrations/whatsapp/config';

interface WhatsAppConfig {
  id: string;
  qr_code: string | null;
  is_connected: boolean;
  connected_number: string | null;
  last_connection_at: string | null;
}

const SERVICE_URL = WHATSAPP.SERVICE_URL;

export default function WhatsAppConfigPage() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [serviceOnline, setServiceOnline] = useState(false);
  const { toast } = useToast();

  const fetchWhatsAppConfig = async () => {
    try {
      console.log('Fetching WhatsApp config from Supabase...');
      // Use secure RPC because direct reads on `whatsapp_config` are blocked by RLS
      const { data, error } = await (supabase as any).rpc('check_whatsapp_status');

      console.log('RPC response:', { data, error });

      if (error) {
        // Friendly handling for permission / RLS errors
        if (error?.status === 403 || /RLS|policy|permission|forbidden/i.test(error.message || '')) {
          toast({ title: 'Permissão negada', description: 'Você não tem permissão para visualizar o status do WhatsApp', variant: 'destructive' });
          setConfig(null);
          return;
        }
        console.error('Error fetching WhatsApp status via RPC:', error);
        return;
      }

      // The RPC returns a compact text/status. Map it minimally to the config shape.
      const statusText = data as any;
      const isConnected = String(statusText).toLowerCase().includes('connected') || String(statusText).toLowerCase().includes('conectado');
      setConfig(prev => prev ? ({ ...prev, is_connected: isConnected }) : {
        id: 'default',
        qr_code: null,
        is_connected: isConnected,
        connected_number: null,
        last_connection_at: null
      });
    } catch (error) {
      console.error('Error fetching WhatsApp config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkServiceStatus = async () => {
    try {
      const response = await fetch(`${SERVICE_URL}/status`);
      const data = await response.json();
      
      setServiceOnline(true);
      
      // Update local state with service status
      if (config) {
        setConfig({
          ...config,
          is_connected: data.isConnected,
          connected_number: data.connectedNumber
        });
      }

      // Always fetch QR directly from service when not connected
      if (!data.isConnected) {
        try {
          const qrRes = await fetch(`${SERVICE_URL}/qr-code`);
          if (qrRes.ok) {
            const qrData = await qrRes.json();
            console.log('QR Code from service:', qrData);
            
            if (qrData?.qrCode) {
              setConfig(prev => prev ? { ...prev, qr_code: qrData.qrCode } : {
                id: 'default',
                qr_code: qrData.qrCode,
                is_connected: false,
                connected_number: null,
                last_connection_at: null
              });
              console.log('QR Code updated in state');
            }
          }
        } catch (e) {
          console.log('No QR available yet from service');
        }
      }
    } catch (error) {
      console.error('WhatsApp service not reachable:', error);
      setServiceOnline(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch(`${SERVICE_URL}/disconnect`, {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: "WhatsApp desconectado",
          description: "Sua sessão do WhatsApp foi encerrada com sucesso.",
        });
        
        // Refresh config after disconnect
        setTimeout(() => {
          fetchWhatsAppConfig();
          checkServiceStatus();
        }, 1000);
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      toast({
        title: "Erro ao desconectar",
        description: "Ocorreu um erro ao tentar desconectar o WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchWhatsAppConfig();
    checkServiceStatus();
  };

  const handleForceNewQR = async () => {
    try {
      const res = await fetch(`${SERVICE_URL}/reset-session`, { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao resetar sessão');
      toast({ title: 'Novo QR solicitado', description: 'Um novo QR Code será gerado em instantes.' });
      setTimeout(() => {
        fetchWhatsAppConfig();
        checkServiceStatus();
      }, 1500);
    } catch (e) {
      toast({ title: 'Erro ao gerar QR', description: 'Não foi possível solicitar novo QR.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchWhatsAppConfig();
    checkServiceStatus();

    // Polling agressivo nos primeiros 2 minutos (a cada 3 segundos)
    let fastInterval: NodeJS.Timeout | null = setInterval(() => {
      if (!config?.is_connected) {
        checkServiceStatus();
      }
    }, 3000);

    // Após 2 minutos, mudar para polling normal (a cada 15 segundos)
    const switchToNormalPolling = setTimeout(() => {
      if (fastInterval) {
        clearInterval(fastInterval);
        fastInterval = null;
      }
      
      const normalInterval = setInterval(() => {
        if (!config?.is_connected) {
          checkServiceStatus();
        }
      }, 15000);
      
      return () => clearInterval(normalInterval);
    }, 120000); // 2 minutos

    return () => {
      if (fastInterval) clearInterval(fastInterval);
      clearTimeout(switchToNormalPolling);
    };
  }, []);

  // Real-time subscription for config changes
  useEffect(() => {
    let channel: any = null;
    try {
      channel = supabase
        .channel('whatsapp-config-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'whatsapp_config',
            filter: 'id=eq.default'
          },
          (payload) => {
            console.log('WhatsApp config updated:', payload);
            setConfig(payload.new as WhatsAppConfig);
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription to whatsapp_config not permitted or failed:', e);
      channel = null;
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuração WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie a conexão do seu WhatsApp com o sistema
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Service Status Alert */}
      {!serviceOnline && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="font-semibold text-amber-900">Serviço WhatsApp não está rodando</p>
                <p className="text-sm text-amber-800">
                  O serviço local do WhatsApp em {SERVICE_URL} não está disponível. Para conectar o WhatsApp, inicie o serviço primeiro.
                </p>
                <div className="mt-3 p-3 bg-white rounded border border-amber-200">
                  <p className="text-xs font-semibold text-amber-900 mb-2">🚀 Iniciar Serviço WhatsApp:</p>
                  
                  <div className="space-y-3">
                    {/* Opção 1: Scripts prontos */}
                    <div className="p-2 bg-green-50 rounded border border-green-200">
                      <p className="text-xs font-semibold text-green-800 mb-1">✨ MAIS FÁCIL - Use os scripts prontos:</p>
                      <div className="text-xs text-green-700 space-y-1">
                        <p><strong>Windows:</strong> Clique duas vezes em <code className="bg-green-100 px-1 rounded">INICIAR_SERVICO.bat</code></p>
                        <p><strong>Linux/Mac:</strong> Execute <code className="bg-green-100 px-1 rounded">./iniciar-servico.sh</code></p>
                      </div>
                    </div>

                    {/* Opção 2: Comandos manuais */}
                    <div>
                      <p className="text-xs text-amber-900 mb-1">📝 Ou copie e cole no terminal:</p>
                      <code className="text-xs block bg-gray-900 text-green-400 p-2 rounded">
                        cd whatsapp-service<br/>
                        npm install<br/>
                        npm start
                      </code>
                      
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText('cd whatsapp-service && npm install && npm start');
                          toast({
                            title: "Comandos copiados! 📋",
                            description: "Cole no terminal para iniciar o serviço WhatsApp",
                          });
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
                      >
                        📋 Copiar comandos
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs text-blue-700 font-medium">
                      ⚡ O QR Code aparecerá <strong>automaticamente</strong> aqui em 3-5 segundos!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Status da Conexão
            </CardTitle>
            <CardDescription>
              Estado atual da conexão com o WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              {config?.is_connected ? (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Desconectado
                </Badge>
              )}
            </div>

            {config?.connected_number && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Número:</span>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  +{config.connected_number}
                </code>
              </div>
            )}

            {config?.last_connection_at && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Última conexão:</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(config.last_connection_at).toLocaleString('pt-BR')}
                </span>
              </div>
            )}

            <Separator />

            {config?.is_connected ? (
              <Button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                variant="destructive"
                className="w-full"
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Power className="h-4 w-4 mr-2" />
                )}
                Desconectar WhatsApp
              </Button>
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Para conectar, escaneie o QR Code ao lado com seu WhatsApp
                </p>
                <Badge variant="outline">
                  Aguardando conexão...
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code de Conexão
            </CardTitle>
            <CardDescription>
              Escaneie este código com seu WhatsApp para conectar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!serviceOnline ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Serviço Offline
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Inicie o serviço WhatsApp para gerar um novo QR Code.
                  O QR Code será atualizado automaticamente a cada 30 segundos.
                </p>
              </div>
            ) : config?.qr_code && !config?.is_connected ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-lg shadow-sm border">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(config.qr_code)}`}
                    alt="QR Code WhatsApp"
                    className="w-48 h-48"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">Como conectar:</p>
                  <ol className="text-xs text-muted-foreground space-y-1 text-left">
                    <li>1. Abra o WhatsApp no seu celular</li>
                    <li>2. Toque em "Dispositivos vinculados"</li>
                    <li>3. Toque em "Vincular um dispositivo"</li>
                    <li>4. Aponte a câmera para este QR Code</li>
                  </ol>
                </div>
                <Badge variant="outline" className="animate-pulse">
                  QR Code expira em alguns minutos
                </Badge>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(`${SERVICE_URL}/qr-view`, '_blank')}>Abrir QR em nova aba</Button>
                  <Button variant="secondary" size="sm" onClick={handleForceNewQR}>Forçar novo QR</Button>
                </div>
              </div>
            ) : config?.is_connected ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-green-700 mb-2">
                  WhatsApp Conectado!
                </h3>
                <p className="text-sm text-muted-foreground text-center">
                  Seu WhatsApp está conectado e funcionando corretamente.
                  Você pode agora enviar e receber mensagens pelo sistema.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <QrCode className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Aguardando QR Code
                </h3>
                <p className="text-sm text-muted-foreground text-center">
                  Inicie o serviço WhatsApp para gerar um novo QR Code.
                  O código aparecerá aqui automaticamente.
                </p>
                {serviceOnline && (
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(`${SERVICE_URL}/qr-view`, '_blank')}>Abrir QR em nova aba</Button>
                    <Button variant="secondary" size="sm" onClick={handleForceNewQR}>Forçar novo QR</Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Instruções Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            {serviceOnline ? (
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium">
                Serviço WhatsApp: {serviceOnline ? 'Online ✓' : 'Offline ✗'}
              </p>
              <p className="text-sm text-muted-foreground">
                {serviceOnline 
                  ? 'O serviço está ativo e pronto para conexão'
                  : 'Inicie o serviço na porta 3005 para conectar o WhatsApp'
                }
              </p>
            </div>
          </div>
          
          {!serviceOnline && (
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Scripts de inicialização prontos</p>
                <p className="text-sm text-muted-foreground">
                  <strong>Windows:</strong> Execute <code className="text-xs bg-muted px-1 rounded">INICIAR_SERVICO.bat</code> na pasta whatsapp-service<br/>
                  <strong>Linux/Mac:</strong> Execute <code className="text-xs bg-muted px-1 rounded">./iniciar-servico.sh</code> na pasta whatsapp-service
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Apenas um dispositivo por vez</p>
              <p className="text-sm text-muted-foreground">
                O WhatsApp permite apenas uma sessão ativa por número
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Conexão segura</p>
              <p className="text-sm text-muted-foreground">
                Todas as mensagens são criptografadas end-to-end pelo WhatsApp
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}