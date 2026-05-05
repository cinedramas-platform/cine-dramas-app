import { create } from 'zustand';

type User = {
  id: string;
  email: string;
  tenantId: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (user: User) => void;
  signOut: () => void;
  setLoading: (loading: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  // Defaults to true for development until CD-27 (Supabase Auth) is wired up
  user: null,
  isAuthenticated: true,
  isLoading: false,
  signIn: (user) => set({ user, isAuthenticated: true }),
  signOut: () => set({ user: null, isAuthenticated: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
