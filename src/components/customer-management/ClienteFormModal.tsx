// src/components/customer-management/ClienteFormModal.tsx (VERSÃO AVANÇADA)

import React, { useEffect } from 'react';
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { ClienteComContatos } from '@/types';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- MELHORIA 3: Schema para contatos múltiplos ---
const contatoSchema = z.object({
  id: z.string().optional(), // Para identificar contatos existentes
  nome_contato: z.string().min(3, "Nome é obrigatório."),
  email_contato: z.string().email("Email inválido.").optional().or(z.literal('')),
  telefone_contato: z.string().optional(),
  // --- MELHORIA 4: Campo de departamento ---
  departamento: z.string().optional(), 
});

const formSchema = z.object({
  codigo_cliente: z.string().min(1, "Código é obrigatório."),
  razao_social: z.string().min(3, "Razão Social é obrigatória."),
  nome_fantasia: z.string().optional(),
  cpf_cnpj: z.string().optional(),
  situacao: z.string().optional(),
  contatos: z.array(contatoSchema).min(1, "É necessário pelo menos um contato."),
});

type FormData = z.infer<typeof formSchema>;

interface ClienteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  cliente: ClienteComContatos | null;
}

const ClienteFormModal: React.FC<ClienteFormModalProps> = ({ isOpen, onClose, onSave, cliente }) => {
  const isEditMode = !!cliente;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo_cliente: '',
      razao_social: '',
      nome_fantasia: '',
      cpf_cnpj: '',
      situacao: 'Ativo',
      contatos: [{ nome_contato: '', email_contato: '', telefone_contato: '', departamento: '' }],
    },
  });

  // --- MELHORIA 3: Hook para gerenciar o array de contatos ---
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contatos",
  });

  useEffect(() => {
    if (isEditMode && cliente) {
      form.reset({
        codigo_cliente: cliente.codigo_cliente || '',
        razao_social: cliente.razao_social || '',
        nome_fantasia: cliente.nome_fantasia || '',
        cpf_cnpj: cliente.cpf_cnpj || '',
        situacao: cliente.situacao || 'Ativo',
        contatos: cliente.cliente_contatos.length > 0
          ? cliente.cliente_contatos.map(c => ({
              id: c.id,
              nome_contato: c.nome_contato || '',
              email_contato: c.email_contato || '',
              telefone_contato: c.telefone_contato || '',
              departamento: '', // Adicionar campo no DB futuramente
            }))
          : [{ nome_contato: '', email_contato: '', telefone_contato: '', departamento: '' }],
      });
    } else {
      form.reset({
        codigo_cliente: `CLI-${Date.now().toString().slice(-6)}`,
        razao_social: '',
        nome_fantasia: '',
        cpf_cnpj: '',
        situacao: 'Ativo',
        contatos: [{ nome_contato: '', email_contato: '', telefone_contato: '', departamento: '' }],
      });
    }
  }, [cliente, isEditMode, form, isOpen]);


  const onSubmit: SubmitHandler<FormData> = async (values) => {
    try {
      if (isEditMode && cliente) {
        // LÓGICA DE ATUALIZAÇÃO
        // ... (será implementada no futuro, focando na criação primeiro)
        toast.success("Cliente atualizado com sucesso! (Simulação)");
      } else {
        // --- LÓGICA DE CRIAÇÃO ---
        const { data: newCliente, error: clienteError } = await supabase.from('clientes').insert({
          codigo_cliente: values.codigo_cliente,
          razao_social: values.razao_social,
          nome_fantasia: values.nome_fantasia,
          cpf_cnpj: values.cpf_cnpj,
          situacao: values.situacao,
        }).select().single();

        if (clienteError) throw clienteError;
        if (!newCliente) throw new Error("Falha ao criar cliente.");

        // Insere todos os contatos do formulário
        const contatosToInsert = values.contatos.map(contato => ({
          cliente_id: newCliente.id,
          nome_contato: contato.nome_contato,
          email_contato: contato.email_contato,
          telefone_contato: contato.telefone_contato,
          // departamento: contato.departamento, // Adicionar no DB futuramente
        }));

        const { error: contatoError } = await supabase.from('cliente_contatos').insert(contatosToInsert);
        if (contatoError) throw contatoError;

        toast.success("Cliente criado com sucesso!");
      }
      onSave();
      onClose();
    } catch (error: any) {
      toast.error("Ocorreu um erro", { description: error.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription>{isEditMode ? 'Altere as informações.' : 'Preencha os dados para cadastrar.'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="h-[60vh] p-4">
              <div className="space-y-6">
                <FormField control={form.control} name="codigo_cliente" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código do Cliente</FormLabel>
                    {/* --- MELHORIA 1: Campo desabilitado --- */}
                    <FormControl><Input {...field} disabled /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="razao_social" render={({ field }) => ( <FormItem><FormLabel>Razão Social *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField control={form.control} name="nome_fantasia" render={({ field }) => ( <FormItem><FormLabel>Nome Fantasia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="cpf_cnpj" render={({ field }) => (
                    // --- MELHORIA 2: Label ajustado ---
                    <FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="situacao" render={({ field }) => ( <FormItem><FormLabel>Situação</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                
                <hr />
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Contatos</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ nome_contato: '', email_contato: '', telefone_contato: '', departamento: '' })}>
                    <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Contato
                  </Button>
                </div>

                {/* --- MELHORIA 3: Renderização dinâmica dos contatos --- */}
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                    <FormField control={form.control} name={`contatos.${index}.nome_contato`} render={({ field }) => ( <FormItem><FormLabel>Nome do Contato *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name={`contatos.${index}.email_contato`} render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField control={form.control} name={`contatos.${index}.telefone_contato`} render={({ field }) => ( <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                    {/* --- MELHORIA 4: Campo de departamento --- */}
                    <FormField control={form.control} name={`contatos.${index}.departamento`} render={({ field }) => ( <FormItem><FormLabel>Departamento</FormLabel><FormControl><Input placeholder="Ex: Financeiro, TI" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}

              </div>
            </ScrollArea>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ClienteFormModal;