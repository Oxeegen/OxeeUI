import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, test } from 'vitest'

const targetRoot = process.env.STA_4274_TARGET_ROOT
const operation = process.env.STA_4274_OPERATION
const userDataPath = process.env.STA_4274_USER_DATA_PATH ?? mkdtempSync(join(tmpdir(), 'sta-4274-'))

const ordinary = {
  id: 'ordinary-runtime',
  recipeId: 'ordinary-recipe',
  recipe: {
    id: 'ordinary-recipe',
    name: 'Ordinary VM',
    create: './ordinary-create.sh',
    destroy: './ordinary-destroy.sh'
  },
  status: 'running' as const,
  cleanupStatus: 'not_started' as const,
  createdAt: 1_000,
  updatedAt: 1_000,
  recipeResult: {
    schemaVersion: 1 as const,
    connection: {
      type: 'ssh' as const,
      projectRoot: '/workspace/ordinary',
      target: {
        label: 'Ordinary VM',
        host: 'ordinary.example.com',
        port: 22,
        username: 'developer'
      }
    },
    userData: { resourceId: 'ordinary-resource' }
  }
}

const provisionedRoot = {
  id: 'provisioned-root-runtime',
  recipeId: 'provisioned-root-recipe',
  recipe: {
    id: 'provisioned-root-recipe',
    name: 'Provisioned Root VM',
    create: './provisioned-root-create.sh',
    destroy: './provisioned-root-destroy.sh',
    checkoutMode: 'provisioned-root' as const
  },
  status: 'running' as const,
  cleanupStatus: 'not_started' as const,
  createdAt: 2_000,
  updatedAt: 2_000,
  recipeResult: {
    schemaVersion: 2 as const,
    checkoutMode: 'provisioned-root' as const,
    connection: {
      type: 'ssh' as const,
      projectRoot: '/workspace/provisioned',
      target: {
        label: 'Provisioned Root VM',
        host: 'provisioned.example.com',
        port: 22,
        username: 'developer'
      }
    },
    userData: { resourceId: 'provisioned-resource' }
  }
}

test.skipIf(!targetRoot || !operation)(`STA-4274 ${operation ?? 'disabled'}`, async () => {
  if (!targetRoot || !operation) {
    throw new Error('STA_4274_TARGET_ROOT and STA_4274_OPERATION are required')
  }
  const moduleUrl = pathToFileURL(
    resolve(targetRoot, 'src/shared/ephemeral-vm-runtime-store.ts')
  ).href
  const store = await import(/* @vite-ignore */ moduleUrl)

  if (operation === 'write-legacy') {
    store.upsertEphemeralVmRuntime(userDataPath, ordinary)
    return
  }
  if (operation === 'write-mixed') {
    store.upsertEphemeralVmRuntime(userDataPath, ordinary)
    store.upsertEphemeralVmRuntime(userDataPath, provisionedRoot)
    return
  }
  if (operation === 'read') {
    expect(
      store.listEphemeralVmRuntimes(userDataPath).map((record: { id: string }) => record.id)
    ).toEqual(['provisioned-root-runtime', 'ordinary-runtime'])
    return
  }
  if (operation === 'read-legacy') {
    expect(
      store.listEphemeralVmRuntimes(userDataPath).map((record: { id: string }) => record.id)
    ).toEqual(['ordinary-runtime'])
    return
  }
  throw new Error(`Unknown operation: ${operation}`)
})
