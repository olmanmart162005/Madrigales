import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const outputDir = path.resolve('public/icons')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

/**
 * Genera el SVG del isotipo oficial de Madrigales (Tulipán de repostería)
 * sobre fondo blanco puro.
 * @param {number} size - Tamaño en px (ej. 512)
 * @param {number} paddingPercent - Margen de zona segura (ej. 0.12 para normal, 0.22 para maskable)
 */
function createMadrigalesIconSvg(size, paddingPercent = 0.12) {
  const contentSize = size * (1 - paddingPercent * 2)
  const offset = size * paddingPercent

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <!-- Fondo blanco puro -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#FFFFFF" />
    </linearGradient>

    <!-- Degradado del Pétalo Central -->
    <linearGradient id="centerPetal" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#D8B4FE" />
      <stop offset="50%" stop-color="#A855F7" />
      <stop offset="100%" stop-color="#7E22CE" />
    </linearGradient>

    <!-- Degradado del Pétalo Izquierdo -->
    <linearGradient id="leftPetal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" />
      <stop offset="100%" stop-color="#6B21A8" />
    </linearGradient>

    <!-- Degradado del Pétalo Derecho -->
    <linearGradient id="rightPetal" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" />
      <stop offset="100%" stop-color="#6B21A8" />
    </linearGradient>

    <!-- Sombra sutil y elegante del emblema -->
    <filter id="softShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="${size * 0.015}" stdDeviation="${size * 0.02}" flood-color="#7C3AED" flood-opacity="0.18" />
    </filter>

    <!-- Degradado de la Base / Copa del Tulipán -->
    <linearGradient id="baseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#581C87" />
      <stop offset="100%" stop-color="#3B0764" />
    </linearGradient>
  </defs>

  <!-- 1. Fondo Blanco Impecable -->
  <rect width="${size}" height="${size}" fill="url(#bgGrad)" />

  <!-- 2. Grupo del Isotipo Centrado -->
  <g transform="translate(${offset}, ${offset}) scale(${contentSize / 512})" filter="url(#softShadow)">
    
    <!-- Pétalo Central (Tulipán / Corona de Pastelería) -->
    <path 
      d="M256 64 C220 130, 200 220, 256 340 C312 220, 292 130, 256 64 Z" 
      fill="url(#centerPetal)" 
    />

    <!-- Pétalo Izquierdo -->
    <path 
      d="M246 120 C180 140, 100 210, 120 310 C140 380, 220 390, 256 390 C235 340, 230 250, 246 120 Z" 
      fill="url(#leftPetal)" 
    />

    <!-- Pétalo Derecho -->
    <path 
      d="M266 120 C332 140, 412 210, 392 310 C372 380, 292 390, 256 390 C277 340, 282 250, 266 120 Z" 
      fill="url(#rightPetal)" 
    />

    <!-- Cáliz / Base Envolvente del Tulipán (Borde elegante) -->
    <path 
      d="M120 310 C145 420, 367 420, 392 310 C405 375, 335 448, 256 448 C177 448, 107 375, 120 310 Z" 
      fill="url(#baseGrad)" 
    />

    <!-- Núcleo de Destello / Luz Superior -->
    <circle cx="256" cy="180" r="14" fill="#FAF5FF" opacity="0.9" />
    <path d="M256 150 L256 210 M226 180 L286 180" stroke="#FAF5FF" stroke-width="4" stroke-linecap="round" opacity="0.8" />
  </g>
</svg>
  `
}

/**
 * Genera el Logo Oficial de Madrigales en alta definición sobre fondo blanco puro
 * (Isotipo + Nombre "Madrigales" + Subtítulo "PASTELERÍA")
 */
function createMadrigalesFullLogoSvg(width = 800, height = 400) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="fullCenterPetal" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#D8B4FE" />
      <stop offset="50%" stop-color="#A855F7" />
      <stop offset="100%" stop-color="#7E22CE" />
    </linearGradient>
    <linearGradient id="fullLeftPetal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" />
      <stop offset="100%" stop-color="#6B21A8" />
    </linearGradient>
    <linearGradient id="fullRightPetal" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" />
      <stop offset="100%" stop-color="#6B21A8" />
    </linearGradient>
    <linearGradient id="fullBaseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#581C87" />
      <stop offset="100%" stop-color="#3B0764" />
    </linearGradient>
    <filter id="logoShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#7C3AED" flood-opacity="0.15" />
    </filter>
  </defs>

  <!-- Fondo Blanco Puro -->
  <rect width="${width}" height="${height}" fill="#FFFFFF" />

  <!-- Isotipo del Tulipán -->
  <g transform="translate(320, 20) scale(0.32)" filter="url(#logoShadow)">
    <path d="M256 64 C220 130, 200 220, 256 340 C312 220, 292 130, 256 64 Z" fill="url(#fullCenterPetal)" />
    <path d="M246 120 C180 140, 100 210, 120 310 C140 380, 220 390, 256 390 C235 340, 230 250, 246 120 Z" fill="url(#fullLeftPetal)" />
    <path d="M266 120 C332 140, 412 210, 392 310 C372 380, 292 390, 256 390 C277 340, 282 250, 266 120 Z" fill="url(#fullRightPetal)" />
    <path d="M120 310 C145 420, 367 420, 392 310 C405 375, 335 448, 256 448 C177 448, 107 375, 120 310 Z" fill="url(#fullBaseGrad)" />
    <circle cx="256" cy="180" r="14" fill="#FAF5FF" opacity="0.9" />
    <path d="M256 150 L256 210 M226 180 L286 180" stroke="#FAF5FF" stroke-width="4" stroke-linecap="round" opacity="0.8" />
  </g>

  <!-- Nombre Principal "Madrigales" -->
  <text 
    x="400" 
    y="265" 
    font-family="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
    font-size="68" 
    font-weight="900" 
    fill="#1F2937" 
    text-anchor="middle"
    letter-spacing="-1.5"
  >Madrigales</text>

  <!-- Subtítulo "PASTELERÍA Y REPOSTERÍA" -->
  <text 
    x="400" 
    y="318" 
    font-family="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
    font-size="20" 
    font-weight="800" 
    fill="#7C3AED" 
    text-anchor="middle" 
    letter-spacing="10"
  >PASTELERÍA</text>

  <!-- Línea decorativa dorada/morada -->
  <rect x="300" y="345" width="200" height="3" rx="1.5" fill="#E9D5FF" />
</svg>
  `
}

async function run() {
  console.log('🎨 Generando iconos oficiales PWA con fondo blanco puro...')

  // 1. Iconos estándar (192x192 y 512x512)
  const svg192 = Buffer.from(createMadrigalesIconSvg(192, 0.12))
  const svg512 = Buffer.from(createMadrigalesIconSvg(512, 0.12))

  await sharp(svg192).png().toFile('public/icons/pwa-192x192.png')
  await sharp(svg192).png().toFile('public/icons/icon-192.png')
  await sharp(svg512).png().toFile('public/icons/pwa-512x512.png')
  await sharp(svg512).png().toFile('public/icons/icon-512.png')

  // 2. Iconos Maskable para Android (Con 20% de zona segura para que Android no lo recorte)
  const svgMaskable192 = Buffer.from(createMadrigalesIconSvg(192, 0.20))
  const svgMaskable512 = Buffer.from(createMadrigalesIconSvg(512, 0.20))

  await sharp(svgMaskable192).png().toFile('public/icons/maskable-icon-192x192.png')
  await sharp(svgMaskable512).png().toFile('public/icons/maskable-icon-512x512.png')

  // 3. Apple Touch Icon (180x180) y Favicons
  const svgApple = Buffer.from(createMadrigalesIconSvg(180, 0.12))
  const svgFavicon = Buffer.from(createMadrigalesIconSvg(64, 0.08))

  await sharp(svgApple).png().toFile('public/icons/apple-touch-icon.png')
  await sharp(svgApple).png().toFile('public/apple-touch-icon.png')
  await sharp(svgFavicon).png().toFile('public/favicon.png')
  fs.writeFileSync('public/favicon.svg', createMadrigalesIconSvg(64, 0.08))

  // 4. Logo Completo con fondo blanco en alta resolución (para Splash Screen y modales)
  const svgFullLogo = Buffer.from(createMadrigalesFullLogoSvg(800, 400))
  await sharp(svgFullLogo).png().toFile('public/LOGO_OFICIAL_BLANCO.png')
  await sharp(svgFullLogo).png().toFile('src/assets/LOGO_OFICIAL_BLANCO.png')

  console.log('✅ ¡Todos los iconos y logos PWA con fondo blanco puro fueron generados con éxito!')
}

run().catch(console.error)
