'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column, BulkAction } from '@/components/ui/data-table';
import { Plus, Calendar, Film, Building2, Clock, X, Eye, Pencil, Trash2, XCircle, CheckCircle } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';

interface Session {
  id: string;
  show_date: string;
  show_time: string;
  screen_name: string | null;
  is_cancelled: boolean;
  cinema: { id: string; name: string } | null;
  movie_l2: {
    id: string;
    edition_title: string | null;
    format: { name: string } | null;
    audio_language: { code: string } | null;
    movie_l0: { id: string; original_title: string; poster_url: string | null } | null;
  } | null;
  tags: Array<{ tag: { name: string; color: string } | null }>;
}

export default function SessionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [cinemas, setCinemas] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0]);
  const [selectedCinema, setSelectedCinema] = useState(searchParams.get('cinema') || '');

  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    fetchCinemas();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [page, selectedDate, selectedCinema]);

  async function fetchCinemas() {
    const { data } = await supabase
      .from('cinemas')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (data) setCinemas(data);
  }

  async function fetchSessions() {
    setLoading(true);
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

    if (selectedDate) {
      query = query.eq('show_date', selectedDate);
    } else {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('show_date', today);
    }

    if (selectedCinema) {
      query = query.eq('cinema_id', selectedCinema);
    }

    const { data, count } = await query;

    if (data) {
      // Transform data to handle array relations
      const transformed = data.map((s: any) => ({
        ...s,
        cinema: Array.isArray(s.cinema) ? s.cinema[0] : s.cinema,
        movie_l2: Array.isArray(s.movie_l2) ? s.movie_l2[0] : s.movie_l2,
      }));
      setSessions(transformed);
      setTotal(count || 0);
    }
    setLoading(false);
  }

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSessions();
  };

  const columns: Column<Session>[] = [
    {
      key: 'datetime',
      header: 'Date & Time',
      cell: (session) => (
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
      ),
    },
    {
      key: 'movie',
      header: 'Movie',
      cell: (session) => (
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
      ),
    },
    {
      key: 'cinema',
      header: 'Cinema',
      cell: (session) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          {session.cinema?.name || 'Unknown'}
        </div>
      ),
    },
    {
      key: 'screen',
      header: 'Screen',
      cell: (session) => session.screen_name || '-',
    },
    {
      key: 'format',
      header: 'Format',
      cell: (session) => (
        <div className="flex flex-wrap gap-1">
          {session.movie_l2?.format && (
            <Badge variant="outline">{session.movie_l2.format.name}</Badge>
          )}
          {session.movie_l2?.audio_language && (
            <Badge variant="secondary">{session.movie_l2.audio_language.code}</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'tags',
      header: 'Tags',
      cell: (session) => (
        <div className="flex flex-wrap gap-1">
          {session.tags?.map((t, i) => (
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
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (session) =>
        session.is_cancelled ? (
          <span className="flex items-center text-destructive">
            <X className="h-4 w-4 mr-1" />
            Cancelled
          </span>
        ) : (
          <Badge variant="success">Scheduled</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-24',
      cell: (session) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Link href={`/sessions/${session.id}`}>
            <Button variant="ghost" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/sessions/${session.id}/edit`}>
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const bulkActions: BulkAction<Session>[] = [
    {
      label: 'Cancel',
      icon: <XCircle className="h-4 w-4" />,
      onClick: async (items) => {
        const ids = items.map((s) => s.id);
        await supabase.from('sessions').update({ is_cancelled: true }).in('id', ids);
        fetchSessions();
      },
    },
    {
      label: 'Restore',
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: async (items) => {
        const ids = items.map((s) => s.id);
        await supabase.from('sessions').update({ is_cancelled: false }).in('id', ids);
        fetchSessions();
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      confirmMessage: 'Are you sure you want to delete the selected sessions? This action cannot be undone.',
      onClick: async (items) => {
        const ids = items.map((s) => s.id);
        await supabase.from('sessions').delete().in('id', ids);
        fetchSessions();
      },
    },
  ];

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
          <form onSubmit={handleFilter} className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Cinema</label>
              <select
                value={selectedCinema}
                onChange={(e) => setSelectedCinema(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All cinemas</option>
                {cinemas.map((cinema) => (
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
        <CardContent className="p-6">
          <DataTable
            data={sessions}
            columns={columns}
            getRowId={(session) => session.id}
            bulkActions={bulkActions}
            emptyMessage="No sessions found"
            isLoading={loading}
            onRowClick={(session) => router.push(`/sessions/${session.id}`)}
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
