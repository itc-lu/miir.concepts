'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft, Save, Film, CheckCircle, AlertCircle, Trash2, X, Plus, Upload,
  Search, Download, ExternalLink, User, Video, Image as ImageIcon,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { TMDBLookup, TMDBIdLookup, TMDBMovieData } from '@/components/movies/tmdb-lookup';
import { generateSlug } from '@/lib/utils';

interface Genre {
  id: string;
  code: string;
  name: string;
}

interface Country {
  id: string;
  code: string;
  name: string;
}

interface Person {
  id: string;
  name: string;
  slug: string;
  tmdb_id?: number;
}

interface MovieTag {
  id: string;
  name: string;
  color: string | null;
}

export default function EditMoviePage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;
  const supabase = createClient();
  const { hasPermission } = useUser();

  const canDelete = hasPermission('movies:delete');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'crew' | 'media' | 'plots'>('basic');

  // Form data - L0
  const [formData, setFormData] = useState({
    original_title: '',
    production_year: '',
    runtime_minutes: '',
    poster_url: '',
    backdrop_url: '',
    trailer_url: '',
    imdb_id: '',
    tmdb_id: '',
    status: 'draft',
    notes: '',
  });

  // Plots in 4 languages
  const [plots, setPlots] = useState({
    en: '',
    de: '',
    fr: '',
    lu: '',
  });

  // Reference data
  const [genres, setGenres] = useState<Genre[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [movieTags, setMovieTags] = useState<MovieTag[]>([]);

  // Selected items
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [primaryCountry, setPrimaryCountry] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Crew & Cast
  const [directors, setDirectors] = useState<Array<{ person_id: string; name: string }>>([]);
  const [screenplay, setScreenplay] = useState<Array<{ person_id: string; name: string }>>([]);
  const [music, setMusic] = useState<Array<{ person_id: string; name: string }>>([]);
  const [cast, setCast] = useState<Array<{ person_id: string; name: string; character: string }>>([]);
  const [productionCompanies, setProductionCompanies] = useState<Array<{ name: string; country_id: string }>>([]);

  // Images/Stills
  const [stills, setStills] = useState<Array<{ id?: string; url: string; type: string }>>([]);

  // People lookup
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [personSearch, setPersonSearch] = useState('');
  const [personSearchResults, setPersonSearchResults] = useState<Person[]>([]);
  const [addingPersonFor, setAddingPersonFor] = useState<'director' | 'screenplay' | 'music' | 'cast' | null>(null);
  const [newPersonName, setNewPersonName] = useState('');
  const [newCastCharacter, setNewCastCharacter] = useState('');

  useEffect(() => {
    fetchData();
  }, [movieId]);

  // Person search
  useEffect(() => {
    if (personSearch.length < 2) {
      setPersonSearchResults([]);
      return;
    }
    const results = allPeople.filter(p =>
      p.name.toLowerCase().includes(personSearch.toLowerCase())
    ).slice(0, 10);
    setPersonSearchResults(results);
  }, [personSearch, allPeople]);

  async function fetchData() {
    setLoading(true);

    // Fetch reference data
    const [genreRes, countryRes, tagRes, peopleRes] = await Promise.all([
      supabase.from('genres').select('id, code, name').eq('is_active', true).order('display_order'),
      supabase.from('countries').select('id, code, name').order('name'),
      supabase.from('movie_tags').select('id, name, color').eq('is_active', true).order('name'),
      supabase.from('people').select('id, name, slug, tmdb_id').order('name'),
    ]);

    if (genreRes.data) setGenres(genreRes.data);
    if (countryRes.data) setCountries(countryRes.data);
    if (tagRes.data) setMovieTags(tagRes.data);
    if (peopleRes.data) setAllPeople(peopleRes.data);

    // Fetch movie
    const { data: movie } = await supabase
      .from('movies_l0')
      .select('*')
      .eq('id', movieId)
      .single();

    if (movie) {
      setFormData({
        original_title: movie.original_title,
        production_year: movie.production_year?.toString() || '',
        runtime_minutes: movie.runtime_minutes?.toString() || '',
        poster_url: movie.poster_url || '',
        backdrop_url: movie.backdrop_url || '',
        trailer_url: movie.trailer_url || '',
        imdb_id: movie.imdb_id || '',
        tmdb_id: movie.tmdb_id?.toString() || '',
        status: movie.status,
        notes: movie.notes || '',
      });
    }

    // Fetch movie genres
    const { data: movieGenres } = await supabase
      .from('movie_l0_genres')
      .select('genre_id')
      .eq('movie_id', movieId);

    if (movieGenres) {
      setSelectedGenres(movieGenres.map(g => g.genre_id));
    }

    // Fetch movie countries
    const { data: movieCountries } = await supabase
      .from('movie_l0_countries')
      .select('country_id, is_primary')
      .eq('movie_id', movieId);

    if (movieCountries) {
      setSelectedCountries(movieCountries.map(c => c.country_id));
      const primary = movieCountries.find(c => c.is_primary);
      if (primary) setPrimaryCountry(primary.country_id);
    }

    // Fetch movie tags
    const { data: movieTagsData } = await supabase
      .from('movie_l0_tags')
      .select('tag_id')
      .eq('movie_id', movieId);

    if (movieTagsData) {
      setSelectedTags(movieTagsData.map(t => t.tag_id));
    }

    // Fetch crew
    const { data: crewData } = await supabase
      .from('movie_l0_crew')
      .select('person_id, role, person:people(name)')
      .eq('movie_id', movieId);

    if (crewData) {
      setDirectors(crewData.filter(c => c.role === 'director').map(c => ({
        person_id: c.person_id,
        name: (c.person as any)?.name || ''
      })));
      setScreenplay(crewData.filter(c => c.role === 'screenplay').map(c => ({
        person_id: c.person_id,
        name: (c.person as any)?.name || ''
      })));
      setMusic(crewData.filter(c => c.role === 'music').map(c => ({
        person_id: c.person_id,
        name: (c.person as any)?.name || ''
      })));
    }

    // Fetch cast
    const { data: castData } = await supabase
      .from('movie_l0_cast')
      .select('person_id, character_name, person:people(name)')
      .eq('movie_id', movieId)
      .order('billing_order');

    if (castData) {
      setCast(castData.map(c => ({
        person_id: c.person_id,
        name: (c.person as any)?.name || '',
        character: c.character_name || ''
      })));
    }

    // Fetch production companies
    const { data: companiesData } = await supabase
      .from('movie_l0_companies')
      .select('company_name, company_country_id')
      .eq('movie_id', movieId);

    if (companiesData) {
      setProductionCompanies(companiesData.map(c => ({
        name: c.company_name,
        country_id: c.company_country_id || ''
      })));
    }

    // Fetch images/stills
    const { data: imagesData } = await supabase
      .from('movie_l0_images')
      .select('id, image_url, image_type')
      .eq('movie_id', movieId)
      .order('display_order');

    if (imagesData) {
      setStills(imagesData.map(i => ({
        id: i.id,
        url: i.image_url,
        type: i.image_type
      })));
    }

    // Fetch plots from L1 records
    const { data: l1Data } = await supabase
      .from('movies_l1')
      .select('language:languages(code), plot')
      .eq('movie_l0_id', movieId);

    if (l1Data) {
      const newPlots = { ...plots };
      l1Data.forEach((l1: any) => {
        const langCode = l1.language?.code;
        if (langCode && ['en', 'de', 'fr', 'lb'].includes(langCode)) {
          const key = langCode === 'lb' ? 'lu' : langCode;
          newPlots[key as keyof typeof newPlots] = l1.plot || '';
        }
      });
      setPlots(newPlots);
    }

    setLoading(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function toggleGenre(genreId: string) {
    setSelectedGenres(prev =>
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  }

  function toggleCountry(countryId: string) {
    setSelectedCountries(prev => {
      if (prev.includes(countryId)) {
        if (primaryCountry === countryId) setPrimaryCountry(null);
        return prev.filter(id => id !== countryId);
      }
      return [...prev, countryId];
    });
  }

  function toggleTag(tagId: string) {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  }

  // Handle TMDB data import
  async function handleTMDBImport(data: TMDBMovieData) {
    // Only populate empty fields
    setFormData(prev => ({
      ...prev,
      original_title: prev.original_title || data.original_title,
      production_year: prev.production_year || (data.production_year?.toString() || ''),
      runtime_minutes: prev.runtime_minutes || (data.runtime_minutes?.toString() || ''),
      poster_url: prev.poster_url || data.poster_url || '',
      backdrop_url: prev.backdrop_url || data.backdrop_url || '',
      trailer_url: prev.trailer_url || data.trailer_url || '',
      imdb_id: prev.imdb_id || data.imdb_id || '',
      tmdb_id: prev.tmdb_id || data.tmdb_id.toString(),
    }));

    // Import plots only if empty
    setPlots(prev => ({
      en: prev.en || data.plots.en,
      de: prev.de || data.plots.de,
      fr: prev.fr || data.plots.fr,
      lu: prev.lu || data.plots.lu,
    }));

    // Match genres by name
    if (selectedGenres.length === 0 && data.genres.length > 0) {
      const matchedGenres = genres
        .filter(g => data.genres.some(dg =>
          dg.toLowerCase() === g.name.toLowerCase() ||
          dg.toLowerCase() === g.code.toLowerCase()
        ))
        .map(g => g.id);
      setSelectedGenres(matchedGenres);
    }

    // Match countries
    if (selectedCountries.length === 0 && data.production_countries.length > 0) {
      const matchedCountries = countries
        .filter(c => data.production_countries.includes(c.code))
        .map(c => c.id);
      setSelectedCountries(matchedCountries);
      if (matchedCountries.length > 0) {
        setPrimaryCountry(matchedCountries[0]);
      }
    }

    // Import production companies
    if (productionCompanies.length === 0 && data.production_companies.length > 0) {
      const newCompanies = data.production_companies.slice(0, 5).map(c => ({
        name: c.name,
        country_id: countries.find(co => co.code === c.country)?.id || ''
      }));
      setProductionCompanies(newCompanies);
    }

    // Import crew and cast (create people records as needed)
    await importPeople(data);

    setSuccess('Data imported from TMDB. Review and save changes.');
  }

  async function importPeople(data: TMDBMovieData) {
    // Helper to find or create person
    async function getOrCreatePerson(name: string, tmdbId?: number): Promise<string> {
      // Check if exists
      let person = allPeople.find(p =>
        p.name.toLowerCase() === name.toLowerCase() ||
        (tmdbId && p.tmdb_id === tmdbId)
      );

      if (person) return person.id;

      // Create new person
      const slug = generateSlug(name);
      const { data: newPerson, error } = await supabase
        .from('people')
        .insert({ name, slug, tmdb_id: tmdbId || null })
        .select()
        .single();

      if (newPerson) {
        setAllPeople(prev => [...prev, newPerson]);
        return newPerson.id;
      }

      return '';
    }

    // Import directors
    if (directors.length === 0 && data.directors.length > 0) {
      const newDirectors = [];
      for (const d of data.directors.slice(0, 3)) {
        const personId = await getOrCreatePerson(d.name, d.id);
        if (personId) newDirectors.push({ person_id: personId, name: d.name });
      }
      setDirectors(newDirectors);
    }

    // Import screenplay
    if (screenplay.length === 0 && data.screenplay.length > 0) {
      const newScreenplay = [];
      for (const s of data.screenplay.slice(0, 3)) {
        const personId = await getOrCreatePerson(s.name, s.id);
        if (personId) newScreenplay.push({ person_id: personId, name: s.name });
      }
      setScreenplay(newScreenplay);
    }

    // Import music
    if (music.length === 0 && data.music.length > 0) {
      const newMusic = [];
      for (const m of data.music.slice(0, 2)) {
        const personId = await getOrCreatePerson(m.name, m.id);
        if (personId) newMusic.push({ person_id: personId, name: m.name });
      }
      setMusic(newMusic);
    }

    // Import cast
    if (cast.length === 0 && data.cast.length > 0) {
      const newCast = [];
      for (const c of data.cast.slice(0, 10)) {
        const personId = await getOrCreatePerson(c.name, c.id);
        if (personId) newCast.push({ person_id: personId, name: c.name, character: c.character });
      }
      setCast(newCast);
    }
  }

  async function addPerson(type: 'director' | 'screenplay' | 'music' | 'cast', personId: string, name: string, character?: string) {
    const entry = { person_id: personId, name };

    switch (type) {
      case 'director':
        if (!directors.some(d => d.person_id === personId)) {
          setDirectors(prev => [...prev, entry]);
        }
        break;
      case 'screenplay':
        if (!screenplay.some(s => s.person_id === personId)) {
          setScreenplay(prev => [...prev, entry]);
        }
        break;
      case 'music':
        if (!music.some(m => m.person_id === personId)) {
          setMusic(prev => [...prev, entry]);
        }
        break;
      case 'cast':
        if (!cast.some(c => c.person_id === personId)) {
          setCast(prev => [...prev, { ...entry, character: character || '' }]);
        }
        break;
    }

    setAddingPersonFor(null);
    setPersonSearch('');
    setNewPersonName('');
    setNewCastCharacter('');
  }

  async function createAndAddPerson(type: 'director' | 'screenplay' | 'music' | 'cast') {
    if (!newPersonName.trim()) return;

    const slug = generateSlug(newPersonName);
    const { data: newPerson, error } = await supabase
      .from('people')
      .insert({ name: newPersonName, slug })
      .select()
      .single();

    if (newPerson) {
      setAllPeople(prev => [...prev, newPerson]);
      await addPerson(type, newPerson.id, newPerson.name, type === 'cast' ? newCastCharacter : undefined);
    }
  }

  function removePerson(type: 'director' | 'screenplay' | 'music' | 'cast', personId: string) {
    switch (type) {
      case 'director':
        setDirectors(prev => prev.filter(d => d.person_id !== personId));
        break;
      case 'screenplay':
        setScreenplay(prev => prev.filter(s => s.person_id !== personId));
        break;
      case 'music':
        setMusic(prev => prev.filter(m => m.person_id !== personId));
        break;
      case 'cast':
        setCast(prev => prev.filter(c => c.person_id !== personId));
        break;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Update movie
      const { error: updateError } = await supabase
        .from('movies_l0')
        .update({
          original_title: formData.original_title,
          production_year: formData.production_year ? parseInt(formData.production_year) : null,
          runtime_minutes: formData.runtime_minutes ? parseInt(formData.runtime_minutes) : null,
          poster_url: formData.poster_url || null,
          backdrop_url: formData.backdrop_url || null,
          trailer_url: formData.trailer_url || null,
          imdb_id: formData.imdb_id || null,
          tmdb_id: formData.tmdb_id ? parseInt(formData.tmdb_id) : null,
          status: formData.status,
          notes: formData.notes || null,
        })
        .eq('id', movieId);

      if (updateError) throw updateError;

      // Update genres
      await supabase.from('movie_l0_genres').delete().eq('movie_id', movieId);
      if (selectedGenres.length > 0) {
        await supabase.from('movie_l0_genres').insert(
          selectedGenres.map((genreId, index) => ({
            movie_id: movieId,
            genre_id: genreId,
            display_order: index,
          }))
        );
      }

      // Update countries
      await supabase.from('movie_l0_countries').delete().eq('movie_id', movieId);
      if (selectedCountries.length > 0) {
        await supabase.from('movie_l0_countries').insert(
          selectedCountries.map(countryId => ({
            movie_id: movieId,
            country_id: countryId,
            is_primary: countryId === primaryCountry,
          }))
        );
      }

      // Update tags
      await supabase.from('movie_l0_tags').delete().eq('movie_id', movieId);
      if (selectedTags.length > 0) {
        await supabase.from('movie_l0_tags').insert(
          selectedTags.map(tagId => ({
            movie_id: movieId,
            tag_id: tagId,
          }))
        );
      }

      // Update crew
      await supabase.from('movie_l0_crew').delete().eq('movie_id', movieId);
      const crewInserts = [
        ...directors.map((d, i) => ({ movie_id: movieId, person_id: d.person_id, role: 'director', credit_order: i })),
        ...screenplay.map((s, i) => ({ movie_id: movieId, person_id: s.person_id, role: 'screenplay', credit_order: i })),
        ...music.map((m, i) => ({ movie_id: movieId, person_id: m.person_id, role: 'music', credit_order: i })),
      ];
      if (crewInserts.length > 0) {
        await supabase.from('movie_l0_crew').insert(crewInserts);
      }

      // Update cast
      await supabase.from('movie_l0_cast').delete().eq('movie_id', movieId);
      if (cast.length > 0) {
        await supabase.from('movie_l0_cast').insert(
          cast.map((c, i) => ({
            movie_id: movieId,
            person_id: c.person_id,
            character_name: c.character,
            billing_order: i,
          }))
        );
      }

      // Update production companies
      await supabase.from('movie_l0_companies').delete().eq('movie_id', movieId);
      if (productionCompanies.length > 0) {
        await supabase.from('movie_l0_companies').insert(
          productionCompanies.map(c => ({
            movie_id: movieId,
            company_name: c.name,
            company_country_id: c.country_id || null,
          }))
        );
      }

      // Update/create L1 records for plots
      for (const [langCode, plot] of Object.entries(plots)) {
        if (!plot) continue;

        const dbLangCode = langCode === 'lu' ? 'lb' : langCode;
        const { data: lang } = await supabase
          .from('languages')
          .select('id')
          .eq('code', dbLangCode)
          .single();

        if (lang) {
          // Check if L1 exists
          const { data: existing } = await supabase
            .from('movies_l1')
            .select('id')
            .eq('movie_l0_id', movieId)
            .eq('language_id', lang.id)
            .single();

          if (existing) {
            await supabase
              .from('movies_l1')
              .update({ plot })
              .eq('id', existing.id);
          } else {
            await supabase
              .from('movies_l1')
              .insert({
                movie_l0_id: movieId,
                language_id: lang.id,
                title: formData.original_title,
                plot,
              });
          }
        }
      }

      setSuccess('Movie updated successfully');
      setTimeout(() => {
        router.push(`/movies/${movieId}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update movie');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      const { error } = await supabase.from('movies_l0').delete().eq('id', movieId);
      if (error) throw error;
      router.push('/movies');
    } catch (err: any) {
      setError(err.message || 'Failed to delete movie');
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

  const tabs = [
    { key: 'basic', label: 'Basic Info' },
    { key: 'crew', label: 'Cast & Crew' },
    { key: 'media', label: 'Media' },
    { key: 'plots', label: 'Plots' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/movies/${movieId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Movie (L0)</h1>
            <p className="text-muted-foreground">Core movie information</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <TMDBLookup
            onSelect={handleTMDBImport}
            tmdbId={formData.tmdb_id ? parseInt(formData.tmdb_id) : null}
            imdbId={formData.imdb_id || null}
          />
          {canDelete && (
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
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

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="original_title">Original Title *</Label>
                    <Input
                      id="original_title"
                      name="original_title"
                      value={formData.original_title}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="production_year">Production Year</Label>
                    <Input
                      id="production_year"
                      name="production_year"
                      type="number"
                      min="1888"
                      max="2100"
                      value={formData.production_year}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="runtime_minutes">Runtime (minutes)</Label>
                    <Input
                      id="runtime_minutes"
                      name="runtime_minutes"
                      type="number"
                      min="1"
                      value={formData.runtime_minutes}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      <option value="draft">Draft</option>
                      <option value="pending_review">Pending Review</option>
                      <option value="verified">Verified</option>
                      <option value="archived">Archived</option>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* External IDs */}
            <Card>
              <CardHeader>
                <CardTitle>External IDs</CardTitle>
                <CardDescription>Links to external databases for lookup</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tmdb_id">TMDB ID</Label>
                    <TMDBIdLookup
                      type="tmdb"
                      value={formData.tmdb_id}
                      onChange={val => setFormData(prev => ({ ...prev, tmdb_id: val }))}
                      onMovieFound={async (tmdbId) => {
                        setFormData(prev => ({ ...prev, tmdb_id: tmdbId.toString() }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imdb_id">IMDB ID</Label>
                    <Input
                      id="imdb_id"
                      name="imdb_id"
                      value={formData.imdb_id}
                      onChange={handleChange}
                      placeholder="tt1234567"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Genres */}
            <Card>
              <CardHeader>
                <CardTitle>Genres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {genres.map(genre => (
                    <button
                      key={genre.id}
                      type="button"
                      onClick={() => toggleGenre(genre.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        selectedGenres.includes(genre.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-accent'
                      }`}
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Production Countries */}
            <Card>
              <CardHeader>
                <CardTitle>Production Countries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {countries.map(country => (
                    <button
                      key={country.id}
                      type="button"
                      onClick={() => toggleCountry(country.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        selectedCountries.includes(country.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-accent'
                      }`}
                    >
                      {country.code}
                    </button>
                  ))}
                </div>

                {selectedCountries.length > 0 && (
                  <div className="pt-4 border-t">
                    <Label className="mb-2 block">Primary Country</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedCountries.map(countryId => {
                        const country = countries.find(c => c.id === countryId);
                        return (
                          <button
                            key={countryId}
                            type="button"
                            onClick={() => setPrimaryCountry(countryId)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                              primaryCountry === countryId
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'hover:bg-accent'
                            }`}
                          >
                            {country?.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Production Companies */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Production Companies</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProductionCompanies(prev => [...prev, { name: '', country_id: '' }])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
              </CardHeader>
              <CardContent>
                {productionCompanies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No production companies added</p>
                ) : (
                  <div className="space-y-3">
                    {productionCompanies.map((company, index) => (
                      <div key={index} className="flex gap-3 items-center">
                        <Input
                          value={company.name}
                          onChange={e => {
                            const updated = [...productionCompanies];
                            updated[index].name = e.target.value;
                            setProductionCompanies(updated);
                          }}
                          placeholder="Company name"
                          className="flex-1"
                        />
                        <Select
                          value={company.country_id}
                          onChange={e => {
                            const updated = [...productionCompanies];
                            updated[index].country_id = e.target.value;
                            setProductionCompanies(updated);
                          }}
                          className="w-32"
                        >
                          <option value="">Country</option>
                          {countries.map(c => (
                            <option key={c.id} value={c.id}>{c.code}</option>
                          ))}
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setProductionCompanies(prev => prev.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {movieTags.map(tag => (
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
          </>
        )}

        {/* Cast & Crew Tab */}
        {activeTab === 'crew' && (
          <>
            {/* Directors */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Directors</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingPersonFor('director')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Director
                </Button>
              </CardHeader>
              <CardContent>
                {directors.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No directors added</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {directors.map(d => (
                      <Badge key={d.person_id} variant="secondary" className="gap-1 pr-1">
                        <User className="h-3 w-3" />
                        {d.name}
                        <button
                          type="button"
                          onClick={() => removePerson('director', d.person_id)}
                          className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Screenplay */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Screenplay / Writers</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingPersonFor('screenplay')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Writer
                </Button>
              </CardHeader>
              <CardContent>
                {screenplay.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No writers added</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {screenplay.map(s => (
                      <Badge key={s.person_id} variant="secondary" className="gap-1 pr-1">
                        <User className="h-3 w-3" />
                        {s.name}
                        <button
                          type="button"
                          onClick={() => removePerson('screenplay', s.person_id)}
                          className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Music */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Music / Composer</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingPersonFor('music')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Composer
                </Button>
              </CardHeader>
              <CardContent>
                {music.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No composers added</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {music.map(m => (
                      <Badge key={m.person_id} variant="secondary" className="gap-1 pr-1">
                        <User className="h-3 w-3" />
                        {m.name}
                        <button
                          type="button"
                          onClick={() => removePerson('music', m.person_id)}
                          className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cast */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cast</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingPersonFor('cast')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Actor
                </Button>
              </CardHeader>
              <CardContent>
                {cast.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No cast added</p>
                ) : (
                  <div className="space-y-2">
                    {cast.map((c, index) => (
                      <div key={c.person_id} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                        <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                        <span className="font-medium flex-1">{c.name}</span>
                        <span className="text-sm text-muted-foreground">as</span>
                        <Input
                          value={c.character}
                          onChange={e => {
                            const updated = [...cast];
                            updated[index].character = e.target.value;
                            setCast(updated);
                          }}
                          placeholder="Character name"
                          className="w-48 h-8"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removePerson('cast', c.person_id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Media Tab */}
        {activeTab === 'media' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Poster & Backdrop</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="poster_url">Poster URL</Label>
                    <Input
                      id="poster_url"
                      name="poster_url"
                      type="url"
                      value={formData.poster_url}
                      onChange={handleChange}
                      placeholder="https://..."
                    />
                    {formData.poster_url && (
                      <div className="mt-2">
                        <img
                          src={formData.poster_url}
                          alt="Poster preview"
                          className="h-48 w-auto rounded-lg object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backdrop_url">Backdrop URL</Label>
                    <Input
                      id="backdrop_url"
                      name="backdrop_url"
                      type="url"
                      value={formData.backdrop_url}
                      onChange={handleChange}
                      placeholder="https://..."
                    />
                    {formData.backdrop_url && (
                      <div className="mt-2">
                        <img
                          src={formData.backdrop_url}
                          alt="Backdrop preview"
                          className="h-32 w-full rounded-lg object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trailer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="trailer_url">Trailer URL</Label>
                  <div className="flex gap-2">
                    <Video className="h-10 w-10 text-muted-foreground p-2 border rounded" />
                    <Input
                      id="trailer_url"
                      name="trailer_url"
                      type="url"
                      value={formData.trailer_url}
                      onChange={handleChange}
                      placeholder="https://youtube.com/watch?v=..."
                      className="flex-1"
                    />
                    {formData.trailer_url && (
                      <a
                        href={formData.trailer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 border rounded hover:bg-accent"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Stills / Images</CardTitle>
                  <CardDescription>Additional movie images</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStills(prev => [...prev, { url: '', type: 'still' }])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Image
                </Button>
              </CardHeader>
              <CardContent>
                {stills.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No stills added
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {stills.map((still, index) => (
                      <div key={index} className="relative group">
                        {still.url ? (
                          <img
                            src={still.url}
                            alt={`Still ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const url = prompt('Enter image URL:', still.url);
                              if (url !== null) {
                                const updated = [...stills];
                                updated[index].url = url;
                                setStills(updated);
                              }
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setStills(prev => prev.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Plots Tab */}
        {activeTab === 'plots' && (
          <Card>
            <CardHeader>
              <CardTitle>Plot / Synopsis</CardTitle>
              <CardDescription>Movie description in multiple languages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="plot_en" className="flex items-center gap-2">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">EN</span>
                  English
                </Label>
                <Textarea
                  id="plot_en"
                  value={plots.en}
                  onChange={e => setPlots(prev => ({ ...prev, en: e.target.value }))}
                  rows={4}
                  placeholder="English plot description..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plot_de" className="flex items-center gap-2">
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">DE</span>
                  German / Deutsch
                </Label>
                <Textarea
                  id="plot_de"
                  value={plots.de}
                  onChange={e => setPlots(prev => ({ ...prev, de: e.target.value }))}
                  rows={4}
                  placeholder="Deutsche Handlungsbeschreibung..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plot_fr" className="flex items-center gap-2">
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">FR</span>
                  French / Français
                </Label>
                <Textarea
                  id="plot_fr"
                  value={plots.fr}
                  onChange={e => setPlots(prev => ({ ...prev, fr: e.target.value }))}
                  rows={4}
                  placeholder="Description de l'intrigue en français..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plot_lu" className="flex items-center gap-2">
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">LU</span>
                  Luxembourgish / Lëtzebuergesch
                </Label>
                <Textarea
                  id="plot_lu"
                  value={plots.lu}
                  onChange={e => setPlots(prev => ({ ...prev, lu: e.target.value }))}
                  rows={4}
                  placeholder="Lëtzebuergesch Beschreiwung..."
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Internal notes (not visible to public)</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/movies/${movieId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {/* Add Person Dialog */}
      <Dialog open={addingPersonFor !== null} onOpenChange={() => setAddingPersonFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {addingPersonFor === 'director' ? 'Director' :
                addingPersonFor === 'screenplay' ? 'Writer' :
                addingPersonFor === 'music' ? 'Composer' : 'Actor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Search existing */}
            <div className="space-y-2">
              <Label>Search Existing People</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={personSearch}
                  onChange={e => setPersonSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {personSearchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded p-2">
                  {personSearchResults.map(person => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => addPerson(addingPersonFor!, person.id, person.name)}
                      className="w-full text-left p-2 hover:bg-accent rounded text-sm"
                    >
                      {person.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or create new</span>
              </div>
            </div>

            {/* Create new */}
            <div className="space-y-2">
              <Label>New Person Name</Label>
              <Input
                placeholder="Enter name..."
                value={newPersonName}
                onChange={e => setNewPersonName(e.target.value)}
              />
            </div>

            {addingPersonFor === 'cast' && (
              <div className="space-y-2">
                <Label>Character Name</Label>
                <Input
                  placeholder="Role/character name..."
                  value={newCastCharacter}
                  onChange={e => setNewCastCharacter(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingPersonFor(null)}>Cancel</Button>
            <Button
              onClick={() => addingPersonFor && createAndAddPerson(addingPersonFor)}
              disabled={!newPersonName.trim()}
            >
              Create & Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Movie</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{formData.original_title}"? This will also delete all localizations and editions. This action cannot be undone.
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
