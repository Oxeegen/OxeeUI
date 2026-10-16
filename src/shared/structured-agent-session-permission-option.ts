// The chat's permission mode as a picker descriptor: shows the mode the host states, never derives it.

import {
  AGENT_CHAT_PERMISSION_MODE_OPTION_ID,
  agentChatPermissionModes,
  chatModelSupportsAutoMode,
  offeredChatPermissionModes,
  type AgentChatPermissionMode
} from './agent-chat-permission-mode'
import type { AgentSessionOptionCatalog } from './agent-session-option-catalog'
import type { NativeChatSessionOptionRecord } from './native-chat-session-option-state'
import type { SessionOptionDescriptor } from './native-chat-session-options'

/** English names and descriptions for surfaces without a translation catalog. */
const MODE_COPY: Readonly<Record<AgentChatPermissionMode, { label: string; description: string }>> =
  {
    ask: {
      label: 'Ask for approval',
      description: "Asks before edits and commands your settings don't allow"
    },
    'accept-edits': {
      label: 'Accept edits',
      description: 'Approves file edits and file commands; asks for the rest'
    },
    auto: { label: 'Approve for me', description: 'Reviews approval requests for you' },
    'full-access': {
      label: 'Full access',
      description: 'Never asks before edits or commands'
    }
  }

const CODEX_DESCRIPTIONS: Partial<Record<AgentChatPermissionMode, string>> = {
  ask: 'Edits files and runs commands in this workspace; asks before anything else',
  'full-access': 'Never asks; can edit any file and use the network'
}

/** Only decides whether the menu offers Approve for me, by the host's own rule. */
function currentModelSupportsAutoMode(
  catalog: AgentSessionOptionCatalog | null,
  record: NativeChatSessionOptionRecord
): boolean {
  const model = record.model?.value
  return (
    catalog !== null &&
    chatModelSupportsAutoMode(catalog.models, typeof model === 'string' ? model : undefined)
  )
}

export function structuredAgentSessionPermissionDescriptor(state: {
  catalog: AgentSessionOptionCatalog | null
  record: NativeChatSessionOptionRecord
  permissionMode: string | null
}): SessionOptionDescriptor | null {
  const support = agentChatPermissionModes(state.record.agent)
  const current = support?.modes.find((mode) => mode === state.permissionMode)
  if (!support || !current) {
    return null
  }
  const offered = offeredChatPermissionModes(
    support,
    current === 'auto' || currentModelSupportsAutoMode(state.catalog, state.record)
  )
  return {
    id: AGENT_CHAT_PERMISSION_MODE_OPTION_ID,
    label: 'Permissions',
    category: 'mode',
    kind: {
      type: 'select',
      currentValue: current,
      choices: offered.map((value) => ({
        value,
        label: MODE_COPY[value].label,
        description:
          (state.record.agent === 'codex' ? CODEX_DESCRIPTIONS[value] : undefined) ??
          MODE_COPY[value].description
      }))
    },
    valueSource: 'applied',
    transport: 'agent-session',
    settable: true
  }
}
