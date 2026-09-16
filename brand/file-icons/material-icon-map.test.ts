import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildFileIconMap, serializeFileIconMap } from '../scripts/generate-file-icon-map.mjs'

const require = createRequire(import.meta.url)
const MAP_PATH = resolve('brand/file-icons/material-icon-map.json')

describe('material-icon-map.json', () => {
  // Why: the map is generated from the installed material-icon-theme. Bumping
  // the package without re-running the generator would leave new file types on
  // the generic icon and renamed icons pointing at SVGs that no longer exist.
  it('matches what the installed material-icon-theme generates', () => {
    const committed = readFileSync(MAP_PATH, 'utf8')
    expect(committed).toBe(serializeFileIconMap(buildFileIconMap()))
  })

  it('points only at SVGs the package actually ships', () => {
    const map = JSON.parse(readFileSync(MAP_PATH, 'utf8')) as { icons: string[] }
    const iconsDir = resolve(require.resolve('material-icon-theme/package.json'), '..', 'icons')
    const missing = map.icons.filter((icon) => !existsSync(resolve(iconsDir, `${icon}.svg`)))
    expect(missing).toEqual([])
  })

  it('pins the same material-icon-theme version the map was built from', () => {
    const map = JSON.parse(readFileSync(MAP_PATH, 'utf8')) as { version: string }
    const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
      devDependencies: Record<string, string>
    }
    expect(pkg.devDependencies['material-icon-theme']).toBe(map.version)
  })
})
