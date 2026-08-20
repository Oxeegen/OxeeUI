/**
 * Settings sections OxeeUI removes.
 *
 * The registry in `src/renderer/src/hooks/useSettingsNavigationMetadata.ts` backs
 * both the Settings sidebar and the Cmd+J palette, and the filter is applied in
 * the hook the UI consumes rather than in the builder — so upstream's own tests
 * keep asserting upstream's full registry and never need touching.
 *
 * This removes entry points, not capabilities. A hidden feature is still
 * compiled in and may stay reachable from its own UI. Anything that must be
 * genuinely unavailable needs a real gate, not an entry in this list.
 */

/**
 * Reaches an upstream first-party service. These are not merely off-brand: a
 * fork build authenticates with someone else's OAuth client or publishes to
 * someone else's host.
 */
const UPSTREAM_SERVICES = [
  // OAuth against stablyai's cloud, with their production client id baked into
  // packaged builds (profile-cloud-auth-config.ts).
  'orca-account',
  // Publishes to share.onorca.dev (artifact-cloud-config.ts).
  'artifacts',
  // Marketplace defaults to the stablyai/orca-plugins catalog.
  'plugins'
]

/** Development and first-run scaffolding a shipped product has no use for. */
const NOT_SHIPPED = ['setup-guide', 'experimental', 'dev']

/** Capabilities outside what OxeeUI ships: agents, git, and the terminal. */
const OUT_OF_SCOPE = [
  'mobile',
  'mobile-emulator',
  'computer-use',
  'browser',
  'voice',
  'linear',
  'servers'
]

export const HIDDEN_SETTINGS_SECTIONS: readonly string[] = [
  ...UPSTREAM_SERVICES,
  ...NOT_SHIPPED,
  ...OUT_OF_SCOPE
]

const HIDDEN = new Set(HIDDEN_SETTINGS_SECTIONS)

export function isBrandSettingsSectionHidden(id: string): boolean {
  return HIDDEN.has(id)
}
