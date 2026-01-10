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
  searchMovies,
  getFullMovieData,
  findByImdbId,
  getTMDBPosterUrl,
  TMDBSearchResult,
} from '@/lib/tmdb';

interface TMDBLookupProps {
  onSelect: (data: TMDBMovieData) => void;
  tmdbId?: number | null;
  imdbId?: string | null;
  disabled?: boolean;
}

export interface TMDBMovieData {
  tmdb_id: number;
  imdb_id: string | null;
  original_title: string;
  production_year: number | null;
  runtime_minutes: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  trailer_url: string | null;
  genres: string[];
  production_companies: Array<{ name: string; country: string }>;
  production_countries: string[];
  directors: Array<{ id: number; name: string }>;
  screenplay: Array<{ id: number; name: string }>;
  music: Array<{ id: number; name: string }>;
  cast: Array<{ id: number; name: string; character: string }>;
  plots: {
    en: string;
    de: string;
    fr: string;
    lu: string;
  };
}

export function TMDBLookup({ onSelect, tmdbId, imdbId, disabled }: TMDBLookupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<TMDBSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMovie, setLoadingMovie] = useState<number | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Search for movies
  useEffect(() => {
    if (!search || search.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const data = await searchMovies(search);
      setResults(data.results.slice(0, 8));
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

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

  async function selectMovie(tmdbId: number) {
    setLoadingMovie(tmdbId);
    try {
      const fullData = await getFullMovieData(tmdbId);
      if (fullData) {
        const movieData: TMDBMovieData = {
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
        setResults([]);
      }
    } finally {
      setLoadingMovie(null);
    }
  }

  async function fetchByTmdbId() {
    if (!tmdbId) return;
    await selectMovie(tmdbId);
  }

  async function fetchByImdbId() {
    if (!imdbId) return;
    setLoadingMovie(-1);
    try {
      const foundTmdbId = await findByImdbId(imdbId);
      if (foundTmdbId) {
        await selectMovie(foundTmdbId);
      }
    } finally {
      setLoadingMovie(null);
    }
  }

  const popup = isOpen && (
    <div
      className="fixed inset-0 z-50"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="absolute bg-popover border rounded-lg shadow-lg p-4 w-[400px] max-h-[500px] overflow-hidden flex flex-col"
        style={{ top: position.top, left: position.left }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Search TMDB</h3>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for a movie..."
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
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {search.length >= 2 ? 'No movies found' : 'Start typing to search...'}
            </div>
          ) : (
            results.map(movie => (
              <button
                key={movie.id}
                onClick={() => selectMovie(movie.id)}
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
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground text-center">
          Powered by TMDB
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

      {/* Fetch from TMDB button */}
      {tmdbId && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchByTmdbId}
          disabled={disabled || loadingMovie !== null}
        >
          {loadingMovie !== null ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Fetch TMDB
        </Button>
      )}

      {/* Fetch from IMDB button */}
      {imdbId && !tmdbId && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchByImdbId}
          disabled={disabled || loadingMovie !== null}
        >
          {loadingMovie === -1 ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Fetch IMDB
        </Button>
      )}

      {/* View on TMDB */}
      {tmdbId && (
        <a
          href={`https://www.themoviedb.org/movie/${tmdbId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}

      {typeof window !== 'undefined' && popup && createPortal(popup, document.body)}
    </div>
  );
}

// Inline lookup for ID fields
interface TMDBIdLookupProps {
  value: string;
  onChange: (value: string) => void;
  onMovieFound?: (tmdbId: number) => void;
  type: 'tmdb' | 'imdb';
  disabled?: boolean;
}

export function TMDBIdLookup({ value, onChange, onMovieFound, type, disabled }: TMDBIdLookupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<TMDBSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // Search for movies
  useEffect(() => {
    if (!isOpen || !search || search.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const data = await searchMovies(search);
      setResults(data.results.slice(0, 6));
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, isOpen]);

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

  function handleSelect(movie: TMDBSearchResult) {
    if (type === 'tmdb') {
      onChange(movie.id.toString());
    }
    onMovieFound?.(movie.id);
    setIsOpen(false);
    setSearch('');
  }

  const popup = isOpen && (
    <div
      className="fixed inset-0 z-50"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="absolute bg-popover border rounded-lg shadow-lg p-3 w-[350px] max-h-[300px] overflow-hidden flex flex-col"
        style={{ top: position.top, left: position.left }}
        onClick={e => e.stopPropagation()}
      >
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
          ) : results.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              {search.length >= 2 ? 'No results' : 'Search...'}
            </div>
          ) : (
            results.map(movie => (
              <button
                key={movie.id}
                onClick={() => handleSelect(movie)}
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
