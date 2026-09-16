import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BRAND } from './config/brand'

const RELEASE_CHANNEL = resolve('src/shared/release-channel.ts')

describe('release repo', () => {
  // Why pinned rather than imported: see the comment on MAIN_RELEASE_REPO. The
  // literal cannot read brand.config.json, so this is what keeps them equal.
  it('matches the brand publish target', () => {
    const source = readFileSync(RELEASE_CHANNEL, 'utf8')
    const declared = source.match(/export const MAIN_RELEASE_REPO = '([^']+)'/)?.[1]
    expect(declared).toBe(`${BRAND.publish.owner}/${BRAND.publish.repo}`)
  })
})

function sourcesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      return sourcesUnder(path)
    }
    return /\.tsx?$/.test(entry) && !/\.test\./.test(entry) ? [path] : []
  })
}

describe('shared code', () => {
  // Why this invariant: config/tsconfig.cli.json includes all of src/shared, and
  // build:cli compiles it with plain tsc. tsc emits path aliases verbatim, so an
  // `@brand/...` import in shared code passes every renderer and main typecheck
  // and then fails at runtime inside the packaged CLI. This is exactly how the
  // first release build broke.
  it('never imports through the @brand alias', () => {
    const aliasImport = /(?:from|require\()\s*'@brand\//
    const offenders = sourcesUnder(resolve('src/shared')).filter((file) =>
      aliasImport.test(readFileSync(file, 'utf8'))
    )
    expect(offenders).toEqual([])
  })
})
