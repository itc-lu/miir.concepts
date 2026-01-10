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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft, Pencil, Film, Calendar, Clock, Star, Globe, Plus,
  Languages, Clapperboard, Tag, CheckCircle, AlertCircle, Trash2, ExternalLink,
} from 'lucide-react';
import { formatDate, formatRuntime } from '@/lib/utils';

interface MovieL0 {
  id: string;
  original_title: string;
  slug: string;
  production_year: number | null;
  runtime_minutes: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  trailer_url: string | null;
  imdb_id: string | null;
  tmdb_id: number | null;
  imdb_rating: number | null;
  tmdb_rating: number | null;
  status: string;
  is_verified: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  genres: Array<{ genre: { id: string; name: string } }>;
  countries: Array<{ country: { id: string; code: string; name: string }; is_primary: boolean }>;
  tags: Array<{ tag: { id: string; name: string; color: string | null } }>;
}

interface MovieL1 {
  id: string;
  language_id: string;
  language: { code: string; name: string };
  title: string;
  plot: string | null;
  release_date: string | null;
  runtime_minutes: number | null;
  tagline: string | null;
  age_rating: { id: string; code: string; name: string; country: { code: string } } | null;
}

interface MovieL2 {
  id: string;
  edition_title: string | null;
  format: { id: string; code: string; name: string } | null;
  technology: { id: string; code: string; name: string } | null;
  audio_language: { id: string; code: string; name: string } | null;
  subtitle_language: { id: string; code: string; name: string } | null;
  subtitle_language_2: { id: string; code: string; name: string } | null;
  is_original_version: boolean;
  is_active: boolean;
  notes: string | null;
}

type Tab = 'overview' | 'localizations' | 'editions';

export default function MovieDetailPage() {
  const params = useParams();
  const movieId = params.id as string;
  const supabase = createClient();
  const { hasPermission } = useUser();

  const canEdit = hasPermission('movies:update');
  const canDelete = hasPermission('movies:delete');

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [movie, setMovie] = useState<MovieL0 | null>(null);
  const [localizations, setLocalizations] = useState<MovieL1[]>([]);
  const [editions, setEditions] = useState<MovieL2[]>([]);

  // Dialog states
  const [l1DialogOpen, setL1DialogOpen] = useState(false);
  const [l2DialogOpen, setL2DialogOpen] = useState(false);
  const [editingL1, setEditingL1] = useState<MovieL1 | null>(null);
  const [editingL2, setEditingL2] = useState<MovieL2 | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'l1' | 'l2' | null>(null);
  const [deleteItem, setDeleteItem] = useState<MovieL1 | MovieL2 | null>(null);

  // Form states
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Reference data
  const [languages, setLanguages] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [formats, setFormats] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [technologies, setTechnologies] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [ageRatings, setAgeRatings] = useState<Array<{ id: string; code: string; name: string; country_id: string }>>([]);

  // L1 form data
  const [l1Form, setL1Form] = useState({
    language_id: '',
    title: '',
    plot: '',
    release_date: '',
    runtime_minutes: '',
    tagline: '',
    age_rating_id: '',
  });

  // L2 form data
  const [l2Form, setL2Form] = useState({
    edition_title: '',
    format_id: '',
    technology_id: '',
    audio_language_id: '',
    subtitle_language_id: '',
    subtitle_language_2_id: '',
    is_original_version: false,
    is_active: true,
    notes: '',
  });

  useEffect(() => {
    fetchMovie();
    fetchReferenceData();
  }, [movieId]);

  async function fetchMovie() {
    setLoading(true);

    // Fetch L0
    const { data: l0Data } = await supabase
      .from('movies_l0')
      .select(`
        *,
        genres:movie_l0_genres(genre:genres(id, name)),
        countries:movie_l0_countries(country:countries(id, code, name), is_primary),
        tags:movie_l0_tags(tag:movie_tags(id, name, color))
      `)
      .eq('id', movieId)
      .single();

    if (l0Data) {
      setMovie(l0Data as MovieL0);
    }

    // Fetch L1
    const { data: l1Data } = await supabase
      .from('movies_l1')
      .select(`
        *,
        language:languages(code, name),
        age_rating:age_ratings(id, code, name, country:countries(code))
      `)
      .eq('movie_l0_id', movieId)
      .order('language_id');

    if (l1Data) {
      setLocalizations(l1Data as unknown as MovieL1[]);
    }

    // Fetch L2
    const { data: l2Data } = await supabase
      .from('movies_l2')
      .select(`
        *,
        format:formats(id, code, name),
        technology:technologies(id, code, name),
        audio_language:languages!movies_l2_audio_language_id_fkey(id, code, name),
        subtitle_language:languages!movies_l2_subtitle_language_id_fkey(id, code, name),
        subtitle_language_2:languages!movies_l2_subtitle_language_2_id_fkey(id, code, name)
      `)
      .eq('movie_l0_id', movieId);

    if (l2Data) {
      setEditions(l2Data as unknown as MovieL2[]);
    }

    setLoading(false);
  }

  async function fetchReferenceData() {
    const [langRes, formatRes, techRes, ageRes] = await Promise.all([
      supabase.from('languages').select('id, code, name').eq('is_active', true).order('display_order'),
      supabase.from('formats').select('id, code, name').eq('is_active', true).order('display_order'),
      supabase.from('technologies').select('id, code, name').eq('is_active', true).order('display_order'),
      supabase.from('age_ratings').select('id, code, name, country_id').eq('is_active', true).order('display_order'),
    ]);

    if (langRes.data) setLanguages(langRes.data);
    if (formatRes.data) setFormats(formatRes.data);
    if (techRes.data) setTechnologies(techRes.data);
    if (ageRes.data) setAgeRatings(ageRes.data);
  }

  function openL1Dialog(l1?: MovieL1) {
    if (l1) {
      setEditingL1(l1);
      setL1Form({
        language_id: l1.language_id,
        title: l1.title,
        plot: l1.plot || '',
        release_date: l1.release_date || '',
        runtime_minutes: l1.runtime_minutes?.toString() || '',
        tagline: l1.tagline || '',
        age_rating_id: l1.age_rating?.id || '',
      });
    } else {
      setEditingL1(null);
      setL1Form({
        language_id: '',
        title: '',
        plot: '',
        release_date: '',
        runtime_minutes: '',
        tagline: '',
        age_rating_id: '',
      });
    }
    setFormError(null);
    setFormSuccess(null);
    setL1DialogOpen(true);
  }

  function openL2Dialog(l2?: MovieL2) {
    if (l2) {
      setEditingL2(l2);
      setL2Form({
        edition_title: l2.edition_title || '',
        format_id: l2.format?.id || '',
        technology_id: l2.technology?.id || '',
        audio_language_id: l2.audio_language?.id || '',
        subtitle_language_id: l2.subtitle_language?.id || '',
        subtitle_language_2_id: l2.subtitle_language_2?.id || '',
        is_original_version: l2.is_original_version,
        is_active: l2.is_active,
        notes: l2.notes || '',
      });
    } else {
      setEditingL2(null);
      setL2Form({
        edition_title: '',
        format_id: '',
        technology_id: '',
        audio_language_id: '',
        subtitle_language_id: '',
        subtitle_language_2_id: '',
        is_original_version: false,
        is_active: true,
        notes: '',
      });
    }
    setFormError(null);
    setFormSuccess(null);
    setL2DialogOpen(true);
  }

  async function handleL1Submit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const payload = {
        movie_l0_id: movieId,
        language_id: l1Form.language_id,
        title: l1Form.title,
        plot: l1Form.plot || null,
        release_date: l1Form.release_date || null,
        runtime_minutes: l1Form.runtime_minutes ? parseInt(l1Form.runtime_minutes) : null,
        tagline: l1Form.tagline || null,
        age_rating_id: l1Form.age_rating_id || null,
      };

      if (editingL1) {
        const { error } = await supabase
          .from('movies_l1')
          .update(payload)
          .eq('id', editingL1.id);
        if (error) throw error;
        setFormSuccess('Localization updated');
      } else {
        const { error } = await supabase.from('movies_l1').insert(payload);
        if (error) throw error;
        setFormSuccess('Localization added');
      }

      await fetchMovie();
      setTimeout(() => {
        setL1DialogOpen(false);
        setFormSuccess(null);
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleL2Submit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const payload = {
        movie_l0_id: movieId,
        edition_title: l2Form.edition_title || null,
        format_id: l2Form.format_id || null,
        technology_id: l2Form.technology_id || null,
        audio_language_id: l2Form.audio_language_id || null,
        subtitle_language_id: l2Form.subtitle_language_id || null,
        subtitle_language_2_id: l2Form.subtitle_language_2_id || null,
        is_original_version: l2Form.is_original_version,
        is_active: l2Form.is_active,
        notes: l2Form.notes || null,
      };

      if (editingL2) {
        const { error } = await supabase
          .from('movies_l2')
          .update(payload)
          .eq('id', editingL2.id);
        if (error) throw error;
        setFormSuccess('Edition updated');
      } else {
        const { error } = await supabase.from('movies_l2').insert(payload);
        if (error) throw error;
        setFormSuccess('Edition added');
      }

      await fetchMovie();
      setTimeout(() => {
        setL2DialogOpen(false);
        setFormSuccess(null);
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem || !deleteType) return;
    setFormLoading(true);

    try {
      const table = deleteType === 'l1' ? 'movies_l1' : 'movies_l2';
      const { error } = await supabase.from(table).delete().eq('id', deleteItem.id);
      if (error) throw error;
      await fetchMovie();
      setDeleteDialogOpen(false);
    } catch (err: any) {
      console.error('Delete failed:', err);
    } finally {
      setFormLoading(false);
    }
  }

  const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning'> = {
    draft: 'secondary',
    pending_review: 'warning',
    verified: 'success',
    archived: 'default',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading movie...</div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Film className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Movie not found</h2>
        <Link href="/movies">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Movies
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-6">
        <Link href="/movies">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="h-32 w-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {movie.poster_url ? (
            <img src={movie.poster_url} alt={movie.original_title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Film className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{movie.original_title}</h1>
            <Badge variant={statusColors[movie.status]}>{movie.status.replace('_', ' ')}</Badge>
            {movie.is_verified && <CheckCircle className="h-5 w-5 text-green-600" />}
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
            {movie.production_year && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {movie.production_year}
              </span>
            )}
            {movie.runtime_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatRuntime(movie.runtime_minutes)}
              </span>
            )}
            {movie.imdb_rating && (
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                {movie.imdb_rating}/10 IMDB
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {movie.genres?.map((g, i) => (
              <Badge key={i} variant="outline">{g.genre?.name}</Badge>
            ))}
          </div>
        </div>

        {canEdit && (
          <Link href={`/movies/${movieId}/edit`}>
            <Button>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Movie
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {[
            { key: 'overview', label: 'Overview', icon: Film },
            { key: 'localizations', label: `Localizations (${localizations.length})`, icon: Languages },
            { key: 'editions', label: `Editions (${editions.length})`, icon: Clapperboard },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as Tab)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Production Year</span>
                  <p className="font-medium">{movie.production_year || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Runtime</span>
                  <p className="font-medium">{movie.runtime_minutes ? formatRuntime(movie.runtime_minutes) : '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">IMDB ID</span>
                  <p className="font-medium">
                    {movie.imdb_id ? (
                      <a href={`https://imdb.com/title/${movie.imdb_id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        {movie.imdb_id} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">TMDB ID</span>
                  <p className="font-medium">
                    {movie.tmdb_id ? (
                      <a href={`https://themoviedb.org/movie/${movie.tmdb_id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        {movie.tmdb_id} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : '-'}
                  </p>
                </div>
              </div>

              {movie.countries && movie.countries.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-sm">Production Countries</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {movie.countries.map((c, i) => (
                      <Badge key={i} variant={c.is_primary ? 'default' : 'outline'}>
                        {c.country?.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {movie.tags && movie.tags.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-sm">Tags</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {movie.tags.map((t, i) => (
                      <Badge key={i} variant="outline" style={{ borderColor: t.tag?.color || undefined }}>
                        {t.tag?.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {movie.notes && (
                <div>
                  <span className="text-muted-foreground text-sm">Notes</span>
                  <p className="text-sm mt-1">{movie.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {movie.backdrop_url && (
                <div>
                  <span className="text-muted-foreground text-sm">Backdrop</span>
                  <img src={movie.backdrop_url} alt="Backdrop" className="w-full h-32 object-cover rounded-lg mt-1" />
                </div>
              )}
              {movie.trailer_url && (
                <div>
                  <span className="text-muted-foreground text-sm">Trailer</span>
                  <a href={movie.trailer_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 mt-1">
                    Watch Trailer <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                <p>Created: {formatDate(movie.created_at)}</p>
                <p>Updated: {formatDate(movie.updated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Localizations Tab (L1) */}
      {activeTab === 'localizations' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Localizations (L1)</CardTitle>
              <CardDescription>Language-specific titles, plots, and release info</CardDescription>
            </div>
            {canEdit && (
              <Button onClick={() => openL1Dialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Localization
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {localizations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Languages className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No localizations yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Language</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Release Date</TableHead>
                    <TableHead>Age Rating</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localizations.map(l1 => (
                    <TableRow key={l1.id}>
                      <TableCell>
                        <Badge variant="outline">{l1.language?.code?.toUpperCase()}</Badge>
                        <span className="ml-2 text-sm">{l1.language?.name}</span>
                      </TableCell>
                      <TableCell className="font-medium">{l1.title}</TableCell>
                      <TableCell>{l1.release_date ? formatDate(l1.release_date) : '-'}</TableCell>
                      <TableCell>
                        {l1.age_rating ? (
                          <Badge variant="secondary">{l1.age_rating.code}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => openL1Dialog(l1)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => {
                                setDeleteType('l1');
                                setDeleteItem(l1);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Editions Tab (L2) */}
      {activeTab === 'editions' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Editions (L2)</CardTitle>
              <CardDescription>Format, audio, and subtitle variants</CardDescription>
            </div>
            {canEdit && (
              <Button onClick={() => openL2Dialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Edition
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clapperboard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No editions yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Edition</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Audio</TableHead>
                    <TableHead>Subtitles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editions.map(l2 => (
                    <TableRow key={l2.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{l2.edition_title || 'Standard'}</span>
                          {l2.is_original_version && (
                            <Badge variant="outline" className="ml-2">OV</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {l2.format && <Badge variant="outline">{l2.format.name}</Badge>}
                          {l2.technology && <Badge variant="secondary">{l2.technology.name}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {l2.audio_language ? (
                          <Badge>{l2.audio_language.code.toUpperCase()}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {l2.subtitle_language && (
                            <Badge variant="outline">{l2.subtitle_language.code.toUpperCase()}</Badge>
                          )}
                          {l2.subtitle_language_2 && (
                            <Badge variant="outline">{l2.subtitle_language_2.code.toUpperCase()}</Badge>
                          )}
                          {!l2.subtitle_language && !l2.subtitle_language_2 && '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={l2.is_active ? 'success' : 'secondary'}>
                          {l2.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => openL2Dialog(l2)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => {
                                setDeleteType('l2');
                                setDeleteItem(l2);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* L1 Dialog */}
      <Dialog open={l1DialogOpen} onOpenChange={setL1DialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingL1 ? 'Edit' : 'Add'} Localization</DialogTitle>
            <DialogDescription>Language-specific movie information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleL1Submit}>
            <div className="space-y-4 py-4">
              {formError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              {formSuccess && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{formSuccess}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="language_id">Language *</Label>
                <Select
                  id="language_id"
                  value={l1Form.language_id}
                  onChange={(e) => setL1Form({ ...l1Form, language_id: e.target.value })}
                  required
                  disabled={!!editingL1}
                >
                  <option value="">Select language</option>
                  {languages.map(lang => (
                    <option key={lang.id} value={lang.id}>{lang.name} ({lang.code})</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Localized Title *</Label>
                <Input
                  id="title"
                  value={l1Form.title}
                  onChange={(e) => setL1Form({ ...l1Form, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plot">Plot / Synopsis</Label>
                <Textarea
                  id="plot"
                  value={l1Form.plot}
                  onChange={(e) => setL1Form({ ...l1Form, plot: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="release_date">Release Date</Label>
                  <Input
                    id="release_date"
                    type="date"
                    value={l1Form.release_date}
                    onChange={(e) => setL1Form({ ...l1Form, release_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="runtime_minutes">Runtime (min)</Label>
                  <Input
                    id="runtime_minutes"
                    type="number"
                    value={l1Form.runtime_minutes}
                    onChange={(e) => setL1Form({ ...l1Form, runtime_minutes: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age_rating_id">Age Rating</Label>
                <Select
                  id="age_rating_id"
                  value={l1Form.age_rating_id}
                  onChange={(e) => setL1Form({ ...l1Form, age_rating_id: e.target.value })}
                >
                  <option value="">Select age rating</option>
                  {ageRatings.map(ar => (
                    <option key={ar.id} value={ar.id}>{ar.code} - {ar.name}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={l1Form.tagline}
                  onChange={(e) => setL1Form({ ...l1Form, tagline: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setL1DialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? 'Saving...' : editingL1 ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* L2 Dialog */}
      <Dialog open={l2DialogOpen} onOpenChange={setL2DialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingL2 ? 'Edit' : 'Add'} Edition</DialogTitle>
            <DialogDescription>Format and language variant</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleL2Submit}>
            <div className="space-y-4 py-4">
              {formError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              {formSuccess && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{formSuccess}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="edition_title">Edition Title</Label>
                <Input
                  id="edition_title"
                  value={l2Form.edition_title}
                  onChange={(e) => setL2Form({ ...l2Form, edition_title: e.target.value })}
                  placeholder="e.g., IMAX 3D Version"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="format_id">Format</Label>
                  <Select
                    id="format_id"
                    value={l2Form.format_id}
                    onChange={(e) => setL2Form({ ...l2Form, format_id: e.target.value })}
                  >
                    <option value="">Select format</option>
                    {formats.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technology_id">Technology</Label>
                  <Select
                    id="technology_id"
                    value={l2Form.technology_id}
                    onChange={(e) => setL2Form({ ...l2Form, technology_id: e.target.value })}
                  >
                    <option value="">Select technology</option>
                    {technologies.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="audio_language_id">Audio Language</Label>
                <Select
                  id="audio_language_id"
                  value={l2Form.audio_language_id}
                  onChange={(e) => setL2Form({ ...l2Form, audio_language_id: e.target.value })}
                >
                  <option value="">Select audio language</option>
                  {languages.map(lang => (
                    <option key={lang.id} value={lang.id}>{lang.name} ({lang.code})</option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subtitle_language_id">Subtitle 1</Label>
                  <Select
                    id="subtitle_language_id"
                    value={l2Form.subtitle_language_id}
                    onChange={(e) => setL2Form({ ...l2Form, subtitle_language_id: e.target.value })}
                  >
                    <option value="">None</option>
                    {languages.map(lang => (
                      <option key={lang.id} value={lang.id}>{lang.name} ({lang.code})</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subtitle_language_2_id">Subtitle 2</Label>
                  <Select
                    id="subtitle_language_2_id"
                    value={l2Form.subtitle_language_2_id}
                    onChange={(e) => setL2Form({ ...l2Form, subtitle_language_2_id: e.target.value })}
                  >
                    <option value="">None</option>
                    {languages.map(lang => (
                      <option key={lang.id} value={lang.id}>{lang.name} ({lang.code})</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={l2Form.is_original_version}
                    onChange={(e) => setL2Form({ ...l2Form, is_original_version: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm">Original Version (OV)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={l2Form.is_active}
                    onChange={(e) => setL2Form({ ...l2Form, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="l2_notes">Notes</Label>
                <Input
                  id="l2_notes"
                  value={l2Form.notes}
                  onChange={(e) => setL2Form({ ...l2Form, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setL2DialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? 'Saving...' : editingL2 ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteType === 'l1' ? 'Localization' : 'Edition'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {deleteType === 'l1' ? 'localization' : 'edition'}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={formLoading}>
              {formLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
