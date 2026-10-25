import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APP_ICON_OPTIONS } from '../../src/shared/app-icon'
import { BRAND_APP_ICON_IDS, IS_APP_ICON_CHOICE_OFFERED, resolveBrandAppIconId } from './app-icons'

describe('brand app icons', () => {
  it('offers only the OxeeUI mark', () => {
    expect(BRAND_APP_ICON_IDS).toEqual(['classic'])
    expect(IS_APP_ICON_CHOICE_OFFERED).toBe(false)
  })

  // Why: an id that upstream later renames or drops would leave OxeeUI offering
  // an icon the app cannot resolve.
  it('offers only ids upstream still defines', () => {
    const upstreamIds: string[] = APP_ICON_OPTIONS.map((option) => option.id)
    for (const id of BRAND_APP_ICON_IDS) {
      expect(upstreamIds).toContain(id)
    }
  })

  // Why every upstream id: a profile carried over from upstream holds whichever
  // one its user picked, and each must land on an icon OxeeUI offers.
  it.each(APP_ICON_OPTIONS.map((option) => option.id))('resolves %s to an offered icon', (id) => {
    expect(BRAND_APP_ICON_IDS).toContain(resolveBrandAppIconId(id))
  })

  it('leaves the offered icon unchanged', () => {
    expect(resolveBrandAppIconId('classic')).toBe('classic')
  })
})

describe('app icon hooks', () => {
  // Read as text: brand/ is type-checked by the node project, which does not own
  // renderer files.
  const source = (file: string): string => readFileSync(resolve(file), 'utf8')

  it('resolves a loaded profile through the brand before storing it', () => {
    expect(
      source('src/main/persistence/loading-store/normalize-loaded-global-settings.ts')
    ).toContain('appIcon: resolveBrandAppIconId(normalizeAppIconId(parsed.settings?.appIcon))')
  })

  it('hides the picker and its search entry when there is no choice', () => {
    expect(source('src/renderer/src/components/settings/AppearancePane.tsx')).toContain(
      'IS_APP_ICON_CHOICE_OFFERED && appIconMatches'
    )
    expect(source('src/renderer/src/components/settings/appearance-search.ts')).toContain(
      '...(IS_APP_ICON_CHOICE_OFFERED ? getAppIconEntries() : [])'
    )
  })
})
