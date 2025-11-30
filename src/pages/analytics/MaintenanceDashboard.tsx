import React from 'react';
import { Card, Title, Text, Metric } from '@tremor/react';
import { Wrench, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function MaintenanceDashboard() {
    return (
        <div className="bg-slate-50 min-h-screen p-6 space-y-6">
            <div>
                <Title>Manutenção - Controle de Oficina</Title>
                <Text className="mt-1">Monitoramento de Ordens de Serviço, eficiência e custos.</Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card decoration="top" decorationColor="blue">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Wrench className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <Text>OS em Aberto</Text>
                            <Metric>12</Metric>
                        </div>
                    </div>
                </Card>
                <Card decoration="top" decorationColor="amber">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <Text>Tempo Médio (Dias)</Text>
                            <Metric>3.5</Metric>
                        </div>
                    </div>
                </Card>
                <Card decoration="top" decorationColor="red">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <Text>Aguardando Peças</Text>
                            <Metric>4</Metric>
                        </div>
                    </div>
                </Card>
                <Card decoration="top" decorationColor="emerald">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <Text>Concluídas (Mês)</Text>
                            <Metric>45</Metric>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="h-96 flex items-center justify-center border-dashed border-2 border-slate-300">
                <div className="text-center">
                    <Wrench className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <Title className="text-slate-600">Módulo em Construção</Title>
                    <Text className="text-slate-500 max-w-md mt-2">
                        Estamos integrando os dados de Ordens de Serviço.
                        Em breve você terá visão completa de MTBF, MTTR e Custo por KM.
                    </Text>
                </div>
            </Card>
        </div>
    );
}
