import React, { useMemo } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';

type AnyObject = { [k: string]: any };

function formatCurrency(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '-';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DataAudit(): JSX.Element {
  const { data } = useBIData<AnyObject[]>('auditoria_vendas.json');

  const records: AnyObject[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data as AnyObject[];
    if ((data as any).data && Array.isArray((data as any).data)) return (data as any).data;
    const keys = Object.keys(data as any);
    for (const k of keys) {
      if (Array.isArray((data as any)[k])) return (data as any)[k];
    }
    return [];
  }, [data]);

  const total = records.length;

  return (
    <div className="bg-slate-50" style={{ padding: 16 }}>
      <Title>Auditoria de Dados & Qualidade</Title>
      <Text className="mt-1">Registros abaixo requerem correção no ERP (Sovereign/Protheus)</Text>

      <div style={{ marginTop: 12 }}>
        <Card>
          <Text>Total de Inconsistências</Text>
          <Metric>{total}</Metric>
        </Card>
      </div>

      <Card style={{ marginTop: 12 }}>
        <Text style={{ marginBottom: 8 }}>Registros com problemas</Text>
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Placa</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Modelo</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Comprador</th>
                <th style={{ textAlign: 'right', padding: 8 }}>Valor Venda</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Motivo do Erro</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={`audit-${i}`}>
                  <td style={{ padding: 8 }}>{r.Placa || <span className="inline-block bg-gray-200 text-gray-600 px-2 py-1 rounded">N/A</span>}</td>
                  <td style={{ padding: 8 }}>{r.Modelo || '-'}</td>
                  <td style={{ padding: 8 }}>{(r.UltimoCliente || r.Comprador || r.Cliente) ?? '-'}</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>{formatCurrency(Number(r.ValorVenda) || null)}</td>
                  <td style={{ padding: 8 }}>
                    <span className="inline-block bg-red-100 text-red-700 px-2 py-1 rounded">{r.Motivo || r.MensagemErro || r.MotivoErro || 'Inconsistência'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
