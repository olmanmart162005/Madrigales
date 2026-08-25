import React, { useEffect, useState } from 'react'

export default function SplashScreen({ onComplete }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // 1. Aparición suave y elegante
    const loadTimer = setTimeout(() => {
      setIsLoaded(true)
    }, 100)

    // 2. Duración de 1.8 segundos y transición suave de salida
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => {
        onComplete?.()
      }, 500)
    }, 1800)

    return () => {
      clearTimeout(loadTimer)
      clearTimeout(exitTimer)
    }
  }, [onComplete])

  return (
    <div
      onClick={() => onComplete?.()}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center select-none cursor-pointer bg-white transition-all duration-500 ease-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Halo de luz suave morada/lila en el fondo blanco */}
      <div
        className="absolute w-96 h-96 sm:w-[450px] sm:h-[450px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, rgba(192, 38, 211, 0.04) 50%, transparent 75%)',
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
        {/* Isotipo Oficial del Tulipán de Madrigales */}
        <div className="relative mb-4">
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-white p-3 flex items-center justify-center shadow-lg shadow-purple-100/80 border border-purple-100/60">
            <img
              src="/icons/pwa-512x512.png"
              alt="Madrigales"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Nombre Principal */}
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight">
          Madrigales
        </h1>

        {/* Subtítulo Institucional */}
        <p className="text-xs sm:text-sm font-extrabold tracking-[0.35em] text-purple-700 uppercase mt-1">
          PASTELERÍA
        </p>

        {/* Indicador de Carga Minimalista y Elegante */}
        <div className="mt-8 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-fuchsia-600 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}
