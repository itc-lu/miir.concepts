import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Calendar, Film, Building2, Clock, X } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';

interface SearchParams {
  page?: string;
  date?: string;
  cinema?: string;
}

async function getSessions(searchParams: SearchParams) {
  const supabase = await createClient();
  const page = parseInt(searchParams.page || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('sessions')
    .select(
      `
      id,
      show_date,
      show_time,
      screen_name,
      is_cancelled,
      cinema:cinemas(id, name),
      movie_l2:movies_l2(
        id,
        edition_title,
        format:formats(name),
        audio_language:languages!movies_l2_audio_language_id_fkey(code),
        movie_l0:movies_l0(id, original_title, poster_url)
      ),
      tags:session_session_tags(tag:session_tags(name, color))
    `,
      { count: 'exact' }
    )
    .order('show_date', { ascending: true })
    .order('show_time', { ascending: true })
    .range(offset, offset + limit - 1);

  // Default to today if no date specified
  const today = new Date().toISOString().split('T')[0];
  if (searchParams.date) {
    query = query.eq('show_date', searchParams.date);
  } else {
    query = query.gte('show_date', today);
  }

  if (searchParams.cinema) {
    query = query.eq('cinema_id', searchParams.cinema);
  }

  const { data, count, error } = await query;

  return {
    sessions: data || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

async function getCinemas() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('cinemas')
    .select('id, name')
    .eq('is_active', true)
    .order('name');
  return data || [];
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [{ sessions, total, page, totalPages }, cinemas] = await Promise.all([
    getSessions(params),
    getCinemas(),
  ]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground">
            Manage movie showings ({total} total)
          </p>
        </div>
        <Link href="/sessions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Session
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Date</label>
              <input
                type="date"
                name="date"
                defaultValue={params.date || today}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Cinema</label>
              <select
                name="cinema"
                defaultValue={params.cinema}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All cinemas</option>
                {cinemas.map(cinema => (
                  <option key={cinema.id} value={cinema.id}>
                    {cinema.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="secondary">
                Filter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Movie</TableHead>
                <TableHead>Cinema</TableHead>
                <TableHead>Screen</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No sessions found
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session: any) => (
                  <TableRow key={session.id} className={session.is_cancelled ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{formatDate(session.show_date)}</p>
                          <p className="text-sm text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTime(session.show_time)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-8 rounded bg-muted flex items-center justify-center overflow-hidden">
                          {session.movie_l2?.movie_l0?.poster_url ? (
                            <img
                              src={session.movie_l2.movie_l0.poster_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Film className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {session.movie_l2?.movie_l0?.original_title || 'Unknown'}
                          </p>
                          {session.movie_l2?.edition_title && (
                            <p className="text-xs text-muted-foreground">
                              {session.movie_l2.edition_title}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {session.cinema?.name || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>{session.screen_name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {session.movie_l2?.format && (
                          <Badge variant="outline">{session.movie_l2.format.name}</Badge>
                        )}
                        {session.movie_l2?.audio_language && (
                          <Badge variant="secondary">{session.movie_l2.audio_language.code}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {session.tags?.map((t: any, i: number) => (
                          <Badge
                            key={i}
                            variant="outline"
                            style={{
                              borderColor: t.tag?.color || undefined,
                              color: t.tag?.color || undefined,
                            }}
                          >
                            {t.tag?.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {session.is_cancelled ? (
                        <span className="flex items-center text-destructive">
                          <X className="h-4 w-4 mr-1" />
                          Cancelled
                        </span>
                      ) : (
                        <Badge variant="success">Scheduled</Badge>
                      )}
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
            <Link href={`/sessions?page=${page - 1}${params.date ? `&date=${params.date}` : ''}${params.cinema ? `&cinema=${params.cinema}` : ''}`}>
              <Button variant="outline" size="sm" disabled={page <= 1}>
                Previous
              </Button>
            </Link>
            <Link href={`/sessions?page=${page + 1}${params.date ? `&date=${params.date}` : ''}${params.cinema ? `&cinema=${params.cinema}` : ''}`}>
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
