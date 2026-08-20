#!/usr/bin/env node
/**
 * Rasterizes brand/assets/icon.svg into the PNG the packager needs.
 *
 * Why Chromium rather than an image library: the mark is drawn with a gradient,
 * a clipped gloss layer, and a stroked outline, and a browser is the renderer
 * whose output actually matches what ships in the app. Playwright is already a
 * dev dependency for the e2e suite, so this adds nothing to the tree.
 *
 * Only a 1024px PNG is produced. electron-builder derives .icns and .ico from it
 * at package time, which avoids hand-rolling either container format.
 *
 * Usage: node brand/scripts/rasterize-marks.mjs
 */

import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const SOURCE = path.join(ROOT, 'brand', 'assets', 'icon.svg')
const OUT = path.join(ROOT, 'brand', 'assets', 'generated', 'icon.png')
const SIZE = 1024

const svg = readFileSync(SOURCE, 'utf8')

// Why the explicit channel: headless defaults to the separate chrome-headless-shell
// download, which `playwright install chromium` does not always place. The full
// build is the one the e2e suite already relies on.
const browser = await chromium.launch({ channel: 'chromium' })
try {
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } })
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${SIZE}px;height:${SIZE}px}</style>${svg}`
  )
  const shot = await page.locator('svg').screenshot({ omitBackground: true })
  writeFileSync(OUT, shot)
  console.log(
    `wrote ${path.relative(ROOT, OUT)} (${SIZE}×${SIZE}, ${(shot.length / 1024).toFixed(1)} KB)`
  )
  console.log('Next: pnpm run brand:assets')
} finally {
  await browser.close()
}
