// API Route for Admin User Operations
// Uses service role key to bypass RLS completely

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client with service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

// Helper to generate temporary password
function generateTemporaryPassword(length: number = 12): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const special = '!@#$%&*';
    const all = uppercase + lowercase + numbers + special;

    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    for (let i = password.length; i < length; i++) {
        password += all[Math.floor(Math.random() * all.length)];
    }

    return password.split('').sort(() => Math.random() - 0.5).join('');
}

export async function POST(request: NextRequest) {
    try {
        if (!supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Service role key not configured' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { email, full_name, phone, role, organization_id, landlord_id, password } = body;

        if (!email || !full_name || !role) {
            return NextResponse.json(
                { error: 'Missing required fields: email, full_name, role' },
                { status: 400 }
            );
        }

        const temporaryPassword = password || generateTemporaryPassword();

        // Step 1: Create auth user using admin API
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: temporaryPassword,
            email_confirm: true, // Auto-confirm email for admin-created users
            user_metadata: {
                full_name,
                phone,
            },
        });

        let userId: string;
        let isNewUser = true;

        if (authError) {
            // If user already exists, get their ID and update them instead
            if (authError.message?.includes('already been registered') || (authError as any).code === 'email_exists') {
                console.log('User already exists, updating instead...');
                isNewUser = false;

                // Get existing user by email
                const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

                if (listError) {
                    return NextResponse.json(
                        { error: `Failed to find existing user: ${listError.message}` },
                        { status: 500 }
                    );
                }

                const existingUser = existingUsers.users.find(u => u.email === email);

                if (!existingUser) {
                    return NextResponse.json(
                        { error: 'User exists but could not be found' },
                        { status: 500 }
                    );
                }

                userId = existingUser.id;
            } else {
                console.error('Auth creation error:', authError);
                return NextResponse.json(
                    { error: `Failed to create auth user: ${authError.message}` },
                    { status: 500 }
                );
            }
        } else if (!authData.user) {
            return NextResponse.json(
                { error: 'No user returned from auth creation' },
                { status: 500 }
            );
        } else {
            userId = authData.user.id;
        }

        // Step 2: Create/update landlord_users record (service role bypasses RLS)
        const { data: userData, error: userError } = await supabaseAdmin
            .from('landlord_users')
            .upsert({
                id: userId,
                email,
                full_name,
                phone: phone || null,
                role,
                organization_id: organization_id || null,
                landlord_id: landlord_id || null,
                is_active: true,
            }, {
                onConflict: 'id',
            })
            .select()
            .single();

        if (userError) {
            console.error('User profile error:', userError);
            // Try to clean up auth user on failure (only if new user)
            if (isNewUser) {
                await supabaseAdmin.auth.admin.deleteUser(userId);
            }
            return NextResponse.json(
                { error: `Failed to create user profile: ${userError.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            user: userData,
            temporary_password: isNewUser ? temporaryPassword : undefined,
            message: isNewUser ? 'User created' : 'Existing user updated to ISP role',
            isNewUser,
        });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET - List users (with filters)
export async function GET(request: NextRequest) {
    try {
        if (!supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Service role key not configured' },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');
        const is_active = searchParams.get('is_active');
        const search = searchParams.get('search');

        let query = supabaseAdmin
            .from('landlord_users')
            .select('*, organization:organizations(*)');

        if (role) {
            query = query.eq('role', role);
        }

        if (is_active !== null) {
            query = query.eq('is_active', is_active === 'true');
        }

        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ users: data });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
