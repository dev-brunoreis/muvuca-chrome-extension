import type { BusMessage, BusResponseMap } from './types'

export function sendBus<T extends BusMessage['type']>(
  message: Extract<BusMessage, { type: T }>,
): Promise<BusResponseMap[T]> {
  return chrome.runtime.sendMessage(message) as Promise<BusResponseMap[T]>
}

export function onBus(
  handler: (
    message: BusMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ) => boolean | void | Promise<void>,
): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== 'object' || !('type' in message)) {
      return
    }
    const result = handler(message as BusMessage, sender, sendResponse)
    if (result instanceof Promise) {
      result.catch((error: unknown) => {
        console.error('bus handler failed', error)
        sendResponse({ error: error instanceof Error ? error.message : 'erro' })
      })
      return true
    }
    return result
  })
}

export function newId(): string {
  return crypto.randomUUID()
}
