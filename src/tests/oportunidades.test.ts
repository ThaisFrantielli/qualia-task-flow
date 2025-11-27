import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

beforeAll(() => {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  } as Storage;
});

describe('Oportunidades CRUD', () => {
  it('should create a new oportunidade', async () => {
    const newOportunidade = {
      titulo: 'Nova Oportunidade',
      descricao: 'Descrição da oportunidade',
      valor_total: 1000,
      status: 'aberta',
      user_id: '00000000-0000-0000-0000-000000000000', // UUID válido
    };

    const { data, error } = await supabase
      .from('oportunidades')
      .insert(newOportunidade)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    if (data) {
      expect(data.titulo).toBe(newOportunidade.titulo);
    }
  });

  // Outros testes para leitura, atualização e exclusão podem ser adicionados aqui
});