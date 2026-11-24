/**
 * Reduce y comprime una foto en el navegador antes de subirla.
 * Las fotos de celular (4–12 MB) quedan en ~200–500 KB sin pérdida visible,
 * lo que hace que la página web cargue rápido.
 */
export async function compressImage(file, { maxSize = 1600, quality = 0.85 } = {}) {
  if (!file || !file.type?.startsWith('image/')) throw new Error('El archivo no es una imagen')
  // GIF/SVG se suben tal cual
  if (/image\/(gif|svg)/.test(file.type)) return file

  const bitmap = await loadBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const type = supportsWebp(canvas) ? 'image/webp' : 'image/jpeg'
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality))
  if (!blob) return file
  // Si la compresión no ayuda, conservar el original
  if (blob.size >= file.size) return file

  const ext = type === 'image/webp' ? 'webp' : 'jpg'
  const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext
  return new File([blob], name, { type })
}

async function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* fallback abajo */
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo leer la imagen'))
    img.src = URL.createObjectURL(file)
  })
}

function supportsWebp(canvas) {
  try {
    return canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    return false
  }
}
