// ─── Manga Translator Web · OpenAI Library ──────────────────────────────────

import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn('[Manga Translator] OPENAI_API_KEY not set. Translation will fail.');
}

export const openai = new OpenAI({
  apiKey: apiKey || 'missing-key',
});

/**
 * Translate text using OpenAI GPT.
 */
export async function translateWithOpenAI(
  text: string,
  targetLang: string = 'en',
  model: string = 'gpt-4o-mini',
): Promise<string> {
  const languageNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    pt: 'Portuguese', zh: 'Chinese', ko: 'Korean', ja: 'Japanese',
    ru: 'Russian', ar: 'Arabic',
  };

  const langName = languageNames[targetLang] || targetLang;

  const response = await openai.chat.completions.create({
    model,
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
export async function translateBatchWithOpenAI(
  texts: string[],
  targetLang: string = 'en',
  model: string = 'gpt-4o-mini',
): Promise<string[]> {
  const combined = texts
    .map((t, i) => `[${i}] ${t}`)
    .join('\n---\n');

  const result = await translateWithOpenAI(combined, targetLang, model);

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
