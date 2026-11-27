import { describe, expect, it } from 'vitest'
import map from './material-icon-map.json'
import {
  extensionCandidates,
  resolveFileIcon,
  resolveFolderIcon,
  type MaterialIconMap
} from './resolve'

const iconMap = map as MaterialIconMap
const file = (name: string) => resolveFileIcon(iconMap, name)
const folder = (name: string, expanded = false) => resolveFolderIcon(iconMap, name, expanded)

describe('extensionCandidates', () => {
  it('lists compound extensions longest first', () => {
    expect(extensionCandidates('Button.test.tsx')).toEqual(['test.tsx', 'tsx'])
  })

  it('counts a dotfile leading segment as an extension', () => {
    expect(extensionCandidates('.env.local')).toEqual(['env.local', 'local'])
  })

  it('has nothing to offer a name without a dot, or ending in one', () => {
    expect(extensionCandidates('Makefile')).toEqual([])
    expect(extensionCandidates('draft.')).toEqual([])
  })
})

describe('resolveFileIcon', () => {
  it.each([
    ['package.json', 'nodejs'],
    ['Dockerfile', 'docker'],
    ['.gitignore', 'git'],
    ['index.ts', 'typescript'],
    ['App.tsx', 'react_ts'],
    ['README.md', 'readme']
  ])('matches VS Code for %s', (name, icon) => {
    expect(file(name).dark).toBe(icon)
  })

  it('prefers a compound extension over its suffix', () => {
    expect(file('types.d.ts').dark).toBe('typescript-def')
    expect(file('Row.spec.tsx').dark).toBe('test-jsx')
  })

  it('resolves .env through the env extension', () => {
    expect(file('.env').dark).toBe('tune')
  })

  it('is case-insensitive and ignores the directory part', () => {
    expect(file('C:\\repo\\PACKAGE.JSON').dark).toBe('nodejs')
    expect(file('src/deep/Index.TS').dark).toBe('typescript')
  })

  it('falls back to the generic file icon', () => {
    expect(file('something.unknownext')).toEqual({ dark: 'file', light: 'file' })
  })

  it('uses a light variant where the theme defines one', () => {
    expect(file('.browserslistrc')).toEqual({ dark: 'browserlist', light: 'browserlist_light' })
    expect(file('poster.ai')).toEqual({
      dark: 'adobe-illustrator',
      light: 'adobe-illustrator_light'
    })
  })

  // Why this case exists: the light tables are overrides merged over the base,
  // resolved in the normal order. A file NAME match must still beat a light
  // override on its EXTENSION — resolving the light tables on their own drew
  // TOML here instead of Babel.
  it('keeps a file-name icon in light mode even when its extension has a light override', () => {
    expect(file('.babel-plugin-macrosrc.toml')).toEqual({ dark: 'babel', light: 'babel' })
  })
})

describe('resolveFolderIcon', () => {
  it('uses the named folder icon and its open variant', () => {
    expect(folder('src').dark).toBe('folder-src')
    expect(folder('src', true).dark).toBe('folder-src-open')
    expect(folder('components').dark).toBe('folder-components')
  })

  it('falls back to the plain folder pair', () => {
    expect(folder('quarterly-reports')).toEqual({ dark: 'folder', light: 'folder' })
    expect(folder('quarterly-reports', true)).toEqual({ dark: 'folder-open', light: 'folder-open' })
  })

  // Why: source control compacts single-child chains into one row, and the icon
  // belongs to the leaf folder, not the first segment.
  it('resolves a compacted path by its last segment', () => {
    expect(folder('packages/app/src').dark).toBe('folder-src')
    expect(folder('src/', true).dark).toBe('folder-src-open')
  })

  it('uses light variants for both states where they exist', () => {
    expect(folder('.idea')).toEqual({ dark: 'folder-intellij', light: 'folder-intellij_light' })
    expect(folder('.idea', true)).toEqual({
      dark: 'folder-intellij-open',
      light: 'folder-intellij-open_light'
    })
  })
})
