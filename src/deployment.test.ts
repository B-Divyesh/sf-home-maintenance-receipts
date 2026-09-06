import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const config = JSON.parse(readFileSync(new URL('../public/staticwebapp.config.json', import.meta.url), 'utf8')) as {
  globalHeaders: Record<string, string>
  mimeTypes: Record<string, string>
  routes: Array<{ route: string; rewrite?: string; statusCode?: number; headers?: Record<string, string> }>
  responseOverrides: Record<string, { rewrite: string }>
}

describe('static deployment policy', () => {
  it('isolates the app and permits only its billing connection', () => {
    expect(config.globalHeaders['Content-Security-Policy']).toContain("default-src 'self'")
    expect(config.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    expect(config.globalHeaders['Content-Security-Policy']).toContain("connect-src 'self' https://api.sociobot.in")
    expect(config.globalHeaders['X-Frame-Options']).toBe('DENY')
    expect(config.globalHeaders['Permissions-Policy']).toContain('camera=()')
    expect(config.globalHeaders['Referrer-Policy']).toBe('no-referrer')
  })

  it('sets correct manifest, update, and immutable asset response policies', () => {
    expect(config.mimeTypes['.webmanifest']).toBe('application/manifest+json')
    expect(config.routes.find(({ route }) => route === '/manifest.webmanifest')?.headers?.['Content-Type']).toBe('application/manifest+json')
    expect(config.routes.find(({ route }) => route === '/sw.js')?.headers?.['Cache-Control']).toContain('no-cache')
    expect(config.routes.find(({ route }) => route === '/assets/*')?.headers?.['Cache-Control']).toContain('immutable')
  })

  it('rewrites only known app routes and serves the designed file for a real 404', () => {
    for (const route of ['/log', '/reports', '/backup', '/plus', '/demo']) {
      expect(config.routes.find((item) => item.route === route)?.rewrite).toBe('/index.html')
    }
    expect(config.responseOverrides['404'].rewrite).toBe('/404.html')
    expect(config.routes.some((route) => route.rewrite && route.statusCode)).toBe(false)
  })
})
