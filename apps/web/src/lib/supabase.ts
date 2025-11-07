import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are properly configured (not empty strings or undefined)
const isConfigured = supabaseUrl && supabaseAnonKey && 
  typeof supabaseUrl === 'string' && supabaseUrl.trim() !== '' &&
  typeof supabaseAnonKey === 'string' && supabaseAnonKey.trim() !== '';

if (!isConfigured) {
  console.warn('Supabase credentials not configured. Authentication features will be disabled.');
}

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
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
