import { normalizeClienteCodigo } from '../../lib/clienteCodigo';

export type ImportClienteRow = {
  codigo_cliente?: string;
  razao_social?: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  situacao?: string;
  nome_contato?: string;
  email_contato?: string;
  telefone_contato?: string;
  departamento?: string;
};

export type ExistingCliente = {
  id: string;
  codigo_cliente?: string | null;
  cpf_cnpj?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cliente_contatos?: Array<{
    id?: string;
    nome_contato?: string | null;
    email_contato?: string | null;
    telefone_contato?: string | null;
  }>;
};

export type ClienteIndexMaps = {
  byCodigo: Map<string, ExistingCliente>;
  byDoc: Map<string, ExistingCliente>;
  byName: Map<string, ExistingCliente>;
  byContactPhone: Map<string, ExistingCliente>;
  byContactEmail: Map<string, ExistingCliente>;
};

export function normalizeDigits(value?: string | null): string {
  return (value || '').replace(/\D/g, '').trim();
}

export function normalizeText(value?: string | null): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function normalizePhone(value?: string | null): string {
  const digits = normalizeDigits(value);
  return digits.length >= 8 ? digits.slice(-9) : '';
}

export function normalizeEmail(value?: string | null): string {
  return normalizeText(value);
}

export function normalizeHeader(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, '');
}

export function mapImportClienteRow(raw: Record<string, unknown>): ImportClienteRow {
  const out: ImportClienteRow = {};

  for (const [key, value] of Object.entries(raw)) {
    const header = normalizeHeader(key);
    const rawValue = String(value ?? '').trim();
    if (!rawValue) continue;

    if (header.includes('codigocliente') || header === 'codigo') out.codigo_cliente = rawValue;
    else if (header.includes('razaosocial')) out.razao_social = rawValue;
    else if (header.includes('nomefantasia') || header.includes('fantasia')) out.nome_fantasia = rawValue;
    else if (header.includes('cpfcnpj') || header === 'cpf' || header === 'cnpj') out.cpf_cnpj = rawValue;
    else if (header.includes('situacao') || header.includes('status')) out.situacao = rawValue;
    else if (header.includes('nomecontato') || header === 'contato') out.nome_contato = rawValue;
    else if (header.includes('emailcontato') || header === 'email') out.email_contato = rawValue;
    else if (header.includes('telefonecontato') || header.includes('whatsapp') || header.includes('telefone')) out.telefone_contato = rawValue;
    else if (header.includes('departamento') || header.includes('setor')) out.departamento = rawValue;
  }

  return out;
}

export function hasMinimalClientData(row: ImportClienteRow): boolean {
  return Boolean(row.razao_social || row.nome_fantasia || row.codigo_cliente || row.cpf_cnpj || row.email_contato || row.telefone_contato);
}

export function buildClienteIndexes(existingClientes: ExistingCliente[]): ClienteIndexMaps {
  const byCodigo = new Map<string, ExistingCliente>();
  const byDoc = new Map<string, ExistingCliente>();
  const byName = new Map<string, ExistingCliente>();
  const byContactPhone = new Map<string, ExistingCliente>();
  const byContactEmail = new Map<string, ExistingCliente>();

  for (const c of existingClientes || []) {
    if (c.codigo_cliente) byCodigo.set(normalizeText(c.codigo_cliente), c);

    const doc = normalizeDigits(c.cpf_cnpj);
    if (doc) byDoc.set(doc, c);

    const nameKey = normalizeText(c.razao_social || c.nome_fantasia);
    if (nameKey) byName.set(nameKey, c);

    for (const contato of c.cliente_contatos || []) {
      const phone = normalizePhone(contato.telefone_contato);
      const email = normalizeEmail(contato.email_contato);
      if (phone) byContactPhone.set(phone, c);
      if (email) byContactEmail.set(email, c);
    }
  }

  return { byCodigo, byDoc, byName, byContactPhone, byContactEmail };
}

export function findMatchingCliente(indexes: ClienteIndexMaps, row: ImportClienteRow): ExistingCliente | null {
  const normalizedIncomingCode = row.codigo_cliente ? normalizeClienteCodigo(row.codigo_cliente) : '';
  const codeKey = normalizeText(normalizedIncomingCode);
  const docKey = normalizeDigits(row.cpf_cnpj);
  const phoneKey = normalizePhone(row.telefone_contato);
  const emailKey = normalizeEmail(row.email_contato);
  const nameKey = normalizeText(row.razao_social || row.nome_fantasia);

  return (
    (codeKey ? indexes.byCodigo.get(codeKey) : null) ||
    (docKey ? indexes.byDoc.get(docKey) : null) ||
    (phoneKey ? indexes.byContactPhone.get(phoneKey) : null) ||
    (emailKey ? indexes.byContactEmail.get(emailKey) : null) ||
    (nameKey ? indexes.byName.get(nameKey) : null) ||
    null
  );
}

export function hasDuplicateContact(
  existingContacts: Array<{ telefone_contato?: string | null; email_contato?: string | null }>,
  row: ImportClienteRow,
): boolean {
  return (existingContacts || []).some((contato) => {
    const samePhone = normalizePhone(contato.telefone_contato) && normalizePhone(contato.telefone_contato) === normalizePhone(row.telefone_contato);
    const sameEmail = normalizeEmail(contato.email_contato) && normalizeEmail(contato.email_contato) === normalizeEmail(row.email_contato);
    return Boolean(samePhone || sameEmail);
  });
}
