'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save } from 'lucide-react';
import { generateSlug } from '@/lib/utils';

export default function NewMoviePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    original_title: '',
    production_year: '',
    runtime_minutes: '',
    poster_url: '',
    backdrop_url: '',
    trailer_url: '',
    imdb_id: '',
    tmdb_id: '',
    notes: '',
    status: 'draft',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const slug = generateSlug(formData.original_title);

      const { data, error: insertError } = await supabase
        .from('movies_l0')
        .insert({
          original_title: formData.original_title,
          slug,
          production_year: formData.production_year ? parseInt(formData.production_year) : null,
          runtime_minutes: formData.runtime_minutes ? parseInt(formData.runtime_minutes) : null,
          poster_url: formData.poster_url || null,
          backdrop_url: formData.backdrop_url || null,
          trailer_url: formData.trailer_url || null,
          imdb_id: formData.imdb_id || null,
          tmdb_id: formData.tmdb_id ? parseInt(formData.tmdb_id) : null,
          notes: formData.notes || null,
          status: formData.status,
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      router.push(`/movies/${data.id}`);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/movies">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Movie</h1>
          <p className="text-muted-foreground">Create a new movie entry (L0 - Core Info)</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core movie details (L0 layer)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="original_title" required>
                  Original Title
                </Label>
                <Input
                  id="original_title"
                  name="original_title"
                  value={formData.original_title}
                  onChange={handleChange}
                  required
                  placeholder="Enter the original movie title"
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
                  placeholder="e.g., 2024"
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
                  placeholder="e.g., 120"
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
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Media</CardTitle>
            <CardDescription>Poster, backdrop, and trailer URLs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="poster_url">Poster URL</Label>
              <Input
                id="poster_url"
                name="poster_url"
                type="url"
                value={formData.poster_url}
                onChange={handleChange}
                placeholder="https://example.com/poster.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backdrop_url">Backdrop URL</Label>
              <Input
                id="backdrop_url"
                name="backdrop_url"
                type="url"
                value={formData.backdrop_url}
                onChange={handleChange}
                placeholder="https://example.com/backdrop.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trailer_url">Trailer URL</Label>
              <Input
                id="trailer_url"
                name="trailer_url"
                type="url"
                value={formData.trailer_url}
                onChange={handleChange}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>External IDs</CardTitle>
            <CardDescription>Links to external movie databases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              placeholder="Any internal notes about this movie..."
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/movies">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={loading}>
            <Save className="mr-2 h-4 w-4" />
            Create Movie
          </Button>
        </div>
      </form>
    </div>
  );
}
