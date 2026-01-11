/**
 * Base Parser Class
 * Abstract base class for all cinema schedule parsers
 */

import * as XLSX from 'xlsx';
import type {
  Parser,
  Cinema,
  CinemaGroup,
  Format,
  Technology,
  Language,
  ParsedFilmData,
  ParsedSheetResult,
  ParserResult,
  LanguageMappingConfig,
  LanguageMappingLine,
} from '@/types/database.types';
import {
  timeStringToFloat,
  parseDurationToMinutes,
  parseFlexibleDate,
  getCellString,
  isRowEmpty,
  parseShowTimes,
  normalizeWeekday,
  extractAgeRating,
  removeAgeRating,
  getWeekStartDate,
  WEEKDAY_ORDER,
} from './utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ParserConfig {
  // General options
  skipHeaderRows?: number;
  dateHeaderRow?: number;
  filmColumnIndex?: number;
  durationColumnIndex?: number;

  // Date range detection
  dateRangeMode?: 'header' | 'filename' | 'manual';
  weekStartDay?: number; // 0=Sunday, 1=Monday, etc., 3=Wednesday (default for Luxembourg)

  // Language detection
  languageColumnIndex?: number;
  languageMappingId?: string;

  // Format detection
  formatKeywords?: string[];
  technologyKeywords?: string[];

  // Custom options per parser
  [key: string]: unknown;
}

export interface ParserContext {
  cinema?: Cinema;
  cinemaGroup?: CinemaGroup;
  formats: Format[];
  technologies: Technology[];
  languages: Language[];
  languageMapping?: LanguageMappingConfig & { lines: LanguageMappingLine[] };
  weekStartDay: number;
  timezone: string;
}

export interface SheetParseContext extends ParserContext {
  sheetName: string;
  dateRange?: { start: Date; end: Date };
  weekDayDates: Map<string, Date>; // Maps "Mon", "Tue" etc. to actual dates
}

// ============================================================================
// BASE PARSER CLASS
// ============================================================================

export abstract class BaseParser {
  protected parser: Parser;
  protected config: ParserConfig;

  constructor(parser: Parser, config: ParserConfig = {}) {
    this.parser = parser;
    this.config = {
      skipHeaderRows: 0,
      weekStartDay: 3, // Wednesday by default (Luxembourg cinema weeks)
      formatKeywords: ['3D', 'IMAX', '4DX', 'ATMOS', 'Dolby', 'D-BOX', 'ScreenX'],
      technologyKeywords: ['Laser', 'IMAX', 'Dolby Cinema', 'Dolby Atmos', '4DX'],
      ...config,
    };
  }

  /**
   * Main entry point - parse an Excel file
   */
  async parseFile(
    file: Buffer | ArrayBuffer,
    context: ParserContext
  ): Promise<ParserResult> {
    const result: ParserResult = {
      success: false,
      sheets: [],
      errors: [],
      warnings: [],
    };

    try {
      // Read the workbook
      const workbook = XLSX.read(file, { type: 'buffer', cellDates: true });

      if (!workbook.SheetNames.length) {
        result.errors.push('No sheets found in Excel file');
        return result;
      }

      // Parse each sheet
      for (const sheetName of workbook.SheetNames) {
        try {
          const sheet = workbook.Sheets[sheetName];
          const sheetResult = await this.parseSheet(sheet, sheetName, context);
          result.sheets.push(sheetResult);

          // Aggregate errors and warnings
          result.errors.push(...sheetResult.errors.map(e => `[${sheetName}] ${e}`));
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`[${sheetName}] Failed to parse sheet: ${errorMsg}`);
        }
      }

      // Determine overall success
      result.success = result.sheets.some(s => s.films.length > 0);

      if (!result.success && result.errors.length === 0) {
        result.errors.push('No films found in any sheet');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to read Excel file: ${errorMsg}`);
    }

    return result;
  }

  /**
   * Parse a single sheet
   */
  protected async parseSheet(
    sheet: XLSX.WorkSheet,
    sheetName: string,
    context: ParserContext
  ): Promise<ParsedSheetResult> {
    const result: ParsedSheetResult = {
      sheetName,
      films: [],
      cinema: context.cinema,
      errors: [],
    };

    // Convert sheet to array of rows
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

    if (rows.length === 0) {
      result.errors.push('Sheet is empty');
      return result;
    }

    // Detect date range from headers
    const dateRange = this.detectDateRange(rows, context);
    if (dateRange) {
      result.dateRange = dateRange;
    }

    // Build weekday to date mapping
    const weekDayDates = this.buildWeekDayDateMap(dateRange, context.weekStartDay);

    // Create sheet-specific context
    const sheetContext: SheetParseContext = {
      ...context,
      sheetName,
      dateRange,
      weekDayDates,
    };

    // Find film rows and parse them
    const filmStartRow = this.findFilmStartRow(rows);
    if (filmStartRow < 0) {
      result.errors.push('Could not find film data in sheet');
      return result;
    }

    // Parse each film row
    for (let i = filmStartRow; i < rows.length; i++) {
      const row = rows[i] as unknown[];

      if (isRowEmpty(row)) continue;

      try {
        const filmData = this.parseFilmRow(row, rows, i, sheetContext);
        if (filmData) {
          result.films.push(filmData);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(`Row ${i + 1}: ${errorMsg}`);
      }
    }

    return result;
  }

  /**
   * Detect date range from sheet headers or content
   * Override in subclasses for format-specific detection
   */
  protected detectDateRange(
    rows: unknown[][],
    context: ParserContext
  ): { start: Date; end: Date } | undefined {
    // Default implementation looks for date patterns in first few rows
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i];
      for (const cell of row) {
        const cellStr = getCellString(cell);

        // Look for date range patterns like "04/06 - 10/06" or "June 4-10, 2025"
        const rangeMatch = cellStr.match(
          /(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?\s*[-–—]\s*(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?/
        );

        if (rangeMatch) {
          const year = new Date().getFullYear();
          const startMonth = parseInt(rangeMatch[2], 10);
          const startDay = parseInt(rangeMatch[1], 10);
          const endMonth = parseInt(rangeMatch[5], 10);
          const endDay = parseInt(rangeMatch[4], 10);

          return {
            start: new Date(year, startMonth - 1, startDay),
            end: new Date(year, endMonth - 1, endDay),
          };
        }

        // Look for single date with weekday, e.g., "Wednesday June 4"
        const singleDateMatch = cellStr.match(
          /(?:mer|wed|mercredi|wednesday|mittwoch).*?(\d{1,2})\s+([a-zA-ZéûôàäöüÉÛÔÀÄÖÜßè]+)(?:\s+(\d{4}))?/i
        );

        if (singleDateMatch) {
          const parsedDate = parseFlexibleDate(
            `${singleDateMatch[1]} ${singleDateMatch[2]} ${singleDateMatch[3] || new Date().getFullYear()}`
          );

          if (parsedDate) {
            // Assume 7-day week from Wednesday to Tuesday
            const endDate = new Date(parsedDate);
            endDate.setDate(endDate.getDate() + 6);

            return {
              start: parsedDate,
              end: endDate,
            };
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Build mapping from weekday names to actual dates
   */
  protected buildWeekDayDateMap(
    dateRange: { start: Date; end: Date } | undefined,
    weekStartDay: number
  ): Map<string, Date> {
    const map = new Map<string, Date>();

    if (!dateRange) return map;

    // Generate dates from start to end
    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      const dayOfWeek = current.getDay();
      const weekDayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
      map.set(weekDayName, new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return map;
  }

  /**
   * Find the row where film data starts
   * Override in subclasses for format-specific detection
   */
  protected findFilmStartRow(rows: unknown[][]): number {
    // Look for patterns that indicate film data
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      if (this.isFilmRow(row)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Check if a row contains film data
   * Override in subclasses for format-specific detection
   */
  protected isFilmRow(row: unknown[]): boolean {
    // Default: look for rows with non-empty first cell and time patterns
    if (row.length < 2) return false;

    const firstCell = getCellString(row[0]);
    if (!firstCell || firstCell.length < 3) return false;

    // Check if any cell contains time patterns
    for (const cell of row) {
      const cellStr = getCellString(cell);
      if (/\d{1,2}:\d{2}/.test(cellStr)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Parse a single film row
   * Must be implemented by subclasses
   */
  protected abstract parseFilmRow(
    row: unknown[],
    allRows: unknown[][],
    rowIndex: number,
    context: SheetParseContext
  ): ParsedFilmData | null;

  // ============================================================================
  // HELPER METHODS FOR SUBCLASSES
  // ============================================================================

  /**
   * Extract movie name from import title, removing format/version info
   */
  protected extractMovieName(importTitle: string): string {
    let name = importTitle;

    // Remove common suffixes
    name = name.replace(/\s*[-–]\s*(3D|IMAX|4DX|Dolby|ATMOS|VO|VF|OV|OmU|st\s*\w+).*$/i, '');

    // Remove version strings in parentheses
    name = name.replace(/\s*\([^)]*\)\s*$/, '');

    // Remove age ratings
    name = removeAgeRating(name);

    return name.trim();
  }

  /**
   * Match format keywords to Format objects
   */
  protected matchFormat(
    text: string,
    formats: Format[]
  ): Format | null {
    const lowerText = text.toLowerCase();

    for (const format of formats) {
      if (lowerText.includes(format.code.toLowerCase()) ||
          lowerText.includes(format.name.toLowerCase())) {
        return format;
      }
    }

    return null;
  }

  /**
   * Match technology keywords to Technology objects
   */
  protected matchTechnology(
    text: string,
    technologies: Technology[]
  ): Technology | null {
    const lowerText = text.toLowerCase();

    for (const tech of technologies) {
      if (lowerText.includes(tech.code.toLowerCase()) ||
          lowerText.includes(tech.name.toLowerCase())) {
        return tech;
      }
    }

    return null;
  }

  /**
   * Extract language from version string using language mapping
   */
  protected extractLanguage(
    versionString: string,
    context: SheetParseContext
  ): { spoken: Language | null; subtitles: Language[] } {
    const result: { spoken: Language | null; subtitles: Language[] } = {
      spoken: null,
      subtitles: [],
    };

    if (!versionString) return result;

    // Try language mapping first
    if (context.languageMapping?.lines) {
      const lowerVersion = versionString.toLowerCase().trim();

      for (const line of context.languageMapping.lines) {
        if (line.version_string.toLowerCase() === lowerVersion) {
          // Find spoken language
          if (line.spoken_language_id) {
            result.spoken = context.languages.find(l => l.id === line.spoken_language_id) || null;
          }

          // Find subtitle languages
          if (line.subtitle_language_ids?.length) {
            result.subtitles = line.subtitle_language_ids
              .map(id => context.languages.find(l => l.id === id))
              .filter((l): l is Language => l !== undefined);
          }

          return result;
        }
      }
    }

    // Fallback: pattern matching
    const lowerVersion = versionString.toLowerCase();

    // Original Version patterns
    if (/\b(vo|ov|omu|ome)\b/i.test(lowerVersion)) {
      // VO = Original Version (spoken language is original)
      result.spoken = null; // Will need to be determined from movie metadata
    }

    // French Version
    if (/\bvf\b/i.test(lowerVersion)) {
      result.spoken = context.languages.find(l => l.code.toLowerCase() === 'fr') || null;
    }

    // German Version
    if (/\b(vd|df)\b/i.test(lowerVersion)) {
      result.spoken = context.languages.find(l => l.code.toLowerCase() === 'de') || null;
    }

    // Subtitle detection
    const stMatch = lowerVersion.match(/st\s*([a-z&/]+)/i);
    if (stMatch) {
      const stCodes = stMatch[1].split(/[&\/,]/).map(s => s.trim().toLowerCase());

      for (const code of stCodes) {
        const lang = context.languages.find(
          l => l.code.toLowerCase() === code || l.code.toLowerCase().startsWith(code)
        );
        if (lang) {
          result.subtitles.push(lang);
        }
      }
    }

    return result;
  }

  /**
   * Parse show times from row cells based on weekday columns
   */
  protected parseShowTimesFromRow(
    row: unknown[],
    weekdayColumnMap: Map<string, number>,
    context: SheetParseContext
  ): ParsedFilmData['screeningShows'] {
    const shows: ParsedFilmData['screeningShows'] = [];

    for (const [weekday, colIndex] of weekdayColumnMap) {
      const cellValue = getCellString(row[colIndex]);
      const times = parseShowTimes(cellValue);
      const date = context.weekDayDates.get(weekday);

      if (!date) continue;

      for (const time of times) {
        const timeFloat = timeStringToFloat(time);
        if (timeFloat === null) continue;

        // Create datetime
        const datetime = new Date(date);
        const [hours, minutes] = time.split(':').map(Number);
        datetime.setHours(hours, minutes, 0, 0);

        shows.push({
          date,
          time,
          timeFloat,
          datetime,
        });
      }
    }

    return shows;
  }

  /**
   * Detect weekday columns from header row
   */
  protected detectWeekdayColumns(headerRow: unknown[]): Map<string, number> {
    const map = new Map<string, number>();

    for (let i = 0; i < headerRow.length; i++) {
      const cellValue = getCellString(headerRow[i]).toLowerCase();
      const normalized = normalizeWeekday(cellValue);

      if (normalized && !map.has(normalized)) {
        map.set(normalized, i);
      }
    }

    return map;
  }

  /**
   * Get parser name
   */
  getName(): string {
    return this.parser.name;
  }

  /**
   * Get parser slug
   */
  getSlug(): string {
    return this.parser.slug;
  }
}
