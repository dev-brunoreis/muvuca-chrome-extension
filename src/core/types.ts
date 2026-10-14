export type ModuleId = string

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

export type ModuleListItem = {
  id: ModuleId
  name: string
  description?: string
  defaultEnabled: boolean
}

export type ModuleDefinition = ModuleListItem & {
  onEnable?: () => void | Promise<void>
  onDisable?: () => void | Promise<void>
  onPeerMessage?: (msg: MeshEnvelope) => void | Promise<void>
  onPeerJoined?: () => void | Promise<void>
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
  | { type: 'modules:list' }
  | { type: 'identity:get' }
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
  'modules:list': ModuleListItem[]
  'identity:get': Identity
  'offscreen:ready': { ok: true }
}
