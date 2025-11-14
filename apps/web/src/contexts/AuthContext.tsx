import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'DELETED' | null;
  suspendedAt: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountStatus, setAccountStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'DELETED' | null>(null);
  const [suspendedAt, setSuspendedAt] = useState<string | null>(null);

  useEffect(() => {
    async function initializeAuth() {
      const enableDevLogin = import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true';
      
      if (!supabase) {
        // In development, try dev-login if Supabase is not configured
        if (enableDevLogin) {
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
        if (enableDevLogin) {
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
      if (!session && enableDevLogin) {
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
      
      // Fetch account status if user is logged in
      if (session?.user) {
        try {
          const response = await fetch('/api/user/me', { credentials: 'include' });
          const result = await response.json();
          if (result.success && result.user) {
            setAccountStatus(result.user.accountStatus || 'ACTIVE');
            setSuspendedAt(result.user.suspendedAt || null);
          }
        } catch (error) {
          console.warn('[AUTH] Failed to fetch account status:', error);
        }
      } else {
        setAccountStatus(null);
        setSuspendedAt(null);
      }
      
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
    if (import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true') {
      localStorage.removeItem('dev_token');
    }
    
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, accountStatus, suspendedAt, signOut: handleSignOut }}>
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
