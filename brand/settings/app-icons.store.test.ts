import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { PersistedState } from '../../src/shared/persisted-state-types'
import { getDefaultPersistedState } from '../../src/shared/constants'
import {
  createStore,
  readDataFile,
  testState,
  writeDataFile
} from '../../src/main/persistence-test-harness'

// Same seams as upstream's own Store tests (src/main/persistence-settings-ui-defaults.test.ts),
// so this drives the real load path rather than the normalizer in isolation.
vi.mock('../../src/main/ssh/ssh-config-parser', () => ({
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

vi.mock('../../src/main/telemetry/client', () => ({ track: vi.fn() }))
vi.mock('../../src/main/telemetry/cohort-classifier', () => ({
  getCohortAtEmit: vi.fn(() => ({ nth_repo_added: 2 }))
}))

describe('a profile carried over with an icon OxeeUI does not offer', () => {
  beforeEach(() => {
    testState.dir = mkdtempSync(join(tmpdir(), 'oxeeui-app-icon-'))
  })

  afterEach(() => {
    rmSync(testState.dir, { recursive: true, force: true })
  })

  // Why this is the case that matters: migrating a profile from upstream is how
  // an install opened wearing the other product's icon without anyone touching
  // the picker.
  it.each(['blue', 'watercolor'])('loads %s as the OxeeUI mark and stores it', async (icon) => {
    const persisted = getDefaultPersistedState(testState.dir)
    writeDataFile({ ...persisted, settings: { ...persisted.settings, appIcon: icon } })

    const store = await createStore()

    expect(store.getSettings().appIcon).toBe('classic')
    store.flush()
    expect((readDataFile() as PersistedState).settings.appIcon).toBe('classic')
  })

  it('keeps the OxeeUI mark as it is', async () => {
    const persisted = getDefaultPersistedState(testState.dir)
    writeDataFile({ ...persisted, settings: { ...persisted.settings, appIcon: 'classic' } })

    const store = await createStore()

    expect(store.getSettings().appIcon).toBe('classic')
  })
})
