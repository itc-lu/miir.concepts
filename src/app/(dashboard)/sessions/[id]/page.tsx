'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Pencil, Calendar, Clock, Building2, Film, MapPin,
  ExternalLink, Check, X, Trash2, AlertCircle, XCircle,
} from 'lucide-react';
import { formatDate, formatTime, formatRuntime } from '@/lib/utils';

interface Session {
  id: string;
  show_date: string;
  show_time: string;
  end_time: string | null;
  screen_name: string | null;
  price: number | null;
  currency: string;
  booking_url: string | null;
  notes: string | null;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
  cinema: {
    id: string;
    name: string;
    city: string | null;
    country: { code: string; name: string } | null;
  };
  movie_l2: {
    id: string;
    edition_title: string | null;
    is_original_version: boolean;
    format: { name: string } | null;
    technology: { name: string } | null;
    audio_language: { code: string; name: string } | null;
    subtitle_language: { code: string; name: string } | null;
    subtitle_language_2: { code: string; name: string } | null;
    movie_l0: {
      id: string;
      original_title: string;
      production_year: number | null;
      runtime_minutes: number | null;
      poster_url: string | null;
    };
  };
  tags: Array<{ tag: { id: string; name: string; color: string | null } }>;
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const supabase = createClient();
  const { hasPermission } = useUser();

  const canEdit = hasPermission('sessions:update');
  const canDelete = hasPermission('sessions:delete');

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  async function fetchSession() {
    setLoading(true);

    const { data } = await supabase
      .from('sessions')
      .select(`
        *,
        cinema:cinemas(
          id, name, city,
          country:countries(code, name)
        ),
        movie_l2:movies_l2(
          id, edition_title, is_original_version,
          format:formats(name),
          technology:technologies(name),
          audio_language:languages!movies_l2_audio_language_id_fkey(code, name),
          subtitle_language:languages!movies_l2_subtitle_language_id_fkey(code, name),
          subtitle_language_2:languages!movies_l2_subtitle_language_2_id_fkey(code, name),
          movie_l0:movies_l0(id, original_title, production_year, runtime_minutes, poster_url)
        ),
        tags:session_session_tags(tag:session_tags(id, name, color))
      `)
      .eq('id', sessionId)
      .single();

    if (data) {
      setSession(data as unknown as Session);
    }

    setLoading(false);
  }

  async function handleCancel() {
    setActionLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ is_cancelled: !session?.is_cancelled })
        .eq('id', sessionId);

      if (error) throw error;
      await fetchSession();
      setCancelDialogOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update session');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    setActionLoading(true);
    setError(null);

    try {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;
      router.push('/sessions');
    } catch (err: any) {
      setError(err.message || 'Failed to delete session');
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Session not found</h2>
        <Link href="/sessions">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/sessions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="h-24 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {session.movie_l2?.movie_l0?.poster_url ? (
              <img
                src={session.movie_l2.movie_l0.poster_url}
                alt={session.movie_l2.movie_l0.original_title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Film className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{session.movie_l2?.movie_l0?.original_title}</h1>
              {session.is_cancelled ? (
                <Badge variant="destructive">Cancelled</Badge>
              ) : (
                <Badge variant="success">Scheduled</Badge>
              )}
            </div>
            {session.movie_l2?.edition_title && (
              <p className="text-muted-foreground mb-2">{session.movie_l2.edition_title}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(session.show_date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime(session.show_time)}
                {session.end_time && ` - ${formatTime(session.end_time)}`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {canEdit && (
            <>
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(true)}
              >
                {session.is_cancelled ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Restore
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </>
                )}
              </Button>
              <Link href={`/sessions/${sessionId}/edit`}>
                <Button>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
            </>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Session Details */}
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Date</span>
                <p className="font-medium">{formatDate(session.show_date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Time</span>
                <p className="font-medium">
                  {formatTime(session.show_time)}
                  {session.end_time && ` - ${formatTime(session.end_time)}`}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Screen</span>
                <p className="font-medium">{session.screen_name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Price</span>
                <p className="font-medium">
                  {session.price ? `${session.price.toFixed(2)} ${session.currency}` : '-'}
                </p>
              </div>
            </div>

            {session.booking_url && (
              <div>
                <span className="text-muted-foreground text-sm">Booking</span>
                <a
                  href={session.booking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  Book tickets <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {session.tags && session.tags.length > 0 && (
              <div>
                <span className="text-muted-foreground text-sm">Tags</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {session.tags.map((t, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      style={{ borderColor: t.tag?.color || undefined, color: t.tag?.color || undefined }}
                    >
                      {t.tag?.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {session.notes && (
              <div>
                <span className="text-muted-foreground text-sm">Notes</span>
                <p className="text-sm mt-1">{session.notes}</p>
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-4 border-t">
              <p>Created: {formatDate(session.created_at)}</p>
              <p>Updated: {formatDate(session.updated_at)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Movie & Cinema Details */}
        <div className="space-y-6">
          {/* Movie Info */}
          <Card>
            <CardHeader>
              <CardTitle>Movie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href={`/movies/${session.movie_l2?.movie_l0?.id}`} className="block group">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-12 rounded bg-muted overflow-hidden flex-shrink-0">
                    {session.movie_l2?.movie_l0?.poster_url ? (
                      <img
                        src={session.movie_l2.movie_l0.poster_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Film className="h-full w-full p-2 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium group-hover:text-primary transition-colors">
                      {session.movie_l2?.movie_l0?.original_title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {session.movie_l2?.movie_l0?.production_year}
                      {session.movie_l2?.movie_l0?.runtime_minutes && (
                        <> &bull; {formatRuntime(session.movie_l2.movie_l0.runtime_minutes)}</>
                      )}
                    </p>
                  </div>
                </div>
              </Link>

              <div className="border-t pt-4">
                <span className="text-muted-foreground text-sm">Edition</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {session.movie_l2?.format && (
                    <Badge variant="outline">{session.movie_l2.format.name}</Badge>
                  )}
                  {session.movie_l2?.technology && (
                    <Badge variant="secondary">{session.movie_l2.technology.name}</Badge>
                  )}
                  {session.movie_l2?.is_original_version && (
                    <Badge>OV</Badge>
                  )}
                </div>
              </div>

              <div>
                <span className="text-muted-foreground text-sm">Audio</span>
                <p className="font-medium mt-1">
                  {session.movie_l2?.audio_language
                    ? `${session.movie_l2.audio_language.name} (${session.movie_l2.audio_language.code.toUpperCase()})`
                    : '-'}
                </p>
              </div>

              {(session.movie_l2?.subtitle_language || session.movie_l2?.subtitle_language_2) && (
                <div>
                  <span className="text-muted-foreground text-sm">Subtitles</span>
                  <div className="flex gap-2 mt-1">
                    {session.movie_l2?.subtitle_language && (
                      <Badge variant="outline">
                        {session.movie_l2.subtitle_language.code.toUpperCase()}
                      </Badge>
                    )}
                    {session.movie_l2?.subtitle_language_2 && (
                      <Badge variant="outline">
                        {session.movie_l2.subtitle_language_2.code.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cinema Info */}
          <Card>
            <CardHeader>
              <CardTitle>Cinema</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/cinemas/${session.cinema?.id}`} className="block group">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium group-hover:text-primary transition-colors">
                      {session.cinema?.name}
                    </p>
                    {session.cinema?.city && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.cinema.city}
                        {session.cinema.country && `, ${session.cinema.country.name}`}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {session.is_cancelled ? 'Restore Session' : 'Cancel Session'}
            </DialogTitle>
            <DialogDescription>
              {session.is_cancelled
                ? 'Are you sure you want to restore this session? It will be visible in the schedule again.'
                : 'Are you sure you want to cancel this session? The session will be marked as cancelled but not deleted.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Go Back
            </Button>
            <Button
              variant={session.is_cancelled ? 'default' : 'destructive'}
              onClick={handleCancel}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : session.is_cancelled ? 'Restore' : 'Cancel Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this session? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
              {actionLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
