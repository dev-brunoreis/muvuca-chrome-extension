export const APP_ID = 'com.muvuca.extension'
export const ROOM_ID = 'muvuca-public'

export const STORAGE = {
  identity: 'identity',
  moduleState: 'moduleState',
  packs: 'packs',
  activePackId: 'activePackId',
  chatHistory: 'chatHistory',
} as const

export const DEFAULT_PACK_ID = 'builtin-faces'
export const MAX_PACK_IMAGES = 8
export const MAX_IMAGE_EDGE = 480
export const MAX_CHAT_HISTORY = 50
export const MAX_CHAT_CHARS = 280
export const CHAT_RATE_WINDOW_MS = 10_000
export const CHAT_RATE_MAX = 4
export const MESH_KEEPALIVE_ALARM = 'mesh-keepalive'
