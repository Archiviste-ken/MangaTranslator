// ─── Manga Translator · Types ───────────────────────────────────────────────

export interface TranslationResult {
  imageIndex: number;
  imageSrc: string;
  originalText: string;
  translatedText: string;
  language: string;
  timestamp: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
}

export interface OCRProgress {
  status: string;
  progress: number;
}

export type TranslationProvider = 'openai' | 'google' | 'deepl' | 'backend';

export interface TranslationConfig {
  provider: TranslationProvider;
  apiKey: string;
  targetLang: string;
  backendUrl: string;
  model: string;
}

export interface ExtensionSettings {
  translation: TranslationConfig;
  ocrLanguages: string[];
  autoDetectLang: boolean;
  cacheEnabled: boolean;
  maxConcurrent: number;
  theme: 'dark' | 'light';
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  translation: {
    provider: 'openai',
    apiKey: '',
    targetLang: 'en',
    backendUrl: 'http://localhost:3000',
    model: 'gpt-4o-mini',
  },
  ocrLanguages: ['jpn', 'kor', 'chi_sim'],
  autoDetectLang: true,
  cacheEnabled: true,
  maxConcurrent: 1,
  theme: 'dark',
};

export interface ProcessingState {
  isProcessing: boolean;
  currentImage: number;
  totalImages: number;
  currentStep: 'idle' | 'detecting' | 'ocr' | 'translating' | 'done' | 'error';
  results: TranslationResult[];
  error: string | null;
}

export const INITIAL_STATE: ProcessingState = {
  isProcessing: false,
  currentImage: 0,
  totalImages: 0,
  currentStep: 'idle',
  results: [],
  error: null,
};

// Messages between content script and background
export type MessageType =
  | { type: 'TRANSLATE_PAGE' }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; payload: Partial<ExtensionSettings> }
  | { type: 'TRANSLATE_TEXT'; payload: { text: string; targetLang: string } }
  | { type: 'CLEAR_CACHE' }
  | { type: 'GET_STATE' };
