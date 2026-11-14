import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTimeToMinutes,
  calculateScheduleDuration,
  checkStoreOpenStatus,
  getLebanonTimeParts,
  formatTimeDisplay,
  migrateOpeningSchedule,
} from './storeSchedule.ts';

test('parseTimeToMinutes parses 24h and 12h formats', () => {
  assert.equal(parseTimeToMinutes('10:00'), 600);
  assert.equal(parseTimeToMinutes('01:00'), 60);
  assert.equal(parseTimeToMinutes('13:30'), 810);
  assert.equal(parseTimeToMinutes('10:00 AM'), 600);
  assert.equal(parseTimeToMinutes('1:00 AM'), 60);
});

test('formatTimeDisplay formats 24h strings cleanly in EN and AR', () => {
  assert.equal(formatTimeDisplay('10:00', 'en'), '10:00 AM');
  assert.equal(formatTimeDisplay('01:00', 'en'), '1:00 AM');
  assert.equal(formatTimeDisplay('10:00', 'ar'), '10:00 ص');
  assert.equal(formatTimeDisplay('01:00', 'ar'), '1:00 ص');
});

test('calculateScheduleDuration calculates accurate 15-hour continuous operation for 10:00 AM to 1:00 AM', () => {
  const result = calculateScheduleDuration('10:00', '01:00');
  assert.equal(result.durationHours, 15);
  assert.equal(result.spansMidnight, true);
});

test('calculateScheduleDuration handles normal day hours', () => {
  const result = calculateScheduleDuration('09:00', '21:00');
  assert.equal(result.durationHours, 12);
  assert.equal(result.spansMidnight, false);
});

test('getLebanonTimeParts parses timezone correctly', () => {
  const testDate = new Date('2026-10-15T12:00:00Z');
  const parts = getLebanonTimeParts(testDate, 'UTC');
  assert.equal(parts.hour, 12);
  assert.equal(parts.minute, 0);
  assert.equal(parts.currentMinutes, 720);
});

test('checkStoreOpenStatus handles 10:00 AM - 1:00 AM overnight hours and boundaries', () => {
  const schedule = {
    openTime: '10:00',
    closeTime: '01:00',
    timezone: 'UTC',
  };

  // 11:30 PM -> OPEN, 90 mins left
  const eveningStatus = checkStoreOpenStatus(schedule, new Date('2026-10-15T23:30:00Z'));
  assert.equal(eveningStatus.isOpen, true);
  assert.equal(eveningStatus.durationHours, 15);
  assert.equal(eveningStatus.operatingHoursLabel, 'Open 15 hours');
  assert.equal(eveningStatus.minutesUntilChange, 90);
  assert.ok(eveningStatus.timeRemainingTextEn.includes('1h 30m'));
  assert.equal(eveningStatus.formattedHoursEn, 'Monday – Sunday: 10:00 AM – 1:00 AM');

  // 12:30 AM -> OPEN, 30 mins left
  const midnightStatus = checkStoreOpenStatus(schedule, new Date('2026-10-16T00:30:00Z'));
  assert.equal(midnightStatus.isOpen, true);
  assert.equal(midnightStatus.minutesUntilChange, 30);
  assert.ok(midnightStatus.timeRemainingTextEn.includes('30m'));

  // 01:00 AM -> CLOSED (exact closing boundary), 9 hours until 10:00 AM
  const exactCloseStatus = checkStoreOpenStatus(schedule, new Date('2026-10-16T01:00:00Z'));
  assert.equal(exactCloseStatus.isOpen, false);
  assert.equal(exactCloseStatus.minutesUntilChange, 540);

  // 09:30 AM -> CLOSED (previously open under 08:00, now closed until 10:00 AM)
  const beforeOpenStatus = checkStoreOpenStatus(schedule, new Date('2026-10-16T09:30:00Z'));
  assert.equal(beforeOpenStatus.isOpen, false);
  assert.equal(beforeOpenStatus.minutesUntilChange, 30);
  assert.ok(beforeOpenStatus.statusBadgeEn.includes('10:00 AM'));

  // 10:00 AM -> OPEN (exact opening boundary)
  const exactOpenStatus = checkStoreOpenStatus(schedule, new Date('2026-10-16T10:00:00Z'));
  assert.equal(exactOpenStatus.isOpen, true);
});

test('checkStoreOpenStatus defaults to 10:00 AM – 1:00 AM when no schedule is passed', () => {
  const beforeTenStatus = checkStoreOpenStatus(
    { timezone: 'UTC' },
    new Date('2026-10-16T09:00:00Z')
  );
  assert.equal(beforeTenStatus.isOpen, false);
  assert.equal(beforeTenStatus.durationHours, 15);
  assert.equal(beforeTenStatus.openMinutes, 600);
  assert.equal(beforeTenStatus.closeMinutes, 60);
});

test('migrateOpeningSchedule upgrades legacy 08:00 / 17-hour schedules to 10:00 AM – 1:00 AM', () => {
  const defaultSchedule = {
    openTime: '10:00',
    closeTime: '01:00',
    daysOpenEn: 'Monday – Sunday',
    daysOpenAr: 'الإثنين – الأحد',
    displayHours: true,
    customMessageEn: 'Online Store Based in Chouf • Delivery Available to All Lebanon | Orders & Support 10:00 AM – 1:00 AM',
    customMessageAr: 'متجر إلكتروني مقره الشوف • التوصيل متاح لجميع مناطق لبنان | طلبات ودعم: 10:00 ص – 1:00 ص',
    timezone: 'Asia/Beirut',
  };

  const migrated = migrateOpeningSchedule(
    {
      openTime: '08:00',
      closeTime: '01:00',
      customMessageEn: 'OPEN EVERY DAY — 17 HOURS DAILY',
      customMessageAr: 'مفتوح يومياً — 17 ساعة يومياً',
      timezone: 'Asia/Beirut',
    },
    defaultSchedule
  );

  assert.equal(migrated.openTime, '10:00');
  assert.equal(migrated.closeTime, '01:00');
  assert.ok(!migrated.customMessageEn.includes('17'));
  assert.ok(migrated.customMessageEn.includes('10:00 AM'));
  assert.ok(!migrated.customMessageAr.includes('17'));
});
