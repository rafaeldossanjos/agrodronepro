import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // User client to verify the request
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get the current user
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { email, role, teamId } = await req.json()

    // Validate inputs
    if (!email || typeof email !== 'string' || email.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Invalid email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!role || !['admin', 'member'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be admin or member' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!teamId || typeof teamId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid team ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Service client for admin operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the requesting user is an admin/owner of the team
    const { data: membership, error: membershipError } = await serviceClient
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      console.error('Membership check error:', membershipError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify team membership' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Only team owners and admins can invite members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service client to find user by email (bypasses RLS)
    const { data: profileData, error: profileError } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (profileError) {
      console.error('Profile lookup error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to lookup user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return generic error to prevent email enumeration
    if (!profileData) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado. Verifique se o email está correto.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is already a member
    const { data: existingMember } = await serviceClient
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', profileData.id)
      .maybeSingle()

    if (existingMember) {
      return new Response(
        JSON.stringify({ error: 'Este usuário já faz parte da equipe.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add user to team
    const { data: newMember, error: insertError } = await serviceClient
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: profileData.id,
        role: role
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert member error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to add team member' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, member: newMember }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
