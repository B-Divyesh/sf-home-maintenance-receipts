import type { MaintenanceRecord, Settings } from './types'
import { formatDate, formatMoney, groupBySystem } from './utils'

function ascii(value: string): string {
  return value
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[—–]/g, '-').replace(/…/g, '...')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .split('').map((character) => {
      const code = character.charCodeAt(0)
      return code >= 32 && code <= 126 ? character : '?'
    }).join('')
}

function pdfText(value: string): string {
  return ascii(value).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
}

function shorten(value: string, length: number): string {
  const clean = ascii(value).replace(/\s+/g, ' ').trim()
  return clean.length <= length ? clean : `${clean.slice(0, Math.max(1, length - 3))}...`
}

function text(value: string, x: number, y: number, size: number, font = 'F1', color = '0.078 0.173 0.235'): string {
  return `BT /${font} ${size.toFixed(1)} Tf ${color} rg ${x.toFixed(1)} ${y.toFixed(1)} Td (${pdfText(value)}) Tj ET\n`
}

function systemPage(system: string, records: MaintenanceRecord[], settings: Settings): string {
  let commands = 'q 1 0.992 0.969 rg 48 54 516 676 re f Q\n'
  commands += '0.075 0.369 0.659 RG 0.25 w\n'
  for (let x = 36; x <= 576; x += 18) commands += `${x} 44 m ${x} 742 l S\n`
  for (let y = 44; y <= 742; y += 18) commands += `36 ${y} m 576 ${y} l S\n`
  commands += 'q 1 0.992 0.969 rg 48 54 516 676 re f Q\n0.078 0.173 0.235 RG 0.8 w 48 54 516 676 re S\n'
  commands += text('HOME MAINTENANCE RECORD  /  SYSTEM SHEET', 66, 708, 8, 'F2', '0.075 0.369 0.659')
  commands += text(shorten(system, 42), 66, 677, 20)
  commands += text(shorten(`${settings.homeName}${settings.address ? `  /  ${settings.address}` : ''}`, 92), 66, 658, 8, 'F1', '0.322 0.404 0.451')
  commands += text(`Prepared ${new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date())}`, 66, 644, 8, 'F1', '0.322 0.404 0.451')
  commands += '0.075 0.369 0.659 RG 0.8 w 66 632 m 546 632 l S\n'

  const rowHeight = Math.min(60, 500 / Math.max(records.length, 1))
  const dense = rowHeight < 22
  const bodySize = Math.max(5.2, Math.min(9.5, rowHeight * (dense ? 0.45 : 0.25)))
  let y = 609
  records.forEach((record, index) => {
    commands += text(`${String(index + 1).padStart(2, '0')}  ${formatDate(record.completedDate).toUpperCase()}`, 66, y, Math.max(5.2, bodySize - .5), 'F2', '0.075 0.369 0.659')
    if (dense) {
      const line = `${shorten(record.task, 34)} / ${shorten(record.provider || 'Provider not recorded', 18)} / ${formatMoney(record.cost)} / due ${formatDate(record.nextDueDate)}${record.attachmentHash ? ` / SHA ${record.attachmentHash.slice(0, 12)}` : ''}`
      commands += text(shorten(line, 110), 148, y, bodySize)
    } else {
      commands += text(shorten(record.task, 68), 66, y - 14, Math.max(6, bodySize + 1))
      commands += text(shorten(`${record.provider || 'Provider not recorded'}  /  Cost ${formatMoney(record.cost)}  /  Next due ${formatDate(record.nextDueDate)}`, 100), 66, y - 27, Math.max(5.4, bodySize - .5), 'F1', '0.322 0.404 0.451')
      if (record.attachmentHash) commands += text(`EVIDENCE SHA-256  ${record.attachmentHash}`, 66, y - 39, Math.max(5, bodySize - 1), 'F2', '0.322 0.404 0.451')
    }
    y -= rowHeight
    if (!dense) commands += `0.722 0.784 0.812 RG 0.35 w 66 ${(y + 5).toFixed(1)} m 546 ${(y + 5).toFixed(1)} l S\n`
  })
  commands += text('Personal record only. Not proof of warranty, permit, insurance, or legal compliance.', 66, 68, 6.5, 'F1', '0.322 0.404 0.451')
  return commands
}

function buildPdf(pages: string[]): Uint8Array {
  const objects: string[] = []
  const pageIds = pages.map((_, index) => 5 + index * 2)
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>'
  pages.forEach((content, index) => {
    const pageId = pageIds[index]
    const contentId = pageId + 1
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
    objects[contentId] = `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}endstream`
  })

  let output = '%PDF-1.4\n% HMR\n'
  const offsets = [0]
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = new TextEncoder().encode(output).length
    output += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }
  const xref = new TextEncoder().encode(output).length
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for (let id = 1; id < objects.length; id += 1) output += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(output)
}

function safeFileName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'home'
}

export async function downloadPdf(records: MaintenanceRecord[], settings: Settings): Promise<void> {
  const pages = [...groupBySystem(records)].map(([system, systemRecords]) => systemPage(system, systemRecords, settings))
  const url = URL.createObjectURL(new Blob([buildPdf(pages) as BlobPart], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeFileName(settings.homeName)}-maintenance-report.pdf`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
