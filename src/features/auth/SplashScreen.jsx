import React, { useEffect, useState } from 'react'

export default function SplashScreen({ onComplete }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // 1. Animación de entrada
    const loadTimer = setTimeout(() => {
      setIsLoaded(true)
    }, 100)

    // 2. Progreso de la barra
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 5
      })
    }, 80)

    // 3. Duración de 1.9 segundos y salida suave
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => {
        onComplete?.()
      }, 500)
    }, 1900)

    return () => {
      clearTimeout(loadTimer)
      clearInterval(progressInterval)
      clearTimeout(exitTimer)
    }
  }, [onComplete])

  return (
    <div
      onClick={() => onComplete?.()}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center select-none cursor-pointer bg-[#0A0C16] text-white transition-all duration-500 ease-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Halo de luz suave púrpura/fucsia luminoso */}
      <div
        className="absolute w-80 h-80 sm:w-96 sm:h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, rgba(217, 70, 239, 0.12) 45%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Contenedor Central */}
      <div
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm w-full transform transition-all duration-700 ease-out"
        style={{
          transform: isLoaded ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(12px)',
          opacity: isLoaded ? 1 : 0,
        }}
      >
        {/* Tarjeta Blanca con Logo Oficial */}
        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-white p-3.5 sm:p-4 shadow-2xl shadow-purple-600/30 border border-white/20 flex items-center justify-center mb-7">
          <img
            src="/LOGO_OFICIAL_BLANCO.png"
            alt="Madrigales Pastelería"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Subtítulo Oficial */}
        <p className="text-[11px] sm:text-xs font-black tracking-[0.25em] text-white uppercase mb-5">
          SISTEMA DE PUNTO DE VENTA & GESTIÓN
        </p>

        {/* Barra de Progreso */}
        <div className="w-48 sm:w-56 h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 rounded-full transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Versión y País */}
        <p className="text-[10px] text-slate-400 font-medium tracking-wider">
          v1.0 &middot; Honduras
        </p>
      </div>
    </div>
  )
}
