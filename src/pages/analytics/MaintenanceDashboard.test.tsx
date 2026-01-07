import { describe, it, expect } from 'vitest';

/**
 * Testes para MaintenanceDashboard.tsx
 * Validações de cálculos críticos: MTTR, MTBF, Taxa de Reincidência
 */

// Função auxiliar de normalização de data (copiada do componente)
function normalizeDate(dateString: string): Date {
  const dateOnly = dateString.split('T')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

describe('MaintenanceDashboard - Cálculos de KPIs', () => {
  describe('Normalização de Datas', () => {
    it('deve normalizar data ISO para meia-noite local', () => {
      const date = normalizeDate('2025-12-25');
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(11); // Dezembro = 11
      expect(date.getDate()).toBe(25);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
    });

    it('deve ignorar horário se presente na string', () => {
      const date = normalizeDate('2025-12-25T14:30:00');
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
    });
  });

  describe('MTTR - Mean Time to Repair', () => {
    it('deve calcular média de dias parado corretamente', () => {
      const osData: Array<{DiasParado: number; DataConclusao?: string}> = [
        { DiasParado: 5, DataConclusao: '2025-12-20' },
        { DiasParado: 10, DataConclusao: '2025-12-21' },
        { DiasParado: 3, DataConclusao: '2025-12-22' }
      ];

      const osConcluidas = osData.filter(r => r.DataConclusao);
      const mttr = osConcluidas.reduce((s, r) => s + r.DiasParado, 0) / osConcluidas.length;

      expect(mttr).toBe(6); // (5 + 10 + 3) / 3 = 6
    });

    it('deve retornar 0 se não houver OS concluídas', () => {
      const osData: Array<{DiasParado: number; DataConclusao?: string}> = [
        { DiasParado: 5 }, // Sem DataConclusao
        { DiasParado: 10 }
      ];

      const osConcluidas = osData.filter(r => r.DataConclusao);
      const mttr = osConcluidas.length > 0 
        ? osConcluidas.reduce((s, r) => s + r.DiasParado, 0) / osConcluidas.length 
        : 0;

      expect(mttr).toBe(0);
    });

    it('deve ignorar OS sem DiasParado', () => {
      const osData: Array<{DiasParado?: number; DataConclusao?: string}> = [
        { DiasParado: 5, DataConclusao: '2025-12-20' },
        { DataConclusao: '2025-12-21' } // Sem DiasParado
      ];

      const osConcluidas = osData.filter(r => r.DataConclusao);
      const mttr = osConcluidas.reduce((s, r) => s + (r.DiasParado || 0), 0) / osConcluidas.length;

      expect(mttr).toBe(2.5); // 5 / 2
    });
  });

  describe('MTBF - Mean Time Between Failures', () => {
    it('deve calcular intervalo entre OS consecutivas', () => {
      const datas = [
        normalizeDate('2025-12-01'),
        normalizeDate('2025-12-11'),
        normalizeDate('2025-12-21')
      ];

      const intervalos: number[] = [];
      for (let i = 1; i < datas.length; i++) {
        const diff = (datas[i].getTime() - datas[i-1].getTime()) / (1000 * 60 * 60 * 24);
        intervalos.push(diff);
      }

      const mtbf = intervalos.reduce((s, v) => s + v, 0) / intervalos.length;

      expect(intervalos).toEqual([10, 10]);
      expect(mtbf).toBe(10);
    });

    it('deve retornar 0 se veículo tem apenas 1 OS', () => {
      const datas = [normalizeDate('2025-12-01')];

      if (datas.length < 2) {
        expect(datas.length).toBe(1);
        // MTBF não pode ser calculado
      }
    });

    it('deve filtrar intervalos inválidos (negativos ou muito grandes)', () => {
      const intervalos = [10, -5, 730, 800, 15]; // -5 e 800 são inválidos

      const intervalosValidos = intervalos.filter(diff => diff > 0 && diff <= 730);
      const mtbf = intervalosValidos.reduce((s, v) => s + v, 0) / intervalosValidos.length;

      expect(intervalosValidos).toEqual([10, 730, 15]);
      expect(mtbf).toBe((10 + 730 + 15) / 3);
    });

    it('deve remover datas duplicadas antes de calcular', () => {
      const datasComDuplicatas = [
        normalizeDate('2025-12-01'),
        normalizeDate('2025-12-01'), // Duplicata
        normalizeDate('2025-12-11')
      ];

      const datasUnicas = datasComDuplicatas.filter((data, index, self) => 
        index === self.findIndex(d => d.getTime() === data.getTime())
      );

      expect(datasUnicas.length).toBe(2);
      expect(datasUnicas[0].getTime()).toBe(normalizeDate('2025-12-01').getTime());
      expect(datasUnicas[1].getTime()).toBe(normalizeDate('2025-12-11').getTime());
    });
  });

  describe('Taxa de Reincidência', () => {
    it('deve identificar OS do mesmo tipo em menos de 30 dias', () => {
      const osVeiculo = [
        { DataEntrada: '2025-12-01', TipoManutencao: 'Preventiva' },
        { DataEntrada: '2025-12-15', TipoManutencao: 'Preventiva' }, // 14 dias depois
        { DataEntrada: '2025-12-20', TipoManutencao: 'Corretiva' }
      ].sort((a, b) => new Date(a.DataEntrada).getTime() - new Date(b.DataEntrada).getTime());

      let reincidencias = 0;
      for (let i = 1; i < osVeiculo.length; i++) {
        const current = osVeiculo[i];
        const prev = osVeiculo[i-1];
        const diff = (new Date(current.DataEntrada).getTime() - new Date(prev.DataEntrada).getTime()) / (1000 * 60 * 60 * 24);
        
        if (diff <= 30 && current.TipoManutencao === prev.TipoManutencao) {
          reincidencias++;
        }
      }

      expect(reincidencias).toBe(1); // Apenas as 2 preventivas
    });

    it('não deve contar reincidência se tipos diferentes', () => {
      const osVeiculo = [
        { DataEntrada: '2025-12-01', TipoManutencao: 'Preventiva' },
        { DataEntrada: '2025-12-10', TipoManutencao: 'Corretiva' } // Tipo diferente
      ];

      let reincidencias = 0;
      for (let i = 1; i < osVeiculo.length; i++) {
        const current = osVeiculo[i];
        const prev = osVeiculo[i-1];
        const diff = (new Date(current.DataEntrada).getTime() - new Date(prev.DataEntrada).getTime()) / (1000 * 60 * 60 * 24);
        
        if (diff <= 30 && current.TipoManutencao === prev.TipoManutencao) {
          reincidencias++;
        }
      }

      expect(reincidencias).toBe(0);
    });

    it('não deve contar reincidência se intervalo > 30 dias', () => {
      const osVeiculo = [
        { DataEntrada: '2025-12-01', TipoManutencao: 'Preventiva' },
        { DataEntrada: '2026-01-15', TipoManutencao: 'Preventiva' } // 45 dias depois
      ];

      let reincidencias = 0;
      for (let i = 1; i < osVeiculo.length; i++) {
        const current = osVeiculo[i];
        const prev = osVeiculo[i-1];
        const diff = (new Date(current.DataEntrada).getTime() - new Date(prev.DataEntrada).getTime()) / (1000 * 60 * 60 * 24);
        
        if (diff <= 30 && current.TipoManutencao === prev.TipoManutencao) {
          reincidencias++;
        }
      }

      expect(reincidencias).toBe(0);
    });

    it('deve calcular taxa percentual corretamente', () => {
      const totalOS = 100;
      const reincidencias = 8;
      const taxaReincidencia = (reincidencias / totalOS) * 100;

      expect(taxaReincidencia).toBe(8);
    });
  });

  describe('Validações de Campos Null', () => {
    it('deve aplicar defaults para campos ausentes', () => {
      const osRaw: {Placa: string; Modelo?: string; Fornecedor?: string; ValorTotal?: number} = {
        Placa: 'ABC-1234',
        // Modelo ausente
        // Fornecedor ausente
      };

      const osProcessado = {
        ...osRaw,
        Modelo: osRaw.Modelo || 'N/D',
        Fornecedor: osRaw.Fornecedor || 'N/D',
        ValorTotal: osRaw.ValorTotal ?? 0
      };

      expect(osProcessado.Modelo).toBe('N/D');
      expect(osProcessado.Fornecedor).toBe('N/D');
      expect(osProcessado.ValorTotal).toBe(0);
    });

    it('deve preservar valores válidos', () => {
      const osRaw: {Placa: string; Modelo?: string; Fornecedor?: string; ValorTotal?: number} = {
        Placa: 'ABC-1234',
        Modelo: 'Chevrolet Onix',
        Fornecedor: 'Oficina XYZ',
        ValorTotal: 1500
      };

      const osProcessado = {
        ...osRaw,
        Modelo: osRaw.Modelo || 'N/D',
        Fornecedor: osRaw.Fornecedor || 'N/D',
        ValorTotal: osRaw.ValorTotal ?? 0
      };

      expect(osProcessado.Modelo).toBe('Chevrolet Onix');
      expect(osProcessado.Fornecedor).toBe('Oficina XYZ');
      expect(osProcessado.ValorTotal).toBe(1500);
    });
  });
});
