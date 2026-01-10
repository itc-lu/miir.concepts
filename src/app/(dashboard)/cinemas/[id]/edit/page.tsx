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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Save, Trash2, CheckCircle, AlertCircle, Building2,
} from 'lucide-react';
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

export default function EditCinemaPage() {
  const params = useParams();
  const router = useRouter();
  const cinemaId = params.id as string;
  const supabase = createClient();
  const { hasPermission } = useUser();

  const canDelete = hasPermission('cinemas:delete');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
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
    timezone: 'Europe/Luxembourg',
    week_start_day_override: '',
    missing_info: '',
  });

  const timezones = [
    'Europe/Luxembourg',
    'Europe/Brussels',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Amsterdam',
    'Europe/London',
    'Europe/Zurich',
    'Europe/Vienna',
  ];

  const weekDays = [
    { value: '', label: 'Inherit from country' },
    { value: '0', label: 'Sunday' },
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
  ];

  // Reference data
  const [cinemaGroups, setCinemaGroups] = useState<CinemaGroup[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cinemaTags, setCinemaTags] = useState<CinemaTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [cinemaId]);

  async function fetchData() {
    setLoading(true);

    // Fetch reference data
    const [groupRes, countryRes, tagRes] = await Promise.all([
      supabase.from('cinema_groups').select('id, name').eq('is_active', true).order('name'),
      supabase.from('countries').select('id, code, name').order('name'),
      supabase.from('cinema_tags').select('id, name, color').eq('is_active', true).order('name'),
    ]);

    if (groupRes.data) setCinemaGroups(groupRes.data);
    if (countryRes.data) setCountries(countryRes.data);
    if (tagRes.data) setCinemaTags(tagRes.data);

    // Fetch cinema
    const { data: cinema } = await supabase
      .from('cinemas')
      .select('*')
      .eq('id', cinemaId)
      .single();

    if (cinema) {
      setFormData({
        name: cinema.name,
        slug: cinema.slug,
        cinema_group_id: cinema.cinema_group_id || '',
        country_id: cinema.country_id || '',
        address_line1: cinema.address_line1 || '',
        address_line2: cinema.address_line2 || '',
        city: cinema.city || '',
        postal_code: cinema.postal_code || '',
        phone: cinema.phone || '',
        email: cinema.email || '',
        website: cinema.website || '',
        logo_url: cinema.logo_url || '',
        latitude: cinema.latitude?.toString() || '',
        longitude: cinema.longitude?.toString() || '',
        screen_count: cinema.screen_count?.toString() || '1',
        is_active: cinema.is_active,
        parser_type: cinema.parser_type || '',
        timezone: cinema.timezone || 'Europe/Luxembourg',
        week_start_day_override: cinema.week_start_day_override?.toString() || '',
        missing_info: cinema.missing_info || '',
      });
    }

    // Fetch cinema tags
    const { data: cinemaTagsData } = await supabase
      .from('cinema_cinema_tags')
      .select('tag_id')
      .eq('cinema_id', cinemaId);

    if (cinemaTagsData) {
      setSelectedTags(cinemaTagsData.map(t => t.tag_id));
    }

    setLoading(false);
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
      // Update cinema
      const { error: updateError } = await supabase
        .from('cinemas')
        .update({
          name: formData.name,
          slug: formData.slug,
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
          timezone: formData.timezone || 'Europe/Luxembourg',
          week_start_day_override: formData.week_start_day_override ? parseInt(formData.week_start_day_override) : null,
          missing_info: formData.missing_info || null,
        })
        .eq('id', cinemaId);

      if (updateError) throw updateError;

      // Update tags
      await supabase.from('cinema_cinema_tags').delete().eq('cinema_id', cinemaId);
      if (selectedTags.length > 0) {
        await supabase.from('cinema_cinema_tags').insert(
          selectedTags.map(tagId => ({
            cinema_id: cinemaId,
            tag_id: tagId,
          }))
        );
      }

      setSuccess('Cinema updated successfully');
      setTimeout(() => {
        router.push(`/cinemas/${cinemaId}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update cinema');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      const { error } = await supabase.from('cinemas').delete().eq('id', cinemaId);
      if (error) throw error;
      router.push('/cinemas');
    } catch (err: any) {
      setError(err.message || 'Failed to delete cinema');
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
          <Link href={`/cinemas/${cinemaId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Cinema</h1>
            <p className="text-muted-foreground">Update cinema information</p>
          </div>
        </div>
        {canDelete && (
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Cinema
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  id="timezone"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                >
                  {timezones.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="week_start_day_override">Week Start Day Override</Label>
                <Select
                  id="week_start_day_override"
                  name="week_start_day_override"
                  value={formData.week_start_day_override}
                  onChange={handleChange}
                >
                  {weekDays.map(day => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">Leave empty to use country default</p>
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
              {formData.logo_url && (
                <img
                  src={formData.logo_url}
                  alt="Logo preview"
                  className="h-16 w-auto rounded"
                />
              )}
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
          <CardContent className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="missing_info">Missing Info / Notes</Label>
              <textarea
                id="missing_info"
                name="missing_info"
                value={formData.missing_info}
                onChange={(e) => setFormData(prev => ({ ...prev, missing_info: e.target.value }))}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Notes about missing data or special configurations..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/cinemas/${cinemaId}`}>
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
            <DialogTitle>Delete Cinema</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{formData.name}"? This will also delete all associated sessions. This action cannot be undone.
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
