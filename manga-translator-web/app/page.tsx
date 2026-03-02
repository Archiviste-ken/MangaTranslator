export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-manga-surface mb-6">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-10 h-10 text-manga-accent"
            >
              <path d="M4 5h7" />
              <path d="M9 3v2c0 4.418-2.239 8-5 8" />
              <path d="M5 9c.003 2.144 1.277 4.182 3 5.5" />
              <path d="M12 21l3.5-7 3.5 7" />
              <path d="M13.5 18h5" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-manga-accent to-pink-400 bg-clip-text text-transparent">
            Manga Translator
          </h1>
          <p className="text-manga-muted text-lg leading-relaxed max-w-lg mx-auto">
            AI-powered translation for manga, manhwa, and manhua. Install the Chrome extension
            to translate pages while you read.
          </p>
        </div>

        {/* Status */}
        <div className="bg-manga-panel rounded-xl border border-white/10 p-6 mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium">Backend API Running</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-manga-bg/50 rounded-lg p-3">
              <div className="text-manga-muted text-xs mb-1">Translation API</div>
              <code className="text-manga-accent">/api/translate</code>
            </div>
            <div className="bg-manga-bg/50 rounded-lg p-3">
              <div className="text-manga-muted text-xs mb-1">OCR API</div>
              <code className="text-manga-accent">/api/ocr</code>
            </div>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="bg-manga-panel rounded-xl border border-white/10 p-6 text-left">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-manga-accent mb-4">
            Quick Setup
          </h2>
          <ol className="space-y-3 text-sm text-manga-muted">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-manga-accent/20 text-manga-accent flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>
                Set <code className="text-manga-text bg-manga-bg/50 px-1.5 py-0.5 rounded">OPENAI_API_KEY</code> in your{' '}
                <code className="text-manga-text bg-manga-bg/50 px-1.5 py-0.5 rounded">.env.local</code> file
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-manga-accent/20 text-manga-accent flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>Install the Chrome extension from the <code className="text-manga-text bg-manga-bg/50 px-1.5 py-0.5 rounded">manga-translator-extension</code> folder</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-manga-accent/20 text-manga-accent flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>Set the provider to &quot;Local Backend&quot; in the extension popup (or use a direct API key)</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-manga-accent/20 text-manga-accent flex items-center justify-center text-xs font-bold">
                4
              </span>
              <span>Navigate to any manga site and click the floating translate button</span>
            </li>
          </ol>
        </div>

        <p className="text-xs text-manga-muted/50 mt-8">
          Manga Translator v1.0.0 &middot; Built with Next.js, Tesseract.js, and OpenAI
        </p>
      </div>
    </main>
  );
}
