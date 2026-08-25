// Edge Function: create-user
// Supabase Functions runtime (Deno)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado: Falta token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    // Cliente con privilegios de usuario para verificar su identidad
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: callerUser }, error: userError } = await userClient.auth.getUser()
    if (userError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Usuario invocador no válido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente administrativo de servidor con Service Role Key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Obtener perfil del invocador
    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('full_name, role, is_owner, is_active')
      .eq('id', callerUser.id)
      .single()

    if (profileError || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Perfil no encontrado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verificar si es Administrador o Propietario (Owner) y que esté activo
    const isAuthorized = (callerProfile.is_owner || callerProfile.role === 'administrador') && callerProfile.is_active
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'No tienes permisos de Administrador para crear usuarios' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { email, password, full_name, phone, role } = body

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios (email, password, full_name)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validar rol permitido
    const assignedRole = role === 'administrador' ? 'administrador' : 'cajero'

    // 1. Crear usuario en Auth con confirmación automática
    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        role: assignedRole,
      },
    })

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const newUserId = newUserData.user.id

    // 2. Upsert en tabla profiles (SIEMPRE is_owner = false)
    const { data: newProfile, error: profileInsertError } = await adminClient
      .from('profiles')
      .upsert({
        id: newUserId,
        full_name: full_name.trim(),
        phone: phone ? phone.trim() : null,
        role: assignedRole,
        is_owner: false, // NUNCA se permite asignar owner desde la creación
        is_active: true,
      })
      .select()
      .single()

    if (profileInsertError) {
      return new Response(JSON.stringify({ error: profileInsertError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Registrar auditoría en activity_logs
    await adminClient.from('activity_logs').insert({
      user_id: callerUser.id,
      user_name: callerProfile.full_name,
      action: `${callerProfile.is_owner ? 'El Propietario' : 'El Administrador'} ${callerProfile.full_name} creó al usuario "${full_name.trim()}" con rol ${assignedRole}`,
      entity_type: 'user',
      entity_id: newUserId,
      entity_name: full_name.trim(),
    })

    return new Response(
      JSON.stringify({
        success: true,
        user: newUserData.user,
        profile: newProfile,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
