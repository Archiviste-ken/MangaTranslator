// ─── Manga Translator · OCR Module (Tesseract.js) ───────────────────────────

import Tesseract from 'tesseract.js';
import { OCRResult, OCRProgress } from './types';

type ProgressCallback = (progress: OCRProgress) => void;

// Keep a scheduler alive for the session to reuse workers
let scheduler: Tesseract.Scheduler | null = null;
let loadedLangs: string[] = [];

async function getScheduler(languages: string[]): Promise<Tesseract.Scheduler> {
  const langKey = languages.sort().join('+');
  const currentKey = loadedLangs.sort().join('+');

  if (scheduler && langKey === currentKey) return scheduler;

  // Tear down old scheduler
  if (scheduler) {
    try { await scheduler.terminate(); } catch { /* ignore */ }
  }

  const newScheduler = Tesseract.createScheduler();

  // Create 1 worker (sequential processing to avoid freezing)
  const worker = await Tesseract.createWorker(languages, undefined, {
    logger: () => {}, // silenced – we use scheduler progress below
  });

  newScheduler.addWorker(worker);
  scheduler = newScheduler;
  loadedLangs = [...languages];

  return newScheduler;
}

/**
 * Converts an image element to a data URL.
 * Handles CORS by proxying through canvas.
 */
function imageToDataUrl(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
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
 * Get a usable image source for Tesseract.
 */
async function getImageSource(img: HTMLImageElement): Promise<string> {
  // Try canvas approach first
  try {
    const dataUrl = imageToDataUrl(img);
    // Verify it actually has pixel data (canvas might be tainted)
    if (dataUrl && dataUrl.length > 100) return dataUrl;
  } catch {
    // Canvas tainted – fall through
  }

  // Fetch as blob
  try {
    return await fetchImageAsDataUrl(img.src);
  } catch {
    // Last resort: use original src
    return img.src;
  }
}

/**
 * Auto-detect the most likely language based on the page's location and metadata.
 */
export function detectPageLanguage(): string[] {
  const lang = document.documentElement.lang?.toLowerCase() || '';
  const url = window.location.hostname;

  if (lang.startsWith('ja') || url.includes('.jp') || url.includes('manga')) {
    return ['jpn'];
  }
  if (lang.startsWith('ko') || url.includes('.kr') || url.includes('manhwa') || url.includes('webtoon')) {
    return ['kor'];
  }
  if (lang.startsWith('zh') || url.includes('.cn') || url.includes('manhua')) {
    return ['chi_sim'];
  }

  // Default: try all three
  return ['jpn', 'kor', 'chi_sim'];
}

/**
 * Run OCR on a single image element.
 */
export async function recognizeImage(
  img: HTMLImageElement,
  languages: string[],
  onProgress?: ProgressCallback,
): Promise<OCRResult> {
  onProgress?.({ status: 'Preparing image…', progress: 0 });

  const source = await getImageSource(img);

  onProgress?.({ status: 'Loading OCR engine…', progress: 0.1 });

  const sched = await getScheduler(languages);

  onProgress?.({ status: 'Running OCR…', progress: 0.3 });

  const result = await sched.addJob('recognize', source);

  onProgress?.({ status: 'OCR complete', progress: 1 });

  const text = result.data.text.trim();
  const confidence = result.data.confidence;
  const detectedLang = languages[0]; // Tesseract doesn't reliably expose detected script

  return { text, confidence, language: detectedLang };
}

/**
 * Terminate the scheduler and free resources.
 */
export async function terminateOCR(): Promise<void> {
  if (scheduler) {
    try { await scheduler.terminate(); } catch { /* ignore */ }
    scheduler = null;
    loadedLangs = [];
  }
}
