import { createClient } from '@supabase/supabase-js';

const supabaseAdminUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseAdminUrl || !supabaseServiceRoleKey) {
  console.error("Supabase URL or Service Role Key is not defined in environment variables.");
  // Em uma aplicação real, você pode querer lançar um erro ou lidar com isso de forma mais elegante.
}

export const supabaseAdmin = createClient(supabaseAdminUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false, // O cliente admin não precisa persistir a sessão
  },
});