import type { AppIconId } from '../../src/shared/app-icon'

/**
 * The app icons OxeeUI offers in Settings → Appearance → App Icon.
 *
 * Only `classic`, which brand/scripts/apply-brand-assets.mjs overwrites with the
 * OxeeUI mark. Upstream's other two entries (`watercolor`, `blue`) are upstream's
 * own artwork: choosing one turned the Dock and taskbar icon into a different
 * product. Worse, a profile carried over from upstream brings its choice with it,
 * so an OxeeUI install could open wearing the other product's icon without the
 * user ever touching the picker.
 *
 * Why hooks at the edges rather than trimming upstream's APP_ICON_OPTIONS: that
 * list types every icon record in the main process, and upstream's tests assert
 * the other icons across the Dock-icon persistence code. Leaving it intact keeps
 * those untouched; OxeeUI just never stores or shows a choice it does not offer.
 */
export const BRAND_APP_ICON_IDS: readonly AppIconId[] = ['classic']

/** Whether there is anything to choose, i.e. whether the picker is shown at all. */
export const IS_APP_ICON_CHOICE_OFFERED = BRAND_APP_ICON_IDS.length > 1

/** Maps an icon OxeeUI does not offer to the one it does. */
export function resolveBrandAppIconId(id: AppIconId): AppIconId {
  return BRAND_APP_ICON_IDS.includes(id) ? id : BRAND_APP_ICON_IDS[0]
}
