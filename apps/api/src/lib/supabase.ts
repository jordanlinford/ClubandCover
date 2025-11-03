import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function verifySupabaseToken(token: string) {
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
  
  return data.user;
}
