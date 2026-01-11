'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column, BulkAction } from '@/components/ui/data-table';
import { Plus, Film, CheckCircle, Clock, Eye, Pencil, Trash2, Archive, Check } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Movie {
  id: string;
  original_title: string;
  production_year: number | null;
  poster_url: string | null;
  status: string;
  is_verified: boolean;
  created_at: string;
  genres: Array<{ genre: { name: string } | null }>;
  l1_entries: Array<{ language_id: string; title: string }>;
}

export default function MoviesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');

  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    fetchMovies();
  }, [page, search, status]);

  async function fetchMovies() {
    setLoading(true);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('movies_l0')
      .select(
        `
        id,
        original_title,
        production_year,
        poster_url,
        status,
        is_verified,
        created_at,
        genres:movie_l0_genres(genre:genres(name)),
        l1_entries:movies_l1(language_id, title)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('original_title', `%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query;

    if (data) {
      setMovies(data as any);
      setTotal(count || 0);
    }
    setLoading(false);
  }

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMovies();
  };

  const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning'> = {
    draft: 'secondary',
    pending_review: 'warning',
    verified: 'success',
    archived: 'default',
  };

  const columns: Column<Movie>[] = [
    {
      key: 'poster',
      header: '',
      className: 'w-12',
      cell: (movie) => (
        <div className="h-12 w-8 rounded bg-muted flex items-center justify-center overflow-hidden">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.original_title}
              className="h-full w-full object-cover"
            />
          ) : (
            <Film className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      cell: (movie) => (
        <div>
          <p className="font-medium">{movie.original_title}</p>
          {movie.l1_entries?.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {movie.l1_entries.length} localization(s)
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'year',
      header: 'Year',
      cell: (movie) => movie.production_year || '-',
    },
    {
      key: 'genres',
      header: 'Genres',
      cell: (movie) => (
        <div className="flex flex-wrap gap-1">
          {movie.genres?.slice(0, 2).map((g, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {g.genre?.name}
            </Badge>
          ))}
          {movie.genres?.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{movie.genres.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (movie) => (
        <Badge variant={statusColors[movie.status] || 'default'}>
          {movie.status?.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'verified',
      header: 'Verified',
      cell: (movie) =>
        movie.is_verified ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <Clock className="h-4 w-4 text-yellow-600" />
        ),
    },
    {
      key: 'created',
      header: 'Created',
      cell: (movie) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(movie.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-24',
      cell: (movie) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Link href={`/movies/${movie.id}`}>
            <Button variant="ghost" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/movies/${movie.id}/edit`}>
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const bulkActions: BulkAction<Movie>[] = [
    {
      label: 'Verify',
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: async (items) => {
        const ids = items.map((m) => m.id);
        await supabase
          .from('movies_l0')
          .update({ is_verified: true, status: 'verified' })
          .in('id', ids);
        fetchMovies();
      },
    },
    {
      label: 'Set Draft',
      icon: <Clock className="h-4 w-4" />,
      onClick: async (items) => {
        const ids = items.map((m) => m.id);
        await supabase
          .from('movies_l0')
          .update({ status: 'draft', is_verified: false })
          .in('id', ids);
        fetchMovies();
      },
    },
    {
      label: 'Archive',
      icon: <Archive className="h-4 w-4" />,
      onClick: async (items) => {
        const ids = items.map((m) => m.id);
        await supabase.from('movies_l0').update({ status: 'archived' }).in('id', ids);
        fetchMovies();
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      confirmMessage:
        'Are you sure you want to delete the selected movies? This action cannot be undone.',
      onClick: async (items) => {
        const ids = items.map((m) => m.id);
        await supabase.from('movies_l0').delete().in('id', ids);
        fetchMovies();
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movies</h1>
          <p className="text-muted-foreground">Manage movie database ({total} total)</p>
        </div>
        <Link href="/movies/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Movie
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleFilter} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search movies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_review">Pending Review</option>
              <option value="verified">Verified</option>
              <option value="archived">Archived</option>
            </select>
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Movies Table */}
      <Card>
        <CardContent className="p-6">
          <DataTable
            data={movies}
            columns={columns}
            getRowId={(movie) => movie.id}
            bulkActions={bulkActions}
            emptyMessage="No movies found"
            isLoading={loading}
            onRowClick={(movie) => router.push(`/movies/${movie.id}`)}
          />
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
