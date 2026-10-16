import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type * as NodeFsPromises from 'node:fs/promises'
import { StatsSnapshotWriter } from './stats-snapshot-writer'

const renameHook = vi.hoisted(() => {
  const hook: { afterRename: (() => void) | null } = { afterRename: null }
  return hook
})
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFsPromises>()
  return {
    ...actual,
    rename: async (from: string, to: string) => {
      await actual.rename(from, to)
      const afterRename = renameHook.afterRename
      renameHook.afterRename = null
      afterRename?.()
    }
  }
})

describe('StatsSnapshotWriter', () => {
  let dir: string
  let file: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'orca-stats-writer-'))
    file = join(dir, 'nested', 'snapshot.json')
  })

  afterEach(() => {
    renameHook.afterRename = null
    rmSync(dir, { recursive: true, force: true })
  })

  it('drains a write requested in any microtask after the previous rename completes', async () => {
    const nested = (depth: number, fn: () => void): void => {
      if (depth === 0) {
        fn()
        return
      }
      queueMicrotask(() => nested(depth - 1, fn))
    }
    for (let depth = 0; depth < 8; depth += 1) {
      const writer = new StatsSnapshotWriter(() => file)
      let second: Promise<void> | null = null
      renameHook.afterRename = () =>
        nested(depth, () => {
          second = writer.write(() => `second ${depth}`)
        })
      await writer.write(() => `first ${depth}`)
      await vi.waitFor(() => expect(second).not.toBeNull())
      await second
      await writer.waitForPendingWrite()
      expect(readFileSync(file, 'utf8')).toBe(`second ${depth}`)
    }
  })
})
