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
 * Only the capitalized standalone word is replaced. Lowercase `orca` is load-bearing
 * — the CLI binary, `orca.yaml`, `~/.orca`, and reverse-proxy paths — and the
 * screaming-snake `ORCA_*` env vars must survive verbatim; both are left alone by the
 * case-sensitive word-boundary match.
 */
const UPSTREAM_NAME_PATTERN = new RegExp(`\\b${BRAND.upstream.productName}\\b`, 'g')

/**
 * The same swap the post-processor applies, exposed for tests that assert on
 * rendered copy. Upstream literals stay readable at the call site and the
 * assertion follows brand.config.json instead of hardcoding either name.
 */
export function rebrandCopy(value: string): string {
  return IS_REBRANDED ? value.replace(UPSTREAM_NAME_PATTERN, BRAND.productName) : value
}

export const brandNamePostProcessor: PostProcessorModule = {
  type: 'postProcessor',
  name: 'brandName',
  process: (value: string): string => rebrandCopy(value)
}

/** i18next `postProcess` init value. Kept beside the module so both i18n bootstraps agree. */
export const BRAND_POST_PROCESS = ['brandName']
