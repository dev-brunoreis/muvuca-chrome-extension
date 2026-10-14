import { MAX_IMAGE_EDGE, MAX_PACK_IMAGES } from '../core/constants'
import { onBus, sendBus } from '../core/bus'
import { renderChat } from '../modules/anon-chat/chat-ui'
import type { Identity, ImagePack, MeshStatus, ModuleId, ModuleState } from '../core/types'

const app = document.querySelector('#app')
if (!app) throw new Error('app root missing')

app.innerHTML = `
  <header>
    <p class="brand">Muvuca</p>
    <p class="who" id="who">a carregar nick…</p>
    <p class="status" id="mesh-status">conectando na mesh…</p>
  </header>
  <nav role="tablist" aria-label="Secções">
    <button type="button" role="tab" id="tab-modules" aria-controls="panel-modules" aria-selected="true">Módulos</button>
    <button type="button" role="tab" id="tab-packs" aria-controls="panel-packs" aria-selected="false">Imagens</button>
    <button type="button" role="tab" id="tab-chat" aria-controls="panel-chat" aria-selected="false">Chat</button>
  </nav>
  <main>
    <section role="tabpanel" id="panel-modules" aria-labelledby="tab-modules">
      <label class="toggle">
        <input type="checkbox" id="toggle-image-swap" />
        <span>Troca de imagens</span>
      </label>
      <p class="hint">Substitui fotos das páginas pelo pack ativo. Bom pra zoar.</p>
      <label class="toggle">
        <input type="checkbox" id="toggle-anon-chat" />
        <span>Chat anônimo</span>
      </label>
      <p class="hint">Mensagens vão para quem estiver na mesh agora. Nada fica guardado depois de fechar o Chrome.</p>
    </section>
    <section role="tabpanel" id="panel-packs" aria-labelledby="tab-packs" hidden>
      <p class="note" id="pack-note">Pack ativo: …</p>
      <ul class="pack-list" id="pack-list"></ul>
      <label class="field">
        Nome do pack
        <input type="text" id="pack-name" maxlength="40" placeholder="ex.: gatos da firma" />
      </label>
      <label class="field">
        Imagens (até ${MAX_PACK_IMAGES})
        <input type="file" id="pack-files" accept="image/*" multiple />
      </label>
      <div class="actions">
        <button type="button" class="action" id="pack-create">Criar pack local</button>
      </div>
      <p class="flash" id="pack-error" hidden></p>
    </section>
    <section role="tabpanel" id="panel-chat" aria-labelledby="tab-chat" hidden>
      <div class="chat">
        <div class="feed" id="chat-feed" aria-live="polite"></div>
        <form class="composer" id="chat-form">
          <input type="text" id="chat-input" maxlength="280" placeholder="escreve aí" autocomplete="off" />
          <button type="submit" class="action" id="chat-send">Enviar</button>
        </form>
        <button type="button" class="ghost" id="open-side">Abrir no painel lateral</button>
        <p class="flash" id="chat-error" hidden></p>
      </div>
    </section>
  </main>
`

const who = must('#who')
const meshStatus = must('#mesh-status')
const imageToggle = must<HTMLInputElement>('#toggle-image-swap')
const chatToggle = must<HTMLInputElement>('#toggle-anon-chat')
const packNote = must('#pack-note')
const packList = must('#pack-list')
const packName = must<HTMLInputElement>('#pack-name')
const packFiles = must<HTMLInputElement>('#pack-files')
const packCreate = must<HTMLButtonElement>('#pack-create')
const packError = must('#pack-error')
const chatFeed = must('#chat-feed')
const chatForm = must<HTMLFormElement>('#chat-form')
const chatInput = must<HTMLInputElement>('#chat-input')
const chatError = must('#chat-error')
const chatSend = must<HTMLButtonElement>('#chat-send')
const openSide = must<HTMLButtonElement>('#open-side')

const tabs = [
  { btn: must('#tab-modules'), panel: must('#panel-modules') },
  { btn: must('#tab-packs'), panel: must('#panel-packs') },
  { btn: must('#tab-chat'), panel: must('#panel-chat') },
]

function must<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector)
  if (!el) throw new Error(`missing ${selector}`)
  return el
}

function selectTab(id: string): void {
  for (const tab of tabs) {
    const on = tab.btn.id === id
    tab.btn.setAttribute('aria-selected', String(on))
    tab.panel.hidden = !on
  }
}

for (const tab of tabs) {
  tab.btn.addEventListener('click', () => selectTab(tab.btn.id))
}

function isErrorResult(value: unknown): value is { error: string } {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'error' in value &&
      typeof (value as { error: unknown }).error === 'string',
  )
}

function showError(el: HTMLElement, message: string | null): void {
  if (!message) {
    el.hidden = true
    el.textContent = ''
    return
  }
  el.hidden = false
  el.textContent = message
}

function renderStatus(status: MeshStatus): void {
  meshStatus.classList.toggle('error', status.state === 'error')
  if (status.state === 'connecting') {
    meshStatus.textContent = 'conectando na mesh…'
    return
  }
  if (status.state === 'error') {
    meshStatus.textContent = status.error
      ? `a mesh falhou: ${status.error}`
      : 'a mesh falhou. tenta de novo pelo botão abaixo.'
    if (!meshStatus.querySelector('button')) {
      const retry = document.createElement('button')
      retry.type = 'button'
      retry.className = 'ghost'
      retry.textContent = 'Tentar de novo'
      retry.addEventListener('click', () => {
        void sendBus({ type: 'mesh:reconnect' })
      })
      meshStatus.append(document.createElement('br'), retry)
    }
    return
  }
  meshStatus.textContent =
    status.peerCount === 0
      ? `online, ainda sem pares (${status.strategy})`
      : `online, ${status.peerCount} ${status.peerCount === 1 ? 'par' : 'pares'} (${status.strategy})`
}

function renderModules(state: ModuleState): void {
  imageToggle.checked = state['image-swap']
  chatToggle.checked = state['anon-chat']
}

function renderPacks(packs: ImagePack[], activePackId: string): void {
  const active = packs.find((pack) => pack.id === activePackId)
  packNote.textContent = `Pack ativo: ${active?.name ?? 'nenhum'}`
  packList.replaceChildren()
  if (packs.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'empty'
    empty.textContent = 'Nenhum pack ainda.'
    packList.append(empty)
    return
  }
  for (const pack of packs) {
    const item = document.createElement('li')
    const title = document.createElement('strong')
    title.textContent = pack.name
    const meta = document.createElement('p')
    meta.className = 'hint'
    const origin =
      pack.source === 'builtin' ? 'embutido' : pack.source === 'mesh' ? 'veio da mesh' : 'local'
    meta.textContent = `${pack.imageCount} imagens · ${origin} · ${pack.author}`
    const actions = document.createElement('div')
    actions.className = 'actions'
    const use = document.createElement('button')
    use.type = 'button'
    use.className = pack.id === activePackId ? 'action' : 'ghost'
    use.textContent = pack.id === activePackId ? 'Em uso' : 'Usar este'
    use.disabled = pack.id === activePackId || pack.images.length === 0
    use.addEventListener('click', () => {
      void sendBus({ type: 'packs:activate', packId: pack.id }).then(loadPacks)
    })
    actions.append(use)
    if (pack.images.length > 0 && pack.source !== 'builtin') {
      const publish = document.createElement('button')
      publish.type = 'button'
      publish.className = 'ghost'
      publish.textContent = 'Publicar na mesh'
      publish.addEventListener('click', () => {
        void sendBus({ type: 'packs:publish', packId: pack.id })
          .then(() => showError(packError, null))
          .catch((error: unknown) => {
            showError(packError, error instanceof Error ? error.message : 'falha ao publicar')
          })
      })
      actions.append(publish)
    }
    if (pack.images.length === 0) {
      const pull = document.createElement('button')
      pull.type = 'button'
      pull.className = 'ghost'
      pull.textContent = 'Pedir na mesh'
      pull.addEventListener('click', () => {
        void sendBus({ type: 'packs:request', packId: pack.id })
      })
      actions.append(pull)
    }
    item.append(title, meta, actions)
    packList.append(item)
  }
}

async function loadPacks(): Promise<void> {
  const data = await sendBus({ type: 'packs:list' })
  renderPacks(data.packs, data.activePackId)
}

async function loadChat(): Promise<void> {
  const history = await sendBus({ type: 'chat:history' })
  renderChat(chatFeed, history, 'Ninguém falou ainda. A tua mensagem vai para os pares ligados.')
}

function fileToJpeg(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('canvas indisponível'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`não deu pra ler ${file.name}`))
    }
    img.src = url
  })
}

imageToggle.addEventListener('change', () => {
  void sendBus({ type: 'modules:set', id: 'image-swap' satisfies ModuleId, enabled: imageToggle.checked })
})

chatToggle.addEventListener('change', () => {
  void sendBus({ type: 'modules:set', id: 'anon-chat' satisfies ModuleId, enabled: chatToggle.checked })
})

packCreate.addEventListener('click', () => {
  void (async () => {
    showError(packError, null)
    const files = [...(packFiles.files ?? [])].slice(0, MAX_PACK_IMAGES)
    if (files.length === 0) {
      showError(packError, 'escolhe pelo menos uma imagem')
      return
    }
    packCreate.disabled = true
    try {
      const images = await Promise.all(files.map(fileToJpeg))
      const created = await sendBus({
        type: 'packs:create',
        name: packName.value,
        images,
      })
      if (isErrorResult(created)) {
        showError(packError, created.error)
        return
      }
      packName.value = ''
      packFiles.value = ''
      await loadPacks()
    } catch (error) {
      showError(packError, error instanceof Error ? error.message : 'falha ao criar pack')
    } finally {
      packCreate.disabled = false
    }
  })()
})

openSide.addEventListener('click', () => {
  void chrome.windows.getCurrent().then((window) => {
    if (window.id === undefined) return
    return chrome.sidePanel.open({ windowId: window.id })
  })
})

if (document.body.classList.contains('sidepanel')) {
  openSide.hidden = true
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault()
  const text = chatInput.value
  if (!text.trim()) return
  chatSend.disabled = true
  void sendBus({ type: 'chat:send', text })
    .then((result) => {
      if (isErrorResult(result)) {
        showError(chatError, result.error)
        return
      }
      showError(chatError, null)
      chatInput.value = ''
      return loadChat()
    })
    .finally(() => {
      chatSend.disabled = false
      chatInput.focus()
    })
})

onBus((message) => {
  if (message.type === 'mesh:status') {
    renderStatus(message.payload)
  }
  if (message.type === 'mesh:incoming' && message.envelope.moduleId === 'anon-chat') {
    void loadChat()
  }
  if (message.type === 'mesh:incoming' && message.envelope.moduleId === 'image-swap') {
    void loadPacks()
  }
})

async function boot(): Promise<void> {
  try {
    const identity = (await sendBus({ type: 'identity:get' })) as Identity
    who.textContent = identity.nick
    renderModules(await sendBus({ type: 'modules:get' }))
    await loadPacks()
    await loadChat()
    renderStatus(await sendBus({ type: 'mesh:status:get' }))
  } catch (error) {
    who.textContent = 'nick indisponível'
    meshStatus.classList.add('error')
    meshStatus.textContent = error instanceof Error ? error.message : 'falha ao abrir a extensão'
  }
}

void boot()
