/**
 * Cinextdoor Parser
 * Parser for Cinextdoor cinema schedule format
 *
 * Cinextdoor format typically includes:
 * - Film title with version info embedded
 * - Duration in various formats
 * - Show times organized by day
 * - May include director/year info in the title cell
 */

import type { Parser, ParsedFilmData } from '@/types/database.types';
import { BaseParser, ParserConfig, SheetParseContext } from './base';
import {
  getCellString,
  isRowEmpty,
  parseDurationToMinutes,
  extractAgeRating,
  removeAgeRating,
  normalizeWeekday,
  parseShowTimes,
  timeStringToFloat,
} from './utils';

export class CinextdoorParser extends BaseParser {
  private filmColIndex = 0;
  private weekdayColumnMap: Map<string, number> = new Map();
  private headerRowIndex = -1;

  constructor(parser: Parser, config: ParserConfig = {}) {
    super(parser, {
      weekStartDay: 3, // Wednesday
      ...config,
    });
  }

  /**
   * Find header row with weekday names
   */
  protected findHeaderRow(rows: unknown[][]): number {
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const row = rows[i];
      let weekdayCount = 0;

      for (const cell of row) {
        const cellValue = getCellString(cell);
        // Check for weekday with date like "Mer 04/06" or just "Mer"
        const weekdayMatch = cellValue.match(/^(mer|jeu|ven|sam|dim|lun|mar|wed|thu|fri|sat|sun|mon|tue)/i);
        if (weekdayMatch || normalizeWeekday(cellValue.toLowerCase())) {
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
   * Detect column layout
   */
  protected detectColumnLayout(headerRow: unknown[]): void {
    this.weekdayColumnMap.clear();

    for (let i = 0; i < headerRow.length; i++) {
      const cellValue = getCellString(headerRow[i]);
      const lowerValue = cellValue.toLowerCase();

      // Check if this is the film column
      if (
        lowerValue.includes('film') ||
        lowerValue.includes('titre') ||
        lowerValue === 'title' ||
        i === 0 // Default: first column is film
      ) {
        if (!this.weekdayColumnMap.size && i === 0) {
          this.filmColIndex = i;
        }
      }

      // Check for weekday (possibly with date)
      // Patterns: "Mer", "Mer 04/06", "Wednesday", "Wed 04"
      const weekdayMatch = cellValue.match(
        /^(mer|jeu|ven|sam|dim|lun|mar|wed|thu|fri|sat|sun|mon|tue|mercredi|jeudi|vendredi|samedi|dimanche|lundi|mardi|wednesday|thursday|friday|saturday|sunday|monday|tuesday)/i
      );

      if (weekdayMatch) {
        const normalized = normalizeWeekday(weekdayMatch[1].toLowerCase());
        if (normalized) {
          this.weekdayColumnMap.set(normalized, i);
        }
      }
    }

    // If no film column detected, use first column
    if (this.weekdayColumnMap.size > 0) {
      // Film column should be before the first weekday column
      const firstWeekdayCol = Math.min(...Array.from(this.weekdayColumnMap.values()));
      if (this.filmColIndex >= firstWeekdayCol) {
        this.filmColIndex = 0;
      }
    }
  }

  /**
   * Extract dates from header cells that contain "Mer 04/06" patterns
   */
  protected extractDatesFromHeader(headerRow: unknown[]): Map<string, Date> {
    const dates = new Map<string, Date>();
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < headerRow.length; i++) {
      const cellValue = getCellString(headerRow[i]);

      // Pattern: "Mer 04/06" or "Wed 04.06"
      const match = cellValue.match(
        /^(mer|jeu|ven|sam|dim|lun|mar|wed|thu|fri|sat|sun|mon|tue|mercredi|jeudi|vendredi|samedi|dimanche|lundi|mardi)[.\s]*(\d{1,2})[\/\.](\d{1,2})/i
      );

      if (match) {
        const normalized = normalizeWeekday(match[1].toLowerCase());
        if (normalized) {
          const day = parseInt(match[2], 10);
          const month = parseInt(match[3], 10);
          dates.set(normalized, new Date(currentYear, month - 1, day));
        }
      }
    }

    return dates;
  }

  /**
   * Override date range detection
   */
  protected detectDateRange(
    rows: unknown[][],
    context: import('./base').ParserContext
  ): { start: Date; end: Date } | undefined {
    // First, check for explicit date range
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i];
      for (const cell of row) {
        const cellStr = getCellString(cell);

        // Date range patterns
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

    // If no explicit range, try to extract from header row with dates
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

    // Try to extract dates from header and update weekDayDates
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
      lowerFilm.includes('titre') ||
      lowerFilm.includes('programme') ||
      lowerFilm.includes('semaine') ||
      lowerFilm.includes('cinextdoor') ||
      lowerFilm.startsWith('mer') ||
      lowerFilm.startsWith('jeu')
    ) {
      return false;
    }

    // Check if any cell has time patterns
    for (let i = 1; i < row.length; i++) {
      const cellValue = getCellString(row[i]);
      if (/\d{1,2}:\d{2}/.test(cellValue)) {
        return true;
      }
    }

    return filmCell.length > 3; // Assume it's a film if title is long enough
  }

  /**
   * Parse film info from Cinextdoor format
   * Title may include: "Film Name (Director, Year) - 120' - VO st FR"
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

    // Extract age rating
    const ageRating = extractAgeRating(remaining);
    remaining = removeAgeRating(remaining);

    // Extract version string (at the end, after dash)
    let versionString: string | null = null;
    const versionMatch = remaining.match(/[-–—]\s*(V[OFD](?:\s+st\s+\w+[&\/]?\w*)?|OV|OmU|OME)$/i);
    if (versionMatch) {
      versionString = versionMatch[1].trim();
      remaining = remaining.slice(0, remaining.lastIndexOf(versionMatch[0])).trim();
    }

    // Extract duration (patterns: "- 120'" or "- 2:00" or "(120')")
    let duration: string | null = null;
    let durationMinutes: number | null = null;

    const durationMatch = remaining.match(/[-–—\s]\s*(\d+['′]|\d+:\d{2}|\d+\s*min)/i);
    if (durationMatch) {
      duration = durationMatch[1];
      durationMinutes = parseDurationToMinutes(duration);
      remaining = remaining.replace(durationMatch[0], '').trim();
    }

    // Extract director and year from parentheses: "(John Doe, 2024)"
    let director: string | null = null;
    let year: number | null = null;

    const metaMatch = remaining.match(/\(([^)]+,\s*\d{4})\)$/);
    if (metaMatch) {
      const parts = metaMatch[1].split(',');
      director = parts.slice(0, -1).join(',').trim();
      const yearStr = parts[parts.length - 1].trim();
      year = parseInt(yearStr, 10);
      remaining = remaining.replace(metaMatch[0], '').trim();
    } else {
      // Try just year in parentheses
      const yearOnlyMatch = remaining.match(/\((\d{4})\)$/);
      if (yearOnlyMatch) {
        year = parseInt(yearOnlyMatch[1], 10);
        remaining = remaining.replace(yearOnlyMatch[0], '').trim();
      }
    }

    // Clean up remaining dashes
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

    // Parse the film cell for all info
    const filmInfo = this.parseFilmInfo(rawTitle);

    const languageInfo = this.extractLanguage(filmInfo.versionString || '', context);
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

    // Update weekDayDates from header if we have dates there
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
}
