/**
 * Scala Cinextdoor Parser
 * Parser for Scala cinema schedule format (with German dates in images)
 *
 * Scala format typically includes:
 * - German weekday names (Mo, Di, Mi, Do, Fr, Sa, So)
 * - German date formats (DD.MM.YY)
 * - Film title with version info
 * - Duration in minutes
 * - May have dates embedded in images (needs OCR in production)
 */

import type { Parser, ParsedFilmData } from '@/types/database.types';
import { BaseParser, ParserConfig, SheetParseContext } from './base';
import {
  getCellString,
  parseDurationToMinutes,
  extractAgeRating,
  removeAgeRating,
  normalizeWeekday,
  parseShowTimes,
  replaceGermanWeekdays,
  WEEKDAY_NAMES_DE,
} from './utils';

export class ScalaCinextdoorParser extends BaseParser {
  private filmColIndex = 0;
  private weekdayColumnMap: Map<string, number> = new Map();
  private headerRowIndex = -1;

  constructor(parser: Parser, config: ParserConfig = {}) {
    super(parser, {
      weekStartDay: 3, // Wednesday (may vary for German cinemas)
      ...config,
    });
  }

  /**
   * Find header row with German weekday names
   */
  protected findHeaderRow(rows: unknown[][]): number {
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const row = rows[i];
      let weekdayCount = 0;

      for (const cell of row) {
        const cellValue = getCellString(cell).toLowerCase();

        // Check German weekdays
        if (
          cellValue.startsWith('mo') ||
          cellValue.startsWith('di') ||
          cellValue.startsWith('mi') ||
          cellValue.startsWith('do') ||
          cellValue.startsWith('fr') ||
          cellValue.startsWith('sa') ||
          cellValue.startsWith('so')
        ) {
          weekdayCount++;
        }
      }

      if (weekdayCount >= 5) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Detect column layout with German weekday detection
   */
  protected detectColumnLayout(headerRow: unknown[]): void {
    this.weekdayColumnMap.clear();

    for (let i = 0; i < headerRow.length; i++) {
      const cellValue = getCellString(headerRow[i]);
      const lowerValue = cellValue.toLowerCase();

      // Check for film column
      if (
        lowerValue.includes('film') ||
        lowerValue.includes('titel') ||
        lowerValue === 'title'
      ) {
        this.filmColIndex = i;
      }

      // Check for German weekday (possibly with date)
      // Patterns: "Mi", "Mi 04.06", "Mittwoch", "Mi. 04.06.2024"
      for (const [german, english] of Object.entries(WEEKDAY_NAMES_DE)) {
        if (lowerValue.startsWith(german)) {
          this.weekdayColumnMap.set(english, i);
          break;
        }
      }
    }

    // Default film column to 0 if not found
    if (this.weekdayColumnMap.size > 0 && this.filmColIndex === 0) {
      const firstWeekdayCol = Math.min(...Array.from(this.weekdayColumnMap.values()));
      if (firstWeekdayCol > 0) {
        this.filmColIndex = 0;
      }
    }
  }

  /**
   * Extract dates from German header cells
   */
  protected extractDatesFromHeader(headerRow: unknown[]): Map<string, Date> {
    const dates = new Map<string, Date>();
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < headerRow.length; i++) {
      const cellValue = getCellString(headerRow[i]);

      // German date pattern: "Mi. 04.06" or "Mi 04.06.24"
      for (const [german, english] of Object.entries(WEEKDAY_NAMES_DE)) {
        const pattern = new RegExp(
          `^${german}[.\\s]*?(\\d{1,2})\\.(\\d{1,2})(?:\\.(\\d{2,4}))?`,
          'i'
        );
        const match = cellValue.match(pattern);

        if (match) {
          const day = parseInt(match[1], 10);
          const month = parseInt(match[2], 10);
          let year = currentYear;

          if (match[3]) {
            year = parseInt(match[3], 10);
            if (year < 100) year += 2000;
          }

          dates.set(english, new Date(year, month - 1, day));
          break;
        }
      }
    }

    return dates;
  }

  /**
   * Override date range detection for German format
   */
  protected detectDateRange(
    rows: unknown[][],
    context: import('./base').ParserContext
  ): { start: Date; end: Date } | undefined {
    // Check for explicit date range in German format
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i];
      for (const cell of row) {
        const cellStr = getCellString(cell);

        // German date range: "04.06. - 10.06." or "vom 04.06. bis 10.06."
        const germanRangeMatch = cellStr.match(
          /(?:vom\s*)?(\d{1,2})\.(\d{1,2})\.?(?:(\d{2,4}))?\s*(?:[-–—]|bis)\s*(\d{1,2})\.(\d{1,2})\.?(?:(\d{2,4}))?/i
        );

        if (germanRangeMatch) {
          const year = germanRangeMatch[3]
            ? parseInt(germanRangeMatch[3], 10) < 100
              ? 2000 + parseInt(germanRangeMatch[3], 10)
              : parseInt(germanRangeMatch[3], 10)
            : new Date().getFullYear();

          const startDay = parseInt(germanRangeMatch[1], 10);
          const startMonth = parseInt(germanRangeMatch[2], 10);
          const endDay = parseInt(germanRangeMatch[4], 10);
          const endMonth = parseInt(germanRangeMatch[5], 10);

          let endYear = year;
          if (endMonth < startMonth) {
            endYear = year + 1;
          }

          return {
            start: new Date(year, startMonth - 1, startDay),
            end: new Date(endYear, endMonth - 1, endDay),
          };
        }
      }
    }

    // Try to extract from header dates
    const headerRow = this.headerRowIndex >= 0 ? rows[this.headerRowIndex] : rows[0];
    const headerDates = this.extractDatesFromHeader(headerRow as unknown[]);

    if (headerDates.size > 0) {
      const dates = Array.from(headerDates.values()).sort((a, b) => a.getTime() - b.getTime());
      return {
        start: dates[0],
        end: dates[dates.length - 1],
      };
    }

    return undefined;
  }

  protected findFilmStartRow(rows: unknown[][]): number {
    this.headerRowIndex = this.findHeaderRow(rows);
    if (this.headerRowIndex < 0) {
      this.headerRowIndex = 0;
    }

    this.detectColumnLayout(rows[this.headerRowIndex] as unknown[]);
    return this.headerRowIndex + 1;
  }

  protected isFilmRow(row: unknown[]): boolean {
    if (row.length < 2) return false;

    const filmCell = getCellString(row[this.filmColIndex] || row[0]);
    if (!filmCell || filmCell.length < 2) return false;

    const lowerFilm = filmCell.toLowerCase();

    // Skip header-like rows
    if (
      lowerFilm.includes('film') ||
      lowerFilm.includes('titel') ||
      lowerFilm.includes('programm') ||
      lowerFilm.includes('woche') ||
      lowerFilm.includes('scala')
    ) {
      return false;
    }

    // Check for German weekday names (to skip date headers)
    for (const german of Object.keys(WEEKDAY_NAMES_DE)) {
      if (lowerFilm.startsWith(german)) {
        return false;
      }
    }

    return filmCell.length > 3;
  }

  /**
   * Parse film info from Scala format
   * May include German version strings (OV, OmU, DF)
   */
  protected parseFilmInfo(filmCell: string): {
    title: string;
    director: string | null;
    year: number | null;
    duration: string | null;
    durationMinutes: number | null;
    versionString: string | null;
    ageRating: string | null;
  } {
    let remaining = filmCell.trim();

    // Extract FSK rating (German age rating)
    let ageRating: string | null = null;
    const fskMatch = remaining.match(/\bFSK\s*(\d+)\b/i);
    if (fskMatch) {
      ageRating = `FSK ${fskMatch[1]}`;
      remaining = remaining.replace(fskMatch[0], '').trim();
    } else {
      ageRating = extractAgeRating(remaining);
      remaining = removeAgeRating(remaining);
    }

    // Extract German version strings (OV, OmU, OmeU, DF)
    let versionString: string | null = null;
    const versionMatch = remaining.match(/[-–—\s]?\s*(OV|OmU|OmeU|DF|dt\. Fassung|deutsche Fassung)$/i);
    if (versionMatch) {
      versionString = versionMatch[1].trim();
      remaining = remaining.slice(0, remaining.lastIndexOf(versionMatch[0])).trim();
    }

    // Extract duration
    let duration: string | null = null;
    let durationMinutes: number | null = null;

    const durationMatch = remaining.match(/[-–—\s]\s*(\d+\s*[Mm]in\.?|\d+['′]|\d+:\d{2})/);
    if (durationMatch) {
      duration = durationMatch[1];
      durationMinutes = parseDurationToMinutes(duration);
      remaining = remaining.replace(durationMatch[0], '').trim();
    }

    // Extract director and year
    let director: string | null = null;
    let year: number | null = null;

    const metaMatch = remaining.match(/\(([^)]+,\s*\d{4})\)$/);
    if (metaMatch) {
      const parts = metaMatch[1].split(',');
      director = parts.slice(0, -1).join(',').trim();
      year = parseInt(parts[parts.length - 1].trim(), 10);
      remaining = remaining.replace(metaMatch[0], '').trim();
    } else {
      const yearMatch = remaining.match(/\((\d{4})\)$/);
      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
        remaining = remaining.replace(yearMatch[0], '').trim();
      }
    }

    // Clean up
    remaining = remaining.replace(/[-–—]\s*$/, '').trim();

    return {
      title: remaining,
      director,
      year,
      duration,
      durationMinutes,
      versionString,
      ageRating,
    };
  }

  protected parseFilmRow(
    row: unknown[],
    allRows: unknown[][],
    rowIndex: number,
    context: SheetParseContext
  ): ParsedFilmData | null {
    const rawTitle = getCellString(row[this.filmColIndex] || row[0]);
    if (!rawTitle) return null;

    const filmInfo = this.parseFilmInfo(rawTitle);
    const languageInfo = this.extractLanguageGerman(filmInfo.versionString, context);
    const formatMatch = this.matchFormat(rawTitle, context.formats);
    const techMatch = this.matchTechnology(rawTitle, context.technologies);

    let movieName = filmInfo.title;
    if (formatMatch) {
      movieName = movieName.replace(new RegExp(`\\b${formatMatch.code}\\b`, 'gi'), '').trim();
    }
    if (techMatch) {
      movieName = movieName.replace(new RegExp(`\\b${techMatch.code}\\b`, 'gi'), '').trim();
    }
    movieName = this.extractMovieName(movieName);

    // Update weekDayDates from header
    if (this.headerRowIndex >= 0) {
      const headerDates = this.extractDatesFromHeader(allRows[this.headerRowIndex] as unknown[]);
      for (const [weekday, date] of headerDates) {
        context.weekDayDates.set(weekday, date);
      }
    }

    const screeningShows = this.parseShowTimesFromRow(row, this.weekdayColumnMap, context);
    const startWeekDate = context.dateRange?.start || null;

    return {
      importTitle: rawTitle,
      movieName,
      movieEdition: formatMatch?.name || techMatch?.name || null,
      language: languageInfo.spoken?.name || null,
      languageCode: languageInfo.spoken?.code || null,
      subtitleLanguages: languageInfo.subtitles.map(l => l.code),
      formatTechnology: {
        formatStr: formatMatch?.code || techMatch?.code || null,
        formatObj: formatMatch,
        technologyObj: techMatch,
      },
      duration: filmInfo.duration,
      durationMinutes: filmInfo.durationMinutes,
      ageRating: filmInfo.ageRating,
      director: filmInfo.director,
      year: filmInfo.year,
      productionCountry: null,
      availableCountries: [],
      versionString: filmInfo.versionString,
      tags: [],
      description: null,
      startWeekDate,
      screeningShows,
    };
  }

  /**
   * Extract language from German version strings
   */
  protected extractLanguageGerman(
    versionString: string | null,
    context: SheetParseContext
  ): { spoken: import('@/types/database.types').Language | null; subtitles: import('@/types/database.types').Language[] } {
    if (!versionString) {
      return { spoken: null, subtitles: [] };
    }

    const result: { spoken: import('@/types/database.types').Language | null; subtitles: import('@/types/database.types').Language[] } = {
      spoken: null,
      subtitles: [],
    };

    const lowerVersion = versionString.toLowerCase();

    // OV = Original Version (original language)
    if (lowerVersion === 'ov') {
      // Spoken is original - will be determined from movie metadata
      result.spoken = null;
    }

    // OmU = Original mit Untertiteln (Original with subtitles, usually German)
    if (lowerVersion === 'omu' || lowerVersion === 'omeu') {
      result.spoken = null; // Original language
      const german = context.languages.find(l => l.code.toLowerCase() === 'de');
      if (german) {
        result.subtitles.push(german);
      }
    }

    // DF = Deutsche Fassung (German dubbed)
    if (lowerVersion === 'df' || lowerVersion.includes('deutsche fassung') || lowerVersion.includes('dt. fassung')) {
      result.spoken = context.languages.find(l => l.code.toLowerCase() === 'de') || null;
    }

    // If nothing matched, try the base class method
    if (!result.spoken && result.subtitles.length === 0) {
      return this.extractLanguage(versionString, context);
    }

    return result;
  }
}
