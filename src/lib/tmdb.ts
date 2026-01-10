// TMDB API Service
// Get your API key from https://www.themoviedb.org/settings/api

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// API key should be set in environment variables
function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!key) {
    console.warn('TMDB API key not configured. Set NEXT_PUBLIC_TMDB_API_KEY in your environment.');
  }
  return key || '';
}

export interface TMDBSearchResult {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  genre_ids: number[];
}

export interface TMDBMovieDetails {
  id: number;
  imdb_id: string | null;
  title: string;
  original_title: string;
  original_language: string;
  release_date: string;
  runtime: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  tagline: string | null;
  vote_average: number;
  genres: Array<{ id: number; name: string }>;
  production_companies: Array<{
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }>;
  production_countries: Array<{
    iso_3166_1: string;
    name: string;
  }>;
  spoken_languages: Array<{
    iso_639_1: string;
    name: string;
    english_name: string;
  }>;
}

export interface TMDBCredits {
  id: number;
  cast: Array<{
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }>;
  crew: Array<{
    id: number;
    name: string;
    job: string;
    department: string;
    profile_path: string | null;
  }>;
}

export interface TMDBImages {
  id: number;
  backdrops: Array<{
    file_path: string;
    width: number;
    height: number;
  }>;
  posters: Array<{
    file_path: string;
    width: number;
    height: number;
    iso_639_1: string | null;
  }>;
}

export interface TMDBTranslations {
  id: number;
  translations: Array<{
    iso_639_1: string;
    iso_3166_1: string;
    name: string;
    english_name: string;
    data: {
      title: string;
      overview: string;
      tagline: string;
      runtime: number;
    };
  }>;
}

export interface TMDBVideos {
  id: number;
  results: Array<{
    id: string;
    key: string;
    name: string;
    site: string;
    type: string;
    official: boolean;
  }>;
}

// Image URL helpers
export function getTMDBImageUrl(path: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getTMDBPosterUrl(path: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string | null {
  return getTMDBImageUrl(path, size);
}

export function getTMDBBackdropUrl(path: string | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w1280'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

// API functions
export async function searchMovies(query: string, page = 1): Promise<{ results: TMDBSearchResult[]; total_results: number; total_pages: number }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { results: [], total_results: 0, total_pages: 0 };
  }

  const response = await fetch(
    `${TMDB_API_BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${page}&include_adult=false`,
    { next: { revalidate: 3600 } }
  );

  if (!response.ok) {
    console.error('TMDB search failed:', response.status);
    return { results: [], total_results: 0, total_pages: 0 };
  }

  return response.json();
}

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const response = await fetch(
    `${TMDB_API_BASE}/movie/${tmdbId}?api_key=${apiKey}`,
    { next: { revalidate: 3600 } }
  );

  if (!response.ok) {
    console.error('TMDB movie details failed:', response.status);
    return null;
  }

  return response.json();
}

export async function getMovieCredits(tmdbId: number): Promise<TMDBCredits | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const response = await fetch(
    `${TMDB_API_BASE}/movie/${tmdbId}/credits?api_key=${apiKey}`,
    { next: { revalidate: 3600 } }
  );

  if (!response.ok) {
    console.error('TMDB credits failed:', response.status);
    return null;
  }

  return response.json();
}

export async function getMovieImages(tmdbId: number): Promise<TMDBImages | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const response = await fetch(
    `${TMDB_API_BASE}/movie/${tmdbId}/images?api_key=${apiKey}`,
    { next: { revalidate: 3600 } }
  );

  if (!response.ok) {
    console.error('TMDB images failed:', response.status);
    return null;
  }

  return response.json();
}

export async function getMovieTranslations(tmdbId: number): Promise<TMDBTranslations | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const response = await fetch(
    `${TMDB_API_BASE}/movie/${tmdbId}/translations?api_key=${apiKey}`,
    { next: { revalidate: 3600 } }
  );

  if (!response.ok) {
    console.error('TMDB translations failed:', response.status);
    return null;
  }

  return response.json();
}

export async function getMovieVideos(tmdbId: number): Promise<TMDBVideos | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const response = await fetch(
    `${TMDB_API_BASE}/movie/${tmdbId}/videos?api_key=${apiKey}`,
    { next: { revalidate: 3600 } }
  );

  if (!response.ok) {
    console.error('TMDB videos failed:', response.status);
    return null;
  }

  return response.json();
}

// Get all movie data at once
export async function getFullMovieData(tmdbId: number) {
  const [details, credits, images, translations, videos] = await Promise.all([
    getMovieDetails(tmdbId),
    getMovieCredits(tmdbId),
    getMovieImages(tmdbId),
    getMovieTranslations(tmdbId),
    getMovieVideos(tmdbId),
  ]);

  if (!details) return null;

  // Find trailer (prefer official YouTube trailers)
  const trailer = videos?.results.find(
    v => v.site === 'YouTube' && v.type === 'Trailer' && v.official
  ) || videos?.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');

  // Get directors, screenplay, music
  const directors = credits?.crew.filter(c => c.job === 'Director') || [];
  const screenplay = credits?.crew.filter(c => c.job === 'Screenplay' || c.job === 'Writer') || [];
  const music = credits?.crew.filter(c => c.job === 'Original Music Composer' || c.job === 'Music') || [];

  // Get cast (top 10)
  const cast = credits?.cast.slice(0, 10) || [];

  // Get translations for DE, FR, EN, LU (using DE as fallback for LU)
  const getTranslation = (langCode: string) => {
    return translations?.translations.find(t => t.iso_639_1 === langCode);
  };

  const plots = {
    en: getTranslation('en')?.data.overview || details.overview || '',
    de: getTranslation('de')?.data.overview || '',
    fr: getTranslation('fr')?.data.overview || '',
    lu: getTranslation('lb')?.data.overview || getTranslation('de')?.data.overview || '', // Luxembourgish or German fallback
  };

  return {
    details,
    credits,
    images,
    translations,
    videos,
    trailer: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    directors,
    screenplay,
    music,
    cast,
    plots,
  };
}

// IMDB lookup (via TMDB's external IDs)
export async function findByImdbId(imdbId: string): Promise<number | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const response = await fetch(
    `${TMDB_API_BASE}/find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`,
    { next: { revalidate: 3600 } }
  );

  if (!response.ok) {
    console.error('TMDB find by IMDB failed:', response.status);
    return null;
  }

  const data = await response.json();
  const movie = data.movie_results?.[0];
  return movie?.id || null;
}

// Genre mapping (TMDB genre IDs to names)
export const TMDB_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

export function getGenreName(genreId: number): string {
  return TMDB_GENRES[genreId] || 'Unknown';
}
