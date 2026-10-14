import { STORAGE } from './constants'
import type { ModuleId, ModuleState } from './types'

export async function getStoredModuleState(): Promise<ModuleState> {
  const result = await chrome.storage.local.get(STORAGE.moduleState)
  return (result[STORAGE.moduleState] as ModuleState | undefined) ?? {}
}

export async function setModuleEnabled(id: ModuleId, enabled: boolean): Promise<void> {
  const state = await getStoredModuleState()
  state[id] = enabled
  await chrome.storage.local.set({ [STORAGE.moduleState]: state })
}
