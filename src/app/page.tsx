'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { de, fr, enUS } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, MapPin, Clock, Globe } from 'lucide-react';

interface Session {
  id: string;
  start_time: string;
  movie_edition: {
    id: string;
    edition_title: string | null;
    movie_localized: {
      id: string;
      title: string;
      movie: {
        id: string;
        original_title: string;
        runtime_minutes: number | null;
        poster_url: string | null;
      };
    };
    format: { name: string } | null;
    technology: { name: string } | null;
    audio_language: { code: string; name: string } | null;
    subtitle_language: { code: string; name: string } | null;
  };
  cinema: {
    id: string;
    name: string;
    city: string | null;
    cinema_group: { name: string } | null;
  };
}

interface GroupedSessions {
  [cinemaId: string]: {
    cinema: Session['cinema'];
    movies: {
      [movieId: string]: {
        movie: Session['movie_edition'];
        sessions: Session[];
      };
    };
  };
}

const locales = { de, fr, en: enUS };

export default function CinemaProgramPage() {
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [locale] = useState<'de' | 'fr' | 'en'>('de');

  const supabase = createClient();

  // Generate date range (today + 6 days)
  const dateRange = Array.from({ length: 7 }, (_, i) => addDays(startOfToday(), i));

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          start_time,
          movie_edition:movie_editions!inner(
            id,
            edition_title,
            movie_localized:movies_localized!inner(
              id,
              title,
              movie:movies!inner(
                id,
                original_title,
                runtime_minutes,
                poster_url
              )
            ),
            format:formats(name),
            technology:technologies(name),
            audio_language:languages!movie_editions_audio_language_id_fkey(code, name),
            subtitle_language:languages!movie_editions_subtitle_language_id_fkey(code, name)
          ),
          cinema:cinemas!inner(
            id,
            name,
            city,
            cinema_group:cinema_groups(name)
          )
        `)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching sessions:', error);
      } else {
        setSessions((data || []) as unknown as Session[]);
      }

      setLoading(false);
    }

    fetchSessions();
  }, [selectedDate, supabase]);

  // Group sessions by cinema, then by movie
  const groupedSessions: GroupedSessions = sessions.reduce((acc, session) => {
    const cinemaId = session.cinema.id;
    const movieId = session.movie_edition.movie_localized.movie.id;

    if (!acc[cinemaId]) {
      acc[cinemaId] = {
        cinema: session.cinema,
        movies: {},
      };
    }

    if (!acc[cinemaId].movies[movieId]) {
      acc[cinemaId].movies[movieId] = {
        movie: session.movie_edition,
        sessions: [],
      };
    }

    acc[cinemaId].movies[movieId].sessions.push(session);
    return acc;
  }, {} as GroupedSessions);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = addDays(selectedDate, direction === 'next' ? 1 : -1);
    if (newDate >= startOfToday()) {
      setSelectedDate(newDate);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium tracking-tight">Kinoprogramm</h1>
            <p className="text-sm text-muted-foreground">Luxembourg</p>
          </div>
          <Link
            href="/login"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Date Navigation */}
      <nav className="border-b bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <button
              onClick={() => navigateDate('prev')}
              disabled={isSameDay(selectedDate, startOfToday())}
              className="p-2 hover:bg-secondary rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex gap-1 overflow-x-auto">
              {dateRange.map((date) => {
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, startOfToday());

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      'flex flex-col items-center px-4 py-2 rounded transition-colors min-w-[64px]',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-secondary'
                    )}
                  >
                    <span className="text-[10px] uppercase tracking-wider">
                      {format(date, 'EEE', { locale: locales[locale] })}
                    </span>
                    <span className="text-lg font-medium tabular-nums">
                      {format(date, 'd')}
                    </span>
                    {isToday && (
                      <span className="text-[9px] uppercase tracking-wider opacity-70">
                        Heute
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-secondary rounded transition-colors"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Selected Date Display */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-medium">
          {format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: locales[locale] })}
        </h2>
      </div>

      {/* Cinema Program */}
      <main className="max-w-6xl mx-auto px-4 pb-16">
        {loading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-muted rounded w-48 mb-4" />
                <div className="space-y-3">
                  <div className="h-20 bg-muted rounded" />
                  <div className="h-20 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(groupedSessions).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              Keine Vorstellungen für diesen Tag.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.values(groupedSessions).map(({ cinema, movies }) => (
              <section key={cinema.id} className="animate-fade-in">
                {/* Cinema Header */}
                <div className="flex items-baseline gap-3 mb-4 pb-2 border-b">
                  <h3 className="text-lg font-medium">{cinema.name}</h3>
                  {cinema.cinema_group && (
                    <span className="text-xs text-muted-foreground">
                      {cinema.cinema_group.name}
                    </span>
                  )}
                  {cinema.city && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                      <MapPin className="h-3 w-3" />
                      {cinema.city}
                    </span>
                  )}
                </div>

                {/* Movies */}
                <div className="space-y-4">
                  {Object.values(movies).map(({ movie, sessions: movieSessions }) => (
                    <div
                      key={movie.id}
                      className="flex gap-4 p-4 bg-secondary/30 rounded hover:bg-secondary/50 transition-colors"
                    >
                      {/* Movie Poster Placeholder */}
                      <div className="w-16 h-24 bg-muted rounded flex-shrink-0 overflow-hidden">
                        {movie.movie_localized.movie.poster_url ? (
                          <img
                            src={movie.movie_localized.movie.poster_url}
                            alt={movie.movie_localized.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            No img
                          </div>
                        )}
                      </div>

                      {/* Movie Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">
                          {movie.movie_localized.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                          {movie.movie_localized.movie.runtime_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {movie.movie_localized.movie.runtime_minutes} min
                            </span>
                          )}
                          {movie.audio_language && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {movie.audio_language.code.toUpperCase()}
                              {movie.subtitle_language && (
                                <span>/ UT: {movie.subtitle_language.code.toUpperCase()}</span>
                              )}
                            </span>
                          )}
                          {movie.format && movie.format.name !== 'Standard' && (
                            <span className="px-1.5 py-0.5 bg-primary/10 rounded text-[10px] uppercase tracking-wider">
                              {movie.format.name}
                            </span>
                          )}
                          {movie.technology && movie.technology.name !== '2D' && (
                            <span className="px-1.5 py-0.5 bg-primary/10 rounded text-[10px] uppercase tracking-wider">
                              {movie.technology.name}
                            </span>
                          )}
                        </div>

                        {/* Session Times */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {movieSessions.map((session) => {
                            const sessionTime = new Date(session.start_time);
                            const isPast = sessionTime < new Date();

                            return (
                              <span
                                key={session.id}
                                className={cn(
                                  'px-3 py-1.5 text-sm font-medium tabular-nums rounded border transition-colors',
                                  isPast
                                    ? 'text-muted-foreground border-transparent bg-muted/50'
                                    : 'border-border hover:border-foreground hover:bg-secondary cursor-pointer'
                                )}
                              >
                                {format(sessionTime, 'HH:mm')}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} miir.concepts</span>
          <div className="flex gap-4">
            <Link href="/impressum" className="hover:text-foreground transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-foreground transition-colors">
              Datenschutz
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
