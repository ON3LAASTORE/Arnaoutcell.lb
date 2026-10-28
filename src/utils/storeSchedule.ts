/**
 * Store Opening Hours & Real-time Schedule Utilities
 * 
 * Handles overnight schedules (e.g. 08:00 AM to 01:00 AM next day = 17 continuous hours),
 * timezone adjustments, duration calculations, and live open/closed badges.
 */

import type { StoreOpeningSchedule } from '../types/index.ts';

export interface ScheduleCalculationResult {
  isOpen: boolean;
  durationHours: number;
  openMinutes: number;
  closeMinutes: number;
  spansMidnight: boolean;
  statusBadgeEn: string;
  statusBadgeAr: string;
  nextEventTextEn: string;
  nextEventTextAr: string;
  formattedHoursEn: string;
  formattedHoursAr: string;
}

/**
 * Parses time string like "08:00" or "8:00 AM" into total minutes from midnight (0 - 1439)
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  
  // Format "08:00" or "01:00"
  const colonMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (colonMatch) {
    let hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    const meridiem = colonMatch[3]?.toUpperCase();

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  return 0;
}

/**
 * Calculates continuous operating duration in hours.
 * For example:
 * - Open 08:00 (8 AM) to Close 01:00 (1 AM next day):
 *   openMinutes = 480 (8h), closeMinutes = 60 (1h)
 *   Duration = (1440 - 480) + 60 = 960 + 60 = 1020 minutes = 17.0 hours!
 */
export function calculateScheduleDuration(openTime: string, closeTime: string): { durationHours: number; spansMidnight: boolean } {
  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);

  let totalMinutes = 0;
  let spansMidnight = false;

  if (closeMinutes <= openMinutes) {
    // Spans past midnight
    spansMidnight = true;
    totalMinutes = (1440 - openMinutes) + closeMinutes;
  } else {
    totalMinutes = closeMinutes - openMinutes;
  }

  const durationHours = Math.round((totalMinutes / 60) * 10) / 10;
  return { durationHours, spansMidnight };
}

/**
 * Formats 24h string "08:00" to "8:00 AM" and "01:00" to "1:00 AM"
 */
export function formatTimeDisplay(timeStr: string, lang: 'en' | 'ar' = 'en'): string {
  const mins = parseTimeToMinutes(timeStr);
  const hours24 = Math.floor(mins / 60);
  const minutes = mins % 60;

  const hours12 = hours24 % 12 || 12;
  const ampm = hours24 < 12 ? (lang === 'ar' ? 'ص' : 'AM') : (lang === 'ar' ? 'م' : 'PM');
  const minPad = minutes === 0 ? '' : `:${minutes.toString().padStart(2, '0')}`;

  return `${hours12}${minPad} ${ampm}`;
}

/**
 * Checks if the store is currently open based on target timezone (e.g. Asia/Beirut).
 * Handles overnight schedules accurately so 12:30 AM is recognized as OPEN when closing is 1:00 AM.
 */
export function checkStoreOpenStatus(
  schedule?: Partial<StoreOpeningSchedule>,
  now: Date = new Date()
): ScheduleCalculationResult {
  const openTime = schedule?.openTime || '08:00';
  const closeTime = schedule?.closeTime || '01:00';
  const timezone = schedule?.timezone || 'Asia/Beirut';
  const daysOpenEn = schedule?.daysOpenEn || 'Monday – Sunday';
  const daysOpenAr = schedule?.daysOpenAr || 'الإثنين – الأحد';

  const { durationHours, spansMidnight } = calculateScheduleDuration(openTime, closeTime);
  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);

  // Get current hour and minute in configured store timezone
  let currentMinutes = now.getHours() * 60 + now.getMinutes();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hPart = parts.find((p) => p.type === 'hour')?.value;
    const mPart = parts.find((p) => p.type === 'minute')?.value;
    if (hPart !== undefined && mPart !== undefined) {
      let h = parseInt(hPart, 10);
      if (h === 24) h = 0;
      currentMinutes = h * 60 + parseInt(mPart, 10);
    }
  } catch {
    // fallback to local time
    currentMinutes = now.getHours() * 60 + now.getMinutes();
  }

  let isOpen = false;
  if (spansMidnight) {
    // Open from openMinutes (e.g. 480 = 8 AM) through midnight until closeMinutes (e.g. 60 = 1 AM)
    isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  } else {
    isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  const openDisplayEn = formatTimeDisplay(openTime, 'en');
  const closeDisplayEn = formatTimeDisplay(closeTime, 'en');
  const openDisplayAr = formatTimeDisplay(openTime, 'ar');
  const closeDisplayAr = formatTimeDisplay(closeTime, 'ar');

  const formattedHoursEn = `${daysOpenEn}: ${openDisplayEn} – ${closeDisplayEn}`;
  const formattedHoursAr = `${daysOpenAr}: ${openDisplayAr} – ${closeDisplayAr}`;

  const statusBadgeEn = isOpen
    ? `OPEN NOW • Closes at ${closeDisplayEn}`
    : `CLOSED NOW • Opens at ${openDisplayEn}`;

  const statusBadgeAr = isOpen
    ? `مفتوح الآن • يغلق عند ${closeDisplayAr}`
    : `مغلق الآن • يفتح عند ${openDisplayAr}`;

  const nextEventTextEn = isOpen
    ? `Open today until ${closeDisplayEn} (${durationHours} Hours Daily)`
    : `Opens at ${openDisplayEn} tomorrow morning`;

  const nextEventTextAr = isOpen
    ? `مفتوح اليوم حتى ${closeDisplayAr} (${durationHours} ساعة يومياً)`
    : `يفتح عند ${openDisplayAr} صباحاً`;

  return {
    isOpen,
    durationHours,
    openMinutes,
    closeMinutes,
    spansMidnight,
    statusBadgeEn,
    statusBadgeAr,
    nextEventTextEn,
    nextEventTextAr,
    formattedHoursEn,
    formattedHoursAr,
  };
}
