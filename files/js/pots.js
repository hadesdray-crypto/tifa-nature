/* Tifa Nature - « Mes pots » : placer chaque pot au bon endroit de la cour selon la lumière dont la plante a besoin. */
(function () {
  'use strict';
  var T = window.T, P = T.pots = {};
  var LIGHT = { ombre: 0, mi_ombre: 1, soleil_matin: 2, plein_soleil: 3, abri_chaud_mur_sud: 4 };
  var PMIN = { ombre: 0, mi_ombre: 1, plein_soleil: 3 }, PMAX = { ombre: 1, mi_ombre: 2, plein_soleil: 4 };
  var EVERY = { faible: 10, moyen: 5, eleve: 2 };
  P.draft = { plantId: '', zone: '' };

  P.zones = function () { return T.D.pots; };
  P.zone = function (id) { return T.byId(T.D.pots, id) || { id: id, nom: id, description: '', comment_le_reconnaitre: '', conseils: [], plantes_noms: [], erreurs_a_eviter: [] }; };
  P.zoneFor = function (p) {
    var map = { plein_soleil: 'plein_soleil', mi_ombre: 'mi_ombre', ombre: 'ombre' };
    return P.zone(map[p.soleilIdeal] || 'mi_ombre');
  };
  P.fit = function (p, zoneId) {
    var s = (p && p.soleil && p.soleil.length) ? p.soleil : ['mi_ombre'], zl = LIGHT[zoneId], min = 9, max = -1;
    s.forEach(function (k) { if (PMIN[k] < min) min = PMIN[k]; if (PMAX[k] > max) max = PMAX[k]; });
    if (zl >= min && zl <= max) return { level: 'bien', msg: 'Bonne place pour cette plante.' };
    var dist = zl > max ? zl - max : min - zl;
    var msg = zl > max ? 'Trop de soleil ici : les feuilles peuvent brûler et la terre sèche vite.' : 'Pas assez de lumière ici : la plante pousse mal et fleurit peu.';
    return dist <= 1 ? { level: 'moyen', msg: msg + ' Possible, mais surveillez-la.' } : { level: 'non', msg: msg + ' Mieux vaut la déplacer.' };
  };
  P.orientation = function (p) {
    var s = p.soleilIdeal;
    if (s === 'plein_soleil') return 'Sud ou ouest (le plus de soleil)';
    if (s === 'ombre') return 'Nord (peu de soleil direct)';
    return 'Est (soleil doux du matin) ou ouest en été';
  };
  P.all = function () { return T.store.s.pots || []; };
  P.waterInfo = function (pot) {
    var p = pot.plantId ? T.plante(pot.plantId) : null; if (!p) return null;
    var every = EVERY[p.arrosage.frequence] || 5, days = pot.arrose ? Math.floor((Date.now() - pot.arrose) / 86400000) : null;
    var due = days === null ? false : days >= every;
    return { every: every, days: days, due: due, text: days === null ? 'Pas encore arrosé ici. En général : tous les ' + every + ' jours environ.' : (days === 0 ? 'Arrosé aujourd\'hui.' : 'Arrosé il y a ' + days + ' jour' + (days > 1 ? 's' : '') + '.') + (due ? ' Il est temps de vérifier la terre.' : ' Prochain contrôle dans ' + Math.max(1, every - days) + ' jour' + (every - days > 1 ? 's' : '') + ' environ.') };
  };
  P.dueCount = function () { return P.all().filter(function (x) { var w = P.waterInfo(x); return w && w.due; }).length; };

  function potCard(pot) {
    var p = pot.plantId ? T.plante(pot.plantId) : null, fit = p ? P.fit(p, pot.zone) : null, w = P.waterInfo(pot);
    var h = '<div class="card pot' + (fit && fit.level !== 'bien' ? ' bad' : '') + '"><h3>' + T.esc(pot.surnom || pot.nom) + '</h3>';
    if (pot.surnom && pot.nom) h += '<p class="muted small" style="margin:0 0 .3rem">' + T.esc(pot.nom) + '</p>';
    if (fit) {
      h += '<div class="tags"><span class="tag ' + (fit.level === 'bien' ? 'ok' : (fit.level === 'moyen' ? 'warn' : 'bad')) + '">' + (fit.level === 'bien' ? 'Bien placé' : (fit.level === 'moyen' ? 'À surveiller' : 'À déplacer')) + '</span></div><p class="small">' + T.esc(fit.msg) + '</p>';
      if (fit.level !== 'bien') h += '<p class="small"><b>Meilleure place :</b> ' + T.esc(P.zoneFor(p).nom) + '</p>';
    }
    if (w) h += '<p class="small' + (w.due ? '' : ' muted') + '">' + T.esc(w.text) + '</p>';
    h += '<div class="row">' + (w ? '<button class="btn primary" data-act="water" data-id="' + T.esc(pot.id) + '">J\'ai arrosé</button>' : '') +
      '<button class="btn" data-act="movepot" data-id="' + T.esc(pot.id) + '">Déplacer</button>' +
      (p ? '<a class="btn" href="#/plante/' + T.esc(p.id) + '">Fiche</a>' : '') +
      '<button class="btn danger" data-act="delpot" data-id="' + T.esc(pot.id) + '">Retirer</button></div></div>';
    return h;
  }

  T.route(/^\/pots$/, 'pots', function () {
    var pots = P.all(), h = '';
    h += '<div class="hero"><h2>Mes pots</h2><p>Placez chaque pot au bon endroit de votre cour : plein soleil, mi-ombre ou ombre.</p></div>';
    h += '<div class="row" style="margin-bottom:.8rem"><button class="btn primary grow" data-act="addpot">Ajouter un pot</button><a class="btn grow" href="#/guide/' + T.esc(guideId()) + '">Comprendre la lumière de ma cour</a></div>';
    var due = P.dueCount();
    if (due) h += '<div class="notice warn"><b>' + due + ' pot' + (due > 1 ? 's' : '') + ' à vérifier pour l\'arrosage.</b> Touchez la terre avant d\'arroser.</div>';
    if (!pots.length) h += '<div class="card"><h3>Aucun pot pour l\'instant</h3><p>Touchez « Ajouter un pot », choisissez une plante, et l\'application vous dit où la placer.</p></div>';
    P.zones().forEach(function (z) {
      var here = pots.filter(function (x) { return x.zone === z.id; });
      h += '<div class="card"><div class="zone-head"><h3>' + T.esc(z.nom) + '</h3><span class="tag">' + here.length + ' pot' + (here.length > 1 ? 's' : '') + '</span></div><p class="small muted">' + T.esc(z.comment_le_reconnaitre) + '</p></div>';
      h += here.map(potCard).join('');
    });
    h += '<div class="card"><h3>Où placer une plante ?</h3><p class="small muted">Tapez le nom d\'une plante pour savoir où la mettre.</p><input class="field" type="search" id="placer" autocomplete="off" maxlength="60" placeholder="Nom de la plante" data-input="placer"><div id="placer-res" style="margin-top:.6rem"></div></div>';
    h += '<h2>Choisir selon l\'orientation</h2>';
    ['sud', 'est', 'ouest', 'nord'].forEach(function (k) {
      var o = T.D.orientations[k]; if (!o) return;
      h += '<div class="card"><h3>Côté ' + k + '</h3><p>' + T.esc(o.lumiere) + '</p><p class="small"><b>Plantes adaptées :</b> ' + T.esc((o.plantes_noms || []).join(', ')) + '.</p><p class="small muted">' + T.esc(o.conseil) + '</p></div>';
    });
    return { title: 'Mes pots', html: h };
  }, true);

  function guideId() {
    var g = T.D.guides.filter(function (x) { return /exposition/i.test(x.titre); })[0];
    return g ? g.id : (T.D.guides[0] ? T.D.guides[0].id : '');
  }

  /* Où placer ? petit outil de recherche */
  T.input.placer = function (el) {
    var r = document.getElementById('placer-res'); if (!r) return;
    var q = el.value.trim(); if (!q) { r.innerHTML = ''; return; }
    var res = T.search.plants(q, {}).slice(0, 6);
    r.innerHTML = res.length ? res.map(function (x) { return '<button class="item" data-act="placerinfo" data-id="' + T.esc(x.p.id) + '"><b>' + T.esc(x.p.nom) + '</b><i>' + T.esc(x.p.latin) + '</i></button>'; }).join('') : '<p class="muted small">Aucune plante trouvée. Essayez un autre mot.</p>';
  };
  T.act.placerinfo = function (el) {
    var p = T.plante(el.getAttribute('data-id')); if (!p) return;
    var z = P.zoneFor(p);
    T.modal({
      title: p.nom, html: '<p><b>Meilleure place :</b> ' + T.esc(z.nom) + '</p><p>' + T.esc(z.description) + '</p><p><b>Lumière :</b> ' + T.esc(p.heuresSoleil) + '</p><p><b>Orientation conseillée :</b> ' + T.esc(P.orientation(p)) + '</p><p class="small muted">' + T.esc((z.erreurs_a_eviter || [])[0] || '') + '</p>',
      buttons: [{ label: 'Fermer' }, { label: 'Fiche', onClick: function () { location.hash = '#/plante/' + p.id; } }, { label: 'Ajouter à mes pots', primary: true, onClick: function () { setTimeout(function () { T.act.addpot({ getAttribute: function () { return p.id; } }); }, 0); } }]
    });
  };

  /* Ajouter un pot */
  T.act.addpot = function (el) {
    var pre = el && el.getAttribute ? el.getAttribute('data-id') : '';
    P.draft = { plantId: pre || '', zone: '' };
    var pp = pre ? T.plante(pre) : null; if (pp) P.draft.zone = P.zoneFor(pp).id;
    var html = '<label class="lbl" for="pot-q" style="margin-top:0">Quelle plante ?</label><input id="pot-q" class="field" type="search" autocomplete="off" maxlength="60" placeholder="Chercher dans la liste" data-input="potsearch">' +
      '<div id="pot-res"></div><div id="pot-sel" class="notice" ' + (pp ? '' : 'hidden') + '>' + (pp ? 'Choisie : <b>' + T.esc(pp.nom) + '</b>' : '') + '</div>' +
      '<label class="lbl" for="pot-free">Ou écrivez un nom libre</label><input id="pot-free" class="field" maxlength="40" placeholder="Si la plante n\'est pas dans la liste">' +
      '<label class="lbl" for="pot-alias">Nom du pot (facultatif)</label><input id="pot-alias" class="field" maxlength="40" placeholder="Par exemple : pot de la fenêtre">' +
      '<label class="lbl" for="pot-zone">Où est-il dans la cour ?</label><select id="pot-zone" class="field">' + P.zones().map(function (z) { return '<option value="' + T.esc(z.id) + '"' + (z.id === P.draft.zone ? ' selected' : '') + '>' + T.esc(z.nom) + '</option>'; }).join('') + '</select><p class="small muted" id="pot-hint"></p>';
    T.modal({ title: 'Ajouter un pot', html: html, focus: !pre, buttons: [{ label: 'Annuler' }, { label: 'Ajouter', primary: true, onClick: function () { return P.commitAdd(); } }] });
    updateHint();
  };
  function updateHint() {
    var sel = document.getElementById('pot-zone'), hint = document.getElementById('pot-hint'); if (!sel || !hint) return;
    var p = P.draft.plantId ? T.plante(P.draft.plantId) : null;
    if (!p) { hint.textContent = ''; return; }
    var f = P.fit(p, sel.value); hint.textContent = f.msg + (f.level !== 'bien' ? ' Conseillé : ' + P.zoneFor(p).nom + '.' : '');
  }
  T.input.potsearch = function (el) {
    var r = document.getElementById('pot-res'); if (!r) return;
    var q = el.value.trim(); if (!q) { r.innerHTML = ''; return; }
    var res = T.search.plants(q, {}).slice(0, 5);
    r.innerHTML = res.map(function (x) { return '<button class="item" data-act="potpick" data-id="' + T.esc(x.p.id) + '"><b>' + T.esc(x.p.nom) + '</b><i>' + T.esc(x.p.latin) + '</i></button>'; }).join('');
  };
  T.act.potpick = function (el) {
    var p = T.plante(el.getAttribute('data-id')); if (!p) return;
    P.draft.plantId = p.id; P.draft.zone = P.zoneFor(p).id;
    var sel = document.getElementById('pot-zone'); if (sel) sel.value = P.draft.zone;
    var b = document.getElementById('pot-sel'); if (b) { b.hidden = false; b.innerHTML = 'Choisie : <b>' + T.esc(p.nom) + '</b>'; }
    var r = document.getElementById('pot-res'); if (r) r.innerHTML = '';
    var free = document.getElementById('pot-free'); if (free) free.value = '';
    updateHint();
  };
  document.addEventListener('change', function (e) { if (e.target && e.target.id === 'pot-zone') updateHint(); });
  P.commitAdd = function () {
    var free = (document.getElementById('pot-free').value || '').trim(), alias = (document.getElementById('pot-alias').value || '').trim(), zone = document.getElementById('pot-zone').value;
    var p = P.draft.plantId ? T.plante(P.draft.plantId) : null;
    if (!p && !free) { T.toast('Choisissez une plante dans la liste ou écrivez un nom.'); return false; }
    if (P.all().length >= 200) { T.toast('Vous avez atteint 200 pots. Retirez-en un avant d\'en ajouter.'); return false; }
    var pot = { id: T.uid(), plantId: p ? p.id : '', nom: p ? p.nom : free, surnom: alias, zone: zone, added: Date.now(), arrose: null };
    T.store.s.pots.push(pot); T.store.save();
    var f = p ? P.fit(p, zone) : null;
    T.toast(f && f.level !== 'bien' ? 'Pot ajouté. Attention : ' + f.msg : 'Pot ajouté.', 3600);
    if (/^#\/pots$/.test(location.hash)) T.render(); else location.hash = '#/pots';
    return true;
  };
  function find(id) { var a = P.all(); for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  T.act.water = function (el) { var x = find(el.getAttribute('data-id')); if (x) { x.arrose = Date.now(); T.store.save(); T.toast('Arrosage noté.'); T.render(); } };
  T.act.delpot = function (el) {
    var x = find(el.getAttribute('data-id')); if (!x) return;
    T.confirm('Retirer ce pot ?', 'Le pot « ' + (x.surnom || x.nom) + ' » sera retiré de la liste.', 'Retirer', function () {
      T.store.s.pots = P.all().filter(function (y) { return y.id !== x.id; }); T.store.save(); T.toast('Pot retiré.'); T.render();
    }, true);
  };
  T.act.movepot = function (el) {
    var x = find(el.getAttribute('data-id')); if (!x) return;
    var p = x.plantId ? T.plante(x.plantId) : null;
    var html = '<p class="muted">Où voulez-vous mettre « ' + T.esc(x.surnom || x.nom) + ' » ?</p>' + P.zones().map(function (z) {
      var f = p ? P.fit(p, z.id) : null;
      return '<button class="item" data-act="doMove" data-id="' + T.esc(x.id) + '" data-zone="' + T.esc(z.id) + '"><b>' + T.esc(z.nom) + (z.id === x.zone ? ' (ici)' : '') + '</b>' + (f ? '<i>' + (f.level === 'bien' ? 'Bonne place' : (f.level === 'moyen' ? 'À surveiller' : 'Déconseillé')) + '</i>' : '') + '</button>';
    }).join('');
    T.modal({ title: 'Déplacer le pot', html: html, buttons: [{ label: 'Annuler' }] });
  };
  T.act.doMove = function (el) {
    var x = find(el.getAttribute('data-id')); if (!x) return;
    x.zone = el.getAttribute('data-zone'); T.store.save(); T.closeModal();
    var p = x.plantId ? T.plante(x.plantId) : null, f = p ? P.fit(p, x.zone) : null;
    T.toast(f && f.level !== 'bien' ? 'Déplacé. ' + f.msg : 'Pot déplacé.', 3600); T.render();
  };
})();
