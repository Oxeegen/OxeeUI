import { createElement, Fragment, useSyncExternalStore, type ReactElement } from 'react'
import { File, Folder, FolderOpen, type LucideIcon } from 'lucide-react'
import {
  lastSegment,
  resolveFileIcon,
  resolveFolderIcon,
  type MaterialIconMap,
  type ResolvedIcon
} from './resolve'

/**
 * File and folder icons from Material Icon Theme — the set VS Code draws.
 *
 * Upstream renders monochrome Lucide glyphs tinted `text-muted-foreground`, so
 * every file in a tree reads as the same grey shape. This swaps in the colored,
 * per-type icons at the two places upstream picks them: `getFileTypeIcon` for
 * files, and the Folder/FolderOpen pair in the six file-tree rows.
 *
 * Why createElement and a `.ts` file rather than JSX: brand/ is included by both
 * config/tsconfig.node.json and config/tsconfig.web.json, and the node project —
 * which Vite resolves first for files here — sets no `jsx` option. JSX in brand/
 * therefore failed to compile under vitest and would fail the node typecheck.
 * Plain calls compile under either project without touching the shared configs.
 */

type IconData = { map: MaterialIconMap; urls: Record<string, string> }

let iconData: IconData | null = null
let loading = false
const listeners = new Set<() => void>()

/**
 * Whether upstream's glyphs are kept for this process.
 *
 * Why inert under vitest: upstream's suites assert which Lucide icon a file maps
 * to and render trees expecting SVG glyphs. It is the same trade the rename makes
 * in brand/i18n/rebrand.ts — hook where the product draws, and leave upstream's
 * tests asserting upstream's values. brand/file-icons/*.test.ts clear the flag.
 *
 * Read at call time so a test can clear it; typeof-guarded because the renderer
 * bundle runs without a `process` global.
 */
export function isBrandFileIconsDisabled(): boolean {
  return typeof process !== 'undefined' && Boolean(process.env?.VITEST)
}

function startLoading(): void {
  if (loading) {
    return
  }
  loading = true
  void import('./material-icon-data')
    .then((module) => {
      iconData = { map: module.iconMap, urls: module.iconUrlByName }
      // A listener may delete itself here (loadBrandFileIconData does); deleting
      // the current entry while iterating a Set is well-defined.
      for (const listener of listeners) {
        listener()
      }
    })
    .catch(() => {
      // Why swallow: a failed chunk load must not break the file tree. Rows keep
      // the upstream glyph they already render while data is null.
    })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  // Why gated: with upstream glyphs kept, upstream's tree tests would otherwise
  // pull the whole icon chunk in just by rendering a folder row.
  if (!isBrandFileIconsDisabled()) {
    startLoading()
  }
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): IconData | null {
  return iconData
}

function useIconData(): IconData | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** Test seam: resolves once the lazy map has loaded. */
export async function loadBrandFileIconData(): Promise<void> {
  startLoading()
  if (iconData) {
    return
  }
  await new Promise<void>((resolveLoaded) => {
    const done = (): void => {
      listeners.delete(done)
      resolveLoaded()
    }
    listeners.add(done)
  })
}

function joinClasses(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * The icon images, or null when the resolved icon has no emitted asset.
 *
 * A plain function, not a component: callers need the null *before* building an
 * element, since a component element is never null even when the component
 * renders nothing — and a null here must fall back to upstream's glyph.
 */
function renderIconImages(
  icon: ResolvedIcon,
  urls: Record<string, string>,
  className: string | undefined
): ReactElement | null {
  const darkUrl = urls[icon.dark]
  if (!darkUrl) {
    return null
  }
  const lightUrl = urls[icon.light]
  const hasLight = icon.light !== icon.dark && Boolean(lightUrl)
  const shared = { alt: '', 'aria-hidden': true, draggable: false, decoding: 'async' as const }

  // Why two images rather than one switched in JS: document-theme.ts flips a
  // `dark` class on the root, and brand-theme.css shows the right variant off
  // that class — no subscription, and no re-render when the theme changes.
  return createElement(
    Fragment,
    null,
    createElement('img', {
      ...shared,
      key: 'dark',
      src: darkUrl,
      'data-icon': icon.dark,
      className: joinClasses('oxee-file-icon', hasLight && 'oxee-file-icon--has-light', className)
    }),
    hasLight
      ? createElement('img', {
          ...shared,
          key: 'light',
          src: lightUrl,
          'data-icon': icon.light,
          className: joinClasses('oxee-file-icon', 'oxee-file-icon--light', className)
        })
      : null
  )
}

function MaterialFileIcon({
  fileName,
  className
}: {
  fileName: string
  className?: string
}): ReactElement {
  const data = useIconData()
  const images = data
    ? renderIconImages(resolveFileIcon(data.map, fileName), data.urls, className)
    : null
  return images ?? createElement(File, { className })
}

// Why cache one component per file name: getFileTypeIcon's callers render the
// returned value as a component type, so a fresh function on every call would
// remount the icon on every render. Bounded because a large search result set
// can name many thousands of files; evicting only costs that icon a remount.
const MAX_CACHED_FILE_ICONS = 4000
const fileIconComponents = new Map<string, LucideIcon>()

/**
 * The Material icon component for a file, or null to keep upstream's mapping.
 *
 * Typed as LucideIcon because that is getFileTypeIcon's contract. Every caller
 * passes only `className`, which is all this reads; Lucide-only props such as
 * `strokeWidth` would be ignored, which is correct for a raster-like icon.
 */
export function getBrandFileIcon(filePath: string): LucideIcon | null {
  if (isBrandFileIconsDisabled()) {
    return null
  }
  const key = lastSegment(filePath).toLowerCase()
  if (!key) {
    return null
  }
  const cached = fileIconComponents.get(key)
  if (cached) {
    return cached
  }
  const Icon = ({ className }: { className?: string }): ReactElement =>
    createElement(MaterialFileIcon, { fileName: key, className })
  Icon.displayName = `MaterialFileIcon(${key})`
  if (fileIconComponents.size >= MAX_CACHED_FILE_ICONS) {
    const oldest = fileIconComponents.keys().next().value
    if (oldest !== undefined) {
      fileIconComponents.delete(oldest)
    }
  }
  const component = Icon as unknown as LucideIcon
  fileIconComponents.set(key, component)
  return component
}

/**
 * A folder in a file tree. Falls back to upstream's Folder/FolderOpen under
 * vitest and for the moment before the icon map has loaded.
 */
export function BrandFolderIcon({
  name,
  expanded,
  className
}: {
  name: string
  expanded: boolean
  className?: string
}): ReactElement {
  const data = useIconData()
  const images =
    !isBrandFileIconsDisabled() && data
      ? renderIconImages(resolveFolderIcon(data.map, name, expanded), data.urls, className)
      : null
  return images ?? createElement(expanded ? FolderOpen : Folder, { className })
}
