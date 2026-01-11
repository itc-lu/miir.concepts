import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { ParsedFilmData, ParsedSheetResult } from '@/types/database.types';

interface ImportRequest {
  cinema_id: string;
  parser_id: string;
  sheets: ParsedSheetResult[];
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
    const { cinema_id, parser_id, sheets, options } = body;

    if (!cinema_id || !parser_id || !sheets) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch cinema
    const { data: cinema, error: cinemaError } = await supabase
      .from('cinemas')
      .select('*, cinema_group:cinema_groups(*)')
      .eq('id', cinema_id)
      .single();

    if (cinemaError || !cinema) {
      return NextResponse.json({ error: 'Cinema not found' }, { status: 404 });
    }

    // Create import job record
    const { data: importJob, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        user_id: user.id,
        cinema_id,
        parser_type: parser_id,
        status: 'processing',
        total_records: sheets.reduce((acc, s) => acc + s.films.length, 0),
        processed_records: 0,
        success_records: 0,
        error_records: 0,
      })
      .select()
      .single();

    if (jobError) {
      console.error('[Import Execute] Failed to create import job:', jobError);
      return NextResponse.json({ error: 'Failed to create import job' }, { status: 500 });
    }

    // If preview only, return what would be imported
    if (options.previewOnly) {
      return NextResponse.json({
        success: true,
        previewOnly: true,
        importJobId: importJob.id,
        summary: {
          totalFilms: sheets.reduce((acc, s) => acc + s.films.length, 0),
          totalShowings: sheets.reduce(
            (acc, s) => acc + s.films.reduce((a, f) => a + (f.screeningShows?.length || 0), 0),
            0
          ),
          wouldCreateConflicts: sheets.reduce((acc, s) => acc + s.films.length, 0),
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
      for (const film of sheet.films) {
        try {
          // Try to match film to existing movie
          const { data: existingMovies } = await supabase
            .from('movies_l0')
            .select('id, original_title')
            .or(`original_title.ilike.%${film.movieName}%,slug.eq.${film.movieName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)
            .limit(5);

          // Create import conflict record for manual review
          const { data: conflictMovie, error: conflictError } = await supabase
            .from('import_conflict_movies')
            .insert({
              cinema_group_id: cinema.cinema_group_id,
              cinema_id: cinema_id,
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
              format_codes: film.formatTechnology.formatStr ? [film.formatTechnology.formatStr] : [],
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
            const sessionInserts = film.screeningShows.map(show => ({
              conflict_movie_id: conflictMovie.id,
              cinema_id: cinema_id,
              screening_datetime: show.datetime.toISOString(),
              screening_date: show.date.toISOString().split('T')[0],
              time_float: show.timeFloat,
              title: film.movieName,
              language_code: film.languageCode,
              duration_minutes: film.durationMinutes,
              format_code: film.formatTechnology.formatStr,
              start_week_day: film.startWeekDate?.toISOString().split('T')[0] || null,
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

    // Update import job status
    await supabase
      .from('import_jobs')
      .update({
        status: results.errors.length > 0 ? 'completed' : 'completed',
        processed_records: results.processedFilms,
        success_records: results.createdConflicts,
        error_records: results.errors.length,
        completed_at: new Date().toISOString(),
        errors: results.errors.length > 0 ? { messages: results.errors } : null,
      })
      .eq('id', importJob.id);

    return NextResponse.json({
      success: true,
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
