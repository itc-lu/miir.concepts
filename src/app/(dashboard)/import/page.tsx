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
  History,
  ChevronRight,
  RefreshCw,
  Building2,
  Users,
} from 'lucide-react';

interface CinemaGroup {
  id: string;
  name: string;
  parser_id: string | null;
}

interface Cinema {
  id: string;
  name: string;
  parser_id: string | null;
  cinema_group_id: string | null;
  cinema_group?: CinemaGroup;
}

interface DetectedSheet {
  index: number;
  name: string;
  rowCount: number;
  dateRange: { start: string; end: string } | null;
  sampleData: string[];
  cinemaId?: string; // User-assigned cinema for this sheet
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
  mode: 'single_cinema' | 'multi_cinema';
  parser: { id: string; name: string; slug: string };
  cinema?: { id: string; name: string };
  cinemaGroup?: { id: string; name: string };
  summary: {
    totalSheets: number;
    totalFilms: number;
    totalShowings: number;
  };
  sheets: Array<{
    sheetIndex: number;
    sheetName: string;
    cinemaId: string;
    cinemaName: string;
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

interface ImportJob {
  id: string;
  user_id: string;
  cinema_id: string | null;
  cinema_group_id: string | null;
  file_name: string;
  status: string;
  total_records: number;
  success_records: number;
  error_records: number;
  sheet_count: number;
  created_at: string;
  completed_at: string | null;
  user?: { email: string; first_name: string | null; last_name: string | null };
  cinema?: { id: string; name: string };
  cinema_group?: { id: string; name: string };
  parser?: { id: string; name: string };
}

type SelectionMode = 'cinema' | 'cinema_group';

export default function ImportPage() {
  const { hasPermission } = useUser();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState('upload');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('cinema');
  const [cinemaGroups, setCinemaGroups] = useState<CinemaGroup[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>('');
  const [selectedCinemaGroupId, setSelectedCinemaGroupId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [detectingSheets, setDetectingSheets] = useState(false);
  const [detectedSheets, setDetectedSheets] = useState<DetectedSheet[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Conflicts state
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [conflictsLoading, setConflictsLoading] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  // Import history state
  const [importHistory, setImportHistory] = useState<ImportJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchCinemas();
    fetchCinemaGroups();
  }, []);

  // Fetch conflicts when switching to conflicts tab
  useEffect(() => {
    if (activeTab === 'conflicts') {
      fetchConflicts();
    } else if (activeTab === 'history') {
      fetchImportHistory();
    }
  }, [activeTab]);

  async function fetchCinemaGroups() {
    const { data } = await supabase
      .from('cinema_groups')
      .select('id, name, parser_id')
      .eq('is_active', true)
      .order('name');

    if (data) {
      setCinemaGroups(data);
    }
  }

  async function fetchCinemas() {
    const { data } = await supabase
      .from('cinemas')
      .select(`
        id,
        name,
        parser_id,
        cinema_group_id,
        cinema_group:cinema_groups(id, name, parser_id)
      `)
      .eq('is_active', true)
      .order('name');

    if (data) {
      const transformedCinemas = data.map((cinema: any) => ({
        ...cinema,
        cinema_group: Array.isArray(cinema.cinema_group)
          ? cinema.cinema_group[0]
          : cinema.cinema_group,
      }));
      setCinemas(transformedCinemas);
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

  async function fetchImportHistory() {
    setHistoryLoading(true);
    try {
      const response = await fetch('/api/import/history?limit=50');
      const data = await response.json();
      if (data.jobs) {
        setImportHistory(data.jobs);
      }
    } catch (err) {
      console.error('Failed to fetch import history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParseResult(null);
      setDetectedSheets([]);
      setError(null);

      // If in cinema group mode, detect sheets
      if (selectionMode === 'cinema_group' && selectedCinemaGroupId) {
        await detectSheets(selectedFile);
      }
    }
  };

  const detectSheets = async (fileToDetect: File) => {
    setDetectingSheets(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', fileToDetect);

      const response = await fetch('/api/import/sheets', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to detect sheets');
      }

      // Initialize sheets with empty cinema selection
      const sheetsWithCinema: DetectedSheet[] = data.sheets.map((sheet: any) => ({
        ...sheet,
        cinemaId: '',
      }));

      setDetectedSheets(sheetsWithCinema);
    } catch (err: any) {
      setError(err.message || 'Failed to detect sheets');
    } finally {
      setDetectingSheets(false);
    }
  };

  const handleSheetCinemaChange = (sheetIndex: number, cinemaId: string) => {
    setDetectedSheets(prev =>
      prev.map(sheet =>
        sheet.index === sheetIndex ? { ...sheet, cinemaId } : sheet
      )
    );
  };

  const handleParse = async () => {
    if (!file) {
      setError('Please upload a file');
      return;
    }

    // Validation based on mode
    if (selectionMode === 'cinema') {
      if (!selectedCinemaId) {
        setError('Please select a cinema');
        return;
      }
    } else {
      if (!selectedCinemaGroupId) {
        setError('Please select a cinema group');
        return;
      }

      // Check if all sheets have cinemas assigned
      const unmappedSheets = detectedSheets.filter(s => !s.cinemaId);
      if (unmappedSheets.length > 0) {
        setError('Please assign a cinema to all sheets');
        return;
      }
    }

    setParsing(true);
    setError(null);
    setParseResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      if (selectionMode === 'cinema') {
        formData.append('cinema_id', selectedCinemaId);
      } else {
        formData.append('cinema_group_id', selectedCinemaGroupId);
        formData.append(
          'sheet_mappings',
          JSON.stringify(
            detectedSheets.map(s => ({
              sheetIndex: s.index,
              sheetName: s.name,
              cinemaId: s.cinemaId,
            }))
          )
        );
      }

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
          cinema_id: selectionMode === 'cinema' ? selectedCinemaId : undefined,
          cinema_group_id: selectionMode === 'cinema_group' ? selectedCinemaGroupId : undefined,
          parser_id: parseResult.parser.id,
          sheets: parseResult.sheets,
          file_name: file?.name,
          file_size: file?.size,
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

  // Get cinemas filtered by selected cinema group
  const filteredCinemas = selectedCinemaGroupId
    ? cinemas.filter(c => c.cinema_group_id === selectedCinemaGroupId)
    : cinemas;

  const selectedCinema = cinemas.find(c => c.id === selectedCinemaId);
  const selectedCinemaGroup = cinemaGroups.find(g => g.id === selectedCinemaGroupId);
  const hasParser = selectionMode === 'cinema'
    ? selectedCinema?.parser_id || selectedCinema?.cinema_group?.parser_id
    : selectedCinemaGroup?.parser_id;

  const canUploadFile = selectionMode === 'cinema' ? !!selectedCinemaId && hasParser : !!selectedCinemaGroupId && hasParser;
  const canParse = selectionMode === 'cinema'
    ? !!file && !!selectedCinemaId && hasParser
    : !!file && !!selectedCinemaGroupId && hasParser && detectedSheets.every(s => !!s.cinemaId);

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
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Import History
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Schedule File</CardTitle>
              <CardDescription>
                Select a cinema or cinema group and upload an Excel file (.xlsx or .xls)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selection Mode Toggle */}
              <div className="space-y-2">
                <Label>Import Mode</Label>
                <div className="flex gap-2">
                  <Button
                    variant={selectionMode === 'cinema' ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectionMode('cinema');
                      setSelectedCinemaGroupId('');
                      setDetectedSheets([]);
                      setParseResult(null);
                    }}
                    className="flex-1"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Single Cinema
                  </Button>
                  <Button
                    variant={selectionMode === 'cinema_group' ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectionMode('cinema_group');
                      setSelectedCinemaId('');
                      setParseResult(null);
                    }}
                    className="flex-1"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Cinema Group (Multi-Sheet)
                  </Button>
                </div>
              </div>

              {/* Single Cinema Mode */}
              {selectionMode === 'cinema' && (
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
                      This cinema has no parser configured.
                    </p>
                  )}
                </div>
              )}

              {/* Cinema Group Mode */}
              {selectionMode === 'cinema_group' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cinema-group">Cinema Group</Label>
                    <select
                      id="cinema-group"
                      value={selectedCinemaGroupId}
                      onChange={(e) => {
                        setSelectedCinemaGroupId(e.target.value);
                        setDetectedSheets([]);
                        setParseResult(null);
                      }}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Select a cinema group...</option>
                      {cinemaGroups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                          {!group.parser_id ? ' - No parser' : ''}
                        </option>
                      ))}
                    </select>
                    {selectedCinemaGroup && !hasParser && (
                      <p className="text-sm text-amber-600">
                        This cinema group has no parser configured.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file">Schedule File</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={!canUploadFile}
                  />
                </div>
                {file && (
                  <p className="text-sm text-slate-500">
                    Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Sheet Detection (Cinema Group Mode) */}
              {selectionMode === 'cinema_group' && detectingSheets && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Detecting sheets...
                </div>
              )}

              {selectionMode === 'cinema_group' && detectedSheets.length > 0 && (
                <div className="space-y-4">
                  <Label>Sheet to Cinema Mapping</Label>
                  <p className="text-sm text-slate-500">
                    Assign each sheet to a cinema in the group
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sheet</TableHead>
                          <TableHead>Rows</TableHead>
                          <TableHead>Date Range</TableHead>
                          <TableHead>Cinema</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detectedSheets.map(sheet => (
                          <TableRow key={sheet.index}>
                            <TableCell className="font-medium">{sheet.name}</TableCell>
                            <TableCell>{sheet.rowCount}</TableCell>
                            <TableCell>
                              {sheet.dateRange
                                ? `${sheet.dateRange.start} - ${sheet.dateRange.end}`
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <select
                                value={sheet.cinemaId || ''}
                                onChange={(e) => handleSheetCinemaChange(sheet.index, e.target.value)}
                                className="w-full h-8 px-2 rounded border border-input bg-background text-sm"
                              >
                                <option value="">Select cinema...</option>
                                {filteredCinemas.map(cinema => (
                                  <option key={cinema.id} value={cinema.id}>
                                    {cinema.name}
                                  </option>
                                ))}
                              </select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Parse Button */}
              {file && (
                <Button
                  onClick={handleParse}
                  disabled={!canParse || parsing}
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
              )}
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
                  Parser: {parseResult.parser.name}
                  {parseResult.cinema && ` | Cinema: ${parseResult.cinema.name}`}
                  {parseResult.cinemaGroup && ` | Cinema Group: ${parseResult.cinemaGroup.name}`}
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

                {/* Films Table per Sheet */}
                {parseResult.sheets.map((sheet, sheetIndex) => (
                  <div key={sheetIndex} className="space-y-2">
                    <h3 className="font-medium flex items-center gap-2">
                      {sheet.sheetName}
                      {parseResult.mode === 'multi_cinema' && (
                        <Badge variant="outline">{sheet.cinemaName}</Badge>
                      )}
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

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Import History</CardTitle>
                  <CardDescription>
                    View past import jobs and their results
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={fetchImportHistory} disabled={historyLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${historyLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : importHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No import history yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Cinema/Group</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Records</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importHistory.map(job => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(job.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(job.created_at).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm truncate max-w-[200px]">
                            {job.file_name}
                          </div>
                          {job.sheet_count > 0 && (
                            <div className="text-xs text-slate-500">
                              {job.sheet_count} sheets
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {job.cinema_group?.name || job.cinema?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {job.user?.first_name
                              ? `${job.user.first_name} ${job.user.last_name || ''}`
                              : job.user?.email || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              job.status === 'completed'
                                ? 'default'
                                : job.status === 'failed'
                                ? 'destructive'
                                : job.status === 'processing'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm">
                            <span className="text-green-600">{job.success_records}</span>
                            {job.error_records > 0 && (
                              <>
                                {' / '}
                                <span className="text-red-600">{job.error_records}</span>
                              </>
                            )}
                            {' / '}
                            {job.total_records}
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
