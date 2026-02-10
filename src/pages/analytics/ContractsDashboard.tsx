import React, { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';

type AnyObject = { [k: string]: any };

export default function ContractsDashboard(): JSX.Element {
  const { data, refetch } = useBIData<AnyObject[]>('dim_contratos_locacao');
  const rows = Array.isArray(data) ? data : [];
  const [q, setQ] = useState('');
  const [visibleCols, setVisibleCols] = useState<string[] | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const columns = useMemo(() => {
    if (!rows || rows.length === 0) return [] as string[];
    const sample = rows[0] || {};
    return Object.keys(sample);
  }, [rows]);

  // default: all columns
  React.useEffect(() => {
    if (columns.length > 0 && !visibleCols) {
      // Excluir colunas técnicas que não devem aparecer na visualização
      const excluded = [
        /^IDCLASSIFICACAOCONTRATO$/i,
        /^CLASSIFICACAOCONTRATO$/i,
        // ocultar coluna de id/situação do contrato/locação
        /^IDSITUACAOCONTRATOLOCACAO$/i,
        /^SITUACAOCONTRATOLOCACAO$/i,
        /^IDSITUACAO.*LOCACAO$/i,
      ];
      const defaults = columns.filter(c => !excluded.some(rx => rx.test(c)));
      setVisibleCols(defaults);
    }
  }, [columns, visibleCols]);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const low = q.toLowerCase();
    return rows.filter(r => columns.some(c => String(r[c] ?? '').toLowerCase().includes(low)));
  }, [rows, q, columns]);

  const displayed = useMemo(() => {
    const copy = Array.isArray(filtered) ? filtered.slice() : [];
    if (!sortKey) return copy;
    copy.sort((a: any, b: any) => {
      const va = a[sortKey];
      const vb = b[sortKey];

      // Try numeric compare first
      const na = typeof va === 'number' ? va : parseFloat(String(va).replace(/[^0-9.-]/g, ''));
      const nb = typeof vb === 'number' ? vb : parseFloat(String(vb).replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(na) && Number.isFinite(nb)) {
        return sortDir === 'asc' ? na - nb : nb - na;
      }

      const sa = String(va ?? '').toLowerCase();
      const sb = String(vb ?? '').toLowerCase();
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Contratos</h1>

      <div className="mb-4 flex gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar em todas as colunas..."
          className="border rounded px-3 py-2 w-80"
        />
        <button onClick={() => refetch()} className="px-3 py-2 bg-slate-800 text-white rounded">Recarregar</button>
        <div className="ml-4 text-sm text-slate-600">Registros: {rows.length}</div>
      </div>

      <div className="border rounded" style={{ maxHeight: '70vh', overflow: 'auto' }}>
        <table className="w-full text-sm min-w-[900px] table-auto">
          <thead className="bg-slate-50 text-slate-600 uppercase text-xs sticky top-0">
            <tr>
              {visibleCols && visibleCols.map(col => (
                <th
                  key={col}
                  className="p-2 align-top border-r cursor-pointer select-none"
                  onClick={() => {
                    if (sortKey === col) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortKey(col);
                      setSortDir('asc');
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span>{col}</span>
                    {sortKey === col && (
                      <span className="text-xs text-slate-500">{sortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((r, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                {visibleCols && visibleCols.map(col => (
                  <td key={col} className="p-2 align-top border-r">
                    {(() => {
                      const val = r[col];
                      const isCurrency = /valor|preco|price|mensal|locacao|precounitario|valormensal|valor_locacao|valorcontrato/i.test(col);
                      if (val == null || val === '') return '';
                      if (isCurrency) {
                        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
                        if (Number.isFinite(num)) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
                      }
                      return String(val);
                    })()}
                  </td>
                ))}
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr>
                <td className="p-4" colSpan={Math.max(1, visibleCols ? visibleCols.length : 1)}>Nenhum registro encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
