import { CHAT_RATE_MAX, CHAT_RATE_WINDOW_MS, MAX_CHAT_CHARS } from '../../core/constants'
import { newId } from '../../core/bus'
import { appendChat } from '../../core/storage'
import type { ChatMessage, Identity, MeshEnvelope } from '../../core/types'

const hitsByPeer = new Map<string, number[]>()

export function allowChatFrom(peerKey: string): boolean {
  const now = Date.now()
  const hits = (hitsByPeer.get(peerKey) ?? []).filter((ts) => now - ts < CHAT_RATE_WINDOW_MS)
  if (hits.length >= CHAT_RATE_MAX) {
    hitsByPeer.set(peerKey, hits)
    return false
  }
  hits.push(now)
  hitsByPeer.set(peerKey, hits)
  return true
}

export function sanitizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHAT_CHARS)
}

export function makeChatMessage(identity: Identity, text: string, mine = false): ChatMessage {
  return {
    id: newId(),
    from: identity.id,
    nick: identity.nick,
    text: sanitizeText(text),
    ts: Date.now(),
    mine,
  }
}

export function parseChatPayload(payload: unknown): { text: string; nick: string } | null {
  if (!payload || typeof payload !== 'object') return null
  const data = payload as { text?: unknown; nick?: unknown }
  if (typeof data.text !== 'string' || typeof data.nick !== 'string') return null
  const text = sanitizeText(data.text)
  const nick = data.nick.trim().slice(0, 24)
  if (!text || !nick) return null
  return { text, nick }
}

export async function ingestRemoteChat(msg: MeshEnvelope): Promise<ChatMessage | null> {
  if (msg.type !== 'chat') return null
  if (!allowChatFrom(msg.from)) return null
  const parsed = parseChatPayload(msg.payload)
  if (!parsed) return null
  const message: ChatMessage = {
    id: msg.id,
    from: msg.from,
    nick: parsed.nick,
    text: parsed.text,
    ts: msg.ts,
    mine: false,
  }
  await appendChat(message)
  return message
}
