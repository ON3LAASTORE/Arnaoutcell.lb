/**
 * Store Opening Hours & Real-time Schedule Utilities
 * 
 * Target Schedule:
 * ON AlAA STORE — Online Store based in Chouf, Lebanon
 * Open 17 hours (08:00 AM to 01:00 AM next day continuous, 7 days a week)
 * Timezone: Asia/Beirut (Lebanon Standard Time / Daylight Time)
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
  currentLebanonTime: string;
  currentLebanonTimeFormatted: string;
  currentMinutes: number;
  minutesUntilChange: number;
  timeRemainingTextEn: string;
  timeRemainingTextAr: string;
  operatingHoursLabel: string;
  operatingHoursLabelAr: string;
}

/**
 * Parses time string like "08:00" or "8:00 AM" into total minutes from midnight (0 - 1439)
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  
  // Format "08:00" or "01:00" or "8:00 AM"
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
 * Gets current hour, minute and formatted time string in Lebanon timezone (Asia/Beirut)
 */
export function getLebanonTimeParts(now: Date = new Date(), timezone = 'Asia/Beirut'): {
  currentMinutes: number;
  formatted12h: string;
  hour: number;
  minute: number;
} {
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
      const m = parseInt(mPart, 10);
      const currentMinutes = h * 60 + m;

      // 12-hour formatted representation
      const h12 = h % 12 || 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      const formatted12h = `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;

      return { currentMinutes, formatted12h, hour: h, minute: m };
    }
  } catch {
    // Fallback if Intl timeZone not supported
  }

  const h = now.getHours();
  const m = now.getMinutes();
  const h12 = h % 12 || 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  return {
    currentMinutes: h * 60 + m,
    formatted12h: `${h12}:${m.toString().padStart(2, '0')} ${ampm}`,
    hour: h,
    minute: m,
  };
}

/**
 * Checks if the store is currently open based on target timezone (Asia/Beirut).
 * Handles overnight schedules accurately so 12:30 AM is recognized as OPEN when closing is 1:00 AM.
 * Calculates remaining time until closing or opening.
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

  // Get current hour and minute in configured store timezone (Asia/Beirut)
  const { currentMinutes, formatted12h } = getLebanonTimeParts(now, timezone);

  let isOpen = false;
  let minutesUntilChange = 0;

  if (spansMidnight) {
    // Open from openMinutes (480 = 8 AM) through midnight (1440) until closeMinutes (60 = 1 AM)
    if (currentMinutes >= openMinutes) {
      // Current time is between 8:00 AM and 11:59 PM
      isOpen = true;
      minutesUntilChange = (1440 - currentMinutes) + closeMinutes;
    } else if (currentMinutes < closeMinutes) {
      // Current time is between 12:00 AM midnight and 1:00 AM closing
      isOpen = true;
      minutesUntilChange = closeMinutes - currentMinutes;
    } else {
      // Current time is between 1:00 AM and 8:00 AM (store is closed)
      isOpen = false;
      minutesUntilChange = openMinutes - currentMinutes;
    }
  } else {
    isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    if (isOpen) {
      minutesUntilChange = closeMinutes - currentMinutes;
    } else {
      if (currentMinutes < openMinutes) {
        minutesUntilChange = openMinutes - currentMinutes;
      } else {
        minutesUntilChange = (1440 - currentMinutes) + openMinutes;
      }
    }
  }

  // Format remaining time in hours & minutes
  const remainingHours = Math.floor(minutesUntilChange / 60);
  const remainingMins = minutesUntilChange % 60;

  const timeRemainingTextEn = isOpen
    ? remainingHours > 0
      ? `Closes in ${remainingHours}h ${remainingMins}m`
      : `Closes in ${remainingMins}m`
    : remainingHours > 0
      ? `Opens in ${remainingHours}h ${remainingMins}m`
      : `Opens in ${remainingMins}m`;

  const timeRemainingTextAr = isOpen
    ? remainingHours > 0
      ? `يغلق خلال ${remainingHours} س و ${remainingMins} د`
      : `يغلق خلال ${remainingMins} دقيقة`
    : remainingHours > 0
      ? `يفتح خلال ${remainingHours} س و ${remainingMins} د`
      : `يفتح خلال ${remainingMins} دقيقة`;

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
    : `Opens at ${openDisplayEn} in the morning (${durationHours} Hours Daily)`;

  const nextEventTextAr = isOpen
    ? `مفتوح اليوم حتى ${closeDisplayAr} (${durationHours} ساعة يومياً)`
    : `يفتح عند ${openDisplayAr} صباحاً (${durationHours} ساعة يومياً)`;

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
    currentLebanonTime: formatted12h,
    currentLebanonTimeFormatted: formatted12h,
    currentMinutes,
    minutesUntilChange,
    timeRemainingTextEn,
    timeRemainingTextAr,
    operatingHoursLabel: `Open ${durationHours} hours`,
    operatingHoursLabelAr: `مفتوح ${durationHours} ساعة`,
  };
}
