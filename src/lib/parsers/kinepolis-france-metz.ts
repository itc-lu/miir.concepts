/**
 * Kinepolis France Parser - Metz/Amphitheatre Format
 * Parser for Kinepolis France cinemas (Metz and Amphitheatre)
 *
 * This format may have:
 * - Slightly different column structure
 * - Additional metadata columns
 * - French language version strings
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
} from './utils';

export class KinepolisFranceMetzParser extends BaseParser {
  private filmColIndex = 0;
  private durationColIndex = -1;
  private versionColIndex = -1;
  private directorColIndex = -1;
  private genreColIndex = -1;
  private weekdayColumnMap: Map<string, number> = new Map();
  private headerRowIndex = 1;

  constructor(parser: Parser, config: ParserConfig = {}) {
    super(parser, {
      weekStartDay: 3, // Wednesday
      ...config,
    });
  }

  /**
   * Find header row - Metz format may have more columns
   */
  protected findHeaderRow(rows: unknown[][]): number {
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i];
      let weekdayCount = 0;
      let hasFilmColumn = false;

      for (const cell of row) {
        const cellValue = getCellString(cell).toLowerCase();

        if (cellValue.includes('film') || cellValue.includes('titre')) {
          hasFilmColumn = true;
        }

        if (normalizeWeekday(cellValue)) {
          weekdayCount++;
        }
      }

      if (hasFilmColumn && weekdayCount >= 5) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Detect column layout - Metz format may have additional columns
   */
  protected detectColumnLayout(headerRow: unknown[]): void {
    this.weekdayColumnMap.clear();
    this.directorColIndex = -1;
    this.genreColIndex = -1;

    for (let i = 0; i < headerRow.length; i++) {
      const cellValue = getCellString(headerRow[i]).toLowerCase();

      if (cellValue.includes('film') || cellValue === 'titre') {
        this.filmColIndex = i;
      } else if (cellValue.includes('dur') || cellValue.includes('temps')) {
        this.durationColIndex = i;
      } else if (cellValue.includes('version') || cellValue.includes('langue')) {
        this.versionColIndex = i;
      } else if (cellValue.includes('réalisateur') || cellValue.includes('director')) {
        this.directorColIndex = i;
      } else if (cellValue.includes('genre')) {
        this.genreColIndex = i;
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

        // Various French date range patterns
        const patterns = [
          /du\s*(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?\s*au\s*(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?/i,
          /(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?\s*[-–—]\s*(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?/,
          /semaine\s+du\s+(\d{1,2})\s+(\w+)(?:\s+(\d{4}))?/i,
        ];

        for (const pattern of patterns) {
          const match = cellStr.match(pattern);
          if (match) {
            const year = match[3]
              ? parseInt(match[3], 10) < 100
                ? 2000 + parseInt(match[3], 10)
                : parseInt(match[3], 10)
              : new Date().getFullYear();

            if (match[4]) {
              // Two-date pattern
              const startDay = parseInt(match[1], 10);
              const startMonth = parseInt(match[2], 10);
              const endDay = parseInt(match[4], 10);
              const endMonth = parseInt(match[5], 10);

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

    // Get duration if column exists
    let durationStr: string | null = null;
    let durationMinutes: number | null = null;
    if (this.durationColIndex >= 0) {
      durationStr = getCellString(row[this.durationColIndex]);
      durationMinutes = parseDurationToMinutes(durationStr);
    }

    // Get version string if column exists
    let versionString: string | null = null;
    if (this.versionColIndex >= 0) {
      versionString = getCellString(row[this.versionColIndex]);
    }

    // Get director if column exists
    let director: string | null = null;
    if (this.directorColIndex >= 0) {
      director = getCellString(row[this.directorColIndex]) || null;
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

    // Extract tags from genre column
    const tags: string[] = [];
    if (this.genreColIndex >= 0) {
      const genreStr = getCellString(row[this.genreColIndex]);
      if (genreStr) {
        tags.push(...genreStr.split(/[,\/]/).map(t => t.trim()).filter(Boolean));
      }
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
      director,
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
