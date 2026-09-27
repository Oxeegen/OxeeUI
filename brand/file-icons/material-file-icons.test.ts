import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  BrandFolderIcon,
  getBrandFileIcon,
  isBrandFileIconsDisabled,
  loadBrandFileIconData
} from './material-file-icons'

// Why read file-type-icons.ts as text instead of importing it: brand/ is also
// type-checked by the node project, which does not own renderer files, so a brand
// test importing one breaks the project boundary. Same approach as
// brand/upstream-hooks.test.ts.
const FILE_TYPE_ICONS = readFileSync(resolve('src/renderer/src/lib/file-type-icons.ts'), 'utf8')

const savedVitest = process.env.VITEST

function restoreGate(): void {
  if (savedVitest === undefined) {
    delete process.env.VITEST
  } else {
    process.env.VITEST = savedVitest
  }
}

describe('file icons with the test gate on', () => {
  // Why this matters: upstream's own suites assert Lucide glyphs. If the gate
  // leaked, every one of them would fail on an <img> it never expected.
  it('keeps upstream mappings for files', () => {
    expect(isBrandFileIconsDisabled()).toBe(true)
    expect(getBrandFileIcon('index.ts')).toBeNull()
  })

  it('draws upstream Folder/FolderOpen', () => {
    const closed = renderToStaticMarkup(
      createElement(BrandFolderIcon, { name: 'src', expanded: false })
    )
    const open = renderToStaticMarkup(
      createElement(BrandFolderIcon, { name: 'src', expanded: true })
    )
    expect(closed).toContain('<svg')
    expect(open).toContain('<svg')
    expect(closed + open).not.toContain('<img')
  })
})

describe('getFileTypeIcon wiring', () => {
  it('asks the brand layer before any upstream mapping', () => {
    const brandCall = FILE_TYPE_ICONS.indexOf('getBrandFileIcon(filename)')
    const upstreamLookup = FILE_TYPE_ICONS.indexOf('FILE_ICON_BY_NAME[lowerName]')
    expect(brandCall).toBeGreaterThan(-1)
    expect(upstreamLookup).toBeGreaterThan(brandCall)
  })

  // Why: simulator tabs reuse file-tab chrome with a synthetic label; they are
  // not files and must keep upstream's phone glyph.
  it('keeps the synthetic simulator tab labels off the brand icons', () => {
    expect(FILE_TYPE_ICONS).toContain('isSyntheticTabLabel ? null : getBrandFileIcon(filename)')
  })
})

describe('file icons with the gate cleared', () => {
  beforeAll(async () => {
    delete process.env.VITEST
    await loadBrandFileIconData()
    restoreGate()
  })

  afterEach(restoreGate)

  it('renders a file as its Material icon', () => {
    delete process.env.VITEST
    const Icon = getBrandFileIcon('src/components/App.tsx')
    expect(Icon).not.toBeNull()
    const html = renderToStaticMarkup(createElement(Icon!, { className: 'size-3' }))
    expect(html).toContain('<img')
    expect(html).toContain('data-icon="react_ts"')
    expect(html).toContain('size-3')
  })

  // Why: callers render the returned value as a component type; a new function
  // per call would remount every icon in a tree on every render.
  it('returns one stable component per file name', () => {
    delete process.env.VITEST
    expect(getBrandFileIcon('a/b/Index.ts')).toBe(getBrandFileIcon('INDEX.TS'))
    expect(getBrandFileIcon('index.ts')).not.toBe(getBrandFileIcon('index.js'))
  })

  it('draws both theme variants only where a light icon exists', () => {
    delete process.env.VITEST
    const plain = renderToStaticMarkup(createElement(getBrandFileIcon('index.ts')!, {}))
    expect(plain.match(/<img/g)).toHaveLength(1)

    const withLight = renderToStaticMarkup(createElement(getBrandFileIcon('.browserslistrc')!, {}))
    expect(withLight.match(/<img/g)).toHaveLength(2)
    expect(withLight).toContain('oxee-file-icon--has-light')
    expect(withLight).toContain('oxee-file-icon--light')
    expect(withLight).toContain('data-icon="browserlist_light"')
  })

  it('draws named folders open and closed', () => {
    delete process.env.VITEST
    const closed = renderToStaticMarkup(
      createElement(BrandFolderIcon, { name: 'src', expanded: false })
    )
    const open = renderToStaticMarkup(
      createElement(BrandFolderIcon, { name: 'src', expanded: true })
    )
    expect(closed).toContain('data-icon="folder-src"')
    expect(open).toContain('data-icon="folder-src-open"')
  })

  it('points every image at a real emitted asset URL', () => {
    delete process.env.VITEST
    const html = renderToStaticMarkup(createElement(getBrandFileIcon('package.json')!, {}))
    const src = /src="([^"]+)"/.exec(html)?.[1]
    expect(src).toBeTruthy()
    expect(src).toMatch(/nodejs\.svg/)
  })
})
