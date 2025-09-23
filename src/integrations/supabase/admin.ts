import { createClient } from '@supabase/supabase-js';

const supabaseAdminUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseAdminUrl) {
  throw new Error("VITE_SUPABASE_URL is not defined in environment variables for admin client.");
}
if (!supabaseServiceRoleKey) {
  throw new Error("VITE_SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables.");
}

export const supabaseAdmin = createClient(supabaseAdminUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false, // O cliente admin não precisa persistir a sessão
  },
});