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
const recordId = '11111111-1111-4111-8111-111111111111'
const attachmentId = '22222222-2222-4222-8222-222222222222'

test('opens a populated isolated sample in one click and resets it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Try it with sample data' }).click()
  await expect(page).toHaveURL(/\/demo$/)
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Replaced furnace filter' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete Replaced furnace filter' }).click()
  await page.getByRole('button', { name: 'Delete record' }).click()
  await expect(page.getByRole('heading', { name: 'Replaced furnace filter' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect(page.getByRole('heading', { name: 'Replaced furnace filter' })).toBeVisible()
})

test('states the job and first action, then preserves route titles, focus, history, and 404 recovery', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Home Maintenance Receipts — Keep completed work')
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Keep proof of completed home maintenance', level: 1 })).toBeVisible()
  await expect(page.getByText(/For households that need dates, providers, and receipts/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toBeVisible()
  const firstScreenBottom = await page.locator('.plain-facts').evaluate((element) => element.getBoundingClientRect().bottom)
  expect(firstScreenBottom).toBeLessThanOrEqual(await page.evaluate(() => window.innerHeight))
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://home-maintenance-receipts.sociobot.in/')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /social-card\.jpg$/)

  await page.getByRole('link', { name: 'Start your own record' }).click()
  await expect(page).toHaveURL(/\/log$/)
  await expect(page).toHaveTitle('Maintenance log — Home Maintenance Receipts')
  await expect(page.getByRole('heading', { name: 'My home maintenance log', level: 1 })).toBeFocused()
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Keep proof of completed home maintenance', level: 1 })).toBeFocused()

  await page.goto('/not-a-real-route')
  await expect(page).toHaveTitle('Page not found — Home Maintenance Receipts')
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Page not found', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible()
})

test('logs completed work, hashes evidence, and survives reload', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/log')
  await expect(page.getByRole('heading', { name: 'My home maintenance log', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Log your first completed job' })).toBeVisible()

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
  await page.goto('/log')
  let results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
  await page.getByRole('button', { name: 'Log your first job' }).click()
  results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
  results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
})

test('passes accessibility scans on the landing, populated demo, legal, and missing-page states', async ({ page }) => {
  for (const path of ['/', '/demo', '/privacy/', '/terms/', '/not-a-real-route']) {
    await page.goto(path)
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? '')), path).toEqual([])
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('main')).toHaveCount(1)
  }
})

test('opens every app deep link with its own title and keeps reduced motion and 200% text usable', async ({ page, isMobile }) => {
  const routes = [
    ['/log', 'Maintenance log — Home Maintenance Receipts'],
    ['/reports', 'System reports — Home Maintenance Receipts'],
    ['/backup', 'Backup — Home Maintenance Receipts'],
    ['/plus', 'House File Plus — Home Maintenance Receipts'],
    ['/demo', 'Demo — Home Maintenance Receipts'],
    ['/demo/reports', 'Demo — Home Maintenance Receipts — System reports'],
  ] as const
  for (const [path, title] of routes) {
    await page.goto(path)
    await expect(page).toHaveTitle(title)
    await expect(page.locator('h1')).toHaveCount(1)
  }

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/log')
  await page.getByRole('button', { name: 'Log your first job' }).click()
  expect(await page.locator('dialog').evaluate((element) => getComputedStyle(element).animationDuration)).toBe('0s')
  await page.keyboard.press('Escape')

  await page.addStyleTag({ content: 'html { font-size: 200%; }' })
  await expect(page.getByRole('heading', { name: 'My home maintenance log' })).toBeVisible()
  if (isMobile) expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('exports a PDF and restores a full backup', async ({ page }) => {
  await page.goto('/log')
  await page.getByRole('button', { name: 'Log your first job' }).click()
  await page.getByLabel('Appliance or system *').fill('Roof & gutters')
  await page.getByLabel('Completed task *').fill('Cleaned north gutter')
  await page.getByRole('button', { name: 'Save completed work' }).click()

  await page.getByRole('link', { name: 'System reports' }).click()
  const pdfDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF report' }).click()
  expect((await pdfDownload).suggestedFilename()).toMatch(/maintenance-report\.pdf$/)

  await page.getByRole('link', { name: 'Backup' }).click()
  const backupDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON backup' }).click()
  const backupPath = await (await backupDownload).path()
  expect(backupPath).toBeTruthy()

  await page.getByRole('link', { name: 'Maintenance log' }).click()
  await page.getByRole('button', { name: 'Delete Cleaned north gutter' }).click()
  await page.getByRole('button', { name: 'Delete record' }).click()
  await expect(page.getByRole('heading', { name: 'Log your first completed job' })).toBeVisible()

  await page.getByRole('link', { name: 'Backup' }).click()
  await page.locator('#import-json').setInputFiles(backupPath!)
  await page.getByRole('button', { name: 'Replace and restore' }).click()
  await page.getByRole('link', { name: 'Maintenance log' }).click()
  await expect(page.getByRole('heading', { name: 'Cleaned north gutter' })).toBeVisible()
})

test('remains usable at 390px and while offline', async ({ page, context }) => {
  await page.goto('/log')
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'My home maintenance log', level: 1 })).toBeVisible()
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
  await page.goto('/log')
  await createRecord(page, 'Keep this record')
  await page.getByRole('link', { name: 'Backup' }).click()

  await page.locator('#import-json').setInputFiles(backupFile({
    format: 'home-maintenance-receipts',
    version: 1,
    exportedAt: '2026-08-28T00:00:00.000Z',
    settings,
    records: [{ id: recordId }],
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
      id: recordId, system: 'Roof', task: 'Inspected flashing', completedDate: '2026-08-28', provider: '', cost: null,
      nextDueDate: '', notes: '', attachmentId, attachmentName: 'receipt.txt', attachmentType: 'text/plain',
      attachmentHash: zeroHash, createdAt: '2026-08-28T00:00:00.000Z', updatedAt: '2026-08-28T00:00:00.000Z',
    }],
    attachments: [{ id: attachmentId, name: 'receipt.txt', type: 'text/plain', size: 8, hash: zeroHash, dataUrl: 'data:text/plain;base64,dGFtcGVyZWQ=' }],
  }))
  await expect(page.getByText(/Evidence file 1 does not match its SHA-256/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Replace and restore' })).toHaveCount(0)

  await page.reload()
  await page.getByRole('link', { name: 'Maintenance log' }).click()
  await expect(page.getByRole('heading', { name: 'Keep this record' })).toBeVisible()
  await expect(page.getByText('Your home file could not open.')).toHaveCount(0)
})

test('rejects a crafted backup identifier before it can alter the ledger markup', async ({ page }) => {
  await page.goto('/log')
  await createRecord(page, 'Keep this safe')
  await page.getByRole('link', { name: 'Backup' }).click()

  await page.locator('#import-json').setInputFiles(backupFile({
    format: 'home-maintenance-receipts',
    version: 1,
    exportedAt: '2026-08-28T00:00:00.000Z',
    settings,
    records: [{
      id: 'qa\"><p id="injected-marker">Injected backup markup</p><span data-qa="',
      system: 'Roof', task: 'Inspected flashing', completedDate: '2026-08-28', provider: '', cost: null,
      nextDueDate: '', notes: '', attachmentId: null, attachmentName: null, attachmentType: null, attachmentHash: null,
      createdAt: '2026-08-28T00:00:00.000Z', updatedAt: '2026-08-28T00:00:00.000Z',
    }],
    attachments: [],
  }))

  await expect(page.getByText('Record 1 has an invalid identifier. No data was changed.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Replace and restore' })).toHaveCount(0)
  await expect(page.locator('#injected-marker')).toHaveCount(0)
  await page.reload()
  await page.getByRole('link', { name: 'Maintenance log' }).click()
  await expect(page.getByRole('heading', { name: 'Keep this safe' })).toBeVisible()
})

test('binds fatal-storage recovery without an inline handler under the production CSP', async ({ page }) => {
  let documentRequests = 0
  page.on('request', (request) => { if (request.isNavigationRequest()) documentRequests += 1 })
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: { open: () => { throw new Error('IndexedDB unavailable for this test') } },
    })
  })
  await page.route('**/*', async (route) => {
    if (!route.request().isNavigationRequest()) return route.continue()
    const response = await route.fetch()
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'" },
    })
  })

  await page.goto('/log')
  const retry = page.getByRole('button', { name: 'Try again' })
  await expect(page.getByRole('heading', { name: 'Your home file could not open' })).toBeVisible()
  await expect(retry).not.toHaveAttribute('onclick')
  await retry.click()
  await expect.poll(() => documentRequests).toBeGreaterThanOrEqual(2)
  await expect(page.getByRole('heading', { name: 'Your home file could not open' })).toBeVisible()
})

test('does not retain a license callback token in service-worker cache keys', async ({ page }) => {
  await page.route('https://api.sociobot.in/**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ valid: false, reason: 'invalid', expires_at: null }),
  }))
  await page.goto('/log')
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))

  await page.goto('/log?license=qa-secret-regression-token')
  await expect(page).not.toHaveURL(/license=/)
  await expect.poll(async () => page.evaluate(async () => {
    const keys = await caches.keys()
    const requests = await Promise.all(keys.map(async (key) => (await caches.open(key)).keys()))
    return requests.flat().map((request) => request.url).filter((url) => new URL(url).searchParams.has('license'))
  })).toEqual([])
})

test('supports the primary record workflow by keyboard', async ({ page }) => {
  await page.goto('/log')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Log completed work' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Appliance or system *')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Log completed work' })).toBeFocused()
})

test('rejects whitespace-only record identity fields', async ({ page }) => {
  await page.goto('/log')
  await page.getByRole('button', { name: 'Log your first job' }).click()
  await page.getByLabel('Appliance or system *').fill('   ')
  await page.getByLabel('Completed task *').fill('   ')
  await page.getByRole('button', { name: 'Save completed work' }).click()
  await expect(page.getByText('Enter an appliance or system, not only spaces.')).toBeVisible()
  await expect(page.getByLabel('Appliance or system *')).toBeFocused()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Log your first completed job' })).toBeVisible()
})

test('shows the official checkout only after the billing product is available, and keeps mobile legal targets at 44px', async ({ page }) => {
  await page.route('https://api.sociobot.in/api/v1/products/home-maintenance-receipts/checkout', (route) => route.fulfill({ status: 204 }))
  await page.goto('/plus')
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

test('does not advertise a broken checkout when the billing product is not enabled', async ({ page }) => {
  await page.route('https://api.sociobot.in/api/v1/products/home-maintenance-receipts/checkout', (route) => route.fulfill({
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'enabled factory product', status: 404 }),
  }))
  await page.goto('/plus')
  await expect(page.getByText('House File Plus purchases are temporarily unavailable.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Buy House File Plus — $29' })).toHaveCount(0)
  await expect(page.locator('main').getByText('$29', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Your free home file, exports, and offline use continue to work.')).toBeVisible()
  await page.getByText('Already purchased? Restore a license').click()
  await expect(page.getByRole('button', { name: 'Verify license' })).toBeVisible()
})
