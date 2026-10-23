import {
  ORCAD_UPDATE_ADMISSION_FENCE_MS,
  type OrcadTerminalCensus
} from '../../shared/orcad-terminal-census'
import type { OrcadTerminalCensusRequestOptions } from './orcad-terminal-census-client'

/**
 * The counts an update makes against one incumbent. Only the last, just before the stop, closes
 * its terminal admission: the first precedes an upload that may take minutes.
 */
export function updateTerminalCounts(
  count: (options: OrcadTerminalCensusRequestOptions) => Promise<OrcadTerminalCensus>
): {
  countFirst: () => Promise<OrcadTerminalCensus>
  recountCensus: () => Promise<OrcadTerminalCensus>
  releaseIncumbentAdmission: () => Promise<void>
} {
  // Why release: finished automation shells would otherwise defer every update on a host with
  // schedules; the update restarts the server anyway.
  const release = { releaseFinishedAutomationTerminals: true }
  return {
    countFirst: () => count(release),
    recountCensus: () =>
      count({ ...release, closeAdmissionForMs: ORCAD_UPDATE_ADMISSION_FENCE_MS }),
    releaseIncumbentAdmission: async () => {
      await count({ closeAdmissionForMs: 0 })
    }
  }
}
