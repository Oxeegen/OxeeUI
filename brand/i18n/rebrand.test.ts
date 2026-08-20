import { describe, expect, it } from 'vitest'
import { BRAND } from '@brand/config/brand'
import { rebrandCopy } from './rebrand'

const UPSTREAM = BRAND.upstream.productName

describe('rebrandCopy', () => {
  it('swaps both display spellings of the upstream name', () => {
    expect(rebrandCopy(`${UPSTREAM} hit a renderer error.`)).toBe(
      `${BRAND.productName} hit a renderer error.`
    )
    // The landing wordmark is an all-caps literal, not a CSS transform.
    expect(rebrandCopy(UPSTREAM.toUpperCase())).toBe(BRAND.productName)
  })

  it('leaves the possessive and multiple occurrences consistent', () => {
    expect(rebrandCopy(`${UPSTREAM}'s CLI, installed by ${UPSTREAM}.`)).toBe(
      `${BRAND.productName}'s CLI, installed by ${BRAND.productName}.`
    )
  })

  // Why these five: each is load-bearing somewhere the rename would break the
  // product — the shell command, the on-disk config, the state directory, the
  // env-var contract, and the bundle id.
  it.each([
    'Run `orca status` in a system terminal.',
    'Add a setup block to orca.yaml.',
    'Skills are installed under ~/.orca/skills.',
    'Unset the ORCA_BITBUCKET_* variables to manage this credential.',
    'com.stablyai.orca'
  ])('leaves technical identifiers untouched: %s', (value) => {
    expect(rebrandCopy(value)).toBe(value)
  })

  it('does not touch names that merely contain the upstream word', () => {
    expect(rebrandCopy(`${UPSTREAM}nautical`)).toBe(`${UPSTREAM}nautical`)
  })
})
