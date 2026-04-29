const fs = require('fs');
const rawRules = JSON.parse(fs.readFileSync('public/data/dim_regras_contrato_part1of8.json', 'utf8'));

const normalizeKeyPart = (v) => String(v || '').trim().toUpperCase();
const makeBancoRuleKey = (cto, grupo, regra) => `${normalizeKeyPart(cto)}::${normalizeKeyPart(grupo)}::${normalizeKeyPart(regra)}`;
const makeBancoRuleKeyGeneric = (cto, regra) => `${normalizeKeyPart(cto)}::${normalizeKeyPart(regra)}`;
const parseNum = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  let s = String(v).replace(/\s/g, '').replace('R$', '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  return parseFloat(s) || 0;
};

const map = new Map();
for (const regra of (rawRules.data || rawRules)) {
  const r = regra;
  const cto = String(r?.Contrato || r?.contrato || '').trim();
  const nomeRegra = String(r?.NomeRegra || r?.nomeRegra || r?.TipoPerfilContrato || r?.tipoPerfilContrato || r?.TipoPerfil || r?.tipoPerfil || r?.NomePerfil || r?.nomePerfil || '').trim();
  if (!cto || !nomeRegra) continue;
  
  const grupo = String(r?.Grupo || r?.grupo || r?.GrupoVeiculo || r?.grupoVeiculo || r?.Categoria || r?.categoria || r?.CategoriaVeiculo || r?.categoriaVeiculo || '').trim();
  const valor = parseNum(r?.ConteudoRegra ?? r?.conteudoRegra ?? r?.Valor ?? r?.valor ?? r?.Conteudo ?? r?.conteudo);
  
  const nomeNormalizado = nomeRegra.replace(/^[A-Z0-9]\s*-\s*/i, '').trim();
  if (grupo) {
    map.set(makeBancoRuleKey(cto, grupo, nomeRegra), valor);
    if (nomeNormalizado !== nomeRegra) map.set(makeBancoRuleKey(cto, grupo, nomeNormalizado), valor);
  }
  map.set(makeBancoRuleKeyGeneric(cto, nomeRegra), valor);
  if (nomeNormalizado !== nomeRegra) map.set(makeBancoRuleKeyGeneric(cto, nomeNormalizado), valor);
}

const lookupFranquiaBanco = (cto, grupo) => {
  const regras = [
    'A - Franquia KM/mês', 
    'Franquia KM/mês', 
    'A - Franquia Km/mês', 
    'Franquia Km/mês',
    'A - Franquia KM/mes',
    'Franquia KM/mes',
    'A - Franquia Km/mes',
    'Franquia Km/mes'
  ];
  for (const regra of regras) {
    const specific = map.get(makeBancoRuleKey(cto, grupo, regra));
    if (specific != null) return specific;
    const generic = map.get(makeBancoRuleKeyGeneric(cto, regra));
    if (generic != null) return generic;
  }
  return 3000;
};

console.log('CTO-1001:', lookupFranquiaBanco('CTO-1001', 'LEVE'));
console.log('CTO-1007:', lookupFranquiaBanco('CTO-1007', 'LEVE'));
console.log('CTO-1016:', lookupFranquiaBanco('CTO-1016', 'LEVE'));
console.log('CTO-XYZ:', lookupFranquiaBanco('CTO-XYZ', 'LEVE')); // should be 3000
