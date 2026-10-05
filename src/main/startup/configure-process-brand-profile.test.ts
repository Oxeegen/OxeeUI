import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BRAND } from '@brand/config/brand'

/**
 * Where this product keeps its profile.
 *
 * Why a separate file: upstream's configure-process.test.ts asserts upstream's
 * `orca-dev` path and that packaged runs keep Electron's default, and it sits at
 * the 800-line lint cap. Rewriting those two tests in place pushed it over the
 * cap on v1.4.215; here they cannot collide with upstream's growth.
 *
 * "brand" in the file name keeps it inside `pnpm run brand:verify`.
 */
vi.mock('electron', () => {
  const paths = new Map<string, string>([['appData', '/tmp/app-data']])
  return {
    app: {
      getPath: vi.fn((name: string) => paths.get(name) ?? ''),
      setPath: vi.fn((name: string, value: string) => {
        paths.set(name, value)
      }),
      quit: vi.fn(),
      exit: vi.fn(),
      isPackaged: false,
      disableHardwareAcceleration: vi.fn(),
      commandLine: {
        appendSwitch: vi.fn(),
        getSwitchValue: vi.fn(() => '')
      }
    }
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('configureDevUserDataPath under the brand', () => {
  it('moves dev runs onto a brand-slugged dev userData path', async () => {
    const { app } = await import('electron')
    const { configureDevUserDataPath } = await import('./configure-process')

    delete process.env.ORCA_DEV_USER_DATA_PATH
    configureDevUserDataPath(true)

    // Why: production code uses path.join(app.getPath('appData'), '<slug>-dev')
    // which produces platform-specific separators.
    expect(app.setPath).toHaveBeenCalledWith(
      'userData',
      join('/tmp/app-data', `${BRAND.artifactSlug}-dev`)
    )
  })

  // Why this diverges from upstream, which asserts no call at all: Electron
  // derives userData from package.json `name`, still upstream's `orca` here
  // because the CLI and ~/.orca depend on that string. Leaving packaged runs on
  // the default would put an installed OxeeUI in %APPDATA%/orca alongside an
  // installed Orca — one settings store, and one daemon endpoint, since the
  // endpoint name hashes this very path.
  it('moves packaged runs onto a brand-slugged userData path', async () => {
    const { app } = await import('electron')
    const { configureDevUserDataPath } = await import('./configure-process')

    vi.mocked(app.setPath).mockClear()
    configureDevUserDataPath(false)

    expect(app.setPath).toHaveBeenCalledWith('userData', join('/tmp/app-data', BRAND.artifactSlug))
  })

  it('keeps the packaged and dev profiles apart', async () => {
    const { app } = await import('electron')
    const { configureDevUserDataPath } = await import('./configure-process')

    delete process.env.ORCA_DEV_USER_DATA_PATH
    vi.mocked(app.setPath).mockClear()
    configureDevUserDataPath(false)
    configureDevUserDataPath(true)

    const paths = vi.mocked(app.setPath).mock.calls.map(([, value]) => value)
    expect(new Set(paths).size).toBe(2)
  })
})
