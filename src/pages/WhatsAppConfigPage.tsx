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
import { supabase } from '@/lib/supabase';

interface WhatsAppConfig {
  id: string;
  qr_code: string | null;
  is_connected: boolean;
  connected_number: string | null;
  last_connection_at: string | null;
}

const WHATSAPP_SERVICE_URL = 'http://localhost:3005';

export default function WhatsAppConfigPage() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { toast } = useToast();

  const fetchWhatsAppConfig = async () => {
    try {
      console.log('Fetching WhatsApp config from Supabase...');
      // Using type assertion to handle table that might not be in generated types
      const { data, error } = await (supabase as any)
        .from('whatsapp_config')
        .select('*')
        .eq('id', 'default')
        .single();

      console.log('Supabase response:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching WhatsApp config:', error);
        return;
      }

      console.log('Setting config:', data);
      setConfig(data || null);
    } catch (error) {
      console.error('Error fetching WhatsApp config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkServiceStatus = async () => {
    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/status`);
      const data = await response.json();
      
      // Update local state with service status
      if (config) {
        setConfig({
          ...config,
          is_connected: data.isConnected,
          connected_number: data.connectedNumber
        });
      }
    } catch (error) {
      console.error('WhatsApp service not reachable:', error);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/disconnect`, {
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

  useEffect(() => {
    fetchWhatsAppConfig();
    checkServiceStatus();

    // Auto-refresh every 30 seconds to get updated QR codes
    const interval = setInterval(() => {
      if (!config?.is_connected) {
        fetchWhatsAppConfig();
      }
      checkServiceStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Real-time subscription for config changes
  useEffect(() => {
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
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
            {config?.qr_code && !config?.is_connected ? (
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
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Serviço WhatsApp deve estar rodando</p>
              <p className="text-sm text-muted-foreground">
                Certifique-se de que o serviço WhatsApp está ativo na porta 3005
              </p>
            </div>
          </div>
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