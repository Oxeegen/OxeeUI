import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installNetRequestFetchAdapter } from './updater-net-request.fixture'
import { MAIN_RELEASE_REPO, MAIN_RELEASE_TAG_PREFIX } from '../shared/release-channel'

/**
 * This product publishes `oxeeui-v<version>` tags, but the repo also carries the
 * tags it was forked from. GitHub's releases atom feed lists a bare tag with no
 * release exactly like a real one, so the feed answers with both.
 *
 * What that cost, live on 0.4.204 and 0.4.205: every published release was
 * skipped for not looking like a version, an inherited `v1.4.x` tag was read as
 * the newest release instead, its manifest 404'd, and the check ended on
 * "A newer release isn't available for this device yet" — before reaching the
 * fallback feed. Auto-update could never work, and nothing failed loudly.
 *
 * Lives in src/main rather than brand/ because brand/ is type-checked by the web
 * project too, and this module pulls in Electron. "brand" in the filename keeps
 * it inside `pnpm run brand:verify`.
 */
const RELEASES_BASE = `https://github.com/${MAIN_RELEASE_REPO}`

/** What https://github.com/Oxeegen/OxeeUI/releases.atom actually returned on
 *  2026-09-17: this product's releases, then four inherited upstream tags. */
const LIVE_FEED_TAGS = [
  'oxeeui-v0.4.205',
  'oxeeui-v0.4.204',
  'oxeeui-v0.4.202',
  'oxeeui-v0.4.201',
  'oxeeui-v0.4.200',
  'oxeeui-v0.1.0',
  'v1.4.183-rc.0',
  'v1.4.182',
  'v1.4.182-rc.1',
  'v1.4.182-rc.0'
]

const ORIGINAL_PLATFORM = process.platform

const { netFetchMock, netRequestMock } = vi.hoisted(() => ({
  netFetchMock: vi.fn(),
  netRequestMock: vi.fn()
}))

vi.mock('electron', () => ({
  net: { fetch: netFetchMock, request: netRequestMock }
}))

function buildAtomFeed(tags: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?><feed>${tags
    .map(
      (tag) =>
        `<entry><link rel="alternate" type="text/html" href="${RELEASES_BASE}/releases/tag/${tag}"/><title>${tag}</title></entry>`
    )
    .join('')}</feed>`
}

/** Only tags with a release carry a manifest; an inherited tag 404s. */
function respondWithFeed(tags: string[], taggedReleases: string[]): string[] {
  const released = new Set(taggedReleases)
  const probedTags: string[] = []
  netFetchMock.mockImplementation((url: string) => {
    if (url === `${RELEASES_BASE}/releases.atom`) {
      return Promise.resolve({ ok: true, text: () => Promise.resolve(buildAtomFeed(tags)) })
    }
    const match = url.match(/\/releases\/download\/([^/]+)\/(.+)$/)
    if (match) {
      const tag = decodeURIComponent(match[1])
      if (match[2].startsWith('latest')) {
        probedTags.push(tag)
      }
      return released.has(tag)
        ? Promise.resolve({
            ok: true,
            status: 200,
            text: () =>
              Promise.resolve(
                [
                  `version: ${tag.replace(MAIN_RELEASE_TAG_PREFIX, '')}`,
                  'files:',
                  '  - url: oxeeui-linux-x86_64.AppImage',
                  '    sha512: test',
                  'path: oxeeui-linux-x86_64.AppImage'
                ].join('\n')
              )
          })
        : Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') })
    }
    return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') })
  })
  return probedTags
}

describe('release feed tags', () => {
  beforeEach(() => {
    vi.resetModules()
    netFetchMock.mockReset()
    netRequestMock.mockReset()
    installNetRequestFetchAdapter(netRequestMock, netFetchMock)
    // Pinned so the asset probe takes one path on every machine; the tag reading
    // under test is platform-independent.
    Object.defineProperty(process, 'platform', { value: 'linux' })
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: ORIGINAL_PLATFORM })
  })

  it('reads this fork-published tag shape as a version', async () => {
    const { normalizeTagToVersion } = await import('./updater-prerelease-feed')
    expect(normalizeTagToVersion('oxeeui-v0.4.206')).toBe('0.4.206')
    // Unchanged for the tag shapes upstream's own suites feed it.
    expect(normalizeTagToVersion('v1.4.182')).toBe('1.4.182')
    expect(normalizeTagToVersion('1.4.182-rc.1')).toBe('1.4.182-rc.1')
  })

  it('offers the newest own release and ignores inherited tags', async () => {
    const probed = respondWithFeed(LIVE_FEED_TAGS, ['oxeeui-v0.4.205'])
    const { fetchNewerReleaseTag } = await import('./updater-prerelease-feed')
    expect(await fetchNewerReleaseTag('0.4.204', { includePrerelease: false })).toBe(
      'oxeeui-v0.4.205'
    )
    // The regression itself: an inherited 1.4.x tag must never be probed, let
    // alone pinned — its version outranks every version this product will ship.
    expect(probed.filter((tag) => !tag.startsWith(MAIN_RELEASE_TAG_PREFIX))).toEqual([])
  })

  it('reports no newer release when the running version is the newest', async () => {
    respondWithFeed(LIVE_FEED_TAGS, ['oxeeui-v0.4.205'])
    const { fetchNewerReleaseTagsWithReadiness } = await import('./updater-prerelease-feed')
    const result = await fetchNewerReleaseTagsWithReadiness('0.4.205', 1, {
      includePrerelease: false
    })
    // Not "not-ready": that state is what surfaced the failed check, and it also
    // skips the fallback feed that a same-version check needs.
    expect(result.state).toBe('no-newer')
  })

  it('still reads a feed that carries no own tags', async () => {
    // Negative control: without this fallback the change would quietly disable
    // tag discovery for every feed upstream's suites mock.
    respondWithFeed(['v1.4.183', 'v1.4.182'], ['v1.4.183'])
    const { fetchNewerReleaseTag } = await import('./updater-prerelease-feed')
    expect(await fetchNewerReleaseTag('1.4.182', { includePrerelease: false })).toBe('v1.4.183')
  })
})
