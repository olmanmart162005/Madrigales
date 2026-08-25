import React, { useEffect, useState } from 'react'

export default function SplashScreen({ onComplete }) {
  const [progress, setProgress] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Fase 1: Revelación suave del logo oficial
    const loadTimer = setTimeout(() => {
      setIsLoaded(true)
    }, 150)

    // Fase 2: Progreso de carga (~3 segundos en total)
    const startTime = Date.now() + 400
    const duration = 2800

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed > 0) {
        const currentProgress = Math.min(Math.round((elapsed / duration) * 100), 100)
        setProgress(currentProgress)

        if (currentProgress >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            setIsExiting(true)
            setTimeout(() => {
              onComplete?.()
            }, 600)
          }, 350)
        }
      }
    }, 25)

    return () => {
      clearTimeout(loadTimer)
      clearInterval(interval)
    }
  }, [onComplete])

  return (
    <div
      onClick={() => onComplete?.()}
      style={{
        background: 'radial-gradient(circle at center, #24182F 0%, #161120 45%, #0D111B 100%)',
      }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center select-none cursor-pointer transition-all duration-700 ease-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Halo de iluminación ambiental suave en el centro (rosa & morado) */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(192, 38, 211, 0.18) 0%, rgba(168, 85, 247, 0.12) 45%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Contenedor Principal */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-md w-full">
        {/* ============================================================
            1. LOGO OFICIAL COMPLETO DE MADRIGALES (Protagonista)
            ============================================================ */}
        <div
          className="relative mb-6 transform transition-all duration-1000 ease-out"
          style={{
            transform: isLoaded ? 'scale(1)' : 'scale(0.85)',
            opacity: isLoaded ? 1 : 0,
            filter: isLoaded ? 'blur(0px)' : 'blur(8px)',
          }}
        >
          {/* Resplandor sutil rosa/morado detrás de la cápsula */}
          <div
            className="absolute -inset-3 rounded-[38px] pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(236, 72, 153, 0.28) 0%, rgba(168, 85, 247, 0.20) 60%, transparent 100%)',
              filter: 'blur(20px)',
            }}
          />

          {/* Cápsula de Cristal Luminosa para garantizar 100% de visibilidad del logo original */}
          <div
            className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-3xl p-5 flex items-center justify-center backdrop-blur-xl shadow-2xl transition-transform duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(250, 246, 252, 0.94))',
              border: '1px solid rgba(236, 72, 153, 0.25)',
              boxShadow: '0 0 45px rgba(192, 38, 211, 0.18), 0 20px 40px rgba(0, 0, 0, 0.65)',
            }}
          >
            <img
              src="/LOGO_OFICIAL.png"
              alt="Madrigales Pastelería y Repostería"
              className="w-full h-full object-contain filter drop-shadow-sm select-none pointer-events-none"
            />
          </div>
        </div>

        {/* ============================================================
            2. SUBTÍTULO INSTITUCIONAL (Sin repetir el nombre gigante)
            ============================================================ */}
        <p
          className="text-xs sm:text-sm font-bold uppercase mb-8 leading-relaxed tracking-[0.25em] transition-all duration-700 ease-out"
          style={{
            color: '#D8CCD8',
            opacity: isLoaded ? 1 : 0,
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.7)',
          }}
        >
          SISTEMA DE PUNTO DE VENTA & GESTIÓN
        </p>

        {/* ============================================================
            3. BARRA DE CARGA MODERNA (#A855F7 -> #C026D3 -> #EC4899)
            ============================================================ */}
        <div
          className="w-60 sm:w-72 h-1.5 rounded-full overflow-hidden mb-6 relative transition-opacity duration-700 ease-out"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.10)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            opacity: isLoaded ? 1 : 0,
          }}
        >
          <div
            className="h-full rounded-full transition-all duration-100 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #A855F7 0%, #C026D3 50%, #EC4899 100%)',
              boxShadow: '0 0 14px rgba(236, 72, 153, 0.8)',
            }}
          />
        </div>

        {/* ============================================================
            4. VERSIÓN & PAÍS
            ============================================================ */}
        <p
          className="text-xs font-semibold tracking-wider transition-opacity duration-700 ease-out"
          style={{
            color: '#AFA4B5',
            opacity: isLoaded ? 1 : 0,
          }}
        >
          v1.0 &middot; Honduras
        </p>
      </div>
    </div>
  )
}
