import { sendBus } from '../../core/bus'
import { appendChat } from '../../core/storage'
import type { ChatMessage, Identity, ModuleDefinition } from '../../core/types'
import { allowChatFrom, ingestRemoteChat, makeChatMessage } from './protocol'

export const anonChatModule: ModuleDefinition = {
  id: 'anon-chat',
  name: 'Chat anônimo',
  defaultEnabled: true,
  async onPeerMessage(msg) {
    await ingestRemoteChat(msg)
  },
}

export async function sendChat(identity: Identity, text: string): Promise<ChatMessage> {
  if (!allowChatFrom(`local:${identity.id}`)) {
    throw new Error('devagar: espera uns segundos antes de mandar outra')
  }
  const message = makeChatMessage(identity, text, true)
  if (!message.text) {
    throw new Error('escreve alguma coisa')
  }
  await appendChat(message)
  await sendBus({
    type: 'mesh:send',
    envelope: {
      id: message.id,
      type: 'chat',
      moduleId: 'anon-chat',
      payload: { text: message.text, nick: identity.nick },
      from: identity.id,
      ts: message.ts,
    },
  })
  return message
}

export { ingestRemoteChat } from './protocol'
