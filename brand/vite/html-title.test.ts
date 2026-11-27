import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { BRAND } from '@brand/config/brand'
import { brandHtmlTitle, rebrandTitleText } from './html-title'

const UPSTREAM = BRAND.upstream.productName

/** The HTML entries that actually ship a title today. */
const HTML_ENTRIES = [
  'src/renderer/index.html',
  'src/renderer/popout.html',
  'src/renderer/web-index.html'
]

function runTransform(html: string): string {
  const plugin = brandHtmlTitle()
  const hook = plugin.transformIndexHtml
  if (typeof hook !== 'object' || typeof hook.handler !== 'function') {
    throw new Error('expected an object-form transformIndexHtml hook')
  }
  return hook.handler.call(null as never, html, null as never) as string
}

describe('brandHtmlTitle', () => {
  it('rebrands the title of every HTML entry that ships one', () => {
    for (const entry of HTML_ENTRIES) {
      const html = readFileSync(resolve(entry), 'utf8')
      const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1]
      expect(title, entry).toBeDefined()

      const transformed = /<title>([\s\S]*?)<\/title>/.exec(runTransform(html))?.[1]
      expect(transformed, entry).toContain(BRAND.productName)
      expect(transformed, entry).not.toContain(UPSTREAM)
    }
  })

  it('keeps any suffix upstream puts around the name', () => {
    expect(rebrandTitleText(`${UPSTREAM} Agent Dashboard`)).toBe(
      `${BRAND.productName} Agent Dashboard`
    )
  })

  // Why: the document is full of lowercase `orca` in asset paths and module
  // specifiers, and rewriting one would break the page rather than rename it.
  it('leaves everything outside the title element alone', () => {
    const html = `<head><title>${UPSTREAM}</title></head><body><script src="/orca-main.js"></script></body>`
    const out = runTransform(html)
    expect(out).toContain(`<title>${BRAND.productName}</title>`)
    expect(out).toContain('/orca-main.js')
  })

  it('leaves a document without a title untouched', () => {
    const html = '<head><meta charset="utf-8" /></head>'
    expect(runTransform(html)).toBe(html)
  })
})
