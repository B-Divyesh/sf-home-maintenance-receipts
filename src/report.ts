import type { MaintenanceRecord, Settings } from './types'
import { formatDate, formatMoney, groupBySystem } from './utils'

function safeFileName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'home'
}

export async function downloadPdf(records: MaintenanceRecord[], settings: Settings): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: true })
  const groups = [...groupBySystem(records)]

  groups.forEach(([system, systemRecords], pageIndex) => {
    if (pageIndex > 0) pdf.addPage()
    pdf.setDrawColor(19, 94, 168)
    pdf.setLineWidth(0.6)
    for (let x = 36; x <= 576; x += 18) pdf.line(x, 44, x, 742)
    for (let y = 44; y <= 742; y += 18) pdf.line(36, y, 576, y)
    pdf.setFillColor(255, 253, 247)
    pdf.rect(48, 54, 516, 676, 'F')
    pdf.setDrawColor(20, 44, 60)
    pdf.rect(48, 54, 516, 676)

    pdf.setFont('courier', 'bold')
    pdf.setTextColor(19, 94, 168)
    pdf.setFontSize(9)
    pdf.text('HOME MAINTENANCE RECORD  /  SYSTEM SHEET', 66, 78)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(20, 44, 60)
    pdf.setFontSize(22)
    pdf.text(system, 66, 108)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(82, 103, 115)
    pdf.text(`${settings.homeName}${settings.address ? ` · ${settings.address}` : ''}`, 66, 126)
    pdf.text(`Prepared ${new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date())}`, 66, 140)
    pdf.setDrawColor(19, 94, 168)
    pdf.line(66, 152, 546, 152)

    let y = 180
    const printable = systemRecords.slice(0, 7)
    printable.forEach((record, index) => {
      pdf.setFont('courier', 'bold')
      pdf.setTextColor(19, 94, 168)
      pdf.setFontSize(8)
      pdf.text(`${String(index + 1).padStart(2, '0')}  ${formatDate(record.completedDate).toUpperCase()}`, 66, y)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(20, 44, 60)
      pdf.setFontSize(12)
      pdf.text(record.task, 66, y + 18, { maxWidth: 360 })
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      const provider = record.provider || 'Provider not recorded'
      pdf.text(`${provider}  ·  Cost ${formatMoney(record.cost)}  ·  Next due ${formatDate(record.nextDueDate)}`, 66, y + 34, { maxWidth: 460 })
      if (record.attachmentHash) {
        pdf.setFont('courier', 'normal')
        pdf.setFontSize(7)
        pdf.setTextColor(82, 103, 115)
        pdf.text(`EVIDENCE SHA-256  ${record.attachmentHash}`, 66, y + 50, { maxWidth: 460 })
      }
      pdf.setDrawColor(184, 200, 207)
      pdf.line(66, y + 63, 546, y + 63)
      y += 76
    })

    if (systemRecords.length > printable.length) {
      pdf.setTextColor(138, 82, 7)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.text(`${systemRecords.length - printable.length} older records remain in the JSON/CSV export.`, 66, 710)
    }
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(82, 103, 115)
    pdf.setFontSize(7)
    pdf.text('Personal record only. This report does not establish warranty, permit, insurance, or legal compliance.', 66, 720)
  })

  pdf.save(`${safeFileName(settings.homeName)}-maintenance-report.pdf`)
}
