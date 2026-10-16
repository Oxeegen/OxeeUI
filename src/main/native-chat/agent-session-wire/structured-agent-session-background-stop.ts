// A background Stop: the strip's Stop of one task, or of every task the records offer one.

import {
  agentChildWorkStopEvidence,
  agentChildWorkStopTargets,
  type AgentChildWorkStopAcknowledgement
} from '../../../shared/agent-child-work-stop-targets'
import type { AgentChildWorkEvidence } from '../../../shared/agent-status-child-work-evidence'
import type { AgentChildWorkView } from '../../../shared/agent-status-child-work-view'
import type { AgentSessionTurnContext } from './structured-agent-session-turns'

export type StructuredAgentSessionBackgroundStopInput = {
  taskId?: string
  /** The session's child records: a background Stop reaches the tasks they offer a stop. */
  childWork?: () => readonly AgentChildWorkView[] | undefined
  /** Hands the host the stops the provider accepted, as evidence about the runs it sent them to.
   *  Never throws: recording it is bookkeeping, and cannot fail the Stop. */
  acknowledgeStops?: (evidence: AgentChildWorkEvidence[]) => void
  /** Work the host could not list, read inside the Stop's step, and the provider child's end that
   *  reaches it; for an untargeted Stop only. */
  unlisted?: { present: () => boolean; stop: () => Promise<void> }
}

/** `atRest`: no turn runs, so ending the agent ends only the work no record lists. */
export async function stopStructuredAgentSessionBackgroundWork(
  ctx: Pick<AgentSessionTurnContext, 'adapter' | 'sessionId' | 'fence'>,
  input: StructuredAgentSessionBackgroundStopInput,
  atRest: () => boolean
): Promise<{ cancelled: boolean; stillRunning?: true }> {
  // Captured before the stop goes out: its acknowledgement may end only these runs.
  const targets = agentChildWorkStopTargets(input.childWork?.(), input.taskId)
  const acknowledged: AgentChildWorkStopAcknowledgement[] = []
  // Nothing listed has a stop to send; an agent without a stop route would refuse even none.
  const background =
    targets.length === 0
      ? undefined
      : await ctx.adapter
          .stopBackgroundTasks?.({
            sessionId: ctx.sessionId,
            fence: ctx.fence,
            taskIds: targets.map((target) => target.providerId),
            acknowledge: (acknowledgement) => void acknowledged.push(acknowledgement)
          })
          // A batch that fails part way still ended each run it was answered for first.
          .finally(() => {
            if (acknowledged.length > 0) {
              input.acknowledgeStops?.(
                agentChildWorkStopEvidence(targets, acknowledged, Date.now())
              )
            }
          })
  if (background?.stillRunning) {
    return background
  }
  // Work no record lists is reached only by ending the agent, never under a turn it runs. Read after
  // the listed stops: one ending can wake the agent into a turn of its own.
  if (input.unlisted?.present() && atRest()) {
    await input.unlisted.stop()
    return { cancelled: true }
  }
  return { cancelled: background?.cancelled === true }
}
