import { joinRoom as joinNostr } from 'trystero'
import { joinRoom as joinTorrent } from '@trystero-p2p/torrent'
import { APP_ID, ROOM_ID } from '../core/constants'
import { onBus } from '../core/bus'
import type { MeshEnvelope, MeshStatus } from '../core/types'

type Room = ReturnType<typeof joinNostr>
type MeshAction = {
  send: (data: MeshEnvelope) => Promise<unknown>
  onMessage: ((data: MeshEnvelope) => void) | null
}

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

const seen = new Set<string>()
const rooms = new Map<string, { room: Room; action: MeshAction }>()

let status: MeshStatus = {
  state: 'connecting',
  peerCount: 0,
  strategy: 'torrent',
}

function remember(id: string): boolean {
  if (seen.has(id)) return false
  seen.add(id)
  if (seen.size > 300) {
    const first = seen.values().next().value
    if (first) seen.delete(first)
  }
  return true
}

function publishStatus(): void {
  void chrome.runtime.sendMessage({ type: 'mesh:status', payload: status }).catch(() => undefined)
}

function recount(): void {
  let peerCount = 0
  for (const { room } of rooms.values()) {
    peerCount += Object.keys(room.getPeers()).length
  }
  status.peerCount = peerCount
  if (status.state !== 'error') status.state = 'online'
  status.strategy = [...rooms.keys()].join('+') || status.strategy
  publishStatus()
}

function wireRoom(room: Room, strategy: string): MeshAction {
  const action = room.makeAction('muvuca') as MeshAction
  action.onMessage = (envelope) => {
    if (!envelope?.id || !remember(envelope.id)) return
    void chrome.runtime.sendMessage({ type: 'mesh:incoming', envelope }).catch(() => undefined)
  }
  room.onPeerJoin = () => {
    recount()
    void chrome.runtime.sendMessage({ type: 'mesh:peer-joined' }).catch(() => undefined)
  }
  room.onPeerLeave = () => recount()
  rooms.set(strategy, { room, action })
  recount()
  return action
}

function broadcast(envelope: MeshEnvelope): void {
  remember(envelope.id)
  for (const { action } of rooms.values()) {
    void action.send(envelope)
  }
}

async function connect(): Promise<void> {
  for (const { room } of rooms.values()) {
    await room.leave()
  }
  rooms.clear()
  status = { state: 'connecting', peerCount: 0, strategy: 'torrent' }
  publishStatus()

  try {
    const torrentRoom = joinTorrent({ appId: APP_ID, rtcConfig }, ROOM_ID)
    wireRoom(torrentRoom, 'torrent')
    status.state = 'online'
    publishStatus()
  } catch (error) {
    status = {
      state: 'error',
      peerCount: 0,
      strategy: 'torrent',
      error: error instanceof Error ? error.message : 'falha no torrent',
    }
    publishStatus()
  }

  window.setTimeout(() => {
    if (status.peerCount > 0 || rooms.has('nostr')) return
    try {
      const nostrRoom = joinNostr({ appId: APP_ID, rtcConfig }, ROOM_ID)
      wireRoom(nostrRoom, 'nostr')
    } catch (error) {
      if (rooms.size === 0) {
        status = {
          state: 'error',
          peerCount: 0,
          strategy: 'nostr',
          error: error instanceof Error ? error.message : 'falha no nostr',
        }
        publishStatus()
      }
    }
  }, 8000)
}

onBus((message, _sender, sendResponse) => {
  if (message.type === 'mesh:send') {
    broadcast(message.envelope)
    sendResponse({ ok: true })
    return
  }
})

void chrome.runtime.sendMessage({ type: 'offscreen:ready' }).catch(() => undefined)
void connect()
