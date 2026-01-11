/**
 * Parser Registry
 * Central registry for all cinema schedule parsers
 */

import type { Parser, Cinema, CinemaGroup, ParserContext, ParserResult } from '@/types/database.types';
import { BaseParser, ParserConfig } from './base';

// Import parser implementations
import { KinepolisParser } from './kinepolis';
import { KinepolisFranceLongwyParser } from './kinepolis-france-longwy';
import { KinepolisFranceMetzParser } from './kinepolis-france-metz';
import { KinepolisFranceWavesParser } from './kinepolis-france-waves';
import { CinextdoorParser } from './cinextdoor';
import { ScalaCinextdoorParser } from './scala-cinextdoor';

// ============================================================================
// PARSER REGISTRY
// ============================================================================

type ParserConstructor = new (parser: Parser, config?: ParserConfig) => BaseParser;

const parserRegistry: Map<string, ParserConstructor> = new Map([
  ['kinepolis', KinepolisParser],
  ['kinepolis-fr-longwy-thionville', KinepolisFranceLongwyParser],
  ['kinepolis-fr-metz-amphitheatre', KinepolisFranceMetzParser],
  ['kinepolis-fr-waves', KinepolisFranceWavesParser],
  ['cinextdoor', CinextdoorParser],
  ['scala-cinextdoor', ScalaCinextdoorParser],
]);

/**
 * Get a parser instance by slug
 */
export function getParser(parser: Parser, config?: ParserConfig): BaseParser | null {
  const ParserClass = parserRegistry.get(parser.slug);

  if (!ParserClass) {
    console.warn(`Unknown parser slug: ${parser.slug}`);
    return null;
  }

  return new ParserClass(parser, config);
}

/**
 * Get all registered parser slugs
 */
export function getRegisteredParserSlugs(): string[] {
  return Array.from(parserRegistry.keys());
}

/**
 * Check if a parser slug is registered
 */
export function isParserRegistered(slug: string): boolean {
  return parserRegistry.has(slug);
}

/**
 * Parse a file using the appropriate parser for a cinema
 */
export async function parseFileForCinema(
  file: Buffer | ArrayBuffer,
  cinema: Cinema,
  cinemaGroup: CinemaGroup | null,
  parser: Parser,
  context: Omit<ParserContext, 'cinema' | 'cinemaGroup' | 'weekStartDay' | 'timezone'>
): Promise<ParserResult> {
  const parserInstance = getParser(parser);

  if (!parserInstance) {
    return {
      success: false,
      sheets: [],
      errors: [`Parser not found: ${parser.slug}`],
      warnings: [],
    };
  }

  // Determine week start day
  // Priority: cinema override > cinema group country > cinema country > default (Wednesday)
  let weekStartDay = 3; // Wednesday default for Luxembourg

  if (cinema.week_start_day_override !== null) {
    weekStartDay = cinema.week_start_day_override;
  } else if (cinemaGroup?.country?.week_start_day !== undefined) {
    weekStartDay = cinemaGroup.country.week_start_day;
  } else if (cinema.country?.week_start_day !== undefined) {
    weekStartDay = cinema.country.week_start_day;
  }

  // Create full parser context
  const fullContext: ParserContext = {
    ...context,
    cinema,
    cinemaGroup: cinemaGroup || undefined,
    weekStartDay,
    timezone: cinema.timezone || 'Europe/Luxembourg',
  };

  return parserInstance.parseFile(file, fullContext);
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { BaseParser } from './base';
export type { ParserConfig, ParserContext, SheetParseContext } from './base';
export * from './utils';

// Export individual parsers for direct use if needed
export { KinepolisParser } from './kinepolis';
export { KinepolisFranceLongwyParser } from './kinepolis-france-longwy';
export { KinepolisFranceMetzParser } from './kinepolis-france-metz';
export { KinepolisFranceWavesParser } from './kinepolis-france-waves';
export { CinextdoorParser } from './cinextdoor';
export { ScalaCinextdoorParser } from './scala-cinextdoor';
