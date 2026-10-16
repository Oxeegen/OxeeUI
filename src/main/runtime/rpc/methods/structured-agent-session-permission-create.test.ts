import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  attachParams,
  call,
  clearStructuredHostStub,
  hostCalls,
  installStructuredHostStub,
  STRUCTURED_CLIENT
} from './structured-agent-session-rpc.test-fixture'

beforeEach(() => {
  installStructuredHostStub()
})
afterEach(() => {
  clearStructuredHostStub()
})

describe('legacy attach-shaped permission creation', () => {
  it.each(['agentSession.create', 'agentSession.ensure'] as const)(
    '%s gives a new record only the host permission seed',
    async (method) => {
      const seed = vi.fn(() => ({
        permissionMode: 'full-access',
        model: 'host-model',
        effort: 'high'
      }))
      const params = attachParams()
      expect(
        await call(method, params, STRUCTURED_CLIENT, {
          structuredAgentSessionLaunchSeedOptions: seed
        })
      ).toMatchObject({ ok: true })
      expect(hostCalls.attach).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          options: { permissionMode: 'full-access' },
          envelope: params.envelope
        })
      )
    }
  )
})
