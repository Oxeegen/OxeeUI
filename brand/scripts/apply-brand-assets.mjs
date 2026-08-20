#!/usr/bin/env node
/**
 * Copies brand assets over the upstream files that import them by fixed path.
 *
 * Why a copy step instead of a bundler alias: `resources/logo.svg` is imported
 * from five upstream modules by relative path, and the app icons are read off
 * disk by electron-builder rather than through the bundler at all. Overwriting
 * the upstream files keeps every one of those call sites untouched, while
 * brand/assets stays the source of truth.
 *
 * The overwritten files are tracked upstream, so `git merge upstream/main` can
 * conflict on them. Resolve with `git checkout --ours` and re-run this script.
 *
 * Raster icons are optional: SVG is the committed source, and the .icns/.ico/.png
 * derivatives need a rasterizer that is not a repo dependency. Generate them into
 * brand/assets/generated/ (see brand/README.md) and this script picks them up.
 *
 * Usage: node brand/scripts/apply-brand-assets.mjs [--check]
 */

import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')

/** [source under brand/, destination under the repo root, required?] */
const ASSET_MAP = [
  ['assets/logo.svg', 'resources/logo.svg', true],
  ['assets/generated/icon.icns', 'resources/build/icon.icns', false],
  ['assets/generated/icon.ico', 'resources/build/icon.ico', false],
  ['assets/generated/icon.png', 'resources/build/icon.png', false],
  ['assets/generated/icon.png', 'resources/icon.png', false]
]

const checkOnly = process.argv.includes('--check')
const applied = []
const skipped = []
const stale = []

for (const [relativeSource, relativeDestination, required] of ASSET_MAP) {
  const source = path.join(ROOT, 'brand', relativeSource)
  const destination = path.join(ROOT, relativeDestination)

  if (!existsSync(source)) {
    if (required) {
      console.error(`Missing required brand asset: brand/${relativeSource}`)
      process.exit(1)
    }
    skipped.push(relativeDestination)
    continue
  }

  const upToDate = existsSync(destination) && readFileSync(source).equals(readFileSync(destination))
  if (upToDate) {
    continue
  }

  if (checkOnly) {
    stale.push(relativeDestination)
    continue
  }

  copyFileSync(source, destination)
  applied.push(relativeDestination)
}

if (checkOnly) {
  if (stale.length > 0) {
    console.error(
      `Brand assets are out of date:\n  ${stale.join('\n  ')}\nRun: pnpm run brand:assets`
    )
    process.exit(1)
  }
  console.log('Brand assets are up to date.')
} else {
  console.log(
    applied.length > 0
      ? `Applied brand assets:\n  ${applied.join('\n  ')}`
      : 'Brand assets already applied.'
  )
}

if (skipped.length > 0) {
  console.log(
    `Not generated yet (upstream icon kept):\n  ${skipped.join('\n  ')}\nSee brand/README.md to produce them.`
  )
}
