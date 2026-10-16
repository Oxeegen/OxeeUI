import type {
  AgentSessionExecutionLocation,
  AgentSessionRecord
} from '../../../shared/agent-session-record'
import type { AgentSessionStatusSummary } from '../../../shared/agent-session-wire'
import type { AgentChildWorkEvidence } from '../../../shared/agent-status-child-work-evidence'
import type { AgentChildWorkReconcileOutcome } from '../../../shared/agent-status-child-work-evidence-admission'
import type { AgentChildWorkRecord } from '../../../shared/agent-status-child-work'
import type { AgentChildWorkView } from '../../../shared/agent-status-child-work-view'
import {
  parseAgentStatusSubject,
  serializeAgentStatusSubject,
  type AgentStatusStructuredSessionSubject
} from '../../../shared/agent-status-subject'

export type StructuredAgentSessionStatusSink = {
  publish: (
    summary: AgentSessionStatusSummary,
    subject: AgentStatusStructuredSessionSubject
  ) => void
  forget: (subject: AgentStatusStructuredSessionSubject) => void
  /** The session's child-work evidence, addressed by the subject its parent row landed under. */
  publishChildWork?: (
    subject: AgentStatusStructuredSessionSubject,
    evidence: AgentChildWorkEvidence[],
    provider: AgentSessionRecord['provider']
  ) => AgentChildWorkReconcileOutcome | null | void
  /** The child records the sink holds for that subject, as the views every surface reads. */
  readChildWork?: (subject: AgentStatusStructuredSessionSubject) => AgentChildWorkView[]
  /** The records those views project, with the host-only facts no view carries. */
  readChildWorkRecords?: (subject: AgentStatusStructuredSessionSubject) => AgentChildWorkRecord[]
}

/** The store's limits refusing a record: the per-session one, and the store's own. */
const ROOM_REFUSALS: ReadonlySet<string> = new Set(['ingestion-limit', 'store-rejected'])
/** Refused children remembered per session; past it only the session's end clears the flag. */
const MAX_REFUSED_CHILDREN = 512

type RefusedChildren = { handles: Set<string>; overflowed: boolean }

/** Retain the owner address because record removal may precede the final status callback. */
export class StructuredAgentSessionStatusOwnership {
  private readonly subjects = new Map<string, AgentStatusStructuredSessionSubject>()
  // Why separate from `subjects`: the address must survive a throwing publish so teardown can still
  // forget a row that did land, but "we hold an address" is not evidence the row is there. Only a
  // publish that returned proves that, and only that proof may suppress the re-offer below.
  private readonly landed = new Set<string>()
  /** Per session, the children the store refused for room, by handle. Each leaves once a later
   *  report of it is admitted or it reports its own end; the provider session's end, which ends
   *  every child it ran, clears them all. */
  private readonly refused = new Map<string, RefusedChildren>()

  constructor(private readonly sink: () => StructuredAgentSessionStatusSink | undefined) {}

  matchesLocation(sessionId: string, location: AgentSessionExecutionLocation): boolean {
    const subject = this.subjects.get(sessionId)
    return (
      this.landed.has(sessionId) &&
      subject?.executionHostId === location.executionHostId &&
      subject.wslDistro === location.wslDistro &&
      subject.workspaceId === location.workspaceId &&
      subject.workspaceKind === location.workspaceKind
    )
  }

  publish(summary: AgentSessionStatusSummary, location?: AgentSessionExecutionLocation): void {
    const sink = this.sink()
    if (!sink || (!location && !this.subjects.has(summary.sessionId))) {
      return
    }
    const subject = location
      ? parseAgentStatusSubject({
          ...location,
          kind: 'structured-session',
          sessionId: summary.sessionId
        })
      : this.subjects.get(summary.sessionId)
    if (!subject || subject.kind !== 'structured-session') {
      throw new Error('Structured status requires its full trusted execution location')
    }
    const previous = this.subjects.get(summary.sessionId)
    if (
      previous &&
      serializeAgentStatusSubject(previous) !== serializeAgentStatusSubject(subject)
    ) {
      sink.forget(previous)
    }
    this.subjects.set(summary.sessionId, subject)
    this.landed.delete(summary.sessionId)
    sink.publish(summary, subject)
    this.landed.add(summary.sessionId)
  }

  /** Children ride the address the parent landed under: without that proof the store would
   *  refuse them anyway, and offering them earlier would race the parent row. */
  publishChildWork(
    sessionId: string,
    evidence: AgentChildWorkEvidence[],
    provider: AgentSessionRecord['provider']
  ): void {
    const subject = this.subjects.get(sessionId)
    if (!subject || !this.landed.has(sessionId)) {
      return
    }
    const outcome = this.sink()?.publishChildWork?.(subject, evidence, provider)
    if (evidence.some((edge) => edge.type === 'session-ended')) {
      this.refused.delete(sessionId)
    } else if (typeof outcome === 'object') {
      this.followRefusals(sessionId, evidence, outcome)
    }
  }

  /** Whether some of the session's running child work has no record. */
  childWorkIncomplete(sessionId: string): boolean {
    return this.refused.has(sessionId)
  }

  /** `null`: the sink holds no parent row, so it recorded none of these children. */
  private followRefusals(
    sessionId: string,
    evidence: readonly AgentChildWorkEvidence[],
    outcome: AgentChildWorkReconcileOutcome | null
  ): void {
    const refusedNow = new Set(
      outcome?.rejected.filter(({ reason }) => ROOM_REFUSALS.has(reason)).map((r) => r.handleId)
    )
    const refused = this.refused.get(sessionId) ?? { handles: new Set(), overflowed: false }
    for (const edge of evidence) {
      if (edge.type === 'live' && (outcome === null || refusedNow.has(edge.child.handle.id))) {
        if (refused.handles.size < MAX_REFUSED_CHILDREN) {
          refused.handles.add(edge.child.handle.id)
        } else {
          refused.overflowed = true
        }
      } else if (edge.type === 'live') {
        refused.handles.delete(edge.child.handle.id)
      } else if (edge.type === 'ended' || edge.type === 'removed') {
        refused.handles.delete(edge.handle.id)
      }
    }
    if (refused.handles.size > 0 || refused.overflowed) {
      this.refused.set(sessionId, refused)
    } else {
      this.refused.delete(sessionId)
    }
  }

  /** Undefined until the parent row has landed: a sink holds no children for a parent it lacks. */
  readChildWork(sessionId: string): AgentChildWorkView[] | undefined {
    const subject = this.subjects.get(sessionId)
    return subject && this.landed.has(sessionId) ? this.sink()?.readChildWork?.(subject) : undefined
  }

  readChildWorkRecords(sessionId: string): AgentChildWorkRecord[] | undefined {
    const subject = this.subjects.get(sessionId)
    return subject && this.landed.has(sessionId)
      ? this.sink()?.readChildWorkRecords?.(subject)
      : undefined
  }

  forget(sessionId: string): void {
    const subject = this.subjects.get(sessionId)
    if (!subject) {
      return
    }
    this.landed.delete(sessionId)
    this.refused.delete(sessionId)
    this.sink()?.forget(subject)
    this.subjects.delete(sessionId)
  }
}
