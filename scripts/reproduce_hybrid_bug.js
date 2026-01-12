
// Logic under test (current state of fleetTimeline.ts)
function calcDiasManutencaoFromOS(osRecords, now = new Date()) {
    if (!Array.isArray(osRecords) || osRecords.length === 0) return 0;

    const msPerDay = 1000 * 60 * 60 * 24;
    let sum = 0;
    const eventStream = [];

    // Fake helper
    function parseDateAny(raw) {
        if (!raw) return null;
        return new Date(raw);
    }

    for (const r of osRecords) {
        const dEntrada = parseDateAny(r?.DataEntrada ?? r?.DataInicioServico ?? r?.DataInicio);
        const dSaida = parseDateAny(r?.DataSaida ?? r?.DataConclusaoOcorrencia ?? r?.DataFim);
        const hasEtapa = Boolean(r?.Etapa || r?.etapa || r?.DescricaoEtapa);

        // CURRENT BUGGY CONDITION:
        if (dEntrada && (dSaida || !hasEtapa)) {
            console.log('  -> Treated as INTERVAL');
            const end = dSaida || now;
            if (end.getTime() > dEntrada.getTime()) {
                sum += (end.getTime() - dEntrada.getTime()) / msPerDay;
            }
            continue;
        }
        console.log('  -> Treated as EVENT STREAM (Fallback)');
        eventStream.push(r);
    }

    // Simplified event stream logic (just checking if it gets here)
    if (eventStream.length > 0) {
        console.log('  -> Processing Event Stream (Simulated Failure for generic Etapa)');
        // In real code, this fails if Etapa is generic like "Em Andamento"
    }

    return sum;
}

const now = new Date('2025-12-10T00:00:00');

// Scenario 1: Closed OS (Has Start, End, and Etapa) -> Should be Interval
console.log('Test 1: Closed OS with Etapa');
const closedVal = calcDiasManutencaoFromOS([{
    DataEntrada: '2025-12-01',
    DataSaida: '2025-12-05',
    Etapa: 'Concluída'
}], now);
console.log(`Result: ${closedVal} (Expected ~4)\n`);

// Scenario 2: Open OS (Has Start, No End, and Etapa) -> Should be Interval (Open) but MIGHT fail
console.log('Test 2: Open OS with Etapa (The Bug?)');
const openVal = calcDiasManutencaoFromOS([{
    DataEntrada: '2025-12-01',
    DataSaida: null,
    Etapa: 'Em Andamento'
}], now);
console.log(`Result: ${openVal} (Expected ~9 days from 01 to 10)\n`);

// Scenario 3: Proposed Fix
console.log('Test 3: Proposed Fix Logic Check');
const r = { DataEntrada: '2025-12-01', DataSaida: null, Etapa: 'Em Andamento' };
const dEntrada = new Date(r.DataEntrada);
const dSaida = null;
const hasEtapa = true;

const conditionOriginal = dEntrada && (dSaida || !hasEtapa);
const conditionProposed = !!dEntrada;

console.log(`Original Condition: ${conditionOriginal ? 'MATCH' : 'FAIL'}`);
console.log(`Proposed Condition: ${conditionProposed ? 'MATCH' : 'FAIL'}`);
