import type { BackupFile, EvidenceFile, MaintenanceRecord, Settings } from './types'
import { escapeCsv } from './utils'

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(',')
  if (!header || !encoded) throw new Error('An attachment in this backup is incomplete.')
  const type = /data:([^;]+)/.exec(header)?.[1] ?? 'application/octet-stream'
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type })
}

export async function downloadBackup(records: MaintenanceRecord[], attachments: EvidenceFile[], settings: Settings): Promise<void> {
  const data: BackupFile = {
    format: 'home-maintenance-receipts',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    records,
    attachments: await Promise.all(attachments.map(async ({ blob, ...file }) => ({ ...file, dataUrl: await blobToDataUrl(blob) }))),
  }
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `home-maintenance-backup-${new Date().toISOString().slice(0, 10)}.json`)
}

export function downloadCsv(records: MaintenanceRecord[]): void {
  const headers = ['System', 'Completed task', 'Completed date', 'Provider', 'Cost', 'Next due', 'Notes', 'Attachment name', 'SHA-256']
  const rows = records.map((record) => [record.system, record.task, record.completedDate, record.provider, record.cost, record.nextDueDate, record.notes, record.attachmentName ?? '', record.attachmentHash ?? ''])
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n')
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `home-maintenance-log-${new Date().toISOString().slice(0, 10)}.csv`)
}

export async function parseBackup(file: File): Promise<{ records: MaintenanceRecord[]; attachments: EvidenceFile[]; settings: Settings }> {
  const data = JSON.parse(await file.text()) as BackupFile
  if (data.format !== 'home-maintenance-receipts' || data.version !== 1 || !Array.isArray(data.records) || !Array.isArray(data.attachments)) {
    throw new Error('Choose a version 1 Home Maintenance Receipts backup.')
  }
  const attachments = data.attachments.map(({ dataUrl, ...attachment }) => ({ ...attachment, blob: dataUrlToBlob(dataUrl) }))
  return { records: data.records, attachments, settings: data.settings }
}
