import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required. ' +
        'Please add them to use authentication features.'
      );
    }
    
    supabaseInstance = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }
  
  return supabaseInstance;
}

// Export for backward compatibility
export const supabase = {
  get auth() {
    return getSupabase().auth;
  }
};

export async function verifySupabaseToken(token: string) {
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
  
  return data.user;
}
