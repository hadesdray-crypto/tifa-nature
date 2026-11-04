/* Tifa Nature - Feuille, le personnage compagnon (présent sur tous les écrans, déplaçable, parlant, réglable).
   Point d'accroche : aucun fichier de l'appli n'est modifié. Feuille attend que l'appli soit affichée
   (window.__TIFA_STARTED + #app visible), puis suit les changements d'écran avec 'hashchange' et un contrôle de secours
   toutes les 500 ms sur T.cur.path (les onglets du bas changent d'écran sans hashchange).
   Les réglages vivent dans T.store.s.feuille. Aucune notification système : tout se passe dans l'appli. */
(function () {
  'use strict';
  var T = window.T; if (!T) return;

  /* ---------- Réglages ---------- */
  var DEF = { on: true, size: 'm', level: 'normale', mute: false, qOn: true, qFrom: '22:00', qTo: '07:00', greet: true, genre: 'f', color: 'vert', acc: 'aucun', pos: null, tourDone: false, lastGreet: '', alertDay: '', alertSeen: {} };
  var SIZES = { p: 56, m: 76, g: 104 };
  var LEVELS = ['discrete', 'normale', 'attentive', 'enfant'];
  var PAL = { vert: ['#5f9e55', '#3f7a3a', '#9dd18f', 'Vert'], clair: ['#8cc063', '#5f9a3c', '#c0e39a', 'Vert clair'], turquoise: ['#4aa59a', '#2f7f76', '#8fd6cb', 'Turquoise'], olive: ['#8c9a3a', '#667225', '#c0cc70', 'Olive'], automne: ['#d08a3c', '#a3631e', '#efc283', 'Automne'] };
  var ACCS = { aucun: 'Aucun', chapeau: 'Chapeau de paille', fleur: 'Fleur', lunettes: 'Lunettes' };
  function sf(f, d) { try { var v = f(); return v == null ? d : v; } catch (e) { return d; } }
  function cfg() {
    var st = T.store && T.store.s, o;
    if (!st) return Object.assign({}, DEF, { alertSeen: {} });
    o = st.feuille;
    if (!o || typeof o !== 'object' || Array.isArray(o)) o = st.feuille = {};
    Object.keys(DEF).forEach(function (k) { if (o[k] === undefined || o[k] === null && k !== 'pos') o[k] = (k === 'alertSeen') ? {} : DEF[k]; });
    if (!SIZES[o.size]) o.size = 'm';
    if (LEVELS.indexOf(o.level) < 0) o.level = 'normale';
    if (o.genre !== 'm') o.genre = 'f';
    if (!PAL[o.color]) o.color = 'vert';
    if (!ACCS[o.acc]) o.acc = 'aucun';
    if (!/^\d{2}:\d{2}$/.test(o.qFrom)) o.qFrom = DEF.qFrom;
    if (!/^\d{2}:\d{2}$/.test(o.qTo)) o.qTo = DEF.qTo;
    if (!o.alertSeen || typeof o.alertSeen !== 'object' || Array.isArray(o.alertSeen)) o.alertSeen = {};
    o.on = o.on !== false; o.mute = !!o.mute; o.qOn = o.qOn !== false; o.greet = o.greet !== false; o.tourDone = !!o.tourDone;
    if (o.pos && !(typeof o.pos.x === 'number' && typeof o.pos.y === 'number')) o.pos = null;
    return o;
  }
  function save() { try { T.store.save(); } catch (e) {} }
  function G() { return cfg().genre === 'm' ? 1 : 0; }
  /* Accord : [e|] -> « e » si féminin, rien si masculin ; accord(f, m) public */
  function accord(f, m) { return G() ? m : f; }
  function fmt(s) { return String(s == null ? '' : s).replace(/\[([^\]|]*)\|([^\]]*)\]/g, function (a, f, m) { return G() ? m : f; }).replace(/\s+/g, ' ').trim(); }
  function todayStr() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function mins(s) { var p = String(s).split(':'); return (+p[0]) * 60 + (+p[1]); }
  function quietNow(d) {
    var c = cfg(); if (!c.qOn) return false;
    d = d || new Date(); var n = d.getHours() * 60 + d.getMinutes(), a = mins(c.qFrom), b = mins(c.qTo);
    if (a === b) return false;
    return a < b ? (n >= a && n < b) : (n >= a || n < b);
  }
  var RM = sf(function () { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }, false);

  /* ---------- Visage et dessin (SVG en ligne) ---------- */
  var HAPPY = ['M31 50 Q38 40 45 50', 'M55 50 Q62 40 69 50'], CLOSED = ['M31 46 Q38 53 45 46', 'M55 46 Q62 53 69 46'];
  /* [yeux, bouche, sourcil gauche, sourcil droit, bouche pleine] */
  var BN = ['M31 37 Q38 34 45 37', 'M55 37 Q62 34 69 37'], BUP = ['M31 33 Q38 30 45 33', 'M55 33 Q62 30 69 33'];
  var MOODS = {
    doux: ['open', 'M43 63 Q50 69 57 63', BN[0], BN[1], 0],
    joie: ['happy', 'M40 60 Q50 76 60 60 Q50 65 40 60Z', BUP[0], BUP[1], 1],
    surprise: ['open', 'M46 65 Q50 57 54 65 Q50 75 46 65Z', BUP[0], BUP[1], 1],
    pense: ['open', 'M44 66 Q50 64 57 67', 'M31 39 Q38 37 45 38', 'M55 32 Q62 29 69 34', 0],
    ecoute: ['open', 'M45 64 Q50 67 55 64', BUP[0], BN[1], 0],
    desole: ['open', 'M43 68 Q50 61 57 68', 'M31 40 L45 34', 'M55 34 L69 40', 0],
    fier: ['happy', 'M41 63 Q51 72 60 59', BUP[0], BUP[1], 0],
    dort: ['closed', 'M46 65 Q50 67 54 65', BN[0], BN[1], 0]
  };
  var TALK = ['M42 61 Q50 76 58 61 Q50 64 42 61Z', 'M44 63 Q50 70 56 63 Q50 65 44 63Z'];
  function accSvg(acc) {
    if (acc === 'chapeau') return '<g class="fe-acc"><path d="M29 13 Q31 -6 50 -6 Q69 -6 71 13Z" fill="#ecd080" stroke="#b8923a" stroke-width="1.5"/><path d="M30 8 Q50 14 70 8 L71 13 Q50 20 29 13Z" fill="#b4533c"/><ellipse cx="50" cy="14" rx="36" ry="7" fill="#e4c36a" stroke="#b8923a" stroke-width="1.5"/><path d="M30 8 Q50 14 70 8 L71 12.5 Q50 19 29 12.5Z" fill="#b4533c" opacity=".9"/></g>';
    if (acc === 'fleur') return '<g class="fe-acc" transform="translate(68 12)"><circle cx="0" cy="-6" r="5" fill="#f08fb0"/><circle cx="5.7" cy="-1.9" r="5" fill="#f08fb0"/><circle cx="3.5" cy="4.8" r="5" fill="#f08fb0"/><circle cx="-3.5" cy="4.8" r="5" fill="#f08fb0"/><circle cx="-5.7" cy="-1.9" r="5" fill="#f08fb0"/><circle cx="0" cy="0" r="3.6" fill="#f7d44c" stroke="#d9a91c" stroke-width="1"/></g>';
    if (acc === 'lunettes') return '<g class="fe-acc" fill="rgba(255,255,255,.2)" stroke="#2d3b33" stroke-width="2.2"><circle cx="38" cy="47" r="10.5"/><circle cx="62" cy="47" r="10.5"/><path d="M48.5 46 Q50 43.5 51.5 46" fill="none"/><path d="M27.5 46 L20 43 M72.5 46 L80 43" fill="none"/></g>';
    return '';
  }
  function svgHtml(c, k) {
    var P = PAL[c.color] || PAL.vert, f = c.genre !== 'm', m = MOODS[k] || MOODS.doux, eyes = m[0], ea = eyes === 'happy' ? HAPPY : CLOSED, dk = '#26332b', i, h;
    h = '<svg class="fe-svg" viewBox="-8 -12 116 128" aria-hidden="true" focusable="false" data-mood="' + (MOODS[k] ? k : 'doux') + '" data-eyes="' + eyes + '" data-genre="' + c.genre + '" data-acc="' + c.acc + '" data-color="' + c.color + '">';
    h += '<path d="M50 98 Q50 106 55 111" fill="none" stroke="' + P[1] + '" stroke-width="3.6" stroke-linecap="round"/>';
    h += '<path d="M50 4 C82 20 94 54 72 82 C64 92 57 96 50 98 C43 96 36 92 28 82 C6 54 18 20 50 4Z" fill="' + P[0] + '" stroke="' + P[1] + '" stroke-width="2.2" stroke-linejoin="round"/>';
    h += '<path d="M50 98 L50 76 M50 90 L40 81 M50 90 L60 81" fill="none" stroke="' + P[1] + '" stroke-width="1.8" stroke-linecap="round" opacity=".75"/><path d="M27 32 Q33 19 45 12" fill="none" stroke="' + P[2] + '" stroke-width="3.2" stroke-linecap="round" opacity=".7"/>';
    if (f) h += '<path d="M50 6 Q44 -4 34 -2" fill="none" stroke="' + P[1] + '" stroke-width="2.4" stroke-linecap="round" class="fe-hair"/><ellipse class="fe-ck" cx="29" cy="60" rx="5.5" ry="3.2" fill="#f08a8a" opacity=".38"/><ellipse class="fe-ck" cx="71" cy="60" rx="5.5" ry="3.2" fill="#f08a8a" opacity=".38"/>';
    else h += '<path d="M50 6 L45 -3 M50 6 L52 -5 M50 6 L58 -2" fill="none" stroke="' + P[1] + '" stroke-width="2.4" stroke-linecap="round" class="fe-hair"/>';
    [38, 62].forEach(function (x, j) {
      h += '<g class="fe-ey"><g class="fe-eo"><ellipse cx="' + x + '" cy="47" rx="7.2" ry="8.2" fill="#fff" stroke="' + dk + '" stroke-width="1.3"/><g class="fe-pu"><circle cx="' + x + '" cy="48" r="4" fill="' + dk + '"/><circle cx="' + (x + 1.5) + '" cy="46" r="1.4" fill="#fff"/></g></g><path class="fe-ea" d="' + (eyes === 'open' ? '' : ea[j]) + '" fill="none" stroke="' + dk + '" stroke-width="2.8" stroke-linecap="round"/></g>';
    });
    if (f) h += '<path class="fe-lash" d="M31 43 L26.5 40 M31.3 46.5 L26 46 M69 43 L73.5 40 M68.7 46.5 L74 46" fill="none" stroke="' + dk + '" stroke-width="1.8" stroke-linecap="round"/>';
    h += '<path class="fe-brl" d="' + m[2] + '" fill="none" stroke="' + dk + '" stroke-width="' + (f ? 2 : 3.6) + '" stroke-linecap="round" opacity=".85"/><path class="fe-brr" d="' + m[3] + '" fill="none" stroke="' + dk + '" stroke-width="' + (f ? 2 : 3.6) + '" stroke-linecap="round" opacity=".85"/>';
    h += '<path class="fe-mo" d="' + m[1] + '" fill="' + (m[4] ? '#7a2e2e' : 'none') + '" stroke="' + dk + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
    h += accSvg(c.acc);
    h += '<g class="fe-z" font-family="Georgia,serif" font-weight="700" fill="' + P[1] + '"><text x="76" y="26" font-size="14">z</text><text x="84" y="14" font-size="10">z</text></g></svg>';
    return h;
  }
  function setD(s, sel, d) { var n = s.querySelector(sel); if (n) n.setAttribute('d', d); }
  function paint(s, k) {
    if (!s) return; var m = MOODS[k] || MOODS.doux, ea = m[0] === 'happy' ? HAPPY : CLOSED, e = s.querySelectorAll('.fe-ea');
    s.setAttribute('data-mood', MOODS[k] ? k : 'doux'); s.setAttribute('data-eyes', m[0]);
    setD(s, '.fe-mo', m[1]); setD(s, '.fe-brl', m[2]); setD(s, '.fe-brr', m[3]);
    var mo = s.querySelector('.fe-mo'); if (mo) mo.setAttribute('fill', m[4] ? '#7a2e2e' : 'none');
    for (var i = 0; i < e.length; i++) e[i].setAttribute('d', m[0] === 'open' ? '' : ea[i]);
  }

  /* ---------- Éléments ---------- */
  var el = null, svg = null, bub = null, menu = null, back = null, pill = null, badge = null, pillBadge = null;
  var pos = null, cur = 'doux', moodT = 0, bubT = 0, talkT = 0, talkTok = 0, blinkT = 0, lastTap = 0, down = null, away = false, typing = false, tourOn = false, hlEl = null, lastPath = '', ready = false, noVoiceWarned = false;
  var narrAt = {}, checkT = 0, pending = 0, openedAt = 0;

  function area() {
    var W = window.innerWidth, H = window.innerHeight, tb = document.getElementById('topbar'), tabs = document.getElementById('tabs');
    var t = tb ? tb.getBoundingClientRect().bottom : 0, b = tabs ? tabs.getBoundingClientRect().top : H;
    var mm = document.getElementById('musique-mini'); if (mm && !mm.hidden) { var mt = mm.getBoundingClientRect().top; if (mt > t + 60 && mt < b) b = mt; }
    if (!(b > t + 60)) { t = 0; b = H; }
    return { t: t + 4, b: b - 4, l: 4, r: W - 4, W: W, H: H };
  }
  function sz() { return SIZES[cfg().size] || 76; }
  function hgt() { return Math.round(sz() * 1.1); }
  function clamp() {
    if (!pos) return; var a = area(), w = sz(), h = hgt();
    var minX = a.l + w / 2, maxX = a.r - w / 2, minY = a.t + h / 2, maxY = a.b - h / 2;
    pos.x = maxX < minX ? (a.l + a.r) / 2 : Math.max(minX, Math.min(maxX, pos.x));
    pos.y = maxY < minY ? (a.t + a.b) / 2 : Math.max(minY, Math.min(maxY, pos.y));
  }
  function place() {
    if (!el || !pos) return; var w = sz(), h = hgt();
    el.style.width = w + 'px'; el.style.height = h + 'px';
    el.style.transform = 'translate3d(' + Math.round(pos.x - w / 2) + 'px,' + Math.round(pos.y - h / 2) + 'px,0)';
    if (bub && !bub.hidden) placeBub();
    placePill();
  }
  function defPos() { var a = area(); return { x: a.r - sz() / 2 - 8, y: a.b - hgt() / 2 - 6 }; }
  function loadPos() {
    var p = cfg().pos;
    pos = p ? { x: p.x * window.innerWidth, y: p.y * window.innerHeight } : defPos(); clamp();
  }
  function savePos() { if (!pos) return; cfg().pos = { x: +(pos.x / window.innerWidth).toFixed(4), y: +(pos.y / window.innerHeight).toFixed(4) }; save(); }
  function placePill() {
    if (!pill) return; var a = area(); pill.style.top = Math.max(a.t, a.b - 46) + 'px';
  }
  function modalOpen() { return !!(T.modalStack && T.modalStack.length); }
  function appShown() { var a = document.getElementById('app'); return !!a && !a.hidden; }
  function syncAway() {
    away = modalOpen() || typing || !appShown();
    [el, bub, pill, back, menu].forEach(function (n) { if (n) n.classList.toggle('fe-away', away); });
    if (away && menu && modalOpen()) closeMenu();
  }

  /* ---------- Humeur, bouche, yeux ---------- */
  function mood(k, ms) {
    if (!MOODS[k]) k = 'doux'; cur = k; paint(svg, k);
    clearTimeout(moodT); if (ms) moodT = setTimeout(function () { mood('doux'); }, ms);
  }
  function talkStart(text, p) {
    var my = ++talkTok, n = 0; clearInterval(talkT);
    talkT = setInterval(function () { n++; setD(svg, '.fe-mo', TALK[n % 2]); var mo = svg && svg.querySelector('.fe-mo'); if (mo) mo.setAttribute('fill', '#7a2e2e'); }, 140);
    function end() { if (my !== talkTok) return; talkStop(); }
    if (p && p.then) p.then(end, end);
    setTimeout(end, Math.min(25000, 1500 + String(text).length * 75));
  }
  function talkStop() { clearInterval(talkT); talkTok++; paint(svg, cur); }
  function blinkLoop() {
    clearTimeout(blinkT);
    blinkT = setTimeout(function () {
      if (svg && !away && svg.getAttribute('data-eyes') === 'open') { svg.classList.add('blink'); setTimeout(function () { if (svg) svg.classList.remove('blink'); }, 140); }
      blinkLoop();
    }, 2200 + Math.random() * 3500);
  }
  var lookRaf = 0;
  function look(x, y) {
    if (!el || !pos || lookRaf) return;
    lookRaf = requestAnimationFrame(function () {
      lookRaf = 0; if (!svg) return;
      var dx = x - pos.x, dy = y - pos.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 120) * 2.6;
      svg.style.setProperty('--lx', (dx / d * k).toFixed(2)); svg.style.setProperty('--ly', (dy / d * k).toFixed(2));
    });
  }

  /* ---------- Voix ---------- */
  function canSpeak(force) { var c = cfg(); return !c.mute && (force || !quietNow()) && T.set().voiceOn !== false; }
  function speak(text, force) {
    if (!canSpeak(force)) return false;
    try {
      if (!sf(function () { return T.voice.available(); }, true)) { if (noVoiceWarned) return false; noVoiceWarned = true; }
      var ov = {}; if (cfg().genre === 'm' && !T.set().pitch) ov.pitch = 0.85;
      var p = T.voice.speak(text, ov); talkStart(text, p); return true;
    } catch (e) { return false; }
  }

  /* ---------- Bulle ---------- */
  function hideBub() { clearTimeout(bubT); if (bub) bub.hidden = true; }
  function placeBub() {
    var a = area(), w = Math.min(300, a.W - 16), h;
    bub.style.width = w + 'px'; bub.style.maxHeight = Math.max(90, Math.min(a.b - a.t - 8, a.H * 0.6)) + 'px';
    h = bub.offsetHeight;
    var x = Math.max(8, Math.min(a.W - w - 8, pos.x - w / 2)), y = pos.y - hgt() / 2 - h - 8;
    if (y < a.t) y = pos.y + hgt() / 2 + 8;
    if (y + h > a.b) y = Math.max(a.t, a.b - h);
    bub.style.left = x + 'px'; bub.style.top = y + 'px';
  }
  /* btns : [{l, f, main}] ; sans bouton la bulle se range seule */
  function bubble(text, btns) {
    if (!bub) return; clearTimeout(bubT); bub.innerHTML = '';
    var t = document.createElement('div'); t.className = 'fe-bt'; t.textContent = text; bub.appendChild(t);
    if (btns && btns.length) {
      var r = document.createElement('div'); r.className = 'fe-br';
      btns.forEach(function (b) { var x = document.createElement('button'); x.type = 'button'; x.className = 'fe-bb' + (b.main ? ' main' : ''); x.textContent = b.l; x.addEventListener('click', function (e) { e.stopPropagation(); try { b.f(); } catch (er) {} }); r.appendChild(x); });
      bub.appendChild(r);
    } else bubT = setTimeout(function () { hideBub(); mood('doux'); }, Math.max(4500, text.length * 75));
    bub.hidden = false; bub.setAttribute('data-btns', btns && btns.length ? '1' : '0'); placeBub();
  }
  /* Feuille parle : humeur, bulle, voix. o = { btns, force, silent } */
  function say(text, k, o) {
    o = o || {};
    if (!isOn() || !el) return false;
    var s = fmt(text); if (!s) return false;
    mood(k || 'doux', o.btns ? 0 : 6000);
    bubble(s, o.btns);
    if (!o.silent) speak(s, o.force);
    return true;
  }
  function isOn() { return cfg().on !== false; }

  /* ---------- Menu ---------- */
  var ITEMS = [['aide', 'Aide sur cette page'], ['today', 'Que faire aujourd\'hui ?'], ['ask', 'Poser une question'], ['gestes', 'Gestes du jardinier'], ['musique', 'Musique'], ['labo', 'Écouter la plante'], ['voix', 'Changer sa voix'], ['reglages', 'Mes réglages Feuille'], ['visite', 'Refaire la visite'], ['ranger', 'Me ranger']];
  function nav(h) { closeMenu(); if (location.hash === h) { try { T.render(); } catch (e) {} } else location.hash = h; }
  function openMenu() {
    if (menu || !el) return; openedAt = Date.now(); hideBub(); mood('joie', 1500);
    back = document.createElement('div'); back.className = 'fe-back'; back.addEventListener('click', function () { if (Date.now() - openedAt > 450) closeMenu(); });
    menu = document.createElement('div'); menu.className = 'fe-menu'; menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', 'Menu de Feuille');
    menu.innerHTML = '<div class="fe-mh"><b>Que voulez-vous ?</b><button type="button" class="fe-x" data-fe="close">Fermer</button></div><div class="fe-ml">' + ITEMS.map(function (i) { return '<button type="button" class="fe-it" data-fe="' + i[0] + '">' + i[1].replace(/'/g, '&#39;') + '</button>'; }).join('') + '</div>';
    menu.addEventListener('click', function (e) { if (Date.now() - openedAt < 450) return; var b = e.target.closest ? e.target.closest('[data-fe]') : null; if (b) menuAct(b.getAttribute('data-fe')); });
    document.body.appendChild(back); document.body.appendChild(menu);
    var a = area(); menu.style.bottom = Math.max(0, a.H - a.b) + 'px'; menu.style.maxHeight = Math.max(160, a.b - a.t) + 'px';
    syncAway();
    var f = menu.querySelector('.fe-it'); if (f && f.focus) try { f.focus({ preventScroll: true }); } catch (e) {}
  }
  function closeMenu() {
    if (menu && menu.parentNode) menu.parentNode.removeChild(menu); if (back && back.parentNode) back.parentNode.removeChild(back); menu = back = null;
  }
  function menuAct(k) {
    var go = { ask: '#/assistant', gestes: '#/gestes', musique: '#/musique', labo: '#/labo', voix: '#/reglages', reglages: '#/feuille' };
    if (k === 'close') { closeMenu(); return; }
    if (go[k]) { nav(go[k]); if (k === 'voix') setTimeout(function () { say('Ici, vous pouvez choisir ma voix : faites défiler la molette, elle se fait entendre.', 'doux'); }, 500); return; }
    closeMenu();
    if (k === 'aide') setTimeout(help, 60);
    else if (k === 'today') setTimeout(today, 60);
    else if (k === 'visite') setTimeout(tour, 60);
    else if (k === 'ranger') { say('Je me range. Touchez le petit bouton « Feuille » pour me rappeler.', 'dort', { force: true }); setTimeout(function () { setOn(false); }, 1800); }
  }

  /* ---------- Présence ---------- */
  function setOn(v) {
    var c = cfg(); c.on = !!v; save(); closeMenu();
    if (!v) { hideBub(); try { T.voice.stop(); } catch (e) {} talkStop(); }
    applyOn();
    if (v) { mood('joie', 2000); say('Me revoilà !', 'joie'); }
  }
  function applyOn() {
    var on = isOn();
    if (el) el.classList.toggle('fe-off', !on);
    if (pill) pill.classList.toggle('fe-off', on);
    updateBadge();
  }
  function updateBadge() {
    [badge, pillBadge].forEach(function (b) { if (b) { b.hidden = !pending; b.textContent = pending > 9 ? '9+' : String(pending); } });
    if (el) el.setAttribute('data-alerts', pending ? '1' : '0');
  }
  function refreshLook() {
    var c = cfg(); if (!el) return;
    el.querySelector('.fe-body').innerHTML = svgHtml(c, cur) + '<span class="fe-badge" hidden></span>';
    svg = el.querySelector('.fe-svg'); badge = el.querySelector('.fe-badge');
    el.setAttribute('aria-label', 'Feuille, votre compagn' + accord('e', 'on') + ' de jardin. Touchez pour son menu. Glissez le doigt pour ' + accord('la', 'le') + ' déplacer.');
    if (pill) { pill.querySelector('.fe-pl').innerHTML = pillLeaf(c); }
    clamp(); place(); updateBadge();
  }
  function pillLeaf(c) { var P = PAL[c.color] || PAL.vert; return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M50 6 C82 22 94 56 72 84 C64 94 57 98 50 100 C43 98 36 94 28 84 C6 56 18 22 50 6Z" fill="' + P[0] + '" stroke="' + P[1] + '" stroke-width="6"/><path d="M50 98 L50 34" stroke="' + P[1] + '" stroke-width="5" fill="none"/></svg>'; }

  /* ---------- Textes d'aide : un par écran ---------- */
  var HELP = {
    accueil: { e: 'Voici la maison de tes plantes. Touche une grande plaque pour commencer.', a: 'Voici l\'accueil. En haut, un mot de bienvenue et la date. Plus bas, la liste des plantes à semer ou à planter ce mois-ci : touchez-en une pour lire sa fiche. Les grandes plaques ouvrent : Reconnaître une plante avec une photo, Ma plante est malade, Mes pots, Chercher une plante, Mon jardin, Mon planning, Carnet de culture et Poser une question. Plus bas, la météo du jardin, les calculettes, puis le conseil du jour avec son bouton Écouter. En bas, cinq boutons changent de section : Accueil, Trouver, Mes pots, Conseils et Plus.' },
    trouver: { e: 'Ici, on cherche une plante. Écris son nom, ou prends une photo.', a: 'Voici la recherche de plantes. Tapez un nom dans la case, même avec une faute : la liste se met à jour. Touchez une plante pour lire sa fiche. Plus bas, les boutons vous mènent à la reconnaissance par photo et au diagnostic des maladies.' },
    plante: { e: 'Voici la fiche d\'une plante. Elle dit où la mettre et quand l\'arroser.', a: 'Voici la fiche d\'une plante. Vous y lisez le soleil qu\'il lui faut, l\'arrosage, les bons mois pour semer, planter et récolter, puis des conseils. Le bouton Écouter lit la fiche à voix haute. Ajouter à mes pots la range dans votre liste de pots. Ma plante est malade : diagnostic cherche la cause d\'un problème. Retour à la recherche vous ramène à la liste.' },
    photo: { e: 'Prends une photo d\'une feuille ou d\'une fleur. Je te dis son nom.', a: 'Voici la reconnaissance par photo. Touchez Prendre une photo, ou Choisir une photo dans votre galerie. Visez une feuille ou une fleur, bien nette. Puis touchez Reconnaître cette plante : cela demande internet. Recommencer efface la photo. Chercher dans l\'application cherche par le nom, sans internet.' },
    maladie: { e: 'Ici, on cherche pourquoi une plante va mal. Réponds aux questions.', a: 'Voici le diagnostic. Vous pouvez prendre une photo, puis choisir où se trouve le problème : feuilles, tiges, fleurs ou terre. Touchez ce que vous voyez, puis Faire un diagnostic. Chaque réponse propose une cause et une solution naturelle. Modifier mes réponses permet de corriger, Recommencer repart de zéro, Voir la liste montre toutes les maladies.' },
    pots: { e: 'Voici tes pots. Touche J\'ai arrosé quand tu as donné de l\'eau.', a: 'Voici Mes pots. Ajouter un pot : choisissez la plante, l\'application propose la bonne place, au soleil ou à l\'ombre. Sur chaque pot, J\'ai arrosé note l\'arrosage du jour, Fiche ouvre la plante, Déplacer change sa place et Retirer l\'enlève de la liste. Plus bas, Comprendre la lumière de ma cour explique le soleil. Le carnet, le jardin et le planning sont tout près.' },
    conseils: { e: 'Ici, on apprend. Choisis un conseil ou un guide.', a: 'Voici les conseils. Le calendrier dit quoi faire ce mois-ci. Les guides vous expliquent pas à pas, par exemple un rempotage ou une bouture. Plus bas, les conseils sont rangés par thème : arrosage, compost, taille, nuisibles et d\'autres. Le bouton Écouter lit un conseil à voix haute.' },
    calendrier: { e: 'Voici les mois du jardin. Touche un mois pour voir quoi semer.', a: 'Voici le calendrier du jardin. Touchez un mois pour voir quoi semer, planter et récolter. Le bouton Choisir ma région adapte les dates à votre climat. Les plantes touchées ouvrent leur fiche.' },
    jardin: { e: 'Voici le plan de ta cour. Pose tes pots où tu veux.', a: 'Voici le plan de la cour. Créer mon plan fait un carré de 4 mètres sur 3. Touchez une place pour y mettre une plante. Les boutons Gauche, Droite, Monter et Descendre déplacent l\'élément choisi. Supprimer l\'enlève, Effacer tout le plan recommence. Ajouter à Mes pots range la plante dans vos pots.' },
    planning: { e: 'Voici ce qu\'il faut faire. Touche Fait quand c\'est fini.', a: 'Voici le planning. Les tâches en retard sont en premier, puis celles d\'aujourd\'hui et de la semaine. Touchez Fait quand c\'est terminé. Reporter à demain ou Reporter d\'une semaine décale la tâche. Ajouter une tâche en crée une, avec une répétition si vous voulez. Fiche ouvre la plante concernée.' },
    carnet: { e: 'Voici ton carnet. Écris et prends des photos de tes plantes.', a: 'Voici le carnet de culture. Ajouter une note : choisissez la plante, la date, écrivez, et ajoutez une photo si vous voulez. Modifier change une note, Supprimer l\'efface. Comparer les saisons montre l\'évolution d\'une plante d\'une année à l\'autre.' },
    assistant: { e: 'Pose-moi une question sur ton jardin. J\'écris la réponse.', a: 'Voici l\'assistant du jardin. Écrivez une question simple, par exemple quand semer les tomates, puis touchez Demander. La réponse arrive sans internet. Effacer l\'historique vide la liste des questions.' },
    meteo: { e: 'Voici le temps de ton jardin. Je te dis s\'il va geler.', a: 'Voici la météo du jardin. Touchez Voir la météo pour la charger : cela demande internet. Vous voyez les jours à venir et les alertes de gel, de forte chaleur ou de pluie, avec quoi faire pour protéger vos plantes.' },
    calculs: { e: 'Voici des calculettes. Elles comptent l\'eau et la terre pour toi.', a: 'Voici les calculettes. Choisissez-en une : arrosage, terreau, engrais, distance entre plants ou pH. Remplissez les cases, puis touchez Calculer. Le résultat s\'affiche en phrases simples.' },
    reglages: { e: 'Ici, on règle la taille du texte et la voix.', a: 'Voici les réglages. Taille du texte : Normal, Grand ou Très grand. Apparence : choisissez une ambiance. Voix : activée ou coupée, et la molette pour choisir une voix, qui se fait entendre en défilant. Mes données : effacer tout, avec une confirmation. Pour mes propres réglages, ouvrez mon menu puis Mes réglages Feuille.' },
    aide: { e: 'Voici le mode d\'emploi, étape par étape.', a: 'Voici le mode d\'emploi. Chaque cadre explique une action en étapes numérotées : chercher une plante, la reconnaître, soigner, gérer les pots, lire les conseils et écouter. Lisez-les dans l\'ordre ou touchez-moi pour de l\'aide sur chaque écran.' },
    maj: { e: 'Ici, l\'appli se met à jour toute seule.', a: 'Voici les mises à jour. Rechercher une mise à jour cherche une nouvelle version, avec internet. S\'il y en a une, vous voyez ce qui change, puis vous validez avec Mettre à jour. Revenir à la version précédente est possible en cas de souci. Vos pots et réglages sont gardés.' },
    licence: { e: 'Ici, on active l\'appli avec un code.', a: 'Voici la licence. Collez ou écrivez votre code d\'activation, puis touchez Activer. Retirer la licence de cet appareil libère le code pour un autre téléphone.' },
    plus: { e: 'Voici le menu Plus. Il y a tout le reste.', a: 'Voici le menu Plus. Vous y trouvez Mon jardin, Mon planning, le Carnet, l\'assistant, les calculettes, la météo, les réglages, le mode d\'emploi, les mises à jour, la licence et les informations légales. Mes réglages Feuille sont aussi ici.' },
    legal: { e: 'Ce sont des textes officiels. On les lit si on veut.', a: 'Voici un texte légal : mentions, conditions d\'utilisation ou confidentialité. Faites défiler pour lire. Vos données restent sur votre téléphone. Les cadres marqués à compléter sont remplis par l\'éditeur.' },
    apropos: { e: 'Voici les infos sur l\'appli.', a: 'Voici la page À propos : le nom de l\'application et sa version.' },
    gestes: { e: 'Ici, on apprend les gestes du jardinier.', a: 'Voici les gestes du jardinier : rempoter, bouturer, tailler, semer et bien d\'autres. Touchez un geste pour le voir pas à pas, avec le matériel et les erreurs à éviter. Le bouton Écouter lit les étapes. Faites-les à votre rythme.' },
    musique: { e: 'Ici, on met de la musique douce pour jardiner.', a: 'Voici la musique du jardin. Choisissez une ambiance et touchez Lecture pour démarrer, Pause pour arrêter. Le volume se règle avec la barre. La musique baisse quand je parle.' },
    labo: { e: 'Ici, on écoute les plantes avec le téléphone.', a: 'Voici le labo de la plante. Il utilise les capteurs du téléphone pour observer votre plante. Suivez les étapes à l\'écran. Si une fonction manque sur votre téléphone, un message vous l\'explique simplement.' },
    feuille: { e: 'Ici, on règle Feuille : taille, voix, couleur.', a: 'Voici mes réglages. En haut, mon aperçu. Vous choisissez : affichée ou rangée, ma taille, mon niveau d\'insistance, ma voix et les heures calmes, le bonjour du jour, féminin ou masculin, la couleur de la feuille et un accessoire. Réécouter un exemple me fait parler. Refaire la visite relance la visite guidée. Remettre mes réglages par défaut efface mes choix, après confirmation.' },
    autre: { e: 'Je suis là si tu as besoin de moi.', a: 'Je suis là sur tous les écrans. Lisez le titre en haut pour savoir où vous êtes. Le bouton Retour ramène à l\'écran d\'avant, et les cinq boutons du bas vont dans chaque section. Touchez-moi pour mon menu.' }
  };
  var ROUTES = [[/^\/accueil/, 'accueil'], [/^\/trouver/, 'trouver'], [/^\/plante\//, 'plante'], [/^\/photo/, 'photo'], [/^\/maladie/, 'maladie'], [/^\/pots/, 'pots'], [/^\/(conseils|conseil\/|guide\/)/, 'conseils'], [/^\/calendrier/, 'calendrier'], [/^\/jardin/, 'jardin'], [/^\/planning/, 'planning'], [/^\/carnet/, 'carnet'], [/^\/assistant/, 'assistant'], [/^\/meteo/, 'meteo'], [/^\/calculs/, 'calculs'], [/^\/reglages/, 'reglages'], [/^\/aide/, 'aide'], [/^\/maj/, 'maj'], [/^\/licence/, 'licence'], [/^\/plus/, 'plus'], [/^\/legal\//, 'legal'], [/^\/apropos/, 'apropos'], [/^\/gestes?(\/|$)/, 'gestes'], [/^\/musique/, 'musique'], [/^\/labo/, 'labo'], [/^\/feuille/, 'feuille']];
  function pathNow() {
    var p = T.cur && T.cur.path; if (p) return p;
    var h = (location.hash || '').replace(/^#/, '').split('?')[0] || '/accueil'; return h.charAt(0) === '/' ? h : '/' + h;
  }
  function routeKey(path) { path = path || pathNow(); for (var i = 0; i < ROUTES.length; i++) if (ROUTES[i][0].test(path)) return ROUTES[i][1]; return 'autre'; }

  function help() {
    var h = HELP[routeKey()] || HELP.autre, txt = fmt(h.a);
    closeMenu();
    say(txt, 'pense', { force: true, btns: [{ l: 'Merci', main: true, f: function () { hideBub(); mood('joie', 1200); } }] });
    return txt;
  }
  function plur(n, w) { return n + ' ' + w + (n > 1 ? 's' : ''); }
  function todayText() {
    var parts = [], al = sf(function () { return T.meteo.alertText(); }, ''), n = sf(function () { return T.planning.todayCount(); }, 0), due = sf(function () { return T.pots.dueCount(); }, 0), m = sf(function () { return T.learn.month(T.monthNow()); }, null);
    if (al) parts.push('Météo : ' + al);
    if (n) {
      var top = sf(function () { return T.planning.top(3); }, []).filter(function (x) { return x && (x.late || x.today); });
      parts.push('Vous avez ' + plur(n, 'tâche') + ' à faire aujourd\'hui ou en retard' + (top.length ? ' : ' + top.map(function (x) { return x.titre; }).join(' ; ') : '') + '.');
    }
    if (due) parts.push(plur(due, 'pot') + ' à vérifier pour l\'arrosage.');
    if (m) {
      if (m.semer && m.semer.length) parts.push('Ce mois-ci (' + String(m.nom || '').toLowerCase() + '), vous pouvez semer : ' + m.semer.slice(0, 5).join(', ') + '.');
      else if (m.aFaire && m.aFaire[0]) parts.push('Ce mois-ci : ' + m.aFaire[0]);
    }
    if (!parts.length) parts.push('Rien d\'urgent aujourd\'hui. Profitez de votre jardin.');
    return 'Voici ce que je vois pour aujourd\'hui. ' + parts.join(' ');
  }
  function today() {
    var txt = todayText(), c = cfg(), L = computeAlerts();
    L.forEach(function (a) { c.alertSeen[a.id] = 2; }); save(); pending = 0; updateBadge();
    closeMenu();
    say(txt, 'pense', { force: true, btns: [{ l: 'Merci', main: true, f: function () { hideBub(); mood('joie', 1200); } }, { l: 'Voir mon planning', f: function () { hideBub(); nav('#/planning'); } }] });
    return txt;
  }

  /* ---------- Visite guidée ---------- */
  function tourSteps() {
    return [
      { t: 'Bonjour, je m\'appelle Feuille. Je reste avec vous sur tous les écrans pour vous aider à jardiner.', m: 'joie' },
      { t: 'Touchez-moi : mon menu s\'ouvre. Du bout du doigt, vous pouvez aussi me déplacer où vous voulez.', m: 'doux' },
      { t: 'En bas, cinq boutons : Accueil, Trouver, Mes pots, Conseils et Plus. Ils vous mènent partout.', m: 'pense', hl: true },
      { t: 'Dans mon menu, « Aide sur cette page » vous explique chaque écran et chaque bouton.', m: 'ecoute' },
      { t: 'Je peux aussi me ranger : un petit bouton « Feuille » me rappelle. Mes réglages sont dans mon menu.', m: 'fier' }
    ];
  }
  function clearHl() { if (hlEl) { hlEl.classList.remove('fe-hl'); hlEl = null; } }
  function endTour(done) {
    clearHl(); tourOn = false; var c = cfg(); c.tourDone = true; c.lastGreet = todayStr(); save();
    if (done) say('Voilà, la visite est finie. Je suis là si vous avez besoin de moi.', 'fier'); else { hideBub(); mood('doux'); }
  }
  function tour() {
    var c = cfg(); closeMenu();
    if (!c.on) { c.on = true; save(); applyOn(); }
    var steps = tourSteps(), i = 0; tourOn = true;
    (function step() {
      clearHl();
      if (i >= steps.length) { endTour(true); return; }
      var s = steps[i], last = i === steps.length - 1;
      if (s.hl) { hlEl = document.getElementById('tabs'); if (hlEl) hlEl.classList.add('fe-hl'); }
      say(s.t, s.m, { force: true, btns: [{ l: last ? 'Terminer' : 'Suivant', main: true, f: function () { i++; step(); } }, { l: 'Passer la visite', f: function () { endTour(false); } }] });
    })();
  }

  /* ---------- Alertes ---------- */
  function computeAlerts() {
    var out = [], al = sf(function () { return T.meteo.alertText(); }, ''), n = sf(function () { return T.planning.todayCount(); }, 0), due = sf(function () { return T.pots.dueCount(); }, 0), m = sf(function () { return T.learn.month(T.monthNow()); }, null);
    if (al) out.push({ id: 'meteo:' + al, kind: 'meteo', text: 'Attention, ' + al });
    if (n > 0) out.push({ id: 'taches:' + n, kind: 'taches', text: 'Il y a ' + plur(n, 'tâche') + ' à faire aujourd\'hui ou en retard.' });
    if (due > 0) out.push({ id: 'pots:' + due, kind: 'pots', text: plur(due, 'pot') + (due > 1 ? ' ont' : ' a') + ' peut-être soif. Allez voir dans Mes pots.' });
    if (m && m.semer && m.semer.length) out.push({ id: 'semis:' + T.monthNow(), kind: 'semis', text: 'Ce mois-ci, c\'est le moment de semer : ' + m.semer.slice(0, 4).join(', ') + '.' });
    return out;
  }
  function busy() { return modalOpen() || !!menu || tourOn || typing || (bub && !bub.hidden && bub.getAttribute('data-btns') === '1'); }
  function check() {
    clearTimeout(checkT);
    var c = cfg(), d = todayStr();
    if (c.alertDay !== d) { c.alertDay = d; c.alertSeen = {}; save(); }
    var L = computeAlerts();
    pending = L.filter(function (a) { return c.alertSeen[a.id] !== 2; }).length; updateBadge();
    if (!c.on || c.level === 'discrete' || document.hidden) return L;
    var fresh = L.filter(function (a) { return !c.alertSeen[a.id] && (c.level !== 'normale' || a.kind !== 'meteo'); });
    if (!fresh.length) return L;
    if (busy()) { checkT = setTimeout(check, 20000); return L; }
    fresh.forEach(function (a) { c.alertSeen[a.id] = 1; }); save();
    var hasM = fresh.some(function (a) { return a.kind === 'meteo'; });
    say(fresh.map(function (a) { return a.text; }).join(' '), hasM ? 'surprise' : 'doux', {
      btns: [{ l: 'Merci', main: true, f: function () { computeAlerts().forEach(function (a) { c.alertSeen[a.id] = 2; }); save(); check(); hideBub(); mood('joie', 1200); } }, { l: 'Plus tard', f: function () { hideBub(); mood('doux'); } }]
    });
    return L;
  }

  /* ---------- Bonjour, visite, narration ---------- */
  function welcome() {
    var c = cfg();
    if (!appShown()) { setTimeout(welcome, 1500); return; }
    if (modalOpen() || !(T.store.s.flags && T.store.s.flags.onboarded)) { setTimeout(welcome, 1500); return; }
    if (!c.on) return;
    if (!c.tourDone) { tour(); return; }
    var d = todayStr();
    if (c.greet && c.level !== 'discrete' && c.lastGreet !== d) {
      c.lastGreet = d; save();
      var h = new Date().getHours(), g = h < 12 ? 'Bonjour' : (h < 18 ? 'Bon après-midi' : 'Bonsoir');
      say(g + ' ! Je suis là si vous avez besoin de moi. Touchez-moi pour mon menu.', 'joie');
    }
    setTimeout(check, 7000);
  }
  function onRoute(p) {
    var c = cfg(); closeMenu(); clamp(); place();
    if (!tourOn) { hideBub(); }
    if (!c.on || tourOn || c.level !== 'enfant' || modalOpen()) return;
    var k = routeKey(p), now = Date.now(); if (narrAt[k] && now - narrAt[k] < 20000) return; narrAt[k] = now;
    setTimeout(function () { if (routeKey() === k && !tourOn && !busy()) say((HELP[k] || HELP.autre).e, 'joie'); }, 500);
  }
  function routeTick() { var p = pathNow(); if (p !== lastPath) { var first = !lastPath; lastPath = p; if (!first) onRoute(p); } }

  /* ---------- Gestes (toucher, glisser) ---------- */
  function tap() {
    var n = Date.now(); if (n - lastTap < 350) return; lastTap = n;
    if (menu) closeMenu(); else openMenu();
    if (!RM && el) { el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); }
  }
  function pd(e) { if (menu || !pos) return; down = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y, moved: false }; try { el.setPointerCapture(e.pointerId); } catch (er) {} }
  function pm(e) {
    if (!down) return; var dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) > 8) { down.moved = true; hideBub(); mood('surprise'); }
    if (down.moved) { pos.x = down.ox + dx; pos.y = down.oy + dy; clamp(); place(); }
  }
  function pu(e) {
    if (!down) return; var d = down; down = null;
    if (d.moved) { savePos(); mood('joie', 1200); } else if (e.type === 'pointerup') tap();
  }

  /* ---------- Construction ---------- */
  function build() {
    var c = cfg();
    el = document.createElement('div'); el.className = 'fe'; el.id = 'feuille'; el.setAttribute('role', 'button'); el.tabIndex = 0;
    el.innerHTML = '<div class="fe-body"></div>'; document.body.appendChild(el);
    bub = document.createElement('div'); bub.className = 'fe-bub'; bub.hidden = true; bub.setAttribute('role', 'status'); bub.setAttribute('aria-live', 'polite');
    bub.addEventListener('click', function (e) { if (bub.getAttribute('data-btns') !== '1' && !e.target.closest('button')) { hideBub(); mood('doux'); } });
    document.body.appendChild(bub);
    pill = document.createElement('button'); pill.type = 'button'; pill.className = 'fe-pill fe-off'; pill.setAttribute('aria-label', 'Rappeler Feuille');
    pill.innerHTML = '<span class="fe-pl">' + pillLeaf(c) + '</span><span class="fe-pt">Feuille</span><span class="fe-badge" hidden></span>';
    pill.addEventListener('click', function () { setOn(true); }); document.body.appendChild(pill); pillBadge = pill.querySelector('.fe-badge');
    loadPos(); refreshLook(); applyOn();
    el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu);
    /* évite le « clic fantôme » qui tomberait sur le menu qui vient de s'ouvrir sous le doigt */
    el.addEventListener('touchend', function (e) { if (e.cancelable) e.preventDefault(); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } else if (e.key === 'Escape') closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu) closeMenu(); });
    window.addEventListener('pointermove', function (e) { look(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener('pointerdown', function (e) { look(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener('touchstart', function (e) { var t = e.touches && e.touches[0]; if (t) look(t.clientX, t.clientY); }, { passive: true });
    window.addEventListener('resize', function () { clamp(); place(); var a = area(); if (menu) { menu.style.bottom = Math.max(0, a.H - a.b) + 'px'; menu.style.maxHeight = Math.max(160, a.b - a.t) + 'px'; } });
    window.addEventListener('orientationchange', function () { setTimeout(function () { clamp(); place(); }, 250); });
    window.addEventListener('hashchange', function () { setTimeout(routeTick, 150); });
    document.addEventListener('focusin', function (e) { var t = e.target; typing = !!(t && t.matches && t.matches('input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button]),textarea,select') && !(t.closest && t.closest('.fe-menu'))); syncAway(); });
    document.addEventListener('focusout', function () { setTimeout(function () { var t = document.activeElement; typing = !!(t && t.matches && t.matches('input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button]),textarea,select')); syncAway(); }, 80); });
    var mr = document.getElementById('modal-root');
    if (mr && window.MutationObserver) new MutationObserver(syncAway).observe(mr, { childList: true });
    var areaSig = '';
    setInterval(function () {
      syncAway(); routeTick();
      /* la taille du texte ou le clavier ont pu changer la place disponible : on remet Feuille dans la zone libre */
      var a = area(), sig = [a.t, a.b, a.W, a.H, cfg().size].join(',');
      if (sig !== areaSig) { areaSig = sig; clamp(); place(); }
    }, 500);
    setInterval(function () { check(); }, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(check, 1500); });
    lastPath = pathNow(); blinkLoop(); syncAway(); place(); ready = true;
    setTimeout(welcome, 1200);
  }

  /* ---------- Réglages : API ---------- */
  var DESC = {
    discrete: 'Discrète : je ne parle que si vous me touchez. Une petite pastille vous montre qu\'il y a quelque chose à voir.',
    normale: 'Normale : je vous dis bonjour, puis je vous rappelle les tâches du jour, les pots à arroser et les semis du mois.',
    attentive: 'Attentive : en plus, je vous préviens du gel, de la canicule et de la pluie annoncés.',
    enfant: 'Mode enfant : je parle plus, et je lis chaque nouvel écran en phrases très simples.'
  };
  function set(k, v) {
    var c = cfg();
    if (k === 'on') { setOn(!!v); return; }
    if (k === 'size' && SIZES[v]) c.size = v;
    else if (k === 'level' && LEVELS.indexOf(v) >= 0) c.level = v;
    else if (k === 'mute') c.mute = !!v;
    else if (k === 'qOn') c.qOn = !!v;
    else if ((k === 'qFrom' || k === 'qTo') && /^\d{2}:\d{2}$/.test(v)) c[k] = v;
    else if (k === 'greet') c.greet = !!v;
    else if (k === 'genre' && (v === 'f' || v === 'm')) c.genre = v;
    else if (k === 'color' && PAL[v]) c.color = v;
    else if (k === 'acc' && ACCS[v]) c.acc = v;
    else return false;
    save();
    if (el) { if (k === 'genre' || k === 'color' || k === 'acc') refreshLook(); else { clamp(); place(); } }
    return true;
  }
  function settings(patch) {
    if (patch && typeof patch === 'object') Object.keys(patch).forEach(function (k) { set(k, patch[k]); });
    return JSON.parse(JSON.stringify(cfg()));
  }
  function reset() {
    var keep = cfg().tourDone;
    T.store.s.feuille = Object.assign({}, DEF, { alertSeen: {}, tourDone: keep });
    cfg(); refreshLook(); applyOn(); loadPos(); place(); save(); closeMenu(); hideBub();
  }

  /* ---------- Page #/feuille ---------- */
  function chips(k, items, curv) {
    return '<div class="chips">' + items.map(function (i) { var on = String(curv) === String(i[0]); return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-act="fe-set" data-k="' + k + '" data-v="' + i[0] + '" aria-pressed="' + on + '">' + (i[2] || '') + T.esc(i[1]) + '</button>'; }).join('') + '</div>';
  }
  T.route(/^\/feuille$/, 'plus', function () {
    var c = cfg(), h = '';
    h += '<div class="hero"><h2>Feuille</h2><p>Votre compagn' + accord('e', 'on') + ' de jardin, sur tous les écrans.</p></div>';
    h += '<div class="card fe-pcard"><div class="fe-prev">' + svgHtml(c, 'joie') + '</div><p class="center">Voici Feuille, avec vos choix.</p><div class="row"><button class="btn primary grow" data-act="fe-example">Réécouter un exemple</button><button class="btn grow" data-act="fe-tour">Refaire la visite</button></div></div>';
    h += '<div class="card"><h2>Présence</h2>' + chips('on', [['1', 'Feuille est affichée'], ['0', 'Feuille est rangée']], c.on ? '1' : '0') + '<p class="muted small">Quand Feuille est rangée, un petit bouton « Feuille » reste en bas de l\'écran pour la rappeler. Glissez le doigt sur elle pour la déplacer.</p></div>';
    h += '<div class="card"><h2>Taille</h2>' + chips('size', [['p', 'Petite'], ['m', 'Moyenne'], ['g', 'Grande']], c.size) + '</div>';
    h += '<div class="card"><h2>Quand parle-t-elle ?</h2>' + chips('level', [['discrete', 'Discrète'], ['normale', 'Normale'], ['attentive', 'Attentive'], ['enfant', 'Mode enfant']], c.level) + '<div class="notice">' + T.esc(fmt(DESC[c.level])) + '</div></div>';
    h += '<div class="card"><h2>Voix</h2>' + chips('mute', [['0', 'Elle parle'], ['1', 'Elle se tait']], c.mute ? '1' : '0') + '<a class="btn block" href="#/reglages">Changer sa voix</a>' + (c.genre === 'm' ? '<p class="muted small">Pour un Feuille masculin, choisissez plutôt une voix de garçon.</p>' : '') + '<p class="muted small">Elle écrit toujours dans sa bulle, même quand elle se tait.</p>' +
      '<h3>Heures calmes</h3>' + chips('qOn', [['1', 'Activées'], ['0', 'Désactivées']], c.qOn ? '1' : '0') +
      '<div class="fe-times"><div><label class="lbl" for="fe-qf">De</label><input id="fe-qf" class="field" type="time" value="' + c.qFrom + '" data-input="fe-time" data-k="qFrom"></div><div><label class="lbl" for="fe-qt">À</label><input id="fe-qt" class="field" type="time" value="' + c.qTo + '" data-input="fe-time" data-k="qTo"></div></div>' +
      '<p class="muted small">Pendant les heures calmes, Feuille n\'a pas de voix. Elle écrit seulement.</p></div>';
    h += '<div class="card"><h2>Bonjour du jour</h2>' + chips('greet', [['1', 'Oui, un bonjour'], ['0', 'Non merci']], c.greet ? '1' : '0') + '</div>';
    h += '<div class="card"><h2>Elle est</h2>' + chips('genre', [['f', 'Féminin'], ['m', 'Masculin']], c.genre) + '<p class="muted small">Le nom reste « Feuille ». Les phrases s\'accordent.</p></div>';
    h += '<div class="card"><h2>Couleur de la feuille</h2>' + chips('color', Object.keys(PAL).map(function (k) { return [k, PAL[k][3], '<span class="fe-sw" style="background:' + PAL[k][0] + ';border-color:' + PAL[k][1] + '"></span>']; }), c.color) + '</div>';
    h += '<div class="card"><h2>Accessoire</h2>' + chips('acc', Object.keys(ACCS).map(function (k) { return [k, ACCS[k]]; }), c.acc) + '</div>';
    h += '<div class="card"><h2>Tout remettre</h2><button class="btn danger block" data-act="fe-reset">Remettre mes réglages par défaut</button></div>';
    return { title: 'Feuille', html: h };
  });
  T.act['fe-set'] = function (b) {
    var k = b.getAttribute('data-k'), v = b.getAttribute('data-v');
    if (k === 'on') { setOn(v === '1'); T.render(true); return; }
    if (k === 'mute' || k === 'qOn' || k === 'greet') v = (v === '1');
    set(k, v); T.render(true);
    if (k === 'level') say(DESC[v], v === 'enfant' ? 'joie' : 'doux', { force: true });
    else if (k === 'genre') say('Me voilà, je suis ' + (v === 'm' ? 'Feuille, votre compagnon' : 'Feuille, votre compagne') + '.' + (v === 'm' ? ' Choisissez une voix de garçon si vous préférez.' : ''), 'joie', { force: true });
    else if (k === 'mute' && v) say('D\'accord, je me tais. J\'écris seulement dans ma bulle.', 'doux', { silent: true });
    else if (k === 'mute') say('J\'ai retrouvé ma voix.', 'joie', { force: true });
  };
  T.input['fe-time'] = function (i) { var k = i.getAttribute('data-k'); if (/^\d{2}:\d{2}$/.test(i.value)) { set(k, i.value); } };
  T.act['fe-example'] = function () {
    var c = cfg();
    if (!c.on) { setOn(true); }
    if (c.mute) { say('Ma voix est coupée. Touchez « Elle parle » pour m\'entendre.', 'desole', { silent: true }); return; }
    say('Bonjour, voici ma voix. Je m\'appelle Feuille, et je suis ravi' + accord('e', '') + ' de jardiner avec vous.', 'joie', { force: true });
  };
  T.act['fe-tour'] = function () { tour(); };
  T.act['fe-reset'] = function () { T.confirm('Tout remettre ?', 'Les réglages de Feuille reviendront comme au début : taille, voix, couleur, accessoire et heures calmes.', 'Remettre', function () { reset(); T.render(true); T.toast('Les réglages de Feuille sont remis par défaut.'); }); };

  /* ---------- API publique ---------- */
  T.feuille = {
    say: function (t, k) { return say(t, k); },
    isOn: isOn,
    show: function () { setOn(true); },
    hide: function () { setOn(false); },
    help: help,
    today: today,
    settings: settings,
    accord: accord,
    /* en plus */
    tour: tour, check: check, set: set, quietNow: quietNow, routeKey: routeKey, closeMenu: closeMenu, openMenu: openMenu, openSettings: function () { nav('#/feuille'); },
    helpFor: function (key) { return fmt((HELP[key] || HELP.autre).a); }, routes: function () { return Object.keys(HELP); },
    state: function () { return { ready: ready, on: isOn(), pos: pos && { x: pos.x, y: pos.y }, mood: cur, menu: !!menu, bubble: bub && !bub.hidden ? bub.textContent : '', away: away, tour: tourOn, pending: pending, size: sz() }; }
  };

  /* ---------- Démarrage : on attend que l'appli soit affichée ---------- */
  var tries = 0;
  (function wait() {
    if (ready) return;
    if (window.__TIFA_STARTED === true && appShown() && T.store && T.store.s && !window.__TIFA_INCOMPAT) { try { build(); } catch (e) { if (window.console) console.error(e); } return; }
    if (++tries < 2400) setTimeout(wait, 250);
  })();
})();
