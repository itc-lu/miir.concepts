import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Film,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
  Users,
  FileInput,
  FileOutput,
  Activity,
} from 'lucide-react';

async function getStats() {
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [
    moviesResult,
    cinemasResult,
    sessionsResult,
    unverifiedResult,
    recentMoviesCount,
    todaySessionsCount,
    l1Count,
    l2Count,
  ] = await Promise.all([
    supabase.from('movies_l0').select('id', { count: 'exact', head: true }),
    supabase.from('cinemas').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('sessions').select('id', { count: 'exact', head: true }).gte('show_date', today),
    supabase.from('movies_l0').select('id', { count: 'exact', head: true }).eq('is_verified', false),
    supabase.from('movies_l0').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('show_date', today),
    supabase.from('movies_l1').select('id', { count: 'exact', head: true }),
    supabase.from('movies_l2').select('id', { count: 'exact', head: true }),
  ]);

  return {
    totalMovies: moviesResult.count || 0,
    activeCinemas: cinemasResult.count || 0,
    upcomingSessions: sessionsResult.count || 0,
    unverifiedMovies: unverifiedResult.count || 0,
    recentMovies: recentMoviesCount.count || 0,
    todaySessions: todaySessionsCount.count || 0,
    l1Entries: l1Count.count || 0,
    l2Entries: l2Count.count || 0,
  };
}

async function getRecentMovies() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('movies_l0')
    .select('id, original_title, poster_url, status, is_verified, created_at, production_year')
    .order('created_at', { ascending: false })
    .limit(5);

  return data || [];
}

async function getUpcomingSessions() {
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('sessions')
    .select(`
      id,
      show_date,
      show_time,
      cinema:cinemas(name),
      movie_l2:movies_l2(
        movie_l0:movies_l0(original_title)
      )
    `)
    .gte('show_date', today)
    .order('show_date', { ascending: true })
    .order('show_time', { ascending: true })
    .limit(5);

  return data || [];
}

async function getUnverifiedMovies() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('movies_l0')
    .select('id, original_title, poster_url, production_year, created_at')
    .eq('is_verified', false)
    .order('created_at', { ascending: false })
    .limit(5);

  return data || [];
}

export default async function DashboardPage() {
  const stats = await getStats();
  const recentMovies = await getRecentMovies();
  const upcomingSessions = await getUpcomingSessions();
  const unverifiedMovies = await getUnverifiedMovies();

  const statCards = [
    {
      title: 'Total Movies',
      value: stats.totalMovies,
      icon: Film,
      description: `${stats.l1Entries} releases, ${stats.l2Entries} editions`,
      href: '/movies',
    },
    {
      title: 'Active Cinemas',
      value: stats.activeCinemas,
      icon: Building2,
      description: 'Configured cinemas',
      href: '/cinemas',
    },
    {
      title: 'Upcoming Sessions',
      value: stats.upcomingSessions,
      icon: Calendar,
      description: `${stats.todaySessions} today`,
      href: '/sessions',
    },
    {
      title: 'Pending Verification',
      value: stats.unverifiedMovies,
      icon: AlertTriangle,
      description: 'Movies to review',
      alert: stats.unverifiedMovies > 0,
      href: '/movies?verified=false',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header with quick actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to the Cinema Automation Tool
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/movies/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Movie
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/import">
              <FileInput className="h-4 w-4 mr-2" />
              Import
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map(stat => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon
                  className={`h-4 w-4 ${stat.alert ? 'text-destructive' : 'text-muted-foreground'}`}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/20">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New This Week</p>
                <p className="text-2xl font-bold">{stats.recentMovies} movies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/20">
                <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Screenings</p>
                <p className="text-2xl font-bold">{stats.todaySessions} sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/20">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Movie Editions</p>
                <p className="text-2xl font-bold">{stats.l2Entries} total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pending Verification - Priority */}
        {stats.unverifiedMovies > 0 && (
          <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-5 w-5" />
                  Needs Verification
                </CardTitle>
                <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
                  {stats.unverifiedMovies}
                </Badge>
              </div>
              <CardDescription>Review and verify these movies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {unverifiedMovies.map(movie => (
                  <Link
                    key={movie.id}
                    href={`/movies/${movie.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                  >
                    <div className="h-10 w-7 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {movie.poster_url ? (
                        <img
                          src={movie.poster_url}
                          alt={movie.original_title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Film className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{movie.original_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {movie.production_year || 'Year unknown'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
              {stats.unverifiedMovies > 5 && (
                <Button variant="ghost" className="w-full mt-3" asChild>
                  <Link href="/movies?verified=false">
                    View all {stats.unverifiedMovies} unverified
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Movies */}
        <Card className={stats.unverifiedMovies > 0 ? '' : 'lg:col-span-2'}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Movies</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/movies">View all</Link>
              </Button>
            </div>
            <CardDescription>Latest additions to the database</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMovies.length === 0 ? (
                <div className="text-center py-8">
                  <Film className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No movies yet</p>
                  <Button className="mt-3" asChild>
                    <Link href="/movies/new">Add your first movie</Link>
                  </Button>
                </div>
              ) : (
                recentMovies.map(movie => (
                  <Link
                    key={movie.id}
                    href={`/movies/${movie.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="h-12 w-8 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {movie.poster_url ? (
                        <img
                          src={movie.poster_url}
                          alt={movie.original_title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Film className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{movie.original_title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{movie.production_year || 'Year unknown'}</span>
                        {movie.is_verified ? (
                          <Badge variant="outline" className="text-green-600 border-green-600 text-[10px] px-1">
                            <CheckCircle className="h-2 w-2 mr-0.5" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-[10px] px-1">
                            <Clock className="h-2 w-2 mr-0.5" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Sessions */}
        <Card className={stats.unverifiedMovies > 0 ? '' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Sessions</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sessions">View all</Link>
              </Button>
            </div>
            <CardDescription>Next scheduled showings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No upcoming sessions</p>
                </div>
              ) : (
                upcomingSessions.map((session: any) => (
                  <div key={session.id} className="flex items-center gap-3 p-2">
                    <div className="flex-shrink-0 w-14 text-center bg-muted rounded-lg py-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        {new Date(session.show_date).toLocaleDateString('en-GB', {
                          weekday: 'short',
                        })}
                      </div>
                      <div className="text-lg font-bold">
                        {new Date(session.show_date).getDate()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session.movie_l2?.movie_l0?.original_title || 'Unknown Movie'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{session.show_time?.slice(0, 5)}</span>
                        <span>•</span>
                        <span className="truncate">{session.cinema?.name || 'Unknown Cinema'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start h-auto py-4" asChild>
              <Link href="/movies/new">
                <Plus className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Add Movie</div>
                  <div className="text-xs text-muted-foreground">Create new movie entry</div>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-4" asChild>
              <Link href="/import">
                <FileInput className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Import Data</div>
                  <div className="text-xs text-muted-foreground">Import from file</div>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-4" asChild>
              <Link href="/export">
                <FileOutput className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Export Data</div>
                  <div className="text-xs text-muted-foreground">Generate export files</div>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-4" asChild>
              <Link href="/cinemas">
                <Building2 className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Manage Cinemas</div>
                  <div className="text-xs text-muted-foreground">Configure cinema data</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
