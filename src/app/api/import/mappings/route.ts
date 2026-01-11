import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

// GET - Fetch mappings for a cinema group
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const cinemaGroupId = searchParams.get('cinema_group_id');
    const importTitle = searchParams.get('import_title');

    if (!cinemaGroupId) {
      return NextResponse.json({ error: 'cinema_group_id is required' }, { status: 400 });
    }

    let query = supabase
      .from('import_title_mappings')
      .select(`
        *,
        movie_l0:movies_l0(id, original_title, imdb_id, poster_url),
        movie_l1:movies_l1(id, edition_name),
        movie_l2:movies_l2(id, full_title)
      `)
      .eq('cinema_group_id', cinemaGroupId)
      .order('last_used_at', { ascending: false });

    if (importTitle) {
      // Use ilike for fuzzy matching
      query = query.ilike('normalized_title', `%${importTitle.toLowerCase().replace(/[^a-z0-9]/g, '%')}%`);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error('[Import Mappings] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 });
    }

    return NextResponse.json({ mappings: data });
  } catch (error: any) {
    console.error('[Import Mappings] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new mapping
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cinema_group_id, import_title, movie_l0_id, movie_l1_id, movie_l2_id, language_code, format_code } = body;

    if (!cinema_group_id || !import_title) {
      return NextResponse.json(
        { error: 'cinema_group_id and import_title are required' },
        { status: 400 }
      );
    }

    // Normalize the title
    const normalized_title = import_title
      .toLowerCase()
      .replace(/\s*\([^)]+\)\s*$/g, '')
      .replace(/\s*(3D|IMAX|4DX|ATMOS|Dolby|D-BOX|ScreenX)\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Upsert the mapping
    const { data, error } = await supabase
      .from('import_title_mappings')
      .upsert({
        cinema_group_id,
        import_title,
        normalized_title,
        movie_l0_id,
        movie_l1_id,
        movie_l2_id,
        language_code,
        format_code,
        is_verified: true,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'cinema_group_id,import_title',
      })
      .select()
      .single();

    if (error) {
      console.error('[Import Mappings] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create mapping' }, { status: 500 });
    }

    return NextResponse.json({ mapping: data });
  } catch (error: any) {
    console.error('[Import Mappings] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a mapping
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mapping_id } = body;

    if (!mapping_id) {
      return NextResponse.json({ error: 'mapping_id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('import_title_mappings')
      .delete()
      .eq('id', mapping_id);

    if (error) {
      console.error('[Import Mappings] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete mapping' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Import Mappings] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
