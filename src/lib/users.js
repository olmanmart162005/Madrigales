import { supabase } from './supabase'
import { logActivity } from './activity'

/**
 * Obtiene los headers de autorización con el JWT de la sesión activa
 */
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('No hay una sesión activa de usuario.')
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  }
}

/**
 * Crea un usuario real en Supabase Auth y profiles mediante el backend seguro.
 */
export async function createSystemUser({ full_name, username, password, phone, role }) {
  const cleanName = full_name.trim()
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_.-]/g, '').trim()
  const assignedRole = role === 'administrador' ? 'administrador' : 'cajero'

  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/admin-users', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'create_user',
        full_name: cleanName,
        username: cleanUsername,
        password: password,
        phone: phone ? phone.trim() : null,
        role: assignedRole,
      }),
    })

    const result = await response.json()

    if (!response.ok || result.error) {
      throw new Error(result.error || 'Error al crear usuario en el servidor.')
    }

    return { success: true, user: result.user }
  } catch (err) {
    console.error('Error creating user via backend function:', err)
    
    // Si la función serverless no está disponible (ej. en desarrollo local sin netlify dev),
    // intentar vía RPC seguro de Supabase
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_system_user_rpc', {
        p_email: `${cleanUsername}@madrigales.com`,
        p_password: password,
        p_full_name: cleanName,
        p_username: cleanUsername,
        p_phone: phone ? phone.trim() : null,
        p_role: assignedRole,
      })

      if (!rpcError && rpcData) {
        await logActivity({
          action: `Creó al usuario "${cleanName}" (@${cleanUsername}) como ${assignedRole}`,
          entityType: 'user',
          entityId: rpcData.id || null,
          entityName: cleanName,
        })
        return { success: true, user: rpcData }
      }

      if (rpcError) throw rpcError
    } catch (rpcErr) {
      console.error('RPC fallback error:', rpcErr)
    }

    throw err
  }
}

/**
 * Restablece la contraseña de un usuario mediante el backend seguro.
 */
export async function resetUserPassword(userId, newPassword, userName = '') {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/admin-users', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'reset_password',
        user_id: userId,
        new_password: newPassword,
      }),
    })

    const result = await response.json()

    if (!response.ok || result.error) {
      throw new Error(result.error || 'Error al restablecer la contraseña.')
    }

    return { success: true, message: result.message }
  } catch (err) {
    console.error('Error resetting password via backend function:', err)

    // Fallback RPC
    try {
      const { data, error } = await supabase.rpc('reset_user_password_rpc', {
        p_user_id: userId,
        p_new_password: newPassword,
      })
      if (!error) {
        await logActivity({
          action: `Restableció la contraseña del usuario "${userName || userId}"`,
          entityType: 'user',
          entityId: userId,
          entityName: userName,
        })
        return { success: true }
      }
      if (error) throw error
    } catch (rpcErr) {
      console.error('RPC reset fallback error:', rpcErr)
    }

    throw err
  }
}

/**
 * Elimina completamente un usuario de auth.users y public.profiles.
 */
export async function deleteSystemUser(userId, userName = '') {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/admin-users', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'delete_user',
        user_id: userId,
      }),
    })

    const result = await response.json()

    if (!response.ok || result.error) {
      throw new Error(result.error || 'Error al eliminar usuario.')
    }

    return { success: true }
  } catch (err) {
    console.error('Error deleting user via backend function:', err)

    // Fallback RPC / direct delete
    try {
      const { error } = await supabase.rpc('delete_system_user_rpc', {
        p_user_id: userId,
      })

      if (error) {
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId)
        if (profileError) throw profileError
      }

      await logActivity({
        action: `Eliminó al usuario "${userName || userId}"`,
        entityType: 'user',
        entityId: userId,
        entityName: userName,
      })

      return { success: true }
    } catch (fallbackErr) {
      console.error('Fallback delete error:', fallbackErr)
      throw err
    }
  }
}
