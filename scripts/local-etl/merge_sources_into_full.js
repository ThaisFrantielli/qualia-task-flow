const fs = require('fs');
const IN_FULL = 'public/data/mapa_universal_full.ndjson';
const IN_SOURCES = 'public/data/mapa_universal_sources_raw.ndjson';
const OUT = 'public/data/mapa_universal_full_with_fontes.ndjson';

if (!fs.existsSync(IN_FULL) || !fs.existsSync(IN_SOURCES)) {
  console.error('Arquivos fonte faltando. Verifique:', IN_FULL, IN_SOURCES);
  process.exit(2);
}

console.log('Lendo sources raw em memória (pode consumir RAM)...');
const map = new Map();
const rl1 = require('readline').createInterface({ input: fs.createReadStream(IN_SOURCES), crlfDelay: Infinity });
(async ()=>{
  for await (const line of rl1) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    map.set(String(r.NumeroLancamento), r);
  }

  console.log('Mesclando com arquivo full...');
  const rl2 = require('readline').createInterface({ input: fs.createReadStream(IN_FULL), crlfDelay: Infinity });
  if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
  const out = fs.createWriteStream(OUT, { flags: 'a' });
  let cnt = 0;
  for await (const line of rl2) {
    if (!line.trim()) continue;
    const obj = JSON.parse(line);
    const key = String(obj.NumeroLancamento);
    const s = map.get(key);
    obj.FontePlaca = null;
    obj.FonteContratoComercial = null;
    obj.FonteContratoLocacao = null;
    obj.FonteCliente = null;
    if (s) {
      // determine FontePlaca by priority
      const plateSources = [
        ['OS_Placa','OrdensServico'],['V_Mestre_Placa','Veiculos'],['V_Emergencia_Placa','VeiculosEmergencia'],['VC_CompraDireta_Placa','VeiculosComprados'],['VC_Compra_via_OC_Placa','VeiculosComprados'],['OI_via_Nota_Placa','OcorrenciasInfracoes'],['OI_Placa','OcorrenciasInfracoes'],['VC_Placa','VeiculosCompradosViaAlienacao'],['CL_via_Item_PlacaPrincipal','ContratosLocacaoItem'],['L_PlacaExtraidaTexto','LancamentosComNaturezas(Descricao)'],['CL_via_Item_PlacaReserva','ContratosLocacaoReserva']
      ];
      for (const [col,name] of plateSources){
        if (s[col]) { obj.FontePlaca = name; break; }
      }
      const contratoComSources = [['OS_ContratoComercial','OrdensServico'],['CC_Item_NumeroDocumento','ContratosComerciais']];
      for (const [col,name] of contratoComSources){ if (s[col]) { obj.FonteContratoComercial = name; break; } }
      const contratoLocSources = [['OS_ContratoLocacao','OrdensServico'],['CL_Item_ContratoLocacao','FaturamentoItem/ContratoLocacao']];
      for (const [col,name] of contratoLocSources){ if (s[col]) { obj.FonteContratoLocacao = name; break; } }
      const clienteSources = [['VV_Comprador','VeiculosVendidos'],['C_via_OS_Nome','Clientes-via-OS'],['L_ClienteExtraidoTexto','LancamentosComNaturezas(Descricao)'],['C_via_Item_Nome','Clientes-via-Item'],['C_via_Fatura_Nome','Clientes-via-Fatura']];
      for (const [col,name] of clienteSources){ if (s[col]) { obj.FonteCliente = name; break; } }
    }
    const parts = [];
    if (obj.FontePlaca) parts.push('Placa:'+obj.FontePlaca);
    if (obj.FonteContratoComercial) parts.push('ContratoComercial:'+obj.FonteContratoComercial);
    if (obj.FonteContratoLocacao) parts.push('ContratoLocacao:'+obj.FonteContratoLocacao);
    if (obj.FonteCliente) parts.push('Cliente:'+obj.FonteCliente);
    obj.FonteDescricao = parts.join('; ');

    out.write(JSON.stringify(obj)+'\n');
    cnt++;
    if (cnt % 1000 === 0) console.log('merged', cnt);
  }
  out.end();
  console.log('Merge completo. Linhas:', cnt, 'arquivo:', OUT);
})();
