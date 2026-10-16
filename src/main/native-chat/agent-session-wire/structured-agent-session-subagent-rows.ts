// Each subagent's own saved row, written from the host's record of it.
//
// The host's child-work records are the one account of a subagent, for every agent: what started
// it, which run is current and how that run ended. Its journal row is their durable copy, written
// here each time a record changes, where the subagent was spawned. The saved row is also the
// dedupe: a record that reads as its row already does writes nothing, and a write that fails is
// tried again by the next change after its batch settles, so nothing here holds an obligation of
// its own. What a lost write leaves saying `working` the journal's reopen pass settles as
// unverifiable.

import {
  AGENT_JOURNAL_THREAD_SCOPE,
  type AgentJournalTurnScope
} from '../../../shared/agent-session-journal-types'
import type { AgentChildWorkInput } from '../../../shared/agent-status-child-work'
import type { AgentChildWorkView } from '../../../shared/agent-status-child-work-view'
import type {
  NativeChatSubagentBlock,
  NativeChatSubagentState
} from '../../../shared/native-chat-types'
import { structuredRunningChildWork } from '../../../shared/agent-child-work-listing'
import type { AgentSessionJournal } from '../agent-session-journal/journal-store'
import {
  journaledSubagent,
  subagentJournalBody,
  subagentJournalItemIdentity
} from '../agent-session-journal/journal-subagent-item'

const UNNAMED = 'subagent'
const THREAD_GROUP = 'thread'

/** A child's view, with the host-only facts its saved row also keeps. */
export type AgentChildWorkRowView = AgentChildWorkView &
  Pick<AgentChildWorkInput, 'outcomeBasis' | 'residency'>

type Row = { block: NativeChatSubagentBlock; turnScope: AgentJournalTurnScope }

export type StructuredAgentSessionSubagentRowsDeps = {
  journal: (sessionId: string) => AgentSessionJournal | undefined
  fence: (sessionId: string) => number
  readChildWork: (sessionId: string) => AgentChildWorkRowView[] | undefined
  onWriteFailed: (sessionId: string, error: unknown) => void
}

export class StructuredAgentSessionSubagentRows {
  /** Rows waiting for the session's writer, newest per subagent. */
  private readonly queued = new Map<string, Map<string, Row>>()
  /** The batch each session's writer has in flight: written, but not yet readable by key. */
  private readonly writing = new Map<string, Map<string, Row>>()

  constructor(private readonly deps: StructuredAgentSessionSubagentRowsDeps) {}

  /** The session's child records changed: queue each subagent whose row says otherwise. */
  changed(sessionId: string): void {
    const journal = this.deps.journal(sessionId)
    const children = this.deps.readChildWork(sessionId)
    if (!journal || !children?.some((child) => child.kind === 'agent')) {
      return
    }
    const queued = this.queued.get(sessionId) ?? new Map<string, Row>()
    const providerIds = new Map(children.map((child) => [child.id, child.providerId]))
    // The strip's rule: a child that finished while work it started runs is still running.
    const running = new Set(structuredRunningChildWork(children).map((child) => child.id))
    // A full journal pass, so read once, and only for a first row: a revision keeps the scope
    // its first write froze.
    let live: AgentJournalTurnScope | undefined
    for (const child of children) {
      const id = child.providerId
      if (child.kind !== 'agent' || id === undefined) {
        continue
      }
      const pending = queued.get(id) ?? this.writing.get(sessionId)?.get(id)
      const saved = pending?.block ?? journaledSubagent(journal, id)
      const turnScope =
        pending?.turnScope ??
        (saved ? AGENT_JOURNAL_THREAD_SCOPE : (live ??= journal.liveTurnScope()))
      const parentId =
        child.parentChildWorkId === undefined ? undefined : providerIds.get(child.parentChildWorkId)
      const block = subagentRowBlock(child, id, parentId, saved, turnScope, running.has(child.id))
      if (!saved || rowText(saved) !== rowText(block)) {
        queued.set(id, { block, turnScope })
      }
    }
    if (queued.size > 0) {
      this.queued.set(sessionId, queued)
      void this.write(sessionId)
    }
  }

  private async write(sessionId: string): Promise<void> {
    if (this.writing.has(sessionId)) {
      return
    }
    try {
      for (let rows = this.take(sessionId); rows; rows = this.take(sessionId)) {
        const journal = this.deps.journal(sessionId)
        // A closed conversation's unwritten rows are the reopen pass's to settle.
        if (!journal) {
          return
        }
        this.writing.set(sessionId, rows)
        // The journal serializes its writes; these land in the order they were queued.
        await Promise.all(
          [...rows].map(([id, row]) =>
            journal
              .appendItem(subagentJournalItemIdentity(id), subagentJournalBody(row.block), {
                fence: this.deps.fence(sessionId),
                turnScope: row.turnScope
              })
              .catch((error: unknown) => this.deps.onWriteFailed(sessionId, error))
          )
        )
      }
    } finally {
      this.writing.delete(sessionId)
    }
  }

  private take(sessionId: string): Map<string, Row> | undefined {
    const rows = this.queued.get(sessionId)
    this.queued.delete(sessionId)
    return rows
  }
}

/** The record as its row says it. A saved row keeps where it was spawned, and what a record of a
 *  later run no longer carries: its name, its tokens, its parent. */
function subagentRowBlock(
  child: AgentChildWorkRowView,
  id: string,
  parentId: string | undefined,
  saved: NativeChatSubagentBlock | null,
  scope: AgentJournalTurnScope,
  running: boolean
): NativeChatSubagentBlock {
  const run = child.invocation.invocationId
  const state = running ? (child.state === 'idle' ? 'idle' : 'working') : subagentEnding(child)
  const tokens = child.totalTokens ?? saved?.tokens
  const parent = parentId ?? saved?.parentId
  // A new run starts its clock when the host first saw it; the first run when the child was.
  const startedAt =
    saved === null
      ? child.firstObservedAt
      : saved.run === run
        ? (saved.startedAt ?? child.firstObservedAt)
        : child.observedAt
  return {
    type: 'subagent',
    id,
    label: child.description ?? child.name ?? saved?.label ?? UNNAMED,
    state,
    ...(tokens !== undefined ? { tokens } : {}),
    startedAt,
    ...(state !== 'working' && child.settledAt !== undefined ? { settledAt: child.settledAt } : {}),
    groupId: saved?.groupId ?? (scope.kind === 'turn' ? scope.turnItemId : THREAD_GROUP),
    ...(parent !== undefined ? { parentId: parent } : {}),
    run,
    ...(!running && child.outcomeBasis !== undefined ? { outcomeBasis: child.outcomeBasis } : {}),
    ...(child.residency === 'background' ? { background: true as const } : {})
  }
}

function subagentEnding(child: AgentChildWorkRowView): NativeChatSubagentState {
  switch (child.outcome) {
    case 'succeeded':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'cancelled':
      return 'stopped'
    case 'unknown':
    case undefined:
      return 'unverifiable'
  }
}

/** Compared as written, so a row the journal bounded still matches the record it came from. */
function rowText(block: NativeChatSubagentBlock): string {
  return JSON.stringify(subagentJournalBody(block).blocks[1])
}
