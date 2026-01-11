import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors
let supabase: SupabaseClient | null = null;

function getSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('[Export API] Initializing Supabase:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      usingKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon',
    });

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(`Missing Supabase configuration: URL=${!!supabaseUrl}, Key=${!!supabaseKey}`);
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// Convert decimal time to HH:MM format
function formatTimeFloat(timeFloat: number): string {
  const hours = Math.floor(timeFloat);
  const minutes = Math.round((timeFloat - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Format duration from minutes to Xh YYm format
function formatDuration(minutes: number | null): string {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins.toString().padStart(2, '0')}m` : `${mins}m`;
}

// Escape XML special characters
function escapeXml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface ScreeningData {
  id: string;
  start_week_day: string;
  movie_of_the_week: boolean;
  movie_of_the_day: boolean;
  state: string;
  cinema: {
    id: string;
    name: string;
    city: string | null;
    timezone: string;
    country: {
      code: string;
      name: string;
    } | null;
    cinema_group: {
      id: string;
      name: string;
    } | null;
  };
  movie_l2: {
    id: string;
    edition_title: string | null;
    movie_l0: {
      original_title: string;
      runtime_minutes: number | null;
      release_year: number | null;
      poster_url: string | null;
    };
    format: { name: string } | null;
    audio_language: { code: string; name: string } | null;
    subtitle_language: { code: string; name: string } | null;
  };
  format: { name: string } | null;
  session_days: Array<{
    id: string;
    date: string;
    session_times: Array<{
      id: string;
      time_float: number;
      start_datetime: string | null;
      end_datetime: string | null;
    }>;
  }>;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const templateId = searchParams.get('template_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const cinemaGroupId = searchParams.get('cinema_group_id');
  const cinemaId = searchParams.get('cinema_id');
  const isPreview = searchParams.get('preview') === 'true';

  if (!templateId || !dateFrom || !dateTo) {
    return NextResponse.json(
      { error: 'Missing required parameters: template_id, date_from, date_to' },
      { status: 400 }
    );
  }

  try {
    const db = getSupabase();

    console.log('[Export API] Looking for template:', templateId);

    // Fetch template - use maybeSingle to avoid "cannot coerce" error when no results
    const { data: template, error: templateError } = await db
      .from('export_templates')
      .select('*, client:export_clients(id, name, slug)')
      .eq('id', templateId)
      .maybeSingle();

    console.log('[Export API] Template query result:', {
      found: !!template,
      error: templateError?.message,
      errorCode: templateError?.code,
      templateId,
    });

    if (templateError) {
      console.error('[Export API] Template query error:', templateError);
      return NextResponse.json(
        { error: `Template query failed: ${templateError.message}` },
        { status: 500 }
      );
    }

    if (!template) {
      return NextResponse.json(
        { error: `Template not found with ID: ${templateId}. Ensure the template exists and RLS allows access.` },
        { status: 404 }
      );
    }

    // Build screenings query
    let query = db
      .from('screenings')
      .select(`
        id,
        start_week_day,
        movie_of_the_week,
        movie_of_the_day,
        state,
        cinema:cinemas(
          id,
          name,
          city,
          timezone,
          country:countries(code, name),
          cinema_group:cinema_groups(id, name)
        ),
        movie_l2:movies_l2(
          id,
          edition_title,
          movie_l0:movies_l0(original_title, runtime_minutes, release_year, poster_url),
          format:formats(name),
          audio_language:languages!movies_l2_audio_language_id_fkey(code, name),
          subtitle_language:languages!movies_l2_subtitle_language_id_fkey(code, name)
        ),
        format:formats(name),
        session_days(
          id,
          date,
          session_times(id, time_float, start_datetime, end_datetime)
        )
      `)
      .eq('state', 'verified')
      .gte('start_week_day', dateFrom)
      .lte('start_week_day', dateTo)
      .order('start_week_day');

    // Apply filters
    if (cinemaId) {
      query = query.eq('cinema_id', cinemaId);
    } else if (cinemaGroupId) {
      // Get cinemas in group first
      const { data: groupCinemas } = await db
        .from('cinemas')
        .select('id')
        .eq('cinema_group_id', cinemaGroupId);

      if (groupCinemas && groupCinemas.length > 0) {
        query = query.in('cinema_id', groupCinemas.map(c => c.id));
      }
    }

    // Limit for preview
    if (isPreview) {
      query = query.limit(100);
    }

    const { data: screenings, error: screeningsError } = await query;

    if (screeningsError) {
      throw screeningsError;
    }

    // Generate output based on format
    let output: string;
    const format = template.format as 'xml' | 'json' | 'csv';

    switch (format) {
      case 'xml':
        output = generateXml(screenings as unknown as ScreeningData[], template);
        break;
      case 'json':
        output = generateJson(screenings as unknown as ScreeningData[]);
        break;
      case 'csv':
        output = generateCsv(screenings as unknown as ScreeningData[]);
        break;
      default:
        output = generateXml(screenings as unknown as ScreeningData[], template);
    }

    // Return appropriate response
    const contentType = format === 'xml' ? 'application/xml' :
                        format === 'json' ? 'application/json' : 'text/csv';

    return new NextResponse(output, {
      headers: {
        'Content-Type': `${contentType}; charset=utf-8`,
      },
    });

  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error.message || 'Export failed' },
      { status: 500 }
    );
  }
}

function generateXml(screenings: ScreeningData[], template: any): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<program>');
  lines.push(`  <generated>${new Date().toISOString()}</generated>`);
  lines.push(`  <client>${escapeXml(template.client?.name)}</client>`);
  lines.push('  <screenings>');

  for (const screening of screenings) {
    if (!screening.cinema || !screening.movie_l2) continue;

    // Flatten session times
    const times: Array<{ date: string; time: number; startDatetime: string | null }> = [];
    for (const day of (screening.session_days || [])) {
      for (const time of (day.session_times || [])) {
        times.push({
          date: day.date,
          time: time.time_float,
          startDatetime: time.start_datetime,
        });
      }
    }

    if (times.length === 0) continue;

    lines.push('    <screening>');
    lines.push(`      <cinema>`);
    lines.push(`        <id>${escapeXml(screening.cinema.id)}</id>`);
    lines.push(`        <name>${escapeXml(screening.cinema.name)}</name>`);
    lines.push(`        <city>${escapeXml(screening.cinema.city)}</city>`);
    lines.push(`        <country>${escapeXml(screening.cinema.country?.code)}</country>`);
    if (screening.cinema.cinema_group) {
      lines.push(`        <group>${escapeXml(screening.cinema.cinema_group.name)}</group>`);
    }
    lines.push(`      </cinema>`);

    lines.push(`      <movie>`);
    lines.push(`        <id>${escapeXml(screening.movie_l2.id)}</id>`);
    lines.push(`        <title>${escapeXml(screening.movie_l2.movie_l0?.original_title)}</title>`);
    if (screening.movie_l2.edition_title) {
      lines.push(`        <edition>${escapeXml(screening.movie_l2.edition_title)}</edition>`);
    }
    if (screening.movie_l2.movie_l0?.runtime_minutes) {
      lines.push(`        <duration>${screening.movie_l2.movie_l0.runtime_minutes}</duration>`);
      lines.push(`        <duration_formatted>${formatDuration(screening.movie_l2.movie_l0.runtime_minutes)}</duration_formatted>`);
    }
    if (screening.movie_l2.movie_l0?.release_year) {
      lines.push(`        <year>${screening.movie_l2.movie_l0.release_year}</year>`);
    }
    const format = screening.format?.name || screening.movie_l2.format?.name;
    if (format) {
      lines.push(`        <format>${escapeXml(format)}</format>`);
    }
    if (screening.movie_l2.audio_language) {
      lines.push(`        <audio_language code="${escapeXml(screening.movie_l2.audio_language.code)}">${escapeXml(screening.movie_l2.audio_language.name)}</audio_language>`);
    }
    if (screening.movie_l2.subtitle_language) {
      lines.push(`        <subtitle_language code="${escapeXml(screening.movie_l2.subtitle_language.code)}">${escapeXml(screening.movie_l2.subtitle_language.name)}</subtitle_language>`);
    }
    if (screening.movie_l2.movie_l0?.poster_url) {
      lines.push(`        <poster_url>${escapeXml(screening.movie_l2.movie_l0.poster_url)}</poster_url>`);
    }
    lines.push(`      </movie>`);

    lines.push(`      <flags>`);
    if (screening.movie_of_the_week) {
      lines.push(`        <movie_of_the_week>true</movie_of_the_week>`);
    }
    if (screening.movie_of_the_day) {
      lines.push(`        <movie_of_the_day>true</movie_of_the_day>`);
    }
    lines.push(`      </flags>`);

    lines.push(`      <sessions>`);
    for (const time of times) {
      lines.push(`        <session>`);
      lines.push(`          <date>${time.date}</date>`);
      lines.push(`          <time>${formatTimeFloat(time.time)}</time>`);
      lines.push(`          <time_decimal>${time.time.toFixed(2)}</time_decimal>`);
      if (time.startDatetime) {
        lines.push(`          <datetime>${time.startDatetime}</datetime>`);
      }
      lines.push(`        </session>`);
    }
    lines.push(`      </sessions>`);

    lines.push('    </screening>');
  }

  lines.push('  </screenings>');
  lines.push('</program>');

  return lines.join('\n');
}

function generateJson(screenings: ScreeningData[]): string {
  const output = {
    generated: new Date().toISOString(),
    screenings: screenings.map(screening => {
      if (!screening.cinema || !screening.movie_l2) return null;

      const times: Array<{ date: string; time: string; time_decimal: number; datetime?: string }> = [];
      for (const day of (screening.session_days || [])) {
        for (const time of (day.session_times || [])) {
          times.push({
            date: day.date,
            time: formatTimeFloat(time.time_float),
            time_decimal: time.time_float,
            ...(time.start_datetime && { datetime: time.start_datetime }),
          });
        }
      }

      if (times.length === 0) return null;

      return {
        cinema: {
          id: screening.cinema.id,
          name: screening.cinema.name,
          city: screening.cinema.city,
          country: screening.cinema.country?.code,
          group: screening.cinema.cinema_group?.name,
        },
        movie: {
          id: screening.movie_l2.id,
          title: screening.movie_l2.movie_l0?.original_title,
          edition: screening.movie_l2.edition_title,
          duration: screening.movie_l2.movie_l0?.runtime_minutes,
          year: screening.movie_l2.movie_l0?.release_year,
          format: screening.format?.name || screening.movie_l2.format?.name,
          audio_language: screening.movie_l2.audio_language?.code,
          subtitle_language: screening.movie_l2.subtitle_language?.code,
          poster_url: screening.movie_l2.movie_l0?.poster_url,
        },
        flags: {
          movie_of_the_week: screening.movie_of_the_week,
          movie_of_the_day: screening.movie_of_the_day,
        },
        sessions: times,
      };
    }).filter(Boolean),
  };

  return JSON.stringify(output, null, 2);
}

function generateCsv(screenings: ScreeningData[]): string {
  const lines: string[] = [];

  // Header
  lines.push([
    'cinema_id',
    'cinema_name',
    'cinema_city',
    'cinema_country',
    'cinema_group',
    'movie_id',
    'movie_title',
    'movie_edition',
    'movie_duration',
    'movie_year',
    'format',
    'audio_language',
    'subtitle_language',
    'movie_of_week',
    'movie_of_day',
    'date',
    'time',
    'time_decimal',
  ].join(','));

  // Data rows
  for (const screening of screenings) {
    if (!screening.cinema || !screening.movie_l2) continue;

    for (const day of (screening.session_days || [])) {
      for (const time of (day.session_times || [])) {
        const row = [
          screening.cinema.id,
          `"${(screening.cinema.name || '').replace(/"/g, '""')}"`,
          `"${(screening.cinema.city || '').replace(/"/g, '""')}"`,
          screening.cinema.country?.code || '',
          `"${(screening.cinema.cinema_group?.name || '').replace(/"/g, '""')}"`,
          screening.movie_l2.id,
          `"${(screening.movie_l2.movie_l0?.original_title || '').replace(/"/g, '""')}"`,
          `"${(screening.movie_l2.edition_title || '').replace(/"/g, '""')}"`,
          screening.movie_l2.movie_l0?.runtime_minutes || '',
          screening.movie_l2.movie_l0?.release_year || '',
          `"${(screening.format?.name || screening.movie_l2.format?.name || '').replace(/"/g, '""')}"`,
          screening.movie_l2.audio_language?.code || '',
          screening.movie_l2.subtitle_language?.code || '',
          screening.movie_of_the_week ? 'true' : 'false',
          screening.movie_of_the_day ? 'true' : 'false',
          day.date,
          formatTimeFloat(time.time_float),
          time.time_float.toFixed(2),
        ];
        lines.push(row.join(','));
      }
    }
  }

  return lines.join('\n');
}
