import type { MaintenanceRecord } from './types'

export function makeId(): string {
  return crypto.randomUUID()
}

export async function hashFile(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function dueStatus(nextDueDate: string, now = new Date()): 'none' | 'overdue' | 'soon' | 'scheduled' {
  if (!nextDueDate) return 'none'
  const due = new Date(`${nextDueDate}T12:00:00`)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return 'overdue'
  if (days <= 30) return 'soon'
  return 'scheduled'
}

export function formatDate(date: string): string {
  if (!date) return 'Not set'
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    .format(new Date(`${date}T12:00:00`))
}

export function formatMoney(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value)
}

export function groupBySystem(records: MaintenanceRecord[]): Map<string, MaintenanceRecord[]> {
  const groups = new Map<string, MaintenanceRecord[]>()
  records.forEach((record) => {
    const existing = groups.get(record.system) ?? []
    existing.push(record)
    groups.set(record.system, existing)
  })
  return new Map([...groups].sort(([a], [b]) => a.localeCompare(b)))
}

export function escapeCsv(value: string | number | null): string {
  const text = value === null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
