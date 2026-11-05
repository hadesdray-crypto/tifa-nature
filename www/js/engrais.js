/* Tifa Nature - « Engrais et astuces maison » : fiches claires, recherche, conseils par plante.
   Données : data/engrais.js (T.D.engrais). Rien n'est stocké. Aucun envoi de données.
   API : T.engrais = { all(), get(id), search(q), pourPlante(idPlante) -> { bien:[], eviter:[] } }.
   Routes (onglet « plus ») : #/engrais, #/engrais/<id>, #/engrais-liste/<type>, #/engrais-plante/<id>.
   Crochet : T.fichePlus (carte « Engrais et astuces pour cette plante »). Feuille : appelée de façon défensive. */
(function () {
  'use strict';
  var T = window.T, EN = T.engrais = {}, esc = T.esc;
  var qState = '', plState = '';

  var TYPES = {
    naturel: { nom: 'Engrais naturels', court: 'Naturel', texte: 'Ce que l\'on met au jardin : compost, paille, cendres, marc de café.' },
    maison: { nom: 'À fabriquer chez soi', court: 'À fabriquer', texte: 'Des préparations simples : purins, terreaux, pièges, boutures.' },
    eviter: { nom: 'Idées reçues et à éviter', court: 'À éviter', texte: 'Les astuces qui ne marchent pas, ou qui font du tort.' }
  };
  var PREUVE = {
    etabli: { mot: 'Preuve solide', txt: 'Plusieurs sources sérieuses le confirment.', f: 'cercle' },
    courant: { mot: 'Usage courant', txt: 'Beaucoup de jardiniers le font, mais les preuves sont limitées.', f: 'carre' },
    discute: { mot: 'Efficacité discutée', txt: 'Les avis ne sont pas d\'accord. Soyez prudent.', f: 'triangle' },
    mythe: { mot: 'Idée reçue', txt: 'Ça ne marche pas comme on le croit.', f: 'croix' }
  };
  var BUTS = { nourrir: 'Nourrir', pailler: 'Pailler', amender_sol: 'Améliorer la terre', eloigner_nuisibles: 'Éloigner les nuisibles', soigner: 'Soigner', multiplier: 'Multiplier', arroser: 'Arroser' };

  function arr(a) { return Array.isArray(a) ? a.filter(function (x) { return x != null && String(x).trim() !== ''; }) : []; }
  function str(s) { return typeof s === 'string' ? s : (s == null ? '' : String(s)); }
  function LIST() { return (T.D && Array.isArray(T.D.engrais)) ? T.D.engrais : []; }
  function feuilleSay(t, m) { try { if (T.feuille && typeof T.feuille.say === 'function') T.feuille.say(t, m); } catch (e) { /* facultatif */ } }
  function butNom(k) { return BUTS[k] || str(k).replace(/_/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }); }

  EN.all = function () { return LIST().slice(); };
  EN.get = function (id) { try { return id == null ? null : T.byId(LIST(), String(id)); } catch (e) { return null; } };

  /* ---------- Recherche (accents, fautes) ---------- */
  var STOP = ['de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'en', 'au', 'aux', 'et', 'ou', 'a', 'd', 'l', 'pour', 'sur', 'mon', 'ma', 'mes', 'dans', 'avec', 'sans', 'que', 'qui'];
  EN.search = function (query) {
    try {
      var toks = T.norm(String(query == null ? '' : query).slice(0, 80)).split(' ').filter(function (w) { return w && STOP.indexOf(w) < 0; }).slice(0, 8);
      if (!toks.length) return [];
      var out = [];
      LIST().forEach(function (e) {
        var nom = T.norm(e.nom), nt = nom.split(' '), acc = T.norm(e.accroche), but = T.norm(arr(e.sert_a).map(butNom).join(' ')),
          pour = T.norm(arr(e.pour).map(function (c) { return T.CAT[c] || c; }).join(' ')), more = T.norm(str(e.resume_court) + ' ' + arr(e.comment).join(' '));
        var total = 0, hit = 0;
        toks.forEach(function (q) {
          var s = 0;
          if (nt.indexOf(q) >= 0) s = 10; else if (q.length >= 3 && nom.indexOf(q) >= 0) s = 7;
          if (s < 5 && q.length >= 3 && but.indexOf(q) >= 0) s = Math.max(s, 5);
          if (s < 4 && q.length >= 3 && pour.indexOf(q) >= 0) s = Math.max(s, 4);
          if (s < 3 && q.length >= 3 && acc.indexOf(q) >= 0) s = Math.max(s, 3);
          if (s < 2 && q.length >= 4 && more.indexOf(q) >= 0) s = Math.max(s, 1);
          if (s < 4 && q.length >= 4) { var mx = q.length >= 7 ? 2 : 1; for (var i = 0; i < nt.length; i++) if (nt[i].length >= 4 && T.lev(q, nt[i], mx) <= mx) { s = Math.max(s, 4); break; } }
          if (s > 0) { total += s; hit += 1; }
        });
        var need = toks.length <= 2 ? toks.length : Math.ceil(toks.length * 0.6);
        if (hit > 0 && hit >= need) out.push({ id: e.id, nom: e.nom, type: e.type, score: total });
      });
      out.sort(function (a, b) { return b.score - a.score || a.nom.localeCompare(b.nom, 'fr'); });
      return out;
    } catch (err) { return []; }
  };

  /* ---------- Par plante ---------- */
  var RANK = { etabli: 0, courant: 1, discute: 2, mythe: 3 };
  function has(a, v) { return arr(a).indexOf(v) >= 0; }
  EN.pourPlante = function (idPlante) {
    var res = { bien: [], eviter: [] };
    try {
      var p = idPlante ? T.plante(String(idPlante)) : null;
      if (!p) return res;
      var cat = p.categorie;
      LIST().forEach(function (e) {
        var exclu = has(e.ids_plantes_eviter, p.id) || (cat && has(e.ids_plantes_eviter, cat));
        var raison = arr(e.eviter_si).join(' ; ');
        if (exclu) { res.eviter.push({ id: e.id, nom: e.nom, type: e.type, niveau_preuve: e.niveau_preuve, raison: raison || str(e.accroche), precis: true }); return; }
        if (e.type === 'eviter' || e.niveau_preuve === 'mythe') { res.eviter.push({ id: e.id, nom: e.nom, type: e.type, niveau_preuve: e.niveau_preuve, raison: str(e.accroche), precis: false }); return; }
        var precis = has(e.ids_plantes_bien, p.id);
        if (precis || (cat && has(e.pour, cat)) || has(e.pour, 'toutes')) res.bien.push({ id: e.id, nom: e.nom, type: e.type, niveau_preuve: e.niveau_preuve, accroche: str(e.accroche), precis: precis });
      });
      res.bien.sort(function (a, b) { return (b.precis ? 1 : 0) - (a.precis ? 1 : 0) || (RANK[a.niveau_preuve] || 1) - (RANK[b.niveau_preuve] || 1) || a.nom.localeCompare(b.nom, 'fr'); });
      res.eviter.sort(function (a, b) { return (b.precis ? 1 : 0) - (a.precis ? 1 : 0) || a.nom.localeCompare(b.nom, 'fr'); });
    } catch (err) { /* résultat vide */ }
    return res;
  };

  /* ---------- Pièces d'affichage ---------- */
  function shape(f) {
    var inner = f === 'cercle' ? '<circle cx="10" cy="10" r="7" fill="currentColor"/>'
      : f === 'carre' ? '<rect x="3" y="3" width="14" height="14" fill="currentColor"/>'
      : f === 'triangle' ? '<path d="M10 2L19 18H1z" fill="currentColor"/>'
      : '<path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" fill="none"/>';
    return '<svg class="en-shape" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  function badge(niv) {
    var pr = PREUVE[niv] || PREUVE.courant;
    return '<span class="en-pr en-pr-' + esc(PREUVE[niv] ? niv : 'courant') + '">' + shape(pr.f) + '<span>' + esc(pr.mot) + '</span></span>';
  }
  function warnIcon() { return '<svg class="en-warn-i" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><path d="M12 2L23 21H1z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 9v6M12 17.6v1.2" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>'; }
  function itemHtml(e, extra) {
    var t = TYPES[e.type] ? TYPES[e.type].court : '';
    return '<a class="card en-item" href="#/engrais/' + esc(e.id) + '"><span class="en-item-t">' + esc(e.nom) + '</span>' +
      (extra ? '<span class="en-item-s">' + esc(extra) + '</span>' : '') +
      '<span class="en-item-m">' + (t ? '<span class="tag">' + esc(t) + '</span>' : '') + badge(e.niveau_preuve) + '</span></a>';
  }
  function byIdFull(x) { return EN.get(x.id) || x; }

  /* ---------- Accueil ---------- */
  function plantOptions(sel) {
    var mine = [], seen = {}, h = '';
    try { (T.pots && T.pots.all ? T.pots.all() : (T.store.s.pots || [])).forEach(function (x) { if (x && x.plantId && !seen[x.plantId] && T.plante(x.plantId)) { seen[x.plantId] = 1; mine.push(T.plante(x.plantId)); } }); } catch (e) { /* aucun pot */ }
    h += '<option value="">Choisir une plante</option>';
    if (mine.length) h += '<optgroup label="Mes plantes">' + mine.map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(p.nom) + '</option>'; }).join('') + '</optgroup>';
    var all = ((T.D && T.D.plantes) || []).slice().sort(function (a, b) { return String(a.nom).localeCompare(String(b.nom), 'fr'); });
    h += '<optgroup label="Toutes les plantes">' + all.map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(p.nom) + '</option>'; }).join('') + '</optgroup>';
    return h;
  }
  function plantResult(id) {
    var p = id ? T.plante(id) : null;
    if (!p) return '<p class="muted small en-hint">Choisissez une plante pour voir ce qui lui convient.</p>';
    var r = EN.pourPlante(id), h = '<h3 class="en-h">Pour : ' + esc(p.nom) + '</h3>';
    h += '<p class="en-sub"><b>Ce qui lui convient</b></p>';
    h += r.bien.length ? r.bien.map(function (x) { return itemHtml(byIdFull(x), x.accroche); }).join('') : '<div class="notice">Rien de précis pour cette plante pour l\'instant.</div>';
    h += '<p class="en-sub"><b>À éviter pour elle</b></p>';
    h += r.eviter.length ? r.eviter.map(function (x) { return itemHtml(byIdFull(x), (x.precis ? 'Pas pour cette plante : ' : '') + x.raison); }).join('') : '<div class="notice">Rien de particulier à éviter.</div>';
    return h;
  }
  function resultsHtml(q) {
    var s = EN.search(q);
    if (!s.length) return '<div class="notice" role="status">Aucun résultat. Essayez un mot plus simple : café, ortie, limace, cendre.</div>';
    return '<p class="muted small" aria-live="polite">' + s.length + ' résultat' + (s.length > 1 ? 's' : '') + '</p>' + s.map(function (x) { var e = EN.get(x.id); return e ? itemHtml(e, e.accroche) : ''; }).join('');
  }
  function bigEntry(k) {
    var n = LIST().filter(function (e) { return e.type === k; }).length, t = TYPES[k];
    return '<a class="card en-big" href="#/engrais-liste/' + k + '"><span class="en-big-t">' + esc(t.nom) + '</span><span class="en-big-s">' + esc(t.texte) + '</span><span class="en-big-n">' + n + ' fiche' + (n > 1 ? 's' : '') + '</span></a>';
  }
  T.route(/^\/engrais$/, 'plus', function () {
    try {
      var h = '<div class="hero"><h2>Engrais et astuces maison</h2><p>Nourrir vos plantes avec ce que vous avez, et savoir ce qui marche vraiment.</p></div>';
      if (!LIST().length) return { title: 'Engrais et astuces', html: h + '<div class="notice">Les fiches ne sont pas disponibles pour le moment.</div>' };
      h += bigEntry('naturel') + bigEntry('maison') + bigEntry('eviter');
      h += '<div class="card en-search"><h3>Chercher un mot</h3><label class="lbl" for="en-q">Par exemple : café, ortie, limaces</label><input id="en-q" class="field" type="search" inputmode="search" autocomplete="off" maxlength="80" data-input="enq" value="' + esc(qState) + '"><div id="en-res" aria-live="polite">' + (qState.trim() ? resultsHtml(qState) : '') + '</div></div>';
      h += '<div class="card en-search"><h3>Pour ma plante</h3><label class="lbl" for="en-pl">Quelle plante ?</label><select id="en-pl" class="field" data-input="enpl">' + plantOptions(plState) + '</select><div id="en-pp" aria-live="polite">' + plantResult(plState) + '</div></div>';
      return { title: 'Engrais et astuces', html: h };
    } catch (e) { return { title: 'Engrais et astuces', html: '<div class="notice">Cet écran n\'a pas pu s\'afficher. Revenez en arrière et réessayez.</div>' }; }
  });
  T.input.enq = function (el) { qState = String(el.value || '').slice(0, 80); var d = document.getElementById('en-res'); if (d) d.innerHTML = qState.trim() ? resultsHtml(qState) : ''; };
  T.input.enpl = function (el) { plState = String(el.value || ''); var d = document.getElementById('en-pp'); if (d) d.innerHTML = plantResult(plState); };

  T.route(/^\/engrais-liste\/(naturel|maison|eviter)$/, 'plus', function (m) {
    var k = m[1], t = TYPES[k], l = LIST().filter(function (e) { return e.type === k; });
    var h = '<a class="btn" href="#/engrais">Retour</a><div class="hero"><h2>' + esc(t.nom) + '</h2><p>' + esc(t.texte) + '</p></div>';
    h += l.length ? l.map(function (e) { return itemHtml(e, e.accroche); }).join('') : '<div class="notice">Aucune fiche pour le moment.</div>';
    return { title: t.nom, html: h };
  });
  T.route(/^\/engrais-plante\/([^\/?]+)$/, 'plus', function (m) {
    var id = decodeURIComponent(m[1]), p = T.plante(id);
    if (!p) return { title: 'Engrais et astuces', html: '<div class="notice">Cette plante est introuvable.</div><a class="btn block" href="#/engrais">Retour</a>' };
    return { title: 'Engrais pour ' + p.nom, html: '<a class="btn" href="#/plante/' + esc(p.id) + '">Retour à la fiche</a><div class="card">' + plantResult(p.id) + '</div>' };
  });

  /* ---------- Fiche ---------- */
  function listItems(a) { return a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join(''); }
  function safeUrl(u) { u = str(u).trim(); return /^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : ''; }
  function speech(e) {
    var s = [e.nom + '.', str(e.resume_court)];
    var c = arr(e.comment); if (c.length) s.push('Comment faire. ' + c.map(function (x, i) { return 'Étape ' + (i + 1) + '. ' + x; }).join(' '));
    if (e.dose) s.push('Dose. ' + e.dose); if (e.quand) s.push('Quand. ' + e.quand);
    var ev = arr(e.eviter_si); if (ev.length) s.push('À éviter si. ' + ev.join('. '));
    if (str(e.danger).trim()) s.push('Attention. ' + e.danger);
    var pr = PREUVE[e.niveau_preuve]; if (pr) s.push(pr.mot + '. ' + pr.txt);
    return s.join(' ');
  }
  T.route(/^\/engrais\/([^\/?]+)$/, 'plus', function (m) {
    var back = '<a class="btn" href="#/engrais">Retour aux engrais</a>';
    try {
      var e = EN.get(decodeURIComponent(m[1]));
      if (!e) return { title: 'Engrais et astuces', html: back + '<div class="notice">Cette fiche est introuvable.</div>' };
      var pr = PREUVE[e.niveau_preuve] || PREUVE.courant, h = back;
      h += '<div class="card en-head"><span class="tag">' + esc((TYPES[e.type] || {}).court || '') + '</span><h2>' + esc(e.nom) + '</h2><p class="en-resume">' + esc(e.resume_court || e.accroche) + '</p>' +
        '<p class="en-prline">' + badge(e.niveau_preuve) + '</p><p class="small muted">' + esc(pr.txt) + '</p>' +
        (arr(e.sert_a).length ? '<p class="small"><b>Sert à :</b> ' + esc(arr(e.sert_a).map(butNom).join(', ')) + '</p>' : '') +
        T.voice.button(speech(e), 'Écouter la fiche') + '</div>';
      if (str(e.danger).trim()) h += '<div class="en-danger" role="note"><div class="en-danger-h">' + warnIcon() + '<b>Attention</b></div><p>' + esc(e.danger) + '</p></div>';
      var c = arr(e.comment);
      if (c.length) {
        h += '<div class="card"><h3>Comment faire</h3>';
        if (arr(e.materiel).length) h += '<p class="small"><b>Il vous faut :</b> ' + esc(arr(e.materiel).join(', ')) + '</p>';
        if (str(e.duree).trim()) h += '<p class="small"><b>Durée :</b> ' + esc(e.duree) + '</p>';
        h += '<ol class="en-steps">' + listItems(c) + '</ol></div>';
      }
      if (str(e.dose).trim()) h += '<div class="card"><h3>Quelle quantité ?</h3><p>' + esc(e.dose) + '</p></div>';
      if (str(e.quand).trim()) h += '<div class="card"><h3>Quand ?</h3><p>' + esc(e.quand) + '</p></div>';
      var ev = arr(e.eviter_si);
      if (ev.length) h += '<div class="card"><h3>À éviter si</h3><ul class="en-list">' + listItems(ev) + '</ul></div>';
      var det = arr(e.en_detail);
      if (det.length) h += '<details class="card en-more"><summary>En savoir plus</summary><ul class="en-list">' + listItems(det) + '</ul></details>';
      var src = arr(e.sources).map(function (s) { return s && typeof s === 'object' ? { t: str(s.titre) || 'Source', u: safeUrl(s.url) } : null; }).filter(function (s) { return s && s.u; });
      h += '<div class="card"><h3>Sources</h3>';
      if (src.length) {
        h += '<ul class="en-src">' + src.map(function (s) { return '<li><a class="en-link" href="' + esc(s.u) + '" target="_blank" rel="noopener noreferrer">' + esc(s.t) + '</a></li>'; }).join('') + '</ul>';
        if (typeof navigator !== 'undefined' && navigator.onLine === false) h += '<div class="notice warn" role="status">Vous n\'êtes pas connecté. Les liens s\'ouvriront quand le réseau reviendra. Le reste de la fiche fonctionne sans connexion.</div>';
        else h += '<p class="small muted">Les liens s\'ouvrent dans une autre fenêtre et demandent une connexion.</p>';
      } else h += '<p class="small muted">Pas de lien pour cette fiche.</p>';
      h += '<p class="small muted">' + (e.verifie ? 'Contenu vérifié avec les sources ci-dessus.' : 'Contenu pas encore vérifié à 100 % : restez prudent.') + '</p></div>';
      h += back;
      feuilleSay('Voici la fiche « ' + e.nom + ' ».', 'doux');
      return { title: e.nom, html: h };
    } catch (err) { return { title: 'Engrais et astuces', html: back + '<div class="notice">Cette fiche n\'a pas pu s\'afficher.</div>' }; }
  });

  /* ---------- Carte sur la fiche plante ---------- */
  T.fichePlus = T.fichePlus || [];
  T.fichePlus.push(function (p) {
    try {
      if (!p || !p.id || !LIST().length) return '';
      var r = EN.pourPlante(p.id), bien = r.bien.slice(0, 3), ev = r.eviter.filter(function (x) { return x.precis; }).slice(0, 2);
      if (!bien.length && !ev.length) return '';
      var h = '<div class="card en-card"><h3>Engrais et astuces pour cette plante</h3>';
      if (bien.length) h += '<p class="small muted">Ce qui lui convient :</p>' + bien.map(function (x) { return '<a class="en-chip" href="#/engrais/' + esc(x.id) + '">' + esc(x.nom) + '</a>'; }).join('');
      if (ev.length) h += '<p class="small muted">À éviter pour elle :</p>' + ev.map(function (x) { return '<a class="en-chip en-chip-bad" href="#/engrais/' + esc(x.id) + '">' + esc(x.nom) + '</a>'; }).join('');
      return h + '<a class="btn block" href="#/engrais-plante/' + esc(p.id) + '">Tout voir</a></div>';
    } catch (e) { return ''; }
  });
})();
