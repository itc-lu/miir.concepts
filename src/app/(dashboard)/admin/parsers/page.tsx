'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  Languages,
  TestTube,
  Play,
} from 'lucide-react';

interface Parser {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  supported_formats: string[];
  is_active: boolean;
}

interface LanguageMappingConfig {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  lines?: LanguageMappingLine[];
}

interface LanguageMappingLine {
  id: string;
  config_id: string;
  version_string: string;
  spoken_language_id: string | null;
  subtitle_language_ids: string[];
  notes: string | null;
}

interface Language {
  id: string;
  code: string;
  name: string;
}

interface Cinema {
  id: string;
  name: string;
  parser_id: string | null;
  cinema_group?: {
    name: string;
    parser_id: string | null;
  };
}

export default function ParsersAdminPage() {
  const { hasPermission } = useUser();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState('parsers');
  const [parsers, setParsers] = useState<Parser[]>([]);
  const [mappings, setMappings] = useState<LanguageMappingConfig[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loading, setLoading] = useState(true);

  // Test state
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testCinemaId, setTestCinemaId] = useState('');
  const [testFile, setTestFile] = useState<File | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // Mapping dialog state
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<LanguageMappingConfig | null>(null);
  const [newLineVersionString, setNewLineVersionString] = useState('');
  const [newLineSpokenLangId, setNewLineSpokenLangId] = useState('');
  const [newLineSubtitleIds, setNewLineSubtitleIds] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    const [parsersRes, mappingsRes, languagesRes, cinemasRes] = await Promise.all([
      supabase.from('parsers').select('*').order('name'),
      supabase
        .from('language_mapping_configs')
        .select(`*, lines:language_mapping_lines(*)`)
        .order('name'),
      supabase.from('languages').select('*').eq('is_active', true).order('name'),
      supabase
        .from('cinemas')
        .select(`id, name, parser_id, cinema_group:cinema_groups(name, parser_id)`)
        .eq('is_active', true)
        .order('name'),
    ]);

    if (parsersRes.data) setParsers(parsersRes.data);
    if (mappingsRes.data) setMappings(mappingsRes.data);
    if (languagesRes.data) setLanguages(languagesRes.data);
    if (cinemasRes.data) {
      // Transform cinema_group from array to single object
      const transformedCinemas = cinemasRes.data.map((cinema: any) => ({
        ...cinema,
        cinema_group: Array.isArray(cinema.cinema_group)
          ? cinema.cinema_group[0]
          : cinema.cinema_group,
      }));
      setCinemas(transformedCinemas);
    }

    setLoading(false);
  }

  const handleTestParse = async () => {
    if (!testFile || !testCinemaId) {
      setTestError('Please select a cinema and upload a file');
      return;
    }

    setTesting(true);
    setTestError(null);
    setTestResult(null);

    try {
      const formData = new FormData();
      formData.append('file', testFile);
      formData.append('cinema_id', testCinemaId);

      const response = await fetch('/api/import/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse file');
      }

      setTestResult(data);
    } catch (err: any) {
      setTestError(err.message || 'Failed to parse file');
    } finally {
      setTesting(false);
    }
  };

  const handleAddMappingLine = async () => {
    if (!selectedMapping || !newLineVersionString) return;

    try {
      const { error } = await supabase.from('language_mapping_lines').insert({
        config_id: selectedMapping.id,
        version_string: newLineVersionString,
        spoken_language_id: newLineSpokenLangId || null,
        subtitle_language_ids: newLineSubtitleIds,
      });

      if (error) throw error;

      // Refresh data
      fetchData();
      setNewLineVersionString('');
      setNewLineSpokenLangId('');
      setNewLineSubtitleIds([]);
    } catch (err: any) {
      console.error('Failed to add mapping line:', err);
    }
  };

  const handleDeleteMappingLine = async (lineId: string) => {
    try {
      await supabase.from('language_mapping_lines').delete().eq('id', lineId);
      fetchData();
    } catch (err: any) {
      console.error('Failed to delete mapping line:', err);
    }
  };

  const cinemasWithParser = cinemas.filter(c => c.parser_id || c.cinema_group?.parser_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Parsers & Language Mappings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure import parsers and version string mappings
          </p>
        </div>
        <Button onClick={() => setTestDialogOpen(true)}>
          <TestTube className="h-4 w-4 mr-2" />
          Test Parser
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="parsers">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Parsers
          </TabsTrigger>
          <TabsTrigger value="mappings">
            <Languages className="h-4 w-4 mr-2" />
            Language Mappings
          </TabsTrigger>
        </TabsList>

        {/* Parsers Tab */}
        <TabsContent value="parsers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Parsers</CardTitle>
              <CardDescription>
                Parsers for different cinema schedule formats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Formats</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Used By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsers.map(parser => {
                    const usingCinemas = cinemas.filter(
                      c => c.parser_id === parser.id || c.cinema_group?.parser_id === parser.id
                    );

                    return (
                      <TableRow key={parser.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{parser.name}</div>
                            {parser.description && (
                              <div className="text-xs text-slate-500">{parser.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {parser.slug}
                          </code>
                        </TableCell>
                        <TableCell>
                          {parser.supported_formats?.map(fmt => (
                            <Badge key={fmt} variant="outline" className="mr-1">
                              {fmt}
                            </Badge>
                          ))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={parser.is_active ? 'default' : 'secondary'}>
                            {parser.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {usingCinemas.length > 0 ? (
                            <span className="text-sm text-slate-600">
                              {usingCinemas.length} cinema{usingCinemas.length > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">Not used</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Language Mappings Tab */}
        <TabsContent value="mappings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Language Mapping Configurations</CardTitle>
              <CardDescription>
                Map version strings (e.g., "VO st FR&NL") to spoken and subtitle languages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mappings.map(mapping => (
                <div key={mapping.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        {mapping.name}
                        {mapping.is_default && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </h3>
                      {mapping.description && (
                        <p className="text-sm text-slate-500">{mapping.description}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMapping(mapping);
                        setMappingDialogOpen(true);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Lines
                    </Button>
                  </div>

                  {mapping.lines && mapping.lines.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Version String</TableHead>
                          <TableHead>Spoken Language</TableHead>
                          <TableHead>Subtitle Languages</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mapping.lines.slice(0, 5).map(line => (
                          <TableRow key={line.id}>
                            <TableCell>
                              <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                                {line.version_string}
                              </code>
                            </TableCell>
                            <TableCell>
                              {line.spoken_language_id
                                ? languages.find(l => l.id === line.spoken_language_id)?.name || 'Unknown'
                                : <span className="text-slate-400">Original (VO)</span>}
                            </TableCell>
                            <TableCell>
                              {line.subtitle_language_ids?.length > 0
                                ? line.subtitle_language_ids
                                    .map(id => languages.find(l => l.id === id)?.code)
                                    .filter(Boolean)
                                    .join(', ')
                                : '-'}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {line.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-slate-400">No mapping lines configured</p>
                  )}

                  {mapping.lines && mapping.lines.length > 5 && (
                    <p className="text-sm text-slate-500 mt-2">
                      + {mapping.lines.length - 5} more lines
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Parser Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Parser</DialogTitle>
            <DialogDescription>
              Test a parser by uploading a sample file
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cinema Selection */}
            <div className="space-y-2">
              <Label htmlFor="test-cinema">Cinema</Label>
              <select
                id="test-cinema"
                value={testCinemaId}
                onChange={(e) => setTestCinemaId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select a cinema with a parser...</option>
                {cinemasWithParser.map(cinema => (
                  <option key={cinema.id} value={cinema.id}>
                    {cinema.name}
                    {cinema.cinema_group ? ` (${cinema.cinema_group.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="test-file">Test File</Label>
              <Input
                id="test-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setTestFile(e.target.files?.[0] || null)}
              />
            </div>

            {/* Test Button */}
            <Button
              onClick={handleTestParse}
              disabled={!testFile || !testCinemaId || testing}
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Test
                </>
              )}
            </Button>

            {/* Error */}
            {testError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{testError}</AlertDescription>
              </Alert>
            )}

            {/* Results */}
            {testResult && (
              <div className="space-y-4">
                <Alert variant={testResult.success ? 'default' : 'destructive'}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    Parser: {testResult.parser?.name} | Films: {testResult.summary?.totalFilms} |
                    Showings: {testResult.summary?.totalShowings}
                  </AlertDescription>
                </Alert>

                {testResult.errors?.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <ul className="list-disc list-inside text-sm">
                        {testResult.errors.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {testResult.sheets?.map((sheet: any, sheetIndex: number) => (
                  <div key={sheetIndex} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">
                      {sheet.sheetName} ({sheet.filmCount} films)
                    </h4>
                    <div className="max-h-60 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Film</TableHead>
                            <TableHead>Language</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Showings</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sheet.films?.slice(0, 10).map((film: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm">
                                {film.movieName}
                              </TableCell>
                              <TableCell className="text-sm">
                                {film.versionString || film.language || '-'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {film.duration || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{film.showingCount}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {sheet.films?.length > 10 && (
                        <p className="text-sm text-slate-500 mt-2">
                          + {sheet.films.length - 10} more films
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mapping Edit Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Language Mapping: {selectedMapping?.name}</DialogTitle>
            <DialogDescription>
              Add or remove version string mappings
            </DialogDescription>
          </DialogHeader>

          {selectedMapping && (
            <div className="space-y-4">
              {/* Add new line */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Add New Mapping</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Version String</Label>
                      <Input
                        placeholder="e.g., VO st FR&NL"
                        value={newLineVersionString}
                        onChange={(e) => setNewLineVersionString(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Spoken Language</Label>
                      <select
                        value={newLineSpokenLangId}
                        onChange={(e) => setNewLineSpokenLangId(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="">Original (VO)</option>
                        {languages.map(lang => (
                          <option key={lang.id} value={lang.id}>
                            {lang.name} ({lang.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Subtitle Languages</Label>
                    <div className="flex flex-wrap gap-1">
                      {languages.map(lang => (
                        <Badge
                          key={lang.id}
                          variant={newLineSubtitleIds.includes(lang.id) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            setNewLineSubtitleIds(prev =>
                              prev.includes(lang.id)
                                ? prev.filter(id => id !== lang.id)
                                : [...prev, lang.id]
                            );
                          }}
                        >
                          {lang.code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddMappingLine}
                    disabled={!newLineVersionString}
                  >
                    Add Mapping
                  </Button>
                </CardContent>
              </Card>

              {/* Existing lines */}
              {selectedMapping.lines && selectedMapping.lines.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version String</TableHead>
                      <TableHead>Spoken</TableHead>
                      <TableHead>Subtitles</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedMapping.lines.map(line => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <code className="text-xs">{line.version_string}</code>
                        </TableCell>
                        <TableCell>
                          {line.spoken_language_id
                            ? languages.find(l => l.id === line.spoken_language_id)?.code
                            : 'VO'}
                        </TableCell>
                        <TableCell>
                          {line.subtitle_language_ids
                            ?.map(id => languages.find(l => l.id === id)?.code)
                            .filter(Boolean)
                            .join(', ') || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => handleDeleteMappingLine(line.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
