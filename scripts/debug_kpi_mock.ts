
import { calcDiasManutencaoFromOS } from '../src/lib/analytics/fleetTimeline';

console.log('--- START DEBUG ---');

// Data mocked from User Screenshot (Image 0)
// QUAL-440752
const mockData = [
    // Other events
    { Placa: 'SGW-0E99', Ocorrencia: 'QUAL-440752', Etapa: 'Pré-Agendamento', DataEtapa: '2025-12-02 16:45:00' },
    // Arrival
    { Placa: 'SGW-0E99', Ocorrencia: 'QUAL-440752', Etapa: 'Aguardando Chegada', DataEtapa: '2025-12-03 10:18:00' },
    // Intermediates
    { Placa: 'SGW-0E99', Ocorrencia: 'QUAL-440752', Etapa: 'Orçamento em Análise', DataEtapa: '2025-12-03 12:29:00' },
    { Placa: 'SGW-0E99', Ocorrencia: 'QUAL-440752', Etapa: 'Serviço em Execução', DataEtapa: '2025-12-03 15:29:00' },
    // Departure/Retirada
    { Placa: 'SGW-0E99', Ocorrencia: 'QUAL-440752', Etapa: 'Aguardando Retirada do Veículo', DataEtapa: '2025-12-04 10:33:00' }
];

// Test Logic
const days = calcDiasManutencaoFromOS(mockData);
console.log(`Calculated Days: ${days}`);

// Expected: Approx 1.01 days (from 03/12 10:18 to 04/12 10:33)
const expected = (new Date('2025-12-04T10:33:00').getTime() - new Date('2025-12-03T10:18:00').getTime()) / (1000 * 60 * 60 * 24);
console.log(`Expected Days: ${expected}`);

if (days === 0) {
    console.error('FAIL: Logic returned 0 days.');
} else if (Math.abs(days - expected) < 0.01) {
    console.log('SUCCESS: Logic matches expected.');
} else {
    console.log('PARTIAL: Logic returned days but mismatch.', days);
}

console.log('--- END DEBUG ---');
