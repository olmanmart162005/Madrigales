import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate, formatTime, formatCurrency } from '@/utils'

/**
 * Carga una imagen en Base64 para jsPDF
 */
async function getBase64ImageFromUrl(imageUrl) {
  try {
    const res = await fetch(imageUrl)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Genera y descarga una Factura / Comprobante PDF profesional en formato CARTA (Letter)
 */
export async function generateOrderPDF(order, orderItems = [], settings = {}, emitter = {}) {
  const {
    business_name = 'Madrigales Pastelería',
    address = 'Col. Palmira, Tegucigalpa, Honduras',
    phone = '+504 9999-9999',
    currency_symbol = 'L',
  } = settings

  const currencySymbol = currency_symbol || 'L'
  const emitterName = emitter.name || 'Olman Martínez'
  const emitterRole = emitter.role || 'Propietario'

  // Documento en formato CARTA (Letter: 215.9 mm x 279.4 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 18

  // Colores de identidad de Madrigales
  const purpleDark = [44, 21, 54]      // #2C1536
  const purplePrimary = [124, 58, 237] // #7C3AED
  const fuchsiaAccent = [192, 38, 211] // #C026D3
  const grayText = [75, 85, 99]        // #4B5563
  const darkText = [17, 24, 39]        // #111827
  const tableHeaderBg = [59, 23, 76]   // Morado profundo

  // 1. Barra superior decorativa
  doc.setFillColor(...purpleDark)
  doc.rect(0, 0, pageWidth, 6, 'F')

  // 2. Cargar y dibujar Logo Oficial
  let logoY = 14
  try {
    const logoBase64 = await getBase64ImageFromUrl('/LOGO_OFICIAL.png')
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin, logoY, 20, 20)
    }
  } catch (err) {
    console.warn('Could not load logo into PDF:', err)
  }

  // 3. Encabezado institucional
  const headerTextX = margin + 24
  doc.setTextColor(...darkText)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(business_name.toUpperCase(), headerTextX, logoY + 6)

  doc.setTextColor(...fuchsiaAccent)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.text('PASTELERÍA Y REPOSTERÍA FINA', headerTextX, logoY + 11)

  doc.setTextColor(...grayText)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text(`${address} · Tel: ${phone}`, headerTextX, logoY + 16)

  // 4. Bloque derecho: Número de Factura, Fecha y Tipo de Venta
  doc.setTextColor(...purplePrimary)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURA / COMPROBANTE', pageWidth - margin, logoY + 3, { align: 'right' })

  doc.setTextColor(...darkText)
  doc.setFontSize(14)
  doc.text(`#${order.order_number}`, pageWidth - margin, logoY + 9, { align: 'right' })

  doc.setTextColor(...grayText)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text(`Fecha: ${formatDate(order.order_date)}`, pageWidth - margin, logoY + 14, { align: 'right' })

  const isScheduledOrder = order.order_type === 'programado' || (order.delivery_date && order.delivery_date !== order.order_date)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(isScheduledOrder ? 124 : 16, isScheduledOrder ? 58 : 185, isScheduledOrder ? 237 : 129)
  doc.text(
    isScheduledOrder ? 'PEDIDO PROGRAMADO' : 'VENTA INMEDIATA',
    pageWidth - margin,
    logoY + 18,
    { align: 'right' }
  )

  // Línea divisoria
  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.5)
  doc.line(margin, 40, pageWidth - margin, 40)

  // 5. Cuadro de Datos: Emisor y Cliente
  let infoY = 46
  doc.setFillColor(250, 247, 249) // #FAF7F9
  doc.roundedRect(margin, infoY, pageWidth - margin * 2, 24, 3, 3, 'F')
  doc.setDrawColor(237, 233, 254)
  doc.roundedRect(margin, infoY, pageWidth - margin * 2, 24, 3, 3, 'D')

  // Columna Izquierda: Emisor
  doc.setTextColor(156, 163, 175)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('EMITIDO POR:', margin + 5, infoY + 6)

  doc.setTextColor(...darkText)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(emitterName, margin + 5, infoY + 12)

  doc.setTextColor(...purplePrimary)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Rol: ${emitterRole}`, margin + 5, infoY + 18)

  // Columna Derecha: Cliente y Entrega
  const midX = pageWidth / 2 + 10
  doc.setTextColor(156, 163, 175)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENTE:', midX, infoY + 6)

  doc.setTextColor(...darkText)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(order.customer_name || 'Consumidor Final', midX, infoY + 12)

  if (isScheduledOrder && order.delivery_date) {
    doc.setTextColor(...grayText)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    const deliveryStr = `Entrega Programada: ${formatDate(order.delivery_date)}${
      order.delivery_time ? ` · ${formatTime(order.delivery_time)}` : ''
    }`
    doc.text(deliveryStr, midX, infoY + 18)
  } else {
    doc.setTextColor(16, 185, 129)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.text('Entrega en mostrador', midX, infoY + 18)
  }

  // 6. Tabla de Productos con Presentaciones (Snapshot de Precios Históricos)
  const tableData = orderItems.map((item) => {
    const productName = item.variant_name
      ? `${item.product_name}\nPresentación: ${item.variant_name}`
      : item.product_name

    const subtotalCalc = item.subtotal || item.unit_price * item.quantity

    return [
      productName,
      String(item.quantity),
      formatCurrency(item.unit_price, currencySymbol),
      formatCurrency(subtotalCalc, currencySymbol),
    ]
  })

  autoTable(doc, {
    startY: 76,
    margin: { left: margin, right: margin },
    head: [['PRODUCTO & PRESENTACIÓN', 'CANT.', 'P. UNITARIO', 'SUBTOTAL']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: tableHeaderBg,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontSize: 8.5 },
      1: { halign: 'center', cellWidth: 20, fontSize: 8.5 },
      2: { halign: 'right', cellWidth: 32, fontSize: 8.5 },
      3: { halign: 'right', cellWidth: 35, fontSize: 8.5, fontStyle: 'bold' },
    },
    styles: {
      cellPadding: 3.5,
      textColor: darkText,
      lineColor: [243, 244, 246],
      lineWidth: 0.3,
    },
    alternateRowStyles: {
      fillColor: [253, 251, 253],
    },
  })

  // 7. Totales y Observaciones
  const finalY = doc.lastAutoTable.finalY + 8

  // Bloque Izquierdo: Notas & Método de Pago
  let notesY = finalY
  if (order.notes) {
    doc.setTextColor(156, 163, 175)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('OBSERVACIONES:', margin, notesY)

    doc.setTextColor(...grayText)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    const splitNotes = doc.splitTextToSize(order.notes, 85)
    doc.text(splitNotes, margin, notesY + 4)
    notesY += 5 + splitNotes.length * 4
  }

  doc.setTextColor(...grayText)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text(`Método de pago: ${order.payment_methods?.name || 'Efectivo'}`, margin, notesY)

  // Estado de Pago y Entrega
  const hasPendingBalance = Number(order.balance) > 0
  const paymentStatusLabel = !hasPendingBalance
    ? 'PAGADO'
    : Number(order.amount_paid) > 0
    ? 'ABONADO (PARCIAL)'
    : 'PENDIENTE'

  doc.text(`Estado financiero: ${paymentStatusLabel}`, margin, notesY + 4.5)
  doc.text(`Estado entrega: ${order.status?.replace('_', ' ').toUpperCase()}`, margin, notesY + 9)

  // Bloque Derecho: Resumen Financiero con Vuelto
  const totalsBoxX = pageWidth - margin - 80
  const totalsBoxWidth = 80
  const hasCashDetails = Number(order.cash_received) > 0

  const boxHeight = hasCashDetails ? 48 : 38

  doc.setFillColor(250, 247, 249)
  doc.roundedRect(totalsBoxX, finalY - 2, totalsBoxWidth, boxHeight, 2, 2, 'F')
  doc.setDrawColor(237, 233, 254)
  doc.roundedRect(totalsBoxX, finalY - 2, totalsBoxWidth, boxHeight, 2, 2, 'D')

  let tY = finalY + 3.5
  doc.setTextColor(...grayText)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', totalsBoxX + 4, tY)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...darkText)
  doc.text(formatCurrency(order.subtotal, currencySymbol), pageWidth - margin - 4, tY, { align: 'right' })

  if (Number(order.discount) > 0) {
    tY += 4.5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(16, 185, 129)
    doc.text('Descuento:', totalsBoxX + 4, tY)
    doc.text(`-${formatCurrency(order.discount, currencySymbol)}`, pageWidth - margin - 4, tY, { align: 'right' })
  }

  tY += 5.5
  doc.setDrawColor(229, 231, 235)
  doc.line(totalsBoxX + 4, tY - 1, pageWidth - margin - 4, tY - 1)

  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...purpleDark)
  doc.text('TOTAL:', totalsBoxX + 4, tY + 2)
  doc.text(formatCurrency(order.total, currencySymbol), pageWidth - margin - 4, tY + 2, { align: 'right' })

  tY += 6.5
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...grayText)
  doc.text('Total Pagado / Abono:', totalsBoxX + 4, tY)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(16, 185, 129)
  doc.text(formatCurrency(order.amount_paid || 0, currencySymbol), pageWidth - margin - 4, tY, { align: 'right' })

  if (hasCashDetails) {
    tY += 4.5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...grayText)
    doc.text('Efectivo Recibido:', totalsBoxX + 4, tY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...darkText)
    doc.text(formatCurrency(order.cash_received, currencySymbol), pageWidth - margin - 4, tY, { align: 'right' })

    tY += 4.5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...grayText)
    doc.text('Vuelto Entregado:', totalsBoxX + 4, tY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(124, 58, 237)
    doc.text(formatCurrency(order.change_returned || 0, currencySymbol), pageWidth - margin - 4, tY, { align: 'right' })
  }

  tY += 5
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...grayText)
  doc.text('Saldo Pendiente:', totalsBoxX + 4, tY)
  doc.setTextColor(hasPendingBalance ? 225 : 16, hasPendingBalance ? 29 : 185, hasPendingBalance ? 72 : 129)
  doc.text(formatCurrency(order.balance || 0, currencySymbol), pageWidth - margin - 4, tY, { align: 'right' })

  // 8. Pie de Página Institucional
  const footerY = 265
  doc.setDrawColor(229, 231, 235)
  doc.line(margin, footerY, pageWidth - margin, footerY)

  doc.setTextColor(...purpleDark)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.text('¡Gracias por preferir Madrigales Pastelería!', pageWidth / 2, footerY + 5, { align: 'center' })

  doc.setTextColor(156, 163, 175)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Comprobante emitido automáticamente por el Sistema de Gestión Madrigales Pastelería', pageWidth / 2, footerY + 9, { align: 'center' })

  // 9. Guardar y Descargar
  doc.save(`Factura_${order.order_number}.pdf`)
}
