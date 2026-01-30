// User Management Service for Admin
// Handles user creation, password management, and role assignment

import { supabase as supabaseTyped } from '@/lib/supabase';
const supabase = supabaseTyped as any;
import type { UserRole, User } from '@/types/landlord';

export interface CreateUserInput {
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  organization_id?: string;
  landlord_id?: string;
  password?: string; // If not provided, a temporary password will be generated
}

export interface UpdateUserInput {
  full_name?: string;
  phone?: string;
  role?: UserRole;
  organization_id?: string;
  landlord_id?: string;
  is_active?: boolean;
}

export interface UserWithCredentials extends User {
  temporary_password?: string;
}

// Generate a secure temporary password
function generateTemporaryPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%&*';
  const all = uppercase + lowercase + numbers + special;

  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

export const userManagementService = {
  /**
   * Create a new user (admin only)
   * Uses Supabase Admin API to create auth user, then creates landlord_users record
   */
  createUser: async (input: CreateUserInput): Promise<UserWithCredentials> => {
    const temporaryPassword = input.password || generateTemporaryPassword();

    // Create the auth user using Supabase Auth
    // Note: This requires the service role key in a server-side context
    // For client-side, we use signUp and then update the role
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: input.email,
      password: temporaryPassword,
      options: {
        data: {
          full_name: input.full_name,
          phone: input.phone,
        },
        // Skip email confirmation for admin-created accounts
        emailRedirectTo: undefined,
      },
    });

    if (signUpError) {
      throw new Error(`Failed to create user: ${signUpError.message}`);
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user returned');
    }

    // Update the landlord_users record with the correct role
    // The trigger should have created a basic record, now we update it
    const { data: userData, error: updateError } = await supabase
      .from('landlord_users' as any)
      .update({
        full_name: input.full_name,
        phone: input.phone,
        role: input.role,
        organization_id: input.organization_id || null,
        landlord_id: input.landlord_id || null,
        is_active: true,
      })
      .eq('id', authData.user.id)
      .select()
      .single();

    if (updateError) {
      // If update fails, the trigger might not have run yet, try insert
      const { data: insertData, error: insertError } = await supabase
        .from('landlord_users' as any)
        .insert({
          id: authData.user.id,
          email: input.email,
          full_name: input.full_name,
          phone: input.phone,
          role: input.role,
          organization_id: input.organization_id || null,
          landlord_id: input.landlord_id || null,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create user profile: ${insertError.message}`);
      }

      if (!insertData) {
        throw new Error('Failed to create user profile - no data returned');
      }

      return {
        ...(insertData as any),
        temporary_password: temporaryPassword,
      } as UserWithCredentials;
    }

    if (!userData) {
      throw new Error('Failed to update user profile - no data returned');
    }

    return {
      ...(userData as any),
      temporary_password: temporaryPassword,
    } as UserWithCredentials;
  },

  /**
   * Get all users (with optional filters)
   */
  getUsers: async (filters?: {
    role?: UserRole;
    organization_id?: string;
    landlord_id?: string;
    is_active?: boolean;
    search?: string;
  }): Promise<User[]> => {
    let query = supabase
      .from('landlord_users' as any)
      .select('*, organization:organizations(*), landlord:landlords(*)');

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    if (filters?.organization_id) {
      query = query.eq('organization_id', filters.organization_id);
    }

    if (filters?.landlord_id) {
      query = query.eq('landlord_id', filters.landlord_id);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters?.search) {
      query = query.or(
        `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return data as User[];
  },

  /**
   * Get a single user by ID
   */
  getUserById: async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('landlord_users' as any)
      .select('*, organization:organizations(*), landlord:landlords(*)')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data as User;
  },

  /**
   * Update a user's profile
   */
  updateUser: async (userId: string, input: UpdateUserInput): Promise<User> => {
    const { data, error } = await supabase
      .from('landlord_users' as any)
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*, organization:organizations(*), landlord:landlords(*)')
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data as User;
  },

  /**
   * Deactivate a user (soft delete)
   */
  deactivateUser: async (userId: string): Promise<void> => {
    const { error } = await supabase
      .from('landlord_users' as any)
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to deactivate user: ${error.message}`);
    }
  },

  /**
   * Reactivate a user
   */
  reactivateUser: async (userId: string): Promise<void> => {
    const { error } = await supabase
      .from('landlord_users' as any)
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to reactivate user: ${error.message}`);
    }
  },

  /**
   * Reset a user's password (generates new temporary password)
   * Note: This requires admin/service role in production
   */
  resetUserPassword: async (userId: string): Promise<string> => {
    const newPassword = generateTemporaryPassword();

    // Get user email first
    const { data: userData, error: fetchError } = await supabase
      .from('landlord_users' as any)
      .select('email')
      .eq('id', userId)
      .single();

    if (fetchError || !userData) {
      throw new Error('User not found');
    }

    // Use Supabase Admin API to update password
    // Note: This endpoint may require service role key
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw new Error(`Failed to reset password: ${error.message}`);
    }

    return newPassword;
  },

  /**
   * Change own password (for authenticated users)
   */
  changePassword: async (newPassword: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(`Failed to change password: ${error.message}`);
    }
  },

  /**
   * Get current user profile from landlord_users table
   */
  getCurrentUserProfile: async (): Promise<User | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('landlord_users' as any)
      .select('*, organization:organizations(*), landlord:landlords(*)')
      .eq('id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    return data as User;
  },

  /**
   * Update last login timestamp
   */
  updateLastLogin: async (userId: string): Promise<void> => {
    await supabase
      .from('landlord_users' as any)
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);
  },

  /**
   * Get users by role for selection dropdowns
   */
  getUsersByRole: async (role: UserRole): Promise<User[]> => {
    const { data, error } = await supabase
      .from('landlord_users' as any)
      .select('id, email, full_name, role')
      .eq('role', role)
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return data as User[];
  },

  /**
   * Check if current user has admin privileges
   */
  isAdmin: async (): Promise<boolean> => {
    const profile = await userManagementService.getCurrentUserProfile();
    if (!profile) return false;
    return ['super_admin', 'nolojia_staff'].includes(profile.role);
  },

  /**
   * Check if current user can manage a specific role
   */
  canManageRole: async (targetRole: UserRole): Promise<boolean> => {
    const profile = await userManagementService.getCurrentUserProfile();
    if (!profile) return false;

    // Super admins can manage everyone
    if (profile.role === 'super_admin') return true;

    // Nolojia staff can manage landlords and ISPs
    if (profile.role === 'nolojia_staff') {
      return ['full_isp', 'landlord_admin', 'landlord_staff'].includes(targetRole);
    }

    // Landlord admins can manage their staff
    if (profile.role === 'landlord_admin') {
      return targetRole === 'landlord_staff';
    }

    return false;
  },
};

export default userManagementService;
