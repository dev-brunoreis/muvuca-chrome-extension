import { refreshImageSwap } from '../modules/image-swap/content'

void refreshImageSwap()

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  if (changes.moduleState || changes.packs || changes.activePackId) {
    void refreshImageSwap()
  }
})

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'modules:changed' || message?.type === 'packs:changed') {
    void refreshImageSwap()
  }
})
