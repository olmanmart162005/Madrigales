import React from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingBag, Calendar, Package, Warehouse,
  BarChart3, Users, User, Settings,
  LogOut, X, Crown, ChevronRight as RightArrow
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getInitials } from '@/utils'
import toast from 'react-hot-toast'

// Rutas base (accesibles según rol)
const allNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true, cashier: true },
  { to: '/pedidos', icon: ShoppingBag, label: 'Pedidos', cashier: true },
  { to: '/productos', icon: Package, label: 'Productos', cashier: true },
  { to: '/calendario', icon: Calendar, label: 'Calendario', cashier: false },
  { to: '/almacen', icon: Warehouse, label: 'Almacén', cashier: false },
  { to: '/reportes', icon: BarChart3, label: 'Reportes', cashier: false },
]

// Rutas de administración
const adminNavItems = [
  { to: '/usuarios', icon: Users, label: 'Usuarios' },
]

// Rutas de cuenta y ajustes
const accountNavItems = [
  { to: '/perfil', icon: User, label: 'Mi Perfil', cashier: true },
  { to: '/configuracion', icon: Settings, label: 'Configuración', cashier: false },
]

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const { profile, signOut, isAdmin, isOwner } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      if (onMobileClose) onMobileClose()
      await signOut()
      toast.success('Sesión cerrada correctamente')
      navigate('/login')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  const admin = isAdmin()
  const owner = isOwner()

  // Filtrar los items de navegación según si es Administrador o Cajero
  const visibleNavItems = allNavItems.filter((item) => admin || item.cashier)
  const visibleAccountItems = accountNavItems.filter((item) => admin || item.cashier)

  const renderRoleBadge = () => {
    if (owner) {
      return (
        <span className="text-[9px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300/80 inline-flex items-center gap-1">
          <Crown className="w-2.5 h-2.5 text-amber-700 fill-amber-700" />
          PROPIETARIO
        </span>
      )
    }
    if (profile?.role === 'administrador') {
      return (
        <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
          ADMINISTRADOR
        </span>
      )
    }
    return (
      <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
        CAJERO
      </span>
    )
  }

  return (
    <>
      {/* ============================================================
          1. DESKTOP SIDEBAR (>= 1024px)
          100% FIJO Y PERMANENTE A 260px (SIN BOTONES FLOTANTES)
          ============================================================ */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-[260px] bg-white border-r border-gray-100/90 shadow-sm z-30 select-none">
        {/* Branding Superior */}
        <div className="p-4 sm:p-5 border-b border-gray-100/90 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white border border-purple-100 shadow-sm p-1 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img
              src="/LOGO_OFICIAL_BLANCO.png"
              alt="Madrigales"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="overflow-hidden">
            <h1 className="text-base font-extrabold text-gray-900 tracking-tight leading-tight truncate font-sans">
              Madrigales
            </h1>
            <p className="text-[10px] font-bold tracking-[0.25em] text-fuchsia-600 uppercase leading-tight mt-0.5 truncate">
              PASTELERÍA
            </p>
          </div>
        </div>

        {/* Tarjeta de Usuario en Escritorio */}
        <div className="p-3.5 pb-1">
          <Link
            to="/perfil"
            className="group flex items-center gap-3 p-2.5 rounded-2xl bg-purple-50/50 hover:bg-purple-100/70 border border-purple-100/80 transition-all cursor-pointer"
            title="Ver mi perfil"
          >
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 via-purple-700 to-fuchsia-600 flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden border-2 border-white">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(profile?.full_name || 'OM')
                )}
              </div>
              {owner && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-xs border border-white">
                  <Crown className="w-2.5 h-2.5 text-amber-900 fill-amber-900" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate leading-tight group-hover:text-purple-800 transition-colors">
                {profile?.full_name || 'Olman Martínez'}
              </p>
              <div className="mt-1">{renderRoleBadge()}</div>
            </div>

            <RightArrow className="w-4 h-4 text-purple-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </Link>
        </div>

        {/* Navegación Desktop */}
        <nav className="flex-1 px-3.5 py-3 space-y-1.5 overflow-y-auto scrollbar-thin">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#C026D3] text-white shadow-[0_8px_20px_rgba(124,58,237,0.22)]'
                    : 'text-slate-600 hover:bg-purple-500/8 hover:text-purple-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-purple-600'}`} />
                  <span className="truncate flex-1 tracking-tight">{item.label}</span>
                  <RightArrow className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 ${isActive ? 'text-white/90' : 'text-slate-300 group-hover:text-purple-500'}`} />
                </>
              )}
            </NavLink>
          ))}

          {/* Sección de Administración (Solo para Administradores) */}
          {admin && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-[10px] font-bold text-gray-400 tracking-[0.14em] uppercase">
                  ADMINISTRACIÓN
                </p>
              </div>

              {adminNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                      isActive
                        ? 'bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#C026D3] text-white shadow-[0_8px_20px_rgba(124,58,237,0.22)]'
                        : 'text-slate-600 hover:bg-purple-500/8 hover:text-purple-700'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-purple-600'}`} />
                      <span className="truncate flex-1 tracking-tight">{item.label}</span>
                      <RightArrow className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 ${isActive ? 'text-white/90' : 'text-slate-300 group-hover:text-purple-500'}`} />
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}

          {/* Separador */}
          <div className="pt-2 pb-1">
            <div className="border-t border-gray-100" />
          </div>

          {/* Perfil y Configuración */}
          {visibleAccountItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#C026D3] text-white shadow-[0_8px_20px_rgba(124,58,237,0.22)]'
                    : 'text-slate-600 hover:bg-purple-500/8 hover:text-purple-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-purple-600'}`} />
                  <span className="truncate flex-1 tracking-tight">{item.label}</span>
                  <RightArrow className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 ${isActive ? 'text-white/90' : 'text-slate-300 group-hover:text-purple-500'}`} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Botón de Cerrar Sesión Fijo en Desktop */}
        <div className="p-3.5 border-t border-gray-100/90 bg-white">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-all duration-150 group cursor-pointer border border-transparent hover:border-rose-100"
          >
            <LogOut className="w-4 h-4 text-gray-400 group-hover:text-rose-600 transition-colors" />
            <span className="truncate">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ============================================================
          2. MOBILE DRAWER (< 1024px)
          Overlay y Menú Deslizante desde la Izquierda
          ============================================================ */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onMobileClose}
      />

      <aside
        className={`fixed top-0 left-0 bottom-0 w-[280px] sm:w-[320px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Encabezado del Drawer Móvil */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-purple-100 p-1 shadow-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src="/icons/pwa-192x192.png" alt="Madrigales" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900 tracking-tight leading-tight">
                Madrigales
              </h2>
              <p className="text-[10px] font-bold tracking-[0.2em] text-fuchsia-600 uppercase leading-tight">
                PASTELERÍA
              </p>
            </div>
          </div>

          <button
            onClick={onMobileClose}
            className="p-2 rounded-xl bg-gray-100/80 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
            title="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegación Móvil */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto scrollbar-thin">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 via-purple-700 to-fuchsia-600 text-white shadow-md'
                    : 'text-slate-700 hover:bg-purple-50 hover:text-purple-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="flex-1 font-medium">{item.label}</span>
                  {isActive && <RightArrow className="w-4 h-4 text-white/80 flex-shrink-0" />}
                </>
              )}
            </NavLink>
          ))}

          {/* Administración en Móvil (Solo Administradores) */}
          {admin && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-bold text-gray-400 tracking-[0.14em] uppercase">
                  ADMINISTRACIÓN
                </p>
              </div>

              {adminNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 via-purple-700 to-fuchsia-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-purple-50 hover:text-purple-700'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="flex-1 font-medium">{item.label}</span>
                      {isActive && <RightArrow className="w-4 h-4 text-white/80 flex-shrink-0" />}
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}

          <div className="pt-2 pb-1">
            <div className="border-t border-gray-100" />
          </div>

          {/* Mi Perfil y Configuración en Móvil */}
          {visibleAccountItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 via-purple-700 to-fuchsia-600 text-white shadow-md'
                    : 'text-slate-700 hover:bg-purple-50 hover:text-purple-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="flex-1 font-medium">{item.label}</span>
                  {isActive && <RightArrow className="w-4 h-4 text-white/80 flex-shrink-0" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer del Drawer Móvil */}
        <div className="p-4 border-t border-gray-100 space-y-3 bg-white">
          <Link
            to="/perfil"
            onClick={onMobileClose}
            className="flex items-center gap-3 p-3 rounded-2xl bg-purple-50/60 hover:bg-purple-100/70 border border-purple-100 transition-all cursor-pointer"
          >
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center text-white text-sm font-bold shadow-sm overflow-hidden border-2 border-white">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(profile?.full_name || 'OM')
                )}
              </div>
              {owner && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-xs border border-white">
                  <Crown className="w-2.5 h-2.5 text-amber-900 fill-amber-900" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate leading-tight">
                {profile?.full_name || 'Olman Martínez'}
              </p>
              <div className="mt-1">{renderRoleBadge()}</div>
            </div>
          </Link>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/70 hover:bg-rose-100 border border-rose-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
