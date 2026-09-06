import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

type Claim = { id: string; claim: string; where: string; test: string; sandbox: string }

const claims = JSON.parse(readFileSync(new URL('../.factory/claims.json', import.meta.url), 'utf8')) as Claim[]
const browserTests = readFileSync(new URL('../tests/claims.spec.ts', import.meta.url), 'utf8')

describe('public claim registry', () => {
  it('gives each declared claim one unique tagged browser test', () => {
    const ids = claims.map((claim) => claim.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(claims).toHaveLength(18)
    for (const claim of claims) {
      expect(claim.claim.length).toBeGreaterThan(0)
      expect(claim.where.length).toBeGreaterThan(0)
      expect(claim.sandbox.length).toBeGreaterThan(0)
      expect(claim.test).toBe(`npm run test:claims -- --grep @claim:${claim.id}`)
      expect(browserTests.match(new RegExp(`@claim:${claim.id}(?![a-z-])`, 'g'))).toHaveLength(1)
    }
  })
})
