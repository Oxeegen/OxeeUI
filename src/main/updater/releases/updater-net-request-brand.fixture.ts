// Why a brand copy: upstream deleted its src/main/updater/testing/updater-net-request.fixture.ts
// in v1.4.272 along with the tests that used it, but updater-prerelease-feed-brand-tags.test.ts
// still drives the real feed through Electron's net.request. Same adapter, unchanged.

import { EventEmitter } from 'node:events'
import { vi, type Mock } from 'vitest'

type NetFetchResponse = {
  ok?: boolean
  status?: number
  headers?: { get: (name: string) => string | null }
}

export function installNetRequestFetchAdapter(netRequestMock: Mock, netFetchMock: Mock): void {
  netRequestMock.mockImplementation(
    (options: { method?: string; redirect?: string; url: string }) => {
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: abort and end are assigned on the next lines, before the request is returned
      const request = new EventEmitter() as EventEmitter & {
        abort: Mock
        end: Mock
      }
      request.abort = vi.fn()
      request.end = vi.fn(() => {
        Promise.resolve(
          netFetchMock(options.url, { method: options.method, redirect: options.redirect })
        ).then(
          (response: NetFetchResponse) => {
            const status = response.status ?? (response.ok ? 200 : 503)
            if (options.redirect === 'manual' && status >= 300 && status < 400) {
              request.emit(
                'redirect',
                status,
                options.method ?? 'GET',
                response.headers?.get('location') ?? 'https://redirect.test',
                {}
              )
              // Electron emits an error after cancelling an unfollowed manual redirect.
              request.emit('error', new Error('Redirect was cancelled'))
            } else {
              request.emit('response', { statusCode: status })
            }
          },
          (error) => request.emit('error', error)
        )
        return request
      })
      return request
    }
  )
}
