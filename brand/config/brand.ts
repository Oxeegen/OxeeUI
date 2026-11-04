import brandConfig from './brand.config.json'

/**
 * Single typed accessor for the fork's brand configuration.
 *
 * Source of truth: `brand/config/brand.config.json`.
 *
 * - TypeScript (main + renderer, bundled by electron-vite): `import { BRAND } from '@brand/config/brand'`.
 * - CommonJS (electron-builder config, plain node scripts): require the JSON
 *   directly — `require('../brand/config/brand.config.json')`.
 *
 * Keep this module free of runtime side effects so it stays importable from the
 * main process bootstrap, where it runs before `app.whenReady()`.
 */

export type BrandPublishConfig = {
  provider: 'github'
  owner: string
  repo: string
  releaseType: 'release' | 'prerelease'
}

export type BrandConfig = {
  /** Display name. Drives app.setName → userData dir + macOS Keychain item. */
  productName: string
  /** electron-builder appId + Windows AppUserModelID. */
  appId: string
  /** Lowercase slug used in packaged artifact filenames. */
  artifactSlug: string
  /** Windows/macOS executable name inside the bundle. */
  executableName: string
  /** Linux binary name. Kept distinct because GNOME ships an unrelated `orca`. */
  linuxExecutableName: string
  /** Must match the WM_CLASS Electron reports, or Linux docks fail to group windows. */
  startupWmClass: string
  /** Linux package maintainer field. */
  maintainer: string
  /** Package description: Windows file description, Linux package summary. */
  description: string
  /** Publishing entity. Feeds the Linux maintainer default and the copyright line. */
  author: string
  /** Product URL in package metadata and the Linux desktop entry. */
  homepage: string
  /** Legal copyright: macOS NSHumanReadableCopyright and the Windows resource. */
  copyright: string
  /** SPDX identifier for Linux package metadata. */
  license: string
  /** Upstream identity this fork rebrands away from. */
  upstream: {
    productName: string
    appId: string
  }
  /** Update feed. Points at the fork so a branded build never self-overwrites with upstream. */
  publish: BrandPublishConfig
}

export const BRAND: BrandConfig = brandConfig as BrandConfig

/** False when the fork has not actually renamed the product, so rebrand passes can no-op. */
export const IS_REBRANDED: boolean = BRAND.productName !== BRAND.upstream.productName
