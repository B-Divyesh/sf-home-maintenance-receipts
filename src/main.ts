import './style.css'
import { downloadBackup, downloadCsv, parseBackup } from './backup'
import { captureLicenseFromUrl, checkoutUrl, initialLicenseState, storeLicense, verifyLicense, type LicenseState } from './license'
import { downloadPdf } from './report'
import { deleteRecord, getAttachment, getAttachments, getRecords, getSettings, replaceAll, saveRecord, saveSettings } from './storage'
import type { EvidenceFile, MaintenanceRecord, Settings } from './types'
import { dueStatus, formatDate, formatMoney, groupBySystem, hashFile, makeId } from './utils'

type View = 'log' | 'reports' | 'backup' | 'upgrade'

const app = document.querySelector<HTMLDivElement>('#app')!
let records: MaintenanceRecord[] = []
let settings: Settings = { homeName: 'My home', address: '', theme: 'system' }
let license: LicenseState = initialLicenseState()
let currentView: View = 'log'
let query = ''
let statusFilter = 'all'
let editing: MaintenanceRecord | null = null
let updateWorker: ServiceWorker | null = null

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

function shell(content: string): string {
  const overdue = records.filter((record) => dueStatus(record.nextDueDate) === 'overdue').length
  return `
    <header class="app-header">
      <div class="brand-mark" aria-hidden="true"><span></span></div>
      <div class="brand-copy"><p class="eyebrow">Private home file / 01</p><h1>Home Maintenance<br><span>Receipts</span></h1></div>
      <div class="local-state"><span class="status-dot"></span><span><strong>Saved on this device</strong><small>${navigator.onLine ? 'Ready offline' : 'Working offline'}</small></span></div>
    </header>
    <nav class="app-nav" aria-label="Home file">
      ${navButton('log', 'file', 'Maintenance log', records.length ? String(records.length) : '')}
      ${navButton('reports', 'report', 'System reports', '')}
      ${navButton('backup', 'backup', 'Backup & home', overdue ? String(overdue) : '')}
      ${navButton('upgrade', 'key', license.unlocked ? 'House File Plus' : 'Unlock Plus', '')}
    </nav>
    <main id="main" tabindex="-1">${content}</main>
    <footer><p>Your records stay in this browser unless you export them.</p><nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav><p class="generated-note">Blueprint desk image generated for this product.</p></footer>
    <div id="toast-region" class="toast-region" aria-live="polite" aria-atomic="true"></div>
  `
}

function navButton(view: View, iconName: Parameters<typeof icon>[0], label: string, count: string): string {
  return `<button class="nav-button ${currentView === view ? 'active' : ''}" data-view="${view}" ${currentView === view ? 'aria-current="page"' : ''}>${icon(iconName)}<span>${label}</span>${count ? `<b>${count}</b>` : ''}</button>`
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
      <div><p class="sheet-label">Sheet 01 / Maintenance log</p><h2>${escapeHtml(settings.homeName)}</h2><p>Find the work, date, provider, and proof behind your home.</p></div>
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
        <div class="ledger-tools"><div><p class="sheet-label">Evidence index</p><h3 id="ledger-title">Completed work</h3></div>
          <div class="filters">
            <label class="search-field"><span class="sr-only">Search records</span>${icon('search')}<input id="search" type="search" value="${escapeHtml(query)}" placeholder="Search system, task, provider"></label>
            <label><span class="sr-only">Filter records</span><select id="status-filter"><option value="all">All records</option><option value="overdue" ${statusFilter === 'overdue' ? 'selected' : ''}>Overdue</option><option value="soon" ${statusFilter === 'soon' ? 'selected' : ''}>Due soon</option><option value="evidence" ${statusFilter === 'evidence' ? 'selected' : ''}>Has evidence</option></select></label>
          </div>
        </div>
        <div class="record-list">${results.length ? results.map(recordRow).join('') : `<div class="no-results"><p>No records match those marks.</p><button class="text-button" id="clear-filters">Clear search and filters</button></div>`}</div>
      </section>`}
  `
}

function emptyState(): string {
  return `<section class="empty-state">
    <div class="empty-copy"><p class="sheet-label">Blank sheet / ready</p><h3>Start your home’s paper trail.</h3><p>Log one completed job—like a furnace filter change or gutter cleaning. Add the receipt or photo, and this device keeps it available offline.</p><button class="button primary" id="empty-add">${icon('plus')}Log your first job</button><p class="fine-print">No account. Nothing is uploaded.</p></div>
    <picture><source srcset="/assets/blueprint-desk.webp" type="image/webp"><img src="/assets/blueprint-desk.jpg" width="768" height="512" alt="A blueprint desk arranged with a home plan, maintenance receipt, ruler, pencil, and wrench" fetchpriority="high" decoding="async"></picture>
  </section>`
}

function recordRow(record: MaintenanceRecord): string {
  const status = dueStatus(record.nextDueDate)
  const statusText = { none: 'No next date', overdue: 'Overdue', soon: 'Due soon', scheduled: 'Scheduled' }[status]
  return `<article class="record-row" data-record-id="${record.id}">
    <div class="record-index" aria-hidden="true">${String(records.indexOf(record) + 1).padStart(2, '0')}</div>
    <div class="record-main"><p class="system-name">${escapeHtml(record.system)}</p><h4>${escapeHtml(record.task)}</h4><p>${formatDate(record.completedDate)}${record.provider ? ` · ${escapeHtml(record.provider)}` : ''}${record.cost !== null ? ` · ${formatMoney(record.cost)}` : ''}</p>
      ${record.notes ? `<p class="record-notes">${escapeHtml(record.notes)}</p>` : ''}
      <div class="record-evidence">${record.attachmentId ? `<button class="evidence-link" data-attachment="${record.attachmentId}">${icon('paperclip')}<span>${escapeHtml(record.attachmentName ?? 'Evidence file')}</span><small>SHA-256 ${record.attachmentHash?.slice(0, 10)}…</small></button>` : '<span class="muted">No evidence attached</span>'}</div>
    </div>
    <div class="record-due"><span class="due ${status}">${icon('calendar')}${statusText}</span><strong>${record.nextDueDate ? formatDate(record.nextDueDate) : '—'}</strong></div>
    <div class="record-actions"><button class="icon-button" data-edit="${record.id}" aria-label="Edit ${escapeHtml(record.task)}">${icon('edit')}</button><button class="icon-button danger-button" data-delete="${record.id}" aria-label="Delete ${escapeHtml(record.task)}">${icon('trash')}</button></div>
  </article>`
}

function reportsView(): string {
  const groups = [...groupBySystem(records)]
  return `<section class="page-heading"><div><p class="sheet-label">Sheet 02 / System reports</p><h2>Portable maintenance record</h2><p>Generate a dated PDF with one clean evidence sheet per system.</p></div>${records.length ? `<button class="button primary" id="download-pdf">${icon('download')}Download PDF report</button>` : ''}</section>
    <div class="notice"><strong>Personal record, not certification.</strong> This report helps you locate your history. It does not prove warranty, permit, insurance, or legal compliance.</div>
    ${groups.length ? `<section class="report-preview" aria-labelledby="report-preview-title"><div class="report-title"><p class="sheet-label">Report contents</p><h3 id="report-preview-title">${groups.length} system ${groups.length === 1 ? 'sheet' : 'sheets'}</h3></div>${groups.map(([system, items], index) => `<article><span>${String(index + 1).padStart(2, '0')}</span><div><h4>${escapeHtml(system)}</h4><p>${items.length} completed ${items.length === 1 ? 'record' : 'records'} · ${items.filter((item) => item.attachmentId).length} with evidence</p></div><time>${formatDate(items[0].completedDate)}</time></article>`).join('')}</section>` : `<section class="simple-empty"><h3>No system sheets yet</h3><p>Log completed work first, then return here to create your report.</p><button class="button secondary" data-view="log">Go to maintenance log</button></section>`}`
}

function backupView(): string {
  return `<section class="page-heading"><div><p class="sheet-label">Sheet 03 / Ownership</p><h2>Back up the whole home file</h2><p>Your browser is the filing cabinet. Keep a second copy somewhere you control.</p></div></section>
    <section class="backup-layout"><div class="backup-actions"><article><span class="step">01</span><div><h3>Full backup</h3><p>JSON includes every record, setting, and original evidence file. Use it to move or restore this home file.</p></div><button class="button primary" id="export-json" ${records.length ? '' : 'disabled'}>${icon('download')}Export JSON backup</button></article>
    <article><span class="step">02</span><div><h3>Spreadsheet copy</h3><p>CSV opens in common spreadsheet apps. Evidence hashes are included; files are not.</p></div><button class="button secondary" id="export-csv" ${records.length ? '' : 'disabled'}>${icon('download')}Export CSV</button></article>
    <article><span class="step">03</span><div><h3>Restore a backup</h3><p>Restoring replaces this device’s current file. The backup is checked before anything changes.</p></div><label class="button secondary file-button">Choose backup<input id="import-json" type="file" accept="application/json,.json"></label></article></div>
    <form class="home-settings" id="settings-form"><p class="sheet-label">Title block</p><h3>Name this home</h3><label>Home name<input name="homeName" required maxlength="80" value="${escapeHtml(settings.homeName)}"></label><label>Address or description <span>(optional)</span><input name="address" maxlength="160" value="${escapeHtml(settings.address)}"></label><label>Appearance<select name="theme"><option value="system" ${settings.theme === 'system' ? 'selected' : ''}>Follow this device</option><option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light drafting sheet</option><option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark blueprint</option></select></label><button class="button primary" type="submit">Save home details</button></form></section>`
}

function upgradeView(): string {
  return `<section class="page-heading"><div><p class="sheet-label">House File Plus / One-time</p><h2>${license.unlocked ? 'Your full home file is unlocked.' : 'More room for the life of your home.'}</h2><p>Free is for starting a trustworthy record. Plus expands it for years of repairs and receipts.</p></div></section>
    <section class="upgrade-sheet">
      <div class="price-block"><p>One-time purchase</p><strong>$29</strong><span>No subscription</span></div>
      <div class="tier-comparison"><div><p class="sheet-label">Included free</p><h3>Starter file</h3><ul><li>${icon('check')}25 completed-work records</li><li>${icon('check')}One evidence file per record</li><li>${icon('check')}PDF, CSV, and full JSON backup</li><li>${icon('check')}Offline use on this device</li></ul></div><div class="plus-tier"><p class="sheet-label">House File Plus</p><h3>Long-term file</h3><ul><li>${icon('check')}Unlimited completed-work records</li><li>${icon('check')}Larger evidence files, up to 15 MB</li><li>${icon('check')}A one-time purchase, for this product</li><li>${icon('check')}All free features remain yours</li></ul></div></div>
      ${license.unlocked ? `<div class="license-success">${icon('check')}<div><strong>House File Plus is active</strong><p>This device can hold an unlimited maintenance history.</p></div></div>` : `<div class="purchase-actions"><a class="button primary" href="${checkoutUrl()}">Buy House File Plus — $29</a><p>Secure checkout is hosted by Sociobot/Dodo, the merchant of record. Refunds are handled there and revoke the license.</p></div>
      <details class="restore-license"><summary>Already purchased? Restore a license</summary><form id="license-form"><label>License token<input name="license" required autocomplete="off" spellcheck="false"></label><button class="button secondary" type="submit">Verify license</button></form></details>`}
      ${license.notice ? `<p class="license-notice" role="status">${escapeHtml(license.notice)}</p>` : ''}
      <p class="legal-copy">By purchasing, you agree to the <a href="/terms/">terms</a>. See how purchase and local record data are handled in our <a href="/privacy/">privacy notice</a>.</p>
    </section>`
}

function render(): void {
  const content = currentView === 'log' ? logView() : currentView === 'reports' ? reportsView() : currentView === 'backup' ? backupView() : upgradeView()
  app.innerHTML = shell(content)
  bindEvents()
}

function bindEvents(): void {
  app.querySelectorAll<HTMLElement>('[data-view]').forEach((element) => element.addEventListener('click', () => {
    currentView = element.dataset.view as View
    render()
    document.querySelector('main')?.focus()
  }))
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
    currentView = 'upgrade'; render(); toast('The free file holds 25 records. Plus removes the limit.'); return
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
  toast('A fresh blueprint is ready.', 'Update now')
  document.querySelector('#toast-action')?.addEventListener('click', () => updateWorker?.postMessage({ type: 'SKIP_WAITING' }))
}

async function start(): Promise<void> {
  try {
    const receivedLicense = captureLicenseFromUrl()
    license = initialLicenseState()
    ;[records, settings] = await Promise.all([getRecords(), getSettings()])
    applyTheme(); render(); registerServiceWorker()
    window.addEventListener('online', () => { render(); toast('Back online. Your local records stayed available.') })
    window.addEventListener('offline', () => { render(); toast('You’re offline. Your home file still works.') })
    if (license.token) {
      license = await verifyLicense()
      if (currentView === 'upgrade') render()
      if (receivedLicense) toast(license.unlocked ? 'Purchase restored. House File Plus is active.' : license.notice)
    }
  } catch (caught) {
    app.innerHTML = `<main id="main" class="fatal-error"><p class="sheet-label">Local file unavailable</p><h1>Your home file could not open.</h1><p>${escapeHtml(caught instanceof Error ? caught.message : 'This browser did not provide private local storage.')}</p><p>Check that private browsing restrictions are disabled, then reload. No remote copy exists.</p><button class="button primary" onclick="location.reload()">Try again</button></main>`
  }
}

void start()
