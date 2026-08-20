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
 * The icon PNG comes from brand/scripts/rasterize-marks.mjs; run that first when
 * the mark changes. It is optional here so a checkout without it still applies
 * the logo and falls back to the upstream icon.
 *
 * Usage: node brand/scripts/apply-brand-assets.mjs [--check]
 */

import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')

/** [source under brand/, destination under the repo root, required?] */
const ASSET_MAP = [
  // Why the mono file: .titlebar-logo inverts the mark in light mode, so the
  // source has to be flat white — a colored logo would invert to its negative.
  ['assets/logo-mono.svg', 'resources/logo.svg', true],
  // electron-builder derives .icns and .ico from this PNG at package time, so
  // neither container format has to be produced or committed here.
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
