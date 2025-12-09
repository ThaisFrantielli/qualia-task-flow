import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
    CheckCircle,
    AlertCircle,
    Loader2,
    Trash2,
    RefreshCw,
    Smartphone
} from 'lucide-react';
import { WHATSAPP } from '@/integrations/whatsapp/config';

interface WhatsAppInstance {
    id: string;
    name: string;
    status: string;
    qr_code: string | null;
    phone_number: string | null;
    updated_at: string;
}

interface WhatsAppInstanceCardProps {
    instance: WhatsAppInstance;
    onRefresh: () => void;
    onDelete: (id: string) => void;
}

const SERVICE_URL = WHATSAPP.SERVICE_URL;

export function WhatsAppInstanceCard({ instance, onRefresh, onDelete }: WhatsAppInstanceCardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [qrExpired, setQrExpired] = useState(false);
    const [timeLeft, setTimeLeft] = useState(40);
    const { toast } = useToast();

    // Poll for QR code when instance is not connected
    useEffect(() => {
        if (instance.status === 'connected' || instance.qr_code) {
            return;
        }

        const pollQRCode = async () => {
            try {
                const response = await fetch(`${SERVICE_URL}/instances/${instance.id}/qr`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.qrCode) {
                        // QR code found, trigger refresh to update UI
                        onRefresh();
                    }
                }
            } catch (error) {
                console.error('Error polling QR code:', error);
            }
        };

        // Poll immediately
        pollQRCode();

        // Then poll every 2 seconds
        const interval = setInterval(pollQRCode, 2000);

        return () => clearInterval(interval);
    }, [instance.id, instance.status, instance.qr_code, onRefresh]);

    useEffect(() => {
        if (!instance.qr_code || !instance.updated_at) {
            setQrExpired(false);
            setTimeLeft(40);
            return;
        }

        const createdAt = new Date(instance.updated_at).getTime();
        if (Number.isNaN(createdAt)) {
            setQrExpired(false);
            setTimeLeft(40);
            return;
        }

        const updateTimer = () => {
            const elapsed = (Date.now() - createdAt) / 1000;
            const remaining = Math.max(0, 40 - Math.floor(elapsed));
            setTimeLeft(remaining);
            setQrExpired(remaining <= 0);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [instance.qr_code, instance.updated_at]);

    const isConnected = instance.status === 'connected';
    const qrProgress = Math.max(0, Math.min(100, (timeLeft / 40) * 100));

    const handleDisconnect = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${SERVICE_URL}/instances/${instance.id}/disconnect`, {
                method: 'POST'
            });

            if (response.ok) {
                toast({
                    title: "Desconectado",
                    description: "Instância desconectada com sucesso.",
                });
                onRefresh();
            } else {
                throw new Error('Falha ao desconectar');
            }
        } catch (error) {
            toast({
                title: "Erro",
                description: "Erro ao desconectar instância.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsLoading(true);
        try {
            // First disconnect if connected
            if (instance.status === 'connected') {
                await fetch(`${SERVICE_URL}/instances/${instance.id}/disconnect`, {
                    method: 'POST'
                });
            }

            // Wait a bit for cleanup
            await new Promise(resolve => setTimeout(resolve, 500));

            // Restart the instance to generate new QR code
            const response = await fetch(`${SERVICE_URL}/instances`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: instance.id, name: instance.name })
            });

            if (response.ok) {
                toast({
                    title: "Atualizando",
                    description: "Gerando novo QR Code...",
                });
                onRefresh();
            } else {
                throw new Error('Falha ao atualizar');
            }
        } catch (error) {
            toast({
                title: "Erro",
                description: "Erro ao atualizar instância.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (confirm('Tem certeza que deseja remover esta conexão?')) {
            setIsLoading(true);
            try {
                // First disconnect if connected
                if (isConnected) {
                    await handleDisconnect();
                }
                
                // Delete from WhatsApp service
                try {
                    await fetch(`${SERVICE_URL}/instances/${instance.id}`, {
                        method: 'DELETE'
                    });
                } catch (serviceError) {
                    console.warn('Could not delete from WhatsApp service:', serviceError);
                }
                
                // Delete from database via callback
                onDelete(instance.id);
                
                toast({
                    title: "Removido",
                    description: "Instância removida com sucesso.",
                });
            } catch (error) {
                toast({
                    title: "Erro",
                    description: "Erro ao remover instância.",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Smartphone className="h-5 w-5 text-muted-foreground" />
                            {instance.name}
                        </CardTitle>
                        <CardDescription className="text-xs">ID: {instance.id}</CardDescription>
                    </div>
                    <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}>
                        {isConnected ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Conectado</>
                        ) : (
                            <><AlertCircle className="h-3 w-3 mr-1" /> {instance.status === 'connecting' ? 'Conectando...' : 'Desconectado'}</>
                        )}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pb-2">
                <div className="space-y-2">
                    {isConnected && instance.phone_number && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Número:</span>
                            <span className="font-mono bg-muted px-2 py-0.5 rounded">+{instance.phone_number}</span>
                        </div>
                    )}

                    {!isConnected && instance.qr_code && (
                        <div className="flex flex-col items-center justify-center p-4 border rounded-md bg-slate-50">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(instance.qr_code)}`}
                                alt="QR Code"
                                className="w-48 h-48 mb-3"
                            />
                            <div className="w-full max-w-[200px]">
                                <Progress value={qrProgress} className="h-1.5" />
                                <p className="text-xs text-center text-muted-foreground mt-1">
                                    {qrExpired ? 'QR expirado, gere outro' : `Expira em ${timeLeft}s`}
                                </p>
                            </div>
                        </div>
                    )}

                    {!isConnected && !instance.qr_code && (
                        <div className="flex flex-col items-center justify-center p-4 border rounded-md bg-slate-50 text-muted-foreground text-sm">
                            <Loader2 className="h-6 w-6 animate-spin mb-2" />
                            <p>Aguardando QR Code...</p>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-2">
                <Button
                    variant={qrExpired ? 'default' : 'ghost'}
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isLoading}
                >
                    {qrExpired ? (
                        <span className="flex items-center gap-2">
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Gerar novo QR
                        </span>
                    ) : (
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    )}
                </Button>

                {isConnected ? (
                    <div className="flex-1"></div>
                ) : (
                    <div className="flex-1"></div>
                )}

                <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isLoading} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );
}
