/* Tifa Nature - « Mon jardin » : plan 2D de la cour (SVG), entièrement hors connexion.
   Données : T.store.s.garden = { w, l, south, items: [ { id, type, x, y, w, h, plantId, potId } ] }
   Unités : mètres (arrondis au dixième). Le plan est dessiné à 100 unités par mètre. */
(function () {
  'use strict';
  var T = window.T, J = T.jardin = {}, sel = '', pickFor = '', U = 100;

  var TYPES = {
    planche: { nom: 'Planche de culture', w: 1.2, h: 0.6, plant: true },
    bac: { nom: 'Bac', w: 0.8, h: 0.4, plant: true, pot: true },
    pot: { nom: 'Pot', w: 0.4, h: 0.4, plant: true, pot: true },
    allee: { nom: 'Allée', w: 1.0, h: 0.4 },
    composteur: { nom: 'Composteur', w: 0.8, h: 0.8 },
    recup: { nom: 'Récupérateur d\'eau', w: 0.5, h: 0.5 },
    mur: { nom: 'Mur', w: 2.0, h: 0.2 }
  };
  var ORDER = ['planche', 'bac', 'pot', 'allee', 'composteur', 'recup', 'mur'];
  var SOUTH = { haut: 'Sud en haut', droite: 'Sud à droite', bas: 'Sud en bas', gauche: 'Sud à gauche' };
  var ZONE_TXT = { plein_soleil: 'plein soleil (côté sud)', mi_ombre: 'mi-ombre (milieu du plan)', ombre: 'ombre (côté nord)' };
  var ZONE_SHORT = { plein_soleil: 'Plein soleil', mi_ombre: 'Mi-ombre', ombre: 'Ombre' };
  var MARK = { bien: '', moyen: '!', non: 'x' };

  /* ---------- Outils ---------- */
  function r1(v) { return Math.round(v * 10) / 10; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(v, def) { v = parseFloat(String(v).replace(',', '.')); return isFinite(v) ? v : def; }
  function fm(v) { return String(r1(v)).replace('.', ','); }
  function find(id) { var g = J.get(); if (!g) return null; for (var i = 0; i < g.items.length; i++) if (g.items[i].id === id) return g.items[i]; return null; }

  /* Lit le plan et le remet en ordre (défensif : données absentes, abîmées ou incomplètes). */
  J.get = function () {
    var s = T.store.s, g = s.garden;
    if (!g || typeof g !== 'object') return null;
    g.w = clamp(r1(num(g.w, 4)), 1, 30); g.l = clamp(r1(num(g.l, 3)), 1, 30);
    if (!SOUTH[g.south]) g.south = 'haut';
    if (!Array.isArray(g.items)) g.items = [];
    g.items = g.items.filter(function (it) { return it && typeof it === 'object' && TYPES[it.type]; });
    g.items.forEach(function (it) {
      if (!it.id) it.id = T.uid();
      it.w = clamp(r1(num(it.w, TYPES[it.type].w)), 0.2, g.w); it.h = clamp(r1(num(it.h, TYPES[it.type].h)), 0.2, g.l);
      it.x = clamp(r1(num(it.x, 0)), 0, r1(g.w - it.w)); it.y = clamp(r1(num(it.y, 0)), 0, r1(g.l - it.h));
      if (typeof it.plantId !== 'string') it.plantId = '';
    });
    return g;
  };
  function save() { T.store.save(); }

  /* Zone de soleil d'un élément : selon sa distance au côté sud. */
  J.zone = function (g, it) {
    var cx = it.x + it.w / 2, cy = it.y + it.h / 2, t;
    if (g.south === 'haut') t = cy / g.l; else if (g.south === 'bas') t = 1 - cy / g.l;
    else if (g.south === 'gauche') t = cx / g.w; else t = 1 - cx / g.w;
    return t < 1 / 3 ? 'plein_soleil' : (t < 2 / 3 ? 'mi_ombre' : 'ombre');
  };
  /* Verdict : la plante convient-elle ? (réutilise la logique de « Mes pots ») */
  J.verdict = function (g, it) {
    var ty = TYPES[it.type], z = J.zone(g, it), p = it.plantId ? T.plante(it.plantId) : null;
    if (!ty.plant) return { zone: z, plant: null, level: 'none', label: '', msg: '' };
    if (!p) return { zone: z, plant: null, level: 'none', label: 'Sans plante', msg: 'Choisissez une plante pour savoir si elle convient ici.' };
    var f = T.pots.fit(p, z), level = f.level, msg = f.msg;
    if (ty.pot && p.pot && p.pot.possible === false) {
      msg += ' Cette plante supporte mal la culture en pot ou en bac.'; if (level === 'bien') level = 'moyen';
    }
    return { zone: z, plant: p, level: level, label: level === 'bien' ? 'Bien placée' : (level === 'moyen' ? 'À surveiller' : 'À déplacer'), msg: msg };
  };
  function nameOf(it) {
    var p = it.plantId ? T.plante(it.plantId) : null, n = TYPES[it.type].nom;
    return p ? n + ' : ' + p.nom : n;
  }

  /* Texte court pour l'accueil. */
  J.summary = function () {
    var g = J.get(); if (!g) return 'Pas encore de plan de cour.';
    var n = g.items.length, warn = g.items.filter(function (it) { var v = J.verdict(g, it); return v.level === 'moyen' || v.level === 'non'; }).length;
    return 'Plan ' + fm(g.w) + ' x ' + fm(g.l) + ' m, ' + n + ' élément' + (n > 1 ? 's' : '') + (warn ? ', ' + warn + ' à surveiller' : '') + '.';
  };

  /* Cherche une place libre pour un nouvel élément (balayage tous les 0,5 m). */
  function freeSpot(g, w, h) {
    function ok(x, y) {
      return g.items.every(function (o) { return x + w <= o.x + 0.001 || o.x + o.w <= x + 0.001 || y + h <= o.y + 0.001 || o.y + o.h <= y + 0.001; });
    }
    var x, y, mx = r1(g.w - w), my = r1(g.l - h);
    for (y = 0; y <= my + 0.001; y += 0.5) for (x = 0; x <= mx + 0.001; x += 0.5) if (ok(r1(x), r1(y))) return { x: r1(x), y: r1(y) };
    return { x: r1(mx / 2), y: r1(my / 2) };
  }

  /* ---------- Dessin SVG ---------- */
  function bandsSvg(g, VW, VH, fs) {
    var h = '', i, cls = ['jd-b1', 'jd-b2', 'jd-b3'], names = ['SOLEIL', 'MI-OMBRE', 'OMBRE'];
    for (i = 0; i < 3; i++) {
      var x, y, w, hh;   /* bande i en partant du sud */
      if (g.south === 'haut') { x = 0; y = VH * i / 3; w = VW; hh = VH / 3; }
      else if (g.south === 'bas') { x = 0; y = VH * (2 - i) / 3; w = VW; hh = VH / 3; }
      else if (g.south === 'gauche') { x = VW * i / 3; y = 0; w = VW / 3; hh = VH; }
      else { x = VW * (2 - i) / 3; y = 0; w = VW / 3; hh = VH; }
      h += '<rect class="' + cls[i] + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '"/>';
      h += '<text class="jd-bt" x="' + (x + fs * 0.4) + '" y="' + (y + fs * 1.1) + '" font-size="' + (fs * 0.8) + '">' + names[i] + '</text>';
    }
    return h;
  }
  function fitStr(s, widthUnits, fs) {
    var max = Math.floor(widthUnits / (fs * 0.56));
    if (max < 3) return '';
    return s.length > max ? s.slice(0, Math.max(1, max - 1)) + '.' : s;
  }
  function planSvg(g) {
    var VW = r1(g.w * U), VH = r1(g.l * U), fs = Math.max(12, Math.round(Math.max(VW, VH) / 24));
    var h = '<div class="jd-box"><svg id="jd-svg" class="jd-svg" viewBox="0 0 ' + VW + ' ' + VH + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Plan de la cour, ' + fm(g.w) + ' mètres sur ' + fm(g.l) + ' mètres. ' + SOUTH[g.south] + '.">';
    h += bandsSvg(g, VW, VH, fs);
    /* grille des mètres */
    var i;
    for (i = 1; i < g.w; i++) h += '<line class="jd-grid" x1="' + i * U + '" y1="0" x2="' + i * U + '" y2="' + VH + '"/>';
    for (i = 1; i < g.l; i++) h += '<line class="jd-grid" x1="0" y1="' + i * U + '" x2="' + VW + '" y2="' + i * U + '"/>';
    /* indication du sud */
    var sx = VW / 2, sy = fs, anchor = 'middle';
    if (g.south === 'bas') sy = VH - fs * 0.3; else if (g.south === 'gauche') { sx = fs * 0.4; sy = VH / 2; anchor = 'start'; } else if (g.south === 'droite') { sx = VW - fs * 0.4; sy = VH / 2; anchor = 'end'; }
    if (g.south === 'haut') sy = fs * 2.2; else if (g.south === 'bas') sy = VH - fs * 1.3;
    h += '<text class="jd-south" x="' + sx + '" y="' + sy + '" font-size="' + fs + '" text-anchor="' + anchor + '">SUD</text>';
    h += '<rect class="jd-frame" x="1" y="1" width="' + (VW - 2) + '" height="' + (VH - 2) + '"/>';
    g.items.forEach(function (it, n) {
      var v = J.verdict(g, it), W = it.w * U, H = it.h * U, lab = fitStr((n + 1) + ' ' + (it.plantId && T.plante(it.plantId) ? T.plante(it.plantId).nom : TYPES[it.type].nom), W - 6, fs * 0.85);
      var mark = MARK[v.level] || '';
      if (!lab) lab = String(n + 1);
      if (mark) lab = lab + ' ' + mark;
      h += '<g class="jd-it jd-t-' + it.type + ' jd-v-' + v.level + (it.id === sel ? ' jd-sel' : '') + '" data-gid="' + T.esc(it.id) + '" transform="translate(' + r1(it.x * U) + ' ' + r1(it.y * U) + ')">';
      h += it.type === 'pot' ? '<ellipse class="jd-shape" cx="' + W / 2 + '" cy="' + H / 2 + '" rx="' + W / 2 + '" ry="' + H / 2 + '"/>' : '<rect class="jd-shape" x="0" y="0" width="' + W + '" height="' + H + '" rx="' + Math.min(10, H / 4) + '"/>';
      h += '<text class="jd-lab" x="' + W / 2 + '" y="' + (H / 2 + fs * 0.3) + '" font-size="' + fs * 0.85 + '" text-anchor="middle">' + T.esc(lab) + '</text></g>';
    });
    h += '</svg><div class="jd-ov">';
    g.items.forEach(function (it, n) {
      h += '<div class="jd-hd" data-jid="' + T.esc(it.id) + '" data-w="' + it.w + '" data-h="' + it.h + '" aria-label="' + T.esc((n + 1) + '. ' + nameOf(it)) + '" style="left:' + (it.x / g.w * 100) + '%;top:' + (it.y / g.l * 100) + '%;width:' + (it.w / g.w * 100) + '%;height:' + (it.h / g.l * 100) + '%"></div>';
    });
    return h + '</div></div>';
  }

  /* ---------- Interaction : glisser un élément ---------- */
  var drag = null;
  function svgPoint(svg, e) {
    try {
      var m = svg.getScreenCTM();
      if (m && svg.createSVGPoint) { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; var q = p.matrixTransform(m.inverse()); return { x: q.x / U, y: q.y / U }; }
    } catch (err) { /* repli ci-dessous */ }
    var r = svg.getBoundingClientRect(), g = J.get();
    return { x: (e.clientX - r.left) / r.width * g.w, y: (e.clientY - r.top) / r.height * g.l };
  }
  /* Zones de toucher : au moins 44 px, centrées sur l'élément (l'élément peut être plus petit). */
  function layoutHits() {
    var nodes = document.querySelectorAll('.jd-hd'), i, el, r, ew, eh;
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i]; el.style.boxSizing = 'border-box'; el.style.margin = '0'; el.style.padding = '0';
      r = el.getBoundingClientRect(); ew = Math.max(0, 44 - r.width); eh = Math.max(0, 44 - r.height);
      if (ew || eh) { el.style.boxSizing = 'content-box'; el.style.marginLeft = (-ew / 2) + 'px'; el.style.marginTop = (-eh / 2) + 'px'; el.style.paddingLeft = (ew / 2) + 'px'; el.style.paddingRight = (ew / 2) + 'px'; el.style.paddingTop = (eh / 2) + 'px'; el.style.paddingBottom = (eh / 2) + 'px'; }
    }
  }
  window.addEventListener('resize', function () { if (document.querySelector('.jd-hd')) layoutHits(); });
  function bind() {
    var svgEl = document.getElementById('jd-svg'), ov = document.querySelector('.jd-ov'); if (!svgEl || !ov) return;
    var svg = ov, hasPtr = !!window.PointerEvent;
    layoutHits();
    function down(e) {
      var el = e.target.closest ? e.target.closest('[data-jid]') : null; if (!el) return;
      var it = find(el.getAttribute('data-jid')), g = J.get(); if (!it || !g) return;
      var p = svgPoint(svgEl, e);
      drag = { id: it.id, el: el, ox: p.x - it.x, oy: p.y - it.y, x0: it.x, y0: it.y, cx: e.clientX, cy: e.clientY, moved: false, pid: e.pointerId };
      if (hasPtr) { try { svg.setPointerCapture(e.pointerId); } catch (err) { /* sans capture */ } }
      if (e.cancelable && !hasPtr) e.preventDefault();
    }
    function move(e) {
      if (!drag) return;
      var it = find(drag.id), g = J.get(); if (!it || !g) return;
      if (!drag.moved && Math.abs(e.clientX - drag.cx) + Math.abs(e.clientY - drag.cy) < 5) return;
      drag.moved = true; if (e.cancelable) e.preventDefault();
      var p = svgPoint(svgEl, e);
      it.x = clamp(r1(p.x - drag.ox), 0, r1(g.w - it.w)); it.y = clamp(r1(p.y - drag.oy), 0, r1(g.l - it.h));
      var gEl = svgEl.querySelector('[data-gid="' + it.id + '"]');
      if (gEl) gEl.setAttribute('transform', 'translate(' + r1(it.x * U) + ' ' + r1(it.y * U) + ')');
      drag.el.style.left = (it.x / g.w * 100) + '%'; drag.el.style.top = (it.y / g.l * 100) + '%';
    }
    function up(e) {
      if (!drag) return;
      var d = drag; drag = null;
      if (hasPtr) { try { svg.releasePointerCapture(d.pid); } catch (err) { /* déjà libéré */ } }
      if (d.moved) { save(); sel = d.id; T.render(true); } else { sel = (sel === d.id) ? '' : d.id; T.render(true); }
    }
    function cancel() {
      if (!drag) return; var it = find(drag.id); if (it) { it.x = drag.x0; it.y = drag.y0; } drag = null; T.render(true);
    }
    if (hasPtr) {
      svg.addEventListener('pointerdown', down); svg.addEventListener('pointermove', move);
      svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', cancel);
      /* Le défilement de la page est bloqué seulement quand le doigt touche un élément (touch-action ne marche pas sur les formes SVG). */
      svg.addEventListener('touchstart', function (e) { if (e.cancelable && e.target.closest && e.target.closest('[data-jid]')) e.preventDefault(); }, { passive: false });
      svg.addEventListener('touchmove', function (e) { if (drag && e.cancelable) e.preventDefault(); }, { passive: false });
    } else {   /* anciens navigateurs : souris et tactile */
      svg.addEventListener('touchstart', function (e) { var t = e.touches[0]; if (t) down({ target: e.target, clientX: t.clientX, clientY: t.clientY, cancelable: e.cancelable, preventDefault: function () { e.preventDefault(); } }); }, { passive: false });
      svg.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) move({ clientX: t.clientX, clientY: t.clientY, cancelable: e.cancelable, preventDefault: function () { e.preventDefault(); } }); }, { passive: false });
      svg.addEventListener('touchend', up); svg.addEventListener('touchcancel', cancel);
      svg.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    }
  }

  /* ---------- Écran ---------- */
  function field(label, val, attrs) {
    return '<div class="jd-f"><label class="lbl">' + T.esc(label) + '</label><input class="field" type="text" inputmode="decimal" autocomplete="off" maxlength="5" value="' + fm(val) + '" ' + attrs + '></div>';
  }
  function itemCard(g, it, n) {
    var ty = TYPES[it.type], v = J.verdict(g, it), p = v.plant, isSel = it.id === sel, id = T.esc(it.id);
    var h = '<div class="card jd-row jd-v-' + v.level + (isSel ? ' jd-rsel' : '') + '" data-row="' + id + '"><h3>' + (n + 1) + '. ' + T.esc(nameOf(it)) + '</h3>';
    h += '<p class="small muted">' + fm(it.w) + ' x ' + fm(it.h) + ' m - Zone : ' + T.esc(ZONE_TXT[v.zone]) + '</p>';
    if (v.level !== 'none') {
      h += '<div class="tags"><span class="tag ' + (v.level === 'bien' ? 'ok' : (v.level === 'moyen' ? 'warn' : (v.level === 'non' ? 'bad' : ''))) + '">' + T.esc(v.label) + '</span></div><p class="small">' + T.esc(v.msg) + '</p>';
      if (p && v.level !== 'bien') h += '<p class="small"><b>Meilleure zone :</b> ' + T.esc(T.pots.zoneFor(p).nom) + '</p>';
    }
    h += '<div class="row">';
    h += '<button class="btn" data-act="jsel" data-id="' + id + '" aria-pressed="' + isSel + '">' + (isSel ? 'Fermer les réglages' : 'Régler et déplacer') + '</button>';
    if (ty.plant) h += '<button class="btn" data-act="jplant" data-id="' + id + '">' + (p ? 'Changer la plante' : 'Choisir une plante') + '</button>';
    if (ty.plant && p) h += '<button class="btn" data-act="jtopots" data-id="' + id + '">Ajouter à Mes pots</button>';
    h += '<button class="btn danger" data-act="jdel" data-id="' + id + '">Supprimer</button></div>';
    if (isSel) {
      h += '<div class="jd-edit"><div class="jd-fs">' + field('Largeur (m)', it.w, 'data-jf="it.w" data-id="' + id + '" aria-label="Largeur en mètres"') + field('Longueur (m)', it.h, 'data-jf="it.h" data-id="' + id + '" aria-label="Longueur en mètres"') + '</div>';
      h += '<p class="small muted">Faites glisser l\'élément sur le plan, ou déplacez-le de 0,1 m avec ces boutons.</p><div class="jd-pad">' +
        '<button class="btn" data-act="jnudge" data-id="' + id + '" data-dx="0" data-dy="-1">Monter</button>' +
        '<button class="btn" data-act="jnudge" data-id="' + id + '" data-dx="-1" data-dy="0">Gauche</button>' +
        '<button class="btn" data-act="jnudge" data-id="' + id + '" data-dx="1" data-dy="0">Droite</button>' +
        '<button class="btn" data-act="jnudge" data-id="' + id + '" data-dx="0" data-dy="1">Descendre</button></div></div>';
    }
    return h + '</div>';
  }

  T.route(/^\/jardin$/, 'pots', function () {
    var g = J.get(), h = '<div class="hero"><h2>Mon jardin</h2><p>Dessinez votre cour ou votre jardin, placez vos bacs et vos pots, et voyez où il y a du soleil.</p></div>';
    if (!g) {
      h += '<div class="card"><h3>Pas encore de plan</h3><p>Le plan se règle en mètres. Vous pourrez changer les dimensions et l\'orientation ensuite. Tout reste sur votre téléphone.</p><button class="btn primary block" data-act="jcreate">Créer mon plan (4 x 3 m)</button></div>';
      h += '<a class="btn block" href="#/pots">Retour à Mes pots</a>';
      return { title: 'Mon jardin', html: h };
    }
    h += '<div class="card"><h3>Mon plan</h3><div class="jd-fs">' + field('Largeur (m)', g.w, 'data-jf="plan.w" aria-label="Largeur du plan en mètres"') + field('Longueur (m)', g.l, 'data-jf="plan.l" aria-label="Longueur du plan en mètres"') + '</div>';
    h += '<label class="lbl">Où est le sud ?</label><div class="chips">' + Object.keys(SOUTH).map(function (k) { return '<button class="chip' + (g.south === k ? ' on' : '') + '" data-act="jsouth" data-val="' + k + '" aria-pressed="' + (g.south === k) + '">' + SOUTH[k] + '</button>'; }).join('') + '</div></div>';
    h += '<div class="jd-wrap">' + planSvg(g) + '</div>';
    h += '<div class="jd-legend" aria-label="Légende du soleil"><span><i class="jd-sw jd-b1"></i>Plein soleil (côté sud)</span><span><i class="jd-sw jd-b2"></i>Mi-ombre</span><span><i class="jd-sw jd-b3"></i>Ombre (côté nord)</span></div>';
    h += '<p class="small muted">Touchez un élément pour le choisir, faites-le glisser pour le déplacer. Signes sur le plan : « ! » = à surveiller, « x » = à déplacer.</p>';
    h += '<h2>Ajouter un élément</h2><div class="jd-add">' + ORDER.map(function (k) { return '<button class="btn" data-act="jadd" data-type="' + k + '">' + T.esc(TYPES[k].nom) + '</button>'; }).join('') + '</div>';
    h += '<h2>Mes éléments (' + g.items.length + ')</h2>';
    if (!g.items.length) h += '<div class="notice">Aucun élément. Touchez un bouton ci-dessus, par exemple « Bac », pour commencer.</div>';
    h += g.items.map(function (it, n) { return itemCard(g, it, n); }).join('');
    h += '<div class="row jd-end"><a class="btn grow" href="#/pots">Retour à Mes pots</a><button class="btn danger grow" data-act="jreset">Effacer tout le plan</button></div>';
    return { title: 'Mon jardin', html: h, after: bind };
  });

  /* ---------- Actions ---------- */
  T.act.jcreate = function () { T.store.s.garden = { w: 4, l: 3, south: 'haut', items: [] }; sel = ''; save(); T.render(); };
  T.act.jsouth = function (el) { var g = J.get(); if (!g) return; g.south = el.getAttribute('data-val'); save(); T.render(true); };
  T.act.jsel = function (el) { var id = el.getAttribute('data-id'); sel = (sel === id) ? '' : id; T.render(true); };
  T.act.jadd = function (el) {
    var g = J.get(), k = el.getAttribute('data-type'), ty = TYPES[k]; if (!g || !ty) return;
    if (g.items.length >= 60) { T.toast('Le plan est plein : 60 éléments au maximum.'); return; }
    var w = Math.min(ty.w, g.w), h = Math.min(ty.h, g.l), pos = freeSpot(g, w, h);
    var it = { id: T.uid(), type: k, x: pos.x, y: pos.y, w: w, h: h, plantId: '' };
    g.items.push(it); sel = it.id; save(); T.toast(ty.nom + ' ajouté. Faites-le glisser où vous voulez.'); T.render(true);
  };
  T.act.jnudge = function (el) {
    var g = J.get(), it = find(el.getAttribute('data-id')); if (!g || !it) return;
    it.x = clamp(r1(it.x + 0.1 * parseInt(el.getAttribute('data-dx'), 10)), 0, r1(g.w - it.w));
    it.y = clamp(r1(it.y + 0.1 * parseInt(el.getAttribute('data-dy'), 10)), 0, r1(g.l - it.h));
    save(); T.render(true);
  };
  T.act.jdel = function (el) {
    var it = find(el.getAttribute('data-id')); if (!it) return;
    T.confirm('Supprimer cet élément ?', '« ' + nameOf(it) + ' » sera retiré du plan.', 'Supprimer', function () {
      var g = J.get(); g.items = g.items.filter(function (o) { return o.id !== it.id; }); if (sel === it.id) sel = ''; save(); T.toast('Élément supprimé.'); T.render(true);
    }, true);
  };
  T.act.jreset = function () {
    T.confirm('Effacer tout le plan ?', 'Le plan et tous ses éléments seront supprimés. Vos pots de « Mes pots » ne changent pas.', 'Tout effacer', function () {
      T.store.s.garden = null; sel = ''; save(); T.toast('Plan effacé.'); T.render();
    }, true);
  };

  /* Dimensions saisies (plan ou élément) : validées à la fin de la saisie. */
  document.addEventListener('change', function (e) {
    var el = e.target; if (!el || !el.getAttribute) return;
    var f = el.getAttribute('data-jf'); if (!f) return;
    var g = J.get(); if (!g) return;
    var v = num(el.value, NaN);
    if (!isFinite(v)) { T.toast('Entrez un nombre, par exemple 2,5.'); T.render(true); return; }
    if (f === 'plan.w' || f === 'plan.l') {
      v = clamp(r1(v), 1, 30); if (f === 'plan.w') g.w = v; else g.l = v;
      J.get();   /* remet les éléments dans le plan */
    } else {
      var it = find(el.getAttribute('data-id')); if (!it) return;
      if (f === 'it.w') it.w = clamp(r1(v), 0.2, g.w); else it.h = clamp(r1(v), 0.2, g.l);
      J.get();
    }
    save(); T.render(true);
  });

  /* Choix de la plante d'un élément */
  function plantRows(g, it, list) {
    return list.map(function (p) {
      var tmp = { x: it.x, y: it.y, w: it.w, h: it.h, type: it.type, plantId: p.id }, v = J.verdict(g, tmp);
      return '<button class="item" data-act="jppick" data-pid="' + T.esc(p.id) + '"><b>' + T.esc(p.nom) + '</b><i>' + T.esc(v.label) + ' ici</i></button>';
    }).join('');
  }
  T.act.jplant = function (el) {
    var g = J.get(), it = find(el.getAttribute('data-id')); if (!g || !it) return;
    pickFor = it.id;
    var btns = [{ label: 'Fermer' }];
    if (it.plantId) btns.push({ label: 'Retirer la plante', danger: true, onClick: function () { it.plantId = ''; save(); T.render(true); } });
    T.modal({ title: 'Quelle plante ?', html: '<label class="lbl" for="jp-q" style="margin-top:0">Chercher une plante</label><input id="jp-q" class="field" type="search" autocomplete="off" maxlength="60" placeholder="Nom de la plante" data-input="jpsearch"><div id="jp-res">' + suggestHtml(g, it) + '</div>', buttons: btns });
  };
  function suggestHtml(g, it) {
    var z = J.zone(g, it), best = T.D.plantes.filter(function (p) {
      return T.pots.fit(p, z).level === 'bien' && (!TYPES[it.type].pot || (p.pot && p.pot.possible));
    }).slice(0, 6);
    return '<p class="small muted">Plantes qui conviennent à cette zone (' + T.esc(ZONE_SHORT[z].toLowerCase()) + ') :</p>' + plantRows(g, it, best);
  }
  T.input.jpsearch = function (el) {
    var r = document.getElementById('jp-res'), g = J.get(), it = find(pickFor); if (!r || !g || !it) return;
    var q = el.value.trim();
    if (!q) { r.innerHTML = suggestHtml(g, it); return; }
    var res = T.search.plants(q, {}).slice(0, 6).map(function (x) { return x.p; });
    r.innerHTML = res.length ? plantRows(g, it, res) : '<p class="muted small">Aucune plante trouvée. Essayez un autre mot.</p>';
  };
  T.act.jppick = function (el) {
    var it = find(pickFor), p = T.plante(el.getAttribute('data-pid')); if (!it || !p) return;
    it.plantId = p.id; it.potId = ''; save(); T.closeModal(); sel = it.id;
    var v = J.verdict(J.get(), it);
    T.toast(v.level === 'bien' ? p.nom + ' : bonne place.' : p.nom + ' : ' + v.label.toLowerCase() + '.', 3200); T.render(true);
  };

  /* Ajouter la plante d'un élément à « Mes pots » */
  T.act.jtopots = function (el) {
    var g = J.get(), it = find(el.getAttribute('data-id')); if (!g || !it || !it.plantId) return;
    var p = T.plante(it.plantId); if (!p) return;
    var pots = T.store.s.pots = Array.isArray(T.store.s.pots) ? T.store.s.pots : [];
    if (it.potId && pots.some(function (x) { return x.id === it.potId; })) { T.toast('Déjà dans Mes pots.'); return; }
    if (pots.length >= 200) { T.toast('Vous avez atteint 200 pots dans Mes pots.'); return; }
    var pot = { id: T.uid(), plantId: p.id, nom: p.nom, surnom: TYPES[it.type].nom + ' du plan', zone: J.zone(g, it), added: Date.now(), arrose: null };
    pots.push(pot); it.potId = pot.id; save(); T.toast('Ajouté à Mes pots.');
  };
})();
