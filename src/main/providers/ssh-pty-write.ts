import type { SshChannelMultiplexer } from '../ssh/ssh-channel-multiplexer'

export function writeToSshPty(
  mux: SshChannelMultiplexer,
  relayPtyId: string,
  data: string
): boolean {
  if (mux.isDisposed()) {
    return false
  }
  mux.notify('pty.data', { id: relayPtyId, data })
  return !mux.isDisposed()
}
