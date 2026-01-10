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
  FileOutput, Download, Play, Eye, Calendar, Building2, Film,
  AlertCircle, CheckCircle, Loader2,
} from 'lucide-react';

interface ExportClient {
  id: string;
  name: string;
  slug: string;
  templates: ExportTemplate[];
}

interface ExportTemplate {
  id: string;
  name: string;
  format: 'xml' | 'json' | 'csv';
  description: string | null;
  is_active: boolean;
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

export default function ExportPage() {
  const { hasPermission } = useUser();
  const supabase = createClient();

  const canExport = hasPermission('export_clients:read');

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [clients, setClients] = useState<ExportClient[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [cinemaGroups, setCinemaGroups] = useState<CinemaGroup[]>([]);

  // Form state
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'cinema_group' | 'cinema'>('all');
  const [selectedCinemaGroup, setSelectedCinemaGroup] = useState('');
  const [selectedCinema, setSelectedCinema] = useState('');

  // Results
  const [preview, setPreview] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // Set default date range (current week)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 3); // Start from Wednesday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    setDateFrom(startOfWeek.toISOString().split('T')[0]);
    setDateTo(endOfWeek.toISOString().split('T')[0]);
  }, []);

  async function fetchData() {
    setLoading(true);

    // Fetch export clients with templates
    const { data: clientsData } = await supabase
      .from('export_clients')
      .select(`
        id,
        name,
        slug,
        templates:export_templates(id, name, format, description, is_active)
      `)
      .eq('is_active', true)
      .order('name');

    if (clientsData) {
      const filtered = clientsData
        .map(c => ({
          ...c,
          templates: c.templates?.filter((t: ExportTemplate) => t.is_active) || []
        }))
        .filter(c => c.templates.length > 0);
      setClients(filtered as ExportClient[]);
    }

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

  const selectedClientData = clients.find(c => c.id === selectedClient);
  const selectedTemplateData = selectedClientData?.templates.find(t => t.id === selectedTemplate);

  async function handlePreview() {
    if (!selectedTemplate || !dateFrom || !dateTo) {
      setExportError('Please select a template and date range');
      return;
    }

    setExporting(true);
    setExportError(null);
    setPreview(null);

    try {
      const params = new URLSearchParams({
        template_id: selectedTemplate,
        date_from: dateFrom,
        date_to: dateTo,
        preview: 'true',
      });

      if (filterType === 'cinema_group' && selectedCinemaGroup) {
        params.set('cinema_group_id', selectedCinemaGroup);
      } else if (filterType === 'cinema' && selectedCinema) {
        params.set('cinema_id', selectedCinema);
      }

      const response = await fetch(`/api/export/execute?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      const data = await response.text();
      setPreview(data);
      setExportSuccess('Preview generated successfully');
    } catch (error: any) {
      setExportError(error.message || 'Failed to generate preview');
    } finally {
      setExporting(false);
    }
  }

  async function handleDownload() {
    if (!selectedTemplate || !dateFrom || !dateTo) {
      setExportError('Please select a template and date range');
      return;
    }

    setExporting(true);
    setExportError(null);

    try {
      const params = new URLSearchParams({
        template_id: selectedTemplate,
        date_from: dateFrom,
        date_to: dateTo,
      });

      if (filterType === 'cinema_group' && selectedCinemaGroup) {
        params.set('cinema_group_id', selectedCinemaGroup);
      } else if (filterType === 'cinema' && selectedCinema) {
        params.set('cinema_id', selectedCinema);
      }

      const response = await fetch(`/api/export/execute?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      const data = await response.text();
      const format = selectedTemplateData?.format || 'xml';
      const filename = `export-${selectedClientData?.slug}-${dateFrom}-to-${dateTo}.${format}`;

      // Create download
      const blob = new Blob([data], { type: getContentType(format) });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess('Export downloaded successfully');
    } catch (error: any) {
      setExportError(error.message || 'Failed to download export');
    } finally {
      setExporting(false);
    }
  }

  function getContentType(format: string): string {
    switch (format) {
      case 'xml': return 'application/xml';
      case 'json': return 'application/json';
      case 'csv': return 'text/csv';
      default: return 'text/plain';
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Export</h1>
        <p className="text-sm text-slate-500 mt-1">
          Generate and download screening data exports for clients
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Export Configuration</CardTitle>
            <CardDescription>Select client, template, and filters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {exportError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{exportError}</AlertDescription>
              </Alert>
            )}
            {exportSuccess && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{exportSuccess}</AlertDescription>
              </Alert>
            )}

            {clients.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No export clients configured. Please add export clients and templates in Administration.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="client">Export Client *</Label>
                  <select
                    id="client"
                    value={selectedClient}
                    onChange={(e) => {
                      setSelectedClient(e.target.value);
                      setSelectedTemplate('');
                      setPreview(null);
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select client...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>

                {selectedClient && (
                  <div className="space-y-2">
                    <Label htmlFor="template">Template *</Label>
                    <select
                      id="template"
                      value={selectedTemplate}
                      onChange={(e) => {
                        setSelectedTemplate(e.target.value);
                        setPreview(null);
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Select template...</option>
                      {selectedClientData?.templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.format.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_from">Date From *</Label>
                    <Input
                      id="date_from"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_to">Date To *</Label>
                    <Input
                      id="date_to"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Filter By</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="filter_type"
                        value="all"
                        checked={filterType === 'all'}
                        onChange={() => setFilterType('all')}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">All Cinemas</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="filter_type"
                        value="cinema_group"
                        checked={filterType === 'cinema_group'}
                        onChange={() => setFilterType('cinema_group')}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Cinema Group</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="filter_type"
                        value="cinema"
                        checked={filterType === 'cinema'}
                        onChange={() => setFilterType('cinema')}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Specific Cinema</span>
                    </label>
                  </div>
                </div>

                {filterType === 'cinema_group' && (
                  <div className="space-y-2">
                    <Label htmlFor="cinema_group">Cinema Group</Label>
                    <select
                      id="cinema_group"
                      value={selectedCinemaGroup}
                      onChange={(e) => setSelectedCinemaGroup(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Select cinema group...</option>
                      {cinemaGroups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {filterType === 'cinema' && (
                  <div className="space-y-2">
                    <Label htmlFor="cinema">Cinema</Label>
                    <select
                      id="cinema"
                      value={selectedCinema}
                      onChange={(e) => setSelectedCinema(e.target.value)}
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

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handlePreview}
                    variant="outline"
                    disabled={!selectedTemplate || !dateFrom || !dateTo || exporting}
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    Preview
                  </Button>
                  <Button
                    onClick={handleDownload}
                    disabled={!selectedTemplate || !dateFrom || !dateTo || exporting}
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Download
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Preview
              {selectedTemplateData && (
                <Badge variant="outline">{selectedTemplateData.format.toUpperCase()}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Export preview (first 100 records)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preview ? (
              <pre className="bg-slate-50 border rounded-lg p-4 overflow-auto max-h-[500px] text-xs font-mono">
                {preview}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileOutput className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm">Click "Preview" to see export output</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
