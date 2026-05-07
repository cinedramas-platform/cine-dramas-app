import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import * as authService from '@/services/auth';
import type { Session } from '@supabase/supabase-js';

type User = {
  id: string;
  email: string;
  tenantId: string;
};

type AuthState = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

function extractUser(session: Session): User {
  const { user } = session;
  return {
    id: user.id,
    email: user.email ?? '',
    tenantId: (user.app_metadata?.tenant_id as string) ?? '',
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  hydrate: async () => {
    try {
      const session = await authService.getSession();
      if (session) {
        set({ user: extractUser(session), session, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        set({ user: extractUser(session), session, isAuthenticated: true });
      } else {
        set({ user: null, session: null, isAuthenticated: false });
      }
    });
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { session } = await authService.signIn(email, password);
      set({
        user: extractUser(session),
        session,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Sign in failed',
      });
      throw err;
    }
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { session } = await authService.signUp(email, password);
      set({
        user: extractUser(session),
        session,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Sign up failed',
      });
      throw err;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await authService.signOut();
      set({ user: null, session: null, isAuthenticated: false, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Sign out failed',
      });
    }
  },

  clearError: () => set({ error: null }),
}));
