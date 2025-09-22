import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is not defined in environment variables.");
  // In a real application, you might want to throw an error or handle this more gracefully.
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);