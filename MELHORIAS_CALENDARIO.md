# 📅 Melhorias Propostas para o Calendário

## 🎨 Melhorias de Layout

### 1. Design Visual
```tsx
// ANTES: Básico, sem contraste
<div className="min-h-[120px] p-2 border rounded">

// DEPOIS: Mais visual e profissional
<div className="min-h-[140px] p-3 border-2 hover:border-blue-300 
                transition-all rounded-lg shadow-sm hover:shadow-md">
```

### 2. Cores e Status
Adicionar legenda de cores:

```tsx
<div className="flex gap-4 mb-4">
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 bg-blue-400 rounded"></div>
    <span className="text-sm">Tarefa Agendada</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 bg-green-400 rounded"></div>
    <span className="text-sm">Evento/Lembrete</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 bg-yellow-400 rounded"></div>
    <span className="text-sm">Em Progresso</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 bg-red-400 rounded"></div>
    <span className="text-sm">Atrasada</span>
  </div>
</div>
```

### 3. Hover com Detalhes
```tsx
// Tooltip ao passar o mouse sobre tarefa/evento
<div 
  className="relative group"
  title={`${task.title}\nDescrição: ${task.description}\nStatus: ${task.status}`}
>
  <span>{task.title}</span>
  
  {/* Tooltip customizado */}
  <div className="absolute hidden group-hover:block z-50 
                  bg-white border shadow-lg rounded p-3 min-w-[200px]">
    <h4 className="font-bold">{task.title}</h4>
    <p className="text-sm text-gray-600">{task.description}</p>
    <div className="flex gap-2 mt-2">
      <span className="text-xs bg-blue-100 px-2 py-1 rounded">
        {task.status}
      </span>
      {task.priority && (
        <span className="text-xs bg-red-100 px-2 py-1 rounded">
          Prioridade: {task.priority}
        </span>
      )}
    </div>
  </div>
</div>
```

### 4. Dia de Hoje Destacado
```tsx
// Melhorar destaque do dia atual
${isSameDay(day, new Date()) ? 
  'ring-4 ring-blue-500 bg-blue-50 font-bold' : 
  'bg-white'
}
```

### 5. Dias do Mês Anterior/Próximo
```tsx
// Mostrar dias do mês anterior/próximo em cinza
${!isCurrentMonth ? 'opacity-40 bg-gray-100' : 'bg-white'}
```

---

## ⚡ Melhorias de Funcionalidades

### 1. Visualização de Lista (Alternativa)
Adicionar botão para alternar entre visualização de calendário e lista:

```tsx
const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

<div className="flex gap-2">
  <Button 
    variant={viewMode === 'calendar' ? 'default' : 'outline'}
    onClick={() => setViewMode('calendar')}
  >
    📅 Calendário
  </Button>
  <Button 
    variant={viewMode === 'list' ? 'default' : 'outline'}
    onClick={() => setViewMode('list')}
  >
    📝 Lista
  </Button>
</div>

{viewMode === 'list' ? (
  <TaskListView tasks={tasks} events={calendarEvents} />
) : (
  // Calendário atual
)}
```

### 2. Filtros
```tsx
<div className="flex gap-2 mb-4">
  <Select value={filterStatus} onValueChange={setFilterStatus}>
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="Filtrar por status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos</SelectItem>
      <SelectItem value="pending">Pendente</SelectItem>
      <SelectItem value="progress">Em Progresso</SelectItem>
      <SelectItem value="done">Concluído</SelectItem>
      <SelectItem value="late">Atrasado</SelectItem>
    </SelectContent>
  </Select>
  
  <Select value={filterProject} onValueChange={setFilterProject}>
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="Filtrar por projeto" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos os Projetos</SelectItem>
      {projects.map(p => (
        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### 3. Drag & Drop para Reagendar
```tsx
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';

// Permitir arrastar tarefa para outro dia
const DraggableTask = ({ task }) => {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: task.id,
  });
  
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      {task.title}
    </div>
  );
};

// Soltar em outro dia
const DroppableDay = ({ day, children }) => {
  const { setNodeRef } = useDroppable({ id: day.toISOString() });
  
  return <div ref={setNodeRef}>{children}</div>;
};
```

### 4. Click na Tarefa/Evento
```tsx
// Ao clicar, abrir modal com detalhes
<div 
  onClick={() => handleTaskClick(task)}
  className="cursor-pointer hover:bg-gray-100"
>
  {task.title}
</div>

const handleTaskClick = (task) => {
  // Opção 1: Navegar para página da tarefa
  navigate(`/tasks/${task.id}`);
  
  // Opção 2: Abrir modal de edição rápida
  setEditTask(task);
  setEditTitle(task.title);
  setEditDesc(task.description);
};
```

### 5. Adicionar Tarefa Diretamente no Dia
```tsx
// Ao clicar em um dia vazio, criar tarefa para aquele dia
<div 
  onClick={() => handleDayClick(day)}
  className="min-h-[140px]"
>
  {/* Conteúdo do dia */}
</div>

const handleDayClick = (date: Date) => {
  // Abrir modal de criar tarefa com data pré-preenchida
  setNewTaskDate(date);
  setCreateTaskOpen(true);
};
```

### 6. Badge com Contador
```tsx
// Mostrar quantidade de tarefas no dia
<div className="font-medium text-sm mb-2 flex justify-between">
  <span>{format(day, 'd')}</span>
  {(getTasksForDate(day).length + getEventsForDate(day).length) > 0 && (
    <span className="bg-blue-500 text-white text-xs rounded-full 
                     w-5 h-5 flex items-center justify-center">
      {getTasksForDate(day).length + getEventsForDate(day).length}
    </span>
  )}
</div>
```

### 7. Visualização Semanal
```tsx
const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');

<Button onClick={() => setCalendarView('week')}>
  Ver Semana
</Button>

{calendarView === 'week' ? (
  <WeekView currentDate={currentDate} tasks={tasks} />
) : (
  // Vista mensal atual
)}
```

### 8. Exportar para ICS (iCalendar)
```tsx
const exportToICS = () => {
  const icsContent = generateICS(tasks, calendarEvents);
  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'calendario.ics';
  link.click();
};

<Button onClick={exportToICS}>
  📥 Exportar Calendário
</Button>
```

### 9. Sincronizar com Google Calendar / Outlook
```tsx
// Botão para sincronizar com calendários externos
<Button onClick={handleSyncGoogleCalendar}>
  🔄 Sincronizar com Google
</Button>
```

### 10. Notificações/Lembretes
```tsx
// Adicionar campo de lembrete ao criar evento
<div className="space-y-2">
  <Label>Lembrete</Label>
  <Select value={reminder} onValueChange={setReminder}>
    <SelectTrigger>
      <SelectValue placeholder="Quando notificar" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">Sem lembrete</SelectItem>
      <SelectItem value="5min">5 minutos antes</SelectItem>
      <SelectItem value="30min">30 minutos antes</SelectItem>
      <SelectItem value="1h">1 hora antes</SelectItem>
      <SelectItem value="1d">1 dia antes</SelectItem>
    </SelectContent>
  </Select>
</div>

// Usar Push Notifications API
if ('Notification' in window && Notification.permission === 'granted') {
  new Notification('Lembrete: ' + eventTitle, {
    body: 'O evento começa em 30 minutos',
    icon: '/icon.png'
  });
}
```

---

## 🚀 Melhorias Prioritárias (Sugestão de Ordem)

### Fase 1 - Rápido (1-2 horas):
1. ✅ Melhorar cores e contraste
2. ✅ Adicionar legenda de cores
3. ✅ Badge com contador de tarefas
4. ✅ Click na tarefa para ver detalhes/navegar
5. ✅ Destacar melhor o dia atual

### Fase 2 - Médio (2-4 horas):
6. ✅ Tooltip com detalhes ao hover
7. ✅ Filtros por status e projeto
8. ✅ Adicionar tarefa clicando no dia
9. ✅ Visualização de lista alternativa

### Fase 3 - Avançado (4-8 horas):
10. ✅ Drag & Drop para reagendar
11. ✅ Visualização semanal
12. ✅ Exportar para ICS
13. ✅ Notificações/Lembretes
14. ✅ Sincronização com calendários externos

---

## 📱 Melhorias de Responsividade

### Mobile
```tsx
// Adaptar para mobile
<div className="grid grid-cols-7 gap-1 md:gap-2">
  {/* No mobile, reduzir padding e fonte */}
  <div className="min-h-[80px] md:min-h-[140px] p-1 md:p-3">
    <div className="text-xs md:text-sm">
      {format(day, 'd')}
    </div>
    {/* Mostrar apenas dots/badges em mobile */}
    <div className="flex flex-wrap gap-1">
      {getTasksForDate(day).map(task => (
        <div className="w-2 h-2 bg-blue-500 rounded-full" />
      ))}
    </div>
  </div>
</div>
```

---

## 🎯 Implementação Recomendada

Para implementar essas melhorias, vou criar um novo arquivo `Calendar.improved.tsx` com as mudanças prioritárias.

**Deseja que eu implemente alguma dessas melhorias agora?**

Digite o número da melhoria ou "todas fase 1" para implementar as melhorias básicas.
