/**
 * Material Icon Theme lookup, as VS Code resolves an icon theme.
 *
 * Pure functions over the generated map (brand/file-icons/material-icon-map.json)
 * so the resolution rules are unit-testable without a bundler or a DOM.
 */

type IconTables = {
  fileNames: Record<string, number>
  fileExtensions: Record<string, number>
  folderNames: Record<string, number>
  folderOpenByIcon: Record<string, number>
}

export type MaterialIconMap = IconTables & {
  source: string
  version: string
  defaults: { file: number; folder: number; folderExpanded: number }
  light: IconTables
  icons: string[]
}

/** The icon file names (no `.svg`) to draw: one per theme, identical when there is no light variant. */
export type ResolvedIcon = { dark: string; light: string }

export function lastSegment(value: string): string {
  const cut = Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\'))
  return cut >= 0 ? value.slice(cut + 1) : value
}

/**
 * Extension candidates, longest first — VS Code's order.
 *
 * `a.test.ts` tries `test.ts` then `ts`, so compound extensions win over their
 * suffix. A dotfile counts its leading segment: `.env.local` tries `env.local`
 * then `local`, which is how `.env` lands on the `env` extension entry.
 */
export function extensionCandidates(fileName: string): string[] {
  const lower = fileName.toLowerCase()
  const candidates: string[] = []
  let dot = lower.indexOf('.')
  while (dot !== -1 && dot < lower.length - 1) {
    candidates.push(lower.slice(dot + 1))
    dot = lower.indexOf('.', dot + 1)
  }
  return candidates
}

/**
 * Name first, then extensions longest-first; `overrides` wins at each step.
 *
 * Why step-wise rather than resolving the override tables on their own: VS Code
 * merges the light section over the base tables and then runs the normal order.
 * Resolving overrides separately would let a light *extension* override beat a
 * base *file-name* match — `tsconfig.json` would lose its name icon in light
 * mode to whatever `json` maps to.
 */
function fileIconIndex(
  base: IconTables,
  overrides: IconTables | null,
  lowerName: string
): number | undefined {
  const byName = overrides?.fileNames[lowerName] ?? base.fileNames[lowerName]
  if (byName !== undefined) {
    return byName
  }
  for (const extension of extensionCandidates(lowerName)) {
    const byExtension = overrides?.fileExtensions[extension] ?? base.fileExtensions[extension]
    if (byExtension !== undefined) {
      return byExtension
    }
  }
  return undefined
}

export function resolveFileIcon(map: MaterialIconMap, filePath: string): ResolvedIcon {
  const lowerName = lastSegment(filePath).toLowerCase()
  const dark = fileIconIndex(map, null, lowerName) ?? map.defaults.file
  const light = fileIconIndex(map, map.light, lowerName) ?? map.defaults.file
  return { dark: map.icons[dark], light: map.icons[light] }
}

export function resolveFolderIcon(
  map: MaterialIconMap,
  folderPath: string,
  expanded: boolean
): ResolvedIcon {
  // Why the last segment: source control compacts single-child chains into one
  // row named like `src/components`, and the icon belongs to the leaf.
  const lowerName = lastSegment(folderPath.replace(/[\\/]+$/, '')).toLowerCase()
  const closed = map.folderNames[lowerName] ?? map.defaults.folder
  const closedLight = map.light.folderNames[lowerName] ?? closed

  const open = (tables: IconTables, index: number): number =>
    tables.folderOpenByIcon[index] ?? map.folderOpenByIcon[index] ?? map.defaults.folderExpanded

  const dark = expanded ? open(map, closed) : closed
  const light = expanded ? open(map.light, closedLight) : closedLight
  return { dark: map.icons[dark], light: map.icons[light] }
}
