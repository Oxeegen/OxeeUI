import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { agentSessionThrownFailure } from '../../../../shared/agent-session-write-failure'
import { RuntimeRpcCallError } from '@/runtime/runtime-rpc-result'
import { agentSessionWriteFailureText } from './agent-session-write-notice-text'

/** A host's error is words for its log, so it gets the table's; a local surface's error is
 *  already written for the person. */
function optionUpdateFailureDescription(error: unknown): string {
  if (error instanceof RuntimeRpcCallError) {
    return agentSessionWriteFailureText(agentSessionThrownFailure(error, error.code), 'option')
  }
  return error instanceof Error ? error.message : String(error)
}

/** One picker write: marks `pendingKey` until it settles and reports a failure as a toast. */
export function runSessionOptionSurfaceCall(
  pendingKey: string,
  setPendingId: (id: string | null) => void,
  call: () => Promise<unknown>
): void {
  setPendingId(pendingKey)
  void call()
    .catch((error) => {
      toast.error(
        translate('components.native-chat.composer.optionUpdateFailed', 'Could not update option'),
        { description: optionUpdateFailureDescription(error) }
      )
    })
    .finally(() => setPendingId(null))
}
