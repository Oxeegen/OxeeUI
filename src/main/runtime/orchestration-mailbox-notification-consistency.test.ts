import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ORCHESTRATION_CONTRACT_VERSION } from '../../shared/protocol-version'
import type Database from '../sqlite/sync-database'
import { OrcaRuntimeService } from './orca-runtime'
import { OrchestrationDb } from './orchestration/db'
import { RpcDispatcher } from './rpc/dispatcher'
import { ORCHESTRATION_METHODS } from './rpc/methods/orchestration'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => tmpdir()), isPackaged: false },
  BrowserWindow: { fromId: vi.fn(() => null) },
  ipcMain: { on: vi.fn(), removeListener: vi.fn() },
  webContents: { fromId: vi.fn(() => null) }
}))

const TAB_ID = '11111111-1111-4111-8111-111111111111'
const LEAF_ID = '22222222-2222-4222-8222-222222222222'
const PANE_KEY = `${TAB_ID}:${LEAF_ID}`
const PTY_ID = 'pty-mailbox'
const TERMINAL_HANDLE = 'term_mailbox_consistency'
const SECOND_TAB_ID = '33333333-3333-4333-8333-333333333333'
const SECOND_LEAF_ID = '44444444-4444-4444-8444-444444444444'
const SECOND_PANE_KEY = `${SECOND_TAB_ID}:${SECOND_LEAF_ID}`
const SECOND_PTY_ID = 'pty-mailbox-second'
const SECOND_TERMINAL_HANDLE = 'term_mailbox_consistency_second'
const SECOND_LAUNCH_TOKEN = 'mailbox-consistency-second-launch'
const WORKTREE_ID = 'repo-mailbox::/tmp/mailbox'
const LAUNCH_TOKEN = 'mailbox-consistency-launch'
const temporaryDirectories: string[] = []

function createDatabase(prefix: string): OrchestrationDb {
  const directory = mkdtempSync(join(tmpdir(), prefix))
  temporaryDirectories.push(directory)
  return new OrchestrationDb(join(directory, 'orchestration.db'))
}

function sqliteFor(db: OrchestrationDb): Database.Database {
  return (db as unknown as { db: Database.Database }).db
}

function createBoundRun(db: OrchestrationDb, objective: string) {
  return db.createRun({
    objective,
    coordinatorHandle: TERMINAL_HANDLE,
    coordinatorPaneKey: PANE_KEY
  })
}

function insertDirectRunMessage(db: OrchestrationDb, runId: string, subject: string) {
  return db.insertMessage({
    from: 'term_worker',
    to: TERMINAL_HANDLE,
    subject,
    type: 'status',
    runId,
    deliveryContract: 'current_delivery'
  })
}

type Harness = {
  runtime: OrcaRuntimeService
  write: ReturnType<typeof vi.fn>
}

type CheckResult = {
  runId: string
  dispatchId?: string
  deliveryId: string | null
  count: number
  messages: unknown[]
  acknowledged?: string | null
}

function createRuntime(db: OrchestrationDb): Harness {
  const runtime = new OrcaRuntimeService(null, undefined, {
    attestAgentHookCompatibilityAuthority: ({ paneKey }) =>
      paneKey === PANE_KEY || paneKey.startsWith(`${SECOND_TAB_ID}:`)
        ? { paneKey, source: 'current_hook' }
        : null
  })
  const write = vi.fn(() => true)
  runtime.setOrchestrationDb(db)
  runtime.setPtyController({
    write,
    kill: vi.fn(),
    getForegroundProcess: async () => null
  })
  runtime.registerPty(PTY_ID, WORKTREE_ID, null, {
    tabId: TAB_ID,
    leafId: LEAF_ID,
    incarnationId: 'mailbox-incarnation',
    agentLaunchAuthority: { launchToken: LAUNCH_TOKEN, launchAgent: 'codex' }
  })
  runtime.registerPreAllocatedHandleForPty(PTY_ID, TERMINAL_HANDLE)
  runtime.attachWindow(1)
  runtime.syncWindowGraph(1, {
    tabs: [
      {
        tabId: TAB_ID,
        worktreeId: WORKTREE_ID,
        title: 'Codex',
        activeLeafId: LEAF_ID,
        layout: null
      }
    ],
    leaves: [
      {
        tabId: TAB_ID,
        worktreeId: WORKTREE_ID,
        leafId: LEAF_ID,
        paneRuntimeId: 1,
        ptyId: PTY_ID
      }
    ]
  })
  return { runtime, write }
}

function registerSecondPane(
  runtime: OrcaRuntimeService,
  leafId = SECOND_LEAF_ID,
  includeFirstPane = true
): void {
  runtime.registerPty(SECOND_PTY_ID, WORKTREE_ID, null, {
    tabId: SECOND_TAB_ID,
    leafId,
    incarnationId: 'mailbox-second-incarnation',
    agentLaunchAuthority: { launchToken: SECOND_LAUNCH_TOKEN, launchAgent: 'codex' }
  })
  runtime.registerPreAllocatedHandleForPty(SECOND_PTY_ID, SECOND_TERMINAL_HANDLE)
  runtime.syncWindowGraph(1, {
    tabs: [
      ...(includeFirstPane
        ? [
            {
              tabId: TAB_ID,
              worktreeId: WORKTREE_ID,
              title: 'Codex',
              activeLeafId: LEAF_ID,
              layout: null
            }
          ]
        : []),
      {
        tabId: SECOND_TAB_ID,
        worktreeId: WORKTREE_ID,
        title: 'Codex',
        activeLeafId: leafId,
        layout: null
      }
    ],
    leaves: [
      ...(includeFirstPane
        ? [
            {
              tabId: TAB_ID,
              worktreeId: WORKTREE_ID,
              leafId: LEAF_ID,
              paneRuntimeId: 1,
              ptyId: PTY_ID
            }
          ]
        : []),
      {
        tabId: SECOND_TAB_ID,
        worktreeId: WORKTREE_ID,
        leafId,
        paneRuntimeId: 2,
        ptyId: SECOND_PTY_ID
      }
    ]
  })
}

async function driveToLiveIdle(runtime: OrcaRuntimeService): Promise<void> {
  await runtime.listTerminals()
  runtime.onPtyData(PTY_ID, '\x1b]0;Codex working\x07', 1)
  runtime.onPtyData(PTY_ID, '\x1b]0;Codex done\x07', 2)
  await Promise.resolve()
}

function pointerCount(write: ReturnType<typeof vi.fn>): number {
  return write.mock.calls.filter(([, payload]) =>
    String(payload).includes('orca orchestration check')
  ).length
}

async function checkBoundMailbox(
  runtime: OrcaRuntimeService,
  options: {
    ack?: string
    wait?: boolean
    terminal?: string
    paneKey?: string
    launchToken?: string
  } = {}
): Promise<CheckResult> {
  const terminal = options.terminal ?? TERMINAL_HANDLE
  const response = await new RpcDispatcher({ runtime, methods: ORCHESTRATION_METHODS }).dispatch({
    id: 'req-mailbox-consistency',
    authToken: 'test-auth-token',
    method: 'orchestration.check',
    orchestrationContractVersion: ORCHESTRATION_CONTRACT_VERSION,
    orchestrationCompatibilityEvidence: {
      terminalHandle: terminal,
      paneKey: options.paneKey ?? PANE_KEY,
      launchToken: options.launchToken ?? LAUNCH_TOKEN
    },
    params: {
      terminal,
      ...(options.ack ? { ack: options.ack } : {}),
      ...(options.wait ? { wait: true, timeoutMs: 5_000 } : {})
    }
  })
  expect(response.ok).toBe(true)
  if (!response.ok) {
    throw new Error(response.error.message)
  }
  return response.result as CheckResult
}

describe('orchestration notification mailbox consistency', () => {
  afterEach(() => {
    vi.useRealTimers()
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('never points direct Run A mail after the pane is rebound to Run B', async () => {
    vi.useFakeTimers()
    const db = createDatabase('orca-mailbox-consistency-')
    const first = createRuntime(db)
    const runA = createBoundRun(db, 'Run A')
    const staleDirectMessage = insertDirectRunMessage(db, runA.id, 'Run A completion')
    const runB = createBoundRun(db, 'Run B')

    await driveToLiveIdle(first.runtime)
    const checked = await checkBoundMailbox(first.runtime)
    const mismatch = pointerCount(first.write) > 0 && checked.count === 0

    expect(mismatch).toBe(false)
    expect(checked).toMatchObject({
      runId: runB.id,
      deliveryId: null,
      count: 0,
      messages: []
    })
    expect(db.getMessageById(staleDirectMessage.id)).toMatchObject({
      read: 0,
      delivered_at: null
    })
    db.close()
  })

  it('reconciles the persisted production mismatch after runtime restart', async () => {
    vi.useFakeTimers()
    const directory = mkdtempSync(join(tmpdir(), 'orca-mailbox-upgrade-restart-'))
    temporaryDirectories.push(directory)
    const dbPath = join(directory, 'orchestration.db')
    const oldDb = new OrchestrationDb(dbPath)
    const runA = createBoundRun(oldDb, 'Persisted Run A')
    const message = insertDirectRunMessage(oldDb, runA.id, 'Persisted Run A completion')
    createBoundRun(oldDb, 'Persisted Run B')
    sqliteFor(oldDb)
      .prepare('UPDATE messages SET to_handle = ? WHERE id = ?')
      .run(TERMINAL_HANDLE, message.id)
    oldDb.close()

    const restartedDb = new OrchestrationDb(dbPath)
    const restarted = createRuntime(restartedDb)
    await driveToLiveIdle(restarted.runtime)

    expect(pointerCount(restarted.write)).toBe(0)
    expect(restartedDb.getMessageById(message.id)).toMatchObject({
      to_handle: `run:${runA.id}`,
      read: 0,
      delivered_at: null
    })

    registerSecondPane(restarted.runtime)
    restartedDb.bindRun({
      runId: runA.id,
      coordinatorHandle: SECOND_TERMINAL_HANDLE,
      coordinatorPaneKey: SECOND_PANE_KEY
    })
    restarted.runtime.onPtyData(SECOND_PTY_ID, '\x1b]0;Codex working\x07', 1)
    restarted.runtime.onPtyData(SECOND_PTY_ID, '\x1b]0;Codex done\x07', 2)
    const checked = await checkBoundMailbox(restarted.runtime, {
      terminal: SECOND_TERMINAL_HANDLE,
      paneKey: SECOND_PANE_KEY,
      launchToken: SECOND_LAUNCH_TOKEN
    })

    expect(checked).toMatchObject({ runId: runA.id, count: 1 })
    expect(checked.messages).toEqual([expect.objectContaining({ id: message.id })])
    restartedDb.close()
  })

  it('pages a large persisted mismatch and coalesces each mailbox wake', async () => {
    vi.useFakeTimers()
    const db = createDatabase('orca-mailbox-paged-reconciliation-')
    const harness = createRuntime(db)
    const runA = createBoundRun(db, 'Backlog Run A')
    const messages = Array.from({ length: 151 }, (_, index) =>
      insertDirectRunMessage(db, runA.id, `Backlog message ${index}`)
    )
    createBoundRun(db, 'Backlog Run B')
    const placeholders = messages.map(() => '?').join(',')
    sqliteFor(db)
      .prepare(`UPDATE messages SET to_handle = ? WHERE id IN (${placeholders})`)
      .run(TERMINAL_HANDLE, ...messages.map((message) => message.id))
    const notify = vi.spyOn(harness.runtime, 'notifyMessageArrived')
    const directRemaining = (): number =>
      (
        sqliteFor(db)
          .prepare('SELECT COUNT(*) AS count FROM messages WHERE to_handle = ?')
          .get(TERMINAL_HANDLE) as { count: number }
      ).count

    await driveToLiveIdle(harness.runtime)
    expect(directRemaining()).toBe(101)
    expect(notify).toHaveBeenCalledTimes(1)

    await vi.advanceTimersToNextTimerAsync()
    expect(directRemaining()).toBe(51)
    expect(notify).toHaveBeenCalledTimes(2)
    await vi.advanceTimersToNextTimerAsync()
    expect(directRemaining()).toBe(1)
    expect(notify).toHaveBeenCalledTimes(3)
    await vi.advanceTimersToNextTimerAsync()
    expect(directRemaining()).toBe(0)
    expect(notify).toHaveBeenCalledTimes(4)
    expect(pointerCount(harness.write)).toBe(0)
    db.close()
  })

  it('does not submit or replay a pointer after ownership changes during Enter delay', async () => {
    vi.useFakeTimers()
    const directory = mkdtempSync(join(tmpdir(), 'orca-mailbox-restart-'))
    temporaryDirectories.push(directory)
    const dbPath = join(directory, 'orchestration.db')
    const firstDb = new OrchestrationDb(dbPath)
    const first = createRuntime(firstDb)
    const runA = createBoundRun(firstDb, 'Run A')
    const message = insertDirectRunMessage(firstDb, runA.id, 'Run A completion')
    await driveToLiveIdle(first.runtime)
    expect(pointerCount(first.write)).toBe(1)

    const runB = createBoundRun(firstDb, 'Run B')
    await vi.advanceTimersByTimeAsync(500)
    expect(first.write.mock.calls.filter(([, payload]) => payload === '\r')).toHaveLength(0)
    expect(firstDb.getMessageById(message.id)?.delivered_at).toBeNull()
    firstDb.close()

    const restartedDb = new OrchestrationDb(dbPath)
    const restarted = createRuntime(restartedDb)
    await driveToLiveIdle(restarted.runtime)
    const checked = await checkBoundMailbox(restarted.runtime)
    const replayedMismatch = pointerCount(restarted.write) > 0 && checked.count === 0

    expect(replayedMismatch).toBe(false)
    expect(checked).toMatchObject({ runId: runB.id, deliveryId: null, count: 0, messages: [] })
    expect(restartedDb.getMessageById(message.id)).toMatchObject({
      read: 0,
      delivered_at: null
    })
    restartedDb.close()
  })

  it('fences the pointed mailbox instead of checking a rebound empty Run', async () => {
    vi.useFakeTimers()
    const db = createDatabase('orca-mailbox-post-submit-rebind-')
    const harness = createRuntime(db)
    const runA = createBoundRun(db, 'Run A')
    insertDirectRunMessage(db, runA.id, 'Run A completion')

    await driveToLiveIdle(harness.runtime)
    await vi.advanceTimersByTimeAsync(500)
    expect(harness.write).toHaveBeenCalledWith(
      PTY_ID,
      expect.stringContaining(`orchestration check --run ${runA.id}`)
    )

    db.bindRun({
      runId: runA.id,
      coordinatorHandle: 'term_new_coordinator',
      coordinatorPaneKey:
        '55555555-5555-4555-8555-555555555555:66666666-6666-4666-8666-666666666666'
    })
    const runB = createBoundRun(db, 'Run B')
    const response = await new RpcDispatcher({
      runtime: harness.runtime,
      methods: ORCHESTRATION_METHODS
    }).dispatch({
      id: 'req-pointed-mailbox-fenced',
      authToken: 'test-auth-token',
      method: 'orchestration.check',
      orchestrationContractVersion: ORCHESTRATION_CONTRACT_VERSION,
      orchestrationCompatibilityEvidence: {
        terminalHandle: TERMINAL_HANDLE,
        paneKey: PANE_KEY,
        launchToken: LAUNCH_TOKEN
      },
      params: { terminal: TERMINAL_HANDLE, run: runA.id }
    })

    expect(response).toMatchObject({
      ok: false,
      error: { code: 'consumer_fenced' }
    })
    const generic = await checkBoundMailbox(harness.runtime)
    expect(generic).toMatchObject({ runId: runB.id, count: 0 })
    db.close()
  })

  it('releases a staged pointer when its Run moves to another live pane', async () => {
    vi.useFakeTimers()
    const db = createDatabase('orca-mailbox-live-rebind-')
    const harness = createRuntime(db)
    const runA = createBoundRun(db, 'Run A')
    const message = insertDirectRunMessage(db, runA.id, 'Run A completion')
    await driveToLiveIdle(harness.runtime)
    expect(pointerCount(harness.write)).toBe(1)

    createBoundRun(db, 'Run B')
    registerSecondPane(harness.runtime, SECOND_LEAF_ID, false)
    db.bindRun({
      runId: runA.id,
      coordinatorHandle: SECOND_TERMINAL_HANDLE,
      coordinatorPaneKey: SECOND_PANE_KEY
    })
    harness.runtime.onPtyData(SECOND_PTY_ID, '\x1b]0;Codex working\x07', 1)
    harness.runtime.onPtyData(SECOND_PTY_ID, '\x1b]0;Codex done\x07', 2)
    await vi.advanceTimersByTimeAsync(500)

    expect(
      harness.write.mock.calls.filter(
        ([ptyId, payload]) =>
          ptyId === SECOND_PTY_ID && String(payload).includes('orca orchestration check')
      )
    ).toHaveLength(1)
    expect(
      harness.write.mock.calls.filter(([ptyId, payload]) => ptyId === PTY_ID && payload === '\r')
    ).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(500)
    const checked = await checkBoundMailbox(harness.runtime, {
      terminal: SECOND_TERMINAL_HANDLE,
      paneKey: SECOND_PANE_KEY,
      launchToken: SECOND_LAUNCH_TOKEN
    })
    expect(checked).toMatchObject({ runId: runA.id, count: 1 })
    expect(checked.messages).toEqual([expect.objectContaining({ id: message.id })])
    db.close()
  })

  it('serializes equivalent panes while newer mail arrives during Enter delay', async () => {
    vi.useFakeTimers()
    const db = createDatabase('orca-mailbox-equivalent-pane-flight-')
    const harness = createRuntime(db)
    const run = createBoundRun(db, 'Equivalent pane Run')
    const first = insertDirectRunMessage(db, run.id, 'First status')
    await driveToLiveIdle(harness.runtime)
    expect(pointerCount(harness.write)).toBe(1)

    registerSecondPane(harness.runtime, LEAF_ID)
    const second = db.insertMessage({
      from: 'term_worker',
      to: `run:${run.id}`,
      subject: 'Second status',
      runId: run.id
    })
    harness.runtime.onPtyData(SECOND_PTY_ID, '\x1b]0;Codex working\x07', 1)
    harness.runtime.onPtyData(SECOND_PTY_ID, '\x1b]0;Codex done\x07', 2)
    await Promise.resolve()
    expect(
      harness.write.mock.calls.filter(
        ([ptyId, payload]) =>
          ptyId === SECOND_PTY_ID && String(payload).includes('orca orchestration check')
      )
    ).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(500)
    expect(
      harness.write.mock.calls.filter(
        ([ptyId, payload]) =>
          ptyId === PTY_ID && String(payload).includes('orca orchestration check')
      )
    ).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(500)

    const checked = await checkBoundMailbox(harness.runtime)
    expect(checked).toMatchObject({ runId: run.id, count: 2 })
    expect(checked.messages).toEqual(
      [first, second].map((message) => expect.objectContaining({ id: message.id }))
    )
    db.close()
  })

  it('does not submit or duplicate a pointer after the agent becomes working', async () => {
    vi.useFakeTimers()
    const db = createDatabase('orca-mailbox-working-before-enter-')
    const harness = createRuntime(db)
    const run = createBoundRun(db, 'Working-before-Enter Run')
    const message = insertDirectRunMessage(db, run.id, 'Actionable status')

    await driveToLiveIdle(harness.runtime)
    expect(pointerCount(harness.write)).toBe(1)
    harness.runtime.onPtyData(PTY_ID, '\x1b]0;Codex working\x07', 3)
    await vi.advanceTimersByTimeAsync(500)

    expect(harness.write.mock.calls.filter(([, payload]) => payload === '\r')).toHaveLength(0)
    expect(db.getMessageById(message.id)?.delivered_at).toBeNull()
    harness.runtime.onPtyData(PTY_ID, '\x1b]0;Codex done\x07', 4)
    await Promise.resolve()
    expect(pointerCount(harness.write)).toBe(1)
    db.close()
  })

  it('releases staged pointer state when an explicit check owns the batch', async () => {
    vi.useFakeTimers()
    const db = createDatabase('orca-mailbox-explicit-check-')
    const harness = createRuntime(db)
    const run = createBoundRun(db, 'Explicit-check Run')
    insertDirectRunMessage(db, run.id, 'Checked before Enter')

    await driveToLiveIdle(harness.runtime)
    expect(pointerCount(harness.write)).toBe(1)
    const checked = await checkBoundMailbox(harness.runtime)
    expect(checked).toMatchObject({ runId: run.id, count: 1 })

    await vi.advanceTimersByTimeAsync(500)
    const internals = harness.runtime as unknown as {
      pointedMessageWatermarkOwnerByHandle: Map<string, unknown>
      pointedMessageMailboxHandlesByPtyId: Map<string, Set<string>>
      parkedMessageRedeliveryTypesByMailboxHandle: Map<string, unknown>
    }
    expect(internals.pointedMessageWatermarkOwnerByHandle.size).toBe(0)
    expect(internals.pointedMessageMailboxHandlesByPtyId.size).toBe(0)
    expect(internals.parkedMessageRedeliveryTypesByMailboxHandle.size).toBe(0)

    const redrive = vi.spyOn(harness.runtime, 'deliverPendingMessagesForHandle')
    harness.runtime.onPtyExit(PTY_ID, 0)
    await Promise.resolve()
    expect(redrive).not.toHaveBeenCalled()
    db.close()
  })

  it('routes same-Run direct mail through the bound check and acknowledgment path', async () => {
    vi.useFakeTimers()
    const db = createDatabase('orca-mailbox-current-run-')
    const harness = createRuntime(db)
    const run = createBoundRun(db, 'Current Run')
    const messages = Array.from({ length: 51 }, (_, index) =>
      db.insertMessage({
        from: 'term_worker',
        to: TERMINAL_HANDLE,
        subject: `Direct coordinator status ${index}`,
        runId: run.id
      })
    )
    const notificationQuery = vi.spyOn(db, 'getUndeliveredUnreadMessages')
    const submitRevalidation = vi.spyOn(db, 'areUndeliveredUnreadMessages')
    const prepare = vi.spyOn(sqliteFor(db), 'prepare')

    await driveToLiveIdle(harness.runtime)
    await vi.advanceTimersByTimeAsync(500)
    const checked = await checkBoundMailbox(harness.runtime)

    expect(pointerCount(harness.write)).toBe(1)
    expect(harness.write).toHaveBeenCalledWith(
      PTY_ID,
      expect.stringContaining('You have 50 orchestration messages')
    )
    expect(notificationQuery.mock.results[0]?.value).toHaveLength(50)
    expect(submitRevalidation).toHaveBeenCalledWith(
      `run:${run.id}`,
      messages.slice(0, 50).map((message) => message.id)
    )
    const revalidationSql = prepare.mock.calls
      .map(([sql]) => sql)
      .find((sql) => sql.includes('SELECT COUNT(*)') && sql.includes('id IN'))
    expect(revalidationSql).toContain('INDEXED BY idx_messages_id')
    const revalidationPlan = sqliteFor(db)
      .prepare(`EXPLAIN QUERY PLAN ${revalidationSql}`)
      .all(`run:${run.id}`, ...messages.slice(0, 50).map((message) => message.id)) as {
      detail: string
    }[]
    expect(revalidationPlan.map((row) => row.detail).join(' ')).toContain('idx_messages_id')
    expect(checked).toMatchObject({ runId: run.id, count: 50 })
    expect(checked.deliveryId).toBeTruthy()
    expect(checked.messages).toEqual(
      messages.slice(0, 50).map((message) => expect.objectContaining({ id: message.id }))
    )
    expect(db.getMessageById(messages[0]!.id)).toMatchObject({
      to_handle: `run:${run.id}`,
      read: 0,
      delivered_at: expect.any(String)
    })
    expect(db.getMessageById(messages[50]!.id)?.delivered_at).toBeNull()

    const acknowledged = await checkBoundMailbox(harness.runtime, { ack: checked.deliveryId! })
    expect(acknowledged.acknowledged).toBe(checked.deliveryId)
    expect(acknowledged.messages).toEqual([expect.objectContaining({ id: messages[50]!.id })])
    expect(db.getMessageById(messages[0]!.id)?.read).toBe(1)
    db.close()
  })

  it('does not replay a successfully submitted actionable pointer after restart', async () => {
    vi.useFakeTimers()
    const directory = mkdtempSync(join(tmpdir(), 'orca-mailbox-actionable-restart-'))
    temporaryDirectories.push(directory)
    const dbPath = join(directory, 'orchestration.db')
    const firstDb = new OrchestrationDb(dbPath)
    const first = createRuntime(firstDb)
    const run = createBoundRun(firstDb, 'Restart-safe Run')
    const message = insertDirectRunMessage(firstDb, run.id, 'Actionable status')

    await driveToLiveIdle(first.runtime)
    await vi.advanceTimersByTimeAsync(500)
    expect(pointerCount(first.write)).toBe(1)
    expect(firstDb.getMessageById(message.id)).toMatchObject({
      read: 0,
      delivered_at: expect.any(String)
    })
    firstDb.close()

    const restartedDb = new OrchestrationDb(dbPath)
    const restarted = createRuntime(restartedDb)
    await driveToLiveIdle(restarted.runtime)
    await vi.advanceTimersByTimeAsync(500)
    const checked = await checkBoundMailbox(restarted.runtime)

    expect(pointerCount(restarted.write)).toBe(0)
    expect(checked).toMatchObject({ runId: run.id, count: 1 })
    expect(checked.messages).toEqual([expect.objectContaining({ id: message.id })])
    expect(checked.deliveryId).toBeTruthy()
    restartedDb.close()
  })

  it('keeps mail retryable when the provider rejects Enter', async () => {
    vi.useFakeTimers()
    const db = createDatabase('orca-mailbox-provider-refusal-')
    const first = createRuntime(db)
    const recordWrite = first.write as unknown as (id: string, payload: string) => unknown
    const write = vi.fn((ptyId: string, data: string) => {
      recordWrite(ptyId, data)
      return data !== '\r'
    })
    first.runtime.setPtyController({
      write,
      kill: vi.fn(),
      getForegroundProcess: async () => null
    })
    const run = createBoundRun(db, 'Provider-refusal Run')
    const message = insertDirectRunMessage(db, run.id, 'Retry after refusal')

    await driveToLiveIdle(first.runtime)
    await vi.advanceTimersByTimeAsync(500)
    expect(pointerCount(first.write)).toBe(1)
    expect(db.getMessageById(message.id)?.delivered_at).toBeNull()

    const restarted = createRuntime(db)
    await driveToLiveIdle(restarted.runtime)
    expect(pointerCount(restarted.write)).toBe(1)
    db.close()
  })

  it('does not point newer Run mail behind an outstanding Delivery', async () => {
    vi.useFakeTimers()
    const db = createDatabase('orca-mailbox-outstanding-')
    const harness = createRuntime(db)
    const run = createBoundRun(db, 'Outstanding Delivery Run')
    const firstMessage = db.insertMessage({
      from: 'term_worker',
      to: `run:${run.id}`,
      subject: 'First status',
      runId: run.id
    })
    const firstDelivery = await checkBoundMailbox(harness.runtime)
    const newerMessage = db.insertMessage({
      from: 'term_worker',
      to: `run:${run.id}`,
      subject: 'Newer status',
      runId: run.id
    })

    await driveToLiveIdle(harness.runtime)
    const replayed = await checkBoundMailbox(harness.runtime)

    expect(pointerCount(harness.write)).toBe(0)
    expect(replayed.messages).toEqual([expect.objectContaining({ id: firstMessage.id })])
    expect(replayed.deliveryId).toBe(firstDelivery.deliveryId)

    const next = await checkBoundMailbox(harness.runtime, { ack: firstDelivery.deliveryId! })
    expect(next.messages).toEqual([expect.objectContaining({ id: newerMessage.id })])
    expect(next.deliveryId).not.toBe(firstDelivery.deliveryId)
    db.close()
  })

  it('routes active worker direct mail through the Dispatch check', async () => {
    vi.useFakeTimers()
    const db = createDatabase('orca-mailbox-dispatch-')
    const harness = createRuntime(db)
    const run = db.createRun({
      objective: 'Worker Run',
      coordinatorHandle: 'term_coordinator',
      coordinatorPaneKey:
        '33333333-3333-4333-8333-333333333333:44444444-4444-4444-8444-444444444444'
    })
    const task = db.createTask({ spec: 'Worker task', runId: run.id })
    const dispatch = db.createDispatchContext(task.id, TERMINAL_HANDLE, PANE_KEY)
    await driveToLiveIdle(harness.runtime)
    const message = db.insertMessage({
      from: 'term_coordinator',
      to: TERMINAL_HANDLE,
      subject: 'Worker status',
      runId: run.id
    })

    harness.runtime.notifyMessageArrived(TERMINAL_HANDLE, message.type)
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(500)
    const checked = await checkBoundMailbox(harness.runtime)

    expect(pointerCount(harness.write)).toBe(1)
    expect(checked).toMatchObject({ runId: run.id, dispatchId: dispatch.id, count: 1 })
    expect(checked.messages).toEqual([expect.objectContaining({ id: message.id })])
    expect(db.getMessageById(message.id)).toMatchObject({
      to_handle: `dispatch:${dispatch.id}`,
      read: 1,
      delivered_at: expect.any(String)
    })
    const internals = harness.runtime as unknown as {
      pointedMessageWatermarkOwnerByHandle: Map<string, unknown>
      pointedMessageMailboxHandlesByPtyId: Map<string, Set<string>>
    }
    expect(internals.pointedMessageWatermarkOwnerByHandle.has(`dispatch:${dispatch.id}`)).toBe(
      false
    )
    expect(internals.pointedMessageMailboxHandlesByPtyId.has(PTY_ID)).toBe(false)
    db.close()
  })

  it('normalizes direct mail that arrives while its Run is displaced', async () => {
    vi.useFakeTimers()
    const db = createDatabase('orca-mailbox-late-rebind-')
    const harness = createRuntime(db)
    const runA = createBoundRun(db, 'Run A')
    const runB = createBoundRun(db, 'Run B')
    const rebound = db.bindRun({
      runId: runA.id,
      coordinatorHandle: 'term_new_coordinator',
      coordinatorPaneKey:
        '55555555-5555-4555-8555-555555555555:66666666-6666-4666-8666-666666666666'
    })
    const waiting = harness.runtime.waitForMessage(`run:${runA.id}`, { timeoutMs: 5_000 })
    const message = db.insertMessage({
      from: 'term_worker',
      to: TERMINAL_HANDLE,
      subject: 'Late Run A status',
      runId: runA.id
    })
    harness.runtime.notifyMessageArrived(TERMINAL_HANDLE, message.type)
    await Promise.resolve()

    await expect(waiting).resolves.toBe('notified')
    expect(pointerCount(harness.write)).toBe(0)
    expect(db.getMessageById(message.id)?.to_handle).toBe(`run:${runA.id}`)
    expect(db.getCurrentRunForPane(PANE_KEY)?.id).toBe(runB.id)

    const delivery = db.getOrCreateRunDelivery({
      runId: runA.id,
      consumerGeneration: rebound!.consumer_generation
    })

    expect(delivery?.messages).toEqual([expect.objectContaining({ id: message.id })])
    db.close()
  })

  it('preserves an active Dispatch as owner of displaced direct mail', async () => {
    vi.useFakeTimers()
    const db = createDatabase('orca-mailbox-displaced-dispatch-')
    const harness = createRuntime(db)
    const workerRun = db.createRun({
      objective: 'Worker Run',
      coordinatorHandle: 'term_worker_coordinator',
      coordinatorPaneKey:
        '55555555-5555-4555-8555-555555555555:66666666-6666-4666-8666-666666666666'
    })
    const task = db.createTask({ spec: 'Worker task', runId: workerRun.id })
    const dispatch = db.createDispatchContext(
      task.id,
      'term_mailbox_before_remint',
      `99999999-9999-4999-8999-999999999999:${LEAF_ID}`
    )
    createBoundRun(db, 'Current coordinator Run')
    const waiting = harness.runtime.waitForMessage(`dispatch:${dispatch.id}`, {
      timeoutMs: 5_000
    })
    const message = db.insertMessage({
      from: 'term_worker_coordinator',
      to: TERMINAL_HANDLE,
      subject: 'Late worker instruction',
      runId: workerRun.id
    })

    harness.runtime.notifyMessageArrived(TERMINAL_HANDLE, message.type)
    await expect(waiting).resolves.toBe('notified')
    expect(pointerCount(harness.write)).toBe(0)
    expect(db.getMessageById(message.id)?.to_handle).toBe(`dispatch:${dispatch.id}`)

    const currentRun = db.getCurrentRunForPane(PANE_KEY)
    db.bindRun({
      runId: currentRun!.id,
      coordinatorHandle: 'term_rebound_coordinator',
      coordinatorPaneKey:
        '77777777-7777-4777-8777-777777777777:88888888-8888-4888-8888-888888888888'
    })
    const checked = await checkBoundMailbox(harness.runtime)
    expect(checked).toMatchObject({ runId: workerRun.id, dispatchId: dispatch.id, count: 1 })
    expect(checked.messages).toEqual([expect.objectContaining({ id: message.id })])
    db.close()
  })

  it('uses bounded ownership lookup for direct arrivals while the agent is working', async () => {
    vi.useFakeTimers()
    const db = createDatabase('orca-mailbox-bounded-')
    const harness = createRuntime(db)
    const run = createBoundRun(db, 'Working Run')
    await harness.runtime.listTerminals()
    harness.runtime.onPtyData(PTY_ID, '\x1b]0;Codex working\x07', 1)
    const fullMailboxScan = vi.spyOn(db, 'getUndeliveredUnreadMessages')
    const message = insertDirectRunMessage(db, run.id, 'Direct coordinator status')

    harness.runtime.notifyMessageArrived(TERMINAL_HANDLE, message.type)
    await Promise.resolve()

    expect(fullMailboxScan).not.toHaveBeenCalled()
    expect(pointerCount(harness.write)).toBe(0)
    expect(db.getMessageById(message.id)?.to_handle).toBe(`run:${run.id}`)
    db.close()
  })

  it('wakes a bound Run waiter when same-Run direct mail arrives', async () => {
    vi.useFakeTimers()
    const db = createDatabase('orca-mailbox-waiter-')
    const harness = createRuntime(db)
    const run = createBoundRun(db, 'Waiting Run')
    await driveToLiveIdle(harness.runtime)

    const waiting = checkBoundMailbox(harness.runtime, { wait: true })
    const internals = harness.runtime as unknown as {
      messageWaitersByHandle: Map<string, Set<unknown>>
    }
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (internals.messageWaitersByHandle.has(`run:${run.id}`)) {
        break
      }
      await Promise.resolve()
    }
    expect(internals.messageWaitersByHandle.has(`run:${run.id}`)).toBe(true)

    const message = insertDirectRunMessage(db, run.id, 'Wake the Run waiter')
    harness.runtime.notifyMessageArrived(TERMINAL_HANDLE, message.type)
    await vi.advanceTimersByTimeAsync(5_000)

    await expect(waiting).resolves.toMatchObject({
      runId: run.id,
      count: 1,
      messages: [expect.objectContaining({ id: message.id })]
    })
    expect(pointerCount(harness.write)).toBe(0)
    db.close()
  })
})
