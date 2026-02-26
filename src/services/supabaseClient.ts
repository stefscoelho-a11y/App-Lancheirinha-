import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let client: SupabaseClient | null = null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const getSupabase = () => {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
};

// Proxy to prevent crash on module load, but provide helpful error on access
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const s = getSupabase();
    if (!s) {
      // Return a dummy function for common calls to avoid immediate crash if possible,
      // or throw a descriptive error.
      throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
    }
    const value = (s as any)[prop];
    return typeof value === 'function' ? value.bind(s) : value;
  }
});
