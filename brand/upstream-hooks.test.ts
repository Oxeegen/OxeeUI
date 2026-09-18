import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every place an upstream file reaches into `brand/`.
 *
 * A merge from upstream can drop one of these two ways: by conflicting on the
 * hook line, which is visible, or by rewriting the surrounding block so the hook
 * disappears in a resolution nobody reread. The second is silent, and the symptom
 * is subtle — the app boots, but under upstream's name, or with the hidden
 * Settings sections back, or with the updater pointed at upstream's releases.
 *
 * Each entry is one marker that must survive. Keep this list in step with the
 * table in brand/README.md.
 */
const HOOKS: [file: string, markers: string[]][] = [
  ['electron.vite.config.ts', ["'@brand': resolve('brand')"]],
  ['vite.web.config.ts', ["'@brand': resolve('brand')"]],
  ['config/vitest.config.ts', ["'@brand': resolve('brand')", "'brand/**/*.test.ts'"]],
  ['tsconfig.json', ['"@brand/*"']],
  ['config/tsconfig.node.json', ['"@brand/*"', '"../brand/**/*"']],
  ['config/tsconfig.web.json', ['"@brand/*"', '"../brand/**/*"']],
  ['config/tsconfig.tc.web.json', ['"@brand/*"', '"../brand/**/*"']],
  ['src/main/startup/dev-instance-identity.ts', ['BRAND.productName', 'BRAND.appId']],
  ['src/renderer/src/i18n/i18n.ts', ['brandNamePostProcessor', 'BRAND_POST_PROCESS']],
  ['src/main/i18n/main-i18n.ts', ['brandNamePostProcessor', 'BRAND_POST_PROCESS']],
  ['src/renderer/src/assets/main.css', ['brand/assets/brand-theme.css']],
  // Not the @brand alias: shared code compiles without a bundler. See release-repo.test.ts.
  [
    'src/shared/release-channel.ts',
    ['MAIN_RELEASE_REPO', 'LATEST_RELEASE_DOWNLOAD_URL', 'MAIN_RELEASE_TAG_PREFIX']
  ],
  // Tag discovery. Losing the prefix is silent and total: every release this
  // product publishes stops looking like a version, the inherited upstream tags
  // in this repo win instead, and every update check ends in "not ready".
  // src/main/updater-prerelease-feed-brand-tags.test.ts is the regression test.
  ['src/main/updater-prerelease-feed.ts', ['MAIN_RELEASE_REPO', 'MAIN_RELEASE_TAG_PREFIX']],
  ['src/renderer/src/hooks/useSettingsNavigationMetadata.ts', ['isBrandSettingsSectionHidden']],
  // Keeps the packaged and dev profiles out of upstream's %APPDATA%/orca, so an
  // installed Orca and an installed OxeeUI do not share one settings store and
  // one daemon endpoint. Losing this hook is silent: the app still boots, just
  // into the other product's profile.
  ['src/main/startup/configure-process.ts', ['BRAND.artifactSlug']],
  // Plain-node dev path: these run outside the bundler, so they read the brand
  // JSON rather than resolving the @brand alias.
  ['config/scripts/dev-electron-bundle-identity.mjs', ['brand.config.json', 'brand.productName']],
  ['config/scripts/run-electron-vite-dev.mjs', ['BRAND_PRODUCT_NAME']],
  // Accepts the branded AppImage filename. Losing this fails the Linux release
  // build outright, at the very last step, after everything has compiled.
  ['config/scripts/static-appimage-package-contract.cjs', ['brand.artifactSlug']],
  // The window title, which is what the OS taskbar and window switcher show.
  // It never passes through i18next, so the render-time swap cannot reach it.
  ['electron.vite.config.ts', ['brandHtmlTitle']],
  ['vite.web.config.ts', ['brandHtmlTitle']],
  ['src/main/window/createMainWindow.ts', ['BRAND.productName']],
  ['src/main/window/dashboard-popout-window.ts', ['BRAND.productName']],
  ['src/main/window/main-window-close-lifecycle.ts', ['BRAND.productName']],
  // The appearance layer a fresh profile starts with. Relative import, not the
  // @brand alias: shared code is compiled by plain tsc for the packaged CLI.
  ['src/shared/constants.ts', ['./brand-default-settings']],
  // Material Icon Theme icons. Files resolve in the one shared helper; folders
  // are drawn per tree, so each tree row carries its own hook. Losing one is
  // silent — that tree just goes back to grey glyphs.
  ['src/renderer/src/lib/file-type-icons.ts', ['getBrandFileIcon']],
  ['src/renderer/src/components/right-sidebar/FileExplorerRow.tsx', ['BrandFolderIcon']],
  [
    'src/renderer/src/components/right-sidebar/file-explorer-inline-input-row.tsx',
    ['BrandFolderIcon']
  ],
  [
    'src/renderer/src/components/right-sidebar/source-control/listing/tree-directory-rows.tsx',
    ['BrandFolderIcon']
  ],
  [
    'src/renderer/src/components/editor/combined-diff/browse-files/combined-diff-file-tree-row.tsx',
    ['BrandFolderIcon']
  ],
  ['src/renderer/src/components/editor/ConflictReviewFileTree.tsx', ['BrandFolderIcon']],
  ['src/renderer/src/components/sidebar/RemoteFileBrowserEntryList.tsx', ['BrandFolderIcon']],
  // The updater's fallback feed. brand/updater-feed.test.ts also fails on any
  // upstream release URL anywhere in shipped code, which catches new call sites.
  ['src/main/updater/updater-release-feed.ts', ['LATEST_RELEASE_DOWNLOAD_URL']],
  ['src/main/updater/updater-setup.ts', ['LATEST_RELEASE_DOWNLOAD_URL']],
  // App icon: OxeeUI offers only its own mark. Losing the load hook lets a
  // profile carried over from upstream keep upstream's artwork as the app icon.
  [
    'src/main/persistence/loading-store/normalize-loaded-global-settings.ts',
    ['resolveBrandAppIconId']
  ],
  ['src/renderer/src/components/settings/AppearancePane.tsx', ['IS_APP_ICON_CHOICE_OFFERED']],
  ['src/renderer/src/components/settings/appearance-search.ts', ['IS_APP_ICON_CHOICE_OFFERED']]
]

describe('upstream hooks', () => {
  it.each(HOOKS)('%s still reaches into brand/', (file, markers) => {
    const source = readFileSync(resolve(file), 'utf8')
    const missing = markers.filter((marker) => !source.includes(marker))
    expect(missing).toEqual([])
  })

  it('covers every hook the README documents', () => {
    const readme = readFileSync(resolve('brand/README.md'), 'utf8')
    const documented = HOOKS.map(([file]) => file).filter((file) => !readme.includes(file))
    expect(documented).toEqual([])
  })
})

describe('packaging', () => {
  // Why: Orca is MIT and the notice has to travel with the product. The files
  // list is exclusion-based, so LICENSE ships unless something excludes it —
  // this fails if a merge ever adds that exclusion.
  it('keeps LICENSE in the packaged app', () => {
    const config = readFileSync(resolve('config/electron-builder.config.cjs'), 'utf8')
    const filesBlock = config.slice(config.indexOf('files: ['), config.indexOf('asarUnpack'))
    expect(filesBlock).not.toMatch(/!.*LICENSE/)
  })

  it('credits both this fork and upstream in the copyright', () => {
    const brand = JSON.parse(readFileSync(resolve('brand/config/brand.config.json'), 'utf8'))
    expect(brand.copyright).toContain(brand.author)
    expect(brand.copyright).toContain('Lovecast')
    expect(brand.copyright).toContain('MIT')
  })
})
