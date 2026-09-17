import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import brand from './config/brand.config.json'

/**
 * The update feed must be this fork's releases, everywhere.
 *
 * Why a scan and not a hook marker: upstream introduced the updater's fallback
 * feed in two new files between two releases, both hardcoding its own repo, and
 * nothing flagged it — upstream-hooks.test.ts only watches places already hooked.
 * The effect was severe and silent: an up-to-date OxeeUI checked upstream's feed,
 * read its higher version as an update, and offered to install upstream over
 * itself. A literal like that arriving in any new file fails here.
 *
 * Read as text rather than imported: brand/ is type-checked by the node project,
 * and the updater modules pull in Electron.
 */
const ROOTS = ['src/main', 'src/shared', 'src/preload']
const UPSTREAM_REPO = `${'stablyai'}/${'orca'}`
const UPSTREAM_RELEASES = new RegExp(`${UPSTREAM_REPO.replace('/', '\\/')}\\/releases\\b`)

function isShippedSource(path: string): boolean {
  return (
    /\.(ts|tsx|mts|cts|js|mjs)$/.test(path) &&
    !/\.test\.|\.fixture\.|test-harness|__fixtures__|__mocks__/.test(path)
  )
}

function sourcesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      return sourcesUnder(path)
    }
    return isShippedSource(path) ? [path] : []
  })
}

const files = ROOTS.flatMap((root) => sourcesUnder(resolve(root)))

describe('update feed', () => {
  it('scans the shipped main, shared and preload sources', () => {
    // Positive control: an empty or mis-rooted scan would pass everything below.
    expect(files.length).toBeGreaterThan(500)
    expect(files.some((file) => file.endsWith('updater-release-feed.ts'))).toBe(true)
  })

  it("matches upstream's release URL when it is present", () => {
    // Positive control for the pattern itself.
    expect(
      UPSTREAM_RELEASES.test(`https://github.com/${UPSTREAM_REPO}/releases/latest/download`)
    ).toBe(true)
    expect(UPSTREAM_RELEASES.test(`https://github.com/${UPSTREAM_REPO}-hourly/releases`)).toBe(
      false
    )
  })

  it("never points shipped code at upstream's releases", () => {
    const offenders = files
      .filter((file) => UPSTREAM_RELEASES.test(readFileSync(file, 'utf8')))
      .map((file) => relative(resolve('.'), file))
    expect(offenders).toEqual([])
  })

  it('derives the fallback feed from the brand publish target', () => {
    const channel = readFileSync(resolve('src/shared/release-channel.ts'), 'utf8')
    expect(channel).toContain(
      `export const MAIN_RELEASE_REPO = '${brand.publish.owner}/${brand.publish.repo}'`
    )
    expect(channel).toContain(
      'export const LATEST_RELEASE_DOWNLOAD_URL = `https://github.com/${MAIN_RELEASE_REPO}/releases/latest/download`'
    )
    for (const file of [
      'src/main/updater/updater-release-feed.ts',
      'src/main/updater/updater-setup.ts'
    ]) {
      const source = readFileSync(resolve(file), 'utf8')
      expect(source, file).toContain('LATEST_RELEASE_DOWNLOAD_URL')
      // Why the import location matters: upstream's updater tests mock the
      // updater modules, and an export pulled from a mocked module is undefined.
      expect(source, file).toMatch(/from '\.\.\/\.\.\/shared\/release-channel'/)
    }
  })
})
