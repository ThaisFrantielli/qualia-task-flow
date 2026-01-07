import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, Text, Title, Metric } from '@tremor/react';
import { Calendar, Clock, DollarSign, Wrench, FileText, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface OSDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    osData: {
        OrdemServico?: string;
        Ocorrencia?: string;
        Placa?: string;
        Modelo?: string;
        Fornecedor?: string;
        Cliente?: string;
        TipoOcorrencia?: string;
        Motivo?: string;
        StatusOcorrencia?: string;
        StatusOS?: string;
        DataEntrada?: string;
        DataSaida?: string;
        DataEvento?: string;
        ValorTotal?: number;
        ValorNaoReembolsavel?: number;
        ValorReembolsavel?: number;
        LeadTimeTotalDias?: number;
        KmEntrada?: number;
        KmSaida?: number;
        Categoria?: string;
        Despesa?: string;
        ContratoComercial?: string;
        ContratoLocacao?: string;
        OrdemCompra?: string;
    };
}

function fmtBRL(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtDate(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
}

export function OSDetailsModal({ isOpen, onClose, osData }: OSDetailsModalProps) {
    const getStatusColor = (status?: string) => {
        const s = (status || '').toUpperCase();
        if (s.includes('CONCLUÍDO') || s.includes('CONCLUIDA')) return 'bg-emerald-100 text-emerald-700';
        if (s.includes('ANDAMENTO') || s.includes('ABERTA')) return 'bg-amber-100 text-amber-700';
        if (s.includes('CANCELAD')) return 'bg-slate-100 text-slate-700';
        return 'bg-blue-100 text-blue-700';
    };

    const leadTime = osData.LeadTimeTotalDias || 0;
    const kmRodado = (osData.KmSaida || 0) - (osData.KmEntrada || 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <Wrench className="h-6 w-6 text-amber-600" />
                        <div>
                            <span>OS {osData.OrdemServico}</span>
                            {osData.Ocorrencia && (
                                <span className="text-slate-500 text-sm ml-2">• Ocorrência {osData.Ocorrencia}</span>
                            )}
                        </div>
                    </DialogTitle>
                    <DialogDescription>
                        Detalhamento completo da ordem de serviço
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Status e Timeline */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <Title>Status e Timeline</Title>
                            <div className="flex gap-2">
                                {osData.StatusOS && (
                                    <Badge className={getStatusColor(osData.StatusOS)}>
                                        {osData.StatusOS}
                                    </Badge>
                                )}
                                {osData.StatusOcorrencia && osData.StatusOcorrencia !== osData.StatusOS && (
                                    <Badge className={getStatusColor(osData.StatusOcorrencia)}>
                                        {osData.StatusOcorrencia}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <Text className="text-xs text-slate-500">Data Entrada</Text>
                                </div>
                                <Text className="font-semibold">{fmtDate(osData.DataEntrada)}</Text>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <Text className="text-xs text-slate-500">Data Saída</Text>
                                </div>
                                <Text className="font-semibold">{fmtDate(osData.DataSaida) || 'Em andamento'}</Text>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="h-4 w-4 text-slate-400" />
                                    <Text className="text-xs text-slate-500">Lead Time</Text>
                                </div>
                                <Metric className={leadTime > 7 ? 'text-rose-600' : 'text-emerald-600'}>
                                    {leadTime}d
                                </Metric>
                            </div>
                        </div>
                    </Card>

                    {/* Veículo */}
                    <Card>
                        <Title className="mb-4">Veículo</Title>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Text className="text-xs text-slate-500 mb-1">Placa</Text>
                                <Text className="font-mono font-bold text-lg">{osData.Placa}</Text>
                            </div>
                            <div>
                                <Text className="text-xs text-slate-500 mb-1">Modelo</Text>
                                <Text className="font-semibold">{osData.Modelo || '-'}</Text>
                            </div>
                            {osData.Categoria && (
                                <div>
                                    <Text className="text-xs text-slate-500 mb-1">Categoria</Text>
                                    <Badge variant="outline">{osData.Categoria}</Badge>
                                </div>
                            )}
                            <div>
                                <Text className="text-xs text-slate-500 mb-1">KM Entrada / Saída</Text>
                                <Text className="font-semibold">
                                    {osData.KmEntrada?.toLocaleString('pt-BR') || 0} km
                                    {osData.KmSaida && osData.KmSaida > 0 && (
                                        <span className="text-slate-500">
                                            {' '}→ {osData.KmSaida.toLocaleString('pt-BR')} km
                                            {kmRodado > 0 && <span className="text-xs ml-2">(+{kmRodado} km)</span>}
                                        </span>
                                    )}
                                </Text>
                            </div>
                        </div>
                    </Card>

                    {/* Serviço */}
                    <Card>
                        <Title className="mb-4">Serviço Executado</Title>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Text className="text-xs text-slate-500 mb-1">Tipo</Text>
                                <Badge className="bg-blue-100 text-blue-700">
                                    {osData.TipoOcorrencia || 'Não especificado'}
                                </Badge>
                            </div>
                            <div>
                                <Text className="text-xs text-slate-500 mb-1">Motivo</Text>
                                <Text>{osData.Motivo || '-'}</Text>
                            </div>
                            {osData.Despesa && (
                                <div className="col-span-2">
                                    <Text className="text-xs text-slate-500 mb-1">Despesa</Text>
                                    <Text className="text-sm">{osData.Despesa}</Text>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Financeiro */}
                    <Card>
                        <div className="flex items-center gap-2 mb-4">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                            <Title>Valores</Title>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Text className="text-xs text-slate-500 mb-1">Valor Total</Text>
                                <Metric className="text-amber-600">
                                    {fmtBRL(osData.ValorTotal || 0)}
                                </Metric>
                            </div>
                            <div>
                                <Text className="text-xs text-slate-500 mb-1">Não Reembolsável</Text>
                                <Metric className="text-rose-600 text-xl">
                                    {fmtBRL(osData.ValorNaoReembolsavel || 0)}
                                </Metric>
                            </div>
                            <div>
                                <Text className="text-xs text-slate-500 mb-1">Reembolsável</Text>
                                <Metric className="text-emerald-600 text-xl">
                                    {fmtBRL(osData.ValorReembolsavel || 0)}
                                </Metric>
                            </div>
                        </div>
                    </Card>

                    {/* Cliente e Fornecedor */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <div className="flex items-center gap-2 mb-3">
                                <User className="h-4 w-4 text-slate-400" />
                                <Title className="text-sm">Cliente</Title>
                            </div>
                            <Text className="font-semibold mb-2">{osData.Cliente || 'Sem cliente'}</Text>
                            {osData.ContratoComercial && (
                                <div className="pt-2 border-t border-slate-100">
                                    <Text className="text-xs text-slate-500">Contrato Comercial</Text>
                                    <Text className="font-mono text-xs">{osData.ContratoComercial}</Text>
                                </div>
                            )}
                            {osData.ContratoLocacao && (
                                <div className="pt-2">
                                    <Text className="text-xs text-slate-500">Contrato Locação</Text>
                                    <Text className="font-mono text-xs">{osData.ContratoLocacao}</Text>
                                </div>
                            )}
                        </Card>

                        <Card>
                            <div className="flex items-center gap-2 mb-3">
                                <Wrench className="h-4 w-4 text-slate-400" />
                                <Title className="text-sm">Fornecedor</Title>
                            </div>
                            <Text className="font-semibold mb-2">{osData.Fornecedor || 'Não especificado'}</Text>
                            {osData.OrdemCompra && (
                                <div className="pt-2 border-t border-slate-100">
                                    <Text className="text-xs text-slate-500">Ordem de Compra</Text>
                                    <Text className="font-mono text-xs">{osData.OrdemCompra}</Text>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={() => {
                            // TODO: Implementar exportação de PDF da OS
                            console.log('Exportar PDF:', osData);
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 transition-colors flex items-center gap-2"
                    >
                        <FileText className="h-4 w-4" />
                        Exportar PDF
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
