import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function createRecord(page: import('@playwright/test').Page, task = 'Replaced furnace filter') {
  await page.getByRole('button', { name: 'Log your first job' }).click()
  await page.getByLabel('Appliance or system *').fill('Heating & cooling')
  await page.getByLabel('Completed task *').fill(task)
  await page.getByRole('button', { name: 'Save completed work' }).click()
  await expect(page.getByRole('heading', { name: task })).toBeVisible()
}

function backupFile(data: unknown) {
  return {
    name: 'home-maintenance-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  }
}

const settings = { homeName: 'My home', address: '', theme: 'system' }

test('logs completed work, hashes evidence, and survives reload', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Home Maintenance Receipts/i, level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Start your home’s paper trail.' })).toBeVisible()

  await page.getByRole('button', { name: 'Log your first job' }).click()
  await page.getByLabel('Appliance or system *').fill('Heating & cooling')
  await page.getByLabel('Completed task *').fill('Replaced furnace filter')
  await page.getByLabel('Provider or person').fill('Self')
  await page.getByLabel('Cost (optional)').fill('24.99')
  await page.getByLabel('Next due date (optional)').fill('2026-11-28')
  await page.getByLabel(/Receipt or photo/).setInputFiles({ name: 'filter-receipt.txt', mimeType: 'text/plain', buffer: Buffer.from('Receipt 2026 filter 24.99') })
  await page.getByRole('button', { name: 'Save completed work' }).click()

  await expect(page.getByRole('heading', { name: 'Replaced furnace filter' })).toBeVisible()
  await expect(page.getByRole('button', { name: /filter-receipt.txt/ })).toContainText('SHA-256')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Replaced furnace filter' })).toBeVisible()
  expect(errors).toEqual([])
})

test('passes an automated accessibility scan in empty and form states', async ({ page }) => {
  await page.goto('/')
  let results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
  await page.getByRole('button', { name: 'Log your first job' }).click()
  results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
  results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
})

test('exports a PDF and restores a full backup', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Log your first job' }).click()
  await page.getByLabel('Appliance or system *').fill('Roof & gutters')
  await page.getByLabel('Completed task *').fill('Cleaned north gutter')
  await page.getByRole('button', { name: 'Save completed work' }).click()

  await page.getByRole('button', { name: 'System reports' }).click()
  const pdfDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF report' }).click()
  expect((await pdfDownload).suggestedFilename()).toMatch(/maintenance-report\.pdf$/)

  await page.getByRole('button', { name: 'Backup & home' }).click()
  const backupDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON backup' }).click()
  const backupPath = await (await backupDownload).path()
  expect(backupPath).toBeTruthy()

  await page.getByRole('button', { name: 'Maintenance log' }).click()
  await page.getByRole('button', { name: 'Delete Cleaned north gutter' }).click()
  await page.getByRole('button', { name: 'Delete record' }).click()
  await expect(page.getByRole('heading', { name: 'Start your home’s paper trail.' })).toBeVisible()

  await page.getByRole('button', { name: 'Backup & home' }).click()
  await page.locator('#import-json').setInputFiles(backupPath!)
  await page.getByRole('button', { name: 'Replace and restore' }).click()
  await page.getByRole('button', { name: 'Maintenance log' }).click()
  await expect(page.getByRole('heading', { name: 'Cleaned north gutter' })).toBeVisible()
})

test('remains usable at 390px and while offline', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: /Home Maintenance Receipts/i, level: 1 })).toBeVisible()
  await expect(page.getByText('Working offline')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('legal routes contain a title, one h1, and main landmark', async ({ page }) => {
  for (const path of ['/privacy/', '/terms/']) {
    await page.goto(path)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('main')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page).toHaveTitle(/Home Maintenance Receipts/)
  }
})

test('rejects incomplete and hash-tampered backups without replacing current records', async ({ page }) => {
  await page.goto('/')
  await createRecord(page, 'Keep this record')
  await page.getByRole('button', { name: 'Backup & home' }).click()

  await page.locator('#import-json').setInputFiles(backupFile({
    format: 'home-maintenance-receipts',
    version: 1,
    exportedAt: '2026-08-28T00:00:00.000Z',
    settings,
    records: [{ id: 'incomplete-record' }],
    attachments: [],
  }))
  await expect(page.getByText(/Record 1 has an invalid appliance or system/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Replace and restore' })).toHaveCount(0)

  const zeroHash = '0'.repeat(64)
  await page.locator('#import-json').setInputFiles(backupFile({
    format: 'home-maintenance-receipts',
    version: 1,
    exportedAt: '2026-08-28T00:00:00.000Z',
    settings,
    records: [{
      id: 'record-with-evidence', system: 'Roof', task: 'Inspected flashing', completedDate: '2026-08-28', provider: '', cost: null,
      nextDueDate: '', notes: '', attachmentId: 'evidence-1', attachmentName: 'receipt.txt', attachmentType: 'text/plain',
      attachmentHash: zeroHash, createdAt: '2026-08-28T00:00:00.000Z', updatedAt: '2026-08-28T00:00:00.000Z',
    }],
    attachments: [{ id: 'evidence-1', name: 'receipt.txt', type: 'text/plain', size: 8, hash: zeroHash, dataUrl: 'data:text/plain;base64,dGFtcGVyZWQ=' }],
  }))
  await expect(page.getByText(/Evidence file 1 does not match its SHA-256/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Replace and restore' })).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Keep this record' })).toBeVisible()
  await expect(page.getByText('Your home file could not open.')).toHaveCount(0)
})

test('rejects whitespace-only record identity fields', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Log your first job' }).click()
  await page.getByLabel('Appliance or system *').fill('   ')
  await page.getByLabel('Completed task *').fill('   ')
  await page.getByRole('button', { name: 'Save completed work' }).click()
  await expect(page.getByText('Enter an appliance or system, not only spaces.')).toBeVisible()
  await expect(page.getByLabel('Appliance or system *')).toBeFocused()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Start your home’s paper trail.' })).toBeVisible()
})

test('uses the production checkout contract and 44px mobile legal targets', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Unlock Plus' }).click()
  await expect(page.getByRole('link', { name: 'Buy House File Plus — $29' })).toHaveAttribute(
    'href',
    'https://api.sociobot.in/api/v1/products/home-maintenance-receipts/checkout',
  )

  for (const name of ['Privacy', 'Terms']) {
    const box = await page.getByRole('contentinfo').getByRole('link', { name }).boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
  }
})
