import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import brand from './config/brand.config.json'

const require = createRequire(import.meta.url)

const APPIMAGE_CONTRACT =
  'config/scripts/desktop-distribution/appimage/static-appimage-package-contract.cjs'
const DEV_BUNDLE_IDENTITY =
  'config/scripts/development/electron-bundle-cache/dev-electron-bundle-identity.mjs'

/**
 * Plain-node hooks find brand.config.json by a path relative to their own folder.
 *
 * upstream-hooks.test.ts only checks their text, so when v1.4.255 moved these
 * scripts two folders deeper, both still passed it while pointing at a file that
 * did not exist: the AppImage contract would have failed the Linux release build
 * at its last step, and the dev runner would not start. Loading them catches that.
 */
describe('plain-node brand hooks', () => {
  it('loads the AppImage contract, which reads the brand slug', () => {
    const contract: { verifyStaticAppImagePackage?: unknown } = require(resolve(APPIMAGE_CONTRACT))
    expect(typeof contract.verifyStaticAppImagePackage).toBe('function')
  })

  it('loads the dev bundle identity from the brand config', async () => {
    const identity: { BRAND_PRODUCT_NAME?: string; DEV_BUNDLE_ID?: string } = await import(
      pathToFileURL(resolve(DEV_BUNDLE_IDENTITY)).href
    )
    expect(identity.BRAND_PRODUCT_NAME).toBe(brand.productName)
    expect(identity.DEV_BUNDLE_ID).toBe(`${brand.appId}.dev`)
  })
})
