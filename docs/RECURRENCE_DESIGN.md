# 🔄 Design: Sistema de Recorrência de Tarefas

## 📋 Visão Geral
Sistema para criação e gerenciamento de tarefas recorrentes (diárias, semanais, mensais) com geração automática de novas ocorrências.

---

## 🗄️ Database Schema

### 1. Alterações na tabela `tasks`

Adicionar campos para suporte à recorrência:

```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(20); -- 'daily', 'weekly', 'monthly'
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1; -- A cada X dias/semanas/meses
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_days VARCHAR(50); -- Para semanal: '1,3,5' (seg, qua, sex)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_end TIMESTAMP WITH TIME ZONE; -- Data de término (opcional)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL; -- Link para tarefa-mãe
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS occurrence_date DATE; -- Data específica desta ocorrência

CREATE INDEX idx_tasks_recurrence ON tasks(is_recurring, recurrence_end) WHERE is_recurring = TRUE;
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
```

### 2. Tabela auxiliar `task_recurrence_history` (opcional)

Para tracking de quando ocorrências foram geradas:

```sql
CREATE TABLE IF NOT EXISTS task_recurrence_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  generated_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  occurrence_date DATE NOT NULL
);

CREATE INDEX idx_recurrence_history_parent ON task_recurrence_history(parent_task_id);
```

---

## 🔧 Lógica de Negócio

### Fluxo de Criação

1. **Usuário cria tarefa recorrente:**
   - Define padrão (diário/semanal/mensal)
   - Define intervalo (a cada X dias)
   - Define dias da semana (se semanal)
   - Define data de término (opcional)

2. **Sistema gera próximas N ocorrências:**
   - Criar imediatamente as próximas 4-6 ocorrências
   - Cada ocorrência é uma `task` separada
   - Link `parent_task_id` aponta para tarefa-mãe
   - Campo `occurrence_date` marca data específica

3. **Job periódico (diário):**
   - Verificar tarefas recorrentes próximas ao fim
   - Gerar novas ocorrências se necessário
   - Manter sempre 4-6 ocorrências futuras disponíveis

### Regras de Geração

```typescript
// Exemplo de lógica
function generateNextOccurrences(parentTask: Task, count: number = 5): Task[] {
  const occurrences: Task[] = [];
  let currentDate = new Date(parentTask.due_date || new Date());
  
  for (let i = 0; i < count; i++) {
    // Calcular próxima data baseado no padrão
    currentDate = calculateNextDate(currentDate, parentTask.recurrence_pattern, parentTask.recurrence_interval);
    
    // Verificar se passou da data de término
    if (parentTask.recurrence_end && currentDate > new Date(parentTask.recurrence_end)) {
      break;
    }
    
    // Criar nova ocorrência
    occurrences.push({
      ...parentTask,
      id: undefined, // Novo ID será gerado
      parent_task_id: parentTask.id,
      occurrence_date: currentDate,
      due_date: currentDate,
      status: 'todo',
      start_date: null,
      end_date: null,
      is_recurring: false // A ocorrência em si não é recorrente
    });
  }
  
  return occurrences;
}

function calculateNextDate(from: Date, pattern: string, interval: number): Date {
  const next = new Date(from);
  
  switch (pattern) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + (7 * interval));
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
  }
  
  return next;
}
```

### Comportamento ao Completar/Editar

- **Completar uma ocorrência:** Não afeta outras ocorrências
- **Editar tarefa-mãe:** Pode opcionalmente atualizar futuras ocorrências
- **Deletar tarefa-mãe:** 
  - Opção 1: Deletar todas ocorrências futuras
  - Opção 2: Manter ocorrências mas remover vínculo
- **Pausar recorrência:** Setar `recurrence_end` para hoje

---

## 🎨 Componentes UI

### 1. `RecurrenceConfig.tsx`

Dialog/Modal para configurar recorrência ao criar/editar tarefa:

```tsx
interface RecurrenceConfigProps {
  value: {
    pattern: 'daily' | 'weekly' | 'monthly' | null;
    interval: number;
    days?: number[]; // Para semanal: [0=dom, 1=seg, ...]
    endDate?: Date | null;
  };
  onChange: (config: RecurrenceConfig) => void;
}

// UI Elements:
// - Radio buttons: Diária / Semanal / Mensal
// - Number input: "A cada X dias/semanas/meses"
// - Checkboxes (se semanal): Seg Ter Qua Qui Sex Sab Dom
// - Date picker: "Termina em" (opcional)
// - Preview: "Próximas 3 ocorrências: 15/11, 22/11, 29/11"
```

### 2. `RecurrenceIndicator.tsx`

Badge/Icon indicando que tarefa é recorrente:

```tsx
interface RecurrenceIndicatorProps {
  task: TaskWithDetails;
}

// UI:
// - Icon de loop/recorrência
// - Tooltip: "Recorre semanalmente às segundas"
// - Link: "Ver série completa" (mostra todas ocorrências)
```

### 3. `RecurrenceSeriesView.tsx`

Visualização de todas ocorrências de uma tarefa recorrente:

```tsx
// UI:
// - Lista de todas ocorrências (passadas e futuras)
// - Status de cada: Concluída / Pendente / Próxima
// - Opção de editar tarefa-mãe
// - Opção de pausar/cancelar recorrência
```

---

## 📁 Estrutura de Arquivos

```
src/
  components/
    recurrence/
      RecurrenceConfig.tsx         # Dialog de configuração
      RecurrenceIndicator.tsx      # Badge de recorrência
      RecurrenceSeriesView.tsx     # Visualização de série
      RecurrencePreview.tsx        # Preview das próximas datas
  
  hooks/
    useRecurrence.ts               # Hook para gerenciar recorrência
    useRecurrenceGeneration.ts     # Lógica de geração de ocorrências
  
  lib/
    recurrenceUtils.ts             # Funções helper (calculateNextDate, etc)
  
  types/
    recurrence.ts                  # Tipos TypeScript
```

---

## 🔌 Integração com Sistema Existente

### 1. `CreateTaskForm.tsx`

Adicionar seção de recorrência:

```tsx
<div className="space-y-4 border-t pt-4">
  <div className="flex items-center justify-between">
    <Label>Tarefa Recorrente</Label>
    <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
  </div>
  
  {isRecurring && (
    <RecurrenceConfig 
      value={recurrenceConfig} 
      onChange={setRecurrenceConfig} 
    />
  )}
</div>
```

### 2. `TaskDetailsContent.tsx`

Mostrar indicador e permitir gerenciar:

```tsx
{task.is_recurring && (
  <div className="border-t pt-4">
    <RecurrenceIndicator task={task} />
    <Button variant="outline" onClick={() => setShowSeriesView(true)}>
      Ver Série Completa
    </Button>
  </div>
)}

{task.parent_task_id && (
  <Alert>
    <InfoIcon className="h-4 w-4" />
    <AlertDescription>
      Esta tarefa faz parte de uma série recorrente.
      <Button variant="link" onClick={() => navigate(`/tasks/${task.parent_task_id}`)}>
        Ver tarefa-mãe
      </Button>
    </AlertDescription>
  </Alert>
)}
```

### 3. `useTasks.ts`

Modificar lógica de criação para gerar ocorrências:

```tsx
const createTaskMutation = useMutation({
  mutationFn: async (taskData: TaskInsert) => {
    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();
    
    if (error) throw error;
    
    // Se for recorrente, gerar ocorrências
    if (taskData.is_recurring) {
      const occurrences = generateNextOccurrences(newTask, 5);
      await supabase.from('tasks').insert(occurrences);
    }
    
    return newTask;
  },
  // ...
});
```

---

## 🚀 Plano de Implementação

### Fase 1: Backend (Database + Lógica)
1. ✅ Criar migration com novos campos
2. ✅ Implementar `recurrenceUtils.ts` com lógica de cálculo
3. ✅ Modificar `useTasks.ts` para criar ocorrências

### Fase 2: UI Básico
1. ✅ Criar `RecurrenceConfig.tsx` com opções básicas
2. ✅ Adicionar switch em `CreateTaskForm.tsx`
3. ✅ Criar `RecurrenceIndicator.tsx`

### Fase 3: Gestão Avançada
1. ✅ Implementar `RecurrenceSeriesView.tsx`
2. ✅ Adicionar opções de editar/pausar/cancelar
3. ✅ Mostrar preview de próximas datas

### Fase 4: Job Automático
1. ✅ Criar job diário para gerar novas ocorrências
2. ✅ Implementar limpeza de ocorrências antigas
3. ✅ Adicionar notificações

---

## ⚠️ Considerações Importantes

### Performance
- **Não gerar todas as ocorrências de uma vez** (se recorrência for de anos)
- Manter janela deslizante de 4-6 ocorrências futuras
- Indexar campos de busca (`is_recurring`, `parent_task_id`)

### UX
- **Preview claro** das próximas datas antes de salvar
- **Feedback visual** forte de que tarefa é recorrente
- **Opção de editar apenas esta ocorrência vs. toda série**

### Edge Cases
- **Dias inválidos:** Ex: 31 de fevereiro (pular para próximo mês)
- **Fuso horário:** Usar UTC no banco, exibir no TZ do usuário
- **Tarefa atrasada:** Não gerar ocorrências passadas

### Segurança
- **RLS:** Usuário só vê/edita suas próprias tarefas recorrentes
- **Validação:** Limitar máximo de ocorrências geradas por vez

---

## 📊 Exemplo de Uso

```typescript
// Criar tarefa recorrente
const newTask = {
  title: "Reunião de Sprint Review",
  description: "Review semanal do progresso",
  is_recurring: true,
  recurrence_pattern: "weekly",
  recurrence_interval: 1,
  recurrence_days: [5], // Sexta-feira
  due_date: "2025-11-15",
  recurrence_end: "2026-11-15" // Recorre por 1 ano
};

// Resultado: Sistema cria:
// 1. Tarefa-mãe (ID: uuid-1)
// 2. Ocorrências:
//    - 15/11/2025 (parent_task_id: uuid-1)
//    - 22/11/2025 (parent_task_id: uuid-1)
//    - 29/11/2025 (parent_task_id: uuid-1)
//    - 06/12/2025 (parent_task_id: uuid-1)
//    - 13/12/2025 (parent_task_id: uuid-1)
```

---

## 🔗 Referências

- [RFC 5545 - iCalendar Recurrence](https://datatracker.ietf.org/doc/html/rfc5545#section-3.3.10)
- [Google Calendar Recurrence Rules](https://developers.google.com/calendar/api/concepts/events-calendars#recurring_events)
- [Microsoft Graph Recurrence Patterns](https://learn.microsoft.com/en-us/graph/api/resources/recurrencepattern)

---

**Status:** 📝 Design completo - Pronto para implementação  
**Última atualização:** 11/11/2025
