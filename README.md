# Manga Translator

A production-quality Chrome Extension (Manifest V3) and Next.js backend that translates manga, manhwa, and manhua pages in real-time using OCR and AI-powered translation.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-brightgreen?logo=googlechrome)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)
![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)

---

## Features

- **Universal Compatibility** — Works on any manga/manhwa/manhua website
- **Smart Image Detection** — Automatically identifies manga panel images based on size, aspect ratio, and DOM context
- **Multi-language OCR** — Tesseract.js-powered text extraction for Japanese, Korean, and Chinese
- **Multiple Translation Providers** — Supports OpenAI GPT, Google Translate, DeepL, and a self-hosted backend
- **Elegant UI** — Floating action button + slide-in sidebar with dark theme
- **Draggable FAB** — Move the floating button anywhere on screen
- **Translation Caching** — Avoids re-processing previously translated images
- **Sequential Processing** — Prevents browser freezing by processing images one at a time
- **Duplicate Injection Guard** — Safe to reload/re-inject without duplicating UI
- **CORS Handling** — Multiple fallback strategies for loading cross-origin images
- **Progress Indicators** — Real-time progress bar and loading animations
- **Copy to Clipboard** — One-click copy of translated text
- **Responsive** — Full-screen sidebar on mobile

---

## Project Structure

```
MangaTranslator/
├── manga-translator-extension/     # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── popup.html
│   ├── tailwind.css
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── esbuild.config.mjs
│   ├── package.json
│   └── src/
│       ├── content.ts               # Main orchestrator (injected into pages)
│       ├── background.ts            # Service worker
│       ├── popup.ts                 # Extension popup logic
│       ├── overlay.ts               # Sidebar UI rendering
│       ├── fab.ts                   # Floating action button
│       ├── ocr.ts                   # Tesseract.js OCR module
│       ├── translate.ts             # Translation adapter (OpenAI/Google/DeepL/Backend)
│       ├── imageDetector.ts         # Manga image detection heuristics
│       ├── storage.ts               # Chrome storage + caching
│       ├── types.ts                 # TypeScript interfaces
│       └── styles.css               # Injected styles (scoped)
│
└── manga-translator-web/           # Next.js Backend (optional)
    ├── package.json
    ├── next.config.js
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env.example
    ├── lib/
    │   └── openai.ts                # OpenAI client library
    └── app/
        ├── layout.tsx
        ├── page.tsx                 # Landing page
        ├── globals.css
        └── api/
            ├── translate/route.ts   # POST /api/translate
            └── ocr/route.ts         # POST /api/ocr
```

---

## Installation

### Prerequisites

- Node.js 18+ and npm
- Google Chrome (or Chromium-based browser)
- An API key for at least one translation provider

### 1. Chrome Extension

```bash
cd manga-translator-extension

# Install dependencies
npm install

# Build the extension
npm run build:all

# Or for development (watch mode)
npm run dev
```

**Load into Chrome:**

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `manga-translator-extension` folder
5. The extension icon appears in your toolbar

### 2. Next.js Backend (Optional)

Only needed if you want to proxy translations through your own server.

```bash
cd manga-translator-web

# Install dependencies
npm install

# Create your environment file
cp .env.example .env.local
# Edit .env.local and add your OPENAI_API_KEY

# Start the dev server
npm run dev
```

The backend runs at `http://localhost:3000`.

---

## API Key Setup

### OpenAI (Default)

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. In the extension popup, select **OpenAI (GPT)** as provider
4. Paste your key in the **API Key** field
5. Click **Save Settings**

### Google Translate

1. Enable the Cloud Translation API in [Google Cloud Console](https://console.cloud.google.com/)
2. Create an API key with Translation API access
3. Select **Google Translate** in the extension popup
4. Paste the key and save

### DeepL

1. Sign up at [deepl.com/pro-api](https://www.deepl.com/pro-api)
2. Get your authentication key
3. Select **DeepL** in the extension popup
4. Paste the key and save

### Local Backend

1. Start the Next.js backend (see above)
2. Select **Local Backend** in the extension popup
3. Set the backend URL (default: `http://localhost:3000`)
4. The backend uses the `OPENAI_API_KEY` from its `.env.local`

---

## Usage

1. Navigate to any manga/manhwa reading site
2. Click the **floating translate button** (bottom-right)
3. The sidebar opens and shows processing progress
4. Wait for OCR and translation to complete
5. Read translated text in the sidebar
6. Click **Copy** on any translation to copy it

### Tips

- **Drag** the floating button to reposition it
- Translations are **cached** — revisiting a page won't re-process
- Use **GPT-4o Mini** for the best speed/cost balance
- Use **GPT-4o** for the most accurate translations
- The extension **auto-detects** the source language based on the site's URL and metadata

---

## Supported Languages

### Source (OCR)

| Language | Code |
|----------|------|
| Japanese | `jpn` |
| Korean | `kor` |
| Chinese (Simplified) | `chi_sim` |

### Target (Translation)

English, Spanish, French, German, Portuguese, Russian, Arabic, Chinese, Korean, Japanese

---

## API Endpoints (Backend)

### POST `/api/translate`

**Single text:**
```json
{
  "text": "こんにちは世界",
  "targetLang": "en"
}
```

**Batch:**
```json
{
  "texts": ["こんにちは", "世界"],
  "targetLang": "en",
  "batch": true
}
```

### POST `/api/ocr`

**JSON (URL):**
```json
{
  "imageUrl": "https://example.com/manga-page.jpg",
  "langs": ["jpn"]
}
```

**Form Data (file upload):**
```
image: <file>
langs: jpn,kor
```

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  Chrome Extension                 │
│                                                   │
│  content.ts ─── imageDetector.ts                  │
│       │              │                            │
│       ├── ocr.ts (Tesseract.js in-browser)        │
│       │                                           │
│       ├── translate.ts ─── OpenAI / Google / DeepL│
│       │                        │                  │
│       │                  ┌─────┴─────┐            │
│       │                  │  Backend  │ (optional)  │
│       │                  │  Adapter  │            │
│       │                  └─────┬─────┘            │
│       │                        │                  │
│       ├── overlay.ts (sidebar UI)                 │
│       └── fab.ts (floating button)                │
│                                                   │
│  background.ts ─── storage.ts (cache + settings)  │
│  popup.ts ─── popup.html (settings UI)            │
└──────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────┐
│              Next.js Backend (optional)           │
│                                                   │
│  /api/translate ─── lib/openai.ts                 │
│  /api/ocr ─── Tesseract.js (server-side)          │
└──────────────────────────────────────────────────┘
```

---

## Limitations

- **CORS**: Some manga sites restrict image loading from other origins. The extension uses multiple fallback strategies (canvas → fetch → direct URL), but some images may fail to process
- **OCR Accuracy**: Tesseract.js accuracy varies with image quality, font style, and text density. Stylized manga fonts may produce lower-quality results
- **API Costs**: OpenAI and DeepL charge per request. Use caching and GPT-4o Mini to reduce costs
- **Dynamic Loading**: Sites that lazy-load images require scrolling first to load all panels
- **Performance**: OCR is CPU-intensive. Processing many images may slow down the browser temporarily
- **Sound Effects**: Manga onomatopoeia embedded in artwork cannot be captured by OCR

---

## Future Roadmap

- [ ] Speech bubble detection using AI vision models
- [ ] Text replacement overlay (display translation directly on the image)
- [ ] Offline OCR mode with downloaded language data
- [ ] Translation history with search
- [ ] Language selector in the sidebar
- [ ] Custom glossary for recurring terms
- [ ] Batch page navigation (auto-translate as you scroll)

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Extension | TypeScript, Chrome Manifest V3 |
| Build | esbuild |
| OCR | Tesseract.js 5 |
| Translation | OpenAI GPT-4o, Google Translate, DeepL |
| UI | Tailwind CSS, Custom CSS |
| Backend | Next.js 14 (App Router) |
| AI Client | OpenAI Node.js SDK |

---

## License

MIT

---

**Built with care for the manga community.**
