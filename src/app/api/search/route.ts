import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: 'movies' | 'cinemas' | 'sessions';
  url: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({
      movies: [],
      cinemas: [],
      sessions: [],
    });
  }

  const supabase = await createClient();

  // Search in parallel
  const [moviesResult, cinemasResult, sessionsResult] = await Promise.all([
    // Search movies
    supabase
      .from('movies_l0')
      .select('id, original_title, production_year, imdb_id')
      .or(`original_title.ilike.%${query}%,imdb_id.ilike.%${query}%`)
      .limit(8),

    // Search cinemas
    supabase
      .from('cinemas')
      .select('id, name, city, cinema_group:cinema_groups(name)')
      .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
      .limit(8),

    // Search sessions by movie title or cinema name
    supabase
      .from('sessions')
      .select(`
        id,
        screening_date,
        screening_time,
        movie:movies_l2(
          movie_l1:movies_l1(
            movie:movies_l0(original_title)
          )
        ),
        cinema:cinemas(name)
      `)
      .limit(8),
  ]);

  // Format movies
  const movies: SearchResult[] = (moviesResult.data || []).map((movie) => ({
    id: movie.id,
    title: movie.original_title,
    subtitle: [
      movie.production_year && `(${movie.production_year})`,
      movie.imdb_id,
    ]
      .filter(Boolean)
      .join(' '),
    category: 'movies' as const,
    url: `/movies/${movie.id}`,
  }));

  // Format cinemas
  const cinemas: SearchResult[] = (cinemasResult.data || []).map((cinema) => {
    const group = Array.isArray(cinema.cinema_group)
      ? cinema.cinema_group[0]
      : cinema.cinema_group;
    return {
      id: cinema.id,
      title: cinema.name,
      subtitle: [cinema.city, group?.name].filter(Boolean).join(' • '),
      category: 'cinemas' as const,
      url: `/cinemas/${cinema.id}`,
    };
  });

  // Format sessions - filter those that match the query
  const sessions: SearchResult[] = (sessionsResult.data || [])
    .filter((session) => {
      const movieL2 = Array.isArray(session.movie) ? session.movie[0] : session.movie;
      const movieL1 = movieL2?.movie_l1
        ? (Array.isArray(movieL2.movie_l1) ? movieL2.movie_l1[0] : movieL2.movie_l1)
        : null;
      const movieL0 = movieL1?.movie
        ? (Array.isArray(movieL1.movie) ? movieL1.movie[0] : movieL1.movie)
        : null;
      const cinema = Array.isArray(session.cinema) ? session.cinema[0] : session.cinema;

      const movieTitle = movieL0?.original_title || '';
      const cinemaName = cinema?.name || '';
      const lowerQuery = query.toLowerCase();

      return (
        movieTitle.toLowerCase().includes(lowerQuery) ||
        cinemaName.toLowerCase().includes(lowerQuery)
      );
    })
    .slice(0, 5)
    .map((session) => {
      const movieL2 = Array.isArray(session.movie) ? session.movie[0] : session.movie;
      const movieL1 = movieL2?.movie_l1
        ? (Array.isArray(movieL2.movie_l1) ? movieL2.movie_l1[0] : movieL2.movie_l1)
        : null;
      const movieL0 = movieL1?.movie
        ? (Array.isArray(movieL1.movie) ? movieL1.movie[0] : movieL1.movie)
        : null;
      const cinema = Array.isArray(session.cinema) ? session.cinema[0] : session.cinema;

      return {
        id: session.id,
        title: movieL0?.original_title || 'Unknown Movie',
        subtitle: [
          cinema?.name,
          session.screening_date,
          session.screening_time?.slice(0, 5),
        ]
          .filter(Boolean)
          .join(' • '),
        category: 'sessions' as const,
        url: `/sessions/${session.id}`,
      };
    });

  return NextResponse.json({
    movies,
    cinemas,
    sessions,
  });
}
