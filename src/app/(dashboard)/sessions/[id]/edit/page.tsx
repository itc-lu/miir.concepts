'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft, Save, CheckCircle, AlertCircle, Film, Building2, Search,
} from 'lucide-react';

interface Cinema {
  id: string;
  name: string;
  city: string | null;
}

interface Movie {
  id: string;
  original_title: string;
  production_year: number | null;
  poster_url: string | null;
}

interface MovieEdition {
  id: string;
  edition_title: string | null;
  format: { name: string } | null;
  audio_language: { code: string } | null;
  subtitle_language: { code: string } | null;
}

interface SessionTag {
  id: string;
  name: string;
  color: string | null;
}

export default function EditSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    cinema_id: '',
    movie_l2_id: '',
    show_date: '',
    show_time: '',
    end_time: '',
    screen_name: '',
    price: '',
    currency: 'EUR',
    booking_url: '',
    notes: '',
    is_cancelled: false,
  });

  // Reference data
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [editions, setEditions] = useState<MovieEdition[]>([]);
  const [tags, setTags] = useState<SessionTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Current selection
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [movieSearch, setMovieSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, [sessionId]);

  async function fetchData() {
    setLoading(true);

    // Fetch reference data
    const [cinemaRes, tagRes] = await Promise.all([
      supabase.from('cinemas').select('id, name, city').eq('is_active', true).order('name'),
      supabase.from('session_tags').select('id, name, color').eq('is_active', true).order('name'),
    ]);

    if (cinemaRes.data) setCinemas(cinemaRes.data);
    if (tagRes.data) setTags(tagRes.data);

    // Fetch session
    const { data: session } = await supabase
      .from('sessions')
      .select(`
        *,
        movie_l2:movies_l2(
          id, edition_title,
          movie_l0:movies_l0(id, original_title, production_year, poster_url)
        )
      `)
      .eq('id', sessionId)
      .single();

    if (session) {
      setFormData({
        cinema_id: session.cinema_id,
        movie_l2_id: session.movie_l2_id,
        show_date: session.show_date,
        show_time: session.show_time,
        end_time: session.end_time || '',
        screen_name: session.screen_name || '',
        price: session.price?.toString() || '',
        currency: session.currency || 'EUR',
        booking_url: session.booking_url || '',
        notes: session.notes || '',
        is_cancelled: session.is_cancelled,
      });

      if (session.movie_l2?.movie_l0) {
        const movie = session.movie_l2.movie_l0 as Movie;
        setSelectedMovie(movie);
        setMovieSearch(movie.original_title);

        // Fetch editions for this movie
        const { data: editionsData } = await supabase
          .from('movies_l2')
          .select(`
            id, edition_title,
            format:formats(name),
            audio_language:languages!movies_l2_audio_language_id_fkey(code),
            subtitle_language:languages!movies_l2_subtitle_language_id_fkey(code)
          `)
          .eq('movie_l0_id', movie.id)
          .eq('is_active', true);

        if (editionsData) {
          setEditions(editionsData as unknown as MovieEdition[]);
        }
      }
    }

    // Fetch session tags
    const { data: sessionTagsData } = await supabase
      .from('session_session_tags')
      .select('tag_id')
      .eq('session_id', sessionId);

    if (sessionTagsData) {
      setSelectedTags(sessionTagsData.map(t => t.tag_id));
    }

    setLoading(false);
  }

  // Search movies
  useEffect(() => {
    async function searchMovies() {
      if (movieSearch.length < 2) {
        setMovies([]);
        return;
      }

      const { data } = await supabase
        .from('movies_l0')
        .select('id, original_title, production_year, poster_url')
        .ilike('original_title', `%${movieSearch}%`)
        .order('original_title')
        .limit(10);

      setMovies(data || []);
    }

    const timeout = setTimeout(searchMovies, 300);
    return () => clearTimeout(timeout);
  }, [movieSearch]);

  // Fetch editions when movie is selected
  useEffect(() => {
    async function fetchEditions() {
      if (!selectedMovie) {
        setEditions([]);
        return;
      }

      const { data } = await supabase
        .from('movies_l2')
        .select(`
          id, edition_title,
          format:formats(name),
          audio_language:languages!movies_l2_audio_language_id_fkey(code),
          subtitle_language:languages!movies_l2_subtitle_language_id_fkey(code)
        `)
        .eq('movie_l0_id', selectedMovie.id)
        .eq('is_active', true);

      if (data) {
        setEditions(data as unknown as MovieEdition[]);
      }
    }

    fetchEditions();
  }, [selectedMovie]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }

  function selectMovie(movie: Movie) {
    setSelectedMovie(movie);
    setMovieSearch(movie.original_title);
    setMovies([]);
    setFormData(prev => ({ ...prev, movie_l2_id: '' })); // Reset edition
  }

  function toggleTag(tagId: string) {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Update session
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          cinema_id: formData.cinema_id,
          movie_l2_id: formData.movie_l2_id,
          show_date: formData.show_date,
          show_time: formData.show_time,
          end_time: formData.end_time || null,
          screen_name: formData.screen_name || null,
          price: formData.price ? parseFloat(formData.price) : null,
          currency: formData.currency,
          booking_url: formData.booking_url || null,
          notes: formData.notes || null,
          is_cancelled: formData.is_cancelled,
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Update tags
      await supabase.from('session_session_tags').delete().eq('session_id', sessionId);
      if (selectedTags.length > 0) {
        await supabase.from('session_session_tags').insert(
          selectedTags.map(tagId => ({
            session_id: sessionId,
            tag_id: tagId,
          }))
        );
      }

      setSuccess('Session updated successfully');
      setTimeout(() => {
        router.push(`/sessions/${sessionId}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update session');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/sessions/${sessionId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Session</h1>
          <p className="text-muted-foreground">Update session details</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cinema Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Cinema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="cinema_id">Cinema *</Label>
              <Select
                id="cinema_id"
                name="cinema_id"
                value={formData.cinema_id}
                onChange={handleChange}
                required
              >
                <option value="">Select cinema</option>
                {cinemas.map(cinema => (
                  <option key={cinema.id} value={cinema.id}>
                    {cinema.name}{cinema.city && ` (${cinema.city})`}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Movie & Edition Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Movie & Edition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Movie Search */}
            <div className="space-y-2">
              <Label>Movie *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search movies..."
                  value={movieSearch}
                  onChange={e => setMovieSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Selected Movie */}
              {selectedMovie && (
                <div className="flex items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3 mt-2">
                  <div className="h-12 w-8 rounded bg-muted overflow-hidden">
                    {selectedMovie.poster_url ? (
                      <img
                        src={selectedMovie.poster_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Film className="h-full w-full p-1.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{selectedMovie.original_title}</p>
                    {selectedMovie.production_year && (
                      <p className="text-sm text-muted-foreground">{selectedMovie.production_year}</p>
                    )}
                  </div>
                  <Badge variant="success">Selected</Badge>
                </div>
              )}

              {/* Search Results */}
              {movies.length > 0 && (
                <div className="space-y-2 mt-2">
                  {movies
                    .filter(m => m.id !== selectedMovie?.id)
                    .map(movie => (
                      <button
                        key={movie.id}
                        type="button"
                        onClick={() => selectMovie(movie)}
                        className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                      >
                        <div className="h-10 w-7 rounded bg-muted overflow-hidden">
                          {movie.poster_url ? (
                            <img
                              src={movie.poster_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Film className="h-full w-full p-1 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{movie.original_title}</p>
                          {movie.production_year && (
                            <p className="text-sm text-muted-foreground">{movie.production_year}</p>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Edition Selection */}
            {selectedMovie && (
              <div className="space-y-2">
                <Label htmlFor="movie_l2_id">Edition *</Label>
                <Select
                  id="movie_l2_id"
                  name="movie_l2_id"
                  value={formData.movie_l2_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select edition</option>
                  {editions.map(edition => (
                    <option key={edition.id} value={edition.id}>
                      {edition.edition_title || 'Standard'}
                      {edition.format && ` - ${edition.format.name}`}
                      {edition.audio_language && ` (${edition.audio_language.code.toUpperCase()})`}
                    </option>
                  ))}
                </Select>
                {editions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No editions found. Please create an edition for this movie first.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="show_date">Date *</Label>
                <Input
                  id="show_date"
                  name="show_date"
                  type="date"
                  value={formData.show_date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="show_time">Start Time *</Label>
                <Input
                  id="show_time"
                  name="show_time"
                  type="time"
                  value={formData.show_time}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="screen_name">Screen/Auditorium</Label>
                <Input
                  id="screen_name"
                  name="screen_name"
                  value={formData.screen_name}
                  onChange={handleChange}
                  placeholder="e.g., Screen 1, Salle 3, IMAX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <div className="flex gap-2">
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={handleChange}
                    className="flex-1"
                  />
                  <Select
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-24"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="CHF">CHF</option>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking_url">Booking URL</Label>
              <Input
                id="booking_url"
                name="booking_url"
                type="url"
                value={formData.booking_url}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>Mark special session types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedTags.includes(tag.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-accent'
                  }`}
                  style={{
                    borderColor: !selectedTags.includes(tag.id) && tag.color ? tag.color : undefined,
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes & Status */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Any additional notes..."
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_cancelled"
                  checked={formData.is_cancelled}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm">Cancelled</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/sessions/${sessionId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
