import { useState, useEffect } from 'react';
import { WHATSAPP } from '@/integrations/whatsapp/config';

export interface WhatsAppNumber {
  id: string; // ID da configuração
  number: string;
  displayName: string; // Nome amigável para exibir
  isConnected: boolean;
  connectedNumber?: string;
}

export function useWhatsAppNumbers() {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkWhatsAppService = async () => {
      try {
        setLoading(true);

        // Verificar se o serviço WhatsApp está conectado
        const response = await fetch(`${WHATSAPP.SERVICE_URL}/status`);

        if (response.ok) {
          const data = await response.json();

          if (data.instances && Array.isArray(data.instances)) {
            const whatsappNumbers: WhatsAppNumber[] = data.instances
              .filter((inst: any) => inst.status === 'connected')
              .map((inst: any) => ({
                id: inst.id,
                number: inst.phone_number,
                displayName: inst.name || `WhatsApp ${inst.phone_number?.slice(-4) || ''}`,
                isConnected: true,
                connectedNumber: inst.phone_number
              }));

            setNumbers(whatsappNumbers);
          } else if (data.isConnected && data.connectedNumber) {
            // Fallback para formato antigo (single instance)
            const whatsappNumbers: WhatsAppNumber[] = [{
              id: 'default',
              number: data.connectedNumber,
              displayName: `WhatsApp ${data.connectedNumber.slice(-4)}`,
              isConnected: data.isConnected,
              connectedNumber: data.connectedNumber
            }];
            setNumbers(whatsappNumbers);
          } else {
            setNumbers([]);
          }
        } else {
          setNumbers([]);
        }
      } catch (error) {
        console.error('Error checking WhatsApp service:', error);
        setNumbers([]);
      } finally {
        setLoading(false);
      }
    };

    checkWhatsAppService();

    // Polling para verificar status periodicamente
    const interval = setInterval(checkWhatsAppService, WHATSAPP.STATUS_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return { numbers, loading };
}
