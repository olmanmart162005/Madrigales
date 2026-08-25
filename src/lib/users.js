import { supabase } from './supabase'
import { logActivity } from './activity'

/**
 * Crea un usuario real en Supabase Auth y profiles de forma directa y segura.
 */
export async function createSystemUser({ full_name, username, password, phone, role }) {
  const cleanName = full_name.trim()
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_.-]/g, '').trim()
  const assignedRole = role === 'administrador' ? 'administrador' : 'cajero'
  const email = `${cleanUsername}@madrigales.com`

  try {
    // 1. Llamada a la función RPC segura de servidor en Supabase
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_system_user_rpc', {
      p_email: email,
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

    if (rpcError) {
      throw new Error(rpcError.message || 'Error al procesar el usuario en la base de datos.')
    }

    throw new Error('No se pudo crear el usuario.')
  } catch (err) {
    console.error('Error creating user:', err)
    throw err
  }
}

/**
 * Restablece la contraseña de un usuario mediante la función RPC segura de Supabase.
 */
export async function resetUserPassword(userId, newPassword, userName = '') {
  try {
    const { data, error } = await supabase.rpc('reset_user_password_rpc', {
      p_user_id: userId,
      p_new_password: newPassword,
    })

    if (error) throw error

    await logActivity({
      action: `Restableció la contraseña del usuario "${userName || userId}"`,
      entityType: 'user',
      entityId: userId,
      entityName: userName,
    })

    return { success: true }
  } catch (err) {
    console.error('Error resetting password:', err)
    throw err
  }
}

/**
 * Elimina completamente un usuario de auth.users y public.profiles.
 */
export async function deleteSystemUser(userId, userName = '') {
  try {
    const { error } = await supabase.rpc('delete_system_user_rpc', {
      p_user_id: userId,
    })

    if (error) {
      // Fallback a borrado de profile directo si la función RPC aún no está
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
  } catch (err) {
    console.error('Error deleting user:', err)
    throw err
  }
}
