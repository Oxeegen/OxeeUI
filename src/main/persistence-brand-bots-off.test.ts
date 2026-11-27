import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isBotsEnabled } from '../shared/bots-switch'
import { getDefaultPersistedState } from '../shared/orca-profiles/constants'
import type { GlobalSettings } from '../shared/settings/global-settings-types'
import {
  closeTestStores,
  createStore,
  testState,
  writeDataFile
} from './persistence/persistence-test-harness'

// Why this lives in src/main rather than brand/: it drives the real Store, and brand/ is
// also type-checked by the web project, which must not pull in the main process. The
// file name keeps `brand` so `pnpm run brand:verify` (vitest filtered on 'brand') runs it.
//
// Same seams as persistence-brand-app-icons.test.ts.
vi.mock('./ssh/config/ssh-config-parser', () => ({
  loadUserSshConfig: vi.fn(),
  sshConfigHostsToTargets: vi.fn()
}))

vi.mock('electron', () => ({
  app: { getPath: () => testState.dir },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (plaintext: string) => Buffer.from(`encrypted:${plaintext}`, 'utf-8'),
    decryptString: (ciphertext: Buffer) => ciphertext.toString('utf-8').slice('encrypted:'.length)
  }
}))

vi.mock('./telemetry/client', () => ({ track: vi.fn() }))
vi.mock('./telemetry/cohort-classifier', () => ({
  getCohortAtEmit: vi.fn(() => ({ nth_repo_added: 2 }))
}))

describe('bots stay off in OxeeUI', () => {
  beforeEach(() => {
    testState.dir = mkdtempSync(join(tmpdir(), 'oxeeui-bots-off-'))
  })

  afterEach(async () => {
    // Why first: the Store keeps files open, and Windows refuses to delete an open
    // file — the release build runs this suite on a Windows runner.
    await closeTestStores()
    rmSync(testState.dir, { recursive: true, force: true })
  })

  // Why this is the case that matters: every installed OxeeUI profile was saved
  // before bots existed. Upstream reads a missing key as "on", so the brand default
  // has to arrive through the load path, not only through a fresh seed.
  it('loads a profile saved before bots existed with bots off', async () => {
    const persisted = getDefaultPersistedState(testState.dir)
    const older: Partial<GlobalSettings> = { ...persisted.settings }
    delete older.botsEnabled
    writeDataFile({ ...persisted, settings: older })

    const store = await createStore()

    expect(isBotsEnabled(store.getSettings())).toBe(false)
  })

  it('seeds a new profile with bots off', async () => {
    const store = await createStore()

    expect(isBotsEnabled(store.getSettings())).toBe(false)
  })
})
