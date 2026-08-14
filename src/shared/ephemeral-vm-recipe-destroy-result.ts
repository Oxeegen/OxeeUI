import type { ProcessRunResult } from './ephemeral-vm-recipe-process'

export const EPHEMERAL_VM_RECIPE_DESTROY_TIMEOUT_MS = 5 * 60 * 1000

type FailedEphemeralVmRecipeDestroy = {
  ok: false
  skipped: false
  error: string
} & ProcessRunResult

export function getEphemeralVmRecipeDestroyFailure(
  result: ProcessRunResult,
  timeoutMs: number
): FailedEphemeralVmRecipeDestroy | null {
  if (result.timedOut) {
    return {
      ok: false,
      skipped: false,
      error: `Destroy timed out after ${timeoutMs}ms.`,
      ...result
    }
  }
  if (result.exitCode !== 0) {
    return {
      ok: false,
      skipped: false,
      error: `Destroy exited with code ${result.exitCode ?? 'unknown'}.`,
      ...result
    }
  }
  return null
}
