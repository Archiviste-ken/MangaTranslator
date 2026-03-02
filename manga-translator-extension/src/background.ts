// ─── Manga Translator · Background Service Worker ───────────────────────────

import { loadSettings, saveSettings, clearCache } from './storage';

// ─── Message Handler ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(err => sendResponse({ error: err.message }));
  return true; // keep channel open for async response
});

async function handleMessage(message: any, _sender: chrome.runtime.MessageSender): Promise<any> {
  switch (message.type) {
    case 'GET_SETTINGS':
      return await loadSettings();

    case 'SAVE_SETTINGS':
      return await saveSettings(message.payload);

    case 'CLEAR_CACHE':
      await clearCache();
      return { ok: true };

    case 'TRANSLATE_TEXT': {
      // Proxy translation through background for CORS-free requests
      const { text, targetLang } = message.payload;
      const settings = await loadSettings();

      if (settings.translation.provider === 'backend') {
        const res = await fetch(`${settings.translation.backendUrl}/api/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, targetLang }),
        });
        if (!res.ok) throw new Error(`Backend error: ${res.statusText}`);
        const data = await res.json();
        return { translation: data.translation };
      }

      return { error: 'Direct translation should happen in content script' };
    }

    default:
      return { error: `Unknown message type: ${message.type}` };
  }
}

// ─── Extension Install / Update ──────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Initialize default settings on first install
    await loadSettings();
    console.log('[Manga Translator] Extension installed. Default settings saved.');
  }

  if (details.reason === 'update') {
    console.log(`[Manga Translator] Updated to version ${chrome.runtime.getManifest().version}`);
  }
});

// ─── Context Menu (optional: right-click to translate) ───────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create({
    id: 'manga-translate-page',
    title: 'Translate manga on this page',
    contexts: ['page', 'image'],
  });
});

chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'manga-translate-page' && tab?.id) {
    await chrome.tabs.sendMessage(tab.id, { type: 'TRANSLATE_PAGE' });
  }
});
