import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    const { toast } = useToast();

    const isConnected = instance.status === 'connected';

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

    const handleDelete = async () => {
        if (confirm('Tem certeza que deseja remover esta conexão?')) {
            if (isConnected) {
                await handleDisconnect();
            }
            onDelete(instance.id);
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
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(instance.qr_code)}`}
                                alt="QR Code"
                                className="w-32 h-32 mb-2"
                            />
                            <p className="text-xs text-center text-muted-foreground">Escaneie para conectar</p>
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
                <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
