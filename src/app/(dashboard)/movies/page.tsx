import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Film, CheckCircle, Clock, Eye, Pencil } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface SearchParams {
  page?: string;
  search?: string;
  status?: string;
}

async function getMovies(searchParams: SearchParams) {
  const supabase = await createClient();
  const page = parseInt(searchParams.page || '1');
  const limit = 10;
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

  if (searchParams.search) {
    query = query.ilike('original_title', `%${searchParams.search}%`);
  }

  if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }

  const { data, count, error } = await query;

  return {
    movies: data || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { movies, total, page, totalPages } = await getMovies(params);

  const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning'> = {
    draft: 'secondary',
    pending_review: 'warning',
    verified: 'success',
    archived: 'default',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movies</h1>
          <p className="text-muted-foreground">
            Manage movie database ({total} total)
          </p>
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
          <form className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                name="search"
                placeholder="Search movies..."
                defaultValue={params.search}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <select
              name="status"
              defaultValue={params.status}
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
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Genres</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No movies found
                  </TableCell>
                </TableRow>
              ) : (
                movies.map((movie: any) => (
                  <TableRow key={movie.id}>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{movie.original_title}</p>
                        {movie.l1_entries?.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {movie.l1_entries.length} localization(s)
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{movie.production_year || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {movie.genres?.slice(0, 2).map((g: any, i: number) => (
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
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[movie.status] || 'default'}>
                        {movie.status?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {movie.is_verified ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(movie.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              href={`/movies?page=${page - 1}${params.search ? `&search=${params.search}` : ''}${params.status ? `&status=${params.status}` : ''}`}
            >
              <Button variant="outline" size="sm" disabled={page <= 1}>
                Previous
              </Button>
            </Link>
            <Link
              href={`/movies?page=${page + 1}${params.search ? `&search=${params.search}` : ''}${params.status ? `&status=${params.status}` : ''}`}
            >
              <Button variant="outline" size="sm" disabled={page >= totalPages}>
                Next
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
