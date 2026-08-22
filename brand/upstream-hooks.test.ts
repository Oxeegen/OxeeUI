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
  ['src/shared/release-channel.ts', ['BRAND.publish.owner']],
  ['src/main/updater-prerelease-feed.ts', ['MAIN_RELEASE_REPO']],
  ['src/renderer/src/hooks/useSettingsNavigationMetadata.ts', ['isBrandSettingsSectionHidden']]
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
