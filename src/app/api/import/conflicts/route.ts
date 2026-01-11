import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cinemaId = searchParams.get('cinema_id');
    const cinemaGroupId = searchParams.get('cinema_group_id');
    const state = searchParams.get('state');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('import_conflict_movies')
      .select(`
        *,
        cinema:cinemas(id, name),
        cinema_group:cinema_groups(id, name),
        matched_movie:movies_l0(id, original_title, poster_url),
        editions:import_conflict_editions(*),
        sessions:import_conflict_sessions(*)
      `)
      .order('created_at', { ascending: false });

    if (cinemaId) {
      query = query.eq('cinema_id', cinemaId);
    }

    if (cinemaGroupId) {
      query = query.eq('cinema_group_id', cinemaGroupId);
    }

    if (state) {
      query = query.eq('state', state);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: conflicts, error } = await query;

    if (error) {
      console.error('[Import Conflicts] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch conflicts' }, { status: 500 });
    }

    // Get total count
    let countQuery = supabase
      .from('import_conflict_movies')
      .select('id', { count: 'exact', head: true });

    if (cinemaId) {
      countQuery = countQuery.eq('cinema_id', cinemaId);
    }

    if (cinemaGroupId) {
      countQuery = countQuery.eq('cinema_group_id', cinemaGroupId);
    }

    if (state) {
      countQuery = countQuery.eq('state', state);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      conflicts: conflicts || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error('[Import Conflicts] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conflicts' },
      { status: 500 }
    );
  }
}

// Update conflict state
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conflict_id, state, matched_movie_l0_id } = body;

    if (!conflict_id) {
      return NextResponse.json({ error: 'Conflict ID is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (state) updates.state = state;
    if (matched_movie_l0_id !== undefined) updates.matched_movie_l0_id = matched_movie_l0_id;

    const { data, error } = await supabase
      .from('import_conflict_movies')
      .update(updates)
      .eq('id', conflict_id)
      .select()
      .single();

    if (error) {
      console.error('[Import Conflicts] Update error:', error);
      return NextResponse.json({ error: 'Failed to update conflict' }, { status: 500 });
    }

    return NextResponse.json({ success: true, conflict: data });
  } catch (error: any) {
    console.error('[Import Conflicts] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update conflict' },
      { status: 500 }
    );
  }
}

// Process verified conflicts - create actual movies/screenings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conflict_ids } = body;

    if (!conflict_ids || !Array.isArray(conflict_ids) || conflict_ids.length === 0) {
      return NextResponse.json({ error: 'Conflict IDs are required' }, { status: 400 });
    }

    const results = {
      processed: 0,
      created_movies: 0,
      created_screenings: 0,
      errors: [] as string[],
    };

    // Process each conflict
    for (const conflictId of conflict_ids) {
      try {
        // Get conflict with editions and sessions
        const { data: conflict, error: conflictError } = await supabase
          .from('import_conflict_movies')
          .select(`
            *,
            editions:import_conflict_editions(*),
            sessions:import_conflict_sessions(*)
          `)
          .eq('id', conflictId)
          .single();

        if (conflictError || !conflict) {
          results.errors.push(`Conflict ${conflictId} not found`);
          continue;
        }

        // Skip if not verified
        if (conflict.state !== 'verified') {
          results.errors.push(`Conflict ${conflictId} is not verified`);
          continue;
        }

        // Get or create movie_l0
        let movieL0Id = conflict.matched_movie_l0_id;

        if (!movieL0Id) {
          // Create new movie
          const { data: newMovie, error: movieError } = await supabase
            .from('movies_l0')
            .insert({
              original_title: conflict.movie_name || conflict.import_title,
              slug: (conflict.movie_name || conflict.import_title)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, ''),
              production_year: conflict.year_of_production,
              status: 'draft',
            })
            .select()
            .single();

          if (movieError) {
            results.errors.push(`Failed to create movie for: ${conflict.movie_name}`);
            continue;
          }

          movieL0Id = newMovie.id;
          results.created_movies++;
        }

        // Process editions and create movie_l2 records
        for (const edition of conflict.editions || []) {
          // Create movie_l2
          const { data: movieL2, error: l2Error } = await supabase
            .from('movies_l2')
            .insert({
              movie_l0_id: movieL0Id,
              edition_title: edition.full_title,
              format_id: edition.format_id,
              technology_id: edition.technology_id,
              audio_language_id: edition.language_id,
              is_original_version: !edition.language_id,
              is_active: true,
            })
            .select()
            .single();

          if (l2Error) {
            results.errors.push(`Failed to create edition for: ${edition.title}`);
            continue;
          }

          // Create screenings from sessions
          const editionSessions: any[] = conflict.sessions?.filter(
            (s: any) => s.conflict_edition_id === edition.id || !s.conflict_edition_id
          ) || [];

          if (editionSessions.length > 0 && conflict.cinema_id) {
            // Group by week
            const sessionsByWeek = new Map<string, any[]>();

            for (const session of editionSessions) {
              const weekKey = session.start_week_day || session.screening_date;
              if (!sessionsByWeek.has(weekKey)) {
                sessionsByWeek.set(weekKey, []);
              }
              sessionsByWeek.get(weekKey)!.push(session);
            }

            // Create screenings
            for (const [weekStart, weekSessions] of Array.from(sessionsByWeek.entries())) {
              // Create screening
              const { data: screening, error: screeningError } = await supabase
                .from('screenings')
                .insert({
                  cinema_id: conflict.cinema_id,
                  movie_l2_id: movieL2.id,
                  start_week_day: weekStart,
                  state: 'verified',
                })
                .select()
                .single();

              if (screeningError) {
                continue;
              }

              // Group sessions by date
              const sessionsByDate = new Map<string, any[]>();
              for (const session of weekSessions) {
                const date = session.screening_date || session.screening_datetime.split('T')[0];
                if (!sessionsByDate.has(date)) {
                  sessionsByDate.set(date, []);
                }
                sessionsByDate.get(date)!.push(session);
              }

              // Create session days and times
              for (const [date, dateSessions] of Array.from(sessionsByDate.entries())) {
                const { data: sessionDay, error: dayError } = await supabase
                  .from('session_days')
                  .insert({
                    screening_id: screening.id,
                    date,
                  })
                  .select()
                  .single();

                if (dayError) continue;

                // Create session times
                const timeInserts = dateSessions.map((s: any) => ({
                  session_day_id: sessionDay.id,
                  time_float: s.time_float || 0,
                  start_datetime: s.screening_datetime,
                }));

                await supabase.from('session_times').insert(timeInserts);
                results.created_screenings += timeInserts.length;
              }
            }
          }
        }

        // Mark conflict as processed
        await supabase
          .from('import_conflict_movies')
          .update({
            state: 'processed',
            is_created: true,
            matched_movie_l0_id: movieL0Id,
          })
          .eq('id', conflictId);

        results.processed++;
      } catch (err: any) {
        results.errors.push(`Error processing ${conflictId}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      results,
    });
  } catch (error: any) {
    console.error('[Import Conflicts Process] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process conflicts' },
      { status: 500 }
    );
  }
}
