'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, Pencil, Building2, MapPin, Phone, Mail, Globe, Clock,
  Calendar, Film, ExternalLink, Check, X,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';

interface Cinema {
  id: string;
  name: string;
  slug: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  screen_count: number;
  is_active: boolean;
  parser_type: string | null;
  created_at: string;
  updated_at: string;
  cinema_group: { id: string; name: string; slug: string } | null;
  country: { id: string; code: string; name: string } | null;
  tags: Array<{ tag: { id: string; name: string; color: string | null } }>;
}

interface Session {
  id: string;
  show_date: string;
  show_time: string;
  screen_name: string | null;
  is_cancelled: boolean;
  movie_l2: {
    edition_title: string | null;
    movie_l0: { original_title: string; poster_url: string | null };
    format: { name: string } | null;
    audio_language: { code: string } | null;
  };
}

export default function CinemaDetailPage() {
  const params = useParams();
  const cinemaId = params.id as string;
  const supabase = createClient();
  const { hasPermission } = useUser();

  const canEdit = hasPermission('cinemas:update');

  const [loading, setLoading] = useState(true);
  const [cinema, setCinema] = useState<Cinema | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);

  useEffect(() => {
    fetchCinema();
    fetchUpcomingSessions();
  }, [cinemaId]);

  async function fetchCinema() {
    setLoading(true);

    const { data } = await supabase
      .from('cinemas')
      .select(`
        *,
        cinema_group:cinema_groups(id, name, slug),
        country:countries(id, code, name),
        tags:cinema_cinema_tags(tag:cinema_tags(id, name, color))
      `)
      .eq('id', cinemaId)
      .single();

    if (data) {
      setCinema(data as unknown as Cinema);
    }

    setLoading(false);
  }

  async function fetchUpcomingSessions() {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('sessions')
      .select(`
        id,
        show_date,
        show_time,
        screen_name,
        is_cancelled,
        movie_l2:movies_l2(
          edition_title,
          movie_l0:movies_l0(original_title, poster_url),
          format:formats(name),
          audio_language:languages!movies_l2_audio_language_id_fkey(code)
        )
      `)
      .eq('cinema_id', cinemaId)
      .gte('show_date', today)
      .order('show_date', { ascending: true })
      .order('show_time', { ascending: true })
      .limit(10);

    if (data) {
      setUpcomingSessions(data as unknown as Session[]);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading cinema...</div>
      </div>
    );
  }

  if (!cinema) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Cinema not found</h2>
        <Link href="/cinemas">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cinemas
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
          <Link href="/cinemas">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
            {cinema.logo_url ? (
              <img src={cinema.logo_url} alt={cinema.name} className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{cinema.name}</h1>
              <Badge variant={cinema.is_active ? 'success' : 'secondary'}>
                {cinema.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {cinema.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {cinema.city}
                  {cinema.country && `, ${cinema.country.name}`}
                </span>
              )}
              {cinema.cinema_group && (
                <Badge variant="outline">{cinema.cinema_group.name}</Badge>
              )}
            </div>
          </div>
        </div>

        {canEdit && (
          <Link href={`/cinemas/${cinemaId}/edit`}>
            <Button>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Cinema
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Slug</span>
                <p className="font-mono text-xs">{cinema.slug}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Screens</span>
                <p className="font-medium">{cinema.screen_count}</p>
              </div>
              {cinema.parser_type && (
                <div>
                  <span className="text-muted-foreground">Parser</span>
                  <p><Badge variant="secondary">{cinema.parser_type}</Badge></p>
                </div>
              )}
            </div>

            {cinema.tags && cinema.tags.length > 0 && (
              <div>
                <span className="text-muted-foreground text-sm">Tags</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {cinema.tags.map((t, i) => (
                    <Badge key={i} variant="outline" style={{ borderColor: t.tag?.color || undefined }}>
                      {t.tag?.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-4 border-t">
              <p>Created: {formatDate(cinema.created_at)}</p>
              <p>Updated: {formatDate(cinema.updated_at)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Location */}
        <Card>
          <CardHeader>
            <CardTitle>Contact & Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(cinema.address_line1 || cinema.city) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  {cinema.address_line1 && <p>{cinema.address_line1}</p>}
                  {cinema.address_line2 && <p>{cinema.address_line2}</p>}
                  {(cinema.postal_code || cinema.city) && (
                    <p>{cinema.postal_code} {cinema.city}</p>
                  )}
                  {cinema.country && <p>{cinema.country.name}</p>}
                </div>
              </div>
            )}

            {cinema.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${cinema.phone}`} className="text-primary hover:underline">
                  {cinema.phone}
                </a>
              </div>
            )}

            {cinema.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${cinema.email}`} className="text-primary hover:underline">
                  {cinema.email}
                </a>
              </div>
            )}

            {cinema.website && (
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a href={cinema.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  {cinema.website.replace(/^https?:\/\//, '')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {cinema.latitude && cinema.longitude && (
              <div className="pt-4">
                <a
                  href={`https://www.google.com/maps?q=${cinema.latitude},${cinema.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm flex items-center gap-1"
                >
                  View on Google Maps
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Screenings Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Screenings</CardTitle>
            <CardDescription>Weekly movie screenings and schedules</CardDescription>
          </div>
          <Link href={`/cinemas/${cinemaId}/screenings`}>
            <Button variant="default" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Manage Screenings
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Manage weekly screenings, session days, and showing times for this cinema.
          </p>
        </CardContent>
      </Card>

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Upcoming Sessions</CardTitle>
            <CardDescription>Next 10 scheduled showings</CardDescription>
          </div>
          <Link href={`/sessions?cinema=${cinemaId}`}>
            <Button variant="outline" size="sm">
              View All Sessions
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No upcoming sessions
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Movie</TableHead>
                  <TableHead>Screen</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingSessions.map(session => (
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
                        <div className="h-10 w-7 rounded bg-muted overflow-hidden">
                          {session.movie_l2?.movie_l0?.poster_url ? (
                            <img
                              src={session.movie_l2.movie_l0.poster_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Film className="h-full w-full p-1.5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{session.movie_l2?.movie_l0?.original_title}</p>
                          {session.movie_l2?.edition_title && (
                            <p className="text-xs text-muted-foreground">{session.movie_l2.edition_title}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{session.screen_name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {session.movie_l2?.format && (
                          <Badge variant="outline">{session.movie_l2.format.name}</Badge>
                        )}
                        {session.movie_l2?.audio_language && (
                          <Badge variant="secondary">{session.movie_l2.audio_language.code}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {session.is_cancelled ? (
                        <span className="flex items-center text-destructive text-sm">
                          <X className="h-4 w-4 mr-1" />
                          Cancelled
                        </span>
                      ) : (
                        <span className="flex items-center text-green-600 text-sm">
                          <Check className="h-4 w-4 mr-1" />
                          Scheduled
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
