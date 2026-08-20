#!/usr/bin/env node
/**
 * Rasterizes the brand icons into the PNGs the packager and the dev build need.
 *
 * Why Chromium rather than an image library: the mark is drawn with a gradient,
 * a clipped gloss layer, and a stroked outline, and a browser is the renderer
 * whose output actually matches what ships in the app. Playwright is already a
 * dev dependency for the e2e suite, so this adds nothing to the tree.
 *
 * Only 1024px PNGs are produced. electron-builder derives .icns and .ico from
 * them at package time, which avoids hand-rolling either container format.
 *
 * Usage: node brand/scripts/rasterize-marks.mjs
 */

import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const SIZE = 1024
// icon-dev is what `pnpm dev` actually shows: app-icon.ts resolves the `classic`
// icon to icon-dev.png whenever is.dev, so leaving it out ships an unbranded dock.
const MARKS = ['icon', 'icon-dev']

// Why the explicit channel: headless defaults to the separate chrome-headless-shell
// download, which `playwright install chromium` does not always place. The full
// build is the one the e2e suite already relies on.
const browser = await chromium.launch({ channel: 'chromium' })
try {
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } })
  for (const name of MARKS) {
    const svg = readFileSync(path.join(ROOT, 'brand', 'assets', `${name}.svg`), 'utf8')
    await page.setContent(
      `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${SIZE}px;height:${SIZE}px}</style>${svg}`
    )
    const shot = await page.locator('svg').screenshot({ omitBackground: true })
    const out = path.join(ROOT, 'brand', 'assets', 'generated', `${name}.png`)
    writeFileSync(out, shot)
    console.log(`wrote ${path.relative(ROOT, out)} (${(shot.length / 1024).toFixed(1)} KB)`)
  }
  console.log('Next: pnpm run brand:assets')
} finally {
  await browser.close()
}
