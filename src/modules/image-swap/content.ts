import { DEFAULT_PACK_ID } from '../../core/constants'
import { getActivePackId, getModuleState, getPacks } from '../../core/storage'
import { builtinPack } from './faces'

const MARK = 'data-muvuca'
const ORIGINAL_SRC = 'data-muvuca-src'
const ORIGINAL_SRCSET = 'data-muvuca-srcset'
const ORIGINAL_BG = 'data-muvuca-bg'
const MIN_SIZE = 8

let images: string[] = []
let enabled = false
let observer: MutationObserver | null = null
const blobCache = new Map<string, string>()

function hash(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick(key: string): string {
  return images[hash(key) % images.length]
}

function toUrl(dataUrl: string): string {
  const cached = blobCache.get(dataUrl)
  if (cached) return cached
  if (dataUrl.startsWith('data:image/svg')) {
    blobCache.set(dataUrl, dataUrl)
    return dataUrl
  }
  try {
    const [header, body] = dataUrl.split(',')
    const mime = /data:(.*?);/.exec(header)?.[1] ?? 'image/jpeg'
    const binary = atob(body)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
    blobCache.set(dataUrl, url)
    return url
  } catch {
    return dataUrl
  }
}

function isTiny(el: HTMLElement): boolean {
  const width = el.offsetWidth || Number(el.getAttribute('width')) || 0
  const height = el.offsetHeight || Number(el.getAttribute('height')) || 0
  if (width === 0 && height === 0) return false
  return width > 0 && height > 0 && width <= MIN_SIZE && height <= MIN_SIZE
}

function swapImg(img: HTMLImageElement): void {
  if (!enabled || images.length === 0) return
  if (img.getAttribute(MARK) === '1') return
  if (isTiny(img)) return
  const original = img.currentSrc || img.src
  if (!original) return
  img.setAttribute(ORIGINAL_SRC, img.getAttribute('src') ?? original)
  if (img.srcset) img.setAttribute(ORIGINAL_SRCSET, img.srcset)
  img.setAttribute(MARK, '1')
  const next = toUrl(pick(original))
  img.srcset = ''
  img.src = next
  img.removeAttribute('srcset')
}

function restoreImg(img: HTMLImageElement): void {
  if (img.getAttribute(MARK) !== '1') return
  const src = img.getAttribute(ORIGINAL_SRC)
  const srcset = img.getAttribute(ORIGINAL_SRCSET)
  if (src) img.src = src
  if (srcset) img.srcset = srcset
  img.removeAttribute(MARK)
  img.removeAttribute(ORIGINAL_SRC)
  img.removeAttribute(ORIGINAL_SRCSET)
}

function swapBg(el: HTMLElement): void {
  if (!enabled || images.length === 0) return
  if (el.getAttribute(MARK) === 'bg') return
  if (isTiny(el)) return
  const bg = getComputedStyle(el).backgroundImage
  if (!bg || bg === 'none' || !bg.includes('url(')) return
  el.setAttribute(ORIGINAL_BG, el.style.backgroundImage)
  el.setAttribute(MARK, 'bg')
  el.style.backgroundImage = `url("${toUrl(pick(bg))}")`
}

function restoreBg(el: HTMLElement): void {
  if (el.getAttribute(MARK) !== 'bg') return
  const original = el.getAttribute(ORIGINAL_BG) ?? ''
  el.style.backgroundImage = original
  el.removeAttribute(MARK)
  el.removeAttribute(ORIGINAL_BG)
}

function scan(root: ParentNode = document): void {
  root.querySelectorAll('img').forEach((img) => swapImg(img))
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    if (el.tagName === 'IMG') return
    const style = el.getAttribute('style')
    if (style && /background-image/i.test(style)) swapBg(el)
  })
}

function restoreAll(): void {
  document.querySelectorAll<HTMLImageElement>(`img[${MARK}="1"]`).forEach(restoreImg)
  document.querySelectorAll<HTMLElement>(`[${MARK}="bg"]`).forEach(restoreBg)
}

function startObserver(): void {
  observer?.disconnect()
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement) && !(node instanceof DocumentFragment)) return
          if (node instanceof HTMLImageElement) swapImg(node)
          else scan(node)
        })
      } else if (mutation.type === 'attributes' && mutation.target instanceof HTMLImageElement) {
        if (mutation.target.getAttribute(MARK) === '1') return
        swapImg(mutation.target)
      }
    }
  })
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'srcset'],
  })
}

export async function refreshImageSwap(): Promise<void> {
  const state = await getModuleState()
  enabled = Boolean(state['image-swap'])
  const packs = await getPacks()
  const activeId = await getActivePackId()
  const pack =
    packs.find((item) => item.id === activeId && item.images.length > 0) ??
    packs.find((item) => item.id === DEFAULT_PACK_ID && item.images.length > 0) ??
    builtinPack()
  images = pack.images.filter(Boolean)
  restoreAll()
  if (!enabled || images.length === 0) {
    observer?.disconnect()
    observer = null
    return
  }
  scan()
  startObserver()
}
