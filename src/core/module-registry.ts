import { getStoredModuleState, setModuleEnabled } from './storage'
import type { MeshEnvelope, ModuleDefinition, ModuleId, ModuleListItem, ModuleState } from './types'

const modules = new Map<ModuleId, ModuleDefinition>()

export function registerModule(mod: ModuleDefinition): void {
  modules.set(mod.id, mod)
}

export function listModules(): ModuleListItem[] {
  return [...modules.values()].map(({ id, name, description, defaultEnabled }) => ({
    id,
    name,
    description,
    defaultEnabled,
  }))
}

function defaultState(): ModuleState {
  const state: ModuleState = {}
  for (const mod of modules.values()) {
    state[mod.id] = mod.defaultEnabled
  }
  return state
}

export async function getModuleState(): Promise<ModuleState> {
  const saved = await getStoredModuleState()
  return { ...defaultState(), ...saved }
}

export async function applyModuleState(state: ModuleState): Promise<void> {
  for (const mod of modules.values()) {
    if (state[mod.id]) {
      await mod.onEnable?.()
    } else {
      await mod.onDisable?.()
    }
  }
}

export async function toggleModule(id: ModuleId, enabled: boolean): Promise<ModuleState> {
  await setModuleEnabled(id, enabled)
  const mod = modules.get(id)
  if (enabled) {
    await mod?.onEnable?.()
  } else {
    await mod?.onDisable?.()
  }
  return getModuleState()
}

export async function dispatchPeerMessage(msg: MeshEnvelope): Promise<void> {
  const state = await getModuleState()
  for (const mod of modules.values()) {
    if (msg.moduleId !== 'system' && msg.moduleId !== mod.id) continue
    if (!state[mod.id] && msg.moduleId !== 'system') continue
    await mod.onPeerMessage?.(msg)
  }
}

export async function notifyPeerJoined(): Promise<void> {
  const state = await getModuleState()
  for (const mod of modules.values()) {
    if (!state[mod.id]) continue
    await mod.onPeerJoined?.()
  }
}
