'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
  ArrowLeft, Plus, MoreHorizontal, Pencil, Trash2, Calendar, Film, Clock,
  CheckCircle, AlertCircle, Star, ChevronDown, ChevronRight, Eye,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Cinema {
  id: string;
  name: string;
  timezone: string;
}

interface MovieL2 {
  id: string;
  edition_title: string | null;
  movie_l0: {
    id: string;
    original_title: string;
    poster_url: string | null;
    runtime_minutes: number | null;
  };
  format: { name: string } | null;
  audio_language: { code: string; name: string } | null;
}

interface SessionDay {
  id: string;
  date: string;
  session_times: SessionTime[];
}

interface SessionTime {
  id: string;
  time_float: number;
  start_datetime: string | null;
  end_datetime: string | null;
}

interface Screening {
  id: string;
  cinema_id: string;
  movie_l2_id: string;
  format_id: string | null;
  start_week_day: string;
  movie_of_the_week: boolean;
  movie_of_the_day: boolean;
  day_flag_added_date: string | null;
  state: 'to_verify' | 'verified';
  missing_info: string | null;
  created_at: string;
  movie_l2: MovieL2;
  session_days: SessionDay[];
}

interface Format {
  id: string;
  name: string;
}

// Convert decimal time to HH:MM display
function formatTimeFloat(timeFloat: number): string {
  const hours = Math.floor(timeFloat);
  const minutes = Math.round((timeFloat - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Convert HH:MM to decimal time
function parseTimeToFloat(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + (minutes / 60);
}

// Get week number from date
function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CinemaScreeningsPage() {
  const params = useParams();
  const cinemaId = params.id as string;
  const supabase = createClient();
  const { hasPermission } = useUser();

  const canCreate = hasPermission('sessions:create');
  const canUpdate = hasPermission('sessions:update');
  const canDelete = hasPermission('sessions:delete');

  const [loading, setLoading] = useState(true);
  const [cinema, setCinema] = useState<Cinema | null>(null);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [movies, setMovies] = useState<MovieL2[]>([]);
  const [formats, setFormats] = useState<Format[]>([]);
  const [expandedScreenings, setExpandedScreenings] = useState<Set<string>>(new Set());

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [timesDialogOpen, setTimesDialogOpen] = useState(false);
  const [selectedScreening, setSelectedScreening] = useState<Screening | null>(null);
  const [selectedDay, setSelectedDay] = useState<SessionDay | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    movie_l2_id: '',
    format_id: '',
    start_week_day: '',
    movie_of_the_week: false,
    movie_of_the_day: false,
  });
  const [newTime, setNewTime] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [cinemaId]);

  async function fetchData() {
    setLoading(true);

    // Fetch cinema
    const { data: cinemaData } = await supabase
      .from('cinemas')
      .select('id, name, timezone')
      .eq('id', cinemaId)
      .single();

    if (cinemaData) setCinema(cinemaData);

    // Fetch screenings with nested data
    const { data: screeningsData } = await supabase
      .from('screenings')
      .select(`
        *,
        movie_l2:movies_l2(
          id,
          edition_title,
          movie_l0:movies_l0(id, original_title, poster_url, runtime_minutes),
          format:formats(name),
          audio_language:languages!movies_l2_audio_language_id_fkey(code, name)
        ),
        session_days(
          id,
          date,
          session_times(id, time_float, start_datetime, end_datetime)
        )
      `)
      .eq('cinema_id', cinemaId)
      .order('start_week_day', { ascending: false });

    if (screeningsData) {
      // Sort session_days and session_times
      const sorted = screeningsData.map(s => ({
        ...s,
        session_days: s.session_days
          .sort((a: SessionDay, b: SessionDay) => a.date.localeCompare(b.date))
          .map((d: SessionDay) => ({
            ...d,
            session_times: d.session_times.sort((a: SessionTime, b: SessionTime) => a.time_float - b.time_float)
          }))
      }));
      setScreenings(sorted as Screening[]);
    }

    // Fetch movies for dropdown
    const { data: moviesData } = await supabase
      .from('movies_l2')
      .select(`
        id,
        edition_title,
        movie_l0:movies_l0(id, original_title, poster_url, runtime_minutes),
        format:formats(name),
        audio_language:languages!movies_l2_audio_language_id_fkey(code, name)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(100);

    if (moviesData) setMovies(moviesData as unknown as MovieL2[]);

    // Fetch formats
    const { data: formatsData } = await supabase
      .from('formats')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (formatsData) setFormats(formatsData);

    setLoading(false);
  }

  function toggleExpanded(screeningId: string) {
    const newExpanded = new Set(expandedScreenings);
    if (newExpanded.has(screeningId)) {
      newExpanded.delete(screeningId);
    } else {
      newExpanded.add(screeningId);
    }
    setExpandedScreenings(newExpanded);
  }

  async function handleCreateScreening(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      const { error } = await supabase.from('screenings').insert({
        cinema_id: cinemaId,
        movie_l2_id: formData.movie_l2_id,
        format_id: formData.format_id || null,
        start_week_day: formData.start_week_day,
        movie_of_the_week: formData.movie_of_the_week,
        movie_of_the_day: formData.movie_of_the_day,
      });

      if (error) throw error;

      setFormSuccess('Screening created successfully');
      fetchData();
      setTimeout(() => {
        setCreateDialogOpen(false);
        setFormSuccess(null);
        resetForm();
      }, 1500);
    } catch (error: any) {
      setFormError(error.message || 'Failed to create screening');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleUpdateScreening(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedScreening) return;
    setFormError(null);
    setFormLoading(true);

    try {
      const { error } = await supabase
        .from('screenings')
        .update({
          format_id: formData.format_id || null,
          movie_of_the_week: formData.movie_of_the_week,
          movie_of_the_day: formData.movie_of_the_day,
        })
        .eq('id', selectedScreening.id);

      if (error) throw error;

      setFormSuccess('Screening updated successfully');
      fetchData();
      setTimeout(() => {
        setEditDialogOpen(false);
        setFormSuccess(null);
      }, 1500);
    } catch (error: any) {
      setFormError(error.message || 'Failed to update screening');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteScreening() {
    if (!selectedScreening) return;
    setFormLoading(true);

    try {
      const { error } = await supabase
        .from('screenings')
        .delete()
        .eq('id', selectedScreening.id);

      if (error) throw error;

      fetchData();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to delete:', error);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleVerifyScreening(screening: Screening) {
    const newState = screening.state === 'verified' ? 'to_verify' : 'verified';
    const { error } = await supabase
      .from('screenings')
      .update({ state: newState })
      .eq('id', screening.id);

    if (!error) fetchData();
  }

  async function handleAddTime() {
    if (!selectedDay || !newTime) return;
    setFormLoading(true);

    try {
      const timeFloat = parseTimeToFloat(newTime);
      const { error } = await supabase.from('session_times').insert({
        session_day_id: selectedDay.id,
        time_float: timeFloat,
      });

      if (error) throw error;

      setNewTime('');
      fetchData();
    } catch (error: any) {
      setFormError(error.message || 'Failed to add time');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteTime(timeId: string) {
    const { error } = await supabase
      .from('session_times')
      .delete()
      .eq('id', timeId);

    if (!error) fetchData();
  }

  function resetForm() {
    setFormData({
      movie_l2_id: '',
      format_id: '',
      start_week_day: getNextWeekStart(),
      movie_of_the_week: false,
      movie_of_the_day: false,
    });
  }

  function getNextWeekStart(): string {
    // Default to next Wednesday (Luxembourg)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilWednesday = (3 - dayOfWeek + 7) % 7;
    const nextWednesday = new Date(today);
    nextWednesday.setDate(today.getDate() + daysUntilWednesday);
    return nextWednesday.toISOString().split('T')[0];
  }

  function openEditDialog(screening: Screening) {
    setSelectedScreening(screening);
    setFormData({
      movie_l2_id: screening.movie_l2_id,
      format_id: screening.format_id || '',
      start_week_day: screening.start_week_day,
      movie_of_the_week: screening.movie_of_the_week,
      movie_of_the_day: screening.movie_of_the_day,
    });
    setFormError(null);
    setFormSuccess(null);
    setEditDialogOpen(true);
  }

  function openTimesDialog(screening: Screening, day: SessionDay) {
    setSelectedScreening(screening);
    setSelectedDay(day);
    setNewTime('');
    setFormError(null);
    setTimesDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading screenings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/cinemas/${cinemaId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Screenings</h1>
            <p className="text-muted-foreground">{cinema?.name}</p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => { resetForm(); setFormError(null); setFormSuccess(null); setCreateDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Screening
          </Button>
        )}
      </div>

      {/* Screenings List */}
      {screenings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No screenings yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Add screenings to schedule movie showings for this cinema.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {screenings.map(screening => (
            <Card key={screening.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleExpanded(screening.id)}
                      className="mt-1 p-1 hover:bg-accent rounded"
                    >
                      {expandedScreenings.has(screening.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <div className="h-16 w-11 rounded bg-muted overflow-hidden flex-shrink-0">
                      {screening.movie_l2?.movie_l0?.poster_url ? (
                        <img
                          src={screening.movie_l2.movie_l0.poster_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Film className="h-full w-full p-2 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {screening.movie_l2?.movie_l0?.original_title}
                        {screening.movie_of_the_week && (
                          <Badge variant="default" className="bg-yellow-500">
                            <Star className="h-3 w-3 mr-1" />
                            Week
                          </Badge>
                        )}
                        {screening.movie_of_the_day && (
                          <Badge variant="default" className="bg-orange-500">
                            <Star className="h-3 w-3 mr-1" />
                            Day
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        Week of {formatDate(screening.start_week_day)}
                        {screening.movie_l2?.format && (
                          <Badge variant="outline" className="ml-2">{screening.movie_l2.format.name}</Badge>
                        )}
                        {screening.movie_l2?.audio_language && (
                          <Badge variant="secondary">{screening.movie_l2.audio_language.code}</Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={screening.state === 'verified' ? 'success' : 'warning'}>
                      {screening.state === 'verified' ? 'Verified' : 'To Verify'}
                    </Badge>
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
                              <DropdownMenuItem onClick={() => openEditDialog(screening)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleVerifyScreening(screening)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {screening.state === 'verified' ? 'Mark as To Verify' : 'Mark as Verified'}
                              </DropdownMenuItem>
                            </>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => { setSelectedScreening(screening); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardHeader>

              {expandedScreenings.has(screening.id) && (
                <CardContent>
                  <div className="grid grid-cols-7 gap-2">
                    {screening.session_days.map(day => {
                      const dayDate = new Date(day.date);
                      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
                      const dayNum = dayDate.getDate();

                      return (
                        <div
                          key={day.id}
                          className="border rounded-lg p-2 text-center cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => canUpdate && openTimesDialog(screening, day)}
                        >
                          <div className="text-xs text-muted-foreground">{dayName}</div>
                          <div className="font-medium">{dayNum}</div>
                          <div className="mt-2 space-y-1">
                            {day.session_times.length === 0 ? (
                              <div className="text-xs text-muted-foreground">-</div>
                            ) : (
                              day.session_times.map(time => (
                                <Badge key={time.id} variant="outline" className="text-xs">
                                  {formatTimeFloat(time.time_float)}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Screening</DialogTitle>
            <DialogDescription>
              Create a new screening for this cinema. Session days will be created automatically.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateScreening}>
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
                      {movie.audio_language && ` (${movie.audio_language.code})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="format_id">Format</Label>
                <select
                  id="format_id"
                  value={formData.format_id}
                  onChange={(e) => setFormData({ ...formData, format_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Default</option>
                  {formats.map(format => (
                    <option key={format.id} value={format.id}>{format.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_week_day">Week Start Date *</Label>
                <Input
                  id="start_week_day"
                  type="date"
                  value={formData.start_week_day}
                  onChange={(e) => setFormData({ ...formData, start_week_day: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The first day of the screening week. 7 days will be created automatically.
                </p>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.movie_of_the_week}
                    onChange={(e) => setFormData({ ...formData, movie_of_the_week: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm">Movie of the Week</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.movie_of_the_day}
                    onChange={(e) => setFormData({ ...formData, movie_of_the_day: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm">Movie of the Day</span>
                </label>
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Screening</DialogTitle>
            <DialogDescription>Update screening settings.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateScreening}>
            <div className="space-y-4 py-4">
              {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
              {formSuccess && <Alert><CheckCircle className="h-4 w-4" /><AlertDescription>{formSuccess}</AlertDescription></Alert>}

              <div className="space-y-2">
                <Label htmlFor="edit_format_id">Format</Label>
                <select
                  id="edit_format_id"
                  value={formData.format_id}
                  onChange={(e) => setFormData({ ...formData, format_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Default</option>
                  {formats.map(format => (
                    <option key={format.id} value={format.id}>{format.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.movie_of_the_week}
                    onChange={(e) => setFormData({ ...formData, movie_of_the_week: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm">Movie of the Week</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.movie_of_the_day}
                    onChange={(e) => setFormData({ ...formData, movie_of_the_day: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm">Movie of the Day</span>
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading}>{formLoading ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Times Dialog */}
      <Dialog open={timesDialogOpen} onOpenChange={setTimesDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Session Times</DialogTitle>
            <DialogDescription>
              {selectedDay && formatDate(selectedDay.date)} - {selectedScreening?.movie_l2?.movie_l0?.original_title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}

            <div className="space-y-2">
              {selectedDay?.session_times.map(time => (
                <div key={time.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatTimeFloat(time.time_float)}</span>
                  </div>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTime(time.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
              {selectedDay?.session_times.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">No times added yet</p>
              )}
            </div>

            {canCreate && (
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="Add time"
                />
                <Button onClick={handleAddTime} disabled={!newTime || formLoading}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimesDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Screening</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this screening for "{selectedScreening?.movie_l2?.movie_l0?.original_title}"?
              This will also delete all session days and times. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteScreening} disabled={formLoading}>
              {formLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
