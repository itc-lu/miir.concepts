import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getParser, parseFileForCinema } from '@/lib/parsers';
import type { Parser, Cinema, CinemaGroup, Format, Technology, Language } from '@/types/database.types';

interface SheetCinemaMapping {
  sheetIndex: number;
  sheetName: string;
  cinemaId: string;
}

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
    const cinemaGroupId = formData.get('cinema_group_id') as string | null;
    const sheetMappingsJson = formData.get('sheet_mappings') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Parse sheet mappings if provided
    let sheetMappings: SheetCinemaMapping[] | null = null;
    if (sheetMappingsJson) {
      try {
        sheetMappings = JSON.parse(sheetMappingsJson);
      } catch {
        return NextResponse.json({ error: 'Invalid sheet mappings JSON' }, { status: 400 });
      }
    }

    // Either cinema_id or cinema_group_id with mappings is required
    if (!cinemaId && !cinemaGroupId) {
      return NextResponse.json({ error: 'Either cinema_id or cinema_group_id is required' }, { status: 400 });
    }

    // Check file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only .xlsx and .xls files are supported.' },
        { status: 400 }
      );
    }

    // Read file as buffer
    const fileBuffer = await file.arrayBuffer();

    // Fetch reference data for parsing
    const [formatsRes, technologiesRes, languagesRes] = await Promise.all([
      supabase.from('formats').select('*').eq('is_active', true),
      supabase.from('technologies').select('*').eq('is_active', true),
      supabase.from('languages').select('*').eq('is_active', true),
    ]);

    const formats = (formatsRes.data || []) as Format[];
    const technologies = (technologiesRes.data || []) as Technology[];
    const languages = (languagesRes.data || []) as Language[];

    // Mode 1: Single cinema (all sheets go to one cinema)
    if (cinemaId && !sheetMappings) {
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

      // Get language mapping config for the cinema group
      const mappingRes = cinema.cinema_group?.language_mapping_id
        ? await supabase
            .from('language_mapping_configs')
            .select(`*, lines:language_mapping_lines(*)`)
            .eq('id', cinema.cinema_group.language_mapping_id)
            .single()
        : await supabase
            .from('language_mapping_configs')
            .select(`*, lines:language_mapping_lines(*)`)
            .eq('is_default', true)
            .single();

      const languageMapping = mappingRes.data || undefined;

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
        mode: 'single_cinema',
        parser: {
          id: parser.id,
          name: parser.name,
          slug: parser.slug,
        },
        cinema: {
          id: cinema.id,
          name: cinema.name,
        },
        cinemaGroup: cinema.cinema_group ? {
          id: cinema.cinema_group.id,
          name: cinema.cinema_group.name,
        } : null,
        summary: {
          totalSheets: result.sheets.length,
          totalFilms,
          totalShowings,
        },
        sheets: result.sheets.map((sheet, index) => ({
          sheetIndex: index,
          sheetName: sheet.sheetName,
          cinemaId: cinema.id,
          cinemaName: cinema.name,
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
    }

    // Mode 2: Multi-cinema with sheet mappings (cinema group mode)
    if (cinemaGroupId && sheetMappings && sheetMappings.length > 0) {
      // Fetch cinema group with parser
      const { data: cinemaGroup, error: groupError } = await supabase
        .from('cinema_groups')
        .select('*, parser:parsers(*)')
        .eq('id', cinemaGroupId)
        .single();

      if (groupError || !cinemaGroup) {
        return NextResponse.json({ error: 'Cinema group not found' }, { status: 404 });
      }

      if (!cinemaGroup.parser_id) {
        return NextResponse.json(
          { error: 'No parser configured for this cinema group.' },
          { status: 400 }
        );
      }

      const parser = cinemaGroup.parser;

      // Fetch all mapped cinemas
      const cinemaIds = [...new Set(sheetMappings.map(m => m.cinemaId))];
      const { data: cinemas, error: cinemasError } = await supabase
        .from('cinemas')
        .select(`*, country:countries(*)`)
        .in('id', cinemaIds);

      if (cinemasError || !cinemas) {
        return NextResponse.json({ error: 'Failed to fetch cinemas' }, { status: 500 });
      }

      const cinemaMap = new Map(cinemas.map((c: any) => [c.id, c]));

      // Get language mapping config
      const mappingRes = cinemaGroup.language_mapping_id
        ? await supabase
            .from('language_mapping_configs')
            .select(`*, lines:language_mapping_lines(*)`)
            .eq('id', cinemaGroup.language_mapping_id)
            .single()
        : await supabase
            .from('language_mapping_configs')
            .select(`*, lines:language_mapping_lines(*)`)
            .eq('is_default', true)
            .single();

      const languageMapping = mappingRes.data || undefined;

      // Parse each sheet with its mapped cinema
      const allSheets: any[] = [];
      const allErrors: string[] = [];
      const allWarnings: string[] = [];

      for (const mapping of sheetMappings) {
        const cinema = cinemaMap.get(mapping.cinemaId);
        if (!cinema) {
          allErrors.push(`Cinema not found for sheet "${mapping.sheetName}"`);
          continue;
        }

        // Parse for this specific cinema
        const result = await parseFileForCinema(
          fileBuffer,
          cinema as Cinema,
          cinemaGroup as CinemaGroup,
          parser as Parser,
          {
            formats,
            technologies,
            languages,
            languageMapping,
            specificSheetIndex: mapping.sheetIndex,
          }
        );

        // Find the sheet we parsed
        const sheet = result.sheets.find(s => s.sheetName === mapping.sheetName) || result.sheets[0];
        if (sheet) {
          allSheets.push({
            sheetIndex: mapping.sheetIndex,
            sheetName: mapping.sheetName,
            cinemaId: cinema.id,
            cinemaName: cinema.name,
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
          });
        }

        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
      }

      // Calculate summary
      const totalFilms = allSheets.reduce((acc, sheet) => acc + sheet.filmCount, 0);
      const totalShowings = allSheets.reduce(
        (acc, sheet) => acc + sheet.films.reduce((a: number, f: any) => a + (f.screeningShows?.length || 0), 0),
        0
      );

      return NextResponse.json({
        success: allErrors.length === 0,
        mode: 'multi_cinema',
        parser: {
          id: parser.id,
          name: parser.name,
          slug: parser.slug,
        },
        cinemaGroup: {
          id: cinemaGroup.id,
          name: cinemaGroup.name,
        },
        summary: {
          totalSheets: allSheets.length,
          totalFilms,
          totalShowings,
        },
        sheets: allSheets,
        errors: allErrors,
        warnings: allWarnings,
      });
    }

    return NextResponse.json(
      { error: 'Invalid request: provide either cinema_id or cinema_group_id with sheet_mappings' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Import Parse] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse file' },
      { status: 500 }
    );
  }
}
