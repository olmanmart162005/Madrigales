import { createClient } from '@supabase/supabase-js'

// Inicializar cliente Supabase con privilegios administrativos (Service Role)
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://olmzeebxhpvettrrtbet.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada en las variables de entorno del servidor.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Inicializar cliente anónimo para validar tokens de sesión
const getSupabaseAnon = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://olmzeebxhpvettrrtbet.supabase.co'
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable__3y-F1yhLADrJXEtOZTMqQ_ZFmcegq0'

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Validar que el emisor sea un Administrador o Propietario
async function validateCaller(authHeader, supabaseAdmin) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token de autorización no proporcionado.')
  }

  const token = authHeader.replace('Bearer ', '').trim()
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

  if (userError || !user) {
    throw new Error('Sesión inválida o expirada.')
  }

  // Verificar perfil en base de datos
  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, username, role, is_owner, is_active')
    .eq('id', user.id)
    .single()

  if (profileError || !callerProfile) {
    throw new Error('No se encontró el perfil del usuario emisor.')
  }

  if (callerProfile.is_active === false) {
    throw new Error('Tu cuenta se encuentra desactivada.')
  }

  const isAuthorized = callerProfile.role === 'administrador' || callerProfile.is_owner === true
  if (!isAuthorized) {
    throw new Error('No tienes permisos administrativos para gestionar usuarios.')
  }

  return callerProfile
}

export const handler = async (event) => {
  // Configurar headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido. Utiliza POST.' })
    }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const caller = await validateCaller(event.headers.authorization || event.headers.Authorization, supabaseAdmin)

    const payload = JSON.parse(event.body || '{}')
    const { action } = payload

    // ============================================================
    // ACCIÓN 1: CREAR USUARIO REAL EN SUPABASE AUTH + PROFILES
    // ============================================================
    if (action === 'create_user') {
      const { full_name, username, password, role, phone } = payload

      if (!full_name || !full_name.trim()) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'El nombre completo es requerido.' }) }
      }

      if (!username || !username.trim()) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'El nombre de usuario es requerido.' }) }
      }

      if (!password || password.length < 6) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres.' }) }
      }

      const cleanFullName = full_name.trim()
      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_.-]/g, '').trim()
      const assignedRole = role === 'administrador' ? 'administrador' : 'cajero'
      const canonicalEmail = `${cleanUsername}@madrigales.com`

      // 1. Verificar si el username ya está registrado en profiles
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, username, full_name')
        .eq('username', cleanUsername)
        .maybeSingle()

      if (existingProfile) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `El nombre de usuario @${cleanUsername} ya está registrado para "${existingProfile.full_name}".` })
        }
      }

      // 2. Crear usuario real en Supabase Auth mediante la API oficial Admin
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: canonicalEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanFullName,
          username: cleanUsername,
          role: assignedRole
        }
      })

      if (authError) {
        // Si el usuario ya existía en auth pero no en profiles, intentar actualizar su password
        if (authError.message?.toLowerCase().includes('already registered') || authError.message?.toLowerCase().includes('duplicate')) {
          // Buscar el user ID en auth
          const { data: userList } = await supabaseAdmin.auth.admin.listUsers()
          const matchedUser = userList?.users?.find(u => u.email?.toLowerCase() === canonicalEmail)

          if (matchedUser) {
            // Actualizar contraseña del usuario existente
            await supabaseAdmin.auth.admin.updateUserById(matchedUser.id, {
              password: password,
              email_confirm: true,
              user_metadata: { full_name: cleanFullName, username: cleanUsername, role: assignedRole }
            })

            // Upsert en profiles
            await supabaseAdmin.from('profiles').upsert({
              id: matchedUser.id,
              full_name: cleanFullName,
              username: cleanUsername,
              phone: phone ? phone.trim() : null,
              role: assignedRole,
              is_owner: false,
              is_active: true,
              created_by: caller.id,
              updated_at: new Date().toISOString()
            })

            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                message: `Usuario @${cleanUsername} actualizado y reactivado con éxito.`,
                user: { id: matchedUser.id, username: cleanUsername, full_name: cleanFullName, role: assignedRole }
              })
            }
          }
        }

        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Error al crear usuario en Supabase Auth: ${authError.message}` })
        }
      }

      const newUserId = authData.user.id

      // 3. Crear el registro en profiles vinculado por el mismo ID
      const { error: profileInsertError } = await supabaseAdmin.from('profiles').upsert({
        id: newUserId,
        full_name: cleanFullName,
        username: cleanUsername,
        phone: phone ? phone.trim() : null,
        role: assignedRole,
        is_owner: false,
        is_active: true,
        created_by: caller.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      if (profileInsertError) {
        console.error('Error creating profile:', profileInsertError)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: `Usuario creado en Auth pero falló el perfil: ${profileInsertError.message}` })
        }
      }

      // 4. Registrar log de auditoría
      await supabaseAdmin.from('activity_logs').insert({
        user_id: caller.id,
        user_name: caller.full_name,
        user_role: caller.role,
        action: `Creó al usuario "${cleanFullName}" (@${cleanUsername}) como ${assignedRole}`,
        entity_type: 'user',
        entity_id: newUserId,
        entity_name: cleanFullName,
        created_at: new Date().toISOString()
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Usuario @${cleanUsername} creado exitosamente. Ya puede iniciar sesión.`,
          user: {
            id: newUserId,
            username: cleanUsername,
            email: canonicalEmail,
            full_name: cleanFullName,
            role: assignedRole,
            created_by: caller.id
          }
        })
      }
    }

    // ============================================================
    // ACCIÓN 2: RESTABLECER CONTRASEÑA DE FORMA SEGURA
    // ============================================================
    if (action === 'reset_password') {
      const { user_id, new_password } = payload

      if (!user_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'El ID del usuario es requerido.' }) }
      }

      if (!new_password || new_password.length < 6) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' }) }
      }

      // Verificar que el objetivo no sea el Owner (a menos que el emisor sea el Owner)
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, username, is_owner')
        .eq('id', user_id)
        .single()

      if (targetProfile?.is_owner && !caller.is_owner) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'No tienes permisos para restablecer la contraseña del Propietario del Sistema.' })
        }
      }

      // Actualizar en Supabase Auth mediante API oficial
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password: new_password,
        email_confirm: true
      })

      if (updateError) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Error al actualizar contraseña: ${updateError.message}` })
        }
      }

      // Registrar auditoría
      await supabaseAdmin.from('activity_logs').insert({
        user_id: caller.id,
        user_name: caller.full_name,
        user_role: caller.role,
        action: `Restableció la contraseña del usuario "${targetProfile?.full_name || user_id}"`,
        entity_type: 'user',
        entity_id: user_id,
        entity_name: targetProfile?.full_name,
        created_at: new Date().toISOString()
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Contraseña actualizada correctamente para ${targetProfile?.full_name || 'el usuario'}.`
        })
      }
    }

    // ============================================================
    // ACCIÓN 3: ELIMINAR USUARIO DE AUTH + PROFILES
    // ============================================================
    if (action === 'delete_user') {
      const { user_id } = payload

      if (!user_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'El ID del usuario es requerido.' }) }
      }

      if (user_id === caller.id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'No puedes eliminar tu propia cuenta en sesión.' }) }
      }

      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, is_owner')
        .eq('id', user_id)
        .single()

      if (targetProfile?.is_owner) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'El Propietario del Sistema no puede ser eliminado.' }) }
      }

      // Eliminar de Supabase Auth
      await supabaseAdmin.auth.admin.deleteUser(user_id)

      // Eliminar de profiles
      await supabaseAdmin.from('profiles').delete().eq('id', user_id)

      // Registrar auditoría
      await supabaseAdmin.from('activity_logs').insert({
        user_id: caller.id,
        user_name: caller.full_name,
        user_role: caller.role,
        action: `Eliminó permanentemente al usuario "${targetProfile?.full_name || user_id}"`,
        entity_type: 'user',
        entity_id: user_id,
        entity_name: targetProfile?.full_name,
        created_at: new Date().toISOString()
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Usuario eliminado correctamente.' })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Acción no reconocida: "${action}".` })
    }

  } catch (err) {
    console.error('Error in admin-users serverless function:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Error interno del servidor.' })
    }
  }
}
