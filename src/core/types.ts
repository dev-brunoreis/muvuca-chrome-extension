export type ModuleId = 'image-swap' | 'anon-chat'

export type Identity = {
  id: string
  nick: string
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type MeshEnvelope = {
  id: string
  type: string
  moduleId: ModuleId | 'system'
  payload: JsonValue
  from: string
  ts: number
}

export type MeshStatus = {
  state: 'connecting' | 'online' | 'error'
  peerCount: number
  strategy: string
  error?: string
}

export type ModuleState = Record<ModuleId, boolean>

export type ModuleDefinition = {
  id: ModuleId
  name: string
  defaultEnabled: boolean
  onEnable?: () => void | Promise<void>
  onDisable?: () => void | Promise<void>
  onPeerMessage?: (msg: MeshEnvelope) => void | Promise<void>
}

export type ImagePackMeta = {
  id: string
  name: string
  author: string
  imageCount: number
  createdAt: number
  source: 'local' | 'mesh' | 'builtin'
}

export type ImagePack = ImagePackMeta & {
  images: string[]
}

export type ChatMessage = {
  id: string
  from: string
  nick: string
  text: string
  ts: number
  mine?: boolean
}

export type BusMessage =
  | { type: 'mesh:send'; envelope: MeshEnvelope }
  | { type: 'mesh:incoming'; envelope: MeshEnvelope }
  | { type: 'mesh:status'; payload: MeshStatus }
  | { type: 'mesh:status:get' }
  | { type: 'mesh:reconnect' }
  | { type: 'mesh:peer-joined' }
  | { type: 'modules:set'; id: ModuleId; enabled: boolean }
  | { type: 'modules:get' }
  | { type: 'identity:get' }
  | { type: 'packs:list' }
  | { type: 'packs:create'; name: string; images: string[] }
  | { type: 'packs:activate'; packId: string }
  | { type: 'packs:publish'; packId: string }
  | { type: 'packs:request'; packId: string }
  | { type: 'chat:send'; text: string }
  | { type: 'chat:history' }
  | { type: 'offscreen:ready' }

export type BusResponseMap = {
  'mesh:send': { ok: true }
  'mesh:incoming': { ok: true }
  'mesh:status': { ok: true }
  'mesh:status:get': MeshStatus
  'mesh:reconnect': { ok: true }
  'mesh:peer-joined': { ok: true }
  'modules:set': ModuleState
  'modules:get': ModuleState
  'identity:get': Identity
  'packs:list': { packs: ImagePack[]; activePackId: string }
  'packs:create': ImagePack
  'packs:activate': { activePackId: string }
  'packs:publish': { ok: true }
  'packs:request': { ok: true }
  'chat:send': ChatMessage | { error: string }
  'chat:history': ChatMessage[]
  'offscreen:ready': { ok: true }
}
