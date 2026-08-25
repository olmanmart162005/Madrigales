/**
 * Estilos y constantes de animación para Madrigales Pastelería
 * Acelerados por hardware (GPU)
 */

export const luxuryColors = {
  background: '#1E1028',
  backgroundSecondary: '#2A1735',
  surface: 'rgba(42, 23, 53, 0.85)',
  primary: '#C45A7A',
  primaryLight: '#E7829E',
  secondary: '#8B5CF6',
  gold: '#D9A86C',
  goldLight: '#F0C78D',
  textPrimary: '#F8F3F5',
  textSecondary: '#B9AEBB',
  border: 'rgba(232, 130, 158, 0.25)',
}

export const getReducedMotion = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
