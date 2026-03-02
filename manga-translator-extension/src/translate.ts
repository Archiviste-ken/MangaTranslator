// ─── Manga Translator · Translation Module ──────────────────────────────────

import { TranslationConfig, TranslationProvider } from './types';
import { loadSettings } from './storage';

// ─── Provider Adapters ───────────────────────────────────────────────────────

interface TranslationAdapter {
  translate(text: string, targetLang: string, config: TranslationConfig): Promise<string>;
  translateBatch(texts: string[], targetLang: string, config: TranslationConfig): Promise<string[]>;
}

// ─── Groq Adapter (OpenAI-compatible, uses Groq cloud) ─────────────────────

const groqAdapter: TranslationAdapter = {
  async translate(text, targetLang, config) {
    const [result] = await this.translateBatch([text], targetLang, config);
    return result;
  },

  async translateBatch(texts, targetLang, config) {
    const combinedText = texts
      .map((t, i) => `[${i}] ${t}`)
      .join('\n---\n');

    const systemPrompt = `You are a professional manga/manhwa translator. Translate the following text to ${getLanguageName(targetLang)}. 
Preserve the meaning, tone, and nuance. Manga text often has sound effects (onomatopoeia) — transliterate or translate them naturally.
The input contains numbered segments separated by ---. Return the same numbered format with translations.
If a segment contains only sound effects, provide a brief English equivalent in parentheses.
Do not add explanations. Only output the translations.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: combinedText },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Groq API error: ${(err as any)?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const raw: string = data.choices?.[0]?.message?.content || '';

    return parseNumberedResponse(raw, texts.length);
  },
};

// ─── OpenAI Adapter ──────────────────────────────────────────────────────────

const openaiAdapter: TranslationAdapter = {
  async translate(text, targetLang, config) {
    const [result] = await this.translateBatch([text], targetLang, config);
    return result;
  },

  async translateBatch(texts, targetLang, config) {
    const combinedText = texts
      .map((t, i) => `[${i}] ${t}`)
      .join('\n---\n');

    const systemPrompt = `You are a professional manga/manhwa translator. Translate the following text to ${getLanguageName(targetLang)}. 
Preserve the meaning, tone, and nuance. Manga text often has sound effects (onomatopoeia) — transliterate or translate them naturally.
The input contains numbered segments separated by ---. Return the same numbered format with translations.
If a segment contains only sound effects, provide a brief English equivalent in parentheses.
Do not add explanations. Only output the translations.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: combinedText },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${(err as any)?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const raw: string = data.choices?.[0]?.message?.content || '';

    return parseNumberedResponse(raw, texts.length);
  },
};

// ─── Google Translate Adapter ────────────────────────────────────────────────

const googleAdapter: TranslationAdapter = {
  async translate(text, targetLang, config) {
    const url = `https://translation.googleapis.com/language/translate/v2`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        target: targetLang,
        format: 'text',
        key: config.apiKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data?.translations?.[0]?.translatedText || text;
  },

  async translateBatch(texts, targetLang, config) {
    const url = `https://translation.googleapis.com/language/translate/v2`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: texts,
        target: targetLang,
        format: 'text',
        key: config.apiKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.data?.translations || []).map((t: any) => t.translatedText);
  },
};

// ─── DeepL Adapter ───────────────────────────────────────────────────────────

const deeplAdapter: TranslationAdapter = {
  async translate(text, targetLang, config) {
    const [result] = await this.translateBatch([text], targetLang, config);
    return result;
  },

  async translateBatch(texts, targetLang, config) {
    const deeplLang = targetLang.toUpperCase() === 'EN' ? 'EN-US' : targetLang.toUpperCase();
    const params = new URLSearchParams();
    params.append('auth_key', config.apiKey);
    texts.forEach(t => params.append('text', t));
    params.append('target_lang', deeplLang);

    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.translations || []).map((t: any) => t.text);
  },
};

// ─── Backend Adapter (Next.js) ───────────────────────────────────────────────

const backendAdapter: TranslationAdapter = {
  async translate(text, targetLang, config) {
    const response = await fetch(`${config.backendUrl}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.translation || text;
  },

  async translateBatch(texts, targetLang, config) {
    const response = await fetch(`${config.backendUrl}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, targetLang, batch: true }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.translations || texts;
  },
};

// ─── Adapter Registry ────────────────────────────────────────────────────────

const adapters: Record<TranslationProvider, TranslationAdapter> = {
  groq: groqAdapter,
  openai: openaiAdapter,
  google: googleAdapter,
  deepl: deeplAdapter,
  backend: backendAdapter,
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Translate a single text string.
 */
export async function translate(text: string, targetLang = 'en'): Promise<string> {
  if (!text.trim()) return '';

  const settings = await loadSettings();
  const config = settings.translation;
  const adapter = adapters[config.provider];

  if (!adapter) {
    throw new Error(`Unknown translation provider: ${config.provider}`);
  }

  if (!config.apiKey && config.provider !== 'backend') {
    throw new Error(`No API key configured for ${config.provider}. Please set it in the extension popup.`);
  }

  return adapter.translate(text.trim(), targetLang, config);
}

/**
 * Translate an array of text strings in a single batch.
 */
export async function translateBatch(texts: string[], targetLang = 'en'): Promise<string[]> {
  const nonEmpty = texts.map(t => t.trim());
  if (nonEmpty.every(t => !t)) return texts.map(() => '');

  const settings = await loadSettings();
  const config = settings.translation;
  const adapter = adapters[config.provider];

  if (!adapter) {
    throw new Error(`Unknown translation provider: ${config.provider}`);
  }

  if (!config.apiKey && config.provider !== 'backend') {
    throw new Error(`No API key configured for ${config.provider}. Please set it in the extension popup.`);
  }

  return adapter.translateBatch(nonEmpty, targetLang, config);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    pt: 'Portuguese',
    zh: 'Chinese',
    ko: 'Korean',
    ja: 'Japanese',
    ru: 'Russian',
    ar: 'Arabic',
  };
  return names[code] || code;
}

function parseNumberedResponse(raw: string, count: number): string[] {
  const results: string[] = new Array(count).fill('');
  const lines = raw.split('\n');
  let currentIdx = -1;
  let currentText = '';

  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s*(.*)/);
    if (match) {
      if (currentIdx >= 0 && currentIdx < count) {
        results[currentIdx] = currentText.trim();
      }
      currentIdx = parseInt(match[1], 10);
      currentText = match[2];
    } else if (line.trim() === '---') {
      // separator, save current
      if (currentIdx >= 0 && currentIdx < count) {
        results[currentIdx] = currentText.trim();
      }
    } else {
      currentText += '\n' + line;
    }
  }

  // Save last segment
  if (currentIdx >= 0 && currentIdx < count) {
    results[currentIdx] = currentText.trim();
  }

  // Fallback: if we failed to parse, just return the whole thing for first slot
  if (results.every(r => !r) && raw.trim()) {
    results[0] = raw.trim();
  }

  return results;
}
