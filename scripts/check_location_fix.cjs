const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'local-etl', 'public', 'data', 'dim_frota.json');
if (!fs.existsSync(dataPath)) {
  console.error('Arquivo de dados não encontrado:', dataPath);
  process.exit(2);
}

let raw = fs.readFileSync(dataPath, 'utf8');
let items;
try {
  items = JSON.parse(raw);
} catch (e) {
  console.error('Falha ao parsear JSON:', e.message);
  process.exit(3);
}

// suportar formatos: array diretamente, ou { data: [...] } ou { rows: [...] }
if (!Array.isArray(items)) {
  if (Array.isArray(items.data)) items = items.data;
  else if (Array.isArray(items.rows)) items = items.rows;
  else {
    // tentar extrair primeira propriedade que seja array
    const keys = Object.keys(items || {});
    let found = null;
    for (const k of keys) {
      if (Array.isArray(items[k])) { found = items[k]; break; }
    }
    if (found) items = found;
  }
}

if (!Array.isArray(items)) {
  console.error('Formato JSON inesperado — não contém um array de registros.');
  process.exit(4);
}

const parseNum = v => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

const extractLocation = (address) => {
  const fullAddr = (address || '').trim();
  let uf = 'ND';
  let city = 'Não Identificado';

  const ufMatch = fullAddr.match(/\(([A-Z]{2})\)/);
  if (ufMatch) uf = ufMatch[1];
  else if (fullAddr.toUpperCase().includes('DISTRITO FEDERAL')) uf = 'DF';
  else {
    const suffixMatch = fullAddr.match(/[\s-]([A-Z]{2})(?:$|[,\s])/);
    if (suffixMatch) uf = suffixMatch[1];
  }

  try {
    let cleanAddr = fullAddr.replace(/^[^\(]+\([A-Z]{2}\)[:\s]*/, '');
    const parts = cleanAddr.split(',').map(p => p.trim()).filter(p => p.length > 0);

    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i].toUpperCase();
      if (part === 'BRASIL') continue;
      if (/\d{5}-?\d{3}/.test(part)) continue;
      if (part.startsWith('REGIÃO')) continue;
      if (part.startsWith('MICRORREGIÃO')) continue;
      if (part.startsWith('VILA ')) continue;
      if (part.startsWith('JARDIM ')) continue;
      if (part.length < 3 || /^\d+/.test(part)) continue;

      city = parts[i];
      break;
    }
  } catch (e) { }

  const stateCorrections = {
    'DE': 'GO', 'DA': 'MT', 'DO': 'SP', 'GM': 'SP', 'VW': 'SP', 'EM': 'SP', 'FEDERAL DISTRICT': 'DF'
  };
  if (stateCorrections[uf]) uf = stateCorrections[uf];

  const cityCorrections = {
    'Sia': 'Brasília', 'Scia': 'Brasília', 'Plano Piloto': 'Brasília', 'Gama': 'Brasília',
    'Taguatinga': 'Brasília', 'Ceilândia': 'Brasília', 'Sobradinho': 'Brasília', 'Guará': 'Brasília',
    'Samambaia': 'Brasília', 'Planaltina': 'Brasília', 'Santa Maria': 'Brasília', 'Cruzeiro': 'Brasília',
    'Lago Sul': 'Brasília', 'Lago Norte': 'Brasília', 'Vicente Pires': 'Brasília', 'Sudoeste / Octogonal': 'Brasília',
    'Recanto Das Emas': 'Brasília', 'Paranoá': 'Brasília', 'Riacho Fundo': 'Brasília', 'São Sebastião': 'Brasília',
    'Águas Claras': 'Brasília', 'Candangolândia': 'Brasília', 'Núcleo Bandeirante': 'Brasília', 'Park Way': 'Brasília',
    'Imbiribeira': 'Recife', 'Hauer': 'Curitiba', 'Pilarzinho': 'Curitiba', 'Portão': 'Curitiba', 'Centro': 'Curitiba',
    'Parolin': 'Curitiba', 'Demarchi': 'São Bernardo do Campo', 'Santana': 'São Paulo', 'Barra Funda': 'São Paulo',
    'República': 'São Paulo', 'Vila Leopoldina': 'São Paulo', 'Brás': 'São Paulo', 'Santo Amaro': 'São Paulo',
    'Itaquera': 'São Paulo', 'Jabaquara': 'São Paulo', 'Moema': 'São Paulo', 'Perdizes': 'São Paulo',
    'Pinheiros': 'São Paulo', 'Limão': 'São Paulo', 'Cachoeirinha': 'São Paulo', 'Brasilândia': 'São Paulo',
    'Jardim Goiás': 'Goiânia', 'Setor Leste': 'Goiânia', 'Setor Norte': 'Brasília',
    'Sol Nascente/pôr Do Sol': 'Brasília',

    'Brasília': 'Brasília',
    'Riacho Fundo Ii': 'Brasília',
    'Riacho Fundo II': 'Brasília',
    'Riacho Fundo Iii': 'Brasília',
    'Arniqueira': 'Brasília',
    'Arniqueiras': 'Brasília',
    'Sobradinho Ii': 'Brasília',
    'Itapoã': 'Brasília',
    'Itapoa': 'Brasília',
    'Brazlândia': 'Brasília',
    'Rua Dos Ipês': 'Brasília',
    'Setor Tradicional': 'Brasília',
    'Cidade De Lucia Costa': 'Brasília',
    'Quadra 35 Conjunto D': 'Brasília',
    'Ville De Montagne - Q 17': 'Brasília',
    'Sudoeste/Octogonal': 'Brasília',
    'Sudoeste/octogonal': 'Brasília',
    'Sudoeste / octogonal': 'Brasília',
    'Condomínio Chácaras Itaipu Chácara 83': 'Brasília',
    'Condominio Chacaras Itaipu Chacara 83': 'Brasília',
    'Varjão': 'Brasília',
    'Edf Smdb Shis Km 274': 'Brasília',
    'Avenida São Sebastião': 'Brasília',
    'Avenida Sao Sebastiao': 'Brasília',
    'Avenida Dom Bosco': 'Brasília',
    'Avenida Rio Tocantins': 'Brasília',
    'Federal District': 'Brasília',
    'Parque E Jardim Paineiras Conjunto 7': 'Brasília'
  };

  if (city && cityCorrections[city]) city = cityCorrections[city];

  if (city.toUpperCase() === 'SÃO PAULO' || city.toUpperCase() === 'OSASCO' || city.toUpperCase() === 'BARUERI') {
    if (uf !== 'SP') uf = 'SP';
  }
  if (city.toUpperCase() === 'RIO DE JANEIRO') if (uf !== 'RJ') uf = 'RJ';
  if (city.toUpperCase() === 'BELO HORIZONTE') if (uf !== 'MG') uf = 'MG';
  if (city.toUpperCase() === 'BRASÍLIA' || city.toUpperCase().includes('DISTRITO FEDERAL')) {
    uf = 'DF';
    city = 'Brasília';
  }
  if (city.toUpperCase() === 'GOIÂNIA' || city.toUpperCase() === 'APARECIDA DE GOIÂNIA') if (uf !== 'GO') uf = 'GO';

  city = city.toLowerCase().replace(/(?:^|\s)\S/g, function (a) { return a.toUpperCase(); });
  if (cityCorrections[city]) city = cityCorrections[city];

  return { uf, city };
};

let matches = [];
for (const r of items) {
  const rawAddr = r.UltimoEnderecoTelemetria || r.Ultimoenderecotelemetria || '';
  if (!rawAddr) continue;
  const loc = extractLocation(rawAddr);
  if (loc.city === 'Brasília' && loc.uf === 'GO') {
    matches.push({ placa: r.Placa || r.placa, id: r.IdVeiculo || r.Id, endereco: rawAddr });
  }
  // também relatar casos onde endereço contém VALPARA ou NOVO GAMA ou CRISTALINA
  const up = rawAddr.toUpperCase();
  if (up.includes('VALPARA') || up.includes('NOVO GAMA') || up.includes('CRISTALINA')) {
    matches.push({ placa: r.Placa || r.placa, id: r.IdVeiculo || r.Id, endereco: rawAddr, reason: 'contains-keyword' });
  }
}

console.log('Total registros verificados:', items.length);
console.log('Casos onde city=Brasília e uf=GO:', matches.filter(m => !m.reason).length);
console.log('Casos com palavras-chave (Valpara/Novo Gama/Cristalina):', matches.filter(m => m.reason === 'contains-keyword').length);
const bad = matches.filter(m => !m.reason);
const keywords = matches.filter(m => m.reason === 'contains-keyword');

if (matches.length > 0) console.log('\nAmostra de ocorrências (até 100):\n', matches.slice(0,100));
else console.log('Nenhuma ocorrência encontrada.');

// gravar resultado para inspecionar mais facilmente
try {
  const outPath = path.join(__dirname, 'check_location_fix_result.json');
  fs.writeFileSync(outPath, JSON.stringify({ total: items.length, bad, keywords }, null, 2), 'utf8');
  console.log('\nResultados salvos em', outPath);
} catch (e) {
  console.warn('Não foi possível salvar resultado:', e.message);
}
