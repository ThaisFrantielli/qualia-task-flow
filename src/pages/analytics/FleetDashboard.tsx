import { useMemo, useState, useRef, useEffect } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import * as XLSX from 'xlsx';
import { ResponsiveContainer, Cell, Tooltip, BarChart, Bar, LabelList, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { Car, Filter, ChevronDown, Check, Square, CheckSquare, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, Search, CheckCircle2, XCircle, MapPin, Warehouse, Timer, Archive, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChartFilter } from '@/hooks/useChartFilter';
import { ChartFilterBadges, FloatingClearButton } from '@/components/analytics/ChartFilterBadges';
import EfficiencyTab from '@/components/analytics/fleet/EfficiencyTab';
import TimelineTab from '@/components/analytics/fleet/TimelineTab';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

type AnyObject = { [k: string]: any };

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function parseNum(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number) {
    try {
        if (!isFinite(Number(v))) return 'R$ 0';
        if (v >= 1000000) return `R$ ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v / 1000000)}M`;
        if (v >= 1000) return `R$ ${new Intl.NumberFormat('pt-BR').format(Math.round(v / 1000))}k`;
        return `R$ ${new Intl.NumberFormat('pt-BR').format(Math.round(v))}`;
    } catch (e) {
        return `R$ ${v}`;
    }
}
function fmtDecimal(v: number) { return new Intl.NumberFormat('pt-BR').format(v); }

interface FleetTableItem {
  Placa: string; Modelo: string; Status: string; IdadeVeiculo: number;
  compra: number; fipe: number; manut: number; tco: number; depreciacao: number;
  tipo: string; lat: number; lng: number; KmInformado: number; KmConfirmado: number; pctFipe: number;
  Patio: string; DiasNoStatus: number;
  DataInicioStatus: string;
  ProvedorTelemetria?: string;
  UltimaAtualizacaoTelemetria?: string;
  UltimoEnderecoTelemetria?: string;
  ComSeguroVigente?: any;
  Proprietario?: string;
  FinalidadeUso?: string;
  NomeCondutor?: string;
  CPFCondutor?: string;
  TelefoneCondutor?: string;
  NomeCliente?: string;
  TipoLocacao?: string;
    };

// Componente MultiSelect personalizado (reutilizado de outros dashboards)
const MultiSelect = ({ options, selected, onChange, label }: { options: string[], selected: string[], onChange: (val: string[]) => void, label: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);
  
    const handleSelect = (val: string) => {
        if (selected.includes(val)) onChange(selected.filter(v => v !== val));
        else onChange([...selected, val]);
    };
  
    const toggleAll = () => {
        if (selected.length === options.length) onChange([]);
        else onChange([...options]);
    };
  
    const allSelected = options.length > 0 && selected.length === options.length;
  
    return (
        <div className="relative w-full" ref={ref}>
            <label className="text-xs text-slate-500 block mb-1">{label}</label>
            <div onClick={() => setIsOpen(!isOpen)} className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white cursor-pointer flex justify-between items-center h-10 hover:border-blue-400 transition-colors">
                <span className="truncate text-slate-700">
                    {selected.length === 0 ? 'Selecione...' : selected.length === options.length ? 'Todos' : `${selected.length} sel.`}
                </span>
                <ChevronDown size={16} className="text-slate-400" />
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div onClick={toggleAll} className="flex items-center gap-2 p-2 hover:bg-slate-100 cursor-pointer border-b border-slate-100 font-medium text-blue-600 sticky top-0 bg-white">
                        {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        <span className="text-sm">Selecionar Todos</span>
                    </div>
                    {options.map(opt => (
                        <div key={opt} onClick={() => handleSelect(opt)} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0">
                            <div className={`w-4 h-4 border rounded flex items-center justify-center ${selected.includes(opt) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                {selected.includes(opt) && <Check size={12} className="text-white" />}
                            </div>
                            <span className="text-sm text-slate-700 truncate">{opt}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function FleetDashboard(): JSX.Element {
  const { data: frotaData } = useBIData<AnyObject[]>('dim_frota.json');
  const { data: manutencaoData } = useBIData<AnyObject[]>('fat_manutencao_unificado.json');
  const { data: timelineData } = useBIData<AnyObject[]>('hist_vida_veiculo_timeline.json');
  const { data: carroReservaData } = useBIData<AnyObject[]>('fat_carro_reserva.json');
  const { data: patioMovData } = useBIData<AnyObject[]>('dim_movimentacao_patios.json');
  const { data: contratosLocacaoData } = useBIData<AnyObject[]>('dim_contratos_locacao.json');

  const frota = useMemo(() => Array.isArray(frotaData) ? frotaData : [], [frotaData]);
  const manutencao = useMemo(() => (manutencaoData as any)?.data || manutencaoData || [], [manutencaoData]);
  const timeline = useMemo(() => Array.isArray(timelineData) ? timelineData : [], [timelineData]);
  const carroReserva = useMemo(() => Array.isArray(carroReservaData) ? carroReservaData : [], [carroReservaData]);
  const patioMov = useMemo(() => Array.isArray(patioMovData) ? patioMovData : [], [patioMovData]);
  const contratosLocacao = useMemo(() => Array.isArray(contratosLocacaoData) ? contratosLocacaoData : [], [contratosLocacaoData]);

  // Mapa de Contratos por Placa (para enriquecer dim_frota)
  const contratosMap = useMemo(() => {
        const map: Record<string, {
            NomeCliente: string;
            TipoLocacao: string;
            NumeroContratoLocacao?: string;
            SituacaoLocacao?: string;
            DataPrevistaTerminoLocacao?: string;
            DataEncerramentoLocacao?: string;
            __inicio?: string;
        }> = {};

        const normalizeText = (v: any) => String(v ?? '').trim();
        const getStatus = (c: AnyObject) => normalizeText(c.StatusLocacao ?? c.Status ?? c.Situacao ?? c.situacao);
        const isClosed = (status: string) => {
            const s = status.toUpperCase();
            return s.includes('ENCERR') || s.includes('CANCEL');
        };
        const pickDate = (c: AnyObject, keys: string[]) => {
            for (const k of keys) {
                const raw = normalizeText((c as any)[k]);
                if (raw) return raw;
            }
            return undefined;
        };
        const parseSortableDate = (raw?: string) => {
            if (!raw) return 0;
            const t = new Date(raw).getTime();
            return Number.isFinite(t) ? t : 0;
        };
        const getStartDate = (c: AnyObject) => pickDate(c, ['DataInicio', 'InicioContrato', 'DataInicioContrato', 'DataRetirada', 'DataAbertura']);

        for (const c of contratosLocacao) {
            const placa = String(c.PlacaPrincipal ?? c.Placa ?? '').trim();
            if (!placa) continue;

            const status = getStatus(c);
            const contratoId = normalizeText(c.NumeroContrato ?? c.Contrato ?? c.IdContratoLocacao ?? c.ContratoId);

            const inicio = getStartDate(c);
            const next = {
                NomeCliente: normalizeText(c.NomeCliente ?? c.Cliente ?? 'Sem Cliente') || 'Sem Cliente',
                TipoLocacao: normalizeText(c.TipoLocacao ?? 'Não Definido') || 'Não Definido',
                NumeroContratoLocacao: contratoId || undefined,
                SituacaoLocacao: status || undefined,
                DataPrevistaTerminoLocacao: pickDate(c, ['DataPrevistaTermino', 'DataFimPrevista', 'DataFimPrevisto', 'DataFim', 'DataTerminoPrevisto', 'DataFimLocacao']) || undefined,
                DataEncerramentoLocacao: pickDate(c, ['DataEncerramento', 'DataEncerrado', 'DataFimEfetiva', 'DataFim', 'DataTermino', 'DataFimLocacao']) || undefined,
                __inicio: inicio || undefined,
            };

            const prev = map[placa];
            if (!prev) {
                map[placa] = next;
                continue;
            }

            // Preferir contrato não encerrado/cancelado; em empate, pegar o mais recente por data de início
            const prevClosed = isClosed(prev.SituacaoLocacao || '');
            const nextClosed = isClosed(status);
            if (prevClosed && !nextClosed) {
                map[placa] = next;
                continue;
            }
            if (prevClosed === nextClosed) {
                const prevStart = parseSortableDate(prev.__inicio);
                const nextStart = parseSortableDate(inicio);
                if (nextStart >= prevStart) {
                    map[placa] = next;
                }
            }
        }

        return map;
  }, [contratosLocacao]);

  const frotaEnriched = useMemo(() => {
     return frota.map(v => {
         const contrato = contratosMap[v.Placa];
         return {
             ...v,
             NomeCliente: contrato?.NomeCliente || 'N/A',
             TipoLocacao: contrato?.TipoLocacao || 'N/A',
             NumeroContratoLocacao: contrato?.NumeroContratoLocacao || v.ContratoAtual || 'N/A',
             SituacaoLocacao: contrato?.SituacaoLocacao || 'N/A',
             DataPrevistaTerminoLocacao: contrato?.DataPrevistaTerminoLocacao || v.DataFimLocacao || null,
             DataEncerramentoLocacao: contrato?.DataEncerramentoLocacao || v.DataFimLocacao || null,
         } as typeof v & {
           NomeCliente: string;
           TipoLocacao: string;
           NumeroContratoLocacao: string;
           SituacaoLocacao: string;
           DataPrevistaTerminoLocacao: string | null;
           DataEncerramentoLocacao: string | null;
         };
     });
  }, [frota, contratosMap]);

  const manutencaoMap = useMemo(() => {
    const map: Record<string, number> = {};
    manutencao.forEach((m: any) => { if(m.Placa) map[m.Placa] = (map[m.Placa] || 0) + parseCurrency(m.CustoTotalOS || m.ValorTotal); });
    return map;
  }, [manutencao]);

    // use unified chart filter hook (Power BI style)
    const { filters, handleChartClick, clearFilter, clearAllFilters, hasActiveFilters, isValueSelected, getFilterValues } = useChartFilter();

    // helper to set array values coming from MultiSelect components
    const setFilterValues = (key: string, values: string[]) => {
        clearFilter(key);
        values.forEach(v => handleChartClick(key, v, { ctrlKey: true } as unknown as React.MouseEvent));
        setPage(0);
    };
  const [page, setPage] = useState(0);
  const pageSize = 15;
  const [sortConfig, setSortConfig] = useState<{ key: keyof FleetTableItem; direction: 'asc' | 'desc' } | null>(null);
  const [_timelinePage, _setTimelinePage] = useState(0);
  const [_expandedPlates, _setExpandedPlates] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [reservaPage, setReservaPage] = useState(0);
    const [patioPage, setPatioPage] = useState(0);
  // Slider de período para gráfico de ocupação
  const [sliderRange, setSliderRange] = useState<{startPercent: number, endPercent: number}>({startPercent: 0, endPercent: 100});
    // reserva filters are handled via useChartFilter keys: 'reserva_motivo','reserva_cliente','reserva_status','reserva_search'

    // apply default filter: show 'Ativa' productivity on first load
    const defaultProductivityApplied = useRef(false);
    useEffect(() => {
        if (!defaultProductivityApplied.current && frota.length > 0 && getFilterValues('productivity').length === 0) {
            handleChartClick('productivity', 'Ativa', { ctrlKey: true } as unknown as React.MouseEvent);
            defaultProductivityApplied.current = true;
        }
    }, [frota, getFilterValues, handleChartClick]);

  // CLASSIFICAÇÃO DE FROTA
  const getCategory = (status: string) => {
      const s = (status || '').toUpperCase();
      if (['LOCADO', 'LOCADO VEÍCULO RESERVA', 'USO INTERNO', 'EM MOBILIZAÇÃO', 'EM MOBILIZACAO'].includes(s)) return 'Produtiva';
            // Treat some statuses as Inativa (also exclude them from 'Improdutiva')
            if ([
                'DEVOLVIDO', 'ROUBO / FURTO', 'BAIXADO', 'VENDIDO', 'SINISTRO PERDA TOTAL',
                'DISPONIVEL PRA VENDA', 'DISPONIVEL PARA VENDA', 'DISPONÍVEL PARA VENDA', 'DISPONÍVEL PRA VENDA',
                'NÃO DISPONÍVEL', 'NAO DISPONIVEL', 'NÃO DISPONIVEL', 'NAO DISPONÍVEL',
                'EM DESMOBILIZAÇÃO', 'EM DESMOBILIZACAO'
            ].includes(s)) return 'Inativa';
      return 'Improdutiva';
  };

  const uniqueOptions = useMemo(() => ({
    status: Array.from(new Set(frotaEnriched.map(r => r.Status).filter(Boolean))).sort(),
    modelos: Array.from(new Set(frotaEnriched.map(r => r.Modelo).filter(Boolean))).sort(),
    filiais: Array.from(new Set(frotaEnriched.map(r => r.Filial).filter(Boolean))).sort(),
    clientes: Array.from(new Set(frotaEnriched.map(r => r.NomeCliente).filter((c: string) => c && c !== 'N/A'))).sort(),
    tiposLocacao: Array.from(new Set(frotaEnriched.map(r => r.TipoLocacao).filter((t: string) => t && t !== 'N/A'))).sort()
  }), [frotaEnriched]);

  // note: use `getFilterValues(key)` to read current selections, e.g. getFilterValues('status')

  const [selectedLocation, setSelectedLocation] = useState<{city: string, uf: string} | null>(null);

  // Helper centralizado para extração de localização
  const extractLocation = (address: string): { uf: string, city: string } => {
      const fullAddr = (address || '').trim();
      let uf = 'ND';
      let city = 'Não Identificado';

      const ufMatch = fullAddr.match(/\(([A-Z]{2})\)/);
      if (ufMatch) uf = ufMatch[1];
      else if (fullAddr.toUpperCase().includes('DISTRITO FEDERAL')) uf = 'DF';
      else {
          const suffixMatch = fullAddr.match(/[\s-]([A-Z]{2})(?:$|[,\s])/);
          if(suffixMatch) uf = suffixMatch[1];
      }

      try {
          let cleanAddr = fullAddr.replace(/^[^\(]+\([A-Z]{2}\)[:\s]*/, '');
          const parts = cleanAddr.split(',').map(p => p.trim()).filter(p => p.length > 0);
          
          for (let i = parts.length - 1; i >= 0; i--) {
              const part = parts[i].toUpperCase();
              if (part === 'BRASIL') continue;
              if (/\d{5}-?\d{3}/.test(part)) continue;
              if (part.startsWith('REGIÃO')) continue;
              if (part.startsWith('MICRORREGIÃO')) continue;
              if (part.startsWith('VILA ')) continue;
              if (part.startsWith('JARDIM ')) continue;
              if (part.length < 3 || /^\d+/.test(part)) continue;
              
              city = parts[i];
              break;
          }
      } catch (e) {}

      // --- CORREÇÕES MANUAIS ---
      const stateCorrections: Record<string, string> = {
          'DE': 'GO', 'DA': 'MT', 'DO': 'SP', 'GM': 'SP', 'VW': 'SP', 'EM': 'SP', 'FEDERAL DISTRICT': 'DF'
      };
      if (stateCorrections[uf]) uf = stateCorrections[uf];

      const cityCorrections: Record<string, string> = {
          'Sia': 'Brasília', 'Scia': 'Brasília', 'Plano Piloto': 'Brasília', 'Gama': 'Brasília',
          'Taguatinga': 'Brasília', 'Ceilândia': 'Brasília', 'Sobradinho': 'Brasília', 'Guará': 'Brasília',
          'Samambaia': 'Brasília', 'Planaltina': 'Brasília', 'Santa Maria': 'Brasília', 'Cruzeiro': 'Brasília',
          'Lago Sul': 'Brasília', 'Lago Norte': 'Brasília', 'Vicente Pires': 'Brasília', 'Sudoeste / Octogonal': 'Brasília',
          'Recanto Das Emas': 'Brasília', 'Paranoá': 'Brasília', 'Riacho Fundo': 'Brasília', 'São Sebastião': 'Brasília',
          'Águas Claras': 'Brasília', 'Candangolândia': 'Brasília', 'Núcleo Bandeirante': 'Brasília', 'Park Way': 'Brasília',
          'Imbiribeira': 'Recife', 'Hauer': 'Curitiba', 'Pilarzinho': 'Curitiba', 'Portão': 'Curitiba', 'Centro': 'Curitiba',
          'Parolin': 'Curitiba', 'Demarchi': 'São Bernardo do Campo', 'Santana': 'São Paulo', 'Barra Funda': 'São Paulo',
          'República': 'São Paulo', 'Vila Leopoldina': 'São Paulo', 'Brás': 'São Paulo', 'Santo Amaro': 'São Paulo',
          'Itaquera': 'São Paulo', 'Jabaquara': 'São Paulo', 'Moema': 'São Paulo', 'Perdizes': 'São Paulo',
          'Pinheiros': 'São Paulo', 'Limão': 'São Paulo', 'Cachoeirinha': 'São Paulo', 'Brasilândia': 'São Paulo', 
          'Jardim Goiás': 'Goiânia', 'Setor Leste': 'Goiânia', 'Setor Norte': 'Brasília',
          'Sol Nascente/pôr Do Sol': 'Brasília'
      };

      if (city.toUpperCase() === 'SÃO PAULO' || city.toUpperCase() === 'OSASCO' || city.toUpperCase() === 'BARUERI') {
          if (uf !== 'SP') uf = 'SP';
      }
      if (city.toUpperCase() === 'RIO DE JANEIRO') if (uf !== 'RJ') uf = 'RJ';
      if (city.toUpperCase() === 'BELO HORIZONTE') if (uf !== 'MG') uf = 'MG';
      if (city.toUpperCase() === 'BRASÍLIA' || city.toUpperCase().includes('DISTRITO FEDERAL')) {
          uf = 'DF';
          city = 'Brasília';
      }
      if(city.toUpperCase() === 'GOIÂNIA' || city.toUpperCase() === 'APARECIDA DE GOIÂNIA') if(uf !== 'GO') uf = 'GO';

      city = city.toLowerCase().replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
      if (cityCorrections[city]) city = cityCorrections[city];

      return { uf, city };
  };

    const filteredData = useMemo(() => {
        const prodFilters = getFilterValues('productivity');
        const statusFilters = getFilterValues('status');
        const modeloFilters = getFilterValues('modelo');
        const filialFilters = getFilterValues('filial');
        const patioFilters = getFilterValues('patio');
        const agingFilters = getFilterValues('aging');
        const search = (getFilterValues('search') || [])[0] || '';
        
        const clienteFilters = getFilterValues('cliente');
        const tipoLocacaoFilters = getFilterValues('tipoLocacao');

        return frotaEnriched.filter(r => {
            const cat = getCategory(r.Status);
            if (prodFilters.length > 0) {
                const allowed = new Set<string>();
                if (prodFilters.includes('Ativa')) { allowed.add('Produtiva'); allowed.add('Improdutiva'); }
                if (prodFilters.includes('Produtiva')) allowed.add('Produtiva');
                if (prodFilters.includes('Improdutiva')) allowed.add('Improdutiva');
                if (prodFilters.includes('Inativa')) allowed.add('Inativa');
                if (!allowed.has(cat)) return false;
            }

            if (statusFilters.length > 0 && !statusFilters.includes(r.Status)) return false;
            if (modeloFilters.length > 0 && !modeloFilters.includes(r.Modelo)) return false;
            if (filialFilters.length > 0 && !filialFilters.includes(r.Filial)) return false;
            if (clienteFilters.length > 0 && !clienteFilters.includes(r.NomeCliente)) return false;
            if (tipoLocacaoFilters.length > 0 && !tipoLocacaoFilters.includes(r.TipoLocacao)) return false;

            if (patioFilters.length > 0 && !patioFilters.includes(r.Patio)) return false;

            // Filtra por seleção de localização (quando usuário clica no mapa/accordion)
            if (selectedLocation) {
                const loc = extractLocation(r.UltimoEnderecoTelemetria);
                if (loc.uf !== selectedLocation.uf || loc.city !== selectedLocation.city) return false;
            }

            if (agingFilters.length > 0) {
                const dias = parseNum(r.DiasNoStatus);
                const ok = agingFilters.some((af: string) => {
                    if (af === '0-30 dias') return dias <= 30;
                    if (af === '31-60 dias') return dias > 30 && dias <= 60;
                    if (af === '61-90 dias') return dias > 60 && dias <= 90;
                    if (af === '90+ dias') return dias > 90;
                    return false;
                });
                if (!ok) return false;
            }

            if (search) {
                const term = search.toLowerCase();
                if (!r.Placa?.toLowerCase().includes(term) && !r.Modelo?.toLowerCase().includes(term)) return false;
            }
            return true;
        });
    }, [frotaEnriched, filters, getFilterValues, selectedLocation]);

  const kpis = useMemo(() => {
    const total = filteredData.length;
    const produtiva = filteredData.filter(r => getCategory(r.Status) === 'Produtiva');
    const improdutiva = filteredData.filter(r => getCategory(r.Status) === 'Improdutiva');
    const inativa = filteredData.filter(r => getCategory(r.Status) === 'Inativa');

    const kmTotal = filteredData.reduce((s, r) => s + parseNum(r.KmInformado), 0);
    const kmMedia = total > 0 ? kmTotal / total : 0;
    const idadeMedia = total > 0 ? filteredData.reduce((s, r) => s + parseNum(r.IdadeVeiculo), 0) / total : 0;
    
    const frotaAtivaTotal = produtiva.length + improdutiva.length;
    const taxaProdutividade = frotaAtivaTotal > 0 ? (produtiva.length / frotaAtivaTotal) * 100 : 0;
    const taxaImprodutiva = frotaAtivaTotal > 0 ? (improdutiva.length / frotaAtivaTotal) * 100 : 0;
    
    const compraProd = produtiva.reduce((s, r) => s + parseCurrency(r.ValorCompra), 0);
    const fipeProd = produtiva.reduce((s, r) => s + parseCurrency(r.ValorFipeAtual), 0);
    const pctFipeProd = fipeProd > 0 ? (compraProd / fipeProd) * 100 : 0;
    
    const compraImprod = improdutiva.reduce((s, r) => s + parseCurrency(r.ValorCompra), 0);
    const fipeImprod = improdutiva.reduce((s, r) => s + parseCurrency(r.ValorFipeAtual), 0);
    const pctFipeImprod = fipeImprod > 0 ? (compraImprod / fipeImprod) * 100 : 0;

    // NOVOS KPIs: TCO, ROI, Health Score
    const tcoTotal = filteredData.reduce((s, r) => {
      const compra = parseCurrency(r.ValorCompra);
      const manut = manutencaoMap[r.Placa] || 0;
      const fipe = parseCurrency(r.ValorFipeAtual);
      const depreciacao = Math.max(0, compra - fipe);
      return s + compra + manut + depreciacao - fipe;
    }, 0);
    const tcoMedio = total > 0 ? tcoTotal / total : 0;

    // ROI médio estimado (baseado em receita potencial vs custo)
    const receitaPotencialMensal = produtiva.reduce((s, r) => s + parseCurrency(r.ValorLocacao || 0), 0);
    const custoMensalEstimado = tcoTotal / 36; // amortizado em 36 meses
    const roiEstimado = custoMensalEstimado > 0 ? ((receitaPotencialMensal - custoMensalEstimado) / custoMensalEstimado) * 100 : 0;

    // Health Score (0-100): Baseado em idade, passagens manutenção, % FIPE
    const healthScoreCalc = (r: any) => {
      let score = 100;
      const idade = parseNum(r.IdadeVeiculo);
      const passagens = manutencaoMap[r.Placa] ? 1 : 0; // simplificado - presença de manutenção
      const pctFipe = parseCurrency(r.ValorFipeAtual) > 0 
        ? (parseCurrency(r.ValorCompra) / parseCurrency(r.ValorFipeAtual)) * 100 
        : 100;
      
      // Penaliza idade (cada 12 meses = -10 pontos)
      score -= Math.min(40, Math.floor(idade / 12) * 10);
      // Penaliza manutenção alta
      if (passagens > 0) score -= 15;
      // Penaliza depreciação alta (se compra > 120% FIPE)
      if (pctFipe > 120) score -= 20;
      else if (pctFipe > 110) score -= 10;
      
      return Math.max(0, Math.min(100, score));
    };
    const healthScoreTotal = filteredData.reduce((s, r) => s + healthScoreCalc(r), 0);
    const healthScoreMedio = total > 0 ? healthScoreTotal / total : 0;

    // Custo de ociosidade (improdutiva: valor locação potencial perdido)
    const custoOciosidade = improdutiva.reduce((s, r) => {
      const diasParado = parseNum(r.DiasNoStatus);
      const valorDiario = parseCurrency(r.ValorLocacao || 0) / 30;
      return s + (valorDiario * diasParado);
    }, 0);

    return { 
      total, produtivaQtd: produtiva.length, improdutivaQtd: improdutiva.length, inativaQtd: inativa.length,
      kmMedia, idadeMedia, taxaProdutividade, taxaImprodutiva,
      compraProd, fipeProd, pctFipeProd,
      compraImprod, fipeImprod, pctFipeImprod,
      // Novos KPIs
      tcoTotal, tcoMedio, roiEstimado, healthScoreMedio, custoOciosidade
    };
  }, [filteredData, manutencaoMap]);

    // Breakdown of 'Improdutiva' sub-statuses (counts and percentage of the improdutiva group)
    const improdutivaBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        const impro = filteredData.filter(r => getCategory(r.Status) === 'Improdutiva');
        impro.forEach(r => { const s = r.Status || 'Não Definido'; map[s] = (map[s] || 0) + 1; });
        const total = impro.length || 1;
        return Object.entries(map).map(([name, value]) => ({ name, value, pct: (value / total) * 100 })).sort((a,b) => b.value - a.value);
    }, [filteredData]);

    // Breakdown of 'Produtiva' sub-statuses
    const produtivaBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        const prod = filteredData.filter(r => getCategory(r.Status) === 'Produtiva');
        prod.forEach(r => { const s = r.Status || 'Não Definido'; map[s] = (map[s] || 0) + 1; });
        const total = prod.length || 1;
        return Object.entries(map).map(([name, value]) => ({ name, value, pct: (value / total) * 100 })).sort((a,b) => b.value - a.value);
    }, [filteredData]);

  // Charts
    const statusColorMap: Record<string, string> = {
        'VENDIDO': '#10b981', // green
        'LOCADO': '#f59e0b', // amber
        'DISPONIVEL PARA VENDA': '#ef4444', // red
        'DISPONÍVEL PARA VENDA': '#ef4444',
        'DISPONIVEL PRA VENDA': '#ef4444',
        'BLOQUEADO': '#f97316',
        'DEVOLVIDO': '#64748b',
        'RESERVA': '#06b6d4',
        'DISPONÍVEL': '#3b82f6'
    };

    const statusData = useMemo(() => {
        const map: Record<string, number> = {};
        filteredData.forEach(r => { map[r.Status] = (map[r.Status] || 0) + 1; });
        return Object.entries(map).map(([name, value]) => ({ name, value, color: statusColorMap[name?.toUpperCase?.() as string] || '#8884d8' }));
    }, [filteredData]);

    const cityCoordinates: Record<string, [number, number]> = {
        'Manaus': [-3.1190, -60.0217],
        'Brasília': [-15.7975, -47.8919],
        'São Paulo': [-23.5505, -46.6333],
        'Rio de Janeiro': [-22.9068, -43.1729],
        'Belo Horizonte': [-19.9167, -43.9345],
        'Curitiba': [-25.4244, -49.2654],
        'Fortaleza': [-3.7172, -38.5434],
        'Salvador': [-12.9777, -38.5016],
        'Recife': [-8.0476, -34.8770],
        'Porto Alegre': [-30.0346, -51.2177],
        'Goiânia': [-16.6869, -49.2648],
        'Campinas': [-22.9099, -47.0626],
        'Belém': [-1.4558, -48.4902],
        'São Luís': [-2.5307, -44.3068],
        'Maceió': [-9.6498, -35.7089],
        'Natal': [-5.7945, -35.2110],
        'Campo Grande': [-20.4697, -54.6201],
        'Teresina': [-5.0920, -42.8038],
        'João Pessoa': [-7.1195, -34.8450],
        'Aracaju': [-10.9472, -37.0731],
        'Cuiabá': [-15.6014, -56.0979],
        'Florianópolis': [-27.5954, -48.5480],
        'Macapá': [0.0355, -51.0705],
        'Vitória': [-20.3155, -40.3128],
        'Porto Velho': [-8.7612, -63.9039],
        'Rio Branco': [-9.9754, -67.8249],
        'Palmas': [-10.1753, -48.3318],
        'Boa Vista': [2.8235, -60.6758]
    };

    const mapData = useMemo(() => {
            return filteredData
                .map(r => {
                    const loc = extractLocation(r.UltimoEnderecoTelemetria);
                    let lat = parseNum(r.Latitude);
                    let lng = parseNum(r.Longitude);

                    // Fallback para cidades conhecidas se GPS zerado/ausente
                    if ((!lat || !lng || (lat === 0 && lng === 0)) && cityCoordinates[loc.city]) {
                        const [cLat, cLng] = cityCoordinates[loc.city];
                        // Adiciona pequeno jitter para não empilhar exatamente no mesmo ponto
                        lat = cLat + (Math.random() - 0.5) * 0.02;
                        lng = cLng + (Math.random() - 0.5) * 0.02;
                    }

                    return { 
                        ...r, 
                        _lat: lat, 
                        _lng: lng,
                        _city: loc.city,
                        _uf: loc.uf
                    } as typeof r & { _lat: number; _lng: number; _city: string; _uf: string };
                })
                .filter(r => isFinite(r._lat) && isFinite(r._lng) && r._lat !== 0 && r._lng !== 0)
                .filter(r => {
                    if(!selectedLocation) return true;
                    return r._city === selectedLocation.city && r._uf === selectedLocation.uf;
                });
    }, [filteredData, selectedLocation]);

  const kmDifferenceData = useMemo(() => {
    const ranges = { 'Sem Divergência': 0, 'Baixa (<1k)': 0, 'Média (1k-5k)': 0, 'Alta (>5k)': 0 };
    filteredData.forEach(r => {
        const diff = Math.abs(parseNum(r.KmInformado) - parseNum(r.KmConfirmado));
        if (diff === 0) ranges['Sem Divergência']++;
        else if (diff <= 1000) ranges['Baixa (<1k)']++;
        else if (diff <= 5000) ranges['Média (1k-5k)']++;
        else ranges['Alta (>5k)']++;
    });
    return Object.entries(ranges).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

    // Distribuição por modelo removida - usar modelosPorCategoria (hierárquico)

    // Dados hierárquicos: categorias e modelos (usa GrupoVeiculo do banco)
    const modelosPorCategoria = useMemo(() => {
        const categoryMap: Record<string, Record<string, number>> = {};
        
        filteredData.forEach(r => {
            const modelo = r.Modelo || 'Não Definido';
            const categoria = r.Categoria || r.GrupoVeiculo || 'Outros';
            
            if (!categoryMap[categoria]) categoryMap[categoria] = {};
            categoryMap[categoria][modelo] = (categoryMap[categoria][modelo] || 0) + 1;
        });
        
        return Object.entries(categoryMap)
            .map(([categoria, modelos]) => {
                const totalCategoria = Object.values(modelos).reduce((sum, val) => sum + val, 0);
                const modelosArray = Object.entries(modelos)
                    .map(([nome, qtd]) => ({ name: nome, value: qtd }))
                    .sort((a, b) => b.value - a.value);
                
                return {
                    categoria,
                    total: totalCategoria,
                    modelos: modelosArray
                };
            })
            .sort((a, b) => b.total - a.total);
    }, [filteredData]);

    // Dados para exibição no gráfico (com categorias colapsáveis)
    const modelosHierarchicalData = useMemo(() => {
        const data: Array<{ name: string; value: number; isCategory?: boolean; categoria?: string }> = [];
        
        modelosPorCategoria.forEach(({ categoria, total, modelos }) => {
            // Adiciona a linha da categoria
            data.push({ 
                name: `📁 ${categoria}`, 
                value: total, 
                isCategory: true,
                categoria 
            });
            
            // Se expandida, adiciona os modelos
            if (expandedCategories.includes(categoria)) {
                modelos.forEach(modelo => {
                    data.push({ 
                        name: `  └─ ${modelo.name}`, 
                        value: modelo.value,
                        isCategory: false,
                        categoria
                    });
                });
            }
        });
        
        return data;
    }, [modelosPorCategoria, expandedCategories]);

    const toggleCategory = (categoria: string) => {
        setExpandedCategories(prev => 
            prev.includes(categoria) 
                ? prev.filter(c => c !== categoria)
                : [...prev, categoria]
        );
    };

    // Distribuição por faixa de odômetro (10k em 10k até 120k+)
    const odometroData = useMemo(() => {
        const ranges: Record<string, number> = {
            '0-10k': 0,
            '10k-20k': 0,
            '20k-30k': 0,
            '30k-40k': 0,
            '40k-50k': 0,
            '50k-60k': 0,
            '60k-70k': 0,
            '70k-80k': 0,
            '80k-90k': 0,
            '90k-100k': 0,
            '100k-110k': 0,
            '110k-120k': 0,
            '120k+': 0
        };
        
        filteredData.forEach(r => {
            const km = parseNum(r.KmInformado);
            if (km < 10000) ranges['0-10k']++;
            else if (km < 20000) ranges['10k-20k']++;
            else if (km < 30000) ranges['20k-30k']++;
            else if (km < 40000) ranges['30k-40k']++;
            else if (km < 50000) ranges['40k-50k']++;
            else if (km < 60000) ranges['50k-60k']++;
            else if (km < 70000) ranges['60k-70k']++;
            else if (km < 80000) ranges['70k-80k']++;
            else if (km < 90000) ranges['80k-90k']++;
            else if (km < 100000) ranges['90k-100k']++;
            else if (km < 110000) ranges['100k-110k']++;
            else if (km < 120000) ranges['110k-120k']++;
            else ranges['120k+']++;
        });
        
        return Object.entries(ranges).map(([name, value]) => ({ name, value }));
    }, [filteredData]);

  // ANÁLISES DE TELEMETRIA
  const telemetriaData = useMemo(() => {
      const map: Record<string, number> = {};
      filteredData.forEach(r => {
          const raw = (r.ProvedorTelemetria ?? '').toString().trim();
          const provedor = raw || 'Sem Telemetria';
          map[provedor] = (map[provedor] || 0) + 1;
      });
      return Object.entries(map)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const veiculosComTelemetria = useMemo(() => {
      return filteredData.filter(r => 
          r.ProvedorTelemetria && 
          r.ProvedorTelemetria !== 'NÃO DEFINIDO' && 
          r.ProvedorTelemetria !== 'Não Definido'
      );
  }, [filteredData]);

  const telemetriaAtualizada = useMemo(() => {
      const agora = new Date();
      const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
      
      return veiculosComTelemetria.filter(r => {
          if (!r.UltimaAtualizacaoTelemetria) return false;
          const ultima = new Date(r.UltimaAtualizacaoTelemetria);
          return isFinite(ultima.getTime()) && ultima >= umDiaAtras;
      }).length;
  }, [veiculosComTelemetria]);

  const seguroData = useMemo(() => {
      const map: Record<string, number> = {
          'Com Seguro': 0,
          'Sem Seguro': 0,
          'Não Informado': 0
      };
      
      filteredData.forEach(r => {
          if (r.ComSeguroVigente === null || r.ComSeguroVigente === undefined) {
              map['Não Informado']++;
          } else if (r.ComSeguroVigente === 1 || r.ComSeguroVigente === true || r.ComSeguroVigente === 'true') {
              map['Com Seguro']++;
          } else {
              map['Sem Seguro']++;
          }
      });
      
      return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const proprietarioData = useMemo(() => {
      const map: Record<string, number> = {};
      filteredData.forEach(r => {
          const prop = r.Proprietario || 'Não Definido';
          map[prop] = (map[prop] || 0) + 1;
      });
      return Object.entries(map)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const finalidadeData = useMemo(() => {
      const map: Record<string, number> = {};
      filteredData.forEach(r => {
          const finalidade = ((r.FinalidadeUso ?? r.finalidadeUso ?? '') as any).toString().trim() || 'Não Definido';
          map[finalidade] = (map[finalidade] || 0) + 1;
      });
      return Object.entries(map)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const localizacaoHierarquica = useMemo(() => {
    const hierarquia: Record<string, Record<string, number>> = {};
    const totalByUF: Record<string, number> = {};

    filteredData.filter(r => r.UltimoEnderecoTelemetria).forEach(r => {
        const { uf, city } = extractLocation(r.UltimoEnderecoTelemetria);

        if (uf !== 'ND') {
            if (!hierarquia[uf]) hierarquia[uf] = {};
            hierarquia[uf][city] = (hierarquia[uf][city] || 0) + 1;
            totalByUF[uf] = (totalByUF[uf] || 0) + 1;
        }
    });

    const sortedUFs = Object.entries(totalByUF)
        .sort((a,b) => b[1] - a[1])
        .map(([uf, total]) => ({
            uf,
            total,
            cities: Object.entries(hierarquia[uf])
                .map(([name, value]) => ({ name, value }))
                .sort((a,b) => b.value - a.value)
        }));

    return sortedUFs;
  }, [filteredData]);

    const handleLocationClick = (uf: string, city: string | null) => {
        if (selectedLocation && selectedLocation.uf === uf && selectedLocation.city === city) {
             setSelectedLocation(null);
        } else if (city) {
             setSelectedLocation({ uf, city });
             setTimeout(() => {
                 const mapEl = document.querySelector('.leaflet-container');
                  if(mapEl) {
                      mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
             }, 100);
        }
    };

  // ANÁLISE DE PÁTIO
  const agingData = useMemo(() => {
      const ranges = { '0-30 dias': 0, '31-60 dias': 0, '61-90 dias': 0, '90+ dias': 0 };
      filteredData.filter(r => getCategory(r.Status) === 'Improdutiva').forEach(r => {
          const dias = parseNum(r.DiasNoStatus);
          if (dias <= 30) ranges['0-30 dias']++;
          else if (dias <= 60) ranges['31-60 dias']++;
          else if (dias <= 90) ranges['61-90 dias']++;
          else ranges['90+ dias']++;
      });
      return Object.entries(ranges).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const patioData = useMemo(() => {
      const map: Record<string, number> = {};
      filteredData.filter(r => getCategory(r.Status) === 'Improdutiva').forEach(r => {
          const patio = r.Patio || 'Não Definido';
          map[patio] = (map[patio] || 0) + 1;
      });
      return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10);
  }, [filteredData]);

  // stuckVehicles - disponível para uso futuro em tabela de veículos parados
  // const stuckVehicles = useMemo(() => {
  //     return filteredData
  //       .filter(r => getCategory(r.Status) === 'Improdutiva')
  //       .sort((a, b) => parseNum(b.DiasNoStatus) - parseNum(a.DiasNoStatus))
  //       .slice(0, 10);
  // }, [filteredData]);

  // CARRO RESERVA ANALYTICS
  const reservaUniqueOptions = useMemo(() => ({
    motivos: Array.from(new Set(carroReserva.map(r => r.Motivo).filter(Boolean))).sort(),
    clientes: Array.from(new Set(carroReserva.map(r => r.Cliente).filter(Boolean))).sort(),
    statuses: Array.from(new Set(carroReserva.map(r => r.StatusOcorrencia).filter(Boolean))).sort()
  }), [carroReserva]);

    const setReservaFilterValues = (key: string, values: string[]) => {
        // translate key names to use chart filter storage
        const mapKey = key === 'motivo' ? 'reserva_motivo' : key === 'cliente' ? 'reserva_cliente' : key === 'status' ? 'reserva_status' : 'reserva_search';
        setFilterValues(mapKey, values);
        setReservaPage(0);
    };

    const filteredReservas = useMemo(() => {
        const motivos = getFilterValues('reserva_motivo');
        const clientes = getFilterValues('reserva_cliente');
        const statuses = getFilterValues('reserva_status');
        const search = (getFilterValues('reserva_search') || [])[0] || '';
        return carroReserva.filter(r => {
            if (motivos.length > 0 && !motivos.includes(r.Motivo)) return false;
            if (clientes.length > 0 && !clientes.includes(r.Cliente)) return false;
            if (statuses.length > 0 && !statuses.includes(r.StatusOcorrencia)) return false;
            if (search) {
                const term = search.toLowerCase();
                if (!r.PlacaReserva?.toLowerCase().includes(term) && !r.Cliente?.toLowerCase().includes(term) && !r.IdOcorrencia?.toLowerCase().includes(term)) return false;
            }
            return true;
        });
    }, [carroReserva, filters, getFilterValues]);

  const reservaKPIs = useMemo(() => {
    const total = filteredReservas.length;
    const ativas = filteredReservas.filter(r => !['Finalizado', 'Cancelado', 'Concluída'].includes(r.StatusOcorrencia || '')).length;
    
    const motivoMap: Record<string, number> = {};
    filteredReservas.forEach(r => { const m = r.Motivo || 'Não Definido'; motivoMap[m] = (motivoMap[m] || 0) + 1; });
    const principalMotivo = Object.entries(motivoMap).sort((a,b) => b[1] - a[1])[0];
    
    const clienteMap: Record<string, number> = {};
    filteredReservas.forEach(r => { const c = r.Cliente || 'Não Definido'; clienteMap[c] = (clienteMap[c] || 0) + 1; });
    const clienteData = Object.entries(clienteMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    
    const motivoData = Object.entries(motivoMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    
    const statusMap: Record<string, number> = {};
    filteredReservas.forEach(r => { const s = r.StatusOcorrencia || 'Não Definido'; statusMap[s] = (statusMap[s] || 0) + 1; });
    const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    
    // Tempo médio de reserva
    const ativasComData = filteredReservas.filter(r => !['Finalizado', 'Cancelado', 'Concluída'].includes(r.StatusOcorrencia || '') && r.DataCriacao);
    const tempoMedio = ativasComData.length > 0 ? ativasComData.reduce((sum, r) => {
      const dias = (new Date().getTime() - new Date(r.DataCriacao).getTime()) / (1000 * 60 * 60 * 24);
      return sum + dias;
    }, 0) / ativasComData.length : 0;
    
    // Gráfico mês a mês
    const monthMap: Record<string, number> = {};
    filteredReservas.forEach(r => {
      if (r.DataCriacao) {
        const date = new Date(r.DataCriacao);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = (monthMap[key] || 0) + 1;
      }
    });
    const monthlyData = Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, value]) => {
        const [year, m] = month.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return { name: `${monthNames[parseInt(m) - 1]}/${year}`, value, fullKey: month };
      });
    
    return { total, ativas, principalMotivo: principalMotivo?.[0] || 'N/A', motivoData, clienteData, statusData, tempoMedio, monthlyData };
  }, [filteredReservas]);

    // Calcular min/max dates do histórico de reservas
    const reservaDateBounds = useMemo(() => {
        if (carroReserva.length === 0) return null;
        
        let minDate: Date | null = null;
        let maxDate: Date | null = null;
        
        carroReserva.forEach(r => {
            if (r.DataInicio) {
                const di = new Date(r.DataInicio);
                if (!minDate || di < minDate) minDate = di;
            }
            if (r.DataFim) {
                const df = new Date(r.DataFim);
                if (!maxDate || df > maxDate) maxDate = df;
            }
        });
        
        // Se não há DataFim, usar hoje como max
        if (!maxDate) maxDate = new Date();
        
        // Garantir que minDate existe
        if (!minDate) minDate = new Date(maxDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        
        minDate.setHours(0, 0, 0, 0);
        maxDate.setHours(23, 59, 59, 999);
        
        return { minDate, maxDate };
    }, [carroReserva]);
    
    // NOVO: Análise de Ocupação Simultânea Diária (controlado por slider)
    const ocupacaoSimultaneaData = useMemo(() => {
        if (!reservaDateBounds) return [];
        
        const { minDate, maxDate } = reservaDateBounds;
        const totalMs = maxDate.getTime() - minDate.getTime();
        
        // Calcular datas baseado no slider
        const dataInicio = new Date(minDate.getTime() + (totalMs * sliderRange.startPercent / 100));
        const dataFim = new Date(minDate.getTime() + (totalMs * sliderRange.endPercent / 100));
        dataInicio.setHours(0, 0, 0, 0);
        dataFim.setHours(23, 59, 59, 999);
        
        const datas: Date[] = [];
        const dataAtual = new Date(dataInicio);
        
        while (dataAtual <= dataFim) {
            datas.push(new Date(dataAtual));
            dataAtual.setDate(dataAtual.getDate() + 1);
        }
        
        // Para cada dia, contar quantos veículos estavam "na rua"
        const ocupacaoPorDia = datas.map(dia => {
            const diaTime = dia.getTime();
            
            // Contar veículos em uso neste dia específico
            const veiculosEmUso = carroReserva.filter(reserva => {
                if (!reserva.DataInicio) return false;
                
                const dataInicio = new Date(reserva.DataInicio);
                dataInicio.setHours(0, 0, 0, 0);
                const inicioTime = dataInicio.getTime();
                
                // Se DataFim é null/vazio, o veículo ainda está com o cliente
                const dataFim = reserva.DataFim ? new Date(reserva.DataFim) : null;
                if (dataFim) dataFim.setHours(23, 59, 59, 999);
                const fimTime = dataFim ? dataFim.getTime() : Date.now();
                
                // Veículo conta como "Em Uso" se: DataInicio <= dia E (DataFim >= dia OU DataFim é null)
                return inicioTime <= diaTime && fimTime >= diaTime;
            });
            
            return {
                date: dia.toISOString().split('T')[0],
                count: veiculosEmUso.length,
                displayDate: `${dia.getDate().toString().padStart(2, '0')}/${(dia.getMonth() + 1).toString().padStart(2, '0')}`
            };
        });
        
        return ocupacaoPorDia;
    }, [carroReserva, sliderRange, reservaDateBounds]);
    
    // Distribuição por modelo dos veículos de reserva - CORRIGIDO: usando ModeloReserva do fat_carro_reserva.json
    // Filtra automaticamente pelo período do slider
    const reservaModelData = useMemo(() => {
        if (!reservaDateBounds) return [];
        
        const { minDate, maxDate } = reservaDateBounds;
        const totalMs = maxDate.getTime() - minDate.getTime();
        const dataInicio = new Date(minDate.getTime() + (totalMs * sliderRange.startPercent / 100));
        const dataFim = new Date(minDate.getTime() + (totalMs * sliderRange.endPercent / 100));
        
        const map: Record<string, number> = {};
        
        // Filtrar pelo período do slider
        const dadosFiltrados = carroReserva.filter(r => {
            if (!r.DataInicio) return false;
            const di = new Date(r.DataInicio);
            const df = r.DataFim ? new Date(r.DataFim) : new Date();
            
            // Incluir se há sobreposição com o período selecionado
            return di <= dataFim && df >= dataInicio;
        });
        
        dadosFiltrados.forEach(r => { 
            const m = r.ModeloReserva || 'Não Definido'; 
            map[m] = (map[m] || 0) + 1; 
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [carroReserva, sliderRange, reservaDateBounds]);
    
    // KPIs de Eficiência de Ocupação
    const ocupacaoKPIs = useMemo(() => {
        if (ocupacaoSimultaneaData.length === 0) {
            return { picoUtilizacao: 0, mediaCarrosNaRua: 0 };
        }
        
        const valores = ocupacaoSimultaneaData.map(d => d.count);
        const picoUtilizacao = Math.max(...valores);
        const mediaCarrosNaRua = valores.reduce((sum, val) => sum + val, 0) / valores.length;
        
        return {
            picoUtilizacao,
            mediaCarrosNaRua: Math.round(mediaCarrosNaRua * 10) / 10 // 1 casa decimal
        };
    }, [ocupacaoSimultaneaData]);

  const reservaPageItems = filteredReservas.slice(reservaPage * pageSize, (reservaPage + 1) * pageSize);

  // TIMELINE & EFFICIENCY - componentes movidos para EfficiencyTab e TimelineTab

    const toggleProductivity = (opt: string) => {
        if (opt === 'Todos') {
            clearFilter('productivity');
        } else {
            handleChartClick('productivity', opt, { ctrlKey: true } as unknown as React.MouseEvent);
        }
        setPage(0);
    };

  const handleSort = (key: keyof FleetTableItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const tableData = useMemo((): FleetTableItem[] => {
    const data = filteredData.map(r => {
        const compra = parseCurrency(r.ValorCompra);
        const fipe = parseCurrency(r.ValorFipeAtual);
        const manut = manutencaoMap[r.Placa] || 0;
        const tco = compra + manut;
        return {
            Placa: r.Placa, Modelo: r.Modelo, Status: r.Status,
            NomeCliente: r.NomeCliente || 'N/A', TipoLocacao: r.TipoLocacao || 'N/A',
            IdadeVeiculo: parseNum(r.IdadeVeiculo),
            KmInformado: parseNum(r.KmInformado), KmConfirmado: parseNum(r.KmConfirmado),
            lat: parseNum(r.Latitude), lng: parseNum(r.Longitude),
            compra, fipe, manut, tco, depreciacao: compra - fipe,
            tipo: getCategory(r.Status),
            pctFipe: fipe > 0 ? (compra / fipe) * 100 : 0,
            Patio: r.Patio, DiasNoStatus: parseNum(r.DiasNoStatus),
            DataInicioStatus: r.DataInicioStatus,
            // Campos adicionais para telemetria
            ProvedorTelemetria: r.ProvedorTelemetria,
            UltimaAtualizacaoTelemetria: r.UltimaAtualizacaoTelemetria,
            UltimoEnderecoTelemetria: r.UltimoEnderecoTelemetria,
            ComSeguroVigente: r.ComSeguroVigente,
            Proprietario: r.Proprietario,
            FinalidadeUso: r.FinalidadeUso,
            NomeCondutor: r.NomeCondutor,
            CPFCondutor: r.CPFCondutor,
            TelefoneCondutor: r.TelefoneCondutor
        };
    });
    if (sortConfig !== null) {
      data.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [filteredData, manutencaoMap, sortConfig]);

    const pageItems = tableData.slice(page * pageSize, (page + 1) * pageSize);

    const patioItems = useMemo(() => {
        return tableData.filter(r => r.tipo === 'Improdutiva');
    }, [tableData]);

    const patioPageItems = patioItems.slice(patioPage * pageSize, (patioPage + 1) * pageSize);

  const exportToExcel = (data: any[], filename: string) => {
        try {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Dados');
            const outName = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, outName);
        } catch (err) {
            console.error('Erro exportando para Excel:', err);
        }
  };

  const SortIcon = ({ column }: { column: keyof FleetTableItem }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown size={14} className="ml-1 text-slate-400 inline" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-emerald-600 inline" /> : <ArrowDown size={14} className="ml-1 text-emerald-600 inline" />;
  };

    // Data for stacked percentage bar (Produtiva vs Improdutiva)
    const productivityStackData = useMemo(() => ([{
        label: 'Frota Ativa',
        Produtiva: Number(kpis.taxaProdutividade.toFixed(1)),
        Improdutiva: Number(kpis.taxaImprodutiva.toFixed(1)),
    }]), [kpis.taxaProdutividade, kpis.taxaImprodutiva]);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Gestão de Frota</Title><Text className="text-slate-500">Análise de ativos, produtividade e localização.</Text></div>
        <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full flex gap-2 font-medium"><Car className="w-4 h-4"/> Hub Ativos</div>
      </div>

    <FloatingClearButton onClick={clearAllFilters} show={hasActiveFilters} />
    <ChartFilterBadges filters={filters} onClearFilter={clearFilter} onClearAll={clearAllFilters} />

    <Card className="bg-white shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-slate-500"/><Text className="font-medium text-slate-700">Filtros</Text></div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => toggleProductivity('Todos')} className={`px-4 py-1 text-xs font-medium rounded-md transition-all ${getFilterValues('productivity').length === 0 ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Todos</button>
                <button onClick={() => toggleProductivity('Ativa')} className={`px-4 py-1 text-xs font-medium rounded-md transition-all ${getFilterValues('productivity').includes('Ativa') ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Ativa</button>
                <button onClick={() => toggleProductivity('Produtiva')} className={`px-4 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${getFilterValues('productivity').includes('Produtiva') ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}><CheckCircle2 size={12}/> Produtiva</button>
                <button onClick={() => toggleProductivity('Improdutiva')} className={`px-4 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${getFilterValues('productivity').includes('Improdutiva') ? 'bg-white shadow text-rose-600' : 'text-slate-500'}`}><XCircle size={12}/> Improdutiva</button>
                <button onClick={() => toggleProductivity('Inativa')} className={`px-4 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${getFilterValues('productivity').includes('Inativa') ? 'bg-white shadow text-slate-600' : 'text-slate-500'}`}><Archive size={12}/> Inativa</button>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <MultiSelect label="Status" options={uniqueOptions.status} selected={getFilterValues('status')} onChange={(v) => setFilterValues('status', v)} />
            <MultiSelect label="Modelo" options={uniqueOptions.modelos} selected={getFilterValues('modelo')} onChange={(v) => setFilterValues('modelo', v)} />
            <MultiSelect label="Filial" options={uniqueOptions.filiais} selected={getFilterValues('filial')} onChange={(v) => setFilterValues('filial', v)} />
            <MultiSelect label="Cliente" options={uniqueOptions.clientes} selected={getFilterValues('cliente')} onChange={(v) => setFilterValues('cliente', v)} />
            <MultiSelect label="Tipo Contrato" options={uniqueOptions.tiposLocacao} selected={getFilterValues('tipoLocacao')} onChange={(v) => setFilterValues('tipoLocacao', v)} />
            <div>
                <Text className="text-xs text-slate-500 mb-1">Busca (Placa)</Text>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400"/>
                    <input type="text" className="border p-2 pl-8 rounded text-sm w-full h-10" placeholder="Placa ou Modelo" value={(getFilterValues('search') || [])[0] || ''} onChange={e => setFilterValues('search', [e.target.value])}/>
                </div>
            </div>
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
            {/* ChartFilterBadges shows active filters */}
        </div>
      </Card>

      <Tabs defaultValue="visao-geral" className="space-y-6">
        <TabsList className="bg-white border">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="patio">Gestão de Pátio</TabsTrigger>
          <TabsTrigger value="telemetria">Telemetria & Mapa</TabsTrigger>
          <TabsTrigger value="eficiencia">Eficiência</TabsTrigger>
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="carro-reserva">Carro Reserva</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-6">
          {/* KPIs Principais */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card decoration="top" decorationColor="blue"><Text>Total Frota</Text><Metric>{fmtDecimal(kpis.total)}</Metric></Card>
            <Card decoration="top" decorationColor="emerald"><Text>Produtiva</Text><Metric>{fmtDecimal(kpis.produtivaQtd)}</Metric><Text className="text-xs text-emerald-600">{kpis.taxaProdutividade.toFixed(1)}%</Text></Card>
            <Card decoration="top" decorationColor="rose"><Text>Improdutiva</Text><Metric>{fmtDecimal(kpis.improdutivaQtd)}</Metric><Text className="text-xs text-rose-600">{kpis.taxaImprodutiva.toFixed(1)}%</Text></Card>
            <Card decoration="top" decorationColor="slate"><Text>Inativa</Text><Metric>{fmtDecimal(kpis.inativaQtd)}</Metric></Card>
            <Card decoration="top" decorationColor="violet"><Text>Idade Média</Text><Metric>{kpis.idadeMedia.toFixed(1)} m</Metric></Card>
          </div>
          
                    {/* KPIs executivos movidos para a visão executiva (removidos desta página) */}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-l-4 border-l-emerald-500"><div className="flex justify-between items-center mb-4"><Title className="text-emerald-700">Frota Produtiva</Title><span className="text-emerald-800 font-bold bg-emerald-100 px-2 py-1 rounded text-xs">{kpis.produtivaQtd} veículos</span></div><div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-slate-500">Valor Compra:</span><span className="font-bold">{fmtCompact(kpis.compraProd)}</span></div><div className="flex justify-between text-sm"><span className="text-slate-500">Valor FIPE:</span><span className="font-bold">{fmtCompact(kpis.fipeProd)}</span></div><div className="flex justify-between text-sm border-t pt-1"><span className="text-slate-500">% FIPE:</span><span className={`font-bold ${kpis.pctFipeProd <= 100 ? 'text-emerald-600' : 'text-red-600'}`}>{kpis.pctFipeProd.toFixed(1)}%</span></div></div></Card>
            <Card className="border-l-4 border-l-rose-500"><div className="flex justify-between items-center mb-4"><Title className="text-rose-700">Frota Improdutiva</Title><span className="text-rose-800 font-bold bg-rose-100 px-2 py-1 rounded text-xs">{kpis.improdutivaQtd} veículos</span></div><div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-slate-500">Valor Compra:</span><span className="font-bold">{fmtCompact(kpis.compraImprod)}</span></div><div className="flex justify-between text-sm"><span className="text-slate-500">Valor FIPE:</span><span className="font-bold">{fmtCompact(kpis.fipeImprod)}</span></div><div className="flex justify-between text-sm border-t pt-1"><span className="text-slate-500">% FIPE:</span><span className={`font-bold ${kpis.pctFipeImprod <= 100 ? 'text-emerald-600' : 'text-red-600'}`}>{kpis.pctFipeImprod.toFixed(1)}%</span></div></div></Card>
          </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <Title>Status da Frota <span className="text-xs text-slate-500 font-normal">(clique para filtrar | Ctrl+clique para múltiplos)</span></Title>
                            <div className="h-96 mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[...statusData].sort((a,b) => b.value - a.value)} layout="vertical" margin={{ left: 0, right: 80 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis type="number" tick={{ fontSize: 12 }} />
                                        <YAxis dataKey="name" type="category" width={220} tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={(value: any) => [`${value}`, 'Veículos']} />
                                        <Bar dataKey="value" barSize={20} radius={[6,6,6,6]} onClick={(data: any, _index: number, event: any) => { handleChartClick('status', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                            {statusData.map((entry, idx) => (
                                                <Cell key={`cell-st-${idx}`} fill={isValueSelected('status', entry.name) ? '#063970' : entry.color} />
                                            ))}
                                            <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                                                <Card>
                                                    <Title>Taxa de Produtividade (Frota Ativa)</Title>
                                                    <div className="mt-6 space-y-4">
                                                        <div className="flex justify-between text-sm font-medium">
                                                            <span className="text-rose-600">Improdutiva ({kpis.taxaImprodutiva.toFixed(1)}%) <span className="text-slate-500"></span></span>
                                                            <span className="text-emerald-700">Produtiva ({kpis.taxaProdutividade.toFixed(1)}%)</span>
                                                        </div>


                                                        {/* Stacked percentage bar for Produtiva vs Improdutiva */}
                                                        <div className="h-20">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <BarChart data={productivityStackData} layout="vertical" margin={{ left: 0, right: 8 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                                                    <XAxis type="number" domain={[0, 100]} hide />
                                                                    <YAxis dataKey="label" type="category" width={0} hide />
                                                                    <Tooltip formatter={(value: any, name: any) => [`${value}%`, name]} />
                                                                    <Bar dataKey="Improdutiva" stackId="a" radius={[6,0,0,6]} barSize={32} fill="#94a3b8" />
                                                                    <Bar dataKey="Produtiva" stackId="a" radius={[0,6,6,0]} barSize={32} fill="#3b82f6" />
                                                                </BarChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                        <Text className="text-xs text-slate-500 text-center">Considera apenas veículos ativos na frota.</Text>

                                                        <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div>
                                                                <Title className="text-sm">Desdobramento Improdutiva <span className="text-xs text-slate-400 font-normal">(Ctrl+clique: múltiplo)</span></Title>
                                                                <div className="h-64 mt-2">
                                                                    <ResponsiveContainer width="100%" height="100%">
                                                                        <BarChart data={improdutivaBreakdown} layout="vertical" margin={{ left: 0, right: 80 }}>
                                                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                                                            <XAxis type="number" hide />
                                                                            <YAxis dataKey="name" type="category" width={200} tick={{fontSize:12}} />
                                                                            <Tooltip formatter={(value: any, _name: any, props: any) => {
                                                                                const pct = props?.payload?.pct;
                                                                                return [`${value} (${pct ? pct.toFixed(1) + '%' : ''})`, 'Veículos'];
                                                                            }} />
                                                                            <Bar dataKey="value" radius={[6,6,6,6]} barSize={20} fill="#64748b" onClick={(data: any, _index: number, event: any) => { handleChartClick('status', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                                                                <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} />
                                                                            </Bar>
                                                                        </BarChart>
                                                                    </ResponsiveContainer>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <Title className="text-sm">Desdobramento Produtiva <span className="text-xs text-slate-400 font-normal">(Ctrl+clique: múltiplo)</span></Title>
                                                                <div className="h-64 mt-2">
                                                                    <ResponsiveContainer width="100%" height="100%">
                                                                        <BarChart data={produtivaBreakdown} layout="vertical" margin={{ left: 0, right: 80 }}>
                                                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                                                            <XAxis type="number" hide />
                                                                            <YAxis dataKey="name" type="category" width={200} tick={{fontSize:12}} />
                                                                            <Tooltip formatter={(value: any, _name: any, props: any) => {
                                                                                const pct = props?.payload?.pct;
                                                                                return [`${value} (${pct ? pct.toFixed(1) + '%' : ''})`, 'Veículos'];
                                                                            }} />
                                                                            <Bar dataKey="value" radius={[6,6,6,6]} barSize={20} fill="#f59e0b" onClick={(data: any, _index: number, event: any) => { handleChartClick('status', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                                                                <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} />
                                                                            </Bar>
                                                                        </BarChart>
                                                                    </ResponsiveContainer>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                    </div>

                    {/* Veículos por Modelo e Classificação de Odômetro */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <Title>Veículos por Modelo <span className="text-xs text-slate-500 font-normal">(clique na categoria para expandir)</span></Title>
                                    <Text className="text-xs text-slate-500">Agrupados por categoria de veículo</Text>
                                </div>
                                <button 
                                    onClick={() => setExpandedCategories(prev => 
                                        prev.length === modelosPorCategoria.length 
                                            ? [] 
                                            : modelosPorCategoria.map(c => c.categoria)
                                    )}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                                >
                                    {expandedCategories.length === modelosPorCategoria.length ? '− Colapsar Todas' : '+ Expandir Todas'}
                                </button>
                            </div>
                            <div className="h-[400px] mt-1 overflow-y-auto pr-2">
                                <ResponsiveContainer width="100%" height={Math.max(300, modelosHierarchicalData.length * 28)}>
                                    <BarChart data={modelosHierarchicalData} layout="vertical" margin={{ left: 0, right: 80, top: 6 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={240} tick={{fontSize:10}} />
                                        <Tooltip formatter={(value: any) => [String(value), 'Veículos']} />
                                        <Bar dataKey="value" radius={[6,6,6,6]} barSize={16}
                                             onClick={(data: any, _index: number, event: any) => {
                                                 if (data.isCategory) {
                                                     // Se for categoria, expande/colapsa
                                                     toggleCategory(data.categoria);
                                                 } else {
                                                     // Se for modelo, aplica filtro
                                                     const modeloName = data.name.replace('  └─ ', '').trim();
                                                     handleChartClick('modelo', modeloName, event as unknown as React.MouseEvent);
                                                     if (!((event?.ctrlKey) || (event?.metaKey))) {
                                                         document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' });
                                                     }
                                                 }
                                             }}
                                             cursor="pointer">
                                            {modelosHierarchicalData.map((entry, idx) => (
                                                <Cell 
                                                    key={`cell-modelo-${idx}`} 
                                                    fill={entry.isCategory ? '#7c3aed' : '#a78bfa'}
                                                />
                                            ))}
                                            <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} fontSize={10} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                        
                        <Card>
                            <div className="flex justify-between items-center mb-6">
                                <Title>Classificação por Odômetro</Title>
                            </div>
                            <Text className="text-xs text-slate-500 mb-3">Distribuição de veículos por faixa de quilometragem informada</Text>
                            <div className="h-[400px] mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={odometroData} margin={{ left: 20, right: 60, bottom: 36, top: 6 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={64} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={(value: any) => [`${value} veículos`, 'Quantidade']} />
                                        <Bar dataKey="value" radius={[6,6,0,0]} barSize={32} fill="#06b6d4">
                                            <LabelList dataKey="value" position="top" formatter={(v: any) => v > 0 ? String(v) : ''} fontSize={11} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

          <Card id="detail-table" className="p-0 overflow-hidden mt-4">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center"><div className="flex items-center gap-2"><Title>Detalhamento da Frota</Title><span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">{fmtDecimal(tableData.length)} registros</span></div><button onClick={() => exportToExcel(tableData, 'frota_detalhada')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 transition-colors border px-3 py-1 rounded"><FileSpreadsheet size={16}/> Exportar</button></div>
              <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-600 uppercase text-xs"><tr>
                  <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('Placa')}>Placa <SortIcon column="Placa"/></th>
                  <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('Modelo')}>Modelo <SortIcon column="Modelo"/></th>
                  <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('NomeCliente')}>Cliente <SortIcon column="NomeCliente"/></th>
                  <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('TipoLocacao')}>Contrato <SortIcon column="TipoLocacao"/></th>
                  <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('Status')}>Status <SortIcon column="Status"/></th>
                  <th className="px-6 py-3 text-center cursor-pointer" onClick={() => handleSort('tipo')}>Tipo <SortIcon column="tipo"/></th>
                  <th className="px-6 py-3 text-right cursor-pointer" onClick={() => handleSort('compra')}>Compra <SortIcon column="compra"/></th>
                  <th className="px-6 py-3 text-right cursor-pointer" onClick={() => handleSort('fipe')}>FIPE <SortIcon column="fipe"/></th>
                  <th className="px-6 py-3 text-right cursor-pointer" onClick={() => handleSort('KmInformado')}>Odômetro (Info) <SortIcon column="KmInformado"/></th>
                  <th className="px-6 py-3 text-right cursor-pointer" onClick={() => handleSort('KmConfirmado')}>Odômetro (Conf) <SortIcon column="KmConfirmado"/></th>
                  <th className="px-6 py-3 text-center cursor-pointer" onClick={() => handleSort('pctFipe')}>% FIPE <SortIcon column="pctFipe"/></th>
                  <th className="px-6 py-3 text-center cursor-pointer" onClick={() => handleSort('IdadeVeiculo')}>Idade <SortIcon column="IdadeVeiculo"/></th>
              </tr></thead><tbody className="divide-y divide-slate-100">{pageItems.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium font-mono">{r.Placa}</td>
                      <td className="px-6 py-3">{r.Modelo}</td>
                      <td className="px-6 py-3 text-xs max-w-[150px] truncate" title={r.NomeCliente}>{r.NomeCliente}</td>
                      <td className="px-6 py-3 text-xs">{r.TipoLocacao}</td>
                      <td className="px-6 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${r.tipo === 'Produtiva' ? 'bg-emerald-100 text-emerald-700' : r.tipo === 'Improdutiva' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>{r.Status}</span></td>
                      <td className="px-6 py-3 text-center font-bold text-xs">{r.tipo}</td>
                      <td className="px-6 py-3 text-right">{fmtBRL(r.compra)}</td>
                      <td className="px-6 py-3 text-right">{fmtBRL(r.fipe)}</td>
                      <td className="px-6 py-3 text-right">{r.KmInformado ? Number(r.KmInformado).toLocaleString('pt-BR') : '-'}</td>
                      <td className="px-6 py-3 text-right">{r.KmConfirmado ? Number(r.KmConfirmado).toLocaleString('pt-BR') : '-'}</td>
                      <td className="px-6 py-3 text-center font-bold text-slate-600">{r.pctFipe.toFixed(1)}%</td>
                      <td className="px-6 py-3 text-center">{parseNum(r.IdadeVeiculo)} m</td>
                  </tr>))}</tbody></table></div>
              <div className="flex justify-between p-4 border-t border-slate-100"><div className="flex gap-2"><button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">←</button><button onClick={() => setPage(page + 1)} disabled={(page + 1) * pageSize >= tableData.length} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">→</button></div></div>
          </Card>
        </TabsContent>

        <TabsContent value="patio" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                <Card>
                    <div className="flex items-center gap-2 mb-4"><Timer size={16} className="text-amber-600"/><Title>Aging de Pátio (Dias Parado)</Title></div>
                    <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={agingData} margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="name" fontSize={12}/>
                                <YAxis fontSize={12}/>
                                <Tooltip/>
                                <Bar dataKey="value" fill="#f59e0b" radius={[4,4,0,0]} barSize={40}
                                     onClick={(data: any, _index: number, event: any) => { handleChartClick('aging', data.name, event as unknown as React.MouseEvent); }}
                                     cursor="pointer">
                                    <LabelList dataKey="value" position="top" fontSize={12} fill="#666"/>
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-2 mb-4"><Warehouse size={16} className="text-blue-600"/><Title>Veículos por Pátio (Improdutivos)</Title></div>
                    <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={patioData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                                <XAxis type="number" fontSize={12}/>
                                <YAxis dataKey="name" type="category" width={100} fontSize={10}/>
                                <Tooltip/>
                                <Bar dataKey="value" fill="#3b82f6" radius={[0,4,4,0]} barSize={20}
                                     onClick={(data: any, _index: number, event: any) => { handleChartClick('patio', data.name, event as unknown as React.MouseEvent); }}
                                     cursor="pointer">
                                    <LabelList dataKey="value" position="right" fontSize={10} fill="#666"/>
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
            
            {/* Card de Movimentações Recentes */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Timer size={16} className="text-indigo-600"/>
                        <Title>Movimentações Recentes de Pátio (Últimas 20)</Title>
                    </div>
                    <a 
                        href="/analytics/frota-improdutiva" 
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                        Ver monitoramento completo →
                    </a>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase">
                            <tr>
                                <th className="px-4 py-2 text-left">Data/Hora</th>
                                <th className="px-4 py-2 text-left">Placa</th>
                                <th className="px-4 py-2 text-left">Pátio</th>
                                <th className="px-4 py-2 text-left">Usuário</th>
                                <th className="px-4 py-2 text-left">Comentários</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {patioMov
                                .filter((m: any) => m.DataMovimentacao)
                                .sort((a: any, b: any) => new Date(b.DataMovimentacao).getTime() - new Date(a.DataMovimentacao).getTime())
                                .slice(0, 20)
                                .map((mov: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 text-slate-600">
                                            {new Date(mov.DataMovimentacao).toLocaleString('pt-BR', { 
                                                day: '2-digit', 
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </td>
                                        <td className="px-4 py-2 font-mono font-medium">{mov.Placa}</td>
                                        <td className="px-4 py-2">
                                            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                                                {mov.Patio || 'Sem pátio'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-slate-600">{mov.UsuarioMovimentacao || '-'}</td>
                                        <td className="px-4 py-2 text-slate-500 text-xs max-w-xs truncate">
                                            {mov.Comentarios || '-'}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            
            <Card className="p-0 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Title>Veículos no Pátio</Title>
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">{fmtDecimal(tableData.filter(r => r.tipo === 'Improdutiva').length)} registros</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => exportToExcel(tableData.filter(r => r.tipo === 'Improdutiva'), 'veiculos_patio')}
                                className="flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 transition-colors border px-3 py-1 rounded">
                            <FileSpreadsheet size={16}/> Exportar
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('Placa')}>Placa <SortIcon column="Placa"/></th>
                                <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('Modelo')}>Modelo <SortIcon column="Modelo"/></th>
                                <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('Patio')}>Pátio <SortIcon column="Patio"/></th>
                                <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('Status')}>Status <SortIcon column="Status"/></th>
                                <th className="px-6 py-3">Data Início Status</th>
                                <th className="px-6 py-3 text-right cursor-pointer" onClick={() => handleSort('DiasNoStatus')}>Dias Parado <SortIcon column="DiasNoStatus"/></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {patioPageItems.map((v, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-medium font-mono">{v.Placa}</td>
                                    <td className="px-6 py-3">{v.Modelo}</td>
                                    <td className="px-6 py-3">{v.Patio}</td>
                                    <td className="px-6 py-3"><span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">{v.Status}</span></td>
                                    <td className="px-6 py-3 text-slate-500">{v.DataInicioStatus ? new Date(v.DataInicioStatus + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                                    <td className="px-6 py-3 text-right font-bold text-rose-600">{v.DiasNoStatus} dias</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-between p-4 border-t border-slate-100">
                    <div className="flex gap-2">
                        <button onClick={() => setPatioPage(Math.max(0, patioPage - 1))} disabled={patioPage === 0} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">←</button>
                        <button onClick={() => setPatioPage(patioPage + 1)} disabled={(patioPage + 1) * pageSize >= patioItems.length} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">→</button>
                    </div>
                    <div className="text-xs text-slate-500">{fmtDecimal(patioItems.length)} registros</div>
                </div>
            </Card>
        </TabsContent>

        <TabsContent value="telemetria" className="space-y-6">
            {/* KPIs de Telemetria */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card decoration="top" decorationColor="blue">
                    <Text>Veículos com Telemetria</Text>
                    <Metric>{fmtDecimal(veiculosComTelemetria.length)}</Metric>
                    <Text className="text-xs text-slate-500 mt-1">{((veiculosComTelemetria.length / filteredData.length) * 100).toFixed(1)}% da frota</Text>
                </Card>
                <Card decoration="top" decorationColor="emerald">
                    <Text>Atualizado (Últimas 24h)</Text>
                    <Metric>{fmtDecimal(telemetriaAtualizada)}</Metric>
                    <Text className="text-xs text-slate-500 mt-1">Telemetria ativa</Text>
                </Card>
                <Card decoration="top" decorationColor="amber">
                    <Text>Veículos Localizáveis</Text>
                    <Metric>{fmtDecimal(mapData.length)}</Metric>
                    <Text className="text-xs text-slate-500 mt-1">Com coordenadas GPS</Text>
                </Card>
                <Card decoration="top" decorationColor="violet">
                    <Text>Taxa de Cobertura GPS</Text>
                    <Metric>{((mapData.length / filteredData.length) * 100).toFixed(1)}%</Metric>
                    <Text className="text-xs text-slate-500 mt-1">Lat/Long disponível</Text>
                </Card>
            </div>

            {/* Gráficos de Análise */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                    <Title>Provedores de Telemetria</Title>
                    <div className="h-72 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={telemetriaData} layout="vertical" margin={{ left: 0, right: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} tick={{fontSize:11}} />
                                <Tooltip formatter={(value: any) => [`${value}`, 'Veículos']} />
                                <Bar dataKey="value" radius={[6,6,6,6]} barSize={20} fill="#3b82f6">
                                    <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} fontSize={10} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                
                <Card>
                    <Title>Situação de Seguro</Title>
                    <div className="h-72 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={seguroData} margin={{ left: 0, right: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: any) => [`${value}`, 'Veículos']} />
                                <Bar dataKey="value" radius={[6,6,0,0]} barSize={40}>
                                    {seguroData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={
                                            entry.name === 'Com Seguro' ? '#10b981' : 
                                            entry.name === 'Sem Seguro' ? '#ef4444' : '#94a3b8'
                                        } />
                                    ))}
                                    <LabelList dataKey="value" position="top" fontSize={11} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card>
                    <Title>Diferença de Odômetro (Info vs Conf)</Title>
                    <div className="h-72 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={kmDifferenceData} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                                <XAxis type="number" fontSize={10} />
                                <YAxis dataKey="name" type="category" width={120} fontSize={10} tick={{fill: '#475569'}}/>
                                <Tooltip />
                                <Bar dataKey="value" fill="#0891b2" radius={[0,4,4,0]} barSize={20}>
                                    <LabelList dataKey="value" position="right" fontSize={10} fill="#64748b" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Gráficos Adicionais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <Title>Proprietário do Veículo</Title>
                    <div className="h-80 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={proprietarioData} margin={{ left: 0, right: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: any) => [`${value}`, 'Veículos']} />
                                <Bar dataKey="value" fill="#8b5cf6" radius={[6,6,0,0]} barSize={32}>
                                    <LabelList dataKey="value" position="top" fontSize={11} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card>
                    <Title>Finalidade de Uso</Title>
                    <div className="h-80 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={finalidadeData} margin={{ left: 0, right: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: any) => [`${value}`, 'Veículos']} />
                                <Bar dataKey="value" fill="#06b6d4" radius={[6,6,0,0]} barSize={32}>
                                    <LabelList dataKey="value" position="top" fontSize={11} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Gráficos de Localização (Telemetria) - Hierárquico */}
            <div className="grid grid-cols-1 gap-6">
                <Card className="p-0 overflow-hidden">
                    <div className="p-4 border-b border-slate-200">
                        <Title>Distribuição Geográfica de Veículos (Por Estado)</Title>
                        <Text className="text-xs text-slate-500">Expanda o estado para visualizar as cidades</Text>
                    </div>
                    <div className="p-4">
                        <Accordion type="single" collapsible className="w-full">
                            {localizacaoHierarquica.map((item) => (
                                <AccordionItem key={item.uf} value={item.uf} className="border-b border-slate-100 last:border-0">
                                    <AccordionTrigger className="hover:no-underline py-3 px-2 hover:bg-slate-50 rounded-lg group">
                                        <div className="flex w-full items-center justify-between pr-4">
                                            <div className="flex items-center gap-3">
                                                <Badge size="lg" className="w-12 justify-center font-bold bg-slate-800">{item.uf}</Badge>
                                                <span className="text-sm font-medium text-slate-700">{item.cities.length} Cidades</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-900">{fmtDecimal(item.total)} veículos</span>
                                                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden ml-2">
                                                    <div 
                                                        className="h-full bg-blue-600 rounded-full" 
                                                        style={{ width: `${Math.min(100, (item.total / mapData.length) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4 pt-2">
                                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                            <Title className="text-sm mb-3 text-slate-600">Veículos por Município em {item.uf}</Title>
                                            <div className="mt-2 space-y-1">
                                                {item.cities.map((city) => (
                                                    <div 
                                                        key={city.name}
                                                        className={`flex items-center justify-between text-sm p-2 rounded cursor-pointer transition-colors ${selectedLocation?.city === city.name && selectedLocation?.uf === item.uf ? 'bg-indigo-100 ring-1 ring-indigo-500' : 'hover:bg-indigo-50'}`}
                                                        onClick={() => handleLocationClick(item.uf, city.name)}
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                             <div className={`h-2 w-2 rounded-full ${selectedLocation?.city === city.name && selectedLocation?.uf === item.uf ? 'bg-indigo-600' : 'bg-indigo-300'}`} />
                                                             <span className="truncate text-slate-700 font-medium">{city.name}</span>
                                                        </div>
                                                        <span className="text-slate-500">{city.value} veículos</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                        {localizacaoHierarquica.length === 0 && (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                Nenhuma informação de localização disponível nos filtros atuais.
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Mapa */}
            <Card className="p-0 overflow-hidden relative">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2 absolute top-0 left-0 bg-white/90 z-10 w-full rounded-t-lg">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <Title>Localização</Title> 
                            {selectedLocation && <Badge color="indigo">{selectedLocation.city}/{selectedLocation.uf}</Badge>}
                        </div>
                    </div>
                    <Badge className="ml-2">{mapData.length} veículos</Badge>
                    {selectedLocation && (
                        <button 
                            onClick={() => setSelectedLocation(null)}
                            className="ml-2 px-2 py-1 text-xs bg-rose-50 text-rose-600 rounded border border-rose-100 hover:bg-rose-100"
                        >
                            Limpar
                        </button>
                    )}
                </div>
                <div className="h-[500px] w-full mt-14">
                    <MapContainer center={[-15.7942, -47.8822]} zoom={4} style={{ height: '100%', width: '100%' }}>
                        <TileLayer 
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                            attribution='&copy; OpenStreetMap' 
                        />
                        {mapData.slice(0, 500).map((v, idx) => (
                            <Marker key={idx} position={[v._lat, v._lng]}>
                                <Popup>
                                    <div className="text-sm">
                                        <p className="font-bold">{v.Placa}</p>
                                        <p>{v.Modelo}</p>
                                        <p className="text-xs text-slate-600 font-medium">{v.NomeCliente}</p>
                                        <p className="text-xs text-slate-500">{v.Status}</p>
                                        {v.UltimoEnderecoTelemetria && (
                                            <p className="text-xs text-blue-600 mt-1">{v.UltimoEnderecoTelemetria}</p>
                                        )}
                                        {v.UltimaAtualizacaoTelemetria && (
                                            <p className="text-xs text-slate-400 mt-1">
                                                Atualizado: {new Date(v.UltimaAtualizacaoTelemetria).toLocaleString('pt-BR')}
                                            </p>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </Card>

            {/* Tabela Detalhada de Telemetria */}
            <Card className="p-0 overflow-hidden" id="telemetria-table">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-blue-600" />
                        <Title>Detalhamento: Telemetria e Rastreamento</Title>
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">
                            {fmtDecimal(filteredData.length)} veículos
                        </span>
                    </div>
                    <button 
                        onClick={() => {
                            const detailData = filteredData.map(r => ({
                                Placa: r.Placa,
                                Modelo: r.Modelo,
                                Status: r.Status,
                                'Provedor Telemetria': r.ProvedorTelemetria || 'N/A',
                                'Última Atualização': r.UltimaAtualizacaoTelemetria || 'N/A',
                                Latitude: r.Latitude || 0,
                                Longitude: r.Longitude || 0,
                                'Último Endereço': r.UltimoEnderecoTelemetria || 'N/A',
                                'Com Seguro': r.ComSeguroVigente ? 'Sim' : 'Não',
                                Proprietário: r.Proprietario || 'N/A',
                                'Finalidade': r.FinalidadeUso || 'N/A',
                                'KM Informado': r.KmInformado || 0,
                                'KM Confirmado': r.KmConfirmado || 0,
                                'Condutor': r.NomeCondutor || 'N/A',
                                'CPF Condutor': r.CPFCondutor || 'N/A',
                                'Telefone Condutor': r.TelefoneCondutor || 'N/A'
                            }));
                            exportToExcel(detailData, 'frota_telemetria_detalhado');
                        }}
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 transition-colors border px-3 py-1 rounded"
                    >
                        <FileSpreadsheet size={16}/> Exportar
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">Placa</th>
                                <th className="px-4 py-3">Modelo</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Provedor Telemetria</th>
                                <th className="px-4 py-3">Última Atualização</th>
                                <th className="px-4 py-3 text-center">GPS</th>
                                <th className="px-4 py-3">Último Endereço</th>
                                <th className="px-4 py-3 text-center">Seguro</th>
                                <th className="px-4 py-3">Proprietário</th>
                                <th className="px-4 py-3">Condutor</th>
                                <th className="px-4 py-3 text-right">KM Info</th>
                                <th className="px-4 py-3 text-right">KM Conf</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pageItems.map((r, i) => {
                                const temTelemetria = r.ProvedorTelemetria && 
                                    r.ProvedorTelemetria !== 'NÃO DEFINIDO' && 
                                    r.ProvedorTelemetria !== 'Não Definido';
                                const temGPS = r.lat && r.lng && r.lat !== 0 && r.lng !== 0;
                                const atualizadoRecente = r.UltimaAtualizacaoTelemetria ? 
                                    (new Date().getTime() - new Date(r.UltimaAtualizacaoTelemetria).getTime()) < (24 * 60 * 60 * 1000) : 
                                    false;
                                const temSeguro = r.ComSeguroVigente === 1 || r.ComSeguroVigente === true || r.ComSeguroVigente === 'true';
                                
                                return (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium font-mono text-blue-600">{r.Placa}</td>
                                        <td className="px-4 py-3 text-slate-700">{r.Modelo}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                r.tipo === 'Produtiva' ? 'bg-emerald-100 text-emerald-700' : 
                                                r.tipo === 'Improdutiva' ? 'bg-rose-100 text-rose-700' : 
                                                'bg-slate-200 text-slate-600'
                                            }`}>
                                                {r.Status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {temTelemetria ? (
                                                <span className="flex items-center gap-1">
                                                    <span className={`w-2 h-2 rounded-full ${atualizadoRecente ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                                    <span className="text-slate-700">{r.ProvedorTelemetria}</span>
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-xs">Sem telemetria</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">
                                            {r.UltimaAtualizacaoTelemetria ? (
                                                <span className={atualizadoRecente ? 'text-green-600 font-medium' : ''}>
                                                    {new Date(r.UltimaAtualizacaoTelemetria).toLocaleString('pt-BR', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {temGPS ? (
                                                <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                                                    <MapPin size={14} />
                                                    Sim
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-xs">Não</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs max-w-xs truncate" title={r.UltimoEnderecoTelemetria || 'N/A'}>
                                            {r.UltimoEnderecoTelemetria ? (
                                                <span className="text-blue-600">{r.UltimoEnderecoTelemetria}</span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {temSeguro ? (
                                                <CheckCircle2 size={16} className="inline text-green-600" />
                                            ) : (
                                                <XCircle size={16} className="inline text-rose-400" />
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 text-xs">{r.Proprietario || 'N/A'}</td>
                                        <td className="px-4 py-3 text-slate-600 text-xs">{r.NomeCondutor || '-'}</td>
                                        <td className="px-4 py-3 text-right text-slate-700">
                                            {r.KmInformado ? fmtDecimal(r.KmInformado) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700">
                                            {r.KmConfirmado ? fmtDecimal(r.KmConfirmado) : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-between items-center p-4 border-t border-slate-100">
                    <div className="text-sm text-slate-500">
                        Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, tableData.length)} de {fmtDecimal(tableData.length)} veículos
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setPage(Math.max(0, page - 1))} 
                            disabled={page === 0} 
                            className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50 hover:bg-slate-200 transition-colors"
                        >
                            ← Anterior
                        </button>
                        <span className="px-3 py-1 text-sm text-slate-600">
                            Página {page + 1} de {Math.ceil(tableData.length / pageSize)}
                        </span>
                        <button 
                            onClick={() => setPage(page + 1)} 
                            disabled={(page + 1) * pageSize >= tableData.length} 
                            className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50 hover:bg-slate-200 transition-colors"
                        >
                            Próxima →
                        </button>
                    </div>
                </div>
            </Card>
        </TabsContent>

        <TabsContent value="eficiencia">
            <EfficiencyTab timeline={timeline} filteredData={filteredData} frota={frota} />
        </TabsContent>

        <TabsContent value="timeline">
            <TimelineTab timeline={timeline} filteredData={filteredData} frota={frotaEnriched} manutencao={manutencao} contratosLocacao={contratosLocacao} />
        </TabsContent>

        <TabsContent value="carro-reserva" className="space-y-6">
            {carroReserva.length === 0 && (
                <Card>
                    <div className="p-8 text-center">
                        <Info className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                        <Title>Sem Dados de Carro Reserva</Title>
                        <Text className="mt-2 text-slate-500">Nenhuma ocorrência de carro reserva foi encontrada. Verifique se o arquivo `fat_carro_reserva.json` está disponível.</Text>
                    </div>
                </Card>
            )}
            {carroReserva.length > 0 && (
            <>
            {/* Filtros */}
            <Card className="bg-white shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-slate-500"/><Text className="font-medium text-slate-700">Filtros de Carro Reserva</Text></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <MultiSelect label="Motivo" options={reservaUniqueOptions.motivos} selected={getFilterValues('reserva_motivo')} onChange={(v) => setReservaFilterValues('motivo', v)} />
                    <MultiSelect label="Cliente" options={reservaUniqueOptions.clientes} selected={getFilterValues('reserva_cliente')} onChange={(v) => setReservaFilterValues('cliente', v)} />
                    <MultiSelect label="Status" options={reservaUniqueOptions.statuses} selected={getFilterValues('reserva_status')} onChange={(v) => setReservaFilterValues('status', v)} />
                    <div><Text className="text-xs text-slate-500 mb-1">Busca (Placa/Cliente/ID)</Text><div className="relative"><Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400"/><input type="text" className="border p-2 pl-8 rounded text-sm w-full h-10" placeholder="Buscar..." value={(getFilterValues('reserva_search') || [])[0] || ''} onChange={e => setReservaFilterValues('search', [e.target.value])}/></div></div>
                </div>
                <div className="flex gap-2 mt-4 flex-wrap">
                    {/* reserva badges are handled by ChartFilterBadges (labelMap) */}
                </div>
            </Card>

            {/* KPIs - ATUALIZADO: Novos KPIs de Ocupação */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card decoration="top" decorationColor="blue">
                    <Text>Total de Ocorrências</Text>
                    <Metric>{fmtDecimal(reservaKPIs.total)}</Metric>
                </Card>
                <Card decoration="top" decorationColor="emerald">
                    <Text>Reservas Ativas</Text>
                    <Metric>{fmtDecimal(reservaKPIs.ativas)}</Metric>
                    <Text className="text-xs text-slate-500 mt-1">Em andamento</Text>
                </Card>
                <Card decoration="top" decorationColor="amber">
                    <Text>Principal Motivo</Text>
                    <Metric className="text-xl">{reservaKPIs.principalMotivo}</Metric>
                </Card>
                <Card decoration="top" decorationColor="violet">
                    <Text>Tempo Médio (Ativas)</Text>
                    <Metric>{reservaKPIs.tempoMedio.toFixed(1)} dias</Metric>
                    <Text className="text-xs text-slate-500 mt-1">Duração reserva</Text>
                </Card>
                <Card decoration="top" decorationColor="rose">
                    <Text>Pico de Utilização</Text>
                    <Metric>{ocupacaoKPIs.picoUtilizacao}</Metric>
                    <Text className="text-xs text-slate-500 mt-1">Máx simultâneo (período)</Text>
                </Card>
                <Card decoration="top" decorationColor="cyan">
                    <Text>Média de Carros na Rua</Text>
                    <Metric>{ocupacaoKPIs.mediaCarrosNaRua}</Metric>
                    <Text className="text-xs text-slate-500 mt-1">Por dia (período)</Text>
                </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <Title>Evolução Mensal de Ocorrências <span className="text-xs text-slate-500 font-normal">(clique | Ctrl+clique: múltiplo)</span></Title>
                    <div className="h-80 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={reservaKPIs.monthlyData} margin={{ left: 0, right: 40, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} height={60} interval={0} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: any) => [`${value}`, 'Ocorrências']} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[6,6,0,0]} barSize={24}>
                                    <LabelList dataKey="value" position="top" fontSize={10} fill="#64748b" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card>
                    <Title>Ocorrências por Motivo <span className="text-xs text-slate-500 font-normal">(clique | Ctrl+clique: múltiplo)</span></Title>
                    <div className="h-80 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={reservaKPIs.motivoData} layout="vertical" margin={{ left: 0, right: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={140} tick={{fontSize:12}} />
                                <Tooltip formatter={(value: any) => [`${value}`, 'Ocorrências']} />
                                <Bar dataKey="value" radius={[6,6,6,6]} barSize={20} fill="#f59e0b" onClick={(data: any, _index: number, event: any) => { handleChartClick('reserva_motivo', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('reserva-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                    <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <Title>Ocorrências por Cliente <span className="text-xs text-slate-500 font-normal">(clique | Ctrl+clique: múltiplo)</span></Title>
                    <Text className="text-xs text-slate-500 mb-2">Todos os clientes com ocorrências</Text>
                    <div className="h-96 mt-2 overflow-y-auto pr-2">
                        <ResponsiveContainer width="100%" height={Math.max(400, reservaKPIs.clienteData.length * 32)}>
                            <BarChart data={reservaKPIs.clienteData} layout="vertical" margin={{ left: 0, right: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={220} tick={{fontSize:11}} />
                                <Tooltip formatter={(value: any) => [`${value}`, 'Ocorrências']} />
                                <Bar dataKey="value" radius={[6,6,6,6]} barSize={16} fill="#10b981" onClick={(data: any, _index: number, event: any) => { handleChartClick('reserva_cliente', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('reserva-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                    <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} fontSize={10} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card>
                    <Title>Status das Ocorrências <span className="text-xs text-slate-500 font-normal">(clique | Ctrl+clique: múltiplo)</span></Title>
                    <div className="h-96 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={reservaKPIs.statusData} layout="vertical" margin={{ left: 0, right: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={140} tick={{fontSize:12}} />
                                <Tooltip formatter={(value: any) => [`${value}`, 'Ocorrências']} />
                                <Bar dataKey="value" radius={[6,6,6,6]} barSize={20} fill="#06b6d4" onClick={(data: any, _index: number, event: any) => { handleChartClick('reserva_status', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('reserva-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                    <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* NOVO: Gráfico de Ocupação Simultânea Diária */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                <Card>
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Title>Ocupação Simultânea Diária</Title>
                            <div className="group relative">
                                <Info size={16} className="text-slate-400 hover:text-blue-600 cursor-help transition-colors" />
                                <div className="absolute left-0 top-6 w-80 bg-slate-800 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                                    <p className="font-semibold mb-2">📊 Como funciona este gráfico:</p>
                                    <p className="mb-2"><strong>Fonte:</strong> fat_carro_reserva.json</p>
                                    <p className="mb-2"><strong>Cálculo:</strong> Para cada dia, conta quantos veículos estavam "na rua" simultaneamente.</p>
                                    <p className="mb-2"><strong>Regra:</strong> Um veículo conta se DataInicio ≤ dia E (DataFim ≥ dia OU DataFim = null)</p>
                                    <p><strong>💡 Dica:</strong> Use o slider abaixo para ajustar o período de análise!</p>
                                    <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-800 transform rotate-45"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Slider de Período */}
                    {reservaDateBounds && (
                        <div className="mb-4 px-2">
                            <div className="flex items-center justify-between mb-2">
                                <Text className="text-xs font-medium text-slate-700">Período de Análise:</Text>
                                <div className="flex gap-2">
                                    <button onClick={() => setSliderRange({startPercent: 90, endPercent: 100})} className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-600 hover:bg-cyan-100 hover:text-cyan-700 transition-colors">Último mês</button>
                                    <button onClick={() => setSliderRange({startPercent: 75, endPercent: 100})} className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-600 hover:bg-cyan-100 hover:text-cyan-700 transition-colors">Últimos 3m</button>
                                    <button onClick={() => setSliderRange({startPercent: 50, endPercent: 100})} className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-600 hover:bg-cyan-100 hover:text-cyan-700 transition-colors">Últimos 6m</button>
                                    <button onClick={() => setSliderRange({startPercent: 0, endPercent: 100})} className="px-2 py-1 text-xs rounded bg-cyan-600 text-white hover:bg-cyan-700 transition-colors">Todo período</button>
                                </div>
                            </div>
                            
                            <div className="relative pt-1">
                                <div className="flex items-center gap-3">
                                    <Text className="text-xs text-slate-500 min-w-[80px]">
                                        {new Date(reservaDateBounds.minDate.getTime() + ((reservaDateBounds.maxDate.getTime() - reservaDateBounds.minDate.getTime()) * sliderRange.startPercent / 100)).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                                    </Text>
                                    <div className="flex-1 relative">
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            value={sliderRange.startPercent}
                                            onChange={(e) => {
                                                const newStart = Number(e.target.value);
                                                if (newStart < sliderRange.endPercent) {
                                                    setSliderRange(prev => ({...prev, startPercent: newStart}));
                                                }
                                            }}
                                            className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-20"
                                            style={{
                                                background: 'transparent',
                                                WebkitAppearance: 'none',
                                                outline: 'none'
                                            }}
                                        />
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            value={sliderRange.endPercent}
                                            onChange={(e) => {
                                                const newEnd = Number(e.target.value);
                                                if (newEnd > sliderRange.startPercent) {
                                                    setSliderRange(prev => ({...prev, endPercent: newEnd}));
                                                }
                                            }}
                                            className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-10"
                                            style={{
                                                background: 'transparent',
                                                WebkitAppearance: 'none',
                                                outline: 'none'
                                            }}
                                        />
                                        <div className="relative h-2 bg-slate-200 rounded-full">
                                            <div 
                                                className="absolute h-2 bg-cyan-500 rounded-full"
                                                style={{
                                                    left: `${sliderRange.startPercent}%`,
                                                    width: `${sliderRange.endPercent - sliderRange.startPercent}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    <Text className="text-xs text-slate-500 min-w-[80px] text-right">
                                        {new Date(reservaDateBounds.minDate.getTime() + ((reservaDateBounds.maxDate.getTime() - reservaDateBounds.minDate.getTime()) * sliderRange.endPercent / 100)).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                                    </Text>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <Text className="text-xs text-slate-500 mb-2">Evolução da quantidade de veículos reserva em uso simultâneo por dia</Text>
                    <div className="h-80 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={ocupacaoSimultaneaData} margin={{ left: 10, right: 30, top: 10, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="colorOcupacao" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 10 }} 
                                    tickFormatter={(value) => {
                                        const date = new Date(value);
                                        return `${date.getDate()}/${date.getMonth() + 1}`;
                                    }}
                                    interval={Math.floor(ocupacaoSimultaneaData.length / 12)}
                                />
                                <YAxis tick={{ fontSize: 12 }} label={{ value: 'Veículos', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                                <Tooltip 
                                    formatter={(value: any) => [value, 'Veículos em Uso']}
                                    labelFormatter={(label) => {
                                        const date = new Date(label);
                                        return date.toLocaleDateString('pt-BR');
                                    }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="count" 
                                    stroke="#06b6d4" 
                                    strokeWidth={2}
                                    fillOpacity={1} 
                                    fill="url(#colorOcupacao)"
                                    dot={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                <Card id="modelos-chart">
                    <div className="flex items-center justify-between mb-1">
                        <Title>Modelos dos Veículos Reserva <span className="text-xs text-slate-500 font-normal">(clique | Ctrl+clique: múltiplo)</span></Title>
                        {(sliderRange.startPercent > 0 || sliderRange.endPercent < 100) && reservaDateBounds && (
                            <Badge color="cyan" className="text-xs">
                                📅 Período: {new Date(reservaDateBounds.minDate.getTime() + ((reservaDateBounds.maxDate.getTime() - reservaDateBounds.minDate.getTime()) * sliderRange.startPercent / 100)).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} - {new Date(reservaDateBounds.minDate.getTime() + ((reservaDateBounds.maxDate.getTime() - reservaDateBounds.minDate.getTime()) * sliderRange.endPercent / 100)).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                            </Badge>
                        )}
                    </div>
                    <Text className="text-xs text-slate-500 mb-2">{(sliderRange.startPercent > 0 || sliderRange.endPercent < 100) ? 'Modelos usados no período selecionado pelo slider' : 'Top modelos de veículos mais demandados como reserva (histórico completo)'}</Text>
                    <div className="h-96 mt-2 overflow-y-auto pr-2">
                        <ResponsiveContainer width="100%" height={Math.max(400, reservaModelData.length * 32)}>
                            <BarChart data={reservaModelData} layout="vertical" margin={{ left: 0, right: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={220} tick={{fontSize:11}} />
                                <Tooltip formatter={(value: any) => [`${value}`, 'Vezes Usado']} />
                                <Bar dataKey="value" radius={[6,6,6,6]} barSize={16} fill="#7c3aed" onClick={(data: any, _index: number, event: any) => { handleChartClick('reserva_modelo', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('reserva-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                    <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} fontSize={10} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

            </div>

            {/* Tabela de Detalhamento */}
            <Card id="reserva-table" className="p-0 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Title>Detalhamento de Ocorrências</Title>
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">{fmtDecimal(filteredReservas.length)} registros</span>
                    </div>
                    <button onClick={() => exportToExcel(filteredReservas, 'carro_reserva')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 transition-colors border px-3 py-1 rounded">
                        <FileSpreadsheet size={16}/> Exportar
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Data Criação</th>
                                <th className="px-6 py-3">ID Ocorrência</th>
                                <th className="px-6 py-3">Placa Reserva</th>
                                <th className="px-6 py-3">Modelo Reserva</th>
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3">Motivo</th>
                                <th className="px-6 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reservaPageItems.map((r, i) => {
                                const isAtiva = !['Finalizado', 'Cancelado', 'Concluída'].includes(r.StatusOcorrencia || '');
                                const badgeColor = isAtiva ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600';
                                return (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-6 py-3">{r.DataCriacao ? new Date(r.DataCriacao).toLocaleDateString('pt-BR') : '-'}</td>
                                        <td className="px-6 py-3 font-mono text-xs">{r.IdOcorrencia}</td>
                                        <td className="px-6 py-3 font-medium font-mono">{r.PlacaReserva}</td>
                                        <td className="px-6 py-3">{r.ModeloReserva}</td>
                                        <td className="px-6 py-3 max-w-xs truncate">{r.Cliente}</td>
                                        <td className="px-6 py-3"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">{r.Motivo}</span></td>
                                        <td className="px-6 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${badgeColor}`}>{r.StatusOcorrencia}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-between p-4 border-t border-slate-100">
                    <div className="flex gap-2">
                        <button onClick={() => setReservaPage(Math.max(0, reservaPage - 1))} disabled={reservaPage === 0} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">←</button>
                        <span className="px-3 py-1 text-sm text-slate-600">Página {reservaPage + 1} de {Math.ceil(filteredReservas.length / pageSize)}</span>
                        <button onClick={() => setReservaPage(reservaPage + 1)} disabled={(reservaPage + 1) * pageSize >= filteredReservas.length} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">→</button>
                    </div>
                </div>
            </Card>
            </>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
// TimelineRow e TimelineDetails movidos para TimelineTab component