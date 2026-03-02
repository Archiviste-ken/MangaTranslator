// ─── Manga Translator · Popup Script ────────────────────────────────────────

import { ExtensionSettings, TranslationProvider, DEFAULT_SETTINGS } from './types';
import { loadSettings, saveSettings, clearCache } from './storage';

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await loadSettings();
  populateForm(settings);
  attachEventListeners();
});

// ─── Form Population ─────────────────────────────────────────────────────────

function populateForm(settings: ExtensionSettings): void {
  setSelectValue('provider', settings.translation.provider);
  setInputValue('apiKey', settings.translation.apiKey);
  setInputValue('backendUrl', settings.translation.backendUrl);
  setSelectValue('targetLang', settings.translation.targetLang);
  setSelectValue('model', settings.translation.model);
  setCheckbox('autoDetect', settings.autoDetectLang);
  setCheckbox('cacheEnabled', settings.cacheEnabled);

  // Show/hide API key field based on provider
  toggleProviderFields(settings.translation.provider);

  // Set OCR language checkboxes
  const langCheckboxes = document.querySelectorAll<HTMLInputElement>('input[name="ocrLang"]');
  langCheckboxes.forEach(cb => {
    cb.checked = settings.ocrLanguages.includes(cb.value);
  });
}

// ─── Event Listeners ─────────────────────────────────────────────────────────

function attachEventListeners(): void {
  // Provider change
  const providerSelect = document.getElementById('provider') as HTMLSelectElement;
  providerSelect?.addEventListener('change', () => {
    toggleProviderFields(providerSelect.value as TranslationProvider);
  });

  // Save settings
  document.getElementById('saveBtn')?.addEventListener('click', handleSave);

  // Translate current page
  document.getElementById('translateBtn')?.addEventListener('click', handleTranslate);

  // Clear cache
  document.getElementById('clearCacheBtn')?.addEventListener('click', handleClearCache);
}

async function handleSave(): Promise<void> {
  const statusEl = document.getElementById('status')!;
  try {
    const provider = getSelectValue('provider') as TranslationProvider;
    const langCheckboxes = document.querySelectorAll<HTMLInputElement>('input[name="ocrLang"]:checked');
    const ocrLanguages = Array.from(langCheckboxes).map(cb => cb.value);

    const settings: Partial<ExtensionSettings> = {
      translation: {
        provider,
        apiKey: getInputValue('apiKey'),
        backendUrl: getInputValue('backendUrl'),
        targetLang: getSelectValue('targetLang'),
        model: getSelectValue('model'),
      },
      autoDetectLang: getCheckbox('autoDetect'),
      cacheEnabled: getCheckbox('cacheEnabled'),
      ocrLanguages: ocrLanguages.length > 0 ? ocrLanguages : DEFAULT_SETTINGS.ocrLanguages,
    };

    await saveSettings(settings);
    showStatus(statusEl, 'Settings saved!', 'success');
  } catch (err: any) {
    showStatus(statusEl, `Error: ${err.message}`, 'error');
  }
}

async function handleTranslate(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { type: 'TRANSLATE_PAGE' });
      window.close();
    }
  } catch {
    // Content script not injected yet, inject it
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['dist/content.js'],
      });
      setTimeout(async () => {
        await chrome.tabs.sendMessage(tab.id!, { type: 'TRANSLATE_PAGE' });
        window.close();
      }, 500);
    }
  }
}

async function handleClearCache(): Promise<void> {
  const statusEl = document.getElementById('status')!;
  await clearCache();
  showStatus(statusEl, 'Cache cleared!', 'success');
}

// ─── UI Helpers ──────────────────────────────────────────────────────────────

function toggleProviderFields(provider: TranslationProvider): void {
  const apiKeyGroup = document.getElementById('apiKeyGroup');
  const backendUrlGroup = document.getElementById('backendUrlGroup');
  const modelGroup = document.getElementById('modelGroup');

  if (apiKeyGroup) apiKeyGroup.style.display = provider === 'backend' ? 'none' : 'block';
  if (backendUrlGroup) backendUrlGroup.style.display = provider === 'backend' ? 'block' : 'none';
  if (modelGroup) modelGroup.style.display = (provider === 'openai' || provider === 'groq') ? 'block' : 'none';

  // Update model dropdown options based on provider
  const modelSelect = document.getElementById('model') as HTMLSelectElement;
  if (modelSelect) {
    const currentVal = modelSelect.value;
    modelSelect.innerHTML = '';
    const models = provider === 'groq'
      ? [
          { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (best)' },
          { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (fastest)' },
          { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
          { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
        ]
      : [
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini (fast)' },
          { value: 'gpt-4o', label: 'GPT-4o (accurate)' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (cheapest)' },
        ];
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.value;
      opt.textContent = m.label;
      modelSelect.appendChild(opt);
    });
    // Restore selection if still valid
    if (models.some(m => m.value === currentVal)) {
      modelSelect.value = currentVal;
    }
  }
}

function showStatus(el: HTMLElement, message: string, type: 'success' | 'error'): void {
  el.textContent = message;
  el.className = `popup-status popup-status-${type}`;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function getInputValue(id: string): string {
  return (document.getElementById(id) as HTMLInputElement)?.value || '';
}

function setInputValue(id: string, value: string): void {
  const el = document.getElementById(id) as HTMLInputElement;
  if (el) el.value = value;
}

function getSelectValue(id: string): string {
  return (document.getElementById(id) as HTMLSelectElement)?.value || '';
}

function setSelectValue(id: string, value: string): void {
  const el = document.getElementById(id) as HTMLSelectElement;
  if (el) el.value = value;
}

function getCheckbox(id: string): boolean {
  return (document.getElementById(id) as HTMLInputElement)?.checked || false;
}

function setCheckbox(id: string, value: boolean): void {
  const el = document.getElementById(id) as HTMLInputElement;
  if (el) el.checked = value;
}
