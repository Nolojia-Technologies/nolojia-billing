import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Helper to determine redirect path based on role
function getRedirectPath(role: string | null): string {
  if (role === 'super_admin' || role === 'nolojia_staff') {
    return '/admin/landlords';
  } else if (role === 'landlord_admin' || role === 'landlord_staff') {
    return '/landlord';
  } else if (role === 'full_isp') {
    return '/dashboard';
  }
  return '/dashboard';
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Must have service role key for reliable queries
    if (!supabaseServiceKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY not set, using default redirect');
      return NextResponse.json({
        role: null,
        redirectPath: '/dashboard',
        warning: 'Service role key not configured',
      });
    }

    // Use service role key (bypasses RLS completely)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Use maybeSingle() to handle case where user doesn't exist in landlord_users
    const { data, error } = await supabaseAdmin
      .from('landlord_users')
      .select('role, full_name, email')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Database query error:', error);
      // Return success with default redirect on query error
      return NextResponse.json({
        role: null,
        redirectPath: '/dashboard',
        error: error.message,
      });
    }

    // If user not found in landlord_users, return default redirect
    if (!data) {
      console.log('User not found in landlord_users, using default redirect');
      return NextResponse.json({
        role: null,
        redirectPath: '/dashboard',
        message: 'User profile not found, using default',
      });
    }

    // User found, return role-based redirect
    return NextResponse.json({
      role: data.role,
      full_name: data.full_name,
      email: data.email,
      redirectPath: getRedirectPath(data.role),
    });

  } catch (error) {
    console.error('API error:', error);
    // Return success with default redirect on any error
    return NextResponse.json({
      role: null,
      redirectPath: '/dashboard',
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
