/* Panel del asesor IA: abrir/cerrar en escritorio y celular.
   Se cierra con ✕, tocando fuera, con Escape, con el botón "atrás" del teléfono
   o desde el propio chat (postMessage 'asesor:cerrar'). */
(function () {
  'use strict';

  const panel = document.getElementById('advisorPanel');
  const overlay = document.getElementById('advisorOverlay');
  const frame = document.getElementById('advisorFrame');
  const toggle = document.getElementById('advisorToggle');
  let isOpen = false;
  let savedScroll = 0;
  let pushedState = false;

  // Bloqueo de scroll que también funciona en iPhone (overflow:hidden no basta en iOS)
  function lockScroll() {
    savedScroll = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = -savedScroll + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.classList.add('advisor-open');
  }
  function unlockScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.classList.remove('advisor-open');
    window.scrollTo(0, savedScroll);
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    if (!frame.getAttribute('src')) frame.src = 'asesor.html?embed=1';
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    lockScroll();
    const badge = toggle && toggle.querySelector('.badge-notif');
    if (badge) badge.style.display = 'none';
    // Una entrada en el historial para que "atrás" cierre el chat en vez de salir del catálogo
    history.pushState({ asesor: true }, '');
    pushedState = true;
    document.getElementById('advisorClose').focus({ preventScroll: true });
  }

  function close(fromPopState) {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('open');
    unlockScroll();
    if (pushedState && !fromPopState) history.back();
    pushedState = false;
    if (toggle) toggle.focus({ preventScroll: true });
  }

  window.openAdvisor = open;
  window.closeAdvisor = () => close(false);

  window.addEventListener('popstate', () => { if (isOpen) close(true); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(false); });
  window.addEventListener('message', (e) => {
    if (e.source === frame.contentWindow && e.data === 'asesor:cerrar') close(false);
  });
})();
