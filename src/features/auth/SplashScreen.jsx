import React, { useEffect, useState } from 'react'

export default function SplashScreen({ onComplete }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // 1. Entrada suave
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
      {/* Halo de luz suave ambiental */}
      <div
        className="absolute w-96 h-96 sm:w-[500px] sm:h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.06) 0%, rgba(192, 38, 211, 0.03) 50%, transparent 75%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Contenedor Central con Logo Oficial */}
      <div
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-md w-full transform transition-all duration-700 ease-out"
        style={{
          transform: isLoaded ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(12px)',
          opacity: isLoaded ? 1 : 0,
        }}
      >
        {/* LOGO OFICIAL ORIGINAL DE MADRIGALES */}
        <div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center mb-6">
          <img
            src="/LOGO_OFICIAL_BLANCO.png"
            alt="Madrigales Pastelería"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Indicador de Carga Minimalista */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-fuchsia-600 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}
