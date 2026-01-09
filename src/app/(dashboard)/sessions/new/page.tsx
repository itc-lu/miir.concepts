'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Check, Building2, Film, Calendar, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type WizardStep = 'cinema' | 'movie' | 'edition' | 'schedule' | 'confirm';

interface Cinema {
  id: string;
  name: string;
  city: string | null;
}

interface Movie {
  id: string;
  original_title: string;
  production_year: number | null;
  poster_url: string | null;
}

interface MovieEdition {
  id: string;
  edition_title: string | null;
  format: { name: string } | null;
  technology: { name: string } | null;
  audio_language: { code: string; name: string } | null;
  subtitle_language: { code: string; name: string } | null;
}

interface SessionTag {
  id: string;
  name: string;
  color: string | null;
}

const steps: { key: WizardStep; title: string; description: string }[] = [
  { key: 'cinema', title: 'Select Cinema', description: 'Choose the cinema for this session' },
  { key: 'movie', title: 'Select Movie', description: 'Search and select a movie' },
  { key: 'edition', title: 'Select Edition', description: 'Choose the movie edition/format' },
  { key: 'schedule', title: 'Schedule', description: 'Set date, time, and details' },
  { key: 'confirm', title: 'Confirm', description: 'Review and create session' },
];

export default function NewSessionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState<WizardStep>('cinema');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [editions, setEditions] = useState<MovieEdition[]>([]);
  const [tags, setTags] = useState<SessionTag[]>([]);

  // Selected values
  const [selectedCinema, setSelectedCinema] = useState<Cinema | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedEdition, setSelectedEdition] = useState<MovieEdition | null>(null);

  // Form data
  const [movieSearch, setMovieSearch] = useState('');
  const [showDate, setShowDate] = useState('');
  const [showTime, setShowTime] = useState('');
  const [screenName, setScreenName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Fetch cinemas on mount
  useEffect(() => {
    async function fetchCinemas() {
      const { data } = await supabase
        .from('cinemas')
        .select('id, name, city')
        .eq('is_active', true)
        .order('name');
      setCinemas(data || []);
    }
    fetchCinemas();
  }, []);

  // Fetch tags on mount
  useEffect(() => {
    async function fetchTags() {
      const { data } = await supabase
        .from('session_tags')
        .select('id, name, color')
        .eq('is_active', true)
        .order('name');
      setTags(data || []);
    }
    fetchTags();
  }, []);

  // Search movies
  useEffect(() => {
    async function searchMovies() {
      if (movieSearch.length < 2) {
        setMovies([]);
        return;
      }

      const { data } = await supabase
        .from('movies_l0')
        .select('id, original_title, production_year, poster_url')
        .ilike('original_title', `%${movieSearch}%`)
        .order('original_title')
        .limit(10);

      setMovies(data || []);
    }

    const timeout = setTimeout(searchMovies, 300);
    return () => clearTimeout(timeout);
  }, [movieSearch]);

  // Fetch editions when movie is selected
  useEffect(() => {
    async function fetchEditions() {
      if (!selectedMovie) {
        setEditions([]);
        return;
      }

      const { data } = await supabase
        .from('movies_l2')
        .select(`
          id,
          edition_title,
          format:formats(name),
          technology:technologies(name),
          audio_language:languages!movies_l2_audio_language_id_fkey(code, name),
          subtitle_language:languages!movies_l2_subtitle_language_id_fkey(code, name)
        `)
        .eq('movie_l0_id', selectedMovie.id)
        .eq('is_active', true);

      setEditions(data || []);
    }

    fetchEditions();
  }, [selectedMovie]);

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'cinema':
        return selectedCinema !== null;
      case 'movie':
        return selectedMovie !== null;
      case 'edition':
        return selectedEdition !== null;
      case 'schedule':
        return showDate !== '' && showTime !== '';
      default:
        return true;
    }
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].key);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCinema || !selectedEdition) return;

    setLoading(true);
    setError(null);

    try {
      const { data: session, error: insertError } = await supabase
        .from('sessions')
        .insert({
          movie_l2_id: selectedEdition.id,
          cinema_id: selectedCinema.id,
          show_date: showDate,
          show_time: showTime,
          screen_name: screenName || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Add tags
      if (selectedTags.length > 0) {
        const tagInserts = selectedTags.map(tagId => ({
          session_id: session.id,
          tag_id: tagId,
        }));

        const { error: tagError } = await supabase
          .from('session_session_tags')
          .insert(tagInserts);

        if (tagError) throw tagError;
      }

      router.push('/sessions');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sessions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Session</h1>
          <p className="text-muted-foreground">Schedule a new movie showing</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Progress Steps */}
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => (
            <li key={step.key} className="flex items-center">
              <div
                className={cn(
                  'flex items-center',
                  index < currentStepIndex && 'text-primary',
                  index === currentStepIndex && 'text-primary',
                  index > currentStepIndex && 'text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium',
                    index < currentStepIndex && 'border-primary bg-primary text-primary-foreground',
                    index === currentStepIndex && 'border-primary',
                    index > currentStepIndex && 'border-muted-foreground'
                  )}
                >
                  {index < currentStepIndex ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className="ml-2 text-sm font-medium hidden sm:inline">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className="mx-4 h-0.5 w-8 bg-border sm:w-16" />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStepIndex].title}</CardTitle>
          <CardDescription>{steps[currentStepIndex].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Cinema Selection */}
          {currentStep === 'cinema' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cinemas.map(cinema => (
                <button
                  key={cinema.id}
                  onClick={() => setSelectedCinema(cinema)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent',
                    selectedCinema?.id === cinema.id && 'border-primary bg-primary/5'
                  )}
                >
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{cinema.name}</p>
                    {cinema.city && (
                      <p className="text-sm text-muted-foreground">{cinema.city}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Movie Selection */}
          {currentStep === 'movie' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search movies..."
                  value={movieSearch}
                  onChange={e => setMovieSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {selectedMovie && (
                <div className="flex items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3">
                  <div className="h-16 w-12 rounded bg-muted overflow-hidden">
                    {selectedMovie.poster_url ? (
                      <img
                        src={selectedMovie.poster_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Film className="h-full w-full p-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{selectedMovie.original_title}</p>
                    {selectedMovie.production_year && (
                      <p className="text-sm text-muted-foreground">
                        {selectedMovie.production_year}
                      </p>
                    )}
                  </div>
                  <Badge variant="success">Selected</Badge>
                </div>
              )}

              {movies.length > 0 && (
                <div className="space-y-2">
                  {movies
                    .filter(m => m.id !== selectedMovie?.id)
                    .map(movie => (
                      <button
                        key={movie.id}
                        onClick={() => setSelectedMovie(movie)}
                        className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                      >
                        <div className="h-12 w-8 rounded bg-muted overflow-hidden">
                          {movie.poster_url ? (
                            <img
                              src={movie.poster_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Film className="h-full w-full p-2 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{movie.original_title}</p>
                          {movie.production_year && (
                            <p className="text-sm text-muted-foreground">{movie.production_year}</p>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              )}

              {movieSearch.length >= 2 && movies.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No movies found. Try a different search term.
                </p>
              )}
            </div>
          )}

          {/* Edition Selection */}
          {currentStep === 'edition' && (
            <div className="space-y-3">
              {editions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No editions found for this movie.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Please create an edition (L2) for this movie first.
                  </p>
                </div>
              ) : (
                editions.map(edition => (
                  <button
                    key={edition.id}
                    onClick={() => setSelectedEdition(edition)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent',
                      selectedEdition?.id === edition.id && 'border-primary bg-primary/5'
                    )}
                  >
                    <div>
                      <p className="font-medium">
                        {edition.edition_title || 'Standard Edition'}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {edition.format && (
                          <Badge variant="outline">{edition.format.name}</Badge>
                        )}
                        {edition.technology && (
                          <Badge variant="outline">{edition.technology.name}</Badge>
                        )}
                        {edition.audio_language && (
                          <Badge variant="secondary">{edition.audio_language.code}</Badge>
                        )}
                        {edition.subtitle_language && (
                          <Badge variant="secondary">Sub: {edition.subtitle_language.code}</Badge>
                        )}
                      </div>
                    </div>
                    {selectedEdition?.id === edition.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Schedule */}
          {currentStep === 'schedule' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="show_date" required>
                    Date
                  </Label>
                  <Input
                    id="show_date"
                    type="date"
                    value={showDate}
                    onChange={e => setShowDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="show_time" required>
                    Time
                  </Label>
                  <Input
                    id="show_time"
                    type="time"
                    value={showTime}
                    onChange={e => setShowTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="screen_name">Screen/Auditorium</Label>
                <Input
                  id="screen_name"
                  value={screenName}
                  onChange={e => setScreenName(e.target.value)}
                  placeholder="e.g., Screen 1, Salle 3"
                />
              </div>

              <div className="space-y-2">
                <Label>Session Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-sm transition-colors',
                        selectedTags.includes(tag.id)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      )}
                      style={{
                        borderColor: selectedTags.includes(tag.id) ? undefined : tag.color || undefined,
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          )}

          {/* Confirmation */}
          {currentStep === 'confirm' && (
            <div className="space-y-6">
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-4">Session Summary</h4>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Cinema</dt>
                    <dd className="font-medium">{selectedCinema?.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Movie</dt>
                    <dd className="font-medium">{selectedMovie?.original_title}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Edition</dt>
                    <dd className="font-medium">
                      {selectedEdition?.edition_title || 'Standard Edition'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Date</dt>
                    <dd className="font-medium">{showDate}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Time</dt>
                    <dd className="font-medium">{showTime}</dd>
                  </div>
                  {screenName && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Screen</dt>
                      <dd className="font-medium">{screenName}</dd>
                    </div>
                  )}
                  {selectedTags.length > 0 && (
                    <div className="flex justify-between items-start">
                      <dt className="text-muted-foreground">Tags</dt>
                      <dd className="flex flex-wrap gap-1 justify-end">
                        {tags
                          .filter(t => selectedTags.includes(t.id))
                          .map(tag => (
                            <Badge key={tag.id} variant="outline">
                              {tag.name}
                            </Badge>
                          ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={currentStepIndex === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {currentStep === 'confirm' ? (
          <Button onClick={handleSubmit} loading={loading}>
            <Check className="mr-2 h-4 w-4" />
            Create Session
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canProceed()}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
