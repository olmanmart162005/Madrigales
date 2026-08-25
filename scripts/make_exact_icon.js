import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

async function makePerfectAppIcon() {
  console.log('🎨 Creando icono exacto de Madrigales Pastelería...')

  // SVG vectorial con las proporciones exactas de la Imagen 2
  const svg512 = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <!-- Fondo blanco puro -->
  <rect width="512" height="512" fill="#FFFFFF" />

  <g transform="translate(0, 8)">
    <!-- 1. Isotipo del Tulipán Morado Oficial -->
    <g transform="translate(176, 50) scale(0.62)">
      <!-- Pétalo Central con degradado -->
      <defs>
        <linearGradient id="centerTulip" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#D8B4FE" />
          <stop offset="40%" stop-color="#A855F7" />
          <stop offset="100%" stop-color="#7E22CE" />
        </linearGradient>
        <linearGradient id="sideTulip" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#C084FC" />
          <stop offset="100%" stop-color="#6B21A8" />
        </linearGradient>
        <linearGradient id="tulipBase" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#4C1D95" />
          <stop offset="100%" stop-color="#2E1065" />
        </linearGradient>
      </defs>

      <!-- Pétalo Centro -->
      <path d="M128 30 C110 65, 100 120, 128 185 C156 120, 146 65, 128 30 Z" fill="url(#centerTulip)" />
      <!-- Pétalo Izquierdo -->
      <path d="M123 60 C85 70, 45 110, 55 165 C65 205, 110 210, 128 210 C115 180, 112 130, 123 60 Z" fill="url(#sideTulip)" />
      <!-- Pétalo Derecho -->
      <path d="M133 60 C171 70, 211 110, 201 165 C191 205, 146 210, 128 210 C141 180, 144 130, 133 60 Z" fill="url(#sideTulip)" />
      <!-- Base Copa del Tulipán -->
      <path d="M55 165 C70 235, 186 235, 201 165 C208 200, 170 242, 128 242 C86 242, 48 200, 55 165 Z" fill="url(#tulipBase)" stroke="#FFFFFF" stroke-width="2" />
      <circle cx="128" cy="95" r="7" fill="#FAF5FF" opacity="0.9" />
    </g>

    <!-- 2. Tipografía "Madrigales" en Negro Elegante (Serif de Pastelería Fina) -->
    <text 
      x="256" 
      y="320" 
      font-family="'Playfair Display', Georgia, 'Times New Roman', serif" 
      font-size="64" 
      font-weight="900" 
      fill="#0F172A" 
      text-anchor="middle"
      letter-spacing="-0.5"
    >Madrigales</text>

    <!-- 3. Subtítulo "Pastelería y Repostería" en Fucsia/Magenta -->
    <text 
      x="256" 
      y="360" 
      font-family="system-ui, -apple-system, sans-serif" 
      font-size="19" 
      font-weight="800" 
      fill="#C026D3" 
      text-anchor="middle"
      letter-spacing="2.5"
    >Pastelería y Repostería</text>
  </g>
</svg>
  `

  // 1. Generar 512x512 y 192x192
  const buf512 = Buffer.from(svg512)
  await sharp(buf512).png().toFile('public/icons/pwa-512x512.png')
  await sharp(buf512).png().toFile('public/icons/icon-512.png')

  await sharp(buf512).resize(192, 192).png().toFile('public/icons/pwa-192x192.png')
  await sharp(buf512).resize(192, 192).png().toFile('public/icons/icon-192.png')

  // 2. Maskable icon para Android (con 15% de safe margin)
  const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#FFFFFF" />
  <g transform="translate(64, 40) scale(0.75)">
    <!-- 1. Isotipo del Tulipán Morado Oficial -->
    <g transform="translate(176, 40) scale(0.65)">
      <defs>
        <linearGradient id="mCenterTulip" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#D8B4FE" />
          <stop offset="40%" stop-color="#A855F7" />
          <stop offset="100%" stop-color="#7E22CE" />
        </linearGradient>
        <linearGradient id="mSideTulip" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#C084FC" />
          <stop offset="100%" stop-color="#6B21A8" />
        </linearGradient>
        <linearGradient id="mTulipBase" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#4C1D95" />
          <stop offset="100%" stop-color="#2E1065" />
        </linearGradient>
      </defs>

      <path d="M128 30 C110 65, 100 120, 128 185 C156 120, 146 65, 128 30 Z" fill="url(#mCenterTulip)" />
      <path d="M123 60 C85 70, 45 110, 55 165 C65 205, 110 210, 128 210 C115 180, 112 130, 123 60 Z" fill="url(#mSideTulip)" />
      <path d="M133 60 C171 70, 211 110, 201 165 C191 205, 146 210, 128 210 C141 180, 144 130, 133 60 Z" fill="url(#mSideTulip)" />
      <path d="M55 165 C70 235, 186 235, 201 165 C208 200, 170 242, 128 242 C86 242, 48 200, 55 165 Z" fill="url(#mTulipBase)" stroke="#FFFFFF" stroke-width="2" />
      <circle cx="128" cy="95" r="7" fill="#FAF5FF" opacity="0.9" />
    </g>

    <text 
      x="256" 
      y="320" 
      font-family="'Playfair Display', Georgia, 'Times New Roman', serif" 
      font-size="68" 
      font-weight="900" 
      fill="#0F172A" 
      text-anchor="middle"
      letter-spacing="-0.5"
    >Madrigales</text>

    <text 
      x="256" 
      y="365" 
      font-family="system-ui, -apple-system, sans-serif" 
      font-size="20" 
      font-weight="800" 
      fill="#C026D3" 
      text-anchor="middle"
      letter-spacing="2.5"
    >Pastelería y Repostería</text>
  </g>
</svg>
  `
  const bufMaskable = Buffer.from(maskableSvg)
  await sharp(bufMaskable).png().toFile('public/icons/maskable-icon-512x512.png')
  await sharp(bufMaskable).resize(192, 192).png().toFile('public/icons/maskable-icon-192x192.png')

  // 3. Apple Touch Icon y Favicons
  await sharp(buf512).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png')
  await sharp(buf512).resize(180, 180).png().toFile('public/apple-touch-icon.png')
  await sharp(buf512).resize(64, 64).png().toFile('public/favicon.png')
  fs.writeFileSync('public/favicon.svg', svg512)

  console.log('✅ ¡Iconos generados con la apariencia exacta de la Imagen 2!')
}

makePerfectAppIcon().catch(console.error)
