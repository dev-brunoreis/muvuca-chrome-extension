import { sendBus } from '../../core/bus'
import { getOrCreateIdentity } from '../../core/identity'
import type { ModuleDefinition } from '../../core/types'
import {
  announceFrom,
  getPack,
  isPackPayload,
  rememberRemoteMeta,
  toMeta,
  upsertRemotePack,
} from './packs'

export const imageSwapModule: ModuleDefinition = {
  id: 'image-swap',
  name: 'Troca de imagens',
  defaultEnabled: true,
  async onPeerMessage(msg) {
    if (msg.type === 'pack-announce') {
      const meta = announceFrom(msg)
      if (meta) await rememberRemoteMeta(meta)
      return
    }
    if (msg.type === 'pack-payload' && isPackPayload(msg.payload)) {
      await upsertRemotePack(msg.payload)
      return
    }
    if (msg.type === 'pack-request') {
      const packId = (msg.payload as { packId?: string } | undefined)?.packId
      if (!packId) return
      const pack = await getPack(packId)
      if (!pack || pack.images.length === 0) return
      const identity = await getOrCreateIdentity()
      await sendBus({
        type: 'mesh:send',
        envelope: {
          id: crypto.randomUUID(),
          type: 'pack-payload',
          moduleId: 'image-swap',
          payload: pack,
          from: identity.id,
          ts: Date.now(),
        },
      })
    }
  },
}

export async function publishPack(packId: string, from: string): Promise<void> {
  const pack = await getPack(packId)
  if (!pack || pack.images.length === 0) {
    throw new Error('esse pack ainda não tem imagens')
  }
  await sendBus({
    type: 'mesh:send',
    envelope: {
      id: crypto.randomUUID(),
      type: 'pack-announce',
      moduleId: 'image-swap',
      payload: toMeta(pack),
      from,
      ts: Date.now(),
    },
  })
  await sendBus({
    type: 'mesh:send',
    envelope: {
      id: crypto.randomUUID(),
      type: 'pack-payload',
      moduleId: 'image-swap',
      payload: pack,
      from,
      ts: Date.now(),
    },
  })
}

export async function requestPack(packId: string, from: string): Promise<void> {
  await sendBus({
    type: 'mesh:send',
    envelope: {
      id: crypto.randomUUID(),
      type: 'pack-request',
      moduleId: 'image-swap',
      payload: { packId },
      from,
      ts: Date.now(),
    },
  })
}

export { listPacks, createPack, activatePack, localPackMetas } from './packs'
