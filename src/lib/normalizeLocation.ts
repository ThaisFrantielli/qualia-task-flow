type NormalizeResult = {
  city: string;
  state: string | null;
  isMunicipio: boolean;
  normalized: string;
  note?: string;
};

function clean(s?: string): string {
  if (!s) return '';
  return s.trim().replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').toLowerCase();
}

const explicitMap: Record<string, { city: string; state: string; note?: string; isMunicipio?: boolean }> = {
  'valparaíso de goiás': { city: 'Valparaíso de Goiás', state: 'GO', isMunicipio: true },
  'valparaiso de goias': { city: 'Valparaíso de Goiás', state: 'GO', isMunicipio: true },
  'padre bernardo': { city: 'Padre Bernardo', state: 'GO', isMunicipio: true },
  'brasília': { city: 'Brasília', state: 'DF', isMunicipio: true },
  'brasilia': { city: 'Brasília', state: 'DF', isMunicipio: true },
  // Goiás list common false positives (map to their real states)
  'cotia': { city: 'Cotia', state: 'SP', isMunicipio: true },
  'campo limpo paulista': { city: 'Campo Limpo Paulista', state: 'SP', isMunicipio: true },
  'guaratinguetá': { city: 'Guaratinguetá', state: 'SP', isMunicipio: true },
  'serra': { city: 'Serra', state: 'ES', isMunicipio: true },
  'foz do iguaçu': { city: 'Foz do Iguaçu', state: 'PR', isMunicipio: true },
  'jacarezinho': { city: 'Jacarezinho', state: 'PR', isMunicipio: true },
  'juiz de fora': { city: 'Juiz de Fora', state: 'MG', isMunicipio: true },
  'lajeado': { city: 'Lajeado', state: 'RS', isMunicipio: true }
};

const dfRAs = new Set([
  'riacho fundo ii', 'sobradinho ii', 'brazlândia', 'arniqueira', 'fercal', 'itapoã',
  'riacho fundo', 'sobradinho'
]);

const addressIndicators = ['rua ', 'r. ', 'av ', 'avenida ', 'setor ', 'bairro ', 'parque ', 'quadra ', 'loteamento ', 'rod ', 'rodovia ', 'trecho ', 'alameda ', 'travessa '];

const abbreviations: Record<string, string> = {
  'scdn': 'Setor Comercial de Diversões Norte',
  'cnc 2': 'Taguatinga',
  'ville de montagne': 'Jardim Botânico',
  'setor veredas': 'Brazlândia'
};

const statesMap: Record<string, string> = {
  'acre': 'AC', 'alagoas': 'AL', 'amapá': 'AP', 'amapa': 'AP', 'amazonas': 'AM', 'bahia': 'BA',
  'ceará': 'CE', 'ceara': 'CE', 'distrito federal': 'DF', 'espírito santo': 'ES', 'espirito santo': 'ES',
  'goiás': 'GO', 'goias': 'GO', 'maranhão': 'MA', 'maranhao': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', 'pará': 'PA', 'para': 'PA', 'paraíba': 'PB', 'paraiba': 'PB', 'paraná': 'PR', 'parana': 'PR',
  'pernambuco': 'PE', 'piauí': 'PI', 'piaui': 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN',
  'rio grande do sul': 'RS', 'rondonia': 'RO', 'roraima': 'RR', 'santa catarina': 'SC', 'são paulo': 'SP', 'sao paulo': 'SP',
  'sergipe': 'SE', 'tocantins': 'TO'
};

export default function normalizeLocation(raw?: string): NormalizeResult {
  const src = String(raw ?? '').trim();
  const key = clean(src);

  if (!key) return { city: '', state: null, isMunicipio: false, normalized: '' };

  // explicit mapping
  if (explicitMap[key]) {
    const m = explicitMap[key];
    return { city: m.city, state: m.state, isMunicipio: !!m.isMunicipio, normalized: m.city, note: m.note };
  }

  // abbreviations
  if (abbreviations[key]) {
    return { city: abbreviations[key], state: 'DF', isMunicipio: false, normalized: abbreviations[key], note: 'mapped abbreviation' };
  }

  // detect address-like strings
  for (const ind of addressIndicators) {
    if (key.includes(ind)) {
      return { city: src, state: null, isMunicipio: false, normalized: src, note: 'address/sector detected' };
    }
  }

  // treat DF RAs
  if (dfRAs.has(key)) {
    // keep as RA but mark DF
    return { city: src, state: 'DF', isMunicipio: false, normalized: src, note: 'DF RA' };
  }

  // simple state suffix detection (e.g., ' - GO' or '(GO)')
  const stateMatch = src.match(/\((?:est\.|estado\.|)([A-Za-z]{2})\)/i) || src.match(/[-,]\s*([A-Za-z]{2})$/);
  if (stateMatch) {
    const st = stateMatch[1].toUpperCase();
    const name = src.replace(/\s*\(.*\)\s*$/, '').replace(/[-,]\s*[A-Za-z]{2}$/, '').trim();
    return { city: name, state: st, isMunicipio: true, normalized: name };
  }

  // detect if the entire value is a state name (e.g., 'Minas Gerais')
  if (statesMap[key]) {
    return { city: '', state: statesMap[key], isMunicipio: false, normalized: statesMap[key], note: 'state-name-captured' };
  }

  // fallback: if token looks like a single word and matches well-known items
  // guess municipality (no state)
  return { city: src, state: null, isMunicipio: true, normalized: src };
}

export type { NormalizeResult };
