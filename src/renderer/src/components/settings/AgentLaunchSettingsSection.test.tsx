// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGlobalSettingsFixture } from '../../../../shared/global-settings-test-fixture'
import { AgentLaunchSettingsSection } from './AgentLaunchSettingsSection'

const state = vi.hoisted(() => ({
  runtimeEnvironments: [{ id: 'ssh-host', name: 'SSH host', createdAt: 1, pairingRevision: 17 }],
  remote: vi.fn(),
  local: vi.fn()
}))
vi.mock('@/store', () => ({
  useAppStore: Object.assign(
    (selector: (value: { runtimeEnvironments: typeof state.runtimeEnvironments }) => unknown) =>
      selector({ runtimeEnvironments: state.runtimeEnvironments }),
    { getState: () => ({ settings: null }) }
  )
}))
vi.mock('./HostAgentLaunchSettings', async () => {
  const { useState } = await import('react')
  return {
    HostAgentLaunchSettings: (props: { environmentId: string; pairingRevision: number }) => {
      state.remote(props)
      // Stands in for unsaved edits: survives prop changes, dropped only by a remount.
      const [mountedAt] = useState(props.pairingRevision)
      return <p>Remote launch settings mounted at {mountedAt}</p>
    }
  }
})
vi.mock('./AgentLaunchSettingsCatalog', () => ({
  AgentLaunchSettingsCatalog: (props: unknown) => {
    state.local(props)
    return <p>Local launch settings</p>
  }
}))
afterEach(cleanup)
beforeEach(() => {
  state.runtimeEnvironments = [
    { id: 'ssh-host', name: 'SSH host', createdAt: 1, pairingRevision: 17 }
  ]
  state.remote.mockClear()
  state.local.mockClear()
})
const SSH_HOST = 'ssh-host'
const section = (environmentId: string | null) => (
  <AgentLaunchSettingsSection
    settings={createGlobalSettingsFixture({ activeRuntimeEnvironmentId: environmentId })}
    updateSettings={vi.fn()}
    environmentId={environmentId}
    renderPermissions={() => null}
  />
)

describe('launch settings host', () => {
  it("edits the Active Server's launch settings on that server", () => {
    render(section(SSH_HOST))
    expect(screen.getByText('Remote launch settings mounted at 17')).toBeTruthy()
    expect(state.remote.mock.calls[0]?.[0]).toMatchObject({
      environmentId: 'ssh-host',
      pairingRevision: 17,
      hostName: 'SSH host'
    })
    expect(state.local).not.toHaveBeenCalled()
  })

  it('edits desktop launch settings when there is no Active Server', () => {
    render(section(null))
    expect(screen.getByText('Local launch settings')).toBeTruthy()
    expect(state.remote).not.toHaveBeenCalled()
  })

  it('remounts the host form when its host is re-paired, dropping unsaved edits', () => {
    const { rerender } = render(section(SSH_HOST))
    expect(screen.getByText('Remote launch settings mounted at 17')).toBeTruthy()
    state.runtimeEnvironments = [
      { id: 'ssh-host', name: 'SSH host', createdAt: 1, pairingRevision: 18 }
    ]
    rerender(section(SSH_HOST))
    expect(screen.getByText('Remote launch settings mounted at 18')).toBeTruthy()
  })

  it('waits for the server list instead of displaying desktop defaults', () => {
    state.runtimeEnvironments = []
    render(section(SSH_HOST))
    expect(screen.getByText('Loading agent settings…')).toBeTruthy()
    expect(state.local).not.toHaveBeenCalled()
    expect(state.remote).not.toHaveBeenCalled()
  })
})
