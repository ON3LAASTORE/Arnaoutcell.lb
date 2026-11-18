import { AdminRole } from '../types';

export type ActivityLogCategory = 'security' | 'settings' | 'catalog' | 'orders' | 'content';

export type ActivityLogSeverity = 'info' | 'warning' | 'critical';

export interface ActivityLogActor {
  name: string;
  username: string;
  role: AdminRole | 'system';
  email?: string;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  titleEn: string;
  titleAr: string;
  category: ActivityLogCategory;
  severity: ActivityLogSeverity;
  target: string;
  details: string;
  actor: ActivityLogActor;
  source: 'server' | 'client' | 'firestore';
  timestamp: string;
}

export interface ActivityLogFilterOptions {
  search?: string;
  category?: 'all' | ActivityLogCategory;
  severity?: 'all' | ActivityLogSeverity;
}

export interface ActivityLogSummary {
  totalEvents: number;
  securityEvents: number;
  passwordChanges: number;
  criticalAlerts: number;
  last24HoursCount: number;
}

const SENSITIVE_FIELD_PATTERN = /(password|passwd|pass|secret|token|apikey|api_key)\s*[:=]\s*[^\s,;]+/gi;

/**
 * Redacts potential secrets/credentials and enforces strict string length boundaries
 * so audit entries never leak sensitive credentials or exceed Firestore limits.
 */
export function redactSensitiveText(value: unknown, maxLength: number = 480): string {
  if (typeof value !== 'string') return '';
  const cleaned = value
    .replace(SENSITIVE_FIELD_PATTERN, '$1=[REDACTED]')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 3))}...`;
}

export function sanitizeAuditId(rawId?: string): string {
  const base = (rawId || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
  const trimmed = base.slice(0, 120);
  return trimmed.length > 0 ? trimmed : `audit-${Date.now()}`;
}

export function normalizeCategory(cat: unknown): ActivityLogCategory {
  if (
    cat === 'security' ||
    cat === 'settings' ||
    cat === 'catalog' ||
    cat === 'orders' ||
    cat === 'content'
  ) {
    return cat;
  }
  return 'security';
}

export function normalizeSeverity(sev: unknown): ActivityLogSeverity {
  if (sev === 'info' || sev === 'warning' || sev === 'critical') {
    return sev;
  }
  return 'info';
}

export function normalizeActorRole(role: unknown): AdminRole | 'system' {
  if (
    role === 'super_admin' ||
    role === 'product_manager' ||
    role === 'order_manager' ||
    role === 'inventory_manager' ||
    role === 'system'
  ) {
    return role;
  }
  return 'super_admin';
}

export interface CreateActivityLogInput {
  id?: string;
  action: string;
  titleEn: string;
  titleAr?: string;
  category: ActivityLogCategory;
  severity: ActivityLogSeverity;
  target?: string;
  details?: string;
  actor?: Partial<ActivityLogActor>;
  source?: 'server' | 'client' | 'firestore';
  timestamp?: string;
}

export function sanitizeActivityLogEntry(input: CreateActivityLogInput): ActivityLogEntry {
  const isoTime =
    input.timestamp && !Number.isNaN(Date.parse(input.timestamp))
      ? new Date(input.timestamp).toISOString()
      : new Date().toISOString();

  const titleEn = redactSensitiveText(input.titleEn || input.action || 'Admin Event', 200);
  const titleAr = redactSensitiveText(input.titleAr || titleEn, 200);

  return {
    id: sanitizeAuditId(input.id),
    action: redactSensitiveText(input.action || 'admin_event', 80).toLowerCase().replace(/\s+/g, '_'),
    titleEn,
    titleAr,
    category: normalizeCategory(input.category),
    severity: normalizeSeverity(input.severity),
    target: redactSensitiveText(input.target || 'System', 160),
    details: redactSensitiveText(input.details || '', 480),
    actor: {
      name: redactSensitiveText(input.actor?.name || 'Administrator', 100),
      username: redactSensitiveText(input.actor?.username || 'admin', 64),
      role: normalizeActorRole(input.actor?.role),
      ...(input.actor?.email ? { email: redactSensitiveText(input.actor.email, 128) } : {}),
    },
    source: input.source === 'server' || input.source === 'firestore' ? input.source : 'client',
    timestamp: isoTime,
  };
}

export function sortActivityLogsDesc(logs: readonly ActivityLogEntry[]): ActivityLogEntry[] {
  return [...logs].sort((a, b) => {
    const tA = Date.parse(a.timestamp) || 0;
    const tB = Date.parse(b.timestamp) || 0;
    return tB - tA;
  });
}

export function mergeActivityLogs(
  primary: readonly ActivityLogEntry[],
  secondary: readonly ActivityLogEntry[],
  limit: number = 500
): ActivityLogEntry[] {
  const seen = new Map<string, ActivityLogEntry>();
  for (const item of primary) {
    if (item && item.id) seen.set(item.id, item);
  }
  for (const item of secondary) {
    if (item && item.id && !seen.has(item.id)) {
      seen.set(item.id, item);
    }
  }
  return sortActivityLogsDesc(Array.from(seen.values())).slice(0, Math.max(1, limit));
}

export function filterActivityLogs(
  logs: readonly ActivityLogEntry[],
  filters: ActivityLogFilterOptions = {}
): ActivityLogEntry[] {
  const search = (filters.search || '').trim().toLowerCase();
  const category = filters.category || 'all';
  const severity = filters.severity || 'all';

  return sortActivityLogsDesc(
    logs.filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false;
      if (severity !== 'all' && entry.severity !== severity) return false;

      if (!search) return true;

      const haystack = [
        entry.action,
        entry.titleEn,
        entry.titleAr,
        entry.target,
        entry.details,
        entry.actor.name,
        entry.actor.username,
        entry.actor.role,
        entry.actor.email || '',
        entry.category,
        entry.severity,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    })
  );
}

export function summarizeActivityLogs(
  logs: readonly ActivityLogEntry[],
  nowMs: number = Date.now()
): ActivityLogSummary {
  const cutoffMs = nowMs - 24 * 60 * 60 * 1000;
  let securityEvents = 0;
  let passwordChanges = 0;
  let criticalAlerts = 0;
  let last24HoursCount = 0;

  for (const entry of logs) {
    if (entry.category === 'security') securityEvents++;
    if (entry.action === 'password_changed') passwordChanges++;
    if (entry.severity === 'critical') criticalAlerts++;
    const ts = Date.parse(entry.timestamp);
    if (!Number.isNaN(ts) && ts >= cutoffMs) {
      last24HoursCount++;
    }
  }

  return {
    totalEvents: logs.length,
    securityEvents,
    passwordChanges,
    criticalAlerts,
    last24HoursCount,
  };
}

export function formatAuditTimestamp(isoString: string, lang: 'en' | 'ar' = 'en'): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return isoString;
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-LB' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(parsed);
  } catch {
    return parsed.toISOString();
  }
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function activityLogsToCsv(logs: readonly ActivityLogEntry[]): string {
  const headers = [
    'ID',
    'Timestamp',
    'Action',
    'Title',
    'Category',
    'Severity',
    'Actor Name',
    'Actor Username',
    'Actor Role',
    'Target',
    'Details',
    'Source',
  ];

  const rows = sortActivityLogsDesc(logs).map((entry) =>
    [
      entry.id,
      entry.timestamp,
      entry.action,
      entry.titleEn,
      entry.category,
      entry.severity,
      entry.actor.name,
      entry.actor.username,
      entry.actor.role,
      entry.target,
      entry.details,
      entry.source,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
