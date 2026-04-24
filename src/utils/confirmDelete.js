/**
 * confirmDelete — shows a modal confirmation dialog before a destructive action.
 *
 * @param {object} opts
 * @param {string} opts.title   - Bold heading, e.g. "Delete Goal?"
 * @param {string} opts.message - Supporting text shown below the title.
 * @returns {Promise<boolean>}  - Resolves true if the user confirms, false if cancelled.
 */
export function confirmDelete({ title = 'Delete item?', message = 'This action cannot be undone.', confirmLabel = 'Delete' } = {}) {
  return new Promise((resolve) => {
    // ── Build overlay ───────────────────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'z-index:80;';

    overlay.innerHTML = `
      <div class="modal-card w-full max-w-sm" role="dialog" aria-modal="true" aria-labelledby="cdel-title">
        <!-- Icon -->
        <div class="flex justify-center mb-4">
          <div class="rounded-full bg-red-500/15 p-3 border border-red-500/30">
            <svg class="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </div>
        </div>

        <!-- Text -->
        <h2 id="cdel-title" class="text-base font-bold text-white text-center mb-1">${title}</h2>
        <p class="text-sm text-slate-400 text-center mb-6">${message}</p>

        <!-- Actions -->
        <div class="flex gap-3">
          <button id="cdel-cancel"
            class="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5
                   text-sm font-medium text-slate-300 hover:bg-white/10 transition-colors">
            Cancel
          </button>
          <button id="cdel-confirm"
            class="flex-1 rounded-xl bg-red-500 px-4 py-2.5
                   text-sm font-semibold text-white hover:bg-red-600 transition-colors">
            ${confirmLabel}
          </button>
        </div>
      </div>
    `;

    // ── Helpers ──────────────────────────────────────────────────────────────
    function close(result) {
      overlay.remove();
      resolve(result);
    }

    overlay.querySelector('#cdel-cancel').addEventListener('click',  () => close(false));
    overlay.querySelector('#cdel-confirm').addEventListener('click', () => close(true));
    // Click outside card to cancel
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    // Escape key to cancel
    function onKey(e) { if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(false); } }
    document.addEventListener('keydown', onKey);

    document.body.appendChild(overlay);

    // Focus the cancel button by default (safer default)
    overlay.querySelector('#cdel-cancel').focus();
  });
}
