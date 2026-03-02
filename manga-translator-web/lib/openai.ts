// ─── Manga Translator Web · Groq/OpenAI Library ─────────────────────────────
// Supports both Groq (default) and OpenAI as backends.
// Uses the OpenAI SDK since Groq exposes an OpenAI-compatible API.

import OpenAI from 'openai';

// ─── Client Setup ────────────────────────────────────────────────────────────

const groqApiKey = process.env.GROQ_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

// Prefer Groq, fallback to OpenAI
const activeProvider = groqApiKey ? 'groq' : openaiApiKey ? 'openai' : null;
const activeKey = groqApiKey || openaiApiKey || 'missing-key';
const baseURL = groqApiKey
  ? 'https://api.groq.com/openai/v1'
  : 'https://api.openai.com/v1';

if (!activeProvider) {
  console.warn('[Manga Translator] Neither GROQ_API_KEY nor OPENAI_API_KEY is set. Translation will fail.');
}

export const client = new OpenAI({
  apiKey: activeKey,
  baseURL,
});

export { activeProvider };

// Default models per provider
const DEFAULT_MODEL: Record<string, string> = {
  groq: 'llama-3.3-70b-versatile',
  openai: 'gpt-4o-mini',
};

// ─── Language Names ──────────────────────────────────────────────────────────

const languageNames: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German',
  pt: 'Portuguese', zh: 'Chinese', ko: 'Korean', ja: 'Japanese',
  ru: 'Russian', ar: 'Arabic',
};

// ─── Translation ─────────────────────────────────────────────────────────────

/**
 * Translate text using the active AI provider (Groq or OpenAI).
 */
export async function translateText(
  text: string,
  targetLang: string = 'en',
  model?: string,
): Promise<string> {
  const langName = languageNames[targetLang] || targetLang;
  const useModel = model || DEFAULT_MODEL[activeProvider || 'groq'];

  const response = await client.chat.completions.create({
    model: useModel,
    messages: [
      {
        role: 'system',
        content: `You are a professional manga/manhwa translator. Translate text to ${langName}. 
Preserve meaning, tone, and nuance. For sound effects (onomatopoeia), provide a natural English equivalent in parentheses.
Only return the translation, no explanations.`,
      },
      {
        role: 'user',
        content: text,
      },
    ],
    temperature: 0.3,
    max_tokens: 2048,
  });

  return response.choices[0]?.message?.content?.trim() || '';
}

/**
 * Translate a batch of texts.
 */
export async function translateBatch(
  texts: string[],
  targetLang: string = 'en',
  model?: string,
): Promise<string[]> {
  const combined = texts
    .map((t, i) => `[${i}] ${t}`)
    .join('\n---\n');

  const result = await translateText(combined, targetLang, model);

  // Parse numbered response
  const parsed: string[] = new Array(texts.length).fill('');
  const lines = result.split('\n');
  let currentIdx = -1;
  let currentText = '';

  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s*(.*)/);
    if (match) {
      if (currentIdx >= 0 && currentIdx < texts.length) {
        parsed[currentIdx] = currentText.trim();
      }
      currentIdx = parseInt(match[1], 10);
      currentText = match[2];
    } else if (line.trim() === '---') {
      if (currentIdx >= 0 && currentIdx < texts.length) {
        parsed[currentIdx] = currentText.trim();
      }
    } else {
      currentText += '\n' + line;
    }
  }

  if (currentIdx >= 0 && currentIdx < texts.length) {
    parsed[currentIdx] = currentText.trim();
  }

  // Fallback
  if (parsed.every(r => !r) && result.trim()) {
    parsed[0] = result.trim();
  }

  return parsed;
}
