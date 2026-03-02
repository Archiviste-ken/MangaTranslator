// ─── Manga Translator · OCR Module (Tesseract.js) ───────────────────────────

import Tesseract from 'tesseract.js';
import { OCRResult, OCRProgress } from './types';

type ProgressCallback = (progress: OCRProgress) => void;

// Keep a worker alive for the session to reuse across images
let activeWorker: Tesseract.Worker | null = null;
let workerLang: string = '';

async function getWorker(language: string): Promise<Tesseract.Worker> {
  // Reuse existing worker if language matches
  if (activeWorker && workerLang === language) return activeWorker;

  // Tear down old worker
  if (activeWorker) {
    try { await activeWorker.terminate(); } catch { /* ignore */ }
  }

  // IMPORTANT: only pass a single language — Tesseract produces garbage with multiple
  const worker = await Tesseract.createWorker(language, undefined, {
    logger: () => {}, // silenced
  });

  // Optimize recognition parameters for manga
  await worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.AUTO, // automatic page segmentation
  });

  activeWorker = worker;
  workerLang = language;
  return worker;
}

/**
 * Converts an image element to a data URL with optional preprocessing.
 */
function imageToProcessedDataUrl(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Preprocess: convert to grayscale + increase contrast for better OCR
  try {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale using luminance formula
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

      // Increase contrast: push values toward black or white
      const contrast = 1.5; // contrast factor
      const adjusted = ((gray / 255 - 0.5) * contrast + 0.5) * 255;
      const clamped = Math.max(0, Math.min(255, adjusted));

      data[i] = clamped;
      data[i + 1] = clamped;
      data[i + 2] = clamped;
      // alpha stays the same
    }

    ctx.putImageData(imageData, 0, 0);
  } catch {
    // Canvas tainted — return unprocessed
  }

  return canvas.toDataURL('image/png');
}

/**
 * Fetches an image as a blob and converts to data URL.
 * Fallback for CORS-restricted images.
 */
async function fetchImageAsDataUrl(src: string): Promise<string> {
  const response = await fetch(src, { mode: 'cors' });
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Get a usable image source for Tesseract, with preprocessing.
 */
async function getImageSource(img: HTMLImageElement): Promise<string> {
  // Try canvas approach first (also does grayscale/contrast preprocessing)
  try {
    const dataUrl = imageToProcessedDataUrl(img);
    if (dataUrl && dataUrl.length > 100) return dataUrl;
  } catch {
    // Canvas tainted – fall through
  }

  // Fetch as blob (no preprocessing possible, but at least we get the image)
  try {
    return await fetchImageAsDataUrl(img.src);
  } catch {
    // Last resort: use original src
    return img.src;
  }
}

/**
 * Detect the SINGLE best OCR language for this page.
 * Returns exactly one language string (never multiple).
 */
export function detectPageLanguage(): string[] {
  const lang = document.documentElement.lang?.toLowerCase() || '';
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content')?.toLowerCase() || '';
  const bodyText = document.body?.innerText?.slice(0, 2000)?.toLowerCase() || '';

  const combined = `${url} ${title} ${metaDesc} ${bodyText}`;

  // Check for Japanese indicators
  const jpnIndicators = [
    lang.startsWith('ja'),
    url.includes('.jp'),
    /manga|rawdevart|rawkuma|mangaraw|senmanga|lhscan|loveheaven/i.test(url),
    /[\u3040-\u309F\u30A0-\u30FF]/.test(bodyText), // hiragana or katakana in body
  ];
  if (jpnIndicators.some(Boolean)) return ['jpn'];

  // Check for Korean indicators
  const korIndicators = [
    lang.startsWith('ko'),
    url.includes('.kr'),
    /manhwa|webtoon|toonily|mangatx|asura|reaper|luminous|flame/i.test(url),
    /[\uAC00-\uD7AF]/.test(bodyText), // hangul in body
  ];
  if (korIndicators.some(Boolean)) return ['kor'];

  // Check for Chinese indicators
  const chiIndicators = [
    lang.startsWith('zh'),
    url.includes('.cn') || url.includes('.tw'),
    /manhua|bilibili|kuaikan|dongman/i.test(url),
  ];
  if (chiIndicators.some(Boolean)) return ['chi_sim'];

  // Default to Japanese — the most common manga language
  return ['jpn'];
}

/**
 * Clean up OCR text — remove junk characters and noise.
 */
function cleanOCRText(raw: string): string {
  // Remove isolated single characters with no context (noise)
  let text = raw
    .replace(/[|｜\[\]【】{}()（）]/g, ' ')  // remove common OCR noise brackets
    .replace(/\b[A-Z]{1,2}\b/g, '')           // remove isolated 1-2 letter caps (artifacts)
    .replace(/\b\d{1,2}\b/g, '')              // remove isolated 1-2 digit numbers
    .replace(/[+*#@$%^&~`]/g, '')             // remove symbols never in manga
    .replace(/ {2,}/g, ' ')                   // collapse multiple spaces
    .replace(/\n{3,}/g, '\n\n')               // collapse excessive newlines
    .trim();

  // Remove lines that are mostly noise (single characters or random letters)
  const lines = text.split('\n');
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return false;
    if (trimmed.length <= 2) return false;           // too short to be meaningful
    // Check if line has actual CJK characters or reasonable content
    const cjkCount = (trimmed.match(/[\u3000-\u9FFF\uAC00-\uD7AF\u30A0-\u30FF\u3040-\u309F]/g) || []).length;
    const totalChars = trimmed.replace(/\s/g, '').length;
    // If it has CJK characters, keep it; otherwise need at least 3 chars
    if (cjkCount > 0) return true;
    if (totalChars >= 4) return true;
    return false;
  });

  return cleanedLines.join('\n').trim();
}

/**
 * Run OCR on a single image element.
 * Uses exactly one language at a time for accuracy.
 */
export async function recognizeImage(
  img: HTMLImageElement,
  languages: string[],
  onProgress?: ProgressCallback,
): Promise<OCRResult> {
  onProgress?.({ status: 'Preparing image…', progress: 0 });

  const source = await getImageSource(img);

  // Use only the first (best-guess) language
  const language = languages[0] || 'jpn';

  onProgress?.({ status: `Loading OCR engine (${language})…`, progress: 0.1 });

  const worker = await getWorker(language);

  onProgress?.({ status: 'Running OCR…', progress: 0.3 });

  const result = await worker.recognize(source);

  onProgress?.({ status: 'Processing results…', progress: 0.9 });

  const rawText = result.data.text.trim();
  const confidence = result.data.confidence;
  const cleanedText = cleanOCRText(rawText);

  onProgress?.({ status: 'OCR complete', progress: 1 });

  // If confidence is extremely low, likely garbage — return empty
  if (confidence < 15 || cleanedText.length < 3) {
    return { text: '', confidence: 0, language };
  }

  return { text: cleanedText, confidence, language };
}

/**
 * Terminate the worker and free resources.
 */
export async function terminateOCR(): Promise<void> {
  if (activeWorker) {
    try { await activeWorker.terminate(); } catch { /* ignore */ }
    activeWorker = null;
    workerLang = '';
  }
}
