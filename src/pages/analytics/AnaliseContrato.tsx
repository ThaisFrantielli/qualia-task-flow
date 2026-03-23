import { useMemo } from 'react';
import useBIData from '@/hooks/useBIData';

export default function AnaliseContrato(): JSX.Element {
  const { data, loading, error } = useBIData('fat_veiculos');

  const rows = useMemo(() => (Array.isArray(data) ? (data as any[]) : []), [data]);

  const normalize = (r: any, keys: string[]) => {
    for (const k of keys) {
      if (r && Object.prototype.hasOwnProperty.call(r, k) && r[k] !== null && r[k] !== undefined) return r[k];
    }
    return '';
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Análise de Contrato</h1>

      {loading && <div>Carregando dados...</div>}
      {error && <div className="text-red-600">Erro ao carregar: {String(error)}</div>}

      {!loading && !error && (
        <div className="overflow-auto border rounded">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Placa</th>
                <th className="px-3 py-2 text-left">Grupo</th>
                <th className="px-3 py-2 text-left">Modelo</th>
                <th className="px-3 py-2 text-right">KM</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, idx: number) => {
                const placa = normalize(r, ['Placa', 'placa', 'PLACA', 'placa_veiculo']);
                const grupo = normalize(r, ['Grupo', 'grupo', 'GrupoVeiculo', 'grupoveiculo']);
                const modelo = normalize(r, ['Modelo', 'modelo', 'modelo_veiculo', 'modelo_veiculo_nome']);
                const km = normalize(r, ['KM', 'KmAtual', 'Km', 'KmConfirmado', 'OdometroConfirmado', 'currentKm']);

                return (
                  <tr key={idx} className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2">{placa || '—'}</td>
                    <td className="px-3 py-2">{grupo || '—'}</td>
                    <td className="px-3 py-2">{modelo || '—'}</td>
                    <td className="px-3 py-2 text-right">{km ?? '—'}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td className="p-4" colSpan={4}>Nenhuma placa encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
