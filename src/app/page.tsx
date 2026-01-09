'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, addDays, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Demo data
const MOVIES = [
  {
    id: '1',
    title: 'Dune: Part Two',
    year: 2024,
    runtime: 166,
    rating: 8.8,
    ageRating: '12',
    poster: 'https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
    plot: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson'],
    genres: ['Sci-Fi', 'Adventure'],
  },
  {
    id: '2',
    title: 'Poor Things',
    year: 2023,
    runtime: 141,
    rating: 8.0,
    ageRating: '16',
    poster: 'https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg',
    plot: 'Brought back to life by an unorthodox scientist, a young woman runs off with a debauched lawyer on a whirlwind adventure.',
    director: 'Yorgos Lanthimos',
    cast: ['Emma Stone', 'Mark Ruffalo', 'Willem Dafoe'],
    genres: ['Drama', 'Comedy'],
  },
  {
    id: '3',
    title: 'Oppenheimer',
    year: 2023,
    runtime: 180,
    rating: 8.4,
    ageRating: '12',
    poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    plot: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    director: 'Christopher Nolan',
    cast: ['Cillian Murphy', 'Emily Blunt', 'Robert Downey Jr.'],
    genres: ['Drama', 'History'],
  },
  {
    id: '4',
    title: 'Anatomie d\'une chute',
    year: 2023,
    runtime: 150,
    rating: 7.8,
    ageRating: '12',
    poster: 'https://image.tmdb.org/t/p/w500/kQs6keheMwCxJxrzV83VUwFtHkB.jpg',
    plot: 'A woman is suspected of her husband\'s murder, and their blind son faces a dilemma as the sole witness.',
    director: 'Justine Triet',
    cast: ['Sandra Hüller', 'Swann Arlaud'],
    genres: ['Drama', 'Thriller'],
  },
  {
    id: '5',
    title: 'Wonka',
    year: 2023,
    runtime: 116,
    rating: 7.1,
    ageRating: '6',
    poster: 'https://image.tmdb.org/t/p/w500/qhb1qOilapbapxWQn9jtRCMwXJF.jpg',
    plot: 'Willy Wonka – chock-full of ideas and determined to change the world one delectable bite at a time.',
    director: 'Paul King',
    cast: ['Timothée Chalamet', 'Olivia Colman'],
    genres: ['Family', 'Fantasy'],
  },
];

const CINEMAS = [
  { id: '1', name: 'Kinepolis Kirchberg', city: 'Luxembourg-Kirchberg' },
  { id: '2', name: 'Kinepolis Belval', city: 'Esch-Belval' },
  { id: '3', name: 'Ciné Utopia', city: 'Luxembourg-Limpertsberg' },
  { id: '4', name: 'Ciné Scala', city: 'Diekirch' },
];

const SESSIONS = [
  // Dune at Kinepolis Kirchberg
  { movieId: '1', cinemaId: '1', time: '14:00', lang: 'EN', sub: 'DE/FR', format: 'IMAX' },
  { movieId: '1', cinemaId: '1', time: '17:30', lang: 'EN', sub: 'DE/FR', format: 'IMAX' },
  { movieId: '1', cinemaId: '1', time: '20:45', lang: 'EN', sub: 'FR', format: '3D' },
  { movieId: '1', cinemaId: '1', time: '15:00', lang: 'DE', sub: null, format: null },
  // Dune at Kinepolis Belval
  { movieId: '1', cinemaId: '2', time: '15:30', lang: 'EN', sub: 'FR', format: '4DX' },
  { movieId: '1', cinemaId: '2', time: '19:00', lang: 'EN', sub: 'DE', format: '3D' },
  { movieId: '1', cinemaId: '2', time: '21:30', lang: 'DE', sub: null, format: null },
  // Dune at other cinemas
  { movieId: '1', cinemaId: '3', time: '20:00', lang: 'EN', sub: 'FR', format: null },
  { movieId: '1', cinemaId: '4', time: '20:15', lang: 'DE', sub: null, format: null },
  // Poor Things
  { movieId: '2', cinemaId: '1', time: '16:15', lang: 'EN', sub: 'DE', format: null },
  { movieId: '2', cinemaId: '1', time: '21:00', lang: 'EN', sub: 'FR', format: null },
  { movieId: '2', cinemaId: '3', time: '18:30', lang: 'EN', sub: 'DE/FR', format: null },
  { movieId: '2', cinemaId: '3', time: '21:15', lang: 'EN', sub: 'DE', format: null },
  // Oppenheimer
  { movieId: '3', cinemaId: '1', time: '19:00', lang: 'EN', sub: 'DE/FR', format: 'IMAX' },
  { movieId: '3', cinemaId: '2', time: '19:30', lang: 'EN', sub: 'FR', format: null },
  { movieId: '3', cinemaId: '2', time: '14:00', lang: 'DE', sub: null, format: null },
  // Anatomie
  { movieId: '4', cinemaId: '3', time: '17:45', lang: 'FR', sub: 'DE', format: null },
  { movieId: '4', cinemaId: '3', time: '20:30', lang: 'FR', sub: 'EN', format: null },
  // Wonka
  { movieId: '5', cinemaId: '1', time: '14:30', lang: 'DE', sub: null, format: null },
  { movieId: '5', cinemaId: '1', time: '17:00', lang: 'DE', sub: null, format: null },
  { movieId: '5', cinemaId: '2', time: '15:00', lang: 'DE', sub: null, format: null },
  { movieId: '5', cinemaId: '4', time: '15:30', lang: 'LU', sub: null, format: null },
];

type ViewMode = 'movies' | 'cinemas';

export default function CinemaProgram() {
  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('movies');
  const [selectedMovie, setSelectedMovie] = useState<string | null>(null);
  const [selectedCinema, setSelectedCinema] = useState<string | null>(null);
  const [filterLang, setFilterLang] = useState<string | null>(null);
  const [filterFormat, setFilterFormat] = useState<string | null>(null);

  // Fix hydration - only render dates on client
  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setToday(now);
    setSelectedDate(now);
    setMounted(true);
  }, []);

  if (!mounted || !today || !selectedDate) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-lg">Laden...</div>
      </div>
    );
  }

  const dateRange = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  // Get unique languages and formats from sessions
  const languages = [...new Set(SESSIONS.map(s => s.lang))];
  const formats = [...new Set(SESSIONS.filter(s => s.format).map(s => s.format!))];

  // Filter sessions
  const filteredSessions = SESSIONS.filter(s => {
    if (filterLang && s.lang !== filterLang) return false;
    if (filterFormat && s.format !== filterFormat) return false;
    if (viewMode === 'movies' && selectedMovie && s.movieId !== selectedMovie) return false;
    if (viewMode === 'cinemas' && selectedCinema && s.cinemaId !== selectedCinema) return false;
    return true;
  });

  // Group by movie or cinema
  const groupedByMovie = MOVIES.map(movie => ({
    movie,
    sessions: filteredSessions.filter(s => s.movieId === movie.id),
  })).filter(g => g.sessions.length > 0);

  const groupedByCinema = CINEMAS.map(cinema => ({
    cinema,
    sessions: filteredSessions.filter(s => s.cinemaId === cinema.id),
  })).filter(g => g.sessions.length > 0);

  const clearFilters = () => {
    setFilterLang(null);
    setFilterFormat(null);
    setSelectedMovie(null);
    setSelectedCinema(null);
  };

  const hasFilters = filterLang || filterFormat || selectedMovie || selectedCinema;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Kinoprogramm</h1>
              <p className="text-slate-400 text-sm">Luxembourg</p>
            </div>
            <Link
              href="/login"
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Date Selector */}
      <div className="bg-slate-900/50 border-b border-slate-700/50 sticky top-[73px] z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dateRange.map((date, idx) => {
              const isSelected = isSameDay(date, selectedDate);
              const isToday = idx === 0;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'flex flex-col items-center px-4 py-2 rounded-xl min-w-[70px] transition-all',
                    isSelected
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                  )}
                >
                  <span className="text-xs font-medium uppercase">
                    {isToday ? 'Heute' : format(date, 'EEE', { locale: de })}
                  </span>
                  <span className="text-xl font-bold">{format(date, 'd')}</span>
                  <span className="text-xs opacity-70">{format(date, 'MMM', { locale: de })}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="bg-slate-800/30 border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* View Toggle */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => { setViewMode('movies'); setSelectedCinema(null); }}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-all',
                  viewMode === 'movies'
                    ? 'bg-amber-500 text-slate-900'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                🎬 Nach Film suchen
              </button>
              <button
                onClick={() => { setViewMode('cinemas'); setSelectedMovie(null); }}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-all',
                  viewMode === 'cinemas'
                    ? 'bg-amber-500 text-slate-900'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                🏠 Nach Kino suchen
              </button>
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-slate-400 hover:text-amber-400 transition-colors"
              >
                ✕ Filter zurücksetzen
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Language Filter */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">Sprache:</span>
              <div className="flex gap-1">
                {languages.map(lang => (
                  <button
                    key={lang}
                    onClick={() => setFilterLang(filterLang === lang ? null : lang)}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium transition-all',
                      filterLang === lang
                        ? 'bg-amber-500 text-slate-900'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    )}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Format Filter */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">Format:</span>
              <div className="flex gap-1">
                {formats.map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setFilterFormat(filterFormat === fmt ? null : fmt)}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium transition-all',
                      filterFormat === fmt
                        ? 'bg-amber-500 text-slate-900'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    )}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Date Display */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white">
            {format(selectedDate, 'EEEE', { locale: de })}
          </h2>
          <p className="text-slate-400">{format(selectedDate, 'd. MMMM yyyy', { locale: de })}</p>
        </div>

        {viewMode === 'movies' ? (
          /* Movies View */
          <div className="space-y-6">
            {groupedByMovie.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-slate-400 text-lg">Keine Vorstellungen mit diesen Filtern gefunden.</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 px-6 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                >
                  Filter zurücksetzen
                </button>
              </div>
            ) : (
              groupedByMovie.map(({ movie, sessions }) => {
                const isExpanded = selectedMovie === movie.id;
                const sessionsByCinema = CINEMAS.map(cinema => ({
                  cinema,
                  sessions: sessions.filter(s => s.cinemaId === cinema.id),
                })).filter(g => g.sessions.length > 0);

                return (
                  <article
                    key={movie.id}
                    className="bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex gap-4 sm:gap-6">
                        {/* Poster */}
                        <div className="w-24 sm:w-32 flex-shrink-0">
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="w-full rounded-xl shadow-2xl"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                              {movie.title}
                            </h3>
                            <div className="flex items-center gap-1 bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg flex-shrink-0">
                              <span className="text-sm">★</span>
                              <span className="text-sm font-bold">{movie.rating}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-slate-400">
                            <span>{movie.year}</span>
                            <span className="text-slate-600">•</span>
                            <span>{movie.runtime} min</span>
                            <span className="text-slate-600">•</span>
                            <span className="px-2 py-0.5 bg-slate-700 rounded text-xs">{movie.ageRating}+</span>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-3">
                            {movie.genres.map(g => (
                              <span key={g} className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded-lg text-xs">
                                {g}
                              </span>
                            ))}
                          </div>

                          {/* Expand button */}
                          <button
                            onClick={() => setSelectedMovie(isExpanded ? null : movie.id)}
                            className="mt-3 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                          >
                            {isExpanded ? '▲ Weniger anzeigen' : '▼ Details & Spielzeiten'}
                          </button>
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="mt-6 pt-6 border-t border-slate-700/50">
                          <p className="text-slate-300 leading-relaxed mb-4">{movie.plot}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-6">
                            <div>
                              <span className="text-slate-500">Regie:</span> {movie.director}
                            </div>
                            <div>
                              <span className="text-slate-500">Mit:</span> {movie.cast.join(', ')}
                            </div>
                          </div>

                          {/* Showtimes by cinema */}
                          <div className="space-y-4">
                            {sessionsByCinema.map(({ cinema, sessions: cinemaSessions }) => (
                              <div key={cinema.id} className="bg-slate-900/50 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-white font-medium">{cinema.name}</span>
                                  <span className="text-slate-500 text-sm">{cinema.city}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {cinemaSessions.map((session, idx) => (
                                    <button
                                      key={idx}
                                      className="group relative px-4 py-2 bg-slate-700 hover:bg-amber-500 text-white hover:text-slate-900 rounded-lg font-mono text-sm font-medium transition-all"
                                    >
                                      {session.time}
                                      <span className="block text-xs opacity-70 group-hover:opacity-100">
                                        {session.lang}{session.sub && ` (${session.sub})`}
                                      </span>
                                      {session.format && (
                                        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-amber-500 text-slate-900 text-[10px] font-bold rounded">
                                          {session.format}
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        ) : (
          /* Cinemas View */
          <div className="space-y-6">
            {/* Cinema selector */}
            <div className="flex flex-wrap gap-2">
              {CINEMAS.map(cinema => (
                <button
                  key={cinema.id}
                  onClick={() => setSelectedCinema(selectedCinema === cinema.id ? null : cinema.id)}
                  className={cn(
                    'px-4 py-2 rounded-xl font-medium transition-all',
                    selectedCinema === cinema.id
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  )}
                >
                  {cinema.name}
                </button>
              ))}
            </div>

            {/* Movies at selected cinema(s) */}
            {groupedByCinema.map(({ cinema, sessions }) => {
              const movieIds = [...new Set(sessions.map(s => s.movieId))];

              return (
                <section key={cinema.id} className="bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-700/50">
                  <div className="bg-slate-800 px-6 py-4 border-b border-slate-700/50">
                    <h3 className="text-xl font-bold text-white">{cinema.name}</h3>
                    <p className="text-slate-400 text-sm">{cinema.city}</p>
                  </div>

                  <div className="p-4 sm:p-6 space-y-4">
                    {movieIds.map(movieId => {
                      const movie = MOVIES.find(m => m.id === movieId)!;
                      const movieSessions = sessions.filter(s => s.movieId === movieId);

                      return (
                        <div key={movieId} className="flex gap-4 p-4 bg-slate-900/30 rounded-xl">
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="w-16 h-24 object-cover rounded-lg flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white">{movie.title}</h4>
                            <p className="text-sm text-slate-400 mb-3">{movie.runtime} min • {movie.genres[0]}</p>
                            <div className="flex flex-wrap gap-2">
                              {movieSessions.map((session, idx) => (
                                <button
                                  key={idx}
                                  className="px-3 py-1.5 bg-slate-700 hover:bg-amber-500 text-white hover:text-slate-900 rounded-lg text-sm font-medium transition-all"
                                >
                                  <span className="font-mono">{session.time}</span>
                                  <span className="ml-1 text-xs opacity-70">
                                    {session.lang}
                                    {session.format && ` • ${session.format}`}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>© {new Date().getFullYear()} miir.concepts</p>
            <div className="flex gap-6">
              <Link href="/impressum" className="hover:text-white transition-colors">Impressum</Link>
              <Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
