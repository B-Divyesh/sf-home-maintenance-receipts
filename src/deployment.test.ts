import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const config = JSON.parse(readFileSync(new URL('../public/staticwebapp.config.json', import.meta.url), 'utf8')) as {
  globalHeaders: Record<string, string>
  routes: Array<{ route: string; headers: Record<string, string> }>
}

describe('static deployment policy', () => {
  it('isolates the app and permits only its billing connection', () => {
    expect(config.globalHeaders['Content-Security-Policy']).toContain("default-src 'self'")
    expect(config.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    expect(config.globalHeaders['Content-Security-Policy']).toContain("connect-src 'self' https://api.sociobot.in")
    expect(config.globalHeaders['X-Frame-Options']).toBe('DENY')
    expect(config.globalHeaders['Permissions-Policy']).toContain('camera=()')
  })

  it('sets correct manifest, update, and immutable asset response policies', () => {
    expect(config.routes.find(({ route }) => route === '/manifest.webmanifest')?.headers['Content-Type']).toBe('application/manifest+json')
    expect(config.routes.find(({ route }) => route === '/sw.js')?.headers['Cache-Control']).toContain('no-cache')
    expect(config.routes.find(({ route }) => route === '/assets/*')?.headers['Cache-Control']).toContain('immutable')
  })
})
