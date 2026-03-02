// ─── Manga Translator · Image Detection ─────────────────────────────────────

/**
 * Detects manga panel images on the current page.
 * Filters by size, aspect ratio, and container context to find likely manga panels.
 */

const MIN_WIDTH = 200;
const MIN_HEIGHT = 300;
const MIN_AREA = 80000; // ~283x283

// Selectors that commonly wrap manga panels
const READER_SELECTORS = [
  '.reader-area',
  '.reading-content',
  '.chapter-content',
  '.manga-reader',
  '.webtoon-viewer',
  '.comic-reader',
  '#manga-reader',
  '#reader',
  '#content',
  '.page-container',
  '.img-container',
  '.image-container',
  '.chapter-img',
  '.viewer-image',
  '[class*="reader"]',
  '[class*="chapter"]',
  '[class*="manga"]',
  '[class*="comic"]',
  '[class*="webtoon"]',
  '[id*="reader"]',
  '[id*="chapter"]',
];

// Classes/attributes that indicate non-manga images
const EXCLUDE_PATTERNS = [
  'avatar',
  'logo',
  'icon',
  'banner',
  'ad',
  'advertisement',
  'thumbnail',
  'thumb',
  'profile',
  'social',
  'share',
  'button',
  'nav',
  'header',
  'footer',
  'sidebar',
  'comment',
  'emoji',
  'badge',
  'rating',
];

function shouldExcludeImage(img: HTMLImageElement): boolean {
  const classAndId = `${img.className} ${img.id} ${img.alt || ''}`.toLowerCase();
  const parentClassAndId = img.parentElement
    ? `${img.parentElement.className} ${img.parentElement.id}`.toLowerCase()
    : '';

  const combined = classAndId + ' ' + parentClassAndId;

  return EXCLUDE_PATTERNS.some(pattern => combined.includes(pattern));
}

function isInsideReaderContainer(img: HTMLImageElement): boolean {
  let element: HTMLElement | null = img;
  let depth = 0;

  while (element && depth < 10) {
    const tagAndClass = `${element.tagName} ${element.className || ''} ${element.id || ''}`.toLowerCase();
    for (const sel of READER_SELECTORS) {
      try {
        if (element.matches?.(sel)) return true;
      } catch {
        // Invalid selector — skip
      }
    }
    element = element.parentElement;
    depth++;
  }

  return false;
}

function isLikelyMangaImage(img: HTMLImageElement): boolean {
  const width = img.naturalWidth || img.width || img.clientWidth;
  const height = img.naturalHeight || img.height || img.clientHeight;

  if (width < MIN_WIDTH || height < MIN_HEIGHT) return false;
  if (width * height < MIN_AREA) return false;

  // Exclude known non-manga images
  if (shouldExcludeImage(img)) return false;

  // Vertical or square ratio is preferred (manga pages are tall)
  const ratio = height / width;
  const isVertical = ratio >= 0.8;

  // If inside a reader container, be more lenient
  if (isInsideReaderContainer(img)) return true;

  // Outside reader: require vertical aspect ratio and larger size
  if (isVertical && width >= 400 && height >= 500) return true;

  return false;
}

/**
 * Waits for images to load, then returns candidate manga images.
 */
async function waitForImages(images: HTMLImageElement[]): Promise<HTMLImageElement[]> {
  const loaded: HTMLImageElement[] = [];

  for (const img of images) {
    if (img.complete && img.naturalWidth > 0) {
      loaded.push(img);
      continue;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('timeout')), 5000);
        img.addEventListener('load', () => { clearTimeout(timeout); resolve(); }, { once: true });
        img.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('load error')); }, { once: true });
      });
      loaded.push(img);
    } catch {
      // Skip images that fail to load
    }
  }

  return loaded;
}

/**
 * Main entry: detect and return all manga images on the page.
 */
export async function detectMangaImages(): Promise<HTMLImageElement[]> {
  const allImages = Array.from(document.querySelectorAll<HTMLImageElement>('img'));

  // Wait for images to finish loading
  const loadedImages = await waitForImages(allImages);

  // Filter to manga panels
  const candidates = loadedImages.filter(isLikelyMangaImage);

  // Sort by vertical position (top to bottom)
  candidates.sort((a, b) => {
    const rectA = a.getBoundingClientRect();
    const rectB = b.getBoundingClientRect();
    return rectA.top - rectB.top;
  });

  // Deduplicate by src
  const seen = new Set<string>();
  const unique: HTMLImageElement[] = [];
  for (const img of candidates) {
    const key = img.src || img.dataset.src || img.dataset.lazySrc || '';
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(img);
    }
  }

  return unique;
}
