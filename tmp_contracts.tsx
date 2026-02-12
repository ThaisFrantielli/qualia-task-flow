import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/analytics/Contracts.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=612d9155"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
let prevRefreshReg;
let prevRefreshSig;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$(), _s2 = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=612d9155"; const useState = __vite__cjsImport3_react["useState"]; const useMemo = __vite__cjsImport3_react["useMemo"];
import { Search, BarChart3, List, Calendar, Truck, MessageSquarePlus, X, Layers, Clock, Activity, Briefcase, Table2 } from "/node_modules/.vite/deps/lucide-react.js?v=2e91f3b0";
import { RenewalStrategyLabel } from "/src/types/contracts.ts";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, PieChart, Pie, Legend } from "/node_modules/.vite/deps/recharts.js?v=33f3a0d1";
const getKmRangeLabel = (km) => {
  if (km <= 1e4) return "0-10k";
  if (km <= 2e4) return "10k-20k";
  if (km <= 3e4) return "20k-30k";
  if (km <= 4e4) return "30k-40k";
  if (km <= 5e4) return "40k-50k";
  if (km <= 6e4) return "50k-60k";
  if (km <= 7e4) return "60k-70k";
  if (km <= 8e4) return "70k-80k";
  if (km <= 1e5) return "80k-100k";
  if (km <= 12e4) return "100k-120k";
  return "+120k";
};
const getAgeRangeLabel = (manufacturingYear) => {
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const ageMonths = (currentYear - manufacturingYear) * 12;
  if (ageMonths <= 12) return "0-12m";
  if (ageMonths <= 24) return "13-24m";
  if (ageMonths <= 36) return "25-36m";
  if (ageMonths <= 48) return "37-48m";
  if (ageMonths <= 60) return "49-60m";
  return "+60m";
};
const getAgeRangeLabelFromMonths = (ageMonths) => {
  if (ageMonths <= 12) return "0-12m";
  if (ageMonths <= 24) return "13-24m";
  if (ageMonths <= 36) return "25-36m";
  if (ageMonths <= 48) return "37-48m";
  if (ageMonths <= 60) return "49-60m";
  return "+60m";
};
const KM_ORDER = ["0-10k", "10k-20k", "20k-30k", "30k-40k", "40k-50k", "50k-60k", "60k-70k", "70k-80k", "80k-100k", "100k-120k", "+120k"];
const AGE_ORDER = ["0-12m", "13-24m", "25-36m", "37-48m", "49-60m", "+60m"];
function MontadoraSection({ montadora, models }) {
  _s();
  const [expanded, setExpanded] = useState(false);
  const totalCount = models.reduce((s, m) => s + m.value, 0);
  return /* @__PURE__ */ jsxDEV("div", { className: "border rounded p-2 bg-white", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between items-center", children: [
      /* @__PURE__ */ jsxDEV("button", { onClick: () => setExpanded((e) => !e), className: "text-left font-bold text-sm text-slate-800", children: [
        montadora,
        " ",
        /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-slate-500", children: [
          "(",
          totalCount,
          ")"
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 84,
          columnNumber: 23
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
        lineNumber: 83,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { onClick: () => setExpanded((e) => !e), className: "text-xs text-slate-500", children: expanded ? "Ocultar" : "Mostrar" }, void 0, false, {
        fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
        lineNumber: 86,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
      lineNumber: 82,
      columnNumber: 7
    }, this),
    expanded && /* @__PURE__ */ jsxDEV("div", { className: "mt-2", style: { height: 120 }, children: /* @__PURE__ */ jsxDEV(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxDEV(BarChart, { data: models.slice(0, 10), layout: "vertical", margin: { left: 0, right: 10 }, children: [
      /* @__PURE__ */ jsxDEV(XAxis, { type: "number", hide: true }, void 0, false, {
        fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
        lineNumber: 92,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV(YAxis, { dataKey: "name", type: "category", width: 160, tick: { fontSize: 10 } }, void 0, false, {
        fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
        lineNumber: 93,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV(Tooltip, { cursor: { fill: "#f1f5f9" }, contentStyle: { fontSize: "12px" } }, void 0, false, {
        fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
        lineNumber: 94,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV(Bar, { dataKey: "value", fill: "#10B981", barSize: 12, children: models.slice(0, 10).map(
        (entry, i) => /* @__PURE__ */ jsxDEV(Cell, {}, i, false, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 97,
          columnNumber: 15
        }, this)
      ) }, void 0, false, {
        fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
        lineNumber: 95,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
      lineNumber: 91,
      columnNumber: 13
    }, this) }, void 0, false, {
      fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
      lineNumber: 90,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
      lineNumber: 89,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
    lineNumber: 81,
    columnNumber: 5
  }, this);
}
_s(MontadoraSection, "DuL5jiiQQFgbn7gBKAyxwS/H4Ek=");
_c = MontadoraSection;
export const Contracts = ({ contracts, onUpdateContract }) => {
  _s2();
  const [viewMode, setViewMode] = useState("analysis");
  const [searchTerm, setSearchTerm] = useState("");
  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [tempObservation, setTempObservation] = useState("");
  const [filters, setFilters] = useState({
    strategy: [],
    type: [],
    year: [],
    group: [],
    kmRange: [],
    ageRange: []
  });
  const toggleFilter = (key, value) => {
    setFilters((prev) => {
      const current = prev[key];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter((v) => v !== value) };
      } else {
        return { ...prev, [key]: [...current, value] };
      }
    });
  };
  const clearFilters = () => {
    setFilters({ strategy: [], type: [], year: [], group: [], kmRange: [], ageRange: [] });
  };
  const enrichedContracts = useMemo(() => {
    return contracts.map((c) => ({
      ...c,
      kmRangeLabel: getKmRangeLabel(c.currentKm || 0),
      ageRangeLabel: c.ageMonths !== void 0 ? getAgeRangeLabelFromMonths(c.ageMonths) : getAgeRangeLabel(c.manufacturingYear),
      expiryYear: new Date(c.endDate).getFullYear().toString(),
      groupLabel: c.model
    }));
  }, [contracts]);
  const filteredContracts = useMemo(() => {
    return enrichedContracts.filter((c) => {
      const searchMatch = c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) || c.plate.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;
      if (filters.strategy.length > 0 && !filters.strategy.includes(c.renewalStrategy)) return false;
      if (filters.type.length > 0 && !filters.type.includes(c.type)) return false;
      if (filters.year.length > 0 && !filters.year.includes(c.expiryYear)) return false;
      if (filters.group.length > 0 && !filters.group.includes(c.groupLabel)) return false;
      if (filters.kmRange.length > 0 && !filters.kmRange.includes(c.kmRangeLabel)) return false;
      if (filters.ageRange.length > 0 && !filters.ageRange.includes(c.ageRangeLabel)) return false;
      return true;
    });
  }, [enrichedContracts, searchTerm, filters]);
  const analysisData = useMemo(() => {
    const aggregate = (field, predefinedOrder) => {
      const counts = {};
      if (predefinedOrder) {
        predefinedOrder.forEach((key) => counts[key] = { name: key, value: 0, fullKey: key });
      }
      filteredContracts.forEach((c) => {
        const rawValue = c[field];
        const key = rawValue !== void 0 && rawValue !== null ? String(rawValue) : "N/A";
        const label = field === "renewalStrategy" ? RenewalStrategyLabel[key] || key : key;
        if (!counts[key]) counts[key] = { name: label, value: 0, fullKey: key };
        counts[key].value += 1;
        if (field === "renewalStrategy") counts[key].name = label;
      });
      let result = Object.values(counts);
      if (predefinedOrder) {
        result.sort((a, b) => predefinedOrder.indexOf(a.fullKey) - predefinedOrder.indexOf(b.fullKey));
      } else if (field === "expiryYear") {
        result.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        result.sort((a, b) => b.value - a.value);
      }
      return result.filter((r) => predefinedOrder ? r.value >= 0 : r.value > 0);
    };
    return {
      strategy: aggregate("renewalStrategy"),
      year: aggregate("expiryYear"),
      group: aggregate("groupLabel"),
      type: aggregate("type"),
      km: aggregate("kmRangeLabel", KM_ORDER),
      age: aggregate("ageRangeLabel", AGE_ORDER)
    };
  }, [filteredContracts]);
  const summaryTableData = useMemo(() => {
    const groups = {};
    Object.keys(RenewalStrategyLabel).forEach((key) => {
      groups[key] = { count: 0, fipe: 0, acquisition: 0, rental: 0, label: RenewalStrategyLabel[key] };
    });
    filteredContracts.forEach((c) => {
      const key = c.renewalStrategy || "UNDEFINED";
      if (!groups[key]) groups[key] = { count: 0, fipe: 0, acquisition: 0, rental: 0, label: key };
      groups[key].count += 1;
      groups[key].fipe += c.currentFipe || 0;
      groups[key].acquisition += c.purchasePrice || 0;
      groups[key].rental += c.monthlyValue || 0;
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [filteredContracts]);
  const totals = {
    count: filteredContracts.length,
    revenue: filteredContracts.reduce((acc, c) => acc + c.monthlyValue, 0),
    fipe: filteredContracts.reduce((acc, c) => acc + c.currentFipe, 0),
    acquisition: filteredContracts.reduce((acc, c) => acc + c.purchasePrice, 0)
  };
  const hasObservations = filteredContracts.some((c) => !!c.observation);
  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6"];
  const RETURN_PERCENTAGE = 0.8;
  const handleStrategyChange = (id, newStrategy) => {
    const contract = contracts.find((c) => c.id === id);
    if (contract) onUpdateContract({ ...contract, renewalStrategy: newStrategy });
  };
  const handleOpenObservation = (contract) => {
    setSelectedContractId(contract.id);
    setTempObservation(contract.observation || "");
    setObservationModalOpen(true);
  };
  const handleSaveObservation = () => {
    if (selectedContractId) {
      const contract = contracts.find((c) => c.id === selectedContractId);
      if (contract) onUpdateContract({ ...contract, observation: tempObservation });
    }
    setObservationModalOpen(false);
  };
  const hasActiveFilters = Object.values(filters).some((arr) => arr.length > 0);
  return /* @__PURE__ */ jsxDEV("div", { className: "p-6 max-w-[1920px] mx-auto min-h-screen bg-slate-50", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between items-center mb-6", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "text-2xl font-bold text-slate-800 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV(BarChart3, { className: "text-blue-600" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 286,
            columnNumber: 13
          }, this),
          " Painel de Renovação"
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 285,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm text-slate-500", children: "Gestão estratégica de contratos e ativos." }, void 0, false, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 288,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
        lineNumber: 284,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-4", children: [
        hasActiveFilters && /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: clearFilters,
            className: "px-4 py-1.5 text-xs font-bold rounded bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-2",
            children: [
              /* @__PURE__ */ jsxDEV(X, { size: 14 }, void 0, false, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 296,
                columnNumber: 21
              }, this),
              " Limpar Filtros"
            ]
          },
          void 0,
          true,
          {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 292,
            columnNumber: 11
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm", children: [
          /* @__PURE__ */ jsxDEV("button", { onClick: () => setViewMode("analysis"), className: `px-4 py-1.5 text-xs font-bold rounded flex items-center gap-2 ${viewMode === "analysis" ? "bg-blue-600 text-white" : "text-slate-500"}`, children: [
            /* @__PURE__ */ jsxDEV(BarChart3, { size: 14 }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 301,
              columnNumber: 21
            }, this),
            " Gráficos"
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 300,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("button", { onClick: () => setViewMode("list"), className: `px-4 py-1.5 text-xs font-bold rounded flex items-center gap-2 ${viewMode === "list" ? "bg-blue-600 text-white" : "text-slate-500"}`, children: [
            /* @__PURE__ */ jsxDEV(List, { size: 14 }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 304,
              columnNumber: 21
            }, this),
            " Lista"
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 303,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 299,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
        lineNumber: 290,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
      lineNumber: 283,
      columnNumber: 7
    }, this),
    viewMode === "analysis" && /* @__PURE__ */ jsxDEV("div", { className: "animate-in fade-in duration-500 space-y-6", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "bg-blue-700 text-white text-center py-1 text-xs font-bold uppercase tracking-wider", children: "Valor FIPE Total" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 317,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "p-4 text-center bg-blue-50/50", children: [
            /* @__PURE__ */ jsxDEV("h3", { className: "text-2xl font-bold text-slate-800", children: [
              "R$ ",
              totals.fipe.toLocaleString("pt-BR", { compactDisplay: "short", notation: "compact", maximumFractionDigits: 1 })
            ] }, void 0, true, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 321,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] text-slate-400 mt-1", children: "Base Atual de Mercado" }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 324,
              columnNumber: 23
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 320,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 316,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "bg-blue-500 text-white text-center py-1 text-xs font-bold uppercase tracking-wider", children: "Valor Aquisição" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 330,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "p-4 text-center bg-blue-50/30", children: [
            /* @__PURE__ */ jsxDEV("h3", { className: "text-2xl font-bold text-slate-800", children: [
              "R$ ",
              totals.acquisition.toLocaleString("pt-BR", { compactDisplay: "short", notation: "compact", maximumFractionDigits: 1 })
            ] }, void 0, true, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 334,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] text-slate-400 mt-1", children: "Custo Histórico" }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 337,
              columnNumber: 23
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 333,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 329,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden relative", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "bg-blue-600 text-white text-center py-1 text-xs font-bold uppercase tracking-wider", children: "Retorno FIPE Estimado" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 343,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "p-4 text-center bg-blue-50/50", children: [
            /* @__PURE__ */ jsxDEV("h3", { className: "text-2xl font-bold text-slate-800", children: [
              "R$ ",
              (totals.fipe * RETURN_PERCENTAGE).toLocaleString("pt-BR", { compactDisplay: "short", notation: "compact", maximumFractionDigits: 1 })
            ] }, void 0, true, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 347,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] text-slate-400 mt-1", children: "Projeção de Revenda" }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 350,
              columnNumber: 23
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 346,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "absolute top-1 right-1 bg-yellow-300 text-yellow-900 text-[10px] font-bold px-1.5 rounded", children: [
            (RETURN_PERCENTAGE * 100).toFixed(0),
            "%"
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 352,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 342,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "bg-blue-800 text-white text-center py-1 text-xs font-bold uppercase tracking-wider", children: "Receita Mensal (Locação)" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 359,
            columnNumber: 20
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "p-4 text-center bg-blue-50/50", children: [
            /* @__PURE__ */ jsxDEV("h3", { className: "text-2xl font-bold text-slate-800", children: [
              "R$ ",
              totals.revenue.toLocaleString("pt-BR", { compactDisplay: "short", notation: "compact", maximumFractionDigits: 1 })
            ] }, void 0, true, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 363,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] text-slate-400 mt-1", children: "Faturamento Atual" }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 366,
              columnNumber: 23
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 362,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 358,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
        lineNumber: 314,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm", children: [
          /* @__PURE__ */ jsxDEV("h4", { className: "text-xs font-bold text-slate-500 mb-2 flex items-center gap-2 uppercase tracking-wide", children: [
            /* @__PURE__ */ jsxDEV(Layers, { size: 14 }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 375,
              columnNumber: 118
            }, this),
            " Estratégia de Renovação"
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 375,
            columnNumber: 16
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "h-56", children: /* @__PURE__ */ jsxDEV(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxDEV(BarChart, { data: analysisData.strategy, layout: "vertical", margin: { left: 0, right: 30 }, children: [
            /* @__PURE__ */ jsxDEV(CartesianGrid, { strokeDasharray: "3 3", horizontal: false }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 379,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(XAxis, { type: "number", hide: true }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 380,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(YAxis, { dataKey: "name", type: "category", width: 140, tick: { fontSize: 9, fontWeight: 600 }, interval: 0 }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 381,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(Tooltip, { cursor: { fill: "#f1f5f9" }, contentStyle: { fontSize: "12px" } }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 382,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(Bar, { dataKey: "value", radius: [0, 4, 4, 0], barSize: 20, children: analysisData.strategy.map(
              (entry, index) => /* @__PURE__ */ jsxDEV(Cell, { fill: COLORS[index % COLORS.length], cursor: "pointer", onClick: () => toggleFilter("strategy", entry.fullKey), opacity: filters.strategy.length && !filters.strategy.includes(entry.fullKey) ? 0.3 : 1 }, index, false, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 385,
                columnNumber: 21
              }, this)
            ) }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 383,
              columnNumber: 22
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 378,
            columnNumber: 20
          }, this) }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 377,
            columnNumber: 18
          }, this) }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 376,
            columnNumber: 16
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 374,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm", children: [
          /* @__PURE__ */ jsxDEV("h4", { className: "text-xs font-bold text-slate-500 mb-2 flex items-center gap-2 uppercase tracking-wide", children: [
            /* @__PURE__ */ jsxDEV(Calendar, { size: 14 }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 395,
              columnNumber: 118
            }, this),
            " Vencimentos (Ano)"
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 395,
            columnNumber: 16
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "h-56", children: /* @__PURE__ */ jsxDEV(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxDEV(BarChart, { data: analysisData.year, children: [
            /* @__PURE__ */ jsxDEV(CartesianGrid, { strokeDasharray: "3 3", vertical: false }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 399,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(XAxis, { dataKey: "name", tick: { fontSize: 10 }, axisLine: false, tickLine: false }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 400,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(YAxis, { hide: true }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 401,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(Tooltip, { cursor: { fill: "#f1f5f9" }, contentStyle: { fontSize: "12px" } }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 402,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(Bar, { dataKey: "value", fill: "#3B82F6", radius: [4, 4, 0, 0], barSize: 32, children: analysisData.year.map(
              (entry, index) => /* @__PURE__ */ jsxDEV(Cell, { fill: filters.year.includes(entry.fullKey) ? "#1e40af" : "#3B82F6", cursor: "pointer", onClick: () => toggleFilter("year", entry.fullKey) }, index, false, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 405,
                columnNumber: 21
              }, this)
            ) }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 403,
              columnNumber: 22
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 398,
            columnNumber: 20
          }, this) }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 397,
            columnNumber: 18
          }, this) }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 396,
            columnNumber: 16
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 394,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm", children: [
          /* @__PURE__ */ jsxDEV("h4", { className: "text-xs font-bold text-slate-500 mb-2 flex items-center gap-2 uppercase tracking-wide", children: [
            /* @__PURE__ */ jsxDEV(Briefcase, { size: 14 }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 415,
              columnNumber: 118
            }, this),
            " Tipo de Contrato"
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 415,
            columnNumber: 16
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "h-56", children: /* @__PURE__ */ jsxDEV(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxDEV(PieChart, { children: [
            /* @__PURE__ */ jsxDEV(Pie, { data: analysisData.type, dataKey: "value", cx: "50%", cy: "50%", innerRadius: 40, outerRadius: 65, paddingAngle: 2, children: analysisData.type.map(
              (entry, index) => /* @__PURE__ */ jsxDEV(Cell, { fill: COLORS[(index + 3) % COLORS.length], cursor: "pointer", onClick: () => toggleFilter("type", entry.fullKey), opacity: filters.type.length && !filters.type.includes(entry.fullKey) ? 0.3 : 1 }, index, false, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 421,
                columnNumber: 21
              }, this)
            ) }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 419,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(Tooltip, { contentStyle: { fontSize: "12px" } }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 424,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(Legend, { verticalAlign: "middle", align: "right", layout: "vertical", iconType: "circle", wrapperStyle: { fontSize: "10px" } }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 425,
              columnNumber: 22
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 418,
            columnNumber: 20
          }, this) }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 417,
            columnNumber: 18
          }, this) }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 416,
            columnNumber: 16
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 414,
          columnNumber: 14
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm", children: [
          /* @__PURE__ */ jsxDEV("h4", { className: "text-xs font-bold text-slate-500 mb-2 flex items-center gap-2 uppercase tracking-wide", children: [
            /* @__PURE__ */ jsxDEV(Truck, { size: 14 }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 433,
              columnNumber: 118
            }, this),
            " Modelos (por Montadora)"
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 433,
            columnNumber: 16
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "max-h-56 overflow-y-auto pr-2 space-y-2", children: Object.entries(
            (() => {
              const map = {};
              filteredContracts.forEach((c) => {
                const mont = c.montadora && c.montadora !== "N/A" ? String(c.montadora) : "Sem Montadora";
                const mod = c.modelo && c.modelo !== "N/A" ? String(c.modelo) : c.model && c.model !== "N/A" ? String(c.model) : "Sem Modelo";
                map[mont] = map[mont] || {};
                map[mont][mod] = (map[mont][mod] || 0) + 1;
              });
              const out = {};
              Object.entries(map).forEach(([mont, models]) => {
                out[mont] = Object.entries(models).map(([name, value]) => ({ name, value, fullKey: `${mont}__${name}` }));
                out[mont].sort((a, b) => b.value - a.value);
              });
              return out;
            })()
          ).map(([montadora, models]) => {
            return /* @__PURE__ */ jsxDEV(MontadoraSection, { montadora, models }, montadora, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 454,
              columnNumber: 19
            }, this);
          }) }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 434,
            columnNumber: 16
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 432,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm", children: [
          /* @__PURE__ */ jsxDEV("h4", { className: "text-xs font-bold text-slate-500 mb-2 flex items-center gap-2 uppercase tracking-wide", children: [
            /* @__PURE__ */ jsxDEV(Activity, { size: 14 }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 462,
              columnNumber: 118
            }, this),
            " Distribuição KM"
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 462,
            columnNumber: 16
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "h-56", children: /* @__PURE__ */ jsxDEV(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxDEV(BarChart, { data: analysisData.km, margin: { top: 10, right: 0, left: -20, bottom: 0 }, children: [
            /* @__PURE__ */ jsxDEV(CartesianGrid, { strokeDasharray: "3 3", vertical: false }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 466,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(XAxis, { dataKey: "name", tick: { fontSize: 9 }, interval: 0, angle: -45, textAnchor: "end", height: 50, axisLine: false, tickLine: false }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 467,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(YAxis, { tick: { fontSize: 10 }, axisLine: false, tickLine: false }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 468,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(Tooltip, { cursor: { fill: "#f1f5f9" }, contentStyle: { fontSize: "12px" } }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 469,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(Bar, { dataKey: "value", fill: "#F59E0B", radius: [4, 4, 0, 0], children: analysisData.km.map(
              (entry, index) => /* @__PURE__ */ jsxDEV(Cell, { fill: filters.kmRange.includes(entry.fullKey) ? "#b45309" : "#F59E0B", cursor: "pointer", onClick: () => toggleFilter("kmRange", entry.fullKey) }, index, false, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 472,
                columnNumber: 21
              }, this)
            ) }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 470,
              columnNumber: 22
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 465,
            columnNumber: 20
          }, this) }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 464,
            columnNumber: 18
          }, this) }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 463,
            columnNumber: 16
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 461,
          columnNumber: 14
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm", children: [
          /* @__PURE__ */ jsxDEV("h4", { className: "text-xs font-bold text-slate-500 mb-2 flex items-center gap-2 uppercase tracking-wide", children: [
            /* @__PURE__ */ jsxDEV(Clock, { size: 14 }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 482,
              columnNumber: 118
            }, this),
            " Idade da Frota"
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 482,
            columnNumber: 16
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "h-56", children: /* @__PURE__ */ jsxDEV(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxDEV(BarChart, { data: analysisData.age, children: [
            /* @__PURE__ */ jsxDEV(CartesianGrid, { strokeDasharray: "3 3", vertical: false }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 486,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(XAxis, { dataKey: "name", tick: { fontSize: 10 }, axisLine: false, tickLine: false }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 487,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(YAxis, { hide: true }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 488,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(Tooltip, { cursor: { fill: "#f1f5f9" }, contentStyle: { fontSize: "12px" } }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 489,
              columnNumber: 22
            }, this),
            /* @__PURE__ */ jsxDEV(Bar, { dataKey: "value", fill: "#6366F1", radius: [4, 4, 0, 0], barSize: 32, children: analysisData.age.map(
              (entry, index) => /* @__PURE__ */ jsxDEV(Cell, { fill: filters.ageRange.includes(entry.fullKey) ? "#4338ca" : "#6366F1", cursor: "pointer", onClick: () => toggleFilter("ageRange", entry.fullKey) }, index, false, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 492,
                columnNumber: 21
              }, this)
            ) }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 490,
              columnNumber: 22
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 485,
            columnNumber: 20
          }, this) }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 484,
            columnNumber: 18
          }, this) }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 483,
            columnNumber: 16
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 481,
          columnNumber: 14
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
        lineNumber: 372,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "bg-slate-100 px-6 py-3 border-b border-slate-300 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV(Table2, { size: 16, className: "text-slate-500" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 504,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("h4", { className: "text-sm font-bold text-slate-700 uppercase tracking-wide", children: "Resumo por Estratégia (Financeiro)" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 505,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 503,
          columnNumber: 14
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxDEV("table", { className: "w-full text-sm text-left", children: [
          /* @__PURE__ */ jsxDEV("thead", { className: "bg-white text-slate-600 font-bold border-b border-slate-200 text-xs uppercase", children: /* @__PURE__ */ jsxDEV("tr", { children: [
            /* @__PURE__ */ jsxDEV("th", { className: "px-6 py-3", children: "Rótulos de Linha (Estratégia)" }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 511,
              columnNumber: 26
            }, this),
            /* @__PURE__ */ jsxDEV("th", { className: "px-6 py-3 text-center", children: "QT" }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 512,
              columnNumber: 26
            }, this),
            /* @__PURE__ */ jsxDEV("th", { className: "px-6 py-3 text-right", children: "Valor Fipe" }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 513,
              columnNumber: 26
            }, this),
            /* @__PURE__ */ jsxDEV("th", { className: "px-6 py-3 text-right", children: "Valor Aquisição" }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 514,
              columnNumber: 26
            }, this),
            /* @__PURE__ */ jsxDEV("th", { className: "px-6 py-3 text-right", children: "Valor de Locação" }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 515,
              columnNumber: 26
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 510,
            columnNumber: 23
          }, this) }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 509,
            columnNumber: 20
          }, this),
          /* @__PURE__ */ jsxDEV("tbody", { className: "divide-y divide-slate-100", children: [
            summaryTableData.map(
              (row) => /* @__PURE__ */ jsxDEV("tr", { className: "hover:bg-slate-50", children: [
                /* @__PURE__ */ jsxDEV("td", { className: "px-6 py-3 font-medium text-slate-800", children: row.label }, void 0, false, {
                  fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                  lineNumber: 521,
                  columnNumber: 29
                }, this),
                /* @__PURE__ */ jsxDEV("td", { className: "px-6 py-3 text-center font-bold", children: row.count }, void 0, false, {
                  fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                  lineNumber: 522,
                  columnNumber: 29
                }, this),
                /* @__PURE__ */ jsxDEV("td", { className: "px-6 py-3 text-right font-mono text-slate-600", children: [
                  "R$ ",
                  row.fipe.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                ] }, void 0, true, {
                  fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                  lineNumber: 523,
                  columnNumber: 29
                }, this),
                /* @__PURE__ */ jsxDEV("td", { className: "px-6 py-3 text-right font-mono text-slate-600", children: [
                  "R$ ",
                  row.acquisition.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                ] }, void 0, true, {
                  fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                  lineNumber: 526,
                  columnNumber: 29
                }, this),
                /* @__PURE__ */ jsxDEV("td", { className: "px-6 py-3 text-right font-mono text-blue-700 font-bold", children: [
                  "R$ ",
                  row.rental.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                ] }, void 0, true, {
                  fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                  lineNumber: 529,
                  columnNumber: 29
                }, this)
              ] }, row.label, true, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 520,
                columnNumber: 17
              }, this)
            ),
            /* @__PURE__ */ jsxDEV("tr", { className: "bg-slate-100 font-bold border-t-2 border-slate-300", children: [
              /* @__PURE__ */ jsxDEV("td", { className: "px-6 py-3 uppercase text-slate-700", children: "Total Geral" }, void 0, false, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 536,
                columnNumber: 26
              }, this),
              /* @__PURE__ */ jsxDEV("td", { className: "px-6 py-3 text-center text-slate-800", children: totals.count }, void 0, false, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 537,
                columnNumber: 26
              }, this),
              /* @__PURE__ */ jsxDEV("td", { className: "px-6 py-3 text-right text-slate-800", children: [
                "R$ ",
                totals.fipe.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
              ] }, void 0, true, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 538,
                columnNumber: 26
              }, this),
              /* @__PURE__ */ jsxDEV("td", { className: "px-6 py-3 text-right text-slate-800", children: [
                "R$ ",
                totals.acquisition.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
              ] }, void 0, true, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 539,
                columnNumber: 26
              }, this),
              /* @__PURE__ */ jsxDEV("td", { className: "px-6 py-3 text-right text-blue-800", children: [
                "R$ ",
                totals.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
              ] }, void 0, true, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 540,
                columnNumber: 26
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 535,
              columnNumber: 23
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 518,
            columnNumber: 20
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 508,
          columnNumber: 17
        }, this) }, void 0, false, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 507,
          columnNumber: 14
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
        lineNumber: 502,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
      lineNumber: 311,
      columnNumber: 7
    }, this),
    viewMode === "list" && /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "p-4 border-b border-slate-200 flex gap-4 bg-slate-50", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "relative w-96", children: [
          /* @__PURE__ */ jsxDEV(Search, { className: "absolute left-3 top-2.5 text-slate-400", size: 20 }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 554,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("input", { type: "text", placeholder: "Buscar contrato...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 555,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 553,
          columnNumber: 16
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex-1 flex justify-end items-center text-xs text-slate-500", children: /* @__PURE__ */ jsxDEV("span", { children: [
          filteredContracts.length,
          " contratos encontrados."
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 558,
          columnNumber: 18
        }, this) }, void 0, false, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 557,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
        lineNumber: 552,
        columnNumber: 12
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "overflow-x-auto min-h-[400px]", children: /* @__PURE__ */ jsxDEV("table", { className: "w-full text-sm text-left", children: [
        /* @__PURE__ */ jsxDEV("thead", { className: "bg-white text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider", children: /* @__PURE__ */ jsxDEV("tr", { children: [
          /* @__PURE__ */ jsxDEV("th", { className: "px-4 py-4", children: "Contrato" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 565,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "px-4 py-4", children: "Veículo" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 566,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "px-4 py-4", children: "Montadora" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 567,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "px-4 py-4", children: "Modelo" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 568,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "px-4 py-4", children: "Categoria" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 569,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "px-4 py-4 text-center", children: "Período" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 570,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "px-4 py-4 text-center", children: "Status" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 571,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "px-4 py-4 text-center", children: "Idade/Km" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 572,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "px-4 py-4 text-right", children: "FIPE" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 573,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "px-4 py-4 text-right", children: "Valores" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 574,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "px-4 py-4 text-center", children: "Estratégia" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 575,
            columnNumber: 24
          }, this),
          hasObservations && /* @__PURE__ */ jsxDEV("th", { className: "px-4 py-4", children: "Obs." }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 576,
            columnNumber: 44
          }, this),
          /* @__PURE__ */ jsxDEV("th", { className: "px-4 py-4 text-center", children: "Ações" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 577,
            columnNumber: 24
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 564,
          columnNumber: 21
        }, this) }, void 0, false, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 563,
          columnNumber: 18
        }, this),
        /* @__PURE__ */ jsxDEV("tbody", { className: "divide-y divide-slate-100", children: filteredContracts.map((contract) => {
          const formatDate = (dateStr) => {
            if (!dateStr) return "-";
            try {
              return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
            } catch {
              return "-";
            }
          };
          return /* @__PURE__ */ jsxDEV("tr", { className: "hover:bg-blue-50/30 transition-colors", children: [
            /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-4", children: [
              (() => {
                const parts = [];
                if (contract.commercialContract && contract.commercialContract !== "N/A") parts.push(contract.commercialContract);
                if (contract.contractNumber && contract.contractNumber !== "N/A") parts.push(contract.contractNumber);
                const header = parts.length > 0 ? parts.join(" | ") : "-";
                return /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-700 font-bold", children: header }, void 0, false, {
                  fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                  lineNumber: 600,
                  columnNumber: 32
                }, this);
              })(),
              /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-500 mt-0.5", children: contract.clientName && contract.clientName !== "N/A" ? contract.clientName : "" }, void 0, false, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 602,
                columnNumber: 29
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 593,
              columnNumber: 27
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-4", children: [
              (() => {
                const p = contract.plate && contract.plate !== "N/A" ? contract.plate : contract.mainPlate && contract.mainPlate !== "N/A" ? contract.mainPlate : "-";
                return /* @__PURE__ */ jsxDEV("div", { className: "font-bold text-slate-800 text-xs", children: p }, void 0, false, {
                  fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                  lineNumber: 608,
                  columnNumber: 32
                }, this);
              })(),
              /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-500", children: contract.model && contract.model !== "N/A" ? contract.model : "" }, void 0, false, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 610,
                columnNumber: 30
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 604,
              columnNumber: 27
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-4", children: /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-700", children: contract.montadora && contract.montadora !== "N/A" ? contract.montadora : "-" }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 613,
              columnNumber: 29
            }, this) }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 612,
              columnNumber: 27
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-4", children: /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-700", children: contract.modelo && contract.modelo !== "N/A" ? contract.modelo : contract.model && contract.model !== "N/A" ? contract.model : "-" }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 616,
              columnNumber: 29
            }, this) }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 615,
              columnNumber: 27
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-4", children: /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-700", children: contract.categoria && contract.categoria !== "N/A" ? contract.categoria : "-" }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 619,
              columnNumber: 29
            }, this) }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 618,
              columnNumber: 27
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-4 text-center", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-slate-500", children: [
                "Início: ",
                formatDate(contract.initialDate)
              ] }, void 0, true, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 622,
                columnNumber: 29
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-slate-500", children: [
                "Fim: ",
                formatDate(contract.finalDate)
              ] }, void 0, true, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 623,
                columnNumber: 29
              }, this),
              contract.periodMonths && /* @__PURE__ */ jsxDEV("div", { className: "text-xs font-bold text-blue-600 mt-0.5", children: [
                contract.periodMonths,
                " meses"
              ] }, void 0, true, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 624,
                columnNumber: 55
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 621,
              columnNumber: 27
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-4 text-center", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "text-xs font-semibold text-slate-700", children: contract.contractStatus || "-" }, void 0, false, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 627,
                columnNumber: 29
              }, this),
              contract.closingDate && /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-slate-400 mt-0.5", children: [
                "Encerr: ",
                formatDate(contract.closingDate)
              ] }, void 0, true, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 628,
                columnNumber: 54
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 626,
              columnNumber: 27
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-4 text-center", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "text-xs font-bold text-slate-700", children: contract.ageRangeLabel }, void 0, false, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 631,
                columnNumber: 29
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-slate-500", children: contract.kmRangeLabel }, void 0, false, {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 632,
                columnNumber: 29
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 630,
              columnNumber: 27
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-4 text-right", children: /* @__PURE__ */ jsxDEV("div", { className: "text-xs font-mono text-slate-600", children: contract.valorFipeAtual ? `R$ ${contract.valorFipeAtual.toLocaleString("pt-BR")}` : "-" }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 635,
              columnNumber: 29
            }, this) }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 634,
              columnNumber: 27
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-4 text-right", children: /* @__PURE__ */ jsxDEV("div", { className: "font-bold text-blue-700 text-xs", children: [
              "R$ ",
              contract.monthlyValue.toLocaleString("pt-BR")
            ] }, void 0, true, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 638,
              columnNumber: 29
            }, this) }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 637,
              columnNumber: 27
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-4", children: /* @__PURE__ */ jsxDEV(
              "select",
              {
                value: contract.renewalStrategy,
                onChange: (e) => handleStrategyChange(contract.id, e.target.value),
                className: "w-full text-xs border rounded py-1 px-2",
                children: Object.entries(RenewalStrategyLabel).map(
                  ([key, label]) => /* @__PURE__ */ jsxDEV("option", { value: key, children: label }, key, false, {
                    fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                    lineNumber: 647,
                    columnNumber: 25
                  }, this)
                )
              },
              void 0,
              false,
              {
                fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
                lineNumber: 641,
                columnNumber: 30
              },
              this
            ) }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 640,
              columnNumber: 27
            }, this),
            hasObservations && /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-4", children: contract.observation && /* @__PURE__ */ jsxDEV("span", { className: "bg-yellow-100 px-2 py-0.5 rounded text-[10px] text-yellow-800", children: "Obs" }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 651,
              columnNumber: 98
            }, this) }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 651,
              columnNumber: 47
            }, this),
            /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-4 text-center", children: /* @__PURE__ */ jsxDEV("button", { className: "text-slate-400 hover:text-blue-600", onClick: () => handleOpenObservation(contract), children: /* @__PURE__ */ jsxDEV(MessageSquarePlus, { size: 16 }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 653,
              columnNumber: 133
            }, this) }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 653,
              columnNumber: 30
            }, this) }, void 0, false, {
              fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
              lineNumber: 652,
              columnNumber: 27
            }, this)
          ] }, contract.id, true, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 592,
            columnNumber: 19
          }, this);
        }) }, void 0, false, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 580,
          columnNumber: 18
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
        lineNumber: 562,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
        lineNumber: 561,
        columnNumber: 12
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
      lineNumber: 551,
      columnNumber: 7
    }, this),
    observationModalOpen && /* @__PURE__ */ jsxDEV("div", { className: "fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm", children: /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between items-center p-6 border-b border-slate-100", children: [
        /* @__PURE__ */ jsxDEV("h3", { className: "text-lg font-bold text-slate-800 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV(MessageSquarePlus, { className: "text-blue-600", size: 20 }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 670,
            columnNumber: 21
          }, this),
          " Observação"
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 669,
          columnNumber: 18
        }, this),
        /* @__PURE__ */ jsxDEV("button", { onClick: () => setObservationModalOpen(false), className: "text-slate-400 hover:text-slate-600", children: /* @__PURE__ */ jsxDEV(X, { size: 24 }, void 0, false, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 673,
          columnNumber: 21
        }, this) }, void 0, false, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 672,
          columnNumber: 18
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
        lineNumber: 668,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "p-6", children: [
        /* @__PURE__ */ jsxDEV(
          "textarea",
          {
            className: "w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm text-slate-700",
            placeholder: "Digite observações...",
            value: tempObservation,
            onChange: (e) => setTempObservation(e.target.value)
          },
          void 0,
          false,
          {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 677,
            columnNumber: 18
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "mt-6 flex justify-end gap-3", children: [
          /* @__PURE__ */ jsxDEV("button", { onClick: () => setObservationModalOpen(false), className: "px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200", children: "Cancelar" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 684,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV("button", { onClick: handleSaveObservation, className: "px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700", children: "Salvar" }, void 0, false, {
            fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
            lineNumber: 685,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
          lineNumber: 683,
          columnNumber: 18
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
        lineNumber: 676,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
      lineNumber: 667,
      columnNumber: 12
    }, this) }, void 0, false, {
      fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
      lineNumber: 666,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx",
    lineNumber: 280,
    columnNumber: 5
  }, this);
};
_s2(Contracts, "QxzcvDh4e5sC6cTO0eStWF8/1Oo=");
_c2 = Contracts;
var _c, _c2;
$RefreshReg$(_c, "MontadoraSection");
$RefreshReg$(_c2, "Contracts");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/frant/.antigravity/qualia-task-flow/src/components/analytics/Contracts.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBZ0VzQjs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFoRXRCLFNBQWdCQSxVQUFVQyxlQUE0QjtBQUN0RCxTQUFTQyxRQUFRQyxXQUFXQyxNQUFNQyxVQUFVQyxPQUFPQyxtQkFBbUJDLEdBQUdDLFFBQVFDLE9BQU9DLFVBQVVDLFdBQVdDLGNBQWM7QUFDM0gsU0FBb0NDLDRCQUE0QjtBQUNoRSxTQUFTQyxVQUFVQyxLQUFLQyxPQUFPQyxPQUFPQyxTQUFTQyxxQkFBcUJDLE1BQU1DLGVBQWVDLFVBQVVDLEtBQUtDLGNBQWM7QUFjdEgsTUFBTUMsa0JBQWtCQSxDQUFDQyxPQUF1QjtBQUM5QyxNQUFJQSxNQUFNLElBQU8sUUFBTztBQUN4QixNQUFJQSxNQUFNLElBQU8sUUFBTztBQUN4QixNQUFJQSxNQUFNLElBQU8sUUFBTztBQUN4QixNQUFJQSxNQUFNLElBQU8sUUFBTztBQUN4QixNQUFJQSxNQUFNLElBQU8sUUFBTztBQUN4QixNQUFJQSxNQUFNLElBQU8sUUFBTztBQUN4QixNQUFJQSxNQUFNLElBQU8sUUFBTztBQUN4QixNQUFJQSxNQUFNLElBQU8sUUFBTztBQUN4QixNQUFJQSxNQUFNLElBQVEsUUFBTztBQUN6QixNQUFJQSxNQUFNLEtBQVEsUUFBTztBQUN6QixTQUFPO0FBQ1Q7QUFFQSxNQUFNQyxtQkFBbUJBLENBQUNDLHNCQUFzQztBQUM5RCxRQUFNQyxlQUFjLG9CQUFJQyxLQUFLLEdBQUVDLFlBQVk7QUFDM0MsUUFBTUMsYUFBYUgsY0FBY0QscUJBQXFCO0FBQ3RELE1BQUlJLGFBQWEsR0FBSSxRQUFPO0FBQzVCLE1BQUlBLGFBQWEsR0FBSSxRQUFPO0FBQzVCLE1BQUlBLGFBQWEsR0FBSSxRQUFPO0FBQzVCLE1BQUlBLGFBQWEsR0FBSSxRQUFPO0FBQzVCLE1BQUlBLGFBQWEsR0FBSSxRQUFPO0FBQzVCLFNBQU87QUFDVDtBQUVBLE1BQU1DLDZCQUE2QkEsQ0FBQ0QsY0FBOEI7QUFDaEUsTUFBSUEsYUFBYSxHQUFJLFFBQU87QUFDNUIsTUFBSUEsYUFBYSxHQUFJLFFBQU87QUFDNUIsTUFBSUEsYUFBYSxHQUFJLFFBQU87QUFDNUIsTUFBSUEsYUFBYSxHQUFJLFFBQU87QUFDNUIsTUFBSUEsYUFBYSxHQUFJLFFBQU87QUFDNUIsU0FBTztBQUNUO0FBR0EsTUFBTUUsV0FBVyxDQUFDLFNBQVMsV0FBVyxXQUFXLFdBQVcsV0FBVyxXQUFXLFdBQVcsV0FBVyxZQUFZLGFBQWEsT0FBTztBQUN4SSxNQUFNQyxZQUFZLENBQUMsU0FBUyxVQUFVLFVBQVUsVUFBVSxVQUFVLE1BQU07QUFHMUUsU0FBU0MsaUJBQWlCLEVBQUVDLFdBQVdDLE9BQTBGLEdBQUc7QUFBQUMsS0FBQTtBQUNsSSxRQUFNLENBQUNDLFVBQVVDLFdBQVcsSUFBSTFDLFNBQVMsS0FBSztBQUM5QyxRQUFNMkMsYUFBYUosT0FBT0ssT0FBTyxDQUFDQyxHQUFHQyxNQUFNRCxJQUFJQyxFQUFFQyxPQUFPLENBQUM7QUFFekQsU0FDRSx1QkFBQyxTQUFJLFdBQVUsK0JBQ2I7QUFBQSwyQkFBQyxTQUFJLFdBQVUscUNBQ2I7QUFBQSw2QkFBQyxZQUFPLFNBQVMsTUFBTUwsWUFBWSxDQUFBTSxNQUFLLENBQUNBLENBQUMsR0FBRyxXQUFVLDhDQUNwRFY7QUFBQUE7QUFBQUEsUUFBVTtBQUFBLFFBQUMsdUJBQUMsVUFBSyxXQUFVLDBCQUF5QjtBQUFBO0FBQUEsVUFBRUs7QUFBQUEsVUFBVztBQUFBLGFBQXREO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBdUQ7QUFBQSxXQURyRTtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRUE7QUFBQSxNQUNBLHVCQUFDLFlBQU8sU0FBUyxNQUFNRCxZQUFZLENBQUFNLE1BQUssQ0FBQ0EsQ0FBQyxHQUFHLFdBQVUsMEJBQTBCUCxxQkFBVyxZQUFZLGFBQXhHO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBa0g7QUFBQSxTQUpwSDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBS0E7QUFBQSxJQUNDQSxZQUNDLHVCQUFDLFNBQUksV0FBVSxRQUFPLE9BQU8sRUFBRVEsUUFBUSxJQUFJLEdBQ3pDLGlDQUFDLHVCQUFvQixPQUFNLFFBQU8sUUFBTyxRQUN2QyxpQ0FBQyxZQUFTLE1BQU1WLE9BQU9XLE1BQU0sR0FBRyxFQUFFLEdBQUcsUUFBTyxZQUFXLFFBQVEsRUFBRUMsTUFBTSxHQUFHQyxPQUFPLEdBQUcsR0FDbEY7QUFBQSw2QkFBQyxTQUFNLE1BQUssVUFBUyxNQUFJLFFBQXpCO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBeUI7QUFBQSxNQUN6Qix1QkFBQyxTQUFNLFNBQVEsUUFBTyxNQUFLLFlBQVcsT0FBTyxLQUFLLE1BQU0sRUFBRUMsVUFBVSxHQUFHLEtBQXZFO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBeUU7QUFBQSxNQUN6RSx1QkFBQyxXQUFRLFFBQVEsRUFBRUMsTUFBTSxVQUFVLEdBQUcsY0FBYyxFQUFFRCxVQUFVLE9BQU8sS0FBdkU7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUF5RTtBQUFBLE1BQ3pFLHVCQUFDLE9BQUksU0FBUSxTQUFRLE1BQUssV0FBVSxTQUFTLElBQzFDZCxpQkFBT1csTUFBTSxHQUFHLEVBQUUsRUFBRUs7QUFBQUEsUUFBSSxDQUFDQyxPQUFPQyxNQUMvQix1QkFBQyxVQUFVQSxHQUFYO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBYTtBQUFBLE1BQ2QsS0FISDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBSUE7QUFBQSxTQVJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FTQSxLQVZGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FXQSxLQVpGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FhQTtBQUFBLE9BckJKO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0F1QkE7QUFFSjtBQUFDakIsR0E5QlFILGtCQUFnQjtBQUFBcUIsS0FBaEJyQjtBQWdDRixhQUFNc0IsWUFBc0NBLENBQUMsRUFBRUMsV0FBV0MsaUJBQWlCLE1BQU07QUFBQUMsTUFBQTtBQUN0RixRQUFNLENBQUNDLFVBQVVDLFdBQVcsSUFBSWhFLFNBQThCLFVBQVU7QUFDeEUsUUFBTSxDQUFDaUUsWUFBWUMsYUFBYSxJQUFJbEUsU0FBUyxFQUFFO0FBRy9DLFFBQU0sQ0FBQ21FLHNCQUFzQkMsdUJBQXVCLElBQUlwRSxTQUFTLEtBQUs7QUFDdEUsUUFBTSxDQUFDcUUsb0JBQW9CQyxxQkFBcUIsSUFBSXRFLFNBQXdCLElBQUk7QUFDaEYsUUFBTSxDQUFDdUUsaUJBQWlCQyxrQkFBa0IsSUFBSXhFLFNBQVMsRUFBRTtBQUd6RCxRQUFNLENBQUN5RSxTQUFTQyxVQUFVLElBQUkxRSxTQU8zQjtBQUFBLElBQ0QyRSxVQUFVO0FBQUEsSUFDVkMsTUFBTTtBQUFBLElBQ05DLE1BQU07QUFBQSxJQUNOQyxPQUFPO0FBQUEsSUFDUEMsU0FBUztBQUFBLElBQ1RDLFVBQVU7QUFBQSxFQUNaLENBQUM7QUFFRCxRQUFNQyxlQUFlQSxDQUFDQyxLQUEyQm5DLFVBQWtCO0FBQ2pFMkIsZUFBVyxDQUFBUyxTQUFRO0FBQ2pCLFlBQU1DLFVBQVVELEtBQUtELEdBQUc7QUFDeEIsVUFBSUUsUUFBUUMsU0FBU3RDLEtBQUssR0FBRztBQUMzQixlQUFPLEVBQUUsR0FBR29DLE1BQU0sQ0FBQ0QsR0FBRyxHQUFHRSxRQUFRRSxPQUFPLENBQUFDLE1BQUtBLE1BQU14QyxLQUFLLEVBQUU7QUFBQSxNQUM1RCxPQUFPO0FBQ0wsZUFBTyxFQUFFLEdBQUdvQyxNQUFNLENBQUNELEdBQUcsR0FBRyxDQUFDLEdBQUdFLFNBQVNyQyxLQUFLLEVBQUU7QUFBQSxNQUMvQztBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFFQSxRQUFNeUMsZUFBZUEsTUFBTTtBQUN6QmQsZUFBVyxFQUFFQyxVQUFVLElBQUlDLE1BQU0sSUFBSUMsTUFBTSxJQUFJQyxPQUFPLElBQUlDLFNBQVMsSUFBSUMsVUFBVSxHQUFHLENBQUM7QUFBQSxFQUN2RjtBQUdBLFFBQU1TLG9CQUFvQnhGLFFBQVEsTUFBTTtBQUN0QyxXQUFPMkQsVUFBVUwsSUFBSSxDQUFBbUMsT0FBTTtBQUFBLE1BQ3pCLEdBQUdBO0FBQUFBLE1BQ0hDLGNBQWNqRSxnQkFBZ0JnRSxFQUFFRSxhQUFhLENBQUM7QUFBQSxNQUM5Q0MsZUFBZUgsRUFBRXpELGNBQWM2RCxTQUFZNUQsMkJBQTJCd0QsRUFBRXpELFNBQVMsSUFBSUwsaUJBQWlCOEQsRUFBRTdELGlCQUFpQjtBQUFBLE1BQ3pIa0UsWUFBWSxJQUFJaEUsS0FBSzJELEVBQUVNLE9BQU8sRUFBRWhFLFlBQVksRUFBRWlFLFNBQVM7QUFBQSxNQUN2REMsWUFBWVIsRUFBRVM7QUFBQUEsSUFDaEIsRUFBRTtBQUFBLEVBQ0osR0FBRyxDQUFDdkMsU0FBUyxDQUFDO0FBRWQsUUFBTXdDLG9CQUFvQm5HLFFBQVEsTUFBTTtBQUN0QyxXQUFPd0Ysa0JBQWtCSCxPQUFPLENBQUFJLE1BQUs7QUFDbkMsWUFBTVcsY0FDSlgsRUFBRVksV0FBV0MsWUFBWSxFQUFFbEIsU0FBU3BCLFdBQVdzQyxZQUFZLENBQUMsS0FDNURiLEVBQUVjLGVBQWVELFlBQVksRUFBRWxCLFNBQVNwQixXQUFXc0MsWUFBWSxDQUFDLEtBQ2hFYixFQUFFZSxNQUFNRixZQUFZLEVBQUVsQixTQUFTcEIsV0FBV3NDLFlBQVksQ0FBQztBQUV6RCxVQUFJLENBQUNGLFlBQWEsUUFBTztBQUN6QixVQUFJNUIsUUFBUUUsU0FBUytCLFNBQVMsS0FBSyxDQUFDakMsUUFBUUUsU0FBU1UsU0FBU0ssRUFBRWlCLGVBQWUsRUFBRyxRQUFPO0FBQ3pGLFVBQUlsQyxRQUFRRyxLQUFLOEIsU0FBUyxLQUFLLENBQUNqQyxRQUFRRyxLQUFLUyxTQUFTSyxFQUFFZCxJQUFJLEVBQUcsUUFBTztBQUN0RSxVQUFJSCxRQUFRSSxLQUFLNkIsU0FBUyxLQUFLLENBQUNqQyxRQUFRSSxLQUFLUSxTQUFTSyxFQUFFSyxVQUFVLEVBQUcsUUFBTztBQUM1RSxVQUFJdEIsUUFBUUssTUFBTTRCLFNBQVMsS0FBSyxDQUFDakMsUUFBUUssTUFBTU8sU0FBU0ssRUFBRVEsVUFBVSxFQUFHLFFBQU87QUFDOUUsVUFBSXpCLFFBQVFNLFFBQVEyQixTQUFTLEtBQUssQ0FBQ2pDLFFBQVFNLFFBQVFNLFNBQVNLLEVBQUVDLFlBQVksRUFBRyxRQUFPO0FBQ3BGLFVBQUlsQixRQUFRTyxTQUFTMEIsU0FBUyxLQUFLLENBQUNqQyxRQUFRTyxTQUFTSyxTQUFTSyxFQUFFRyxhQUFhLEVBQUcsUUFBTztBQUV2RixhQUFPO0FBQUEsSUFDVCxDQUFDO0FBQUEsRUFDSCxHQUFHLENBQUNKLG1CQUFtQnhCLFlBQVlRLE9BQU8sQ0FBQztBQUczQyxRQUFNbUMsZUFBZTNHLFFBQVEsTUFBTTtBQUNqQyxVQUFNNEcsWUFBWUEsQ0FBQ0MsT0FBZUMsb0JBQTZDO0FBQzdFLFlBQU1DLFNBQXFDLENBQUM7QUFFNUMsVUFBSUQsaUJBQWlCO0FBQ2pCQSx3QkFBZ0JFLFFBQVEsQ0FBQS9CLFFBQU84QixPQUFPOUIsR0FBRyxJQUFJLEVBQUVnQyxNQUFNaEMsS0FBS25DLE9BQU8sR0FBR29FLFNBQVNqQyxJQUFJLENBQUM7QUFBQSxNQUN0RjtBQUVBa0Isd0JBQWtCYSxRQUFRLENBQUN2QixNQUFXO0FBQ3BDLGNBQU0wQixXQUFXMUIsRUFBRW9CLEtBQUs7QUFDeEIsY0FBTTVCLE1BQU9rQyxhQUFhdEIsVUFBYXNCLGFBQWEsT0FBUUMsT0FBT0QsUUFBUSxJQUFJO0FBQy9FLGNBQU1FLFFBQVFSLFVBQVUsb0JBQXFCaEcscUJBQXFCb0UsR0FBc0IsS0FBS0EsTUFBT0E7QUFFcEcsWUFBSSxDQUFDOEIsT0FBTzlCLEdBQUcsRUFBRzhCLFFBQU85QixHQUFHLElBQUksRUFBRWdDLE1BQU1JLE9BQU92RSxPQUFPLEdBQUdvRSxTQUFTakMsSUFBSTtBQUN0RThCLGVBQU85QixHQUFHLEVBQUVuQyxTQUFTO0FBQ3JCLFlBQUkrRCxVQUFVLGtCQUFtQkUsUUFBTzlCLEdBQUcsRUFBRWdDLE9BQU9JO0FBQUFBLE1BQ3RELENBQUM7QUFFRCxVQUFJQyxTQUFTQyxPQUFPQyxPQUFPVCxNQUFNO0FBRWpDLFVBQUlELGlCQUFpQjtBQUNqQlEsZUFBT0csS0FBSyxDQUFDQyxHQUFHQyxNQUFNYixnQkFBZ0JjLFFBQVFGLEVBQUVSLE9BQU8sSUFBSUosZ0JBQWdCYyxRQUFRRCxFQUFFVCxPQUFPLENBQUM7QUFBQSxNQUNqRyxXQUFXTCxVQUFVLGNBQWM7QUFDL0JTLGVBQU9HLEtBQUssQ0FBQ0MsR0FBR0MsTUFBTUQsRUFBRVQsS0FBS1ksY0FBY0YsRUFBRVYsSUFBSSxDQUFDO0FBQUEsTUFDdEQsT0FBTztBQUNISyxlQUFPRyxLQUFLLENBQUNDLEdBQUdDLE1BQU1BLEVBQUU3RSxRQUFRNEUsRUFBRTVFLEtBQUs7QUFBQSxNQUMzQztBQUVBLGFBQU93RSxPQUFPakMsT0FBTyxDQUFBeUMsTUFBS2hCLGtCQUFrQmdCLEVBQUVoRixTQUFTLElBQUlnRixFQUFFaEYsUUFBUSxDQUFDO0FBQUEsSUFDeEU7QUFFQSxXQUFPO0FBQUEsTUFDTDRCLFVBQVVrQyxVQUFVLGlCQUFpQjtBQUFBLE1BQ3JDaEMsTUFBTWdDLFVBQVUsWUFBWTtBQUFBLE1BQzVCL0IsT0FBTytCLFVBQVUsWUFBWTtBQUFBLE1BQzdCakMsTUFBTWlDLFVBQVUsTUFBTTtBQUFBLE1BQ3RCbEYsSUFBSWtGLFVBQVUsZ0JBQWdCMUUsUUFBUTtBQUFBLE1BQ3RDNkYsS0FBS25CLFVBQVUsaUJBQWlCekUsU0FBUztBQUFBLElBQzNDO0FBQUEsRUFDRixHQUFHLENBQUNnRSxpQkFBaUIsQ0FBQztBQUd0QixRQUFNNkIsbUJBQW1CaEksUUFBUSxNQUFNO0FBQ3JDLFVBQU1pSSxTQUE4RyxDQUFDO0FBR3JIVixXQUFPVyxLQUFLckgsb0JBQW9CLEVBQUVtRyxRQUFRLENBQUEvQixRQUFPO0FBQzdDZ0QsYUFBT2hELEdBQUcsSUFBSSxFQUFFa0QsT0FBTyxHQUFHQyxNQUFNLEdBQUdDLGFBQWEsR0FBR0MsUUFBUSxHQUFHakIsT0FBT3hHLHFCQUFxQm9FLEdBQXNCLEVBQUU7QUFBQSxJQUN0SCxDQUFDO0FBRURrQixzQkFBa0JhLFFBQVEsQ0FBQXZCLE1BQUs7QUFDNUIsWUFBTVIsTUFBTVEsRUFBRWlCLG1CQUFtQjtBQUNqQyxVQUFJLENBQUN1QixPQUFPaEQsR0FBRyxFQUFHZ0QsUUFBT2hELEdBQUcsSUFBSSxFQUFFa0QsT0FBTyxHQUFHQyxNQUFNLEdBQUdDLGFBQWEsR0FBR0MsUUFBUSxHQUFHakIsT0FBT3BDLElBQUk7QUFFM0ZnRCxhQUFPaEQsR0FBRyxFQUFFa0QsU0FBUztBQUNyQkYsYUFBT2hELEdBQUcsRUFBRW1ELFFBQVEzQyxFQUFFOEMsZUFBZTtBQUNyQ04sYUFBT2hELEdBQUcsRUFBRW9ELGVBQWU1QyxFQUFFK0MsaUJBQWlCO0FBQzlDUCxhQUFPaEQsR0FBRyxFQUFFcUQsVUFBVTdDLEVBQUVnRCxnQkFBZ0I7QUFBQSxJQUMzQyxDQUFDO0FBSUQsV0FBT2xCLE9BQU9DLE9BQU9TLE1BQU0sRUFBRVIsS0FBSyxDQUFDQyxHQUFHQyxNQUFNQSxFQUFFUSxRQUFRVCxFQUFFUyxLQUFLO0FBQUEsRUFDL0QsR0FBRyxDQUFDaEMsaUJBQWlCLENBQUM7QUFFdEIsUUFBTXVDLFNBQVM7QUFBQSxJQUNiUCxPQUFPaEMsa0JBQWtCTTtBQUFBQSxJQUN6QmtDLFNBQVN4QyxrQkFBa0J4RCxPQUFPLENBQUNpRyxLQUFLbkQsTUFBTW1ELE1BQU1uRCxFQUFFZ0QsY0FBYyxDQUFDO0FBQUEsSUFDckVMLE1BQU1qQyxrQkFBa0J4RCxPQUFPLENBQUNpRyxLQUFLbkQsTUFBTW1ELE1BQU1uRCxFQUFFOEMsYUFBYSxDQUFDO0FBQUEsSUFDakVGLGFBQWFsQyxrQkFBa0J4RCxPQUFPLENBQUNpRyxLQUFLbkQsTUFBTW1ELE1BQU1uRCxFQUFFK0MsZUFBZSxDQUFDO0FBQUEsRUFDNUU7QUFFQSxRQUFNSyxrQkFBa0IxQyxrQkFBa0IyQyxLQUFLLENBQUFyRCxNQUFLLENBQUMsQ0FBQ0EsRUFBRXNELFdBQVc7QUFDbkUsUUFBTUMsU0FBUyxDQUFDLFdBQVcsV0FBVyxXQUFXLFdBQVcsV0FBVyxXQUFXLFdBQVcsU0FBUztBQUN0RyxRQUFNQyxvQkFBb0I7QUFHMUIsUUFBTUMsdUJBQXVCQSxDQUFDQyxJQUFZQyxnQkFBaUM7QUFDekUsVUFBTUMsV0FBVzFGLFVBQVUyRixLQUFLLENBQUE3RCxNQUFLQSxFQUFFMEQsT0FBT0EsRUFBRTtBQUNoRCxRQUFJRSxTQUFVekYsa0JBQWlCLEVBQUUsR0FBR3lGLFVBQVUzQyxpQkFBaUIwQyxZQUFZLENBQUM7QUFBQSxFQUM5RTtBQUVBLFFBQU1HLHdCQUF3QkEsQ0FBQ0YsYUFBdUI7QUFDcERoRiwwQkFBc0JnRixTQUFTRixFQUFFO0FBQ2pDNUUsdUJBQW1COEUsU0FBU04sZUFBZSxFQUFFO0FBQzdDNUUsNEJBQXdCLElBQUk7QUFBQSxFQUM5QjtBQUVBLFFBQU1xRix3QkFBd0JBLE1BQU07QUFDbEMsUUFBSXBGLG9CQUFvQjtBQUNwQixZQUFNaUYsV0FBVzFGLFVBQVUyRixLQUFLLENBQUE3RCxNQUFLQSxFQUFFMEQsT0FBTy9FLGtCQUFrQjtBQUNoRSxVQUFJaUYsU0FBVXpGLGtCQUFpQixFQUFFLEdBQUd5RixVQUFVTixhQUFhekUsZ0JBQWdCLENBQUM7QUFBQSxJQUNoRjtBQUNBSCw0QkFBd0IsS0FBSztBQUFBLEVBQy9CO0FBR0EsUUFBTXNGLG1CQUFtQmxDLE9BQU9DLE9BQU9oRCxPQUFPLEVBQUVzRSxLQUFLLENBQUFZLFFBQU9BLElBQUlqRCxTQUFTLENBQUM7QUFFMUUsU0FDRSx1QkFBQyxTQUFJLFdBQVUsdURBR2I7QUFBQSwyQkFBQyxTQUFJLFdBQVUsMENBQ2I7QUFBQSw2QkFBQyxTQUNDO0FBQUEsK0JBQUMsUUFBRyxXQUFVLDZEQUNaO0FBQUEsaUNBQUMsYUFBVSxXQUFVLG1CQUFyQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFvQztBQUFBLFVBQUc7QUFBQSxhQUR6QztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBRUE7QUFBQSxRQUNBLHVCQUFDLE9BQUUsV0FBVSwwQkFBeUIseURBQXRDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBK0U7QUFBQSxXQUpqRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBS0E7QUFBQSxNQUNBLHVCQUFDLFNBQUksV0FBVSxjQUNWZ0Q7QUFBQUEsNEJBQ0c7QUFBQSxVQUFDO0FBQUE7QUFBQSxZQUNDLFNBQVNsRTtBQUFBQSxZQUNULFdBQVU7QUFBQSxZQUVSO0FBQUEscUNBQUMsS0FBRSxNQUFNLE1BQVQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBWTtBQUFBLGNBQUc7QUFBQTtBQUFBO0FBQUEsVUFKbkI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBS0E7QUFBQSxRQUVKLHVCQUFDLFNBQUksV0FBVSxrRUFDWDtBQUFBLGlDQUFDLFlBQU8sU0FBUyxNQUFNeEIsWUFBWSxVQUFVLEdBQUcsV0FBVyxpRUFBaUVELGFBQWEsYUFBYSwyQkFBMkIsZ0JBQWdCLElBQzdMO0FBQUEsbUNBQUMsYUFBVSxNQUFNLE1BQWpCO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQW9CO0FBQUEsWUFBRTtBQUFBLGVBRDFCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBRUE7QUFBQSxVQUNBLHVCQUFDLFlBQU8sU0FBUyxNQUFNQyxZQUFZLE1BQU0sR0FBRyxXQUFXLGlFQUFpRUQsYUFBYSxTQUFTLDJCQUEyQixnQkFBZ0IsSUFDckw7QUFBQSxtQ0FBQyxRQUFLLE1BQU0sTUFBWjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFlO0FBQUEsWUFBRTtBQUFBLGVBRHJCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBRUE7QUFBQSxhQU5KO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFPQTtBQUFBLFdBaEJKO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFpQkE7QUFBQSxTQXhCRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBeUJBO0FBQUEsSUFFQ0EsYUFBYSxjQUNaLHVCQUFDLFNBQUksV0FBVSw2Q0FHYjtBQUFBLDZCQUFDLFNBQUksV0FBVSx5Q0FFWDtBQUFBLCtCQUFDLFNBQUksV0FBVSx5RUFDWDtBQUFBLGlDQUFDLFNBQUksV0FBVSxzRkFBcUYsZ0NBQXBHO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBRUE7QUFBQSxVQUNBLHVCQUFDLFNBQUksV0FBVSxpQ0FDWDtBQUFBLG1DQUFDLFFBQUcsV0FBVSxxQ0FBb0M7QUFBQTtBQUFBLGNBQzNDNEUsT0FBT04sS0FBS3VCLGVBQWUsU0FBUyxFQUFDQyxnQkFBZ0IsU0FBU0MsVUFBVSxXQUFXQyx1QkFBdUIsRUFBQyxDQUFDO0FBQUEsaUJBRG5IO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBRUE7QUFBQSxZQUNBLHVCQUFDLE9BQUUsV0FBVSxtQ0FBa0MscUNBQS9DO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQW9FO0FBQUEsZUFKeEU7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFLQTtBQUFBLGFBVEo7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQVVBO0FBQUEsUUFHQSx1QkFBQyxTQUFJLFdBQVUseUVBQ1g7QUFBQSxpQ0FBQyxTQUFJLFdBQVUsc0ZBQXFGLCtCQUFwRztBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUVBO0FBQUEsVUFDQSx1QkFBQyxTQUFJLFdBQVUsaUNBQ1g7QUFBQSxtQ0FBQyxRQUFHLFdBQVUscUNBQW9DO0FBQUE7QUFBQSxjQUMzQ3BCLE9BQU9MLFlBQVlzQixlQUFlLFNBQVMsRUFBQ0MsZ0JBQWdCLFNBQVNDLFVBQVUsV0FBV0MsdUJBQXVCLEVBQUMsQ0FBQztBQUFBLGlCQUQxSDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUVBO0FBQUEsWUFDQSx1QkFBQyxPQUFFLFdBQVUsbUNBQWtDLCtCQUEvQztBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE4RDtBQUFBLGVBSmxFO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBS0E7QUFBQSxhQVRKO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFVQTtBQUFBLFFBR0EsdUJBQUMsU0FBSSxXQUFVLGtGQUNYO0FBQUEsaUNBQUMsU0FBSSxXQUFVLHNGQUFxRixxQ0FBcEc7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLFVBQ0EsdUJBQUMsU0FBSSxXQUFVLGlDQUNYO0FBQUEsbUNBQUMsUUFBRyxXQUFVLHFDQUFvQztBQUFBO0FBQUEsZUFDMUNwQixPQUFPTixPQUFPYSxtQkFBbUJVLGVBQWUsU0FBUyxFQUFDQyxnQkFBZ0IsU0FBU0MsVUFBVSxXQUFXQyx1QkFBdUIsRUFBQyxDQUFDO0FBQUEsaUJBRHpJO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBRUE7QUFBQSxZQUNBLHVCQUFDLE9BQUUsV0FBVSxtQ0FBa0MsbUNBQS9DO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQWtFO0FBQUEsZUFKdEU7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFLQTtBQUFBLFVBQ0EsdUJBQUMsU0FBSSxXQUFVLDZGQUNUYjtBQUFBQSxpQ0FBb0IsS0FBS2MsUUFBUSxDQUFDO0FBQUEsWUFBRTtBQUFBLGVBRDFDO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBRUE7QUFBQSxhQVpKO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFhQTtBQUFBLFFBR0EsdUJBQUMsU0FBSSxXQUFVLHlFQUNWO0FBQUEsaUNBQUMsU0FBSSxXQUFVLHNGQUFxRix3Q0FBcEc7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFRDtBQUFBLFVBQ0EsdUJBQUMsU0FBSSxXQUFVLGlDQUNYO0FBQUEsbUNBQUMsUUFBRyxXQUFVLHFDQUFvQztBQUFBO0FBQUEsY0FDM0NyQixPQUFPQyxRQUFRZ0IsZUFBZSxTQUFTLEVBQUNDLGdCQUFnQixTQUFTQyxVQUFVLFdBQVdDLHVCQUF1QixFQUFDLENBQUM7QUFBQSxpQkFEdEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFFQTtBQUFBLFlBQ0EsdUJBQUMsT0FBRSxXQUFVLG1DQUFrQyxpQ0FBL0M7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBZ0U7QUFBQSxlQUpwRTtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUtBO0FBQUEsYUFUSjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBVUE7QUFBQSxXQXRESjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBdURBO0FBQUEsTUFHQSx1QkFBQyxTQUFJLFdBQVUsd0RBRWI7QUFBQSwrQkFBQyxTQUFJLFdBQVUsNkRBQ1o7QUFBQSxpQ0FBQyxRQUFHLFdBQVUseUZBQXdGO0FBQUEsbUNBQUMsVUFBTyxNQUFNLE1BQWQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBaUI7QUFBQSxZQUFFO0FBQUEsZUFBekg7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBaUo7QUFBQSxVQUNqSix1QkFBQyxTQUFJLFdBQVUsUUFDYixpQ0FBQyx1QkFBb0IsT0FBTSxRQUFPLFFBQU8sUUFDdkMsaUNBQUMsWUFBUyxNQUFNbkQsYUFBYWpDLFVBQVUsUUFBTyxZQUFXLFFBQVEsRUFBQ3hCLE1BQU0sR0FBR0MsT0FBTyxHQUFFLEdBQ2xGO0FBQUEsbUNBQUMsaUJBQWMsaUJBQWdCLE9BQU0sWUFBWSxTQUFqRDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUF1RDtBQUFBLFlBQ3ZELHVCQUFDLFNBQU0sTUFBSyxVQUFTLE1BQUksUUFBekI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBeUI7QUFBQSxZQUN6Qix1QkFBQyxTQUFNLFNBQVEsUUFBTyxNQUFLLFlBQVcsT0FBTyxLQUFLLE1BQU0sRUFBQ0MsVUFBVSxHQUFHNEcsWUFBWSxJQUFHLEdBQUcsVUFBVSxLQUFsRztBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFvRztBQUFBLFlBQ3BHLHVCQUFDLFdBQVEsUUFBUSxFQUFDM0csTUFBTSxVQUFTLEdBQUcsY0FBYyxFQUFDRCxVQUFVLE9BQU0sS0FBbkU7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBcUU7QUFBQSxZQUNyRSx1QkFBQyxPQUFJLFNBQVEsU0FBUSxRQUFRLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLFNBQVMsSUFDaER1RCx1QkFBYWpDLFNBQVNwQjtBQUFBQSxjQUFJLENBQUNDLE9BQU8wRyxVQUNoQyx1QkFBQyxRQUFpQixNQUFNakIsT0FBT2lCLFFBQVFqQixPQUFPdkMsTUFBTSxHQUFHLFFBQU8sV0FBVSxTQUFTLE1BQU16QixhQUFhLFlBQVl6QixNQUFNMkQsT0FBTyxHQUFHLFNBQVMxQyxRQUFRRSxTQUFTK0IsVUFBVSxDQUFDakMsUUFBUUUsU0FBU1UsU0FBUzdCLE1BQU0yRCxPQUFPLElBQUksTUFBTSxLQUEzTStDLE9BQVg7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBd047QUFBQSxZQUMxTixLQUhKO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBSUE7QUFBQSxlQVRGO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBVUEsS0FYRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQVlBLEtBYkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFjQTtBQUFBLGFBaEJIO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFpQkE7QUFBQSxRQUdBLHVCQUFDLFNBQUksV0FBVSw2REFDWjtBQUFBLGlDQUFDLFFBQUcsV0FBVSx5RkFBd0Y7QUFBQSxtQ0FBQyxZQUFTLE1BQU0sTUFBaEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBbUI7QUFBQSxZQUFFO0FBQUEsZUFBM0g7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBNkk7QUFBQSxVQUM3SSx1QkFBQyxTQUFJLFdBQVUsUUFDYixpQ0FBQyx1QkFBb0IsT0FBTSxRQUFPLFFBQU8sUUFDdkMsaUNBQUMsWUFBUyxNQUFNdEQsYUFBYS9CLE1BQzNCO0FBQUEsbUNBQUMsaUJBQWMsaUJBQWdCLE9BQU0sVUFBVSxTQUEvQztBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFxRDtBQUFBLFlBQ3JELHVCQUFDLFNBQU0sU0FBUSxRQUFPLE1BQU0sRUFBQ3hCLFVBQVUsR0FBRSxHQUFHLFVBQVUsT0FBTyxVQUFVLFNBQXZFO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTZFO0FBQUEsWUFDN0UsdUJBQUMsU0FBTSxNQUFJLFFBQVg7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBVztBQUFBLFlBQ1gsdUJBQUMsV0FBUSxRQUFRLEVBQUNDLE1BQU0sVUFBUyxHQUFHLGNBQWMsRUFBQ0QsVUFBVSxPQUFNLEtBQW5FO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXFFO0FBQUEsWUFDckUsdUJBQUMsT0FBSSxTQUFRLFNBQVEsTUFBSyxXQUFVLFFBQVEsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsU0FBUyxJQUNoRXVELHVCQUFhL0IsS0FBS3RCO0FBQUFBLGNBQUksQ0FBQ0MsT0FBTzBHLFVBQzVCLHVCQUFDLFFBQWlCLE1BQU16RixRQUFRSSxLQUFLUSxTQUFTN0IsTUFBTTJELE9BQU8sSUFBSSxZQUFZLFdBQVcsUUFBTyxXQUFVLFNBQVMsTUFBTWxDLGFBQWEsUUFBUXpCLE1BQU0yRCxPQUFPLEtBQTdJK0MsT0FBWDtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUEwSjtBQUFBLFlBQzVKLEtBSEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFJQTtBQUFBLGVBVEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFVQSxLQVhGO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBWUEsS0FiRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQWNBO0FBQUEsYUFoQkg7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQWlCQTtBQUFBLFFBR0MsdUJBQUMsU0FBSSxXQUFVLDZEQUNiO0FBQUEsaUNBQUMsUUFBRyxXQUFVLHlGQUF3RjtBQUFBLG1DQUFDLGFBQVUsTUFBTSxNQUFqQjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFvQjtBQUFBLFlBQUU7QUFBQSxlQUE1SDtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUE2STtBQUFBLFVBQzdJLHVCQUFDLFNBQUksV0FBVSxRQUNiLGlDQUFDLHVCQUFvQixPQUFNLFFBQU8sUUFBTyxRQUN2QyxpQ0FBQyxZQUNDO0FBQUEsbUNBQUMsT0FBSSxNQUFNdEQsYUFBYWhDLE1BQU0sU0FBUSxTQUFRLElBQUcsT0FBTSxJQUFHLE9BQU0sYUFBYSxJQUFJLGFBQWEsSUFBSSxjQUFjLEdBQzVHZ0MsdUJBQWFoQyxLQUFLckI7QUFBQUEsY0FBSSxDQUFDQyxPQUFPMEcsVUFDNUIsdUJBQUMsUUFBaUIsTUFBTWpCLFFBQVFpQixRQUFRLEtBQUtqQixPQUFPdkMsTUFBTSxHQUFHLFFBQU8sV0FBVSxTQUFTLE1BQU16QixhQUFhLFFBQVF6QixNQUFNMkQsT0FBTyxHQUFHLFNBQVMxQyxRQUFRRyxLQUFLOEIsVUFBVSxDQUFDakMsUUFBUUcsS0FBS1MsU0FBUzdCLE1BQU0yRCxPQUFPLElBQUksTUFBTSxLQUFyTStDLE9BQVg7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBa047QUFBQSxZQUNwTixLQUhKO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBSUE7QUFBQSxZQUNBLHVCQUFDLFdBQVEsY0FBYyxFQUFDN0csVUFBVSxPQUFNLEtBQXhDO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTBDO0FBQUEsWUFDMUMsdUJBQUMsVUFBTyxlQUFjLFVBQVMsT0FBTSxTQUFRLFFBQU8sWUFBVyxVQUFTLFVBQVMsY0FBYyxFQUFDQSxVQUFVLE9BQU0sS0FBaEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBa0g7QUFBQSxlQVBwSDtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQVFBLEtBVEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFVQSxLQVhGO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBWUE7QUFBQSxhQWRGO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFlRDtBQUFBLFFBR0EsdUJBQUMsU0FBSSxXQUFVLDZEQUNaO0FBQUEsaUNBQUMsUUFBRyxXQUFVLHlGQUF3RjtBQUFBLG1DQUFDLFNBQU0sTUFBTSxNQUFiO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQWdCO0FBQUEsWUFBRTtBQUFBLGVBQXhIO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQWdKO0FBQUEsVUFDaEosdUJBQUMsU0FBSSxXQUFVLDJDQUVabUUsaUJBQU8yQztBQUFBQSxhQUNMLE1BQTBFO0FBQ3pFLG9CQUFNNUcsTUFBOEMsQ0FBQztBQUNyRDZDLGdDQUFrQmEsUUFBUSxDQUFDdkIsTUFBVztBQUNwQyxzQkFBTTBFLE9BQVExRSxFQUFFcEQsYUFBYW9ELEVBQUVwRCxjQUFjLFFBQVMrRSxPQUFPM0IsRUFBRXBELFNBQVMsSUFBSTtBQUM1RSxzQkFBTStILE1BQU8zRSxFQUFFNEUsVUFBVTVFLEVBQUU0RSxXQUFXLFFBQVNqRCxPQUFPM0IsRUFBRTRFLE1BQU0sSUFBSzVFLEVBQUVTLFNBQVNULEVBQUVTLFVBQVUsUUFBUWtCLE9BQU8zQixFQUFFUyxLQUFLLElBQUk7QUFDcEg1QyxvQkFBSTZHLElBQUksSUFBSTdHLElBQUk2RyxJQUFJLEtBQUssQ0FBQztBQUMxQjdHLG9CQUFJNkcsSUFBSSxFQUFFQyxHQUFHLEtBQUs5RyxJQUFJNkcsSUFBSSxFQUFFQyxHQUFHLEtBQUssS0FBSztBQUFBLGNBQzNDLENBQUM7QUFDRCxvQkFBTUUsTUFBMEUsQ0FBQztBQUNqRi9DLHFCQUFPMkMsUUFBUTVHLEdBQUcsRUFBRTBELFFBQVEsQ0FBQyxDQUFDbUQsTUFBTTdILE1BQU0sTUFBTTtBQUM5Q2dJLG9CQUFJSCxJQUFJLElBQUk1QyxPQUFPMkMsUUFBUTVILE1BQU0sRUFBRWdCLElBQUksQ0FBQyxDQUFDMkQsTUFBTW5FLEtBQUssT0FBTyxFQUFFbUUsTUFBTW5FLE9BQU9vRSxTQUFTLEdBQUdpRCxJQUFJLEtBQUtsRCxJQUFJLEdBQUcsRUFBRTtBQUN4R3FELG9CQUFJSCxJQUFJLEVBQUUxQyxLQUFLLENBQUNDLEdBQUdDLE1BQU1BLEVBQUU3RSxRQUFRNEUsRUFBRTVFLEtBQUs7QUFBQSxjQUM1QyxDQUFDO0FBQ0QscUJBQU93SDtBQUFBQSxZQUNULEdBQUc7QUFBQSxVQUNMLEVBQUVoSCxJQUFJLENBQUMsQ0FBQ2pCLFdBQVdDLE1BQU0sTUFBTTtBQUM3QixtQkFDRSx1QkFBQyxvQkFBaUMsV0FBc0IsVUFBakNELFdBQXZCO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXVFO0FBQUEsVUFFM0UsQ0FBQyxLQXRCSDtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQXVCQTtBQUFBLGFBekJIO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUEwQkE7QUFBQSxRQUdDLHVCQUFDLFNBQUksV0FBVSw2REFDYjtBQUFBLGlDQUFDLFFBQUcsV0FBVSx5RkFBd0Y7QUFBQSxtQ0FBQyxZQUFTLE1BQU0sTUFBaEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBbUI7QUFBQSxZQUFFO0FBQUEsZUFBM0g7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBMkk7QUFBQSxVQUMzSSx1QkFBQyxTQUFJLFdBQVUsUUFDYixpQ0FBQyx1QkFBb0IsT0FBTSxRQUFPLFFBQU8sUUFDdkMsaUNBQUMsWUFBUyxNQUFNc0UsYUFBYWpGLElBQUksUUFBUSxFQUFDNkksS0FBSyxJQUFJcEgsT0FBTyxHQUFHRCxNQUFNLEtBQUtzSCxRQUFRLEVBQUMsR0FDL0U7QUFBQSxtQ0FBQyxpQkFBYyxpQkFBZ0IsT0FBTSxVQUFVLFNBQS9DO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXFEO0FBQUEsWUFDckQsdUJBQUMsU0FBTSxTQUFRLFFBQU8sTUFBTSxFQUFDcEgsVUFBVSxFQUFDLEdBQUcsVUFBVSxHQUFHLE9BQU8sS0FBSyxZQUFXLE9BQU0sUUFBUSxJQUFJLFVBQVUsT0FBTyxVQUFVLFNBQTVIO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQWtJO0FBQUEsWUFDbEksdUJBQUMsU0FBTSxNQUFNLEVBQUNBLFVBQVUsR0FBRSxHQUFHLFVBQVUsT0FBTyxVQUFVLFNBQXhEO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQThEO0FBQUEsWUFDOUQsdUJBQUMsV0FBUSxRQUFRLEVBQUNDLE1BQU0sVUFBUyxHQUFHLGNBQWMsRUFBQ0QsVUFBVSxPQUFNLEtBQW5FO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXFFO0FBQUEsWUFDckUsdUJBQUMsT0FBSSxTQUFRLFNBQVEsTUFBSyxXQUFVLFFBQVEsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQ25EdUQsdUJBQWFqRixHQUFHNEI7QUFBQUEsY0FBSSxDQUFDQyxPQUFPMEcsVUFDMUIsdUJBQUMsUUFBaUIsTUFBTXpGLFFBQVFNLFFBQVFNLFNBQVM3QixNQUFNMkQsT0FBTyxJQUFJLFlBQVksV0FBVyxRQUFPLFdBQVUsU0FBUyxNQUFNbEMsYUFBYSxXQUFXekIsTUFBTTJELE9BQU8sS0FBbkorQyxPQUFYO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQWdLO0FBQUEsWUFDbEssS0FISjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUlBO0FBQUEsZUFURjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQVVBLEtBWEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFZQSxLQWJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBY0E7QUFBQSxhQWhCRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBaUJEO0FBQUEsUUFHQyx1QkFBQyxTQUFJLFdBQVUsNkRBQ2I7QUFBQSxpQ0FBQyxRQUFHLFdBQVUseUZBQXdGO0FBQUEsbUNBQUMsU0FBTSxNQUFNLE1BQWI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBZ0I7QUFBQSxZQUFFO0FBQUEsZUFBeEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBdUk7QUFBQSxVQUN2SSx1QkFBQyxTQUFJLFdBQVUsUUFDYixpQ0FBQyx1QkFBb0IsT0FBTSxRQUFPLFFBQU8sUUFDdkMsaUNBQUMsWUFBUyxNQUFNdEQsYUFBYW9CLEtBQzNCO0FBQUEsbUNBQUMsaUJBQWMsaUJBQWdCLE9BQU0sVUFBVSxTQUEvQztBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFxRDtBQUFBLFlBQ3JELHVCQUFDLFNBQU0sU0FBUSxRQUFPLE1BQU0sRUFBQzNFLFVBQVUsR0FBRSxHQUFHLFVBQVUsT0FBTyxVQUFVLFNBQXZFO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTZFO0FBQUEsWUFDN0UsdUJBQUMsU0FBTSxNQUFJLFFBQVg7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBVztBQUFBLFlBQ1gsdUJBQUMsV0FBUSxRQUFRLEVBQUNDLE1BQU0sVUFBUyxHQUFHLGNBQWMsRUFBQ0QsVUFBVSxPQUFNLEtBQW5FO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXFFO0FBQUEsWUFDckUsdUJBQUMsT0FBSSxTQUFRLFNBQVEsTUFBSyxXQUFVLFFBQVEsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsU0FBUyxJQUMvRHVELHVCQUFhb0IsSUFBSXpFO0FBQUFBLGNBQUksQ0FBQ0MsT0FBTzBHLFVBQzNCLHVCQUFDLFFBQWlCLE1BQU16RixRQUFRTyxTQUFTSyxTQUFTN0IsTUFBTTJELE9BQU8sSUFBSSxZQUFZLFdBQVcsUUFBTyxXQUFVLFNBQVMsTUFBTWxDLGFBQWEsWUFBWXpCLE1BQU0yRCxPQUFPLEtBQXJKK0MsT0FBWDtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFrSztBQUFBLFlBQ3BLLEtBSEo7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFJQTtBQUFBLGVBVEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFVQSxLQVhGO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBWUEsS0FiRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQWNBO0FBQUEsYUFoQkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQWlCRDtBQUFBLFdBOUhGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUErSEE7QUFBQSxNQUdBLHVCQUFDLFNBQUksV0FBVSx5RUFDWjtBQUFBLCtCQUFDLFNBQUksV0FBVSw0RUFDWjtBQUFBLGlDQUFDLFVBQU8sTUFBTSxJQUFJLFdBQVUsb0JBQTVCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTRDO0FBQUEsVUFDNUMsdUJBQUMsUUFBRyxXQUFVLDREQUEyRCxrREFBekU7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBMkc7QUFBQSxhQUY5RztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBR0E7QUFBQSxRQUNBLHVCQUFDLFNBQUksV0FBVSxtQkFDWixpQ0FBQyxXQUFNLFdBQVUsNEJBQ2Q7QUFBQSxpQ0FBQyxXQUFNLFdBQVUsaUZBQ2QsaUNBQUMsUUFDRTtBQUFBLG1DQUFDLFFBQUcsV0FBVSxhQUFZLDZDQUExQjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUF1RDtBQUFBLFlBQ3ZELHVCQUFDLFFBQUcsV0FBVSx5QkFBd0Isa0JBQXRDO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXdDO0FBQUEsWUFDeEMsdUJBQUMsUUFBRyxXQUFVLHdCQUF1QiwwQkFBckM7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBK0M7QUFBQSxZQUMvQyx1QkFBQyxRQUFHLFdBQVUsd0JBQXVCLCtCQUFyQztBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFvRDtBQUFBLFlBQ3BELHVCQUFDLFFBQUcsV0FBVSx3QkFBdUIsZ0NBQXJDO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXFEO0FBQUEsZUFMeEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFNQSxLQVBIO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBUUE7QUFBQSxVQUNBLHVCQUFDLFdBQU0sV0FBVSw2QkFDYmpDO0FBQUFBLDZCQUFpQjFFO0FBQUFBLGNBQUksQ0FBQ21ILFFBQ3BCLHVCQUFDLFFBQW1CLFdBQVUscUJBQzNCO0FBQUEsdUNBQUMsUUFBRyxXQUFVLHdDQUF3Q0EsY0FBSXBELFNBQTFEO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQWdFO0FBQUEsZ0JBQ2hFLHVCQUFDLFFBQUcsV0FBVSxtQ0FBbUNvRCxjQUFJdEMsU0FBckQ7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFBMkQ7QUFBQSxnQkFDM0QsdUJBQUMsUUFBRyxXQUFVLGlEQUFnRDtBQUFBO0FBQUEsa0JBQ3ZEc0MsSUFBSXJDLEtBQUt1QixlQUFlLFNBQVMsRUFBQ2UsdUJBQXVCLEdBQUdaLHVCQUF1QixFQUFDLENBQUM7QUFBQSxxQkFENUY7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFFQTtBQUFBLGdCQUNBLHVCQUFDLFFBQUcsV0FBVSxpREFBZ0Q7QUFBQTtBQUFBLGtCQUN2RFcsSUFBSXBDLFlBQVlzQixlQUFlLFNBQVMsRUFBQ2UsdUJBQXVCLEdBQUdaLHVCQUF1QixFQUFDLENBQUM7QUFBQSxxQkFEbkc7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFFQTtBQUFBLGdCQUNBLHVCQUFDLFFBQUcsV0FBVSwwREFBeUQ7QUFBQTtBQUFBLGtCQUNoRVcsSUFBSW5DLE9BQU9xQixlQUFlLFNBQVMsRUFBQ2UsdUJBQXVCLEdBQUdaLHVCQUF1QixFQUFDLENBQUM7QUFBQSxxQkFEOUY7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFFQTtBQUFBLG1CQVhNVyxJQUFJcEQsT0FBYjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQVlBO0FBQUEsWUFDRjtBQUFBLFlBRUQsdUJBQUMsUUFBRyxXQUFVLHNEQUNYO0FBQUEscUNBQUMsUUFBRyxXQUFVLHNDQUFxQywyQkFBbkQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBOEQ7QUFBQSxjQUM5RCx1QkFBQyxRQUFHLFdBQVUsd0NBQXdDcUIsaUJBQU9QLFNBQTdEO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQW1FO0FBQUEsY0FDbkUsdUJBQUMsUUFBRyxXQUFVLHVDQUFzQztBQUFBO0FBQUEsZ0JBQUlPLE9BQU9OLEtBQUt1QixlQUFlLFNBQVMsRUFBQ2UsdUJBQXVCLEdBQUdaLHVCQUF1QixFQUFDLENBQUM7QUFBQSxtQkFBaEo7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBa0o7QUFBQSxjQUNsSix1QkFBQyxRQUFHLFdBQVUsdUNBQXNDO0FBQUE7QUFBQSxnQkFBSXBCLE9BQU9MLFlBQVlzQixlQUFlLFNBQVMsRUFBQ2UsdUJBQXVCLEdBQUdaLHVCQUF1QixFQUFDLENBQUM7QUFBQSxtQkFBdko7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBeUo7QUFBQSxjQUN6Six1QkFBQyxRQUFHLFdBQVUsc0NBQXFDO0FBQUE7QUFBQSxnQkFBSXBCLE9BQU9DLFFBQVFnQixlQUFlLFNBQVMsRUFBQ2UsdUJBQXVCLEdBQUdaLHVCQUF1QixFQUFDLENBQUM7QUFBQSxtQkFBbEo7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBb0o7QUFBQSxpQkFMdko7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFNQTtBQUFBLGVBdkJIO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBd0JBO0FBQUEsYUFsQ0g7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQW1DQSxLQXBDSDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBcUNBO0FBQUEsV0ExQ0g7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQTJDQTtBQUFBLFNBMU9GO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0E0T0E7QUFBQSxJQUdEaEcsYUFBYSxVQUNaLHVCQUFDLFNBQUksV0FBVSx5R0FDWjtBQUFBLDZCQUFDLFNBQUksV0FBVSx3REFDWDtBQUFBLCtCQUFDLFNBQUksV0FBVSxpQkFDZDtBQUFBLGlDQUFDLFVBQU8sV0FBVSwwQ0FBeUMsTUFBTSxNQUFqRTtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFvRTtBQUFBLFVBQ3BFLHVCQUFDLFdBQU0sTUFBSyxRQUFPLGFBQVksc0JBQXFCLE9BQU9FLFlBQVksVUFBVSxDQUFDakIsTUFBTWtCLGNBQWNsQixFQUFFNEgsT0FBTzdILEtBQUssR0FBRyxXQUFVLDZHQUFqSTtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUEwTztBQUFBLGFBRjNPO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFHRDtBQUFBLFFBQ0EsdUJBQUMsU0FBSSxXQUFVLCtEQUNaLGlDQUFDLFVBQU1xRDtBQUFBQSw0QkFBa0JNO0FBQUFBLFVBQU87QUFBQSxhQUFoQztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXVELEtBRDFEO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFFQTtBQUFBLFdBUEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQVFBO0FBQUEsTUFDQSx1QkFBQyxTQUFJLFdBQVUsaUNBQ1osaUNBQUMsV0FBTSxXQUFVLDRCQUNkO0FBQUEsK0JBQUMsV0FBTSxXQUFVLG9HQUNkLGlDQUFDLFFBQ0U7QUFBQSxpQ0FBQyxRQUFHLFdBQVUsYUFBWSx3QkFBMUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBa0M7QUFBQSxVQUNsQyx1QkFBQyxRQUFHLFdBQVUsYUFBWSx1QkFBMUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBaUM7QUFBQSxVQUNqQyx1QkFBQyxRQUFHLFdBQVUsYUFBWSx5QkFBMUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBbUM7QUFBQSxVQUNuQyx1QkFBQyxRQUFHLFdBQVUsYUFBWSxzQkFBMUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBZ0M7QUFBQSxVQUNoQyx1QkFBQyxRQUFHLFdBQVUsYUFBWSx5QkFBMUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBbUM7QUFBQSxVQUNuQyx1QkFBQyxRQUFHLFdBQVUseUJBQXdCLHVCQUF0QztBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUE2QztBQUFBLFVBQzdDLHVCQUFDLFFBQUcsV0FBVSx5QkFBd0Isc0JBQXRDO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTRDO0FBQUEsVUFDNUMsdUJBQUMsUUFBRyxXQUFVLHlCQUF3Qix3QkFBdEM7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBOEM7QUFBQSxVQUM5Qyx1QkFBQyxRQUFHLFdBQVUsd0JBQXVCLG9CQUFyQztBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUF5QztBQUFBLFVBQ3pDLHVCQUFDLFFBQUcsV0FBVSx3QkFBdUIsdUJBQXJDO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTRDO0FBQUEsVUFDNUMsdUJBQUMsUUFBRyxXQUFVLHlCQUF3QiwwQkFBdEM7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBZ0Q7QUFBQSxVQUMvQ29DLG1CQUFtQix1QkFBQyxRQUFHLFdBQVUsYUFBWSxvQkFBMUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBOEI7QUFBQSxVQUNsRCx1QkFBQyxRQUFHLFdBQVUseUJBQXdCLHFCQUF0QztBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUEyQztBQUFBLGFBYjlDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFjQSxLQWZIO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFnQkE7QUFBQSxRQUNBLHVCQUFDLFdBQU0sV0FBVSw2QkFDYjFDLDRCQUFrQjdDLElBQUksQ0FBQytGLGFBQWtCO0FBQ3ZDLGdCQUFNdUIsYUFBYUEsQ0FBQ0MsWUFBcUI7QUFDdkMsZ0JBQUksQ0FBQ0EsUUFBUyxRQUFPO0FBQ3JCLGdCQUFJO0FBQ0YscUJBQU8sSUFBSS9JLEtBQUsrSSxPQUFPLEVBQUVDLG1CQUFtQixTQUFTLEVBQUVDLEtBQUssV0FBV0MsT0FBTyxXQUFXcEcsTUFBTSxVQUFVLENBQUM7QUFBQSxZQUM1RyxRQUFRO0FBQ04scUJBQU87QUFBQSxZQUNUO0FBQUEsVUFDRjtBQUVBLGlCQUNBLHVCQUFDLFFBQXFCLFdBQVUseUNBQzdCO0FBQUEsbUNBQUMsUUFBRyxXQUFVLGFBRVY7QUFBQSxxQkFBTTtBQUNOLHNCQUFNcUcsUUFBUTtBQUNkLG9CQUFJNUIsU0FBUzZCLHNCQUFzQjdCLFNBQVM2Qix1QkFBdUIsTUFBT0QsT0FBTUUsS0FBSzlCLFNBQVM2QixrQkFBa0I7QUFDaEgsb0JBQUk3QixTQUFTOUMsa0JBQWtCOEMsU0FBUzlDLG1CQUFtQixNQUFPMEUsT0FBTUUsS0FBSzlCLFNBQVM5QyxjQUFjO0FBQ3BHLHNCQUFNNkUsU0FBU0gsTUFBTXhFLFNBQVMsSUFBSXdFLE1BQU1JLEtBQUssS0FBSyxJQUFJO0FBQ3RELHVCQUFPLHVCQUFDLFNBQUksV0FBVSxvQ0FBb0NELG9CQUFuRDtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUEwRDtBQUFBLGNBQ25FLEdBQUc7QUFBQSxjQUNILHVCQUFDLFNBQUksV0FBVSxpQ0FBaUMvQixtQkFBU2hELGNBQWNnRCxTQUFTaEQsZUFBZSxRQUFRZ0QsU0FBU2hELGFBQWEsTUFBN0g7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBZ0k7QUFBQSxpQkFUbEk7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFVQTtBQUFBLFlBQ0EsdUJBQUMsUUFBRyxXQUFVLGFBRVQ7QUFBQSxxQkFBTTtBQUNOLHNCQUFNaUYsSUFBS2pDLFNBQVM3QyxTQUFTNkMsU0FBUzdDLFVBQVUsUUFBUzZDLFNBQVM3QyxRQUFTNkMsU0FBU2tDLGFBQWFsQyxTQUFTa0MsY0FBYyxRQUFRbEMsU0FBU2tDLFlBQVk7QUFDckosdUJBQU8sdUJBQUMsU0FBSSxXQUFVLG9DQUFvQ0QsZUFBbkQ7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFBcUQ7QUFBQSxjQUM5RCxHQUFHO0FBQUEsY0FDSCx1QkFBQyxTQUFJLFdBQVUsMEJBQTBCakMsbUJBQVNuRCxTQUFTbUQsU0FBU25ELFVBQVUsUUFBUW1ELFNBQVNuRCxRQUFRLE1BQXZHO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQTBHO0FBQUEsaUJBTjdHO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBT0E7QUFBQSxZQUNBLHVCQUFDLFFBQUcsV0FBVSxhQUNaLGlDQUFDLFNBQUksV0FBVSwwQkFBMEJtRCxtQkFBU2hILGFBQWFnSCxTQUFTaEgsY0FBYyxRQUFRZ0gsU0FBU2hILFlBQVksT0FBbkg7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBdUgsS0FEekg7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFFQTtBQUFBLFlBQ0EsdUJBQUMsUUFBRyxXQUFVLGFBQ1osaUNBQUMsU0FBSSxXQUFVLDBCQUEwQmdILG1CQUFTZ0IsVUFBVWhCLFNBQVNnQixXQUFXLFFBQVFoQixTQUFTZ0IsU0FBVWhCLFNBQVNuRCxTQUFTbUQsU0FBU25ELFVBQVUsUUFBUW1ELFNBQVNuRCxRQUFRLE9BQXpLO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQThLLEtBRGhMO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBRUE7QUFBQSxZQUNBLHVCQUFDLFFBQUcsV0FBVSxhQUNaLGlDQUFDLFNBQUksV0FBVSwwQkFBMEJtRCxtQkFBU21DLGFBQWFuQyxTQUFTbUMsY0FBYyxRQUFRbkMsU0FBU21DLFlBQVksT0FBbkg7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBdUgsS0FEekg7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFFQTtBQUFBLFlBQ0EsdUJBQUMsUUFBRyxXQUFVLHlCQUNaO0FBQUEscUNBQUMsU0FBSSxXQUFVLDhCQUE2QjtBQUFBO0FBQUEsZ0JBQVNaLFdBQVd2QixTQUFTb0MsV0FBVztBQUFBLG1CQUFwRjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFzRjtBQUFBLGNBQ3RGLHVCQUFDLFNBQUksV0FBVSw4QkFBNkI7QUFBQTtBQUFBLGdCQUFNYixXQUFXdkIsU0FBU3FDLFNBQVM7QUFBQSxtQkFBL0U7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBaUY7QUFBQSxjQUNoRnJDLFNBQVNzQyxnQkFBZ0IsdUJBQUMsU0FBSSxXQUFVLDBDQUEwQ3RDO0FBQUFBLHlCQUFTc0M7QUFBQUEsZ0JBQWE7QUFBQSxtQkFBL0U7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBcUY7QUFBQSxpQkFIakg7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFJQTtBQUFBLFlBQ0EsdUJBQUMsUUFBRyxXQUFVLHlCQUNaO0FBQUEscUNBQUMsU0FBSSxXQUFVLHdDQUF3Q3RDLG1CQUFTdUMsa0JBQWtCLE9BQWxGO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXNGO0FBQUEsY0FDckZ2QyxTQUFTd0MsZUFBZSx1QkFBQyxTQUFJLFdBQVUscUNBQW9DO0FBQUE7QUFBQSxnQkFBU2pCLFdBQVd2QixTQUFTd0MsV0FBVztBQUFBLG1CQUEzRjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUE2RjtBQUFBLGlCQUZ4SDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUdBO0FBQUEsWUFDQSx1QkFBQyxRQUFHLFdBQVUseUJBQ1o7QUFBQSxxQ0FBQyxTQUFJLFdBQVUsb0NBQW9DeEMsbUJBQVN6RCxpQkFBNUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBMEU7QUFBQSxjQUMxRSx1QkFBQyxTQUFJLFdBQVUsOEJBQThCeUQsbUJBQVMzRCxnQkFBdEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBbUU7QUFBQSxpQkFGckU7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFHQTtBQUFBLFlBQ0EsdUJBQUMsUUFBRyxXQUFVLHdCQUNaLGlDQUFDLFNBQUksV0FBVSxvQ0FBb0MyRCxtQkFBU3lDLGlCQUFpQixNQUFNekMsU0FBU3lDLGVBQWVuQyxlQUFlLE9BQU8sQ0FBQyxLQUFLLE9BQXZJO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTJJLEtBRDdJO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBRUE7QUFBQSxZQUNBLHVCQUFDLFFBQUcsV0FBVSx3QkFDWixpQ0FBQyxTQUFJLFdBQVUsbUNBQWtDO0FBQUE7QUFBQSxjQUFJTixTQUFTWixhQUFha0IsZUFBZSxPQUFPO0FBQUEsaUJBQWpHO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQW1HLEtBRHJHO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBRUE7QUFBQSxZQUNBLHVCQUFDLFFBQUcsV0FBVSxhQUNYO0FBQUEsY0FBQztBQUFBO0FBQUEsZ0JBQ0MsT0FBT04sU0FBUzNDO0FBQUFBLGdCQUNoQixVQUFVLENBQUMzRCxNQUFNbUcscUJBQXFCRyxTQUFTRixJQUFJcEcsRUFBRTRILE9BQU83SCxLQUF3QjtBQUFBLGdCQUNwRixXQUFVO0FBQUEsZ0JBRVJ5RSxpQkFBTzJDLFFBQVFySixvQkFBb0IsRUFBRXlDO0FBQUFBLGtCQUFJLENBQUMsQ0FBQzJCLEtBQUtvQyxLQUFLLE1BQ25ELHVCQUFDLFlBQWlCLE9BQU9wQyxLQUFNb0MsbUJBQWxCcEMsS0FBYjtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUFxQztBQUFBLGdCQUN2QztBQUFBO0FBQUEsY0FQSjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsWUFRQSxLQVRIO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBVUE7QUFBQSxZQUNDNEQsbUJBQW1CLHVCQUFDLFFBQUcsV0FBVSxhQUFhUSxtQkFBU04sZUFBZSx1QkFBQyxVQUFLLFdBQVUsaUVBQWdFLG1CQUFoRjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFtRixLQUF0STtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE4STtBQUFBLFlBQ2xLLHVCQUFDLFFBQUcsV0FBVSx5QkFDWCxpQ0FBQyxZQUFPLFdBQVUsc0NBQXFDLFNBQVMsTUFBTVEsc0JBQXNCRixRQUFRLEdBQUcsaUNBQUMscUJBQWtCLE1BQU0sTUFBekI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBNEIsS0FBbkk7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBcUksS0FEeEk7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFFQTtBQUFBLGVBOURNQSxTQUFTRixJQUFsQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQStEQTtBQUFBLFFBRUgsQ0FBQyxLQTdFSjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBOEVBO0FBQUEsV0FoR0g7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQWlHQSxLQWxHSDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBbUdBO0FBQUEsU0E3R0g7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQThHQTtBQUFBLElBSURqRix3QkFDQyx1QkFBQyxTQUFJLFdBQVUsd0ZBQ1osaUNBQUMsU0FBSSxXQUFVLDBGQUNaO0FBQUEsNkJBQUMsU0FBSSxXQUFVLG1FQUNaO0FBQUEsK0JBQUMsUUFBRyxXQUFVLDREQUNYO0FBQUEsaUNBQUMscUJBQWtCLFdBQVUsaUJBQWdCLE1BQU0sTUFBbkQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBc0Q7QUFBQSxVQUFFO0FBQUEsYUFEM0Q7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUVBO0FBQUEsUUFDQSx1QkFBQyxZQUFPLFNBQVMsTUFBTUMsd0JBQXdCLEtBQUssR0FBRyxXQUFVLHVDQUM5RCxpQ0FBQyxLQUFFLE1BQU0sTUFBVDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQVksS0FEZjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBRUE7QUFBQSxXQU5IO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFPQTtBQUFBLE1BQ0EsdUJBQUMsU0FBSSxXQUFVLE9BQ1o7QUFBQTtBQUFBLFVBQUM7QUFBQTtBQUFBLFlBQ0UsV0FBVTtBQUFBLFlBQ1YsYUFBWTtBQUFBLFlBQ1osT0FBT0c7QUFBQUEsWUFDUCxVQUFVLENBQUN2QixNQUFNd0IsbUJBQW1CeEIsRUFBRTRILE9BQU83SCxLQUFLO0FBQUE7QUFBQSxVQUpyRDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFLQztBQUFBLFFBQ0QsdUJBQUMsU0FBSSxXQUFVLCtCQUNaO0FBQUEsaUNBQUMsWUFBTyxTQUFTLE1BQU1xQix3QkFBd0IsS0FBSyxHQUFHLFdBQVUsaUZBQWdGLHdCQUFqSjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUF5SjtBQUFBLFVBQ3pKLHVCQUFDLFlBQU8sU0FBU3FGLHVCQUF1QixXQUFVLDJFQUEwRSxzQkFBNUg7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBa0k7QUFBQSxhQUZySTtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBR0E7QUFBQSxXQVZIO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFXQTtBQUFBLFNBcEJIO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FxQkEsS0F0Qkg7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQXVCQTtBQUFBLE9BelpKO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0E0WkE7QUFFSjtBQUFFM0YsSUExa0JXSCxXQUFtQztBQUFBcUksTUFBbkNySTtBQUFtQyxJQUFBRCxJQUFBc0k7QUFBQUMsYUFBQXZJLElBQUE7QUFBQXVJLGFBQUFELEtBQUEiLCJuYW1lcyI6WyJ1c2VTdGF0ZSIsInVzZU1lbW8iLCJTZWFyY2giLCJCYXJDaGFydDMiLCJMaXN0IiwiQ2FsZW5kYXIiLCJUcnVjayIsIk1lc3NhZ2VTcXVhcmVQbHVzIiwiWCIsIkxheWVycyIsIkNsb2NrIiwiQWN0aXZpdHkiLCJCcmllZmNhc2UiLCJUYWJsZTIiLCJSZW5ld2FsU3RyYXRlZ3lMYWJlbCIsIkJhckNoYXJ0IiwiQmFyIiwiWEF4aXMiLCJZQXhpcyIsIlRvb2x0aXAiLCJSZXNwb25zaXZlQ29udGFpbmVyIiwiQ2VsbCIsIkNhcnRlc2lhbkdyaWQiLCJQaWVDaGFydCIsIlBpZSIsIkxlZ2VuZCIsImdldEttUmFuZ2VMYWJlbCIsImttIiwiZ2V0QWdlUmFuZ2VMYWJlbCIsIm1hbnVmYWN0dXJpbmdZZWFyIiwiY3VycmVudFllYXIiLCJEYXRlIiwiZ2V0RnVsbFllYXIiLCJhZ2VNb250aHMiLCJnZXRBZ2VSYW5nZUxhYmVsRnJvbU1vbnRocyIsIktNX09SREVSIiwiQUdFX09SREVSIiwiTW9udGFkb3JhU2VjdGlvbiIsIm1vbnRhZG9yYSIsIm1vZGVscyIsIl9zIiwiZXhwYW5kZWQiLCJzZXRFeHBhbmRlZCIsInRvdGFsQ291bnQiLCJyZWR1Y2UiLCJzIiwibSIsInZhbHVlIiwiZSIsImhlaWdodCIsInNsaWNlIiwibGVmdCIsInJpZ2h0IiwiZm9udFNpemUiLCJmaWxsIiwibWFwIiwiZW50cnkiLCJpIiwiX2MiLCJDb250cmFjdHMiLCJjb250cmFjdHMiLCJvblVwZGF0ZUNvbnRyYWN0IiwiX3MyIiwidmlld01vZGUiLCJzZXRWaWV3TW9kZSIsInNlYXJjaFRlcm0iLCJzZXRTZWFyY2hUZXJtIiwib2JzZXJ2YXRpb25Nb2RhbE9wZW4iLCJzZXRPYnNlcnZhdGlvbk1vZGFsT3BlbiIsInNlbGVjdGVkQ29udHJhY3RJZCIsInNldFNlbGVjdGVkQ29udHJhY3RJZCIsInRlbXBPYnNlcnZhdGlvbiIsInNldFRlbXBPYnNlcnZhdGlvbiIsImZpbHRlcnMiLCJzZXRGaWx0ZXJzIiwic3RyYXRlZ3kiLCJ0eXBlIiwieWVhciIsImdyb3VwIiwia21SYW5nZSIsImFnZVJhbmdlIiwidG9nZ2xlRmlsdGVyIiwia2V5IiwicHJldiIsImN1cnJlbnQiLCJpbmNsdWRlcyIsImZpbHRlciIsInYiLCJjbGVhckZpbHRlcnMiLCJlbnJpY2hlZENvbnRyYWN0cyIsImMiLCJrbVJhbmdlTGFiZWwiLCJjdXJyZW50S20iLCJhZ2VSYW5nZUxhYmVsIiwidW5kZWZpbmVkIiwiZXhwaXJ5WWVhciIsImVuZERhdGUiLCJ0b1N0cmluZyIsImdyb3VwTGFiZWwiLCJtb2RlbCIsImZpbHRlcmVkQ29udHJhY3RzIiwic2VhcmNoTWF0Y2giLCJjbGllbnROYW1lIiwidG9Mb3dlckNhc2UiLCJjb250cmFjdE51bWJlciIsInBsYXRlIiwibGVuZ3RoIiwicmVuZXdhbFN0cmF0ZWd5IiwiYW5hbHlzaXNEYXRhIiwiYWdncmVnYXRlIiwiZmllbGQiLCJwcmVkZWZpbmVkT3JkZXIiLCJjb3VudHMiLCJmb3JFYWNoIiwibmFtZSIsImZ1bGxLZXkiLCJyYXdWYWx1ZSIsIlN0cmluZyIsImxhYmVsIiwicmVzdWx0IiwiT2JqZWN0IiwidmFsdWVzIiwic29ydCIsImEiLCJiIiwiaW5kZXhPZiIsImxvY2FsZUNvbXBhcmUiLCJyIiwiYWdlIiwic3VtbWFyeVRhYmxlRGF0YSIsImdyb3VwcyIsImtleXMiLCJjb3VudCIsImZpcGUiLCJhY3F1aXNpdGlvbiIsInJlbnRhbCIsImN1cnJlbnRGaXBlIiwicHVyY2hhc2VQcmljZSIsIm1vbnRobHlWYWx1ZSIsInRvdGFscyIsInJldmVudWUiLCJhY2MiLCJoYXNPYnNlcnZhdGlvbnMiLCJzb21lIiwib2JzZXJ2YXRpb24iLCJDT0xPUlMiLCJSRVRVUk5fUEVSQ0VOVEFHRSIsImhhbmRsZVN0cmF0ZWd5Q2hhbmdlIiwiaWQiLCJuZXdTdHJhdGVneSIsImNvbnRyYWN0IiwiZmluZCIsImhhbmRsZU9wZW5PYnNlcnZhdGlvbiIsImhhbmRsZVNhdmVPYnNlcnZhdGlvbiIsImhhc0FjdGl2ZUZpbHRlcnMiLCJhcnIiLCJ0b0xvY2FsZVN0cmluZyIsImNvbXBhY3REaXNwbGF5Iiwibm90YXRpb24iLCJtYXhpbXVtRnJhY3Rpb25EaWdpdHMiLCJ0b0ZpeGVkIiwiZm9udFdlaWdodCIsImluZGV4IiwiZW50cmllcyIsIm1vbnQiLCJtb2QiLCJtb2RlbG8iLCJvdXQiLCJ0b3AiLCJib3R0b20iLCJyb3ciLCJtaW5pbXVtRnJhY3Rpb25EaWdpdHMiLCJ0YXJnZXQiLCJmb3JtYXREYXRlIiwiZGF0ZVN0ciIsInRvTG9jYWxlRGF0ZVN0cmluZyIsImRheSIsIm1vbnRoIiwicGFydHMiLCJjb21tZXJjaWFsQ29udHJhY3QiLCJwdXNoIiwiaGVhZGVyIiwiam9pbiIsInAiLCJtYWluUGxhdGUiLCJjYXRlZ29yaWEiLCJpbml0aWFsRGF0ZSIsImZpbmFsRGF0ZSIsInBlcmlvZE1vbnRocyIsImNvbnRyYWN0U3RhdHVzIiwiY2xvc2luZ0RhdGUiLCJ2YWxvckZpcGVBdHVhbCIsIl9jMiIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJDb250cmFjdHMudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCwgeyB1c2VTdGF0ZSwgdXNlTWVtbywgdXNlQ2FsbGJhY2sgfSBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCB7IFNlYXJjaCwgQmFyQ2hhcnQzLCBMaXN0LCBDYWxlbmRhciwgVHJ1Y2ssIE1lc3NhZ2VTcXVhcmVQbHVzLCBYLCBMYXllcnMsIENsb2NrLCBBY3Rpdml0eSwgQnJpZWZjYXNlLCBUYWJsZTIgfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xyXG5pbXBvcnQgeyBDb250cmFjdCwgUmVuZXdhbFN0cmF0ZWd5LCBSZW5ld2FsU3RyYXRlZ3lMYWJlbCB9IGZyb20gJ0AvdHlwZXMvY29udHJhY3RzJztcclxuaW1wb3J0IHsgQmFyQ2hhcnQsIEJhciwgWEF4aXMsIFlBeGlzLCBUb29sdGlwLCBSZXNwb25zaXZlQ29udGFpbmVyLCBDZWxsLCBDYXJ0ZXNpYW5HcmlkLCBQaWVDaGFydCwgUGllLCBMZWdlbmQgfSBmcm9tICdyZWNoYXJ0cyc7XHJcblxyXG5pbnRlcmZhY2UgQ29udHJhY3RzUHJvcHMge1xyXG4gIGNvbnRyYWN0czogQ29udHJhY3RbXTtcclxuICBvblVwZGF0ZUNvbnRyYWN0OiAoYzogQ29udHJhY3QpID0+IHZvaWQ7XHJcbn1cclxuXHJcbmludGVyZmFjZSBDaGFydEVudHJ5IHtcclxuICBuYW1lOiBzdHJpbmc7XHJcbiAgdmFsdWU6IG51bWJlcjtcclxuICBmdWxsS2V5OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8vIC0tLSBIRUxQRVIgRlVOQ1RJT05TIEZPUiBSQU5HRVMgLS0tXHJcbmNvbnN0IGdldEttUmFuZ2VMYWJlbCA9IChrbTogbnVtYmVyKTogc3RyaW5nID0+IHtcclxuICBpZiAoa20gPD0gMTAwMDApIHJldHVybiAnMC0xMGsnO1xyXG4gIGlmIChrbSA8PSAyMDAwMCkgcmV0dXJuICcxMGstMjBrJztcclxuICBpZiAoa20gPD0gMzAwMDApIHJldHVybiAnMjBrLTMwayc7XHJcbiAgaWYgKGttIDw9IDQwMDAwKSByZXR1cm4gJzMway00MGsnO1xyXG4gIGlmIChrbSA8PSA1MDAwMCkgcmV0dXJuICc0MGstNTBrJztcclxuICBpZiAoa20gPD0gNjAwMDApIHJldHVybiAnNTBrLTYwayc7XHJcbiAgaWYgKGttIDw9IDcwMDAwKSByZXR1cm4gJzYway03MGsnO1xyXG4gIGlmIChrbSA8PSA4MDAwMCkgcmV0dXJuICc3MGstODBrJztcclxuICBpZiAoa20gPD0gMTAwMDAwKSByZXR1cm4gJzgway0xMDBrJztcclxuICBpZiAoa20gPD0gMTIwMDAwKSByZXR1cm4gJzEwMGstMTIwayc7XHJcbiAgcmV0dXJuICcrMTIwayc7XHJcbn07XHJcblxyXG5jb25zdCBnZXRBZ2VSYW5nZUxhYmVsID0gKG1hbnVmYWN0dXJpbmdZZWFyOiBudW1iZXIpOiBzdHJpbmcgPT4ge1xyXG4gIGNvbnN0IGN1cnJlbnRZZWFyID0gbmV3IERhdGUoKS5nZXRGdWxsWWVhcigpO1xyXG4gIGNvbnN0IGFnZU1vbnRocyA9IChjdXJyZW50WWVhciAtIG1hbnVmYWN0dXJpbmdZZWFyKSAqIDEyO1xyXG4gIGlmIChhZ2VNb250aHMgPD0gMTIpIHJldHVybiAnMC0xMm0nO1xyXG4gIGlmIChhZ2VNb250aHMgPD0gMjQpIHJldHVybiAnMTMtMjRtJztcclxuICBpZiAoYWdlTW9udGhzIDw9IDM2KSByZXR1cm4gJzI1LTM2bSc7XHJcbiAgaWYgKGFnZU1vbnRocyA8PSA0OCkgcmV0dXJuICczNy00OG0nO1xyXG4gIGlmIChhZ2VNb250aHMgPD0gNjApIHJldHVybiAnNDktNjBtJztcclxuICByZXR1cm4gJys2MG0nO1xyXG59O1xyXG5cclxuY29uc3QgZ2V0QWdlUmFuZ2VMYWJlbEZyb21Nb250aHMgPSAoYWdlTW9udGhzOiBudW1iZXIpOiBzdHJpbmcgPT4ge1xyXG4gIGlmIChhZ2VNb250aHMgPD0gMTIpIHJldHVybiAnMC0xMm0nO1xyXG4gIGlmIChhZ2VNb250aHMgPD0gMjQpIHJldHVybiAnMTMtMjRtJztcclxuICBpZiAoYWdlTW9udGhzIDw9IDM2KSByZXR1cm4gJzI1LTM2bSc7XHJcbiAgaWYgKGFnZU1vbnRocyA8PSA0OCkgcmV0dXJuICczNy00OG0nO1xyXG4gIGlmIChhZ2VNb250aHMgPD0gNjApIHJldHVybiAnNDktNjBtJztcclxuICByZXR1cm4gJys2MG0nO1xyXG59O1xyXG5cclxuLy8gRml4ZWQgb3JkZXJzIGZvciBzb3J0aW5nIGNoYXJ0c1xyXG5jb25zdCBLTV9PUkRFUiA9IFsnMC0xMGsnLCAnMTBrLTIwaycsICcyMGstMzBrJywgJzMway00MGsnLCAnNDBrLTUwaycsICc1MGstNjBrJywgJzYway03MGsnLCAnNzBrLTgwaycsICc4MGstMTAwaycsICcxMDBrLTEyMGsnLCAnKzEyMGsnXTtcclxuY29uc3QgQUdFX09SREVSID0gWycwLTEybScsICcxMy0yNG0nLCAnMjUtMzZtJywgJzM3LTQ4bScsICc0OS02MG0nLCAnKzYwbSddO1xyXG5cclxuLy8gQ29tcG9uZW50OiBjb2xsYXBzaWJsZSBzZWN0aW9uIHBlciBtb250YWRvcmEgc2hvd2luZyB0b3AgbW9kZWxzIGFzIGEgc21hbGwgYmFyIGNoYXJ0XHJcbmZ1bmN0aW9uIE1vbnRhZG9yYVNlY3Rpb24oeyBtb250YWRvcmEsIG1vZGVscyB9OiB7IG1vbnRhZG9yYTogc3RyaW5nOyBtb2RlbHM6IHsgbmFtZTogc3RyaW5nOyB2YWx1ZTogbnVtYmVyOyBmdWxsS2V5OiBzdHJpbmcgfVtdIH0pIHtcclxuICBjb25zdCBbZXhwYW5kZWQsIHNldEV4cGFuZGVkXSA9IHVzZVN0YXRlKGZhbHNlKTtcclxuICBjb25zdCB0b3RhbENvdW50ID0gbW9kZWxzLnJlZHVjZSgocywgbSkgPT4gcyArIG0udmFsdWUsIDApO1xyXG5cclxuICByZXR1cm4gKFxyXG4gICAgPGRpdiBjbGFzc05hbWU9XCJib3JkZXIgcm91bmRlZCBwLTIgYmctd2hpdGVcIj5cclxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiBpdGVtcy1jZW50ZXJcIj5cclxuICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldEV4cGFuZGVkKGUgPT4gIWUpfSBjbGFzc05hbWU9XCJ0ZXh0LWxlZnQgZm9udC1ib2xkIHRleHQtc20gdGV4dC1zbGF0ZS04MDBcIj5cclxuICAgICAgICAgIHttb250YWRvcmF9IDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1zbGF0ZS01MDBcIj4oe3RvdGFsQ291bnR9KTwvc3Bhbj5cclxuICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldEV4cGFuZGVkKGUgPT4gIWUpfSBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtc2xhdGUtNTAwXCI+e2V4cGFuZGVkID8gJ09jdWx0YXInIDogJ01vc3RyYXInfTwvYnV0dG9uPlxyXG4gICAgICA8L2Rpdj5cclxuICAgICAge2V4cGFuZGVkICYmIChcclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTJcIiBzdHlsZT17eyBoZWlnaHQ6IDEyMCB9fT5cclxuICAgICAgICAgIDxSZXNwb25zaXZlQ29udGFpbmVyIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIj5cclxuICAgICAgICAgICAgPEJhckNoYXJ0IGRhdGE9e21vZGVscy5zbGljZSgwLCAxMCl9IGxheW91dD1cInZlcnRpY2FsXCIgbWFyZ2luPXt7IGxlZnQ6IDAsIHJpZ2h0OiAxMCB9fT5cclxuICAgICAgICAgICAgICA8WEF4aXMgdHlwZT1cIm51bWJlclwiIGhpZGUgLz5cclxuICAgICAgICAgICAgICA8WUF4aXMgZGF0YUtleT1cIm5hbWVcIiB0eXBlPVwiY2F0ZWdvcnlcIiB3aWR0aD17MTYwfSB0aWNrPXt7IGZvbnRTaXplOiAxMCB9fSAvPlxyXG4gICAgICAgICAgICAgIDxUb29sdGlwIGN1cnNvcj17eyBmaWxsOiAnI2YxZjVmOScgfX0gY29udGVudFN0eWxlPXt7IGZvbnRTaXplOiAnMTJweCcgfX0gLz5cclxuICAgICAgICAgICAgICA8QmFyIGRhdGFLZXk9XCJ2YWx1ZVwiIGZpbGw9XCIjMTBCOTgxXCIgYmFyU2l6ZT17MTJ9PlxyXG4gICAgICAgICAgICAgICAge21vZGVscy5zbGljZSgwLCAxMCkubWFwKChlbnRyeSwgaSkgPT4gKFxyXG4gICAgICAgICAgICAgICAgICA8Q2VsbCBrZXk9e2l9IC8+XHJcbiAgICAgICAgICAgICAgICApKX1cclxuICAgICAgICAgICAgICA8L0Jhcj5cclxuICAgICAgICAgICAgPC9CYXJDaGFydD5cclxuICAgICAgICAgIDwvUmVzcG9uc2l2ZUNvbnRhaW5lcj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgKX1cclxuICAgIDwvZGl2PlxyXG4gICk7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBDb250cmFjdHM6IFJlYWN0LkZDPENvbnRyYWN0c1Byb3BzPiA9ICh7IGNvbnRyYWN0cywgb25VcGRhdGVDb250cmFjdCB9KSA9PiB7XHJcbiAgY29uc3QgW3ZpZXdNb2RlLCBzZXRWaWV3TW9kZV0gPSB1c2VTdGF0ZTwnYW5hbHlzaXMnIHwgJ2xpc3QnPignYW5hbHlzaXMnKTtcclxuICBjb25zdCBbc2VhcmNoVGVybSwgc2V0U2VhcmNoVGVybV0gPSB1c2VTdGF0ZSgnJyk7XHJcbiAgXHJcbiAgLy8gT2JzZXJ2YXRpb24gTW9kYWxcclxuICBjb25zdCBbb2JzZXJ2YXRpb25Nb2RhbE9wZW4sIHNldE9ic2VydmF0aW9uTW9kYWxPcGVuXSA9IHVzZVN0YXRlKGZhbHNlKTtcclxuICBjb25zdCBbc2VsZWN0ZWRDb250cmFjdElkLCBzZXRTZWxlY3RlZENvbnRyYWN0SWRdID0gdXNlU3RhdGU8c3RyaW5nIHwgbnVsbD4obnVsbCk7XHJcbiAgY29uc3QgW3RlbXBPYnNlcnZhdGlvbiwgc2V0VGVtcE9ic2VydmF0aW9uXSA9IHVzZVN0YXRlKCcnKTtcclxuXHJcbiAgLy8gLS0tIEZJTFRFUlMgU1RBVEUgLS0tXHJcbiAgY29uc3QgW2ZpbHRlcnMsIHNldEZpbHRlcnNdID0gdXNlU3RhdGU8e1xyXG4gICAgc3RyYXRlZ3k6IHN0cmluZ1tdO1xyXG4gICAgdHlwZTogc3RyaW5nW107XHJcbiAgICB5ZWFyOiBzdHJpbmdbXTtcclxuICAgIGdyb3VwOiBzdHJpbmdbXTtcclxuICAgIGttUmFuZ2U6IHN0cmluZ1tdO1xyXG4gICAgYWdlUmFuZ2U6IHN0cmluZ1tdO1xyXG4gIH0+KHtcclxuICAgIHN0cmF0ZWd5OiBbXSxcclxuICAgIHR5cGU6IFtdLFxyXG4gICAgeWVhcjogW10sXHJcbiAgICBncm91cDogW10sXHJcbiAgICBrbVJhbmdlOiBbXSxcclxuICAgIGFnZVJhbmdlOiBbXVxyXG4gIH0pO1xyXG5cclxuICBjb25zdCB0b2dnbGVGaWx0ZXIgPSAoa2V5OiBrZXlvZiB0eXBlb2YgZmlsdGVycywgdmFsdWU6IHN0cmluZykgPT4ge1xyXG4gICAgc2V0RmlsdGVycyhwcmV2ID0+IHtcclxuICAgICAgY29uc3QgY3VycmVudCA9IHByZXZba2V5XTtcclxuICAgICAgaWYgKGN1cnJlbnQuaW5jbHVkZXModmFsdWUpKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgLi4ucHJldiwgW2tleV06IGN1cnJlbnQuZmlsdGVyKHYgPT4gdiAhPT0gdmFsdWUpIH07XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIHsgLi4ucHJldiwgW2tleV06IFsuLi5jdXJyZW50LCB2YWx1ZV0gfTsgXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG4gIGNvbnN0IGNsZWFyRmlsdGVycyA9ICgpID0+IHtcclxuICAgIHNldEZpbHRlcnMoeyBzdHJhdGVneTogW10sIHR5cGU6IFtdLCB5ZWFyOiBbXSwgZ3JvdXA6IFtdLCBrbVJhbmdlOiBbXSwgYWdlUmFuZ2U6IFtdIH0pO1xyXG4gIH07XHJcbiAgXHJcbiAgLy8gLS0tIERBVEEgUFJFUEFSQVRJT04gLS0tXHJcbiAgY29uc3QgZW5yaWNoZWRDb250cmFjdHMgPSB1c2VNZW1vKCgpID0+IHtcclxuICAgIHJldHVybiBjb250cmFjdHMubWFwKGMgPT4gKHtcclxuICAgICAgLi4uYyxcclxuICAgICAga21SYW5nZUxhYmVsOiBnZXRLbVJhbmdlTGFiZWwoYy5jdXJyZW50S20gfHwgMCksXHJcbiAgICAgIGFnZVJhbmdlTGFiZWw6IGMuYWdlTW9udGhzICE9PSB1bmRlZmluZWQgPyBnZXRBZ2VSYW5nZUxhYmVsRnJvbU1vbnRocyhjLmFnZU1vbnRocykgOiBnZXRBZ2VSYW5nZUxhYmVsKGMubWFudWZhY3R1cmluZ1llYXIpLFxyXG4gICAgICBleHBpcnlZZWFyOiBuZXcgRGF0ZShjLmVuZERhdGUpLmdldEZ1bGxZZWFyKCkudG9TdHJpbmcoKSxcclxuICAgICAgZ3JvdXBMYWJlbDogYy5tb2RlbFxyXG4gICAgfSkpO1xyXG4gIH0sIFtjb250cmFjdHNdKTtcclxuXHJcbiAgY29uc3QgZmlsdGVyZWRDb250cmFjdHMgPSB1c2VNZW1vKCgpID0+IHtcclxuICAgIHJldHVybiBlbnJpY2hlZENvbnRyYWN0cy5maWx0ZXIoYyA9PiB7XHJcbiAgICAgIGNvbnN0IHNlYXJjaE1hdGNoID0gXHJcbiAgICAgICAgYy5jbGllbnROYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoVGVybS50b0xvd2VyQ2FzZSgpKSB8fCBcclxuICAgICAgICBjLmNvbnRyYWN0TnVtYmVyLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoVGVybS50b0xvd2VyQ2FzZSgpKSB8fFxyXG4gICAgICAgIGMucGxhdGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhzZWFyY2hUZXJtLnRvTG93ZXJDYXNlKCkpO1xyXG4gICAgICBcclxuICAgICAgaWYgKCFzZWFyY2hNYXRjaCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICBpZiAoZmlsdGVycy5zdHJhdGVneS5sZW5ndGggPiAwICYmICFmaWx0ZXJzLnN0cmF0ZWd5LmluY2x1ZGVzKGMucmVuZXdhbFN0cmF0ZWd5KSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICBpZiAoZmlsdGVycy50eXBlLmxlbmd0aCA+IDAgJiYgIWZpbHRlcnMudHlwZS5pbmNsdWRlcyhjLnR5cGUpKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgIGlmIChmaWx0ZXJzLnllYXIubGVuZ3RoID4gMCAmJiAhZmlsdGVycy55ZWFyLmluY2x1ZGVzKGMuZXhwaXJ5WWVhcikpIHJldHVybiBmYWxzZTtcclxuICAgICAgaWYgKGZpbHRlcnMuZ3JvdXAubGVuZ3RoID4gMCAmJiAhZmlsdGVycy5ncm91cC5pbmNsdWRlcyhjLmdyb3VwTGFiZWwpKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgIGlmIChmaWx0ZXJzLmttUmFuZ2UubGVuZ3RoID4gMCAmJiAhZmlsdGVycy5rbVJhbmdlLmluY2x1ZGVzKGMua21SYW5nZUxhYmVsKSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICBpZiAoZmlsdGVycy5hZ2VSYW5nZS5sZW5ndGggPiAwICYmICFmaWx0ZXJzLmFnZVJhbmdlLmluY2x1ZGVzKGMuYWdlUmFuZ2VMYWJlbCkpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgfSwgW2VucmljaGVkQ29udHJhY3RzLCBzZWFyY2hUZXJtLCBmaWx0ZXJzXSk7XHJcblxyXG4gIC8vIC0tLSBDSEFSVCBBR0dSRUdBVElPTlMgLS0tXHJcbiAgY29uc3QgYW5hbHlzaXNEYXRhID0gdXNlTWVtbygoKSA9PiB7XHJcbiAgICBjb25zdCBhZ2dyZWdhdGUgPSAoZmllbGQ6IHN0cmluZywgcHJlZGVmaW5lZE9yZGVyPzogc3RyaW5nW10pOiBDaGFydEVudHJ5W10gPT4ge1xyXG4gICAgICBjb25zdCBjb3VudHM6IFJlY29yZDxzdHJpbmcsIENoYXJ0RW50cnk+ID0ge307XHJcbiAgICAgIFxyXG4gICAgICBpZiAocHJlZGVmaW5lZE9yZGVyKSB7XHJcbiAgICAgICAgICBwcmVkZWZpbmVkT3JkZXIuZm9yRWFjaChrZXkgPT4gY291bnRzW2tleV0gPSB7IG5hbWU6IGtleSwgdmFsdWU6IDAsIGZ1bGxLZXk6IGtleSB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZmlsdGVyZWRDb250cmFjdHMuZm9yRWFjaCgoYzogYW55KSA9PiB7XHJcbiAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBjW2ZpZWxkXTtcclxuICAgICAgICBjb25zdCBrZXkgPSAocmF3VmFsdWUgIT09IHVuZGVmaW5lZCAmJiByYXdWYWx1ZSAhPT0gbnVsbCkgPyBTdHJpbmcocmF3VmFsdWUpIDogJ04vQSc7XHJcbiAgICAgICAgY29uc3QgbGFiZWwgPSBmaWVsZCA9PT0gJ3JlbmV3YWxTdHJhdGVneScgPyAoUmVuZXdhbFN0cmF0ZWd5TGFiZWxba2V5IGFzIFJlbmV3YWxTdHJhdGVneV0gfHwga2V5KSA6IGtleTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoIWNvdW50c1trZXldKSBjb3VudHNba2V5XSA9IHsgbmFtZTogbGFiZWwsIHZhbHVlOiAwLCBmdWxsS2V5OiBrZXkgfTtcclxuICAgICAgICBjb3VudHNba2V5XS52YWx1ZSArPSAxO1xyXG4gICAgICAgIGlmIChmaWVsZCA9PT0gJ3JlbmV3YWxTdHJhdGVneScpIGNvdW50c1trZXldLm5hbWUgPSBsYWJlbDtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBsZXQgcmVzdWx0ID0gT2JqZWN0LnZhbHVlcyhjb3VudHMpO1xyXG4gICAgICBcclxuICAgICAgaWYgKHByZWRlZmluZWRPcmRlcikge1xyXG4gICAgICAgICAgcmVzdWx0LnNvcnQoKGEsIGIpID0+IHByZWRlZmluZWRPcmRlci5pbmRleE9mKGEuZnVsbEtleSkgLSBwcmVkZWZpbmVkT3JkZXIuaW5kZXhPZihiLmZ1bGxLZXkpKTtcclxuICAgICAgfSBlbHNlIGlmIChmaWVsZCA9PT0gJ2V4cGlyeVllYXInKSB7XHJcbiAgICAgICAgICByZXN1bHQuc29ydCgoYSwgYikgPT4gYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZXN1bHQuc29ydCgoYSwgYikgPT4gYi52YWx1ZSAtIGEudmFsdWUpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4gcmVzdWx0LmZpbHRlcihyID0+IHByZWRlZmluZWRPcmRlciA/IHIudmFsdWUgPj0gMCA6IHIudmFsdWUgPiAwKTtcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RyYXRlZ3k6IGFnZ3JlZ2F0ZSgncmVuZXdhbFN0cmF0ZWd5JyksXHJcbiAgICAgIHllYXI6IGFnZ3JlZ2F0ZSgnZXhwaXJ5WWVhcicpLFxyXG4gICAgICBncm91cDogYWdncmVnYXRlKCdncm91cExhYmVsJyksXHJcbiAgICAgIHR5cGU6IGFnZ3JlZ2F0ZSgndHlwZScpLFxyXG4gICAgICBrbTogYWdncmVnYXRlKCdrbVJhbmdlTGFiZWwnLCBLTV9PUkRFUiksXHJcbiAgICAgIGFnZTogYWdncmVnYXRlKCdhZ2VSYW5nZUxhYmVsJywgQUdFX09SREVSKVxyXG4gICAgfTtcclxuICB9LCBbZmlsdGVyZWRDb250cmFjdHNdKTtcclxuXHJcbiAgLy8gLS0tIFRBQkxFIFNVTU1BUlkgQUdHUkVHQVRJT04gLS0tXHJcbiAgY29uc3Qgc3VtbWFyeVRhYmxlRGF0YSA9IHVzZU1lbW8oKCkgPT4ge1xyXG4gICAgY29uc3QgZ3JvdXBzOiBSZWNvcmQ8c3RyaW5nLCB7IGNvdW50OiBudW1iZXI7IGZpcGU6IG51bWJlcjsgYWNxdWlzaXRpb246IG51bWJlcjsgcmVudGFsOiBudW1iZXI7IGxhYmVsOiBzdHJpbmcgfT4gPSB7fTtcclxuXHJcbiAgICAvLyBFbnN1cmUgYWxsIHN0cmF0ZWdpZXMgYXJlIHByZXNlbnQgZXZlbiBpZiAwXHJcbiAgICBPYmplY3Qua2V5cyhSZW5ld2FsU3RyYXRlZ3lMYWJlbCkuZm9yRWFjaChrZXkgPT4ge1xyXG4gICAgICAgIGdyb3Vwc1trZXldID0geyBjb3VudDogMCwgZmlwZTogMCwgYWNxdWlzaXRpb246IDAsIHJlbnRhbDogMCwgbGFiZWw6IFJlbmV3YWxTdHJhdGVneUxhYmVsW2tleSBhcyBSZW5ld2FsU3RyYXRlZ3ldIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICBmaWx0ZXJlZENvbnRyYWN0cy5mb3JFYWNoKGMgPT4ge1xyXG4gICAgICAgY29uc3Qga2V5ID0gYy5yZW5ld2FsU3RyYXRlZ3kgfHwgJ1VOREVGSU5FRCc7XHJcbiAgICAgICBpZiAoIWdyb3Vwc1trZXldKSBncm91cHNba2V5XSA9IHsgY291bnQ6IDAsIGZpcGU6IDAsIGFjcXVpc2l0aW9uOiAwLCByZW50YWw6IDAsIGxhYmVsOiBrZXkgfTtcclxuICAgICAgIFxyXG4gICAgICAgZ3JvdXBzW2tleV0uY291bnQgKz0gMTtcclxuICAgICAgIGdyb3Vwc1trZXldLmZpcGUgKz0gYy5jdXJyZW50RmlwZSB8fCAwO1xyXG4gICAgICAgZ3JvdXBzW2tleV0uYWNxdWlzaXRpb24gKz0gYy5wdXJjaGFzZVByaWNlIHx8IDA7XHJcbiAgICAgICBncm91cHNba2V5XS5yZW50YWwgKz0gYy5tb250aGx5VmFsdWUgfHwgMDtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZpbHRlciBvdXQgcm93cyB3aXRoIDAgY291bnQgdG8ga2VlcCB0YWJsZSBjbGVhbiwgb3Iga2VlcCBhbGwgaWYgZGVzaXJlZC4gXHJcbiAgICAvLyBLZWVwaW5nIGFsbCBnaXZlcyBhIGNvbXBsZXRlIHZpZXcgYXMgcGVyIHNwcmVhZHNoZWV0IHVzdWFsbHkuXHJcbiAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyhncm91cHMpLnNvcnQoKGEsIGIpID0+IGIuY291bnQgLSBhLmNvdW50KTtcclxuICB9LCBbZmlsdGVyZWRDb250cmFjdHNdKTtcclxuXHJcbiAgY29uc3QgdG90YWxzID0ge1xyXG4gICAgY291bnQ6IGZpbHRlcmVkQ29udHJhY3RzLmxlbmd0aCxcclxuICAgIHJldmVudWU6IGZpbHRlcmVkQ29udHJhY3RzLnJlZHVjZSgoYWNjLCBjKSA9PiBhY2MgKyBjLm1vbnRobHlWYWx1ZSwgMCksXHJcbiAgICBmaXBlOiBmaWx0ZXJlZENvbnRyYWN0cy5yZWR1Y2UoKGFjYywgYykgPT4gYWNjICsgYy5jdXJyZW50RmlwZSwgMCksXHJcbiAgICBhY3F1aXNpdGlvbjogZmlsdGVyZWRDb250cmFjdHMucmVkdWNlKChhY2MsIGMpID0+IGFjYyArIGMucHVyY2hhc2VQcmljZSwgMCksXHJcbiAgfTtcclxuXHJcbiAgY29uc3QgaGFzT2JzZXJ2YXRpb25zID0gZmlsdGVyZWRDb250cmFjdHMuc29tZShjID0+ICEhYy5vYnNlcnZhdGlvbik7XHJcbiAgY29uc3QgQ09MT1JTID0gWycjM0I4MkY2JywgJyMxMEI5ODEnLCAnI0Y1OUUwQicsICcjRUY0NDQ0JywgJyM4QjVDRjYnLCAnI0VDNDg5OScsICcjNjM2NkYxJywgJyMxNEI4QTYnXTtcclxuICBjb25zdCBSRVRVUk5fUEVSQ0VOVEFHRSA9IDAuODA7IC8vIDgwJVxyXG5cclxuICAvLyBIYW5kbGVyc1xyXG4gIGNvbnN0IGhhbmRsZVN0cmF0ZWd5Q2hhbmdlID0gKGlkOiBzdHJpbmcsIG5ld1N0cmF0ZWd5OiBSZW5ld2FsU3RyYXRlZ3kpID0+IHtcclxuICAgIGNvbnN0IGNvbnRyYWN0ID0gY29udHJhY3RzLmZpbmQoYyA9PiBjLmlkID09PSBpZCk7XHJcbiAgICBpZiAoY29udHJhY3QpIG9uVXBkYXRlQ29udHJhY3QoeyAuLi5jb250cmFjdCwgcmVuZXdhbFN0cmF0ZWd5OiBuZXdTdHJhdGVneSB9KTtcclxuICB9O1xyXG4gIFxyXG4gIGNvbnN0IGhhbmRsZU9wZW5PYnNlcnZhdGlvbiA9IChjb250cmFjdDogQ29udHJhY3QpID0+IHtcclxuICAgIHNldFNlbGVjdGVkQ29udHJhY3RJZChjb250cmFjdC5pZCk7XHJcbiAgICBzZXRUZW1wT2JzZXJ2YXRpb24oY29udHJhY3Qub2JzZXJ2YXRpb24gfHwgJycpO1xyXG4gICAgc2V0T2JzZXJ2YXRpb25Nb2RhbE9wZW4odHJ1ZSk7XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgaGFuZGxlU2F2ZU9ic2VydmF0aW9uID0gKCkgPT4ge1xyXG4gICAgaWYgKHNlbGVjdGVkQ29udHJhY3RJZCkge1xyXG4gICAgICAgIGNvbnN0IGNvbnRyYWN0ID0gY29udHJhY3RzLmZpbmQoYyA9PiBjLmlkID09PSBzZWxlY3RlZENvbnRyYWN0SWQpO1xyXG4gICAgICAgIGlmIChjb250cmFjdCkgb25VcGRhdGVDb250cmFjdCh7IC4uLmNvbnRyYWN0LCBvYnNlcnZhdGlvbjogdGVtcE9ic2VydmF0aW9uIH0pO1xyXG4gICAgfVxyXG4gICAgc2V0T2JzZXJ2YXRpb25Nb2RhbE9wZW4oZmFsc2UpO1xyXG4gIH07XHJcblxyXG4gIC8vIEhlbHBlciB0byBjaGVjayBpZiBhbnkgZmlsdGVycyBhcmUgYWN0aXZlXHJcbiAgY29uc3QgaGFzQWN0aXZlRmlsdGVycyA9IE9iamVjdC52YWx1ZXMoZmlsdGVycykuc29tZShhcnIgPT4gYXJyLmxlbmd0aCA+IDApO1xyXG5cclxuICByZXR1cm4gKFxyXG4gICAgPGRpdiBjbGFzc05hbWU9XCJwLTYgbWF4LXctWzE5MjBweF0gbXgtYXV0byBtaW4taC1zY3JlZW4gYmctc2xhdGUtNTBcIj5cclxuICAgICAgXHJcbiAgICAgIHsvKiBIRUFERVIgKi99XHJcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIG1iLTZcIj5cclxuICAgICAgICA8ZGl2PlxyXG4gICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtMnhsIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTgwMCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxyXG4gICAgICAgICAgICA8QmFyQ2hhcnQzIGNsYXNzTmFtZT1cInRleHQtYmx1ZS02MDBcIiAvPiBQYWluZWwgZGUgUmVub3Zhw6fDo29cclxuICAgICAgICAgIDwvaDI+XHJcbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIHRleHQtc2xhdGUtNTAwXCI+R2VzdMOjbyBlc3RyYXTDqWdpY2EgZGUgY29udHJhdG9zIGUgYXRpdm9zLjwvcD5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTRcIj5cclxuICAgICAgICAgICAge2hhc0FjdGl2ZUZpbHRlcnMgJiYgKFxyXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBcclxuICAgICAgICAgICAgICAgICAgb25DbGljaz17Y2xlYXJGaWx0ZXJzfVxyXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJweC00IHB5LTEuNSB0ZXh0LXhzIGZvbnQtYm9sZCByb3VuZGVkIGJnLXJlZC01MCB0ZXh0LXJlZC02MDAgaG92ZXI6YmctcmVkLTEwMCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiXHJcbiAgICAgICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgICAgICAgPFggc2l6ZT17MTR9IC8+IExpbXBhciBGaWx0cm9zXHJcbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgKX1cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGJnLXdoaXRlIHAtMSByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIHNoYWRvdy1zbVwiPlxyXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRWaWV3TW9kZSgnYW5hbHlzaXMnKX0gY2xhc3NOYW1lPXtgcHgtNCBweS0xLjUgdGV4dC14cyBmb250LWJvbGQgcm91bmRlZCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiAke3ZpZXdNb2RlID09PSAnYW5hbHlzaXMnID8gJ2JnLWJsdWUtNjAwIHRleHQtd2hpdGUnIDogJ3RleHQtc2xhdGUtNTAwJ31gfT5cclxuICAgICAgICAgICAgICAgICAgICA8QmFyQ2hhcnQzIHNpemU9ezE0fS8+IEdyw6FmaWNvc1xyXG4gICAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldFZpZXdNb2RlKCdsaXN0Jyl9IGNsYXNzTmFtZT17YHB4LTQgcHktMS41IHRleHQteHMgZm9udC1ib2xkIHJvdW5kZWQgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgJHt2aWV3TW9kZSA9PT0gJ2xpc3QnID8gJ2JnLWJsdWUtNjAwIHRleHQtd2hpdGUnIDogJ3RleHQtc2xhdGUtNTAwJ31gfT5cclxuICAgICAgICAgICAgICAgICAgICA8TGlzdCBzaXplPXsxNH0vPiBMaXN0YVxyXG4gICAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICA8L2Rpdj5cclxuXHJcbiAgICAgIHt2aWV3TW9kZSA9PT0gJ2FuYWx5c2lzJyAmJiAoXHJcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhbmltYXRlLWluIGZhZGUtaW4gZHVyYXRpb24tNTAwIHNwYWNlLXktNlwiPlxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB7LyogMS4gRklOQU5DSUFMIFNVTU1BUlkgS1BJIChCbHVlIENhcmRzKSAqL31cclxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMSBtZDpncmlkLWNvbHMtNCBnYXAtNFwiPlxyXG4gICAgICAgICAgICAgIHsvKiBGSVBFICovfVxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTMwMCBzaGFkb3ctc20gb3ZlcmZsb3ctaGlkZGVuXCI+XHJcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctYmx1ZS03MDAgdGV4dC13aGl0ZSB0ZXh0LWNlbnRlciBweS0xIHRleHQteHMgZm9udC1ib2xkIHVwcGVyY2FzZSB0cmFja2luZy13aWRlclwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgVmFsb3IgRklQRSBUb3RhbFxyXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwLTQgdGV4dC1jZW50ZXIgYmctYmx1ZS01MC81MFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cInRleHQtMnhsIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTgwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgUiQge3RvdGFscy5maXBlLnRvTG9jYWxlU3RyaW5nKCdwdC1CUicsIHtjb21wYWN0RGlzcGxheTogJ3Nob3J0Jywgbm90YXRpb246ICdjb21wYWN0JywgbWF4aW11bUZyYWN0aW9uRGlnaXRzOiAxfSl9XHJcbiAgICAgICAgICAgICAgICAgICAgICA8L2gzPlxyXG4gICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDAgbXQtMVwiPkJhc2UgQXR1YWwgZGUgTWVyY2FkbzwvcD5cclxuICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICAgIHsvKiBBUVVJU0nDh8ODTyAqL31cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS0zMDAgc2hhZG93LXNtIG92ZXJmbG93LWhpZGRlblwiPlxyXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLWJsdWUtNTAwIHRleHQtd2hpdGUgdGV4dC1jZW50ZXIgcHktMSB0ZXh0LXhzIGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXJcIj5cclxuICAgICAgICAgICAgICAgICAgICAgIFZhbG9yIEFxdWlzacOnw6NvXHJcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInAtNCB0ZXh0LWNlbnRlciBiZy1ibHVlLTUwLzMwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC0yeGwgZm9udC1ib2xkIHRleHQtc2xhdGUtODAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICBSJCB7dG90YWxzLmFjcXVpc2l0aW9uLnRvTG9jYWxlU3RyaW5nKCdwdC1CUicsIHtjb21wYWN0RGlzcGxheTogJ3Nob3J0Jywgbm90YXRpb246ICdjb21wYWN0JywgbWF4aW11bUZyYWN0aW9uRGlnaXRzOiAxfSl9XHJcbiAgICAgICAgICAgICAgICAgICAgICA8L2gzPlxyXG4gICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDAgbXQtMVwiPkN1c3RvIEhpc3TDs3JpY288L3A+XHJcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgICB7LyogUkVUT1JOTyBFU1RJTUFETyAqL31cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS0zMDAgc2hhZG93LXNtIG92ZXJmbG93LWhpZGRlbiByZWxhdGl2ZVwiPlxyXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLWJsdWUtNjAwIHRleHQtd2hpdGUgdGV4dC1jZW50ZXIgcHktMSB0ZXh0LXhzIGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXJcIj5cclxuICAgICAgICAgICAgICAgICAgICAgIFJldG9ybm8gRklQRSBFc3RpbWFkb1xyXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwLTQgdGV4dC1jZW50ZXIgYmctYmx1ZS01MC81MFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cInRleHQtMnhsIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTgwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgUiQgeyh0b3RhbHMuZmlwZSAqIFJFVFVSTl9QRVJDRU5UQUdFKS50b0xvY2FsZVN0cmluZygncHQtQlInLCB7Y29tcGFjdERpc3BsYXk6ICdzaG9ydCcsIG5vdGF0aW9uOiAnY29tcGFjdCcsIG1heGltdW1GcmFjdGlvbkRpZ2l0czogMX0pfVxyXG4gICAgICAgICAgICAgICAgICAgICAgPC9oMz5cclxuICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNDAwIG10LTFcIj5Qcm9qZcOnw6NvIGRlIFJldmVuZGE8L3A+XHJcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIHRvcC0xIHJpZ2h0LTEgYmcteWVsbG93LTMwMCB0ZXh0LXllbGxvdy05MDAgdGV4dC1bMTBweF0gZm9udC1ib2xkIHB4LTEuNSByb3VuZGVkXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICB7KFJFVFVSTl9QRVJDRU5UQUdFICogMTAwKS50b0ZpeGVkKDApfSVcclxuICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICAgIHsvKiBMT0NBw4fDg08gKi99XHJcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtMzAwIHNoYWRvdy1zbSBvdmVyZmxvdy1oaWRkZW5cIj5cclxuICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctYmx1ZS04MDAgdGV4dC13aGl0ZSB0ZXh0LWNlbnRlciBweS0xIHRleHQteHMgZm9udC1ib2xkIHVwcGVyY2FzZSB0cmFja2luZy13aWRlclwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgUmVjZWl0YSBNZW5zYWwgKExvY2HDp8OjbylcclxuICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicC00IHRleHQtY2VudGVyIGJnLWJsdWUtNTAvNTBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LTJ4bCBmb250LWJvbGQgdGV4dC1zbGF0ZS04MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgIFIkIHt0b3RhbHMucmV2ZW51ZS50b0xvY2FsZVN0cmluZygncHQtQlInLCB7Y29tcGFjdERpc3BsYXk6ICdzaG9ydCcsIG5vdGF0aW9uOiAnY29tcGFjdCcsIG1heGltdW1GcmFjdGlvbkRpZ2l0czogMX0pfVxyXG4gICAgICAgICAgICAgICAgICAgICAgPC9oMz5cclxuICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNDAwIG10LTFcIj5GYXR1cmFtZW50byBBdHVhbDwvcD5cclxuICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICB7LyogMi4gQ0hBUlRTIEdSSUQgKi99XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgbWQ6Z3JpZC1jb2xzLTIgbGc6Z3JpZC1jb2xzLTMgZ2FwLTZcIj5cclxuICAgICAgICAgICAgey8qIFN0cmF0ZWd5ICovfVxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIHNoYWRvdy1zbVwiPlxyXG4gICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwidGV4dC14cyBmb250LWJvbGQgdGV4dC1zbGF0ZS01MDAgbWItMiBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZVwiPjxMYXllcnMgc2l6ZT17MTR9Lz4gRXN0cmF0w6lnaWEgZGUgUmVub3Zhw6fDo288L2g0PlxyXG4gICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtNTZcIj5cclxuICAgICAgICAgICAgICAgICA8UmVzcG9uc2l2ZUNvbnRhaW5lciB3aWR0aD1cIjEwMCVcIiBoZWlnaHQ9XCIxMDAlXCI+XHJcbiAgICAgICAgICAgICAgICAgICA8QmFyQ2hhcnQgZGF0YT17YW5hbHlzaXNEYXRhLnN0cmF0ZWd5fSBsYXlvdXQ9XCJ2ZXJ0aWNhbFwiIG1hcmdpbj17e2xlZnQ6IDAsIHJpZ2h0OiAzMH19PlxyXG4gICAgICAgICAgICAgICAgICAgICA8Q2FydGVzaWFuR3JpZCBzdHJva2VEYXNoYXJyYXk9XCIzIDNcIiBob3Jpem9udGFsPXtmYWxzZX0gLz5cclxuICAgICAgICAgICAgICAgICAgICAgPFhBeGlzIHR5cGU9XCJudW1iZXJcIiBoaWRlIC8+XHJcbiAgICAgICAgICAgICAgICAgICAgIDxZQXhpcyBkYXRhS2V5PVwibmFtZVwiIHR5cGU9XCJjYXRlZ29yeVwiIHdpZHRoPXsxNDB9IHRpY2s9e3tmb250U2l6ZTogOSwgZm9udFdlaWdodDogNjAwfX0gaW50ZXJ2YWw9ezB9IC8+XHJcbiAgICAgICAgICAgICAgICAgICAgIDxUb29sdGlwIGN1cnNvcj17e2ZpbGw6ICcjZjFmNWY5J319IGNvbnRlbnRTdHlsZT17e2ZvbnRTaXplOiAnMTJweCd9fSAvPlxyXG4gICAgICAgICAgICAgICAgICAgICA8QmFyIGRhdGFLZXk9XCJ2YWx1ZVwiIHJhZGl1cz17WzAsIDQsIDQsIDBdfSBiYXJTaXplPXsyMH0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHthbmFseXNpc0RhdGEuc3RyYXRlZ3kubWFwKChlbnRyeSwgaW5kZXgpID0+IChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgPENlbGwga2V5PXtpbmRleH0gZmlsbD17Q09MT1JTW2luZGV4ICUgQ09MT1JTLmxlbmd0aF19IGN1cnNvcj1cInBvaW50ZXJcIiBvbkNsaWNrPXsoKSA9PiB0b2dnbGVGaWx0ZXIoJ3N0cmF0ZWd5JywgZW50cnkuZnVsbEtleSl9IG9wYWNpdHk9e2ZpbHRlcnMuc3RyYXRlZ3kubGVuZ3RoICYmICFmaWx0ZXJzLnN0cmF0ZWd5LmluY2x1ZGVzKGVudHJ5LmZ1bGxLZXkpID8gMC4zIDogMX0gLz5cclxuICAgICAgICAgICAgICAgICAgICAgICAgKSl9XHJcbiAgICAgICAgICAgICAgICAgICAgIDwvQmFyPlxyXG4gICAgICAgICAgICAgICAgICAgPC9CYXJDaGFydD5cclxuICAgICAgICAgICAgICAgICA8L1Jlc3BvbnNpdmVDb250YWluZXI+XHJcbiAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgIHsvKiBZZWFyICovfVxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIHNoYWRvdy1zbVwiPlxyXG4gICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwidGV4dC14cyBmb250LWJvbGQgdGV4dC1zbGF0ZS01MDAgbWItMiBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZVwiPjxDYWxlbmRhciBzaXplPXsxNH0vPiBWZW5jaW1lbnRvcyAoQW5vKTwvaDQ+XHJcbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC01NlwiPlxyXG4gICAgICAgICAgICAgICAgIDxSZXNwb25zaXZlQ29udGFpbmVyIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIj5cclxuICAgICAgICAgICAgICAgICAgIDxCYXJDaGFydCBkYXRhPXthbmFseXNpc0RhdGEueWVhcn0+XHJcbiAgICAgICAgICAgICAgICAgICAgIDxDYXJ0ZXNpYW5HcmlkIHN0cm9rZURhc2hhcnJheT1cIjMgM1wiIHZlcnRpY2FsPXtmYWxzZX0gLz5cclxuICAgICAgICAgICAgICAgICAgICAgPFhBeGlzIGRhdGFLZXk9XCJuYW1lXCIgdGljaz17e2ZvbnRTaXplOiAxMH19IGF4aXNMaW5lPXtmYWxzZX0gdGlja0xpbmU9e2ZhbHNlfSAvPlxyXG4gICAgICAgICAgICAgICAgICAgICA8WUF4aXMgaGlkZSAvPlxyXG4gICAgICAgICAgICAgICAgICAgICA8VG9vbHRpcCBjdXJzb3I9e3tmaWxsOiAnI2YxZjVmOSd9fSBjb250ZW50U3R5bGU9e3tmb250U2l6ZTogJzEycHgnfX0gLz5cclxuICAgICAgICAgICAgICAgICAgICAgPEJhciBkYXRhS2V5PVwidmFsdWVcIiBmaWxsPVwiIzNCODJGNlwiIHJhZGl1cz17WzQsIDQsIDAsIDBdfSBiYXJTaXplPXszMn0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAge2FuYWx5c2lzRGF0YS55ZWFyLm1hcCgoZW50cnksIGluZGV4KSA9PiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPENlbGwga2V5PXtpbmRleH0gZmlsbD17ZmlsdGVycy55ZWFyLmluY2x1ZGVzKGVudHJ5LmZ1bGxLZXkpID8gJyMxZTQwYWYnIDogJyMzQjgyRjYnfSBjdXJzb3I9XCJwb2ludGVyXCIgb25DbGljaz17KCkgPT4gdG9nZ2xlRmlsdGVyKCd5ZWFyJywgZW50cnkuZnVsbEtleSl9IC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgKSl9XHJcbiAgICAgICAgICAgICAgICAgICAgIDwvQmFyPlxyXG4gICAgICAgICAgICAgICAgICAgPC9CYXJDaGFydD5cclxuICAgICAgICAgICAgICAgICA8L1Jlc3BvbnNpdmVDb250YWluZXI+XHJcbiAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgICB7LyogVHlwZSAqL31cclxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgc2hhZG93LXNtXCI+XHJcbiAgICAgICAgICAgICAgIDxoNCBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTUwMCBtYi0yIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHVwcGVyY2FzZSB0cmFja2luZy13aWRlXCI+PEJyaWVmY2FzZSBzaXplPXsxNH0vPiBUaXBvIGRlIENvbnRyYXRvPC9oND5cclxuICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTU2XCI+XHJcbiAgICAgICAgICAgICAgICAgPFJlc3BvbnNpdmVDb250YWluZXIgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMTAwJVwiPlxyXG4gICAgICAgICAgICAgICAgICAgPFBpZUNoYXJ0PlxyXG4gICAgICAgICAgICAgICAgICAgICA8UGllIGRhdGE9e2FuYWx5c2lzRGF0YS50eXBlfSBkYXRhS2V5PVwidmFsdWVcIiBjeD1cIjUwJVwiIGN5PVwiNTAlXCIgaW5uZXJSYWRpdXM9ezQwfSBvdXRlclJhZGl1cz17NjV9IHBhZGRpbmdBbmdsZT17Mn0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHthbmFseXNpc0RhdGEudHlwZS5tYXAoKGVudHJ5LCBpbmRleCkgPT4gKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICA8Q2VsbCBrZXk9e2luZGV4fSBmaWxsPXtDT0xPUlNbKGluZGV4ICsgMykgJSBDT0xPUlMubGVuZ3RoXX0gY3Vyc29yPVwicG9pbnRlclwiIG9uQ2xpY2s9eygpID0+IHRvZ2dsZUZpbHRlcigndHlwZScsIGVudHJ5LmZ1bGxLZXkpfSBvcGFjaXR5PXtmaWx0ZXJzLnR5cGUubGVuZ3RoICYmICFmaWx0ZXJzLnR5cGUuaW5jbHVkZXMoZW50cnkuZnVsbEtleSkgPyAwLjMgOiAxfSAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICApKX1cclxuICAgICAgICAgICAgICAgICAgICAgPC9QaWU+XHJcbiAgICAgICAgICAgICAgICAgICAgIDxUb29sdGlwIGNvbnRlbnRTdHlsZT17e2ZvbnRTaXplOiAnMTJweCd9fSAvPlxyXG4gICAgICAgICAgICAgICAgICAgICA8TGVnZW5kIHZlcnRpY2FsQWxpZ249XCJtaWRkbGVcIiBhbGlnbj1cInJpZ2h0XCIgbGF5b3V0PVwidmVydGljYWxcIiBpY29uVHlwZT1cImNpcmNsZVwiIHdyYXBwZXJTdHlsZT17e2ZvbnRTaXplOiAnMTBweCd9fSAvPlxyXG4gICAgICAgICAgICAgICAgICAgPC9QaWVDaGFydD5cclxuICAgICAgICAgICAgICAgICA8L1Jlc3BvbnNpdmVDb250YWluZXI+XHJcbiAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgIHsvKiBNb2RlbG8gcG9yIE1vbnRhZG9yYSAoc2Nyb2xsYWJsZSwgY29sYXBzw6F2ZWwpICovfVxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIHNoYWRvdy1zbVwiPlxyXG4gICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwidGV4dC14cyBmb250LWJvbGQgdGV4dC1zbGF0ZS01MDAgbWItMiBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZVwiPjxUcnVjayBzaXplPXsxNH0vPiBNb2RlbG9zIChwb3IgTW9udGFkb3JhKTwvaDQ+XHJcbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWF4LWgtNTYgb3ZlcmZsb3cteS1hdXRvIHByLTIgc3BhY2UteS0yXCI+XHJcbiAgICAgICAgICAgICAgICAgey8qKiBCdWlsZCBtb2RlbHMgZ3JvdXBlZCBieSBtb250YWRvcmEgYW5kIHJlbmRlciBjb2xsYXBzaWJsZSBzZWN0aW9ucyB3aXRoIHNtYWxsIGJhciBjaGFydHMgKi99XHJcbiAgICAgICAgICAgICAgICAge09iamVjdC5lbnRyaWVzKFxyXG4gICAgICAgICAgICAgICAgICAgKCgpOiBSZWNvcmQ8c3RyaW5nLCB7IG5hbWU6IHN0cmluZzsgdmFsdWU6IG51bWJlcjsgZnVsbEtleTogc3RyaW5nIH1bXT4gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXA6IFJlY29yZDxzdHJpbmcsIFJlY29yZDxzdHJpbmcsIG51bWJlcj4+ID0ge307XHJcbiAgICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkQ29udHJhY3RzLmZvckVhY2goKGM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vbnQgPSAoYy5tb250YWRvcmEgJiYgYy5tb250YWRvcmEgIT09ICdOL0EnKSA/IFN0cmluZyhjLm1vbnRhZG9yYSkgOiAnU2VtIE1vbnRhZG9yYSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kID0gKGMubW9kZWxvICYmIGMubW9kZWxvICE9PSAnTi9BJykgPyBTdHJpbmcoYy5tb2RlbG8pIDogKGMubW9kZWwgJiYgYy5tb2RlbCAhPT0gJ04vQScgPyBTdHJpbmcoYy5tb2RlbCkgOiAnU2VtIE1vZGVsbycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIG1hcFttb250XSA9IG1hcFttb250XSB8fCB7fTtcclxuICAgICAgICAgICAgICAgICAgICAgICBtYXBbbW9udF1bbW9kXSA9IChtYXBbbW9udF1bbW9kXSB8fCAwKSArIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICBjb25zdCBvdXQ6IFJlY29yZDxzdHJpbmcsIHsgbmFtZTogc3RyaW5nOyB2YWx1ZTogbnVtYmVyOyBmdWxsS2V5OiBzdHJpbmcgfVtdPiA9IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyhtYXApLmZvckVhY2goKFttb250LCBtb2RlbHNdKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgb3V0W21vbnRdID0gT2JqZWN0LmVudHJpZXMobW9kZWxzKS5tYXAoKFtuYW1lLCB2YWx1ZV0pID0+ICh7IG5hbWUsIHZhbHVlLCBmdWxsS2V5OiBgJHttb250fV9fJHtuYW1lfWAgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIG91dFttb250XS5zb3J0KChhLCBiKSA9PiBiLnZhbHVlIC0gYS52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3V0O1xyXG4gICAgICAgICAgICAgICAgICAgfSkoKVxyXG4gICAgICAgICAgICAgICAgICkubWFwKChbbW9udGFkb3JhLCBtb2RlbHNdKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICAgICAgICAgICA8TW9udGFkb3JhU2VjdGlvbiBrZXk9e21vbnRhZG9yYX0gbW9udGFkb3JhPXttb250YWRvcmF9IG1vZGVscz17bW9kZWxzfSAvPlxyXG4gICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICB9KX1cclxuICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgIHsvKiBLTSAqL31cclxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgc2hhZG93LXNtXCI+XHJcbiAgICAgICAgICAgICAgIDxoNCBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTUwMCBtYi0yIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHVwcGVyY2FzZSB0cmFja2luZy13aWRlXCI+PEFjdGl2aXR5IHNpemU9ezE0fS8+IERpc3RyaWJ1acOnw6NvIEtNPC9oND5cclxuICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTU2XCI+XHJcbiAgICAgICAgICAgICAgICAgPFJlc3BvbnNpdmVDb250YWluZXIgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMTAwJVwiPlxyXG4gICAgICAgICAgICAgICAgICAgPEJhckNoYXJ0IGRhdGE9e2FuYWx5c2lzRGF0YS5rbX0gbWFyZ2luPXt7dG9wOiAxMCwgcmlnaHQ6IDAsIGxlZnQ6IC0yMCwgYm90dG9tOiAwfX0+XHJcbiAgICAgICAgICAgICAgICAgICAgIDxDYXJ0ZXNpYW5HcmlkIHN0cm9rZURhc2hhcnJheT1cIjMgM1wiIHZlcnRpY2FsPXtmYWxzZX0gLz5cclxuICAgICAgICAgICAgICAgICAgICAgPFhBeGlzIGRhdGFLZXk9XCJuYW1lXCIgdGljaz17e2ZvbnRTaXplOiA5fX0gaW50ZXJ2YWw9ezB9IGFuZ2xlPXstNDV9IHRleHRBbmNob3I9XCJlbmRcIiBoZWlnaHQ9ezUwfSBheGlzTGluZT17ZmFsc2V9IHRpY2tMaW5lPXtmYWxzZX0gLz5cclxuICAgICAgICAgICAgICAgICAgICAgPFlBeGlzIHRpY2s9e3tmb250U2l6ZTogMTB9fSBheGlzTGluZT17ZmFsc2V9IHRpY2tMaW5lPXtmYWxzZX0gLz5cclxuICAgICAgICAgICAgICAgICAgICAgPFRvb2x0aXAgY3Vyc29yPXt7ZmlsbDogJyNmMWY1ZjknfX0gY29udGVudFN0eWxlPXt7Zm9udFNpemU6ICcxMnB4J319IC8+XHJcbiAgICAgICAgICAgICAgICAgICAgIDxCYXIgZGF0YUtleT1cInZhbHVlXCIgZmlsbD1cIiNGNTlFMEJcIiByYWRpdXM9e1s0LCA0LCAwLCAwXX0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHthbmFseXNpc0RhdGEua20ubWFwKChlbnRyeSwgaW5kZXgpID0+IChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgPENlbGwga2V5PXtpbmRleH0gZmlsbD17ZmlsdGVycy5rbVJhbmdlLmluY2x1ZGVzKGVudHJ5LmZ1bGxLZXkpID8gJyNiNDUzMDknIDogJyNGNTlFMEInfSBjdXJzb3I9XCJwb2ludGVyXCIgb25DbGljaz17KCkgPT4gdG9nZ2xlRmlsdGVyKCdrbVJhbmdlJywgZW50cnkuZnVsbEtleSl9IC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICkpfVxyXG4gICAgICAgICAgICAgICAgICAgICA8L0Jhcj5cclxuICAgICAgICAgICAgICAgICAgIDwvQmFyQ2hhcnQ+XHJcbiAgICAgICAgICAgICAgICAgPC9SZXNwb25zaXZlQ29udGFpbmVyPlxyXG4gICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICAgey8qIEFnZSAqL31cclxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgc2hhZG93LXNtXCI+XHJcbiAgICAgICAgICAgICAgIDxoNCBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTUwMCBtYi0yIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHVwcGVyY2FzZSB0cmFja2luZy13aWRlXCI+PENsb2NrIHNpemU9ezE0fS8+IElkYWRlIGRhIEZyb3RhPC9oND5cclxuICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTU2XCI+XHJcbiAgICAgICAgICAgICAgICAgPFJlc3BvbnNpdmVDb250YWluZXIgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMTAwJVwiPlxyXG4gICAgICAgICAgICAgICAgICAgPEJhckNoYXJ0IGRhdGE9e2FuYWx5c2lzRGF0YS5hZ2V9PlxyXG4gICAgICAgICAgICAgICAgICAgICA8Q2FydGVzaWFuR3JpZCBzdHJva2VEYXNoYXJyYXk9XCIzIDNcIiB2ZXJ0aWNhbD17ZmFsc2V9IC8+XHJcbiAgICAgICAgICAgICAgICAgICAgIDxYQXhpcyBkYXRhS2V5PVwibmFtZVwiIHRpY2s9e3tmb250U2l6ZTogMTB9fSBheGlzTGluZT17ZmFsc2V9IHRpY2tMaW5lPXtmYWxzZX0gLz5cclxuICAgICAgICAgICAgICAgICAgICAgPFlBeGlzIGhpZGUgLz5cclxuICAgICAgICAgICAgICAgICAgICAgPFRvb2x0aXAgY3Vyc29yPXt7ZmlsbDogJyNmMWY1ZjknfX0gY29udGVudFN0eWxlPXt7Zm9udFNpemU6ICcxMnB4J319IC8+XHJcbiAgICAgICAgICAgICAgICAgICAgIDxCYXIgZGF0YUtleT1cInZhbHVlXCIgZmlsbD1cIiM2MzY2RjFcIiByYWRpdXM9e1s0LCA0LCAwLCAwXX0gYmFyU2l6ZT17MzJ9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7YW5hbHlzaXNEYXRhLmFnZS5tYXAoKGVudHJ5LCBpbmRleCkgPT4gKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICA8Q2VsbCBrZXk9e2luZGV4fSBmaWxsPXtmaWx0ZXJzLmFnZVJhbmdlLmluY2x1ZGVzKGVudHJ5LmZ1bGxLZXkpID8gJyM0MzM4Y2EnIDogJyM2MzY2RjEnfSBjdXJzb3I9XCJwb2ludGVyXCIgb25DbGljaz17KCkgPT4gdG9nZ2xlRmlsdGVyKCdhZ2VSYW5nZScsIGVudHJ5LmZ1bGxLZXkpfSAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICApKX1cclxuICAgICAgICAgICAgICAgICAgICAgPC9CYXI+XHJcbiAgICAgICAgICAgICAgICAgICA8L0JhckNoYXJ0PlxyXG4gICAgICAgICAgICAgICAgIDwvUmVzcG9uc2l2ZUNvbnRhaW5lcj5cclxuICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgey8qIDMuIFNVTU1BUlkgVEFCTEUgKFBJVk9UKSAqL31cclxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTMwMCBzaGFkb3ctc20gb3ZlcmZsb3ctaGlkZGVuXCI+XHJcbiAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTEwMCBweC02IHB5LTMgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTMwMCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxyXG4gICAgICAgICAgICAgICAgPFRhYmxlMiBzaXplPXsxNn0gY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS01MDBcIi8+XHJcbiAgICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJvbGQgdGV4dC1zbGF0ZS03MDAgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVcIj5SZXN1bW8gcG9yIEVzdHJhdMOpZ2lhIChGaW5hbmNlaXJvKTwvaDQ+XHJcbiAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwib3ZlcmZsb3cteC1hdXRvXCI+XHJcbiAgICAgICAgICAgICAgICA8dGFibGUgY2xhc3NOYW1lPVwidy1mdWxsIHRleHQtc20gdGV4dC1sZWZ0XCI+XHJcbiAgICAgICAgICAgICAgICAgICA8dGhlYWQgY2xhc3NOYW1lPVwiYmctd2hpdGUgdGV4dC1zbGF0ZS02MDAgZm9udC1ib2xkIGJvcmRlci1iIGJvcmRlci1zbGF0ZS0yMDAgdGV4dC14cyB1cHBlcmNhc2VcIj5cclxuICAgICAgICAgICAgICAgICAgICAgIDx0cj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJweC02IHB5LTNcIj5Sw7N0dWxvcyBkZSBMaW5oYSAoRXN0cmF0w6lnaWEpPC90aD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJweC02IHB5LTMgdGV4dC1jZW50ZXJcIj5RVDwvdGg+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwicHgtNiBweS0zIHRleHQtcmlnaHRcIj5WYWxvciBGaXBlPC90aD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJweC02IHB5LTMgdGV4dC1yaWdodFwiPlZhbG9yIEFxdWlzacOnw6NvPC90aD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJweC02IHB5LTMgdGV4dC1yaWdodFwiPlZhbG9yIGRlIExvY2HDp8OjbzwvdGg+XHJcbiAgICAgICAgICAgICAgICAgICAgICA8L3RyPlxyXG4gICAgICAgICAgICAgICAgICAgPC90aGVhZD5cclxuICAgICAgICAgICAgICAgICAgIDx0Ym9keSBjbGFzc05hbWU9XCJkaXZpZGUteSBkaXZpZGUtc2xhdGUtMTAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICB7c3VtbWFyeVRhYmxlRGF0YS5tYXAoKHJvdykgPT4gKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgPHRyIGtleT17cm93LmxhYmVsfSBjbGFzc05hbWU9XCJob3ZlcjpiZy1zbGF0ZS01MFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB4LTYgcHktMyBmb250LW1lZGl1bSB0ZXh0LXNsYXRlLTgwMFwiPntyb3cubGFiZWx9PC90ZD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJweC02IHB5LTMgdGV4dC1jZW50ZXIgZm9udC1ib2xkXCI+e3Jvdy5jb3VudH08L3RkPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB4LTYgcHktMyB0ZXh0LXJpZ2h0IGZvbnQtbW9ubyB0ZXh0LXNsYXRlLTYwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUiQge3Jvdy5maXBlLnRvTG9jYWxlU3RyaW5nKCdwdC1CUicsIHttaW5pbXVtRnJhY3Rpb25EaWdpdHM6IDAsIG1heGltdW1GcmFjdGlvbkRpZ2l0czogMH0pfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJweC02IHB5LTMgdGV4dC1yaWdodCBmb250LW1vbm8gdGV4dC1zbGF0ZS02MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFIkIHtyb3cuYWNxdWlzaXRpb24udG9Mb2NhbGVTdHJpbmcoJ3B0LUJSJywge21pbmltdW1GcmFjdGlvbkRpZ2l0czogMCwgbWF4aW11bUZyYWN0aW9uRGlnaXRzOiAwfSl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3RkPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB4LTYgcHktMyB0ZXh0LXJpZ2h0IGZvbnQtbW9ubyB0ZXh0LWJsdWUtNzAwIGZvbnQtYm9sZFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUiQge3Jvdy5yZW50YWwudG9Mb2NhbGVTdHJpbmcoJ3B0LUJSJywge21pbmltdW1GcmFjdGlvbkRpZ2l0czogMCwgbWF4aW11bUZyYWN0aW9uRGlnaXRzOiAwfSl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3RkPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgPC90cj5cclxuICAgICAgICAgICAgICAgICAgICAgICkpfVxyXG4gICAgICAgICAgICAgICAgICAgICAgey8qIFRvdGFsIFJvdyAqL31cclxuICAgICAgICAgICAgICAgICAgICAgIDx0ciBjbGFzc05hbWU9XCJiZy1zbGF0ZS0xMDAgZm9udC1ib2xkIGJvcmRlci10LTIgYm9yZGVyLXNsYXRlLTMwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB4LTYgcHktMyB1cHBlcmNhc2UgdGV4dC1zbGF0ZS03MDBcIj5Ub3RhbCBHZXJhbDwvdGQ+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicHgtNiBweS0zIHRleHQtY2VudGVyIHRleHQtc2xhdGUtODAwXCI+e3RvdGFscy5jb3VudH08L3RkPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB4LTYgcHktMyB0ZXh0LXJpZ2h0IHRleHQtc2xhdGUtODAwXCI+UiQge3RvdGFscy5maXBlLnRvTG9jYWxlU3RyaW5nKCdwdC1CUicsIHttaW5pbXVtRnJhY3Rpb25EaWdpdHM6IDAsIG1heGltdW1GcmFjdGlvbkRpZ2l0czogMH0pfTwvdGQ+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicHgtNiBweS0zIHRleHQtcmlnaHQgdGV4dC1zbGF0ZS04MDBcIj5SJCB7dG90YWxzLmFjcXVpc2l0aW9uLnRvTG9jYWxlU3RyaW5nKCdwdC1CUicsIHttaW5pbXVtRnJhY3Rpb25EaWdpdHM6IDAsIG1heGltdW1GcmFjdGlvbkRpZ2l0czogMH0pfTwvdGQ+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicHgtNiBweS0zIHRleHQtcmlnaHQgdGV4dC1ibHVlLTgwMFwiPlIkIHt0b3RhbHMucmV2ZW51ZS50b0xvY2FsZVN0cmluZygncHQtQlInLCB7bWluaW11bUZyYWN0aW9uRGlnaXRzOiAwLCBtYXhpbXVtRnJhY3Rpb25EaWdpdHM6IDB9KX08L3RkPlxyXG4gICAgICAgICAgICAgICAgICAgICAgPC90cj5cclxuICAgICAgICAgICAgICAgICAgIDwvdGJvZHk+XHJcbiAgICAgICAgICAgICAgICA8L3RhYmxlPlxyXG4gICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICl9XHJcblxyXG4gICAgICB7dmlld01vZGUgPT09ICdsaXN0JyAmJiAoXHJcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLXhsIHNoYWRvdy1zbSBib3JkZXIgYm9yZGVyLXNsYXRlLTIwMCBvdmVyZmxvdy1oaWRkZW4gYW5pbWF0ZS1pbiBmYWRlLWluIGR1cmF0aW9uLTMwMFwiPlxyXG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicC00IGJvcmRlci1iIGJvcmRlci1zbGF0ZS0yMDAgZmxleCBnYXAtNCBiZy1zbGF0ZS01MFwiPlxyXG4gICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJlbGF0aXZlIHctOTZcIj5cclxuICAgICAgICAgICAgICAgIDxTZWFyY2ggY2xhc3NOYW1lPVwiYWJzb2x1dGUgbGVmdC0zIHRvcC0yLjUgdGV4dC1zbGF0ZS00MDBcIiBzaXplPXsyMH0gLz5cclxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIHBsYWNlaG9sZGVyPVwiQnVzY2FyIGNvbnRyYXRvLi4uXCIgdmFsdWU9e3NlYXJjaFRlcm19IG9uQ2hhbmdlPXsoZSkgPT4gc2V0U2VhcmNoVGVybShlLnRhcmdldC52YWx1ZSl9IGNsYXNzTmFtZT1cInctZnVsbCBwbC0xMCBwci00IHB5LTIgYm9yZGVyIGJvcmRlci1zbGF0ZS0zMDAgcm91bmRlZC1sZyBmb2N1czpyaW5nLTIgZm9jdXM6cmluZy1ibHVlLTUwMCBvdXRsaW5lLW5vbmVcIiAvPlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIGZsZXgganVzdGlmeS1lbmQgaXRlbXMtY2VudGVyIHRleHQteHMgdGV4dC1zbGF0ZS01MDBcIj5cclxuICAgICAgICAgICAgICAgICA8c3Bhbj57ZmlsdGVyZWRDb250cmFjdHMubGVuZ3RofSBjb250cmF0b3MgZW5jb250cmFkb3MuPC9zcGFuPlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwib3ZlcmZsb3cteC1hdXRvIG1pbi1oLVs0MDBweF1cIj5cclxuICAgICAgICAgICAgICA8dGFibGUgY2xhc3NOYW1lPVwidy1mdWxsIHRleHQtc20gdGV4dC1sZWZ0XCI+XHJcbiAgICAgICAgICAgICAgICAgPHRoZWFkIGNsYXNzTmFtZT1cImJnLXdoaXRlIHRleHQtc2xhdGUtNTAwIGZvbnQtc2VtaWJvbGQgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTIwMCB0ZXh0LXhzIHVwcGVyY2FzZSB0cmFja2luZy13aWRlclwiPlxyXG4gICAgICAgICAgICAgICAgICAgIDx0cj5cclxuICAgICAgICAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwicHgtNCBweS00XCI+Q29udHJhdG88L3RoPlxyXG4gICAgICAgICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJweC00IHB5LTRcIj5WZcOtY3VsbzwvdGg+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInB4LTQgcHktNFwiPk1vbnRhZG9yYTwvdGg+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInB4LTQgcHktNFwiPk1vZGVsbzwvdGg+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInB4LTQgcHktNFwiPkNhdGVnb3JpYTwvdGg+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInB4LTQgcHktNCB0ZXh0LWNlbnRlclwiPlBlcsOtb2RvPC90aD5cclxuICAgICAgICAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwicHgtNCBweS00IHRleHQtY2VudGVyXCI+U3RhdHVzPC90aD5cclxuICAgICAgICAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwicHgtNCBweS00IHRleHQtY2VudGVyXCI+SWRhZGUvS208L3RoPlxyXG4gICAgICAgICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJweC00IHB5LTQgdGV4dC1yaWdodFwiPkZJUEU8L3RoPlxyXG4gICAgICAgICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJweC00IHB5LTQgdGV4dC1yaWdodFwiPlZhbG9yZXM8L3RoPlxyXG4gICAgICAgICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJweC00IHB5LTQgdGV4dC1jZW50ZXJcIj5Fc3RyYXTDqWdpYTwvdGg+XHJcbiAgICAgICAgICAgICAgICAgICAgICAge2hhc09ic2VydmF0aW9ucyAmJiA8dGggY2xhc3NOYW1lPVwicHgtNCBweS00XCI+T2JzLjwvdGg+fVxyXG4gICAgICAgICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJweC00IHB5LTQgdGV4dC1jZW50ZXJcIj5Bw6fDtWVzPC90aD5cclxuICAgICAgICAgICAgICAgICAgICA8L3RyPlxyXG4gICAgICAgICAgICAgICAgIDwvdGhlYWQ+XHJcbiAgICAgICAgICAgICAgICAgPHRib2R5IGNsYXNzTmFtZT1cImRpdmlkZS15IGRpdmlkZS1zbGF0ZS0xMDBcIj5cclxuICAgICAgICAgICAgICAgICAgICB7ZmlsdGVyZWRDb250cmFjdHMubWFwKChjb250cmFjdDogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybWF0RGF0ZSA9IChkYXRlU3RyPzogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGVTdHIpIHJldHVybiAnLSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoZGF0ZVN0cikudG9Mb2NhbGVEYXRlU3RyaW5nKCdwdC1CUicsIHsgZGF5OiAnMi1kaWdpdCcsIG1vbnRoOiAnMi1kaWdpdCcsIHllYXI6ICdudW1lcmljJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJy0nO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgICAgICAgICAgICA8dHIga2V5PXtjb250cmFjdC5pZH0gY2xhc3NOYW1lPVwiaG92ZXI6YmctYmx1ZS01MC8zMCB0cmFuc2l0aW9uLWNvbG9yc1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJweC00IHB5LTRcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsvKiBNb3N0cmFyIG5vIHBhZHLDo286IENvbWVyY2lhbCB8IENvbnRyYXRvIChyZW1vdmVyIE4vQSkgKi99XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSBbXSBhcyBzdHJpbmdbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyYWN0LmNvbW1lcmNpYWxDb250cmFjdCAmJiBjb250cmFjdC5jb21tZXJjaWFsQ29udHJhY3QgIT09ICdOL0EnKSBwYXJ0cy5wdXNoKGNvbnRyYWN0LmNvbW1lcmNpYWxDb250cmFjdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250cmFjdC5jb250cmFjdE51bWJlciAmJiBjb250cmFjdC5jb250cmFjdE51bWJlciAhPT0gJ04vQScpIHBhcnRzLnB1c2goY29udHJhY3QuY29udHJhY3ROdW1iZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBwYXJ0cy5sZW5ndGggPiAwID8gcGFydHMuam9pbignIHwgJykgOiAnLSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1zbGF0ZS03MDAgZm9udC1ib2xkXCI+e2hlYWRlcn08L2Rpdj47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSgpfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtc2xhdGUtNTAwIG10LTAuNVwiPntjb250cmFjdC5jbGllbnROYW1lICYmIGNvbnRyYWN0LmNsaWVudE5hbWUgIT09ICdOL0EnID8gY29udHJhY3QuY2xpZW50TmFtZSA6ICcnfTwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDwvdGQ+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB4LTQgcHktNFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsvKiBNb3N0cmFyIHNvbWVudGUgYSBwbGFjYTogcHJpb3JpemEgcGxhdGUsIHNlIHZhemlvIHV0aWxpemEgbWFpblBsYXRlLCBjYXNvIGNvbnRyw6FyaW8gJy0nICovfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcCA9IChjb250cmFjdC5wbGF0ZSAmJiBjb250cmFjdC5wbGF0ZSAhPT0gJ04vQScpID8gY29udHJhY3QucGxhdGUgOiAoY29udHJhY3QubWFpblBsYXRlICYmIGNvbnRyYWN0Lm1haW5QbGF0ZSAhPT0gJ04vQScgPyBjb250cmFjdC5tYWluUGxhdGUgOiAnLScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtc2xhdGUtODAwIHRleHQteHNcIj57cH08L2Rpdj47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkoKX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1zbGF0ZS01MDBcIj57Y29udHJhY3QubW9kZWwgJiYgY29udHJhY3QubW9kZWwgIT09ICdOL0EnID8gY29udHJhY3QubW9kZWwgOiAnJ308L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L3RkPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJweC00IHB5LTRcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LXNsYXRlLTcwMFwiPntjb250cmFjdC5tb250YWRvcmEgJiYgY29udHJhY3QubW9udGFkb3JhICE9PSAnTi9BJyA/IGNvbnRyYWN0Lm1vbnRhZG9yYSA6ICctJ308L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L3RkPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJweC00IHB5LTRcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LXNsYXRlLTcwMFwiPntjb250cmFjdC5tb2RlbG8gJiYgY29udHJhY3QubW9kZWxvICE9PSAnTi9BJyA/IGNvbnRyYWN0Lm1vZGVsbyA6IChjb250cmFjdC5tb2RlbCAmJiBjb250cmFjdC5tb2RlbCAhPT0gJ04vQScgPyBjb250cmFjdC5tb2RlbCA6ICctJyl9PC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicHgtNCBweS00XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1zbGF0ZS03MDBcIj57Y29udHJhY3QuY2F0ZWdvcmlhICYmIGNvbnRyYWN0LmNhdGVnb3JpYSAhPT0gJ04vQScgPyBjb250cmFjdC5jYXRlZ29yaWEgOiAnLSd9PC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicHgtNCBweS00IHRleHQtY2VudGVyXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNTAwXCI+SW7DrWNpbzoge2Zvcm1hdERhdGUoY29udHJhY3QuaW5pdGlhbERhdGUpfTwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTUwMFwiPkZpbToge2Zvcm1hdERhdGUoY29udHJhY3QuZmluYWxEYXRlKX08L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtjb250cmFjdC5wZXJpb2RNb250aHMgJiYgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LWJsdWUtNjAwIG10LTAuNVwiPntjb250cmFjdC5wZXJpb2RNb250aHN9IG1lc2VzPC9kaXY+fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDwvdGQ+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB4LTQgcHktNCB0ZXh0LWNlbnRlclwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1zbGF0ZS03MDBcIj57Y29udHJhY3QuY29udHJhY3RTdGF0dXMgfHwgJy0nfTwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge2NvbnRyYWN0LmNsb3NpbmdEYXRlICYmIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDAgbXQtMC41XCI+RW5jZXJyOiB7Zm9ybWF0RGF0ZShjb250cmFjdC5jbG9zaW5nRGF0ZSl9PC9kaXY+fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDwvdGQ+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB4LTQgcHktNCB0ZXh0LWNlbnRlclwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTcwMFwiPntjb250cmFjdC5hZ2VSYW5nZUxhYmVsfTwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTUwMFwiPntjb250cmFjdC5rbVJhbmdlTGFiZWx9PC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicHgtNCBweS00IHRleHQtcmlnaHRcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC14cyBmb250LW1vbm8gdGV4dC1zbGF0ZS02MDBcIj57Y29udHJhY3QudmFsb3JGaXBlQXR1YWwgPyBgUiQgJHtjb250cmFjdC52YWxvckZpcGVBdHVhbC50b0xvY2FsZVN0cmluZygncHQtQlInKX1gIDogJy0nfTwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDwvdGQ+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB4LTQgcHktNCB0ZXh0LXJpZ2h0XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZvbnQtYm9sZCB0ZXh0LWJsdWUtNzAwIHRleHQteHNcIj5SJCB7Y29udHJhY3QubW9udGhseVZhbHVlLnRvTG9jYWxlU3RyaW5nKCdwdC1CUicpfTwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDwvdGQ+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB4LTQgcHktNFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzZWxlY3QgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZT17Y29udHJhY3QucmVuZXdhbFN0cmF0ZWd5fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBoYW5kbGVTdHJhdGVneUNoYW5nZShjb250cmFjdC5pZCwgZS50YXJnZXQudmFsdWUgYXMgUmVuZXdhbFN0cmF0ZWd5KX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCB0ZXh0LXhzIGJvcmRlciByb3VuZGVkIHB5LTEgcHgtMlwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtPYmplY3QuZW50cmllcyhSZW5ld2FsU3RyYXRlZ3lMYWJlbCkubWFwKChba2V5LCBsYWJlbF0pID0+IChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIGtleT17a2V5fSB2YWx1ZT17a2V5fT57bGFiZWx9PC9vcHRpb24+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zZWxlY3Q+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICB7aGFzT2JzZXJ2YXRpb25zICYmIDx0ZCBjbGFzc05hbWU9XCJweC00IHB5LTRcIj57Y29udHJhY3Qub2JzZXJ2YXRpb24gJiYgPHNwYW4gY2xhc3NOYW1lPVwiYmcteWVsbG93LTEwMCBweC0yIHB5LTAuNSByb3VuZGVkIHRleHQtWzEwcHhdIHRleHQteWVsbG93LTgwMFwiPk9iczwvc3Bhbj59PC90ZD59XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB4LTQgcHktNCB0ZXh0LWNlbnRlclwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS00MDAgaG92ZXI6dGV4dC1ibHVlLTYwMFwiIG9uQ2xpY2s9eygpID0+IGhhbmRsZU9wZW5PYnNlcnZhdGlvbihjb250cmFjdCl9PjxNZXNzYWdlU3F1YXJlUGx1cyBzaXplPXsxNn0vPjwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDwvdGQ+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgPC90cj5cclxuICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pfVxyXG4gICAgICAgICAgICAgICAgIDwvdGJvZHk+XHJcbiAgICAgICAgICAgICAgPC90YWJsZT5cclxuICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgKX1cclxuXHJcbiAgICAgIHsvKiBPYnNlcnZhdGlvbiBNb2RhbCAqL31cclxuICAgICAge29ic2VydmF0aW9uTW9kYWxPcGVuICYmIChcclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZpeGVkIGluc2V0LTAgYmctYmxhY2svNjAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgei01MCBwLTQgYmFja2Ryb3AtYmx1ci1zbVwiPlxyXG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgcm91bmRlZC14bCBzaGFkb3ctMnhsIHctZnVsbCBtYXgtdy1tZCBhbmltYXRlLWluIGZhZGUtaW4gem9vbS1pbiBkdXJhdGlvbi0yMDBcIj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBwLTYgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTEwMFwiPlxyXG4gICAgICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTgwMCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxNZXNzYWdlU3F1YXJlUGx1cyBjbGFzc05hbWU9XCJ0ZXh0LWJsdWUtNjAwXCIgc2l6ZT17MjB9Lz4gT2JzZXJ2YcOnw6NvXHJcbiAgICAgICAgICAgICAgICAgPC9oMz5cclxuICAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldE9ic2VydmF0aW9uTW9kYWxPcGVuKGZhbHNlKX0gY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS00MDAgaG92ZXI6dGV4dC1zbGF0ZS02MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICA8WCBzaXplPXsyNH0gLz5cclxuICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInAtNlwiPlxyXG4gICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBcclxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgaC0zMiBwLTMgYm9yZGVyIGJvcmRlci1zbGF0ZS0zMDAgcm91bmRlZC1sZyBmb2N1czpyaW5nLTIgZm9jdXM6cmluZy1ibHVlLTUwMCBvdXRsaW5lLW5vbmUgcmVzaXplLW5vbmUgdGV4dC1zbSB0ZXh0LXNsYXRlLTcwMFwiXHJcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJEaWdpdGUgb2JzZXJ2YcOnw7Vlcy4uLlwiXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU9e3RlbXBPYnNlcnZhdGlvbn1cclxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldFRlbXBPYnNlcnZhdGlvbihlLnRhcmdldC52YWx1ZSl9XHJcbiAgICAgICAgICAgICAgICAgPjwvdGV4dGFyZWE+XHJcbiAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC02IGZsZXgganVzdGlmeS1lbmQgZ2FwLTNcIj5cclxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldE9ic2VydmF0aW9uTW9kYWxPcGVuKGZhbHNlKX0gY2xhc3NOYW1lPVwicHgtNCBweS0yIGJnLXNsYXRlLTEwMCB0ZXh0LXNsYXRlLTcwMCBmb250LWJvbGQgcm91bmRlZC1sZyBob3ZlcjpiZy1zbGF0ZS0yMDBcIj5DYW5jZWxhcjwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17aGFuZGxlU2F2ZU9ic2VydmF0aW9ufSBjbGFzc05hbWU9XCJweC00IHB5LTIgYmctYmx1ZS02MDAgdGV4dC13aGl0ZSBmb250LWJvbGQgcm91bmRlZC1sZyBob3ZlcjpiZy1ibHVlLTcwMFwiPlNhbHZhcjwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICApfVxyXG5cclxuICAgIDwvZGl2PlxyXG4gICk7XHJcbn07XHJcbiJdLCJmaWxlIjoiQzovVXNlcnMvZnJhbnQvLmFudGlncmF2aXR5L3F1YWxpYS10YXNrLWZsb3cvc3JjL2NvbXBvbmVudHMvYW5hbHl0aWNzL0NvbnRyYWN0cy50c3gifQ==