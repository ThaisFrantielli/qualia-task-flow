import { useMemo, useState, Fragment } from 'react'
import useBIData from '../../hooks/useBIData'

type Row = Record<string, any>

const MONTHS = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ']

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function extractAmount(row: Row): number {
  if (!row) return 0
  const candidates = [
    'valor', 'valor_total', 'valorFaturamento', 'valor_faturamento', 'Valor', 'ValorTotal', 'total', 'Total', 'ValorBruto', 'valor_bruto'
  ]
  for (const k of candidates) {
    if (k in row) {
      const v = row[k]
      if (typeof v === 'number') return v
      if (typeof v === 'string') {
        const n = Number(String(v).replace(/[.]/g, '').replace(',','.').replace(/[^0-9\-\.]/g, ''))
        if (!isNaN(n)) return n
      }
    }
  }
  for (const key of Object.keys(row)) {
    const v = row[key]
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      const n = Number(String(v).replace(/[.]/g, '').replace(',','.').replace(/[^0-9\-\.]/g, ''))
      if (!isNaN(n)) return n
    }
  }
  return 0
}

function isCanceled(row: Row): boolean {
  if (!row) return false
  const candidates = ['SituacaoNota','Situacao','Status','SituacaoFaturamento','situacao']
  for (const k of Object.keys(row)) candidates.push(k)
  for (const k of candidates) {
    const v = row[k]
    if (!v) continue
    const s = String(v).toLowerCase()
    if (s.includes('cancel') || s.includes('cancelado') || s.includes('anul') || s.includes('estornado')) return true
  }
  return false
}

// Valida a regra do PowerBI para "FaturamentoLocacaoEmitido":
// IdSituacaoNota in {1,2} e `FA/ND` = 'FA'
function isLocacaoEmitidoValid(row: Row): boolean {
  if (!row) return false
  // localizar possível coluna de situação (numérica)
  const possibleSituKeys = ['IdSituacaoNota','IdSituacao','SituacaoNota','IdSituacao','situacao']
  let situVal: number | null = null
  for (const k of Object.keys(row)) {
    const lk = k.toLowerCase()
    for (const candidate of possibleSituKeys) {
      if (lk === candidate.toLowerCase()) {
        const v = row[k]
        const n = Number(v)
        if (!isNaN(n)) { situVal = n }
        break
      }
    }
    if (situVal !== null) break
  }

  // localizar coluna FA/ND — pode vir com nome 'FA/ND', 'FA_ND', 'FAND', 'FA'
  const possibleFaKeys = ['FA/ND','FA_ND','FA','FAND','fa/nd','fa_nd']
  let faVal: string | null = null
  for (const k of Object.keys(row)) {
    const lk = k.replace(/[^a-zA-Z0-9_\/]/g,'').toLowerCase()
    for (const candidate of possibleFaKeys) {
      if (lk === candidate.replace(/[^a-zA-Z0-9_\/]/g,'').toLowerCase()) {
        const v = row[k]
        if (v != null) { faVal = String(v).trim().toUpperCase() }
        break
      }
    }
    if (faVal !== null) break
  }

  const situOk = situVal === 1 || situVal === 2
  const faOk = faVal === 'FA'
  // Se os campos não estiverem presentes, não filtrar — manter compatibilidade com dados antigos
  if (situVal === null || faVal === null) return true
  return situOk && faOk
}

function includesLocacao(v: unknown): boolean {
  const s = String(v || '').toLowerCase()
  return s.includes('loca') || s.includes('locação') || s.includes('loca\u00E7')
}

function getInsensitive(row: Row, key: string): any {
  if (!row) return undefined
  if (key in row) return row[key]
  const lk = key.toLowerCase()
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === lk) return row[k]
  }
  return undefined
}

function isLocacaoNatureza(row: Row): boolean {
  const natureza = getInsensitive(row, 'Natureza')
  const tipoFaturamento = getInsensitive(row, 'TipoFaturamento')

  if (natureza != null && String(natureza).trim() !== '') return includesLocacao(natureza)
  if (tipoFaturamento != null && String(tipoFaturamento).trim() !== '') return includesLocacao(tipoFaturamento)
  return false
}

function isLocacaoRow(row: Row, tipoFallback?: string): boolean {
  // Prioriza Natureza/TipoFaturamento.
  if (isLocacaoNatureza(row)) return true
  return includesLocacao(tipoFallback || '')
}

function isDebitNote(row: Row): boolean {
  const tipoNota = String(getInsensitive(row, 'TipoNota') || getInsensitive(row, 'TipoDocumento') || '').toLowerCase()
  if (tipoNota.includes('débito') || tipoNota.includes('debito')) return true

  const numero = String(getInsensitive(row, 'NumeroNota') || getInsensitive(row, 'Nota') || '').toUpperCase().trim()
  if (numero.startsWith('ND-')) return true

  const faNd = String(getInsensitive(row, 'FA/ND') || getInsensitive(row, 'FA_ND') || getInsensitive(row, 'FAND') || '').toUpperCase().trim()
  if (faNd === 'ND') return true

  return false
}

function getDocLabel(row: Row): string {
  const explicit = String(getInsensitive(row, 'TipoDocumento') || getInsensitive(row, 'TipoNota') || '').trim()
  if (explicit) return explicit

  const numero = String(getInsensitive(row, 'NumeroNota') || getInsensitive(row, 'Nota') || '').toUpperCase().trim()
  if (numero.startsWith('ND-')) return 'Nota de débito'
  if (numero.startsWith('FA-')) return 'Fatura'

  const fallback = String(getInsensitive(row, 'Documento') || getInsensitive(row, 'Nota') || '').trim()
  return fallback || 'Documento'
}

export default function FaturamentoDashboard() {
  const { data, loading, error } = useBIData('fat_faturamentos') as { data?: Row[], loading?: boolean, error?: any }

  // map by year-month and list of years available
  const { years } = useMemo(() => {
    const rows: Row[] = Array.isArray(data) ? data : []
    const map = new Map<string, number>()
    const yearsSet = new Set<number>()
    rows.forEach(r => {
      if (isCanceled(r)) return
      let dateStr = r.DataCompetencia || r.dataCompetencia || r.data || r.Data || r.Data_competencia || r.dataCompetenciaString
      if (!dateStr) return
      dateStr = String(dateStr)
      const y = dateStr.slice(0,4)
      const m = dateStr.length >= 7 ? dateStr.slice(5,7) : '01'
      if (!/^[0-9]{4}$/.test(y)) return
      const key = `${y}-${m.padStart(2,'0')}`
      yearsSet.add(Number(y))
      const amount = extractAmount(r) || 0
      map.set(key, (map.get(key) || 0) + amount)
    })
    return { mapByYm: map, years: [...yearsSet].sort((a,b) => b-a) }
  }, [data])

  const defaultYear = years && years.length ? years[0] : new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear)

  // aggregated data from backend (yearly sums by tipo + ym)
  // removed server-side aggregation usage — fallback to client-side aggregation only

  const { monthlySums, total, lastMonthValue, monthsWithData, grouped } = useMemo(() => {
    // helpers
    const getTipo = (r: Row) => {
      if (!r) return 'Outros'
      if (r.TipoFaturamento != null) return String(r.TipoFaturamento)
      if (r.Natureza != null) return String(r.Natureza)
      if (r.Tipo != null) return String(r.Tipo)
      if (r.TipoNota != null) return String(r.TipoNota)
      for (const key of Object.keys(r)) if (key.toLowerCase() === 'tipofaturamento' && r[key] != null) return String(r[key])
      return 'Outros'
    }

    const getValorByTipo = (r: Row, tipo: string) => {
      const lookup = (k: string) => {
        if (k in r) return r[k]
        const lower = k.toLowerCase()
        for (const key of Object.keys(r)) if (key.toLowerCase() === lower) return r[key]
        return undefined
      }
      const t = String(tipo).toLowerCase()
      if (t.includes('loca') || t.includes('locação') || t.includes('loca\u00E7')) return Number(lookup('ValorLocacao') ?? lookup('valorlocacao') ?? 0)
      if (t.includes('reemb') || t.includes('reembolso')) return Number(lookup('ValorReembolsaveis') ?? lookup('valorreembolsaveis') ?? 0)
      if (t.includes('multa')) return Number(lookup('ValorMultas') ?? lookup('valormultas') ?? 0)
      return Number(lookup('ValorTotal') ?? lookup('valor') ?? lookup('Valor') ?? 0)
    }

    // server aggregation removed — always use client-side grouping below

    // fallback: client-side aggregation from raw rows
    const rows: Row[] = Array.isArray(data) ? data : []
    const groupedMap = new Map<string, { arr: number[], docs: Map<string, number[]> }>()
    for (const r of rows) {
      if (isCanceled(r)) continue
      let dateStr = r.DataCompetencia || r.dataCompetencia || r.data || r.Data || r.Data_competencia || r.dataCompetenciaString
      if (!dateStr) continue
      dateStr = String(dateStr)
      const y = dateStr.slice(0,4)
      if (!/^[0-9]{4}$/.test(y)) continue
      if (Number(y) !== Number(selectedYear)) continue
      const m = dateStr.length >= 7 ? Number(dateStr.slice(5,7)) : 1
      const tipo = String(getTipo(r) || 'Outros')
      // Aplica regra específica: se for Locação, só conta quando atender a condição "emitido"
      const isLocacao = isLocacaoRow(r, tipo)
      const isND = isDebitNote(r)
      if (isLocacao && !isND && !isLocacaoEmitidoValid(r)) continue
      const doc = getDocLabel(r)
      const val = getValorByTipo(r, tipo) || 0
      if (!groupedMap.has(tipo)) groupedMap.set(tipo, { arr: new Array(12).fill(0), docs: new Map() })
      const bucket = groupedMap.get(tipo) as { arr: number[], docs: Map<string, number[]> }
      if (m >=1 && m <=12) bucket.arr[m-1] = (bucket.arr[m-1] || 0) + val
      if (!bucket.docs.has(doc)) bucket.docs.set(doc, new Array(12).fill(0))
      const darr = bucket.docs.get(doc) as number[]
      if (m >=1 && m <=12) darr[m-1] = (darr[m-1] || 0) + val
    }
    const list = Array.from(groupedMap.entries()).map(([tipo, v]) => ({ tipo, arr: v.arr, total: v.arr.reduce((s,n) => s+n,0), docs: Array.from(v.docs.entries()).map(([doc, darr]) => ({ doc, arr: darr, total: darr.reduce((s,n) => s+n,0) })).sort((a,b) => b.total - a.total) }))
    list.sort((a,b) => b.total - a.total)
    const monthly = new Array(12).fill(0)
    for (const it of list) for (let i=0;i<12;i++) monthly[i] += it.arr[i] || 0
    const totalSum = monthly.reduce((s,n) => s+n, 0)
    const monthsWith = monthly.filter(v => v !== 0).length || 12
    let lastIdx = -1
    for (let i = 11; i >= 0; i--) if (monthly[i] !== 0) { lastIdx = i; break }
    const lastVal = lastIdx >= 0 ? monthly[lastIdx] : 0
    return { monthlySums: monthly, total: totalSum, lastMonthValue: lastVal, monthsWithData: monthsWith, grouped: list }
  }, [data, selectedYear])

  const typeCounts = useMemo(() => {
    const rows: Row[] = Array.isArray(data) ? data : []
    const counts = new Map<string, number[]>()
    for (const r of rows) {
      if (isCanceled(r)) continue
      let dateStr = r.DataCompetencia || r.dataCompetencia || r.data || r.Data || r.Data_competencia || r.dataCompetenciaString
      if (!dateStr) continue
      dateStr = String(dateStr)
      const y = dateStr.slice(0,4)
      if (!/^[0-9]{4}$/.test(y)) continue
      if (Number(y) !== Number(selectedYear)) continue
      const m = dateStr.length >= 7 ? Number(dateStr.slice(5,7)) : 1
      let tipo: string = 'Outros'
      if (r.TipoFaturamento != null) tipo = String(r.TipoFaturamento)
      else if (r.Natureza != null) tipo = String(r.Natureza)
      else if (r.Tipo != null) tipo = String(r.Tipo)
      else if (r.TipoNota != null) tipo = String(r.TipoNota)
      else {
        for (const key of Object.keys(r)) if (key.toLowerCase() === 'tipofaturamento' && r[key] != null) { tipo = String(r[key]); break }
      }
      if (!counts.has(tipo)) counts.set(tipo, new Array(12).fill(0))
      // aplicar a mesma validação: se for locação, só contar quando emitido
      const isLocacao = isLocacaoRow(r, tipo)
      const isND = isDebitNote(r)
      if (isLocacao && !isND && !isLocacaoEmitidoValid(r)) continue
      const arr = counts.get(tipo) as number[]
      if (m >=1 && m <=12) arr[m-1] = (arr[m-1] || 0) + 1
    }
    const list = Array.from(counts.entries()).map(([tipo, arr]) => ({ tipo, arr, total: arr.reduce((s,n) => s+n,0) }))
    list.sort((a,b) => b.total - a.total)
    return list
  }, [data, selectedYear])

  const [showCounts, setShowCounts] = useState<boolean>(false)
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({})
  // restore previous default: collapsed
  const [expanded, setExpanded] = useState<boolean>(false)

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-3">Faturamento — {selectedYear}</h2>

      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div>
          <label className="text-sm text-gray-600 mr-2">Ano</label>
          <select className="border rounded px-2 py-1" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {years && years.length ? years.map(y => (
              <option key={y} value={y}>{y}</option>
            )) : <option value={defaultYear}>{defaultYear}</option>}
          </select>
        </div>
      </div>

      <div className="flex gap-4 mb-4 flex-wrap">
        <div className="bg-white border rounded p-3 shadow-sm min-w-[220px]">
          <div className="text-sm text-gray-600">Acumulado</div>
          <div className="text-2xl font-bold">{fmtBRL(total)}</div>
        </div>
        <div className="bg-white border rounded p-3 shadow-sm min-w-[180px]">
          <div className="text-sm text-gray-600">Último mês</div>
          <div className="text-xl font-bold">{fmtBRL(lastMonthValue)}</div>
        </div>
        <div className="bg-white border rounded p-3 shadow-sm min-w-[220px]">
          <div className="text-sm text-gray-600">Média mensal</div>
          <div className="text-xl font-bold">{fmtBRL(total / monthsWithData)}</div>
        </div>
      </div>

      <div className="overflow-auto bg-white border rounded">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 text-left">Conta</th>
              {MONTHS.map(m => (
                <th key={m} className="px-3 py-2 text-right">{m}</th>
              ))}
              <th className="px-3 py-2 text-right">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            <tr className="odd:bg-white even:bg-gray-50">
              <td className="px-3 py-2">
                <button aria-label={expanded ? 'Recolher' : 'Expandir'} onClick={() => setExpanded(s => !s)} className="mr-2 w-6 h-6 inline-flex items-center justify-center border rounded">
                  {expanded ? '−' : '+'}
                </button>
                Faturamento
              </td>
              {monthlySums.map((v, i) => (
                <td key={i} className="px-3 py-2 text-right">{fmtBRL(v)}</td>
              ))}
              <td className="px-3 py-2 text-right font-bold">{fmtBRL(total)}</td>
            </tr>

            {expanded && (grouped && grouped.length ? grouped.map((g: any) => (
              <Fragment key={g.tipo}>
                <tr className="odd:bg-white even:bg-gray-50">
                  <td className="px-3 py-2 pl-8">
                    <button aria-label={expandedTypes[g.tipo] ? 'Recolher tipo' : 'Expandir tipo'} onClick={() => setExpandedTypes(s => ({ ...s, [g.tipo]: !s[g.tipo] }))} className="mr-2 w-6 h-6 inline-flex items-center justify-center border rounded">
                      {expandedTypes[g.tipo] ? '−' : '+'}
                    </button>
                    {g.tipo}
                  </td>
                  {g.arr.map((v: number, i: number) => (
                    <td key={i} className="px-3 py-2 text-right">{fmtBRL(v || 0)}</td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold">{fmtBRL(g.total)}</td>
                </tr>

                {expandedTypes[g.tipo] && g.docs && g.docs.length && g.docs.map((d: any) => (
                  <tr key={g.tipo + '::' + d.doc} className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2 pl-16">{d.doc}</td>
                    {d.arr.map((v: number, i: number) => (
                      <td key={i} className="px-3 py-2 text-right">{fmtBRL(v || 0)}</td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium">{fmtBRL(d.total)}</td>
                  </tr>
                ))}
              </Fragment>
            )) : (
              <tr>
                <td className="p-4" colSpan={14}>Nenhum registro para o ano selecionado.</td>
              </tr>
            ))}

            <tr className="border-t font-bold bg-gray-50">
              <td className="px-3 py-2">Total</td>
              {monthlySums.map((v, i) => (
                <td key={i} className="px-3 py-2 text-right">{fmtBRL(v)}</td>
              ))}
              <td className="px-3 py-2 text-right">{fmtBRL(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        <button className="text-sm underline" onClick={() => setShowCounts(s => !s)}>{showCounts ? 'Ocultar' : 'Mostrar'} contagens por Tipo</button>
        {showCounts && (
          <div className="mt-2 overflow-auto bg-white border rounded">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  {MONTHS.map(m => <th key={m} className="px-2 py-1 text-right">{m}</th>)}
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {typeCounts.map((t: any) => (
                  <tr key={t.tipo} className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2">{t.tipo}</td>
                    {t.arr.map((c: number, i: number) => (<td key={i} className="px-2 py-1 text-right">{c}</td>))}
                    <td className="px-3 py-2 text-right font-bold">{t.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {loading && <div className="mt-2 text-sm text-gray-600">Carregando dados...</div>}
      {error && <div className="mt-2 text-sm text-red-600">Erro ao carregar dados</div>}
    </div>
  )
}

