import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The release workflow must install everything the desktop build reads.
 *
 * Why this exists: upstream grew the desktop build a step that bundles the mobile
 * web app, which resolves React Native and Expo from mobile/node_modules — a
 * separate pnpm project that the root install leaves empty. release-brand.yml is
 * this fork's own workflow, so no upstream merge updates it; the first sign was a
 * build that failed after compiling everything else, with 420 unresolved imports.
 * Unit tests and the typecheck both passed.
 */
const workflow = readFileSync(resolve('.github/workflows/release-brand.yml'), 'utf8')
const scripts: Record<string, string> = JSON.parse(
  readFileSync(resolve('package.json'), 'utf8')
).scripts

describe('release build inputs', () => {
  it('reads the desktop build the release scripts run', () => {
    // Positive control: if these stop chaining build:desktop, the check below is
    // looking at the wrong script and proves nothing.
    expect(scripts['build:win:brand']).toContain('build:desktop')
    expect(scripts['build:linux:brand']).toContain('build:desktop')
  })

  it('installs the mobile project when the desktop build bundles it', () => {
    if (!scripts['build:desktop'].includes('build:mobile-web')) {
      return
    }
    expect(workflow).toContain('uses: ./.github/actions/install-mobile-dependencies')
    // Order matters: the action runs pnpm, which the root install step sets up.
    expect(workflow.indexOf('install-mobile-dependencies')).toBeGreaterThan(
      workflow.indexOf('pnpm install --frozen-lockfile')
    )
    expect(workflow.indexOf('install-mobile-dependencies')).toBeLessThan(
      workflow.indexOf('pnpm run ${{ matrix.script }}')
    )
  })
})
