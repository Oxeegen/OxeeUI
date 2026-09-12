import { describe, expect, it } from 'vitest'
import { getDefaultSettings } from '../../src/shared/constants'
import { BRAND_DEFAULT_SETTINGS } from '../../src/shared/brand-default-settings'
import { buildDefaultSettings } from '../../src/shared/default-global-settings'

const defaults = getDefaultSettings('/home/test')

describe('brand default settings', () => {
  // Why: the override object existing proves nothing — it has to actually reach
  // the function every seed path calls, and a spread in the wrong order or a
  // second return added upstream would drop it silently.
  it.each(Object.keys(BRAND_DEFAULT_SETTINGS))('%s reaches getDefaultSettings', (key) => {
    const expected = BRAND_DEFAULT_SETTINGS[key as keyof typeof BRAND_DEFAULT_SETTINGS]
    expect(defaults[key as keyof typeof defaults]).toEqual(expected)
  })

  // Why: an override that merely restates upstream's value is worse than no
  // override — it pins a default upstream is still free to tune, and reads as a
  // deliberate choice when it never was. This is what keeps appFontFamily and
  // terminalInactivePaneOpacity out of the list.
  it('only overrides settings that actually differ from upstream', () => {
    const upstream = buildDefaultSettings({
      workspaceDir: '/home/test/orca/workspaces',
      appFontFamily: 'Geist',
      editorAutoSaveDelayMs: 1000,
      primarySelectionMiddleClickPaste: false,
      primarySelectionDefaultedForLinux: false,
      terminalFontFamily: 'Cascadia Mono',
      terminalInactivePaneOpacity: 0.9,
      terminalRightClickToPaste: true,
      notifications: defaults.notifications,
      voice: defaults.voice
    })

    const redundant = Object.entries(BRAND_DEFAULT_SETTINGS)
      .filter(([key, value]) => {
        const upstreamValue = upstream[key as keyof typeof upstream]
        return JSON.stringify(upstreamValue) === JSON.stringify(value)
      })
      .map(([key]) => key)

    expect(redundant).toEqual([])
  })

  // Why: every key must exist on GlobalSettings. A rename upstream would
  // otherwise leave a dead entry here that types alone would not catch, since
  // Partial<GlobalSettings> tolerates absence, not misspelling.
  it('names only settings upstream still has', () => {
    const unknown = Object.keys(BRAND_DEFAULT_SETTINGS).filter((key) => !(key in defaults))
    expect(unknown).toEqual([])
  })

  it('leaves settings outside the appearance layer to upstream', () => {
    expect(defaults.workspaceDir).toBe('/home/test/orca/workspaces')
    expect(BRAND_DEFAULT_SETTINGS).not.toHaveProperty('workspaceDir')
  })
})
