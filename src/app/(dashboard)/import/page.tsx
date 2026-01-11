'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Film,
  Calendar,
  Clock,
  Search,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface Cinema {
  id: string;
  name: string;
  parser_id: string | null;
  cinema_group?: {
    id: string;
    name: string;
    parser_id: string | null;
  };
}

interface Parser {
  id: string;
  name: string;
  slug: string;
}

interface ParsedFilm {
  importTitle: string;
  movieName: string;
  language: string | null;
  languageCode: string | null;
  duration: string | null;
  durationMinutes: number | null;
  versionString: string | null;
  format: string | null;
  ageRating: string | null;
  director: string | null;
  year: number | null;
  showingCount: number;
  screeningShows: Array<{
    date: string;
    time: string;
    datetime: string;
  }>;
}

interface ParseResult {
  success: boolean;
  parser: Parser;
  cinema: { id: string; name: string };
  summary: {
    totalSheets: number;
    totalFilms: number;
    totalShowings: number;
  };
  sheets: Array<{
    sheetName: string;
    filmCount: number;
    dateRange: { start: string; end: string } | null;
    films: ParsedFilm[];
    errors: string[];
  }>;
  errors: string[];
  warnings: string[];
}

interface Conflict {
  id: string;
  import_title: string;
  movie_name: string;
  director: string | null;
  year_of_production: number | null;
  state: 'to_verify' | 'verified' | 'processed' | 'skipped';
  matched_movie?: {
    id: string;
    original_title: string;
    poster_url: string | null;
  } | null;
  cinema?: { id: string; name: string };
  editions?: any[];
  sessions?: any[];
  created_at: string;
}

export default function ImportPage() {
  const { hasPermission } = useUser();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState('upload');
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Conflicts state
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [conflictsLoading, setConflictsLoading] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  // Fetch cinemas on mount
  useEffect(() => {
    fetchCinemas();
  }, []);

  // Fetch conflicts when switching to conflicts tab
  useEffect(() => {
    if (activeTab === 'conflicts') {
      fetchConflicts();
    }
  }, [activeTab]);

  async function fetchCinemas() {
    const { data } = await supabase
      .from('cinemas')
      .select(`
        id,
        name,
        parser_id,
        cinema_group:cinema_groups(id, name, parser_id)
      `)
      .eq('is_active', true)
      .order('name');

    if (data) {
      setCinemas(data as Cinema[]);
    }
  }

  async function fetchConflicts() {
    setConflictsLoading(true);
    try {
      const response = await fetch(`/api/import/conflicts?state=to_verify&limit=100`);
      const data = await response.json();
      if (data.conflicts) {
        setConflicts(data.conflicts);
      }
    } catch (err) {
      console.error('Failed to fetch conflicts:', err);
    } finally {
      setConflictsLoading(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParseResult(null);
      setError(null);
    }
  };

  const handleParse = async () => {
    if (!file || !selectedCinemaId) {
      setError('Please select a cinema and upload a file');
      return;
    }

    setParsing(true);
    setError(null);
    setParseResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('cinema_id', selectedCinemaId);

      const response = await fetch('/api/import/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse file');
      }

      setParseResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cinema_id: selectedCinemaId,
          parser_id: parseResult.parser.id,
          sheets: parseResult.sheets,
          options: {
            createMoviesAutomatically: false,
            cleanupOldData: false,
            cleanupDate: null,
            previewOnly: false,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import');
      }

      setSuccess(`Import completed! Created ${data.summary.createdConflicts} items for review.`);
      setActiveTab('conflicts');
      fetchConflicts();
    } catch (err: any) {
      setError(err.message || 'Failed to import');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyConflict = async (conflictId: string) => {
    try {
      const response = await fetch('/api/import/conflicts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflict_id: conflictId,
          state: 'verified',
        }),
      });

      if (response.ok) {
        setConflicts(prev =>
          prev.map(c => (c.id === conflictId ? { ...c, state: 'verified' as const } : c))
        );
      }
    } catch (err) {
      console.error('Failed to verify conflict:', err);
    }
  };

  const handleProcessConflicts = async () => {
    const verifiedIds = conflicts.filter(c => c.state === 'verified').map(c => c.id);
    if (verifiedIds.length === 0) {
      setError('No verified conflicts to process');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/import/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflict_ids: verifiedIds }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Processed ${data.results.processed} items. Created ${data.results.created_screenings} screenings.`);
        fetchConflicts();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process conflicts');
    } finally {
      setLoading(false);
    }
  };

  const selectedCinema = cinemas.find(c => c.id === selectedCinemaId);
  const hasParser = selectedCinema?.parser_id || selectedCinema?.cinema_group?.parser_id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import Schedules</h1>
        <p className="text-sm text-slate-500 mt-1">
          Import cinema schedules from Excel files
        </p>
      </div>

      {/* Alerts */}
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

      {/* Tabs */}
      <Tabs defaultValue="upload" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="conflicts">
            <AlertCircle className="h-4 w-4 mr-2" />
            Review Conflicts
            {conflicts.filter(c => c.state === 'to_verify').length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {conflicts.filter(c => c.state === 'to_verify').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Schedule File</CardTitle>
              <CardDescription>
                Select a cinema and upload an Excel file (.xlsx or .xls)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cinema Selection */}
              <div className="space-y-2">
                <Label htmlFor="cinema">Cinema</Label>
                <select
                  id="cinema"
                  value={selectedCinemaId}
                  onChange={(e) => {
                    setSelectedCinemaId(e.target.value);
                    setParseResult(null);
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Select a cinema...</option>
                  {cinemas.map(cinema => (
                    <option key={cinema.id} value={cinema.id}>
                      {cinema.name}
                      {cinema.cinema_group ? ` (${cinema.cinema_group.name})` : ''}
                      {!cinema.parser_id && !cinema.cinema_group?.parser_id ? ' - No parser' : ''}
                    </option>
                  ))}
                </select>
                {selectedCinema && !hasParser && (
                  <p className="text-sm text-amber-600">
                    This cinema has no parser configured. Please configure a parser in the cinema settings.
                  </p>
                )}
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file">Schedule File</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={!selectedCinemaId || !hasParser}
                  />
                  <Button
                    onClick={handleParse}
                    disabled={!file || !selectedCinemaId || !hasParser || parsing}
                  >
                    {parsing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Parse File
                      </>
                    )}
                  </Button>
                </div>
                {file && (
                  <p className="text-sm text-slate-500">
                    Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Parse Results */}
          {parseResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {parseResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  Parse Results
                </CardTitle>
                <CardDescription>
                  Parser: {parseResult.parser.name} | Cinema: {parseResult.cinema.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {parseResult.summary.totalSheets}
                    </div>
                    <div className="text-sm text-slate-500">Sheets</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {parseResult.summary.totalFilms}
                    </div>
                    <div className="text-sm text-slate-500">Films</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {parseResult.summary.totalShowings}
                    </div>
                    <div className="text-sm text-slate-500">Showings</div>
                  </div>
                </div>

                {/* Errors */}
                {parseResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside">
                        {parseResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Films Table */}
                {parseResult.sheets.map((sheet, sheetIndex) => (
                  <div key={sheetIndex} className="space-y-2">
                    <h3 className="font-medium flex items-center gap-2">
                      {sheet.sheetName}
                      {sheet.dateRange && (
                        <span className="text-sm text-slate-500">
                          ({new Date(sheet.dateRange.start).toLocaleDateString()} -{' '}
                          {new Date(sheet.dateRange.end).toLocaleDateString()})
                        </span>
                      )}
                    </h3>

                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Film</TableHead>
                            <TableHead>Language</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Format</TableHead>
                            <TableHead className="text-right">Showings</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sheet.films.map((film, filmIndex) => (
                            <TableRow key={filmIndex}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{film.movieName}</div>
                                  {film.director && (
                                    <div className="text-xs text-slate-500">
                                      {film.director}
                                      {film.year && ` (${film.year})`}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {film.versionString || film.language || '-'}
                              </TableCell>
                              <TableCell>
                                {film.duration || (film.durationMinutes ? `${film.durationMinutes}'` : '-')}
                              </TableCell>
                              <TableCell>
                                {film.format || '-'}
                                {film.ageRating && (
                                  <Badge variant="outline" className="ml-1">
                                    {film.ageRating}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{film.showingCount}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {sheet.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          {sheet.errors.join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}

                {/* Import Button */}
                {parseResult.success && parseResult.summary.totalFilms > 0 && (
                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button variant="outline" onClick={() => setParseResult(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Import {parseResult.summary.totalFilms} Films
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Conflicts Tab */}
        <TabsContent value="conflicts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Review Import Conflicts</CardTitle>
                  <CardDescription>
                    Review and verify imported movies before creating screenings
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={fetchConflicts} disabled={conflictsLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${conflictsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    onClick={handleProcessConflicts}
                    disabled={loading || conflicts.filter(c => c.state === 'verified').length === 0}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Process Verified ({conflicts.filter(c => c.state === 'verified').length})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {conflictsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : conflicts.length === 0 ? (
                <div className="text-center py-12">
                  <Film className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No conflicts to review</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Movie</TableHead>
                      <TableHead>Cinema</TableHead>
                      <TableHead>Matched To</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conflicts.map(conflict => (
                      <TableRow key={conflict.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{conflict.movie_name || conflict.import_title}</div>
                            {conflict.director && (
                              <div className="text-xs text-slate-500">
                                {conflict.director}
                                {conflict.year_of_production && ` (${conflict.year_of_production})`}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{conflict.cinema?.name || '-'}</TableCell>
                        <TableCell>
                          {conflict.matched_movie ? (
                            <span className="text-green-600">{conflict.matched_movie.original_title}</span>
                          ) : (
                            <span className="text-amber-600">No match</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {conflict.sessions?.length || 0} sessions
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              conflict.state === 'verified'
                                ? 'default'
                                : conflict.state === 'processed'
                                ? 'outline'
                                : 'secondary'
                            }
                          >
                            {conflict.state}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {conflict.state === 'to_verify' && (
                              <Button
                                size="sm"
                                onClick={() => handleVerifyConflict(conflict.id)}
                              >
                                Verify
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedConflict(conflict);
                                setConflictDialogOpen(true);
                              }}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Conflict Detail Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedConflict?.movie_name || selectedConflict?.import_title}</DialogTitle>
            <DialogDescription>
              Import conflict details
            </DialogDescription>
          </DialogHeader>
          {selectedConflict && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Import Title</Label>
                  <p className="text-sm">{selectedConflict.import_title}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Movie Name</Label>
                  <p className="text-sm">{selectedConflict.movie_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Director</Label>
                  <p className="text-sm">{selectedConflict.director || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Year</Label>
                  <p className="text-sm">{selectedConflict.year_of_production || '-'}</p>
                </div>
              </div>

              {selectedConflict.editions && selectedConflict.editions.length > 0 && (
                <div>
                  <Label className="text-xs text-slate-500">Editions</Label>
                  <div className="space-y-2 mt-1">
                    {selectedConflict.editions.map((edition: any, i: number) => (
                      <div key={i} className="bg-slate-50 rounded p-2 text-sm">
                        <div className="font-medium">{edition.full_title || edition.title}</div>
                        <div className="text-xs text-slate-500">
                          {[edition.language_code, edition.duration_text, edition.version_string]
                            .filter(Boolean)
                            .join(' | ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedConflict.sessions && selectedConflict.sessions.length > 0 && (
                <div>
                  <Label className="text-xs text-slate-500">
                    Sessions ({selectedConflict.sessions.length})
                  </Label>
                  <div className="max-h-40 overflow-y-auto mt-1">
                    <div className="flex flex-wrap gap-1">
                      {selectedConflict.sessions.map((session: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {new Date(session.screening_datetime).toLocaleDateString()}{' '}
                          {new Date(session.screening_datetime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConflictDialogOpen(false)}>
              Close
            </Button>
            {selectedConflict?.state === 'to_verify' && (
              <Button
                onClick={() => {
                  handleVerifyConflict(selectedConflict.id);
                  setConflictDialogOpen(false);
                }}
              >
                Verify
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
