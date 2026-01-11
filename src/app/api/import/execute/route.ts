import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

interface ParsedSheet {
  sheetIndex: number;
  sheetName: string;
  cinemaId: string;
  cinemaName: string;
  filmCount: number;
  dateRange: { start: string; end: string } | null;
  films: any[];
  errors: string[];
}

interface ImportRequest {
  cinema_id?: string; // Single cinema mode
  cinema_group_id?: string; // Multi-cinema mode
  parser_id: string;
  sheets: ParsedSheet[];
  file_name?: string;
  file_size?: number;
  options: {
    createMoviesAutomatically: boolean;
    cleanupOldData: boolean;
    cleanupDate: string | null;
    previewOnly: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: ImportRequest = await request.json();
    const { cinema_id, cinema_group_id, parser_id, sheets, file_name, file_size, options } = body;

    if (!parser_id || !sheets || sheets.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!cinema_id && !cinema_group_id) {
      return NextResponse.json({ error: 'Either cinema_id or cinema_group_id is required' }, { status: 400 });
    }

    // Calculate totals
    const totalFilms = sheets.reduce((acc, s) => acc + (s.films?.length || 0), 0);
    const totalShowings = sheets.reduce(
      (acc, s) => acc + (s.films || []).reduce((a: number, f: any) => a + (f.screeningShows?.length || 0), 0),
      0
    );

    // Create import job record with enhanced tracking
    const { data: importJob, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        user_id: user.id,
        cinema_id: cinema_id || null,
        cinema_group_id: cinema_group_id || null,
        parser_id: parser_id,
        parser_type: parser_id, // Legacy field
        file_name: file_name || 'Unknown',
        original_file_name: file_name || 'Unknown',
        file_size_bytes: file_size || 0,
        sheet_count: sheets.length,
        status: 'processing',
        total_records: totalFilms,
        processed_records: 0,
        success_records: 0,
        error_records: 0,
        summary: {
          totalSheets: sheets.length,
          totalFilms,
          totalShowings,
          sheetDetails: sheets.map(s => ({
            sheetName: s.sheetName,
            cinemaId: s.cinemaId,
            cinemaName: s.cinemaName,
            filmCount: s.filmCount,
          })),
        },
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) {
      console.error('[Import Execute] Failed to create import job:', jobError);
      return NextResponse.json({ error: 'Failed to create import job' }, { status: 500 });
    }

    // If preview only, return what would be imported
    if (options.previewOnly) {
      // Update job status to preview
      await supabase
        .from('import_jobs')
        .update({ status: 'pending' })
        .eq('id', importJob.id);

      return NextResponse.json({
        success: true,
        previewOnly: true,
        importJobId: importJob.id,
        summary: {
          totalFilms,
          totalShowings,
          wouldCreateConflicts: totalFilms,
        },
      });
    }

    // Process each sheet
    const results = {
      processedFilms: 0,
      createdConflicts: 0,
      createdEditions: 0,
      createdSessions: 0,
      errors: [] as string[],
    };

    for (const sheet of sheets) {
      // Get cinema_group_id for this sheet's cinema
      let sheetCinemaGroupId = cinema_group_id;

      if (!sheetCinemaGroupId && sheet.cinemaId) {
        const { data: sheetCinema } = await supabase
          .from('cinemas')
          .select('cinema_group_id')
          .eq('id', sheet.cinemaId)
          .single();

        if (sheetCinema) {
          sheetCinemaGroupId = sheetCinema.cinema_group_id;
        }
      }

      for (const film of sheet.films || []) {
        try {
          // Try to match film to existing movie
          const movieSlug = (film.movieName || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

          const { data: existingMovies } = await supabase
            .from('movies_l0')
            .select('id, original_title')
            .or(`original_title.ilike.%${film.movieName}%,slug.eq.${movieSlug}`)
            .limit(5);

          // Create import conflict record for manual review
          const { data: conflictMovie, error: conflictError } = await supabase
            .from('import_conflict_movies')
            .insert({
              cinema_group_id: sheetCinemaGroupId || null,
              cinema_id: sheet.cinemaId,
              import_job_id: importJob.id,
              parser_id: parser_id,
              import_title: film.importTitle,
              movie_name: film.movieName,
              director: film.director,
              year_of_production: film.year,
              matched_movie_l0_id: existingMovies?.length === 1 ? existingMovies[0].id : null,
              state: existingMovies?.length === 1 ? 'verified' : 'to_verify',
              import_text: JSON.stringify(film),
            })
            .select()
            .single();

          if (conflictError) {
            results.errors.push(`Failed to create conflict for: ${film.movieName}`);
            continue;
          }

          results.createdConflicts++;

          // Create edition conflict
          const { error: editionError } = await supabase
            .from('import_conflict_editions')
            .insert({
              conflict_movie_id: conflictMovie.id,
              title: film.movieName,
              full_title: film.importTitle,
              language_code: film.languageCode,
              duration_minutes: film.durationMinutes,
              duration_text: film.duration,
              director: film.director,
              year_of_production: film.year,
              subtitle_languages: film.subtitleLanguages,
              format_codes: film.format ? [film.format] : [],
              age_rating: film.ageRating,
              version_string: film.versionString,
              state: 'to_verify',
              import_text: JSON.stringify(film),
            });

          if (!editionError) {
            results.createdEditions++;
          }

          // Create session conflicts for each showing
          if (film.screeningShows && film.screeningShows.length > 0) {
            const sessionInserts = film.screeningShows.map((show: any) => ({
              conflict_movie_id: conflictMovie.id,
              cinema_id: sheet.cinemaId,
              screening_datetime: show.datetime,
              screening_date: show.date,
              time_float: show.timeFloat || null,
              title: film.movieName,
              language_code: film.languageCode,
              duration_minutes: film.durationMinutes,
              format_code: film.format,
              start_week_day: null,
              state: 'to_verify',
            }));

            const { error: sessionsError } = await supabase
              .from('import_conflict_sessions')
              .insert(sessionInserts);

            if (!sessionsError) {
              results.createdSessions += sessionInserts.length;
            }
          }

          results.processedFilms++;
        } catch (err: any) {
          results.errors.push(`Error processing ${film.movieName}: ${err.message}`);
        }
      }
    }

    // Determine final status
    const finalStatus = results.errors.length > 0 && results.processedFilms === 0
      ? 'failed'
      : 'completed';

    // Update import job status
    await supabase
      .from('import_jobs')
      .update({
        status: finalStatus,
        processed_records: results.processedFilms,
        success_records: results.createdConflicts,
        error_records: results.errors.length,
        completed_at: new Date().toISOString(),
        errors: results.errors.length > 0 ? { messages: results.errors } : null,
        summary: {
          totalSheets: sheets.length,
          totalFilms,
          totalShowings,
          processedFilms: results.processedFilms,
          createdConflicts: results.createdConflicts,
          createdEditions: results.createdEditions,
          createdSessions: results.createdSessions,
          sheetDetails: sheets.map(s => ({
            sheetName: s.sheetName,
            cinemaId: s.cinemaId,
            cinemaName: s.cinemaName,
            filmCount: s.filmCount,
          })),
        },
      })
      .eq('id', importJob.id);

    return NextResponse.json({
      success: results.errors.length === 0 || results.processedFilms > 0,
      importJobId: importJob.id,
      summary: {
        processedFilms: results.processedFilms,
        createdConflicts: results.createdConflicts,
        createdEditions: results.createdEditions,
        createdSessions: results.createdSessions,
        errors: results.errors,
      },
    });
  } catch (error: any) {
    console.error('[Import Execute] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute import' },
      { status: 500 }
    );
  }
}
