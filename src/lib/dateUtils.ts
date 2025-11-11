// src/lib/dateUtils.ts
// Small date helpers to normalize dates for calendar display and DB insertion
export function normalizeToLocalDate(d: Date | string | null): Date | null {
  if (!d) return null;
  const dt = typeof d === 'string' ? new Date(d) : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  // set to local midnight (00:00:00) to avoid timezone shifts when comparing dates
  const nd = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  return nd;
}

export function parseISODateSafe(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

// returns ISO date string (yyyy-mm-dd) for DB date-only fields or comparisons
export function dateToISODateOnly(d: Date | null): string | null {
  if (!d) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to create an ISO string for DB that keeps local date (no timezone offset applied)
export function toLocalISOStringDate(d: Date | null): string | null {
  if (!d) return null;
  // Build a date-only ISO (no time) to avoid timezone shifts
  return dateToISODateOnly(normalizeToLocalDate(d));
}

export default {
  normalizeToLocalDate,
  parseISODateSafe,
  dateToISODateOnly,
  toLocalISOStringDate,
};
// src/lib/dateUtils.ts
// Utilitários para manipulação de datas sem problemas de timezone

/**
 * Converte uma string de data do input (YYYY-MM-DD) para ISO string
 * mantendo a data local sem conversão de timezone
 * 
 * PROBLEMA: new Date('2024-11-30') converte para UTC, pode virar 2024-11-29
 * SOLUÇÃO: Adiciona T00:00:00 para forçar horário local
 * 
 * @param dateString - String no formato YYYY-MM-DD
 * @returns ISO string com data local (YYYY-MM-DDTHH:mm:ss)
 */
export const dateInputToISO = (dateString: string): string => {
  if (!dateString) return '';
  // Input type="date" retorna YYYY-MM-DD
  // Adicionar T00:00:00 para manter a data local
  return `${dateString}T00:00:00`;
};

/**
 * Converte ISO string para o formato do input date (YYYY-MM-DD)
 * 
 * @param isoString - ISO string ou null
 * @returns String no formato YYYY-MM-DD
 */
export const isoToDateInput = (isoString: string | null | undefined): string => {
  if (!isoString) return '';
  // Extrair apenas YYYY-MM-DD do ISO string
  return isoString.split('T')[0];
};

/**
 * Converte um objeto Date para ISO string mantendo a data local
 * 
 * PROBLEMA: date.toISOString() converte para UTC
 * SOLUÇÃO: Usar componentes locais da data
 * 
 * @param date - Objeto Date
 * @returns ISO string com data/hora local
 */
export const dateToLocalISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

/**
 * Converte um objeto Date para ISO string apenas com a data (00:00:00)
 * mantendo a data local sem conversão de timezone
 * 
 * @param date - Objeto Date
 * @returns ISO string com data local e hora 00:00:00
 */
export const dateToLocalDateOnlyISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}T00:00:00`;
};

/**
 * Converte objeto Date do Calendário shadcn/ui para ISO string
 * O calendário retorna Date com hora 00:00:00 local
 * 
 * @param date - Date do calendário ou undefined
 * @returns ISO string ou undefined
 */
export const calendarDateToISO = (date: Date | undefined): string | undefined => {
  if (!date) return undefined;
  return dateToLocalDateOnlyISO(date);
};

/**
 * Cria um objeto Date a partir de uma string YYYY-MM-DD
 * sem problemas de timezone
 * 
 * @param dateString - String no formato YYYY-MM-DD
 * @returns Objeto Date com hora local 00:00:00
 */
export const createLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

/**
 * Formata data para exibição (DD/MM/YYYY)
 * 
 * @param isoString - ISO string ou Date
 * @returns String formatada DD/MM/YYYY
 */
export const formatDateBR = (isoString: string | Date | null | undefined): string => {
  if (!isoString) return '';
  
  const date = typeof isoString === 'string' ? new Date(isoString) : isoString;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Compara duas datas ignorando o horário
 * 
 * @param date1 - Primeira data (string ou Date)
 * @param date2 - Segunda data (string ou Date)
 * @returns true se as datas forem iguais (mesmo dia)
 */
export const isSameDateIgnoreTime = (
  date1: string | Date | null | undefined,
  date2: string | Date | null | undefined
): boolean => {
  if (!date1 || !date2) return false;
  
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/**
 * Obtém a data de hoje no formato YYYY-MM-DD
 * 
 * @returns String no formato YYYY-MM-DD
 */
export const getTodayDateInput = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Obtém a data/hora atual em ISO string local
 * 
 * @returns ISO string com data/hora local
 */
export const getNowLocalISO = (): string => {
  return dateToLocalISO(new Date());
};
