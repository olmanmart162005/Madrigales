import React, { useState, useEffect } from 'react'
import { Download, X, Smartphone, Monitor } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Comprobar si ya está ejecutándose como PWA instalada
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true)
      return
    }

    const handler = (e) => {
      // Prevenir el banner por defecto del navegador para mostrar el nuestro personalizado
      e.preventDefault()
      setDeferredPrompt(e)
      // Mostrar solo si no se ha descartado recientemente
      const dismissed = sessionStorage.getItem('madrigales_pwa_dismissed')
      if (!dismissed) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    sessionStorage.setItem('madrigales_pwa_dismissed', 'true')
  }

  if (isInstalled || !showPrompt) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100%-2rem)] bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-purple-200/90 animate-slide-up">
      <div className="flex items-start gap-3">
        {/* Logo icono */}
        <div className="w-10 h-10 rounded-xl p-1 bg-white border border-purple-100 shadow-xs flex items-center justify-center flex-shrink-0">
          <img src="/LOGO_OFICIAL.png" alt="Madrigales" className="w-full h-full object-contain" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-gray-900 leading-tight">
            Instalar Madrigales App
          </h4>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
            Instala la aplicación en tu computadora o teléfono para acceso instantáneo y fluido.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-700 to-pink-600 hover:from-purple-800 hover:to-pink-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar App</span>
            </button>

            <button
              onClick={handleDismiss}
              className="px-2.5 py-1.5 text-gray-400 hover:text-gray-600 text-xs font-medium transition-colors"
            >
              Ahora no
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 p-0.5 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
