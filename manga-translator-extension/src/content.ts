// ─── Manga Translator · Content Script ──────────────────────────────────────

import { ProcessingState, TranslationResult, INITIAL_STATE } from './types';
import { detectMangaImages } from './imageDetector';
import { recognizeImage, detectPageLanguage, terminateOCR } from './ocr';
import { translate } from './translate';
import { getCachedTranslation, setCachedTranslation, loadSettings } from './storage';
import { createSidebar, toggleSidebar, renderState, isSidebarOpen } from './overlay';
import { createFloatingButton, setFabProcessing } from './fab';

// ─── Duplicate Injection Guard ───────────────────────────────────────────────

if ((window as any).__mangaTranslatorInjected) {
  // Already running — bail out
} else {
  (window as any).__mangaTranslatorInjected = true;
  init();
}

// ─── State ───────────────────────────────────────────────────────────────────

let state: ProcessingState = { ...INITIAL_STATE };
let processingLock = false;
let lastClickTime = 0;
const DEBOUNCE_MS = 1000;

// ─── Init ────────────────────────────────────────────────────────────────────

function init(): void {
  createSidebar();
  createFloatingButton(handleTranslateClick);

  // Listen for clear-results event from overlay
  document.addEventListener('mt-clear-results', () => {
    state = { ...INITIAL_STATE };
    renderState(state);
  });

  // Listen for messages from popup/background
  chrome.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
    if (message.type === 'TRANSLATE_PAGE') {
      handleTranslateClick();
      sendResponse({ ok: true });
    }
    if (message.type === 'GET_STATE') {
      sendResponse({ state });
    }
    return true;
  });
}

// ─── Main Translation Flow ──────────────────────────────────────────────────

async function handleTranslateClick(): Promise<void> {
  // Debounce rapid clicks
  const now = Date.now();
  if (now - lastClickTime < DEBOUNCE_MS) return;
  lastClickTime = now;

  // Toggle sidebar if already done
  if (!state.isProcessing && state.currentStep === 'done') {
    toggleSidebar();
    return;
  }

  // Prevent duplicate processing
  if (processingLock) {
    toggleSidebar(true);
    return;
  }

  processingLock = true;
  toggleSidebar(true);

  state = {
    isProcessing: true,
    currentImage: 0,
    totalImages: 0,
    currentStep: 'detecting',
    results: [],
    error: null,
  };
  renderState(state);
  setFabProcessing(true);

  try {
    await processPage();
  } catch (err: any) {
    state.error = err.message || 'An unexpected error occurred';
    state.currentStep = 'error';
    state.isProcessing = false;
    renderState(state);
  } finally {
    processingLock = false;
    setFabProcessing(false);
  }
}

async function processPage(): Promise<void> {
  // Step 1: Detect images
  const images = await detectMangaImages();

  if (images.length === 0) {
    state.isProcessing = false;
    state.currentStep = 'done';
    state.error = 'No manga images detected on this page. Try scrolling to load more images.';
    renderState(state);
    return;
  }

  state.totalImages = images.length;
  renderState(state);

  const settings = await loadSettings();
  const languages = settings.autoDetectLang ? detectPageLanguage() : settings.ocrLanguages;

  // Step 2 & 3: OCR + Translate sequentially per image
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    state.currentImage = i + 1;

    // Check cache first
    if (settings.cacheEnabled) {
      const cached = await getCachedTranslation(img.src);
      if (cached) {
        state.results.push(cached);
        renderState(state);
        continue;
      }
    }

    // OCR
    state.currentStep = 'ocr';
    renderState(state);

    let ocrResult;
    try {
      ocrResult = await recognizeImage(img, languages);
    } catch (err: any) {
      // Non-fatal: skip this image
      const result: TranslationResult = {
        imageIndex: i,
        imageSrc: img.src,
        originalText: '',
        translatedText: '',
        language: languages[0],
        timestamp: Date.now(),
      };
      state.results.push(result);
      renderState(state);
      continue;
    }

    // Skip translation if no text found
    if (!ocrResult.text.trim()) {
      const result: TranslationResult = {
        imageIndex: i,
        imageSrc: img.src,
        originalText: '',
        translatedText: '',
        language: ocrResult.language,
        timestamp: Date.now(),
      };
      state.results.push(result);
      renderState(state);
      continue;
    }

    // Translate
    state.currentStep = 'translating';
    renderState(state);

    let translatedText = '';
    try {
      translatedText = await translate(ocrResult.text, settings.translation.targetLang);
    } catch (err: any) {
      translatedText = `[Translation error: ${err.message}]`;
    }

    const result: TranslationResult = {
      imageIndex: i,
      imageSrc: img.src,
      originalText: ocrResult.text,
      translatedText,
      language: ocrResult.language,
      timestamp: Date.now(),
    };

    // Cache the result
    if (settings.cacheEnabled) {
      await setCachedTranslation(img.src, result);
    }

    state.results.push(result);
    renderState(state);
  }

  // Done
  state.isProcessing = false;
  state.currentStep = 'done';
  renderState(state);

  // Free OCR resources
  await terminateOCR();
}
