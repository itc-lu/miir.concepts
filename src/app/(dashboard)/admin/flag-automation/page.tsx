'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus, MoreHorizontal, Pencil, Trash2, Star, Calendar, Film, Building2,
  AlertCircle, CheckCircle, Zap,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface MovieL2 {
  id: string;
  edition_title: string | null;
  movie_l0: {
    id: string;
    original_title: string;
    poster_url: string | null;
  };
}

interface Cinema {
  id: string;
  name: string;
  city: string | null;
}

interface CinemaGroup {
  id: string;
  name: string;
}

interface FlagConfig {
  id: string;
  movie_l2_id: string;
  cinema_group_id: string | null;
  cinema_id: string | null;
  movie_of_the_day_date: string | null;
  movie_of_the_week_date: string | null;
  created_at: string;
  movie_l2: MovieL2;
  cinema_group: CinemaGroup | null;
  cinema: Cinema | null;
}

export default function FlagAutomationPage() {
  const { hasPermission } = useUser();
  const supabase = createClient();

  const canCreate = hasPermission('sessions:create');
  const canUpdate = hasPermission('sessions:update');
  const canDelete = hasPermission('sessions:delete');

  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<FlagConfig[]>([]);
  const [movies, setMovies] = useState<MovieL2[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [cinemaGroups, setCinemaGroups] = useState<CinemaGroup[]>([]);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<FlagConfig | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    movie_l2_id: '',
    target_type: 'cinema_group' as 'cinema_group' | 'cinema',
    cinema_group_id: '',
    cinema_id: '',
    movie_of_the_day_date: '',
    movie_of_the_week_date: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    // Fetch flag configs
    const { data: configsData } = await supabase
      .from('flag_date_configs')
      .select(`
        *,
        movie_l2:movies_l2(
          id,
          edition_title,
          movie_l0:movies_l0(id, original_title, poster_url)
        ),
        cinema_group:cinema_groups(id, name),
        cinema:cinemas(id, name, city)
      `)
      .order('created_at', { ascending: false });

    if (configsData) setConfigs(configsData as unknown as FlagConfig[]);

    // Fetch movies
    const { data: moviesData } = await supabase
      .from('movies_l2')
      .select(`
        id,
        edition_title,
        movie_l0:movies_l0(id, original_title, poster_url)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(100);

    if (moviesData) setMovies(moviesData as unknown as MovieL2[]);

    // Fetch cinemas
    const { data: cinemasData } = await supabase
      .from('cinemas')
      .select('id, name, city')
      .eq('is_active', true)
      .order('name');

    if (cinemasData) setCinemas(cinemasData);

    // Fetch cinema groups
    const { data: groupsData } = await supabase
      .from('cinema_groups')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (groupsData) setCinemaGroups(groupsData);

    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      const { error } = await supabase.from('flag_date_configs').insert({
        movie_l2_id: formData.movie_l2_id,
        cinema_group_id: formData.target_type === 'cinema_group' ? formData.cinema_group_id : null,
        cinema_id: formData.target_type === 'cinema' ? formData.cinema_id : null,
        movie_of_the_day_date: formData.movie_of_the_day_date || null,
        movie_of_the_week_date: formData.movie_of_the_week_date || null,
      });

      if (error) throw error;

      setFormSuccess('Flag configuration created successfully');
      fetchData();
      setTimeout(() => {
        setCreateDialogOpen(false);
        setFormSuccess(null);
        resetForm();
      }, 1500);
    } catch (error: any) {
      setFormError(error.message || 'Failed to create configuration');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConfig) return;
    setFormError(null);
    setFormLoading(true);

    try {
      const { error } = await supabase
        .from('flag_date_configs')
        .update({
          movie_of_the_day_date: formData.movie_of_the_day_date || null,
          movie_of_the_week_date: formData.movie_of_the_week_date || null,
        })
        .eq('id', selectedConfig.id);

      if (error) throw error;

      setFormSuccess('Configuration updated successfully');
      fetchData();
      setTimeout(() => {
        setEditDialogOpen(false);
        setFormSuccess(null);
      }, 1500);
    } catch (error: any) {
      setFormError(error.message || 'Failed to update configuration');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedConfig) return;
    setFormLoading(true);

    try {
      const { error } = await supabase
        .from('flag_date_configs')
        .delete()
        .eq('id', selectedConfig.id);

      if (error) throw error;

      fetchData();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to delete:', error);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleApplyFlags() {
    if (!selectedConfig) return;
    setFormLoading(true);
    setFormError(null);

    try {
      // Build the query to find matching screenings
      let query = supabase
        .from('screenings')
        .update({
          movie_of_the_week: selectedConfig.movie_of_the_week_date !== null,
          movie_of_the_day: selectedConfig.movie_of_the_day_date !== null,
          day_flag_added_date: selectedConfig.movie_of_the_day_date,
        })
        .eq('movie_l2_id', selectedConfig.movie_l2_id);

      // Filter by cinema or cinema group
      if (selectedConfig.cinema_id) {
        query = query.eq('cinema_id', selectedConfig.cinema_id);
      } else if (selectedConfig.cinema_group_id) {
        // Need to get cinemas in this group first
        const { data: groupCinemas } = await supabase
          .from('cinemas')
          .select('id')
          .eq('cinema_group_id', selectedConfig.cinema_group_id);

        if (groupCinemas && groupCinemas.length > 0) {
          query = query.in('cinema_id', groupCinemas.map(c => c.id));
        }
      }

      const { error } = await query;

      if (error) throw error;

      setFormSuccess('Flags applied to screenings successfully');
      setTimeout(() => {
        setApplyDialogOpen(false);
        setFormSuccess(null);
      }, 1500);
    } catch (error: any) {
      setFormError(error.message || 'Failed to apply flags');
    } finally {
      setFormLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      movie_l2_id: '',
      target_type: 'cinema_group',
      cinema_group_id: '',
      cinema_id: '',
      movie_of_the_day_date: '',
      movie_of_the_week_date: '',
    });
  }

  function openEditDialog(config: FlagConfig) {
    setSelectedConfig(config);
    setFormData({
      movie_l2_id: config.movie_l2_id,
      target_type: config.cinema_group_id ? 'cinema_group' : 'cinema',
      cinema_group_id: config.cinema_group_id || '',
      cinema_id: config.cinema_id || '',
      movie_of_the_day_date: config.movie_of_the_day_date || '',
      movie_of_the_week_date: config.movie_of_the_week_date || '',
    });
    setFormError(null);
    setFormSuccess(null);
    setEditDialogOpen(true);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Flag Automation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure automatic movie of the week/day flags for screenings
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => { resetForm(); setFormError(null); setFormSuccess(null); setCreateDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Configuration
          </Button>
        )}
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">How Flag Automation Works</p>
              <p className="text-sm text-blue-700 mt-1">
                Create configurations to automatically apply "Movie of the Week" or "Movie of the Day"
                flags to screenings. You can target specific cinemas or entire cinema groups.
                Use the "Apply Flags" action to update all matching screenings at once.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurations List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Movie</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Movie of the Week</TableHead>
              <TableHead>Movie of the Day</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Star className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <div className="text-slate-500">No flag configurations yet</div>
                </TableCell>
              </TableRow>
            ) : (
              configs.map(config => (
                <TableRow key={config.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-7 rounded bg-muted overflow-hidden">
                        {config.movie_l2?.movie_l0?.poster_url ? (
                          <img
                            src={config.movie_l2.movie_l0.poster_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Film className="h-full w-full p-1 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{config.movie_l2?.movie_l0?.original_title}</p>
                        {config.movie_l2?.edition_title && (
                          <p className="text-xs text-muted-foreground">{config.movie_l2.edition_title}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {config.cinema_group && (
                      <Badge variant="outline">
                        <Building2 className="h-3 w-3 mr-1" />
                        {config.cinema_group.name}
                      </Badge>
                    )}
                    {config.cinema && (
                      <Badge variant="secondary">
                        {config.cinema.name}
                        {config.cinema.city && <span className="opacity-70"> ({config.cinema.city})</span>}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {config.movie_of_the_week_date ? (
                      <Badge variant="default" className="bg-yellow-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(config.movie_of_the_week_date)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {config.movie_of_the_day_date ? (
                      <Badge variant="default" className="bg-orange-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(config.movie_of_the_day_date)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
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
                            <>
                              <DropdownMenuItem onClick={() => openEditDialog(config)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedConfig(config); setFormError(null); setFormSuccess(null); setApplyDialogOpen(true); }}>
                                <Zap className="h-4 w-4 mr-2" />
                                Apply Flags
                              </DropdownMenuItem>
                            </>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => { setSelectedConfig(config); setDeleteDialogOpen(true); }}
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
            <DialogTitle>Add Flag Configuration</DialogTitle>
            <DialogDescription>
              Configure automatic flags for a movie across cinemas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
              {formSuccess && <Alert><CheckCircle className="h-4 w-4" /><AlertDescription>{formSuccess}</AlertDescription></Alert>}

              <div className="space-y-2">
                <Label htmlFor="movie_l2_id">Movie *</Label>
                <select
                  id="movie_l2_id"
                  value={formData.movie_l2_id}
                  onChange={(e) => setFormData({ ...formData, movie_l2_id: e.target.value })}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select movie...</option>
                  {movies.map(movie => (
                    <option key={movie.id} value={movie.id}>
                      {movie.movie_l0?.original_title}
                      {movie.edition_title && ` - ${movie.edition_title}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Target Type</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="target_type"
                      value="cinema_group"
                      checked={formData.target_type === 'cinema_group'}
                      onChange={() => setFormData({ ...formData, target_type: 'cinema_group', cinema_id: '' })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Cinema Group</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="target_type"
                      value="cinema"
                      checked={formData.target_type === 'cinema'}
                      onChange={() => setFormData({ ...formData, target_type: 'cinema', cinema_group_id: '' })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Specific Cinema</span>
                  </label>
                </div>
              </div>

              {formData.target_type === 'cinema_group' && (
                <div className="space-y-2">
                  <Label htmlFor="cinema_group_id">Cinema Group *</Label>
                  <select
                    id="cinema_group_id"
                    value={formData.cinema_group_id}
                    onChange={(e) => setFormData({ ...formData, cinema_group_id: e.target.value })}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select cinema group...</option>
                    {cinemaGroups.map(group => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.target_type === 'cinema' && (
                <div className="space-y-2">
                  <Label htmlFor="cinema_id">Cinema *</Label>
                  <select
                    id="cinema_id"
                    value={formData.cinema_id}
                    onChange={(e) => setFormData({ ...formData, cinema_id: e.target.value })}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select cinema...</option>
                    {cinemas.map(cinema => (
                      <option key={cinema.id} value={cinema.id}>
                        {cinema.name}{cinema.city && ` (${cinema.city})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="movie_of_the_week_date">Movie of the Week Date</Label>
                  <Input
                    id="movie_of_the_week_date"
                    type="date"
                    value={formData.movie_of_the_week_date}
                    onChange={(e) => setFormData({ ...formData, movie_of_the_week_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="movie_of_the_day_date">Movie of the Day Date</Label>
                  <Input
                    id="movie_of_the_day_date"
                    type="date"
                    value={formData.movie_of_the_day_date}
                    onChange={(e) => setFormData({ ...formData, movie_of_the_day_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading}>{formLoading ? 'Creating...' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Flag Configuration</DialogTitle>
            <DialogDescription>Update flag dates for this configuration.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
              {formSuccess && <Alert><CheckCircle className="h-4 w-4" /><AlertDescription>{formSuccess}</AlertDescription></Alert>}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_movie_of_the_week_date">Movie of the Week Date</Label>
                  <Input
                    id="edit_movie_of_the_week_date"
                    type="date"
                    value={formData.movie_of_the_week_date}
                    onChange={(e) => setFormData({ ...formData, movie_of_the_week_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_movie_of_the_day_date">Movie of the Day Date</Label>
                  <Input
                    id="edit_movie_of_the_day_date"
                    type="date"
                    value={formData.movie_of_the_day_date}
                    onChange={(e) => setFormData({ ...formData, movie_of_the_day_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading}>{formLoading ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Apply Flags Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Flags</DialogTitle>
            <DialogDescription>
              This will update all screenings for "{selectedConfig?.movie_l2?.movie_l0?.original_title}"
              {selectedConfig?.cinema_group && ` in ${selectedConfig.cinema_group.name}`}
              {selectedConfig?.cinema && ` at ${selectedConfig.cinema.name}`}
              with the configured flags. This action can be reversed by editing individual screenings.
            </DialogDescription>
          </DialogHeader>
          {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
          {formSuccess && <Alert><CheckCircle className="h-4 w-4" /><AlertDescription>{formSuccess}</AlertDescription></Alert>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApplyFlags} disabled={formLoading}>
              <Zap className="h-4 w-4 mr-2" />
              {formLoading ? 'Applying...' : 'Apply Flags'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Configuration</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this flag configuration? This will not affect existing screenings.
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
