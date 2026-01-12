
// Mock das funções de fleetTimeline.ts para teste isolado
function parseDateAny(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (br) {
        return new Date(br[3], br[2] - 1, br[1], br[4] || 0, br[5] || 0, br[6] || 0);
    }
    const sql = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (sql) {
        return new Date(sql[1], sql[2] - 1, sql[3], sql[4] || 0, sql[5] || 0, sql[6] || 0);
    }
    return new Date(s);
}

function normalizePlacaKey(raw) {
    return String(raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function calcDiasLocadoFromContratos(contratos, now = new Date(), lifeStart = null, lifeEnd = null) {
    const intervals = [];
    for (const c of contratos) {
        const start = parseDateAny(
            c?.Inicio ?? c?.DataInicio ?? c?.DataInicial ?? c?.InicioContrato ?? c?.DataRetirada ?? c?.DataInicioLocacao
        );
        const end = parseDateAny(
            c?.DataEncerramento ?? c?.Fim ?? c?.DataFim ?? c?.DataFimEfetiva ?? c?.DataTermino ?? c?.DataFimLocacao
        );
        if (!start) continue;
        let s = start;
        let e = end || now;
        if (lifeStart && s.getTime() < lifeStart.getTime()) s = lifeStart;
        if (lifeEnd && e.getTime() > lifeEnd.getTime()) e = lifeEnd;
        if (e.getTime() <= s.getTime()) continue;
        intervals.push({ start: s, end: e });
    }

    intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged = [];
    for (const iv of intervals) {
        const last = merged[merged.length - 1];
        if (!last) {
            merged.push({ start: new Date(iv.start), end: new Date(iv.end) });
            continue;
        }
        if (iv.start.getTime() <= last.end.getTime()) {
            if (iv.end.getTime() > last.end.getTime()) last.end = new Date(iv.end);
        } else {
            merged.push({ start: new Date(iv.start), end: new Date(iv.end) });
        }
    }
    const totalDays = merged.reduce((sum, m) => sum + Math.max(0, (m.end.getTime() - m.start.getTime()) / (1000 * 60 * 60 * 24)), 0);
    return { merged, totalDays };
}

function calcDiasManutencaoFromOS(osRecords, now = new Date()) {
    if (!Array.isArray(osRecords) || osRecords.length === 0) return 0;

    const byOcc = {};
    for (let i = 0; i < osRecords.length; i++) {
        const r = osRecords[i];
        // AQUI ESTÁ O PONTO IMPORTANTE: VERIFICAR SE 'Ocorrencia' está sendo pego
        const occKey = String(r?.Ocorrencia ?? r?.OcorrenciaId ?? r?.MovimentacaoId ?? r?.Id ?? r?.IdOcorrencia ?? `${r?.Placa ?? 'NA'}_${i}`);
        if (!byOcc[occKey]) byOcc[occKey] = [];
        byOcc[occKey].push(r);
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    let sum = 0;

    function isArrival(etapa) {
        if (!etapa) return false;
        return etapa.includes('AGUARDANDO CHEGADA') || etapa.includes('CHEG') || etapa.includes('ENTR') || etapa.includes('RECEB');
    }

    function isRetirada(etapa) {
        if (!etapa) return false;
        return etapa.includes('AGUARDANDO RETIRADA DO VEICULO') || etapa.includes('AGUARDANDO RETIRADA') || etapa.includes('RETIR') || etapa.includes('SAIDA') || etapa.includes('CONCLUI') || etapa.includes('LIBERAD');
    }

    for (const key of Object.keys(byOcc)) {
        const group = byOcc[key].slice().map((r) => ({ r, d: parseDateAny(r?.DataEtapa ?? r?.Data ?? r?.DataChegada ?? r?.DataEntrada) })).filter(x => x.d).sort((a, b) => a.d.getTime() - b.d.getTime());
        if (group.length === 0) continue;

        for (let i = 0; i < group.length; i++) {
            const rec = group[i];
            const etapaText = String(rec.r?.etapa ?? rec.r?.Etapa ?? '').trim().toUpperCase();

            console.log(`Checking etapa: ${etapaText} for occ ${key}`);

            if (!isArrival(etapaText)) continue;
            const start = rec.d;
            let end = null;
            for (let j = i + 1; j < group.length; j++) {
                const next = group[j];
                const nextEt = String(next.r?.etapa ?? next.r?.Etapa ?? '').trim().toUpperCase();
                if (isRetirada(nextEt)) { end = next.d; break; }
            }
            if (!end) end = now;
            const days = Math.max(0, (end.getTime() - start.getTime()) / msPerDay);
            console.log(`Found interval for ${key}: ${start.toISOString()} to ${end.toISOString()} = ${days} days`);
            sum += days;
        }
    }

    return sum;
}

// DADOS DE TESTE (SGW-0E99)
const now = new Date('2026-01-12T12:00:00'); // Data atual simulada conforme contexto
const veiculo = {
    Placa: 'SGW-0E99',
    DataCompra: '2023-06-27',
    // DataVenda: null 
};

const contratos = [
    { PlacaPrincipal: 'SGW-0E99', Inicio: '2023-10-09', DataEncerramento: '2024-11-18' },
    { PlacaPrincipal: 'SGW-0E99', Inicio: '2025-01-15', DataEncerramento: null } // Em andamento
];

const manutencao = [
    { Ocorrencia: 'QUAL-440752', Etapa: 'Aguardando Chegada', DataEtapa: '2025-12-03 10:18:00', Placa: 'SGW-0E99' },
    { Ocorrencia: 'QUAL-440752', Etapa: 'Aguardando Retirada do Veículo', DataEtapa: '2025-12-04 10:33:00', Placa: 'SGW-0E99' }
];

// SIMULAÇÃO
console.log('--- TESTE LOCAÇÃO ---');
const dataCompra = parseDateAny(veiculo.DataCompra);
const dataVenda = null;
const lifeStart = dataCompra;
const lifeEnd = dataVenda || null;

const locRes = calcDiasLocadoFromContratos(contratos, now, lifeStart, lifeEnd);
console.log('Dias Locado:', locRes.totalDays);
console.log('Intervalos mesclados:', locRes.merged);


console.log('\n--- TESTE MANUTENÇÃO ---');
const manRes = calcDiasManutencaoFromOS(manutencao, now);
console.log('Dias Manutenção:', manRes);

console.log('\n--- TESTE FROTA PARADA ---');
const fim = lifeEnd || now;
const diasVida = dataCompra ? Math.max(0, (fim.getTime() - dataCompra.getTime()) / (1000 * 60 * 60 * 24)) : 0;
const diasParado = dataCompra ? Math.max(0, diasVida - locRes.totalDays) : 0;
console.log('Dias Vida:', diasVida);
console.log('Dias Parado:', diasParado);
