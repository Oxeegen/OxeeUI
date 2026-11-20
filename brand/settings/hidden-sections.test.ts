import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HIDDEN_SETTINGS_SECTIONS } from './hidden-sections'

// Why read the source instead of calling the builder: the registry pulls in the
// renderer store and icon packages, and this only needs the declared ids. It is
// the same trick upstream's own metadata test uses.
//
// Why a directory scan rather than one path: upstream v1.4.200 split the section
// builders out of useSettingsNavigationMetadata.ts into sibling
// settings-navigation-*-sections.ts modules, which left every id declared
// somewhere this test did not read. Globbing the directory means the next such
// split fails loudly on a genuinely missing id instead of an empty scrape.
const HOOKS_DIR = resolve('src/renderer/src/components/settings/navigation')

const REGISTRY = readdirSync(HOOKS_DIR)
  .filter((name) => /^(useSettingsNavigationMetadata|settings-navigation-.*)\.ts$/.test(name))
  .filter((name) => !name.endsWith('.test.ts'))
  .map((name) => readFileSync(resolve(HOOKS_DIR, name), 'utf8'))
  .join('\n')

// Some builders name their id through an exported constant instead of a literal
// (the Bots page: `id: BOTS_SETTINGS_SECTION_ID`). Resolve those against the
// `export const NAME = '...'` declarations in the settings components, so a
// hidden section declared that way is checked like any other.
const SETTINGS_DIR = resolve('src/renderer/src/components/settings')
const SETTINGS_SOURCES = readdirSync(SETTINGS_DIR, { recursive: true, encoding: 'utf8' })
  .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
  .map((name) => readFileSync(resolve(SETTINGS_DIR, name), 'utf8'))
  .join('\n')
const ID_CONSTANTS = new Map(
  Array.from(SETTINGS_SOURCES.matchAll(/export const ([A-Z][A-Z0-9_]*) = '([a-z0-9-]+)'/g)).map(
    (match) => [match[1], match[2]] as const
  )
)

const declaredIds = new Set([
  ...Array.from(REGISTRY.matchAll(/\n\s+id: '([a-z0-9-]+)',/g)).map((match) => match[1]),
  ...Array.from(REGISTRY.matchAll(/\n\s+id: ([A-Z][A-Z0-9_]*),/g))
    .map((match) => ID_CONSTANTS.get(match[1]))
    .filter((id): id is string => id !== undefined)
])

// A scrape that finds nothing would pass every `toContain` below vacuously only
// if the set were compared the other way round; assert it is populated anyway,
// so a future rename of the modules cannot quietly empty it.
describe('settings registry scrape', () => {
  it('finds the upstream section ids', () => {
    expect(declaredIds.size).toBeGreaterThan(HIDDEN_SETTINGS_SECTIONS.length)
  })
})

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
