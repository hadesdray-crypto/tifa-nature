/* Tifa Nature - « Carnet de culture » : notes datées, photo facultative, filtre par plante, comparaison des saisons.
   Données : T.store.s.journal = [ { id, date 'AAAA-MM-JJ', plantId, texte, photo (image JPEG en texte) , created } ] */
(function () {
  'use strict';
  var T = window.T, C = T.carnet = {}, MAX_PHOTOS = 60, MAX_TEXT = 2000, filter = '', draft = null;

  function esc(s) { return T.esc(s); }
  C.all = function () {
    var s = T.store.s;
    if (!Array.isArray(s.journal)) s.journal = [];
    return s.journal;
  };
  C.count = function () { return C.all().length; };
  function find(id) { var a = C.all(); for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')); }
  function dateFr(s) {
    if (!validDate(s)) return 'Date inconnue';
    var p = s.split('-'), m = parseInt(p[1], 10);
    return parseInt(p[2], 10) + (p[2] === '01' ? 'er' : '') + ' ' + (T.MOIS[m - 1] || '').toLowerCase() + ' ' + p[0];
  }
  function season(s) {
    if (!validDate(s)) return 'Date inconnue';
    var p = s.split('-'), y = parseInt(p[0], 10), m = parseInt(p[1], 10);
    if (m >= 3 && m <= 5) return 'Printemps ' + y;
    if (m >= 6 && m <= 8) return 'Été ' + y;
    if (m >= 9 && m <= 11) return 'Automne ' + y;
    var y0 = m === 12 ? y : y - 1;
    return 'Hiver ' + y0 + '-' + (y0 + 1);
  }
  function plantName(id) { var p = id ? T.plante(id) : null; return p ? p.nom : ''; }
  function photoCount(exceptId) { return C.all().filter(function (n) { return n.photo && n.id !== exceptId; }).length; }
  function byDate(dir) {
    return function (a, b) { var c = String(a.date).localeCompare(String(b.date)); if (!c) c = (a.created || 0) - (b.created || 0); return dir * c; };
  }
  function speakText(n) {
    var p = plantName(n.plantId);
    return dateFr(n.date) + '. ' + (p ? p + '. ' : '') + (n.texte || 'Note sans texte.');
  }

  function noteCard(n) {
    var p = plantName(n.plantId), h = '<div class="card cn-note" data-nid="' + esc(n.id) + '"><div class="zone-head"><h3>' + esc(dateFr(n.date)) + '</h3>' + (p ? '<span class="tag">' + esc(p) + '</span>' : '') + '</div>';
    if (n.texte) h += '<p class="cn-text">' + esc(n.texte) + '</p>';
    if (n.photo) h += '<img class="photo cn-photo" alt="Photo de la note du ' + esc(dateFr(n.date)) + '" src="' + esc(n.photo) + '">';
    h += '<div class="row">' + T.voice.button(speakText(n), 'Écouter') + '<button class="btn" data-act="cnedit" data-id="' + esc(n.id) + '">Modifier</button></div></div>';
    return h;
  }
  function plantsWithNotes() {
    var seen = {}, out = [];
    C.all().forEach(function (n) { if (n.plantId && !seen[n.plantId] && T.plante(n.plantId)) { seen[n.plantId] = 1; out.push(n.plantId); } });
    out.sort(function (a, b) { return plantName(a).localeCompare(plantName(b), 'fr'); });
    return out;
  }
  function plantSelect(cur, kind, firstLabel) {
    return '<select class="field" data-cn="' + kind + '" aria-label="Choisir une plante">' + (firstLabel ? '<option value="">' + esc(firstLabel) + '</option>' : '') +
      plantsWithNotes().map(function (id) { return '<option value="' + esc(id) + '"' + (id === cur ? ' selected' : '') + '>' + esc(plantName(id)) + '</option>'; }).join('') + '</select>';
  }

  /* ---------- Liste ---------- */
  T.route(/^\/carnet$/, 'pots', function () {
    var all = C.all(), pl = plantsWithNotes();
    if (filter && pl.indexOf(filter) < 0) filter = '';
    var list = all.filter(function (n) { return !filter || n.plantId === filter; }).sort(byDate(-1));
    var h = '<div class="hero"><h2>Carnet de culture</h2><p>Notez ce que vous faites et ce que vous voyez, avec une photo si vous voulez. Tout reste sur votre téléphone.</p></div>';
    h += '<button class="btn primary block" data-act="cnadd">Ajouter une note</button>';
    if (pl.length) {
      h += '<div class="card" style="margin-top:.8rem"><label class="lbl" style="margin-top:0">Voir les notes d\'une plante</label>' + plantSelect(filter, 'filter', 'Toutes les plantes');
      if (filter) h += '<a class="btn block" style="margin-top:.6rem" href="#/carnet/saisons/' + esc(filter) + '">Comparer les saisons : ' + esc(plantName(filter)) + '</a>';
      h += '</div>';
    }
    h += '<h2>' + list.length + ' note' + (list.length > 1 ? 's' : '') + (filter ? ' pour ' + esc(plantName(filter)) : '') + '</h2>';
    if (!list.length) h += '<div class="notice">' + (all.length ? 'Aucune note pour cette plante.' : 'Le carnet est vide. Touchez « Ajouter une note » pour écrire la première.') + '</div>';
    h += list.map(noteCard).join('');
    h += '<a class="btn block" href="#/pots" style="margin-top:.6rem">Retour à Mes pots</a>';
    return { title: 'Carnet de culture', html: h };
  });

  /* ---------- Comparer les saisons ---------- */
  T.route(/^\/carnet\/saisons(?:\/([^\/?]+))?$/, 'pots', function (m) {
    var id = m && m[1] ? decodeURIComponent(m[1]) : '', pl = plantsWithNotes();
    if (id && pl.indexOf(id) < 0) id = '';
    var h = '<div class="hero"><h2>Comparer les saisons</h2><p>Les notes d\'une même plante, de la plus ancienne à la plus récente, pour voir ce qui change d\'une saison à l\'autre.</p></div>';
    if (!pl.length) return { title: 'Comparer les saisons', html: h + '<div class="notice">Pas encore de note liée à une plante. Ajoutez une note en choisissant une plante.</div><a class="btn block" href="#/carnet">Retour au carnet</a>' };
    h += '<div class="card"><label class="lbl" style="margin-top:0">Plante</label>' + plantSelect(id, 'saison', id ? '' : 'Choisir une plante') + '</div>';
    if (id) {
      var list = C.all().filter(function (n) { return n.plantId === id; }).sort(byDate(1)), last = '';
      h += '<h2>' + esc(plantName(id)) + ' : ' + list.length + ' note' + (list.length > 1 ? 's' : '') + '</h2>';
      list.forEach(function (n) {
        var s = season(n.date);
        if (s !== last) { h += '<h3 class="cn-season">' + esc(s) + '</h3>'; last = s; }
        h += noteCard(n);
      });
    } else h += '<div class="notice">Choisissez une plante pour voir ses notes.</div>';
    h += '<a class="btn block" href="#/carnet">Retour au carnet</a>';
    return { title: 'Comparer les saisons', html: h };
  });

  document.addEventListener('change', function (e) {
    var el = e.target; if (!el || !el.getAttribute) return;
    var k = el.getAttribute('data-cn');
    if (k === 'filter') { filter = el.value; T.render(); }
    else if (k === 'saison') { location.hash = '#/carnet/saisons/' + encodeURIComponent(el.value); }
  });

  /* ---------- Ajout et modification ---------- */
  function photoBlock() {
    if (!draft) return '';
    var h = '';
    if (draft.photo) h += '<img class="photo" alt="Photo de la note" src="' + esc(draft.photo) + '">';
    h += '<div class="row"><button class="btn grow" data-act="cnphoto" data-src="camera">Prendre une photo</button><button class="btn grow" data-act="cnphoto" data-src="gallery">Choisir dans la galerie</button></div>';
    if (draft.photo) h += '<button class="btn danger block" style="margin-top:.5rem" data-act="cnphotodel">Retirer la photo</button>';
    return h;
  }
  function plantBlock() {
    var p = plantName(draft.plantId);
    return p ? '<div class="notice">Plante : <b>' + esc(p) + '</b> <button class="btn" data-act="cnplantdel" style="margin-left:.4rem">Aucune plante</button></div>' : '<p class="small muted">Aucune plante choisie (facultatif).</p>';
  }
  function openEditor(n) {
    draft = { id: n ? n.id : '', plantId: n ? n.plantId : '', photo: n ? n.photo : '' };
    var html = '<label class="lbl" for="cn-date" style="margin-top:0">Date</label><input id="cn-date" class="field" type="date" value="' + esc(n ? n.date : today()) + '">' +
      '<label class="lbl" for="cn-pq">Plante (facultatif)</label><input id="cn-pq" class="field" type="search" autocomplete="off" maxlength="60" placeholder="Chercher une plante" data-input="cnsearch"><div id="cn-pres"></div><div id="cn-plant">' + plantBlock() + '</div>' +
      '<label class="lbl" for="cn-text">Votre note</label><textarea id="cn-text" class="field" rows="5" maxlength="' + MAX_TEXT + '" placeholder="Par exemple : première fleur, arrosage, traitement...">' + esc(n ? n.texte : '') + '</textarea>' +
      '<label class="lbl">Photo (facultatif)</label><div id="cn-photo">' + photoBlock() + '</div>';
    var btns = [{ label: 'Annuler' }];
    if (n) btns.push({ label: 'Supprimer', danger: true, onClick: function (m) {
      T.confirm('Supprimer cette note ?', 'La note du ' + dateFr(n.date) + ' sera effacée, avec sa photo.', 'Supprimer', function () {
        T.store.s.journal = C.all().filter(function (x) { return x.id !== n.id; }); T.store.save(); m.close(); T.toast('Note supprimée.'); T.render(true);
      }, true);
      return false;
    } });
    btns.push({ label: 'Enregistrer', primary: true, onClick: commit });
    T.modal({ title: n ? 'Modifier la note' : 'Nouvelle note', html: html, buttons: btns, onClose: function () { draft = null; } });
  }
  T.act.cnadd = function () { openEditor(null); };
  T.act.cnedit = function (el) { var n = find(el.getAttribute('data-id')); if (n) openEditor(n); };
  T.input.cnsearch = function (el) {
    var r = document.getElementById('cn-pres'); if (!r) return;
    var q = el.value.trim(); if (!q) { r.innerHTML = ''; return; }
    var res = T.search.plants(q, {}).slice(0, 5);
    r.innerHTML = res.length ? res.map(function (x) { return '<button class="item" data-act="cnpick" data-id="' + esc(x.p.id) + '"><b>' + esc(x.p.nom) + '</b><i>' + esc(x.p.latin) + '</i></button>'; }).join('') : '<p class="muted small">Aucune plante trouvée. Vous pouvez écrire la note sans plante.</p>';
  };
  T.act.cnpick = function (el) {
    if (!draft) return; draft.plantId = el.getAttribute('data-id');
    var b = document.getElementById('cn-plant'), r = document.getElementById('cn-pres'), q = document.getElementById('cn-pq');
    if (b) b.innerHTML = plantBlock(); if (r) r.innerHTML = ''; if (q) q.value = '';
  };
  T.act.cnplantdel = function () { if (!draft) return; draft.plantId = ''; var b = document.getElementById('cn-plant'); if (b) b.innerHTML = plantBlock(); };
  T.act.cnphotodel = function () { if (!draft) return; draft.photo = ''; var b = document.getElementById('cn-photo'); if (b) b.innerHTML = photoBlock(); };

  /* Réduit la photo jusqu'à une taille raisonnable pour le stockage du téléphone. */
  function compact(url) {
    return T.shrink(url, 900).then(function (r) {
      if (r.dataUrl.length <= 140000) return r.dataUrl;
      return T.shrink(r.dataUrl, 720).then(function (r2) {
        if (r2.dataUrl.length <= 140000) return r2.dataUrl;
        return T.shrink(r2.dataUrl, 560).then(function (r3) { return r3.dataUrl; });
      });
    });
  }
  T.act.cnphoto = function (el) {
    if (!draft) return;
    var d = draft;
    if (photoCount(d.id) >= MAX_PHOTOS) { T.toast('Vous avez déjà ' + MAX_PHOTOS + ' photos dans le carnet. Retirez-en une avant d\'en ajouter.', 4200); return; }
    T.native.photo(el.getAttribute('data-src')).then(compact).then(function (url) {
      if (draft !== d) return;
      d.photo = url; var b = document.getElementById('cn-photo'); if (b) b.innerHTML = photoBlock();
    }).catch(function (e) {
      if (e && e.message === 'annule') return;
      T.toast('La photo n\'a pas pu être prise. Réessayez, ou choisissez une photo dans la galerie.', 3600);
    });
  };

  function commit() {
    if (!draft) return true;
    var d = document.getElementById('cn-date').value, t = (document.getElementById('cn-text').value || '').trim().slice(0, MAX_TEXT);
    if (!validDate(d)) { T.toast('Choisissez une date.'); return false; }
    if (!t && !draft.photo) { T.toast('Écrivez une note ou ajoutez une photo.'); return false; }
    var list = C.all(), n = draft.id ? find(draft.id) : null, isNew = !n, old = n ? { date: n.date, plantId: n.plantId, texte: n.texte, photo: n.photo } : null;
    if (isNew) { n = { id: T.uid(), created: Date.now() }; list.push(n); }
    n.date = d; n.plantId = draft.plantId || ''; n.texte = t; n.photo = draft.photo || '';
    var limited = false;
    if (n.photo && photoCount(n.id) >= MAX_PHOTOS) { limited = true; n.photo = ''; T.toast('Limite de ' + MAX_PHOTOS + ' photos atteinte : note gardée sans photo.', 4200); }
    var lost = false;
    T.storageError = false;
    try { T.store.save(); } catch (e) { T.storageError = true; }
    if (T.storageError && n.photo) {   /* stockage plein : on garde la note, sans la photo */
      n.photo = ''; lost = true; T.storageError = false;
      try { T.store.save(); } catch (e2) { T.storageError = true; }
    }
    if (T.storageError) {   /* même sans photo, impossible d'écrire : on annule proprement */
      if (isNew) T.store.s.journal = list.filter(function (x) { return x !== n; }); else { n.date = old.date; n.plantId = old.plantId; n.texte = old.texte; n.photo = old.photo; }
      T.toast('La mémoire du téléphone est pleine : la note n\'a pas pu être enregistrée. Libérez de la place, puis réessayez.', 5000);
      return false;
    }
    if (lost) T.toast('Mémoire du téléphone pleine : la note est gardée, mais sans la photo.', 5000); else if (!limited) T.toast('Note enregistrée.');
    T.render(true);
    return true;
  }
})();
