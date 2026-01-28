import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Merge, X, Loader2, Phone } from 'lucide-react';

interface DuplicateInfo {
  id: string;
  nome_fantasia?: string | null;
  razao_social?: string | null;
  cpf_cnpj?: string | null;
  telefone?: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
}

interface DuplicateCustomerAlertProps {
  currentCustomer: DuplicateInfo;
  possibleDuplicates: DuplicateInfo[];
  onMerge?: (targetId: string) => Promise<void> | void;
  onDismiss?: () => void;
  isAutoDetected?: boolean;
}

export const DuplicateCustomerAlert: React.FC<DuplicateCustomerAlertProps> = ({
  currentCustomer,
  possibleDuplicates,
  onMerge,
  onDismiss,
  isAutoDetected = false,
}) => {
  const [merging, setMerging] = useState<string | null>(null);

  if (possibleDuplicates.length === 0) return null;

  const getDisplayName = (customer: DuplicateInfo) => 
    customer.nome_fantasia || customer.razao_social || 'Cliente sem nome';

  const getPhone = (customer: DuplicateInfo) =>
    customer.telefone || customer.whatsapp_number || null;

  const handleMerge = async (targetId: string) => {
    if (!onMerge) return;
    setMerging(targetId);
    try {
      await onMerge(targetId);
    } finally {
      setMerging(null);
    }
  };

  return (
    <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-300 flex items-center justify-between">
        <span className="flex items-center gap-2">
          {isAutoDetected && <Phone className="h-4 w-4" />}
          {isAutoDetected 
            ? "Clientes com mesmo telefone detectados" 
            : "Possíveis cadastros duplicados"}
        </span>
        {onDismiss && (
          <Button variant="ghost" size="icon" className="h-5 w-5 text-amber-600" onClick={onDismiss}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-400">
        <p className="text-sm mb-2">
          {isAutoDetected 
            ? `Estes clientes compartilham o mesmo número de telefone que "${getDisplayName(currentCustomer)}":`
            : `Encontramos ${possibleDuplicates.length} possível(is) cadastro(s) semelhante(s) a "${getDisplayName(currentCustomer)}":`
          }
        </p>
        <div className="space-y-2">
          {possibleDuplicates.map((dup) => (
            <div 
              key={dup.id} 
              className="flex items-center justify-between bg-white/70 dark:bg-background/50 rounded-lg p-3 text-sm border border-amber-200 dark:border-amber-800"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-foreground">{getDisplayName(dup)}</span>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {dup.cpf_cnpj && <span>CNPJ: {dup.cpf_cnpj}</span>}
                  {getPhone(dup) && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {getPhone(dup)}
                    </span>
                  )}
                  {dup.email && <span>{dup.email}</span>}
                </div>
              </div>
              {onMerge && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs border-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-300"
                  onClick={() => handleMerge(dup.id)}
                  disabled={merging !== null}
                >
                  {merging === dup.id ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Merge className="h-3 w-3 mr-1" />
                  )}
                  Unificar para este
                </Button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs mt-3 text-amber-600 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/30 p-2 rounded">
          ⚠️ A unificação irá mesclar todos os tickets, oportunidades e histórico para o cliente selecionado.
        </p>
      </AlertDescription>
    </Alert>
  );
};

// Hook para detectar duplicados
export function useDuplicateDetection(
  allCustomers: DuplicateInfo[] | undefined,
  currentCustomer: DuplicateInfo | null
) {
  const possibleDuplicates = React.useMemo(() => {
    if (!allCustomers || !currentCustomer) return [];
    
    const currentName = (currentCustomer.nome_fantasia || currentCustomer.razao_social || '').toLowerCase().trim();
    const currentCpfCnpj = (currentCustomer.cpf_cnpj || '').replace(/\D/g, '');
    const currentPhone = (currentCustomer.telefone || currentCustomer.whatsapp_number || '').replace(/\D/g, '');
    const currentEmail = (currentCustomer.email || '').toLowerCase().trim();

    return allCustomers.filter(c => {
      if (c.id === currentCustomer.id) return false;
      
      const name = (c.nome_fantasia || c.razao_social || '').toLowerCase().trim();
      const cpfCnpj = (c.cpf_cnpj || '').replace(/\D/g, '');
      const phone = (c.telefone || c.whatsapp_number || '').replace(/\D/g, '');
      const email = (c.email || '').toLowerCase().trim();

      // Same CPF/CNPJ (exact match)
      if (cpfCnpj && currentCpfCnpj && cpfCnpj === currentCpfCnpj) return true;
      
      // Same phone (last 8-9 digits match) - PRIMARY DETECTION
      if (phone.length >= 8 && currentPhone.length >= 8) {
        const phoneSuffix = phone.slice(-9);
        const currentPhoneSuffix = currentPhone.slice(-9);
        if (phoneSuffix === currentPhoneSuffix) return true;
      }
      
      // Same email
      if (email && currentEmail && email === currentEmail) return true;
      
      // Similar names (Levenshtein-ish check)
      if (name && currentName) {
        // Check if one name contains the other
        if (name.includes(currentName) || currentName.includes(name)) return true;
        
        // Check for common words
        const currentWords = currentName.split(/\s+/).filter(w => w.length > 2);
        const words = name.split(/\s+/).filter(w => w.length > 2);
        const commonWords = currentWords.filter(w => words.includes(w));
        if (commonWords.length >= 2) return true;
      }

      return false;
    }).slice(0, 5); // Limit to 5 duplicates
  }, [allCustomers, currentCustomer]);

  return possibleDuplicates;
}

// Hook para detectar duplicados especificamente por telefone
export function usePhoneDuplicateDetection(
  allCustomers: DuplicateInfo[] | undefined,
  currentCustomer: DuplicateInfo | null
) {
  const phoneDuplicates = React.useMemo(() => {
    if (!allCustomers || !currentCustomer) return [];
    
    const currentPhone = (currentCustomer.telefone || currentCustomer.whatsapp_number || '').replace(/\D/g, '');
    if (currentPhone.length < 8) return [];
    
    const currentPhoneSuffix = currentPhone.slice(-9);

    return allCustomers.filter(c => {
      if (c.id === currentCustomer.id) return false;
      
      const phone = (c.telefone || c.whatsapp_number || '').replace(/\D/g, '');
      if (phone.length < 8) return false;
      
      const phoneSuffix = phone.slice(-9);
      return phoneSuffix === currentPhoneSuffix;
    });
  }, [allCustomers, currentCustomer]);

  return phoneDuplicates;
}

