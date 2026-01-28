const fs = require('fs');
const readline = require('readline');

const IN = process.env.IN_PATH || 'public/data/mapa_universal_sources_raw.ndjson';
const OUT = process.env.OUT_PATH || 'public/data/mapa_universal_full_with_fontes.ndjson';

function pick(fields, obj) {
  for (const f of fields) {
    const v = obj[f];
    if (v !== undefined && v !== null && String(v).toString().trim() !== '') return { value: String(v), source: f };
  }
  return { value: null, source: null };
}

(async function main(){
  if (!fs.existsSync(IN)) {
    console.error('Arquivo fonte não encontrado:', IN);
    process.exit(2);
  }
  console.log('Transformando', IN, '→', OUT);
  const inStream = fs.createReadStream(IN, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: inStream, crlfDelay: Infinity });
  const outStream = fs.createWriteStream(OUT, { flags: 'w' });

  let count = 0;
  for await (const line of rl) {
    if (!line || !line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch (e) { console.error('JSON parse error, skipping line', e && e.message); continue; }
    const placaPick = pick(['OS_Placa','V_Mestre_Placa','V_Emergencia_Placa','VC_CompraDireta_Placa','VC_Compra_via_OC_Placa','OI_via_Nota_Placa','OI_Placa','VC_Placa','CL_via_Item_PlacaPrincipal','L_PlacaExtraidaTexto','CL_via_Item_PlacaReserva'], r);
    const contratoLocPick = pick(['OS_ContratoLocacao','CL_Item_ContratoLocacao'], r);
    const contratoComPick = pick(['OS_ContratoComercial','CC_Item_NumeroDocumento'], r);
    const clientePick = pick(['C_via_OS_Nome','L_ClienteExtraidoTexto','C_via_Item_Nome','C_via_Fatura_Nome','VV_Comprador'], r);

    const fontes = [];
    if (placaPick.source) fontes.push(placaPick.source);
    if (contratoLocPick.source) fontes.push(contratoLocPick.source);
    if (contratoComPick.source) fontes.push(contratoComPick.source);
    if (clientePick.source) fontes.push(clientePick.source);

    const out = {
      NumeroLancamento: r.NumeroLancamento != null ? String(r.NumeroLancamento) : null,
      Natureza: r.Natureza || null,
      Placa: placaPick.value,
      FontePlaca: placaPick.source || null,
      ContratoLocacao: contratoLocPick.value,
      FonteContratoLocacao: contratoLocPick.source || null,
      ContratoComercial: contratoComPick.value,
      FonteContratoComercial: contratoComPick.source || null,
      Cliente: clientePick.value,
      FonteCliente: clientePick.source || null,
      FonteDescricao: fontes.length ? fontes.join(',') : null
    };

    outStream.write(JSON.stringify(out) + '\n');
    count++;
    if (count % 10000 === 0) console.log('Processed', count);
  }
  outStream.end();
  console.log('Transform finished. Lines:', count);
})();
