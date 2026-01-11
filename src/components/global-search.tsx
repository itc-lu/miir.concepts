'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Search,
  Film,
  Building2,
  Calendar,
  FileInput,
  FileOutput,
  Settings,
  Users,
  Loader2,
  ArrowRight,
  Command,
} from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: 'movies' | 'cinemas' | 'sessions' | 'pages';
  url: string;
  icon?: string;
}

interface SearchResults {
  movies: SearchResult[];
  cinemas: SearchResult[];
  sessions: SearchResult[];
  pages: SearchResult[];
}

// Static pages that can be searched
const STATIC_PAGES: SearchResult[] = [
  { id: 'dashboard', title: 'Dashboard', subtitle: 'Overview and statistics', category: 'pages', url: '/dashboard' },
  { id: 'movies', title: 'Movies', subtitle: 'Browse all movies', category: 'pages', url: '/movies' },
  { id: 'movies-new', title: 'Add New Movie', subtitle: 'Create a new movie entry', category: 'pages', url: '/movies/new' },
  { id: 'cinemas', title: 'Cinemas', subtitle: 'Browse all cinemas', category: 'pages', url: '/cinemas' },
  { id: 'cinemas-new', title: 'Add New Cinema', subtitle: 'Create a new cinema', category: 'pages', url: '/cinemas/new' },
  { id: 'sessions', title: 'Sessions', subtitle: 'Browse all screenings', category: 'pages', url: '/sessions' },
  { id: 'sessions-new', title: 'Add New Session', subtitle: 'Create a new screening', category: 'pages', url: '/sessions/new' },
  { id: 'import', title: 'Import', subtitle: 'Import data from external sources', category: 'pages', url: '/import' },
  { id: 'export', title: 'Export', subtitle: 'Export data to clients', category: 'pages', url: '/export' },
  { id: 'admin-settings', title: 'System Settings', subtitle: 'Configure system settings', category: 'pages', url: '/admin/settings' },
  { id: 'admin-users', title: 'Users', subtitle: 'Manage user accounts', category: 'pages', url: '/admin/users' },
  { id: 'admin-roles', title: 'Roles', subtitle: 'Manage user roles', category: 'pages', url: '/admin/roles' },
  { id: 'admin-cinema-groups', title: 'Cinema Groups', subtitle: 'Manage cinema chains', category: 'pages', url: '/admin/cinema-groups' },
  { id: 'admin-formats', title: 'Formats', subtitle: 'Manage movie formats (2D, 3D, IMAX)', category: 'pages', url: '/admin/formats' },
  { id: 'admin-technologies', title: 'Technologies', subtitle: 'Manage projection technologies', category: 'pages', url: '/admin/technologies' },
  { id: 'admin-languages', title: 'Languages', subtitle: 'Manage languages', category: 'pages', url: '/admin/languages' },
  { id: 'admin-genres', title: 'Genres', subtitle: 'Manage movie genres', category: 'pages', url: '/admin/genres' },
  { id: 'admin-age-ratings', title: 'Age Ratings', subtitle: 'Manage age ratings', category: 'pages', url: '/admin/age-ratings' },
  { id: 'admin-tags', title: 'Tags', subtitle: 'Manage cinema, movie, and session tags', category: 'pages', url: '/admin/tags' },
  { id: 'admin-countries', title: 'Countries', subtitle: 'Manage countries', category: 'pages', url: '/admin/countries' },
  { id: 'admin-flag-automation', title: 'Flag Automation', subtitle: 'Configure automatic flags', category: 'pages', url: '/admin/flag-automation' },
  { id: 'admin-export-clients', title: 'Export Clients', subtitle: 'Manage export clients', category: 'pages', url: '/admin/export-clients' },
  { id: 'admin-parsers', title: 'Parsers', subtitle: 'Manage cinema data parsers', category: 'pages', url: '/admin/parsers' },
];

const CATEGORY_CONFIG = {
  movies: { icon: Film, label: 'Movies', color: 'text-blue-500' },
  cinemas: { icon: Building2, label: 'Cinemas', color: 'text-green-500' },
  sessions: { icon: Calendar, label: 'Sessions', color: 'text-purple-500' },
  pages: { icon: ArrowRight, label: 'Pages', color: 'text-slate-500' },
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

  // Get all results as flat array for keyboard navigation
  const allResults = React.useMemo(() => {
    return [
      ...results.pages,
      ...results.movies,
      ...results.cinemas,
      ...results.sessions,
    ];
  }, [results]);

  // Search for static pages
  const searchPages = React.useCallback((searchQuery: string): SearchResult[] => {
    if (!searchQuery) return [];
    const lowerQuery = searchQuery.toLowerCase();
    return STATIC_PAGES.filter(
      (page) =>
        page.title.toLowerCase().includes(lowerQuery) ||
        page.subtitle?.toLowerCase().includes(lowerQuery)
    ).slice(0, 5);
  }, []);

  // Search API for dynamic content
  const searchApi = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults({
        movies: [],
        cinemas: [],
        sessions: [],
        pages: searchPages(searchQuery),
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults({
          ...data,
          pages: searchPages(searchQuery),
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [searchPages]);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      searchApi(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, searchApi]);

  // Reset selected index when results change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Keyboard shortcut to open search (Cmd/Ctrl + K)
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

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
      setResults({ movies: [], cinemas: [], sessions: [], pages: [] });
    }
  }, [open]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, allResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
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

  // Navigate to result
  const navigateTo = (url: string) => {
    setOpen(false);
    router.push(url);
  };

  // Click outside to close
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const renderCategory = (
    category: keyof typeof CATEGORY_CONFIG,
    items: SearchResult[],
    startIndex: number
  ) => {
    if (items.length === 0) return null;
    const config = CATEGORY_CONFIG[category];
    const Icon = config.icon;

    return (
      <div key={category}>
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {config.label}
        </div>
        {items.map((item, index) => {
          const globalIndex = startIndex + index;
          const isSelected = selectedIndex === globalIndex;
          const ItemIcon = CATEGORY_CONFIG[item.category].icon;

          return (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md mx-1',
                isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              )}
              onClick={() => navigateTo(item.url)}
              onMouseEnter={() => setSelectedIndex(globalIndex)}
            >
              <ItemIcon className={cn('h-4 w-4 shrink-0', config.color)} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.title}</div>
                {item.subtitle && (
                  <div className="text-sm text-muted-foreground truncate">{item.subtitle}</div>
                )}
              </div>
              {isSelected && (
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  Enter
                </kbd>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Trigger - replaces the original search input */}
      <div
        className="relative flex flex-1 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <Search className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-muted-foreground" />
        <div className="flex h-full w-full items-center border-0 bg-transparent py-0 pl-8 pr-0 text-muted-foreground sm:text-sm">
          <span>Search movies, cinemas...</span>
          <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>
      </div>

      {/* Search Modal */}
      {open &&
        createPortal(
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[100] bg-black/50" />

            {/* Search Container */}
            <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh]">
              <div
                ref={containerRef}
                className="w-full max-w-2xl mx-4 bg-popover rounded-xl shadow-2xl border overflow-hidden animate-in fade-in-0 zoom-in-95"
              >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b">
                  <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search movies, cinemas, sessions, pages..."
                    className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    ESC
                  </kbd>
                </div>

                {/* Results */}
                <div className="max-h-[60vh] overflow-y-auto py-2">
                  {allResults.length === 0 ? (
                    <div className="px-4 py-8 text-center text-muted-foreground">
                      {query.length === 0 ? (
                        <div>
                          <p className="font-medium">Start typing to search</p>
                          <p className="text-sm mt-1">
                            Search across movies, cinemas, sessions, and navigation pages
                          </p>
                        </div>
                      ) : query.length < 2 ? (
                        <p>Type at least 2 characters to search</p>
                      ) : loading ? (
                        <p>Searching...</p>
                      ) : (
                        <p>No results found for &quot;{query}&quot;</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {renderCategory('pages', results.pages, 0)}
                      {renderCategory(
                        'movies',
                        results.movies,
                        results.pages.length
                      )}
                      {renderCategory(
                        'cinemas',
                        results.cinemas,
                        results.pages.length + results.movies.length
                      )}
                      {renderCategory(
                        'sessions',
                        results.sessions,
                        results.pages.length + results.movies.length + results.cinemas.length
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-4 px-4 py-2 border-t bg-muted/50 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded border bg-background">↑</kbd>
                    <kbd className="px-1.5 py-0.5 rounded border bg-background">↓</kbd>
                    to navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded border bg-background">Enter</kbd>
                    to select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded border bg-background">ESC</kbd>
                    to close
                  </span>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
