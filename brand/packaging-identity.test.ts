import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import brand from './config/brand.config.json'

const require = createRequire(import.meta.url)

type BuilderConfig = {
  appId: string
  productName: string
  extraMetadata: { name?: string }
  nsis?: { oneClick?: boolean; perMachine?: boolean }
}

const config = require(resolve('config/electron-builder.brand.cjs')) as BuilderConfig
const sourceName = (JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { name: string })
  .name

/**
 * What the packaged app is called on disk, as opposed to on screen.
 *
 * electron-builder names the per-user Windows install folder and the update
 * download cache after the packaged manifest `name`. Left at the source
 * package.json's `orca`, installing OxeeUI overwrote an installed upstream app in
 * %LOCALAPPDATA%\Programs\orca — which is how it happened in practice.
 */
describe('packaging identity', () => {
  it('packages under the brand slug, not the source package name', () => {
    expect(config.extraMetadata.name).toBe(brand.artifactSlug)
    expect(config.extraMetadata.name).not.toBe(sourceName)
  })

  // Why: the folder follows the manifest name only for the per-user one-click
  // installer. The assisted or per-machine installer uses productName instead,
  // so switching installer type is a reason to re-check coexistence, not a
  // silent change.
  it('uses the per-user one-click installer the folder name depends on', () => {
    expect(config.nsis?.oneClick).not.toBe(false)
    expect(config.nsis?.perMachine).not.toBe(true)
  })

  // Why: the installer reuses the install location stored under a GUID derived
  // from appId. Keeping appId stable is what lets existing installs update in
  // place instead of landing in a second folder.
  it('keeps the appId that existing installs are registered under', () => {
    expect(config.appId).toBe(brand.appId)
    expect(config.productName).toBe(brand.productName)
  })
})
