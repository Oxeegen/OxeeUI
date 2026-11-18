import type { Plugin } from 'vite'
import brandConfig from '../config/brand.config.json'

/**
 * Rebrands the `<title>` of every HTML entry.
 *
 * Why this is not covered by the i18n post-processor: the window title comes
 * from `document.title`, which Electron reads straight out of the served HTML.
 * Nothing renders it through i18next, so the render-time swap never sees it —
 * and the symptom is the one place a user is guaranteed to look. A packaged
 * OxeeUI showed "Orca" in the Windows taskbar while every other surface was
 * branded correctly.
 *
 * Why a transform rather than editing the three HTML files: `index.html`,
 * `popout.html` and `web-index.html` all carry one, a fourth entry would arrive
 * unbranded, and upstream may append to any of these titles. The transform keeps
 * upstream's files untouched and covers whatever exists.
 *
 * Only the title element is rewritten, and only the two display spellings of the
 * upstream name, so nothing else in the document is at risk — lowercase `orca`
 * in a script path or a data attribute is left alone.
 */
const UPSTREAM = brandConfig.upstream.productName
const PRODUCT = brandConfig.productName

const PATTERNS: readonly RegExp[] = [
  new RegExp(`\\b${UPSTREAM}\\b`, 'g'),
  new RegExp(`\\b${UPSTREAM.toUpperCase()}\\b`, 'g')
]

/** Exported for the test: the swap applied inside a `<title>`. */
export function rebrandTitleText(value: string): string {
  if (PRODUCT === UPSTREAM) {
    return value
  }
  return PATTERNS.reduce((text, pattern) => text.replace(pattern, PRODUCT), value)
}

export function brandHtmlTitle(): Plugin {
  return {
    name: 'brand-html-title',
    transformIndexHtml: {
      // Why `pre`: run before framework plugins inject tags, so this only ever
      // sees the authored title rather than anything generated around it.
      order: 'pre',
      handler(html: string): string {
        return html.replace(
          /<title>([\s\S]*?)<\/title>/g,
          (_match, text: string) => `<title>${rebrandTitleText(text)}</title>`
        )
      }
    }
  }
}
