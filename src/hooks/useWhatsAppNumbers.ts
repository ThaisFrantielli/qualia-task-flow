import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase';

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
    const fetchNumbers = async () => {
      try {
        setLoading(true);
        
        // Buscar configurações de WhatsApp da empresa
        const { data: configs, error } = await supabase
          .from('whatsapp_config')
          .select('*');

        if (error) throw error;

        const whatsappNumbers: WhatsAppNumber[] = configs
          .filter(config => config.is_connected && config.connected_number)
          .map(config => ({
            id: config.id,
            number: config.connected_number || '',
            displayName: `WhatsApp ${config.connected_number?.slice(-4) || config.id.slice(0, 8)}`,
            isConnected: config.is_connected || false,
            connectedNumber: config.connected_number || undefined
          }));

        setNumbers(whatsappNumbers);
      } catch (error) {
        console.error('Error fetching WhatsApp numbers:', error);
        setNumbers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNumbers();

    // Real-time subscription para mudanças nas configurações
    const channel = supabase
      .channel('whatsapp-config-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_config'
        },
        () => {
          fetchNumbers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { numbers, loading };
}
