import React, { useState } from 'react'
import SplashScreen from './SplashScreen'
import BrandPanel from './BrandPanel'
import LoginForm from './LoginForm'

export default function LoginPage() {
  const [showSplash, setShowSplash] = useState(true)

  const handleSplashComplete = () => {
    setShowSplash(false)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden bg-[#0A0E17] font-sans">
      {/* 1. Splash Screen estilo MercaSmart con carga visible (~3.2s) */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* 2. Fondo ambiental corporativo */}
      <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full bg-blue-600/5 filter blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] rounded-full bg-pink-600/5 filter blur-[150px] pointer-events-none" />

      {/* 3. Tarjeta Principal Dividida (Split View) */}
      <div className="relative z-10 w-full max-w-4xl min-h-[560px] rounded-3xl overflow-hidden flex flex-col lg:flex-row border border-white/10 shadow-2xl bg-[#0D1420]">
        {/* Panel Izquierdo: Branding Oficial */}
        <BrandPanel />

        {/* Panel Derecho: Formulario de Login */}
        <LoginForm />
      </div>
    </div>
  )
}
