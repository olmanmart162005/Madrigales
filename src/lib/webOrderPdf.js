import jsPDF from 'jspdf'
import { applyPlugin } from 'jspdf-autotable'

// Registra doc.autoTable() (forma compatible con el empaquetador)
applyPlugin(jsPDF)
import { formatCurrency } from '@/utils'

/**
 * PDF de "Solicitud de pedido" generado en la página web de Nani Cake.
 * Incluye logo, datos del cliente, fotos de los productos, detalle y total.
 */

const RED = [200, 16, 46]
const RED_DARK = [133, 15, 36]
const PINE = [21, 70, 45]
const PINE_DARK = [15, 46, 31]
const GOLD = [212, 160, 23]
const CREAM = [255, 249, 242]
const GRAY = [107, 114, 128]
const DARK = [17, 24, 39]

/** Carga una imagen (png/webp/jpg) y la convierte a JPEG/PNG base64 para jsPDF */
function loadImage(src, { size = 240, format = 'image/jpeg', background = '#ffffff', round = false } = {}) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (round) {
          ctx.beginPath()
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
          ctx.closePath()
          ctx.clip()
        }
        ctx.fillStyle = background
        ctx.fillRect(0, 0, size, size)
        // "cover" centrado
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        resolve(canvas.toDataURL(format, 0.85))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export function makeWebOrderFolio() {
  const d = new Date()
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `NC-WEB-${ymd}-${rand}`
}

function formatDateES(iso) {
  if (!iso) return 'Por confirmar'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * @returns {Promise<{ blob: Blob, doc: jsPDF, fileName: string }>}
 */
export async function generateWebOrderPdf({ folio, items, total, currency = 'L', customer = {}, business = {} }) {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 16

  const [logo, ...thumbs] = await Promise.all([
    loadImage('/LOGO_OFICIAL.png', { size: 360, format: 'image/png', round: true }),
    ...items.map((i) => loadImage(i.image, { size: 200 })),
  ])

  /* ---------- Encabezado ---------- */
  doc.setFillColor(...PINE_DARK)
  doc.rect(0, 0, W, 46, 'F')
  // Franja navideña roja y dorada
  doc.setFillColor(...RED)
  doc.rect(0, 46, W, 2, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, 48, W, 0.8, 'F')

  if (logo) {
    doc.setFillColor(255, 255, 255)
    doc.circle(M + 16, 23, 17, 'F')
    doc.addImage(logo, 'PNG', M + 0.5, 7.5, 31, 31)
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('Nani Cake', M + 38, 21)
  doc.setFontSize(8.5)
  doc.setTextColor(...GOLD)
  doc.text('PASTELERÍA & REPOSTERÍA', M + 38, 27)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(220, 235, 225)
  const contact = [business.whatsapp && `WhatsApp ${business.whatsapp}`, business.address].filter(Boolean).join('  ·  ')
  if (contact) doc.text(contact, M + 38, 33)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('SOLICITUD DE PEDIDO', W - M, 17, { align: 'right' })
  doc.setFontSize(13)
  doc.setTextColor(...GOLD)
  doc.text(folio, W - M, 24, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(220, 235, 225)
  doc.text(
    `Emitido: ${new Date().toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' })}`,
    W - M,
    30,
    { align: 'right' }
  )

  /* ---------- Datos del cliente ---------- */
  let y = 58
  doc.setFillColor(...CREAM)
  doc.setDrawColor(255, 202, 202)
  doc.roundedRect(M, y, W - M * 2, customer.notes ? 30 : 22, 3, 3, 'FD')

  const col = (label, value, x, yy, w) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text(label, x, yy)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...DARK)
    doc.text(doc.splitTextToSize(value, w), x, yy + 5.5)
  }
  const colW = (W - M * 2 - 12) / 2
  col('CLIENTE', [customer.name || 'Cliente', customer.phone && `Tel. ${customer.phone}`].filter(Boolean).join('  ·  '), M + 6, y + 8, colW)
  col('FECHA DESEADA DE ENTREGA', formatDateES(customer.date), M + 6 + colW, y + 8, colW)
  if (customer.notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text('NOTAS / PERSONALIZACIÓN', M + 6, y + 22)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    doc.text(doc.splitTextToSize(customer.notes, W - M * 2 - 70), M + 50, y + 22)
  }
  y += customer.notes ? 38 : 30

  /* ---------- Detalle ---------- */
  const ROW_H = 18
  doc.autoTable({
    startY: y,
    margin: { left: M, right: M },
    head: [['', 'Producto', 'Presentación', 'Cant.', 'Precio', 'Subtotal']],
    body: items.map((i) => [
      '',
      i.name,
      i.variant || 'Estándar',
      String(i.qty),
      formatCurrency(i.price, currency),
      formatCurrency(i.price * i.qty, currency),
    ]),
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9.5, textColor: DARK, valign: 'middle', cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
    headStyles: { fillColor: PINE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, minCellHeight: 9 },
    bodyStyles: { minCellHeight: ROW_H },
    alternateRowStyles: { fillColor: [255, 247, 247] },
    columnStyles: {
      0: { cellWidth: ROW_H + 2 },
      1: { fontStyle: 'bold', cellWidth: 'auto' },
      2: { cellWidth: 32, textColor: GRAY },
      3: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: RED_DARK },
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const img = thumbs[data.row.index]
        const s = ROW_H - 4
        const x = data.cell.x + 2
        const yy = data.cell.y + (data.cell.height - s) / 2
        if (img) {
          doc.addImage(img, 'JPEG', x, yy, s, s)
        } else {
          doc.setFillColor(255, 228, 228)
          doc.roundedRect(x, yy, s, s, 2, 2, 'F')
        }
      }
    },
  })

  y = doc.lastAutoTable.finalY + 6

  /* ---------- Total ---------- */
  const units = items.reduce((s, i) => s + i.qty, 0)
  const boxW = 78
  doc.setFillColor(...RED)
  doc.roundedRect(W - M - boxW, y, boxW, 18, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`TOTAL ESTIMADO · ${units} ${units === 1 ? 'artículo' : 'artículos'}`, W - M - boxW + 6, y + 7)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(formatCurrency(total, currency), W - M - 6, y + 14, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  const disclaimer = doc.splitTextToSize(
    'Esta es una solicitud de pedido. Nani Cake confirmará por WhatsApp la disponibilidad para la fecha indicada, el total final y la forma de pago antes de preparar tu pedido.',
    W - M * 2 - boxW - 8
  )
  doc.text(disclaimer, M, y + 5)

  /* ---------- Pie ---------- */
  doc.setFillColor(...PINE_DARK)
  doc.rect(0, H - 20, W, 20, 'F')
  doc.setFillColor(...RED)
  doc.rect(0, H - 20, W, 1, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('¡Gracias por endulzar tu Navidad con Nani Cake!', W / 2, H - 11, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GOLD)
  doc.text(
    [business.whatsapp && `Pedidos por WhatsApp: ${business.whatsapp}`, 'Honduras'].filter(Boolean).join('  ·  '),
    W / 2,
    H - 6,
    { align: 'center' }
  )

  const fileName = `Pedido_${folio}.pdf`
  return { blob: doc.output('blob'), doc, fileName }
}
