import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Building2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

interface Cliente {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cpf_cnpj: string | null;
}

interface ClienteComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ClienteCombobox: React.FC<ClienteComboboxProps> = ({
  value,
  onChange,
  placeholder = 'Selecionar cliente...',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async (search?: string) => {
    setLoading(true);
    let query = supabase
      .from('clientes')
      .select('id, razao_social, nome_fantasia, cpf_cnpj')
      .order('razao_social', { ascending: true })
      .limit(50);

    if (search && search.length > 0) {
      query = query.or(
        `razao_social.ilike.%${search}%,nome_fantasia.ilike.%${search}%,cpf_cnpj.ilike.%${search}%`
      );
    }

    const { data } = await query;
    setClientes(data || []);
    setLoading(false);
  };

  const handleSearch = (search: string) => {
    setSearchQuery(search);
    fetchClientes(search);
  };

  const selectedCliente = clientes.find((c) => c.id === value);

  const getDisplayName = (cliente: Cliente) => {
    return cliente.nome_fantasia || cliente.razao_social || 'Sem nome';
  };

  const getCnpjSuffix = (cliente: Cliente) => {
    if (!cliente.cpf_cnpj) return '';
    const clean = cliente.cpf_cnpj.replace(/\D/g, '');
    return clean.slice(-4);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedCliente ? (
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{getDisplayName(selectedCliente)}</span>
                {getCnpjSuffix(selectedCliente) && (
                  <span className="text-muted-foreground text-xs">
                    (...{getCnpjSuffix(selectedCliente)})
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por nome, fantasia ou CNPJ..."
              value={searchQuery}
              onValueChange={handleSearch}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? 'Buscando...' : 'Nenhum cliente encontrado.'}
              </CommandEmpty>
              <CommandGroup>
                {clientes.map((cliente) => (
                  <CommandItem
                    key={cliente.id}
                    value={cliente.id}
                    onSelect={() => {
                      onChange(cliente.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === cliente.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{getDisplayName(cliente)}</span>
                      <span className="text-xs text-muted-foreground">
                        {cliente.razao_social !== cliente.nome_fantasia && cliente.razao_social}
                        {cliente.cpf_cnpj && ` • ${cliente.cpf_cnpj}`}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0"
          onClick={() => onChange(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
