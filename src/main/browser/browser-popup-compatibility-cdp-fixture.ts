import { spawnProcess } from '../../shared/child-process/run-process'
import { createServer } from 'node:http'
import { createServer as createPortServer } from 'node:net'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium, type Browser, type Page } from 'playwright'
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest'
import { build as buildVite } from 'vite'
import { waitForBrowserCdpEndpoint } from './browser-session-ua-cdp-collector'
import { resolveElectronProbeLaunch } from './electron-probe-display-launch'

// Hidden renderer startup and CDP events can exceed the default one-second poll on CI.
vi.setConfig({ expect: { poll: { timeout: 10_000 } } })

export type PopupFixtureReceipt = {
  path: string
  method: string
  body: string
  cookie: string
  referrer: string
  contentType: string
  proxied: boolean
  origin: string
  fetchSite: string
  fetchMode: string
  fetchDest: string
  fetchUser: string
}
export const receipts: PopupFixtureReceipt[] = []
const root = mkdtempSync(join(tmpdir(), 'orca-popup-compatibility-'))
let fixture: ReturnType<typeof spawnProcess> | null = null
export let browser: Browser | null = null
export let origin = ''
let stderr = ''
const pages = new Map<string, Page>()
const statusPath = join(root, 'status.json')
export const artifactDir = process.env.ORCA_POPUP_FIXTURE_ARTIFACT_DIR
export const snapshots: ReturnType<typeof status>[] = []
export const expectedSecurity = { sandbox: true, contextIsolation: true, nodeIntegration: false }

export function status(): {
  revision: number
  ready?: boolean
  error?: string
  windowsHidden: boolean
  tabOpens: { url: string; activate: boolean }[]
  blocked: number[]
  inputs: string[]
  childRequests: {
    adopted: boolean
    native: boolean
    sessionMatches: boolean
    security: typeof expectedSecurity
    permission?: string
  }[]
  routeGranted: boolean
  routeContents: { security: typeof expectedSecurity; webRtcPolicy: string }[]
  native: {
    presentationCalls: string[]
    requests: { disposition: string; features: string; frameName: string; post: boolean }[]
    creation: {
      firstNavigationPolicy: string
      firstNavigationOwner: number | null
      firstNavigationTitle: string
    }[]
    windows: {
      closed: boolean
      title: string
      fullscreen: boolean
      focused: boolean
      contentSize: number[]
    }[]
  }
} {
  return JSON.parse(readFileSync(statusPath, 'utf8'))
}

function fixtureHtml(): string {
  return `<!doctype html><meta name="referrer" content="strict-origin-when-cross-origin"><body>
    <button id="oauth" onclick="window.popup=window.open('/authorize?client_id=synthetic&amp;redirect_uri=${origin}/callback&amp;response_type=code');document.body.dataset.handle=String(!!window.popup)">OAuth</button>
    <button id="blank" onclick="window.popup=window.open('about:blank#state');document.body.dataset.handle=String(!!window.popup);if(window.popup)window.popup.eval(&quot;window.opener.postMessage('blank:'+document.cookie,'*')&quot;)">Blank</button>
    <button id="invalid" onclick="window.popup=window.open('about:blank?state=synthetic');document.body.dataset.handle=String(!!window.popup)">Invalid</button>
    <button id="burst" onclick="window.handles=Array.from({length:5},()=>window.open('about:blank'));document.body.dataset.handles=JSON.stringify(window.handles.map(Boolean))">Burst</button>
    <button id="stale" onclick="document.body.dataset.handle='waiting';setTimeout(()=>{window.popup=window.open('about:blank');document.body.dataset.handle=String(!!window.popup)},1100)">Stale</button>
    <form method="post" target="_blank" action="/post"><input name="code" value="synthetic+value"><button id="post">POST</button></form>
    <form method="post" target="_blank" action="/multipart" enctype="multipart/form-data"><input name="code" value="synthetic-multipart"><button id="multipart">Multipart</button></form>
    <form method="post" target="_blank" action="/empty"><button id="empty">Empty POST</button></form>
    <a id="link" href="/docs" target="_blank">Docs</a>
    <a id="oauth-link" href="/authorize-link?client_id=synthetic&amp;redirect_uri=${origin}/callback&amp;response_type=code" target="_blank">OAuth link</a>
    <a id="background" href="/background">Background</a>
    <a id="shift" href="/shift">Popup link</a>
    <script>window.addEventListener('message',event=>document.body.dataset.message=event.data)</script>
  </body>`
}

const server = createServer((request, response) => {
  const chunks: Buffer[] = []
  request.on('data', (chunk: Buffer) => chunks.push(chunk))
  request.on('end', () => {
    const path = new URL(request.url ?? '/', origin).pathname
    receipts.push({
      path,
      method: request.method ?? '',
      body: Buffer.concat(chunks).toString(),
      cookie: request.headers.cookie ?? '',
      referrer: request.headers.referer ?? '',
      contentType: request.headers['content-type'] ?? '',
      proxied: request.url?.startsWith('http:') ?? false,
      origin: String(request.headers.origin ?? ''),
      fetchSite: String(request.headers['sec-fetch-site'] ?? ''),
      fetchMode: String(request.headers['sec-fetch-mode'] ?? ''),
      fetchDest: String(request.headers['sec-fetch-dest'] ?? ''),
      fetchUser: String(request.headers['sec-fetch-user'] ?? '')
    })
    if (path === '/native-redirect') {
      response.writeHead(307, {
        Location: `${origin.replace('127.0.0.1', 'localhost')}/native-final`
      })
      response.end()
      return
    }
    if (path === '/seed') {
      response.setHeader('Set-Cookie', 'strict_cookie=synthetic; SameSite=Strict; Path=/')
    }
    response.setHeader('Content-Type', 'text/html')
    response.end(
      ['/local', '/route', '/local-control', '/route-control'].includes(path)
        ? fixtureHtml()
        : `<title>Hostile synthetic title</title><body>${path}<script>if(window.opener)window.opener.postMessage('callback:'+document.cookie,'*')</script></body>`
    )
  })
})

async function reservePort(): Promise<number> {
  const portServer = createPortServer()
  await new Promise<void>((resolve) => portServer.listen(0, '127.0.0.1', resolve))
  const address = portServer.address()
  if (!address || typeof address === 'string') {
    throw new Error('Missing CDP port')
  }
  await new Promise<void>((resolve) => portServer.close(() => resolve()))
  return address.port
}

async function waitForFixture(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 20_000
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error(`Popup fixture did not become ready: ${stderr}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Missing mock origin')
  }
  origin = `http://127.0.0.1:${address.port}`
  // Build current source, including the hidden BaseWindow policy, before any Electron launch.
  await buildVite({
    configFile: false,
    logLevel: 'silent',
    build: {
      lib: {
        entry: join(
          process.cwd(),
          'src/main/browser/browser-popup-compatibility-electron-fixture.ts'
        ),
        formats: ['cjs'],
        fileName: () => 'main.cjs'
      },
      outDir: root,
      emptyOutDir: false,
      target: 'node22',
      rollupOptions: { external: ['electron', /^node:/] }
    }
  })
  const electronBinary: unknown = createRequire(import.meta.url)('electron')
  if (typeof electronBinary !== 'string') {
    throw new Error('Missing Electron executable')
  }
  const cdpPort = await reservePort()
  const { ELECTRON_RUN_AS_NODE: _runAsNode, ...env } = process.env
  const { executable, args } = resolveElectronProbeLaunch({
    electronBinary,
    electronArgs: [
      join(root, 'main.cjs'),
      `--user-data-dir=${join(root, 'profile')}`,
      `--remote-debugging-port=${cdpPort}`
    ],
    platform: process.platform,
    display: env.DISPLAY
  })
  fixture = spawnProcess({
    program: executable,
    args,
    env: {
      ...env,
      ORCA_BACKGROUND_LAUNCH: '1',
      ORCA_POPUP_FIXTURE_ORIGIN: origin,
      ORCA_POPUP_FIXTURE_STATUS: statusPath,
      ORCA_POPUP_FIXTURE_NATIVE_CONTROLS: nativeControls ? '1' : '0'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  fixture.stderr?.on('data', (data: Buffer) => {
    stderr += data.toString()
  })
  await waitForBrowserCdpEndpoint(cdpPort)
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${cdpPort}`)
  await waitForFixture(() => {
    if (!existsSync(statusPath)) {
      return false
    }
    const current = status()
    if (current.error) {
      throw new Error(current.error)
    }
    return current.ready === true
  })
  expect(status()).toMatchObject({ ready: true, windowsHidden: true })
  for (const name of nativeControls
    ? ['local', 'route', 'local-control', 'route-control']
    : ['local', 'route']) {
    await waitForFixture(() =>
      Boolean(
        browser
          ?.contexts()
          .flatMap((context) => context.pages())
          .some((page) => page.url() === `${origin}/${name}`)
      )
    )
    const page = browser
      .contexts()
      .flatMap((context) => context.pages())
      .find((candidate) => candidate.url() === `${origin}/${name}`)
    if (!page) {
      throw new Error('Missing guest page')
    }
    pages.set(name, page)
  }
}, 60_000)

afterEach(async () => {
  const route = pages.get('route')
  if (route && !route.isClosed()) {
    await route.evaluate('console.log("orca-popup-fixture:restore-authority")')
  }
  const local = pages.get('local')
  if (local && !local.isClosed()) {
    await closeChildren(local)
  }
})

afterAll(async () => {
  if (artifactDir && existsSync(statusPath)) {
    mkdirSync(artifactDir, { recursive: true })
    writeFileSync(
      join(artifactDir, evidenceName),
      JSON.stringify({ status: status(), receipts, snapshots }, null, 2)
    )
  }
  if (fixture?.exitCode === null) {
    const exited = new Promise<void>((resolve) => fixture?.once('exit', () => resolve()))
    fixture.kill('SIGTERM')
    await exited
  }
  await browser?.close().catch(() => {})
  await new Promise<void>((resolve) => server.close(() => resolve()))
  rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
})

export function guest(name: string): Page {
  const page = pages.get(name)
  if (!page) {
    throw new Error('Missing fixture guest')
  }
  return page
}

export async function closeChildren(page: Page): Promise<void> {
  await page.evaluate('window.popup?.close();window.handles?.forEach(handle=>handle?.close())')
  if (!browser) {
    throw new Error('Missing fixture browser')
  }
  for (const child of browser.contexts().flatMap((context) => context.pages())) {
    if (
      ![...pages.values()].includes(child) &&
      (child.url().startsWith(origin) ||
        child.url().startsWith(origin.replace('127.0.0.1', 'localhost')))
    ) {
      await child.evaluate('window.close()').catch(() => {})
      await expect.poll(() => child.isClosed()).toBe(true)
    }
  }
}

let evidenceName = 'electron-evidence.json'
let nativeControls = false
export function enablePopupFixtureNativeControls(): void {
  nativeControls = true
}
export function setPopupFixtureEvidenceName(name: string): void {
  evidenceName = name
}
