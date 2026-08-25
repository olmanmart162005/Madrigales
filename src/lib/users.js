import { supabase } from './supabase'
import { logActivity } from './activity'

/**
 * Crea o actualiza un usuario en el sistema.
 * Utiliza la función RPC segura 'create_system_user_rpc' con privilegios de servidor.
 */
export async function createSystemUser({ email, password, full_name, phone, role }) {
  const cleanEmail = email.trim().toLowerCase()
  const cleanName = full_name.trim()
  const assignedRole = role === 'administrador' ? 'administrador' : 'cajero'

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_system_user_rpc', {
      p_email: cleanEmail,
      p_password: password,
      p_full_name: cleanName,
      p_phone: phone ? phone.trim() : null,
      p_role: assignedRole,
    })

    if (!rpcError && rpcData) {
      await logActivity({
        action: `Creó o reactivó al usuario "${cleanName}" (${assignedRole})`,
        entityType: 'user',
        entityId: rpcData.id || null,
        entityName: cleanName,
      })
      return { success: true, user: rpcData }
    }

    if (rpcError) {
      throw new Error(rpcError.message || 'Error al procesar el usuario')
    }

    throw new Error('No se pudo crear el usuario')
  } catch (err) {
    console.error('Error creating user:', err)
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
