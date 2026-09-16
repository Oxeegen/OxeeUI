#!/usr/bin/env node
/**
 * Builds brand/file-icons/material-icon-map.json from material-icon-theme.
 *
 * Why a generated, committed map instead of calling generateManifest() in the
 * renderer: the manifest is ~357 KB of JSON and generating it pulls the theme's
 * build tooling into the bundle. This emits only what lookup needs, interned —
 * each icon file name stored once, every mapping an index into that list — and
 * folds the 4,654 expanded-folder entries into a per-icon table, because the
 * open variant of a folder depends only on its closed icon, never on its name.
 * The generator asserts that instead of assuming it.
 *
 * brand/file-icons/material-icon-map.test.ts fails when the committed map no
 * longer matches the installed package, so bumping material-icon-theme without
 * re-running this is caught.
 *
 * Usage: node brand/scripts/generate-file-icon-map.mjs [--check]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(import.meta.dirname, '..', '..')
const OUT = path.join(ROOT, 'brand', 'file-icons', 'material-icon-map.json')

export function buildFileIconMap() {
  const { generateManifest } = require('material-icon-theme')
  const { version } = require('material-icon-theme/package.json')
  const manifest = generateManifest()

  const svgFileOf = (iconId) => {
    const def = manifest.iconDefinitions[iconId]
    if (!def) {
      throw new Error(`manifest references undefined icon "${iconId}"`)
    }
    return path.posix.basename(def.iconPath, '.svg')
  }

  const icons = []
  const indexOf = new Map()
  const intern = (iconId) => {
    const svg = svgFileOf(iconId)
    let index = indexOf.get(svg)
    if (index === undefined) {
      index = icons.length
      icons.push(svg)
      indexOf.set(svg, index)
    }
    return index
  }

  const internTable = (table = {}) =>
    Object.fromEntries(
      Object.entries(table)
        .map(([key, iconId]) => [key.toLowerCase(), intern(iconId)])
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    )

  // Why a per-icon table: every folder name's open icon must be a function of
  // its closed icon, or collapsing 4,654 entries would silently lose some.
  const openByClosed = (closedTable, openTable) => {
    const result = {}
    for (const [name, closedId] of Object.entries(closedTable ?? {})) {
      const openId = openTable?.[name]
      if (!openId) {
        continue
      }
      const closed = intern(closedId)
      const open = intern(openId)
      if (result[closed] !== undefined && result[closed] !== open) {
        throw new Error(`folder icon "${closedId}" opens to more than one icon`)
      }
      result[closed] = open
    }
    return result
  }

  const light = manifest.light ?? {}
  const map = {
    source: 'material-icon-theme',
    version,
    defaults: {
      file: intern(manifest.file),
      folder: intern(manifest.folder),
      folderExpanded: intern(manifest.folderExpanded)
    },
    fileNames: internTable(manifest.fileNames),
    fileExtensions: internTable(manifest.fileExtensions),
    folderNames: internTable(manifest.folderNames),
    folderOpenByIcon: openByClosed(manifest.folderNames, manifest.folderNamesExpanded),
    light: {
      fileNames: internTable(light.fileNames),
      fileExtensions: internTable(light.fileExtensions),
      folderNames: internTable(light.folderNames),
      folderOpenByIcon: openByClosed(light.folderNames, light.folderNamesExpanded)
    },
    icons
  }
  // The default folder pair goes through the same table as named folders.
  map.folderOpenByIcon[map.defaults.folder] = map.defaults.folderExpanded
  return map
}

export function serializeFileIconMap(map) {
  return `${JSON.stringify(map)}\n`
}

if (
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` ||
  import.meta.filename === process.argv[1]
) {
  const next = serializeFileIconMap(buildFileIconMap())
  if (process.argv.includes('--check')) {
    const current = readFileSync(OUT, 'utf8')
    if (current !== next) {
      console.error(
        'material-icon-map.json is stale. Run: node brand/scripts/generate-file-icon-map.mjs'
      )
      process.exit(1)
    }
    console.log('material-icon-map.json is up to date.')
  } else {
    writeFileSync(OUT, next)
    const map = JSON.parse(next)
    console.log(
      `Wrote ${path.relative(ROOT, OUT)}: ${map.icons.length} icons, ` +
        `${Object.keys(map.fileNames).length} file names, ` +
        `${Object.keys(map.fileExtensions).length} extensions, ` +
        `${Object.keys(map.folderNames).length} folder names, ` +
        `${Math.round(next.length / 1024)} KB`
    )
  }
}
