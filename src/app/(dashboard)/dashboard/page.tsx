import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Film, Building2, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

async function getStats() {
  const supabase = await createClient();

  const [moviesResult, cinemasResult, sessionsResult, unverifiedResult] = await Promise.all([
    supabase.from('movies_l0').select('id', { count: 'exact', head: true }),
    supabase.from('cinemas').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .gte('show_date', new Date().toISOString().split('T')[0]),
    supabase
      .from('movies_l0')
      .select('id', { count: 'exact', head: true })
      .eq('is_verified', false),
  ]);

  return {
    totalMovies: moviesResult.count || 0,
    activeCinemas: cinemasResult.count || 0,
    upcomingSessions: sessionsResult.count || 0,
    unverifiedMovies: unverifiedResult.count || 0,
  };
}

async function getRecentMovies() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('movies_l0')
    .select('id, original_title, poster_url, status, is_verified, created_at')
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

export default async function DashboardPage() {
  const stats = await getStats();
  const recentMovies = await getRecentMovies();
  const upcomingSessions = await getUpcomingSessions();

  const statCards = [
    {
      title: 'Total Movies',
      value: stats.totalMovies,
      icon: Film,
      description: 'Movies in database',
    },
    {
      title: 'Active Cinemas',
      value: stats.activeCinemas,
      icon: Building2,
      description: 'Currently active',
    },
    {
      title: 'Upcoming Sessions',
      value: stats.upcomingSessions,
      icon: Calendar,
      description: 'Scheduled showings',
    },
    {
      title: 'Pending Verification',
      value: stats.unverifiedMovies,
      icon: AlertTriangle,
      description: 'Movies to verify',
      alert: stats.unverifiedMovies > 0,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Cinema Automation Tool
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map(stat => (
          <Card key={stat.title}>
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
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Movies */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Movies</CardTitle>
            <CardDescription>Latest additions to the database</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMovies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No movies yet</p>
              ) : (
                recentMovies.map(movie => (
                  <div key={movie.id} className="flex items-center gap-4">
                    <div className="h-12 w-8 rounded bg-muted flex items-center justify-center overflow-hidden">
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
                        {movie.is_verified ? (
                          <span className="flex items-center text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </span>
                        ) : (
                          <span className="flex items-center text-yellow-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Sessions</CardTitle>
            <CardDescription>Next scheduled showings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming sessions</p>
              ) : (
                upcomingSessions.map((session: any) => (
                  <div key={session.id} className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className="text-sm font-medium">
                        {new Date(session.show_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {session.show_time?.slice(0, 5)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session.movie_l2?.movie_l0?.original_title || 'Unknown Movie'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {session.cinema?.name || 'Unknown Cinema'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
