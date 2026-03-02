// ─── Manga Translator · Floating Action Button ──────────────────────────────

const FAB_ID = 'manga-translator-fab';

let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let hasMoved = false;

export function createFloatingButton(onClick: () => void): HTMLElement {
  // Prevent duplicate injection
  let fab = document.getElementById(FAB_ID);
  if (fab) return fab;

  const root = document.getElementById('manga-translator-root') || (() => {
    const el = document.createElement('div');
    el.id = 'manga-translator-root';
    document.body.appendChild(el);
    return el;
  })();

  fab = document.createElement('button');
  fab.id = FAB_ID;
  fab.className = 'mt-fab';
  fab.title = 'Manga Translator — Click to translate this page';
  fab.setAttribute('aria-label', 'Translate manga on this page');

  fab.innerHTML = `
    <div class="mt-fab-inner">
      <svg class="mt-fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
        <path d="M4 5h7"/>
        <path d="M9 3v2c0 4.418-2.239 8-5 8"/>
        <path d="M5 9c.003 2.144 1.277 4.182 3 5.5"/>
        <path d="M12 21l3.5-7 3.5 7"/>
        <path d="M13.5 18h5"/>
      </svg>
      <span class="mt-fab-label">Translate</span>
    </div>
  `;

  // ─── Click vs Drag handling ────────────────────────────────────────────────

  fab.addEventListener('mousedown', (e: MouseEvent) => {
    isDragging = true;
    hasMoved = false;
    const rect = fab!.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    fab!.classList.add('mt-fab-dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging || !fab) return;
    hasMoved = true;

    const x = e.clientX - dragOffsetX;
    const y = e.clientY - dragOffsetY;

    // Clamp within viewport
    const maxX = window.innerWidth - fab.offsetWidth;
    const maxY = window.innerHeight - fab.offsetHeight;
    const clampedX = Math.max(0, Math.min(x, maxX));
    const clampedY = Math.max(0, Math.min(y, maxY));

    fab.style.left = `${clampedX}px`;
    fab.style.top = `${clampedY}px`;
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    fab?.classList.remove('mt-fab-dragging');

    if (!hasMoved) {
      onClick();
    }
  });

  root.appendChild(fab);
  return fab;
}

export function setFabProcessing(processing: boolean): void {
  const fab = document.getElementById(FAB_ID);
  if (!fab) return;

  if (processing) {
    fab.classList.add('mt-fab-processing');
    fab.title = 'Translation in progress…';
  } else {
    fab.classList.remove('mt-fab-processing');
    fab.title = 'Manga Translator — Click to translate this page';
  }
}

export function destroyFab(): void {
  document.getElementById(FAB_ID)?.remove();
}
