/**
 * Parser Utilities
 * Helper functions for parsing Excel cinema schedules
 */

import type { Format, Technology, Language } from '@/types/database.types';

// ============================================================================
// WEEKDAY MAPPINGS
// ============================================================================

export const WEEKDAY_NAMES_EN: Record<string, string> = {
  mon: 'Mon',
  monday: 'Mon',
  tue: 'Tue',
  tues: 'Tue',
  tuesday: 'Tue',
  wed: 'Wed',
  wednesday: 'Wed',
  thu: 'Thu',
  thurs: 'Thu',
  thursday: 'Thu',
  fri: 'Fri',
  friday: 'Fri',
  sat: 'Sat',
  saturday: 'Sat',
  sun: 'Sun',
  sunday: 'Sun',
};

export const WEEKDAY_NAMES_FR: Record<string, string> = {
  lun: 'Mon',
  lundi: 'Mon',
  mar: 'Tue',
  mardi: 'Tue',
  mer: 'Wed',
  mercredi: 'Wed',
  jeu: 'Thu',
  jeudi: 'Thu',
  ven: 'Fri',
  vendredi: 'Fri',
  sam: 'Sat',
  samedi: 'Sat',
  dim: 'Sun',
  dimanche: 'Sun',
};

export const WEEKDAY_NAMES_DE: Record<string, string> = {
  mo: 'Mon',
  montag: 'Mon',
  di: 'Tue',
  dienstag: 'Tue',
  mi: 'Wed',
  mittwoch: 'Wed',
  do: 'Thu',
  donnerstag: 'Thu',
  fr: 'Fri',
  freitag: 'Fri',
  sa: 'Sat',
  samstag: 'Sat',
  so: 'Sun',
  sonntag: 'Sun',
};

export const ALL_WEEKDAY_NAMES: Record<string, string> = {
  ...WEEKDAY_NAMES_EN,
  ...WEEKDAY_NAMES_FR,
  ...WEEKDAY_NAMES_DE,
};

export const WEEKDAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ============================================================================
// MONTH MAPPINGS
// ============================================================================

export const MONTH_NAMES_EN: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

export const MONTH_NAMES_FR: Record<string, number> = {
  janvier: 1, janv: 1,
  février: 2, fevrier: 2, fév: 2, fev: 2,
  mars: 3,
  avril: 4, avr: 4,
  mai: 5,
  juin: 6,
  juillet: 7, juil: 7,
  août: 8, aout: 8,
  septembre: 9, sept: 9,
  octobre: 10, oct: 10,
  novembre: 11, nov: 11,
  décembre: 12, decembre: 12, déc: 12, dec: 12,
};

export const MONTH_NAMES_DE: Record<string, number> = {
  januar: 1, jan: 1,
  februar: 2, feb: 2,
  märz: 3, marz: 3, mär: 3, mar: 3,
  april: 4, apr: 4,
  mai: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10,
  november: 11, nov: 11,
  dezember: 12, dez: 12,
};

export const ALL_MONTH_NAMES: Record<string, number> = {
  ...MONTH_NAMES_EN,
  ...MONTH_NAMES_FR,
  ...MONTH_NAMES_DE,
};

// ============================================================================
// TIME UTILITIES
// ============================================================================

/**
 * Convert time string to decimal float
 * "14:30" -> 14.5
 * "9:00" -> 9.0
 */
export function timeStringToFloat(timeStr: string): number | null {
  if (!timeStr) return null;

  // Handle various formats
  const cleaned = timeStr.trim().replace(/\s+/g, '');

  // Try HH:MM:SS or HH:MM format
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours + minutes / 60;
}

/**
 * Convert decimal float to time string
 * 14.5 -> "14:30"
 */
export function floatToTimeString(timeFloat: number): string {
  const hours = Math.floor(timeFloat);
  const minutes = Math.round((timeFloat - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Parse duration string to minutes
 * "162'" -> 162
 * "162 min" -> 162
 * "2:42" -> 162
 * "2h 42m" -> 162
 */
export function parseDurationToMinutes(durationStr: string): number | null {
  if (!durationStr) return null;

  const cleaned = durationStr.trim();

  // Format: "162'" or "162 min" or "162min"
  const minMatch = cleaned.match(/^(\d+)\s*['′]?\s*(?:min(?:utes?)?)?$/i);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }

  // Format: "2:42" (hours:minutes)
  const hmMatch = cleaned.match(/^(\d+):(\d{2})$/);
  if (hmMatch) {
    return parseInt(hmMatch[1], 10) * 60 + parseInt(hmMatch[2], 10);
  }

  // Format: "2h 42m" or "2h42" or "2 h 42 m"
  const hMatch = cleaned.match(/^(\d+)\s*h(?:ours?)?\s*(?:(\d+)\s*m(?:in(?:utes?)?)?)?$/i);
  if (hMatch) {
    const hours = parseInt(hMatch[1], 10);
    const mins = hMatch[2] ? parseInt(hMatch[2], 10) : 0;
    return hours * 60 + mins;
  }

  // Try just a number
  const numMatch = cleaned.match(/^(\d+)$/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  return null;
}

/**
 * Convert minutes to "H:MM" format
 * 162 -> "2:42"
 */
export function minutesToDurationString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
}

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Parse a date string in various formats
 * Supports: "June 04, 2025", "04 June, 2025", "04/06/2025", "2025-06-04", etc.
 */
export function parseFlexibleDate(dateStr: string, defaultYear?: number): Date | null {
  if (!dateStr) return null;

  const cleaned = dateStr.trim();
  const year = defaultYear || new Date().getFullYear();

  // ISO format: 2025-06-04
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }

  // German format: DD.MM.YY or DD.MM.YYYY
  const germanMatch = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (germanMatch) {
    let y = parseInt(germanMatch[3], 10);
    if (y < 100) y += 2000;
    return new Date(y, parseInt(germanMatch[2], 10) - 1, parseInt(germanMatch[1], 10));
  }

  // European format: DD/MM/YYYY
  const euMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (euMatch) {
    return new Date(parseInt(euMatch[3]), parseInt(euMatch[2]) - 1, parseInt(euMatch[1]));
  }

  // Text format: "June 04, 2025" or "04 June, 2025" or "June 04"
  const textMatch = cleaned.match(/^(?:(\d{1,2})\s+)?([a-zA-ZéûôàäöüÉÛÔÀÄÖÜß]+)(?:\s+(\d{1,2}))?,?\s*(\d{4})?$/i);
  if (textMatch) {
    const day = parseInt(textMatch[1] || textMatch[3], 10);
    const monthName = textMatch[2].toLowerCase();
    const parsedYear = textMatch[4] ? parseInt(textMatch[4], 10) : year;

    const month = ALL_MONTH_NAMES[monthName];
    if (month && day) {
      return new Date(parsedYear, month - 1, day);
    }
  }

  // Alternative text format: "Month Day, Year"
  const textMatch2 = cleaned.match(/^([a-zA-ZéûôàäöüÉÛÔÀÄÖÜß]+)\s+(\d{1,2}),?\s*(\d{4})?$/i);
  if (textMatch2) {
    const monthName = textMatch2[1].toLowerCase();
    const day = parseInt(textMatch2[2], 10);
    const parsedYear = textMatch2[3] ? parseInt(textMatch2[3], 10) : year;

    const month = ALL_MONTH_NAMES[monthName];
    if (month && day) {
      return new Date(parsedYear, month - 1, day);
    }
  }

  return null;
}

/**
 * Generate array of dates between start and end (inclusive)
 */
export function generateDateRange(startDate: Date, endDate: Date): Array<{ date: Date; weekDay: string }> {
  const dates: Array<{ date: Date; weekDay: string }> = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
    const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    dates.push({
      date: new Date(current),
      weekDay: weekDayNames[dayOfWeek],
    });

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Get the start of the week for a given date
 */
export function getWeekStartDate(date: Date, weekStartDay: number = 3): Date {
  // weekStartDay: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, etc.
  const dayOfWeek = date.getDay();
  const diff = (dayOfWeek - weekStartDay + 7) % 7;
  const result = new Date(date);
  result.setDate(result.getDate() - diff);
  return result;
}

/**
 * Normalize a weekday name to standard format
 */
export function normalizeWeekday(weekday: string): string | null {
  const normalized = ALL_WEEKDAY_NAMES[weekday.toLowerCase()];
  return normalized || null;
}

// ============================================================================
// TEXT UTILITIES
// ============================================================================

/**
 * Extract age rating from a string
 * "(12)" -> "12"
 * "[PG-13]" -> "PG-13"
 * "FSK 12" -> "FSK 12"
 */
export function extractAgeRating(text: string): string | null {
  if (!text) return null;

  // Match parentheses: (12), (PG-13), etc.
  const parenMatch = text.match(/\(([^()]+)\)\s*$/);
  if (parenMatch) {
    return parenMatch[1].trim();
  }

  // Match brackets: [12], [PG-13], etc.
  const bracketMatch = text.match(/\[([^\[\]]+)\]\s*$/);
  if (bracketMatch) {
    return bracketMatch[1].trim();
  }

  return null;
}

/**
 * Remove age rating from a string
 */
export function removeAgeRating(text: string): string {
  return text
    .replace(/\s*\([^()]+\)\s*$/, '')
    .replace(/\s*\[[^\[\]]+\]\s*$/, '')
    .trim();
}

/**
 * Extract format keywords from a film string
 */
export function extractFormatKeywords(
  filmStr: string,
  knownFormats: string[]
): { formatStr: string; cleanedTitle: string } {
  if (!filmStr || !knownFormats.length) {
    return { formatStr: '', cleanedTitle: filmStr };
  }

  const foundFormats: Array<{ format: string; position: number }> = [];
  const lowerFilm = filmStr.toLowerCase();

  for (const format of knownFormats) {
    const lowerFormat = format.toLowerCase();
    const position = lowerFilm.indexOf(lowerFormat);
    if (position !== -1) {
      foundFormats.push({ format, position });
    }
  }

  // Sort by position to maintain order
  foundFormats.sort((a, b) => a.position - b.position);

  // Deduplicate
  const uniqueFormats = [...new Set(foundFormats.map(f => f.format))];

  // Remove format words from title
  let cleanedTitle = filmStr;
  for (const format of uniqueFormats) {
    // Use word boundary matching
    const regex = new RegExp(`\\b${escapeRegExp(format)}\\b`, 'gi');
    cleanedTitle = cleanedTitle.replace(regex, '').trim();
  }

  // Clean up extra spaces
  cleanedTitle = cleanedTitle.replace(/\s+/g, ' ').trim();

  return {
    formatStr: uniqueFormats.join(' '),
    cleanedTitle,
  };
}

/**
 * Escape special regex characters
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract language from the first word of a title
 * "English Avatar 3D" -> { language: "english", title: "Avatar 3D" }
 */
export function extractLanguagePrefix(
  title: string,
  knownLanguages: string[]
): { language: string | null; cleanedTitle: string } {
  if (!title) return { language: null, cleanedTitle: title };

  const words = title.trim().split(/\s+/);
  if (words.length < 2) return { language: null, cleanedTitle: title };

  const firstWord = words[0].toLowerCase();

  // Check if first word is a known language
  const matchedLang = knownLanguages.find(
    lang => lang.toLowerCase() === firstWord || lang.toLowerCase().startsWith(firstWord)
  );

  if (matchedLang) {
    return {
      language: firstWord,
      cleanedTitle: words.slice(1).join(' '),
    };
  }

  return { language: null, cleanedTitle: title };
}

/**
 * Parse show times from a cell value
 * Handles: "14:00\n19:00", "14:00, 19:00", "14:00 19:00"
 */
export function parseShowTimes(cellValue: string | null | undefined): string[] {
  if (!cellValue) return [];

  const times: string[] = [];
  const cleaned = String(cellValue).trim();

  // Split by newlines, commas, or multiple spaces
  const parts = cleaned.split(/[\n,]+|\s{2,}/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Extract time pattern HH:MM or H:MM
    const timeMatch = trimmed.match(/\b(\d{1,2}:\d{2})\b/);
    if (timeMatch) {
      times.push(timeMatch[1]);
    }
  }

  return times;
}

/**
 * Combine a date and time into a localized datetime
 */
export function combineDateAndTime(
  date: Date,
  timeStr: string,
  timezone: string = 'Europe/Luxembourg'
): Date {
  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);

  // Create a date string in the target timezone
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const timeStrFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

  // Create datetime in local timezone
  const datetime = new Date(`${dateStr}T${timeStrFormatted}`);

  // Note: For proper timezone handling, we'd need a library like date-fns-tz
  // For now, we'll return the local datetime and handle timezone in the database
  return datetime;
}

// ============================================================================
// TRANSLATION HELPERS
// ============================================================================

/**
 * Replace French weekday names with English
 */
export function replaceFrenchWeekdays(text: string): string {
  let result = text;
  for (const [french, english] of Object.entries(WEEKDAY_NAMES_FR)) {
    const regex = new RegExp(`\\b${french}\\b`, 'gi');
    result = result.replace(regex, english);
  }
  return result;
}

/**
 * Replace German weekday names with English
 */
export function replaceGermanWeekdays(text: string): string {
  let result = text;
  for (const [german, english] of Object.entries(WEEKDAY_NAMES_DE)) {
    const regex = new RegExp(`\\b${german}\\b`, 'gi');
    result = result.replace(regex, english);
  }
  return result;
}

// ============================================================================
// EXCEL CELL UTILITIES
// ============================================================================

/**
 * Get cell value as string
 */
export function getCellString(cell: unknown): string {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'string') return cell.trim();
  if (typeof cell === 'number') return String(cell);
  if (typeof cell === 'object' && 'v' in (cell as object)) {
    return getCellString((cell as { v: unknown }).v);
  }
  return String(cell).trim();
}

/**
 * Check if a row contains any non-empty cells
 */
export function isRowEmpty(row: unknown[]): boolean {
  return row.every(cell => {
    const value = getCellString(cell);
    return value === '';
  });
}

/**
 * Find a column index by header name
 */
export function findColumnIndex(headerRow: unknown[], headerName: string): number {
  for (let i = 0; i < headerRow.length; i++) {
    const cellValue = getCellString(headerRow[i]).toLowerCase();
    if (cellValue === headerName.toLowerCase()) {
      return i;
    }
  }
  return -1;
}

/**
 * Check if a cell contains a weekday name
 */
export function isWeekdayCell(cell: unknown): boolean {
  const value = getCellString(cell).toLowerCase();
  return value in ALL_WEEKDAY_NAMES;
}

/**
 * Check if text contains a hyphen (used for date range detection)
 */
export function containsDateRange(text: string): boolean {
  return /[-–—]/.test(text);
}

/**
 * Check if text contains time patterns
 */
export function containsTimePatttern(text: string): boolean {
  return /\b\d{1,2}:\d{2}\b/.test(text);
}
