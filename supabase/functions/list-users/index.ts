import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Fetch auth users
    const { data: authUsersData, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    if (authError) {
      console.error('Error fetching auth users:', authError.message)
      return new Response(JSON.stringify({ error: 'Failed to fetch auth users' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }
    const authUsersMap = new Map(authUsersData.users.map(user => [user.id, user]))

    // Fetch user profiles from public.usuarios, joining with areas
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from('usuarios')
      .select('*, area:areas(nome)')
      .order('first_name', { ascending: true })

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError.message)
      return new Response(JSON.stringify({ error: 'Failed to fetch user profiles' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Combine data
    const combinedUsers = profilesData.map(profile => ({
      ...profile,
      email: authUsersMap.get(profile.id)?.email || 'N/A',
      area_name: (profile as any).area?.nome || 'N/A',
    }))

    return new Response(JSON.stringify(combinedUsers), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Unhandled error in list-users edge function:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})