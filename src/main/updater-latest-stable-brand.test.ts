import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAIN_RELEASE_REPO } from '../shared/release-channel'

/**
 * The stable fallback resolves "the Latest release" through GitHub's
 * /releases/latest redirect and pins the update feed to that concrete tag.
 *
 * Why this exists: upstream introduced the lookup with its own repository
 * written into both the URL and the redirect pattern. In this product that
 * resolves another product's tag, which this repo never publishes, so every
 * up-to-date check would end in "unable to resolve a ready stable release".
 * Lives in src/main (it drives Electron's net); "brand" in the name keeps it in
 * `pnpm run brand:verify`.
 */
const LATEST_URL = `https://github.com/${MAIN_RELEASE_REPO}/releases/latest`
const ORIGINAL_PLATFORM = process.platform

const { netFetchMock, netRequestMock } = vi.hoisted(() => ({
  netFetchMock: vi.fn(),
  netRequestMock: vi.fn()
}))

vi.mock('electron', () => ({ net: { fetch: netFetchMock, request: netRequestMock } }))

/** GitHub answers the Latest page with a redirect to the release's tag page. */
function serveLatestRedirect(redirectPath: string, requested: string[]): void {
  netRequestMock.mockImplementation((options: { url: string }) => {
    requested.push(options.url)
    const request = new EventEmitter() as EventEmitter & { end: () => void; abort: () => void }
    request.abort = vi.fn()
    request.end = () => {
      queueMicrotask(() => {
        if (options.url === LATEST_URL) {
          request.emit('redirect', 302, 'HEAD', `https://github.com${redirectPath}`, {})
        } else {
          request.emit('response', { statusCode: 404 })
        }
      })
    }
    return request
  })
}

/** Every release in this repo carries a Linux manifest and its AppImage. */
function serveManifests(): void {
  netFetchMock.mockImplementation((url: string, init?: { method?: string }) => {
    if (/\/releases\/download\/[^/]+\/latest-linux\.yml$/.test(url)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            'version: 0.4.243\nfiles:\n  - url: oxeeui-linux-x86_64.AppImage\npath: oxeeui-linux-x86_64.AppImage\n'
          )
      })
    }
    if (init?.method === 'HEAD') {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') })
    }
    return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') })
  })
}

describe('latest stable release lookup under the brand', () => {
  beforeEach(() => {
    vi.resetModules()
    netFetchMock.mockReset()
    netRequestMock.mockReset()
    // Pinned so asset readiness takes the net.fetch path on every host.
    Object.defineProperty(process, 'platform', { value: 'linux' })
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: ORIGINAL_PLATFORM })
  })

  it("asks this product's own Latest page and returns its tag", async () => {
    const requested: string[] = []
    serveLatestRedirect(`/${MAIN_RELEASE_REPO}/releases/tag/oxeeui-v0.4.243`, requested)
    serveManifests()
    const { fetchLatestStableReleaseTag } = await import('./updater-prerelease-feed')

    expect(await fetchLatestStableReleaseTag()).toBe('oxeeui-v0.4.243')
    expect(requested[0]).toBe(LATEST_URL)
  })

  it("refuses a redirect to another repository's release", async () => {
    // Negative control: a redirect off this repo must never pin the feed.
    serveLatestRedirect(`/${'stablyai'}/${'orca'}/releases/tag/v1.4.243`, [])
    serveManifests()
    const { fetchLatestStableReleaseTag } = await import('./updater-prerelease-feed')

    expect(await fetchLatestStableReleaseTag()).toBeNull()
  })
})
