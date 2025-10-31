/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, first_name, last_name, area_id, permissao, selected_permissions, cargo_funcao } = await req.json(); // NOVO: Receber cargo_funcao

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    });

    if (authError) {
      console.error('Error creating auth user in Edge Function:', authError.message);
      return new Response(JSON.stringify({ error: authError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Update public.usuarios profile with area_id, permissao, and cargo_funcao
    // The handle_new_user trigger will create the initial profile, then we update it.
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('usuarios')
      .update({ area_id, permissao, cargo_funcao, updated_at: new Date().toISOString() }) // NOVO: Incluir cargo_funcao
      .eq('id', authData.user.id)
      .select('*, area:areas(nome)')
      .single();

    if (profileError) {
      console.error('Error updating user profile after creation in Edge Function:', profileError.message);
      // Attempt to delete the auth user if profile update fails to prevent orphaned users
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ error: profileError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Handle granular permissions
    if (selected_permissions && selected_permissions.length > 0) {
      // Fetch all available permissions to map selected_permissions (string keys) to permission_ids (UUIDs)
      const { data: allPermissions, error: permissionsError } = await supabaseAdmin.from('permissions').select('id, resource, action');
      if (permissionsError) {
        console.error('Error fetching all permissions for new user:', permissionsError.message);
        // Log error but don't fail user creation entirely if permissions can't be set
      } else {
        const permissionMap = new Map<string, string>(); // Map "resource_action" to "id"
        allPermissions.forEach(p => permissionMap.set(`${p.resource}_${p.action}`, p.id));

        const permissionsToInsert = selected_permissions
          .map((key: string) => permissionMap.get(key))
          .filter(Boolean) as string[];

        if (permissionsToInsert.length > 0) {
          const { error: insertPermissionsError } = await supabaseAdmin
            .from('user_permissions')
            .insert(permissionsToInsert.map(pid => ({ user_id: authData.user.id, permission_id: pid })));

          if (insertPermissionsError) {
            console.error('Error inserting new user granular permissions:', insertPermissionsError.message);
            // Log error but don't fail user creation entirely
          }
        }
      }
    }

    const newUserProfile = {
      ...profileData,
      email: authData.user.email || 'N/A',
      area_name: (profileData as any).area?.nome || 'N/A',
    };

    return new Response(JSON.stringify(newUserProfile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Unhandled error in create-user edge function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});