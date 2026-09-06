import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const origin = 'http://127.0.0.1:4173'
const checkout = 'https://api.sociobot.in/api/v1/products/home-maintenance-receipts/checkout'

async function openDemo(page: Page): Promise<void> {
  await page.goto('/demo')
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible()
  await expect(page.getByRole('heading', { name: '18 Cedar Lane maintenance log', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Replaced furnace filter' })).toBeVisible()
}

async function addRecord(page: Page, task: string, file?: { name: string; mimeType: string; buffer: Buffer }): Promise<void> {
  await page.getByRole('button', { name: 'Log completed work' }).click()
  await page.getByLabel('Appliance or system *').fill('Garage door')
  await page.getByLabel('Completed task *').fill(task)
  if (file) await page.getByLabel(/Receipt or photo/).setInputFiles(file)
  await page.getByRole('button', { name: 'Save completed work' }).click()
  await expect(page.getByRole('heading', { name: task })).toBeVisible()
}

function backupFile(data: unknown) {
  return { name: 'home-maintenance-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) }
}

function recordsBackup(count: number) {
  const timestamp = '2026-01-02T12:00:00.000Z'
  return {
    format: 'home-maintenance-receipts',
    version: 1,
    exportedAt: timestamp,
    settings: { homeName: 'Boundary test home', address: '', theme: 'system' },
    records: Array.from({ length: count }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      system: `System ${index + 1}`,
      task: `Completed task ${index + 1}`,
      completedDate: '2026-01-02',
      provider: '',
      cost: null,
      nextDueDate: '',
      notes: '',
      attachmentId: null,
      attachmentName: null,
      attachmentType: null,
      attachmentHash: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    attachments: [],
  }
}

async function restoreBackup(page: Page, data: unknown): Promise<void> {
  await page.getByRole('link', { name: 'Backup', exact: true }).click()
  await page.locator('#import-json').setInputFiles(backupFile(data))
  await page.getByRole('button', { name: 'Replace and restore' }).click()
}

test('@claim:demo-isolation sample changes never enter the real home record', async ({ page }) => {
  await openDemo(page)
  await addRecord(page, 'Lubricated garage door rollers')
  await expect(page.getByRole('heading', { name: 'Lubricated garage door rollers' })).toBeVisible()
  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect(page.getByRole('heading', { name: 'Lubricated garage door rollers' })).toHaveCount(0)
  await expect(page.getByText('Completed records').locator('..').getByText('3', { exact: true })).toBeVisible()
  await addRecord(page, 'Lubricated garage door rollers')
  await page.getByRole('link', { name: 'Start for real' }).click()
  await expect(page).toHaveURL(/\/log$/)
  await expect(page.getByRole('heading', { name: 'Log your first completed job' })).toBeVisible()
  await expect(page.getByText('Lubricated garage door rollers')).toHaveCount(0)
  const names = await page.evaluate(async () => (await indexedDB.databases()).map((database) => database.name))
  expect(names).not.toContain('demo:home-maintenance-receipts')
})

test('@claim:local-storage records and original attachments stay in local IndexedDB', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await openDemo(page)
  await addRecord(page, 'Tested safety reverse', { name: 'garage-note.txt', mimeType: 'text/plain', buffer: Buffer.from('Safety reverse tested and working') })
  const counts = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('demo:home-maintenance-receipts')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const count = (store: string) => new Promise<number>((resolve, reject) => {
      const request = database.transaction(store).objectStore(store).count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const result = { records: await count('records'), attachments: await count('attachments') }
    database.close()
    return result
  })
  expect(counts).toEqual({ records: 4, attachments: 4 })
  expect(requests.filter((url) => !url.startsWith(origin))).toEqual([])
})

test('@claim:no-tracking normal demo use loads no trackers, CDN scripts, or remote fonts', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await openDemo(page)
  await page.getByLabel('Search records').fill('Maple Plumbing')
  await expect(page.getByRole('heading', { name: 'Flushed tank and tested relief valve' })).toBeVisible()
  expect(requests.length).toBeGreaterThan(0)
  expect([...new Set(requests.map((url) => new URL(url).origin))]).toEqual([origin])
  expect(requests.some((url) => /analytics|doubleclick|fonts\.google|cdn\./i.test(url))).toBe(false)
})

test('@claim:no-account a household can log work without an account', async ({ page }) => {
  await openDemo(page)
  await addRecord(page, 'Tightened track bolts')
  await expect(page.getByRole('heading', { name: 'Tightened track bolts' })).toBeVisible()
  await expect(page.getByRole('link', { name: /sign in|log in|create account/i })).toHaveCount(0)
})

test('@claim:session-persistence saved work survives a reload', async ({ page }) => {
  await openDemo(page)
  await addRecord(page, 'Replaced weather seal')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Replaced weather seal' })).toBeVisible()
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible()
})

test('@claim:offline-reload the sample record reloads offline after the first visit', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(`${origin}/demo`)
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) await page.reload()
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('Working offline')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Replaced furnace filter' })).toBeVisible()
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible()
  await context.close()
})

test('@claim:pwa-install the site exposes an installable standalone PWA', async ({ page, context }) => {
  await openDemo(page)
  const manifest = await (await page.request.get('/manifest.webmanifest')).json() as { display: string; start_url: string; icons: Array<{ sizes: string; purpose?: string }> }
  expect(manifest.display).toBe('standalone')
  expect(manifest.start_url).toMatch(/^\//)
  expect(manifest.icons.some((item) => item.sizes === '192x192')).toBe(true)
  expect(manifest.icons.some((item) => item.sizes === '512x512' && item.purpose === 'maskable')).toBe(true)
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  const session = await context.newCDPSession(page)
  expect(await session.send('Page.getInstallabilityErrors')).toEqual({ installabilityErrors: [] })
})

test('@claim:sha-evidence an attachment hash matches the original downloaded file', async ({ page }) => {
  await openDemo(page)
  const evidence = page.getByRole('button', { name: /filter-store-receipt\.txt/ })
  const label = await evidence.innerText()
  const prefix = /SHA-256\s+([a-f0-9]{10})/i.exec(label)?.[1]
  expect(prefix).toBeTruthy()
  const downloadPromise = page.waitForEvent('download')
  await evidence.click()
  const path = await (await downloadPromise).path()
  expect(path).toBeTruthy()
  const digest = createHash('sha256').update(await readFile(path!)).digest('hex')
  expect(digest.startsWith(prefix!)).toBe(true)
})

test('@claim:search-filters search and due filters find matching completed work', async ({ page }) => {
  await openDemo(page)
  await page.getByLabel('Search records').fill('Maple Plumbing')
  await expect(page.getByRole('heading', { name: 'Flushed tank and tested relief valve' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Replaced furnace filter' })).toHaveCount(0)
  await page.getByLabel('Search records').fill('')
  await page.getByLabel('Filter records').selectOption('soon')
  await expect(page.getByRole('heading', { name: 'Cleared gutters and checked downspouts' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Flushed tank and tested relief valve' })).toHaveCount(0)
})

test('@claim:pdf-pages PDF export creates one page for each home system', async ({ page }) => {
  await openDemo(page)
  await page.getByRole('link', { name: 'System reports' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF report' }).click()
  const path = await (await downloadPromise).path()
  const pdf = (await readFile(path!)).toString('latin1')
  expect(pdf).toContain('/Count 3')
  expect(pdf).toContain('Heating & cooling')
  expect(pdf).toContain('Roof & gutters')
  expect(pdf).toContain('Water heater')
})

test('@claim:csv-export CSV export contains every record and evidence hash but no file bytes', async ({ page }) => {
  await openDemo(page)
  await page.getByRole('link', { name: 'Backup', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const path = await (await downloadPromise).path()
  const csv = await readFile(path!, 'utf8')
  expect(csv.trim().split(/\r?\n/)).toHaveLength(4)
  expect(csv).toContain('System,Completed task,Completed date,Provider,Cost,Next due,Notes,Attachment name,SHA-256')
  expect(csv).toContain('filter-store-receipt.txt')
  expect(csv).toMatch(/[a-f0-9]{64}/)
  expect(csv).not.toContain('Cedar Hardware')
})

test('@claim:json-backup JSON backup contains settings, every record, and every original evidence file', async ({ page }) => {
  await openDemo(page)
  await page.getByRole('link', { name: 'Backup', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON backup' }).click()
  const path = await (await downloadPromise).path()
  const data = JSON.parse(await readFile(path!, 'utf8')) as { settings: { homeName: string }; records: unknown[]; attachments: Array<{ dataUrl: string; hash: string }> }
  expect(data.settings.homeName).toBe('18 Cedar Lane')
  expect(data.records).toHaveLength(3)
  expect(data.attachments).toHaveLength(3)
  expect(data.attachments.every((item) => item.dataUrl.startsWith('data:text/plain;base64,') && /^[a-f0-9]{64}$/.test(item.hash))).toBe(true)
})

test('@claim:safe-restore an invalid backup leaves every current record unchanged', async ({ page }) => {
  await openDemo(page)
  await page.getByRole('link', { name: 'Backup', exact: true }).click()
  await page.locator('#import-json').setInputFiles(backupFile({ ...recordsBackup(1), records: [{ id: 'incomplete-record' }] }))
  await expect(page.getByText(/invalid identifier/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Replace and restore' })).toHaveCount(0)
  await page.reload()
  await page.getByRole('link', { name: 'Maintenance log' }).click()
  await expect(page.getByText('Completed records').locator('..').getByText('3', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Replaced furnace filter' })).toBeVisible()
})

test('@claim:free-record-limit the free tier stops a 26th completed-work record', async ({ page }) => {
  await openDemo(page)
  await restoreBackup(page, recordsBackup(25))
  await page.getByRole('link', { name: 'Maintenance log' }).click()
  await expect(page.getByText('Completed records').locator('..').getByText('25', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Log completed work' }).click()
  await expect(page).toHaveURL(/\/demo\/plus$/)
  await expect(page.getByRole('heading', { name: 'Keep more maintenance records' })).toBeVisible()
  await expect(page.getByText('The free record holds 25 entries. Plus removes the limit.')).toBeVisible()
})

test('@claim:free-file-limit the free tier rejects evidence above 5 MB', async ({ page }) => {
  await openDemo(page)
  await page.getByRole('button', { name: 'Log completed work' }).click()
  await page.getByLabel('Appliance or system *').fill('Garage door')
  await page.getByLabel('Completed task *').fill('Inspected opener')
  await page.getByLabel(/Receipt or photo/).setInputFiles({ name: 'large.txt', mimeType: 'text/plain', buffer: Buffer.alloc(5_000_001, 65) })
  await page.getByRole('button', { name: 'Save completed work' }).click()
  await expect(page.getByText('That file is over the 5 MB limit. Choose a smaller file.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Inspected opener' })).toHaveCount(0)
})

test('@claim:paid-offer checkout and the $29 one-time price appear only when available', async ({ page }) => {
  let status = 204
  await page.route(checkout, (route) => route.fulfill({ status, contentType: 'application/json', body: status === 404 ? '{}' : '' }))
  await openDemo(page)
  await page.getByRole('link', { name: 'Start for real' }).click()
  await expect(page).toHaveURL(/\/log$/)
  await page.goto('/plus')
  await expect(page.getByRole('link', { name: 'Buy House File Plus — $29' })).toHaveAttribute('href', checkout)
  await expect(page.getByText('No subscription')).toBeVisible()
  status = 404
  await page.reload()
  await expect(page.getByText('House File Plus purchases are temporarily unavailable.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Buy House File Plus — $29' })).toHaveCount(0)
  await expect(page.locator('main').getByText('$29', { exact: true })).toHaveCount(0)
})

test('@claim:paid-limits a valid license permits record 26 and a 15 MB evidence file', async ({ page }) => {
  await openDemo(page)
  await page.evaluate(() => {
    localStorage.setItem('sb_license:home-maintenance-receipts', 'claim-test-license')
    localStorage.setItem('sb_license:home-maintenance-receipts:verdict', JSON.stringify({ valid: true, checkedAt: Date.now() }))
  })
  await page.getByRole('link', { name: 'Start for real' }).click()
  await restoreBackup(page, recordsBackup(25))
  await page.getByRole('link', { name: 'Maintenance log' }).click()
  await page.getByRole('button', { name: 'Log completed work' }).click()
  await page.getByLabel('Appliance or system *').fill('Garage door')
  await page.getByLabel('Completed task *').fill('Saved paid boundary record')
  await page.getByLabel(/Receipt or photo/).setInputFiles({ name: 'fifteen-megabytes.txt', mimeType: 'text/plain', buffer: Buffer.alloc(15_000_000, 66) })
  await page.getByRole('button', { name: 'Save completed work' }).click()
  await expect(page.getByRole('heading', { name: 'Saved paid boundary record' })).toBeVisible()
  await expect(page.getByText('Completed records').locator('..').getByText('26', { exact: true })).toBeVisible()
})

test('@claim:license-portability a callback or pasted license is stored, stripped, and checked at most daily', async ({ page }) => {
  let verifyRequests = 0
  await page.route('https://api.sociobot.in/api/v1/products/home-maintenance-receipts/verify?license=portable-license', (route) => {
    verifyRequests += 1
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null }) })
  })
  await openDemo(page)
  await page.getByRole('link', { name: 'Start for real' }).click()
  await expect(page).toHaveURL(/\/log$/)
  await page.goto('/log?license=portable-license')
  await expect(page).toHaveURL(/\/log$/)
  await expect.poll(() => verifyRequests).toBe(1)
  expect(await page.evaluate(() => localStorage.getItem('sb_license:home-maintenance-receipts'))).toBe('portable-license')
  await page.reload()
  await expect.poll(() => verifyRequests).toBe(1)
  await page.goto('/plus')
  await expect(page.getByText('House File Plus is active')).toBeVisible()
})
