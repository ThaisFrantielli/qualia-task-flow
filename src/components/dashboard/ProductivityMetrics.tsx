// src/components/dashboard/ProductivityMetrics.tsx

import React, { useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const ProductivityMetrics: React.FC = () => {
  // 1. Usamos o hook useTasks para buscar os dados
  const { tasks, loading } = useTasks({});

  // 2. Usamos useMemo para processar os dados apenas quando as tarefas mudam
  const chartData = useMemo(() => {
    const safeTasks = tasks ?? [];
    
    const statusData = [
      { name: 'A Fazer', value: safeTasks.filter(t => t.status === 'todo').length, color: '#9CA3AF' },
      { name: 'Em Progresso', value: safeTasks.filter(t => t.status === 'progress').length, color: '#3B82F6' },
      { name: 'Concluído', value: safeTasks.filter(t => t.status === 'done').length, color: '#10B981' },
      { name: 'Atrasado', value: safeTasks.filter(t => t.status === 'late').length, color: '#EF4444' }
    ].filter(d => d.value > 0); // Mostra apenas status que existem

    const priorityData = [
      { name: 'Alta', value: safeTasks.filter(t => t.priority === 'high').length, color: '#EF4444' },
      { name: 'Média', value: safeTasks.filter(t => t.priority === 'medium').length, color: '#F59E0B' },
      { name: 'Baixa', value: safeTasks.filter(t => t.priority === 'low').length, color: '#10B981' }
    ].filter(d => d.value > 0);

    return { statusData, priorityData };
  }, [tasks]);

  if (loading) {
    return <p>Carregando métricas de produtividade...</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tarefas por Status</CardTitle>
          <CardDescription>Distribuição atual das suas tarefas.</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} tarefas`, "Quantidade"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-12">Nenhum dado para exibir.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tarefas por Prioridade</CardTitle>
          <CardDescription>Distribuição por nível de prioridade.</CardDescription>
        </CardHeader>
        <CardContent>
           {chartData.priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.priorityData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={60} />
                    <Tooltip formatter={(value) => [`${value} tarefas`, "Quantidade"]}/>
                    <Bar dataKey="value" name="Tarefas">
                        {chartData.priorityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
           ) : (
             <p className="text-center text-muted-foreground py-12">Nenhum dado para exibir.</p>
           )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductivityMetrics;