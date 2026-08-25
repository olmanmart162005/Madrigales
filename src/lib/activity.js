import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

/**
 * Registra una acción en el log de actividad del sistema
 */
export async function logActivity({
  action,
  entityType = null,
  entityId = null,
  entityName = null,
  details = null,
}) {
  try {
    const { user, profile } = useAuthStore.getState()
    if (!user) return

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      user_name: profile?.full_name || user.email,
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      entity_name: entityName,
      details,
    })
  } catch (error) {
    // No interrumpir el flujo principal si falla el log
    console.warn('Error registrando actividad:', error)
  }
}

export default logActivity
