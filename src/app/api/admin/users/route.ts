import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Check for service role key first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error('[Admin Create User] Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { error: 'Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY. Add it to your Netlify environment variables.' },
        { status: 500 }
      );
    }

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing SUPABASE_URL' },
        { status: 500 }
      );
    }

    // Verify the requester is authenticated and is an admin
    const serverClient = await createServerClient();
    const {
      data: { user: currentUser },
    } = await serverClient.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a global_admin
    const { data: profile } = await serverClient
      .from('user_profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (!profile || profile.role !== 'global_admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { email, password, full_name, role, phone } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create user using Admin API
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email when admin creates user
      user_metadata: {
        full_name,
      },
    });

    if (authError) {
      console.error('[Admin Create User] Auth error:', authError);

      if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
      }

      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Wait for trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update profile with role and phone
    const { error: updateError } = await adminClient
      .from('user_profiles')
      .update({
        full_name,
        role: role || 'external',
        phone,
      })
      .eq('id', authData.user.id);

    if (updateError) {
      console.error('[Admin Create User] Profile update error:', updateError);
      // User was created, profile update failed - not critical
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    });
  } catch (error: any) {
    console.error('[Admin Create User] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}
