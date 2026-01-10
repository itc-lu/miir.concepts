'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Eye, EyeOff, RefreshCw, CheckCircle, XCircle, Loader2, Key, Settings2 } from 'lucide-react';

interface SystemSetting {
  key: string;
  value: string | null;
  description: string | null;
  is_secret: boolean;
  updated_at: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [testingTmdb, setTestingTmdb] = useState(false);
  const [tmdbTestResult, setTmdbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key');

    if (data) {
      setSettings(data);
      const values: Record<string, string> = {};
      data.forEach(s => {
        values[s.key] = s.value || '';
      });
      setEditValues(values);
    }
    setLoading(false);
  }

  async function saveSetting(key: string) {
    setSaving(key);
    const { error } = await supabase
      .from('system_settings')
      .update({
        value: editValues[key],
        updated_at: new Date().toISOString(),
      })
      .eq('key', key);

    if (!error) {
      setSettings(prev =>
        prev.map(s =>
          s.key === key ? { ...s, value: editValues[key], updated_at: new Date().toISOString() } : s
        )
      );
    }
    setSaving(null);
  }

  async function testTmdbApiKey() {
    setTestingTmdb(true);
    setTmdbTestResult(null);

    try {
      const apiKey = editValues['tmdb_api_key'];
      if (!apiKey) {
        setTmdbTestResult({ success: false, message: 'No API key provided' });
        setTestingTmdb(false);
        return;
      }

      const response = await fetch(
        `https://api.themoviedb.org/3/movie/550?api_key=${apiKey}`
      );

      if (response.ok) {
        const data = await response.json();
        setTmdbTestResult({
          success: true,
          message: `API key works! Test movie: "${data.title}" (${data.release_date?.split('-')[0]})`,
        });
      } else if (response.status === 401) {
        setTmdbTestResult({ success: false, message: 'Invalid API key' });
      } else {
        setTmdbTestResult({ success: false, message: `API error: ${response.status}` });
      }
    } catch (error) {
      setTmdbTestResult({ success: false, message: 'Network error - could not connect to TMDB' });
    }
    setTestingTmdb(false);
  }

  const apiSettings = settings.filter(s => s.key.includes('api_key'));
  const generalSettings = settings.filter(s => !s.key.includes('api_key'));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">
          Configure API keys and application settings
        </p>
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api" className="gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Settings2 className="h-4 w-4" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-6">
          {/* TMDB API Key */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                TMDB API Key
                <Badge variant="outline" className="font-normal">Optional</Badge>
              </CardTitle>
              <CardDescription>
                Get your free API key from{' '}
                <a
                  href="https://www.themoviedb.org/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  themoviedb.org
                </a>
                . Used for movie data lookup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tmdb_api_key">API Key (v3 auth)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="tmdb_api_key"
                      type={showSecrets['tmdb_api_key'] ? 'text' : 'password'}
                      value={editValues['tmdb_api_key'] || ''}
                      onChange={e => setEditValues(prev => ({ ...prev, tmdb_api_key: e.target.value }))}
                      placeholder="Enter your TMDB API key"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowSecrets(prev => ({ ...prev, tmdb_api_key: !prev.tmdb_api_key }))}
                    >
                      {showSecrets['tmdb_api_key'] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={testTmdbApiKey}
                    disabled={testingTmdb || !editValues['tmdb_api_key']}
                  >
                    {testingTmdb ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2">Test</span>
                  </Button>
                  <Button
                    onClick={() => saveSetting('tmdb_api_key')}
                    disabled={saving === 'tmdb_api_key'}
                  >
                    {saving === 'tmdb_api_key' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="ml-2">Save</span>
                  </Button>
                </div>
              </div>

              {tmdbTestResult && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-md ${
                    tmdbTestResult.success
                      ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}
                >
                  {tmdbTestResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span className="text-sm">{tmdbTestResult.message}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Note: IMDB lookup via imdbapi.dev is always available (free, no API key required).
                TMDB provides additional data like translations and higher quality images.
              </p>
            </CardContent>
          </Card>

          {/* IMDB API Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                IMDB API
                <Badge variant="secondary" className="font-normal">Free</Badge>
              </CardTitle>
              <CardDescription>
                Using <a href="https://imdbapi.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">imdbapi.dev</a> -
                Free IMDB data API, no configuration needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">IMDB API is automatically available - no API key required</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>General configuration options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {generalSettings.map(setting => (
                <div key={setting.key} className="space-y-2">
                  <Label htmlFor={setting.key}>
                    {setting.key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={setting.key}
                      value={editValues[setting.key] || ''}
                      onChange={e => setEditValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                    />
                    <Button
                      onClick={() => saveSetting(setting.key)}
                      disabled={saving === setting.key}
                    >
                      {saving === setting.key ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {setting.description && (
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
