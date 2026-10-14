import { onBus, sendBus } from '../core/bus'
import type { Identity, MeshStatus, ModuleListItem, ModuleState } from '../core/types'

const app = document.querySelector('#app')
if (!app) throw new Error('app root missing')

app.innerHTML = `
  <header>
    <p class="brand">Muvuca</p>
    <p class="who" id="who">a carregar nick…</p>
    <p class="status" id="mesh-status">conectando na mesh…</p>
  </header>
  <main>
    <section aria-labelledby="modules-heading">
      <h1 id="modules-heading">Módulos</h1>
      <div id="module-list"></div>
    </section>
    <div class="actions">
      <button type="button" class="ghost" id="open-side">Abrir no painel lateral</button>
    </div>
  </main>
`

const who = must('#who')
const meshStatus = must('#mesh-status')
const moduleList = must('#module-list')
const openSide = must<HTMLButtonElement>('#open-side')

function must<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector)
  if (!el) throw new Error(`missing ${selector}`)
  return el
}

function renderStatus(status: MeshStatus): void {
  meshStatus.replaceChildren()
  meshStatus.classList.toggle('error', status.state === 'error')
  if (status.state === 'connecting') {
    meshStatus.textContent = 'conectando na mesh…'
    return
  }
  if (status.state === 'error') {
    meshStatus.append(
      status.error ? `a mesh falhou: ${status.error}` : 'a mesh falhou. tenta de novo pelo botão abaixo.',
    )
    const retry = document.createElement('button')
    retry.type = 'button'
    retry.className = 'ghost'
    retry.textContent = 'Tentar de novo'
    retry.addEventListener('click', () => {
      void sendBus({ type: 'mesh:reconnect' })
    })
    meshStatus.append(document.createElement('br'), retry)
    return
  }
  meshStatus.textContent =
    status.peerCount === 0
      ? `online, ainda sem pares (${status.strategy})`
      : `online, ${status.peerCount} ${status.peerCount === 1 ? 'par' : 'pares'} (${status.strategy})`
}

function renderModules(mods: ModuleListItem[], state: ModuleState): void {
  moduleList.replaceChildren()
  if (mods.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'hint'
    empty.textContent = 'nenhum módulo plugado ainda'
    moduleList.append(empty)
    return
  }
  for (const mod of mods) {
    const row = document.createElement('label')
    row.className = 'toggle'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = Boolean(state[mod.id])
    input.addEventListener('change', () => {
      void sendBus({ type: 'modules:set', id: mod.id, enabled: input.checked })
    })
    const name = document.createElement('span')
    name.textContent = mod.name
    row.append(input, name)
    moduleList.append(row)
    if (mod.description) {
      const hint = document.createElement('p')
      hint.className = 'hint'
      hint.textContent = mod.description
      moduleList.append(hint)
    }
  }
}

openSide.addEventListener('click', () => {
  void chrome.windows.getCurrent().then((window) => {
    if (window.id === undefined) return
    return chrome.sidePanel.open({ windowId: window.id })
  })
})

if (document.body.classList.contains('sidepanel')) {
  openSide.hidden = true
}

onBus((message) => {
  if (message.type === 'mesh:status') {
    renderStatus(message.payload)
  }
})

async function boot(): Promise<void> {
  try {
    const identity = (await sendBus({ type: 'identity:get' })) as Identity
    who.textContent = identity.nick
    const [mods, state] = await Promise.all([
      sendBus({ type: 'modules:list' }),
      sendBus({ type: 'modules:get' }),
    ])
    renderModules(mods, state)
    renderStatus(await sendBus({ type: 'mesh:status:get' }))
  } catch (error) {
    who.textContent = 'nick indisponível'
    meshStatus.classList.add('error')
    meshStatus.textContent = error instanceof Error ? error.message : 'falha ao abrir a extensão'
  }
}

void boot()
