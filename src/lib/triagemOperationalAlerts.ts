export type AlertLevel = 'ok' | 'warning' | 'critical';

export type TriagemThresholds = {
  pendingWarning: number;
  pendingCritical: number;
  unreadWarning: number;
  unreadCritical: number;
  sloTarget: number;
  sloWarningFloor: number;
};

export const DEFAULT_TRIAGEM_THRESHOLDS: TriagemThresholds = {
  pendingWarning: 20,
  pendingCritical: 40,
  unreadWarning: 5,
  unreadCritical: 10,
  sloTarget: 98,
  sloWarningFloor: 95,
};

export function getQueueAlertLevel(
  totalPending: number,
  unreadPending: number,
  thresholds: TriagemThresholds = DEFAULT_TRIAGEM_THRESHOLDS,
): AlertLevel {
  if (totalPending >= thresholds.pendingCritical || unreadPending >= thresholds.unreadCritical) {
    return 'critical';
  }
  if (totalPending >= thresholds.pendingWarning || unreadPending >= thresholds.unreadWarning) {
    return 'warning';
  }
  return 'ok';
}

export function getSloAlertLevel(
  sloCompliance: number,
  thresholds: TriagemThresholds = DEFAULT_TRIAGEM_THRESHOLDS,
): AlertLevel {
  if (sloCompliance >= thresholds.sloTarget) return 'ok';
  if (sloCompliance >= thresholds.sloWarningFloor) return 'warning';
  return 'critical';
}
