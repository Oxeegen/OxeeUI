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

  it('reports a failed transport settlement instead of enqueue acceptance', async () => {
    let settle: ((result: { ok: true } | { ok: false; error: Error }) => void) | undefined
    const mux = {
      isDisposed: vi.fn().mockReturnValue(false),
      notify: vi.fn(),
      notifyWithSettlement: vi.fn((_method, _params, onSettled) => {
        settle = onSettled
      }),
      onNotification: vi.fn()
    }
    const provider = new SshPtyProvider('conn-1', mux as never)

    const pending = provider.writeWithSettlement('ssh:conn-1@@pty-1', 'pointer')
    expect(mux.notifyWithSettlement).toHaveBeenCalledWith(
      'pty.data',
      { id: 'pty-1', data: 'pointer' },
      expect.any(Function)
    )
    settle?.({ ok: false, error: new Error('transport rejected write') })

    await expect(pending).resolves.toBe(false)
  })
})
