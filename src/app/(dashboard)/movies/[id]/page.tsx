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
  ArrowLeft, Pencil, Film, Calendar, Clock, Star, Globe, Plus, Users,
  Languages, Clapperboard, Tag, CheckCircle, AlertCircle, Trash2, ExternalLink, Mic,
} from 'lucide-react';
import { formatDate, formatRuntime } from '@/lib/utils';

interface Person {
  id: string;
  name: string;
}

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
  directors: Array<{ person: Person }>;
  screenplay: Array<{ person: Person }>;
  music: Array<{ person: Person }>;
  cast: Array<{ person: Person; character_name: string | null; display_order: number }>;
  production_companies: Array<{ company: { id: string; name: string }; country: { code: string } | null }>;
  plots: Array<{ language: { code: string; name: string }; plot: string }>;
  stills: Array<{ id: string; url: string; caption: string | null; display_order: number }>;
}

interface MovieL1 {
  id: string;
  country_id: string;
  country: { id: string; code: string; name: string };
  title: string;
  local_title: string | null;
  release_date: string | null;
  runtime_minutes: number | null;
  age_rating: { id: string; code: string; name: string; country: { code: string } } | null;
  sync_voices: Array<{ person: Person; role_description: string | null }>;
}

interface MovieL2 {
  id: string;
  movie_l1_id: string;
  movie_l1: { title: string; country: { code: string } } | null;
  edition_title: string | null;
  format: { id: string; code: string; name: string } | null;
  technology: { id: string; code: string; name: string } | null;
  audio_language: { id: string; code: string; name: string } | null;
  subtitles: Array<{ language: { id: string; code: string; name: string }; subtitle_type: string }>;
  is_original_version: boolean;
  is_active: boolean;
  notes: string | null;
}

type Tab = 'overview' | 'cast' | 'releases' | 'editions';

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
  const [releases, setReleases] = useState<MovieL1[]>([]);
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
  const [countries, setCountries] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [languages, setLanguages] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [formats, setFormats] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [technologies, setTechnologies] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [ageRatings, setAgeRatings] = useState<Array<{ id: string; code: string; name: string; country_id: string }>>([]);

  // L1 form data (country-based releases)
  const [l1Form, setL1Form] = useState({
    country_id: '',
    title: '',
    local_title: '',
    release_date: '',
    runtime_minutes: '',
    age_rating_id: '',
  });

  // L2 form data (editions linked to L1)
  const [l2Form, setL2Form] = useState({
    movie_l1_id: '',
    edition_title: '',
    format_id: '',
    technology_id: '',
    audio_language_id: '',
    subtitle_language_ids: [] as string[],
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

    // Fetch L0 with all related data
    const { data: l0Data } = await supabase
      .from('movies_l0')
      .select(`
        *,
        genres:movie_l0_genres(genre:genres(id, name)),
        countries:movie_l0_countries(country:countries(id, code, name), is_primary),
        tags:movie_l0_tags(tag:movie_tags(id, name, color)),
        directors:movie_l0_directors(person:persons(id, name)),
        screenplay:movie_l0_screenplay(person:persons(id, name)),
        music:movie_l0_music(person:persons(id, name)),
        cast:movie_l0_cast(person:persons(id, name), character_name, display_order),
        production_companies:movie_l0_production_companies(company:production_companies(id, name), country:countries(code)),
        plots:movie_l0_plots(language:languages(code, name), plot),
        stills:movie_stills(id, url, caption, display_order)
      `)
      .eq('id', movieId)
      .single();

    if (l0Data) {
      setMovie(l0Data as unknown as MovieL0);
    }

    // Fetch L1 (country-based releases) with sync voices
    const { data: l1Data } = await supabase
      .from('movies_l1')
      .select(`
        *,
        country:countries(id, code, name),
        age_rating:age_ratings(id, code, name, country:countries(code)),
        sync_voices:movie_l1_sync_voices(person:persons(id, name), role_description)
      `)
      .eq('movie_l0_id', movieId)
      .order('country_id');

    if (l1Data) {
      setReleases(l1Data as unknown as MovieL1[]);
    }

    // Fetch L2 (editions linked to L1) with multiple subtitles
    const { data: l2Data } = await supabase
      .from('movies_l2')
      .select(`
        *,
        movie_l1:movies_l1(title, country:countries(code)),
        format:formats(id, code, name),
        technology:technologies(id, code, name),
        audio_language:languages!movies_l2_audio_language_id_fkey(id, code, name),
        subtitles:movie_l2_subtitles(language:languages(id, code, name), subtitle_type)
      `)
      .eq('movie_l0_id', movieId);

    if (l2Data) {
      setEditions(l2Data as unknown as MovieL2[]);
    }

    setLoading(false);
  }

  async function fetchReferenceData() {
    const [countryRes, langRes, formatRes, techRes, ageRes] = await Promise.all([
      supabase.from('countries').select('id, code, name').eq('is_active', true).order('name'),
      supabase.from('languages').select('id, code, name').eq('is_active', true).order('display_order'),
      supabase.from('formats').select('id, code, name').eq('is_active', true).order('display_order'),
      supabase.from('technologies').select('id, code, name').eq('is_active', true).order('display_order'),
      supabase.from('age_ratings').select('id, code, name, country_id').eq('is_active', true).order('display_order'),
    ]);

    if (countryRes.data) setCountries(countryRes.data);
    if (langRes.data) setLanguages(langRes.data);
    if (formatRes.data) setFormats(formatRes.data);
    if (techRes.data) setTechnologies(techRes.data);
    if (ageRes.data) setAgeRatings(ageRes.data);
  }

  function openL1Dialog(l1?: MovieL1) {
    if (l1) {
      setEditingL1(l1);
      setL1Form({
        country_id: l1.country_id,
        title: l1.title,
        local_title: l1.local_title || '',
        release_date: l1.release_date || '',
        runtime_minutes: l1.runtime_minutes?.toString() || '',
        age_rating_id: l1.age_rating?.id || '',
      });
    } else {
      setEditingL1(null);
      setL1Form({
        country_id: '',
        title: '',
        local_title: '',
        release_date: '',
        runtime_minutes: '',
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
        movie_l1_id: l2.movie_l1_id,
        edition_title: l2.edition_title || '',
        format_id: l2.format?.id || '',
        technology_id: l2.technology?.id || '',
        audio_language_id: l2.audio_language?.id || '',
        subtitle_language_ids: l2.subtitles?.map(s => s.language.id) || [],
        is_original_version: l2.is_original_version,
        is_active: l2.is_active,
        notes: l2.notes || '',
      });
    } else {
      setEditingL2(null);
      setL2Form({
        movie_l1_id: releases.length > 0 ? releases[0].id : '',
        edition_title: '',
        format_id: '',
        technology_id: '',
        audio_language_id: '',
        subtitle_language_ids: [],
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
        country_id: l1Form.country_id,
        title: l1Form.title,
        local_title: l1Form.local_title || null,
        release_date: l1Form.release_date || null,
        runtime_minutes: l1Form.runtime_minutes ? parseInt(l1Form.runtime_minutes) : null,
        age_rating_id: l1Form.age_rating_id || null,
      };

      if (editingL1) {
        const { error } = await supabase
          .from('movies_l1')
          .update(payload)
          .eq('id', editingL1.id);
        if (error) throw error;
        setFormSuccess('Release updated');
      } else {
        const { error } = await supabase.from('movies_l1').insert(payload);
        if (error) throw error;
        setFormSuccess('Release added');
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
        movie_l1_id: l2Form.movie_l1_id || null,
        edition_title: l2Form.edition_title || null,
        format_id: l2Form.format_id || null,
        technology_id: l2Form.technology_id || null,
        audio_language_id: l2Form.audio_language_id || null,
        is_original_version: l2Form.is_original_version,
        is_active: l2Form.is_active,
        notes: l2Form.notes || null,
      };

      let editionId: string;

      if (editingL2) {
        const { error } = await supabase
          .from('movies_l2')
          .update(payload)
          .eq('id', editingL2.id);
        if (error) throw error;
        editionId = editingL2.id;

        // Update subtitles - delete existing and insert new
        await supabase.from('movie_l2_subtitles').delete().eq('movie_l2_id', editionId);
      } else {
        const { data, error } = await supabase.from('movies_l2').insert(payload).select('id').single();
        if (error) throw error;
        editionId = data.id;
      }

      // Insert new subtitles
      if (l2Form.subtitle_language_ids.length > 0) {
        const subtitleRecords = l2Form.subtitle_language_ids.map((langId, idx) => ({
          movie_l2_id: editionId,
          language_id: langId,
          display_order: idx + 1,
        }));
        await supabase.from('movie_l2_subtitles').insert(subtitleRecords);
      }

      setFormSuccess(editingL2 ? 'Edition updated' : 'Edition added');
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
            { key: 'cast', label: 'Cast & Crew', icon: Users },
            { key: 'releases', label: `Releases (${releases.length})`, icon: Globe },
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

              {movie.production_companies && movie.production_companies.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-sm">Production Companies</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {movie.production_companies.map((pc, i) => (
                      <Badge key={i} variant="outline">
                        {pc.company?.name} {pc.country?.code && `(${pc.country.code})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

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

          <div className="space-y-6">
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
                {movie.stills && movie.stills.length > 0 && (
                  <div>
                    <span className="text-muted-foreground text-sm">Stills ({movie.stills.length})</span>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {movie.stills.slice(0, 6).map((still, i) => (
                        <img key={i} src={still.url} alt={still.caption || ''} className="w-full h-16 object-cover rounded" />
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  <p>Created: {formatDate(movie.created_at)}</p>
                  <p>Updated: {formatDate(movie.updated_at)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Plots */}
            {movie.plots && movie.plots.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Plots</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {movie.plots.map((p, i) => (
                    <div key={i}>
                      <Badge variant="outline" className="mb-1">{p.language?.name || p.language?.code}</Badge>
                      <p className="text-sm text-muted-foreground line-clamp-3">{p.plot}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Cast & Crew Tab */}
      {activeTab === 'cast' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Directors</CardTitle>
            </CardHeader>
            <CardContent>
              {movie.directors && movie.directors.length > 0 ? (
                <div className="space-y-2">
                  {movie.directors.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{d.person?.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No directors listed</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Screenplay</CardTitle>
            </CardHeader>
            <CardContent>
              {movie.screenplay && movie.screenplay.length > 0 ? (
                <div className="space-y-2">
                  {movie.screenplay.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{s.person?.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No screenplay writers listed</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Music</CardTitle>
            </CardHeader>
            <CardContent>
              {movie.music && movie.music.length > 0 ? (
                <div className="space-y-2">
                  {movie.music.map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{m.person?.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No composers listed</p>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Cast</CardTitle>
            </CardHeader>
            <CardContent>
              {movie.cast && movie.cast.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Actor</TableHead>
                      <TableHead>Character</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movie.cast
                      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                      .map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{c.person?.name}</TableCell>
                          <TableCell className="text-muted-foreground">{c.character_name || '-'}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-sm">No cast members listed</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Releases Tab (L1 - Country-based) */}
      {activeTab === 'releases' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Country Releases (L1)</CardTitle>
              <CardDescription>Country-specific release info, age ratings, and sync voices</CardDescription>
            </div>
            {canEdit && (
              <Button onClick={() => openL1Dialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Release
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {releases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No country releases yet
              </div>
            ) : (
              <div className="space-y-4">
                {releases.map(l1 => (
                  <Card key={l1.id} className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="default" className="text-lg px-3 py-1">
                            {l1.country?.code}
                          </Badge>
                          <div>
                            <h3 className="font-semibold">{l1.title}</h3>
                            {l1.local_title && l1.local_title !== l1.title && (
                              <p className="text-sm text-muted-foreground">{l1.local_title}</p>
                            )}
                          </div>
                        </div>
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
                      </div>
                      <div className="flex flex-wrap gap-4 mt-3 text-sm">
                        {l1.release_date && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(l1.release_date)}
                          </span>
                        )}
                        {l1.runtime_minutes && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {formatRuntime(l1.runtime_minutes)}
                          </span>
                        )}
                        {l1.age_rating && (
                          <Badge variant="secondary">{l1.age_rating.code}</Badge>
                        )}
                      </div>
                      {l1.sync_voices && l1.sync_voices.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <span className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                            <Mic className="h-4 w-4" /> Sync Voices
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {l1.sync_voices.map((sv, i) => (
                              <Badge key={i} variant="outline">
                                {sv.person?.name} {sv.role_description && `(${sv.role_description})`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Editions Tab (L2 - Linked to L1) */}
      {activeTab === 'editions' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Editions (L2)</CardTitle>
              <CardDescription>Format, audio, and subtitle variants linked to country releases</CardDescription>
            </div>
            {canEdit && releases.length > 0 && (
              <Button onClick={() => openL2Dialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Edition
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {releases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Add a country release first before adding editions
              </div>
            ) : editions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clapperboard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No editions yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Release</TableHead>
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
                        <Badge variant="outline">
                          {l2.movie_l1?.country?.code || '?'}
                        </Badge>
                      </TableCell>
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
                          {l2.subtitles && l2.subtitles.length > 0 ? (
                            l2.subtitles.map((s, i) => (
                              <Badge key={i} variant="outline">{s.language.code.toUpperCase()}</Badge>
                            ))
                          ) : '-'}
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

      {/* L1 Dialog (Country Release) */}
      <Dialog open={l1DialogOpen} onOpenChange={setL1DialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingL1 ? 'Edit' : 'Add'} Country Release</DialogTitle>
            <DialogDescription>Country-specific release information</DialogDescription>
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
                <Label htmlFor="country_id">Country *</Label>
                <Select
                  id="country_id"
                  value={l1Form.country_id}
                  onChange={(e) => setL1Form({ ...l1Form, country_id: e.target.value })}
                  required
                  disabled={!!editingL1}
                >
                  <option value="">Select country</option>
                  {countries
                    .filter(c => ['LU', 'DE', 'FR', 'BE'].includes(c.code))
                    .map(country => (
                      <option key={country.id} value={country.id}>{country.name} ({country.code})</option>
                    ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={l1Form.title}
                  onChange={(e) => setL1Form({ ...l1Form, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="local_title">Local Title</Label>
                <Input
                  id="local_title"
                  value={l1Form.local_title}
                  onChange={(e) => setL1Form({ ...l1Form, local_title: e.target.value })}
                  placeholder="Title in local language"
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

      {/* L2 Dialog (Edition linked to L1) */}
      <Dialog open={l2DialogOpen} onOpenChange={setL2DialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingL2 ? 'Edit' : 'Add'} Edition</DialogTitle>
            <DialogDescription>Format and language variant linked to a country release</DialogDescription>
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
                <Label htmlFor="movie_l1_id">Country Release *</Label>
                <Select
                  id="movie_l1_id"
                  value={l2Form.movie_l1_id}
                  onChange={(e) => setL2Form({ ...l2Form, movie_l1_id: e.target.value })}
                  required
                >
                  <option value="">Select release</option>
                  {releases.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.country?.code} - {r.title}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edition_title">Edition Title</Label>
                <Input
                  id="edition_title"
                  value={l2Form.edition_title}
                  onChange={(e) => setL2Form({ ...l2Form, edition_title: e.target.value })}
                  placeholder="e.g., IMAX 3D Version, Director's Cut"
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

              <div className="space-y-2">
                <Label>Subtitles</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                  {languages.map(lang => (
                    <label key={lang.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={l2Form.subtitle_language_ids.includes(lang.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setL2Form({
                              ...l2Form,
                              subtitle_language_ids: [...l2Form.subtitle_language_ids, lang.id]
                            });
                          } else {
                            setL2Form({
                              ...l2Form,
                              subtitle_language_ids: l2Form.subtitle_language_ids.filter(id => id !== lang.id)
                            });
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      {lang.name} ({lang.code})
                    </label>
                  ))}
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
            <DialogTitle>Delete {deleteType === 'l1' ? 'Country Release' : 'Edition'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {deleteType === 'l1' ? 'country release' : 'edition'}?
              {deleteType === 'l1' && ' This will also delete all linked editions.'}
              This action cannot be undone.
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
