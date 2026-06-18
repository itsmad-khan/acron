/* ============================================================
   welcome.js — landing page board/class selection
   ============================================================ */

/* ─────────────────────────────────────────
   State
───────────────────────────────────────── */
let selBoard = null;
let selClass = null;

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function _setBoardsEnabled(enabled) {
  const grid = document.getElementById('boards-grid');
  if (!grid) return;
  grid.style.opacity       = enabled ? '1' : '0.4';
  grid.style.pointerEvents = enabled ? 'all' : 'none';
  grid.setAttribute('aria-disabled', enabled ? 'false' : 'true');

  // Keep board radios out of tab order while disabled
  grid.querySelectorAll('.board-item').forEach(item => {
    item.tabIndex = enabled ? 0 : -1;
  });
}

function _syncRadioState(selector, selectedEl) {
  document.querySelectorAll(selector).forEach(el => {
    const isSelected = el === selectedEl;
    el.classList.toggle('selected', isSelected);
    el.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  });
}

/* ─────────────────────────────────────────
   Board selection
───────────────────────────────────────── */
function selectBoard(el, val) {
  _syncRadioState('.board-item', el);
  selBoard = val;
  updateContinueBtn();
}

/* ─────────────────────────────────────────
   Class selection
───────────────────────────────────────── */
function selectClass(el, val) {
  _syncRadioState('.class-item', el);
  selClass = val;

  if (val === 'other') {
    // "Other / Senior" doesn't need a board — clear and lock board selection
    _syncRadioState('.board-item', null);
    selBoard = null;
    _setBoardsEnabled(false);
  } else {
    _setBoardsEnabled(true);
  }

  updateContinueBtn();
}

/* ─────────────────────────────────────────
   Continue button state
───────────────────────────────────────── */
function updateContinueBtn() {
  const btn = document.getElementById('cont-btn');
  const txt = document.getElementById('txt-cont');
  if (!btn || !txt) return;

  // Senior students skip board selection entirely
  const ready = selClass === 'other'
    ? true
    : !!(selBoard && selClass);

  btn.toggleAttribute('disabled', !ready);
  btn.setAttribute('aria-disabled', ready ? 'false' : 'true');
  txt.textContent = ready ? t('txt-cont-ready') : t('txt-cont');
}

/* ─────────────────────────────────────────
   Continue to signup
───────────────────────────────────────── */
function goToSignup() {
  if (!selClass) return;

  if (selClass === 'other') {
    localStorage.setItem('acron_board', 'none');
    localStorage.setItem('acron_class', 'other');
    window.location.href = 'signup.html';
    return;
  }

  if (!selBoard) return;

  localStorage.setItem('acron_board', selBoard);
  localStorage.setItem('acron_class', selClass);
  window.location.href = 'signup.html';
}

/* ─────────────────────────────────────────
   Language change hook (called by lang.js)
───────────────────────────────────────── */
function onLangChange() {
  updateContinueBtn();
}

/* ─────────────────────────────────────────
   Exports
───────────────────────────────────────── */
window.selectBoard      = selectBoard;
window.selectClass      = selectClass;
window.goToSignup       = goToSignup;
window.updateContinueBtn = updateContinueBtn;
window.onLangChange     = onLangChange;