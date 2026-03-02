// ─── Manga Translator · Storage Utility ─────────────────────────────────────

import { ExtensionSettings, DEFAULT_SETTINGS, TranslationResult } from './types';

const SETTINGS_KEY = 'manga_translator_settings';
const CACHE_KEY = 'manga_translator_cache';

export async function loadSettings(): Promise<ExtensionSettings> {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    if (result[SETTINGS_KEY]) {
      return { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] };
    }
    return { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await loadSettings();
  const merged = { ...current, ...settings };
  await chrome.storage.local.set({ [SETTINGS_KEY]: merged });
  return merged;
}

// ─── Translation Cache ───────────────────────────────────────────────────────

interface CacheEntry {
  result: TranslationResult;
  expiry: number;
}

const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function getCachedTranslation(imageUrl: string): Promise<TranslationResult | null> {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY);
    const cache: Record<string, CacheEntry> = result[CACHE_KEY] || {};
    const entry = cache[imageUrl];
    if (entry && entry.expiry > Date.now()) {
      return entry.result;
    }
    // Expired – clean up
    if (entry) {
      delete cache[imageUrl];
      await chrome.storage.local.set({ [CACHE_KEY]: cache });
    }
    return null;
  } catch {
    return null;
  }
}

export async function setCachedTranslation(imageUrl: string, result: TranslationResult): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(CACHE_KEY);
    const cache: Record<string, CacheEntry> = stored[CACHE_KEY] || {};
    cache[imageUrl] = { result, expiry: Date.now() + CACHE_TTL };

    // Evict oldest entries if cache grows too large (max 200)
    const keys = Object.keys(cache);
    if (keys.length > 200) {
      const sorted = keys.sort((a, b) => cache[a].expiry - cache[b].expiry);
      for (let i = 0; i < keys.length - 200; i++) {
        delete cache[sorted[i]];
      }
    }

    await chrome.storage.local.set({ [CACHE_KEY]: cache });
  } catch {
    // Silently fail – cache is non-critical
  }
}

export async function clearCache(): Promise<void> {
  await chrome.storage.local.remove(CACHE_KEY);
}
