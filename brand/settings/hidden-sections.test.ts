import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HIDDEN_SETTINGS_SECTIONS } from './hidden-sections'

// Why read the source instead of calling the builder: the registry pulls in the
// renderer store and icon packages, and this only needs the declared ids. It is
// the same trick upstream's own metadata test uses.
const REGISTRY = readFileSync(
  resolve('src/renderer/src/hooks/useSettingsNavigationMetadata.ts'),
  'utf8'
)

const declaredIds = new Set(
  Array.from(REGISTRY.matchAll(/\n\s+id: '([a-z0-9-]+)',/g)).map((match) => match[1])
)

describe('hidden settings sections', () => {
  // Why this matters: an upstream rename would silently un-hide a section rather
  // than fail, and a pane reaching someone else's cloud would come back on its own.
  it.each(HIDDEN_SETTINGS_SECTIONS)('%s still exists in the upstream registry', (id) => {
    expect(declaredIds).toContain(id)
  })

  it('leaves the core panes alone', () => {
    for (const id of ['agents', 'git', 'terminal', 'appearance', 'shortcuts', 'privacy']) {
      expect(HIDDEN_SETTINGS_SECTIONS).not.toContain(id)
    }
  })

  it('declares no duplicates', () => {
    expect(new Set(HIDDEN_SETTINGS_SECTIONS).size).toBe(HIDDEN_SETTINGS_SECTIONS.length)
  })
})
