import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const active = searchParams.get('active');
  const groupId = searchParams.get('group_id');

  let query = supabase
    .from('cinemas')
    .select(
      `
      id,
      name,
      slug,
      city,
      address_line1,
      postal_code,
      screen_count,
      is_active,
      parser_type,
      cinema_group:cinema_groups(id, name),
      country:countries(id, code, name),
      tags:cinema_cinema_tags(tag:cinema_tags(id, name, color))
    `
    )
    .order('name');

  if (active !== null) {
    query = query.eq('is_active', active === 'true');
  }

  if (groupId) {
    query = query.eq('cinema_group_id', groupId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const {
      name,
      cinema_group_id,
      country_id,
      address_line1,
      address_line2,
      city,
      postal_code,
      phone,
      email,
      website,
      logo_url,
      latitude,
      longitude,
      screen_count = 1,
      parser_type,
      parser_config,
      tag_ids = [],
    } = body;

    // Generate slug
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    // Insert cinema
    const { data: cinema, error: cinemaError } = await supabase
      .from('cinemas')
      .insert({
        name,
        slug,
        cinema_group_id,
        country_id,
        address_line1,
        address_line2,
        city,
        postal_code,
        phone,
        email,
        website,
        logo_url,
        latitude,
        longitude,
        screen_count,
        parser_type,
        parser_config,
      })
      .select()
      .single();

    if (cinemaError) {
      return NextResponse.json({ error: cinemaError.message }, { status: 400 });
    }

    // Add tags
    if (tag_ids.length > 0) {
      await supabase.from('cinema_cinema_tags').insert(
        tag_ids.map((tag_id: string) => ({
          cinema_id: cinema.id,
          tag_id,
        }))
      );
    }

    return NextResponse.json({ data: cinema }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
