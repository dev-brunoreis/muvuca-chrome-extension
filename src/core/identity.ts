import { STORAGE } from './constants'
import type { Identity } from './types'

export async function getOrCreateIdentity(): Promise<Identity> {
  const session = await chrome.storage.session.get(STORAGE.identity)
  const existing = session[STORAGE.identity] as Identity | undefined
  if (existing?.id && existing.nick) {
    return existing
  }
  const id = crypto.randomUUID()
  const identity: Identity = { id, nick: `anon-${id.slice(0, 4)}` }
  await chrome.storage.session.set({ [STORAGE.identity]: identity })
  return identity
}
