import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

async function generatePerfectIcons() {
  console.log('🎨 Procesando logo oficial de Madrigales para iconos nítidos en la web y PWA...')
  
  const logoPath = path.resolve('public/LOGO_OFICIAL.png')
  
  if (fs.existsSync(logoPath)) {
    // 1. Crear favicon nítido para la web (64x64 y 32x32)
    await sharp(logoPath)
      .resize(64, 64, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile('public/favicon.png')

    // 2. Iconos PWA estándar (192x192 y 512x512)
    await sharp(logoPath)
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile('public/icons/pwa-192x192.png')

    await sharp(logoPath)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile('public/icons/pwa-512x512.png')

    // 3. Maskable Icons para Android (con 15% de padding de fondo blanco para que Android no lo corte)
    const innerSize = Math.round(512 * 0.75) // 384px
    const innerBuffer = await sharp(logoPath)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer()

    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([{ input: innerBuffer, gravity: 'center' }])
      .png()
      .toFile('public/icons/maskable-icon-512x512.png')

    // Maskable 192
    const innerSize192 = Math.round(192 * 0.75)
    const innerBuffer192 = await sharp(logoPath)
      .resize(innerSize192, innerSize192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer()

    await sharp({
      create: {
        width: 192,
        height: 192,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([{ input: innerBuffer192, gravity: 'center' }])
      .png()
      .toFile('public/icons/maskable-icon-192x192.png')

    // 4. Apple Touch Icon (180x180)
    await sharp(logoPath)
      .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile('public/icons/apple-touch-icon.png')

    await sharp(logoPath)
      .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile('public/apple-touch-icon.png')

    console.log('✅ ¡Iconos de alta fidelidad generados exitosamente a partir del logo oficial!')
  }
}

generatePerfectIcons().catch(console.error)
