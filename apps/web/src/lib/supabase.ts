import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[SUPABASE] Checking config:', {
  hasUrl: !!supabaseUrl,
  urlValue: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length
});

// Check if credentials are properly configured and are valid URLs
const isValidUrl = (url: any): boolean => {
  if (!url || typeof url !== 'string' || url.trim() === '') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isConfigured = 
  isValidUrl(supabaseUrl) && 
  supabaseAnonKey && 
  typeof supabaseAnonKey === 'string' && 
  supabaseAnonKey.trim() !== '';

console.log('[SUPABASE] Is configured:', isConfigured);

if (!isConfigured) {
  console.warn('Supabase credentials not configured. Authentication features will be disabled.');
  console.warn('[SUPABASE] URL valid:', isValidUrl(supabaseUrl));
  console.warn('[SUPABASE] Key valid:', !!(supabaseAnonKey && typeof supabaseAnonKey === 'string' && supabaseAnonKey.trim() !== ''));
}

export const supabase = isConfigured 
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export async function signUp(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signUp({ email, password });
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.getSession();
}
