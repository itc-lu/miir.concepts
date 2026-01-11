import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getParser, parseFileForCinema } from '@/lib/parsers';
import type { Parser, Cinema, CinemaGroup, Format, Technology, Language } from '@/types/database.types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const cinemaId = formData.get('cinema_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!cinemaId) {
      return NextResponse.json({ error: 'Cinema ID is required' }, { status: 400 });
    }

    // Check file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only .xlsx and .xls files are supported.' },
        { status: 400 }
      );
    }

    // Fetch cinema with group and country
    const { data: cinema, error: cinemaError } = await supabase
      .from('cinemas')
      .select(`
        *,
        cinema_group:cinema_groups(*),
        country:countries(*)
      `)
      .eq('id', cinemaId)
      .single();

    if (cinemaError || !cinema) {
      return NextResponse.json({ error: 'Cinema not found' }, { status: 404 });
    }

    // Determine parser to use
    let parserId = cinema.parser_id;
    if (!parserId && cinema.cinema_group?.parser_id) {
      parserId = cinema.cinema_group.parser_id;
    }

    if (!parserId) {
      return NextResponse.json(
        { error: 'No parser configured for this cinema. Please configure a parser in the cinema or cinema group settings.' },
        { status: 400 }
      );
    }

    // Fetch parser
    const { data: parser, error: parserError } = await supabase
      .from('parsers')
      .select('*')
      .eq('id', parserId)
      .single();

    if (parserError || !parser) {
      return NextResponse.json({ error: 'Parser not found' }, { status: 404 });
    }

    // Fetch reference data for parsing
    const [formatsRes, technologiesRes, languagesRes, mappingRes] = await Promise.all([
      supabase.from('formats').select('*').eq('is_active', true),
      supabase.from('technologies').select('*').eq('is_active', true),
      supabase.from('languages').select('*').eq('is_active', true),
      // Get language mapping config for the cinema group
      cinema.cinema_group?.language_mapping_id
        ? supabase
            .from('language_mapping_configs')
            .select(`*, lines:language_mapping_lines(*)`)
            .eq('id', cinema.cinema_group.language_mapping_id)
            .single()
        : supabase
            .from('language_mapping_configs')
            .select(`*, lines:language_mapping_lines(*)`)
            .eq('is_default', true)
            .single(),
    ]);

    const formats = (formatsRes.data || []) as Format[];
    const technologies = (technologiesRes.data || []) as Technology[];
    const languages = (languagesRes.data || []) as Language[];
    const languageMapping = mappingRes.data || undefined;

    // Read file as buffer
    const fileBuffer = await file.arrayBuffer();

    // Parse the file
    const result = await parseFileForCinema(
      fileBuffer,
      cinema as Cinema,
      cinema.cinema_group as CinemaGroup | null,
      parser as Parser,
      {
        formats,
        technologies,
        languages,
        languageMapping,
      }
    );

    // Calculate summary
    const totalFilms = result.sheets.reduce((acc, sheet) => acc + sheet.films.length, 0);
    const totalShowings = result.sheets.reduce(
      (acc, sheet) => acc + sheet.films.reduce((a, f) => a + f.screeningShows.length, 0),
      0
    );

    return NextResponse.json({
      success: result.success,
      parser: {
        id: parser.id,
        name: parser.name,
        slug: parser.slug,
      },
      cinema: {
        id: cinema.id,
        name: cinema.name,
      },
      summary: {
        totalSheets: result.sheets.length,
        totalFilms,
        totalShowings,
      },
      sheets: result.sheets.map(sheet => ({
        sheetName: sheet.sheetName,
        filmCount: sheet.films.length,
        dateRange: sheet.dateRange
          ? {
              start: sheet.dateRange.start.toISOString(),
              end: sheet.dateRange.end.toISOString(),
            }
          : null,
        films: sheet.films.map(film => ({
          importTitle: film.importTitle,
          movieName: film.movieName,
          language: film.language,
          languageCode: film.languageCode,
          subtitleLanguages: film.subtitleLanguages,
          duration: film.duration,
          durationMinutes: film.durationMinutes,
          versionString: film.versionString,
          format: film.formatTechnology.formatStr,
          ageRating: film.ageRating,
          director: film.director,
          year: film.year,
          showingCount: film.screeningShows.length,
          screeningShows: film.screeningShows.map(show => ({
            date: show.date.toISOString().split('T')[0],
            time: show.time,
            datetime: show.datetime.toISOString(),
          })),
        })),
        errors: sheet.errors,
      })),
      errors: result.errors,
      warnings: result.warnings,
    });
  } catch (error: any) {
    console.error('[Import Parse] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse file' },
      { status: 500 }
    );
  }
}
