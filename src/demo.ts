import type { EvidenceFile, MaintenanceRecord, Settings } from './types'
import { hashFile } from './utils'

type DemoData = {
  records: MaintenanceRecord[]
  attachments: EvidenceFile[]
  settings: Settings
}

function dateFromToday(days: number): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export async function createDemoData(): Promise<DemoData> {
  const createdAt = new Date().toISOString()
  const evidence = [
    {
      id: '10000000-0000-4000-8000-000000000001',
      name: 'filter-store-receipt.txt',
      type: 'text/plain',
      text: 'Cedar Hardware\nMERV 11 furnace filter\nAmount paid: $27.84\nPaid by card',
    },
    {
      id: '10000000-0000-4000-8000-000000000002',
      name: 'gutter-service-invoice.txt',
      type: 'text/plain',
      text: 'Northside Home Care\nGutter cleaning and downspout check\nInvoice total: $165.00\nPaid in full',
    },
    {
      id: '10000000-0000-4000-8000-000000000003',
      name: 'water-heater-service.txt',
      type: 'text/plain',
      text: 'Maple Plumbing\nTank flush and relief valve test\nService total: $189.00\nNo leaks found',
    },
  ]

  const attachments: EvidenceFile[] = await Promise.all(evidence.map(async (item) => {
    const blob = new Blob([item.text], { type: item.type })
    return { id: item.id, name: item.name, type: item.type, size: blob.size, hash: await hashFile(blob), blob }
  }))

  const record = (
    id: string,
    system: string,
    task: string,
    completedDaysAgo: number,
    provider: string,
    cost: number,
    nextDueInDays: number,
    notes: string,
    attachment: EvidenceFile,
  ): MaintenanceRecord => ({
    id,
    system,
    task,
    completedDate: dateFromToday(-completedDaysAgo),
    provider,
    cost,
    nextDueDate: dateFromToday(nextDueInDays),
    notes,
    attachmentId: attachment.id,
    attachmentName: attachment.name,
    attachmentType: attachment.type,
    attachmentHash: attachment.hash,
    createdAt,
    updatedAt: createdAt,
  })

  return {
    settings: { homeName: '18 Cedar Lane', address: 'Sample home', theme: 'system' },
    attachments,
    records: [
      record('20000000-0000-4000-8000-000000000001', 'Heating & cooling', 'Replaced furnace filter', 12, 'Self', 27.84, 78, 'Installed a MERV 11 filter. Size 16 × 25 × 1 inches.', attachments[0]),
      record('20000000-0000-4000-8000-000000000002', 'Roof & gutters', 'Cleared gutters and checked downspouts', 145, 'Northside Home Care', 165, 18, 'Removed leaf buildup. North downspout drains normally.', attachments[1]),
      record('20000000-0000-4000-8000-000000000003', 'Water heater', 'Flushed tank and tested relief valve', 64, 'Maple Plumbing', 189, 301, 'No leaks found. Technician recommended another check next year.', attachments[2]),
    ],
  }
}
