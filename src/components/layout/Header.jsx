import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Menu, User, LogOut, Settings, Crown, Download } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getInitials } from '@/utils'
import toast from 'react-hot-toast'

const PAGE_NAMES = {
  '/': 'Dashboard',
  '/pedidos': 'Pedidos & Facturación',
  '/pedidos/nuevo': 'Nuevo Pedido',
  '/calendario': 'Calendario de Entregas',
  '/productos': 'Catálogo de Productos',
  '/almacen': 'Almacén & Materias Primas',
  '/reportes': 'Reportes & Analítica',
  '/usuarios': 'Administración de Usuarios',
  '/perfil': 'Mi Perfil',
  '/configuracion': 'Configuración del Negocio',
}

function getPageTitle(pathname) {
  if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname]
  if (pathname.startsWith('/pedidos/')) return 'Detalle del Pedido'
  return 'Madrigales'
}

export default function Header({ onToggleSidebar }) {
  const { profile, signOut, isOwner } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const dropdownRef = useRef(null)

  const title = getPageTitle(location.pathname)
  const owner = isOwner()

  useEffect(() => {
    // Detectar si la aplicación ya está instalada / modo standalone
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://')
      setIsStandalone(isStandaloneMode)
    }

    checkStandalone()
    const matcher = window.matchMedia('(display-mode: standalone)')
    matcher.addEventListener?.('change', checkStandalone)

    const handlePrompt = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }

    const handleAppInstalled = () => {
      setInstallPrompt(null)
      setIsStandalone(true)
      toast.success('¡Madrigales Pastelería instalada con éxito!')
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      matcher.removeEventListener?.('change', checkStandalone)
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallApp = async () => {
    if (!installPrompt) {
      toast('Para instalar en tu dispositivo, presiona "Instalar aplicación" en el menú de tu navegador.', { icon: '📱' })
      return
    }
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
      setIsStandalone(true)
      toast.success('¡Madrigales Pastelería instalada con éxito!')
    }
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Sesión cerrada')
      navigate('/login')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  return (
    <header
      className="fixed top-0 right-0 left-0 lg:left-[260px] z-30 h-16 bg-white/95 backdrop-blur-md border-b border-purple-100/90 shadow-xs flex items-center justify-between px-3 sm:px-6 transition-all duration-300"
    >
      {/* Botón Hamburger + Logo Móvil / Título Desktop */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Botón Hamburger para móviles y tablets */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-gray-700 hover:bg-purple-50 active:bg-purple-100 transition-colors cursor-pointer"
          title="Abrir menú"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6 text-purple-900" />
        </button>

        {/* Branding móvil */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-white border border-purple-100 p-0.5 shadow-xs flex items-center justify-center overflow-hidden">
            <img src="/LOGO_OFICIAL_BLANCO.png" alt="Madrigales" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-sm font-extrabold text-gray-900 leading-tight block">
              Madrigales
            </span>
            <span className="text-[9px] font-bold text-fuchsia-600 tracking-wider uppercase block leading-none">
              {title}
            </span>
          </div>
        </div>

        {/* Título en Desktop */}
        <div className="hidden lg:block">
          <h2 className="text-base font-bold text-gray-900 leading-tight">
            {title}
          </h2>
        </div>
      </div>

      {/* Acciones del Header: Instalar App & Perfil */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Botón PWA (Oculto si la aplicación ya está instalada) */}
        {!isStandalone && (
          <button
            onClick={handleInstallApp}
            title="Instalar como aplicación nativa"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all border border-purple-200/70 shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Instalar App</span>
          </button>
        )}

        {/* Dropdown de usuario */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center text-white text-xs font-bold shadow-xs overflow-hidden border border-white">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(profile?.full_name || 'OM')
                )}
              </div>
              {owner && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center shadow-xs">
                  <Crown className="w-2.5 h-2.5 text-amber-900 fill-amber-900" />
                </div>
              )}
            </div>

            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-gray-800 leading-tight">
                {profile?.full_name || 'Olman Martínez'}
              </p>
              <p className="text-[10px] text-purple-600 font-medium leading-tight">
                {owner ? 'Propietario' : 'Administrador'}
              </p>
            </div>
          </button>

          {/* Menú desplegable */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-purple-100 py-2 text-xs z-50 animate-fade-in">
              <div className="px-3.5 py-2 border-b border-gray-100 md:hidden">
                <p className="font-bold text-gray-900">{profile?.full_name}</p>
                <p className="text-[10px] text-gray-400">{owner ? 'Propietario' : 'Administrador'}</p>
              </div>

              <Link
                to="/perfil"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-gray-700 hover:bg-purple-50 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-purple-600" />
                <span>Mi Perfil</span>
              </Link>

              <Link
                to="/configuracion"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-gray-700 hover:bg-purple-50 transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-purple-600" />
                <span>Configuración</span>
              </Link>

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3.5 py-2 text-rose-600 hover:bg-rose-50 w-full text-left transition-colors font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
