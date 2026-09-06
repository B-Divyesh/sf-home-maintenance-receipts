import './style.css'
import { downloadBackup, downloadCsv, parseBackup } from './backup'
import { createDemoData } from './demo'
import { captureLicenseFromUrl, checkCheckoutAvailability, checkoutUrl, initialLicenseState, storeLicense, verifyLicense, type CheckoutAvailability, type LicenseState } from './license'
import { downloadPdf } from './report'
import { clearCurrentDatabase, configureStorage, deleteRecord, getAttachment, getAttachments, getRecords, getSettings, replaceAll, saveRecord, saveSettings } from './storage'
import type { EvidenceFile, MaintenanceRecord, Settings } from './types'
import { dueStatus, formatDate, formatMoney, groupBySystem, hashFile, makeId } from './utils'

type View = 'landing' | 'log' | 'reports' | 'backup' | 'upgrade' | 'notfound'

const app = document.querySelector<HTMLDivElement>('#app')!
let records: MaintenanceRecord[] = []
let settings: Settings = { homeName: 'My home', address: '', theme: 'system' }
let license: LicenseState = { unlocked: false, checking: false, notice: '', token: '' }
let checkoutAvailability: CheckoutAvailability | 'idle' | 'checking' = 'idle'
let currentView: View = 'landing'
let demoMode = false
let query = ''
let statusFilter = 'all'
let editing: MaintenanceRecord | null = null
let updateWorker: ServiceWorker | null = null
const BUILD_ID = '1.1.0'

const routeMeta: Record<View, { title: string; description: string }> = {
  landing: {
    title: 'Home Maintenance Receipts — Keep completed work',
    description: 'Keep dates, providers, costs, and receipts for completed home maintenance in a local record you can export.',
  },
  log: { title: 'Maintenance log — Home Maintenance Receipts', description: 'Add and find completed home maintenance records and their receipts.' },
  reports: { title: 'System reports — Home Maintenance Receipts', description: 'Create a PDF report with one page for each home system.' },
  backup: { title: 'Backup — Home Maintenance Receipts', description: 'Export or restore your complete local home maintenance record.' },
  upgrade: { title: 'House File Plus — Home Maintenance Receipts', description: 'See the record and attachment limits for Home Maintenance Receipts.' },
  notfound: { title: 'Page not found — Home Maintenance Receipts', description: 'The requested Home Maintenance Receipts page could not be found.' },
}

const icon = (name: 'file' | 'report' | 'backup' | 'key' | 'plus' | 'search' | 'paperclip' | 'calendar' | 'download' | 'edit' | 'trash' | 'check') => {
  const paths: Record<string, string> = {
    file: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/>',
    report: '<path d="M5 3h14v18H5zM8 8h8M8 12h5M8 16h7"/>',
    backup: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"/>',
    key: '<circle cx="8" cy="12" r="4"/><path d="m12 12 8-8m-3 3 3 3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
    paperclip: '<path d="m9 12 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l8-8"/>',
    calendar: '<path d="M5 5h14v16H5zM8 3v4m8-4v4M5 10h14"/>',
    download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/>',
    edit: '<path d="m4 20 4-1 11-11-3-3L5 16zM14 7l3 3"/>',
    trash: '<path d="M5 7h14M9 7V4h6v3m-8 0 1 14h8l1-14M10 11v6m4-6v6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
  }
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function applyTheme(): void {
  document.documentElement.dataset.theme = settings.theme
}

function parseRoute(pathname = window.location.pathname): { view: View; demo: boolean } {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const realRoutes: Record<string, View> = { '/': 'landing', '/log': 'log', '/reports': 'reports', '/backup': 'backup', '/plus': 'upgrade' }
  if (path in realRoutes) return { view: realRoutes[path], demo: false }
  if (path === '/demo') return { view: 'log', demo: true }
  const demoRoutes: Record<string, View> = { '/demo/reports': 'reports', '/demo/backup': 'backup', '/demo/plus': 'upgrade' }
  if (path in demoRoutes) return { view: demoRoutes[path], demo: true }
  return { view: 'notfound', demo: false }
}

function viewPath(view: View): string {
  if (view === 'landing') return '/'
  if (view === 'notfound') return window.location.pathname
  const segment = view === 'upgrade' ? 'plus' : view
  return demoMode ? (view === 'log' ? '/demo' : `/demo/${segment}`) : `/${segment}`
}

function setRouteMetadata(): void {
  const meta = routeMeta[currentView]
  const title = demoMode ? `Demo — Home Maintenance Receipts${currentView === 'log' ? '' : ` — ${meta.title.split(' — ')[0]}`}` : meta.title
  const canonicalPath = demoMode ? viewPath(currentView) : currentView === 'notfound' ? '/404' : viewPath(currentView)
  const url = `https://home-maintenance-receipts.sociobot.in${canonicalPath}`
  document.title = title
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', meta.description)
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', url)
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', title)
  document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content', meta.description)
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', url)
  document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute('content', title)
  document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.setAttribute('content', meta.description)
}

function shell(content: string): string {
  const overdue = records.filter((record) => dueStatus(record.nextDueDate) === 'overdue').length
  const leave = demoMode ? 'data-leave-demo' : ''
  return `
    <header class="app-header">
      <a class="brand-link" href="/" ${leave} aria-label="Home Maintenance Receipts home"><span class="brand-mark" aria-hidden="true"><span></span></span><span class="brand-copy"><span class="eyebrow">Local maintenance records</span><strong>Home Maintenance<br><span>Receipts</span></strong></span></a>
      <div class="local-state"><span class="status-dot"></span><span><strong>${demoMode ? 'Sample data only' : 'Saved on this device'}</strong><small>${navigator.onLine ? 'Available offline' : 'Working offline'}</small></span></div>
    </header>
    <nav class="app-nav" aria-label="Main navigation">
      ${navLink('log', 'file', 'Maintenance log', records.length ? String(records.length) : '')}
      ${navLink('reports', 'report', 'System reports', '')}
      ${navLink('backup', 'backup', 'Backup', overdue ? String(overdue) : '')}
      <a class="nav-button" href="/demo">${icon('check')}<span>${demoMode ? 'Sample data' : 'Try sample data'}</span></a>
    </nav>
    <main id="main" tabindex="-1">${demoMode ? `<aside class="demo-banner" aria-label="Demo mode"><strong>Demo — sample data, nothing is saved</strong><span>Changes stay separate from your home file.</span><button id="reset-demo" class="text-button">Reset demo</button><a href="/log" id="start-real">Start for real</a></aside>` : ''}${content}</main>
    <footer><p>Keep dates, providers, costs, and receipts for completed home maintenance.</p><nav aria-label="Legal"><a href="/privacy/" ${leave}>Privacy</a><a href="/terms/" ${leave}>Terms</a></nav><p class="factory-note">Built by Param Factory · Build ${BUILD_ID}</p><p class="generated-note">Original blueprint desk image generated for this product.</p></footer>
    <div id="toast-region" class="toast-region" aria-live="polite" aria-atomic="true"></div>
    <div class="sr-only" id="route-status" aria-live="polite" aria-atomic="true"></div>
  `
}

function navLink(view: View, iconName: Parameters<typeof icon>[0], label: string, count: string): string {
  return `<a class="nav-button ${currentView === view ? 'active' : ''}" href="${viewPath(view)}" data-route="${view}" ${currentView === view ? 'aria-current="page"' : ''}>${icon(iconName)}<span>${label}</span>${count ? `<b>${count}</b>` : ''}</a>`
}

function landingView(): string {
  const paid = checkoutAvailability === 'available'
    ? `<p class="paid-price"><strong>$29 once.</strong> No subscription.</p><a class="button secondary" href="/plus" data-route="upgrade">See House File Plus</a>`
    : checkoutAvailability === 'unavailable'
      ? '<p><strong>Purchases are unavailable.</strong> The free record, exports, and offline use still work.</p><a class="button secondary" href="/plus" data-route="upgrade">See free and paid limits</a>'
      : '<p>House File Plus raises the record and file-size limits. Open the details to check purchase availability.</p><a class="button secondary" href="/plus" data-route="upgrade">See free and paid limits</a>'
  return `<section class="landing-hero" aria-labelledby="landing-title"><div class="landing-copy"><p class="sheet-label">Home upkeep record</p><h1 id="landing-title" tabindex="-1">Keep proof of completed home maintenance</h1><p class="audience">For households that need dates, providers, and receipts ready when they sell, insure, or troubleshoot a home.</p><div class="hero-actions"><a class="button primary" href="/demo">Try it with sample data</a><span>Opens three completed jobs with receipts.</span><a class="text-link" href="/log" data-route="log">Start your own record</a></div><ul class="plain-facts"><li>Records stay on this device.</li><li>Works offline after the first visit.</li><li>Free for up to 25 records.</li></ul></div><picture><source srcset="/assets/blueprint-desk.webp" type="image/webp"><img src="/assets/blueprint-desk.jpg" width="768" height="512" alt="A home plan, receipt, ruler, pencil, and wrench arranged on a blueprint desk" fetchpriority="high" decoding="async"></picture></section>
    <section class="landing-preview" aria-labelledby="preview-title"><div><p class="sheet-label">Sample maintenance log</p><h2 id="preview-title">See the details you can find later</h2><p>Each row keeps the completed task, date, provider, cost, next date, and evidence hash together.</p></div><ol><li><strong>Heating & cooling</strong><span>Replaced furnace filter · Self · $27.84</span><small>Receipt attached · Next date recorded</small></li><li><strong>Roof & gutters</strong><span>Cleared gutters · Northside Home Care · $165.00</span><small>Invoice attached · Due soon</small></li><li><strong>Water heater</strong><span>Flushed tank · Maple Plumbing · $189.00</span><small>Service note attached · Next year</small></li></ol></section>
    <section class="landing-section" aria-labelledby="how-title"><p class="sheet-label">How it works</p><h2 id="how-title">Keep each job in three steps</h2><ol class="steps"><li><span>01</span><div><h3>Log completed work</h3><p>Add the system, task, date, provider, cost, and next due date.</p></div></li><li><span>02</span><div><h3>Attach the evidence</h3><p>Add one receipt, photo, PDF, or text file to the record.</p></div></li><li><span>03</span><div><h3>Export a copy</h3><p>Download a PDF report, spreadsheet, or complete JSON backup.</p></div></li></ol></section>
    <section class="landing-section limits-section" aria-labelledby="limits-title"><p class="sheet-label">Limits and privacy</p><h2 id="limits-title">Know what this record does</h2><div><p>Your records and attachments stay in this browser unless you export them.</p><p>This tool does not inspect work, book contractors, diagnose problems, or prove compliance.</p><p>Browser storage can be cleared. Download a JSON backup and keep it somewhere you control.</p></div></section>
    <section class="landing-section paid-section" aria-labelledby="paid-title"><p class="sheet-label">Optional paid tier</p><h2 id="paid-title">House File Plus</h2><p>Free use includes 25 records and evidence files up to 5 MB. Plus raises those limits.</p>${paid}</section>`
}

function filteredRecords(): MaintenanceRecord[] {
  return records.filter((record) => {
    const matchesQuery = !query || `${record.system} ${record.task} ${record.provider} ${record.notes}`.toLowerCase().includes(query.toLowerCase())
    const matchesStatus = statusFilter === 'all' || dueStatus(record.nextDueDate) === statusFilter || (statusFilter === 'evidence' && Boolean(record.attachmentId))
    return matchesQuery && matchesStatus
  })
}

function logView(): string {
  const upcoming = records.filter((record) => ['overdue', 'soon'].includes(dueStatus(record.nextDueDate))).length
  const evidence = records.filter((record) => record.attachmentId).length
  const results = filteredRecords()
  return `
    <section class="page-heading">
      <div><p class="sheet-label">Maintenance log</p><h1 tabindex="-1">${escapeHtml(settings.homeName)} maintenance log</h1><p>Find completed work by date, provider, next due date, or attached receipt.</p></div>
      <button class="button primary" id="add-record">${icon('plus')}Log completed work</button>
    </section>
    ${records.length === 0 ? emptyState() : `
      <section class="summary-grid" aria-label="Home file summary">
        <div><span>Completed records</span><strong>${records.length}</strong></div>
        <div><span>Systems covered</span><strong>${groupBySystem(records).size}</strong></div>
        <div><span>Due within 30 days</span><strong>${upcoming}</strong></div>
        <div><span>With evidence</span><strong>${evidence}</strong></div>
      </section>
      <section class="ledger-section" aria-labelledby="ledger-title">
        <div class="ledger-tools"><div><p class="sheet-label">Evidence index</p><h2 id="ledger-title">Completed work</h2></div>
          <div class="filters">
            <label class="search-field"><span class="sr-only">Search records</span>${icon('search')}<input id="search" type="search" value="${escapeHtml(query)}" placeholder="Search system, task, provider"></label>
            <label><span class="sr-only">Filter records</span><select id="status-filter"><option value="all">All records</option><option value="overdue" ${statusFilter === 'overdue' ? 'selected' : ''}>Overdue</option><option value="soon" ${statusFilter === 'soon' ? 'selected' : ''}>Due soon</option><option value="evidence" ${statusFilter === 'evidence' ? 'selected' : ''}>Has evidence</option></select></label>
          </div>
        </div>
        <div class="record-list">${results.length ? results.map(recordRow).join('') : `<div class="no-results"><p>No records match your search and filters.</p><button class="text-button" id="clear-filters">Clear search and filters</button></div>`}</div>
      </section>`}
  `
}

function emptyState(): string {
  return `<section class="empty-state">
    <div class="empty-copy"><p class="sheet-label">No completed work yet</p><h2>Log your first completed job</h2><p>Add its date, provider, cost, next due date, and receipt when available.</p><button class="button primary" id="empty-add">${icon('plus')}Log your first job</button><p class="fine-print">No account is needed. Records stay on this device.</p></div>
    <picture><source srcset="/assets/blueprint-desk.webp" type="image/webp"><img src="/assets/blueprint-desk.jpg" width="768" height="512" alt="A blueprint desk arranged with a home plan, maintenance receipt, ruler, pencil, and wrench" fetchpriority="high" decoding="async"></picture>
  </section>`
}

function recordRow(record: MaintenanceRecord): string {
  const status = dueStatus(record.nextDueDate)
  const statusText = { none: 'No next date', overdue: 'Overdue', soon: 'Due soon', scheduled: 'Scheduled' }[status]
  return `<article class="record-row" data-record-id="${escapeHtml(record.id)}">
    <div class="record-index" aria-hidden="true">${String(records.indexOf(record) + 1).padStart(2, '0')}</div>
    <div class="record-main"><p class="system-name">${escapeHtml(record.system)}</p><h3>${escapeHtml(record.task)}</h3><p>${formatDate(record.completedDate)}${record.provider ? ` · ${escapeHtml(record.provider)}` : ''}${record.cost !== null ? ` · ${formatMoney(record.cost)}` : ''}</p>
      ${record.notes ? `<p class="record-notes">${escapeHtml(record.notes)}</p>` : ''}
      <div class="record-evidence">${record.attachmentId ? `<button class="evidence-link" data-attachment="${escapeHtml(record.attachmentId)}">${icon('paperclip')}<span>${escapeHtml(record.attachmentName ?? 'Evidence file')}</span><small>SHA-256 ${record.attachmentHash?.slice(0, 10)}…</small></button>` : '<span class="muted">No evidence attached</span>'}</div>
    </div>
    <div class="record-due"><span class="due ${status}">${icon('calendar')}${statusText}</span><strong>${record.nextDueDate ? formatDate(record.nextDueDate) : '—'}</strong></div>
    <div class="record-actions"><button class="icon-button" data-edit="${escapeHtml(record.id)}" aria-label="Edit ${escapeHtml(record.task)}">${icon('edit')}</button><button class="icon-button danger-button" data-delete="${escapeHtml(record.id)}" aria-label="Delete ${escapeHtml(record.task)}">${icon('trash')}</button></div>
  </article>`
}

function reportsView(): string {
  const groups = [...groupBySystem(records)]
  return `<section class="page-heading"><div><p class="sheet-label">System reports</p><h1 tabindex="-1">Export maintenance by system</h1><p>Generate a dated PDF with one page for each home system.</p></div>${records.length ? `<button class="button primary" id="download-pdf">${icon('download')}Download PDF report</button>` : ''}</section>
    <div class="notice"><strong>Personal record, not certification.</strong> This report helps you locate your history. It does not prove warranty, permit, insurance, or legal compliance.</div>
    ${groups.length ? `<section class="report-preview" aria-labelledby="report-preview-title"><div class="report-title"><p class="sheet-label">Report contents</p><h2 id="report-preview-title">${groups.length} system ${groups.length === 1 ? 'page' : 'pages'}</h2></div>${groups.map(([system, items], index) => `<article><span>${String(index + 1).padStart(2, '0')}</span><div><h3>${escapeHtml(system)}</h3><p>${items.length} completed ${items.length === 1 ? 'record' : 'records'} · ${items.filter((item) => item.attachmentId).length} with evidence</p></div><time>${formatDate(items[0].completedDate)}</time></article>`).join('')}</section>` : `<section class="simple-empty"><h2>No system pages yet</h2><p>Log completed work first, then return here to create your report.</p><a class="button secondary" href="${viewPath('log')}" data-route="log">Go to maintenance log</a></section>`}`
}

function backupView(): string {
  return `<section class="page-heading"><div><p class="sheet-label">Backup and home details</p><h1 tabindex="-1">Back up your complete home record</h1><p>Download a second copy and keep it somewhere you control.</p></div></section>
    <section class="backup-layout"><div class="backup-actions"><article><span class="step">01</span><div><h2>Full backup</h2><p>JSON includes every record, setting, and original evidence file. Use it to move or restore this home record.</p></div><button class="button primary" id="export-json" ${records.length ? '' : 'disabled'}>${icon('download')}Export JSON backup</button></article>
    <article><span class="step">02</span><div><h2>Spreadsheet copy</h2><p>CSV opens in common spreadsheet apps. Evidence hashes are included; files are not.</p></div><button class="button secondary" id="export-csv" ${records.length ? '' : 'disabled'}>${icon('download')}Export CSV</button></article>
    <article><span class="step">03</span><div><h2>Restore a backup</h2><p>Restoring replaces this device’s current record. The backup is checked before anything changes.</p></div><label class="button secondary file-button">Choose backup<input id="import-json" type="file" accept="application/json,.json"></label></article></div>
    <form class="home-settings" id="settings-form"><p class="sheet-label">Home details</p><h2>Name this home</h2><label>Home name<input name="homeName" required maxlength="80" value="${escapeHtml(settings.homeName)}"></label><label>Address or description <span>(optional)</span><input name="address" maxlength="160" value="${escapeHtml(settings.address)}"></label><label>Appearance<select name="theme"><option value="system" ${settings.theme === 'system' ? 'selected' : ''}>Follow this device</option><option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light drafting sheet</option><option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark blueprint</option></select></label><button class="button primary" type="submit">Save home details</button></form></section>`
}

function upgradeView(): string {
  const priceBlock = demoMode
    ? `<div class="price-block price-unavailable"><p>House File Plus</p><strong>Demo only</strong><span>See limits below</span></div>`
    : checkoutAvailability === 'available'
    ? `<div class="price-block"><p>One-time purchase</p><strong>$29</strong><span>No subscription</span></div>`
    : `<div class="price-block price-unavailable"><p>House File Plus</p><strong>Unavailable</strong><span>Free features continue</span></div>`
  const purchasePanel = demoMode
    ? `<p class="checkout-status" role="status">Purchases and license checks are disabled in demo. Start for real when you want to check availability.</p>`
    : license.unlocked
    ? `<div class="license-success">${icon('check')}<div><strong>House File Plus is active</strong><p>This device can hold an unlimited maintenance history.</p></div></div>`
    : checkoutAvailability === 'available'
      ? `<div class="purchase-actions"><a class="button primary" href="${checkoutUrl()}">Buy House File Plus — $29</a><p>Secure checkout is hosted by Sociobot/Dodo, the merchant of record. Refunds are handled there and revoke the license.</p></div>`
      : checkoutAvailability === 'checking'
        ? `<p class="checkout-status" role="status">Checking whether House File Plus checkout is available…</p>`
        : checkoutAvailability === 'unavailable'
          ? `<p class="checkout-status" role="status"><strong>House File Plus purchases are temporarily unavailable.</strong> Your free home file, exports, and offline use continue to work.</p>`
          : checkoutAvailability === 'offline'
            ? `<p class="checkout-status" role="status">Connect to the internet to check whether House File Plus checkout is available. Your local home file still works offline.</p>`
            : `<p class="checkout-status" role="status">Checking whether House File Plus checkout is available…</p>`
  return `<section class="page-heading"><div><p class="sheet-label">House File Plus</p><h1 tabindex="-1">${license.unlocked ? 'Use your full home record' : 'Keep more maintenance records'}</h1><p>The free tier is useful on its own. Plus raises the record and file-size limits.</p></div></section>
    <section class="upgrade-sheet">
      ${priceBlock}
      <div class="tier-comparison"><div><p class="sheet-label">Included free</p><h2>Free record</h2><ul><li>${icon('check')}25 completed-work records</li><li>${icon('check')}One evidence file per record, up to 5 MB</li><li>${icon('check')}PDF, CSV, and full JSON backup</li><li>${icon('check')}Offline use on this device</li></ul></div><div class="plus-tier"><p class="sheet-label">House File Plus</p><h2>Higher limits</h2><ul><li>${icon('check')}Unlimited completed-work records</li><li>${icon('check')}One evidence file per record, up to 15 MB</li><li>${icon('check')}A one-time purchase for this product</li><li>${icon('check')}All free features remain available</li></ul></div></div>
      ${purchasePanel}
      ${license.unlocked || demoMode ? '' : `<details class="restore-license"><summary>Already purchased? Restore a license</summary><form id="license-form"><label>License token<input name="license" required autocomplete="off" spellcheck="false"></label><button class="button secondary" type="submit">Verify license</button></form></details>`}
      ${license.notice ? `<p class="license-notice" role="status">${escapeHtml(license.notice)}</p>` : ''}
      <p class="legal-copy">By purchasing, you agree to the <a href="/terms/">terms</a>. See how purchase and local record data are handled in our <a href="/privacy/">privacy notice</a>.</p>
    </section>`
}

function notFoundView(): string {
  return `<section class="not-found"><p class="sheet-label">404 / Page not found</p><h1 tabindex="-1">Page not found</h1><p>The address does not match a page in Home Maintenance Receipts.</p><a class="button primary" href="/">Return home</a></section>`
}

function render(): void {
  const content = currentView === 'landing' ? landingView() : currentView === 'log' ? logView() : currentView === 'reports' ? reportsView() : currentView === 'backup' ? backupView() : currentView === 'upgrade' ? upgradeView() : notFoundView()
  app.innerHTML = shell(content)
  setRouteMetadata()
  bindEvents()
}

function bindEvents(): void {
  app.querySelectorAll<HTMLAnchorElement>('[data-route]').forEach((element) => element.addEventListener('click', (event) => {
    event.preventDefault()
    navigate(element.dataset.route as View)
  }))
  app.querySelectorAll<HTMLAnchorElement>('[data-leave-demo]').forEach((element) => element.addEventListener('click', (event) => {
    event.preventDefault()
    void leaveDemo(element.href)
  }))
  app.querySelector('#reset-demo')?.addEventListener('click', () => { void resetDemo() })
  app.querySelector('#start-real')?.addEventListener('click', (event) => {
    event.preventDefault()
    void leaveDemo('/log')
  })
  app.querySelector('#add-record')?.addEventListener('click', () => openRecordDialog())
  app.querySelector('#empty-add')?.addEventListener('click', () => openRecordDialog())
  app.querySelector('#clear-filters')?.addEventListener('click', () => { query = ''; statusFilter = 'all'; render() })
  app.querySelector<HTMLInputElement>('#search')?.addEventListener('input', (event) => { query = (event.target as HTMLInputElement).value; renderKeepingFocus('search') })
  app.querySelector<HTMLSelectElement>('#status-filter')?.addEventListener('change', (event) => { statusFilter = (event.target as HTMLSelectElement).value; render() })
  app.querySelectorAll<HTMLElement>('[data-edit]').forEach((button) => button.addEventListener('click', () => openRecordDialog(records.find((record) => record.id === button.dataset.edit) ?? null)))
  app.querySelectorAll<HTMLElement>('[data-delete]').forEach((button) => button.addEventListener('click', () => confirmDelete(records.find((record) => record.id === button.dataset.delete)!)))
  app.querySelectorAll<HTMLElement>('[data-attachment]').forEach((button) => button.addEventListener('click', () => openAttachment(button.dataset.attachment!)))
  app.querySelector('#download-pdf')?.addEventListener('click', generatePdf)
  app.querySelector('#export-json')?.addEventListener('click', exportJson)
  app.querySelector('#export-csv')?.addEventListener('click', () => { downloadCsv(records); toast('CSV copy downloaded.') })
  app.querySelector<HTMLInputElement>('#import-json')?.addEventListener('change', importJson)
  app.querySelector<HTMLFormElement>('#settings-form')?.addEventListener('submit', updateSettings)
  app.querySelector<HTMLFormElement>('#license-form')?.addEventListener('submit', restoreLicense)
  if (!demoMode && currentView === 'upgrade' && !license.unlocked && checkoutAvailability === 'idle') {
    checkoutAvailability = 'checking'
    render()
    void updateCheckoutAvailability()
  }
}

async function updateCheckoutAvailability(): Promise<void> {
  checkoutAvailability = await checkCheckoutAvailability()
  if (currentView === 'upgrade' && !license.unlocked) render()
}

function navigate(view: View, replace = false): void {
  currentView = view
  const path = viewPath(view)
  if (replace) history.replaceState({ view }, '', path)
  else history.pushState({ view }, '', path)
  render()
  const heading = app.querySelector<HTMLElement>('main h1')
  heading?.focus()
  const status = app.querySelector<HTMLElement>('#route-status')
  if (status) status.textContent = document.title
}

async function resetDemo(): Promise<void> {
  const data = await createDemoData()
  await replaceAll(data.records, data.attachments, data.settings)
  records = await getRecords()
  settings = await getSettings()
  applyTheme()
  render()
  toast('Demo reset to three sample records.')
}

async function leaveDemo(destination: string): Promise<void> {
  try { await clearCurrentDatabase() } catch { /* The sandbox remains isolated even when deletion is blocked. */ }
  window.location.assign(destination)
}

function renderKeepingFocus(id: string): void {
  const element = document.activeElement as HTMLInputElement | null
  const selection = element?.selectionStart ?? null
  render()
  const target = document.getElementById(id) as HTMLInputElement | null
  target?.focus()
  if (selection !== null) target?.setSelectionRange(selection, selection)
}

function dialogFrame(content: string, labelledBy: string): HTMLDialogElement {
  const dialog = document.createElement('dialog')
  dialog.className = 'record-dialog'
  dialog.setAttribute('aria-labelledby', labelledBy)
  dialog.innerHTML = content
  document.body.append(dialog)
  const close = () => { dialog.close(); dialog.remove() }
  dialog.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', close))
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close() })
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close() })
  dialog.showModal()
  return dialog
}

function openRecordDialog(record: MaintenanceRecord | null = null): void {
  if (!record && !license.unlocked && records.length >= 25) {
    navigate('upgrade'); toast('The free record holds 25 entries. Plus removes the limit.'); return
  }
  editing = record
  const dialog = dialogFrame(`<form method="dialog" id="record-form"><div class="dialog-header"><div><p class="sheet-label">${record ? 'Revise record' : 'New evidence entry'}</p><h2 id="record-dialog-title">${record ? 'Edit completed work' : 'Log completed work'}</h2></div><button type="button" class="icon-button" data-close aria-label="Close dialog">×</button></div>
    <div class="form-grid"><label>Appliance or system <span aria-hidden="true">*</span><input name="system" required maxlength="80" value="${escapeHtml(record?.system ?? '')}" placeholder="Heating & cooling"></label><label>Completed task <span aria-hidden="true">*</span><input name="task" required maxlength="120" value="${escapeHtml(record?.task ?? '')}" placeholder="Replaced furnace filter"></label><label>Completed date <span aria-hidden="true">*</span><input name="completedDate" required type="date" max="${today()}" value="${record?.completedDate ?? today()}"></label><label>Provider or person<input name="provider" maxlength="100" value="${escapeHtml(record?.provider ?? '')}" placeholder="Self or company name"></label><label>Cost <span>(optional)</span><span class="money-input"><span>$</span><input name="cost" type="number" min="0" max="9999999" step="0.01" value="${record?.cost ?? ''}" inputmode="decimal"></span></label><label>Next due date <span>(optional)</span><input name="nextDueDate" type="date" value="${record?.nextDueDate ?? ''}"></label><label class="full-width">Notes <span>(optional)</span><textarea name="notes" maxlength="800" rows="3" placeholder="Part number, observations, or follow-up">${escapeHtml(record?.notes ?? '')}</textarea></label>
    <label class="attachment-field full-width"><span>Receipt or photo <span>(PDF, image, or text)</span></span><input name="attachment" type="file" accept="image/*,application/pdf,text/plain" aria-describedby="file-help"><small id="file-help">${record?.attachmentName ? `Current: ${escapeHtml(record.attachmentName)}. Choose a file to replace it.` : `Stored only on this device. ${license.unlocked ? '15 MB' : '5 MB'} maximum.`}</small></label></div>
    <p class="form-error" id="form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button secondary" data-close>Cancel</button><button class="button primary" type="submit">${record ? 'Save changes' : 'Save completed work'}</button></div></form>`, 'record-dialog-title')
  const form = dialog.querySelector<HTMLFormElement>('#record-form')!
  form.addEventListener('submit', (event) => { event.preventDefault(); void submitRecord(form, dialog) })
  dialog.querySelector<HTMLInputElement>('[name="system"]')?.focus()
}

async function submitRecord(form: HTMLFormElement, dialog: HTMLDialogElement): Promise<void> {
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!
  const error = form.querySelector<HTMLElement>('#form-error')!
  const data = new FormData(form)
  const file = data.get('attachment') as File
  const systemInput = form.elements.namedItem('system') as HTMLInputElement
  const taskInput = form.elements.namedItem('task') as HTMLInputElement
  if (!systemInput.value.trim()) {
    error.textContent = 'Enter an appliance or system, not only spaces.'
    systemInput.focus()
    return
  }
  if (!taskInput.value.trim()) {
    error.textContent = 'Enter a completed task, not only spaces.'
    taskInput.focus()
    return
  }
  const maxSize = license.unlocked ? 15_000_000 : 5_000_000
  if (file?.size > maxSize) { error.textContent = `That file is over the ${license.unlocked ? '15' : '5'} MB limit. Choose a smaller file.`; return }
  submit.disabled = true
  submit.textContent = file?.size ? 'Hashing evidence…' : 'Saving…'
  try {
    const now = new Date().toISOString()
    let evidence: EvidenceFile | undefined
    if (file?.size) {
      const hash = await hashFile(file)
      evidence = { id: makeId(), name: file.name, type: file.type || 'application/octet-stream', size: file.size, hash, blob: file }
    }
    const value: MaintenanceRecord = {
      id: editing?.id ?? makeId(), system: String(data.get('system')).trim(), task: String(data.get('task')).trim(),
      completedDate: String(data.get('completedDate')), provider: String(data.get('provider')).trim(),
      cost: String(data.get('cost')) ? Number(data.get('cost')) : null, nextDueDate: String(data.get('nextDueDate')),
      notes: String(data.get('notes')).trim(), attachmentId: evidence?.id ?? editing?.attachmentId ?? null,
      attachmentName: evidence?.name ?? editing?.attachmentName ?? null, attachmentType: evidence?.type ?? editing?.attachmentType ?? null,
      attachmentHash: evidence?.hash ?? editing?.attachmentHash ?? null, createdAt: editing?.createdAt ?? now, updatedAt: now,
    }
    await saveRecord(value, evidence, editing?.attachmentId)
    records = await getRecords()
    dialog.close(); dialog.remove(); editing = null; render(); toast(recordSavedMessage(value, Boolean(evidence)))
  } catch (caught) {
    error.textContent = caught instanceof Error ? caught.message : 'The record could not be saved. Try again.'
    submit.disabled = false; submit.textContent = editing ? 'Save changes' : 'Save completed work'
  }
}

function recordSavedMessage(record: MaintenanceRecord, attached: boolean): string {
  return `${record.task} saved${attached ? ' with verified evidence hash' : ''}.`
}

function confirmDelete(record: MaintenanceRecord): void {
  const dialog = dialogFrame(`<div class="confirm-dialog"><p class="sheet-label">Remove record</p><h2 id="delete-title">Delete “${escapeHtml(record.task)}”?</h2><p>This permanently removes the record${record.attachmentId ? ' and its attached evidence' : ''} from this device. Export a backup first if you may need it.</p><div class="dialog-actions"><button class="button secondary" data-close>Keep record</button><button class="button danger" id="confirm-delete">Delete record</button></div></div>`, 'delete-title')
  dialog.querySelector('#confirm-delete')?.addEventListener('click', async () => {
    await deleteRecord(record); records = await getRecords(); dialog.close(); dialog.remove(); render(); toast(`${record.task} deleted.`)
  })
}

async function openAttachment(id: string): Promise<void> {
  const file = await getAttachment(id)
  if (!file) { toast('That evidence file is missing. Restore it from a backup if available.'); return }
  const url = URL.createObjectURL(file.blob)
  const link = document.createElement('a'); link.href = url; link.download = file.name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  toast(`${file.name} downloaded from this device.`)
}

async function generatePdf(): Promise<void> {
  const button = app.querySelector<HTMLButtonElement>('#download-pdf')!
  button.disabled = true; button.textContent = 'Drafting report…'
  try { await downloadPdf(records, settings); toast('PDF report downloaded.') }
  catch { toast('The PDF could not be generated. Try again.') }
  finally { button.disabled = false; button.innerHTML = `${icon('download')}Download PDF report` }
}

async function exportJson(): Promise<void> {
  try { await downloadBackup(records, await getAttachments(), settings); toast('Full backup downloaded.') }
  catch { toast('The backup could not be created. Check available storage and try again.') }
}

async function importJson(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const data = await parseBackup(file)
    const dialog = dialogFrame(`<div class="confirm-dialog"><p class="sheet-label">Restore checked</p><h2 id="restore-title">Replace this home file?</h2><p><strong>${data.records.length} records</strong> and <strong>${data.attachments.length} evidence files</strong> were found. Restoring will replace the records currently on this device.</p><div class="dialog-actions"><button class="button secondary" data-close>Cancel</button><button class="button danger" id="confirm-restore">Replace and restore</button></div></div>`, 'restore-title')
    dialog.querySelector('#confirm-restore')?.addEventListener('click', async () => {
      const restore = dialog.querySelector<HTMLButtonElement>('#confirm-restore')!
      restore.disabled = true
      restore.textContent = 'Restoring…'
      try {
        await replaceAll(data.records, data.attachments, data.settings)
        records = await getRecords(); settings = await getSettings(); applyTheme(); dialog.close(); dialog.remove(); render(); toast('Backup restored successfully.')
      } catch {
        restore.disabled = false
        restore.textContent = 'Replace and restore'
        toast('The backup could not replace your home file. Your previous file was kept.')
      }
    })
  } catch (caught) { toast(caught instanceof Error ? caught.message : 'That backup could not be read.') }
  input.value = ''
}

async function updateSettings(event: SubmitEvent): Promise<void> {
  event.preventDefault()
  const form = event.currentTarget as HTMLFormElement
  const homeName = form.elements.namedItem('homeName') as HTMLInputElement
  if (!homeName.value.trim()) {
    homeName.setCustomValidity('Enter a home name, not only spaces.')
    homeName.reportValidity()
    homeName.addEventListener('input', () => homeName.setCustomValidity(''), { once: true })
    return
  }
  const data = new FormData(form)
  settings = { homeName: String(data.get('homeName')).trim(), address: String(data.get('address')).trim(), theme: data.get('theme') as Settings['theme'] }
  await saveSettings(settings); applyTheme(); render(); toast('Home details saved.')
}

async function restoreLicense(event: SubmitEvent): Promise<void> {
  event.preventDefault()
  const form = event.currentTarget as HTMLFormElement
  storeLicense(String(new FormData(form).get('license')))
  license = { ...initialLicenseState(), checking: true, notice: 'Checking license…' }; render()
  license = await verifyLicense(true); render(); toast(license.unlocked ? 'House File Plus is active.' : license.notice)
}

function toast(message: string, action?: string): void {
  const region = document.querySelector<HTMLElement>('#toast-region')
  if (!region) return
  region.innerHTML = `<div class="toast">${icon('check')}<span>${escapeHtml(message)}</span>${action ? `<button id="toast-action">${escapeHtml(action)}</button>` : ''}</div>`
  if (!action) setTimeout(() => { if (region) region.innerHTML = '' }, 4500)
}

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return
  const register = () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      if (registration.waiting) showUpdate(registration.waiting)
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(worker) })
      })
    }).catch(() => toast('Offline setup is unavailable in this browser.'))
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (updateWorker) window.location.reload() })
  }
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}

function showUpdate(worker: ServiceWorker): void {
  updateWorker = worker
  toast('An app update is ready.', 'Update now')
  document.querySelector('#toast-action')?.addEventListener('click', () => updateWorker?.postMessage({ type: 'SKIP_WAITING' }))
}

async function start(): Promise<void> {
  try {
    const route = parseRoute()
    currentView = route.view
    demoMode = route.demo
    configureStorage(demoMode)
    const receivedLicense = demoMode ? false : captureLicenseFromUrl()
    license = demoMode ? { unlocked: false, checking: false, notice: '', token: '' } : initialLicenseState()
    ;[records, settings] = await Promise.all([getRecords(), getSettings()])
    if (demoMode && records.length === 0) {
      const data = await createDemoData()
      await replaceAll(data.records, data.attachments, data.settings)
      ;[records, settings] = await Promise.all([getRecords(), getSettings()])
    }
    applyTheme(); render(); registerServiceWorker()
    window.addEventListener('online', () => { render(); toast('Back online. Your local records stayed available.') })
    window.addEventListener('offline', () => { render(); toast('You’re offline. Your home file still works.') })
    window.addEventListener('popstate', () => {
      const next = parseRoute()
      if (next.demo !== demoMode) {
        window.location.reload()
        return
      }
      currentView = next.view
      render()
      app.querySelector<HTMLElement>('main h1')?.focus()
    })
    if (license.token) {
      license = await verifyLicense()
      if (currentView === 'upgrade') render()
      if (receivedLicense) toast(license.unlocked ? 'Purchase restored. House File Plus is active.' : license.notice)
    }
  } catch (caught) {
    app.innerHTML = shell(`<section class="fatal-error"><p class="sheet-label">Local storage unavailable</p><h1 tabindex="-1">Your home file could not open</h1><p>${escapeHtml(caught instanceof Error ? caught.message : 'This browser did not provide private local storage.')}</p><p>Allow site storage, then reload this page. No remote copy exists.</p><button class="button primary" id="retry-startup">Try again</button></section>`)
    setRouteMetadata()
    bindEvents()
    app.querySelector('#retry-startup')?.addEventListener('click', () => window.location.reload())
  }
}

void start()
