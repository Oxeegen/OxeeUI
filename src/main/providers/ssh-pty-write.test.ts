import { describe, expect, it, vi } from 'vitest'
import { SshPtyProvider } from './ssh-pty-provider'

describe('SSH PTY writes', () => {
  it('rejects writes synchronously after the transport is disposed', () => {
    const mux = {
      isDisposed: vi.fn().mockReturnValue(true),
      notify: vi.fn(),
      onNotification: vi.fn()
    }
    const provider = new SshPtyProvider('conn-1', mux as never)

    expect(provider.write('ssh:conn-1@@pty-1', 'pointer')).toBe(false)
    expect(mux.notify).not.toHaveBeenCalled()
  })
})
