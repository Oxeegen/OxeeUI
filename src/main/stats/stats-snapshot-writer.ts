import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { durableWriteTempPath, removeStaleDurableWriteTempFiles } from '../durable-file-write'

const STALE_WRITE_TEMP_AGE_MS = 24 * 60 * 60 * 1000

export type StatsSnapshotWriterOptions = {
  /** Creation mode for the published file, e.g. 0o600 for state other users must not read. */
  fileMode?: number
}

export class StatsSnapshotWriter {
  private writeGeneration = 0
  private lastCommittedGeneration = 0
  private writeRequested = false
  private pendingWrite: Promise<void> | null = null
  private pendingSerialize: (() => string) | null = null
  private readonly staleTempCleanup: Promise<void>
  private inFlightAsyncTmpFile: string | null = null

  constructor(
    private readonly resolveFile: () => string,
    private readonly options: StatsSnapshotWriterOptions = {}
  ) {
    this.staleTempCleanup = removeStaleDurableWriteTempFiles(resolveFile(), {
      minimumAgeMs: STALE_WRITE_TEMP_AGE_MS
    })
  }

  write(serialize: () => string): Promise<void> {
    this.writeRequested = true
    this.pendingSerialize = serialize
    // Why safe: drainWrites awaits before its finally can clear pendingWrite, so this assignment lands first.
    this.pendingWrite ??= this.drainWrites()
    return this.pendingWrite
  }

  writeSync(serialize: () => string): void {
    const statsFile = this.resolveFile()
    const dir = dirname(statsFile)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    if (this.inFlightAsyncTmpFile) {
      try {
        unlinkSync(this.inFlightAsyncTmpFile)
        this.inFlightAsyncTmpFile = null
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          void this.write(serialize).catch((writeError) => {
            console.error('[stats] Failed to write stats:', writeError)
          })
          throw error
        }
      }
    }
    const { tmpFile, json, generation } = this.preparePayload(statsFile, serialize)
    writeFileSync(tmpFile, json, { encoding: 'utf-8', mode: this.options.fileMode })
    renameSync(tmpFile, statsFile)
    this.lastCommittedGeneration = Math.max(this.lastCommittedGeneration, generation)
  }

  waitForPendingWrite(): Promise<void> {
    return this.pendingWrite ?? Promise.resolve()
  }

  private preparePayload(
    finalPath: string,
    serialize: () => string
  ): {
    tmpFile: string
    json: string
    generation: number
  } {
    const generation = ++this.writeGeneration
    return {
      tmpFile: durableWriteTempPath(finalPath),
      json: serialize(),
      generation
    }
  }

  private async drainWrites(): Promise<void> {
    try {
      await this.staleTempCleanup
      let firstError: unknown = null
      while (this.writeRequested) {
        this.writeRequested = false
        const serialize = this.pendingSerialize!
        try {
          await this.writeToDiskAsync(serialize)
        } catch (error) {
          firstError ??= error
          if (!this.writeRequested) {
            throw error
          }
        }
      }
      if (firstError) {
        throw firstError
      }
    } finally {
      // Why: clear in the same tick the loop saw no request left, so a later write() starts a new drain.
      this.pendingWrite = null
    }
  }

  private async writeToDiskAsync(serialize: () => string): Promise<void> {
    const statsFile = this.resolveFile()
    await mkdir(dirname(statsFile), { recursive: true }).catch(() => {})
    const { tmpFile, json, generation } = this.preparePayload(statsFile, serialize)
    let renamed = false
    try {
      await writeFile(tmpFile, json, { encoding: 'utf-8', mode: this.options.fileMode })
      if (this.lastCommittedGeneration >= generation) {
        return
      }
      this.inFlightAsyncTmpFile = tmpFile
      try {
        await rename(tmpFile, statsFile)
        renamed = true
        this.lastCommittedGeneration = Math.max(this.lastCommittedGeneration, generation)
      } catch (err) {
        if (
          (err as NodeJS.ErrnoException).code !== 'ENOENT' ||
          this.lastCommittedGeneration < generation
        ) {
          throw err
        }
      } finally {
        if (this.inFlightAsyncTmpFile === tmpFile) {
          this.inFlightAsyncTmpFile = null
        }
      }
    } finally {
      if (!renamed) {
        await rm(tmpFile, { force: true }).catch(() => {})
      }
    }
  }
}
