import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { AnalyticsLoading } from '@/components/analytics/AnalyticsLoading';
import DataUpdateBadge from '@/components/DataUpdateBadge';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Settings2, Download, Loader2,
  Route, Wrench, ShieldAlert, BarChart3, DollarSign,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ── Types ────────────────────────────────────────────────────────
interface ContratoRow { IdContratoLocacao:string; ContratoComercial:string; PlacaPrincipal:string; IdVeiculoPrincipal:string; NomeCliente:string; SituacaoContratoLocacao:string; SituacaoContratoComercial?:string; DataInicial:string; DataFinal:string|null; }
interface FrotaRow { IdVeiculo:string; Placa:string; Modelo:string; CategoriaVeiculo:string; KmConfirmado:number; KM:number; KmInformado:number; }
interface ManutencaoRow { Placa:string; ValorTotal:number; ValorReembolsavel:number; DataEntrada:string; DataCriacaoOS:string; TipoOcorrencia:string; }
interface SinistroRow { Placa:string; DataSinistro:string; DataCriacao:string; ValorOrcado:number; IndenizacaoSeguradora:number; ReembolsoTerceiro:number; }
interface FaturamentoRow { IdNota:string; IdVeiculo:string; Competencia:string; VlrLocacao:number; }

interface VehicleRow {
  idLocacao:string; idComercial:string;
  placa:string; modelo:string; grupo:string; kmAtual:number; indiceKm:string;
  idadeEmMeses:number; rodagemMedia:number; dataInicial:string; vencimentoContrato:string; cliente:string; contrato:string;
  sitLoc:string; sitCTO:string;
  passagemTotal:number; passagemIdeal:number; diferencaPassagem:number; pctPassagem:number;
  custoManPrevisto:number; custoManRealizado:number; difManPrevReal:number; pctDifManPrevReal:number; custoManLiquido:number; difCustoManLiq:number; pctDifCustoManLiq:number;
  totalManutencao:number; ticketMedio:number; custoKmMan:number;
  totalReembMan:number;
  custoLiqMan:number; pctReembolsadoMan:number; custoKmLiqMan:number;
  totalSinistro:number;
  totalReembSin:number;
  custoLiqSin:number; pctReembolsadoSin:number;
  totalManSin:number; pctReembolsadoManSin:number;
  faturamentoTotal:number;
  pctManFat:number; pctCustoLiqManFat:number; pctSinFat:number; pctCustoLiqSinFat:number; pctManSinFat:number;
  years: Record<number, { pass:number; man:number; reembMan:number; sin:number; reembSin:number; fat:number; }>;
}

// ── Helpers ──────────────────────────────────────────────────────
const parseNum = (v: unknown): number => { if (typeof v==='number') return isNaN(v)?0:v; if (!v) return 0; return parseFloat(String(v).replace(/[^\d.,-]/g,'').replace(',','.'))||0; };
const fmtBRL = (v:number) => v===0?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
const fmtKM = (v:number) => v===0?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:3}).format(v);
const fmtPct = (v:number) => !isFinite(v)||isNaN(v)?'—':`${(v*100).toFixed(1)}%`;
const fmtNum = (v:number) => v===0?'—':v.toLocaleString('pt-BR');
const kmLabel = (km:number) => km>=100000?'Acima 100.000':km>=60000?'60.000–100.000':km>=30000?'30.000–60.000':'Abaixo 30.000';
const getYear = (d:string) => { if(!d||d.length<4) return 0; const y=parseInt(d.substring(0,4)); return isNaN(y)?0:y; };
const monthsDiff = (from:string) => { if(!from) return 0; const d=new Date(from); const n=new Date(); return Math.max(0,(n.getFullYear()-d.getFullYear())*12+(n.getMonth()-d.getMonth())); };

const clrV = (v:number,invert=false) => { if(v===0) return 'text-slate-400'; return (invert?v<0:v>0)?'text-red-600 font-medium':'text-emerald-600 font-medium'; };
const clrP = (v:number,invert=false) => { if(!isFinite(v)||isNaN(v)||v===0) return 'text-slate-400'; return (invert?v<0:v>0)?'text-red-600 font-medium':'text-emerald-600 font-medium'; };

interface ColDef { key:string; label:string; fmt:(r:VehicleRow)=>string; cls?:(r:VehicleRow)=>string; align?:'left'|'right'; w?:number; sortGetter?:(r:VehicleRow)=>any; }

// ID cols shown in every tab
const ID_COLS: ColDef[] = [
  { key:'cliente',     label:'Cliente',      fmt:r=>r.cliente,     align:'left',  w:160, sortGetter: r=>r.cliente },
  { key:'contrato',    label:'CTO',          fmt:r=>r.contrato,    align:'left',  w:95, sortGetter: r=>r.contrato },
  { key:'placa',       label:'Placa',        fmt:r=>r.placa,       align:'left',  w:105, sortGetter: r=>r.placa },
  { key:'modelo',      label:'Modelo',       fmt:r=>r.modelo,      align:'left',  w:170, sortGetter: r=>r.modelo },
  { key:'grupo',       label:'Grupo',        fmt:r=>r.grupo,       align:'left',  w:120, sortGetter: r=>r.grupo },
  { key:'kmAtual',     label:'KM',           fmt:r=>r.kmAtual>0?r.kmAtual.toLocaleString('pt-BR'):'—', align:'right', w:80, sortGetter: r=>r.kmAtual },
  { key:'idadeEmMeses',label:'Idade (meses)',fmt:r=>fmtNum(r.idadeEmMeses), align:'right', w:80, sortGetter: r=>r.idadeEmMeses },
];

const TABS = [
  { key:'passagem',   label:'Passagem',                icon:Route,       color:'bg-blue-600',   hdr:'bg-blue-700' },
  { key:'previsto',   label:'Custo Previsto × Real',   icon:Wrench,      color:'bg-amber-600',  hdr:'bg-amber-700' },
  { key:'manutencao', label:'Manutenção + Reembolso',  icon:Wrench,      color:'bg-orange-600', hdr:'bg-orange-700' },
  { key:'sinistro',   label:'Sinistro + Reembolso',    icon:ShieldAlert, color:'bg-red-600',    hdr:'bg-red-700' },
  { key:'mansin',     label:'Man + Sinistro',          icon:BarChart3,   color:'bg-purple-600', hdr:'bg-purple-700' },
  { key:'faturamento',label:'Faturamento',             icon:DollarSign,  color:'bg-teal-600',   hdr:'bg-teal-700' },
] as const;
type TabKey = typeof TABS[number]['key'];

// ── Main Component ───────────────────────────────────────────────
export default function AnaliseContrato() {
  const [activeTab, setActiveTab] = useState<TabKey>('passagem');
  const [kmDivisor,  setKmDivisor]  = useState(10000);
  
  // Custom group cost settings
  const [custoPadrao, setCustoPadrao] = useState(180);
  const [custoGeral, setCustoGeral] = useState<Record<string,number>>({});
  
  const [showSettings, setShowSettings] = useState(false);
  const [filterCliente,setFilterCliente]= useState('');
  const [filterCTO,    setFilterCTO]    = useState('');
  const [filterPlaca,  setFilterPlaca]  = useState('');
  const [filterGrupo,  setFilterGrupo]  = useState('');
  const [filterSitCTO, setFilterSitCTO] = useState('');
  const [filterSitLoc, setFilterSitLoc] = useState('');

  const [sortKey,  setSortKey]  = useState<string>('cliente');
  const [sortDir,  setSortDir]  = useState<'asc'|'desc'>('asc');

  const { data: rawC, loading: lC, metadata } = useBIData<ContratoRow[]>('dim_contratos_locacao');
  const { data: rawF, loading: lF } = useBIData<FrotaRow[]>('dim_frota');
  const { data: rawM, loading: lM } = useBIData<ManutencaoRow[]>('fat_manutencao_unificado');
  const { data: rawS, loading: lS } = useBIData<SinistroRow[]>('fat_sinistros');
  const { data: rawFat, loading: lFat } = useBIData<FaturamentoRow[]>('fat_faturamentos');

  const initialLoading = lC || lF;
  const heavyLoading   = lM || lS || lFat;

  const frotaByPlaca = useMemo(() => {
    const m = new Map<string,FrotaRow>();
    (rawF as FrotaRow[]|null??[]).forEach(r=>{ if(r.Placa) m.set(r.Placa,r); });
    return m;
  }, [rawF]);

  const activeContratos = useMemo(() => {
    return (rawC as ContratoRow[]|null??[])
      .filter(c => c.PlacaPrincipal || c.ContratoComercial); // Must have at least plate or commercial id
  }, [rawC]);

  const vehicleRows = useMemo((): VehicleRow[] => {
    const arrM = rawM as ManutencaoRow[]|null ?? [];
    const arrS = rawS as SinistroRow[]|null   ?? [];
    const arrF = rawFat as FaturamentoRow[]|null ?? [];

    type YA = Record<number,{cost:number;reemb:number;count:number}>;
    const manIdx = new Map<string,YA>();
    const passIdx= new Map<string,Record<number,number>>();
    for (const m of arrM) {
      const placa = m.Placa; if(!placa) continue;
      const yr = getYear(m.DataEntrada||m.DataCriacaoOS||'');
      if(yr<2022 || yr>2030) continue;
      const tipo=(m.TipoOcorrencia||'').toLowerCase();
      if(tipo.startsWith('manuten')||tipo.includes('sinistro')) {
        if(!passIdx.has(placa)) passIdx.set(placa,{});
        const p=passIdx.get(placa)!; p[yr]=(p[yr]||0)+1;
      }
      if(tipo.startsWith('manuten')) {
        if(!manIdx.has(placa)) manIdx.set(placa,{});
        const mm=manIdx.get(placa)!;
        if(!mm[yr]) mm[yr]={cost:0,reemb:0,count:0};
        mm[yr].cost+=parseNum(m.ValorTotal); mm[yr].reemb+=parseNum(m.ValorReembolsavel); mm[yr].count++;
      }
    }

    type SA = Record<number,{cost:number;reemb:number}>;
    const sinIdx = new Map<string,SA>();
    for (const s of arrS) {
      const placa=s.Placa; if(!placa) continue;
      const yr=getYear(s.DataSinistro||s.DataCriacao||'');
      if(yr<2022 || yr>2030) continue;
      if(!sinIdx.has(placa)) sinIdx.set(placa,{});
      const sm=sinIdx.get(placa)!;
      if(!sm[yr]) sm[yr]={cost:0,reemb:0};
      sm[yr].cost+=parseNum(s.ValorOrcado);
      sm[yr].reemb+=parseNum(s.IndenizacaoSeguradora)+parseNum(s.ReembolsoTerceiro);
    }

    const fatIdx = new Map<string,Record<number,number>>();
    const notasSeen = new Set<string>();
    for (const f of arrF) {
      if(!f.IdNota||notasSeen.has(f.IdNota)) continue; notasSeen.add(f.IdNota);
      const idv=f.IdVeiculo; if(!idv) continue;
      const yr=getYear(f.Competencia||'');
      if(yr<2022 || yr>2030) continue;
      if(!fatIdx.has(idv)) fatIdx.set(idv,{});
      const fm=fatIdx.get(idv)!; fm[yr]=(fm[yr]||0)+parseNum(f.VlrLocacao);
    }

    const baseItems = activeContratos.map(c => ({
      c, fr: frotaByPlaca.get(c.PlacaPrincipal || ''), placa: (c.PlacaPrincipal || '').toUpperCase().trim()
    }));

    const usedPlates = new Set(baseItems.map(x => x.placa).filter(Boolean));
    (rawF as FrotaRow[]|null ?? []).forEach(fr => {
      if (fr.Placa && !usedPlates.has(fr.Placa.toUpperCase().trim())) {
        baseItems.push({ c: null as any, fr, placa: fr.Placa.toUpperCase().trim() });
      }
    });

    return baseItems.map(({ c, fr, placa }) => {
      const cAny = c || {} as any;
      const modelo = fr?.Modelo ?? cAny.Modelo ?? ''; 
      const grupo = fr?.Categoria ?? fr?.CategoriaVeiculo ?? cAny.Categoria ?? cAny.GrupoVeiculo ?? 'LEVE';
      const kmAtual = parseNum(fr?.KmConfirmado ?? cAny.KmConfirmado ?? fr?.KmInformado ?? cAny.KmInformado ?? fr?.KM ?? 0);
      const dataInicial = c?.DataInicial || '';
      const idadeEmMeses = monthsDiff(dataInicial);
      const rodagemMedia = idadeEmMeses > 0 ? Math.round(kmAtual / idadeEmMeses) : 0;

      const realPlaca = (c?.PlacaPrincipal || fr?.Placa || placa);
      const pm = passIdx.get(realPlaca) || {};
      let passagemTotal = 0;
      for (const y in pm) passagemTotal += pm[y];
      const passagemIdeal = kmDivisor > 0 ? kmAtual / kmDivisor : 0;
      
      const custoMensal = custoGeral[grupo] ?? custoPadrao;
      const custoManPrevisto = custoMensal * idadeEmMeses;

      const mm = manIdx.get(realPlaca) || {};
      let totalManutencao = 0, cntMan = 0, totalReembMan = 0;
      for (const y in mm) { totalManutencao += mm[y].cost; cntMan += mm[y].count; totalReembMan += mm[y].reemb; }
      
      const ticketMedio = cntMan > 0 ? totalManutencao / cntMan : 0;
      const custoKmMan = kmAtual > 0 ? totalManutencao / kmAtual : 0;
      const custoLiqMan = totalManutencao - totalReembMan;
      const custoKmLiqMan = kmAtual > 0 ? custoLiqMan / kmAtual : 0;

      const sm = sinIdx.get(realPlaca) || {};
      let totalSinistro = 0, totalReembSin = 0;
      for (const y in sm) { totalSinistro += sm[y].cost; totalReembSin += sm[y].reemb; }
      const custoLiqSin = totalSinistro - totalReembSin;

      const trueIdVeiculo = fr?.IdVeiculo || c?.IdVeiculoPrincipal || '';
      const fm = fatIdx.get(trueIdVeiculo) || {};
      let faturamentoTotal = 0;
      for (const y in fm) faturamentoTotal += fm[y];

      const diferencaPassagem = passagemTotal - passagemIdeal;
      const pctPassagem = passagemIdeal > 0 ? passagemTotal / passagemIdeal - 1 : 0;
      const custoManRealizado = totalManutencao;
      const difManPrevReal = custoManPrevisto - custoManRealizado;
      const pctDifManPrevReal = custoManPrevisto > 0 ? custoManRealizado / custoManPrevisto - 1 : 0;
      const custoManLiquido = custoLiqMan;
      const difCustoManLiq = custoManPrevisto - custoLiqMan;
      const pctDifCustoManLiq = custoManPrevisto > 0 ? custoLiqMan / custoManPrevisto - 1 : 0;
      const pctReembolsadoMan = totalManutencao > 0 ? totalReembMan / totalManutencao : 0;
      const pctReembolsadoSin = totalSinistro > 0 ? totalReembSin / totalSinistro : 0;
      const totalManSin = totalManutencao + totalSinistro;
      const pctReembolsadoManSin = totalManSin > 0 ? (totalReembMan + totalReembSin) / totalManSin : 0;
      const pctManFat = faturamentoTotal > 0 ? totalManutencao / faturamentoTotal : 0;
      const pctCustoLiqManFat = faturamentoTotal > 0 ? custoLiqMan / faturamentoTotal : 0;
      const pctSinFat = faturamentoTotal > 0 ? totalSinistro / faturamentoTotal : 0;
      const pctCustoLiqSinFat = faturamentoTotal > 0 ? custoLiqSin / faturamentoTotal : 0;
      const pctManSinFat = faturamentoTotal > 0 ? totalManSin / faturamentoTotal : 0;

      const years: Record<number, any> = {};
      for (let y = 2022; y <= 2030; y++) {
        years[y] = {
          pass: pm[y] || 0,
          man: mm[y]?.cost || 0,
          reembMan: mm[y]?.reemb || 0,
          sin: sm[y]?.cost || 0,
          reembSin: sm[y]?.reemb || 0,
          fat: fm[y] || 0,
        };
      }

      return {
        idLocacao: String(c?.IdContratoLocacao || ''),
        idComercial: String(cAny?.IdContratoComercial || cAny?.ContratoComercial || ''),
        placa: realPlaca, modelo, grupo, kmAtual, indiceKm: kmLabel(kmAtual), idadeEmMeses, rodagemMedia,
        dataInicial,
        vencimentoContrato: c?.DataFinal ? new Date(c.DataFinal).toLocaleDateString('pt-BR') : '—',
        cliente: c?.NomeCliente || (c ? '' : '— Sem CTO / Avulso —'), 
        contrato: c?.ContratoComercial || (c ? '' : '—'),
        sitCTO: c?.SituacaoContratoComercial || cAny.SituacaoContrato || '', 
        sitLoc: c?.SituacaoContratoLocacao || '',
        passagemTotal, passagemIdeal: Math.round(passagemIdeal * 10) / 10,
        diferencaPassagem: Math.round(diferencaPassagem * 10) / 10, pctPassagem,
        custoManPrevisto, custoManRealizado, difManPrevReal, pctDifManPrevReal, custoManLiquido, difCustoManLiq, pctDifCustoManLiq,
        totalManutencao, ticketMedio, custoKmMan,
        totalReembMan, custoLiqMan, pctReembolsadoMan, custoKmLiqMan,
        totalSinistro, totalReembSin, custoLiqSin, pctReembolsadoSin,
        totalManSin, pctReembolsadoManSin,
        faturamentoTotal,
        pctManFat, pctCustoLiqManFat, pctSinFat, pctCustoLiqSinFat, pctManSinFat,
        years
      };
    });
  }, [activeContratos, rawF, frotaByPlaca, rawM, rawS, rawFat, kmDivisor, custoPadrao, custoGeral]);

  // Derive cascaded filter options
  const filterCandidates = useMemo(() => {
    let rows = vehicleRows;
    if (filterCliente) rows = rows.filter(r => r.cliente === filterCliente);
    return rows;
  }, [vehicleRows, filterCliente]);

  const opts = useMemo(() => ({
    clientes: [...new Set(vehicleRows.map(r=>r.cliente))].filter(Boolean).sort(),
    ctos:     [...new Set(filterCandidates.map(r=>r.contrato))].filter(Boolean).sort(),
    placas:   [...new Set(filterCandidates.map(r=>r.placa))].filter(Boolean).sort(),
    grupos:   [...new Set(filterCandidates.map(r=>r.grupo))].filter(Boolean).sort(),
    sitCTO:   [...new Set(vehicleRows.map(r=>r.sitCTO))].filter(Boolean).sort(),
    sitLoc:   [...new Set(vehicleRows.map(r=>r.sitLoc))].filter(Boolean).sort(),
  }), [vehicleRows, filterCandidates]);

  // Unique groups for settings
  const allGrupos = useMemo(() => [...new Set(vehicleRows.map(r=>r.grupo))].filter(Boolean).sort(), [vehicleRows]);

  const displayRows = useMemo(() => {
    let rows = vehicleRows;
    if(filterCliente) rows=rows.filter(r=>r.cliente===filterCliente);
    if(filterCTO)     rows=rows.filter(r=>r.contrato===filterCTO);
    if(filterPlaca)   rows=rows.filter(r=>r.placa===filterPlaca);
    if(filterGrupo)   rows=rows.filter(r=>r.grupo===filterGrupo);
    if(filterSitCTO)  rows=rows.filter(r=>r.sitCTO===filterSitCTO);
    if(filterSitLoc)  rows=rows.filter(r=>r.sitLoc===filterSitLoc);

    return [...rows].sort((a,b)=>{
      // need to find coldef for sortKey
      let valA:any='', valB:any='';
      if (sortKey in a) { valA = (a as any)[sortKey]; valB = (b as any)[sortKey]; }
      const cmp=typeof valA==='number'&&typeof valB==='number'?valA-valB:String(valA).localeCompare(String(valB));
      return sortDir==='asc'?cmp:-cmp;
    });
  }, [vehicleRows, filterCliente, filterCTO, filterPlaca, filterGrupo, filterSitCTO, filterSitLoc, sortKey, sortDir]);

  // Determine dynamic years to display based on filtered rows
  const dynYears = useMemo(() => {
    let minGroupYear = 2026;
    for (const r of displayRows) {
      const yr = getYear(r.dataInicial);
      if (yr > 0 && yr < minGroupYear) minGroupYear = yr;
    }
    const cutoff = Math.max(minGroupYear, 2022); // Let's not show before 2022 mostly
    const maxGroupYear = 2026; // up to 2026
    const res = [];
    for (let y = cutoff; y <= maxGroupYear; y++) res.push(y);
    return res;
  }, [displayRows]);

  const kpis = useMemo(() => {
    const vSet = new Set<string>(), lSet = new Set<string>(), cSet = new Set<string>();
    let fat=0, man=0, sin=0, ms=0, reemb=0;
    for (const r of displayRows) {
      if(r.placa) vSet.add(r.placa);
      if(r.idLocacao) lSet.add(r.idLocacao);
      if(r.idComercial) cSet.add(r.idComercial);
      fat+=r.faturamentoTotal; man+=r.totalManutencao; sin+=r.totalSinistro; ms+=r.totalManSin; reemb+=r.totalReembMan+r.totalReembSin;
    }
    return {
      nVeiculos: vSet.size,
      nLocacao: lSet.size,
      nComercial: cSet.size,
      fat, man, sin, ms, reemb
    };
  }, [displayRows]);

  // Build dynamic columns
  const tabCols = useMemo(() => {
    const cols: ColDef[] = [];
    if (activeTab === 'passagem') {
      dynYears.forEach(y => cols.push({ key:`pass_${y}`, label:`Pass ${y}`, fmt:r=>fmtNum(r.years[y].pass), align:'right', w:80, sortGetter: r=>r.years[y].pass }));
      cols.push(
        { key:'passagemTotal',   label:'Total',       fmt:r=>fmtNum(r.passagemTotal), align:'right', w:72, sortGetter: r=>r.passagemTotal },
        { key:'passagemIdeal',   label:'Ideal',       fmt:r=>r.passagemIdeal.toFixed(1), align:'right', w:72, sortGetter: r=>r.passagemIdeal },
        { key:'diferencaPassagem',label:'Diferença',  fmt:r=>r.diferencaPassagem.toFixed(1), cls:r=>clrV(r.diferencaPassagem), align:'right', w:80, sortGetter: r=>r.diferencaPassagem },
        { key:'pctPassagem',     label:'% Passagem',  fmt:r=>fmtPct(r.pctPassagem), cls:r=>clrP(r.pctPassagem), align:'right', w:90, sortGetter: r=>r.pctPassagem },
        { key:'rodagemMedia',    label:'Rod Média/Mês', fmt:r=>fmtNum(r.rodagemMedia), align:'right', w:95, sortGetter: r=>r.rodagemMedia },
        { key:'vencimentoContrato',label:'Vencimento',fmt:r=>r.vencimentoContrato, align:'left', w:100, sortGetter: r=>r.vencimentoContrato }
      );
    } else if (activeTab === 'previsto') {
      cols.push(
        { key:'custoManPrevisto', label:'Previsto',      fmt:r=>fmtBRL(r.custoManPrevisto),   align:'right', w:120, sortGetter: r=>r.custoManPrevisto },
        { key:'custoManRealizado',label:'Realizado',     fmt:r=>fmtBRL(r.custoManRealizado),  cls:r=>clrV(r.custoManRealizado,true), align:'right', w:120, sortGetter: r=>r.custoManRealizado },
        { key:'difManPrevReal',   label:'DIF',           fmt:r=>fmtBRL(r.difManPrevReal),     cls:r=>clrV(r.difManPrevReal), align:'right', w:120, sortGetter: r=>r.difManPrevReal },
        { key:'pctDifManPrevReal',label:'%DIF',          fmt:r=>fmtPct(r.pctDifManPrevReal),  cls:r=>clrP(r.pctDifManPrevReal,true), align:'right', w:80, sortGetter: r=>r.pctDifManPrevReal },
        { key:'custoManLiquido',  label:'Custo Man Líq', fmt:r=>fmtBRL(r.custoManLiquido),    cls:r=>clrV(r.custoManLiquido,true), align:'right', w:120, sortGetter: r=>r.custoManLiquido },
        { key:'difCustoManLiq',   label:'Dif Liq',       fmt:r=>fmtBRL(r.difCustoManLiq),     cls:r=>clrV(r.difCustoManLiq), align:'right', w:120, sortGetter: r=>r.difCustoManLiq },
        { key:'pctDifCustoManLiq',label:'%Dif Liq',      fmt:r=>fmtPct(r.pctDifCustoManLiq),  cls:r=>clrP(r.pctDifCustoManLiq,true), align:'right', w:80, sortGetter: r=>r.pctDifCustoManLiq }
      );
    } else if (activeTab === 'manutencao') {
      dynYears.forEach(y => cols.push({ key:`man_${y}`, label:`Man ${y}`, fmt:r=>fmtBRL(r.years[y].man), cls:r=>clrV(r.years[y].man,true), align:'right', w:110, sortGetter: r=>r.years[y].man }));
      cols.push({ key:'totalManutencao',label:'Total Man', fmt:r=>fmtBRL(r.totalManutencao),cls:r=>clrV(r.totalManutencao,true), align:'right', w:110, sortGetter: r=>r.totalManutencao });
      cols.push({ key:'ticketMedio',    label:'Ticket Médio', fmt:r=>fmtBRL(r.ticketMedio),    align:'right', w:110, sortGetter: r=>r.ticketMedio });
      cols.push({ key:'custoKmMan',     label:'Custo/KM',     fmt:r=>fmtKM(r.custoKmMan),      align:'right', w:90, sortGetter: r=>r.custoKmMan });
      
      dynYears.forEach(y => cols.push({ key:`reembMan_${y}`, label:`Reemb Man ${y}`, fmt:r=>fmtBRL(r.years[y].reembMan), align:'right', w:110, sortGetter: r=>r.years[y].reembMan }));
      cols.push({ key:'totalReembMan',  label:'Total Reemb',  fmt:r=>fmtBRL(r.totalReembMan),  align:'right', w:110, sortGetter: r=>r.totalReembMan });
      
      dynYears.forEach(y => cols.push({ key:`difReembMan_${y}`, label:`Dif Reemb ${y}`, fmt:r=>fmtBRL(r.years[y].man - r.years[y].reembMan), cls:r=>clrV(r.years[y].man - r.years[y].reembMan,true), align:'right', w:110, sortGetter: r=>r.years[y].man - r.years[y].reembMan }));
      cols.push({ key:'custoLiqMan',    label:'Custo Líq Man',fmt:r=>fmtBRL(r.custoLiqMan),   cls:r=>clrV(r.custoLiqMan,true), align:'right', w:120, sortGetter: r=>r.custoLiqMan });
      cols.push({ key:'pctReembolsadoMan',label:'% Reemb Man',fmt:r=>fmtPct(r.pctReembolsadoMan), align:'right', w:90, sortGetter: r=>r.pctReembolsadoMan });
      cols.push({ key:'custoKmLiqMan',  label:'Custo KM Líq', fmt:r=>fmtKM(r.custoKmLiqMan),  align:'right', w:100, sortGetter: r=>r.custoKmLiqMan });
    } else if (activeTab === 'sinistro') {
      dynYears.forEach(y => cols.push({ key:`sin_${y}`, label:`Sin ${y}`, fmt:r=>fmtBRL(r.years[y].sin), cls:r=>clrV(r.years[y].sin,true), align:'right', w:110, sortGetter: r=>r.years[y].sin }));
      cols.push({ key:'totalSinistro',   label:'Total Sin',     fmt:r=>fmtBRL(r.totalSinistro),   cls:r=>clrV(r.totalSinistro,true), align:'right', w:110, sortGetter: r=>r.totalSinistro });
      
      dynYears.forEach(y => cols.push({ key:`reembSin_${y}`, label:`Reemb Sin ${y}`, fmt:r=>fmtBRL(r.years[y].reembSin), align:'right', w:120, sortGetter: r=>r.years[y].reembSin }));
      cols.push({ key:'totalReembSin',   label:'Total Reemb Sin',fmt:r=>fmtBRL(r.totalReembSin),  align:'right', w:120, sortGetter: r=>r.totalReembSin });
      
      dynYears.forEach(y => cols.push({ key:`difReembSin_${y}`, label:`Dif Reemb ${y}`, fmt:r=>fmtBRL(r.years[y].sin - r.years[y].reembSin), cls:r=>clrV(r.years[y].sin - r.years[y].reembSin,true), align:'right', w:110, sortGetter: r=>r.years[y].sin - r.years[y].reembSin }));
      cols.push({ key:'custoLiqSin',     label:'Custo Líq Sin', fmt:r=>fmtBRL(r.custoLiqSin),    cls:r=>clrV(r.custoLiqSin,true), align:'right', w:120, sortGetter: r=>r.custoLiqSin });
      cols.push({ key:'pctReembolsadoSin',label:'% Reemb Sin',  fmt:r=>fmtPct(r.pctReembolsadoSin), align:'right', w:95, sortGetter: r=>r.pctReembolsadoSin });
    } else if (activeTab === 'mansin') {
      dynYears.forEach(y => cols.push({ key:`manSin_${y}`, label:`Man+Sin ${y}`, fmt:r=>fmtBRL(r.years[y].man + r.years[y].sin), cls:r=>clrV(r.years[y].man + r.years[y].sin,true), align:'right', w:120, sortGetter: r=>r.years[y].man + r.years[y].sin }));
      cols.push({ key:'totalManSin',         label:'Total Man+Sin',fmt:r=>fmtBRL(r.totalManSin),cls:r=>clrV(r.totalManSin,true), align:'right', w:130, sortGetter: r=>r.totalManSin });
      cols.push({ key:'pctReembolsadoManSin',label:'% Reemb',     fmt:r=>fmtPct(r.pctReembolsadoManSin), align:'right', w:90, sortGetter: r=>r.pctReembolsadoManSin });
    } else if (activeTab === 'faturamento') {
      dynYears.forEach(y => cols.push({ key:`fat_${y}`, label:`Fat ${y}`, fmt:r=>fmtBRL(r.years[y].fat), align:'right', w:120, sortGetter: r=>r.years[y].fat }));
      cols.push({ key:'faturamentoTotal', label:'Fat Total',      fmt:r=>fmtBRL(r.faturamentoTotal),align:'right', w:130, sortGetter: r=>r.faturamentoTotal });
      cols.push({ key:'pctManFat',        label:'% Man/Fat',      fmt:r=>fmtPct(r.pctManFat),        cls:r=>clrP(r.pctManFat,true), align:'right', w:90, sortGetter: r=>r.pctManFat });
      cols.push({ key:'pctCustoLiqManFat',label:'% Liq Man/Fat',  fmt:r=>fmtPct(r.pctCustoLiqManFat),cls:r=>clrP(r.pctCustoLiqManFat,true), align:'right', w:100, sortGetter: r=>r.pctCustoLiqManFat });
      cols.push({ key:'pctSinFat',        label:'% Sin/Fat',      fmt:r=>fmtPct(r.pctSinFat),        cls:r=>clrP(r.pctSinFat,true), align:'right', w:90, sortGetter: r=>r.pctSinFat });
      cols.push({ key:'pctCustoLiqSinFat',label:'% Liq Sin/Fat',  fmt:r=>fmtPct(r.pctCustoLiqSinFat),cls:r=>clrP(r.pctCustoLiqSinFat,true), align:'right', w:100, sortGetter: r=>r.pctCustoLiqSinFat });
      cols.push({ key:'pctManSinFat',     label:'% Man+Sin/Fat',  fmt:r=>fmtPct(r.pctManSinFat),     cls:r=>clrP(r.pctManSinFat,true), align:'right', w:105, sortGetter: r=>r.pctManSinFat });
    }
    return cols;
  }, [activeTab, dynYears]);

  const allCols = useMemo(() => [...ID_COLS, ...tabCols], [tabCols]);

  const handleSort = (k:string) => { if(k===sortKey) setSortDir(d=>d==='asc'?'desc':'asc'); else{ setSortKey(k); setSortDir('asc'); } };
  const sortIcon   = (k:string) => sortKey===k?(sortDir==='asc'?' ↑':' ↓'):'';

  const exportXLSX = () => {
    const data = displayRows.map(r=>Object.fromEntries(allCols.map(c=>[c.label,c.fmt(r)])));
    const ws=XLSX.utils.json_to_sheet(data); const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Análise Contrato');
    XLSX.writeFile(wb,`analise_contrato_${activeTab}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const curTab = TABS.find(t=>t.key===activeTab)!;

  if (initialLoading) return <AnalyticsLoading message="Carregando contratos e frota..." />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-full px-4 py-5 space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/analytics" className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Análise de Rentabilidade por Contrato</h1>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                Dados consolidados por contrato de locação
                {heavyLoading && (
                  <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />carregando dados detalhados…
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {metadata && <DataUpdateBadge metadata={metadata} />}
            <button onClick={()=>setShowSettings(s=>!s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${showSettings?'bg-indigo-600 text-white border-indigo-600':'border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
              <Settings2 className="w-3.5 h-3.5" />Parâmetros
            </button>
            <button onClick={exportXLSX}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
              <Download className="w-3.5 h-3.5" />Exportar XLSX
            </button>
          </div>
        </div>

        {/* ── Settings ── */}
        {showSettings && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">⚙️ Parâmetros de Cálculo</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 font-medium">Divisor KM (Passagem Ideal)</span>
                <input type="number" value={kmDivisor} onChange={e=>setKmDivisor(+e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 font-medium">Custo Mensal Padrão (R$)</span>
                <input type="number" value={custoPadrao} onChange={e=>setCustoPadrao(+e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
              </label>
            </div>
            
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2">Custo Mensal Previsto por Grupo</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {allGrupos.map(g => (
                  <label key={g} className="flex flex-col gap-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-medium truncate" title={g}>{g}</span>
                    <input type="number" 
                      placeholder={`Padrão (${custoPadrao})`}
                      value={custoGeral[g] || ''} 
                      onChange={e=>{
                        const v = e.target.value;
                        setCustoGeral(prev => {
                          const next = {...prev};
                          if (v==='') delete next[g]; else next[g] = +v;
                          return next;
                        });
                      }} 
                      className="border border-slate-300 rounded md:rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-400 outline-none w-full" />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Cliente</label>
              <select value={filterCliente} onChange={e=>{setFilterCliente(e.target.value); setFilterCTO(''); setFilterGrupo('');}}
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none">
                <option value="">Todos</option>
                {opts.clientes.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">CTO (Contrato)</label>
              <select value={filterCTO} onChange={e=>setFilterCTO(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none">
                <option value="">Todos</option>
                {opts.ctos.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Grupo / Categoria</label>
              <select value={filterGrupo} onChange={e=>setFilterGrupo(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none">
                <option value="">Todos</option>
                {opts.grupos.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Placa</label>
              <select value={filterPlaca} onChange={e=>setFilterPlaca(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none">
                <option value="">Todas</option>
                {opts.placas.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Situação Comercial</label>
              <select value={filterSitCTO} onChange={e=>setFilterSitCTO(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none">
                <option value="">Todas</option>
                {opts.sitCTO.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Situação Locação</label>
              <select value={filterSitLoc} onChange={e=>setFilterSitLoc(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none">
                <option value="">Todas</option>
                {opts.sitLoc.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          {(filterCTO||filterCliente||filterPlaca||filterGrupo||filterSitCTO||filterSitLoc) && (
            <button onClick={()=>{setFilterCTO('');setFilterCliente('');setFilterPlaca('');setFilterGrupo('');setFilterSitCTO('');setFilterSitLoc('');}}
              className="mt-3 inline-block text-xs text-indigo-600 hover:underline">✕ Limpar filtros</button>
          )}
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {[
            {label:'Veículos',        val:kpis.nVeiculos.toLocaleString('pt-BR'), col:'text-indigo-600'},
            {label:'CTOs Locação',    val:kpis.nLocacao.toLocaleString('pt-BR'),  col:'text-blue-600'},
            {label:'CTOs Comerciais', val:kpis.nComercial.toLocaleString('pt-BR'), col:'text-sky-600'},
            {label:'Faturamento',     val:fmtBRL(kpis.fat),  col:'text-teal-600'},
            {label:'Manutenção',      val:fmtBRL(kpis.man),  col:'text-orange-600'},
            {label:'Sinistro',        val:fmtBRL(kpis.sin),  col:'text-red-600'},
            {label:'Man + Sin',       val:fmtBRL(kpis.ms),   col:'text-purple-600'},
            {label:'Total Reemb',     val:fmtBRL(kpis.reemb),col:'text-emerald-600'},
          ].map(k=>(
            <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 mb-1">{k.label}</div>
              <div className={`text-base font-bold ${k.col} truncate`} title={k.val}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 flex-wrap">
          {TABS.map(t=>{
            const Icon=t.icon;
            const isActive=activeTab===t.key;
            return (
              <button key={t.key} onClick={()=>setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive?`${t.color} text-white shadow-md`:'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Icon className="w-4 h-4" />{t.label}
              </button>
            );
          })}
        </div>

        {/* ── Table ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className={`${curTab.hdr} text-white px-4 py-2 text-sm font-semibold flex items-center gap-2`}>
            <curTab.icon className="w-4 h-4" />{curTab.label}
            <span className="ml-auto text-xs opacity-75">{displayRows.length} linhas</span>
          </div>
          <div className="overflow-auto" style={{maxHeight:'60vh'}}>
            <table className="border-collapse text-xs whitespace-nowrap w-full">
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr>
                  {/* ID header group */}
                  <th colSpan={ID_COLS.length} className="bg-slate-700 text-white text-center py-1.5 text-[10px] font-semibold uppercase tracking-wide border-r border-white/20">
                    Identificação
                  </th>
                  {/* Tab header group */}
                  <th colSpan={tabCols.length} className={`${curTab.hdr} text-white text-center py-1.5 text-[10px] font-semibold uppercase tracking-wide`}>
                    {curTab.label} ({dynYears[0]} - {dynYears[dynYears.length-1]})
                  </th>
                </tr>
                <tr className="bg-slate-800">
                  {allCols.map(col=>(
                    <th key={col.key} onClick={()=>handleSort(col.key)}
                      style={{minWidth:col.w||90,width:col.w||90}}
                      className={`px-2 py-1.5 text-[10px] font-semibold text-white/90 cursor-pointer hover:bg-slate-700 border-r border-white/10 select-none ${col.align==='right'?'text-right':'text-left'}`}>
                      {col.label}{sortIcon(col.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.length===0 && (
                  <tr><td colSpan={allCols.length} className="text-center py-16 text-slate-400">
                    {heavyLoading
                      ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/>Carregando dados detalhados…</span>
                      : 'Nenhum veículo encontrado com os filtros selecionados.'}
                  </td></tr>
                )}
                {displayRows.map((row,i)=>(
                  <tr key={row.placa}
                    className={`border-b border-slate-100 hover:bg-indigo-50/60 transition-colors ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                    {allCols.map(col=>(
                      <td key={col.key}
                        style={{minWidth:col.w||90,width:col.w||90}}
                        className={`px-2 py-1.5 border-r border-slate-100 ${col.align==='right'?'text-right':'text-left'} ${col.cls?col.cls(row):'text-slate-700'}`}>
                        {col.fmt(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {heavyLoading && (
            <div className="px-4 py-2 border-t border-slate-200 text-xs text-amber-600 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin"/>
              Manutenção & faturamento ainda carregando — valores parciais podem ser exibidos
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
