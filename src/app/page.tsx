'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Demo data - will be replaced with real data once database is set up
const DEMO_CINEMAS = [
  {
    id: '1',
    name: 'Kinepolis Kirchberg',
    city: 'Luxembourg',
    movies: [
      {
        id: '1',
        title: 'Dune: Part Two',
        runtime: 166,
        language: 'EN',
        subtitles: 'DE/FR',
        format: 'IMAX',
        poster: 'https://image.tmdb.org/t/p/w342/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
        times: ['14:00', '17:30', '20:45'],
      },
      {
        id: '2',
        title: 'Poor Things',
        runtime: 141,
        language: 'EN',
        subtitles: 'DE',
        format: null,
        poster: 'https://image.tmdb.org/t/p/w342/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg',
        times: ['16:15', '19:00', '21:30'],
      },
      {
        id: '3',
        title: 'Oppenheimer',
        runtime: 180,
        language: 'EN',
        subtitles: 'FR',
        format: null,
        poster: 'https://image.tmdb.org/t/p/w342/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
        times: ['19:30'],
      },
    ],
  },
  {
    id: '2',
    name: 'Ciné Utopia',
    city: 'Luxembourg',
    movies: [
      {
        id: '4',
        title: 'Anatomie d\'une chute',
        runtime: 150,
        language: 'FR',
        subtitles: 'DE',
        format: null,
        poster: 'https://image.tmdb.org/t/p/w342/kQs6keheMwCxJxrzV83VUwFtHkB.jpg',
        times: ['18:00', '21:00'],
      },
      {
        id: '5',
        title: 'The Zone of Interest',
        runtime: 105,
        language: 'DE',
        subtitles: 'EN',
        format: null,
        poster: 'https://image.tmdb.org/t/p/w342/hUu9zyZmDd8VZegKi1iK1Vk0RYS.jpg',
        times: ['17:30', '20:15'],
      },
    ],
  },
  {
    id: '3',
    name: 'Kinepolis Belval',
    city: 'Esch-sur-Alzette',
    movies: [
      {
        id: '1',
        title: 'Dune: Part Two',
        runtime: 166,
        language: 'EN',
        subtitles: 'FR',
        format: '3D',
        poster: 'https://image.tmdb.org/t/p/w342/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
        times: ['15:00', '18:30', '21:45'],
      },
      {
        id: '6',
        title: 'Wonka',
        runtime: 116,
        language: 'DE',
        subtitles: null,
        format: null,
        poster: 'https://image.tmdb.org/t/p/w342/qhb1qOilapbapxWQn9jtRCMwXJF.jpg',
        times: ['14:30', '17:00'],
      },
    ],
  },
];

export default function CinemaProgramPage() {
  const [selectedDate, setSelectedDate] = useState(startOfToday());

  const dateRange = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfToday(), i)),
    []
  );

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-200/50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <h1 className="text-base font-medium">Kinoprogramm Luxembourg</h1>
          <Link
            href="/login"
            className="text-sm text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Date Selector */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-white border-b border-neutral-200/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 py-3 overflow-x-auto scrollbar-hide">
            {dateRange.map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, startOfToday());

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'flex flex-col items-center min-w-[68px] px-4 py-2.5 rounded-xl transition-all duration-200',
                    isSelected
                      ? 'bg-neutral-900 text-white'
                      : 'hover:bg-neutral-100 text-neutral-600'
                  )}
                >
                  <span className={cn(
                    'text-[10px] font-medium uppercase tracking-widest',
                    isSelected ? 'text-neutral-400' : 'text-neutral-400'
                  )}>
                    {isToday ? 'Heute' : format(date, 'EEE', { locale: de })}
                  </span>
                  <span className="text-lg font-semibold tabular-nums mt-0.5">
                    {format(date, 'd')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-6">
          {/* Date Title */}
          <div className="mb-12">
            <h2 className="text-4xl font-semibold tracking-tight">
              {format(selectedDate, 'EEEE', { locale: de })}
            </h2>
            <p className="text-lg text-neutral-400 mt-1">
              {format(selectedDate, 'd. MMMM yyyy', { locale: de })}
            </p>
          </div>

          {/* Cinemas */}
          <div className="space-y-20">
            {DEMO_CINEMAS.map((cinema) => (
              <section key={cinema.id}>
                {/* Cinema Header */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold">{cinema.name}</h3>
                  <p className="text-neutral-400 text-sm mt-1">{cinema.city}</p>
                </div>

                {/* Movies */}
                <div className="space-y-6">
                  {cinema.movies.map((movie) => (
                    <article
                      key={`${cinema.id}-${movie.id}`}
                      className="group flex gap-6 p-5 -mx-5 rounded-2xl transition-colors hover:bg-neutral-50"
                    >
                      {/* Poster */}
                      <div className="w-24 h-36 flex-shrink-0 rounded-xl overflow-hidden bg-neutral-100 shadow-lg shadow-neutral-200/50">
                        {movie.poster ? (
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex items-start justify-between gap-4">
                          <h4 className="text-lg font-semibold leading-snug">
                            {movie.title}
                          </h4>
                          {movie.format && (
                            <span className="flex-shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-neutral-900 text-white rounded-md">
                              {movie.format}
                            </span>
                          )}
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-3 mt-2 text-sm text-neutral-500">
                          <span className="tabular-nums">{movie.runtime} min</span>
                          <span className="w-1 h-1 rounded-full bg-neutral-300" />
                          <span>{movie.language}</span>
                          {movie.subtitles && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-neutral-300" />
                              <span className="text-neutral-400">UT {movie.subtitles}</span>
                            </>
                          )}
                        </div>

                        {/* Times */}
                        <div className="flex flex-wrap gap-2 mt-5">
                          {movie.times.map((time, idx) => {
                            const [hours] = time.split(':').map(Number);
                            const now = new Date();
                            const isPast = isSameDay(selectedDate, startOfToday()) && hours < now.getHours();

                            return (
                              <button
                                key={idx}
                                disabled={isPast}
                                className={cn(
                                  'min-w-[72px] px-4 py-2.5 text-sm font-semibold tabular-nums rounded-xl transition-all duration-200',
                                  isPast
                                    ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
                                    : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-900 hover:text-white hover:shadow-lg hover:shadow-neutral-900/20 hover:-translate-y-0.5'
                                )}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Demo Notice */}
          <div className="mt-20 p-8 bg-neutral-50 rounded-2xl text-center">
            <p className="text-neutral-500 text-sm">
              Demo-Ansicht · Echte Daten werden geladen sobald die Datenbank eingerichtet ist
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
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
      </footer>
    </div>
  );
}
