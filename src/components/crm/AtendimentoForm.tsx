// src/components/crm/AtendimentoForm.tsx

import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

// Esquema de validação para o formulário
const formSchema = z.object({
  client_name: z.string().min(3, { message: 'O nome da empresa é obrigatório.' }),
  contact_person: z.string().min(3, { message: 'O nome do contato é obrigatório.' }),
  client_phone: z.string().optional(),
  initial_message: z.string().min(10, { message: 'O resumo deve ter pelo menos 10 caracteres.' }),
});

type FormData = z.infer<typeof formSchema>;

interface AtendimentoFormProps {
  // CORREÇÃO: A função onSuccess agora espera um 'number' (o ID do novo atendimento)
  onSuccess: (newAtendimentoId: number) => void;
  // A prop 'setOpen' pode ser opcional, já que não será usada na página dedicada
  setOpen?: (isOpen: boolean) => void;
}

const AtendimentoForm: React.FC<AtendimentoFormProps> = ({ onSuccess, setOpen }) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_name: '',
      contact_person: '',
      client_phone: '',
      initial_message: '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit: SubmitHandler<FormData> = async (values) => {
    const { data, error } = await supabase
      .from('atendimentos')
      .insert({
        ...values,
        status: 'Solicitação', // Define o status inicial
      })
      .select('id') // Pede para o Supabase retornar o ID do registro criado
      .single(); // Espera um único resultado

    if (error) {
      // Tratar o erro (ex: toast de erro)
    } else if (data) {
      // CORREÇÃO: Chama a função onSuccess com o ID retornado pelo Supabase
      onSuccess(data.id);
      // Se a função setOpen existir (no caso do modal), fecha o modal
      if (setOpen) {
        setOpen(false);
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="client_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente (Empresa)</FormLabel>
              <FormControl><Input placeholder="Nome da empresa cliente" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="contact_person" render={({ field }) => (
            <FormItem>
              <FormLabel>Contato (Pessoa)</FormLabel>
              <FormControl><Input placeholder="Nome de quem fez a solicitação" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="client_phone" render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp</FormLabel>
              <FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="initial_message" render={({ field }) => (
            <FormItem>
              <FormLabel>Resumo Inicial</FormLabel>
              <FormControl><Textarea placeholder="Descreva a solicitação inicial do cliente..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-4 pt-4">
          {setOpen && (
             <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Registrando...' : 'Registrar Atendimento'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AtendimentoForm;