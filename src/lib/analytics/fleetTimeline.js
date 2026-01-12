"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDateAny = parseDateAny;
exports.normalizePlacaKey = normalizePlacaKey;
exports.normalizeEventName = normalizeEventName;
exports.getEventDate = getEventDate;
exports.eventToState = eventToState;
exports.calcStateDurationsDays = calcStateDurationsDays;
exports.extractDataCompra = extractDataCompra;
exports.extractDataVenda = extractDataVenda;
exports.calcDiasLocadoFromContratos = calcDiasLocadoFromContratos;
exports.calcDiasManutencaoFromOS = calcDiasManutencaoFromOS;
exports.aggregateFleetMetrics = aggregateFleetMetrics;
exports.formatDurationDays = formatDurationDays;
exports.extractVehicleDates = extractVehicleDates;
function parseDateAny(raw) {
    if (!raw)
        return null;
    const s = String(raw).trim();
    if (!s)
        return null;
    const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (br) {
        const dd = Number(br[1]);
        const mm = Number(br[2]);
        const yyyy = Number(br[3]);
        const hh = br[4] ? Number(br[4]) : 0;
        const mi = br[5] ? Number(br[5]) : 0;
        const ss = br[6] ? Number(br[6]) : 0;
        const dt = new Date(yyyy, mm - 1, dd, hh, mi, ss, 0);
        if (!Number.isNaN(dt.getTime()))
            return dt;
    }
    const sql = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (sql) {
        const yyyy = Number(sql[1]);
        const mm = Number(sql[2]);
        const dd = Number(sql[3]);
        const hh = sql[4] ? Number(sql[4]) : 0;
        const mi = sql[5] ? Number(sql[5]) : 0;
        const ss = sql[6] ? Number(sql[6]) : 0;
        const dt = new Date(yyyy, mm - 1, dd, hh, mi, ss, 0);
        if (!Number.isNaN(dt.getTime()))
            return dt;
    }
    const direct = new Date(s);
    if (!Number.isNaN(direct.getTime()))
        return direct;
    return null;
}
function normalizePlacaKey(raw) {
    return String(raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
function stripAccents(input) {
    try {
        return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    catch (e) {
        return input;
    }
}
function normalizeEventName(raw) {
    if (!raw)
        return '';
    const s = String(raw ?? '').trim();
    // remove accents and uppercase
    try {
        return stripAccents(s).toUpperCase();
    }
    catch (e) {
        return s.toUpperCase();
    }
}
function getEventDate(e) {
    const raw = e?.DataEvento ?? e?.Data ?? e?.data_evento ?? e?.data ?? e?.DataInicio ?? e?.DataInicioLocacao;
    return parseDateAny(raw);
}
function eventToState(e) {
    const n = normalizeEventName(e?.TipoEvento ?? e?.Evento ?? e?.tipo_evento ?? e?.evento ?? e?.Status ?? e?.StatusEvento);
    if (!n)
        return null;
    if (n.includes('LOCAC') || n.includes('ALUGUEL') || n.includes('RETIRADA'))
        return 'LOCACAO';
    if (n.includes('MANUT') || n.includes('OFICINA') || n.includes('REPARO') || n.includes('SERVICO'))
        return 'MANUTENCAO';
    if (n.includes('SINIST') || n.includes('ACIDENT') || n.includes('COLISAO') || n.includes('BATIDA'))
        return 'SINISTRO';
    if (n.includes('MULTA') || n.includes('INFRAC'))
        return 'MULTA';
    return 'OUTRO';
}
function calcStateDurationsDays(events, now = new Date()) {
    if (!Array.isArray(events) || events.length === 0) {
        return { totalDays: 0, locacaoDays: 0, manutencaoDays: 0, sinistroDays: 0 };
    }
    const normalized = events
        .map((e) => ({ e, d: getEventDate(e), s: eventToState(e) }))
        .filter((x) => x.d && x.d instanceof Date)
        .sort((a, b) => a.d.getTime() - b.d.getTime());
    if (normalized.length === 0)
        return { totalDays: 0, locacaoDays: 0, manutencaoDays: 0, sinistroDays: 0 };
    const first = normalized[0].d;
    const totalDays = Math.max(0, (now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
    let locacaoDays = 0;
    let manutencaoDays = 0;
    let sinistroDays = 0;
    for (let i = 0; i < normalized.length; i++) {
        const cur = normalized[i];
        const start = cur.d;
        const end = i < normalized.length - 1 ? normalized[i + 1].d : now;
        if (!start || !end)
            continue;
        const days = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const state = cur.s;
        if (state === 'LOCACAO')
            locacaoDays += days;
        else if (state === 'MANUTENCAO')
            manutencaoDays += days;
        else if (state === 'SINISTRO')
            sinistroDays += days;
    }
    return { totalDays, locacaoDays, manutencaoDays, sinistroDays };
}
function extractDataCompra(veiculo) {
    if (!veiculo)
        return null;
    const candidates = [
        // Preferência: campo vindo de dim_frota (DW) conforme mapeamento do usuário
        veiculo?.DataCompra,
        veiculo?.DataAquisicao,
        veiculo?.['Data Compra'],
        veiculo?.['Data de Compra'],
        veiculo?.datacompra,
        veiculo?.dataaquisicao,
        veiculo?.Compra?.DataCompra,
        veiculo?.compra?.DataCompra
    ];
    for (const c of candidates) {
        const d = parseDateAny(c);
        if (d)
            return d;
    }
    return null;
}
function extractDataVenda(veiculo) {
    if (!veiculo)
        return null;
    const candidates = [
        // Campo vindo de dim_frota / VeiculosVendidos no DW
        veiculo?.DataVenda ?? veiculo?.Datavenda ?? veiculo?.dataVenda ?? veiculo?.datavenda,
        veiculo?.DataBaixa,
        veiculo?.DataAlienacao,
        veiculo?.venda?.DataVenda
    ];
    for (const c of candidates) {
        const d = parseDateAny(c);
        if (d)
            return d;
    }
    return null;
}
function buildContractIntervals(contratos, now = new Date(), lifeStart = null, lifeEnd = null) {
    const intervals = [];
    if (!Array.isArray(contratos))
        return { raw: intervals, merged: [], totalDays: 0 };
    for (const c of contratos) {
        const start = parseDateAny(c?.Inicio ?? c?.DataInicio ?? c?.DataInicial ?? c?.InicioContrato ?? c?.DataRetirada ?? c?.DataInicioLocacao);
        const end = parseDateAny(c?.DataEncerramento ?? c?.Fim ?? c?.DataFim ?? c?.DataFimEfetiva ?? c?.DataTermino ?? c?.DataFimLocacao);
        if (!start)
            continue;
        let s = start;
        let e = end || now;
        if (lifeStart && s.getTime() < lifeStart.getTime())
            s = lifeStart;
        if (lifeEnd && e.getTime() > lifeEnd.getTime())
            e = lifeEnd;
        if (e.getTime() <= s.getTime())
            continue;
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
            if (iv.end.getTime() > last.end.getTime())
                last.end = new Date(iv.end);
        }
        else {
            merged.push({ start: new Date(iv.start), end: new Date(iv.end) });
        }
    }
    const totalDays = merged.reduce((sum, m) => sum + Math.max(0, (m.end.getTime() - m.start.getTime()) / (1000 * 60 * 60 * 24)), 0);
    return { raw: intervals, merged, totalDays };
}
function calcDiasLocadoFromContratos(contratos, now = new Date(), lifeStart = null, lifeEnd = null) {
    const { totalDays } = buildContractIntervals(contratos, now, lifeStart, lifeEnd);
    return totalDays;
}
function calcDiasManutencaoFromOS(osRecords, now = new Date()) {
    if (!Array.isArray(osRecords) || osRecords.length === 0)
        return 0;
    // Heurística: agrupar por identificação de ocorrência/movimentação quando disponível,
    // parear registro de chegada (etapa de chegada/entrada) com etapa de retirada (aguardando retirada/retirada/saida/conclusao).
    const byOcc = {};
    for (let i = 0; i < osRecords.length; i++) {
        const r = osRecords[i];
        // Adicionado r?.Ocorrencia pois é o campo retornado pelo ETL (fat_movimentacao_ocorrencias)
        const occKey = String(r?.Ocorrencia ?? r?.OcorrenciaId ?? r?.MovimentacaoId ?? r?.Id ?? r?.IdOcorrencia ?? `${r?.Placa ?? 'NA'}_${i}`);
        if (!byOcc[occKey])
            byOcc[occKey] = [];
        byOcc[occKey].push(r);
    }
    const msPerDay = 1000 * 60 * 60 * 24;
    let sum = 0;
    function normalizeEtapaText(t) {
        if (!t)
            return '';
        return String(t).trim().toUpperCase();
    }
    function isArrival(etapa) {
        if (!etapa)
            return false;
        // Prioriza etapa exata "AGUARDANDO CHEGADA" conforme workflow de manutenção
        return etapa.includes('AGUARDANDO CHEGADA') || etapa.includes('CHEG') || etapa.includes('ENTR') || etapa.includes('RECEB');
    }
    function isRetirada(etapa) {
        if (!etapa)
            return false;
        // Prioriza etapa exata "AGUARDANDO RETIRADA DO VEICULO" conforme workflow de manutenção
        return etapa.includes('AGUARDANDO RETIRADA DO VEICULO') || etapa.includes('AGUARDANDO RETIRADA') || etapa.includes('RETIR') || etapa.includes('SAIDA') || etapa.includes('CONCLUI') || etapa.includes('LIBERAD');
    }
    for (const key of Object.keys(byOcc)) {
        const group = byOcc[key].slice().map((r) => ({ r, d: parseDateAny(r?.DataEtapa ?? r?.Data ?? r?.DataChegada ?? r?.DataEntrada) })).filter(x => x.d).sort((a, b) => a.d.getTime() - b.d.getTime());
        if (group.length === 0)
            continue;
        // Tentar parear: para cada arrival -> next retirada (no mesmo grupo). Se não encontrar retirada, usa `now`.
        for (let i = 0; i < group.length; i++) {
            const rec = group[i];
            const etapaText = normalizeEtapaText(rec.r?.etapa ?? rec.r?.Etapa ?? rec.r?.EtapaMovimentacao ?? rec.r?.DescricaoEtapa);
            if (!isArrival(etapaText))
                continue;
            const start = rec.d;
            // procurar retirada após a chegada
            let end = null;
            for (let j = i + 1; j < group.length; j++) {
                const next = group[j];
                const nextEt = normalizeEtapaText(next.r?.etapa ?? next.r?.Etapa ?? next.r?.EtapaMovimentacao ?? next.r?.DescricaoEtapa);
                if (isRetirada(nextEt)) {
                    end = next.d;
                    break;
                }
            }
            // Debug SGW-0E99
            if (osRecords.some(r => r.Placa === 'SGW-0E99' || r.Placa === 'SGW0E99')) {
                console.log(`[DEBUG_MT_PAIR] Found pair for ${key}:`, { start, end: end || 'NOW', days: end ? (end.getTime() - start.getTime()) / msPerDay : 'OPEN' });
            }
            if (!end)
                end = now;
            const days = Math.max(0, (end.getTime() - start.getTime()) / msPerDay);
            sum += days;
        }
    }
    // Debug Global Capture for Browser Agent
    if (osRecords.some(r => r.Placa === 'SGW-0E99' || r.Placa === 'SGW0E99')) {
        // @ts-ignore
        window.__DEBUG_SGW0E99__ = {
            timestamp: new Date().toISOString(),
            osRecordsCount: osRecords.length,
            groupedOccurrences: Object.keys(byOcc).map(k => ({
                key: k,
                items: byOcc[k].length,
                stages: byOcc[k].map(r => normalizeEtapaText(r?.etapa ?? r?.Etapa ?? r?.EtapaMovimentacao ?? r?.DescricaoEtapa))
            })),
            calculatedDays: sum
        };
        console.log('[DEBUG_MT_FINAL] Captured SGW-0E99 data to window.__DEBUG_SGW0E99__');
    }
    return sum;
}
function aggregateFleetMetrics(frota, contratos, manutencao, movimentacoes = null, // Novo argumento opcional
now = new Date()) {
    const frotaArr = Array.isArray(frota) ? frota : [];
    const contratosArr = Array.isArray(contratos) ? contratos : contratos?.data || [];
    const manutArr = Array.isArray(manutencao) ? manutencao : manutencao?.data || [];
    const movArr = Array.isArray(movimentacoes) ? movimentacoes : movimentacoes?.data || [];
    // Se tivermos movimentações, usamos elas para o cálculo de dias. Se não, fallback para manutenção.
    const sourceForMaintenanceDays = movArr.length > 0 ? movArr : manutArr;
    const contratosByPlaca = {};
    const manutByPlaca = {};
    for (const c of contratosArr) {
        const placa = normalizePlacaKey(c?.PlacaPrincipal ?? c?.Placa ?? c?.placa);
        if (!placa)
            continue;
        if (!contratosByPlaca[placa])
            contratosByPlaca[placa] = [];
        contratosByPlaca[placa].push(c);
    }
    for (const m of sourceForMaintenanceDays) {
        const placa = normalizePlacaKey(m?.Placa ?? m?.placa);
        if (!placa)
            continue;
        if (!manutByPlaca[placa])
            manutByPlaca[placa] = [];
        manutByPlaca[placa].push(m);
    }
    const metricsPerVehicle = [];
    for (const v of frotaArr) {
        const placaRaw = v?.Placa ?? v?.placa ?? '';
        const placa = normalizePlacaKey(placaRaw);
        if (!placa)
            continue;
        const dataCompra = extractDataCompra(v);
        const dataVenda = extractDataVenda(v);
        const lifeStart = dataCompra;
        const lifeEnd = dataVenda || null;
        const contratosPlaca = contratosByPlaca[placa] || [];
        const manutPlaca = manutByPlaca[placa] || [];
        const diasLocadoRaw = calcDiasLocadoFromContratos(contratosPlaca, now, lifeStart, lifeEnd);
        const fim = lifeEnd || now;
        const diasVida = dataCompra ? Math.max(0, (fim.getTime() - dataCompra.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const diasLocado = dataCompra ? Math.min(diasLocadoRaw, diasVida) : diasLocadoRaw;
        const diasManutencao = calcDiasManutencaoFromOS(manutPlaca, now);
        const diasParado = dataCompra ? Math.max(0, diasVida - diasLocado) : 0;
        const percentualUtilizacao = diasVida > 0 ? Math.min(100, Math.max(0, (diasLocado / diasVida) * 100)) : 0;
        metricsPerVehicle.push({
            placa,
            dataCompra,
            dataVenda,
            diasVida,
            diasLocado,
            diasManutencao: diasManutencao,
            diasParado,
            percentualUtilizacao
        });
    }
    const totalVeiculos = Math.max(1, metricsPerVehicle.length);
    const totalLocadoDays = metricsPerVehicle.reduce((s, m) => s + m.diasLocado, 0);
    const totalManutencaoDays = metricsPerVehicle.reduce((s, m) => s + m.diasManutencao, 0);
    const totalParadoDays = metricsPerVehicle.reduce((s, m) => s + m.diasParado, 0);
    const mediaLocado = totalLocadoDays / totalVeiculos;
    const mediaManutencao = totalManutencaoDays / totalVeiculos;
    const mediaParado = totalParadoDays / totalVeiculos;
    const utilizacaoPct = (totalLocadoDays + totalParadoDays) > 0 ? (totalLocadoDays / (totalLocadoDays + totalParadoDays)) * 100 : 0;
    return {
        mediaLocado,
        mediaManutencao,
        mediaParado,
        totalVeiculos: metricsPerVehicle.length,
        totalLocadoDays,
        totalManutencaoDays,
        totalParadoDays,
        utilizacaoPct,
        metricsPerVehicle
    };
}
function formatDurationDays(days) {
    if (days == null || isNaN(days))
        return '—';
    const d = Math.max(0, Math.floor(days));
    if (d === 0)
        return '0 d';
    const years = Math.floor(d / 365);
    const months = Math.floor((d % 365) / 30);
    const remDays = d - years * 365 - months * 30;
    const parts = [];
    if (years > 0)
        parts.push(`${years} a`);
    if (months > 0)
        parts.push(`${months} m`);
    if (remDays > 0)
        parts.push(`${remDays} d`);
    return parts.join(' ');
}
function extractVehicleDates(veiculo) {
    return {
        compra: extractDataCompra(veiculo),
        venda: extractDataVenda(veiculo)
    };
}
