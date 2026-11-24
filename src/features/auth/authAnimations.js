/**
 * Estilos y constantes de animación para Nani Cake
 * Acelerados por hardware (GPU)
 */

export const luxuryColors = {
  background: '#1E1028',
  backgroundSecondary: '#2A1735',
  surface: 'rgba(42, 23, 53, 0.85)',
  primary: '#C45A7A',
  primaryLight: '#E7829E',
  secondary: '#C8102E',
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
