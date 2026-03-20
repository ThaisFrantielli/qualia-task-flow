import { useEffect, useRef, useCallback } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UXEventType =
    | 'task_start'
    | 'task_complete'
    | 'task_abandon'
    | 'form_error'
    | 'page_view'
    | 'interaction';

export type UXEvent = {
    type: UXEventType;
    task: string;
    detail?: string;
    durationMs?: number;
    timestamp: number;
    sessionId: string;
};

// ─── Session ID (por tab) ────────────────────────────────────────────────────

const SESSION_KEY = 'ux_session_id';

function getOrCreateSessionId(): string {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
}

// ─── Storage local (ring buffer de 500 eventos) ───────────────────────────────

const STORAGE_KEY = 'ux_telemetry';
const MAX_EVENTS = 500;

function readEvents(): UXEvent[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as UXEvent[]) : [];
    } catch {
        return [];
    }
}

function writeEvents(events: UXEvent[]): void {
    try {
        const trimmed = events.slice(-MAX_EVENTS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
        // storage cheio — silencia
    }
}

function appendEvent(event: UXEvent): void {
    const events = readEvents();
    events.push(event);
    writeEvents(events);
}

// ─── Hook principal ───────────────────────────────────────────────────────────

/**
 * useUXTelemetry — instrumentação de UX para medir time-to-task,
 * abandono de fluxos e pontos de fricção.
 *
 * Uso:
 *   const { startTask, completeTask, abandonTask, trackError } = useUXTelemetry('criar_ticket');
 */
export function useUXTelemetry(taskName: string) {
    const sessionId = useRef<string>(getOrCreateSessionId());
    const startedAt = useRef<number | null>(null);

    // Registra início de uma tarefa
    const startTask = useCallback(
        (detail?: string) => {
            startedAt.current = Date.now();
            appendEvent({
                type: 'task_start',
                task: taskName,
                detail,
                timestamp: startedAt.current,
                sessionId: sessionId.current,
            });
        },
        [taskName],
    );

    // Registra conclusão com sucesso
    const completeTask = useCallback(
        (detail?: string) => {
            const durationMs = startedAt.current ? Date.now() - startedAt.current : undefined;
            appendEvent({
                type: 'task_complete',
                task: taskName,
                detail,
                durationMs,
                timestamp: Date.now(),
                sessionId: sessionId.current,
            });
            startedAt.current = null;
        },
        [taskName],
    );

    // Registra abandono (usuário saiu sem concluir)
    const abandonTask = useCallback(
        (detail?: string) => {
            const durationMs = startedAt.current ? Date.now() - startedAt.current : undefined;
            appendEvent({
                type: 'task_abandon',
                task: taskName,
                detail,
                durationMs,
                timestamp: Date.now(),
                sessionId: sessionId.current,
            });
            startedAt.current = null;
        },
        [taskName],
    );

    // Registra erro de formulário / fricção
    const trackError = useCallback(
        (detail: string) => {
            appendEvent({
                type: 'form_error',
                task: taskName,
                detail,
                timestamp: Date.now(),
                sessionId: sessionId.current,
            });
        },
        [taskName],
    );

    // Registra page view ao montar (opt-in)
    const trackPageView = useCallback(
        (detail?: string) => {
            appendEvent({
                type: 'page_view',
                task: taskName,
                detail,
                timestamp: Date.now(),
                sessionId: sessionId.current,
            });
        },
        [taskName],
    );

    // Abandona automaticamente se o componente desmontar durante uma tarefa em andamento
    useEffect(() => {
        return () => {
            if (startedAt.current !== null) {
                abandonTask('unmount');
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { startTask, completeTask, abandonTask, trackError, trackPageView };
}

// ─── Helpers de leitura / análise ────────────────────────────────────────────

/**
 * Retorna métricas agregadas de telemetria para um período.
 */
export function getUXMetrics(sinceMs = 7 * 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - sinceMs;
    const events = readEvents().filter((e) => e.timestamp >= cutoff);

    const completedByTask: Record<string, { count: number; avgDurationMs: number; durations: number[] }> = {};
    const abandonByTask: Record<string, number> = {};
    const errorByTask: Record<string, number> = {};

    for (const e of events) {
        if (e.type === 'task_complete') {
            if (!completedByTask[e.task]) {
                completedByTask[e.task] = { count: 0, avgDurationMs: 0, durations: [] };
            }
            completedByTask[e.task].count += 1;
            if (e.durationMs) completedByTask[e.task].durations.push(e.durationMs);
        }
        if (e.type === 'task_abandon') {
            abandonByTask[e.task] = (abandonByTask[e.task] ?? 0) + 1;
        }
        if (e.type === 'form_error') {
            errorByTask[e.task] = (errorByTask[e.task] ?? 0) + 1;
        }
    }

    // Calcular médias
    for (const task of Object.keys(completedByTask)) {
        const d = completedByTask[task].durations;
        completedByTask[task].avgDurationMs = d.length ? d.reduce((s, v) => s + v, 0) / d.length : 0;
    }

    return { completedByTask, abandonByTask, errorByTask, totalEvents: events.length };
}

/**
 * Limpa todos os eventos de telemetria (útil em logout).
 */
export function clearUXTelemetry(): void {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Exporta todos os eventos para envio futuro a backend de analytics.
 */
export function exportUXTelemetry(): UXEvent[] {
    return readEvents();
}
