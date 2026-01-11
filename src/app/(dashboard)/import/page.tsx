'use client';

import { useState, useEffect } from 'react';
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
  History,
  RefreshCw,
  Building2,
  Users,
  Link2,
  Search,
  Eye,
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
  cinemaId?: string;
}

interface CellData {
  value: string;
  type: 'header' | 'movie' | 'time' | 'date-range' | 'data' | 'empty';
  row: number;
  col: number;
}

interface MovieRow {
  filmName: string;
  importTitle: string;
  times: { weekday: string; date: string; times: string[] }[];
}

interface SheetPreview {
  index: number;
  name: string;
  rawCells: CellData[][];
  dateRange: { start: string; end: string; text: string } | null;
  extractedDates: { weekday: string; date: string }[];
  detectedWeekdays: string[];
  movies: MovieRow[];
  headerRowIndex: number;
  filmColumnIndex: number;
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
  mappedMovieId?: string;
  mappedMovieName?: string;
  isNewMapping?: boolean;
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

interface ImportMapping {
  id: string;
  import_title: string;
  movie_l0_id: string | null;
  movie_l0?: {
    id: string;
    original_title: string;
    poster_url: string | null;
  };
}

interface MovieSearchResult {
  id: string;
  original_title: string;
  production_year: number | null;
  poster_url: string | null;
  imdb_id: string | null;
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
}

type SelectionMode = 'cinema' | 'cinema_group';

export default function ImportPage() {
  const { } = useUser();
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

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sheetPreviews, setSheetPreviews] = useState<SheetPreview[]>([]);
  const [activePreviewSheet, setActivePreviewSheet] = useState(0);

  // Movie linking state
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkingFilm, setLinkingFilm] = useState<{ sheetIndex: number; filmIndex: number; film: ParsedFilm } | null>(null);
  const [movieSearch, setMovieSearch] = useState('');
  const [movieSearchResults, setMovieSearchResults] = useState<MovieSearchResult[]>([]);
  const [movieSearchLoading, setMovieSearchLoading] = useState(false);
  const [mappings, setMappings] = useState<Map<string, ImportMapping>>(new Map());

  // Import history state
  const [importHistory, setImportHistory] = useState<ImportJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchCinemas();
    fetchCinemaGroups();
  }, []);

  // Fetch history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history') {
      fetchImportHistory();
    }
  }, [activeTab]);

  // Load mappings when cinema group changes
  useEffect(() => {
    if (selectedCinemaGroupId) {
      loadMappings(selectedCinemaGroupId);
    }
  }, [selectedCinemaGroupId]);

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

  async function loadMappings(cinemaGroupId: string) {
    try {
      const response = await fetch(`/api/import/mappings?cinema_group_id=${cinemaGroupId}`);
      const data = await response.json();
      if (data.mappings) {
        const mappingMap = new Map<string, ImportMapping>();
        data.mappings.forEach((m: ImportMapping) => {
          mappingMap.set(m.import_title.toLowerCase(), m);
        });
        setMappings(mappingMap);
      }
    } catch (err) {
      console.error('Failed to load mappings:', err);
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
      setSheetPreviews([]);
      setError(null);

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

  const loadPreview = async () => {
    if (!file) return;

    setPreviewLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load preview');
      }

      setSheetPreviews(data.previews);
      setShowPreview(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleParse = async () => {
    if (!file) {
      setError('Please upload a file');
      return;
    }

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

      const resultWithMappings = applyMappingsToResult(data);
      setParseResult(resultWithMappings);
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const applyMappingsToResult = (result: ParseResult): ParseResult => {
    return {
      ...result,
      sheets: result.sheets.map(sheet => ({
        ...sheet,
        films: sheet.films.map(film => {
          const mapping = mappings.get(film.importTitle.toLowerCase());
          if (mapping && mapping.movie_l0) {
            return {
              ...film,
              mappedMovieId: mapping.movie_l0.id,
              mappedMovieName: mapping.movie_l0.original_title,
            };
          }
          return film;
        }),
      })),
    };
  };

  const searchMovies = async (query: string) => {
    if (query.length < 2) {
      setMovieSearchResults([]);
      return;
    }

    setMovieSearchLoading(true);
    try {
      const { data } = await supabase
        .from('movies_l0')
        .select('id, original_title, production_year, poster_url, imdb_id')
        .or(`original_title.ilike.%${query}%,imdb_id.ilike.%${query}%`)
        .limit(10);

      if (data) {
        setMovieSearchResults(data);
      }
    } catch (err) {
      console.error('Movie search error:', err);
    } finally {
      setMovieSearchLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (movieSearch) {
        searchMovies(movieSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [movieSearch]);

  const linkFilmToMovie = async (movie: MovieSearchResult) => {
    if (!linkingFilm || !parseResult) return;

    const cinemaGroupId = selectionMode === 'cinema'
      ? (selectedCinema?.cinema_group_id || '')
      : selectedCinemaGroupId;

    if (!cinemaGroupId) {
      setError('Could not determine cinema group');
      return;
    }

    try {
      const response = await fetch('/api/import/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cinema_group_id: cinemaGroupId,
          import_title: linkingFilm.film.importTitle,
          movie_l0_id: movie.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create mapping');
      }

      const updatedSheets = parseResult.sheets.map((sheet, sheetIdx) => {
        if (sheetIdx === linkingFilm.sheetIndex) {
          return {
            ...sheet,
            films: sheet.films.map((film, filmIdx) => {
              if (filmIdx === linkingFilm.filmIndex) {
                return {
                  ...film,
                  mappedMovieId: movie.id,
                  mappedMovieName: movie.original_title,
                  isNewMapping: true,
                };
              }
              return film;
            }),
          };
        }
        return sheet;
      });

      setParseResult({ ...parseResult, sheets: updatedSheets });

      setMappings(prev => {
        const updated = new Map(prev);
        updated.set(linkingFilm.film.importTitle.toLowerCase(), {
          id: '',
          import_title: linkingFilm.film.importTitle,
          movie_l0_id: movie.id,
          movie_l0: {
            id: movie.id,
            original_title: movie.original_title,
            poster_url: movie.poster_url,
          },
        });
        return updated;
      });

      setShowLinkDialog(false);
      setLinkingFilm(null);
      setMovieSearch('');
      setMovieSearchResults([]);
    } catch (err: any) {
      setError(err.message || 'Failed to link movie');
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

      setSuccess(
        `Import completed! Created ${data.summary.createdConflicts} movies and ${data.summary.createdSessions} sessions for review.`
      );

      setFile(null);
      setParseResult(null);
      setSheetPreviews([]);
    } catch (err: any) {
      setError(err.message || 'Failed to import');
    } finally {
      setLoading(false);
    }
  };

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

  const getMappingStats = () => {
    if (!parseResult) return { mapped: 0, unmapped: 0 };
    let mapped = 0;
    let unmapped = 0;
    parseResult.sheets.forEach(sheet => {
      sheet.films.forEach(film => {
        if (film.mappedMovieId) {
          mapped++;
        } else {
          unmapped++;
        }
      });
    });
    return { mapped, unmapped };
  };

  const mappingStats = getMappingStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import Schedules</h1>
        <p className="text-sm text-slate-500 mt-1">
          Import cinema schedules from Excel files
        </p>
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

      <Tabs defaultValue="upload" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Import History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Schedule File</CardTitle>
              <CardDescription>
                Select a cinema or cinema group and upload an Excel file (.xlsx or .xls)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

              {selectionMode === 'cinema' && (
                <div className="space-y-2">
                  <Label htmlFor="cinema">Cinema</Label>
                  <select
                    id="cinema"
                    value={selectedCinemaId}
                    onChange={(e) => {
                      setSelectedCinemaId(e.target.value);
                      setParseResult(null);
                      const cinema = cinemas.find(c => c.id === e.target.value);
                      if (cinema?.cinema_group_id) {
                        setSelectedCinemaGroupId(cinema.cinema_group_id);
                      }
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
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-slate-500">
                      Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </p>
                    <Button variant="outline" size="sm" onClick={loadPreview} disabled={previewLoading}>
                      {previewLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      Preview Excel
                    </Button>
                  </div>
                )}
              </div>

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
                <div className="grid grid-cols-4 gap-4">
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
                    <div className="text-sm text-slate-500">Sessions</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {mappingStats.mapped}
                    </div>
                    <div className="text-sm text-slate-500">Linked</div>
                  </div>
                </div>

                {mappingStats.unmapped > 0 && (
                  <Alert>
                    <Link2 className="h-4 w-4" />
                    <AlertDescription>
                      {mappingStats.unmapped} film(s) are not linked to existing movies.
                      Click &quot;Link&quot; to associate them with movies in your database.
                      This mapping will be remembered for future imports.
                    </AlertDescription>
                  </Alert>
                )}

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
                            <TableHead>Linked To</TableHead>
                            <TableHead>Language</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead className="text-right">Sessions</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sheet.films.map((film, filmIndex) => (
                            <TableRow key={filmIndex}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{film.movieName}</div>
                                  {film.format && (
                                    <Badge variant="outline" className="mt-1">
                                      {film.format}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {film.mappedMovieName ? (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-sm">{film.mappedMovieName}</span>
                                    {film.isNewMapping && (
                                      <Badge variant="secondary" className="text-xs">new</Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-amber-600 text-sm">Not linked</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {film.versionString || film.language || '-'}
                              </TableCell>
                              <TableCell>
                                {film.duration || (film.durationMinutes ? `${film.durationMinutes}'` : '-')}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{film.showingCount}</Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant={film.mappedMovieId ? 'ghost' : 'outline'}
                                  onClick={() => {
                                    setLinkingFilm({ sheetIndex, filmIndex, film });
                                    setMovieSearch(film.movieName);
                                    setShowLinkDialog(true);
                                  }}
                                >
                                  <Link2 className="h-4 w-4 mr-1" />
                                  {film.mappedMovieId ? 'Relink' : 'Link'}
                                </Button>
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
                          Import {parseResult.summary.totalFilms} Films ({parseResult.summary.totalShowings} Sessions)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

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

      {/* Excel Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Excel Preview</DialogTitle>
            <DialogDescription>
              Detected {sheetPreviews[activePreviewSheet]?.movies?.length || 0} movies with sessions
            </DialogDescription>
          </DialogHeader>

          {sheetPreviews.length > 1 && (
            <div className="flex gap-2 border-b pb-2">
              {sheetPreviews.map((sheet, idx) => (
                <Button
                  key={idx}
                  variant={activePreviewSheet === idx ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActivePreviewSheet(idx)}
                >
                  {sheet.name}
                </Button>
              ))}
            </div>
          )}

          {sheetPreviews[activePreviewSheet] && (
            <>
              {/* Detection Summary */}
              <div className="grid grid-cols-3 gap-4 p-3 bg-slate-50 rounded-lg text-sm">
                <div>
                  <span className="text-slate-500">Date Range:</span>
                  <span className="ml-2 font-medium">
                    {sheetPreviews[activePreviewSheet].dateRange
                      ? `${sheetPreviews[activePreviewSheet].dateRange.start} to ${sheetPreviews[activePreviewSheet].dateRange.end}`
                      : 'Not detected'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Days:</span>
                  <span className="ml-2 font-medium">
                    {sheetPreviews[activePreviewSheet].detectedWeekdays.join(', ') || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Movies:</span>
                  <span className="ml-2 font-medium">
                    {sheetPreviews[activePreviewSheet].movies?.length || 0}
                  </span>
                </div>
              </div>

              {/* Detected Movies Table */}
              {sheetPreviews[activePreviewSheet].movies?.length > 0 && (
                <div className="flex-1 overflow-auto border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100">
                        <TableHead className="sticky top-0 bg-slate-100">Film</TableHead>
                        {sheetPreviews[activePreviewSheet].detectedWeekdays.map(day => (
                          <TableHead key={day} className="sticky top-0 bg-slate-100 text-center min-w-[80px]">
                            {day}
                          </TableHead>
                        ))}
                        <TableHead className="sticky top-0 bg-slate-100 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sheetPreviews[activePreviewSheet].movies.map((movie, idx) => {
                        const totalSessions = movie.times.reduce((sum, t) => sum + t.times.length, 0);
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium max-w-[300px] truncate" title={movie.filmName}>
                              {movie.filmName}
                            </TableCell>
                            {sheetPreviews[activePreviewSheet].detectedWeekdays.map(day => {
                              const dayTimes = movie.times.find(t => t.weekday === day);
                              return (
                                <TableCell key={day} className="text-center text-blue-600 text-sm">
                                  {dayTimes?.times.join(' ') || '-'}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-right">
                              <Badge variant="secondary">{totalSessions}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Raw Cells View (collapsible) */}
              <details className="border rounded">
                <summary className="px-3 py-2 cursor-pointer text-sm text-slate-600 hover:bg-slate-50">
                  Raw Excel Data (click to expand)
                </summary>
                <div className="max-h-[200px] overflow-auto">
                  <table className="text-xs border-collapse w-full">
                    <tbody>
                      {sheetPreviews[activePreviewSheet].rawCells?.slice(0, 30).map((row, rowIdx) => (
                        <tr key={rowIdx} className={rowIdx === sheetPreviews[activePreviewSheet].headerRowIndex ? 'bg-slate-100 font-bold' : ''}>
                          {row.slice(0, 15).map((cell, colIdx) => (
                            <td
                              key={colIdx}
                              className={`border px-1 py-0.5 min-w-[60px] max-w-[150px] truncate ${
                                cell.type === 'movie' ? 'bg-green-50 text-green-800 font-medium' :
                                cell.type === 'time' ? 'bg-blue-50 text-blue-800' :
                                cell.type === 'date-range' ? 'bg-amber-50 text-amber-800' :
                                cell.type === 'header' ? 'bg-slate-200' :
                                cell.type === 'empty' ? 'bg-slate-50' : ''
                              }`}
                              title={cell.value}
                            >
                              {cell.value || '\u00A0'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}

          <DialogFooter>
            <Button onClick={() => setShowPreview(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movie Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={(open) => {
        setShowLinkDialog(open);
        if (!open) {
          setLinkingFilm(null);
          setMovieSearch('');
          setMovieSearchResults([]);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link to Movie</DialogTitle>
            <DialogDescription>
              Link &quot;{linkingFilm?.film.importTitle}&quot; to an existing movie.
              This mapping will be saved for future imports.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by movie title or IMDB ID..."
                value={movieSearch}
                onChange={(e) => setMovieSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              {movieSearchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : movieSearchResults.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {movieSearch.length < 2
                    ? 'Type at least 2 characters to search'
                    : 'No movies found'}
                </div>
              ) : (
                <div className="divide-y">
                  {movieSearchResults.map(movie => (
                    <div
                      key={movie.id}
                      className="flex items-center gap-4 p-3 hover:bg-slate-50 cursor-pointer"
                      onClick={() => linkFilmToMovie(movie)}
                    >
                      {movie.poster_url ? (
                        <img
                          src={movie.poster_url}
                          alt=""
                          className="w-12 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-slate-200 rounded flex items-center justify-center">
                          <Film className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{movie.original_title}</div>
                        <div className="text-sm text-slate-500">
                          {movie.production_year && `(${movie.production_year})`}
                          {movie.imdb_id && ` • ${movie.imdb_id}`}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Link2 className="h-4 w-4 mr-1" />
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
