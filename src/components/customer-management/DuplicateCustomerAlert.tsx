import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { AlertTriangle, Merge, X } from 'lucide-react';

interface DuplicateInfo {
  id: string;
  nome_fantasia?: string | null;
  razao_social?: string | null;
  cpf_cnpj?: string | null;
  telefone?: string | null;
  email?: string | null;
}

interface DuplicateCustomerAlertProps {
  currentCustomer: DuplicateInfo;
  possibleDuplicates: DuplicateInfo[];
  onMerge?: (targetId: string) => void;
  onDismiss?: () => void;
}

export const DuplicateCustomerAlert: React.FC<DuplicateCustomerAlertProps> = ({
  currentCustomer,
  possibleDuplicates,
  onMerge,
  onDismiss,
}) => {
  if (possibleDuplicates.length === 0) return null;

  const getDisplayName = (customer: DuplicateInfo) => 
    customer.nome_fantasia || customer.razao_social || 'Cliente sem nome';

  return (
    <Alert variant="destructive" className="bg-orange-50 border-orange-200">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800 flex items-center justify-between">
        <span>Possíveis cadastros duplicados detectados</span>
        {onDismiss && (
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onDismiss}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="text-orange-700">
        <p className="text-sm mb-2">
          Encontramos {possibleDuplicates.length} possível(is) cadastro(s) semelhante(s) a "{getDisplayName(currentCustomer)}":
        </p>
        <div className="space-y-2">
          {possibleDuplicates.map((dup) => (
            <div 
              key={dup.id} 
              className="flex items-center justify-between bg-white/50 rounded p-2 text-sm"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{getDisplayName(dup)}</span>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {dup.cpf_cnpj && <span>CNPJ: {dup.cpf_cnpj}</span>}
                  {dup.telefone && <span>Tel: {dup.telefone}</span>}
                  {dup.email && <span>{dup.email}</span>}
                </div>
              </div>
              {onMerge && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs border-orange-300 hover:bg-orange-100"
                  onClick={() => onMerge(dup.id)}
                >
                  <Merge className="h-3 w-3 mr-1" />
                  Unificar
                </Button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs mt-2 text-orange-600">
          ⚠️ A unificação irá mesclar tickets, oportunidades e histórico para um único cadastro.
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
    const currentPhone = (currentCustomer.telefone || '').replace(/\D/g, '');
    const currentEmail = (currentCustomer.email || '').toLowerCase().trim();

    return allCustomers.filter(c => {
      if (c.id === currentCustomer.id) return false;
      
      const name = (c.nome_fantasia || c.razao_social || '').toLowerCase().trim();
      const cpfCnpj = (c.cpf_cnpj || '').replace(/\D/g, '');
      const phone = (c.telefone || '').replace(/\D/g, '');
      const email = (c.email || '').toLowerCase().trim();

      // Same CPF/CNPJ
      if (cpfCnpj && currentCpfCnpj && cpfCnpj === currentCpfCnpj) return true;
      
      // Same phone
      if (phone && currentPhone && phone.slice(-8) === currentPhone.slice(-8)) return true;
      
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
    }).slice(0, 3); // Limit to 3 duplicates
  }, [allCustomers, currentCustomer]);

  return possibleDuplicates;
}
