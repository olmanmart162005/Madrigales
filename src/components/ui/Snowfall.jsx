import React, { useMemo } from 'react'

/**
 * Nieve decorativa navideña (CSS puro, sin dependencias).
 * Respeta "prefers-reduced-motion" mediante la clase motion-reduce.
 */
export default function Snowfall({ count = 28, className = '' }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 4 + Math.random() * 7,
        delay: -Math.random() * 12,
        duration: 9 + Math.random() * 9,
        opacity: 0.35 + Math.random() * 0.5,
      })),
    [count]
  )

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden ${className}`}>
      {flakes.map((f) => (
        <span
          key={f.id}
          className="absolute top-0 rounded-full bg-white animate-snow"
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size,
            opacity: f.opacity,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
            filter: 'blur(0.5px)',
          }}
        />
      ))}
    </div>
  )
}
