'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Search, Film, Building2, Calendar, Loader2, ArrowRight } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: 'movies' | 'cinemas' | 'sessions' | 'pages';
  url: string;
}

interface SearchResults {
  movies: SearchResult[];
  cinemas: SearchResult[];
  sessions: SearchResult[];
  pages: SearchResult[];
}

const STATIC_PAGES: SearchResult[] = [
  { id: 'dashboard', title: 'Dashboard', category: 'pages', url: '/dashboard' },
  { id: 'movies', title: 'Movies', category: 'pages', url: '/movies' },
  { id: 'movies-new', title: 'New Movie', category: 'pages', url: '/movies/new' },
  { id: 'cinemas', title: 'Cinemas', category: 'pages', url: '/cinemas' },
  { id: 'cinemas-new', title: 'New Cinema', category: 'pages', url: '/cinemas/new' },
  { id: 'sessions', title: 'Sessions', category: 'pages', url: '/sessions' },
  { id: 'sessions-new', title: 'New Session', category: 'pages', url: '/sessions/new' },
  { id: 'import', title: 'Import', category: 'pages', url: '/import' },
  { id: 'export', title: 'Export', category: 'pages', url: '/export' },
  { id: 'admin-settings', title: 'Settings', category: 'pages', url: '/admin/settings' },
  { id: 'admin-users', title: 'Users', category: 'pages', url: '/admin/users' },
  { id: 'admin-genres', title: 'Genres', category: 'pages', url: '/admin/genres' },
  { id: 'admin-formats', title: 'Formats', category: 'pages', url: '/admin/formats' },
  { id: 'admin-parsers', title: 'Parsers', category: 'pages', url: '/admin/parsers' },
];

const CATEGORY_ICONS = {
  movies: Film,
  cinemas: Building2,
  sessions: Calendar,
  pages: ArrowRight,
} as const;

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResults>({
    movies: [],
    cinemas: [],
    sessions: [],
    pages: [],
  });
  const [loading, setLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const allResults = React.useMemo(() => {
    return [...results.pages, ...results.movies, ...results.cinemas, ...results.sessions];
  }, [results]);

  const searchPages = React.useCallback((q: string): SearchResult[] => {
    if (!q) return [];
    const lower = q.toLowerCase();
    return STATIC_PAGES.filter(p => p.title.toLowerCase().includes(lower)).slice(0, 5);
  }, []);

  const searchApi = React.useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults({ movies: [], cinemas: [], sessions: [], pages: searchPages(q) });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (response.ok) {
        const data = await response.json();
        setResults({ ...data, pages: searchPages(q) });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [searchPages]);

  React.useEffect(() => {
    const timer = setTimeout(() => searchApi(query), 150);
    return () => clearTimeout(timer);
  }, [query, searchApi]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
      setResults({ movies: [], cinemas: [], sessions: [], pages: [] });
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (allResults[selectedIndex]) {
          navigateTo(allResults[selectedIndex].url);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  const navigateTo = (url: string) => {
    setOpen(false);
    router.push(url);
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const renderCategory = (category: keyof typeof CATEGORY_ICONS, items: SearchResult[], startIndex: number) => {
    if (items.length === 0) return null;
    const Icon = CATEGORY_ICONS[category];

    return (
      <div key={category}>
        <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {category}
        </div>
        {items.map((item, index) => {
          const globalIndex = startIndex + index;
          const isSelected = selectedIndex === globalIndex;

          return (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2 cursor-pointer mx-1 rounded',
                isSelected ? 'bg-foreground text-background' : 'hover:bg-accent'
              )}
              onClick={() => navigateTo(item.url)}
              onMouseEnter={() => setSelectedIndex(globalIndex)}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-60" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{item.title}</div>
                {item.subtitle && (
                  <div className={cn(
                    'text-xs truncate',
                    isSelected ? 'opacity-70' : 'text-muted-foreground'
                  )}>
                    {item.subtitle}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Trigger */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 border border-border rounded cursor-pointer hover:border-foreground/20 transition-colors"
        onClick={() => setOpen(true)}
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Search...</span>
        <kbd className="hidden sm:inline-flex ml-auto text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {/* Modal */}
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[100] bg-foreground/20" />
            <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[20vh]">
              <div
                ref={containerRef}
                className="w-full max-w-xl mx-4 bg-background rounded-lg shadow-2xl border border-border overflow-hidden animate-scale-in"
              >
                {/* Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search..."
                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>

                {/* Results */}
                <div className="max-h-[50vh] overflow-y-auto py-2">
                  {allResults.length === 0 ? (
                    <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                      {query.length === 0 ? 'Start typing to search' : query.length < 2 ? 'Type more...' : 'No results'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {renderCategory('pages', results.pages, 0)}
                      {renderCategory('movies', results.movies, results.pages.length)}
                      {renderCategory('cinemas', results.cinemas, results.pages.length + results.movies.length)}
                      {renderCategory('sessions', results.sessions, results.pages.length + results.movies.length + results.cinemas.length)}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[11px] text-muted-foreground">
                  <span><kbd className="px-1 py-0.5 rounded bg-muted font-mono">↵</kbd> select</span>
                  <span><kbd className="px-1 py-0.5 rounded bg-muted font-mono">esc</kbd> close</span>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
