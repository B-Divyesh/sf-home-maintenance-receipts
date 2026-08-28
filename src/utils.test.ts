import { describe, expect, it } from 'vitest'
import type { MaintenanceRecord } from './types'
import { dueStatus, escapeCsv, formatMoney, groupBySystem } from './utils'

const record = (system: string, completedDate: string): MaintenanceRecord => ({
  id: `${system}-${completedDate}`,
  system,
  task: 'Completed task',
  completedDate,
  provider: '',
  cost: null,
  nextDueDate: '',
  notes: '',
  attachmentId: null,
  attachmentName: null,
  attachmentType: null,
  attachmentHash: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

describe('maintenance record helpers', () => {
  it('labels overdue, soon, and future dates at their boundaries', () => {
    const now = new Date(2026, 7, 28, 9)
    expect(dueStatus('', now)).toBe('none')
    expect(dueStatus('2026-08-27', now)).toBe('overdue')
    expect(dueStatus('2026-08-28', now)).toBe('soon')
    expect(dueStatus('2026-09-27', now)).toBe('soon')
    expect(dueStatus('2026-09-28', now)).toBe('scheduled')
  })

  it('groups systems alphabetically while preserving their records', () => {
    const groups = groupBySystem([record('Roof', '2026-01-01'), record('Boiler', '2026-02-01'), record('Roof', '2025-01-01')])
    expect([...groups.keys()]).toEqual(['Boiler', 'Roof'])
    expect(groups.get('Roof')).toHaveLength(2)
  })

  it('escapes spreadsheet fields and formats optional money', () => {
    expect(escapeCsv('Filter, 20"')).toBe('"Filter, 20"""')
    expect(formatMoney(null)).toBe('—')
    expect(formatMoney(123.45)).toMatch(/123\.45/)
  })
})
