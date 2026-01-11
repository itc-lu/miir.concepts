/**
 * Kinepolis France Parser - Longwy/Thionville Format
 * Parser for Kinepolis France cinemas (Longwy and Thionville)
 *
 * This format typically has:
 * - French weekday names (Mer, Jeu, Ven, Sam, Dim, Lun, Mar)
 * - French version strings (VF, VO st FR, etc.)
 * - Date format DD/MM
 * - Duration in minutes with ' suffix (e.g., "162'")
 */

import type { Parser, ParsedFilmData } from '@/types/database.types';
import { BaseParser, ParserConfig, SheetParseContext } from './base';
import {
  getCellString,
  parseDurationToMinutes,
  extractAgeRating,
  removeAgeRating,
  timeStringToFloat,
  parseShowTimes,
  normalizeWeekday,
  replaceFrenchWeekdays,
} from './utils';

export class KinepolisFranceLongwyParser extends BaseParser {
  private filmColIndex = 0;
  private durationColIndex = 1;
  private versionColIndex = 2;
  private weekdayColumnMap: Map<string, number> = new Map();
  private headerRowIndex = 1;

  constructor(parser: Parser, config: ParserConfig = {}) {
    super(parser, {
      weekStartDay: 3, // Wednesday - standard for French cinema weeks
      ...config,
    });
  }

  /**
   * Find header row with French weekday names
   */
  protected findHeaderRow(rows: unknown[][]): number {
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i];
      let weekdayCount = 0;

      for (const cell of row) {
        const cellValue = getCellString(cell).toLowerCase();
        // Check for French weekday names
        if (
          cellValue.includes('mer') ||
          cellValue.includes('jeu') ||
          cellValue.includes('ven') ||
          cellValue.includes('sam') ||
          cellValue.includes('dim') ||
          cellValue.includes('lun') ||
          cellValue.includes('mar')
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
   * Detect column layout from header row
   */
  protected detectColumnLayout(headerRow: unknown[]): void {
    this.weekdayColumnMap.clear();

    for (let i = 0; i < headerRow.length; i++) {
      const cellValue = getCellString(headerRow[i]).toLowerCase();

      if (
        cellValue.includes('film') ||
        cellValue.includes('titre') ||
        cellValue === 'titre'
      ) {
        this.filmColIndex = i;
      } else if (
        cellValue.includes('dur') ||
        cellValue.includes('temps') ||
        cellValue === 'durée'
      ) {
        this.durationColIndex = i;
      } else if (
        cellValue.includes('version') ||
        cellValue.includes('langue') ||
        cellValue === 'vo/vf'
      ) {
        this.versionColIndex = i;
      }

      // Normalize French weekday to English
      const normalized = normalizeWeekday(cellValue);
      if (normalized) {
        this.weekdayColumnMap.set(normalized, i);
      }
    }
  }

  /**
   * Detect date range from French format
   */
  protected detectDateRange(
    rows: unknown[][],
    context: import('./base').ParserContext
  ): { start: Date; end: Date } | undefined {
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i];
      for (const cell of row) {
        const cellStr = getCellString(cell);

        // Pattern: "Du 04/06 au 10/06" (French date range)
        const frenchRangeMatch = cellStr.match(
          /du\s*(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?\s*au\s*(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?/i
        );

        if (frenchRangeMatch) {
          const year = frenchRangeMatch[3]
            ? parseInt(frenchRangeMatch[3], 10) < 100
              ? 2000 + parseInt(frenchRangeMatch[3], 10)
              : parseInt(frenchRangeMatch[3], 10)
            : new Date().getFullYear();

          const startDay = parseInt(frenchRangeMatch[1], 10);
          const startMonth = parseInt(frenchRangeMatch[2], 10);
          const endDay = parseInt(frenchRangeMatch[4], 10);
          const endMonth = parseInt(frenchRangeMatch[5], 10);

          let endYear = year;
          if (endMonth < startMonth) {
            endYear = year + 1;
          }

          return {
            start: new Date(year, startMonth - 1, startDay),
            end: new Date(endYear, endMonth - 1, endDay),
          };
        }

        // Pattern: "04/06 - 10/06" (standard format)
        const rangeMatch = cellStr.match(
          /(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?\s*[-–—]\s*(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?/
        );

        if (rangeMatch) {
          const year = rangeMatch[3]
            ? parseInt(rangeMatch[3], 10) < 100
              ? 2000 + parseInt(rangeMatch[3], 10)
              : parseInt(rangeMatch[3], 10)
            : new Date().getFullYear();

          return {
            start: new Date(year, parseInt(rangeMatch[2], 10) - 1, parseInt(rangeMatch[1], 10)),
            end: new Date(year, parseInt(rangeMatch[5], 10) - 1, parseInt(rangeMatch[4], 10)),
          };
        }
      }
    }

    return undefined;
  }

  protected findFilmStartRow(rows: unknown[][]): number {
    this.headerRowIndex = this.findHeaderRow(rows);
    if (this.headerRowIndex < 0) {
      this.headerRowIndex = 1;
    }

    this.detectColumnLayout(rows[this.headerRowIndex] as unknown[]);
    return this.headerRowIndex + 1;
  }

  protected isFilmRow(row: unknown[]): boolean {
    if (row.length < 3) return false;

    const filmCell = getCellString(row[this.filmColIndex] || row[0]);
    if (!filmCell || filmCell.length < 2) return false;

    const lowerFilm = filmCell.toLowerCase();
    if (
      lowerFilm.includes('film') ||
      lowerFilm.includes('titre') ||
      lowerFilm.includes('programme') ||
      lowerFilm.includes('semaine')
    ) {
      return false;
    }

    return true;
  }

  protected parseFilmRow(
    row: unknown[],
    allRows: unknown[][],
    rowIndex: number,
    context: SheetParseContext
  ): ParsedFilmData | null {
    const rawTitle = getCellString(row[this.filmColIndex] || row[0]);
    if (!rawTitle) return null;

    const ageRating = extractAgeRating(rawTitle);
    const titleWithoutRating = removeAgeRating(rawTitle);

    const durationStr = getCellString(row[this.durationColIndex] || row[1]);
    const durationMinutes = parseDurationToMinutes(durationStr);

    const versionString = getCellString(row[this.versionColIndex] || row[2]);
    const languageInfo = this.extractLanguage(versionString, context);

    const formatMatch = this.matchFormat(rawTitle, context.formats);
    const techMatch = this.matchTechnology(rawTitle, context.technologies);

    let movieName = titleWithoutRating;
    if (formatMatch) {
      movieName = movieName.replace(new RegExp(`\\b${formatMatch.code}\\b`, 'gi'), '').trim();
    }
    if (techMatch) {
      movieName = movieName.replace(new RegExp(`\\b${techMatch.code}\\b`, 'gi'), '').trim();
    }
    movieName = this.extractMovieName(movieName);

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
      duration: durationStr || null,
      durationMinutes,
      ageRating,
      director: null,
      year: null,
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
