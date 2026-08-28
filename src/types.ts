export type MaintenanceRecord = {
  id: string
  system: string
  task: string
  completedDate: string
  provider: string
  cost: number | null
  nextDueDate: string
  notes: string
  attachmentId: string | null
  attachmentName: string | null
  attachmentType: string | null
  attachmentHash: string | null
  createdAt: string
  updatedAt: string
}

export type EvidenceFile = {
  id: string
  name: string
  type: string
  size: number
  hash: string
  blob: Blob
}

export type Settings = {
  homeName: string
  address: string
  theme: 'light' | 'dark' | 'system'
}

export type BackupFile = {
  format: 'home-maintenance-receipts'
  version: 1
  exportedAt: string
  settings: Settings
  records: MaintenanceRecord[]
  attachments: Array<Omit<EvidenceFile, 'blob'> & { dataUrl: string }>
}

export const defaultSettings: Settings = {
  homeName: 'My home',
  address: '',
  theme: 'system',
}
