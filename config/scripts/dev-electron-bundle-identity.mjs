import { readFileSync } from 'node:fs'
import path from 'node:path'

// Keep all signed Info.plist values branch-invariant: ad-hoc cdhash is the Keychain ACL identity, so branch drift re-prompts for passwords.
// Branch Dock names belong in the unsigned .app directory name.

// Why read the JSON directly rather than through the `@brand` alias: this module is
// plain node, loaded by the dev runner outside any bundler, so the alias does not
// resolve. The values stay constant per checkout, which is what the invariant above
// actually requires.
const brand = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, '..', '..', 'brand', 'config', 'brand.config.json'),
    'utf8'
  )
)

/**
 * The product name the dev runner labels windows and the Dock with.
 *
 * Exported from here so the one brand-config read in the plain-node dev path
 * serves every consumer, rather than each script resolving the JSON itself.
 */
export const BRAND_PRODUCT_NAME = brand.productName

export const DEV_BUNDLE_ID = `${brand.appId}.dev`
export const DEV_HELPER_BUNDLE_ID = `${DEV_BUNDLE_ID}.helper`
// Fixed display name distinguishes dev notifications from other Electron apps without branch-specific signature drift.
// Brand-derived so it stays in step with app.setName(), which dev sets to
// `<productName> Dev`; the sibling contract test asserts exactly that pairing.
export const DEV_BUNDLE_DISPLAY_NAME = `${brand.productName} Dev`

/** Info.plist patches for the app bundle. Values must not vary per branch — see above. */
export function getDevBundlePlistPatches() {
  return [
    { key: 'CFBundleIdentifier', value: DEV_BUNDLE_ID },
    { key: 'CFBundleName', value: DEV_BUNDLE_DISPLAY_NAME },
    { key: 'CFBundleDisplayName', value: DEV_BUNDLE_DISPLAY_NAME }
  ]
}

/** Info.plist patches for the embedded Electron Helper bundle. */
export function getDevHelperPlistPatches() {
  return [{ key: 'CFBundleIdentifier', value: DEV_HELPER_BUNDLE_ID }]
}
