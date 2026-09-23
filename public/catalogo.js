/* Catálogo: subsecciones por categoría, navegación y buscador.
   Los productos siguen en index.html; este script solo los reagrupa. */
(function () {
  'use strict';

  // Subsecciones por necesidad. El orden importa: gana el primer grupo que coincida
  // con el nombre + primer beneficio; si ninguno coincide, se prueba con todos los beneficios.
  const NEEDS = [
    { id: 'masculina', label: '🔥 Salud masculina',                  re: /sexual|libido|masculin|próstat|prostát|testosterona/ },
    { id: 'mujer',     label: '🌸 Salud femenina y hormonal',        re: /hormon|menopausia|menstrua|sop\b|ovári|femenin|vaginal|íntimo/ },
    { id: 'sueno',     label: '😴 Sueño, estrés y ansiedad',         re: /sueño|estrés|ansiedad|relaja|insomnio|nervios/ },
    { id: 'digestion', label: '🌾 Digestión, peso y depuración',     re: /digest|intestin|colon|tránsito|flora|estreñ|desintox|depura|hígado|hepát|gases|estomac|glucosa|insulina|peso|apetito|saciedad|metabolismo|urinari|renal|cálculo|diurétic|líquidos retenidos/ },
    { id: 'huesos',    label: '🦴 Huesos, articulaciones y dolor',   re: /articula|hueso|cartíla|artritis|artrosis|calcio|óse[ao]|movilidad|dolor|migraña|contractura|golpe/ },
    { id: 'belleza',   label: '✨ Piel, belleza y antiedad',         re: /piel|cabello|uñas|colágeno|antioxidante|antiedad|envejecimiento/ },
    { id: 'mente',     label: '🧠 Memoria, cerebro y corazón',       re: /memoria|concentraci|cognitiv|cerebr|mental|cardiovascular|circulaci|colesterol|triglic|coraz/ },
    { id: 'defensas',  label: '🛡️ Defensas e inmunidad',             re: /inmun|defensa|tos\b|garganta|gripe|gripa|respirat|antibacter|hongos/ },
    { id: 'energia',   label: '⚡ Energía, vitaminas y rendimiento', re: /energ|rendimiento|fuerza|muscular|vitalidad|resistencia|cansancio|fatiga|proteína|creatin|anemia|hierro|vitamina|mineral|nutrici|crecimiento|desarrollo/ },
  ];
  const OTHER = { id: 'otros', label: '🌿 Más productos' };

  // Categorías que se dividen por el tipo que ya indica la etiqueta del producto.
  const BY_BADGE = {
    colagenos: [
      { id: 'marino',      label: '🌊 Colágeno marino',       re: /marino/ },
      { id: 'hidrolizado', label: '💎 Colágeno hidrolizado',  re: /.*/ },
    ],
    blister: [
      { id: 'blister', label: '💊 Blíster y cápsulas', re: /blíster/ },
      { id: 'gel',     label: '🧴 Geles',              re: /gel/ },
      { id: 'jarabe',  label: '🍯 Jarabes y miel',     re: /jarabe|miel/ },
    ],
  };

  const MIN_TO_SPLIT = 12;  // categorías más pequeñas no se dividen
  const MIN_PER_GROUP = 3;  // grupos más pequeños van a "Más productos"

  const norm = (t) => (t || '').toLowerCase();
  const cardText = (card, sel) => norm([...card.querySelectorAll(sel)].map((e) => e.textContent).join(' '));

  function groupByNeed(card) {
    const name = cardText(card, '.card-name');
    const first = cardText(card, '.card-benefits li:first-child');
    const all = cardText(card, '.card-benefits li');
    return NEEDS.find((g) => g.re.test(name + ' ' + first)) || NEEDS.find((g) => g.re.test(all)) || OTHER;
  }

  function groupByBadge(card, groups) {
    const badge = cardText(card, '.badge-cat') + ' ' + cardText(card, '.card-name');
    return groups.find((g) => g.re.test(badge)) || OTHER;
  }

  const catalog = []; // [{ id, header, subs: [{ id, label, el }] }]

  document.querySelectorAll('.section-header').forEach((header) => {
    const catId = header.id;
    const grid = header.nextElementSibling;
    if (!grid || !grid.classList.contains('product-grid')) return;
    const cards = [...grid.querySelectorAll(':scope > .card')];

    // Contador real de productos en el encabezado
    const count = header.querySelector('.section-count');
    if (count) count.textContent = (count.textContent.trim() ? count.textContent.trim() + ' · ' : '') + cards.length + ' productos';

    const block = document.createElement('section');
    block.className = 'cat-block';
    block.dataset.cat = catId;
    header.parentNode.insertBefore(block, header);
    block.append(header, grid);

    const entry = { id: catId, header, block, subs: [] };
    catalog.push(entry);
    if (cards.length < MIN_TO_SPLIT) return;

    const groups = new Map();
    const pick = BY_BADGE[catId] ? (c) => groupByBadge(c, BY_BADGE[catId]) : groupByNeed;
    cards.forEach((c) => {
      const g = pick(c);
      if (!groups.has(g.id)) groups.set(g.id, { ...g, cards: [] });
      groups.get(g.id).cards.push(c);
    });

    // Grupos muy pequeños se juntan en "Más productos" (los de formato/tipo se respetan)
    const minGroup = BY_BADGE[catId] ? 1 : cards.length < 20 ? 2 : MIN_PER_GROUP;
    const other = groups.get(OTHER.id) || { ...OTHER, cards: [] };
    for (const [id, g] of groups) {
      if (id !== OTHER.id && g.cards.length < minGroup) { other.cards.push(...g.cards); groups.delete(id); }
    }
    groups.delete(OTHER.id);
    if (other.cards.length) groups.set(OTHER.id, other);
    if (groups.size < 2) return;

    const ordered = [...groups.values()].sort((a, b) => (a.id === OTHER.id) - (b.id === OTHER.id) || b.cards.length - a.cards.length);
    ordered.forEach((g) => {
      const sub = document.createElement('div');
      sub.className = 'subsec';
      sub.id = catId + '-' + g.id;
      const title = document.createElement('h3');
      title.className = 'subsec-title';
      title.innerHTML = `<span>${g.label}</span><small>${g.cards.length}</small>`;
      const subGrid = document.createElement('div');
      subGrid.className = 'product-grid';
      subGrid.append(...g.cards);
      sub.append(title, subGrid);
      block.appendChild(sub);
      entry.subs.push({ id: sub.id, label: g.label, el: sub });
    });
    grid.remove();
  });

  // ---------- Navegación ----------
  const topbar = document.getElementById('topbar');
  const catNav = document.getElementById('catNav');
  const subNav = document.getElementById('subNav');
  const catBtns = [...catNav.querySelectorAll('.cat-btn')];
  let currentCat = null;
  let navLock = 0; // evita que el scroll automático pise la categoría elegida

  const topOffset = () => topbar.getBoundingClientRect().height + 8;

  function scrollToEl(el) {
    const y = el.getBoundingClientRect().top + window.scrollY - topOffset();
    navLock = Date.now() + 900;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }

  function centerChip(container, chip) {
    if (!chip) return;
    const left = chip.offsetLeft - (container.clientWidth - chip.offsetWidth) / 2;
    container.scrollTo({ left, behavior: 'smooth' });
  }

  function setActiveCat(id) {
    if (id === currentCat) return;
    currentCat = id;
    catBtns.forEach((b) => b.classList.toggle('active', b.dataset.target === id));
    centerChip(catNav, catBtns.find((b) => b.dataset.target === id));
    const entry = catalog.find((c) => c.id === id);
    subNav.innerHTML = '';
    if (entry && entry.subs.length) {
      entry.subs.forEach((s) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sub-btn';
        b.dataset.target = s.id;
        b.textContent = s.label;
        b.addEventListener('click', () => scrollToEl(s.el));
        subNav.appendChild(b);
      });
    }
    subNav.classList.toggle('has-items', !!(entry && entry.subs.length));
  }

  function setActiveSub(id) {
    let active;
    subNav.querySelectorAll('.sub-btn').forEach((b) => {
      const on = b.dataset.target === id;
      b.classList.toggle('active', on);
      if (on) active = b;
    });
    centerChip(subNav, active);
  }

  window.scrollToSection = function (id) {
    const entry = catalog.find((c) => c.id === id);
    if (!entry) return;
    setActiveCat(id);
    scrollToEl(entry.block);
  };
  catBtns.forEach((b) => b.addEventListener('click', () => window.scrollToSection(b.dataset.target)));

  // Categoría y subsección activas según el scroll
  let ticking = false;
  function onScroll() {
    ticking = false;
    document.getElementById('scrollTop').classList.toggle('visible', window.scrollY > 600);
    const line = topOffset() + 40;
    const visible = catalog.filter((c) => !c.block.hidden);
    let cat = visible[0];
    for (const c of visible) if (c.block.getBoundingClientRect().top <= line) cat = c;
    if (!cat) return;
    if (Date.now() > navLock) setActiveCat(cat.id);
    let sub = null;
    for (const s of cat.subs) if (!s.el.hidden && s.el.getBoundingClientRect().top <= line) sub = s;
    setActiveSub(sub && sub.id);
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  setActiveCat(catalog[0] && catalog[0].id);
  onScroll();

  // ---------- Buscador ----------
  const search = document.getElementById('search');
  const clear = document.getElementById('searchClear');
  const noResults = document.getElementById('noResults');
  const strip = (t) => norm(t).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const allCards = [...document.querySelectorAll('.card')].map((c) => ({ el: c, text: strip(c.textContent) }));

  function applySearch() {
    const terms = strip(search.value).trim().split(/\s+/).filter(Boolean);
    clear.hidden = !terms.length;
    allCards.forEach((c) => { c.el.hidden = terms.length > 0 && !terms.every((t) => c.text.includes(t)); });
    let any = false;
    catalog.forEach((c) => {
      c.subs.forEach((s) => { s.el.hidden = !s.el.querySelector('.card:not([hidden])'); });
      const has = !!c.block.querySelector('.card:not([hidden])');
      c.block.hidden = !has;
      any = any || has;
      const btn = catBtns.find((b) => b.dataset.target === c.id);
      if (btn) btn.hidden = !has;
    });
    noResults.hidden = any;
    currentCat = null;
    onScroll();
  }
  search.addEventListener('input', applySearch);
  search.addEventListener('keydown', (e) => { if (e.key === 'Enter') search.blur(); });
  clear.addEventListener('click', () => { search.value = ''; applySearch(); search.focus(); });
})();
