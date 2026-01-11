import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cinemaId = searchParams.get('cinema_id');
    const cinemaGroupId = searchParams.get('cinema_group_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('import_jobs')
      .select(`
        id,
        user_id,
        cinema_id,
        cinema_group_id,
        file_name,
        original_file_name,
        file_size_bytes,
        parser_id,
        status,
        total_records,
        processed_records,
        success_records,
        error_records,
        sheet_count,
        summary,
        errors,
        created_at,
        started_at,
        completed_at,
        user:user_profiles(id, email, first_name, last_name),
        cinema:cinemas(id, name),
        cinema_group:cinema_groups(id, name),
        parser:parsers(id, name, slug)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (cinemaId) {
      query = query.eq('cinema_id', cinemaId);
    }

    if (cinemaGroupId) {
      // Get jobs for the cinema group or any cinema in the group
      query = query.or(`cinema_group_id.eq.${cinemaGroupId},cinema_id.in.(select id from cinemas where cinema_group_id='${cinemaGroupId}')`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: jobs, error } = await query;

    if (error) {
      console.error('[Import History] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch import history' }, { status: 500 });
    }

    // Transform the data
    const transformedJobs = (jobs || []).map((job: any) => ({
      ...job,
      user: Array.isArray(job.user) ? job.user[0] : job.user,
      cinema: Array.isArray(job.cinema) ? job.cinema[0] : job.cinema,
      cinema_group: Array.isArray(job.cinema_group) ? job.cinema_group[0] : job.cinema_group,
      parser: Array.isArray(job.parser) ? job.parser[0] : job.parser,
    }));

    // Get total count
    let countQuery = supabase
      .from('import_jobs')
      .select('id', { count: 'exact', head: true });

    if (cinemaId) {
      countQuery = countQuery.eq('cinema_id', cinemaId);
    }

    if (cinemaGroupId) {
      countQuery = countQuery.or(`cinema_group_id.eq.${cinemaGroupId}`);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      jobs: transformedJobs,
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error('[Import History] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch import history' },
      { status: 500 }
    );
  }
}
