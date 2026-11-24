import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

/**
 * Genera todos los logos e iconos (web + PWA) de Nani Cake
 * a partir del logo oficial: scripts/assets/nani-cake-logo-source.png
 *
 * Uso: node scripts/generate_perfect_icons.js
 */
const SOURCE = path.resolve('scripts/assets/nani-cake-logo-source.png')
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }
const CLEAR = { r: 255, g: 255, b: 255, alpha: 0 }

async function square(size, out, { pad = 0.04, bg = WHITE } = {}) {
  const inner = Math.round(size * (1 - pad * 2))
  const logo = await sharp(SOURCE).resize(inner, inner, { fit: 'contain', background: CLEAR }).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ palette: true, quality: 90, compressionLevel: 9 })
    .toFile(out)
}

async function main() {
  if (!fs.existsSync(SOURCE)) throw new Error(`No se encontró el logo: ${SOURCE}`)
  console.log('🎄 Generando logos e iconos de Nani Cake...')
  fs.mkdirSync('public/icons', { recursive: true })

  // Logos de la interfaz (transparente y con fondo blanco)
  await sharp(SOURCE).resize(640, 640, { fit: 'contain', background: CLEAR }).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile('public/LOGO_OFICIAL.png')
  await square(640, 'public/LOGO_OFICIAL_BLANCO.png', { pad: 0.02 })
  await sharp(SOURCE).resize(640, 640).webp({ quality: 88 }).toFile('public/brand/nani-cake-logo.webp')

  // Favicon
  await square(64, 'public/favicon.png', { pad: 0 , bg: CLEAR })
  // PWA "any"
  await square(192, 'public/icons/pwa-192x192.png', { pad: 0.02 })
  await square(512, 'public/icons/pwa-512x512.png', { pad: 0.02 })
  await square(192, 'public/icons/icon-192.png', { pad: 0.02 })
  await square(512, 'public/icons/icon-512.png', { pad: 0.02 })
  // PWA "maskable": zona segura del 80% → padding 12%
  await square(192, 'public/icons/maskable-icon-192x192.png', { pad: 0.12 })
  await square(512, 'public/icons/maskable-icon-512x512.png', { pad: 0.12 })
  // Apple
  await square(180, 'public/icons/apple-touch-icon.png', { pad: 0.04 })
  await square(180, 'public/apple-touch-icon.png', { pad: 0.04 })

  console.log('✅ Logos e iconos de Nani Cake generados.')
}

main().catch((e) => { console.error(e); process.exit(1) })
