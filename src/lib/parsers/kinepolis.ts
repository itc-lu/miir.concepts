/**
 * Kinepolis Parser
 * Parser for generic Kinepolis cinema schedule format
 *
 * Expected format:
 * - Header rows with date range (e.g., "04/06 - 10/06")
 * - Weekday columns (Wed, Thu, Fri, Sat, Sun, Mon, Tue)
 * - Film rows with: Title | Duration | Language | Wed times | Thu times | ...
 *
 * Sample structure:
 * Row 0: "Programme Week 23" | "" | "04/06 - 10/06"
 * Row 1: "Film" | "Duration" | "Version" | "Mer" | "Jeu" | "Ven" | "Sam" | "Dim" | "Lun" | "Mar"
 * Row 2: "Avatar 3D (12)" | "162'" | "VO st FR&NL" | "14:00\n19:00" | "14:30" | ...
 */

import type { Parser, ParsedFilmData } from '@/types/database.types';
import { BaseParser, ParserConfig, SheetParseContext } from './base';
import {
  getCellString,
  isRowEmpty,
  parseDurationToMinutes,
  extractAgeRating,
  removeAgeRating,
  timeStringToFloat,
  parseShowTimes,
  normalizeWeekday,
  WEEKDAY_ORDER,
} from './utils';

export class KinepolisParser extends BaseParser {
  // Column indices (will be detected dynamically)
  private filmColIndex = 0;
  private durationColIndex = 1;
  private versionColIndex = 2;
  private weekdayColStart = 3;
  private weekdayColumnMap: Map<string, number> = new Map();
  private headerRowIndex = 1;

  constructor(parser: Parser, config: ParserConfig = {}) {
    super(parser, {
      weekStartDay: 3, // Wednesday
      ...config,
    });
  }

  /**
   * Find the header row that contains weekday names
   */
  protected findHeaderRow(rows: unknown[][]): number {
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i];
      let weekdayCount = 0;

      for (const cell of row) {
        const cellValue = getCellString(cell).toLowerCase();
        if (normalizeWeekday(cellValue)) {
          weekdayCount++;
        }
      }

      // Require at least 5 weekday columns to be a valid header
      if (weekdayCount >= 5) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Detect column layout from header row
   */
  protected detectColumnLayout(headerRow: unknown[]): void {
    this.weekdayColumnMap.clear();

    // Find Film/Title column
    for (let i = 0; i < headerRow.length; i++) {
      const cellValue = getCellString(headerRow[i]).toLowerCase();

      if (cellValue.includes('film') || cellValue.includes('title') || cellValue.includes('titre')) {
        this.filmColIndex = i;
      } else if (cellValue.includes('dur') || cellValue.includes('length') || cellValue.includes('temps')) {
        this.durationColIndex = i;
      } else if (
        cellValue.includes('version') ||
        cellValue.includes('langue') ||
        cellValue.includes('lang')
      ) {
        this.versionColIndex = i;
      }

      // Check for weekday
      const normalized = normalizeWeekday(cellValue);
      if (normalized) {
        this.weekdayColumnMap.set(normalized, i);
        if (this.weekdayColStart > i || !this.weekdayColumnMap.size) {
          this.weekdayColStart = i;
        }
      }
    }
  }

  /**
   * Override to detect date range from Kinepolis format
   */
  protected detectDateRange(
    rows: unknown[][],
    context: import('./base').ParserContext
  ): { start: Date; end: Date } | undefined {
    // Look in first 5 rows for date range patterns
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i];
      for (const cell of row) {
        const cellStr = getCellString(cell);

        // Pattern: "04/06 - 10/06" or "04.06 - 10.06"
        const rangeMatch = cellStr.match(
          /(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?\s*[-–—]\s*(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?/
        );

        if (rangeMatch) {
          const year = rangeMatch[3]
            ? parseInt(rangeMatch[3], 10) < 100
              ? 2000 + parseInt(rangeMatch[3], 10)
              : parseInt(rangeMatch[3], 10)
            : new Date().getFullYear();

          const startDay = parseInt(rangeMatch[1], 10);
          const startMonth = parseInt(rangeMatch[2], 10);
          const endDay = parseInt(rangeMatch[4], 10);
          const endMonth = parseInt(rangeMatch[5], 10);

          // Handle year rollover (December to January)
          let endYear = year;
          if (endMonth < startMonth) {
            endYear = year + 1;
          }

          return {
            start: new Date(year, startMonth - 1, startDay),
            end: new Date(endYear, endMonth - 1, endDay),
          };
        }

        // Pattern: "Programme semaine 23" or "Week 23" with date after
        const weekMatch = cellStr.match(/(?:semaine|week)\s*(\d+)/i);
        if (weekMatch) {
          // Try to find a date in same row or next row
          for (const c2 of row) {
            const dateStr = getCellString(c2);
            const dateMatch = dateStr.match(/(\d{1,2})[\/\.](\d{1,2})/);
            if (dateMatch) {
              const day = parseInt(dateMatch[1], 10);
              const month = parseInt(dateMatch[2], 10);
              const year = new Date().getFullYear();
              const start = new Date(year, month - 1, day);
              const end = new Date(start);
              end.setDate(end.getDate() + 6);
              return { start, end };
            }
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Find first film row (after header)
   */
  protected findFilmStartRow(rows: unknown[][]): number {
    // First find the header row
    this.headerRowIndex = this.findHeaderRow(rows);
    if (this.headerRowIndex < 0) {
      // Try to guess based on structure
      this.headerRowIndex = 1;
    }

    // Detect column layout from header
    this.detectColumnLayout(rows[this.headerRowIndex] as unknown[]);

    // Film data starts after header
    return this.headerRowIndex + 1;
  }

  /**
   * Check if row contains film data
   */
  protected isFilmRow(row: unknown[]): boolean {
    if (row.length < 3) return false;

    // Check if first column has a film title (non-empty, not a header)
    const filmCell = getCellString(row[this.filmColIndex] || row[0]);
    if (!filmCell || filmCell.length < 2) return false;

    // Should not be a header keyword
    const lowerFilm = filmCell.toLowerCase();
    if (
      lowerFilm.includes('film') ||
      lowerFilm.includes('titre') ||
      lowerFilm.includes('programme') ||
      lowerFilm.includes('semaine')
    ) {
      return false;
    }

    // Check if any weekday column has times
    for (const [_, colIndex] of this.weekdayColumnMap) {
      const cellValue = getCellString(row[colIndex]);
      if (/\d{1,2}:\d{2}/.test(cellValue)) {
        return true;
      }
    }

    return true; // Assume it's a film row if title exists
  }

  /**
   * Parse a film row
   */
  protected parseFilmRow(
    row: unknown[],
    allRows: unknown[][],
    rowIndex: number,
    context: SheetParseContext
  ): ParsedFilmData | null {
    // Get film title
    const rawTitle = getCellString(row[this.filmColIndex] || row[0]);
    if (!rawTitle) return null;

    // Extract age rating
    const ageRating = extractAgeRating(rawTitle);
    const titleWithoutRating = removeAgeRating(rawTitle);

    // Get duration
    const durationStr = getCellString(row[this.durationColIndex] || row[1]);
    const durationMinutes = parseDurationToMinutes(durationStr);

    // Get version string
    const versionString = getCellString(row[this.versionColIndex] || row[2]);

    // Extract language info
    const languageInfo = this.extractLanguage(versionString, context);

    // Extract format/technology from title
    const formatMatch = this.matchFormat(rawTitle, context.formats);
    const techMatch = this.matchTechnology(rawTitle, context.technologies);

    // Clean movie name
    let movieName = titleWithoutRating;
    if (formatMatch) {
      movieName = movieName.replace(new RegExp(`\\b${formatMatch.code}\\b`, 'gi'), '').trim();
    }
    if (techMatch) {
      movieName = movieName.replace(new RegExp(`\\b${techMatch.code}\\b`, 'gi'), '').trim();
    }
    movieName = this.extractMovieName(movieName);

    // Parse show times from weekday columns
    const screeningShows = this.parseShowTimesFromRow(row, this.weekdayColumnMap, context);

    // Determine start week date
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
      duration: durationStr || null,
      durationMinutes,
      ageRating,
      director: null, // Not typically in Kinepolis format
      year: null, // Not typically in Kinepolis format
      productionCountry: null,
      availableCountries: [],
      versionString: versionString || null,
      tags: [],
      description: null,
      startWeekDate,
      screeningShows,
    };
  }
}
