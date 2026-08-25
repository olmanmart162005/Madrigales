import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import PWAInstallPrompt from '@/components/ui/PWAInstallPrompt'
import { useSettingsStore } from '@/store/settingsStore'

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { fetchSettings } = useSettingsStore()

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleMobileToggle = () => setMobileOpen((v) => !v)
  const handleMobileClose = () => setMobileOpen(false)

  return (
    <div className="min-h-screen bg-[#FAF7F9] flex font-sans relative w-full overflow-x-hidden">
      {/* Sidebar Desktop (Fijo 260px) & Drawer Móvil */}
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />

      {/* Área Principal de Contenido: Margin-left fijo 260px en PC */}
      <div className="flex-1 flex flex-col min-h-screen w-full lg:ml-[260px] transition-none">
        {/* Header Superior Fijo */}
        <Header
          onToggleSidebar={handleMobileToggle}
        />

        {/* Contenido con padding superior */}
        <main className="flex-1 pt-20 p-3.5 sm:p-6 sm:pt-20 max-w-7xl w-full mx-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Prompt PWA para instalar la app en cualquier dispositivo */}
      <PWAInstallPrompt />
    </div>
  )
}
