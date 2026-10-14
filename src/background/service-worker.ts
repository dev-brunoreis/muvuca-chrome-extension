import { MESH_KEEPALIVE_ALARM } from '../core/constants'
import { onBus, sendBus } from '../core/bus'
import { getOrCreateIdentity } from '../core/identity'
import {
  applyModuleState,
  dispatchPeerMessage,
  getModuleState,
  registerModule,
  toggleModule,
} from '../core/module-registry'
import { getChatHistory } from '../core/storage'
import { anonChatModule, sendChat } from '../modules/anon-chat'
import {
  activatePack,
  createPack,
  imageSwapModule,
  listPacks,
  localPackMetas,
  publishPack,
  requestPack,
} from '../modules/image-swap'
import type { MeshEnvelope, MeshStatus } from '../core/types'

registerModule(imageSwapModule)
registerModule(anonChatModule)

const OFFSCREEN_URL = 'src/offscreen/offscreen.html'

let lastStatus: MeshStatus = {
  state: 'connecting',
  peerCount: 0,
  strategy: 'torrent',
}

async function hasOffscreen(): Promise<boolean> {
  if (chrome.offscreen.hasDocument) {
    return chrome.offscreen.hasDocument()
  }
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
  })
  return contexts.length > 0
}

async function ensureOffscreen(): Promise<void> {
  if (await hasOffscreen()) return
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.WEB_RTC],
      justification: 'Manter o peer da mesh pública vivo',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (!/already exists|single offscreen/i.test(message)) throw error
  }
}

async function announcePacks(): Promise<void> {
  const identity = await getOrCreateIdentity()
  const metas = await localPackMetas()
  for (const meta of metas) {
    await sendBus({
      type: 'mesh:send',
      envelope: {
        id: crypto.randomUUID(),
        type: 'pack-announce',
        moduleId: 'image-swap',
        payload: meta,
        from: identity.id,
        ts: Date.now(),
      },
    }).catch(() => undefined)
  }
}

async function sayHello(): Promise<void> {
  const identity = await getOrCreateIdentity()
  const envelope: MeshEnvelope = {
    id: crypto.randomUUID(),
    type: 'hello',
    moduleId: 'system',
    payload: { identityId: identity.id, nick: identity.nick },
    from: identity.id,
    ts: Date.now(),
  }
  await sendBus({ type: 'mesh:send', envelope }).catch(() => undefined)
}

function notifyTabs(type: 'modules:changed' | 'packs:changed'): void {
  void chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id === undefined) continue
      void chrome.tabs.sendMessage(tab.id, { type }).catch(() => undefined)
    }
  })
}

async function init(): Promise<void> {
  await getOrCreateIdentity()
  await listPacks()
  await applyModuleState(await getModuleState())
  await ensureOffscreen()
  await chrome.alarms.create(MESH_KEEPALIVE_ALARM, { periodInMinutes: 0.4 })
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => undefined)
}

chrome.runtime.onInstalled.addListener(() => {
  void init()
})

chrome.runtime.onStartup.addListener(() => {
  void init()
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === MESH_KEEPALIVE_ALARM) void ensureOffscreen()
})

function reply(sendResponse: (value: unknown) => void, task: Promise<unknown>): true {
  task.then(sendResponse).catch((error: unknown) => {
    sendResponse({ error: error instanceof Error ? error.message : 'falha interna' })
  })
  return true
}

onBus((message, _sender, sendResponse) => {
  if (message.type === 'offscreen:ready') {
    void sayHello().then(() => announcePacks())
    sendResponse({ ok: true })
    return
  }
  if (message.type === 'mesh:status') {
    lastStatus = message.payload
    sendResponse({ ok: true })
    return
  }
  if (message.type === 'mesh:status:get') {
    sendResponse(lastStatus)
    return
  }
  if (message.type === 'mesh:reconnect') {
    return reply(
      sendResponse,
      (async () => {
        if (await hasOffscreen()) {
          await chrome.offscreen.closeDocument()
        }
        lastStatus = { state: 'connecting', peerCount: 0, strategy: 'torrent' }
        await ensureOffscreen()
        return { ok: true }
      })(),
    )
  }
  if (message.type === 'mesh:incoming') {
    void dispatchPeerMessage(message.envelope)
    sendResponse({ ok: true })
    return
  }
  if (message.type === 'mesh:peer-joined') {
    void sayHello().then(() => announcePacks())
    sendResponse({ ok: true })
    return
  }
  if (message.type === 'modules:get') {
    return reply(sendResponse, getModuleState())
  }
  if (message.type === 'modules:set') {
    return reply(
      sendResponse,
      toggleModule(message.id, message.enabled).then((state) => {
        notifyTabs('modules:changed')
        return state
      }),
    )
  }
  if (message.type === 'identity:get') {
    return reply(sendResponse, getOrCreateIdentity())
  }
  if (message.type === 'packs:list') {
    return reply(sendResponse, listPacks())
  }
  if (message.type === 'packs:create') {
    return reply(
      sendResponse,
      getOrCreateIdentity().then((identity) =>
        createPack(message.name, message.images, identity.nick).then((pack) => {
          notifyTabs('packs:changed')
          return pack
        }),
      ),
    )
  }
  if (message.type === 'packs:activate') {
    return reply(
      sendResponse,
      activatePack(message.packId).then((activePackId) => {
        notifyTabs('packs:changed')
        return { activePackId }
      }),
    )
  }
  if (message.type === 'packs:publish') {
    return reply(
      sendResponse,
      ensureOffscreen()
        .then(() => getOrCreateIdentity())
        .then((identity) => publishPack(message.packId, identity.id))
        .then(() => ({ ok: true })),
    )
  }
  if (message.type === 'packs:request') {
    return reply(
      sendResponse,
      ensureOffscreen()
        .then(() => getOrCreateIdentity())
        .then((identity) => requestPack(message.packId, identity.id))
        .then(() => ({ ok: true })),
    )
  }
  if (message.type === 'chat:send') {
    return reply(
      sendResponse,
      ensureOffscreen()
        .then(() => getOrCreateIdentity())
        .then((identity) => sendChat(identity, message.text)),
    )
  }
  if (message.type === 'chat:history') {
    return reply(sendResponse, getChatHistory())
  }
})

void init()
