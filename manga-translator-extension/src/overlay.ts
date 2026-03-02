// ─── Manga Translator · Overlay / Sidebar UI ────────────────────────────────

import { ProcessingState, TranslationResult } from './types';

const ROOT_ID = 'manga-translator-root';
const SIDEBAR_ID = 'manga-translator-sidebar';

// ─── Utility to create DOM scoped under shadow-like root ─────────────────────

function getRoot(): HTMLElement {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

let sidebarVisible = false;

export function isSidebarOpen(): boolean {
  return sidebarVisible;
}

export function createSidebar(): HTMLElement {
  const root = getRoot();
  let sidebar = document.getElementById(SIDEBAR_ID);

  if (sidebar) return sidebar;

  sidebar = document.createElement('div');
  sidebar.id = SIDEBAR_ID;
  sidebar.className = 'mt-manga-sidebar';
  sidebar.innerHTML = `
    <div class="mt-sidebar-header">
      <div class="mt-sidebar-title">
        <svg class="mt-sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        <span>Manga Translator</span>
      </div>
      <button class="mt-sidebar-close" id="mt-close-sidebar" title="Close sidebar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="mt-sidebar-content" id="mt-sidebar-content">
      <div class="mt-empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" class="mt-empty-icon">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
        <p class="mt-empty-text">Click the translate button to start</p>
        <p class="mt-empty-subtext">Manga images on this page will be detected, OCR'd, and translated</p>
      </div>
    </div>
  `;

  root.appendChild(sidebar);

  // Close handler
  sidebar.querySelector('#mt-close-sidebar')?.addEventListener('click', () => toggleSidebar(false));

  return sidebar;
}

export function toggleSidebar(show?: boolean): void {
  const sidebar = createSidebar();
  sidebarVisible = show !== undefined ? show : !sidebarVisible;

  if (sidebarVisible) {
    sidebar.classList.add('mt-sidebar-open');
    sidebar.classList.remove('mt-sidebar-closed');
  } else {
    sidebar.classList.remove('mt-sidebar-open');
    sidebar.classList.add('mt-sidebar-closed');
  }
}

// ─── State Rendering ─────────────────────────────────────────────────────────

export function renderState(state: ProcessingState): void {
  const content = document.getElementById('mt-sidebar-content');
  if (!content) return;

  if (state.currentStep === 'idle' && state.results.length === 0) {
    return; // Keep initial empty state
  }

  let html = '';

  // Progress bar
  if (state.isProcessing) {
    const percent = state.totalImages > 0
      ? Math.round((state.currentImage / state.totalImages) * 100)
      : 0;

    html += `
      <div class="mt-progress-section">
        <div class="mt-progress-header">
          <span class="mt-progress-label">${getStepLabel(state.currentStep)}</span>
          <span class="mt-progress-count">${state.currentImage} / ${state.totalImages}</span>
        </div>
        <div class="mt-progress-bar-track">
          <div class="mt-progress-bar-fill" style="width: ${percent}%"></div>
        </div>
        <div class="mt-loading-dots">
          <div class="mt-dot mt-dot-1"></div>
          <div class="mt-dot mt-dot-2"></div>
          <div class="mt-dot mt-dot-3"></div>
        </div>
      </div>
    `;
  }

  // Error
  if (state.error) {
    html += `
      <div class="mt-error-card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>${escapeHtml(state.error)}</span>
      </div>
    `;
  }

  // Results
  if (state.results.length > 0) {
    html += `<div class="mt-results-header">
      <span>${state.results.length} image${state.results.length > 1 ? 's' : ''} translated</span>
      ${!state.isProcessing ? '<button class="mt-clear-btn" id="mt-clear-results">Clear</button>' : ''}
    </div>`;

    for (const result of state.results) {
      html += renderResultCard(result);
    }
  }

  // Done state
  if (state.currentStep === 'done' && state.results.length === 0) {
    html += `
      <div class="mt-empty-state">
        <p class="mt-empty-text">No translatable text found</p>
        <p class="mt-empty-subtext">The detected images did not contain recognizable text</p>
      </div>
    `;
  }

  content.innerHTML = html;

  // Attach event listeners
  content.querySelectorAll('.mt-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-text') || '';
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      });
    });
  });

  content.querySelector('#mt-clear-results')?.addEventListener('click', () => {
    const evt = new CustomEvent('mt-clear-results');
    document.dispatchEvent(evt);
  });
}

function renderResultCard(result: TranslationResult): string {
  const hasOriginal = result.originalText.trim().length > 0;
  const hasTranslation = result.translatedText.trim().length > 0;

  return `
    <div class="mt-result-card">
      <div class="mt-result-header">
        <span class="mt-result-badge">Image ${result.imageIndex + 1}</span>
        <span class="mt-result-lang">${result.language.toUpperCase()}</span>
      </div>
      ${hasOriginal ? `
        <div class="mt-result-section">
          <div class="mt-result-section-header">
            <span class="mt-section-label">Original</span>
          </div>
          <div class="mt-result-text mt-text-original">${escapeHtml(result.originalText)}</div>
        </div>
      ` : ''}
      ${hasTranslation ? `
        <div class="mt-result-section">
          <div class="mt-result-section-header">
            <span class="mt-section-label">Translation</span>
            <button class="mt-copy-btn" data-text="${escapeAttr(result.translatedText)}">Copy</button>
          </div>
          <div class="mt-result-text mt-text-translated">${escapeHtml(result.translatedText)}</div>
        </div>
      ` : `
        <div class="mt-result-section">
          <div class="mt-result-text mt-text-muted">No translatable text detected</div>
        </div>
      `}
    </div>
  `;
}

function getStepLabel(step: ProcessingState['currentStep']): string {
  switch (step) {
    case 'detecting': return 'Detecting images…';
    case 'ocr': return 'Extracting text (OCR)…';
    case 'translating': return 'Translating…';
    case 'done': return 'Complete';
    case 'error': return 'Error occurred';
    default: return 'Ready';
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

export function destroyOverlay(): void {
  const root = document.getElementById(ROOT_ID);
  if (root) root.remove();
  sidebarVisible = false;
}
