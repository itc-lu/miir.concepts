'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database.types';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
  });

  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setState(s => ({ ...s, error, loading: false }));
        return;
      }

      if (session?.user) {
        setState(s => ({ ...s, user: session.user, session, loading: true }));
        // Fetch profile
        fetchProfile(session.user.id);
      } else {
        setState(s => ({ ...s, loading: false }));
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setState(s => ({ ...s, user: session.user, session }));
        fetchProfile(session.user.id);
      } else {
        setState({
          user: null,
          profile: null,
          session: null,
          loading: false,
          error: null,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      setState(s => ({ ...s, error, loading: false }));
    } else {
      setState(s => ({ ...s, profile: data, loading: false }));
    }
  }

  async function signIn(email: string, password: string) {
    setState(s => ({ ...s, loading: true, error: null }));

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setState(s => ({ ...s, error, loading: false }));
      throw error;
    }

    return data;
  }

  async function signUp(email: string, password: string, fullName?: string) {
    setState(s => ({ ...s, loading: true, error: null }));

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setState(s => ({ ...s, error, loading: false }));
      throw error;
    }

    return data;
  }

  async function signOut() {
    setState(s => ({ ...s, loading: true }));
    const { error } = await supabase.auth.signOut();
    if (error) {
      setState(s => ({ ...s, error, loading: false }));
      throw error;
    }
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!state.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', state.user.id)
      .select()
      .single();

    if (error) throw error;

    setState(s => ({ ...s, profile: data }));
    return data;
  }

  // Role hierarchy helpers
  const role = state.profile?.role;
  const isGlobalAdmin = role === 'global_admin';
  const isInternalAdminOrAbove = role === 'global_admin' || role === 'internal_admin';
  const isInternalUserOrAbove = isInternalAdminOrAbove || role === 'internal_user';
  const isExternal = role === 'external';

  return {
    user: state.user,
    profile: state.profile,
    session: state.session,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,
    // Role hierarchy
    isGlobalAdmin,
    isInternalAdminOrAbove,
    isInternalUserOrAbove,
    isExternal,
    // Permission helpers
    canManageUsers: isInternalAdminOrAbove,
    canManageMovies: isInternalUserOrAbove,
    canManageSessions: isInternalUserOrAbove || isExternal, // External can only manage their linked cinemas
    canManageReferenceTables: isInternalAdminOrAbove,
    canManageCinemas: isInternalAdminOrAbove,
    // Auth methods
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  };
}
