import { DEFAULT_PACK_ID, MAX_PACK_IMAGES } from '../../core/constants'
import { newId } from '../../core/bus'
import { getActivePackId, getPacks, savePacks, setActivePackId } from '../../core/storage'
import type { ImagePack, ImagePackMeta, MeshEnvelope } from '../../core/types'
import { builtinPack } from './faces'

export async function ensureBuiltinPack(): Promise<ImagePack[]> {
  const packs = await getPacks()
  const builtin = builtinPack()
  const rest = packs.filter((pack) => pack.id !== DEFAULT_PACK_ID)
  const next = [builtin, ...rest]
  await savePacks(next)
  const active = await getActivePackId()
  if (!next.some((pack) => pack.id === active)) {
    await setActivePackId(DEFAULT_PACK_ID)
  }
  return next
}

export async function listPacks(): Promise<{ packs: ImagePack[]; activePackId: string }> {
  const packs = await ensureBuiltinPack()
  return { packs, activePackId: await getActivePackId() }
}

export async function createPack(
  name: string,
  images: string[],
  author: string,
): Promise<ImagePack> {
  const trimmed = images.slice(0, MAX_PACK_IMAGES)
  if (trimmed.length === 0) {
    throw new Error('escolhe pelo menos uma imagem')
  }
  const pack: ImagePack = {
    id: newId(),
    name: name.trim() || 'pack sem nome',
    author,
    imageCount: trimmed.length,
    createdAt: Date.now(),
    source: 'local',
    images: trimmed,
  }
  const packs = await ensureBuiltinPack()
  packs.push(pack)
  await savePacks(packs)
  await setActivePackId(pack.id)
  return pack
}

export async function activatePack(packId: string): Promise<string> {
  const packs = await ensureBuiltinPack()
  if (!packs.some((pack) => pack.id === packId)) {
    throw new Error('pack não encontrado')
  }
  await setActivePackId(packId)
  return packId
}

export function toMeta(pack: ImagePack): ImagePackMeta {
  return {
    id: pack.id,
    name: pack.name,
    author: pack.author,
    imageCount: pack.imageCount,
    createdAt: pack.createdAt,
    source: pack.source,
  }
}

export async function upsertRemotePack(pack: ImagePack): Promise<void> {
  if (!pack?.id || !Array.isArray(pack.images) || pack.images.length === 0) return
  const packs = await ensureBuiltinPack()
  const next: ImagePack = {
    ...pack,
    source: 'mesh',
    imageCount: pack.images.length,
  }
  const index = packs.findIndex((item) => item.id === pack.id)
  if (index >= 0) packs[index] = next
  else packs.push(next)
  await savePacks(packs)
}

export async function rememberRemoteMeta(meta: ImagePackMeta): Promise<void> {
  if (!meta?.id) return
  const packs = await ensureBuiltinPack()
  if (packs.some((pack) => pack.id === meta.id)) return
  packs.push({
    ...meta,
    source: 'mesh',
    images: [],
  })
  await savePacks(packs)
}

export async function getPack(packId: string): Promise<ImagePack | undefined> {
  const packs = await ensureBuiltinPack()
  return packs.find((pack) => pack.id === packId)
}

export async function localPackMetas(): Promise<ImagePackMeta[]> {
  const packs = await ensureBuiltinPack()
  return packs
    .filter((pack) => pack.images.length > 0)
    .map(toMeta)
}

export function isPackPayload(value: unknown): value is ImagePack {
  if (!value || typeof value !== 'object') return false
  const pack = value as ImagePack
  return typeof pack.id === 'string' && Array.isArray(pack.images)
}

export function isPackMeta(value: unknown): value is ImagePackMeta {
  if (!value || typeof value !== 'object') return false
  const meta = value as ImagePackMeta
  return typeof meta.id === 'string' && typeof meta.name === 'string'
}

export function announceFrom(envelope: MeshEnvelope): ImagePackMeta | undefined {
  if (envelope.type !== 'pack-announce') return undefined
  return isPackMeta(envelope.payload) ? envelope.payload : undefined
}
