import { DEFAULT_PACK_ID, MAX_CHAT_HISTORY, STORAGE } from './constants'
import type { ChatMessage, ImagePack, ModuleId, ModuleState } from './types'

const DEFAULT_MODULE_STATE: ModuleState = {
  'image-swap': true,
  'anon-chat': true,
}

export async function getModuleState(): Promise<ModuleState> {
  const result = await chrome.storage.local.get(STORAGE.moduleState)
  return { ...DEFAULT_MODULE_STATE, ...(result[STORAGE.moduleState] as ModuleState | undefined) }
}

export async function setModuleEnabled(id: ModuleId, enabled: boolean): Promise<ModuleState> {
  const state = await getModuleState()
  state[id] = enabled
  await chrome.storage.local.set({ [STORAGE.moduleState]: state })
  return state
}

export async function getPacks(): Promise<ImagePack[]> {
  const result = await chrome.storage.local.get(STORAGE.packs)
  return (result[STORAGE.packs] as ImagePack[] | undefined) ?? []
}

export async function savePacks(packs: ImagePack[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE.packs]: packs })
}

export async function getActivePackId(): Promise<string> {
  const result = await chrome.storage.local.get(STORAGE.activePackId)
  return (result[STORAGE.activePackId] as string | undefined) ?? DEFAULT_PACK_ID
}

export async function setActivePackId(packId: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE.activePackId]: packId })
}

export async function getChatHistory(): Promise<ChatMessage[]> {
  const result = await chrome.storage.session.get(STORAGE.chatHistory)
  return (result[STORAGE.chatHistory] as ChatMessage[] | undefined) ?? []
}

export async function appendChat(message: ChatMessage): Promise<ChatMessage[]> {
  const history = await getChatHistory()
  history.push(message)
  const trimmed = history.slice(-MAX_CHAT_HISTORY)
  await chrome.storage.session.set({ [STORAGE.chatHistory]: trimmed })
  return trimmed
}
