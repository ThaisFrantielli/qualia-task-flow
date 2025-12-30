import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  cliente_contatos?: { telefone_contato?: string | null }[];
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
  const navigate = useNavigate();

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async (search?: string) => {
    setLoading(true);
    const normalized = (search || '').trim();

    // base query returning also contatos so we can show phone
    const nameQuery = supabase
      .from('clientes')
      .select('id, razao_social, nome_fantasia, cpf_cnpj, cliente_contatos(telefone_contato)')
      .order('razao_social', { ascending: true })
      .limit(50);

    if (normalized.length > 0) {
      nameQuery.or(
        `razao_social.ilike.%${normalized}%,nome_fantasia.ilike.%${normalized}%,cpf_cnpj.ilike.%${normalized}%`
      );
    }

    try {
      const results: Cliente[] = [];
      const { data: byName } = await nameQuery;
      if (byName && byName.length > 0) results.push(...(byName as any));

      // if search includes digits, also search in cliente_contatos by telefone
      const digitsOnly = normalized.replace(/\D/g, '');
      if (digitsOnly.length >= 3) {
        const patterns = new Set<string>();
        patterns.add(`telefone_contato.ilike.%${digitsOnly}%`);
        const last8 = digitsOnly.slice(-8);
        if (last8) patterns.add(`telefone_contato.ilike.%${last8}%`);

        const { data: contatos } = await supabase
          .from('cliente_contatos')
          .select('cliente_id,telefone_contato')
          .or(Array.from(patterns).join(','))
          .limit(50);

        const clienteIds = Array.from(new Set((contatos || []).map((c: any) => c.cliente_id))).filter(Boolean);
        if (clienteIds.length > 0) {
          const { data: byContacts } = await supabase
            .from('clientes')
            .select('id, razao_social, nome_fantasia, cpf_cnpj, cliente_contatos(telefone_contato)')
            .in('id', clienteIds)
            .limit(50);
          if (byContacts && byContacts.length > 0) {
            const existingIds = new Set(results.map(r => r.id));
            for (const c of byContacts as any) {
              if (!existingIds.has(c.id)) results.push(c);
            }
          }
        }
      }

      setClientes(results || []);
    } catch (e) {
      setClientes([]);
    } finally {
      setLoading(false);
    }
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
              placeholder="Buscar por nome, fantasia, CNPJ ou telefone..."
              value={searchQuery}
              onValueChange={handleSearch}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? (
                  'Buscando...'
                ) : (
                  <div className="flex items-center justify-between px-3">
                    <span>Nenhum cliente encontrado.</span>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() => {
                        setOpen(false);
                        navigate('/clientes?new=1');
                      }}
                    >
                      Cadastrar cliente
                    </button>
                  </div>
                )}
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
                            {!cliente.cpf_cnpj && cliente.cliente_contatos && cliente.cliente_contatos.length > 0 && (
                              ` • ${cliente.cliente_contatos[0].telefone_contato}`
                            )}
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
