import { useMemo, useState, useEffect, useRef } from 'react';
import useBIData from '@/hooks/useBIData';
import useBIDataBatch, { getBatchTable } from '@/hooks/useBIDataBatch';
import { useTimelineData } from '@/hooks/useTimelineData';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import * as XLSX from 'xlsx';
import { ResponsiveContainer, Cell, Tooltip, BarChart, Bar, LabelList, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { Car, Filter, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, CheckCircle2, XCircle, MapPin, Warehouse, Timer, Archive, Info, ChevronDown, HelpCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiSelect } from '@/components/ui/multi-select';
import CompactMultiSelect from '@/components/ui/compact-multi-select';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useChartFilter } from '@/hooks/useChartFilter';
import { ChartFilterBadges, FloatingClearButton } from '@/components/analytics/ChartFilterBadges';
import TimelineTab from '@/components/analytics/fleet/TimelineTab';
import DataUpdateBadge from '@/components/DataUpdateBadge';
import { AnalyticsLoading } from '@/components/analytics/AnalyticsLoading';
import { Input } from '@/components/ui/input';

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

function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function parseNum(v: any): number {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const raw = String(v ?? '').trim();
    if (!raw) return 0;

    const s = raw.replace(/\s/g, '').replace(/[^0-9,.-]/g, '');
    if (!s) return 0;

    // pt-BR com milhar por ponto: 81.112 ou 81.112,50
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
        const n = Number(s.replace(/\./g, '').replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    }

    // en-US com milhar por vírgula: 81,112 ou 81,112.50
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
        const n = Number(s.replace(/,/g, ''));
        return Number.isFinite(n) ? n : 0;
    }

    // Decimal com vírgula: 123,45
    if (/^-?\d+,\d+$/.test(s)) {
        const n = Number(s.replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    }

    const n = Number(s);
    if (Number.isFinite(n)) return n;

    const fallback = parseFloat(s.replace(',', '.'));
    return Number.isFinite(fallback) ? fallback : 0;
}
// pickBestNumber removed because it was unused; keep parsing helpers above.
function classifySeguro(v: any): 'Com Seguro' | 'Sem Seguro' | 'Não Informado' {
    const s = String(v ?? '').trim().toLowerCase();
    if (!s) return 'Não Informado';
    if (['1', 'true', 'sim', 's', 'yes'].includes(s)) return 'Com Seguro';
    if (['0', 'false', 'nao', 'não', 'n', 'no'].includes(s)) return 'Sem Seguro';
    return 'Não Informado';
}
function normalizeTelemetriaProvider(v: any): string {
    const raw = sanitizeText(v).trim();
    if (!raw) return 'Sem Telemetria';
    const key = raw
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    if (['NAO DEFINIDO', 'N/A', '-', 'SEM TELEMETRIA'].includes(key)) return 'Sem Telemetria';
    if (key === 'ITER') return 'iTER';
    return raw;
}
function parseBIDate(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    const s = String(v).trim();
    if (!s || s === 'N/A' || s === '—' || s === '-') return null;

    // ISO format: 2024-03-20...
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }

    // BR format: 20/03/2024...
    const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (brMatch) {
        return new Date(parseInt(brMatch[3], 10), parseInt(brMatch[2], 10) - 1, parseInt(brMatch[1], 10));
    }

    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

function parseDateOnlyLocal(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    const s = String(v).trim();
    if (!s) return null;

    // Evita offset de timezone ao parsear "YYYY-MM-DD" (que o JS trata como UTC)
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const d = Number(m[3]);
        return new Date(y, mo, d, 12, 0, 0, 0);
    }

    const parsed = new Date(s);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeLocalDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}
function sanitizeText(v: any): string {
    const s = String(v ?? '').trim();
    if (!s) return '';

    // Corrige padrões mais comuns de mojibake encontrados na carga de frota.
    return s
        .replace(/├ç/g, 'Ç')
        .replace(/├â/g, 'Ã')
        .replace(/├ü/g, 'Á')
        .replace(/├á/g, 'á')
        .replace(/├®/g, 'é')
        .replace(/├£/g, 'ã')
        .replace(/├ª/g, 'ê')
        .replace(/├│/g, 'ó')
        .replace(/├ô/g, 'Ó')
        .replace(/├ì/g, 'Í')
        .replace(/├í/g, 'í')
        .replace(/├ú/g, 'Ú')
        .replace(/┬º/g, 'º')
        .replace(/┬°/g, '°')
        .replace(/�/g, '');
}
function normalizePlate(v: any): string { return String(v ?? '').trim().toUpperCase(); }
function normalizeOccurrence(v: any): string {
    const s = String(v ?? '').trim().toUpperCase();
    if (!s) return '';
    const noPrefix = s.replace(/^QUAL-?/, '').trim();
    // Normaliza nùmeros decimais serializados como string (ex.: "355501.00" -> "355501")
    const decimalLike = noPrefix.match(/^(\d+)\.0+$/);
    if (decimalLike) return decimalLike[1];
    const digits = noPrefix.replace(/[^0-9]/g, '');
    return digits || noPrefix;
}

type ReservaStatusCategoria = 'Ativa' | 'Concluída' | 'Cancelada';

function normalizeReservaStatus(raw: AnyObject): string {
    return String(raw?.StatusOcorrencia || raw?.SituacaoOcorrencia || raw?.Status || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function isReservaStatusOperacionalAtivo(raw: AnyObject): boolean {
    const status = normalizeReservaStatus(raw);
    if (!status) return false;

    return (status.includes('aguard') && status.includes('devol'))
        || status.includes('provisor')
        || status.includes('andamento')
        || status.includes('abert')
        || status === 'ativa';
}

function isReservaConcluida(raw: AnyObject): boolean {
    const status = normalizeReservaStatus(raw);

    // Em carro reserva, DataDevolucao pode ser previsão; conclusão precisa de status/finalização real.
    if (isReservaStatusOperacionalAtivo(raw)) return false;

    return Boolean(raw?.DataConclusaoOcorrencia || raw?.DataConclusao || raw?.DataEncerramento || raw?.DataEntrega || raw?.DataRetorno)
        || status.includes('conclu')
        || status.includes('finaliz')
        || status.includes('encerr')
        || status.includes('devolvid');
}

function isReservaCancelada(raw: AnyObject): boolean {
    const status = normalizeReservaStatus(raw);
    return status.includes('cancel') || Boolean(raw?.CanceladoPor);
}

function getReservaStatusCategoria(raw: AnyObject): ReservaStatusCategoria {
    if (isReservaCancelada(raw)) return 'Cancelada';
    if (isReservaConcluida(raw)) return 'Concluída';
    return 'Ativa';
}

function getReservaStatusOperacional(raw: AnyObject): string {
    const rawStatus = sanitizeText(raw?.StatusOcorrencia || raw?.SituacaoOcorrencia || raw?.Status || '').trim();
    const normalized = normalizeReservaStatus(raw);

    if (normalized.includes('aguard') && normalized.includes('devol')) return 'Aguardando Devolução';
    if (normalized.includes('provisor')) return 'Provisório';
    if (normalized.includes('cancel')) return 'Cancelada';
    if (normalized.includes('conclu') || normalized.includes('finaliz') || normalized.includes('encerr')) return 'Concluída';

    if (rawStatus) return rawStatus;
    return getReservaStatusCategoria(raw);
}

function isReservaAtiva(raw: AnyObject): boolean {
    if (isReservaCancelada(raw)) return false;
    if (isReservaStatusOperacionalAtivo(raw)) return true;
    return getReservaStatusCategoria(raw) === 'Ativa';
}

function getReservaFimOperacional(raw: AnyObject): Date {
    if (isReservaAtiva(raw)) return new Date();

    const fim = parseBIDate(
        raw?.DataFim
        || raw?.DataDevolucao
        || raw?.DataConclusaoOcorrencia
        || raw?.DataConclusao
        || raw?.DataEncerramento
        || raw?.DataRetorno
        || raw?.DataEntrega
    );

    if (fim) return fim;

    const fallbackFim = parseBIDate(
        raw?.DataCancelamento
        || raw?.DataAtualizacao
        || raw?.DataCriacao
        || raw?.DataInicio
    );

    return fallbackFim || new Date();
}

function isReservaContabilizavelUsoSimultaneo(raw: AnyObject): boolean {
    if (isReservaCancelada(raw)) return false;
    return Boolean(raw?.DataInicio);
}

function getReservaPrimaryPlate(raw: AnyObject): string {
    return normalizePlate(raw?.PlacaReserva || raw?.PlacaVeiculoInterno || raw?.PlacaTitular || raw?.Placa || '');
}

function getReservaDataPrevistaFim(raw: AnyObject): Date | null {
    const prevista = parseBIDate(
        raw?.DataPrevistaDevolucao
        || raw?.DataPrevistaEntrega
        || raw?.DataFimPrevista
        || raw?.DataFimPrevisto
        || raw?.DataPrevistaTermino
        || raw?.DataFim
    );
    return prevista || null;
}

function getReservaFornecedor(raw: AnyObject): string {
    const fornecedor = sanitizeText(
        raw?.FornecedorReservaEnriquecido
        || raw?.FornecedorReserva
        || raw?.FornecedorReservaOriginal
        || raw?.Fornecedor
        || raw?.NomeFornecedor
        || ''
    ).trim();

    if (fornecedor) return fornecedor;

    const proprietario = sanitizeText(raw?.Proprietario || raw?.proprietario || raw?.ProprietarioVeiculo || raw?.ProprietarioCadastro || '').trim();
    if (proprietario) {
        const low = proprietario.toLowerCase();
        if (low.includes('frota') || low.includes('próprio') || low.includes('proprio')) return 'Frota';
        return proprietario;
    }

    return 'Não informado';
}

function getReservaFimDisplay(raw: AnyObject): { text: string; tone: 'date' | 'active' | 'muted' } {
    const dataFim = parseBIDate(raw?.DataFim);
    if (dataFim) {
        return { text: dataFim.toLocaleDateString('pt-BR'), tone: 'date' };
    }

    if (isReservaAtiva(raw)) {
        const prevista = getReservaDataPrevistaFim(raw);
        if (prevista) {
            return { text: `Em andamento (prev. ${prevista.toLocaleDateString('pt-BR')})`, tone: 'active' };
        }
        return { text: 'Em andamento', tone: 'active' };
    }

    return { text: getReservaStatusCategoria(raw), tone: 'muted' };
}
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
    ValorLocacao?: number;
    Chassi?: string;
};

// Using shared MultiSelect component with built-in search

export default function FleetDashboard() {

    // Tab state (declared early for lazy loading logic)
    const [activeTab, setActiveTab] = useState<string>('visao-geral');
    const [showKpiHelp, setShowKpiHelp] = useState(false);

    // Batch 1: Primary data (single HTTP request)
    const { results: primaryData, metadata: _primaryMeta, loading: loadingPrimary } = useBIDataBatch([
        'dim_frota', 'dim_contratos_locacao', 'dim_movimentacao_patios', 'dim_movimentacao_veiculos'
    ]);
    // Batch 2: Secondary/fact tables — lazy loaded only when relevant tab is active
    const needsSecondary = activeTab === 'visao-geral' || activeTab === 'patio' || activeTab === 'carro-reserva' || activeTab === 'timeline';
    const { results: secondaryData, loading: loadingSecondary } = useBIDataBatch([
        'fat_sinistros', 'fat_multas', 'fat_carro_reserva', 'fat_movimentacao_ocorrencias', 'fat_manutencao_unificado'
    ], undefined, { enabled: needsSecondary });

    // Timeline — lazy loaded only when timeline tab is active
    const needsTimeline = activeTab === 'timeline';
    const timelineItensLimit = (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) ? 100000 : 50000;

    // Tabela de itens de OS é usada para complementar valores na timeline (QUAL-*)
    const { results: timelineAuxData, loading: loadingTimelineAux, error: errorTimelineAux } = useBIDataBatch([
        'fat_itens_ordem_servico'
    ], undefined, { enabled: needsTimeline, params: { limit: timelineItensLimit } });
    const { data: _timelineAggregated } = useTimelineData('aggregated', undefined, { enabled: needsTimeline }); // eslint-disable-line @typescript-eslint/no-unused-vars
    const { data: timelineRecent, loading: timelineLoading, error: timelineError, diagnostics: timelineDiagnostics } = useTimelineData('recent', undefined, { enabled: needsTimeline });
    const { data: historicoSituacaoRaw } = useBIData<AnyObject[]>('historico_situacao_veiculos', { enabled: activeTab === 'patio' });

    // Extract individual datasets from batch results
    const frotaData = useMemo(() => getBatchTable<AnyObject>(primaryData, 'dim_frota'), [primaryData]);
    const contratosLocacaoData = useMemo(() => getBatchTable<AnyObject>(primaryData, 'dim_contratos_locacao'), [primaryData]);
    const patioMovData = useMemo(() => getBatchTable<AnyObject>(primaryData, 'dim_movimentacao_patios'), [primaryData]);
    const veiculoMovData = useMemo(() => getBatchTable<AnyObject>(primaryData, 'dim_movimentacao_veiculos'), [primaryData]);
    const sinistrosRaw = useMemo(() => getBatchTable<AnyObject>(secondaryData, 'fat_sinistros'), [secondaryData]);
    const multasRaw = useMemo(() => getBatchTable<AnyObject>(secondaryData, 'fat_multas'), [secondaryData]);
    const carroReservaData = useMemo(() => getBatchTable<AnyObject>(secondaryData, 'fat_carro_reserva'), [secondaryData]);
    const movimentacoesData = useMemo(() => getBatchTable<AnyObject>(secondaryData, 'fat_movimentacao_ocorrencias'), [secondaryData]);
    const manutencaoData = useMemo(() => getBatchTable<AnyObject>(secondaryData, 'fat_manutencao_unificado'), [secondaryData]);
    const itensOrdemServicoData = useMemo(() => getBatchTable<AnyObject>(timelineAuxData, 'fat_itens_ordem_servico'), [timelineAuxData]);

    const frotaMetadata = useMemo(() => (primaryData['dim_frota'] as any)?.metadata || _primaryMeta || null, [primaryData, _primaryMeta]);

    const sinistrosData = useMemo(() => Array.isArray(sinistrosRaw) ? sinistrosRaw : [], [sinistrosRaw]);
    const multasData = useMemo(() => Array.isArray(multasRaw) ? multasRaw : [], [multasRaw]);

    const frota = useMemo<AnyObject[]>(() => {
        const raw = Array.isArray(frotaData) ? frotaData : [];
        return raw.map((item: AnyObject): AnyObject => ({
            ...item,
            Placa: item.Placa || item.placa || item.plate || '',
            Modelo: sanitizeText(item.Modelo || item.modelo || item.modelo_veiculo || 'N/A') || 'N/A',
            Status: sanitizeText(item.Status || item.status || item.SituacaoVeiculo || item.situacaoveiculo || 'N/A') || 'N/A',
            ValorCompra: parseCurrency(item.ValorCompra || item.valorcompra || item.ValorCompraVeiculo || item.valor_compra || 0),
            ValorFipeAtual: parseCurrency(item.ValorFipeAtual || item.valorfipeatual || item.ValorAtualFIPE || item.valoratualfipe || item.ValorFipe || item.valorfipe || 0),
            // `KmInformado` deve refletir o valor informado originalmente (sem usar fallback para confirmado)
            // Preserve `null`/`undefined` quando não houver valor para evitar sobreescrever com 0.
            KmInformado: (() => {
                const raw = item.KmInformado ?? item.kminformado ?? item.OdometroInformado ?? item.odometroinformado;
                return raw === null || raw === undefined || String(raw).trim() === '' ? null : parseNum(raw);
            })(),
            KmConfirmado: (() => {
                const raw = item.KmConfirmado ?? item.kmconfirmado ?? item.OdometroConfirmado ?? item.odometroconfirmado;
                return raw === null || raw === undefined || String(raw).trim() === '' ? null : parseNum(raw);
            })(),
            IdadeVeiculo: parseNum(item.IdadeVeiculo || item.idadeveiculo || item.IdadeEmMeses || item.idadeemmeses || item.agemonths || 0),
            Categoria: sanitizeText(item.Categoria || item.categoria || item.GrupoVeiculo || item.grupoveiculo || 'Outros') || 'Outros',
            Filial: sanitizeText(item.Filial || item.filial || 'N/A') || 'N/A',
            Patio: sanitizeText(item.Patio || item.patio || item.Localizacao || item.localizacao || item.LocalizacaoVeiculo || item.localizacaoveiculo || 'Sem pátio') || 'Sem pátio',
            DiasNoStatus: parseNum(item.DiasSituacao || item.diassituacao || item.DiasNoStatus || item.diasnostatus || 0),
            DataInicioStatus: item.DataInicioStatus || item.datainiciostatus || item.DataInicioSituacao || item.datainiciosituacao || null,
            ProvedorTelemetria: normalizeTelemetriaProvider(item.ProvedorTelemetria || item.provedortelemetria || ''),
            UltimaAtualizacaoTelemetria: item.UltimaAtualizacaoTelemetria || item.ultimaatualizacaotelemetria || null,
            UltimoEnderecoTelemetria: item.UltimoEnderecoTelemetria || item.ultimoenderecotelemetria || '',
            Latitude: parseNum(item.Latitude ?? item.latitude ?? 0),
            Longitude: parseNum(item.Longitude ?? item.longitude ?? 0),
            ComSeguroVigente: item.ComSeguroVigente ?? item.comsegurovigente ?? null,
            Proprietario: sanitizeText(item.Proprietario || item.proprietario || 'Não Definido') || 'Não Definido',
            FinalidadeUso: sanitizeText(item.FinalidadeUso || item.finalidadeUso || item.finalidadeuso || 'Não Definido').toUpperCase() || 'Não Definido',
        }));
    }, [frotaData]);

    const itensOsMap = useMemo(() => {
        const map = new Map<string, { valorTotal: number; valorReembolsavel: number }>();
        const list = Array.isArray(itensOrdemServicoData) ? itensOrdemServicoData : [];

        const getIdKey = (r: AnyObject) => String(r?.IdOrdemServico ?? r?.idordemservico ?? '').trim();
        const getOsKey = (r: AnyObject) => String(r?.OrdemServico ?? r?.ordemservico ?? r?.OS ?? r?.os ?? '').trim();
        const getOccIdKey = (r: AnyObject) => normalizeOccurrence(r?.IdOcorrencia ?? r?.idocorrencia);
        const getOccCodeKey = (r: AnyObject) => normalizeOccurrence(r?.Ocorrencia ?? r?.ocorrencia);
        const getPlateKey = (r: AnyObject) => normalizePlate(r?.Placa ?? r?.placa);
        const getValorTotal = (r: AnyObject) => parseCurrency(
            r?.ValorTotal ?? r?.valortotal ?? r?.Valor ?? r?.valor ?? r?.ValorItem ?? r?.valoritem ?? 0
        );
        const getValorReembolsavel = (r: AnyObject) => parseCurrency(
            r?.ValorReembolsavel ?? r?.valorreembolsavel ?? r?.ValorReembolso ?? r?.valorreembolso ?? 0
        );

        const add = (k: string, total: number, reemb: number) => {
            if (!k) return;
            const prev = map.get(k) || { valorTotal: 0, valorReembolsavel: 0 };
            map.set(k, {
                valorTotal: prev.valorTotal + total,
                valorReembolsavel: prev.valorReembolsavel + reemb,
            });
        };

        for (const r of list) {
            const total = getValorTotal(r);
            const reemb = getValorReembolsavel(r);
            const idKey = getIdKey(r);
            const osKey = getOsKey(r);
            const occIdKey = getOccIdKey(r);
            const occCodeKey = getOccCodeKey(r);
            const plateKey = getPlateKey(r);
            add(idKey, total, reemb);
            add(osKey, total, reemb);
            add(`occ:${occIdKey}`, total, reemb);
            add(`occ:${occCodeKey}`, total, reemb);
            add(`placa:${plateKey}`, total, reemb);
            if (occIdKey && plateKey) add(`occplaca:${occIdKey}:${plateKey}`, total, reemb);
            if (occCodeKey && plateKey) add(`occplaca:${occCodeKey}:${plateKey}`, total, reemb);
        }

        return map;
    }, [itensOrdemServicoData]);

    const manutencao = useMemo<AnyObject[]>(() => {
        const raw = (manutencaoData as any)?.data || manutencaoData || [];
        return raw.map((m: AnyObject): AnyObject => ({
            ...(function () {
                const osId = String(m?.IdOrdemServico ?? m?.idordemservico ?? '').trim();
                const osNum = String(m?.OrdemServico ?? m?.ordemservico ?? m?.OS ?? m?.os ?? '').trim();
                const occId = normalizeOccurrence(m?.IdOcorrencia ?? m?.idocorrencia);
                const occCode = normalizeOccurrence(m?.Ocorrencia ?? m?.ocorrencia);
                const placa = normalizePlate(m?.Placa ?? m?.placa);
                const fromItens =
                    itensOsMap.get(osId) ||
                    itensOsMap.get(osNum) ||
                    itensOsMap.get(`occplaca:${occId}:${placa}`) ||
                    itensOsMap.get(`occplaca:${occCode}:${placa}`) ||
                    itensOsMap.get(`occ:${occId}`) ||
                    itensOsMap.get(`occ:${occCode}`) ||
                    itensOsMap.get(`placa:${placa}`) ||
                    null;
                return {
                    ValorTotalFatItens: fromItens ? fromItens.valorTotal : null,
                    ValorReembolsavelFatItens: fromItens ? fromItens.valorReembolsavel : null,
                };
            })(),
            ...m,
            Placa: m.Placa || m.placa || '',
            ValorTotal: parseCurrency(m.ValorTotal || m.valortotal || m.CustoTotalOS || m.custototalos || 0),
            CustoTotalOS: parseCurrency(m.CustoTotalOS || m.custototalos || m.ValorTotal || m.valortotal || 0),
        }));
    }, [manutencaoData, itensOsMap]);

    const qualValuesCoverage = useMemo(() => {
        const total = Array.isArray(manutencao) ? manutencao.length : 0;
        const withValues = (Array.isArray(manutencao) ? manutencao : []).filter((m: AnyObject) => {
            const totalItens = Number(m?.ValorTotalFatItens ?? 0);
            const reembItens = Number(m?.ValorReembolsavelFatItens ?? 0);
            return totalItens > 0 || reembItens > 0;
        }).length;
        return { total, withValues };
    }, [manutencao]);
    const movimentacoes = useMemo(() => (movimentacoesData as any)?.data || movimentacoesData || [], [movimentacoesData]);
    // Usar timeline recente para compatibilidade com componentes existentes
    const timeline = useMemo(() => Array.isArray(timelineRecent) ? timelineRecent : [], [timelineRecent]);
    // Timeline agregada disponível via timelineAggregated quando necessário
    const carroReserva = useMemo(() => Array.isArray(carroReservaData) ? carroReservaData : [], [carroReservaData]);
    // Garantir que consideramos apenas ocorrências do tipo 'Carro Reserva'
    const carroReservaFiltered = useMemo(() => {
        if (!Array.isArray(carroReserva) || carroReserva.length === 0) return [];

        const sample = carroReserva[0] || {};
        const hasTipoField = Object.prototype.hasOwnProperty.call(sample, 'Tipo') || Object.prototype.hasOwnProperty.call(sample, 'TipoOcorrencia') || Object.prototype.hasOwnProperty.call(sample, 'IdTipo');

        // Normaliza os dados de reserva para um formato único.
        const normalizedRows = carroReserva
            .map(r => {
                // Tenta encontrar as datas em múltiplos campos possíveis (Power BI export tags variam)
                const rawInicio = r.DataInicio || r.DataRetirada || r.DataRetiradaEfetiva || r.DataCriacao;
                const rawFim = r.DataFim || r.DataDevolucao || r.DataDevolucaoEfetiva || r.DataConclusao || r.DataConclusaoOcorrencia || r.DataEntrega || r.DataRetorno;

                const dInicio = parseBIDate(rawInicio);
                const dFim = parseBIDate(rawFim);

                const status = r.StatusOcorrencia || r.SituacaoOcorrencia || 'N/A';
                const motivo = r.Motivo || r.MotivoOcorrencia || 'Não Definido';
                const cliente = r.Cliente || r.NomeCliente || 'N/A';
                const placa = r.PlacaReserva || r.PlacaVeiculoInterno || r.PlacaTitular || '—';
                const fornecedor = getReservaFornecedor(r as AnyObject);

                const statusCategoria = getReservaStatusCategoria(r as AnyObject);
                const concluded = statusCategoria === 'Concluída';
                const isCancelled = statusCategoria === 'Cancelada';
                const isAtiva = isReservaAtiva(r as AnyObject);

                const ocorrenciaKey = normalizeOccurrence(
                    r.IdOcorrencia || r.Ocorrencia || r.Id || r.IdOcorrenciaBI || r.CodigoOcorrencia || ''
                );
                const fallbackKey = [
                    normalizePlate(placa),
                    normalizeOccurrence(rawInicio || dInicio?.toISOString() || ''),
                    normalizeOccurrence(rawFim || dFim?.toISOString() || ''),
                    String(cliente || '').trim().toLowerCase(),
                    String(motivo || '').trim().toLowerCase()
                ].join('|');
                const dedupeKey = ocorrenciaKey ? `occ:${ocorrenciaKey}` : `fallback:${fallbackKey}`;

                const sortDate = parseBIDate(
                    r.DataAtualizacaoDados || r.DataAtualizacao || r.DataConclusao || r.DataDevolucao || r.DataFim || rawFim || rawInicio || r.DataCriacao
                ) || dFim || dInicio || new Date(0);

                return {
                    ...r,
                    DataInicio: dInicio ? dInicio.toISOString() : null,
                    DataFim: dFim ? dFim.toISOString() : null,
                    StatusOcorrencia: status,
                    Motivo: motivo,
                    Cliente: cliente,
                    FornecedorReserva: fornecedor,
                    PlacaReserva: placa,
                    isAtiva,
                    isCancelled,
                    concluded,
                    StatusCategoria: statusCategoria,
                    _dedupeKey: dedupeKey,
                    _sortDateMs: sortDate.getTime(),
                } as any;
            });

        const onlyReservaRows = hasTipoField
            ? normalizedRows.filter(r => {
                const tipo = String(r.Tipo || r.TipoOcorrencia || '').toLowerCase();
                const idTipo = String(r.IdTipo || '').trim();
                return tipo.includes('carro') || tipo.includes('reserva') || idTipo === '5' || idTipo === '21';
            })
            : normalizedRows;

        // A tabela pode vir com snapshots duplicados por ocorrência; mantém apenas a versão mais recente.
        const latestByOccurrence = new Map<string, AnyObject>();
        onlyReservaRows.forEach((row: AnyObject) => {
            const key = String(row._dedupeKey || '');
            if (!key) return;
            const prev = latestByOccurrence.get(key);
            if (!prev || Number(row._sortDateMs || 0) >= Number(prev._sortDateMs || 0)) {
                latestByOccurrence.set(key, row);
            }
        });

        return Array.from(latestByOccurrence.values()).map((row: AnyObject) => {
            const { _dedupeKey, _sortDateMs, ...clean } = row;
            void _dedupeKey;
            void _sortDateMs;
            return clean;
        });
    }, [carroReserva]);
    const patioMov = useMemo(() => Array.isArray(patioMovData) ? patioMovData : [], [patioMovData]);
    const veiculoMov = useMemo(() => Array.isArray(veiculoMovData) ? veiculoMovData : [], [veiculoMovData]);
    const historicoSituacao = useMemo(() => Array.isArray(historicoSituacaoRaw) ? historicoSituacaoRaw : [], [historicoSituacaoRaw]);
    const historicoMap = useMemo(() => {
        const map = new Map<string, Array<{ status: string; date: Date }>>();
        historicoSituacao.forEach((row: AnyObject) => {
            const placa = normalizePlate(row?.Placa || row?.placa || '');
            if (!placa) return;
            const status = String(row?.SituacaoVeiculo || row?.situacaoveiculo || row?.Situacao || row?.situacao || '').trim();
            if (!status) return;
            const date = parseBIDate(row?.UltimaAtualizacao || row?.ultimaatualizacao || row?.DataEvento || row?.dataevento);
            if (!date || isNaN(date.getTime())) return;
            if (!map.has(placa)) map.set(placa, []);
            map.get(placa)!.push({ status, date });
        });
        map.forEach((events) => events.sort((a, b) => a.date.getTime() - b.date.getTime()));
        return map;
    }, [historicoSituacao]);
    const contratosLocacao = useMemo(() => Array.isArray(contratosLocacaoData) ? contratosLocacaoData : [], [contratosLocacaoData]);
    const sinistros = useMemo(() => sinistrosData || [], [sinistrosData]);
    const multas = useMemo(() => multasData || [], [multasData]);

    const resolveStatusStartForDate = (placa: string, checkDate: Date, statusAtDate: string | null): Date | null => {
        if (!placa || !statusAtDate) return null;
        const targetStatus = normalizeStatus(statusAtDate);
        if (!targetStatus) return null;

        const events = historicoMap.get(normalizePlate(placa)) || [];
        if (events.length === 0) return null;

        const statusEvents = events.filter((event) => event.date.getTime() <= checkDate.getTime());
        if (statusEvents.length === 0) return null;

        const lastIdx = statusEvents.length - 1;
        const lastStatusNorm = normalizeStatus(statusEvents[lastIdx].status);
        if (lastStatusNorm !== targetStatus) return null;

        let start = statusEvents[lastIdx].date;
        for (let i = lastIdx - 1; i >= 0; i--) {
            const sNorm = normalizeStatus(statusEvents[i].status);
            if (sNorm !== targetStatus) break;
            start = statusEvents[i].date;
        }
        return start;
    };

    // Mapa de Contratos por Placa (para enriquecer dim_frota)
    const contratosMap = useMemo(() => {
        const map: Record<string, {
            NomeCliente: string;
            TipoLocacao: string;
            NumeroContratoLocacao?: string;
            SituacaoLocacao?: string;
            DataPrevistaTerminoLocacao?: string;
            DataEncerramentoLocacao?: string;
            ValorLocacao?: number;
            __inicio?: string;
        }> = {};

        const normalizeText = (v: any) => String(v ?? '').trim();
        const getStatus = (c: AnyObject) => normalizeText(c.StatusLocacao ?? c.statuslocacao ?? c.Status ?? c.status ?? c.Situacao ?? c.situacao);
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
        const getStartDate = (c: AnyObject) => pickDate(c, ['DataInicio', 'datainicio', 'InicioContrato', 'iniciocontrato', 'DataInicioContrato', 'datainiciocontrato', 'DataRetirada', 'dataretirada', 'DataAbertura', 'dataabertura']);

        for (const c of contratosLocacao) {
            const placa = normalizePlate(c.PlacaPrincipal ?? c.placaprincipal ?? c.Placa ?? c.placa ?? c.plate ?? '');
            if (!placa) continue;

            const status = getStatus(c);
            const contratoId = normalizeText(c.NumeroContrato ?? c.numerocontrato ?? c.Contrato ?? c.contrato ?? c.IdContratoLocacao ?? c.idcontratolocacao ?? c.ContratoId ?? c.contratoid);

            const inicio = getStartDate(c);
            const next = {
                NomeCliente: normalizeText(c.NomeCliente ?? c.nomecliente ?? c.Cliente ?? c.cliente ?? 'Sem Cliente') || 'Sem Cliente',
                // Preferir campo TipoDeContrato (vindo do SELECT transformado no ETL). Falls back to older fields.
                TipoLocacao: normalizeText(c.TipoDeContrato ?? c.ContratoComercial ?? c.contratocomercial ?? c.TipoLocacao ?? c.tipolocacao ?? 'Não Definido') || 'Não Definido',
                NumeroContratoLocacao: contratoId || undefined,
                SituacaoLocacao: status || undefined,
                DataPrevistaTerminoLocacao: pickDate(c, ['DataPrevistaTermino', 'dataprevistatermino', 'DataFimPrevista', 'datafimprevista', 'DataFimPrevisto', 'datafimprevisto', 'DataFim', 'datafim', 'DataTerminoPrevisto', 'dataterminoprevisto', 'DataFimLocacao', 'datafimlocacao']) || undefined,
                DataEncerramentoLocacao: pickDate(c, ['DataEncerramento', 'dataencerramento', 'DataEncerrado', 'dataencerrado', 'DataFimEfetiva', 'datafimefetiva', 'DataFim', 'datafim', 'DataTermino', 'datatermino', 'DataFimLocacao', 'datafimlocacao']) || undefined,
                ValorLocacao: parseCurrency(c.ValorMensalAtual ?? c.valormensalatual ?? c.UltimoValorLocacao ?? c.ultimovalorlocacao ?? c.ValorMensal ?? c.valormensal ?? c.ValorLocacao ?? c.valorlocacao ?? c.ValorContrato ?? c.valorcontrato ?? 0) || undefined,
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
        const mapTipoContratoLocal = (raw: any) => {
            const s = String(raw ?? '').toLowerCase();
            if (!s || s === 'n/a' || s === 'nao definido' || s === 'não definido') return 'Assinatura';
            if (s.includes('terceir') || s.includes('terceiriza')) return 'Terceirização';
            if (s.includes('assin') || s.includes('subscription') || s.includes('assinatura')) return 'Assinatura';
            if (s.includes('public') || s.includes('públic') || s.includes('publico')) return 'Público';
            if (s.includes('loca') || s.includes('loca\u00e7') || s.includes('aluguel')) return 'Assinatura';
            return 'Assinatura';
        };

        return frota.map((v: AnyObject) => {
            const contrato = contratosMap[normalizePlate(v.Placa ?? v.placa ?? v.plate)];
            return {
                ...v,
                NomeCliente: contrato?.NomeCliente || 'N/A',
                TipoLocacao: mapTipoContratoLocal(contrato?.TipoLocacao || 'N/A'),
                NumeroContratoLocacao: contrato?.NumeroContratoLocacao || v.ContratoAtual || 'N/A',
                SituacaoLocacao: contrato?.SituacaoLocacao || 'N/A',
                DataPrevistaTerminoLocacao: contrato?.DataPrevistaTerminoLocacao || v.DataFimLocacao || null,
                DataEncerramentoLocacao: contrato?.DataEncerramentoLocacao || v.DataFimLocacao || null,
                ValorLocacao: contrato?.ValorLocacao || 0,
            } as typeof v & {
                NomeCliente: string;
                TipoLocacao: string;
                NumeroContratoLocacao: string;
                SituacaoLocacao: string;
                DataPrevistaTerminoLocacao: string | null;
                DataEncerramentoLocacao: string | null;
                ValorLocacao: number;
            };
        });
    }, [frota, contratosMap]);

    const manutencaoMap = useMemo(() => {
        const map: Record<string, number> = {};
        manutencao.forEach((m: any) => {
            const placa = normalizePlate(m.Placa || m.placa);
            if (!placa) return;
            map[placa] = (map[placa] || 0) + parseCurrency(m.CustoTotalOS || m.custototalos || m.ValorTotal || m.valortotal);
        });
        return map;
    }, [manutencao]);

    // use unified chart filter hook (Power BI style)
    const { filters, handleChartClick, clearFilter, clearAllFilters, hasActiveFilters, isValueSelected, getFilterValues, setFilterValues: setFilterValuesBulk, setFiltersBulk } = useChartFilter();

    const applyFilterValues = (key: string, values: string[]) => {
        setFilterValuesBulk(key, values);
        setPage(0);
    };
    // Quando o usuário abrir a aba Telemetria, aplicar por padrão o filtro 'Ativa' na produtividade
    useEffect(() => {
        if (activeTab === 'telemetria') {
            const prod = getFilterValues('productivity');
            if (!prod || prod.length === 0) {
                // aplica 'Ativa' por padrão
                setFilterValuesBulk('productivity', ['Ativa']);
            }
        }
    }, [activeTab, getFilterValues, setFilterValuesBulk]);
    const [page, setPage] = useState(0);
    const pageSize = 10;
    const detailPageSize = 6; // quantos registros carregar por iteração no infinite scroll do detalhe
    const [visibleCount, setVisibleCount] = useState<number>(detailPageSize);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof FleetTableItem; direction: 'asc' | 'desc' } | null>(null);
    const [_timelinePage, _setTimelinePage] = useState(0);
    const [_expandedPlates, _setExpandedPlates] = useState<string[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    const [reservaPage, setReservaPage] = useState(0);
    const [patioPage, setPatioPage] = useState(0);
    void setPatioPage;
    // Plate search state and marker limit (declare early to avoid TDZ in effects)
    const [plateSearch, setPlateSearch] = useState<string>('');
    const plateDebounceRef = useRef<number | null>(null);
    const [markerLimit, setMarkerLimit] = useState<number>(500);
    // (removed main header input; plates are shown as MultiSelect in the filters grid)
    // Slider de período para gráfico de ocupação
    const [sliderRange, setSliderRange] = useState<{ startPercent: number, endPercent: number }>({ startPercent: 0, endPercent: 100 });
    const [isCustomReservaDate, setIsCustomReservaDate] = useState(false);
    const [selectedResumoChart, setSelectedResumoChart] = useState<'motivo' | 'status' | 'tipo' | 'modelo' | 'cliente' | 'local'>('motivo');
    const [expandedYears, setExpandedYears] = useState<string[]>([]);
    const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
    const [selectedTemporalFilter, setSelectedTemporalFilter] = useState<{ year?: string, month?: string } | null>(null); // Filtro temporal ativo
    const [selectedDayForDetail, setSelectedDayForDetail] = useState<string | null>(null); // Dia selecionado para detalhamento de ocupação
    const [reservaUsoSort, setReservaUsoSort] = useState<{ col: string | null; dir: 'asc' | 'desc' }>({ col: null, dir: 'asc' });
    const reservaDefaultQuickRangeAppliedRef = useRef(false);
    // reserva filters are handled via useChartFilter keys: 'reserva_motivo','reserva_cliente','reserva_status','reserva_search'

    const getReservaQuickRangeStartPercent = (days: number): number => {
        if (!reservaDateBounds) return 0;
        const totalMs = reservaDateBounds.maxDate.getTime() - reservaDateBounds.minDate.getTime();
        if (totalMs <= 0) return 0;

        const targetStart = new Date(reservaDateBounds.maxDate);
        targetStart.setHours(0, 0, 0, 0);
        targetStart.setDate(targetStart.getDate() - Math.max(1, days) + 1);

        const clampedStartMs = Math.max(reservaDateBounds.minDate.getTime(), targetStart.getTime());
        const percent = ((clampedStartMs - reservaDateBounds.minDate.getTime()) / totalMs) * 100;
        return Math.max(0, Math.min(100, percent));
    };

    const applyReservaQuickRange = (days: number | null) => {
        const startPercent = days ? getReservaQuickRangeStartPercent(days) : 0;
        setSliderRange({ startPercent, endPercent: 100 });
        setIsCustomReservaDate(false);
        setSelectedTemporalFilter(null);
        setSelectedDayForDetail(null);
    };

    const isReservaQuickRangeActive = (days: number | null): boolean => {
        if (selectedTemporalFilter || isCustomReservaDate) return false;
        if (days === null) return sliderRange.startPercent <= 0.1 && sliderRange.endPercent >= 99.9;
        const expected = getReservaQuickRangeStartPercent(days);
        return Math.abs(sliderRange.startPercent - expected) <= 0.6 && sliderRange.endPercent >= 99.9;
    };

    // apply default filter: restore persisted `productivity` or show 'Ativa' on first load
    useEffect(() => {
        if (frota.length === 0) return;

        try {
            const raw = localStorage.getItem('dashboard_productivity');
            if (raw) {
                const stored: string[] = JSON.parse(raw);
                if (Array.isArray(stored) && stored.length > 0 && getFilterValues('productivity').length === 0) {
                    applyFilterValues('productivity', stored);
                    return;
                }
            }
        } catch (e) { /* ignore parse errors */ }

        if (getFilterValues('productivity').length === 0) {
            // default to 'Ativa' if nothing selected
            applyFilterValues('productivity', ['Ativa']);
        }
    }, [frota]);

    // persist productivity selection to localStorage whenever filters change
    useEffect(() => {
        try {
            const sel = getFilterValues('productivity') || [];
            localStorage.setItem('dashboard_productivity', JSON.stringify(sel));
        } catch (e) { /* ignore */ }
    }, [filters]);

    // Debounce applying plate search locally to the telemetria table
    const [appliedPlateSearch, setAppliedPlateSearch] = useState<string>('');
    useEffect(() => {
        if (plateDebounceRef.current) {
            window.clearTimeout(plateDebounceRef.current);
            plateDebounceRef.current = null;
        }
        plateDebounceRef.current = window.setTimeout(() => {
            const v = (plateSearch || '').trim();
            setAppliedPlateSearch(v);
            plateDebounceRef.current = null;
        }, 300);

        return () => {
            if (plateDebounceRef.current) {
                window.clearTimeout(plateDebounceRef.current);
                plateDebounceRef.current = null;
            }
        };
    }, [plateSearch]);

    // main header search removed: plates are a MultiSelect in the filters grid

    // CLASSIFICAÇÃO DE FROTA
    const normalizeStatus = (value: string) =>
        (value || '')
            .toUpperCase()
            .normalize('NFD')
            .replace(/[^A-Z0-9\s\/]/g, '')
            .trim();

    const getCategory = (status: string) => {
        const s = normalizeStatus(status);
        // Produtiva (inclui variações com/sem acento)
        if (['LOCADO', 'LOCADO VEICULO RESERVA', 'USO INTERNO', 'EM MOBILIZACAO', 'EM MOBILIZACAO'].includes(s)) return 'Produtiva';
        // Inativa
        if ([
            'DEVOLVIDO', 'ROUBO / FURTO', 'BAIXADO', 'VENDIDO', 'SINISTRO PERDA TOTAL',
            'DISPONIVEL PRA VENDA', 'DISPONIVEL PARA VENDA', 'DISPONIVEL PARA VENDA', 'DISPONIVEL PRA VENDA',
            'NAO DISPONIVEL', 'NAO DISPONIVEL', 'NAO DISPONIVEL', 'NAO DISPONIVEL',
            'EM DESMOBILIZACAO'
        ].includes(s)) return 'Inativa';
        return 'Improdutiva';
    };

    const uniqueOptions = useMemo(() => ({
        status: Array.from(new Set(frotaEnriched.map(r => r.Status).filter(Boolean))).sort(),
        modelos: Array.from(new Set(frotaEnriched.map(r => r.Modelo).filter(Boolean))).sort(),
        filiais: Array.from(new Set(frotaEnriched.map(r => r.Filial).filter(Boolean))).sort(),
        clientes: Array.from(new Set(frotaEnriched.map(r => r.NomeCliente).filter((c: string) => c && c !== 'N/A'))).sort(),
        tiposLocacao: Array.from(new Set(frotaEnriched.map(r => r.TipoLocacao).filter((t: string) => t && t !== 'N/A'))).sort(),
        categorias: Array.from(new Set(frotaEnriched.map(r => (r.Categoria || r.GrupoVeiculo)).filter(Boolean))).sort(),
        plates: Array.from(new Set(frotaEnriched.map(r => r.Placa).filter(Boolean))).sort()
    }), [frotaEnriched]);

    const selectAllFilters = () => {
        try {
            setFiltersBulk({
                status: uniqueOptions.status,
                modelo: uniqueOptions.modelos,
                categoria: uniqueOptions.categorias,
                filial: uniqueOptions.filiais,
                cliente: uniqueOptions.clientes,
                tipoLocacao: uniqueOptions.tiposLocacao,
            });
            setPage(0);
        } catch (e) { console.warn('selectAllFilters', e); }
    };

    // note: use `getFilterValues(key)` to read current selections, e.g. getFilterValues('status')

    const [selectedLocation, setSelectedLocation] = useState<{ city: string, uf: string } | null>(null);
    const [geoCollapsed, setGeoCollapsed] = useState<boolean>(true);
    const [localizacaoCollapsed, setLocalizacaoCollapsed] = useState<boolean>(false);
    const [accordionValue, setAccordionValue] = useState<string | null>(null);
    // activeTab already declared at top of component for lazy loading

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
            if (suffixMatch) uf = suffixMatch[1];
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
        } catch (e) { }

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
            'Sol Nascente/pôr Do Sol': 'Brasília',

            // Mapeamentos adicionais solicitados — forçar para Brasília
            'Brasília': 'Brasília',
            'Riacho Fundo Ii': 'Brasília',
            'Riacho Fundo II': 'Brasília',
            'Riacho Fundo Iii': 'Brasília',
            'Arniqueira': 'Brasília',
            'Arniqueiras': 'Brasília',
            'Sobradinho Ii': 'Brasília',
            'Itapoã': 'Brasília',
            'Itapoa': 'Brasília',
            'Brazlândia': 'Brasília',
            'Rua Dos Ipês': 'Brasília',
            'Setor Tradicional': 'Brasília',
            'Cidade De Lucia Costa': 'Brasília',
            'Quadra 35 Conjunto D': 'Brasília',
            'Ville De Montagne - Q 17': 'Brasília',
            'Sudoeste/Octogonal': 'Brasília',
            'Sudoeste/octogonal': 'Brasília',
            'Sudoeste / octogonal': 'Brasília',
            'Condomínio Chácaras Itaipu Chácara 83': 'Brasília',
            'Condominio Chacaras Itaipu Chacara 83': 'Brasília',
            'Varjão': 'Brasília',
            'Edf Smdb Shis Km 274': 'Brasília',
            'Avenida São Sebastião': 'Brasília',
            'Avenida Sao Sebastiao': 'Brasília',
            'Avenida Dom Bosco': 'Brasília',
            'Avenida Rio Tocantins': 'Brasília',
            'Federal District': 'Brasília',
            'Parque E Jardim Paineiras Conjunto 7': 'Brasília'
        };

        if (city.toUpperCase() === 'SÃO PAULO' || city.toUpperCase() === 'OSASCO' || city.toUpperCase() === 'BARUERI') {
            if (uf !== 'SP') uf = 'SP';
        }
        if (city.toUpperCase() === 'RIO DE JANEIRO') if (uf !== 'RJ') uf = 'RJ';
        if (city.toUpperCase() === 'BELO HORIZONTE') if (uf !== 'MG') uf = 'MG';
        // Correções explícitas para municípios do entorno que podem aparecer com referência ao DF
        const upFull = fullAddr.toUpperCase();
        if (upFull.includes('VALPARA') || upFull.includes('VALPARAÍSO')) {
            uf = 'GO';
            city = 'Valparaíso de Goiás';
        } else if (upFull.includes('NOVO GAMA')) {
            uf = 'GO';
            city = 'Novo Gama';
        } else if (upFull.includes('CRISTALINA')) {
            uf = 'GO';
            city = 'Cristalina';
        }

        if (city.toUpperCase() === 'BRASÍLIA' || city.toUpperCase().includes('DISTRITO FEDERAL')) {
            uf = 'DF';
            city = 'Brasília';
        }
        if (city.toUpperCase() === 'GOIÂNIA' || city.toUpperCase() === 'APARECIDA DE GOIÂNIA') if (uf !== 'GO') uf = 'GO';

        city = city.toLowerCase().replace(/(?:^|\s)\S/g, function (a) { return a.toUpperCase(); });
        if (cityCorrections[city]) city = cityCorrections[city];

        return { uf, city };
    };

    // Pré-calcular cidade/UF por veículo (evita regex/string parsing em cada alteração de filtro)
    const frotaWithLocation = useMemo(() => {
        return frotaEnriched.map(r => {
            const loc = extractLocation(r.UltimoEnderecoTelemetria);
            return {
                ...r,
                _city: loc.city,
                _uf: loc.uf,
            } as typeof r & { _city: string; _uf: string };
        });
    }, [frotaEnriched]);

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
        const categoriaFilters = getFilterValues('categoria');

        // Filtros para gráficos da aba Visão Geral
        const odometroFilters = getFilterValues('odometro');
        const idadeFilters = getFilterValues('idade');

        // Filtros para gráficos da aba Telemetria
        const telemetriaFilters = getFilterValues('telemetria');
        const seguroFilters = getFilterValues('seguro');
        const proprietarioFilters = getFilterValues('proprietario');
        const finalidadeFilters = getFilterValues('finalidade');
        const kmDiffFilters = getFilterValues('km_diff');

        return frotaWithLocation.filter(r => {
            const cat = getCategory(r.Status);
            const finalidadeVal = ((r.FinalidadeUso ?? r.finalidadeUso ?? '') as any).toString().trim();
            const isTerceiro = finalidadeVal.toUpperCase() === 'TERCEIRO';
            const wantsTerceiro = prodFilters.includes('Terceiro');

            // Regra global: não considerar terceiros em nenhum dashboard,
            // exceto quando o filtro "Terceiro" estiver explicitamente selecionado.
            if (!wantsTerceiro && isTerceiro) return false;

            if (prodFilters.length > 0) {
                const allowed = new Set<string>();
                if (prodFilters.includes('Ativa')) { allowed.add('Produtiva'); allowed.add('Improdutiva'); }
                if (prodFilters.includes('Produtiva')) allowed.add('Produtiva');
                if (prodFilters.includes('Improdutiva')) allowed.add('Improdutiva');
                if (prodFilters.includes('Inativa')) allowed.add('Inativa');

                if (wantsTerceiro) {
                    // If user selected only 'Terceiro', require FinalidadeUso==='Terceiro'
                    if (allowed.size === 0) {
                        if (!isTerceiro) return false;
                    } else {
                        // If 'Terceiro' plus other categories selected, allow when either matches category OR is Terceiro
                        if (!isTerceiro && !allowed.has(cat)) return false;
                    }
                } else {
                    if (!allowed.has(cat)) return false;
                }
            }

            if (statusFilters.length > 0 && !statusFilters.includes(r.Status)) return false;
            if (modeloFilters.length > 0 && !modeloFilters.includes(r.Modelo)) return false;
            if (filialFilters.length > 0 && !filialFilters.includes(r.Filial)) return false;
            if (clienteFilters.length > 0 && !clienteFilters.includes(r.NomeCliente)) return false;
            if (tipoLocacaoFilters.length > 0 && !tipoLocacaoFilters.includes(r.TipoLocacao)) return false;

            // Filtro de categoria
            if (categoriaFilters.length > 0) {
                const categoria = r.Categoria || r.GrupoVeiculo || 'Outros';
                if (!categoriaFilters.includes(categoria)) return false;
            }

            if (patioFilters.length > 0 && !patioFilters.includes(r.Patio)) return false;

            // Filtra por seleção de localização (quando usuário clica no mapa/accordion)
            if (selectedLocation) {
                if ((r as any)._uf !== selectedLocation.uf || (r as any)._city !== selectedLocation.city) return false;
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

            // Filtro de odômetro (clique no gráfico de classificação por odômetro)
            if (odometroFilters.length > 0) {
                const km = parseNum(r.KmConfirmado);
                const ok = odometroFilters.some((of: string) => {
                    if (of === '0-10k') return km < 10000;
                    if (of === '10k-20k') return km >= 10000 && km < 20000;
                    if (of === '20k-30k') return km >= 20000 && km < 30000;
                    if (of === '30k-40k') return km >= 30000 && km < 40000;
                    if (of === '40k-50k') return km >= 40000 && km < 50000;
                    if (of === '50k-60k') return km >= 50000 && km < 60000;
                    if (of === '60k-70k') return km >= 60000 && km < 70000;
                    if (of === '70k-80k') return km >= 70000 && km < 80000;
                    if (of === '80k-90k') return km >= 80000 && km < 90000;
                    if (of === '90k-100k') return km >= 90000 && km < 100000;
                    if (of === '100k-110k') return km >= 100000 && km < 110000;
                    if (of === '110k-120k') return km >= 110000 && km < 120000;
                    if (of === '120k+') return km >= 120000;
                    return false;
                });
                if (!ok) return false;
            }

            // Filtro de idade (clique no gráfico de classificação por idade)
            if (idadeFilters.length > 0) {
                const idade = parseNum(r.IdadeVeiculo);
                const ok = idadeFilters.some((idf: string) => {
                    if (idf === '0-12m') return idade < 12;
                    if (idf === '12-24m') return idade >= 12 && idade < 24;
                    if (idf === '24-36m') return idade >= 24 && idade < 36;
                    if (idf === '36-48m') return idade >= 36 && idade < 48;
                    if (idf === '48-60m') return idade >= 48 && idade < 60;
                    if (idf === '60m+') return idade >= 60;
                    return false;
                });
                if (!ok) return false;
            }

            // Filtro de provedor de telemetria
            if (telemetriaFilters.length > 0) {
                const provedor = normalizeTelemetriaProvider(r.ProvedorTelemetria);
                if (!telemetriaFilters.includes(provedor)) return false;
            }

            // Filtro de seguro
            if (seguroFilters.length > 0) {
                const seguro = classifySeguro(r.ComSeguroVigente);
                if (!seguroFilters.includes(seguro)) return false;
            }

            // Filtro de proprietário
            if (proprietarioFilters.length > 0) {
                const prop = sanitizeText(r.Proprietario || 'Não Definido') || 'Não Definido';
                if (!proprietarioFilters.includes(prop)) return false;
            }

            // Filtro de finalidade de uso
            if (finalidadeFilters.length > 0) {
                const finalidade = sanitizeText((r.FinalidadeUso ?? r.finalidadeUso ?? 'Não Definido') as any).toUpperCase() || 'Não Definido';
                if (!finalidadeFilters.includes(finalidade)) return false;
            }

            // Filtro de diferença de KM
            if (kmDiffFilters.length > 0) {
                const diff = Math.abs(parseNum(r.KmInformado) - parseNum(r.KmConfirmado));
                const ok = kmDiffFilters.some((kf: string) => {
                    if (kf === 'Sem Divergência') return diff === 0;
                    if (kf === 'Baixa (<1k)') return diff > 0 && diff <= 1000;
                    if (kf === 'Média (1k-5k)') return diff > 1000 && diff <= 5000;
                    if (kf === 'Alta (>5k)') return diff > 5000;
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
    }, [frotaWithLocation, filters, getFilterValues, selectedLocation]);

    // Base específica para os gráficos de odômetro/idade:
    // aplica todos os filtros globais, exceto os próprios filtros de odômetro/idade,
    // para evitar auto-filtragem visual (todas as barras aparentando zero fora da faixa clicada).
    const filteredForOdometroChart = useMemo(() => {
        const prodFilters = getFilterValues('productivity');
        const statusFilters = getFilterValues('status');
        const modeloFilters = getFilterValues('modelo');
        const filialFilters = getFilterValues('filial');
        const patioFilters = getFilterValues('patio');
        const agingFilters = getFilterValues('aging');
        const search = (getFilterValues('search') || [])[0] || '';

        const clienteFilters = getFilterValues('cliente');
        const tipoLocacaoFilters = getFilterValues('tipoLocacao');
        const categoriaFilters = getFilterValues('categoria');

        const telemetriaFilters = getFilterValues('telemetria');
        const seguroFilters = getFilterValues('seguro');
        const proprietarioFilters = getFilterValues('proprietario');
        const finalidadeFilters = getFilterValues('finalidade');
        const kmDiffFilters = getFilterValues('km_diff');

        return frotaWithLocation.filter(r => {
            const cat = getCategory(r.Status);
            const finalidadeVal = ((r.FinalidadeUso ?? r.finalidadeUso ?? '') as any).toString().trim();
            const isTerceiro = finalidadeVal.toUpperCase() === 'TERCEIRO';
            const wantsTerceiro = prodFilters.includes('Terceiro');

            if (!wantsTerceiro && isTerceiro) return false;

            if (prodFilters.length > 0) {
                const allowed = new Set<string>();
                if (prodFilters.includes('Ativa')) { allowed.add('Produtiva'); allowed.add('Improdutiva'); }
                if (prodFilters.includes('Produtiva')) allowed.add('Produtiva');
                if (prodFilters.includes('Improdutiva')) allowed.add('Improdutiva');
                if (prodFilters.includes('Inativa')) allowed.add('Inativa');

                if (wantsTerceiro) {
                    if (allowed.size === 0) {
                        if (!isTerceiro) return false;
                    } else {
                        if (!isTerceiro && !allowed.has(cat)) return false;
                    }
                } else {
                    if (!allowed.has(cat)) return false;
                }
            }

            if (statusFilters.length > 0 && !statusFilters.includes(r.Status)) return false;
            if (modeloFilters.length > 0 && !modeloFilters.includes(r.Modelo)) return false;
            if (filialFilters.length > 0 && !filialFilters.includes(r.Filial)) return false;
            if (clienteFilters.length > 0 && !clienteFilters.includes(r.NomeCliente)) return false;
            if (tipoLocacaoFilters.length > 0 && !tipoLocacaoFilters.includes(r.TipoLocacao)) return false;

            if (categoriaFilters.length > 0) {
                const categoria = r.Categoria || r.GrupoVeiculo || 'Outros';
                if (!categoriaFilters.includes(categoria)) return false;
            }

            if (patioFilters.length > 0 && !patioFilters.includes(r.Patio)) return false;

            if (selectedLocation) {
                if ((r as any)._uf !== selectedLocation.uf || (r as any)._city !== selectedLocation.city) return false;
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

            if (telemetriaFilters.length > 0) {
                const provedor = normalizeTelemetriaProvider(r.ProvedorTelemetria);
                if (!telemetriaFilters.includes(provedor)) return false;
            }

            if (seguroFilters.length > 0) {
                const seguro = classifySeguro(r.ComSeguroVigente);
                if (!seguroFilters.includes(seguro)) return false;
            }

            if (proprietarioFilters.length > 0) {
                const prop = sanitizeText(r.Proprietario || 'Não Definido') || 'Não Definido';
                if (!proprietarioFilters.includes(prop)) return false;
            }

            if (finalidadeFilters.length > 0) {
                const finalidade = sanitizeText((r.FinalidadeUso ?? r.finalidadeUso ?? 'Não Definido') as any).toUpperCase() || 'Não Definido';
                if (!finalidadeFilters.includes(finalidade)) return false;
            }

            if (kmDiffFilters.length > 0) {
                const diff = Math.abs(parseNum(r.KmInformado) - parseNum(r.KmConfirmado));
                const ok = kmDiffFilters.some((kf: string) => {
                    if (kf === 'Sem Divergência') return diff === 0;
                    if (kf === 'Baixa (<1k)') return diff > 0 && diff <= 1000;
                    if (kf === 'Média (1k-5k)') return diff > 1000 && diff <= 5000;
                    if (kf === 'Alta (>5k)') return diff > 5000;
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
    }, [frotaWithLocation, filters, getFilterValues, selectedLocation]);

    const kpis = useMemo(() => {
        const total = filteredData.length;
        const produtiva = filteredData.filter(r => getCategory(r.Status) === 'Produtiva');
        const improdutiva = filteredData.filter(r => {
            const finalidadeVal = ((r.FinalidadeUso ?? r.finalidadeUso ?? '') as any).toString().trim();
            return getCategory(r.Status) === 'Improdutiva' && finalidadeVal.toUpperCase() !== 'TERCEIRO';
        });
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
            const manut = manutencaoMap[normalizePlate(r.Placa)] || 0;
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
            const passagens = manutencaoMap[normalizePlate(r.Placa)] ? 1 : 0; // simplificado - presença de manutenção
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
        const impro = filteredData.filter(r => {
            const finalidadeVal = ((r.FinalidadeUso ?? r.finalidadeUso ?? '') as any).toString().trim();
            return getCategory(r.Status) === 'Improdutiva' && finalidadeVal.toUpperCase() !== 'TERCEIRO';
        });
        impro.forEach(r => { const s = r.Status || 'Não Definido'; map[s] = (map[s] || 0) + 1; });
        const total = impro.length || 1;
        return Object.entries(map).map(([name, value]) => ({ name, value, pct: (value / total) * 100 })).sort((a, b) => b.value - a.value);
    }, [filteredData]);

    // Breakdown of 'Produtiva' sub-statuses
    const produtivaBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        const prod = filteredData.filter(r => getCategory(r.Status) === 'Produtiva');
        prod.forEach(r => { const s = r.Status || 'Não Definido'; map[s] = (map[s] || 0) + 1; });
        const total = prod.length || 1;
        return Object.entries(map).map(([name, value]) => ({ name, value, pct: (value / total) * 100 })).sort((a, b) => b.value - a.value);
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

    const stableJitter = (seed: string, scale: number) => {
        // hash simples e determinístico para gerar jitter estável por placa
        let h = 0;
        for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
        const x = Math.sin(h) * 10000;
        return ((x - Math.floor(x)) - 0.5) * scale;
    };

    const mapData = useMemo(() => {
        const mapped = filteredData.map(r => {
            let lat = parseNum(r.Latitude);
            let lng = parseNum(r.Longitude);

            const city = (r as any)._city as string | undefined;
            const uf = (r as any)._uf as string | undefined;

            // Fallback para cidades conhecidas se GPS zerado/ausente
            if ((!lat || !lng || (lat === 0 && lng === 0)) && city && cityCoordinates[city]) {
                const [cLat, cLng] = cityCoordinates[city];
                const seed = String((r as any).Placa ?? '') || `${city}-${uf ?? ''}`;
                lat = cLat + stableJitter(seed + ':lat', 0.02);
                lng = cLng + stableJitter(seed + ':lng', 0.02);
            }

            return {
                ...r,
                _lat: lat,
                _lng: lng,
                _city: city ?? 'Não Identificado',
                _uf: uf ?? 'ND'
            } as typeof r & { _lat: number; _lng: number; _city: string; _uf: string };
        });

        const coordsValid = mapped.filter(r => isFinite(r._lat) && isFinite(r._lng) && r._lat !== 0 && r._lng !== 0);

        if (!selectedLocation) return coordsValid;

        // Caso especial: seleção "Não classificados" deve mostrar veículos com telemetria
        // que não tiveram uf/cidade extraídos (uf === 'ND' ou endereço ausente).
        if (selectedLocation.uf === 'ND' && selectedLocation.city === 'Não classificados') {
            return mapped.filter(r => (
                r.ProvedorTelemetria && r.ProvedorTelemetria !== 'NÃO DEFINIDO' && r.ProvedorTelemetria !== 'Não Definido'
            ) && (
                    !r.UltimoEnderecoTelemetria || (r._uf && r._uf === 'ND')
                ));
        }

        return coordsValid.filter(r => r._city === selectedLocation.city && r._uf === selectedLocation.uf);
    }, [filteredData, selectedLocation]);

    // Veículos com telemetria (pré-calculado e utilizado por outros agregados)
    const veiculosComTelemetria = useMemo(() => {
        return filteredData.filter(r =>
            r.ProvedorTelemetria &&
            r.ProvedorTelemetria !== 'NÃO DEFINIDO' &&
            r.ProvedorTelemetria !== 'Não Definido'
        );
    }, [filteredData]);

    // Calcular diferenças de odômetro considerando apenas veículos com telemetria
    const kmDifferenceData = useMemo(() => {
        const ranges = { 'Sem Divergência': 0, 'Baixa (<1k)': 0, 'Média (1k-10k)': 0, 'Alta (>10k)': 0 };
        veiculosComTelemetria.forEach(r => {
            const diff = Math.abs(parseNum(r.KmInformado) - parseNum(r.KmConfirmado));
            if (diff === 0) ranges['Sem Divergência']++;
            else if (diff <= 1000) ranges['Baixa (<1k)']++;
            else if (diff <= 10000) ranges['Média (1k-10k)']++;
            else ranges['Alta (>10k)']++;
        });
        return Object.entries(ranges).map(([name, value]) => ({ name, value }));
    }, [veiculosComTelemetria]);

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
        const data: Array<{ name: string; label: string; value: number; isCategory?: boolean; categoria?: string }> = [];

        modelosPorCategoria.forEach(({ categoria, total, modelos }) => {
            // Adiciona a linha da categoria
            data.push({
                name: categoria,
                label: categoria,
                value: total,
                isCategory: true,
                categoria
            });

            // Se expandida, adiciona os modelos
            if (expandedCategories.includes(categoria)) {
                modelos.forEach(modelo => {
                    data.push({
                        name: modelo.name,
                        label: `- ${modelo.name}`,
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

        filteredForOdometroChart.forEach(r => {
            const km = parseNum(r.KmConfirmado);
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
    }, [filteredForOdometroChart]);

    // Toggle view for odometer card: 'odometro' or 'idade' (idade em meses)
    const [odometroView, setOdometroView] = useState<'odometro' | 'idade'>('odometro');

    // Distribuição por faixa de idade (12 em 12 meses até 48+)
    const idadeFaixaData = useMemo(() => {
        const ranges: Record<string, number> = {
            '0-12m': 0,
            '13-24m': 0,
            '25-36m': 0,
            '37-48m': 0,
            '48m+': 0
        };
        filteredForOdometroChart.forEach(r => {
            const idade = parseNum(r.IdadeVeiculo);
            if (idade <= 12) ranges['0-12m']++;
            else if (idade <= 24) ranges['13-24m']++;
            else if (idade <= 36) ranges['25-36m']++;
            else if (idade <= 48) ranges['37-48m']++;
            else ranges['48m+']++;
        });
        return Object.entries(ranges).map(([name, value]) => ({ name, value }));
    }, [filteredForOdometroChart]);

    // ANÁLISES DE TELEMETRIA
    const telemetriaData = useMemo(() => {
        const map: Record<string, number> = {};
        filteredData.forEach(r => {
            const provedor = normalizeTelemetriaProvider(r.ProvedorTelemetria);
            map[provedor] = (map[provedor] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
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
            map[classifySeguro(r.ComSeguroVigente)]++;
        });

        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [filteredData]);

    const proprietarioData = useMemo(() => {
        const map: Record<string, number> = {};
        filteredData.forEach(r => {
            const prop = sanitizeText(r.Proprietario || 'Não Definido') || 'Não Definido';
            map[prop] = (map[prop] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredData]);

    const finalidadeData = useMemo(() => {
        const map: Record<string, number> = {};
        filteredData.forEach(r => {
            const finalidade = sanitizeText((r.FinalidadeUso ?? r.finalidadeUso ?? 'Não Definido') as any).toUpperCase() || 'Não Definido';
            map[finalidade] = (map[finalidade] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredData]);

    const veiculosLocalizaveisKpi = useMemo(() => {
        return filteredData.filter(r => {
            const lat = parseNum(r.Latitude);
            const lng = parseNum(r.Longitude);
            return isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0;
        }).length;
    }, [filteredData]);

    const veiculosPorClienteData = useMemo(() => {
        const map: Record<string, number> = {};
        filteredData.forEach(r => {
            const cliente = r.NomeCliente || 'N/A';
            if (cliente !== 'N/A') {
                map[cliente] = (map[cliente] || 0) + 1;
            }
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredData]);

    // Alturas para scroll vertical: mostrar 10 itens por vez
    const veiculosItemHeight = 36; // altura por linha/barras
    const veiculosVisibleItems = 10; // quantos itens visíveis por vez
    const veiculosContainerHeight = Math.min(veiculosPorClienteData.length, veiculosVisibleItems) * veiculosItemHeight + 80; // +80 para padding/título
    const veiculosChartHeight = Math.max(veiculosPorClienteData.length * veiculosItemHeight + 40, veiculosContainerHeight);

    // Renderer customizado para rótulos: coloca dentro da barra se houver espaço,
    // caso contrário posiciona à direita fora da barra com cor escura.
    const renderVeiculoLabel = (props: any) => {
        const { x, y, width = 0, height = 0, value } = props;
        const padding = 8;
        const fontSize = 12;
        const textY = y + height / 2 + 4;
        // threshold em pixels para decidir se o label cabe dentro da barra
        const insideThreshold = 40;
        if ((width as number) >= insideThreshold) {
            return (
                <text x={x + (width as number) - padding} y={textY} fill="#0f172a" fontSize={fontSize} textAnchor="end" dominantBaseline="middle">
                    {value}
                </text>
            );
        }
        return (
            <text x={x + (width as number) + padding} y={textY} fill="#0f172a" fontSize={fontSize} dominantBaseline="middle">
                {value}
            </text>
        );
    };

    const localizacaoHierarquica = useMemo(() => {
        const hierarquia: Record<string, Record<string, number>> = {};
        const totalByUF: Record<string, number> = {};
        let unclassifiedTotal = 0;
        const hasTracker = (r: any) => {
            const prov = (r.ProvedorTelemetria || '').toString().trim();
            const hasTelemetria = prov && prov.toUpperCase() !== 'NÃO DEFINIDO' && prov.toUpperCase() !== 'N/A';
            const hasLastUpdate = !!(r.UltimaAtualizacaoTelemetria || r.UltimaAtualizacaoTelemetria === 0);
            const hasCoords = isFinite(parseNum(r.Latitude)) && isFinite(parseNum(r.Longitude)) && parseNum(r.Latitude) !== 0 && parseNum(r.Longitude) !== 0;
            return hasTelemetria && (hasLastUpdate || hasCoords);
        };

        filteredData.forEach(r => {
            if (!hasTracker(r)) return;

            const raw = r.UltimoEnderecoTelemetria;
            if (!raw) {
                unclassifiedTotal++;
                return;
            }
            const { uf, city } = extractLocation(raw);

            if (uf !== 'ND') {
                if (!hierarquia[uf]) hierarquia[uf] = {};
                hierarquia[uf][city] = (hierarquia[uf][city] || 0) + 1;
                totalByUF[uf] = (totalByUF[uf] || 0) + 1;
            } else {
                unclassifiedTotal++;
            }
        });

        const sortedUFs = Object.entries(totalByUF)
            .sort((a, b) => b[1] - a[1])
            .map(([uf, total]) => ({
                uf,
                total,
                cities: Object.entries(hierarquia[uf])
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value)
            }));

        // Se houver veículos não classificados, adicionar ao final como grupo separado
        if (unclassifiedTotal > 0) {
            sortedUFs.push({
                uf: 'ND',
                total: unclassifiedTotal,
                cities: [{ name: 'Não classificados', value: unclassifiedTotal }]
            });
        }

        return sortedUFs;
    }, [filteredData]);

    const naoClassificadosPlacas = useMemo(() => {
        const placas: string[] = [];
        filteredData.forEach(r => {
            const prov = (r.ProvedorTelemetria || '').toString().trim();
            const hasTelemetria = prov && prov.toUpperCase() !== 'NÃO DEFINIDO' && prov.toUpperCase() !== 'N/A';
            // Considerar rastreador instalado somente quando há provedor válido E
            // há alguma telemetria recente ou coordenadas conhecidas.
            const hasLastUpdate = !!(r.UltimaAtualizacaoTelemetria || r.UltimaAtualizacaoTelemetria === 0);
            const hasCoords = isFinite(parseNum(r.Latitude)) && isFinite(parseNum(r.Longitude)) && parseNum(r.Latitude) !== 0 && parseNum(r.Longitude) !== 0;
            if (!hasTelemetria || (!hasLastUpdate && !hasCoords)) return; // sem rastreador/telemetria, ignorar

            const raw = r.UltimoEnderecoTelemetria;
            if (!raw) {
                if (r.Placa) placas.push(r.Placa);
                return;
            }
            const { uf } = extractLocation(raw);
            if (uf === 'ND' && r.Placa) placas.push(r.Placa);
        });
        return Array.from(new Set(placas)).sort();
    }, [filteredData]);

    const handleLocationClick = (uf: string, city: string | null) => {
        if (selectedLocation && selectedLocation.uf === uf && selectedLocation.city === city) {
            setSelectedLocation(null);
        } else if (city) {
            setSelectedLocation({ uf, city });
            setTimeout(() => {
                const mapEl = document.querySelector('.leaflet-container');
                if (mapEl) {
                    mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    };

    // ANÁLISE DE PÁTIO - vehiclesDetailed moved here (after filteredData is defined)
    const vehiclesDetailed = useMemo(() => {
        // removed inner duplicate - using top-level `getCategory`

        // Use filteredData (respects global filters) and only show Improdutiva (exclude 'Terceiro')
        const checkDate = new Date();
        checkDate.setHours(23, 59, 59, 999);
        const improdutivos = filteredData.filter(v => getCategory(v.Status) === 'Improdutiva' && ((v.FinalidadeUso || '').toString().toUpperCase() !== 'TERCEIRO'));
        return improdutivos.map(v => {
            const placaAtual = normalizePlate(v.Placa);
            const movPatio = (patioMov || []).filter((m: any) => {
                if (normalizePlate(m?.Placa) !== placaAtual) return false;
                const movDate = parseBIDate(m?.DataMovimentacao);
                return !!movDate && movDate.getTime() <= checkDate.getTime();
            }).sort((a: any, b: any) => {
                const dateA = parseBIDate(a?.DataMovimentacao)?.getTime() || 0;
                const dateB = parseBIDate(b?.DataMovimentacao)?.getTime() || 0;
                return dateB - dateA;
            });
            const ultimoMovPatio = movPatio[0];

            const movVeiculo = (veiculoMov || []).filter((m: any) => {
                if (normalizePlate(m?.Placa) !== placaAtual) return false;
                const refDate = parseBIDate(m?.DataDevolucao || m?.DataRetirada);
                return !!refDate && refDate.getTime() <= checkDate.getTime();
            }).sort((a: any, b: any) => {
                const dateA = parseBIDate(a?.DataDevolucao || a?.DataRetirada)?.getTime() || 0;
                const dateB = parseBIDate(b?.DataDevolucao || b?.DataRetirada)?.getTime() || 0;
                return dateB - dateA;
            });
            const ultimaLocacao = movVeiculo[0];

            const ultimaDataPatio = parseBIDate(ultimoMovPatio?.DataMovimentacao);
            const ultimaDataDevolucao = parseBIDate(ultimaLocacao?.DataDevolucao);
            const dataMaisRecente = [ultimaDataPatio, ultimaDataDevolucao]
                .filter((d): d is Date => !!d)
                .sort((a, b) => b.getTime() - a.getTime())[0] || null;

            const dataInicioStatusHistorico = resolveStatusStartForDate(placaAtual, checkDate, String(v.Status || ''));
            const dataInicioStatusDate = dataInicioStatusHistorico || dataMaisRecente;
            const dataInicioStatus = dataInicioStatusDate ? dataInicioStatusDate.toISOString() : null;

            let diasNoStatus = 0;
            if (dataInicioStatusDate) {
                const hoje = normalizeLocalDay(new Date());
                const inicio = normalizeLocalDay(dataInicioStatusDate);
                diasNoStatus = Math.floor((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
            }

            const patio = ultimoMovPatio?.Patio || v.Patio || v.Localizacao || 'Sem pátio';

            return {
                Placa: v.Placa,
                Modelo: v.Modelo || 'N/A',
                Status: v.Status || 'N/A',
                Patio: patio,
                DiasNoStatus: Math.max(0, diasNoStatus),
                DataInicioStatus: dataInicioStatus || null,
                UltimaMovimentacao: dataMaisRecente ? dataMaisRecente.toISOString() : '-',
                UsuarioMovimentacao: ultimoMovPatio?.UsuarioMovimentacao || '-'
            };
        });
    }, [filteredData, patioMov, veiculoMov, historicoMap]);

    // Tabela: estado de ordenação e lista ordenada
    const [sortState, setSortState] = useState<{ col: string | null; dir: 'asc' | 'desc' }>({ col: 'Placa', dir: 'asc' });

    const toggleSort = (col: string) => {
        setSortState(s => {
            if (s.col === col) return { col, dir: s.dir === 'asc' ? 'desc' : 'asc' };
            return { col, dir: 'asc' };
        });
    };

    const sortedVehicles = useMemo(() => {
        const arr = [...vehiclesDetailed];
        if (!sortState.col) return arr;
        const col = sortState.col;
        arr.sort((a: any, b: any) => {
            const va = a[col];
            const vb = b[col];

            // Datas
            if (col === 'DataInicioStatus' || col === 'UltimaMovimentacao') {
                const da = a[col] ? new Date(a[col]).getTime() : 0;
                const db = b[col] ? new Date(b[col]).getTime() : 0;
                return (da - db) * (sortState.dir === 'asc' ? 1 : -1);
            }

            // Números
            if (typeof va === 'number' || typeof vb === 'number') {
                return ((va || 0) - (vb || 0)) * (sortState.dir === 'asc' ? 1 : -1);
            }

            // Strings (comparação localizada, com números embutidos)
            return String(va || '').localeCompare(String(vb || ''), 'pt-BR', { numeric: true }) * (sortState.dir === 'asc' ? 1 : -1);
        });
        return arr;
    }, [vehiclesDetailed, sortState]);

    const agingData = useMemo(() => {
        const ranges = { '0-30 dias': 0, '31-60 dias': 0, '61-90 dias': 0, '90+ dias': 0 };
        vehiclesDetailed.forEach(v => {
            // Aging considera apenas veículos com data de início de status conhecida.
            if (!v.DataInicioStatus) return;
            const dias = v.DiasNoStatus;
            if (dias <= 30) ranges['0-30 dias']++;
            else if (dias <= 60) ranges['31-60 dias']++;
            else if (dias <= 90) ranges['61-90 dias']++;
            else ranges['90+ dias']++;
        });
        return Object.entries(ranges).map(([name, value]) => ({ name, value }));
    }, [vehiclesDetailed]);

    const patioData = useMemo(() => {
        const map: Record<string, number> = {};
        vehiclesDetailed.forEach(v => {
            const patio = v.Patio;
            map[patio] = (map[patio] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [vehiclesDetailed]);

    const statusImprodutivoData = useMemo(() => {
        const map: Record<string, number> = {};
        vehiclesDetailed.forEach(v => {
            const status = v.Status;
            map[status] = (map[status] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [vehiclesDetailed]);

    // stuckVehicles - disponível para uso futuro em tabela de veículos parados
    // const stuckVehicles = useMemo(() => {
    //     return filteredData
    //       .filter(r => getCategory(r.Status) === 'Improdutiva')
    //       .sort((a, b) => parseNum(b.DiasNoStatus) - parseNum(a.DiasNoStatus))
    //       .slice(0, 10);
    // }, [filteredData]);

    // CARRO RESERVA ANALYTICS
    const reservaUniqueOptions = useMemo(() => ({
        motivos: Array.from(new Set(carroReservaFiltered.map(r => r.Motivo).filter(Boolean))).sort(),
        clientes: Array.from(new Set(carroReservaFiltered.map(r => r.Cliente).filter(Boolean))).sort(),
        statuses: Array.from(new Set(carroReservaFiltered.map(r => getReservaStatusOperacional(r as AnyObject)).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
    }), [carroReservaFiltered]);

    const setReservaFilterValues = (key: string, values: string[]) => {
        // translate key names to use chart filter storage
        const mapKey = key === 'motivo' ? 'reserva_motivo' : key === 'cliente' ? 'reserva_cliente' : key === 'status' ? 'reserva_status' : 'reserva_search';
        applyFilterValues(mapKey, values);
        setReservaPage(0);
    };

    // Calcular min/max dates do histórico de reservas ANTES de filteredReservas
    const reservaDateBounds = useMemo(() => {
        if (carroReservaFiltered.length === 0) return null;

        let minDate: Date | null = null;
        let maxDate: Date | null = null;
        let hasActiveReserva = false;

        carroReservaFiltered.forEach(r => {
            if (r.DataInicio) {
                const di = new Date(r.DataInicio);
                if (!minDate || di < minDate) minDate = di;
            }
            if (r.DataFim) {
                const df = new Date(r.DataFim);
                if (!maxDate || df > maxDate) maxDate = df;
            }
            if (isReservaAtiva(r as AnyObject)) hasActiveReserva = true;
        });

        // Se há reservas ativas OU não há maxDate, usar hoje como máximo
        const hoje = new Date();
        let finalMaxDate = hoje;

        if (!hasActiveReserva && maxDate) {
            const mDate = maxDate as Date;
            if (mDate.getTime() > hoje.getTime()) {
                finalMaxDate = mDate;
            }
        }

        // Garantir que minDate existe - se for carregamento inicial sem dados, usar 4 anos atrás para cobrir histórico 2022
        const finalMinDate = minDate || new Date(finalMaxDate.getTime() - (4 * 365 * 24 * 60 * 60 * 1000));

        finalMinDate.setHours(0, 0, 0, 0);
        finalMaxDate.setHours(23, 59, 59, 999);

        return { minDate: finalMinDate, maxDate: finalMaxDate };
    }, [carroReservaFiltered]);

    useEffect(() => {
        if (reservaDefaultQuickRangeAppliedRef.current) return;
        if (!reservaDateBounds) return;

        applyReservaQuickRange(30);
        reservaDefaultQuickRangeAppliedRef.current = true;
    }, [reservaDateBounds]);

    const filteredReservas = useMemo(() => {
        const motivos = getFilterValues('reserva_motivo');
        const clientes = getFilterValues('reserva_cliente');
        const modelosSel = getFilterValues('reserva_modelo');
        const statuses = getFilterValues('reserva_status');
        const tiposVeiculo = getFilterValues('reserva_tipo');
        const locais = getFilterValues('reserva_local');
        const search = (getFilterValues('reserva_search') || [])[0] || '';

        // Filtrar pelo período do slider
        if (!reservaDateBounds) return [];
        const { minDate, maxDate } = reservaDateBounds;
        const totalMs = maxDate.getTime() - minDate.getTime();
        const dataInicio = new Date(minDate.getTime() + (totalMs * sliderRange.startPercent / 100));
        const dataFim = new Date(minDate.getTime() + (totalMs * sliderRange.endPercent / 100));
        dataInicio.setHours(0, 0, 0, 0);
        dataFim.setHours(23, 59, 59, 999);

        const activeFilter = (getFilterValues('reserva_ativo') || [])[0];

        return carroReservaFiltered.filter(r => {
            // Filtro de Ativas vs Todas (Solicitado pelo usuário)
            const statusCategoria = getReservaStatusCategoria(r as AnyObject);
            const concluded = statusCategoria === 'Concluída';
            const isActive = isReservaAtiva(r as AnyObject);

            if (activeFilter === 'Ativas' && !isActive) return false;
            if (activeFilter === 'Concluídas' && !concluded) return false;

            // Filtro de período (slider)
            if (r.DataInicio) {
                const di = new Date(r.DataInicio);
                const df = getReservaFimOperacional(r as AnyObject);
                // Incluir se há sobreposição com o período selecionado
                if (!(di <= dataFim && df >= dataInicio)) return false;
            }

            // Filtro temporal (clique em ano/mês na evolução)
            if (selectedTemporalFilter && r.DataCriacao) {
                const dataCriacao = new Date(r.DataCriacao);
                const year = dataCriacao.getFullYear().toString();
                const month = String(dataCriacao.getMonth() + 1).padStart(2, '0');

                if (selectedTemporalFilter.year && year !== selectedTemporalFilter.year) return false;
                if (selectedTemporalFilter.month && month !== selectedTemporalFilter.month) return false;
            }

            if (modelosSel.length > 0 && !modelosSel.includes(r.ModeloReserva)) return false;
            if (motivos.length > 0 && !motivos.includes(r.Motivo)) return false;
            if (clientes.length > 0 && !clientes.includes(r.Cliente)) return false;
            if (statuses.length > 0) {
                const categoria = (r as AnyObject).StatusCategoria || getReservaStatusCategoria(r as AnyObject);
                const statusOperacional = getReservaStatusOperacional(r as AnyObject);
                if (!statuses.includes(categoria) && !statuses.includes(statusOperacional)) return false;
            }

            // Filtro de tipo de veículo (clique no gráfico Tipo Veículo)
            if (tiposVeiculo.length > 0) {
                const tipo = String(r.TipoVeiculoTemporario || r.Tipo || 'Não Definido');
                if (!tiposVeiculo.includes(tipo)) return false;
            }

            // Filtro de localização (clique no gráfico Diárias por Local)
            if (locais.length > 0) {
                const city = (r.Cidade || 'Não Identificado').trim();
                const uf = (r.Estado || '').trim();
                const key = uf ? `${city} / ${uf}` : city;
                if (!locais.includes(key)) return false;
            }

            if (search) {
                const term = search.toLowerCase();
                if (!r.PlacaReserva?.toLowerCase().includes(term) && !r.Cliente?.toLowerCase().includes(term) && !r.IdOcorrencia?.toLowerCase().includes(term)) return false;
            }
            return true;
        });
    }, [carroReservaFiltered, filters, getFilterValues, sliderRange, reservaDateBounds, selectedTemporalFilter]);

    const reservaKPIs = useMemo(() => {
        const total = filteredReservas.length;
        // Ativa = sem data de conclusão e não cancelada (conforme explicado ao usuário)
        const ativas = filteredReservas.filter(r => isReservaAtiva(r as AnyObject)).length;

        const motivoMap: Record<string, number> = {};
        filteredReservas.forEach(r => { const m = r.Motivo || 'Não Definido'; motivoMap[m] = (motivoMap[m] || 0) + 1; });
        const principalMotivo = Object.entries(motivoMap).sort((a, b) => b[1] - a[1])[0];

        const clienteMap: Record<string, number> = {};
        filteredReservas.forEach(r => { const c = r.Cliente || 'Não Definido'; clienteMap[c] = (clienteMap[c] || 0) + 1; });
        const clienteData = Object.entries(clienteMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        const motivoData = Object.entries(motivoMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        const statusMap: Record<string, number> = {};
        filteredReservas.forEach(r => {
            const s = getReservaStatusOperacional(r as AnyObject);
            statusMap[s] = (statusMap[s] || 0) + 1;
        });
        const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        // Tempo médio de reserva (Concluídas)
        const concluidas = filteredReservas.filter(r => {
            const hasDates = r.DataInicio && r.DataFim;
            return getReservaStatusCategoria(r as AnyObject) === 'Concluída' && hasDates;
        });

        const tempoMedioConcluidas = concluidas.length > 0 ? concluidas.reduce((sum, r) => {
            let dias = Number(r.DiariasEfetivas) || 0;
            if (dias === 0 && r.DataInicio && r.DataDevolucao) {
                dias = (new Date(r.DataDevolucao).getTime() - new Date(r.DataInicio).getTime()) / (1000 * 60 * 60 * 24);
            }
            return sum + Math.max(0, dias);
        }, 0) / concluidas.length : 0;

        // Reservas com atraso (Ativas que passaram da DataFim prevista)
        const hoje = new Date();
        const atrasadas = filteredReservas.filter(r => {
            if (!isReservaAtiva(r as AnyObject)) return false;
            const dataPrevistaFim = getReservaDataPrevistaFim(r as AnyObject);
            if (!dataPrevistaFim) return false;
            dataPrevistaFim.setHours(23, 59, 59, 999);
            // atrasada = ativa com data prevista de encerramento anterior a hoje
            return dataPrevistaFim.getTime() < hoje.getTime();
        }).length;

        // Gráfico hierárquico com comparação YoY
        const yearMap: Record<string, Record<string, Record<string, number>>> = {}; // ano -> mês -> dia -> count
        const yearTotals: Record<string, number> = {};

        filteredReservas.forEach(r => {
            if (r.DataCriacao) {
                const date = new Date(r.DataCriacao);
                const year = date.getFullYear().toString();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');

                if (!yearMap[year]) yearMap[year] = {};
                if (!yearMap[year][month]) yearMap[year][month] = {};
                if (!yearMap[year][month][day]) yearMap[year][month][day] = 0;
                yearMap[year][month][day]++;
                yearTotals[year] = (yearTotals[year] || 0) + 1;
            }
        });

        const monthlyData = Object.entries(yearMap)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([year, months]) => {
                const yearTotal = yearTotals[year] || 0;
                const prevYear = (parseInt(year) - 1).toString();
                const prevYearTotal = yearTotals[prevYear] || 0;
                const yoyChange = prevYearTotal > 0 ? ((yearTotal - prevYearTotal) / prevYearTotal) * 100 : 0;

                return {
                    year,
                    yearTotal,
                    prevYearTotal,
                    yoyChange,
                    months: Object.entries(months)
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([month, days]) => {
                            const monthTotal = Object.values(days).reduce((sum, val) => sum + val, 0);
                            const prevYearMonth = yearMap[prevYear]?.[month];
                            const prevMonthTotal = prevYearMonth ? Object.values(prevYearMonth).reduce((sum, val) => sum + val, 0) : 0;
                            const monthYoyChange = prevMonthTotal > 0 ? ((monthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0;

                            return {
                                month,
                                monthTotal,
                                prevMonthTotal,
                                monthYoyChange,
                                days: Object.entries(days)
                                    .sort((a, b) => a[0].localeCompare(b[0]))
                                    .map(([day, count]) => ({
                                        day,
                                        count
                                    }))
                            };
                        })
                };
            });

        return {
            total,
            ativas,
            atrasadas,
            principalMotivo: principalMotivo?.[0] || 'N/A',
            motivoData,
            clienteData,
            statusData,
            tempoMedio: tempoMedioConcluidas,
            monthlyData
        };
    }, [filteredReservas]);

    // NOVO: Análise de Ocupação Simultânea Diária (controlado por slider E filtro temporal)
    const ocupacaoSimultaneaData = useMemo(() => {
        if (!reservaDateBounds) return [];

        const { minDate, maxDate } = reservaDateBounds;
        const totalMs = maxDate.getTime() - minDate.getTime();

        // Se há filtro temporal ativo, usar o período do filtro
        let dataInicio: Date;
        let dataFim: Date;

        if (selectedTemporalFilter) {
            if (selectedTemporalFilter.month) {
                // Filtro de mês específico
                const year = parseInt(selectedTemporalFilter.year!);
                const month = parseInt(selectedTemporalFilter.month) - 1;
                dataInicio = new Date(year, month, 1);
                dataFim = new Date(year, month + 1, 0, 23, 59, 59, 999);
            } else if (selectedTemporalFilter.year) {
                // Filtro de ano específico
                const year = parseInt(selectedTemporalFilter.year);
                dataInicio = new Date(year, 0, 1);
                dataFim = new Date(year, 11, 31, 23, 59, 59, 999);
            } else {
                // Fallback: usar slider
                dataInicio = new Date(minDate.getTime() + (totalMs * sliderRange.startPercent / 100));
                dataFim = new Date(minDate.getTime() + (totalMs * sliderRange.endPercent / 100));
            }
        } else {
            // Sem filtro temporal: usar slider
            dataInicio = new Date(minDate.getTime() + (totalMs * sliderRange.startPercent / 100));
            dataFim = new Date(minDate.getTime() + (totalMs * sliderRange.endPercent / 100));
        }

        dataInicio.setHours(0, 0, 0, 0);
        dataFim.setHours(23, 59, 59, 999);

        const datas: Date[] = [];
        const dataAtual = new Date(dataInicio);

        while (dataAtual <= dataFim) {
            datas.push(new Date(dataAtual));
            dataAtual.setDate(dataAtual.getDate() + 1);
        }

        // Para cada dia, contar quantos veículos estavam "na rua" (usar filteredReservas para respeitar filtros)
        const ocupacaoPorDia = datas.map(dia => {
            const diaTime = dia.getTime();

            // Contar veículos em uso neste dia específico
            const veiculosEmUso = filteredReservas.filter(reserva => {
                if (!isReservaContabilizavelUsoSimultaneo(reserva as AnyObject)) return false;

                const dataInicio = new Date(reserva.DataInicio);
                dataInicio.setHours(0, 0, 0, 0);
                const inicioTime = dataInicio.getTime();

                const dataFim = getReservaFimOperacional(reserva as AnyObject);
                dataFim.setHours(23, 59, 59, 999);
                const fimTime = dataFim.getTime();

                // Veículo conta como "Em Uso" se: DataInicio <= dia E (DataFim >= dia OU DataFim é null)
                return inicioTime <= diaTime && fimTime >= diaTime;
            });

            return {
                date: dia.toISOString().split('T')[0],
                count: veiculosEmUso.length,
                displayDate: `${dia.getDate().toString().padStart(2, '0')}/${(dia.getMonth() + 1).toString().padStart(2, '0')}`
            };
        });

        return ocupacaoPorDia.map((point, idx, arr) => {
            const start = Math.max(0, idx - 6);
            const window = arr.slice(start, idx + 1);
            const mediaMovel7d = window.reduce((sum, it) => sum + it.count, 0) / window.length;
            return {
                ...point,
                mediaMovel7d: Number(mediaMovel7d.toFixed(2))
            };
        });
    }, [filteredReservas, sliderRange, reservaDateBounds, selectedTemporalFilter]);

    // Detalhamento de veículos para o dia selecionado no gráfico de ocupação
    const reservasDetailForSelectedDay = useMemo(() => {
        if (!selectedDayForDetail) return [];

        const diaDate = parseDateOnlyLocal(selectedDayForDetail) || new Date(selectedDayForDetail);
        diaDate.setHours(0, 0, 0, 0);
        const diaTime = diaDate.getTime();

        const reservasNoDia = filteredReservas.filter(reserva => {
            if (!isReservaContabilizavelUsoSimultaneo(reserva as AnyObject)) return false;

            const dataInicio = new Date(reserva.DataInicio);
            dataInicio.setHours(0, 0, 0, 0);
            const inicioTime = dataInicio.getTime();

            const dataFim = getReservaFimOperacional(reserva as AnyObject);
            dataFim.setHours(23, 59, 59, 999);
            const fimTime = dataFim.getTime();

            return inicioTime <= diaTime && fimTime >= diaTime;
        });

        // Quando há múltiplas ocorrências da mesma placa no dia, prioriza a ocorrência válida (não cancelada).
        const byPlate = new Map<string, AnyObject>();

        reservasNoDia.forEach((row: AnyObject, idx: number) => {
            const plateKey = getReservaPrimaryPlate(row) || `__sem_placa_${idx}`;
            const prev = byPlate.get(plateKey);
            if (!prev) {
                byPlate.set(plateKey, row);
                return;
            }

            const prevCancelled = isReservaCancelada(prev);
            const currCancelled = isReservaCancelada(row);
            if (prevCancelled && !currCancelled) {
                byPlate.set(plateKey, row);
                return;
            }
            if (!prevCancelled && currCancelled) return;

            const prevAtiva = isReservaAtiva(prev);
            const currAtiva = isReservaAtiva(row);
            if (!prevAtiva && currAtiva) {
                byPlate.set(plateKey, row);
                return;
            }
            if (prevAtiva && !currAtiva) return;

            const prevTs = (parseBIDate(prev?.DataAtualizacao || prev?.DataCriacao || prev?.DataInicio)?.getTime() || 0);
            const currTs = (parseBIDate(row?.DataAtualizacao || row?.DataCriacao || row?.DataInicio)?.getTime() || 0);
            if (currTs >= prevTs) byPlate.set(plateKey, row);
        });

        return Array.from(byPlate.values());
    }, [selectedDayForDetail, filteredReservas]);

    const toggleReservaUsoSort = (col: string) => {
        setReservaUsoSort(prev => {
            if (prev.col === col) {
                return { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
            }
            return { col, dir: 'asc' };
        });
    };

    const reservaUsoSortIcon = (col: string) => {
        if (reservaUsoSort.col !== col) return <ArrowUpDown size={12} className="text-slate-300" />;
        return reservaUsoSort.dir === 'asc'
            ? <ArrowUp size={14} className="text-slate-500" />
            : <ArrowDown size={14} className="text-slate-500" />;
    };

    const reservasDetailForSelectedDaySorted = useMemo(() => {
        const arr = (reservasDetailForSelectedDay || []).slice();
        if (!reservaUsoSort.col) return arr;

        const col = reservaUsoSort.col;
        arr.sort((a: AnyObject, b: AnyObject) => {
            const valueFor = (row: AnyObject): string | number => {
                switch (col) {
                    case 'Placa': return getReservaPrimaryPlate(row);
                    case 'Modelo': return String(row?.ModeloVeiculoReserva || row?.ModeloReserva || '');
                    case 'Cliente': return String(row?.Cliente || '');
                    case 'Fornecedor': return getReservaFornecedor(row);
                    case 'Motivo': return String(row?.Motivo || '');
                    case 'Status': return String(getReservaStatusOperacional(row) || '');
                    case 'Ativa': return isReservaAtiva(row) ? 1 : 0;
                    case 'DataInicio': return parseBIDate(row?.DataInicio)?.getTime() || 0;
                    case 'DataFim': return getReservaFimOperacional(row).getTime() || 0;
                    case 'Dias':
                        return Number(row?.DiariasEfetivas ?? row?.Diarias ?? 0)
                            || (row?.DataInicio ? Math.max(0, Math.ceil((getReservaFimOperacional(row).getTime() - new Date(row.DataInicio).getTime()) / (1000 * 60 * 60 * 24))) : 0);
                    case 'Local': return `${String(row?.Cidade || '')} / ${String(row?.Estado || '')}`;
                    default: return String(row?.[col] || '');
                }
            };

            const va = valueFor(a);
            const vb = valueFor(b);

            if (typeof va === 'number' || typeof vb === 'number') {
                return ((Number(va) || 0) - (Number(vb) || 0)) * (reservaUsoSort.dir === 'asc' ? 1 : -1);
            }

            return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * (reservaUsoSort.dir === 'asc' ? 1 : -1);
        });

        return arr;
    }, [reservasDetailForSelectedDay, reservaUsoSort]);

    // Novos agregados solicitados:
    // - Diárias por Local (Cidade/UF)
    // - Contagem por TipoVeiculoTemporario
    // - Estrutura Cliente -> Contratos com soma de diárias (para o gráfico colapsável)
    const diariasByLocation = useMemo(() => {
        const map: Record<string, number> = {};
        (filteredReservas || []).forEach(r => {
            const city = (r.Cidade || 'Não Identificado').trim();
            const uf = (r.Estado || '').trim();
            const key = uf ? `${city} / ${uf}` : city;
            const diarias = Number(r.DiariasEfetivas ?? r.Diarias ?? 0) || 0;
            map[key] = (map[key] || 0) + diarias;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredReservas]);

    const tipoVeiculoCounts = useMemo(() => {
        const map: Record<string, number> = {};
        (filteredReservas || []).forEach(r => {
            const t = String(r.TipoVeiculoTemporario || r.Tipo || 'Não Definido');
            map[t] = (map[t] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredReservas]);

    const clienteContracts = useMemo(() => {
        const map: Record<string, { totalDiarias: number; contracts: Record<string, { diarias: number; ocorrencias: number }> }> = {};
        (filteredReservas || []).forEach(r => {
            const cliente = String(r.Cliente || 'Não Definido');
            const contrato = String(r.ContratoLocacao || r.ContratoComercial || r.IdContratoLocacao || 'Sem Contrato');
            const diarias = Number(r.DiariasEfetivas ?? r.Diarias ?? 0) || 0;
            if (!map[cliente]) map[cliente] = { totalDiarias: 0, contracts: {} };
            map[cliente].totalDiarias += diarias;
            if (!map[cliente].contracts[contrato]) map[cliente].contracts[contrato] = { diarias: 0, ocorrencias: 0 };
            map[cliente].contracts[contrato].diarias += diarias;
            map[cliente].contracts[contrato].ocorrencias += 1;
        });
        // Convert to array
        return Object.entries(map).map(([cliente, data]) => ({ cliente, totalDiarias: data.totalDiarias, contracts: Object.entries(data.contracts).map(([cn, cd]) => ({ contrato: cn, diarias: cd.diarias, ocorrencias: cd.ocorrencias })).sort((a, b) => b.diarias - a.diarias) })).sort((a, b) => b.totalDiarias - a.totalDiarias);
    }, [filteredReservas]);

    const diariasByCliente = useMemo(() => {
        return clienteContracts.map(c => ({ name: c.cliente, value: c.totalDiarias }));
    }, [clienteContracts]);


    // Distribuição por modelo dos veículos de reserva - CORRIGIDO: usando ModeloReserva do fat_carro_reserva.json
    // Filtra automaticamente pelo período do slider
    const reservaModelData = useMemo(() => {
        const map: Record<string, number> = {};

        // Usa a base já filtrada para manter consistência com período/temporal e demais filtros.
        (filteredReservas || []).forEach(r => {
            const m = r.ModeloReserva || 'Não Definido';
            map[m] = (map[m] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredReservas]);

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

    // Ordenação na tabela de Detalhamento de Carro Reserva
    const [reservaSort, setReservaSort] = useState<{ col: string | null; dir: 'asc' | 'desc' }>({ col: null, dir: 'asc' });

    const toggleReservaSort = (col: string) => {
        setReservaPage(0);
        setReservaSort(prev => {
            if (prev.col === col) {
                return { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
            }
            return { col, dir: 'asc' };
        });
    };

    const ReservaSortIcon = ({ col }: { col: string }) => {
        if (reservaSort.col !== col) return <ArrowUpDown size={12} className="text-slate-300" />;
        return reservaSort.dir === 'asc'
            ? <ArrowUp size={14} className="text-slate-500" />
            : <ArrowDown size={14} className="text-slate-500" />;
    };

    const getReservaSortValue = (row: AnyObject, col: string): string | number => {
        switch (col) {
            case 'Ativa':
                return isReservaAtiva(row) ? 1 : 0;
            case 'DataCriacao':
                return parseBIDate(row?.DataCriacao)?.getTime() || 0;
            case 'DataInicio':
                return parseBIDate(row?.DataInicio)?.getTime() || 0;
            case 'DataFim':
                return getReservaFimOperacional(row).getTime() || 0;
            case 'Ocorrencia':
                return normalizeOccurrence(row?.Ocorrencia || row?.IdOcorrencia || '');
            case 'Placa':
                return normalizePlate(row?.PlacaReserva || row?.PlacaVeiculoInterno || row?.PlacaTitular || '');
            case 'Modelo':
                return String(row?.ModeloVeiculoReserva || row?.ModeloReserva || row?.Modelo || '');
            case 'Diarias':
                return Number(row?.DiariasEfetivas ?? row?.Diarias ?? 0) || 0;
            case 'Cliente':
                return String(row?.Cliente || '');
            case 'Fornecedor':
                return getReservaFornecedor(row);
            case 'Motivo':
                return String(row?.Motivo || '');
            case 'Status':
                return String(getReservaStatusOperacional(row) || '');
            case 'Localizacao':
                return `${String(row?.Cidade || '')} / ${String(row?.Estado || '')}`;
            default:
                return String(row?.[col] || '');
        }
    };

    const reservaSorted = useMemo(() => {
        const arr = (filteredReservas || []).slice();
        if (!reservaSort.col) return arr;
        const col = reservaSort.col;
        arr.sort((a: any, b: any) => {
            const va: any = getReservaSortValue(a, col);
            const vb: any = getReservaSortValue(b, col);

            // tentar número primeiro
            if (typeof va === 'number' || typeof vb === 'number') {
                return ((Number(va) || 0) - (Number(vb) || 0)) * (reservaSort.dir === 'asc' ? 1 : -1);
            }

            return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * (reservaSort.dir === 'asc' ? 1 : -1);
        });
        return arr;
    }, [filteredReservas, reservaSort]);

    const reservaPageItems = reservaSorted.slice(reservaPage * pageSize, (reservaPage + 1) * pageSize);

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
        const norm = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const term = (appliedPlateSearch || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const base = term ? filteredData.filter(r => {
            const p = norm(r.Placa);
            const m = norm(r.Modelo);
            return p.includes(term) || m.includes(term);
        }) : filteredData;

        const data = base.map(r => {
            const compra = parseCurrency(r.ValorCompra);
            const fipe = parseCurrency(r.ValorFipeAtual);
            const manut = manutencaoMap[normalizePlate(r.Placa)] || 0;
            const tco = compra + manut;
            return {
                Placa: r.Placa, Modelo: r.Modelo || 'N/A', Status: r.Status || 'N/A',
                NomeCliente: r.NomeCliente || 'N/A', TipoLocacao: r.TipoLocacao || 'N/A',
                IdadeVeiculo: parseNum(r.IdadeVeiculo),
                KmInformado: parseNum(r.KmInformado), KmConfirmado: parseNum(r.KmConfirmado),
                lat: parseNum(r.Latitude), lng: parseNum(r.Longitude),
                compra, fipe, manut, tco, depreciacao: compra - fipe,
                tipo: getCategory(r.Status),
                pctFipe: fipe > 0 ? (compra / fipe) * 100 : 0,
                Patio: r.Patio || 'Sem pátio', DiasNoStatus: parseNum(r.DiasNoStatus),
                DataInicioStatus: r.DataInicioStatus || '-',
                // Campos adicionais para telemetria
                ProvedorTelemetria: r.ProvedorTelemetria,
                UltimaAtualizacaoTelemetria: r.UltimaAtualizacaoTelemetria,
                UltimoEnderecoTelemetria: r.UltimoEnderecoTelemetria,
                ComSeguroVigente: r.ComSeguroVigente,
                Proprietario: r.Proprietario,
                FinalidadeUso: r.FinalidadeUso,
                NomeCondutor: r.NomeCondutor,
                CPFCondutor: r.CPFCondutor,
                TelefoneCondutor: r.TelefoneCondutor,
                ValorLocacao: r.ValorLocacao || 0,
                Chassi: String(r.Chassi || r.chassi || '')
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
    }, [filteredData, manutencaoMap, sortConfig, appliedPlateSearch]);

    // DEBUG: mostrar amostra dos dados processados para validar campos (remover após diagnóstico)
    useEffect(() => {
        try {
            // eslint-disable-next-line no-console
            console.debug('[FleetDashboard] tableData sample (first 20):', tableData?.slice?.(0, 20) || tableData);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.debug('[FleetDashboard] erro ao logar tableData:', err);
        }
    }, [tableData]);

    // Reset page when local plate search changes to show results from first page
    useEffect(() => {
        setPage(0);
    }, [appliedPlateSearch]);

    // Infinite scroll: reset visibleCount when tableData changes
    useEffect(() => {
        setVisibleCount(detailPageSize);
    }, [tableData, detailPageSize]);

    // IntersectionObserver to load more rows when sentinel becomes visible
    useEffect(() => {
        if (typeof window === 'undefined' || !sentinelRef.current) return;
        const el = sentinelRef.current;
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(en => {
                if (en.isIntersecting) {
                    setVisibleCount(prev => Math.min(tableData.length, prev + detailPageSize));
                }
            });
        }, { root: null, rootMargin: '200px', threshold: 0.1 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [sentinelRef, tableData, detailPageSize]);

    const pageItems = tableData.slice(0, visibleCount);

    const patioItems = useMemo(() => {
        return tableData.filter(r => r.tipo === 'Improdutiva');
    }, [tableData]);

    const patioPageItems = patioItems.slice(patioPage * pageSize, (patioPage + 1) * pageSize);
    void patioPageItems;

    // Memoize selected arrays from chart filters to provide stable references to MultiSelect
    const selectedStatus = useMemo(() => getFilterValues('status'), [filters]);
    const selectedModelo = useMemo(() => getFilterValues('modelo'), [filters]);
    const selectedFilial = useMemo(() => getFilterValues('filial'), [filters]);
    const selectedCliente = useMemo(() => getFilterValues('cliente'), [filters]);
    const selectedTipoLocacao = useMemo(() => getFilterValues('tipoLocacao'), [filters]);
    const selectedCategoria = useMemo(() => getFilterValues('categoria'), [filters]);

    const selectedReservaMotivo = useMemo(() => getFilterValues('reserva_motivo'), [filters]);
    const selectedReservaCliente = useMemo(() => getFilterValues('reserva_cliente'), [filters]);
    const selectedReservaStatus = useMemo(() => getFilterValues('reserva_status'), [filters]);

    const selectedPlates = useMemo(() => getFilterValues('search'), [filters]);
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

    // Guard de loading: exibe skeleton até os dados primários chegarem
    if (loadingPrimary && frota.length === 0) {
        return <AnalyticsLoading message="Carregando dados da frota..." kpiCount={5} chartCount={2} />;
    }

    return (
        <div className={`bg-slate-50 min-h-screen p-6 space-y-6 ${hasActiveFilters ? 'pb-28' : ''}`}>
            <div className="flex justify-between items-center">
                <div><Title className="text-slate-900">Gestão de Frota</Title><Text className="text-slate-500">Análise de ativos, produtividade e localização.</Text></div>
                <div className="flex items-center gap-3">
                    <DataUpdateBadge metadata={frotaMetadata} compact />
                    {loadingPrimary && <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                    <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full flex gap-2 font-medium"><Car className="w-4 h-4" /> Hub Ativos</div>
                </div>
            </div>

            <FloatingClearButton onClick={clearAllFilters} show={hasActiveFilters} />
            <ChartFilterBadges filters={filters} onClearFilter={clearFilter} onClearAll={clearAllFilters} />

            <Card className="bg-white shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-slate-500" /><Text className="font-medium text-slate-700">Filtros</Text></div>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button onClick={() => toggleProductivity('Todos')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${getFilterValues('productivity').length === 0 ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Todos</button>
                        <button onClick={() => toggleProductivity('Ativa')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${getFilterValues('productivity').includes('Ativa') ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Ativa</button>
                        <button onClick={() => toggleProductivity('Terceiro')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${getFilterValues('productivity').includes('Terceiro') ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Terceiro</button>
                        <button onClick={() => toggleProductivity('Produtiva')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${getFilterValues('productivity').includes('Produtiva') ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}><CheckCircle2 size={12} /> Produtiva</button>
                        <button onClick={() => toggleProductivity('Improdutiva')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${getFilterValues('productivity').includes('Improdutiva') ? 'bg-white shadow text-rose-600' : 'text-slate-500'}`}><XCircle size={12} /> Improdutiva</button>
                        <button onClick={() => toggleProductivity('Inativa')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${getFilterValues('productivity').includes('Inativa') ? 'bg-white shadow text-slate-600' : 'text-slate-500'}`}><Archive size={12} /> Inativa</button>
                    </div>
                </div>
                <div className="">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <CompactMultiSelect label="Status" options={uniqueOptions.status} selected={selectedStatus} onSelectedChange={(v) => applyFilterValues('status', v)} />
                        <CompactMultiSelect label="Modelo" options={uniqueOptions.modelos} selected={selectedModelo} onSelectedChange={(v) => applyFilterValues('modelo', v)} />
                        <CompactMultiSelect label="Categoria" options={uniqueOptions.categorias} selected={selectedCategoria} onSelectedChange={(v) => applyFilterValues('categoria', v)} />
                        <CompactMultiSelect label="Filial" options={uniqueOptions.filiais} selected={selectedFilial} onSelectedChange={(v) => applyFilterValues('filial', v)} />
                        <CompactMultiSelect label="Cliente" options={uniqueOptions.clientes} selected={selectedCliente} onSelectedChange={(v) => applyFilterValues('cliente', v)} />
                        <CompactMultiSelect label="Tipo Contrato" options={uniqueOptions.tiposLocacao} selected={selectedTipoLocacao} onSelectedChange={(v) => applyFilterValues('tipoLocacao', v)} />
                        <div className="flex items-center gap-2">
                            <CompactMultiSelect label="Placas" options={uniqueOptions.plates} selected={selectedPlates} onSelectedChange={(v) => applyFilterValues('search', v)} />
                            <button onClick={() => { clearFilter('search'); }} className="px-3 py-1 text-sm bg-rose-50 text-rose-600 rounded">Limpar</button>
                            <button onClick={selectAllFilters} className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded">Selecionar tudo</button>
                        </div>
                    </div>
                </div>
            </Card>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)} className="space-y-6">
                <TabsList className="bg-white border">
                    <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
                    <TabsTrigger value="patio">Gestão de Pátio</TabsTrigger>
                    <TabsTrigger value="telemetria">Telemetria & Mapa</TabsTrigger>
                    {/* Aba "Eficiência" removida */}
                    <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
                    <TabsTrigger value="carro-reserva">Carro Reserva</TabsTrigger>
                </TabsList>

                <TabsContent value="visao-geral" className="space-y-6">
                    {/* KPIs Principais */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                                    <BarChart data={[...statusData].sort((a, b) => b.value - a.value)} layout="vertical" margin={{ left: 0, right: 80 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis type="number" tick={{ fontSize: 12 }} />
                                        <YAxis dataKey="name" type="category" width={220} tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={(value: any) => [`${value}`, 'Veículos']} />
                                        <Bar dataKey="value" barSize={20} radius={[6, 6, 6, 6]} onClick={(data: any, _index: number, event: any) => { handleChartClick('status', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                            {statusData.map((entry, idx) => (
                                                <Cell key={`cell-st-${idx}`} fill={isValueSelected('status', entry.name) ? '#063970' : entry.color} />
                                            ))}
                                            <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} fill="#0f172a" />
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
                                            <Bar dataKey="Improdutiva" stackId="a" radius={[6, 0, 0, 6]} barSize={32} fill="#94a3b8" onClick={(_d: any, _i: number, e: any) => { handleChartClick('productivity', 'Improdutiva', e as unknown as React.MouseEvent); if (!((e?.ctrlKey) || (e?.metaKey))) document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer" />
                                            <Bar dataKey="Produtiva" stackId="a" radius={[0, 6, 6, 0]} barSize={32} fill="#3b82f6" onClick={(_d: any, _i: number, e: any) => { handleChartClick('productivity', 'Produtiva', e as unknown as React.MouseEvent); if (!((e?.ctrlKey) || (e?.metaKey))) document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer" />
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
                                                    <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 12 }} />
                                                    <Tooltip formatter={(value: any, _name: any, props: any) => {
                                                        const pct = props?.payload?.pct;
                                                        return [`${value} (${pct ? pct.toFixed(1) + '%' : ''})`, 'Veículos'];
                                                    }} />
                                                    <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={20} fill="#64748b" onClick={(data: any, _index: number, event: any) => { handleChartClick('status', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                                        <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} fill="#0f172a" />
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
                                                    <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 12 }} />
                                                    <Tooltip formatter={(value: any, _name: any, props: any) => {
                                                        const pct = props?.payload?.pct;
                                                        return [`${value} (${pct ? pct.toFixed(1) + '%' : ''})`, 'Veículos'];
                                                    }} />
                                                    <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={20} fill="#f59e0b" onClick={(data: any, _index: number, event: any) => { handleChartClick('status', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                                        <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} fill="#0f172a" />
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
                                        <YAxis dataKey="label" type="category" width={240} tick={{ fontSize: 10 }} />
                                        <Tooltip formatter={(value: any) => [String(value), 'Veículos']} />
                                        <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={16}
                                            onClick={(data: any, _index: number, event: any) => {
                                                if (data.isCategory) {
                                                    // Se for categoria, expande/colapsa
                                                    toggleCategory(data.categoria);
                                                } else {
                                                    // Se for modelo, aplica filtro
                                                    const modeloName = String(data.name || '').trim();
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
                                            <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} fontSize={10} fill="#0f172a" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card>
                            <div className="flex justify-between items-center mb-6">
                                <Title>Classificação por Odômetro</Title>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setOdometroView('odometro')} className={`text-xs px-2 py-1 rounded ${odometroView === 'odometro' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-500 border border-transparent'}`}>
                                        Odômetro
                                    </button>
                                    <button onClick={() => setOdometroView('idade')} className={`text-xs px-2 py-1 rounded ${odometroView === 'idade' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-500 border border-transparent'}`}>
                                        Idade (m)
                                    </button>
                                </div>
                            </div>
                            <Text className="text-xs text-slate-500 mb-3">Distribuição de veículos por faixa de quilometragem confirmada</Text>
                            <div className="h-[400px] mt-8">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={odometroView === 'odometro' ? odometroData : idadeFaixaData} margin={{ left: 20, right: 60, bottom: 36, top: 24 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={odometroView === 'odometro' ? -45 : 0} textAnchor={odometroView === 'odometro' ? 'end' : 'middle'} height={odometroView === 'odometro' ? 64 : 48} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={(value: any) => [`${value} veículos`, 'Quantidade']} />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32} fill="#06b6d4" onClick={(data: any, _index: number, event: any) => { const key = odometroView === 'odometro' ? 'odometro' : 'idade'; handleChartClick(key, data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                            <LabelList dataKey="value" position="top" formatter={(v: any) => v > 0 ? String(v) : ''} fontSize={11} fill="#0f172a" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

                    <Card id="detail-table" className="p-0 overflow-hidden mt-4">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center"><div className="flex items-center gap-2"><Title>Detalhamento da Frota</Title><span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">{fmtDecimal(tableData.length)} registros</span></div><button onClick={() => exportToExcel(tableData, 'frota_detalhada')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 transition-colors border px-3 py-1 rounded"><FileSpreadsheet size={16} /> Exportar</button></div>
                        <div className="overflow-x-auto">
                            <div className="max-h-[60vh] overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 uppercase text-xs sticky top-0 z-20"><tr>
                            <th className="px-6 py-3">
                                <div className="flex items-center justify-between">
                                    <span className="cursor-pointer" onClick={() => handleSort('Placa')}>Placa</span>
                                    <span className="flex items-center gap-1">
                                        <SortIcon column="Placa" />
                                    </span>
                                </div>
                            </th>
                            <th className="px-6 py-3">
                                <div className="flex items-center justify-between">
                                    <span className="cursor-pointer" onClick={() => handleSort('Modelo')}>Modelo</span>
                                    <span className="flex items-center gap-1">
                                        <SortIcon column="Modelo" />
                                    </span>
                                </div>
                            </th>
                            <th className="px-6 py-3 text-xs">Chassi</th>
                            <th className="px-6 py-3">
                                <div className="flex items-center justify-between">
                                    <span className="cursor-pointer" onClick={() => handleSort('NomeCliente')}>Cliente</span>
                                    <span className="flex items-center gap-1">
                                        <SortIcon column="NomeCliente" />
                                    </span>
                                </div>
                            </th>
                            <th className="px-6 py-3">
                                <div className="flex items-center justify-between">
                                    <span className="cursor-pointer" onClick={() => handleSort('TipoLocacao')}>Contrato</span>
                                    <span className="flex items-center gap-1">
                                        <SortIcon column="TipoLocacao" />
                                    </span>
                                </div>
                            </th>
                            <th className="px-6 py-3">
                                <div className="flex items-center justify-between">
                                    <span className="cursor-pointer" onClick={() => handleSort('Status')}>Status</span>
                                    <span className="flex items-center gap-1">
                                        <SortIcon column="Status" />
                                    </span>
                                </div>
                            </th>
                            <th className="px-6 py-3 text-center">
                                <div className="flex items-center justify-between">
                                    <span className="cursor-pointer" onClick={() => handleSort('tipo')}>Tipo</span>
                                    <span className="flex items-center gap-1">
                                        <SortIcon column={"tipo" as any} />
                                    </span>
                                </div>
                            </th>
                            <th className="px-6 py-3 text-right">
                                <div className="flex items-center justify-between">
                                    <span className="cursor-pointer" onClick={() => handleSort('ValorLocacao')}>Valor Locação</span>
                                    <span className="flex items-center gap-1">
                                        <SortIcon column={"ValorLocacao" as any} />
                                    </span>
                                </div>
                            </th>
                            <th className="px-6 py-3 text-right">
                                <div className="flex items-center justify-between">
                                    <span className="cursor-pointer" onClick={() => handleSort('compra')}>Compra</span>
                                    <span className="flex items-center gap-1">
                                        <SortIcon column={"compra" as any} />
                                    </span>
                                </div>
                            </th>
                            <th className="px-6 py-3 text-right">
                                <div className="flex items-center justify-between">
                                    <span className="cursor-pointer" onClick={() => handleSort('fipe')}>FIPE</span>
                                    <span className="flex items-center gap-1">
                                        <SortIcon column={"fipe" as any} />
                                    </span>
                                </div>
                            </th>
                            <th className="px-6 py-3 text-right">
                                <div className="flex items-center justify-between">
                                    <span className="cursor-pointer" onClick={() => handleSort('KmInformado')}>Odômetro (Info)</span>
                                    <span className="flex items-center gap-1">
                                        <SortIcon column={"KmInformado" as any} />
                                    </span>
                                </div>
                            </th>
                            <th className="px-6 py-3 text-right">
                                <div className="flex items-center justify-between">
                                    <span className="cursor-pointer" onClick={() => handleSort('KmConfirmado')}>Odômetro (Conf)</span>
                                    <span className="flex items-center gap-1">
                                        <SortIcon column={"KmConfirmado" as any} />
                                    </span>
                                </div>
                            </th>
                            <th className="px-6 py-3 text-center">
                                <div className="flex items-center justify-between">
                                    <span className="cursor-pointer" onClick={() => handleSort('pctFipe')}>% FIPE</span>
                                    <span className="flex items-center gap-1">
                                        <SortIcon column={"pctFipe" as any} />
                                    </span>
                                </div>
                            </th>
                            <th className="px-6 py-3 text-center">
                                <div className="flex items-center justify-between">
                                    <span className="cursor-pointer" onClick={() => handleSort('IdadeVeiculo')}>Idade</span>
                                    <span className="flex items-center gap-1">
                                        <SortIcon column={"IdadeVeiculo" as any} />
                                    </span>
                                </div>
                            </th>
                        </tr></thead><tbody className="divide-y divide-slate-100">
                                        {pageItems.length === 0 ? (
                                    <tr className="bg-transparent">
                                        <td colSpan={14} className="px-6 py-8 text-center text-sm text-slate-600">
                                            {appliedPlateSearch ? (
                                                <div>
                                                    Nenhum resultado para <strong>{appliedPlateSearch}</strong>.
                                                    <div className="mt-2">
                                                        <button onClick={() => { setPlateSearch(''); setAppliedPlateSearch(''); }} className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-sm">Limpar pesquisa</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>Nenhum registro.</div>
                                            )}
                                        </td>
                                    </tr>
                                        ) : pageItems.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-medium font-mono">{r.Placa}</td>
                                        <td className="px-6 py-3">{r.Modelo}</td>
                                        <td className="px-6 py-3 font-mono text-xs text-slate-500">{r.Chassi || '-'}</td>
                                        <td className="px-6 py-3 text-xs max-w-[150px] truncate" title={r.NomeCliente}>{r.NomeCliente}</td>
                                        <td className="px-6 py-3 text-xs">{r.TipoLocacao}</td>
                                        <td className="px-6 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${r.tipo === 'Produtiva' ? 'bg-emerald-100 text-emerald-700' : r.tipo === 'Improdutiva' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>{r.Status}</span></td>
                                        <td className="px-6 py-3 text-center font-bold text-xs">{r.tipo}</td>
                                        <td className="px-6 py-3 text-right font-medium text-blue-600">{r.ValorLocacao ? fmtBRL(r.ValorLocacao) : '-'}</td>
                                        <td className="px-6 py-3 text-right">{fmtBRL(r.compra)}</td>
                                        <td className="px-6 py-3 text-right">{fmtBRL(r.fipe)}</td>
                                        <td className="px-6 py-3 text-right">{
                                            ((): string => {
                                                const v = r.KmInformado;
                                                if (v === null || v === undefined) return '-';
                                                const n = Number(v);
                                                return Number.isNaN(n) ? '-' : n.toLocaleString('pt-BR');
                                            })()
                                        }</td>
                                        <td className="px-6 py-3 text-right">{
                                            ((): string => {
                                                const v = r.KmConfirmado;
                                                if (v === null || v === undefined) return '-';
                                                const n = Number(v);
                                                return Number.isNaN(n) ? '-' : n.toLocaleString('pt-BR');
                                            })()
                                        }</td>
                                        <td className="px-6 py-3 text-center font-bold text-slate-600">{r.pctFipe.toFixed(1)}%</td>
                                        <td className="px-6 py-3 text-center">{parseNum(r.IdadeVeiculo)} m</td>
                                        </tr>))}</tbody></table></div></div>
                        <div className="flex justify-between items-center gap-4 p-4 border-t border-slate-100">
                            <div className="text-xs text-slate-500">Mostrando {pageItems.length} de {tableData.length} registros</div>
                            <div className="text-sm text-slate-500">{visibleCount < tableData.length ? 'Role para carregar mais...' : 'Todos os registros carregados'}</div>
                            <div ref={sentinelRef} className="h-px w-full pointer-events-none opacity-0" aria-hidden="true" />
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="patio" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card>
                            <div className="flex items-center gap-2 mb-4"><Timer size={16} className="text-amber-600" /><Title>Aging de Pátio (Dias Parado)</Title></div>
                            <div className="h-64 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={agingData} margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={12} />
                                        <YAxis fontSize={12} />
                                        <Tooltip formatter={(value: any) => [`${value}`, 'Qtd']} />
                                        <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40}
                                            onClick={(data: any, _index: number, event: any) => { handleChartClick('aging', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('patio-table')?.scrollIntoView({ behavior: 'smooth' }); }}
                                            cursor="pointer">
                                            <LabelList dataKey="value" position="top" fontSize={12} fill="#0f172a" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                        <Card>
                            <div className="flex items-center gap-2 mb-4"><Warehouse size={16} className="text-blue-600" /><Title>Veículos por Localização (Improdutivos)</Title></div>
                            <div className="overflow-y-auto" style={{ maxHeight: 256 }}>
                                <div style={{ height: Math.max(256, patioData.length * 35) }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={patioData} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" fontSize={12} />
                                            <YAxis dataKey="name" type="category" width={100} fontSize={10} />
                                            <Tooltip formatter={(value: any) => [String(value), 'Qtd']} />
                                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}
                                                onClick={(data: any, _index: number, event: any) => { handleChartClick('patio', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('patio-table')?.scrollIntoView({ behavior: 'smooth' }); }}
                                                cursor="pointer">
                                                <LabelList dataKey="value" position="right" fontSize={10} fill="#0f172a" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </Card>
                        <Card>
                            <div className="flex items-center gap-2 mb-4"><Info size={16} className="text-rose-600" /><Title>Veículos por Status (Improdutivos)</Title></div>
                            <div className="overflow-y-auto" style={{ maxHeight: 256 }}>
                                <div style={{ height: Math.max(256, statusImprodutivoData.length * 35) }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={statusImprodutivoData} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" fontSize={12} />
                                            <YAxis dataKey="name" type="category" width={120} fontSize={10} />
                                            <Tooltip formatter={(value: any) => [String(value), 'Quantidade']} />
                                            <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={20}
                                                onClick={(data: any, _index: number, event: any) => { handleChartClick('status_improdutivo', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('patio-table')?.scrollIntoView({ behavior: 'smooth' }); }}
                                                cursor="pointer">
                                                <LabelList dataKey="value" position="right" fontSize={10} fill="#0f172a" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Movimentações recentes removidas conforme solicitado */}

                    <Card className="p-0 overflow-hidden" id="patio-table">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Title>Veículos no Pátio</Title>
                                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">{fmtDecimal(vehiclesDetailed.length)} registros</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <a href="/analytics/frota-improdutiva" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                    Ver monitoramento completo →
                                </a>
                                <button onClick={() => exportToExcel(vehiclesDetailed, 'veiculos_patio')}
                                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 transition-colors border px-3 py-1 rounded">
                                    <FileSpreadsheet size={16} /> Exportar
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto mt-4">
                            <div className="max-h-[420px] overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-3">
                                                <button onClick={() => toggleSort('Placa')} className="flex items-center gap-2">
                                                    <span>Placa</span>
                                                    {sortState.col === 'Placa' ? (sortState.dir === 'asc' ? <ArrowUp size={14} className="text-slate-500" /> : <ArrowDown size={14} className="text-slate-500" />) : <ArrowUpDown size={12} className="text-slate-300" />}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3">
                                                <button onClick={() => toggleSort('Modelo')} className="flex items-center gap-2">
                                                    <span>Modelo</span>
                                                    {sortState.col === 'Modelo' ? (sortState.dir === 'asc' ? <ArrowUp size={14} className="text-slate-500" /> : <ArrowDown size={14} className="text-slate-500" />) : <ArrowUpDown size={12} className="text-slate-300" />}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3">
                                                <button onClick={() => toggleSort('Status')} className="flex items-center gap-2">
                                                    <span>Status</span>
                                                    {sortState.col === 'Status' ? (sortState.dir === 'asc' ? <ArrowUp size={14} className="text-slate-500" /> : <ArrowDown size={14} className="text-slate-500" />) : <ArrowUpDown size={12} className="text-slate-300" />}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3">
                                                <button onClick={() => toggleSort('Patio')} className="flex items-center gap-2">
                                                    <span>Pátio</span>
                                                    {sortState.col === 'Patio' ? (sortState.dir === 'asc' ? <ArrowUp size={14} className="text-slate-500" /> : <ArrowDown size={14} className="text-slate-500" />) : <ArrowUpDown size={12} className="text-slate-300" />}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3 text-right">
                                                <button onClick={() => toggleSort('DiasNoStatus')} className="flex items-center gap-2 ml-auto">
                                                    <span>Dias Parado</span>
                                                    {sortState.col === 'DiasNoStatus' ? (sortState.dir === 'asc' ? <ArrowUp size={14} className="text-slate-500" /> : <ArrowDown size={14} className="text-slate-500" />) : <ArrowUpDown size={12} className="text-slate-300" />}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3">
                                                <button onClick={() => toggleSort('DataInicioStatus')} className="flex items-center gap-2">
                                                    <span>Data Início Status</span>
                                                    {sortState.col === 'DataInicioStatus' ? (sortState.dir === 'asc' ? <ArrowUp size={14} className="text-slate-500" /> : <ArrowDown size={14} className="text-slate-500" />) : <ArrowUpDown size={12} className="text-slate-300" />}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3">
                                                <button onClick={() => toggleSort('UltimaMovimentacao')} className="flex items-center gap-2">
                                                    <span>Última Movimentação</span>
                                                    {sortState.col === 'UltimaMovimentacao' ? (sortState.dir === 'asc' ? <ArrowUp size={14} className="text-slate-500" /> : <ArrowDown size={14} className="text-slate-500" />) : <ArrowUpDown size={12} className="text-slate-300" />}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3">
                                                <button onClick={() => toggleSort('UsuarioMovimentacao')} className="flex items-center gap-2">
                                                    <span>Usuário</span>
                                                    {sortState.col === 'UsuarioMovimentacao' ? (sortState.dir === 'asc' ? <ArrowUp size={14} className="text-slate-500" /> : <ArrowDown size={14} className="text-slate-500" />) : <ArrowUpDown size={12} className="text-slate-300" />}
                                                </button>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sortedVehicles.map((v, idx) => (
                                            <tr key={v.Placa + idx} className="hover:bg-slate-50">
                                                <td className="px-6 py-3 font-medium font-mono">{v.Placa}</td>
                                                <td className="px-6 py-3">{v.Modelo}</td>
                                                <td className="px-6 py-3"><span className="px-2 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">{v.Status}</span></td>
                                                <td className="px-6 py-3">{v.Patio}</td>
                                                <td className="px-6 py-3 text-right font-bold text-rose-600">{v.DiasNoStatus} dias</td>
                                                <td className="px-6 py-3 text-slate-500">{v.DataInicioStatus ? new Date(v.DataInicioStatus).toLocaleDateString('pt-BR') : '-'}</td>
                                                <td className="px-6 py-3 text-slate-500">{v.UltimaMovimentacao && v.UltimaMovimentacao !== '-' ? new Date(v.UltimaMovimentacao).toLocaleString('pt-BR') : '-'}</td>
                                                <td className="px-6 py-3 text-xs text-slate-600">{v.UsuarioMovimentacao}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="flex justify-start items-center gap-4 p-4 border-t border-slate-100">
                            <div className="text-xs text-slate-500">{fmtDecimal(vehiclesDetailed.length)} registros</div>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="telemetria" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Title className="text-sm text-slate-700">Telemetria</Title>
                            <Text className="text-xs text-slate-500">Visão geral dos aparelhos e cobertura GPS</Text>
                        </div>
                        <div>
                            <button
                                onClick={() => setShowKpiHelp(true)}
                                className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors border px-2 py-1 rounded bg-white"
                                title="Como esses números são calculados?"
                            >
                                <HelpCircle size={16} />
                            </button>
                        </div>
                    </div>
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
                            <Metric>{fmtDecimal(veiculosLocalizaveisKpi)}</Metric>
                            <Text className="text-xs text-slate-500 mt-1">Com coordenadas GPS</Text>
                        </Card>
                        <Card decoration="top" decorationColor="violet">
                            <Text>Taxa de Cobertura GPS</Text>
                            <Metric>{filteredData.length > 0 ? ((veiculosLocalizaveisKpi / filteredData.length) * 100).toFixed(1) : '0.0'}%</Metric>
                            <Text className="text-xs text-slate-500 mt-1">Lat/Long disponível</Text>
                        </Card>
                    </div>

                    {/* Modal de ajuda: regras dos Big Numbers de Telemetria */}
                    {showKpiHelp && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowKpiHelp(false)}>
                            <div className="bg-white rounded-lg shadow-2xl max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                <div className="sticky top-0 bg-blue-50 p-6 border-b">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <Title className="text-blue-900">💡 Como os Dados São Calculados</Title>
                                            <Text className="text-blue-700 mt-1">Regras aplicadas para os Big Numbers de Telemetria</Text>
                                        </div>
                                        <button onClick={() => setShowKpiHelp(false)} className="text-slate-400 hover:text-slate-600">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="bg-amber-50 p-4 rounded border-l-4 border-amber-400">
                                        <h3 className="font-semibold text-slate-900 mb-2">Veículos Localizáveis</h3>
                                        <p className="text-sm text-slate-700 ml-2 mb-1"><strong>Regra:</strong></p>
                                        <ol className="text-sm text-slate-600 ml-8 space-y-1 list-decimal list-inside">
                                            <li>Conta veículos do conjunto atualmente filtrado (frota exibida) que possuem coordenadas válidas.</li>
                                            <li>Considera-se válida uma coordenada quando <strong>Latitude</strong> e <strong>Longitude</strong> são numéricas, finitas e diferentes de 0.</li>
                                            <li>Coordenadas nulas, 0, vazias ou inválidas são ignoradas.</li>
                                        </ol>
                                    </div>

                                    <div className="bg-amber-50 p-4 rounded border-l-4 border-amber-400">
                                        <h3 className="font-semibold text-slate-900 mb-2">Taxa de Cobertura GPS</h3>
                                        <p className="text-sm text-slate-700 ml-2 mb-1"><strong>Regra:</strong></p>
                                        <ol className="text-sm text-slate-600 ml-8 space-y-1 list-decimal list-inside">
                                            <li>Calcula-se como: <code className="bg-slate-100 px-1 rounded">(Veículos Localizáveis / Total de veículos exibidos) * 100</code>.</li>
                                            <li>O denominador é o tamanho do conjunto atual de veículos após aplicação dos filtros da página.</li>
                                            <li>Valor exibido com uma casa decimal; se o denominador for zero, mostra 0.0%.</li>
                                        </ol>
                                    </div>

                                    
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Gráficos de Análise */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                        <Card>
                            <Title>Provedores de Telemetria</Title>
                            <div className="h-56 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={telemetriaData} layout="vertical" margin={{ left: 0, right: 80 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11, fill: '#475569' }} />
                                        <Tooltip formatter={(value: any) => [`${value}`, 'Veículos']} />
                                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20} fill="#3b82f6"
                                            onClick={(data: any, _index: number, event: any) => { handleChartClick('telemetria', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' }); }}
                                            cursor="pointer">
                                            <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} fontSize={10} fill="#0f172a" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card>
                            <Title>Situação de Seguro</Title>
                            <div className="h-56 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={seguroData} margin={{ left: 0, right: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                                        <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
                                        <Tooltip formatter={(value: any) => [`${value}`, 'Veículos']} />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}
                                            onClick={(data: any, _index: number, event: any) => { handleChartClick('seguro', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' }); }}
                                            cursor="pointer">
                                            {seguroData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={
                                                    entry.name === 'Com Seguro' ? '#10b981' :
                                                        entry.name === 'Sem Seguro' ? '#ef4444' : '#94a3b8'
                                                } />
                                            ))}
                                            <LabelList dataKey="value" position="top" fontSize={11} fill="#0f172a" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card>
                            <Title>Diferença de Odômetro (Info vs Conf)</Title>
                            <div className="h-56 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={kmDifferenceData} layout="vertical" margin={{ left: 40, right: 80 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" fontSize={10} tick={{ fill: '#475569' }} />
                                        <YAxis dataKey="name" type="category" width={120} fontSize={10} tick={{ fill: '#475569' }} />
                                        <Tooltip formatter={(value: any) => [String(value), 'Quantidade']} />
                                        <Bar dataKey="value" fill="#0891b2" radius={[0, 4, 4, 0]} barSize={20}
                                            onClick={(data: any, _index: number, event: any) => {
                                                try {
                                                    handleChartClick('km_diff', data.name, event as unknown as React.MouseEvent);
                                                    const isModifier = !!((event?.ctrlKey) || (event?.metaKey));
                                                    if (!isModifier) {
                                                        const el = document.getElementById('detail-table');
                                                        if (el && typeof el.scrollIntoView === 'function') {
                                                            el.scrollIntoView({ behavior: 'smooth' });
                                                        }
                                                    }
                                                } catch (err) {
                                                    // Protege contra erros inesperados durante o clique
                                                    // Não interrompe a UX; apenas loga no console para debug
                                                    // eslint-disable-next-line no-console
                                                    console.warn('Erro ao processar clique do gráfico km_diff', err);
                                                }
                                            }}
                                            cursor="pointer">
                                            <LabelList dataKey="value" content={renderVeiculoLabel} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card className="lg:col-start-1 lg:row-span-2">
                            <Title>Veículos por Cliente</Title>
                            <div className="mt-4 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-400" style={{ height: veiculosContainerHeight }}>
                                <div style={{ height: veiculosChartHeight, width: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={veiculosPorClienteData} layout="vertical" margin={{ left: 0, right: 30 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={260} tick={{ fill: '#475569', fontSize: 11 }} />
                                            <Tooltip formatter={(value: any) => [`${value}`, 'Veículos']} />
                                            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={14}
                                                onClick={(data: any, _index: number, event: any) => { handleChartClick('cliente', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' }); }}
                                                cursor="pointer">
                                                <LabelList dataKey="value" position="right" fontSize={12} fill="#0f172a" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </Card>

                        <Card className="lg:col-start-2 lg:col-span-1 lg:row-span-2">
                            <Title>Proprietário do Veículo</Title>
                            <div className="mt-4" style={{ height: veiculosContainerHeight }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={proprietarioData} margin={{ left: 0, right: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} angle={-45} textAnchor="end" height={80} />
                                        <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
                                        <Tooltip formatter={(value: any) => [`${value}`, 'Veículos']} />
                                        <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={32}
                                            onClick={(data: any, _index: number, event: any) => { handleChartClick('proprietario', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' }); }}
                                            cursor="pointer">
                                            <LabelList dataKey="value" position="top" fontSize={11} fill="#1e293b" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card className="lg:col-start-3 lg:col-span-1 lg:row-span-2">
                            <Title>Finalidade de Uso</Title>
                            <div className="mt-4" style={{ height: veiculosContainerHeight }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={finalidadeData} margin={{ left: 0, right: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} angle={-45} textAnchor="end" height={80} />
                                        <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
                                        <Tooltip formatter={(value: any) => [`${value}`, 'Veículos']} />
                                        <Bar dataKey="value" fill="#06b6d4" radius={[6, 6, 0, 0]} barSize={32}
                                            onClick={(data: any, _index: number, event: any) => { handleChartClick('finalidade', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' }); }}
                                            cursor="pointer">
                                            <LabelList dataKey="value" position="top" fontSize={11} fill="#1e293b" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

                    {/* Gráficos de Localização (Telemetria) - Hierárquico */}
                    <div className="grid grid-cols-1 gap-6">
                        <Card className="p-0 overflow-hidden">
                            <div
                                className="p-4 border-b border-slate-200 flex items-center justify-between cursor-pointer"
                                role="button"
                                aria-expanded={!geoCollapsed}
                                onClick={() => setGeoCollapsed(v => !v)}
                            >
                                <div>
                                    <Title className="inline">Distribuição Geográfica de Veículos (Por Estado)</Title>
                                    <Text className="text-xs text-slate-500">Expanda o estado para visualizar as cidades</Text>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className="ml-2">{mapData.length} veículos</Badge>
                                    <ChevronDown className={`ml-2 transition-transform duration-200 ${geoCollapsed ? '' : 'rotate-180'}`} />
                                </div>
                            </div>
                            {!geoCollapsed && (
                                <div className="p-4">
                                    <Accordion type="single" collapsible value={accordionValue ?? undefined} onValueChange={(v) => setAccordionValue(v)} className="w-full">
                                        {localizacaoHierarquica.map((item) => (
                                            <AccordionItem key={item.uf} value={item.uf} className="border-b border-slate-100 last:border-0">
                                                <AccordionTrigger className="hover:no-underline py-3 px-2 hover:bg-slate-50 rounded-lg group">
                                                    <div className="flex w-full items-center justify-between pr-4">
                                                        <div className="flex items-center gap-3">
                                                            <Badge size="lg" className="w-12 justify-center font-bold bg-blue-600 text-white">{item.uf === 'ND' ? 'Não classificados' : item.uf}</Badge>
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
                                                        <Title className="text-sm mb-3 text-slate-700">Veículos por Município em {item.uf}</Title>
                                                        <div className="mt-2 space-y-1 max-h-96 overflow-y-auto">
                                                            {item.cities.map((city) => (
                                                                <div
                                                                    key={city.name}
                                                                    className={`flex items-center justify-between text-sm p-2 rounded cursor-pointer transition-colors ${selectedLocation?.city === city.name && selectedLocation?.uf === item.uf ? 'bg-blue-100 ring-1 ring-blue-500' : 'hover:bg-blue-50'}`}
                                                                    onClick={() => handleLocationClick(item.uf, city.name)}
                                                                >
                                                                    <div className="flex items-center gap-2 truncate">
                                                                        <div className={`h-2 w-2 rounded-full ${selectedLocation?.city === city.name && selectedLocation?.uf === item.uf ? 'bg-blue-600' : 'bg-blue-400'}`} />
                                                                        <span className="truncate text-slate-700 font-medium">{city.name}</span>
                                                                    </div>
                                                                    <div className="flex flex-col items-end">
                                                                        <span className="text-slate-600 font-medium">{city.value} veículos</span>
                                                                        {item.uf === 'ND' && city.name === 'Não classificados' && naoClassificadosPlacas.length > 0 && (
                                                                            <div className="mt-2 flex gap-2 flex-wrap max-w-[360px] justify-end">
                                                                                {naoClassificadosPlacas.map(p => (
                                                                                    <button
                                                                                        key={p}
                                                                                        onClick={() => {
                                                                                            applyFilterValues('search', [p]);
                                                                                            // garantir que a tabela local de telemetria também aplique a pesquisa
                                                                                            setAppliedPlateSearch(p);
                                                                                            setPlateSearch(p);
                                                                                            setActiveTab('telemetria');
                                                                                            // rolar até a tabela de telemetria para foco do usuário
                                                                                            setTimeout(() => {
                                                                                                const el = document.getElementById('telemetria-table');
                                                                                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                                                // tentar focar o input de pesquisa local se existir
                                                                                                const input = el?.querySelector('input[placeholder="Pesquisar placa"]') as HTMLElement | null;
                                                                                                if (input) input.focus();
                                                                                            }, 120);
                                                                                        }}
                                                                                        className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium text-slate-700 hover:bg-blue-50"
                                                                                    >
                                                                                        {p}
                                                                                    </button>
                                                                                ))}
                                                                                {naoClassificadosPlacas.length > 30 && (
                                                                                    <span className="px-2 py-0.5 bg-slate-50 rounded text-xs text-slate-500">+{naoClassificadosPlacas.length - 30} mais</span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
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
                            )}
                        </Card>
                    </div>

                    {/* Mapa */}
                    <Card className="p-0 overflow-hidden relative">
                        <div
                            className="p-4 border-b border-slate-100 flex items-center gap-2 bg-white rounded-t-lg cursor-pointer"
                            role="button"
                            aria-expanded={!localizacaoCollapsed}
                            onClick={() => setLocalizacaoCollapsed(v => !v)}
                        >
                            <MapPin className="w-5 h-5 text-blue-600" />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <Title>Localização</Title>
                                    {selectedLocation && <Badge color="indigo">{selectedLocation.city}/{selectedLocation.uf}</Badge>}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge className="ml-2">{mapData.length} veículos</Badge>
                                <div className="text-sm text-slate-600">Mostrando {Math.min(markerLimit, mapData.length)} / {fmtDecimal(mapData.length)}</div>
                                {markerLimit < mapData.length && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setMarkerLimit(prev => Math.min(mapData.length, prev + 500)); }}
                                        className="ml-2 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-100 hover:bg-blue-100"
                                    >
                                        Carregar mais
                                    </button>
                                )}
                                {markerLimit < mapData.length && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setMarkerLimit(mapData.length); }}
                                        className="ml-2 px-2 py-1 text-xs bg-slate-50 text-slate-700 rounded border border-slate-100 hover:bg-slate-100"
                                    >
                                        Mostrar todos
                                    </button>
                                )}
                                {markerLimit > 500 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setMarkerLimit(500); }}
                                        className="ml-2 px-2 py-1 text-xs bg-rose-50 text-rose-600 rounded border border-rose-100 hover:bg-rose-100"
                                    >
                                        Reduzir
                                    </button>
                                )}
                            </div>
                            {selectedLocation && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedLocation(null); }}
                                    className="ml-2 px-2 py-1 text-xs bg-rose-50 text-rose-600 rounded border border-rose-100 hover:bg-rose-100"
                                >
                                    Limpar
                                </button>
                            )}
                            <ChevronDown className={`ml-2 transition-transform duration-200 ${localizacaoCollapsed ? '' : 'rotate-180'}`} />
                        </div>

                        {!localizacaoCollapsed && (
                            <div className="h-[500px] w-full">
                                <MapContainer center={[-15.7942, -47.8822]} zoom={4} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; OpenStreetMap'
                                    />
                                    {mapData.slice(0, markerLimit).map((v, idx) => (
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
                        )}
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
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Pesquisar placa"
                                    value={plateSearch}
                                    onChange={(e) => {
                                        const v = (e.target.value || '');
                                        setPlateSearch(v);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const v = (plateSearch || '').trim();
                                            if (plateDebounceRef.current) { window.clearTimeout(plateDebounceRef.current); plateDebounceRef.current = null; }
                                            setAppliedPlateSearch(v);
                                        }
                                    }}
                                    className="w-44 md:w-56 mr-2"
                                />
                                {plateSearch && (
                                    <button
                                        className="px-2 py-1 bg-rose-50 text-rose-600 rounded border border-rose-100 hover:bg-rose-100 text-xs"
                                        onClick={() => { setPlateSearch(''); setAppliedPlateSearch(''); }}
                                    >
                                        Limpar
                                    </button>
                                )}
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
                                            'Proprietário': r.Proprietario || 'N/A',
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
                                    <FileSpreadsheet size={16} /> Exportar
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Placa</th>
                                        <th className="px-4 py-3">Modelo</th>
                                        <th className="px-4 py-3">Cliente</th>
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
                                                <td className="px-4 py-3 text-slate-700 text-xs">{r.NomeCliente}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.tipo === 'Produtiva' ? 'bg-emerald-100 text-emerald-700' :
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

                {/* Aba 'Eficiência' removida */}

                <TabsContent value="timeline">
                    <TimelineTab
                        timeline={timeline}
                        timelineLoading={timelineLoading}
                        timelineError={timelineError}
                        timelineDiagnostics={timelineDiagnostics}
                        filteredData={filteredData}
                        frota={frotaEnriched}
                        manutencao={manutencao}
                        movimentacoes={movimentacoes}
                        contratosLocacao={contratosLocacao}
                        sinistros={sinistros}
                        multas={multas}
                        qualValuesLoading={needsTimeline && loadingTimelineAux}
                        qualValuesError={needsTimeline ? (errorTimelineAux || null) : null}
                        qualValuesCoverage={qualValuesCoverage}
                    />
                </TabsContent>

                <TabsContent value="carro-reserva" className="space-y-6">
                    {(loadingPrimary || loadingSecondary) && (
                        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 shadow-sm">
                            <div className="p-12 text-center">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-200 flex items-center justify-center">
                                    <svg className="animate-spin w-10 h-10 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                                        <path className="opacity-75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor"></path>
                                    </svg>
                                </div>
                                <Title className="text-slate-600 font-bold tracking-tight">Carregando Carro Reserva</Title>
                                <Text className="mt-3 text-slate-500 max-w-md mx-auto">
                                    Buscando dados de ocorrências e processando indicadores de performance. Aguarde a conclusão da carga.
                                </Text>
                            </div>
                        </Card>
                    )}

                    {!loadingPrimary && !loadingSecondary && carroReserva.length === 0 && (
                        <Card className="bg-white border border-slate-200 shadow-sm">
                            <div className="p-12 text-center">
                                <Info className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                                <Title className="text-slate-600">Sem Dados de Carro Reserva</Title>
                                <Text className="mt-2 text-slate-500 max-w-lg mx-auto">
                                    Nenhuma ocorrência de carro reserva foi encontrada para o período e filtros selecionados. Verifique se o arquivo <code className="bg-slate-100 px-1 rounded text-slate-700 font-mono text-[10px]">fat_carro_reserva.json</code> está atualizado no servidor.
                                </Text>
                            </div>
                        </Card>
                    )}
                    {!loadingPrimary && !loadingSecondary && carroReserva.length > 0 && (
                        <>
                            {/* Filtros */}
                            <Card className="bg-white shadow-sm border border-slate-200">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-slate-500" /><Text className="font-medium text-slate-700">Filtros de Carro Reserva</Text></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <MultiSelect label="Motivo" options={reservaUniqueOptions.motivos} selected={selectedReservaMotivo} onSelectedChange={(v) => setReservaFilterValues('motivo', v)} />
                                    <MultiSelect label="Cliente" options={reservaUniqueOptions.clientes} selected={selectedReservaCliente} onSelectedChange={(v) => setReservaFilterValues('cliente', v)} />
                                    <MultiSelect label="Status" options={reservaUniqueOptions.statuses} selected={selectedReservaStatus} onSelectedChange={(v) => setReservaFilterValues('status', v)} />
                                </div>
                                <div className="flex gap-2 mt-4 flex-wrap items-center">
                                    {/* reserva badges are handled by ChartFilterBadges (labelMap) */}
                                    {selectedTemporalFilter && (
                                        <Badge
                                            className="bg-purple-100 text-purple-700 border border-purple-300 cursor-pointer hover:bg-purple-200 transition-colors"
                                            onClick={() => setSelectedTemporalFilter(null)}
                                        >
                                            📅 {selectedTemporalFilter.month
                                                ? `${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][parseInt(selectedTemporalFilter.month) - 1]}/${selectedTemporalFilter.year}`
                                                : selectedTemporalFilter.year
                                            } ✖
                                        </Badge>
                                    )}
                                </div>
                            </Card>

                            {/* KPIs - ATUALIZADO: KPIs de performance e ocupação */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                <Card decoration="top" decorationColor="blue">
                                    <Text className="text-xs font-medium uppercase tracking-wider text-slate-500">Total de Ocorrências</Text>
                                    <Metric className="mt-1">{fmtDecimal(reservaKPIs.total)}</Metric>
                                    <Text className="text-xs text-slate-400 mt-2">No período selecionado</Text>
                                </Card>
                                <Card decoration="top" decorationColor="emerald">
                                    <Text className="text-xs font-medium uppercase tracking-wider text-slate-500">Reservas Ativas</Text>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <Metric>{fmtDecimal(reservaKPIs.ativas)}</Metric>
                                        {reservaKPIs.atrasadas > 0 && (
                                            <Badge color="rose" size="xs" tooltip="Reservas ativas cuja data prevista de fim já venceu">
                                                {reservaKPIs.atrasadas} em atraso
                                            </Badge>
                                        )}
                                    </div>
                                    <Text className="text-xs text-slate-400 mt-2">Ativas operacionais (ex.: Aguardando devolução, Provisório, Em andamento)</Text>
                                </Card>

                                <Card decoration="top" decorationColor="violet">
                                    <Text className="text-xs font-medium uppercase tracking-wider text-slate-500">Tempo Médio (Geral)</Text>
                                    <Metric className="mt-1">{reservaKPIs.tempoMedio.toFixed(1)} <span className="text-sm font-normal text-slate-500">dias</span></Metric>
                                    <Text className="text-xs text-slate-400 mt-2">Base: Reservas concluídas</Text>
                                </Card>
                                <Card decoration="top" decorationColor="rose">
                                    <Text className="text-xs font-medium uppercase tracking-wider text-slate-500">Pico de Utilização</Text>
                                    <Metric className="mt-1">{ocupacaoKPIs.picoUtilizacao}</Metric>
                                    <Text className="text-xs text-slate-400 mt-2">Máx simultâneo no período</Text>
                                </Card>
                                <Card decoration="top" decorationColor="cyan">
                                    <Text className="text-xs font-medium uppercase tracking-wider text-slate-500">Média de Frota Ativa</Text>
                                    <Metric className="mt-1">{ocupacaoKPIs.mediaCarrosNaRua.toFixed(1)}</Metric>
                                    <Text className="text-xs text-slate-400 mt-2">Carros/dia no período</Text>
                                </Card>
                            </div>

                            {/* 1) Ocupação simultânea diária - destaque em largura total */}
                            <Card className="mt-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Title>Ocupação Simultânea Diária</Title>
                                        <div className="group relative">
                                            <Info size={16} className="text-slate-400 hover:text-blue-600 cursor-help transition-colors" />
                                            <div className="absolute left-0 top-6 w-80 bg-slate-800 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                                                <p className="font-semibold mb-2">ℹ️ Como funciona este gráfico:</p>
                                                <p className="mb-2"><strong>Fonte:</strong> fat_carro_reserva.json</p>
                                                <p className="mb-2"><strong>Cálculo:</strong> Para cada dia, conta quantos veículos estavam "na rua" simultaneamente.</p>
                                                <p className="mb-2"><strong>Regra:</strong> Um veículo conta se DataInicio &lt;= dia E (DataFim &gt;= dia OU DataFim = null)</p>
                                                <p><strong>💡 Dica:</strong> Use o slider abaixo para ajustar o período de análise!</p>
                                                <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-800 transform rotate-45"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {reservaDateBounds && (
                                    <div className="mb-4 px-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Text className="text-xs font-medium text-slate-700">Período de Análise:</Text>
                                                {selectedTemporalFilter && (
                                                    <Badge color="purple" size="xs">
                                                        Filtrado: {selectedTemporalFilter.month
                                                            ? `${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][parseInt(selectedTemporalFilter.month) - 1]}/${selectedTemporalFilter.year}`
                                                            : selectedTemporalFilter.year
                                                        }
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => applyReservaQuickRange(30)} className={`px-2 py-1 text-xs rounded transition-colors ${isReservaQuickRangeActive(30) ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-cyan-100 hover:text-cyan-700'}`}>Último mês</button>
                                                <button onClick={() => applyReservaQuickRange(90)} className={`px-2 py-1 text-xs rounded transition-colors ${isReservaQuickRangeActive(90) ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-cyan-100 hover:text-cyan-700'}`}>Últimos 3m</button>
                                                <button onClick={() => applyReservaQuickRange(180)} className={`px-2 py-1 text-xs rounded transition-colors ${isReservaQuickRangeActive(180) ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-cyan-100 hover:text-cyan-700'}`}>Últimos 6m</button>
                                                <button onClick={() => applyReservaQuickRange(null)} className={`px-2 py-1 text-xs rounded transition-colors ${isReservaQuickRangeActive(null) ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-cyan-100 hover:text-cyan-700'}`}>Todo período</button>
                                                <button
                                                    onClick={() => setIsCustomReservaDate(!isCustomReservaDate)}
                                                    className={`px-2 py-1 text-xs rounded transition-colors ${isCustomReservaDate ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700'}`}
                                                >
                                                    {isCustomReservaDate ? '✖ Fechar' : '📅 Personalizado'}
                                                </button>
                                            </div>
                                        </div>

                                        {isCustomReservaDate && (
                                            <div className="mb-4 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg flex flex-wrap gap-4 items-end animate-in fade-in slide-in-from-top-2">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-bold text-indigo-700 uppercase">Início</label>
                                                    <input
                                                        type="date"
                                                        className="px-2 py-1 text-sm border border-indigo-200 rounded bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        value={new Date(reservaDateBounds!.minDate.getTime() + ((reservaDateBounds!.maxDate.getTime() - reservaDateBounds!.minDate.getTime()) * sliderRange.startPercent / 100)).toISOString().split('T')[0]}
                                                        onChange={(e) => {
                                                            const d = new Date(e.target.value);
                                                            if (!isNaN(d.getTime())) {
                                                                const total = reservaDateBounds!.maxDate.getTime() - reservaDateBounds!.minDate.getTime();
                                                                const percent = Math.max(0, Math.min(100, (d.getTime() - reservaDateBounds!.minDate.getTime()) / total * 100));
                                                                setSliderRange(prev => ({ ...prev, startPercent: percent }));
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-bold text-indigo-700 uppercase">Fim</label>
                                                    <input
                                                        type="date"
                                                        className="px-2 py-1 text-sm border border-indigo-200 rounded bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        value={new Date(reservaDateBounds!.minDate.getTime() + ((reservaDateBounds!.maxDate.getTime() - reservaDateBounds!.minDate.getTime()) * sliderRange.endPercent / 100)).toISOString().split('T')[0]}
                                                        onChange={(e) => {
                                                            const d = new Date(e.target.value);
                                                            if (!isNaN(d.getTime())) {
                                                                const total = reservaDateBounds!.maxDate.getTime() - reservaDateBounds!.minDate.getTime();
                                                                const percent = Math.max(0, Math.min(100, (d.getTime() - reservaDateBounds!.minDate.getTime()) / total * 100));
                                                                setSliderRange(prev => ({ ...prev, endPercent: percent }));
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="text-xs text-indigo-600 italic pb-1">
                                                    O slider abaixo foi atualizado conforme as datas escolhidas.
                                                </div>
                                            </div>
                                        )}

                                        <div className="relative pt-1">
                                            <div className="flex items-center gap-3">
                                                <Text className="text-xs text-slate-500 min-w-[80px]">
                                                    {new Date(reservaDateBounds!.minDate.getTime() + ((reservaDateBounds!.maxDate.getTime() - reservaDateBounds!.minDate.getTime()) * sliderRange.startPercent / 100)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
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
                                                                setSliderRange(prev => ({ ...prev, startPercent: newStart }));
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
                                                                setSliderRange(prev => ({ ...prev, endPercent: newEnd }));
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
                                                    {new Date(reservaDateBounds!.minDate.getTime() + ((reservaDateBounds!.maxDate.getTime() - reservaDateBounds!.minDate.getTime()) * sliderRange.endPercent / 100)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                </Text>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <Text className="text-xs text-slate-500 mb-2">Evolução da quantidade de veículos reserva em uso simultâneo por dia <span className="text-cyan-600 font-medium">(clique em um ponto para ver detalhamento)</span></Text>
                                <div className="flex items-center gap-4 text-[11px] text-slate-500 mb-2">
                                    <span className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-cyan-500"></span>Em uso no dia</span>
                                    <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-teal-700"></span>Média móvel 7 dias</span>
                                </div>
                                <div className="h-80 mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={ocupacaoSimultaneaData}
                                            margin={{ left: 10, right: 30, top: 10, bottom: 20 }}
                                            onClick={(e: any) => {
                                                if (e && e.activePayload && e.activePayload[0]) {
                                                    const clickedDate = e.activePayload[0].payload.date;
                                                    setSelectedDayForDetail(clickedDate);
                                                    setTimeout(() => {
                                                        document.getElementById('reserva-day-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                    }, 100);
                                                }
                                            }}
                                        >
                                            <defs>
                                                <linearGradient id="colorOcupacao" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fontSize: 10 }}
                                                tickFormatter={(value) => {
                                                    const date = parseDateOnlyLocal(value) || new Date(value);
                                                    return `${date.getDate()}/${date.getMonth() + 1}`;
                                                }}
                                                interval={Math.floor(ocupacaoSimultaneaData.length / 12)}
                                            />
                                            <YAxis tick={{ fontSize: 12 }} label={{ value: 'Veículos', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                                            <Tooltip
                                                formatter={(value: any, name: any) => {
                                                    const numeric = typeof value === 'number' ? value : Number(value);
                                                    if (!Number.isFinite(numeric)) return [value, name];
                                                    return [name === 'Média móvel (7 dias)' ? numeric.toFixed(1) : Math.round(numeric), name];
                                                }}
                                                labelFormatter={(label) => {
                                                    const date = parseDateOnlyLocal(label) || new Date(label);
                                                    return isNaN(date.getTime()) ? String(label) : date.toLocaleDateString('pt-BR');
                                                }}
                                                cursor={{ stroke: '#06b6d4', strokeWidth: 2, strokeDasharray: '5 5' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="count"
                                                name="Em uso no dia"
                                                stroke="#06b6d4"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorOcupacao)"
                                                dot={{ fill: '#06b6d4', r: 3, cursor: 'pointer' }}
                                                activeDot={{ r: 6, fill: '#0891b2', stroke: '#fff', strokeWidth: 2, cursor: 'pointer' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="mediaMovel7d"
                                                name="Média móvel (7 dias)"
                                                stroke="#0f766e"
                                                strokeWidth={2}
                                                strokeDasharray="6 4"
                                                fill="none"
                                                fillOpacity={0}
                                                dot={false}
                                                activeDot={false}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Detalhamento do dia clicado */}
                                {selectedDayForDetail && reservasDetailForSelectedDay.length > 0 && (
                                    <div id="reserva-day-detail" className="mt-6 pt-6 border-t border-slate-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <Title className="text-slate-700">Detalhamento - {(parseDateOnlyLocal(selectedDayForDetail) || new Date(selectedDayForDetail)).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</Title>
                                                <Text className="text-slate-500 text-sm mt-1">{reservasDetailForSelectedDay.length} veículo(s) reserva em uso simultâneo neste dia</Text>
                                            </div>
                                            <button
                                                onClick={() => setSelectedDayForDetail(null)}
                                                className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1"
                                            >
                                                ✖ Fechar
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full bg-white border border-slate-200 rounded-lg text-xs">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th onClick={() => toggleReservaUsoSort('Placa')} className="px-3 py-2 text-left font-semibold text-slate-700 border-b cursor-pointer select-none"><div className="flex items-center gap-1">Placa {reservaUsoSortIcon('Placa')}</div></th>
                                                        <th onClick={() => toggleReservaUsoSort('Modelo')} className="px-3 py-2 text-left font-semibold text-slate-700 border-b cursor-pointer select-none"><div className="flex items-center gap-1">Modelo {reservaUsoSortIcon('Modelo')}</div></th>
                                                        <th onClick={() => toggleReservaUsoSort('Cliente')} className="px-3 py-2 text-left font-semibold text-slate-700 border-b cursor-pointer select-none"><div className="flex items-center gap-1">Cliente {reservaUsoSortIcon('Cliente')}</div></th>
                                                        <th onClick={() => toggleReservaUsoSort('Fornecedor')} className="px-3 py-2 text-left font-semibold text-slate-700 border-b cursor-pointer select-none"><div className="flex items-center gap-1">Fornecedor {reservaUsoSortIcon('Fornecedor')}</div></th>
                                                        <th onClick={() => toggleReservaUsoSort('Motivo')} className="px-3 py-2 text-left font-semibold text-slate-700 border-b cursor-pointer select-none"><div className="flex items-center gap-1">Motivo {reservaUsoSortIcon('Motivo')}</div></th>
                                                        <th onClick={() => toggleReservaUsoSort('Status')} className="px-3 py-2 text-left font-semibold text-slate-700 border-b cursor-pointer select-none"><div className="flex items-center gap-1">Status {reservaUsoSortIcon('Status')}</div></th>
                                                        <th onClick={() => toggleReservaUsoSort('Ativa')} className="px-3 py-2 text-left font-semibold text-slate-700 border-b cursor-pointer select-none"><div className="flex items-center gap-1">Ativa? {reservaUsoSortIcon('Ativa')}</div></th>
                                                        <th onClick={() => toggleReservaUsoSort('DataInicio')} className="px-3 py-2 text-left font-semibold text-slate-700 border-b cursor-pointer select-none"><div className="flex items-center gap-1">Data Início {reservaUsoSortIcon('DataInicio')}</div></th>
                                                        <th onClick={() => toggleReservaUsoSort('DataFim')} className="px-3 py-2 text-left font-semibold text-slate-700 border-b cursor-pointer select-none"><div className="flex items-center gap-1">Data Fim {reservaUsoSortIcon('DataFim')}</div></th>
                                                        <th onClick={() => toggleReservaUsoSort('Dias')} className="px-3 py-2 text-right font-semibold text-slate-700 border-b cursor-pointer select-none"><div className="inline-flex items-center gap-1">Dias {reservaUsoSortIcon('Dias')}</div></th>
                                                        <th onClick={() => toggleReservaUsoSort('Local')} className="px-3 py-2 text-left font-semibold text-slate-700 border-b cursor-pointer select-none"><div className="flex items-center gap-1">Local {reservaUsoSortIcon('Local')}</div></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reservasDetailForSelectedDaySorted.map((r, idx) => {
                                                        const statusCategoria = getReservaStatusCategoria(r as AnyObject);
                                                        const isAtiva = isReservaAtiva(r as AnyObject);
                                                        const fornecedor = getReservaFornecedor(r as AnyObject);
                                                        const fimInfo = getReservaFimDisplay(r as AnyObject);
                                                        const diariasFonte = Number(r.DiariasEfetivas ?? r.Diarias ?? 0);
                                                        const diasParado = (() => {
                                                            if (diariasFonte > 0) return Math.ceil(diariasFonte);
                                                            if (!r.DataInicio) return 0;
                                                            if (!isAtiva && !r.DataFim) return 0;
                                                            const fim = getReservaFimOperacional(r as AnyObject);
                                                            return Math.max(0, Math.ceil((fim.getTime() - new Date(r.DataInicio).getTime()) / (1000 * 60 * 60 * 24)));
                                                        })();
                                                        return (
                                                            <tr key={idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                                                                <td className="px-3 py-2 font-mono font-semibold text-slate-800">{r.PlacaReserva || r.PlacaVeiculoInterno || r.PlacaTitular || '—'}</td>
                                                                <td className="px-3 py-2 text-slate-700">{r.ModeloVeiculoReserva || r.ModeloReserva || '—'}</td>
                                                                <td className="px-3 py-2 text-slate-700">{r.Cliente || '—'}</td>
                                                                <td className="px-3 py-2 text-slate-700">{fornecedor}</td>
                                                                <td className="px-3 py-2">
                                                                    <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                                                                        {r.Motivo || '—'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${!(r.StatusOcorrencia || r.SituacaoOcorrencia)
                                                                        ? 'bg-slate-50 text-slate-400 italic font-normal border border-slate-100'
                                                                        : (r.StatusOcorrencia || r.SituacaoOcorrencia || '').toLowerCase().includes('concluída')
                                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                                                                        }`}>
                                                                        {r.StatusOcorrencia || r.SituacaoOcorrencia || 'Sem status'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 text-center">
                                                                    {isAtiva ? (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                                                                            ● ATIVA
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                                                                            {statusCategoria}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2 text-slate-600">{r.DataInicio ? new Date(r.DataInicio).toLocaleDateString('pt-BR') : '—'}</td>
                                                                <td className="px-3 py-2 text-slate-600">
                                                                    {fimInfo.tone === 'date' && <span className="text-slate-600">{fimInfo.text}</span>}
                                                                    {fimInfo.tone === 'active' && <span className="text-rose-600 font-medium">{fimInfo.text}</span>}
                                                                    {fimInfo.tone === 'muted' && <span className="text-slate-500">{fimInfo.text}</span>}
                                                                </td>
                                                                <td className="px-3 py-2 text-right font-medium text-slate-700">{diasParado > 0 ? diasParado : '—'}</td>
                                                                <td className="px-3 py-2 text-slate-600 text-xs">{r.Cidade ? `${r.Cidade}${r.Estado ? ` / ${r.Estado}` : ''}` : '—'}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </Card>

                            {/* 2) Evolução hierárquica de ocorrências (Ano->Mês->Dia) - largura cheia */}
                            <Card className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <Title>Evolu&ccedil;&atilde;o de Ocorr&ecirc;ncias <span className="text-xs text-slate-500 font-normal">(Use o chevron para expandir; clique no texto para filtrar)</span></Title>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                const allYears = reservaKPIs.monthlyData.map(y => y.year);
                                                const expandingAll = expandedYears.length !== allYears.length;
                                                setExpandedYears(expandingAll ? allYears : []);
                                                if (expandingAll) {
                                                    const allMonthKeys = reservaKPIs.monthlyData.flatMap(y => y.months.map(m => `${y.year}-${m.month}`));
                                                    setExpandedMonths(Array.from(new Set(allMonthKeys)));
                                                } else {
                                                    setExpandedMonths([]);
                                                }
                                            }}
                                            className="text-xs px-2 py-1 border border-blue-200 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                                        >
                                            {expandedYears.length === reservaKPIs.monthlyData.length ? '− Colapsar Tudo' : '+ Expandir Tudo'}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {reservaKPIs.monthlyData.map(yearData => {
                                        const isYearExpanded = expandedYears.includes(yearData.year);
                                        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

                                        return (
                                            <div key={yearData.year} className="border border-slate-200 rounded-lg overflow-hidden">
                                                {/* Linha do Ano */}
                                                <div
                                                    onClick={(e) => {
                                                        if (e.ctrlKey || e.metaKey) {
                                                            // Ctrl+click: expandir/colapsar meses junto com o ano
                                                            if (expandedYears.includes(yearData.year)) {
                                                                // já expandido -> colapsar ano e remover meses desse ano
                                                                setExpandedYears(prev => prev.filter(y => y !== yearData.year));
                                                                setExpandedMonths(prev => prev.filter(m => !m.startsWith(`${yearData.year}-`)));
                                                            } else {
                                                                // expandir ano e abrir todos os meses desse ano
                                                                setExpandedYears(prev => [...prev, yearData.year]);
                                                                const monthKeys = yearData.months.map(m => `${yearData.year}-${m.month}`);
                                                                setExpandedMonths(prev => Array.from(new Set([...prev, ...monthKeys])));
                                                            }
                                                        } else {
                                                            // Click normal: filtrar por este ano
                                                            if (selectedTemporalFilter?.year === yearData.year && !selectedTemporalFilter?.month) {
                                                                setSelectedTemporalFilter(null);
                                                            } else {
                                                                setSelectedTemporalFilter({ year: yearData.year });
                                                            }
                                                            setTimeout(() => {
                                                                document.getElementById('reserva-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                            }, 100);
                                                        }
                                                    }}
                                                    className={`flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors ${selectedTemporalFilter?.year === yearData.year && !selectedTemporalFilter?.month ? 'ring-2 ring-blue-600 ring-inset' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isYearExpanded) {
                                                                    setExpandedYears(prev => prev.filter(y => y !== yearData.year));
                                                                    setExpandedMonths(prev => prev.filter(m => !m.startsWith(`${yearData.year}-`)));
                                                                } else {
                                                                    setExpandedYears(prev => [...prev, yearData.year]);
                                                                    const monthKeys = yearData.months.map(m => `${yearData.year}-${m.month}`);
                                                                    setExpandedMonths(prev => Array.from(new Set([...prev, ...monthKeys])));
                                                                }
                                                            }}
                                                            className="w-6 h-6 flex items-center justify-center text-sm rounded hover:bg-slate-100"
                                                            aria-label={isYearExpanded ? 'Colapsar ano' : 'Expandir ano'}
                                                        >
                                                            {isYearExpanded ? '▼' : '▶'}
                                                        </button>
                                                        <span className="text-lg font-bold text-blue-700">{yearData.year}</span>
                                                        <Badge className="bg-blue-600 text-white">{yearData.yearTotal} ocorrências</Badge>
                                                        {yearData.prevYearTotal > 0 && (
                                                            <span className={`text-xs font-medium ${yearData.yoyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {yearData.yoyChange >= 0 ? '▲' : '▼'} {Math.abs(yearData.yoyChange).toFixed(1)}% vs {parseInt(yearData.year) - 1}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, (yearData.yearTotal / Math.max(...reservaKPIs.monthlyData.map(y => y.yearTotal))) * 100)}%` }}></div>
                                                    </div>
                                                </div>

                                                {/* Meses do Ano (se expandido) */}
                                                {isYearExpanded && (
                                                    <div className="bg-white">
                                                        {yearData.months.map(monthData => {
                                                            const monthKey = `${yearData.year}-${monthData.month}`;
                                                            const isMonthExpanded = expandedMonths.includes(monthKey);

                                                            return (
                                                                <div key={monthKey} className="border-t border-slate-100">
                                                                    {/* Linha do Mês */}
                                                                    <div
                                                                        onClick={(e) => {
                                                                            // Ctrl+click: expandir/colapsar dias
                                                                            if (e.ctrlKey || e.metaKey) {
                                                                                setExpandedMonths(prev =>
                                                                                    prev.includes(monthKey)
                                                                                        ? prev.filter(m => m !== monthKey)
                                                                                        : [...prev, monthKey]
                                                                                );
                                                                            } else {
                                                                                // Click normal: filtrar por este mês
                                                                                if (selectedTemporalFilter?.year === yearData.year && selectedTemporalFilter?.month === monthData.month) {
                                                                                    setSelectedTemporalFilter(null);
                                                                                } else {
                                                                                    setSelectedTemporalFilter({ year: yearData.year, month: monthData.month });
                                                                                }
                                                                                // Scroll suave para a tabela
                                                                                setTimeout(() => {
                                                                                    document.getElementById('reserva-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                                }, 100);
                                                                            }
                                                                        }}
                                                                        className={`flex items-center justify-between p-2 pl-8 hover:bg-blue-50 cursor-pointer transition-colors ${selectedTemporalFilter?.year === yearData.year && selectedTemporalFilter?.month === monthData.month ? 'bg-blue-100 border-l-4 border-blue-600' : ''}`}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const monthKey = `${yearData.year}-${monthData.month}`;
                                                                                    if (isMonthExpanded) {
                                                                                        setExpandedMonths(prev => prev.filter(m => m !== monthKey));
                                                                                    } else {
                                                                                        setExpandedMonths(prev => Array.from(new Set([...prev, monthKey])));
                                                                                    }
                                                                                }}
                                                                                className="w-6 h-6 flex items-center justify-center text-xs rounded hover:bg-slate-100 mr-2"
                                                                                aria-label={isMonthExpanded ? 'Colapsar mês' : 'Expandir mês'}
                                                                            >
                                                                                {isMonthExpanded ? '▼' : '▶'}
                                                                            </button>
                                                                            <span className={`text-sm font-medium ${selectedTemporalFilter?.year === yearData.year && selectedTemporalFilter?.month === monthData.month
                                                                                ? 'text-blue-700 font-bold'
                                                                                : 'text-slate-700'
                                                                                }`}>{monthNames[parseInt(monthData.month) - 1]}</span>
                                                                            <Badge size="xs" className={selectedTemporalFilter?.year === yearData.year && selectedTemporalFilter?.month === monthData.month ? 'bg-blue-600 text-white' : 'bg-slate-600 text-white'}>{monthData.monthTotal}</Badge>
                                                                            {monthData.prevMonthTotal > 0 && (
                                                                                <span className={`text-xs ${monthData.monthYoyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                                    {monthData.monthYoyChange >= 0 ? '▲' : '▼'} {Math.abs(monthData.monthYoyChange).toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                            <div className="h-full bg-slate-600 rounded-full" style={{ width: `${Math.min(100, (monthData.monthTotal / yearData.yearTotal) * 100)}%` }}></div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Dias do Mês (se expandido) */}
                                                                    {isMonthExpanded && (
                                                                        <div className="bg-slate-50 px-4 py-2">
                                                                            <div className="grid grid-cols-7 gap-1">
                                                                                {monthData.days.map(dayData => (
                                                                                    <div key={dayData.day} className="text-center p-1 bg-white rounded border border-slate-200">
                                                                                        <div className="text-xs font-medium text-slate-500">Dia {parseInt(dayData.day)}</div>
                                                                                        <div className="text-sm font-bold text-blue-600">{dayData.count}</div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>

                            {/* 3) Abas para Motivo / Status / Tipo Veículo / Modelo / Cliente / Local */}
                            <Card className="mt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <Title>Resumo Anal&iacute;tico de Carro Reserva</Title>
                                    <div className="flex gap-2 flex-wrap">
                                        <button
                                            onClick={() => setSelectedResumoChart('motivo')}
                                            className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedResumoChart === 'motivo' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            Motivo
                                        </button>
                                        <button
                                            onClick={() => setSelectedResumoChart('status')}
                                            className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedResumoChart === 'status' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            Status
                                        </button>
                                        <button
                                            onClick={() => setSelectedResumoChart('tipo')}
                                            className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedResumoChart === 'tipo' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            Tipo Veículo
                                        </button>
                                        <button
                                            onClick={() => setSelectedResumoChart('modelo')}
                                            className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedResumoChart === 'modelo' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            Modelo
                                        </button>
                                        <button
                                            onClick={() => setSelectedResumoChart('cliente')}
                                            className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedResumoChart === 'cliente' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            Diárias por Cliente
                                        </button>
                                        <button
                                            onClick={() => setSelectedResumoChart('local')}
                                            className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedResumoChart === 'local' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            Diárias por Local
                                        </button>
                                    </div>
                                </div>

                                <div className="h-72 mt-1">
                                    {selectedResumoChart === 'motivo' && (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={reservaKPIs.motivoData} layout="vertical" margin={{ left: 0, right: 80 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} />
                                                <Tooltip formatter={(value: any) => [`${value}`, 'Ocorrências']} />
                                                <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={20} fill="#f59e0b" onClick={(data: any, _index: number, event: any) => { handleChartClick('reserva_motivo', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('reserva-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                                    <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}

                                    {selectedResumoChart === 'status' && (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={reservaKPIs.statusData} layout="vertical" margin={{ left: 0, right: 80 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} />
                                                <Tooltip formatter={(value: any) => [`${value}`, 'Ocorrências']} />
                                                <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={20} fill="#06b6d4" onClick={(data: any, _index: number, event: any) => { handleChartClick('reserva_status', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('reserva-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                                    <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}

                                    {selectedResumoChart === 'tipo' && (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={tipoVeiculoCounts} layout="vertical" margin={{ left: 0, right: 80 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 11 }} />
                                                <Tooltip formatter={(value: any) => [`${value}`, 'Ocorrências']} />
                                                <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={16} fill="#7c3aed" onClick={(data: any, _index: number, event: any) => { handleChartClick('reserva_tipo', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('reserva-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                                    <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} fontSize={10} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}

                                    {selectedResumoChart === 'modelo' && (
                                        <div className="overflow-y-auto" style={{ maxHeight: 256 }}>
                                            <div style={{ height: Math.max(256, reservaModelData.length * 35) }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={reservaModelData} layout="vertical" margin={{ left: 0, right: 80 }}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 11 }} />
                                                        <Tooltip formatter={(value: any) => [`${value}`, 'Vezes Usado']} />
                                                        <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={16} fill="#8b5cf6" onClick={(data: any, _index: number, event: any) => { handleChartClick('reserva_modelo', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('reserva-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                                            <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} fontSize={10} />
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}

                                    {selectedResumoChart === 'cliente' && (
                                        <div className="overflow-y-auto" style={{ maxHeight: 256 }}>
                                            <div style={{ height: Math.max(256, diariasByCliente.length * 35) }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={diariasByCliente} layout="vertical" margin={{ left: 0, right: 80 }}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 10 }} />
                                                        <Tooltip formatter={(value: any) => [`${value}`, 'Diárias']} />
                                                        <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={14} fill="#10b981" onClick={(data: any, _index: number, event: any) => { handleChartClick('reserva_cliente', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('reserva-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                                            <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} fontSize={10} />
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}

                                    {selectedResumoChart === 'local' && (
                                        <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
                                            <div style={{ height: Math.max(300, diariasByLocation.length * 25) }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={diariasByLocation} layout="vertical" margin={{ left: 0, right: 50 }}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 10 }} />
                                                        <Tooltip formatter={(value: any) => [`${value}`, 'Diárias']} />
                                                        <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={14} fill="#2563eb" onClick={(data: any, _index: number, event: any) => { handleChartClick('reserva_local', data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('reserva-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                                                            <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} fontSize={10} />
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Modelos agora acessíveis via o card de Resumo (botão 'Modelo') - card duplicado removido */}

                            {/* Tabela de Detalhamento */}
                            <Card id="reserva-table" className="border-slate-200 overflow-hidden flex flex-col p-0">
                                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Title className="text-slate-700">Detalhamento de Carro Reserva</Title>
                                        <Badge color="blue" size="sm" className="font-bold">{fmtDecimal(filteredReservas.length)} registros</Badge>
                                    </div>
                                    <button onClick={() => exportToExcel(filteredReservas, 'carro_reserva')} className="flex items-center gap-2 text-xs text-slate-600 hover:text-emerald-600 transition-colors border px-3 py-1.5 rounded-md bg-white shadow-sm">
                                        <FileSpreadsheet size={14} /> Exportar Excel
                                    </button>
                                </div>
                                <div className="overflow-auto max-h-[600px] relative">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="bg-slate-50 text-slate-600 uppercase text-xs sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th onClick={() => toggleReservaSort('Ativa')} className="px-4 py-3 min-w-[100px] cursor-pointer select-none"><div className="flex items-center gap-2"><span>Ativa?</span><ReservaSortIcon col="Ativa" /></div></th>
                                                <th onClick={() => toggleReservaSort('DataCriacao')} className="px-4 py-3 min-w-[120px] cursor-pointer select-none"><div className="flex items-center gap-2"><span>Data Criação</span><ReservaSortIcon col="DataCriacao" /></div></th>
                                                <th onClick={() => toggleReservaSort('DataInicio')} className="px-4 py-3 min-w-[120px] cursor-pointer select-none"><div className="flex items-center gap-2"><span>Data Início</span><ReservaSortIcon col="DataInicio" /></div></th>
                                                <th onClick={() => toggleReservaSort('DataFim')} className="px-4 py-3 min-w-[120px] cursor-pointer select-none"><div className="flex items-center gap-2"><span>Data Fim</span><ReservaSortIcon col="DataFim" /></div></th>
                                                <th onClick={() => toggleReservaSort('Ocorrencia')} className="px-4 py-3 min-w-[120px] cursor-pointer select-none"><div className="flex items-center gap-2"><span>Ocorrência</span><ReservaSortIcon col="Ocorrencia" /></div></th>
                                                <th onClick={() => toggleReservaSort('Placa')} className="px-4 py-3 min-w-[110px] cursor-pointer select-none"><div className="flex items-center gap-2"><span>Placa</span><ReservaSortIcon col="Placa" /></div></th>
                                                <th onClick={() => toggleReservaSort('Modelo')} className="px-4 py-3 min-w-[150px] cursor-pointer select-none"><div className="flex items-center gap-2"><span>Modelo</span><ReservaSortIcon col="Modelo" /></div></th>
                                                <th onClick={() => toggleReservaSort('Diarias')} className="px-4 py-3 min-w-[80px] cursor-pointer select-none"><div className="flex items-center gap-2"><span>Diárias</span><ReservaSortIcon col="Diarias" /></div></th>
                                                <th onClick={() => toggleReservaSort('Cliente')} className="px-4 py-3 min-w-[150px] cursor-pointer select-none"><div className="flex items-center gap-2"><span>Cliente</span><ReservaSortIcon col="Cliente" /></div></th>
                                                <th onClick={() => toggleReservaSort('Fornecedor')} className="px-4 py-3 min-w-[170px] cursor-pointer select-none"><div className="flex items-center gap-2"><span>Fornecedor</span><ReservaSortIcon col="Fornecedor" /></div></th>
                                                <th onClick={() => toggleReservaSort('Motivo')} className="px-4 py-3 min-w-[150px] cursor-pointer select-none"><div className="flex items-center gap-2"><span>Motivo</span><ReservaSortIcon col="Motivo" /></div></th>
                                                <th onClick={() => toggleReservaSort('Status')} className="px-4 py-3 min-w-[150px] cursor-pointer select-none"><div className="flex items-center gap-2"><span>Status</span><ReservaSortIcon col="Status" /></div></th>
                                                <th onClick={() => toggleReservaSort('Localizacao')} className="px-4 py-3 min-w-[200px] cursor-pointer select-none"><div className="flex items-center gap-2"><span>Localização</span><ReservaSortIcon col="Localizacao" /></div></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {reservaPageItems.map((r, i) => {
                                                const isAtiva = isReservaAtiva(r as AnyObject);
                                                const statusCategoria = getReservaStatusCategoria(r as AnyObject);
                                                const statusOperacional = getReservaStatusOperacional(r as AnyObject);
                                                const fornecedor = getReservaFornecedor(r as AnyObject);
                                                const fimInfo = getReservaFimDisplay(r as AnyObject);
                                                const badgeColor = isAtiva ? 'bg-emerald-100 text-emerald-700' : (statusCategoria === 'Cancelada' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500');
                                                return (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3">
                                                            {isAtiva ? (
                                                                <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                    ATIVA
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400 text-[10px] px-2 py-1 bg-slate-50 rounded-full">{statusCategoria}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">{r.DataCriacao ? new Date(r.DataCriacao).toLocaleDateString('pt-BR') : '-'}</td>
                                                        <td className="px-4 py-3 text-slate-700 font-medium">{r.DataInicio ? new Date(r.DataInicio).toLocaleDateString('pt-BR') : '-'}</td>
                                                        <td className="px-4 py-3">
                                                            {fimInfo.tone === 'date' && <span className="text-slate-600">{fimInfo.text}</span>}
                                                            {fimInfo.tone === 'active' && <span className="text-red-600 font-medium italic animate-pulse">{fimInfo.text}</span>}
                                                            {fimInfo.tone === 'muted' && <span className="text-slate-500">{fimInfo.text}</span>}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.Ocorrencia || r.IdOcorrencia || '-'}</td>
                                                        <td className="px-4 py-3 font-bold text-slate-700 font-mono underline decoration-slate-200">{r.PlacaReserva || '-'}</td>
                                                        <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">{r.ModeloVeiculoReserva || r.ModeloReserva || r.Modelo || '-'}</td>
                                                        <td className="px-4 py-3 font-medium text-slate-700">{(r.DiariasEfetivas !== undefined && r.DiariasEfetivas !== null) ? String(r.DiariasEfetivas) : ((r.Diarias !== undefined && r.Diarias !== null) ? String(r.Diarias) : '-')}</td>
                                                        <td className="px-4 py-3 text-slate-500 truncate max-w-[150px]">{r.Cliente || '-'}</td>
                                                        <td className="px-4 py-3 text-slate-500 truncate max-w-[170px]">{fornecedor}</td>
                                                        <td className="px-4 py-3">
                                                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-medium border border-indigo-100">
                                                                {r.Motivo}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${badgeColor} whitespace-nowrap shadow-sm`}>
                                                                {statusOperacional || 'Sem status'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 text-xs">{(r.Cidade || '-') + (r.Estado ? ' / ' + r.Estado : '')}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-start items-center gap-4 p-4 border-t border-slate-100">
                                    <div className="flex gap-2 items-center">
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
        </div >
    );
}

