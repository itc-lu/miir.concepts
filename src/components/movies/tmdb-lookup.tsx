'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, X, Film, Calendar, Star, Loader2, Download, ExternalLink,
} from 'lucide-react';
import {
  searchMovies as searchTMDB,
  getFullMovieData as getFullTMDBData,
  findByImdbId,
  getTMDBPosterUrl,
  TMDBSearchResult,
} from '@/lib/tmdb';
import {
  searchTitles as searchIMDB,
  getFullIMDBData,
  imdbRuntimeToMinutes,
  IMDBSearchResult,
} from '@/lib/imdb';

type LookupSource = 'tmdb' | 'imdb';

interface MovieLookupProps {
  onSelect: (data: MovieLookupData) => void;
  tmdbId?: number | null;
  imdbId?: string | null;
  disabled?: boolean;
}

export interface MovieLookupData {
  tmdb_id: number | null;
  imdb_id: string | null;
  original_title: string;
  production_year: number | null;
  runtime_minutes: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  trailer_url: string | null;
  imdb_rating: number | null;
  genres: string[];
  production_companies: Array<{ name: string; country: string }>;
  production_countries: string[];
  directors: Array<{ id: string | number; name: string }>;
  screenplay: Array<{ id: string | number; name: string }>;
  music: Array<{ id: string | number; name: string }>;
  cast: Array<{ id: string | number; name: string; character: string }>;
  plots: {
    en: string;
    de: string;
    fr: string;
    lu: string;
  };
  // IMDB-specific country data
  countryReleaseDates?: {
    de?: string;
    fr?: string;
    lu?: string;
    be?: string;
  };
  countryCertificates?: {
    de?: { certificate: string };
    fr?: { certificate: string };
    lu?: { certificate: string };
    be?: { certificate: string };
  };
  localizedTitles?: {
    de?: string;
    fr?: string;
    lu?: string;
    be?: string;
  };
}

// For backward compatibility
export type TMDBMovieData = MovieLookupData;

export function TMDBLookup({ onSelect, tmdbId, imdbId, disabled }: MovieLookupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState<LookupSource>('imdb');
  const [search, setSearch] = useState('');
  const [tmdbResults, setTmdbResults] = useState<TMDBSearchResult[]>([]);
  const [imdbResults, setImdbResults] = useState<IMDBSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMovie, setLoadingMovie] = useState<string | number | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Search for movies
  useEffect(() => {
    if (!search || search.length < 2) {
      setTmdbResults([]);
      setImdbResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      if (source === 'tmdb') {
        const data = await searchTMDB(search);
        setTmdbResults(data.results.slice(0, 8));
      } else {
        const data = await searchIMDB(search, 8);
        setImdbResults(data);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, source]);

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: Math.max(8, rect.left - 200),
      });
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  async function selectTMDBMovie(tmdbId: number) {
    setLoadingMovie(tmdbId);
    try {
      const fullData = await getFullTMDBData(tmdbId);
      if (fullData) {
        const movieData: MovieLookupData = {
          tmdb_id: fullData.details.id,
          imdb_id: fullData.details.imdb_id,
          original_title: fullData.details.original_title,
          production_year: fullData.details.release_date
            ? parseInt(fullData.details.release_date.split('-')[0])
            : null,
          runtime_minutes: fullData.details.runtime,
          poster_url: getTMDBPosterUrl(fullData.details.poster_path, 'original'),
          backdrop_url: fullData.details.backdrop_path
            ? `https://image.tmdb.org/t/p/original${fullData.details.backdrop_path}`
            : null,
          trailer_url: fullData.trailer,
          imdb_rating: null,
          genres: fullData.details.genres.map(g => g.name),
          production_companies: fullData.details.production_companies.map(c => ({
            name: c.name,
            country: c.origin_country,
          })),
          production_countries: fullData.details.production_countries.map(c => c.iso_3166_1),
          directors: fullData.directors.map(d => ({ id: d.id, name: d.name })),
          screenplay: fullData.screenplay.map(s => ({ id: s.id, name: s.name })),
          music: fullData.music.map(m => ({ id: m.id, name: m.name })),
          cast: fullData.cast.map(c => ({ id: c.id, name: c.name, character: c.character })),
          plots: fullData.plots,
        };
        onSelect(movieData);
        setIsOpen(false);
        setSearch('');
        setTmdbResults([]);
      }
    } finally {
      setLoadingMovie(null);
    }
  }

  async function selectIMDBMovie(imdbId: string) {
    setLoadingMovie(imdbId);
    try {
      const fullData = await getFullIMDBData(imdbId);
      if (fullData && fullData.title) {
        const movieData: MovieLookupData = {
          tmdb_id: null,
          imdb_id: fullData.title.id,
          original_title: fullData.title.originalTitle || fullData.title.primaryTitle,
          production_year: fullData.title.year || null,
          runtime_minutes: imdbRuntimeToMinutes(fullData.title.runtimeSeconds),
          poster_url: fullData.title.poster?.url || null,
          backdrop_url: fullData.title.backdrop?.url || null,
          trailer_url: fullData.trailer?.playbackURLs?.[0]?.url || null,
          imdb_rating: fullData.title.rating?.aggregate || null,
          genres: fullData.title.genres || [],
          production_companies: fullData.productionCompanies.map(c => ({
            name: c.company.name,
            country: c.countries?.[0] || '',
          })),
          production_countries: fullData.title.countriesOfOrigin || [],
          directors: fullData.directors.map(d => ({
            id: d.name.id,
            name: d.name.displayName,
          })),
          screenplay: fullData.writers.map(w => ({
            id: w.name.id,
            name: w.name.displayName,
          })),
          music: fullData.composers.map(c => ({
            id: c.name.id,
            name: c.name.displayName,
          })),
          cast: fullData.cast.map(c => ({
            id: c.name.id,
            name: c.name.displayName,
            character: c.characters?.[0] || '',
          })),
          plots: {
            en: fullData.title.plot || '',
            de: '',
            fr: '',
            lu: '',
          },
          countryReleaseDates: fullData.countryReleaseDates,
          countryCertificates: fullData.countryCertificates,
          localizedTitles: fullData.localizedTitles,
        };
        onSelect(movieData);
        setIsOpen(false);
        setSearch('');
        setImdbResults([]);
      }
    } finally {
      setLoadingMovie(null);
    }
  }

  async function fetchByTmdbId() {
    if (!tmdbId) return;
    await selectTMDBMovie(tmdbId);
  }

  async function fetchByImdbId() {
    if (!imdbId) return;
    await selectIMDBMovie(imdbId);
  }

  const popup = isOpen && (
    <div
      className="fixed inset-0 z-50"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="absolute bg-popover border rounded-lg shadow-lg p-4 w-[420px] max-h-[520px] overflow-hidden flex flex-col"
        style={{ top: position.top, left: position.left }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header with source tabs */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1">
            <Button
              variant={source === 'imdb' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setSource('imdb');
                setSearch('');
                setTmdbResults([]);
                setImdbResults([]);
              }}
            >
              IMDB
            </Button>
            <Button
              variant={source === 'tmdb' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setSource('tmdb');
                setSearch('');
                setTmdbResults([]);
                setImdbResults([]);
              }}
            >
              TMDB
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${source.toUpperCase()}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : source === 'tmdb' ? (
            tmdbResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {search.length >= 2 ? 'No movies found' : 'Start typing to search...'}
              </div>
            ) : (
              tmdbResults.map(movie => (
                <button
                  key={movie.id}
                  onClick={() => selectTMDBMovie(movie.id)}
                  disabled={loadingMovie === movie.id}
                  className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-accent text-left transition-colors disabled:opacity-50"
                >
                  <div className="h-16 w-11 rounded bg-muted overflow-hidden flex-shrink-0">
                    {movie.poster_path ? (
                      <img
                        src={getTMDBPosterUrl(movie.poster_path, 'w92') || ''}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Film className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{movie.title}</p>
                    {movie.original_title !== movie.title && (
                      <p className="text-xs text-muted-foreground truncate">
                        {movie.original_title}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {movie.release_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {movie.release_date.split('-')[0]}
                        </span>
                      )}
                      {movie.vote_average > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {movie.vote_average.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  {loadingMovie === movie.id && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </button>
              ))
            )
          ) : (
            imdbResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {search.length >= 2 ? 'No movies found' : 'Start typing to search...'}
              </div>
            ) : (
              imdbResults.map(movie => (
                <button
                  key={movie.id}
                  onClick={() => selectIMDBMovie(movie.id)}
                  disabled={loadingMovie === movie.id}
                  className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-accent text-left transition-colors disabled:opacity-50"
                >
                  <div className="h-16 w-11 rounded bg-muted overflow-hidden flex-shrink-0">
                    {movie.poster?.url ? (
                      <img
                        src={movie.poster.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Film className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{movie.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {movie.year && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {movie.year}
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {movie.type}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {movie.id}
                  </Badge>
                  {loadingMovie === movie.id && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </button>
              ))
            )
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground text-center">
          Powered by {source === 'tmdb' ? 'TMDB' : 'imdbapi.dev'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      {/* Search button */}
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
      >
        <Search className="h-4 w-4 mr-2" />
        Lookup
      </Button>

      {/* Fetch from IMDB button */}
      {imdbId && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchByImdbId}
          disabled={disabled || loadingMovie !== null}
        >
          {loadingMovie === imdbId ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Fetch IMDB
        </Button>
      )}

      {/* Fetch from TMDB button */}
      {tmdbId && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchByTmdbId}
          disabled={disabled || loadingMovie !== null}
        >
          {loadingMovie === tmdbId ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Fetch TMDB
        </Button>
      )}

      {/* View on IMDB */}
      {imdbId && (
        <a
          href={`https://www.imdb.com/title/${imdbId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground"
          title="View on IMDB"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}

      {/* View on TMDB */}
      {tmdbId && (
        <a
          href={`https://www.themoviedb.org/movie/${tmdbId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground"
          title="View on TMDB"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}

      {typeof window !== 'undefined' && popup && createPortal(popup, document.body)}
    </div>
  );
}

// Inline lookup for ID fields
interface MovieIdLookupProps {
  value: string;
  onChange: (value: string) => void;
  onMovieFound?: (data: { tmdbId?: number; imdbId?: string }) => void;
  type: 'tmdb' | 'imdb';
  disabled?: boolean;
}

export function TMDBIdLookup({ value, onChange, onMovieFound, type, disabled }: MovieIdLookupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState<LookupSource>(type === 'imdb' ? 'imdb' : 'tmdb');
  const [search, setSearch] = useState('');
  const [tmdbResults, setTmdbResults] = useState<TMDBSearchResult[]>([]);
  const [imdbResults, setImdbResults] = useState<IMDBSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // Search for movies
  useEffect(() => {
    if (!isOpen || !search || search.length < 2) {
      setTmdbResults([]);
      setImdbResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      if (source === 'tmdb') {
        const data = await searchTMDB(search);
        setTmdbResults(data.results.slice(0, 6));
      } else {
        const data = await searchIMDB(search, 6);
        setImdbResults(data);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, isOpen, source]);

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [isOpen]);

  function handleSelectTMDB(movie: TMDBSearchResult) {
    if (type === 'tmdb') {
      onChange(movie.id.toString());
    }
    onMovieFound?.({ tmdbId: movie.id });
    setIsOpen(false);
    setSearch('');
  }

  function handleSelectIMDB(movie: IMDBSearchResult) {
    if (type === 'imdb') {
      onChange(movie.id);
    }
    onMovieFound?.({ imdbId: movie.id });
    setIsOpen(false);
    setSearch('');
  }

  const popup = isOpen && (
    <div
      className="fixed inset-0 z-50"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="absolute bg-popover border rounded-lg shadow-lg p-3 w-[380px] max-h-[350px] overflow-hidden flex flex-col"
        style={{ top: position.top, left: position.left }}
        onClick={e => e.stopPropagation()}
      >
        {/* Source tabs */}
        <div className="flex gap-1 mb-2">
          <Button
            variant={source === 'imdb' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setSource('imdb');
              setSearch('');
            }}
          >
            IMDB
          </Button>
          <Button
            variant={source === 'tmdb' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setSource('tmdb');
              setSearch('');
            }}
          >
            TMDB
          </Button>
        </div>

        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search movie..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-9"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : source === 'tmdb' ? (
            tmdbResults.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {search.length >= 2 ? 'No results' : 'Search...'}
              </div>
            ) : (
              tmdbResults.map(movie => (
                <button
                  key={movie.id}
                  onClick={() => handleSelectTMDB(movie)}
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-accent text-left text-sm"
                >
                  <div className="h-10 w-7 rounded bg-muted overflow-hidden flex-shrink-0">
                    {movie.poster_path ? (
                      <img
                        src={getTMDBPosterUrl(movie.poster_path, 'w92') || ''}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Film className="h-full w-full p-1 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{movie.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {movie.release_date?.split('-')[0] || 'N/A'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {movie.id}
                  </Badge>
                </button>
              ))
            )
          ) : (
            imdbResults.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {search.length >= 2 ? 'No results' : 'Search...'}
              </div>
            ) : (
              imdbResults.map(movie => (
                <button
                  key={movie.id}
                  onClick={() => handleSelectIMDB(movie)}
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-accent text-left text-sm"
                >
                  <div className="h-10 w-7 rounded bg-muted overflow-hidden flex-shrink-0">
                    {movie.poster?.url ? (
                      <img
                        src={movie.poster.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Film className="h-full w-full p-1 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{movie.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {movie.year || 'N/A'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {movie.id}
                  </Badge>
                </button>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={type === 'tmdb' ? 'e.g., 693134' : 'e.g., tt15239678'}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          disabled={disabled}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      {typeof window !== 'undefined' && popup && createPortal(popup, document.body)}
    </div>
  );
}
