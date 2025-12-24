import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { formatMonthLabel } from '@/utils/dreUtils';

interface MonthFilterProps {
    availableMonths: string[];
    selectedMonths: string[];
    onChange: (months: string[]) => void;
}

export default function MonthFilter({
    availableMonths,
    selectedMonths,
    onChange
}: MonthFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleMonth = (month: string) => {
        if (selectedMonths.includes(month)) {
            onChange(selectedMonths.filter(m => m !== month));
        } else {
            onChange([...selectedMonths, month].sort());
        }
    };

    const selectAll = () => {
        onChange([...availableMonths]);
    };

    const clearAll = () => {
        onChange([]);
    };

    const selectLast6 = () => {
        const last6 = availableMonths.slice(-6);
        onChange(last6);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
                <span className="text-sm font-medium text-slate-700">
                    {selectedMonths.length === 0
                        ? 'Selecionar Meses'
                        : selectedMonths.length === availableMonths.length
                            ? 'Todos os Meses'
                            : `${selectedMonths.length} ${selectedMonths.length === 1 ? 'Mês' : 'Meses'}`}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
                    {/* Quick actions */}
                    <div className="p-2 border-b border-slate-200 flex gap-2">
                        <button
                            onClick={selectAll}
                            className="flex-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                            Todos
                        </button>
                        <button
                            onClick={selectLast6}
                            className="flex-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                            Últimos 6
                        </button>
                        <button
                            onClick={clearAll}
                            className="flex-1 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded transition-colors"
                        >
                            Limpar
                        </button>
                    </div>

                    {/* Month list */}
                    <div className="overflow-y-auto flex-1">
                        {availableMonths.slice().reverse().map(month => (
                            <label
                                key={month}
                                className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                                <div className="relative flex items-center justify-center w-5 h-5">
                                    <input
                                        type="checkbox"
                                        checked={selectedMonths.includes(month)}
                                        onChange={() => toggleMonth(month)}
                                        className="sr-only"
                                    />
                                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${selectedMonths.includes(month)
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'border-slate-300'
                                        }`}>
                                        {selectedMonths.includes(month) && (
                                            <Check className="w-3 h-3 text-white" />
                                        )}
                                    </div>
                                </div>
                                <span className="text-sm text-slate-700">
                                    {formatMonthLabel(month)}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Selected months badges */}
            {selectedMonths.length > 0 && selectedMonths.length < availableMonths.length && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {selectedMonths.map(month => (
                        <span
                            key={month}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded"
                        >
                            {formatMonthLabel(month)}
                            <button
                                onClick={() => toggleMonth(month)}
                                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
