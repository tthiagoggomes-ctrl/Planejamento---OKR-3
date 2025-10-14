/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, User } from 'https://esm.sh/@supabase/supabase-js@2.45.0' // Import User type

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get('sortBy') || 'first_name'; // Default sort by first_name
    const sortOrder = searchParams.get('sortOrder') || 'asc'; // Default sort order asc

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
    const authUsersMap = new Map<string, User>(authUsersData.users.map(user => [user.id, user])) // Explicitly type the Map

    // Fetch user profiles from public.usuarios, joining with areas
    let profilesQuery = supabaseAdmin
      .from('usuarios')
      .select('*, area:areas(nome)');

    // Apply sorting based on parameters
    if (sortBy === 'area_name') {
      profilesQuery = profilesQuery.order('area.nome', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'email') {
      // Sorting by email needs to be done client-side after combining auth and profile data
      // For now, we'll sort by first_name as a fallback for email in DB query
      profilesQuery = profilesQuery.order('first_name', { ascending: sortOrder === 'asc' });
    } else {
      profilesQuery = profilesQuery.order(sortBy, { ascending: sortOrder === 'asc' });
    }

    const { data: profilesData, error: profilesError } = await profilesQuery;

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError.message)
      return new Response(JSON.stringify({ error: 'Failed to fetch user profiles' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Combine data
    let combinedUsers = profilesData.map(profile => ({
      ...profile,
      email: authUsersMap.get(profile.id)?.email || 'N/A',
      area_name: (profile as any).area?.nome || 'N/A',
    }))

    // If sorting by email, do it client-side after combining
    if (sortBy === 'email') {
      combinedUsers.sort((a, b) => {
        const emailA = a.email || '';
        const emailB = b.email || '';
        return sortOrder === 'asc' ? emailA.localeCompare(emailB) : emailB.localeCompare(emailA);
      });
    }

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