// Every phone gets bounded frames, whatever version its shell or page is; other clients keep the
// frames they had, `commands` included.

import { afterEach, beforeEach, expect, it } from 'vitest'
import type { AgentSessionSubscribeInput } from '../../../native-chat/agent-session-wire/structured-agent-session-subscribers'
import {
  call,
  clearStructuredHostStub,
  hostCalls,
  installStructuredHostStub,
  SESSION,
  STRUCTURED_CLIENT,
  STRUCTURED_MOBILE_CLIENT
} from './structured-agent-session-rpc.test-fixture'

beforeEach(installStructuredHostStub)
afterEach(clearStructuredHostStub)

it.each([
  // Being a phone is enough: no capability or param is asked of it.
  ['a phone of any version', STRUCTURED_MOBILE_CLIENT, true],
  ['a paired desktop', STRUCTURED_CLIENT, false],
  ['an in-process reader', undefined, false]
] as const)('subscribes %s with bounded frames: %s', async (_label, client, bounded) => {
  let input: AgentSessionSubscribeInput | undefined
  hostCalls.subscribe.mockImplementation((opened: AgentSessionSubscribeInput) => {
    input = opened
    opened.emit({ type: 'end' })
    return () => {}
  })
  await call('agentSession.subscribe', { sessionId: SESSION }, client)
  expect(input?.boundedFrames === true).toBe(bounded)
})
