import { describe, expect, it } from 'vitest';
import {
  buildClienteIndexes,
  findMatchingCliente,
  hasDuplicateContact,
  hasMinimalClientData,
  mapImportClienteRow,
  normalizePhone,
} from '../components/customer-management/importClientesUtils';

describe('importClientesUtils', () => {
  it('mapeia colunas CSV/Excel de forma robusta', () => {
    const row = mapImportClienteRow({
      'Código Cliente': 'cli-12',
      'Razão Social': 'Empresa XPTO LTDA',
      'Nome Fantasia': 'XPTO',
      'CPF/CNPJ': '12.345.678/0001-99',
      'Situação': 'Ativo',
      Contato: 'Maria',
      Email: 'maria@xpto.com',
      Telefone: '(11) 99999-8888',
      Setor: 'Compras',
    });

    expect(row.codigo_cliente).toBe('cli-12');
    expect(row.razao_social).toBe('Empresa XPTO LTDA');
    expect(row.nome_fantasia).toBe('XPTO');
    expect(row.cpf_cnpj).toBe('12.345.678/0001-99');
    expect(row.situacao).toBe('Ativo');
    expect(row.nome_contato).toBe('Maria');
    expect(row.email_contato).toBe('maria@xpto.com');
    expect(row.telefone_contato).toBe('(11) 99999-8888');
    expect(row.departamento).toBe('Compras');
  });

  it('aceita linha com dados mínimos válidos', () => {
    expect(hasMinimalClientData({ razao_social: 'A' })).toBe(true);
    expect(hasMinimalClientData({ email_contato: 'x@y.com' })).toBe(true);
    expect(hasMinimalClientData({ telefone_contato: '(11)99999-0000' })).toBe(true);
    expect(hasMinimalClientData({})).toBe(false);
  });

  it('normaliza telefone para os 9 últimos dígitos', () => {
    expect(normalizePhone('(11) 98888-7777')).toBe('988887777');
    expect(normalizePhone('')).toBe('');
  });

  it('encontra cliente existente por prioridade de chave (codigo > doc > contato > nome)', () => {
    const clientes = [
      {
        id: 'c1',
        codigo_cliente: 'CLI-000123',
        cpf_cnpj: '12.345.678/0001-00',
        razao_social: 'Empresa A',
        nome_fantasia: 'EA',
        cliente_contatos: [{ email_contato: 'compras@ea.com', telefone_contato: '(11)90000-0001' }],
      },
      {
        id: 'c2',
        codigo_cliente: 'CLI-000999',
        cpf_cnpj: '98.765.432/0001-00',
        razao_social: 'Empresa B',
        nome_fantasia: 'EB',
        cliente_contatos: [{ email_contato: 'compras@eb.com', telefone_contato: '(11)90000-0002' }],
      },
    ];

    const indexes = buildClienteIndexes(clientes);

    const byCode = findMatchingCliente(indexes, { codigo_cliente: '123', nome_fantasia: 'Empresa B' });
    expect(byCode?.id).toBe('c1');

    const byDoc = findMatchingCliente(indexes, { cpf_cnpj: '98.765.432/0001-00' });
    expect(byDoc?.id).toBe('c2');

    const byContact = findMatchingCliente(indexes, { telefone_contato: '(11) 90000-0001' });
    expect(byContact?.id).toBe('c1');

    const byName = findMatchingCliente(indexes, { razao_social: 'Empresa B' });
    expect(byName?.id).toBe('c2');
  });

  it('detecta contato duplicado por telefone ou email', () => {
    const existing = [
      { telefone_contato: '(11)99999-0001', email_contato: 'um@empresa.com' },
    ];

    expect(hasDuplicateContact(existing, { telefone_contato: '11999990001' })).toBe(true);
    expect(hasDuplicateContact(existing, { email_contato: 'UM@EMPRESA.COM' })).toBe(true);
    expect(hasDuplicateContact(existing, { telefone_contato: '(11)98888-7777', email_contato: 'novo@empresa.com' })).toBe(false);
  });
});
