import { getModuleState, setModuleEnabled } from './storage'
import type { ModuleDefinition, ModuleId, ModuleState, MeshEnvelope } from './types'

const modules = new Map<ModuleId, ModuleDefinition>()

export function registerModule(mod: ModuleDefinition): void {
  modules.set(mod.id, mod)
}

export function listModules(): ModuleDefinition[] {
  return [...modules.values()]
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
  const state = await setModuleEnabled(id, enabled)
  const mod = modules.get(id)
  if (enabled) {
    await mod?.onEnable?.()
  } else {
    await mod?.onDisable?.()
  }
  return state
}

export async function dispatchPeerMessage(msg: MeshEnvelope): Promise<void> {
  const state = await getModuleState()
  for (const mod of modules.values()) {
    if (msg.moduleId !== 'system' && msg.moduleId !== mod.id) continue
    if (!state[mod.id] && msg.moduleId !== 'system') continue
    await mod.onPeerMessage?.(msg)
  }
}

export { getModuleState }
