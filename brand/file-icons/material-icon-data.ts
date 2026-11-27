/// <reference types="vite/client" />
// Why the explicit reference: brand/ is also type-checked by the node project,
// which does not load Vite's client types that declare import.meta.glob.
import map from './material-icon-map.json'
import type { MaterialIconMap } from './resolve'

/**
 * The heavy half of the file icons: the lookup map and every SVG's URL.
 *
 * Why this module is only ever reached through `import()`: the map is 158 KB and
 * the URL table another ~1,200 entries, and the icon helper it serves is pulled
 * into the renderer's startup chunk by a dozen components. Loading it lazily
 * keeps both out of the code parsed on every launch; icons fall back to the
 * upstream glyph for the few milliseconds before it resolves.
 *
 * Why `no-inline`: without it Vite inlines every SVG under the 4 KB limit —
 * nearly all of them — as a base64 data URL inside this chunk. `no-inline`
 * emits each as its own asset file, so the chunk holds short URL strings and an
 * icon's bytes are only read when a row actually draws it.
 */
const svgUrls = import.meta.glob<string>('../../node_modules/material-icon-theme/icons/*.svg', {
  query: '?url&no-inline',
  import: 'default',
  eager: true
})

export const iconMap = map as MaterialIconMap

export const iconUrlByName: Record<string, string> = Object.fromEntries(
  Object.entries(svgUrls).map(([file, url]) => [
    file.slice(file.lastIndexOf('/') + 1, -'.svg'.length),
    url
  ])
)
