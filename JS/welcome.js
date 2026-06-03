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
  updateContinueBtn();
}

function updateContinueBtn() {
  const btn = document.getElementById('cont-btn');
  const txt = document.getElementById('txt-cont');
  if (selBoard && selClass) {
    btn.removeAttribute('disabled');
    txt.textContent = t('txt-cont-ready');
  } else {
    btn.setAttribute('disabled', true);
    txt.textContent = t('txt-cont');
  }
}

function goToSignup() {
  if (!selBoard || !selClass) return;
  localStorage.setItem('ilmpath_board', selBoard);
  localStorage.setItem('ilmpath_class', selClass);
  window.location.href = 'signup.html';
}

function onLangChange(lang) {
  updateContinueBtn();
}