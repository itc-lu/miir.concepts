import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search');
  const status = searchParams.get('status');
  const verified = searchParams.get('verified');

  const offset = (page - 1) * limit;

  let query = supabase
    .from('movies_l0')
    .select(
      `
      id,
      original_title,
      slug,
      production_year,
      runtime_minutes,
      poster_url,
      status,
      is_verified,
      created_at,
      genres:movie_l0_genres(genre:genres(id, name)),
      countries:movie_l0_countries(country:countries(id, code, name)),
      l1_count:movies_l1(count),
      l2_count:movies_l2(count)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike('original_title', `%${search}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (verified !== null) {
    query = query.eq('is_verified', verified === 'true');
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
      original_title,
      production_year,
      runtime_minutes,
      poster_url,
      backdrop_url,
      trailer_url,
      imdb_id,
      tmdb_id,
      notes,
      status = 'draft',
      country_ids = [],
      genre_ids = [],
      tag_ids = [],
    } = body;

    // Generate slug
    const slug = original_title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    // Insert movie
    const { data: movie, error: movieError } = await supabase
      .from('movies_l0')
      .insert({
        original_title,
        slug,
        production_year,
        runtime_minutes,
        poster_url,
        backdrop_url,
        trailer_url,
        imdb_id,
        tmdb_id,
        notes,
        status,
      })
      .select()
      .single();

    if (movieError) {
      return NextResponse.json({ error: movieError.message }, { status: 400 });
    }

    // Add countries
    if (country_ids.length > 0) {
      await supabase.from('movie_l0_countries').insert(
        country_ids.map((country_id: string, index: number) => ({
          movie_id: movie.id,
          country_id,
          is_primary: index === 0,
        }))
      );
    }

    // Add genres
    if (genre_ids.length > 0) {
      await supabase.from('movie_l0_genres').insert(
        genre_ids.map((genre_id: string, index: number) => ({
          movie_id: movie.id,
          genre_id,
          is_primary: index === 0,
          display_order: index,
        }))
      );
    }

    // Add tags
    if (tag_ids.length > 0) {
      await supabase.from('movie_l0_tags').insert(
        tag_ids.map((tag_id: string) => ({
          movie_id: movie.id,
          tag_id,
        }))
      );
    }

    return NextResponse.json({ data: movie }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
