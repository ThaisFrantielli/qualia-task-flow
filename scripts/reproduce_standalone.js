
// Helper: Parse Date
function parseDateAny(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s) return null;

    // Try YYYY-MM-DD HH:mm:ss
    const sql = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (sql) {
        const yyyy = Number(sql[1]);
        const mm = Number(sql[2]);
        const dd = Number(sql[3]);
        const hh = sql[4] ? Number(sql[4]) : 0;
        const mi = sql[5] ? Number(sql[5]) : 0;
        const ss = sql[6] ? Number(sql[6]) : 0;
        return new Date(yyyy, mm - 1, dd, hh, mi, ss, 0);
    }
    return new Date(s);
}

// Logic under test
function calcDiasManutencaoFromOS(osRecords, now = new Date()) {
    if (!Array.isArray(osRecords) || osRecords.length === 0) return 0;

    const byOcc = {};
    osRecords.forEach((r, i) => {
        // Determine key
        const occKey = String(r?.Ocorrencia ?? r?.OcorrenciaId ?? r?.MovimentacaoId ?? r?.Id ?? r?.IdOcorrencia ?? `${r?.Placa ?? 'NA'}_${i}`);
        if (!byOcc[occKey]) byOcc[occKey] = [];
        byOcc[occKey].push(r);
    });

    const msPerDay = 1000 * 60 * 60 * 24;
    let sum = 0;

    function normalizeEtapaText(t) {
        if (!t) return '';
        return String(t).trim().toUpperCase();
    }

    function isArrival(etapa) {
        if (!etapa) return false;
        // Updated logic from fleetTimeline.ts
        return etapa.includes('AGUARDANDO CHEGADA') || etapa.includes('CHEG') || etapa.includes('ENTR') || etapa.includes('RECEB') || etapa.includes('AGENDAMENTO');
    }

    function isRetirada(etapa) {
        if (!etapa) return false;
        // Updated logic from fleetTimeline.ts
        // Added 'AGUARDANDO RETIRADA DO VEICULO' as seen in screenshot
        return etapa.includes('AGUARDANDO RETIRADA DO VEICULO') ||
            etapa.includes('AGUARDANDO RETIRADA') ||
            etapa.includes('RETIR') ||
            etapa.includes('SAIDA') ||
            etapa.includes('CONCLUI') ||
            etapa.includes('LIBERAD');
    }

    Object.keys(byOcc).forEach(key => {
        const group = byOcc[key]
            .map(r => ({ r, d: parseDateAny(r.DataEtapa || r.Data) }))
            .filter(x => x.d && !isNaN(x.d.getTime()))
            .sort((a, b) => a.d.getTime() - b.d.getTime());

        if (group.length === 0) return;

        for (let i = 0; i < group.length; i++) {
            const rec = group[i];
            const etapaText = normalizeEtapaText(rec.r.Etapa);

            // LOG EACH STEP for Debugging
            console.log(`Checking Stage: ${etapaText} at ${rec.d.toISOString()}`);

            if (!isArrival(etapaText)) continue;

            const start = rec.d;
            let end = null;
            console.log(`  -> FOUND ARRIVAL. Searching for departure...`);

            for (let j = i + 1; j < group.length; j++) {
                const next = group[j];
                const nextEt = normalizeEtapaText(next.r.Etapa);
                if (isRetirada(nextEt)) {
                    end = next.d;
                    console.log(`  -> FOUND DEPARTURE: ${nextEt} at ${next.d.toISOString()}`);
                    break;
                }
            }

            if (!end) {
                end = now;
                console.log(`  -> NO DEPARTURE found. Using NOW: ${end.toISOString()}`);
            }

            const days = Math.max(0, (end.getTime() - start.getTime()) / msPerDay);
            console.log(`  -> Duration: ${days.toFixed(4)} days`);
            sum += days;
        }
    });

    return sum;
}

// --- MOCK DATA FROM SCREENSHOT ---
const mockData = [
    { Placa: 'SGW-0E99', Ocorrencia: 'QUAL-440752', Etapa: 'Pré-Agendamento', DataEtapa: '2025-12-02 16:45:00' },
    { Placa: 'SGW-0E99', Ocorrencia: 'QUAL-440752', Etapa: 'Aguardando Chegada', DataEtapa: '2025-12-03 10:18:00' }, // ARRIVAL
    { Placa: 'SGW-0E99', Ocorrencia: 'QUAL-440752', Etapa: 'Orçamento em Análise', DataEtapa: '2025-12-03 12:29:00' },
    { Placa: 'SGW-0E99', Ocorrencia: 'QUAL-440752', Etapa: 'Serviço em Execução', DataEtapa: '2025-12-03 15:29:00' },
    { Placa: 'SGW-0E99', Ocorrencia: 'QUAL-440752', Etapa: 'Aguardando Retirada do Veículo', DataEtapa: '2025-12-04 10:33:00' } // DEPARTURE
];

console.log('--- RUNNING CALCULATION ---');
const result = calcDiasManutencaoFromOS(mockData);
console.log(`\nTOTAL RESULT: ${result}`);
console.log('--- END ---');
