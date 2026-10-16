import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicKnownRuntimeEnvironment } from '../../../../shared/runtime-environments'
import type { TuiAgent } from '../../../../shared/tui-agent'
import type * as RuntimeRpcClientModule from '@/runtime/runtime-rpc-client'
import { RuntimeRpcCallError } from '@/runtime/runtime-rpc-client'

const rpc = vi.hoisted(() => ({ call: vi.fn() }))
vi.mock('@/runtime/runtime-rpc-client', async (original) => ({
  ...(await original<typeof RuntimeRpcClientModule>()),
  callRuntimeRpc: rpc.call
}))
vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() }
}))
vi.mock('@/components/terminal-pane/pty-dispatcher', () => ({
  restorePtyDataHandlersAfterFailedShutdown: vi.fn(),
  unregisterPtyDataHandlers: vi.fn()
}))

// @ts-expect-error -- minimal API stub for the store under test
globalThis.window = { api: {} }
import { createTestStore } from './store-test-helpers'

function environment(pairingRevision: number): PublicKnownRuntimeEnvironment {
  return {
    id: 'detection-peer',
    name: 'Paired host',
    createdAt: 1,
    updatedAt: pairingRevision,
    pairingRevision,
    lastUsedAt: null,
    runtimeId: null,
    endpoints: [],
    preferredEndpointId: 'host'
  }
}

function deferredAgents() {
  let resolve!: (agents: TuiAgent[]) => void
  const promise = new Promise<TuiAgent[]>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

beforeEach(() => {
  rpc.call.mockReset()
  createTestStore().getState().clearRuntimeDetectedAgents('detection-peer')
})

describe('runtime detection across a re-pair', () => {
  it('sends an old refresh fallback only under the retired pairing, which main refuses', async () => {
    const store = createTestStore()
    let failOld!: (error: Error) => void
    rpc.call.mockReturnValueOnce(
      new Promise((_, reject) => {
        failOld = reject
      })
    )
    store.getState().setRuntimeEnvironments([environment(1)])
    const old = store.getState().refreshRuntimeDetectedAgents('detection-peer')
    store.getState().setRuntimeEnvironments([environment(2)])
    rpc.call.mockResolvedValueOnce(['codex'])
    await store.getState().ensureRuntimeDetectedAgents('detection-peer')
    // Main's transport refuses any request whose fence is not the current pairing.
    rpc.call.mockImplementationOnce(
      (
        _target,
        method: string,
        _params,
        fence?: { expectedEnvironmentPairingRevision?: number }
      ) =>
        fence?.expectedEnvironmentPairingRevision === 2
          ? Promise.resolve(['claude'])
          : Promise.reject(
              new RuntimeRpcCallError({
                id: method,
                ok: false,
                error: {
                  code: 'runtime_environment_changed',
                  message: 'Runtime environment pairing changed; refresh and try again'
                }
              })
            )
    )
    failOld(
      new RuntimeRpcCallError({
        id: 'refresh',
        ok: false,
        error: { code: 'method_not_found', message: 'Unsupported method' }
      })
    )
    await old
    expect(rpc.call).toHaveBeenCalledTimes(3)
    expect(rpc.call.mock.calls[2][1]).toBe('preflight.detectAgents')
    expect(rpc.call.mock.calls[2][3]).toEqual({ expectedEnvironmentPairingRevision: 1 })
    expect(store.getState().runtimeDetectedAgentIds['detection-peer']).toEqual(['codex'])
  })

  it.each(['detect', 'refresh'] as const)(
    'retires cached %s results when the environment is re-paired',
    async (operation) => {
      const store = createTestStore()
      store.getState().setRuntimeEnvironments([environment(1)])
      rpc.call.mockResolvedValueOnce(operation === 'detect' ? ['claude'] : { agents: ['claude'] })
      await (operation === 'detect'
        ? store.getState().ensureRuntimeDetectedAgents('detection-peer')
        : store.getState().refreshRuntimeDetectedAgents('detection-peer'))
      store.getState().setRuntimeEnvironments([environment(2)])
      expect(store.getState().runtimeDetectedAgentIds['detection-peer']).toBeUndefined()
      rpc.call.mockResolvedValueOnce(['codex'])
      await expect(store.getState().ensureRuntimeDetectedAgents('detection-peer')).resolves.toEqual(
        ['codex']
      )
      expect(rpc.call).toHaveBeenCalledTimes(2)
    }
  )

  it.each([
    ['detect', true],
    ['detect', false],
    ['refresh', true],
    ['refresh', false]
  ] as const)('fences old %s replies finishing first=%s', async (operation, oldFirst) => {
    const store = createTestStore()
    const oldReply = deferredAgents()
    const replacementReply = deferredAgents()
    rpc.call.mockReturnValueOnce(
      operation === 'detect' ? oldReply.promise : oldReply.promise.then((agents) => ({ agents }))
    )
    rpc.call.mockReturnValueOnce(replacementReply.promise)
    store.getState().setRuntimeEnvironments([environment(1)])
    const old =
      operation === 'detect'
        ? store.getState().ensureRuntimeDetectedAgents('detection-peer')
        : store.getState().refreshRuntimeDetectedAgents('detection-peer')
    store.getState().setRuntimeEnvironments([environment(2)])
    const current = store.getState().ensureRuntimeDetectedAgents('detection-peer')
    expect(current).not.toBe(old)
    expect(rpc.call).toHaveBeenCalledTimes(2)
    if (oldFirst) {
      oldReply.resolve(['claude'])
      await old
      expect(store.getState().runtimeDetectedAgentIds['detection-peer']).toBeUndefined()
      expect(store.getState().isDetectingRuntimeAgents['detection-peer']).toBe(true)
    }
    replacementReply.resolve(['codex'])
    await expect(current).resolves.toEqual(['codex'])
    if (!oldFirst) {
      oldReply.resolve(['claude'])
      await old
    }
    expect(store.getState().runtimeDetectedAgentIds['detection-peer']).toEqual(['codex'])
  })
})
