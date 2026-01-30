'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { supabaseAuthApi } from '@/lib/supabase-api';
import { useRouter } from 'next/navigation';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User, UserRole } from '@/types/landlord';

interface AuthContextType {
  user: SupabaseUser | null;
  profile: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
  // Role helpers
  role: UserRole | null;
  isAdmin: boolean;
  isNolojiaStaff: boolean;
  isISP: boolean;
  isLandlord: boolean;
  canAccessAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch user profile via API (bypasses RLS issues)
  const fetchUserProfile = async (userId: string, fallbackData?: { email?: string; role?: UserRole; full_name?: string }) => {
    try {
      // Use API route to bypass RLS
      const response = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.profile) {
        setProfile(data.profile as User);
      } else {
        console.log('Profile not found in DB, using fallback');
        // Set a minimal profile so the app doesn't get stuck
        setProfile({
          id: userId,
          email: fallbackData?.email || '',
          role: fallbackData?.role || 'full_isp',
          full_name: fallbackData?.full_name || fallbackData?.email?.split('@')[0] || 'User',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as User);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Set minimal profile on error
      setProfile({
        id: userId,
        email: fallbackData?.email || '',
        role: fallbackData?.role || 'full_isp',
        full_name: fallbackData?.full_name || fallbackData?.email?.split('@')[0] || 'User',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as User);
    }
  };

  // Check if user is logged in on mount and listen for auth changes
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        setLoading(false);

        if (initialSession?.user) {
          fetchUserProfile(initialSession.user.id, {
            email: initialSession.user.email,
          });
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event);

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Try to get role from API for accurate fallback
          let roleData = { role: null, full_name: null, email: currentSession.user.email };
          try {
            const response = await fetch('/api/auth/role', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: currentSession.user.id,
                accessToken: currentSession.access_token,
              }),
            });
            if (response.ok) {
              roleData = await response.json();
            }
          } catch (e) {
            console.log('Could not fetch role for auth state change');
          }

          fetchUserProfile(currentSession.user.id, {
            email: currentSession.user.email,
            role: roleData.role as unknown as UserRole,
            full_name: roleData.full_name || undefined,
          });
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setSession(data.session);
      setUser(data.user);

      // Fetch user profile to determine redirect
      if (data.user) {
        console.log('Login successful, checking role via API for user:', data.user.id);

        // Use API route to get role (bypasses RLS timing issues)
        try {
          const response = await fetch('/api/auth/role', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: data.user.id,
              accessToken: data.session?.access_token,
            }),
          });

          const roleData = await response.json();
          console.log('Role API response:', roleData, 'Status:', response.status);

          // Update profile state with fallback data from API
          fetchUserProfile(data.user.id, {
            email: roleData.email || email,
            role: roleData.role as UserRole,
            full_name: roleData.full_name,
          });

          if (response.ok && roleData.redirectPath) {
            console.log('Redirecting to:', roleData.redirectPath);
            router.push(roleData.redirectPath);
          } else {
            console.log('Fallback redirect to dashboard (API response not ok or missing path)');
            router.push('/dashboard');
          }
        } catch (apiError) {
          console.error('Role API error:', apiError);
          // Fallback to dashboard on error
          router.push('/dashboard');
        }
      } else {
        console.log('No user in session data, redirecting to dashboard');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabaseAuthApi.logout();
      setUser(null);
      setProfile(null);
      setSession(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = (userData: Partial<User>) => {
    if (profile) {
      const updatedProfile = { ...profile, ...userData } as User;
      setProfile(updatedProfile);
    }
  };

  // Role helpers
  const role = profile?.role || null;
  const isAdmin = role === 'super_admin';
  const isNolojiaStaff = role === 'nolojia_staff' || role === 'super_admin';
  const isISP = role === 'full_isp';
  const isLandlord = role === 'landlord_admin' || role === 'landlord_staff';
  const canAccessAdmin = isAdmin || isNolojiaStaff;

  const value = {
    user,
    profile,
    session,
    loading,
    login,
    logout,
    updateProfile,
    isAuthenticated: !!session,
    // Role helpers
    role,
    isAdmin,
    isNolojiaStaff,
    isISP,
    isLandlord,
    canAccessAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
