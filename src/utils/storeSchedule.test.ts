import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTimeToMinutes,
  calculateScheduleDuration,
  checkStoreOpenStatus,
  getLebanonTimeParts,
} from './storeSchedule.ts';

test('parseTimeToMinutes parses 24h and 12h formats', () => {
  assert.equal(parseTimeToMinutes('08:00'), 480);
  assert.equal(parseTimeToMinutes('01:00'), 60);
  assert.equal(parseTimeToMinutes('13:30'), 810);
  assert.equal(parseTimeToMinutes('8:00 AM'), 480);
  assert.equal(parseTimeToMinutes('1:00 AM'), 60);
});

test('calculateScheduleDuration calculates accurate 17-hour continuous operation for 8:00 AM to 1:00 AM', () => {
  const result = calculateScheduleDuration('08:00', '01:00');
  assert.equal(result.durationHours, 17);
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

test('checkStoreOpenStatus handles overnight midnight hours and calculates minutes until change', () => {
  // Mock date at 11:30 PM (23:30)
  const eveningDate = new Date('2026-10-15T23:30:00Z');
  // Mock date at 12:30 AM (00:30)
  const afterMidnightDate = new Date('2026-10-16T00:30:00Z');
  // Mock date at 3:00 AM (03:00)
  const closedMorningDate = new Date('2026-10-16T03:00:00Z');

  const schedule = {
    openTime: '08:00',
    closeTime: '01:00',
    timezone: 'UTC', // test with UTC for deterministic assertions
  };

  const eveningStatus = checkStoreOpenStatus(schedule, eveningDate);
  assert.equal(eveningStatus.isOpen, true);
  assert.equal(eveningStatus.durationHours, 17);
  assert.equal(eveningStatus.operatingHoursLabel, 'Open 17 hours');
  // From 23:30 to 01:00 is 90 minutes
  assert.equal(eveningStatus.minutesUntilChange, 90);
  assert.ok(eveningStatus.timeRemainingTextEn.includes('1h 30m'));

  const midnightStatus = checkStoreOpenStatus(schedule, afterMidnightDate);
  assert.equal(midnightStatus.isOpen, true);
  // From 00:30 to 01:00 is 30 minutes
  assert.equal(midnightStatus.minutesUntilChange, 30);
  assert.ok(midnightStatus.timeRemainingTextEn.includes('30m'));

  const closedStatus = checkStoreOpenStatus(schedule, closedMorningDate);
  assert.equal(closedStatus.isOpen, false);
  // From 03:00 to 08:00 is 5 hours = 300 minutes
  assert.equal(closedStatus.minutesUntilChange, 300);
  assert.ok(closedStatus.timeRemainingTextEn.includes('5h'));
});
