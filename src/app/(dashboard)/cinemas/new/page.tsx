'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { generateSlug } from '@/lib/utils';

interface CinemaGroup {
  id: string;
  name: string;
}

interface Country {
  id: string;
  code: string;
  name: string;
}

interface CinemaTag {
  id: string;
  name: string;
  color: string | null;
}

export default function NewCinemaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    cinema_group_id: '',
    country_id: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
    latitude: '',
    longitude: '',
    screen_count: '1',
    is_active: true,
    parser_type: '',
  });

  // Reference data
  const [cinemaGroups, setCinemaGroups] = useState<CinemaGroup[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cinemaTags, setCinemaTags] = useState<CinemaTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    fetchReferenceData();
  }, []);

  async function fetchReferenceData() {
    const [groupRes, countryRes, tagRes] = await Promise.all([
      supabase.from('cinema_groups').select('id, name').eq('is_active', true).order('name'),
      supabase.from('countries').select('id, code, name').order('name'),
      supabase.from('cinema_tags').select('id, name, color').eq('is_active', true).order('name'),
    ]);

    if (groupRes.data) setCinemaGroups(groupRes.data);
    if (countryRes.data) setCountries(countryRes.data);
    if (tagRes.data) setCinemaTags(tagRes.data);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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
      const slug = generateSlug(formData.name);

      // Create cinema
      const { data: cinema, error: insertError } = await supabase
        .from('cinemas')
        .insert({
          name: formData.name,
          slug,
          cinema_group_id: formData.cinema_group_id || null,
          country_id: formData.country_id || null,
          address_line1: formData.address_line1 || null,
          address_line2: formData.address_line2 || null,
          city: formData.city || null,
          postal_code: formData.postal_code || null,
          phone: formData.phone || null,
          email: formData.email || null,
          website: formData.website || null,
          logo_url: formData.logo_url || null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          screen_count: parseInt(formData.screen_count) || 1,
          is_active: formData.is_active,
          parser_type: formData.parser_type || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Add tags
      if (selectedTags.length > 0) {
        await supabase.from('cinema_cinema_tags').insert(
          selectedTags.map(tagId => ({
            cinema_id: cinema.id,
            tag_id: tagId,
          }))
        );
      }

      setSuccess('Cinema created successfully');
      setTimeout(() => {
        router.push(`/cinemas/${cinema.id}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to create cinema');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cinemas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add New Cinema</h1>
          <p className="text-muted-foreground">Create a new cinema location</p>
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
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Kinepolis Kirchberg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cinema_group_id">Cinema Group</Label>
                <Select
                  id="cinema_group_id"
                  name="cinema_group_id"
                  value={formData.cinema_group_id}
                  onChange={handleChange}
                >
                  <option value="">No group</option>
                  {cinemaGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="screen_count">Screen Count</Label>
              <Input
                id="screen_count"
                name="screen_count"
                type="number"
                min="1"
                value={formData.screen_count}
                onChange={handleChange}
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="country_id">Country</Label>
              <Select
                id="country_id"
                name="country_id"
                value={formData.country_id}
                onChange={handleChange}
              >
                <option value="">Select country</option>
                {countries.map(country => (
                  <option key={country.id} value={country.id}>{country.name}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input
                id="address_line1"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
                placeholder="Street address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={handleChange}
                  placeholder="e.g., 49.6117"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={handleChange}
                  placeholder="e.g., 6.1319"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="text"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                type="url"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                name="logo_url"
                type="url"
                value={formData.logo_url}
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
            <CardDescription>Select applicable tags</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {cinemaTags.map(tag => (
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

        {/* Parser Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Import Settings</CardTitle>
            <CardDescription>Parser configuration for automated imports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="parser_type">Parser Type</Label>
              <Select
                id="parser_type"
                name="parser_type"
                value={formData.parser_type}
                onChange={handleChange}
              >
                <option value="">None (manual only)</option>
                <option value="kinepolis">Kinepolis</option>
                <option value="utopia">Utopia</option>
                <option value="generic_xml">Generic XML</option>
                <option value="generic_json">Generic JSON</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/cinemas">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Creating...' : 'Create Cinema'}
          </Button>
        </div>
      </form>
    </div>
  );
}
