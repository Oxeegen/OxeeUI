import { afterEach, describe, expect, it } from 'vitest'
import { BRAND } from '@brand/config/brand'
import {
  BRAND_POST_PROCESS,
  brandNamePostProcessor,
  isRenderSwapDisabled,
  rebrandCopy
} from './rebrand'

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

/**
 * The post-processor is inert under vitest so upstream's own suites keep
 * asserting upstream's product name. That gate is the only thing standing
 * between this fork and a silently broken rename: with it in place, no ordinary
 * test would notice if the swap stopped working. These cover that blind spot by
 * clearing the flag and exercising the real i18next entry point.
 */
describe('brandNamePostProcessor', () => {
  const saved = process.env.VITEST

  afterEach(() => {
    if (saved === undefined) {
      delete process.env.VITEST
    } else {
      process.env.VITEST = saved
    }
  })

  it('is inert while running under vitest', () => {
    expect(isRenderSwapDisabled()).toBe(true)
    expect(brandNamePostProcessor.process(`${UPSTREAM} is ready.`, '', {}, {})).toBe(
      `${UPSTREAM} is ready.`
    )
  })

  it('swaps the product name once the gate is cleared', () => {
    delete process.env.VITEST
    expect(isRenderSwapDisabled()).toBe(false)
    expect(brandNamePostProcessor.process(`${UPSTREAM} is ready.`, '', {}, {})).toBe(
      `${BRAND.productName} is ready.`
    )
  })

  it('registers under the name both i18n bootstraps pass to i18next', () => {
    expect(brandNamePostProcessor.type).toBe('postProcessor')
    expect(BRAND_POST_PROCESS).toContain(brandNamePostProcessor.name)
  })
})
