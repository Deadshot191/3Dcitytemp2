import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  isInitialized: boolean;
  setSession: (session: Session | null) => void;
  setIsInitialized: (value: boolean) => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isInitialized: false,
  setSession: (session) => set({ session }),
  setIsInitialized: (value) => set({ isInitialized: value }),
  
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    if (data.session) {
      set({ session: data.session });
    }
  },
  
  signIn: async (email: string, password: string) => {
    const { data: { session }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    set({ session });
  },
  
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ session: null });
  },
}));

// Initialize session from local storage
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.getState().setSession(session);
  useAuthStore.getState().setIsInitialized(true);
});

// Listen for auth changes
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session);
});