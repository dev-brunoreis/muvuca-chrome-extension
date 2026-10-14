import type { ChatMessage } from '../../core/types'

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function renderChat(list: HTMLElement, messages: ChatMessage[], emptyText: string): void {
  list.replaceChildren()
  if (messages.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'empty'
    empty.textContent = emptyText
    list.append(empty)
    return
  }
  for (const message of messages) {
    const item = document.createElement('article')
    item.className = message.mine ? 'bubble mine' : 'bubble'
    const meta = document.createElement('p')
    meta.className = 'bubble-meta'
    meta.textContent = `${message.nick} · ${formatTime(message.ts)}`
    const body = document.createElement('p')
    body.className = 'bubble-text'
    body.textContent = message.text
    item.append(meta, body)
    list.append(item)
  }
  list.scrollTop = list.scrollHeight
}
