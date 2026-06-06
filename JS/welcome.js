let selBoard = null, selClass = null;

function selectBoard(el, val) {
  document.querySelectorAll('.board-item').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selBoard = val;
  updateContinueBtn();
}

function selectClass(el, val) {
  document.querySelectorAll('.class-item').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selClass = val;

  // If Other selected deselect board
  if (val === 'other') {
    document.querySelectorAll('.board-item').forEach(c => c.classList.remove('selected'));
    selBoard = null;

    // Grey out board section
    document.getElementById('boards-grid').style.opacity = '0.4';
    document.getElementById('boards-grid').style.pointerEvents = 'none';
  } else {
    // Re enable board selection
    document.getElementById('boards-grid').style.opacity = '1';
    document.getElementById('boards-grid').style.pointerEvents = 'all';
  }

  updateContinueBtn();
}

function updateContinueBtn() {
  const btn = document.getElementById('cont-btn');
  const txt = document.getElementById('txt-cont');

  // Other/Senior does not need board selection
  if (selClass === 'other') {
    btn.removeAttribute('disabled');
    txt.textContent = t('txt-cont-ready');
    return;
  }

  if (selBoard && selClass) {
    btn.removeAttribute('disabled');
    txt.textContent = t('txt-cont-ready');
  } else {
    btn.setAttribute('disabled', true);
    txt.textContent = t('txt-cont');
  }
}

function goToSignup() {
  if (!selClass) return;

  // If other/senior selected skip board selection
  if (selClass === 'other') {
    localStorage.setItem('ilmpath_board', 'none');
    localStorage.setItem('ilmpath_class', 'other');
    window.location.href = 'signup.html';
    return;
  }

  if (!selBoard) return;
  localStorage.setItem('ilmpath_board', selBoard);
  localStorage.setItem('ilmpath_class', selClass);
  window.location.href = 'signup.html';
}

function onLangChange(lang) {
  updateContinueBtn();
}