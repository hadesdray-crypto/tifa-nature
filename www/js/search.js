/* Tifa Nature - recherche de plantes (accents, fautes de frappe, mots courts), écran « Trouver » et fiche d'une plante. */
(function () {
  'use strict';
  var T = window.T, S = T.search = {}, idx = null;
  T.searchState = { q: '', f: { soleil: '', pot: false, interieur: false, facile: false, cat: '' } };

  function build() {
    idx = T.D.plantes.map(function (p) {
      return { p: p, nom: T.norm(p.nom), nomT: T.norm(p.nom).split(' '), syn: (p.synonymes || []).map(T.norm), lat: T.norm(p.latin), cat: T.norm(T.CAT[p.categorie] || '') };
    });
  }
  function startsTok(tokens, q) { for (var i = 0; i < tokens.length; i++) if (tokens[i].indexOf(q) === 0) return true; return false; }
  function scoreTok(e, q) {
    var best = 0, i, t, s;
    if (e.nom === q) best = 12; else if (e.nomT.indexOf(q) >= 0) best = 10; else if (startsTok(e.nomT, q)) best = 8; else if (q.length >= 3 && e.nom.indexOf(q) >= 0) best = 5;
    for (i = 0; i < e.syn.length; i++) {
      t = e.syn[i]; s = 0;
      if (t === q || t.split(' ').indexOf(q) >= 0) s = 8; else if (startsTok(t.split(' '), q)) s = 6; else if (q.length >= 3 && t.indexOf(q) >= 0) s = 3;
      if (s > best) best = s;
    }
    if (best < 5) {
      if (e.lat.split(' ').indexOf(q) >= 0) best = Math.max(best, 5); else if (startsTok(e.lat.split(' '), q)) best = Math.max(best, 4); else if (q.length >= 4 && e.lat.indexOf(q) >= 0) best = Math.max(best, 2);
      if (e.cat.indexOf(q) === 0 && q.length >= 3) best = Math.max(best, 2);
    }
    if (best < 4 && q.length >= 4) {                       /* fautes de frappe : 1 ou 2 lettres de différence */
      var max = q.length >= 7 ? 2 : 1, pool = e.nomT.concat(e.syn.join(' ').split(' '));
      for (i = 0; i < pool.length; i++) { if (pool[i].length >= 4 && T.lev(q, pool[i], max) <= max) { best = Math.max(best, 4); break; } }
    }
    return best;
  }
  function passFilters(p, f) {
    if (f.soleil && (p.soleil || []).indexOf(f.soleil) < 0) return false;
    if (f.pot && !(p.pot && p.pot.possible)) return false;
    if (f.interieur && !p.interieur) return false;
    if (f.facile && p.difficulte !== 'facile') return false;
    if (f.cat && p.categorie !== f.cat) return false;
    return true;
  }
  S.plants = function (query, f) {
    if (!idx) build();
    f = f || {};
    var q = T.norm(String(query || '').slice(0, 80)), toks = q ? q.split(' ').slice(0, 8) : [], out = [];
    idx.forEach(function (e) {
      if (!passFilters(e.p, f)) return;
      if (!toks.length) { out.push({ p: e.p, score: 0 }); return; }
      var total = 0, hit = 0;
      toks.forEach(function (t) { var s = scoreTok(e, t); if (s > 0) { total += s; hit += 1; } });
      var need = toks.length <= 2 ? toks.length : Math.ceil(toks.length * 0.6);
      if (hit >= need && hit > 0) out.push({ p: e.p, score: total });
    });
    out.sort(function (a, b) { return b.score - a.score || a.p.nom.localeCompare(b.p.nom, 'fr'); });
    return out;
  };
  function textSearch(list, query, fields, limit) {
    var toks = T.norm(String(query || '').slice(0, 80)).split(' ').filter(Boolean).slice(0, 6), res = [];
    if (!toks.length) return res;
    list.forEach(function (it) {
      var hay = T.norm(fields(it)), ok = toks.every(function (t) { return hay.indexOf(t) >= 0; });
      if (ok) res.push(it);
    });
    return res.slice(0, limit || 6);
  };
  S.maladies = function (q) { return textSearch(T.D.maladies, q, function (m) { return m.nom + ' ' + m.resume + ' ' + (m.plantes || []).join(' '); }, 5); };
  S.conseils = function (q) { return textSearch(T.D.conseils, q, function (c) { return c.titre + ' ' + c.texte; }, 5); };

  /* ---------- Affichages ---------- */
  function tagsFor(p, live) {
    var h = '<div class="tags">';
    h += '<span class="tag">' + T.esc(T.CAT[p.categorie] || p.categorie) + '</span>';
    h += '<span class="tag">' + T.esc(T.SOLEIL[p.soleilIdeal] || '') + '</span>';
    if (p.pot && p.pot.possible) h += '<span class="tag ok">En pot possible</span>';
    if (p.difficulte === 'facile') h += '<span class="tag ok">Facile</span>';
    if (p.toxique && p.toxique.chatChien) h += live ? '<button class="tag bad tagbtn" data-act="toxinfo" data-id="' + T.esc(p.id) + '" aria-label="Toxique : voir les explications">Toxique chats/chiens</button>' : '<span class="tag bad">Toxique chats/chiens</span>';
    if (live && T.assiette && T.assiette.resume && T.assiette.edible && T.assiette.edible(p.id)) h += '<button class="tag ok tagbtn" data-act="edibleinfo" data-id="' + T.esc(p.id) + '" aria-label="Comestible : voir le résumé">Comestible</button>';
    return h + '</div>';
  }
  S.item = function (p) {
    return '<a class="item" href="#/plante/' + T.esc(p.id) + '"><b>' + T.esc(p.nom) + '</b><i>' + T.esc(p.latin) + '</i>' + tagsFor(p) + '</a>';
  };
  S.resultsHtml = function () {
    var st = T.searchState, q = st.q.trim(), any = q || st.f.soleil || st.f.pot || st.f.interieur || st.f.facile || st.f.cat;
    var h = '';
    if (!any) {
      return '<p class="muted">Tapez un nom, ou touchez un filtre. ' + T.D.plantes.length + ' plantes sont dans l\'application.</p>';
    }
    var res = S.plants(q, st.f);
    if (res.length) {
      h += '<p class="muted small">' + res.length + ' plante' + (res.length > 1 ? 's' : '') + ' trouvée' + (res.length > 1 ? 's' : '') + '</p>';
      h += res.slice(0, 60).map(function (r) { return S.item(r.p); }).join('');
      if (res.length > 60) h += '<p class="muted small">Affinez votre recherche pour voir les autres plantes.</p>';
    } else {
      h += '<div class="notice">Aucune plante trouvée' + (q ? ' pour « ' + T.esc(q.slice(0, 40)) + ' »' : '') + '. Essayez un autre mot (par exemple « rose » ou « basilic ») ou retirez un filtre.</div>';
      h += '<div class="chips">' + T.D.plantes.slice(0, 8).map(function (p) { return '<button class="chip" data-act="searchfor" data-q="' + T.esc(p.nom) + '">' + T.esc(p.nom) + '</button>'; }).join('') + '</div>';
    }
    if (q) {
      var ml = S.maladies(q), cl = S.conseils(q);
      if (ml.length) h += '<h3>Maladies et problèmes</h3>' + ml.map(function (m) { return '<a class="item" href="#/maladie/' + T.esc(m.id) + '"><b>' + T.esc(m.nom) + '</b><i>' + T.esc(m.resume) + '</i></a>'; }).join('');
      if (cl.length) h += '<h3>Conseils</h3>' + cl.map(function (c) { return '<a class="item" href="#/conseil/' + T.esc(c.id) + '"><b>' + T.esc(c.titre) + '</b><i>' + T.esc(T.THEMES[c.theme] || '') + '</i></a>'; }).join('');
    }
    return h;
  };
  function chip(act, key, val, label, on) { return '<button class="chip' + (on ? ' on' : '') + '" data-act="' + act + '" data-key="' + key + '" data-val="' + T.esc(val) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + T.esc(label) + '</button>'; }
  S.filtersHtml = function () {
    var f = T.searchState.f, h = '<div class="chips" role="group" aria-label="Filtres">';
    h += chip('filter', 'soleil', 'plein_soleil', 'Plein soleil', f.soleil === 'plein_soleil');
    h += chip('filter', 'soleil', 'mi_ombre', 'Mi-ombre', f.soleil === 'mi_ombre');
    h += chip('filter', 'soleil', 'ombre', 'Ombre', f.soleil === 'ombre');
    h += chip('filter', 'pot', '1', 'En pot', f.pot);
    h += chip('filter', 'interieur', '1', 'Intérieur', f.interieur);
    h += chip('filter', 'facile', '1', 'Facile', f.facile);
    h += '</div><div class="chips" role="group" aria-label="Catégories">';
    Object.keys(T.CAT).forEach(function (k) { h += chip('filter', 'cat', k, T.CAT[k], f.cat === k); });
    return h + '</div>';
  };

  /* ---------- Écran « Trouver » ---------- */
  T.route(/^\/trouver$/, 'trouver', function () {
    var h = '<div class="card"><label class="lbl" for="q" style="margin-top:0">Chercher une plante</label>' +
      '<input id="q" class="field" type="search" inputmode="search" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="80" placeholder="Nom, fleur, légume…" value="' + T.esc(T.searchState.q) + '" data-input="search">' +
      '<div id="filters">' + S.filtersHtml() + '</div></div>' +
      '<div id="results">' + S.resultsHtml() + '</div>' +
      '<h2>Autres façons de trouver</h2><div class="big-grid">' +
      '<a class="big tint" href="#/photo"><b>Reconnaître une plante</b><span>Avec une photo ou en répondant à quelques questions</span></a>' +
      '<a class="big tint" href="#/maladie"><b>Ma plante est malade</b><span>Photo et symptômes : cause et solution</span></a>' +
      '<a class="big" href="#/maladies"><b>Liste des maladies</b><span>Insectes, champignons, manques</span></a>' +
      '<a class="big" href="#/pots"><b>Où placer ma plante ?</b><span>Soleil ou ombre dans la cour</span></a></div>';
    return { title: 'Trouver', html: h };
  }, true);
  T.input.search = function (el) {
    T.searchState.q = el.value; var r = document.getElementById('results'); if (r) r.innerHTML = S.resultsHtml();
  };
  T.act.filter = function (el) {
    var f = T.searchState.f, k = el.getAttribute('data-key'), v = el.getAttribute('data-val');
    if (k === 'pot' || k === 'interieur' || k === 'facile') f[k] = !f[k]; else f[k] = (f[k] === v) ? '' : v;
    var a = document.getElementById('filters'), r = document.getElementById('results');
    if (a) a.innerHTML = S.filtersHtml(); if (r) r.innerHTML = S.resultsHtml();
  };
  T.act.searchfor = function (el) {
    T.searchState.q = el.getAttribute('data-q') || ''; T.searchState.f = { soleil: '', pot: false, interieur: false, facile: false, cat: '' };
    if (location.hash === '#/trouver') T.render(); else location.hash = '#/trouver';
  };

  /* ---------- Fiche d'une plante ---------- */
  function calRow(label, arr) {
    if (!arr || !arr.length) return '';
    return '<div class="legend-row">' + T.esc(label) + ' : <span class="muted">' + T.esc(T.monthsText(arr)) + '</span></div>' + T.months12(arr);
  }
  S.speech = function (p) {
    var z = T.pots ? T.pots.zoneFor(p) : null;
    return p.nom + '. ' + p.description + ' Lumière : ' + p.heuresSoleil + '. ' + (z ? 'Meilleure place : ' + z.nom + '. ' : '') + 'Arrosage : ' + p.arrosage.conseil + ' Conseils : ' + T.plain(p.conseils);
  };
  T.fichePlus = T.fichePlus || [];
  T.route(/^\/plante\/([^/]+)$/, 'trouver', function (m) {
    var p = T.plante(decodeURIComponent(m[1]));
    if (!p) return { title: 'Plante', html: '<div class="notice warn">Cette fiche n\'existe pas. <a href="#/trouver">Retour à la recherche</a></div>' };
    var z = T.pots ? T.pots.zoneFor(p) : null, h = '';
    h += '<div class="card"><h2>' + T.esc(p.nom) + '</h2><p class="muted"><i>' + T.esc(p.latin) + '</i></p><p>' + T.esc(p.description) + '</p>' + tagsFor(p, true) +
      '<div class="row">' + T.voice.button(S.speech(p), 'Écouter la fiche') + '<button class="btn primary" data-act="addpot" data-id="' + T.esc(p.id) + '">Ajouter à mes pots</button></div></div>';
    if (p.toxique && p.toxique.chatChien) h += '<div class="notice bad"><b>Attention : toxique pour les chats et les chiens.</b> ' + T.esc(p.toxique.note || '') + '</div>';
    h += '<div class="card"><h3>Où la placer</h3><dl class="kv"><dt>Lumière</dt><dd>' + T.esc(p.heuresSoleil) + '</dd>' +
      '<dt>Expositions</dt><dd>' + (p.soleil || []).map(function (s) { return T.esc(T.SOLEIL[s] || s); }).join(', ') + '</dd>' +
      (z ? '<dt>Meilleure place</dt><dd>' + T.esc(z.nom) + '</dd>' : '') +
      '<dt>En pot</dt><dd>' + (p.pot && p.pot.possible ? 'Oui, pot d\'environ ' + T.esc(p.pot.volumeLitres) + ' litres. ' + T.esc(p.pot.conseil) : 'Mieux vaut la pleine terre. ' + T.esc((p.pot && p.pot.conseil) || '')) + '</dd>' +
      '<dt>Dedans / dehors</dt><dd>' + (p.interieur ? 'Intérieur' : '') + (p.interieur && p.exterieur ? ' et ' : '') + (p.exterieur ? 'extérieur' : '') + '</dd></dl></div>';
    h += '<div class="card"><h3>Arrosage et terre</h3><div class="tags"><span class="tag">' + T.esc(T.ARROS[p.arrosage.frequence] || '') + '</span></div><p>' + T.esc(p.arrosage.conseil) + '</p><p><b>Terre :</b> ' + T.esc(p.sol) + '</p></div>';
    var cal = calRow('Semis', p.semis) + calRow('Plantation', p.plantation) + calRow('Floraison', p.floraison) + calRow('Récolte', p.recolte) + calRow('Taille', p.taille);
    if (cal) h += '<div class="card"><h3>Calendrier</h3>' + cal + '</div>';
    h += '<div class="card"><h3>Conseils</h3><ul>' + T.list(p.conseils) + '</ul></div>';
    h += '<div class="card"><h3>Froid et hiver</h3><p><b>Résistance :</b> ' + T.esc(p.rusticite) + '</p><p>' + T.esc(p.hivernage) + '</p></div>';
    (T.fichePlus || []).forEach(function (f) { try { var x = f(p); if (x) h += x; } catch (e) {} });
    if ((p.amies || []).length || (p.ennemies || []).length) {
      h += '<div class="card"><h3>Bons et mauvais voisins</h3>';
      if (p.amies.length) h += '<p class="muted small">À côté de :</p><div class="chips">' + p.amies.map(function (n) { return '<button class="chip" data-act="searchfor" data-q="' + T.esc(n) + '">' + T.esc(n) + '</button>'; }).join('') + '</div>';
      if (p.ennemies.length) h += '<p class="muted small">À éviter à côté :</p><div class="tags">' + p.ennemies.map(function (n) { return '<span class="tag warn">' + T.esc(n) + '</span>'; }).join('') + '</div>';
      h += '</div>';
    }
    var pb = (p.problemes || []).map(T.maladie).filter(Boolean);
    if (pb.length) h += '<div class="card"><h3>Problèmes fréquents</h3>' + pb.map(function (d) { return '<a class="item" href="#/maladie/' + T.esc(d.id) + '"><b>' + T.esc(d.nom) + '</b><i>' + T.esc(d.resume) + '</i></a>'; }).join('') + '<a class="btn block" href="#/maladie?plante=' + T.esc(p.id) + '">Ma plante est malade : diagnostic</a></div>';
    return { title: p.nom, html: h };
  });
})();
