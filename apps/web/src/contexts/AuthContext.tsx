import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initializeAuth() {
      const isDev = import.meta.env.MODE === 'development';
      
      if (!supabase) {
        // In development, try dev-login if Supabase is not configured
        if (isDev) {
          try {
            console.log('[AUTH] Supabase not configured, using dev-login');
            const response = await fetch('/api/auth/dev-login');
            const result = await response.json();
            if (result.success && result.data.token) {
              localStorage.setItem('dev_token', result.data.token);
              console.log('[AUTH] Dev token acquired and stored');
            }
          } catch (error) {
            console.warn('[AUTH] Dev login failed:', error);
          }
        }
        setLoading(false);
        return;
      }

      // Try to get Supabase session, but fallback to dev-login on error
      let session = null;
      try {
        const result = await supabase.auth.getSession();
        session = result.data.session;
        console.log('[AUTH] Supabase session check:', { hasSession: !!session });
      } catch (error) {
        console.warn('[AUTH] Supabase session check failed:', error);
        // Supabase error - fallback to dev-login in development
        if (isDev) {
          try {
            console.log('[AUTH] Falling back to dev-login due to Supabase error');
            const response = await fetch('/api/auth/dev-login');
            const result = await response.json();
            if (result.success && result.data.token) {
              localStorage.setItem('dev_token', result.data.token);
              console.log('[AUTH] Dev token acquired and stored');
            }
          } catch (devError) {
            console.warn('[AUTH] Dev login fallback failed:', devError);
          }
        }
        setLoading(false);
        return;
      }
      
      // If no Supabase session in development, try dev-login
      if (!session && isDev) {
        try {
          console.log('[AUTH] No Supabase session, using dev-login');
          const response = await fetch('/api/auth/dev-login');
          const result = await response.json();
          if (result.success && result.data.token) {
            localStorage.setItem('dev_token', result.data.token);
            console.log('[AUTH] Dev token acquired and stored');
          }
        } catch (error) {
          console.warn('[AUTH] Dev login failed:', error);
        }
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }

    initializeAuth();

    // Only subscribe to Supabase auth changes if Supabase is configured
    if (supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSignOut = async () => {
    // Clear dev token if it exists
    if (import.meta.env.MODE === 'development') {
      localStorage.removeItem('dev_token');
    }
    
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut: handleSignOut }}>
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
