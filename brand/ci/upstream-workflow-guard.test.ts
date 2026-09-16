import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import { FORK_OWNED_WORKFLOWS, WORKFLOW_GUARD } from './upstream-workflow-guard'

const DIR = resolve('.github/workflows')

function workflowFiles(): string[] {
  return existsSync(DIR) ? readdirSync(DIR).filter((name) => /\.ya?ml$/.test(name)) : []
}

function jobsOf(file: string): [string, { if?: unknown }][] {
  const doc = parse(readFileSync(resolve(DIR, file), 'utf8')) as {
    jobs?: Record<string, { if?: unknown }>
  }
  return Object.entries(doc.jobs ?? {})
}

describe('upstream workflow guard', () => {
  const upstream = workflowFiles().filter((name) => !FORK_OWNED_WORKFLOWS.includes(name))

  it('finds the upstream workflows it is meant to guard', () => {
    expect(upstream.length).toBeGreaterThan(0)
  })

  // A merge can reintroduce an unguarded job two ways: by conflicting on the
  // guard line, or — silently, with no conflict at all — by adding a workflow or
  // a job that did not exist when we guarded. This catches both.
  it.each(workflowFiles().filter((name) => !FORK_OWNED_WORKFLOWS.includes(name)))(
    '%s guards every job',
    (file) => {
      const unguarded = jobsOf(file)
        .filter(([, job]) => !String(job?.if ?? '').includes(WORKFLOW_GUARD))
        .map(([name]) => name)
      expect(unguarded).toEqual([])
    }
  )

  it('leaves fork-owned workflows unguarded so they actually run', () => {
    for (const file of FORK_OWNED_WORKFLOWS) {
      expect(workflowFiles()).toContain(file)
      for (const [, job] of jobsOf(file)) {
        expect(String(job?.if ?? '')).not.toContain(WORKFLOW_GUARD)
      }
    }
  })
})
