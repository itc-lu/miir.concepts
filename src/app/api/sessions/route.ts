import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const date = searchParams.get('date');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const cinemaId = searchParams.get('cinema_id');
  const movieId = searchParams.get('movie_id');

  const offset = (page - 1) * limit;

  let query = supabase
    .from('sessions')
    .select(
      `
      id,
      show_date,
      show_time,
      end_time,
      screen_name,
      price,
      currency,
      booking_url,
      is_cancelled,
      notes,
      created_at,
      cinema:cinemas(id, name, slug, city),
      movie_l2:movies_l2(
        id,
        edition_title,
        is_original_version,
        format:formats(id, code, name),
        technology:technologies(id, code, name),
        audio_language:languages!movies_l2_audio_language_id_fkey(id, code, name),
        subtitle_language:languages!movies_l2_subtitle_language_id_fkey(id, code, name),
        movie_l0:movies_l0(
          id,
          original_title,
          slug,
          production_year,
          runtime_minutes,
          poster_url
        )
      ),
      tags:session_session_tags(tag:session_tags(id, name, color))
    `,
      { count: 'exact' }
    )
    .order('show_date', { ascending: true })
    .order('show_time', { ascending: true })
    .range(offset, offset + limit - 1);

  if (date) {
    query = query.eq('show_date', date);
  } else if (dateFrom || dateTo) {
    if (dateFrom) {
      query = query.gte('show_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('show_date', dateTo);
    }
  }

  if (cinemaId) {
    query = query.eq('cinema_id', cinemaId);
  }

  if (movieId) {
    query = query.eq('movie_l2.movie_l0_id', movieId);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const {
      movie_l2_id,
      cinema_id,
      screen_name,
      show_date,
      show_time,
      end_time,
      price,
      currency = 'EUR',
      booking_url,
      notes,
      tag_ids = [],
    } = body;

    // Validate required fields
    if (!movie_l2_id || !cinema_id || !show_date || !show_time) {
      return NextResponse.json(
        { error: 'Missing required fields: movie_l2_id, cinema_id, show_date, show_time' },
        { status: 400 }
      );
    }

    // Insert session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        movie_l2_id,
        cinema_id,
        screen_name,
        show_date,
        show_time,
        end_time,
        price,
        currency,
        booking_url,
        notes,
      })
      .select()
      .single();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 400 });
    }

    // Add tags
    if (tag_ids.length > 0) {
      await supabase.from('session_session_tags').insert(
        tag_ids.map((tag_id: string) => ({
          session_id: session.id,
          tag_id,
        }))
      );
    }

    return NextResponse.json({ data: session }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  const { error } = await supabase.from('sessions').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
