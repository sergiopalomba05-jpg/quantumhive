import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_LABELS: Record<string, string> = {
  active: 'activo',
  paused: 'pausado',
  blocked: 'bloqueado',
  shipped: 'publicado',
  done: 'hecho',
  review: 'en revisión',
  todo: 'pendiente',
  in_progress: 'en progreso',
  draft: 'borrador',
  archived: 'archivado',
  failed: 'fallido',
  connected: 'conectado',
  disconnected: 'desconectado',
  needs_auth: 'requiere autorización',
  needs_backend: 'requiere backend',
  mock: 'simulado',
  future: 'futuro',
  critical: 'crítico',
  high: 'alto',
  medium: 'medio',
  low: 'bajo',
  'parking lot': 'parking lot',
  real: 'real'
};

export function tStatus(status?: string): string {
  if (!status) return '';
  const label = STATUS_LABELS[status.toLowerCase()];
  if (label) return label;
  return status.replace(/_/g, ' ');
}

export function t(key: string): string {
  if (!key) return '';
  const val = STATUS_LABELS[key.toLowerCase()];
  return val ? val : key;
}
