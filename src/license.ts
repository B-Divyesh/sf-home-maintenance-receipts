const SLUG = 'home-maintenance-receipts'
const STORAGE_KEY = `sb_license:${SLUG}`
const VERDICT_KEY = `${STORAGE_KEY}:verdict`
const API_BASE = import.meta.env.VITE_BILLING_API_BASE || 'https://api.sociobot.in'

export type LicenseState = {
  unlocked: boolean
  checking: boolean
  notice: string
  token: string
}

export type CheckoutAvailability = 'available' | 'unavailable' | 'offline'

type Verdict = { valid: boolean; checkedAt: number }

export function checkoutUrl(): string {
  return `${API_BASE}/api/v1/products/${SLUG}/checkout`
}

/**
 * A registered checkout answers with a success or redirect. A missing factory
 * product answers 404. Manual redirects keep this availability check from
 * following a hosted checkout or payment-provider redirect.
 */
export async function checkCheckoutAvailability(): Promise<CheckoutAvailability> {
  try {
    const response = await fetch(checkoutUrl(), { redirect: 'manual' })
    if (response.status === 404) return 'unavailable'
    if (response.ok || (response.status >= 300 && response.status < 400) || response.type === 'opaqueredirect') return 'available'
    return 'unavailable'
  } catch {
    return 'offline'
  }
}

export function captureLicenseFromUrl(): boolean {
  const url = new URL(window.location.href)
  const token = url.searchParams.get('license')?.trim()
  if (!token) return false
  localStorage.setItem(STORAGE_KEY, token)
  localStorage.removeItem(VERDICT_KEY)
  url.searchParams.delete('license')
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  return true
}

export function initialLicenseState(): LicenseState {
  const token = localStorage.getItem(STORAGE_KEY) ?? ''
  const verdict = parseVerdict(localStorage.getItem(VERDICT_KEY))
  return {
    unlocked: Boolean(token && verdict?.valid),
    checking: Boolean(token),
    notice: '',
    token,
  }
}

function parseVerdict(raw: string | null): Verdict | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Verdict
    return typeof value.valid === 'boolean' && typeof value.checkedAt === 'number' ? value : null
  } catch {
    return null
  }
}

export async function verifyLicense(force = false): Promise<LicenseState> {
  const token = localStorage.getItem(STORAGE_KEY) ?? ''
  if (!token) return { unlocked: false, checking: false, notice: '', token: '' }
  const cached = parseVerdict(localStorage.getItem(VERDICT_KEY))
  const recent = cached && Date.now() - cached.checkedAt < 86_400_000
  if (!force && recent) return { unlocked: cached.valid, checking: false, notice: cached.valid ? '' : 'This license is no longer active.', token }

  try {
    const response = await fetch(`${API_BASE}/api/v1/products/${SLUG}/verify?license=${encodeURIComponent(token)}`)
    if (!response.ok) throw new Error('Verification service unavailable')
    const result = await response.json() as { valid: boolean }
    localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: result.valid, checkedAt: Date.now() }))
    return { unlocked: result.valid, checking: false, notice: result.valid ? '' : 'This license is no longer active.', token }
  } catch {
    return {
      unlocked: cached?.valid ?? false,
      checking: false,
      notice: cached?.valid ? 'License check postponed while offline.' : 'Connect to verify this license.',
      token,
    }
  }
}

export function storeLicense(token: string): void {
  localStorage.setItem(STORAGE_KEY, token.trim())
  localStorage.removeItem(VERDICT_KEY)
}
