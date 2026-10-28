import type { GlobalSettings } from './global-settings-types'
import { buildDefaultSettings as upstreamBuildDefaultSettings } from './default-global-settings'

/**
 * OxeeUI's own defaults, layered over upstream's in `getDefaultSettings`.
 *
 * These are the appearance choices Oxeegen ships with, taken from the working
 * setup rather than invented: a fresh install should look the way the product is
 * meant to look, instead of the way an unbranded Orca does.
 *
 * Why a fork-owned file in `src/shared` rather than an import from `brand/`:
 * shared code is compiled by plain `tsc` for the packaged CLI, which resolves no
 * bundler aliases — `brand/release-repo.test.ts` fails the build if `@brand/`
 * ever appears here. The same constraint is why `MAIN_RELEASE_REPO` is a literal
 * in `release-channel.ts`. `brand/settings/default-settings.test.ts` keeps these
 * values honest, and being a file upstream does not have, it never conflicts.
 *
 * Only genuine departures from upstream belong here. `appFontFamily: 'Geist'`
 * and `terminalInactivePaneOpacity: 0.9` are deliberately absent: they read like
 * customisations but are already upstream's defaults, and pinning them here
 * would silently freeze values upstream is still free to tune.
 *
 * Settings are seeded per profile on first run, so editing this changes what a
 * NEW profile starts with. It does not migrate a profile that already exists.
 */
export const BRAND_DEFAULT_SETTINGS: Partial<GlobalSettings> = {
  // Ship dark rather than following the OS: the palette below is tuned for it.
  theme: 'dark',

  // Terminal type. Upstream defaults to Cascadia Mono on Windows; the Light cut
  // at 12px is what the smaller size was chosen against.
  terminalFontFamily: 'Cascadia Code Light',
  terminalFontSize: 12,

  // Monokai over upstream's Ghostty Default Style Dark.
  terminalThemeDark: 'Monokai',

  // A near-black terminal ground, with the two greens pulled to blue so agent
  // output reads in the brand's colour rather than terminal green.
  terminalColorOverrides: {
    background: '#1c1c1c',
    green: '#1d02e8',
    brightGreen: '#1c29e3'
  },

  // Let the workspace show through the terminal ground.
  terminalBackgroundOpacity: 0.18,

  // Tinted sidebar, lighter than upstream's near-black tint.
  leftSidebarAppearanceMode: 'tinted',
  leftSidebarTintColor: '#4f4f4f'
}

/**
 * Upstream's default-settings builder with the brand layer applied.
 *
 * Why re-export the same name rather than wrap at the call site: `constants.ts`
 * sits one line under a 300-line lint cap, so any statement added there breaks
 * the build. Swapping the import path changes that file by exactly nothing —
 * same identifier, same signature, same call — while every seed path picks up
 * the appearance layer.
 *
 * `global-settings-test-fixture.ts` deliberately keeps importing upstream's raw
 * builder: a fixture asserting upstream's shape should not inherit our palette.
 */
export function buildDefaultSettings(
  args: Parameters<typeof upstreamBuildDefaultSettings>[0]
): GlobalSettings {
  return { ...upstreamBuildDefaultSettings(args), ...BRAND_DEFAULT_SETTINGS }
}
