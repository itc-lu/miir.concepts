/**
 * Kinepolis France Parser - Waves Format
 * Parser for Kinepolis France Waves cinema
 *
 * Waves may have a specific format with:
 * - Different column arrangement
 * - Possibly multiple screens per film
 * - Special event screenings
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
} from './utils';

export class KinepolisFranceWavesParser extends BaseParser {
  private filmColIndex = 0;
  private durationColIndex = -1;
  private versionColIndex = -1;
  private screenColIndex = -1;
  private weekdayColumnMap: Map<string, number> = new Map();
  private headerRowIndex = 1;

  constructor(parser: Parser, config: ParserConfig = {}) {
    super(parser, {
      weekStartDay: 3, // Wednesday
      ...config,
    });
  }

  /**
   * Find header row
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

      if (weekdayCount >= 5) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Detect column layout - Waves format may have screen column
   */
  protected detectColumnLayout(headerRow: unknown[]): void {
    this.weekdayColumnMap.clear();
    this.screenColIndex = -1;

    for (let i = 0; i < headerRow.length; i++) {
      const cellValue = getCellString(headerRow[i]).toLowerCase();

      if (cellValue.includes('film') || cellValue === 'titre') {
        this.filmColIndex = i;
      } else if (cellValue.includes('dur') || cellValue.includes('temps')) {
        this.durationColIndex = i;
      } else if (cellValue.includes('version') || cellValue.includes('langue')) {
        this.versionColIndex = i;
      } else if (cellValue.includes('salle') || cellValue.includes('screen') || cellValue.includes('écran')) {
        this.screenColIndex = i;
      }

      const normalized = normalizeWeekday(cellValue);
      if (normalized) {
        this.weekdayColumnMap.set(normalized, i);
      }
    }
  }

  protected detectDateRange(
    rows: unknown[][],
    context: import('./base').ParserContext
  ): { start: Date; end: Date } | undefined {
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i];
      for (const cell of row) {
        const cellStr = getCellString(cell);

        // French date range patterns
        const frenchRangeMatch = cellStr.match(
          /du\s*(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?\s*au\s*(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?/i
        );

        if (frenchRangeMatch) {
          const year = frenchRangeMatch[3]
            ? parseInt(frenchRangeMatch[3], 10) < 100
              ? 2000 + parseInt(frenchRangeMatch[3], 10)
              : parseInt(frenchRangeMatch[3], 10)
            : new Date().getFullYear();

          return {
            start: new Date(year, parseInt(frenchRangeMatch[2], 10) - 1, parseInt(frenchRangeMatch[1], 10)),
            end: new Date(year, parseInt(frenchRangeMatch[5], 10) - 1, parseInt(frenchRangeMatch[4], 10)),
          };
        }

        // Standard range pattern
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
      lowerFilm.includes('semaine') ||
      lowerFilm.includes('waves')
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

    let durationStr: string | null = null;
    let durationMinutes: number | null = null;
    if (this.durationColIndex >= 0) {
      durationStr = getCellString(row[this.durationColIndex]);
      durationMinutes = parseDurationToMinutes(durationStr);
    }

    let versionString: string | null = null;
    if (this.versionColIndex >= 0) {
      versionString = getCellString(row[this.versionColIndex]);
    }

    // Get screen info if available
    let screenName: string | null = null;
    if (this.screenColIndex >= 0) {
      screenName = getCellString(row[this.screenColIndex]) || null;
    }

    const languageInfo = this.extractLanguage(versionString || '', context);
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

    // Create tags including screen info
    const tags: string[] = [];
    if (screenName) {
      tags.push(`Screen: ${screenName}`);
    }

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
      duration: durationStr,
      durationMinutes,
      ageRating,
      director: null,
      year: null,
      productionCountry: null,
      availableCountries: [],
      versionString,
      tags,
      description: null,
      startWeekDate,
      screeningShows,
    };
  }
}
