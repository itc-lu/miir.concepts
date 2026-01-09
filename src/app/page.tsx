'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Film, MapPin, Clock, Globe, ChevronDown, ChevronUp, X,
  SlidersHorizontal, Calendar, Star, Users, Clapperboard
} from 'lucide-react';

// Rich demo data with full movie details
const DEMO_MOVIES = [
  {
    id: '1',
    title: 'Dune: Part Two',
    originalTitle: 'Dune: Part Two',
    year: 2024,
    runtime: 166,
    rating: 'PG-13',
    imdbRating: 8.8,
    poster: 'https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
    plot: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he must prevent a terrible future only he can foresee.',
    director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Josh Brolin', 'Austin Butler', 'Florence Pugh'],
    genres: ['Science Fiction', 'Adventure', 'Drama'],
    tags: ['Epic', 'Sequel', 'Bestseller'],
  },
  {
    id: '2',
    title: 'Poor Things',
    originalTitle: 'Poor Things',
    year: 2023,
    runtime: 141,
    rating: 'R',
    imdbRating: 8.0,
    poster: 'https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/bQS43HSLZzMjZkcHJz4fGc7fNdz.jpg',
    plot: 'Brought back to life by an unorthodox scientist, a young woman runs off with a debauched lawyer on a whirlwind adventure across the continents.',
    director: 'Yorgos Lanthimos',
    cast: ['Emma Stone', 'Mark Ruffalo', 'Willem Dafoe', 'Ramy Youssef'],
    genres: ['Comedy', 'Drama', 'Romance'],
    tags: ['Oscar Winner', 'Arthouse'],
  },
  {
    id: '3',
    title: 'Oppenheimer',
    originalTitle: 'Oppenheimer',
    year: 2023,
    runtime: 180,
    rating: 'R',
    imdbRating: 8.4,
    poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/nb3xI8XI3w4pMVZ38VijbsyBqP4.jpg',
    plot: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.',
    director: 'Christopher Nolan',
    cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon', 'Robert Downey Jr.', 'Florence Pugh'],
    genres: ['Drama', 'History', 'Biography'],
    tags: ['Oscar Winner', 'Epic', 'Masterpiece'],
  },
  {
    id: '4',
    title: 'Anatomie d\'une chute',
    originalTitle: 'Anatomy of a Fall',
    year: 2023,
    runtime: 150,
    rating: 'R',
    imdbRating: 7.8,
    poster: 'https://image.tmdb.org/t/p/w500/kQs6keheMwCxJxrzV83VUwFtHkB.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/9jPoyxjiEYPylUIMI3Ntixf8z3M.jpg',
    plot: 'A woman is suspected of her husband\'s murder, and their blind son faces a dilemma as the sole witness in a gripping courtroom drama.',
    director: 'Justine Triet',
    cast: ['Sandra Hüller', 'Swann Arlaud', 'Milo Machado Graner'],
    genres: ['Drama', 'Thriller', 'Mystery'],
    tags: ['Palme d\'Or', 'Oscar Nominee'],
  },
  {
    id: '5',
    title: 'The Zone of Interest',
    originalTitle: 'The Zone of Interest',
    year: 2023,
    runtime: 105,
    rating: 'PG-13',
    imdbRating: 7.4,
    poster: 'https://image.tmdb.org/t/p/w500/hUu9zyZmDd8VZegKi1iK1Vk0RYS.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/cxevDYdeFkiixRShbObdwAHBZry.jpg',
    plot: 'The commandant of Auschwitz, Rudolf Höss, and his wife Hedwig, strive to build a dream life for their family in a house and garden next to the camp.',
    director: 'Jonathan Glazer',
    cast: ['Christian Friedel', 'Sandra Hüller'],
    genres: ['Drama', 'History', 'War'],
    tags: ['Oscar Winner', 'Arthouse'],
  },
  {
    id: '6',
    title: 'Wonka',
    originalTitle: 'Wonka',
    year: 2023,
    runtime: 116,
    rating: 'PG',
    imdbRating: 7.1,
    poster: 'https://image.tmdb.org/t/p/w500/qhb1qOilapbapxWQn9jtRCMwXJF.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/yOm993lsJyPmBodlYjgpPwBjXP9.jpg',
    plot: 'Willy Wonka – chock-full of ideas and determined to change the world one delectable bite at a time – is proof that the best things in life begin with a dream.',
    director: 'Paul King',
    cast: ['Timothée Chalamet', 'Gustave Die', 'Murray Abraham', 'Olivia Colman'],
    genres: ['Family', 'Comedy', 'Fantasy'],
    tags: ['Family Friendly', 'Musical'],
  },
];

// Cinema schedules
const DEMO_SCHEDULES = [
  {
    cinemaId: '1',
    cinema: { id: '1', name: 'Kinepolis Kirchberg', city: 'Luxembourg', address: '45 Avenue John F. Kennedy' },
    sessions: [
      { movieId: '1', times: ['14:00', '17:30', '20:45'], language: 'EN', subtitles: 'DE/FR', format: 'IMAX', technology: 'Dolby Atmos' },
      { movieId: '1', times: ['15:30', '19:00'], language: 'EN', subtitles: 'FR', format: '3D', technology: null },
      { movieId: '2', times: ['16:15', '19:00', '21:30'], language: 'EN', subtitles: 'DE', format: null, technology: null },
      { movieId: '3', times: ['19:30'], language: 'EN', subtitles: 'FR', format: 'IMAX', technology: 'Dolby Atmos' },
      { movieId: '6', times: ['14:00', '16:30'], language: 'DE', subtitles: null, format: null, technology: null },
    ],
  },
  {
    cinemaId: '2',
    cinema: { id: '2', name: 'Ciné Utopia', city: 'Luxembourg', address: '16 Avenue de la Faïencerie' },
    sessions: [
      { movieId: '4', times: ['18:00', '21:00'], language: 'FR', subtitles: 'DE', format: null, technology: null },
      { movieId: '5', times: ['17:30', '20:15'], language: 'DE', subtitles: 'EN', format: null, technology: null },
      { movieId: '2', times: ['20:00'], language: 'EN', subtitles: 'FR', format: null, technology: null },
    ],
  },
  {
    cinemaId: '3',
    cinema: { id: '3', name: 'Kinepolis Belval', city: 'Esch-sur-Alzette', address: '17 Avenue du Rock\'n\'Roll' },
    sessions: [
      { movieId: '1', times: ['15:00', '18:30', '21:45'], language: 'EN', subtitles: 'FR', format: '3D', technology: '4DX' },
      { movieId: '6', times: ['14:30', '17:00'], language: 'DE', subtitles: null, format: null, technology: null },
      { movieId: '3', times: ['20:00'], language: 'EN', subtitles: 'DE', format: null, technology: 'Dolby Atmos' },
    ],
  },
  {
    cinemaId: '4',
    cinema: { id: '4', name: 'Ciné Scala', city: 'Diekirch', address: '2 Place Guillaume' },
    sessions: [
      { movieId: '1', times: ['20:00'], language: 'EN', subtitles: 'DE/FR', format: null, technology: null },
      { movieId: '6', times: ['15:00', '17:30'], language: 'DE', subtitles: null, format: null, technology: null },
    ],
  },
];

// Filter options derived from data
const CINEMAS = DEMO_SCHEDULES.map(s => s.cinema);
const LANGUAGES = ['EN', 'DE', 'FR'];
const SUBTITLES = ['DE', 'FR', 'EN', 'DE/FR'];
const FORMATS = ['IMAX', '3D'];
const TECHNOLOGIES = ['Dolby Atmos', '4DX'];
const GENRES = [...new Set(DEMO_MOVIES.flatMap(m => m.genres))];

type ViewMode = 'movies' | 'cinemas';

export default function CinemaProgramPage() {
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [viewMode, setViewMode] = useState<ViewMode>('movies');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedMovie, setExpandedMovie] = useState<string | null>(null);

  // Filters
  const [selectedCinemas, setSelectedCinemas] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedSubtitles, setSelectedSubtitles] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedTechnologies, setSelectedTechnologies] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const dateRange = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfToday(), i)),
    []
  );

  const hasActiveFilters = selectedCinemas.length > 0 || selectedLanguages.length > 0 ||
    selectedSubtitles.length > 0 || selectedFormats.length > 0 ||
    selectedTechnologies.length > 0 || selectedGenres.length > 0;

  const clearFilters = () => {
    setSelectedCinemas([]);
    setSelectedLanguages([]);
    setSelectedSubtitles([]);
    setSelectedFormats([]);
    setSelectedTechnologies([]);
    setSelectedGenres([]);
  };

  // Filter sessions based on selected filters
  const filteredSchedules = useMemo(() => {
    return DEMO_SCHEDULES
      .filter(schedule => selectedCinemas.length === 0 || selectedCinemas.includes(schedule.cinemaId))
      .map(schedule => ({
        ...schedule,
        sessions: schedule.sessions.filter(session => {
          if (selectedLanguages.length > 0 && !selectedLanguages.includes(session.language)) return false;
          if (selectedSubtitles.length > 0 && session.subtitles && !selectedSubtitles.some(s => session.subtitles?.includes(s))) return false;
          if (selectedFormats.length > 0 && !selectedFormats.includes(session.format || '')) return false;
          if (selectedTechnologies.length > 0 && !selectedTechnologies.includes(session.technology || '')) return false;

          const movie = DEMO_MOVIES.find(m => m.id === session.movieId);
          if (selectedGenres.length > 0 && movie && !movie.genres.some(g => selectedGenres.includes(g))) return false;

          return true;
        }),
      }))
      .filter(schedule => schedule.sessions.length > 0);
  }, [selectedCinemas, selectedLanguages, selectedSubtitles, selectedFormats, selectedTechnologies, selectedGenres]);

  // Get unique movies from filtered schedules
  const filteredMovies = useMemo(() => {
    const movieIds = new Set(filteredSchedules.flatMap(s => s.sessions.map(sess => sess.movieId)));
    return DEMO_MOVIES.filter(m => movieIds.has(m.id));
  }, [filteredSchedules]);

  const toggleFilter = (value: string, selected: string[], setSelected: (v: string[]) => void) => {
    if (selected.includes(value)) {
      setSelected(selected.filter(v => v !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  const FilterChip = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-sm rounded-full border transition-all',
        selected
          ? 'bg-neutral-900 text-white border-neutral-900'
          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Film className="w-6 h-6 text-neutral-900" />
              <div>
                <h1 className="text-lg font-semibold text-neutral-900">Kinoprogramm</h1>
                <p className="text-xs text-neutral-500 -mt-0.5">Luxembourg</p>
              </div>
            </div>
            <Link
              href="/login"
              className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Date Bar */}
      <div className="sticky top-16 z-40 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 py-3">
            <Calendar className="w-5 h-5 text-neutral-400 flex-shrink-0" />
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
              {dateRange.map((date) => {
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, startOfToday());

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      'flex flex-col items-center min-w-[60px] px-3 py-2 rounded-lg transition-all',
                      isSelected
                        ? 'bg-neutral-900 text-white shadow-lg'
                        : 'hover:bg-neutral-100 text-neutral-600'
                    )}
                  >
                    <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                      {isToday ? 'Heute' : format(date, 'EEE', { locale: de })}
                    </span>
                    <span className="text-base font-semibold tabular-nums">
                      {format(date, 'd')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-[120px] z-30 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3 gap-4">
            {/* View Toggle */}
            <div className="flex bg-neutral-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('movies')}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
                  viewMode === 'movies' ? 'bg-white shadow text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'
                )}
              >
                Nach Film
              </button>
              <button
                onClick={() => setViewMode('cinemas')}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
                  viewMode === 'cinemas' ? 'bg-white shadow text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'
                )}
              >
                Nach Kino
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all',
                showFilters || hasActiveFilters
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filter
              {hasActiveFilters && (
                <span className="w-5 h-5 flex items-center justify-center bg-white text-neutral-900 text-xs font-bold rounded-full">
                  {selectedCinemas.length + selectedLanguages.length + selectedSubtitles.length + selectedFormats.length + selectedTechnologies.length + selectedGenres.length}
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="pb-4 space-y-4 border-t border-neutral-100 pt-4">
              {/* Cinemas */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2 block">Kino</label>
                <div className="flex flex-wrap gap-2">
                  {CINEMAS.map(cinema => (
                    <FilterChip
                      key={cinema.id}
                      label={cinema.name}
                      selected={selectedCinemas.includes(cinema.id)}
                      onClick={() => toggleFilter(cinema.id, selectedCinemas, setSelectedCinemas)}
                    />
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2 block">Sprache</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(lang => (
                    <FilterChip
                      key={lang}
                      label={lang === 'EN' ? 'Englisch' : lang === 'DE' ? 'Deutsch' : 'Französisch'}
                      selected={selectedLanguages.includes(lang)}
                      onClick={() => toggleFilter(lang, selectedLanguages, setSelectedLanguages)}
                    />
                  ))}
                </div>
              </div>

              {/* Subtitles */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2 block">Untertitel</label>
                <div className="flex flex-wrap gap-2">
                  {SUBTITLES.map(sub => (
                    <FilterChip
                      key={sub}
                      label={sub}
                      selected={selectedSubtitles.includes(sub)}
                      onClick={() => toggleFilter(sub, selectedSubtitles, setSelectedSubtitles)}
                    />
                  ))}
                </div>
              </div>

              {/* Formats & Technology */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2 block">Format</label>
                  <div className="flex flex-wrap gap-2">
                    {FORMATS.map(fmt => (
                      <FilterChip
                        key={fmt}
                        label={fmt}
                        selected={selectedFormats.includes(fmt)}
                        onClick={() => toggleFilter(fmt, selectedFormats, setSelectedFormats)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2 block">Technologie</label>
                  <div className="flex flex-wrap gap-2">
                    {TECHNOLOGIES.map(tech => (
                      <FilterChip
                        key={tech}
                        label={tech}
                        selected={selectedTechnologies.includes(tech)}
                        onClick={() => toggleFilter(tech, selectedTechnologies, setSelectedTechnologies)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Genres */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2 block">Genre</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(genre => (
                    <FilterChip
                      key={genre}
                      label={genre}
                      selected={selectedGenres.includes(genre)}
                      onClick={() => toggleFilter(genre, selectedGenres, setSelectedGenres)}
                    />
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Alle Filter löschen
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Date Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-neutral-900">
            {format(selectedDate, 'EEEE', { locale: de })}
          </h2>
          <p className="text-neutral-500 mt-1">
            {format(selectedDate, 'd. MMMM yyyy', { locale: de })}
            {hasActiveFilters && (
              <span className="ml-2 text-neutral-400">
                · {filteredMovies.length} {filteredMovies.length === 1 ? 'Film' : 'Filme'} gefunden
              </span>
            )}
          </p>
        </div>

        {viewMode === 'movies' ? (
          /* Movies View */
          <div className="space-y-6">
            {filteredMovies.map((movie) => {
              const isExpanded = expandedMovie === movie.id;
              const movieSchedules = filteredSchedules
                .map(schedule => ({
                  cinema: schedule.cinema,
                  sessions: schedule.sessions.filter(s => s.movieId === movie.id),
                }))
                .filter(s => s.sessions.length > 0);

              return (
                <article
                  key={movie.id}
                  className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden"
                >
                  {/* Movie Card */}
                  <div className="p-5 sm:p-6">
                    <div className="flex gap-5">
                      {/* Poster */}
                      <div className="w-28 sm:w-36 flex-shrink-0">
                        <div className="aspect-[2/3] rounded-xl overflow-hidden bg-neutral-200 shadow-lg">
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-bold text-neutral-900 leading-tight">
                              {movie.title}
                            </h3>
                            {movie.originalTitle !== movie.title && (
                              <p className="text-sm text-neutral-400 mt-0.5">{movie.originalTitle}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-lg flex-shrink-0">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="text-sm font-bold">{movie.imdbRating}</span>
                          </div>
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-sm text-neutral-500">
                          <span>{movie.year}</span>
                          <span className="w-1 h-1 rounded-full bg-neutral-300" />
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {movie.runtime} min
                          </span>
                          <span className="w-1 h-1 rounded-full bg-neutral-300" />
                          <span className="px-1.5 py-0.5 bg-neutral-100 rounded text-xs font-medium">{movie.rating}</span>
                        </div>

                        {/* Genres */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {movie.genres.map(genre => (
                            <span key={genre} className="px-2.5 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs font-medium">
                              {genre}
                            </span>
                          ))}
                        </div>

                        {/* Tags */}
                        {movie.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {movie.tags.map(tag => (
                              <span key={tag} className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Expand Button */}
                        <button
                          onClick={() => setExpandedMovie(isExpanded ? null : movie.id)}
                          className="flex items-center gap-1 mt-4 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Weniger anzeigen
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Mehr Details
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t border-neutral-100">
                        {/* Plot */}
                        <p className="text-neutral-600 leading-relaxed">{movie.plot}</p>

                        {/* Director & Cast */}
                        <div className="grid sm:grid-cols-2 gap-4 mt-5">
                          <div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                              <Clapperboard className="w-3.5 h-3.5" />
                              Regie
                            </div>
                            <p className="text-neutral-900 font-medium">{movie.director}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                              <Users className="w-3.5 h-3.5" />
                              Besetzung
                            </div>
                            <p className="text-neutral-900">{movie.cast.slice(0, 4).join(', ')}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Showtimes by Cinema */}
                  <div className="bg-neutral-50 border-t border-neutral-200 px-5 sm:px-6 py-4">
                    <div className="space-y-4">
                      {movieSchedules.map(({ cinema, sessions }) => (
                        <div key={cinema.id}>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-neutral-400" />
                            <span className="font-medium text-neutral-900">{cinema.name}</span>
                            <span className="text-sm text-neutral-400">{cinema.city}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {sessions.map((session, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                {session.times.map((time, tidx) => {
                                  const [hours] = time.split(':').map(Number);
                                  const isPast = isSameDay(selectedDate, startOfToday()) && hours < new Date().getHours();

                                  return (
                                    <button
                                      key={tidx}
                                      disabled={isPast}
                                      className={cn(
                                        'group relative px-4 py-2 text-sm font-semibold tabular-nums rounded-lg transition-all',
                                        isPast
                                          ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                          : 'bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 shadow-sm'
                                      )}
                                    >
                                      {time}
                                      {(session.format || session.technology) && !isPast && (
                                        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-neutral-900 text-white text-[9px] font-bold rounded">
                                          {session.format || session.technology}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                                <span className="text-xs text-neutral-400 ml-1">
                                  {session.language}
                                  {session.subtitles && ` / UT ${session.subtitles}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* Cinemas View */
          <div className="space-y-8">
            {filteredSchedules.map(({ cinema, sessions }) => {
              const movieGroups = sessions.reduce((acc, session) => {
                if (!acc[session.movieId]) {
                  acc[session.movieId] = [];
                }
                acc[session.movieId].push(session);
                return acc;
              }, {} as Record<string, typeof sessions>);

              return (
                <section key={cinema.id} className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
                  {/* Cinema Header */}
                  <div className="p-5 sm:p-6 border-b border-neutral-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-neutral-900">{cinema.name}</h3>
                        <div className="flex items-center gap-1 mt-1 text-sm text-neutral-500">
                          <MapPin className="w-4 h-4" />
                          {cinema.address}, {cinema.city}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Movies at this Cinema */}
                  <div className="divide-y divide-neutral-100">
                    {Object.entries(movieGroups).map(([movieId, movieSessions]) => {
                      const movie = DEMO_MOVIES.find(m => m.id === movieId);
                      if (!movie) return null;

                      return (
                        <div key={movieId} className="p-5 sm:p-6">
                          <div className="flex gap-4">
                            {/* Small Poster */}
                            <div className="w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-200">
                              <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-neutral-900">{movie.title}</h4>
                              <div className="flex items-center gap-2 mt-1 text-sm text-neutral-500">
                                <span>{movie.runtime} min</span>
                                <span className="w-1 h-1 rounded-full bg-neutral-300" />
                                <span>{movie.genres[0]}</span>
                              </div>

                              {/* Sessions */}
                              <div className="flex flex-wrap gap-2 mt-3">
                                {movieSessions.map((session, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5">
                                    {session.times.map((time, tidx) => {
                                      const [hours] = time.split(':').map(Number);
                                      const isPast = isSameDay(selectedDate, startOfToday()) && hours < new Date().getHours();

                                      return (
                                        <button
                                          key={tidx}
                                          disabled={isPast}
                                          className={cn(
                                            'px-3 py-1.5 text-sm font-medium tabular-nums rounded-md transition-all',
                                            isPast
                                              ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                                              : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-900 hover:text-white'
                                          )}
                                        >
                                          {time}
                                        </button>
                                      );
                                    })}
                                    <span className="text-xs text-neutral-400">
                                      {session.language}
                                      {session.format && ` · ${session.format}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
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

        {filteredMovies.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200">
            <Film className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500 text-lg">Keine Filme gefunden</p>
            <p className="text-neutral-400 text-sm mt-1">Versuche andere Filter oder ein anderes Datum</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        )}

        {/* Demo Notice */}
        <div className="mt-12 p-6 bg-white rounded-xl border border-neutral-200 text-center">
          <p className="text-neutral-500 text-sm">
            Demo-Ansicht mit Beispieldaten · Echte Daten werden aus der Datenbank geladen
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-neutral-400">
              © {new Date().getFullYear()} miir.concepts
            </p>
            <div className="flex gap-6 text-sm text-neutral-400">
              <Link href="/impressum" className="hover:text-neutral-900 transition-colors">
                Impressum
              </Link>
              <Link href="/datenschutz" className="hover:text-neutral-900 transition-colors">
                Datenschutz
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
