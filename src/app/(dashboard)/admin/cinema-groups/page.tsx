'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  Building2,
  AlertCircle,
  CheckCircle,
  Globe,
  ExternalLink,
} from 'lucide-react';
import type { CinemaGroup, Country } from '@/types/database.types';

export default function CinemaGroupsPage() {
  const { hasPermission } = useUser();
  const supabase = createClient();

  const canCreate = hasPermission('cinema_groups:create');
  const canUpdate = hasPermission('cinema_groups:update');
  const canDelete = hasPermission('cinema_groups:delete');

  const [items, setItems] = useState<(CinemaGroup & { country?: Country })[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [parsers, setParsers] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CinemaGroup | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    country_id: '',
    parser_id: '',
    website: '',
    logo_url: '',
    description: '',
    is_active: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch data
  async function fetchData() {
    setLoading(true);
    const [itemsRes, countriesRes, parsersRes] = await Promise.all([
      supabase
        .from('cinema_groups')
        .select('*, country:countries(*)')
        .order('name'),
      supabase.from('countries').select('*').order('name'),
      supabase.from('parsers').select('id, name, slug').eq('is_active', true).order('name'),
    ]);

    if (itemsRes.data) setItems(itemsRes.data);
    if (countriesRes.data) setCountries(countriesRes.data);
    if (parsersRes.data) setParsers(parsersRes.data);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Generate slug from name
  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Filter items
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Create item
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      const { error } = await supabase
        .from('cinema_groups')
        .insert({
          name: formData.name,
          slug: formData.slug || generateSlug(formData.name),
          country_id: formData.country_id || null,
          parser_id: formData.parser_id || null,
          website: formData.website || null,
          logo_url: formData.logo_url || null,
          description: formData.description || null,
          is_active: formData.is_active,
        });

      if (error) throw error;

      setFormSuccess('Cinema group created successfully');
      fetchData();

      setTimeout(() => {
        setCreateDialogOpen(false);
        setFormSuccess(null);
        resetForm();
      }, 1500);
    } catch (error: any) {
      setFormError(error.message || 'Failed to create cinema group');
    } finally {
      setFormLoading(false);
    }
  }

  // Update item
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;

    setFormError(null);
    setFormLoading(true);

    try {
      const { error } = await supabase
        .from('cinema_groups')
        .update({
          name: formData.name,
          slug: formData.slug,
          country_id: formData.country_id || null,
          parser_id: formData.parser_id || null,
          website: formData.website || null,
          logo_url: formData.logo_url || null,
          description: formData.description || null,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      setFormSuccess('Cinema group updated successfully');
      fetchData();

      setTimeout(() => {
        setEditDialogOpen(false);
        setFormSuccess(null);
      }, 1500);
    } catch (error: any) {
      setFormError(error.message || 'Failed to update cinema group');
    } finally {
      setFormLoading(false);
    }
  }

  // Delete item
  async function handleDelete() {
    if (!selectedItem) return;

    setFormLoading(true);
    try {
      const { error } = await supabase
        .from('cinema_groups')
        .delete()
        .eq('id', selectedItem.id);

      if (error) throw error;

      fetchData();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to delete:', error);
    } finally {
      setFormLoading(false);
    }
  }

  // Reset form
  function resetForm() {
    setFormData({
      name: '',
      slug: '',
      country_id: '',
      parser_id: '',
      website: '',
      logo_url: '',
      description: '',
      is_active: true,
    });
  }

  // Open edit dialog
  function openEditDialog(item: CinemaGroup & { parser_id?: string }) {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      slug: item.slug,
      country_id: item.country_id || '',
      parser_id: item.parser_id || '',
      website: item.website || '',
      logo_url: item.logo_url || '',
      description: item.description || '',
      is_active: item.is_active,
    });
    setFormError(null);
    setFormSuccess(null);
    setEditDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cinema Groups</h1>
          <p className="text-sm text-slate-500 mt-1">Manage cinema group chains and organizations</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            resetForm();
            setFormError(null);
            setFormSuccess(null);
            setCreateDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Cinema Group
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search cinema groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-slate-500">Loading...</div>
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <div className="text-slate-500">No cinema groups found</div>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {item.logo_url && (
                        <img
                          src={item.logo_url}
                          alt={item.name}
                          className="h-8 w-8 rounded object-cover"
                        />
                      )}
                      <div className="font-medium text-slate-900">{item.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">{item.slug}</TableCell>
                  <TableCell>
                    {item.country ? (
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Globe className="h-3 w-3 text-slate-400" />
                        {item.country.name}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.website ? (
                      <a
                        href={item.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Visit
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(canUpdate || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {canUpdate && (
                            <DropdownMenuItem onClick={() => openEditDialog(item)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedItem(item);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Cinema Group</DialogTitle>
            <DialogDescription>
              Create a new cinema group or chain.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        name: e.target.value,
                        slug: generateSlug(e.target.value),
                      });
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="auto-generated"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <select
                  id="country"
                  value={formData.country_id}
                  onChange={(e) => setFormData({ ...formData, country_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Select country...</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parser">Default Parser</Label>
                <select
                  id="parser"
                  value={formData.parser_id}
                  onChange={(e) => setFormData({ ...formData, parser_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">None (manual only)</option>
                  {parsers.map(parser => (
                    <option key={parser.id} value={parser.id}>
                      {parser.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">Cinemas in this group will inherit this parser unless overridden</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input
                  id="logo_url"
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label htmlFor="is_active" className="font-normal">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Cinema Group</DialogTitle>
            <DialogDescription>
              Update cinema group information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Name *</Label>
                  <Input
                    id="edit_name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_slug">Slug</Label>
                  <Input
                    id="edit_slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_country">Country</Label>
                <select
                  id="edit_country"
                  value={formData.country_id}
                  onChange={(e) => setFormData({ ...formData, country_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Select country...</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_parser">Default Parser</Label>
                <select
                  id="edit_parser"
                  value={formData.parser_id}
                  onChange={(e) => setFormData({ ...formData, parser_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">None (manual only)</option>
                  {parsers.map(parser => (
                    <option key={parser.id} value={parser.id}>
                      {parser.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">Cinemas in this group will inherit this parser unless overridden</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_website">Website</Label>
                <Input
                  id="edit_website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_logo_url">Logo URL</Label>
                <Input
                  id="edit_logo_url"
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea
                  id="edit_description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label htmlFor="edit_is_active" className="font-normal">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Cinema Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={formLoading}>
              {formLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
