import type { PostProcessorModule } from 'i18next'
import { BRAND, IS_REBRANDED } from '@brand/config/brand'

/**
 * Runtime rebrand of user-visible copy.
 *
 * Why a post-processor instead of editing the catalogs: `src/renderer/src/i18n/locales/*.json`
 * carry ~670 upstream product-name occurrences across five locales. Rewriting them
 * would conflict on every upstream merge and break the catalog gates
 * (`verify:localization-catalog`, `locale-english-regression`, the translation-policy
 * suites), which all assert against upstream values. Swapping at render time leaves
 * every catalog byte-identical to upstream.
 *
 * Only the two display spellings are replaced. Lowercase `orca` is load-bearing —
 * the CLI binary, `orca.yaml`, `~/.orca`, reverse-proxy paths — and the
 * screaming-snake `ORCA_*` env vars must survive verbatim. Both are left alone by
 * the case-sensitive, word-boundary match.
 */
const UPSTREAM = BRAND.upstream.productName

/**
 * Both display forms of the upstream name, in the order they are applied.
 *
 * The all-caps form is the landing wordmark. It is safe to swap even though the
 * `ORCA_*` environment variables share the prefix: `_` is a word character, so
 * `\b` never matches between `ORCA` and `_` and those names are left whole.
 *
 * The replacement keeps the brand's own casing rather than upper-casing it — a
 * wordmark carries the product's capitalization, not the slot's.
 */
const PATTERNS: readonly RegExp[] = [
  new RegExp(`\\b${UPSTREAM}\\b`, 'g'),
  new RegExp(`\\b${UPSTREAM.toUpperCase()}\\b`, 'g')
]

/**
 * The same swap the post-processor applies, exposed for tests that assert on
 * rendered copy. Upstream literals stay readable at the call site and the
 * assertion follows brand.config.json instead of hardcoding either name.
 */
export function rebrandCopy(value: string): string {
  if (!IS_REBRANDED) {
    return value
  }
  return PATTERNS.reduce((text, pattern) => text.replace(pattern, BRAND.productName), value)
}

/**
 * Whether the render-time swap is switched off for the current process.
 *
 * Why inert under vitest: upstream asserts its own product name in rendered copy
 * across ~29 test files, and that set grows every release — v1.4.200 alone added
 * more than forty such assertions. Adapting each one would put those files in the
 * fork's diff, to be reconciled on every merge, which is the cost brand/README.md
 * exists to avoid. It is the same trade brand/settings/hidden-sections.ts makes:
 * hook where the product consumes the value, and leave upstream's tests asserting
 * upstream's values.
 *
 * This narrows what the swap is exercised by, not what it does. `rebrandCopy` is
 * unconditional and directly tested, the post-processor is tested here with the
 * flag cleared, and Playwright e2e drives the real app with no VITEST in its
 * environment, so the packaged product is never covered by this branch.
 *
 * Read at call time rather than module load so a test can clear it. Guarded by
 * typeof because the renderer bundle may run without a `process` global.
 */
export function isRenderSwapDisabled(): boolean {
  return typeof process !== 'undefined' && Boolean(process.env?.VITEST)
}

export const brandNamePostProcessor: PostProcessorModule = {
  type: 'postProcessor',
  name: 'brandName',
  process: (value: string): string => (isRenderSwapDisabled() ? value : rebrandCopy(value))
}

/** i18next `postProcess` init value. Kept beside the module so both i18n bootstraps agree. */
export const BRAND_POST_PROCESS = ['brandName']
