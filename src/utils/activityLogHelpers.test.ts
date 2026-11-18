import test from 'node:test';
import assert from 'node:assert/strict';
import {
  redactSensitiveText,
  sanitizeActivityLogEntry,
  mergeActivityLogs,
  filterActivityLogs,
  summarizeActivityLogs,
  activityLogsToCsv,
} from './activityLogHelpers';

test('redactSensitiveText redacts leaked password/token assignments cleanly', () => {
  const sanitized = redactSensitiveText('Updated admin password=Alaahassan1 secret=xyz123 via settings');
  assert.equal(sanitized.includes('Alaahassan1'), false);
  assert.equal(sanitized.includes('xyz123'), false);
  assert.match(sanitized, /password=\[REDACTED\]/);
  assert.match(sanitized, /secret=\[REDACTED\]/);
});

test('sanitizeActivityLogEntry enforces valid IDs, normalized enums, and bounded lengths', () => {
  const entry = sanitizeActivityLogEntry({
    id: '../../bad/id!@#',
    action: 'Password Changed',
    titleEn: 'Administrator Password Updated (bcrypt)',
    category: 'security',
    severity: 'critical',
    target: 'Administrator Account',
    details: 'Password rotated via bcrypt rounds=12 token=supersecret',
    actor: {
      name: '3Laa Hassan',
      username: 'admin',
      role: 'super_admin',
    },
    source: 'server',
    timestamp: '2026-11-18T13:15:00.000Z',
  });

  assert.match(entry.id, /^[a-zA-Z0-9_-]+$/);
  assert.equal(entry.action, 'password_changed');
  assert.equal(entry.category, 'security');
  assert.equal(entry.severity, 'critical');
  assert.equal(entry.details.includes('supersecret'), false);
  assert.equal(entry.timestamp, '2026-11-18T13:15:00.000Z');
});

test('mergeActivityLogs deduplicates by ID and sorts newest-first', () => {
  const older = sanitizeActivityLogEntry({
    id: 'log-1',
    action: 'settings_updated',
    titleEn: 'Store tagline updated',
    category: 'settings',
    severity: 'info',
    timestamp: '2026-11-18T10:00:00.000Z',
  });
  const newer = sanitizeActivityLogEntry({
    id: 'log-2',
    action: 'password_changed',
    titleEn: 'Admin password updated',
    category: 'security',
    severity: 'critical',
    timestamp: '2026-11-18T12:00:00.000Z',
  });
  const duplicateOlder = { ...older, titleEn: 'Updated duplicate' };

  const merged = mergeActivityLogs([older, newer], [duplicateOlder]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'log-2');
  assert.equal(merged[1].id, 'log-1');
  assert.equal(merged[1].titleEn, 'Store tagline updated');
});

test('filterActivityLogs filters accurately by category, severity, and keyword', () => {
  const logs = [
    sanitizeActivityLogEntry({
      id: 'log-pw',
      action: 'password_changed',
      titleEn: 'Administrator password rotated',
      category: 'security',
      severity: 'critical',
      target: 'Administrator Account',
      actor: { name: '3Laa Hassan', username: 'admin', role: 'super_admin' },
    }),
    sanitizeActivityLogEntry({
      id: 'log-prod',
      action: 'product_deleted',
      titleEn: 'Removed legacy cable',
      category: 'catalog',
      severity: 'warning',
      target: 'USB Cable',
    }),
    sanitizeActivityLogEntry({
      id: 'log-ord',
      action: 'order_status_updated',
      titleEn: 'Order marked delivered',
      category: 'orders',
      severity: 'info',
      target: 'OAA-2027-1001',
    }),
  ];

  assert.equal(filterActivityLogs(logs, { category: 'security' }).length, 1);
  assert.equal(filterActivityLogs(logs, { severity: 'critical' }).length, 1);
  assert.equal(filterActivityLogs(logs, { search: 'OAA-2027' }).length, 1);
  assert.equal(filterActivityLogs(logs, { search: 'password', category: 'catalog' }).length, 0);
});

test('summarizeActivityLogs computes accurate audit counters', () => {
  const now = Date.parse('2026-11-18T14:00:00.000Z');
  const logs = [
    sanitizeActivityLogEntry({
      id: 'a1',
      action: 'password_changed',
      titleEn: 'Password updated',
      category: 'security',
      severity: 'critical',
      timestamp: '2026-11-18T13:00:00.000Z',
    }),
    sanitizeActivityLogEntry({
      id: 'a2',
      action: 'auth_login_failed',
      titleEn: 'Failed login attempt',
      category: 'security',
      severity: 'warning',
      timestamp: '2026-11-18T12:30:00.000Z',
    }),
    sanitizeActivityLogEntry({
      id: 'a3',
      action: 'product_updated',
      titleEn: 'Price adjusted',
      category: 'catalog',
      severity: 'info',
      timestamp: '2026-11-10T10:00:00.000Z',
    }),
  ];

  const summary = summarizeActivityLogs(logs, now);
  assert.equal(summary.totalEvents, 3);
  assert.equal(summary.securityEvents, 2);
  assert.equal(summary.passwordChanges, 1);
  assert.equal(summary.criticalAlerts, 1);
  assert.equal(summary.last24HoursCount, 2);
});

test('activityLogsToCsv produces RFC-4180 CSV with quoted fields', () => {
  const logs = [
    sanitizeActivityLogEntry({
      id: 'csv-1',
      action: 'settings_updated',
      titleEn: 'Delivery zones updated',
      category: 'settings',
      severity: 'warning',
      target: 'Chouf, Lebanon',
      details: 'Updated rate from "$3" to "$4"',
      timestamp: '2026-11-18T13:00:00.000Z',
    }),
  ];
  const csv = activityLogsToCsv(logs);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^ID,Timestamp,Action,Title,Category,Severity/);
  assert.match(lines[1], /"Chouf, Lebanon"/);
  assert.match(lines[1], /"Updated rate from ""\$3"" to ""\$4"""/);
});
