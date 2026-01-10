'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft, Save, Film, CheckCircle, AlertCircle, Trash2, X,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface Genre {
  id: string;
  code: string;
  name: string;
}

interface Country {
  id: string;
  code: string;
  name: string;
}

interface MovieTag {
  id: string;
  name: string;
  color: string | null;
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
  status: string;
  is_verified: boolean;
  notes: string | null;
}

export default function EditMoviePage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;
  const supabase = createClient();
  const { hasPermission } = useUser();

  const canDelete = hasPermission('movies:delete');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    original_title: '',
    production_year: '',
    runtime_minutes: '',
    poster_url: '',
    backdrop_url: '',
    trailer_url: '',
    imdb_id: '',
    tmdb_id: '',
    status: 'draft',
    notes: '',
  });

  // Reference data
  const [genres, setGenres] = useState<Genre[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [movieTags, setMovieTags] = useState<MovieTag[]>([]);

  // Selected items
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [primaryCountry, setPrimaryCountry] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [movieId]);

  async function fetchData() {
    setLoading(true);

    // Fetch reference data
    const [genreRes, countryRes, tagRes] = await Promise.all([
      supabase.from('genres').select('id, code, name').eq('is_active', true).order('display_order'),
      supabase.from('countries').select('id, code, name').order('name'),
      supabase.from('movie_tags').select('id, name, color').eq('is_active', true).order('name'),
    ]);

    if (genreRes.data) setGenres(genreRes.data);
    if (countryRes.data) setCountries(countryRes.data);
    if (tagRes.data) setMovieTags(tagRes.data);

    // Fetch movie
    const { data: movie } = await supabase
      .from('movies_l0')
      .select('*')
      .eq('id', movieId)
      .single();

    if (movie) {
      setFormData({
        original_title: movie.original_title,
        production_year: movie.production_year?.toString() || '',
        runtime_minutes: movie.runtime_minutes?.toString() || '',
        poster_url: movie.poster_url || '',
        backdrop_url: movie.backdrop_url || '',
        trailer_url: movie.trailer_url || '',
        imdb_id: movie.imdb_id || '',
        tmdb_id: movie.tmdb_id?.toString() || '',
        status: movie.status,
        notes: movie.notes || '',
      });
    }

    // Fetch movie genres
    const { data: movieGenres } = await supabase
      .from('movie_l0_genres')
      .select('genre_id')
      .eq('movie_id', movieId);

    if (movieGenres) {
      setSelectedGenres(movieGenres.map(g => g.genre_id));
    }

    // Fetch movie countries
    const { data: movieCountries } = await supabase
      .from('movie_l0_countries')
      .select('country_id, is_primary')
      .eq('movie_id', movieId);

    if (movieCountries) {
      setSelectedCountries(movieCountries.map(c => c.country_id));
      const primary = movieCountries.find(c => c.is_primary);
      if (primary) setPrimaryCountry(primary.country_id);
    }

    // Fetch movie tags
    const { data: movieTagsData } = await supabase
      .from('movie_l0_tags')
      .select('tag_id')
      .eq('movie_id', movieId);

    if (movieTagsData) {
      setSelectedTags(movieTagsData.map(t => t.tag_id));
    }

    setLoading(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function toggleGenre(genreId: string) {
    setSelectedGenres(prev =>
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  }

  function toggleCountry(countryId: string) {
    setSelectedCountries(prev => {
      if (prev.includes(countryId)) {
        if (primaryCountry === countryId) setPrimaryCountry(null);
        return prev.filter(id => id !== countryId);
      }
      return [...prev, countryId];
    });
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
      // Update movie
      const { error: updateError } = await supabase
        .from('movies_l0')
        .update({
          original_title: formData.original_title,
          production_year: formData.production_year ? parseInt(formData.production_year) : null,
          runtime_minutes: formData.runtime_minutes ? parseInt(formData.runtime_minutes) : null,
          poster_url: formData.poster_url || null,
          backdrop_url: formData.backdrop_url || null,
          trailer_url: formData.trailer_url || null,
          imdb_id: formData.imdb_id || null,
          tmdb_id: formData.tmdb_id ? parseInt(formData.tmdb_id) : null,
          status: formData.status,
          notes: formData.notes || null,
        })
        .eq('id', movieId);

      if (updateError) throw updateError;

      // Update genres
      await supabase.from('movie_l0_genres').delete().eq('movie_id', movieId);
      if (selectedGenres.length > 0) {
        await supabase.from('movie_l0_genres').insert(
          selectedGenres.map((genreId, index) => ({
            movie_id: movieId,
            genre_id: genreId,
            display_order: index,
          }))
        );
      }

      // Update countries
      await supabase.from('movie_l0_countries').delete().eq('movie_id', movieId);
      if (selectedCountries.length > 0) {
        await supabase.from('movie_l0_countries').insert(
          selectedCountries.map(countryId => ({
            movie_id: movieId,
            country_id: countryId,
            is_primary: countryId === primaryCountry,
          }))
        );
      }

      // Update tags
      await supabase.from('movie_l0_tags').delete().eq('movie_id', movieId);
      if (selectedTags.length > 0) {
        await supabase.from('movie_l0_tags').insert(
          selectedTags.map(tagId => ({
            movie_id: movieId,
            tag_id: tagId,
          }))
        );
      }

      setSuccess('Movie updated successfully');
      setTimeout(() => {
        router.push(`/movies/${movieId}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update movie');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      const { error } = await supabase.from('movies_l0').delete().eq('id', movieId);
      if (error) throw error;
      router.push('/movies');
    } catch (err: any) {
      setError(err.message || 'Failed to delete movie');
    } finally {
      setSaving(false);
      setDeleteDialogOpen(false);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/movies/${movieId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Movie</h1>
            <p className="text-muted-foreground">Update L0 core information</p>
          </div>
        </div>
        {canDelete && (
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Movie
          </Button>
        )}
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
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core movie details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="original_title">Original Title *</Label>
                <Input
                  id="original_title"
                  name="original_title"
                  value={formData.original_title}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="production_year">Production Year</Label>
                <Input
                  id="production_year"
                  name="production_year"
                  type="number"
                  min="1888"
                  max="2100"
                  value={formData.production_year}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="runtime_minutes">Runtime (minutes)</Label>
                <Input
                  id="runtime_minutes"
                  name="runtime_minutes"
                  type="number"
                  min="1"
                  value={formData.runtime_minutes}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="draft">Draft</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="verified">Verified</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Genres */}
        <Card>
          <CardHeader>
            <CardTitle>Genres</CardTitle>
            <CardDescription>Select applicable genres</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {genres.map(genre => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => toggleGenre(genre.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedGenres.includes(genre.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-accent'
                  }`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Production Countries */}
        <Card>
          <CardHeader>
            <CardTitle>Production Countries</CardTitle>
            <CardDescription>Select countries and mark primary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {countries.map(country => (
                <button
                  key={country.id}
                  type="button"
                  onClick={() => toggleCountry(country.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedCountries.includes(country.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-accent'
                  }`}
                >
                  {country.code} - {country.name}
                </button>
              ))}
            </div>

            {selectedCountries.length > 0 && (
              <div className="pt-4 border-t">
                <Label className="mb-2 block">Primary Country</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedCountries.map(countryId => {
                    const country = countries.find(c => c.id === countryId);
                    return (
                      <button
                        key={countryId}
                        type="button"
                        onClick={() => setPrimaryCountry(countryId)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          primaryCountry === countryId
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'hover:bg-accent'
                        }`}
                      >
                        {country?.name}
                        {primaryCountry === countryId && ' (Primary)'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>Production companies, directors, etc.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {movieTags.map(tag => (
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

        {/* Media */}
        <Card>
          <CardHeader>
            <CardTitle>Media</CardTitle>
            <CardDescription>Poster, backdrop, and trailer URLs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="poster_url">Poster URL</Label>
                <Input
                  id="poster_url"
                  name="poster_url"
                  type="url"
                  value={formData.poster_url}
                  onChange={handleChange}
                  placeholder="https://..."
                />
                {formData.poster_url && (
                  <img
                    src={formData.poster_url}
                    alt="Poster preview"
                    className="h-32 w-auto rounded-lg object-cover"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="backdrop_url">Backdrop URL</Label>
                <Input
                  id="backdrop_url"
                  name="backdrop_url"
                  type="url"
                  value={formData.backdrop_url}
                  onChange={handleChange}
                  placeholder="https://..."
                />
                {formData.backdrop_url && (
                  <img
                    src={formData.backdrop_url}
                    alt="Backdrop preview"
                    className="h-24 w-full rounded-lg object-cover"
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trailer_url">Trailer URL</Label>
              <Input
                id="trailer_url"
                name="trailer_url"
                type="url"
                value={formData.trailer_url}
                onChange={handleChange}
                placeholder="https://youtube.com/..."
              />
            </div>
          </CardContent>
        </Card>

        {/* External IDs */}
        <Card>
          <CardHeader>
            <CardTitle>External IDs</CardTitle>
            <CardDescription>Links to external databases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="imdb_id">IMDB ID</Label>
                <Input
                  id="imdb_id"
                  name="imdb_id"
                  value={formData.imdb_id}
                  onChange={handleChange}
                  placeholder="tt1234567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tmdb_id">TMDB ID</Label>
                <Input
                  id="tmdb_id"
                  name="tmdb_id"
                  type="number"
                  value={formData.tmdb_id}
                  onChange={handleChange}
                  placeholder="12345"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Internal notes (not visible to public)</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/movies/${movieId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Movie</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{formData.original_title}"? This will also delete all localizations and editions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
