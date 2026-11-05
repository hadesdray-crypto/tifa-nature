/* Tifa Nature - « Mon jardin » (le dossier) : une entrée unique pour mes plantes, mes endroits, mon carnet et mes soins.
   Données : T.store.s.pots (les plantes de la personne) avec des champs facultatifs ajoutés sans rien casser :
   surnom, endroit, dateAchat, notes, photo, nourri, soins [ { t, k, x } ]. Le carnet (T.store.s.journal) et le planning (T.store.s.tasks) sont réutilisés.
   Tout reste sur le téléphone. API : T.dossier = { migrate, plants, build, exportText, importData, arroser, nourrir, summary }. */
(function () {
  'use strict';
  var T = window.T, D = T.dossier = {}, P = T.pots;
  var MAX_POTS = 200, MAX_SOINS = 40, MAX_PHOTO_CHARS = 90000, MAX_PLANT_PHOTOS = 60, MAX_JOURNAL_PHOTOS = 60, KINDS = { eau: 1, engrais: 1, note: 1, photo: 1, autre: 1 };
  var draft = null;

  function esc(s) { return T.esc(s); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')); }
  function dateFr(s) {
    if (!validDate(s)) return '';
    var p = s.split('-'), m = parseInt(p[1], 10);
    return parseInt(p[2], 10) + (p[2] === '01' ? 'er' : '') + ' ' + (T.MOIS[m - 1] || '').toLowerCase() + ' ' + p[0];
  }
  function tsFr(t) { var d = new Date(t); return isNaN(d.getTime()) ? '' : dateFr(d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())); }
  function ago(t) {
    if (!t) return '';
    var n = Math.max(0, Math.floor((Date.now() - t) / 86400000));
    if (n === 0) return 'aujourd\'hui'; if (n === 1) return 'hier'; if (n < 45) return 'il y a ' + n + ' jours';
    return 'il y a ' + Math.round(n / 30) + ' mois';
  }
  function str(v, n) { return typeof v === 'string' ? v.replace(/\s+$/, '').slice(0, n) : ''; }
  function num(v) { return (typeof v === 'number' && isFinite(v) && v > 0) ? v : null; }
  function img(v) { return (typeof v === 'string' && /^data:image\//.test(v) && v.length <= 400000) ? v : ''; }
  function say(txt, mood) { try { if (T.feuille && T.feuille.say) T.feuille.say(txt, mood || 'joie'); } catch (e) {} }
  var LEAF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/></svg>';

  /* ---------- Données : lecture défensive et migration douce ---------- */
  function normPot(x) {
    var c = false;
    function def(k, v) { if (x[k] === undefined || x[k] === null && (k !== 'nourri' && k !== 'arrose')) { x[k] = v; c = true; } }
    if (typeof x.id !== 'string' || !x.id) { x.id = T.uid(); c = true; }
    def('surnom', ''); def('endroit', ''); def('dateAchat', ''); def('notes', ''); def('photo', '');
    if (x.nourri === undefined) { x.nourri = null; c = true; }
    if (!Array.isArray(x.soins)) { x.soins = []; c = true; }
    if (typeof x.nom !== 'string') { x.nom = ''; c = true; }
    if (typeof x.plantId !== 'string') { x.plantId = ''; c = true; }
    if (typeof x.zone !== 'string') { x.zone = ''; c = true; }
    return c;
  }
  D.migrate = function () {
    var s = T.store.s, c = false;
    if (!Array.isArray(s.pots)) { s.pots = []; c = true; }
    if (!Array.isArray(s.journal)) { s.journal = []; c = true; }
    s.pots = s.pots.filter(function (x) { return x && typeof x === 'object'; });
    s.pots.forEach(function (x) { if (normPot(x)) c = true; });
    if (c) T.store.save();
    return c;
  };
  D.plants = function () { D.migrate(); return T.store.s.pots; };
  function find(id) { var a = D.plants(); for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  function plantOf(pot) { try { return pot.plantId ? T.plante(pot.plantId) : null; } catch (e) { return null; } }
  function nameOf(pot) { return pot.surnom || pot.nom || 'Plante sans nom'; }
  function zoneName(pot) { try { return pot.zone ? P.zone(pot.zone).nom : ''; } catch (e) { return ''; } }
  function log(pot, kind, text) {
    if (!Array.isArray(pot.soins)) pot.soins = [];
    pot.soins.push({ t: Date.now(), k: KINDS[kind] ? kind : 'autre', x: str(text, 200) });
    if (pot.soins.length > MAX_SOINS) pot.soins = pot.soins.slice(-MAX_SOINS);
  }
  /* Enregistre ; si le téléphone est plein, on annule proprement. */
  function commit(undo) {
    T.storageError = false; T.store.save();
    if (T.storageError) { try { undo(); } catch (e) {} T.storageError = false; try { T.store.save(); } catch (e2) {} T.toast('La mémoire du téléphone est pleine : rien n\'a été changé. Libérez de la place, puis réessayez.', 5000); return false; }
    return true;
  }
  function waterLine(pot) {
    var w = null; try { w = P.waterInfo(pot); } catch (e) { w = null; }
    if (w) return { text: w.text, due: w.due };
    return { text: pot.arrose ? 'Arrosé ' + ago(pot.arrose) + '.' : 'Pas encore d\'arrosage noté.', due: false };
  }
  function foodLine(pot) { return pot.nourri ? 'Nourri ' + ago(pot.nourri) + '.' : 'Pas encore de soin noté.'; }

  /* ---------- Actions de soin ---------- */
  D.arroser = function (pot) {
    var old = pot.arrose, n = pot.soins.length;
    pot.arrose = Date.now(); log(pot, 'eau', 'Arrosage');
    if (!commit(function () { pot.arrose = old; pot.soins.length = n; })) return false;
    T.toast('Arrosage noté.'); say('Bien arrosé. Merci pour ' + nameOf(pot) + '.', 'joie'); return true;
  };
  D.nourrir = function (pot) {
    var old = pot.nourri, n = pot.soins.length, jn = T.store.s.journal.length;
    pot.nourri = Date.now(); log(pot, 'engrais', 'Engrais ou soin donné');
    T.store.s.journal.push({ id: T.uid(), date: today(), plantId: pot.plantId || '', texte: 'Soin donné (engrais) : ' + nameOf(pot) + '.', photo: '', created: Date.now() });
    if (!commit(function () { pot.nourri = old; pot.soins.length = n; T.store.s.journal.length = jn; })) return false;
    T.toast('Soin noté dans le dossier et dans le carnet.', 3200); return true;
  };
  T.act.dsarroser = function (el) { var p = find(el.getAttribute('data-id')); if (p && D.arroser(p)) T.render(true); };
  T.act.dsnourrir = function (el) {
    var p = find(el.getAttribute('data-id')); if (!p || !D.nourrir(p)) return;
    T.render(true);
    var PL = T.planning;
    function rappel(days) {
      return function () {
        if (!PL || !PL.add) { T.toast('Le planning n\'est pas disponible.'); return; }
        var err = PL.add({ titre: 'Nourrir : ' + nameOf(p), date: PL.addDays(PL.today(), days), rep: 'none', plantId: p.plantId });
        T.toast(err || 'Rappel ajouté au planning.', 3000);
      };
    }
    T.modal({ title: 'Un rappel pour la prochaine fois ?', html: '<p>Le soin est noté. Voulez-vous un rappel dans le planning ? Suivez toujours l\'étiquette du produit pour la quantité et le rythme.</p>',
      buttons: [{ label: 'Pas de rappel' }, { label: 'Dans 2 semaines', onClick: rappel(14) }, { label: 'Dans 1 mois', primary: true, onClick: rappel(30) }] });
  };
  /* L'arrosage fait depuis « Mes pots » est aussi gardé dans l'historique du dossier. */
  (function () {
    var orig = T.act.water; if (!orig || orig.__ds) return;
    T.act.water = function (el, e) {
      var p = find(el.getAttribute('data-id')), before = p ? p.arrose : null;
      orig(el, e);
      try { if (p && p.arrose && p.arrose !== before) { log(p, 'eau', 'Arrosage'); T.store.save(); } } catch (err) {}
    };
    T.act.water.__ds = true;
  })();

  /* ---------- Photos ---------- */
  function compact(url) {
    return T.shrink(url, 600).then(function (r) {
      if (r.dataUrl.length <= MAX_PHOTO_CHARS) return r.dataUrl;
      return T.shrink(r.dataUrl, 460).then(function (r2) {
        if (r2.dataUrl.length <= MAX_PHOTO_CHARS) return r2.dataUrl;
        return T.shrink(r2.dataUrl, 340).then(function (r3) { return r3.dataUrl; });
      });
    });
  }
  function photoBlock() {
    if (!draft) return '';
    var h = '';
    if (draft.photo) h += '<img class="photo" alt="Photo choisie" src="' + esc(draft.photo) + '">';
    h += '<div class="row"><button class="btn grow" data-act="dsphoto" data-src="camera">Prendre une photo</button><button class="btn grow" data-act="dsphoto" data-src="gallery">Choisir dans la galerie</button></div>';
    if (draft.photo) h += '<button class="btn danger block" style="margin-top:.5rem" data-act="dsphotodel">Retirer la photo</button>';
    return h;
  }
  T.act.dsphoto = function (el) {
    if (!draft) return; var d = draft;
    T.native.photo(el.getAttribute('data-src')).then(compact).then(function (url) {
      if (draft !== d) return;
      d.photo = url; var b = document.getElementById('ds-photo'); if (b) b.innerHTML = photoBlock();
    }).catch(function (e) {
      if (e && e.message === 'annule') return;
      T.toast('La photo n\'a pas pu être prise. Réessayez, ou choisissez une photo dans la galerie.', 3800);
    });
  };
  T.act.dsphotodel = function () { if (!draft) return; draft.photo = ''; var b = document.getElementById('ds-photo'); if (b) b.innerHTML = photoBlock(); };

  /* ---------- Ajouter / modifier une plante ---------- */
  function zoneOptions(cur) {
    var z = []; try { z = P.zones(); } catch (e) { z = []; }
    return '<option value="">Je ne sais pas encore</option>' + z.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === cur ? ' selected' : '') + '>' + esc(x.nom) + '</option>'; }).join('');
  }
  function formHtml(pot) {
    var p = pot ? plantOf(pot) : (draft.plantId ? T.plante(draft.plantId) : null), h = '';
    if (!pot) {
      h += '<label class="lbl" for="ds-q" style="margin-top:0">Quelle plante ?</label><input id="ds-q" class="field" type="search" autocomplete="off" maxlength="60" placeholder="Chercher dans la liste" data-input="dssearch"><div id="ds-res"></div>' +
        '<div id="ds-sel" class="notice" ' + (p ? '' : 'hidden') + '>' + (p ? 'Choisie : <b>' + esc(p.nom) + '</b>' : '') + '</div>' +
        '<label class="lbl" for="ds-free">Ou écrivez un nom libre</label><input id="ds-free" class="field" maxlength="60" placeholder="Si la plante n\'est pas dans la liste">';
    } else if (!pot.plantId) h += '<label class="lbl" for="ds-free" style="margin-top:0">Nom de la plante</label><input id="ds-free" class="field" maxlength="60" value="' + esc(pot.nom) + '">';
    h += '<label class="lbl" for="ds-alias">Surnom (facultatif)</label><input id="ds-alias" class="field" maxlength="40" placeholder="Par exemple : la grande du salon" value="' + esc(pot ? pot.surnom : '') + '">' +
      '<label class="lbl" for="ds-zone">Où se trouve-t-elle dans la cour ?</label><select id="ds-zone" class="field">' + zoneOptions(pot ? pot.zone : draft.zone) + '</select>' +
      '<label class="lbl" for="ds-endroit">Endroit précis (facultatif)</label><input id="ds-endroit" class="field" maxlength="60" placeholder="Par exemple : près de la fenêtre" value="' + esc(pot ? pot.endroit : '') + '">' +
      '<label class="lbl" for="ds-date">Date d\'achat ou de plantation (facultatif)</label><input id="ds-date" class="field" type="date" value="' + esc(pot ? pot.dateAchat : '') + '">' +
      '<label class="lbl" for="ds-notes">Notes (facultatif)</label><textarea id="ds-notes" class="field" rows="4" maxlength="1000" placeholder="Ce que vous voulez retenir sur cette plante">' + esc(pot ? pot.notes : '') + '</textarea>' +
      '<label class="lbl">Photo (facultatif)</label><div id="ds-photo">' + photoBlock() + '</div>';
    return h;
  }
  function val(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }
  function openForm(pot, preset) {
    draft = { id: pot ? pot.id : '', plantId: '', zone: pot ? pot.zone : (preset && preset.zone) || '', photo: pot ? pot.photo : '' };
    var btns = [{ label: 'Annuler' }, { label: pot ? 'Enregistrer' : 'Ajouter à mon jardin', primary: true, onClick: function () { return saveForm(); } }];
    T.modal({ title: pot ? 'Modifier la fiche' : 'Ajouter une plante', html: formHtml(pot), focus: !pot, buttons: btns, onClose: function () { draft = null; } });
  }
  T.act.dsadd = function (el) { openForm(null, { zone: el && el.getAttribute ? el.getAttribute('data-zone') || '' : '' }); };
  T.act.dsedit = function (el) { var p = find(el.getAttribute('data-id')); if (p) openForm(p); };
  T.input.dssearch = function (el) {
    var r = document.getElementById('ds-res'); if (!r) return;
    var q = el.value.trim(); if (!q) { r.innerHTML = ''; return; }
    var res = []; try { res = T.search.plants(q, {}).slice(0, 5); } catch (e) { res = []; }
    r.innerHTML = res.length ? res.map(function (x) { return '<button class="item" data-act="dspick" data-id="' + esc(x.p.id) + '"><b>' + esc(x.p.nom) + '</b><i>' + esc(x.p.latin) + '</i></button>'; }).join('') : '<p class="muted small">Aucune plante trouvée. Vous pouvez écrire un nom libre plus bas.</p>';
  };
  T.act.dspick = function (el) {
    var p = T.plante(el.getAttribute('data-id')); if (!p || !draft) return;
    draft.plantId = p.id; try { draft.zone = P.zoneFor(p).id; } catch (e) {}
    var z = document.getElementById('ds-zone'); if (z && draft.zone) z.value = draft.zone;
    var b = document.getElementById('ds-sel'); if (b) { b.hidden = false; b.innerHTML = 'Choisie : <b>' + esc(p.nom) + '</b>'; }
    var r = document.getElementById('ds-res'); if (r) r.innerHTML = '';
    var f = document.getElementById('ds-free'); if (f) f.value = '';
  };
  function saveForm() {
    if (!draft) return true;
    var zone = val('ds-zone'), date = val('ds-date'), pot = draft.id ? find(draft.id) : null, p = pot ? plantOf(pot) : (draft.plantId ? T.plante(draft.plantId) : null), free = val('ds-free');
    if (date && !validDate(date)) { T.toast('Choisissez une date valide.'); return false; }
    if (!p && !free) { T.toast('Choisissez une plante dans la liste ou écrivez un nom.'); return false; }
    var fields = { surnom: val('ds-alias').slice(0, 40), zone: zone, endroit: val('ds-endroit').slice(0, 60), dateAchat: date, notes: val('ds-notes').slice(0, 1000), photo: draft.photo || '' };
    if (fields.photo && D.plants().filter(function (x) { return x.photo && x !== pot; }).length >= MAX_PLANT_PHOTOS) { fields.photo = ''; T.toast('Limite de ' + MAX_PLANT_PHOTOS + ' photos de plantes atteinte : fiche gardée sans photo.', 4200); }
    if (pot) {
      var old = JSON.parse(JSON.stringify(pot));
      Object.keys(fields).forEach(function (k) { pot[k] = fields[k]; }); if (!pot.plantId && free) pot.nom = free.slice(0, 60);
      if (!commit(function () { Object.keys(old).forEach(function (k) { pot[k] = old[k]; }); })) return false;
      T.toast('Fiche enregistrée.'); T.render(true); return true;
    }
    if (D.plants().length >= MAX_POTS) { T.toast('Vous avez atteint ' + MAX_POTS + ' plantes. Retirez-en une avant d\'en ajouter.'); return false; }
    var np = { id: T.uid(), plantId: p ? p.id : '', nom: p ? p.nom : free.slice(0, 60), added: Date.now(), arrose: null, nourri: null, soins: [] };
    Object.keys(fields).forEach(function (k) { np[k] = fields[k]; });
    var list = T.store.s.pots; list.push(np);
    if (!commit(function () { T.store.s.pots = list.filter(function (x) { return x !== np; }); })) return false;
    var fit = null; try { fit = p && zone ? P.fit(p, zone) : null; } catch (e) {}
    T.toast(fit && fit.level !== 'bien' ? 'Plante ajoutée. Attention : ' + fit.msg : 'Plante ajoutée à votre jardin.', 3800);
    say('Une nouvelle plante dans votre jardin. Bienvenue à ' + nameOf(np) + '.', 'joie');
    location.hash = '#/dossier/plante/' + encodeURIComponent(np.id);
    return true;
  }
  T.act.dsdel = function (el) {
    var x = find(el.getAttribute('data-id')); if (!x) return;
    T.confirm('Retirer cette plante ?', '« ' + nameOf(x) + ' » sera retirée de votre jardin. Les notes du carnet restent.', 'Retirer', function () {
      var all = T.store.s.pots, keep = all.filter(function (y) { return y.id !== x.id; }); T.store.s.pots = keep;
      if (!commit(function () { T.store.s.pots = all; })) return;
      T.toast('Plante retirée.'); location.hash = '#/dossier/plantes';
    }, true);
  };

  /* ---------- Note ou photo (reliées au carnet) ---------- */
  T.act.dsnote = function (el) {
    var pot = find(el.getAttribute('data-id')); if (!pot) return;
    draft = { id: pot.id, photo: '', plantId: pot.plantId };
    var html = '<p class="muted" style="margin-top:0">Pour : <b>' + esc(nameOf(pot)) + '</b>. La note est aussi gardée dans votre carnet.</p>' +
      '<label class="lbl" for="ds-text">Votre note</label><textarea id="ds-text" class="field" rows="5" maxlength="2000" placeholder="Par exemple : première fleur, feuille jaune, rempotage..."></textarea>' +
      '<label class="lbl">Photo (facultatif)</label><div id="ds-photo">' + photoBlock() + '</div>' +
      '<label class="row" style="margin-top:.7rem;min-height:2.75rem"><input type="checkbox" id="ds-asmain"> <span>Utiliser cette photo comme photo de la plante</span></label>';
    T.modal({ title: 'Ajouter une note ou une photo', html: html, focus: true, onClose: function () { draft = null; }, buttons: [{ label: 'Annuler' }, { label: 'Enregistrer', primary: true, onClick: function () { return saveNote(pot); } }] });
  };
  function saveNote(pot) {
    if (!draft) return true;
    var t = val('ds-text').slice(0, 2000), photo = draft.photo || '', as = !!(document.getElementById('ds-asmain') || {}).checked;
    if (!t && !photo) { T.toast('Écrivez une note ou ajoutez une photo.'); return false; }
    var j = T.store.s.journal, withPhoto = j.filter(function (n) { return n.photo; }).length;
    var lim = false; if (photo && withPhoto >= MAX_JOURNAL_PHOTOS) { photo = ''; lim = true; }
    if (!t && !photo) { T.toast('Limite de ' + MAX_JOURNAL_PHOTOS + ' photos atteinte dans le carnet. Retirez-en une avant d\'en ajouter.', 4200); return false; }
    var note = { id: T.uid(), date: today(), plantId: pot.plantId || '', texte: (pot.plantId ? '' : nameOf(pot) + ' : ') + t, photo: photo, created: Date.now() };
    var oldMain = pot.photo, n = pot.soins.length;
    j.push(note); log(pot, photo ? 'photo' : 'note', t || 'Photo ajoutée'); if (as && photo) pot.photo = photo;
    if (!commit(function () { T.store.s.journal = j.filter(function (x) { return x !== note; }); pot.soins.length = n; pot.photo = oldMain; })) return false;
    T.toast(lim ? 'Note gardée sans photo (limite du carnet atteinte).' : 'Note enregistrée dans le dossier et dans le carnet.', 3600);
    T.render(true); return true;
  }

  /* ---------- Résumé « À faire aujourd'hui » ---------- */
  D.summary = function () {
    var out = [];
    try {
      var PL = T.planning, t0 = PL.today();
      PL.top(30).forEach(function (x) { if (out.length < 3 && (x.today || x.late)) out.push(x); });
    } catch (e) { out = []; }
    return out;
  };
  function todayCard() {
    var s = D.summary(), h = '<div class="card ds-today"><h3>À faire aujourd\'hui</h3>';
    if (!s.length) h += '<p style="margin:0">Rien d\'urgent. Profitez de votre jardin.</p>';
    else s.forEach(function (x) { h += '<a class="ds-line' + (x.late ? ' late' : '') + '" href="#/planning"><b>' + esc(x.titre) + '</b> <span class="muted small">' + (x.late ? 'en retard' : 'aujourd\'hui') + '</span></a>'; });
    return h + '<a class="btn block" style="margin-top:.5rem" href="#/planning">Voir tout le planning</a></div>';
  }

  /* ---------- Page d'entrée ---------- */
  function lastSoin() {
    var best = null; D.plants().forEach(function (p) { (p.soins || []).forEach(function (s) { if (s && s.t && (!best || s.t > best.t)) best = { t: s.t, k: s.k, pot: p }; }); });
    return best;
  }
  function saveBox() {
    var f = T.store.s.flags || {}, n = D.plants().length + T.store.s.journal.length, last = f.dossierSave;
    var h = '<div class="card"><h3>Mon dossier est sur ce téléphone</h3><p class="small muted">Rien ne part sur internet. Pour le garder en sécurité ou le changer de téléphone, enregistrez-le dans un fichier.</p>';
    if (n && !last) h += '<div class="notice small">Vous n\'avez pas encore enregistré votre dossier dans un fichier.</div>';
    else if (last) h += '<p class="small">Dernier fichier enregistré : ' + esc(tsFr(last)) + '.</p>';
    return h + '<div class="row"><button class="btn primary grow" data-act="dsexport">Enregistrer mon dossier</button><button class="btn grow" data-act="dsimport">Retrouver mon dossier</button></div></div>';
  }
  T.route(/^\/dossier$/, 'pots', function () {
    var pots = D.plants(), n = pots.length, due = 0;
    pots.forEach(function (p) { if (waterLine(p).due) due++; });
    var h = '<div class="hero"><h2>Mon jardin</h2><p>Toutes mes plantes, mes pots, mes notes et mes soins, au même endroit.</p></div>';
    if (!n && !T.store.s.journal.length) {
      h += '<div class="card ds-empty">' + LEAF + '<h3>Votre jardin vous attend</h3><p>Ajoutez votre première plante : cherchez son nom, et l\'application vous dit où la placer et quand l\'arroser.</p><button class="btn primary block" data-act="dsadd">Ajouter ma première plante</button></div>';
    } else h += todayCard();
    var last = lastSoin(), usedZones = {}; pots.forEach(function (p) { if (p.zone) usedZones[p.zone] = 1; });
    var nz = Object.keys(usedZones).length, nj = T.store.s.journal.length;
    h += '<div class="ds-cards">' +
      '<a class="ds-card" href="#/dossier/plantes"><h3>Mes plantes</h3><p>' + (n ? n + ' plante' + (n > 1 ? 's' : '') + (due ? ' dont ' + due + ' à vérifier pour l\'arrosage' : '') + '.' : 'Aucune plante pour l\'instant.') + '</p><span class="ds-go">Ouvrir mes plantes</span></a>' +
      '<a class="ds-card" href="#/dossier/endroits"><h3>Mes pots et endroits</h3><p>' + (nz ? nz + ' endroit' + (nz > 1 ? 's' : '') + ' utilisé' + (nz > 1 ? 's' : '') + ' dans la cour.' : 'Soleil, mi-ombre, ombre : où placer chaque pot.') + '</p><span class="ds-go">Ouvrir mes endroits</span></a>' +
      '<a class="ds-card" href="#/carnet"><h3>Mon carnet</h3><p>' + (nj ? nj + ' note' + (nj > 1 ? 's' : '') + ' et photos.' : 'Notes et photos de votre jardin.') + '</p><span class="ds-go">Ouvrir mon carnet</span></a>' +
      '<a class="ds-card" href="#/dossier/soins"><h3>Mes soins</h3><p>' + (last ? 'Dernier soin : ' + esc(nameOf(last.pot)) + ', ' + esc(ago(last.t)) + '.' : 'Arrosages, engrais et tâches à venir.') + '</p><span class="ds-go">Ouvrir mes soins</span></a>' +
      '</div>';
    if (n) h += '<button class="btn primary block" data-act="dsadd" style="margin-bottom:.8rem">Ajouter une plante</button>';
    h += saveBox();
    return { title: 'Mon jardin', html: h };
  });

  /* ---------- Liste des plantes ---------- */
  var zoneFilter = '';
  function plantRow(p) {
    var pl = plantOf(p), w = waterLine(p), sub = [];
    if (p.surnom && p.nom) sub.push(p.nom); if (zoneName(p)) sub.push(zoneName(p)); if (p.endroit) sub.push(p.endroit);
    return '<div class="card ds-plist"><a class="ds-head" href="#/dossier/plante/' + esc(encodeURIComponent(p.id)) + '" style="text-decoration:none;color:inherit">' +
      (p.photo ? '<img class="ds-thumb" alt="" src="' + esc(p.photo) + '">' : '<span class="ds-thumb">' + LEAF + '</span>') +
      '<div><h3>' + esc(nameOf(p)) + '</h3>' + (sub.length ? '<p class="small muted">' + esc(sub.join(' - ')) + '</p>' : '') + '<p class="small' + (w.due ? '' : ' muted') + '">' + esc(w.text) + '</p></div></a>' +
      '<div class="row"><a class="btn primary grow" href="#/dossier/plante/' + esc(encodeURIComponent(p.id)) + '">Ouvrir la fiche</a><button class="btn grow" data-act="dsarroser" data-id="' + esc(p.id) + '">J\'ai arrosé</button></div></div>';
  }
  T.route(/^\/dossier\/plantes$/, 'pots', function () {
    var pots = D.plants(), h = '<div class="hero"><h2>Mes plantes</h2><p>Touchez une plante pour voir sa fiche, ses soins et ses notes.</p></div>';
    if (!pots.length) return { title: 'Mes plantes', html: h + '<div class="card ds-empty">' + LEAF + '<h3>Aucune plante pour l\'instant</h3><p>Ajoutez une plante de votre maison ou de votre cour. Vous pourrez noter ses soins, ses photos et ses notes.</p><button class="btn primary block" data-act="dsadd">Ajouter ma première plante</button></div><a class="btn block" href="#/dossier">Retour à Mon jardin</a>' };
    var used = {}; pots.forEach(function (p) { if (p.zone) used[p.zone] = 1; });
    if (zoneFilter && !used[zoneFilter]) zoneFilter = '';
    h += '<button class="btn primary block" data-act="dsadd" style="margin-bottom:.8rem">Ajouter une plante</button>';
    if (Object.keys(used).length > 1) {
      h += '<div class="card"><label class="lbl" for="ds-zf" style="margin-top:0">Voir les plantes d\'un endroit</label><select id="ds-zf" class="field" data-ds="zone"><option value="">Tous les endroits</option>' +
        Object.keys(used).map(function (z) { return '<option value="' + esc(z) + '"' + (z === zoneFilter ? ' selected' : '') + '>' + esc(P.zone(z).nom) + '</option>'; }).join('') + '</select></div>';
    }
    var list = pots.filter(function (p) { return !zoneFilter || p.zone === zoneFilter; }).sort(function (a, b) { return nameOf(a).localeCompare(nameOf(b), 'fr'); });
    h += list.map(plantRow).join('') + '<a class="btn block" href="#/dossier">Retour à Mon jardin</a>';
    return { title: 'Mes plantes', html: h };
  });
  document.addEventListener('change', function (e) {
    var el = e.target; if (el && el.getAttribute && el.getAttribute('data-ds') === 'zone') { zoneFilter = el.value; T.render(true); }
  });

  /* ---------- Fiche d'une plante ---------- */
  function monthsRow(label, arr) { return arr && arr.length ? '<li><b>' + esc(label) + '</b>' + esc(T.monthsText(arr)) + '</li>' : ''; }
  function glance(p) {
    if (!p) return '';
    var h = '<ul class="ds-facts">';
    try {
      h += '<li><b>Lumière</b>' + esc((T.SOLEIL[p.soleilIdeal] || '') + (p.heuresSoleil ? ' : ' + p.heuresSoleil : '')) + '</li>';
      if (p.arrosage) h += '<li><b>Arrosage</b>' + esc((T.ARROS[p.arrosage.frequence] || '') + (p.arrosage.conseil ? ' : ' + p.arrosage.conseil : '')) + '</li>';
      if (p.pot && p.pot.possible && p.pot.volumeLitres) h += '<li><b>Pot</b>Au moins ' + esc(p.pot.volumeLitres) + ' litres. ' + esc(p.pot.conseil || '') + '</li>';
      if (p.toxique && p.toxique.chatChien) h += '<li><b>Attention</b>Peut être toxique pour les chats et les chiens. ' + esc(p.toxique.note || '') + '</li>';
    } catch (e) {}
    return h + '</ul>';
  }
  function more(p) {
    if (!p) return '';
    var h = '<details class="ds-more"><summary>En savoir plus sur cette plante</summary><div>';
    try {
      h += '<ul class="ds-facts">' + (p.sol ? '<li><b>Terre</b>' + esc(p.sol) + '</li>' : '') + (p.rusticite ? '<li><b>Froid</b>' + esc(p.rusticite) + '</li>' : '') + (p.hivernage ? '<li><b>Hiver</b>' + esc(p.hivernage) + '</li>' : '') +
        monthsRow('Semis', p.semis) + monthsRow('Plantation', p.plantation) + monthsRow('Floraison', p.floraison) + monthsRow('Récolte', p.recolte) + monthsRow('Taille', p.taille) + '</ul>';
      if (p.conseils && p.conseils.length) h += '<h4>Conseils</h4><ul>' + T.list(p.conseils) + '</ul>';
      if (p.amies && p.amies.length) h += '<p class="small"><b>Bonnes voisines :</b> ' + esc(p.amies.join(', ')) + '.</p>';
      if (p.ennemies && p.ennemies.length) h += '<p class="small"><b>À éloigner :</b> ' + esc(p.ennemies.join(', ')) + '.</p>';
      (T.fichePlus || []).forEach(function (f) { try { var x = f(p); if (x) h += x; } catch (e) {} });
    } catch (e) {}
    return h + '</div></details>';
  }
  function hasRoute(path) { return T.routes.some(function (r) { return r.re.test(path); }); }
  var KIND_TXT = { eau: 'Arrosage', engrais: 'Engrais ou soin', note: 'Note', photo: 'Photo', autre: 'Soin' };
  function histHtml(pot, max) {
    var a = (pot.soins || []).filter(function (s) { return s && s.t; }).slice().sort(function (x, y) { return y.t - x.t; }).slice(0, max || 12);
    if (!a.length) return '<p class="muted small" style="margin:0">Aucun soin noté pour l\'instant. Touchez « J\'ai arrosé » ou « J\'ai nourri » quand vous prenez soin de cette plante.</p>';
    return '<ul class="ds-hist">' + a.map(function (s) { return '<li><b>' + esc(KIND_TXT[s.k] || 'Soin') + '</b>' + (s.x && s.k !== 'eau' ? ' : ' + esc(s.x) : '') + '<small>' + esc(tsFr(s.t)) + ', ' + esc(ago(s.t)) + '</small></li>'; }).join('') + '</ul>';
  }
  T.route(/^\/dossier\/plante\/([^\/?]+)$/, 'pots', function (m) {
    var id = ''; try { id = decodeURIComponent(m[1]); } catch (e) { id = m[1]; }
    var pot = find(id);
    if (!pot) return { title: 'Plante introuvable', html: '<div class="card"><h3>Cette plante n\'est plus dans votre jardin</h3><p>Elle a peut-être été retirée.</p><a class="btn primary block" href="#/dossier/plantes">Voir mes plantes</a></div>' };
    var p = plantOf(pot), w = waterLine(pot), fit = null; try { fit = p && pot.zone ? P.fit(p, pot.zone) : null; } catch (e) {}
    var h = '';
    if (pot.photo) h += '<img class="ds-photo" alt="Photo de ' + esc(nameOf(pot)) + '" src="' + esc(pot.photo) + '">';
    h += '<div class="card"><div class="ds-head"><span class="ds-thumb" style="display:' + (pot.photo ? 'none' : 'flex') + '">' + LEAF + '</span><div><h2 style="margin:0;overflow-wrap:anywhere">' + esc(nameOf(pot)) + '</h2>' +
      ((pot.surnom && pot.nom) ? '<p class="muted small">' + esc(pot.nom) + (p ? ' - ' + esc(p.latin) : '') + '</p>' : (p ? '<p class="muted small">' + esc(p.latin) + '</p>' : '')) + '</div></div>';
    var tags = []; if (zoneName(pot)) tags.push('<span class="tag">' + esc(zoneName(pot)) + '</span>');
    if (fit) tags.push('<span class="tag ' + (fit.level === 'bien' ? 'ok' : (fit.level === 'moyen' ? 'warn' : 'bad')) + '">' + (fit.level === 'bien' ? 'Bien placée' : (fit.level === 'moyen' ? 'À surveiller' : 'À déplacer')) + '</span>');
    if (tags.length) h += '<div class="tags">' + tags.join('') + '</div>';
    if (fit && fit.level !== 'bien') h += '<p class="small">' + esc(fit.msg) + '</p>';
    h += '<ul class="ds-facts">' + (pot.endroit ? '<li><b>Endroit précis</b>' + esc(pot.endroit) + '</li>' : '') + (pot.dateAchat ? '<li><b>Achat ou plantation</b>' + esc(dateFr(pot.dateAchat)) + '</li>' : '') +
      '<li><b>Arrosage</b><span' + (w.due ? ' style="font-weight:700"' : '') + '>' + esc(w.text) + '</span></li><li><b>Dernier soin ou engrais</b>' + esc(foodLine(pot)) + '</li></ul></div>';
    h += '<div class="ds-actions"><button class="btn primary" data-act="dsarroser" data-id="' + esc(pot.id) + '">J\'ai arrosé</button><button class="btn" data-act="dsnourrir" data-id="' + esc(pot.id) + '">J\'ai nourri</button><button class="btn" data-act="dsnote" data-id="' + esc(pot.id) + '">Ajouter une note ou une photo</button></div>';
    if (p) h += '<div class="card"><h3>En un coup d\'oeil</h3>' + glance(p) + '</div>' + more(p);
    if (pot.notes) h += '<div class="card"><h3>Mes notes</h3><p class="ds-note" style="margin:0">' + esc(pot.notes) + '</p></div>';
    h += '<div class="card"><h3>Historique des soins</h3>' + histHtml(pot, 12) + '</div>';
    /* liens utiles */
    var links = '';
    if (p) links += '<a class="btn block" href="#/plante/' + esc(p.id) + '">Voir la fiche complète</a>';
    links += (p && hasRoute('/engrais-plante/x')) ? '<a class="btn block" href="#/engrais-plante/' + esc(encodeURIComponent(p.id)) + '">Engrais pour cette plante</a>' : hasRoute('/engrais') ? '<a class="btn block" href="#/engrais?plante=' + esc(encodeURIComponent(p ? p.id : pot.id)) + '">Engrais pour cette plante</a>' : '<a class="btn block" href="#/calculs">Calculer l\'engrais</a>';
    if (pot.plantId && T.store.s.journal.some(function (n) { return n.plantId === pot.plantId; })) links += '<a class="btn block" href="#/carnet/saisons/' + esc(pot.plantId) + '">Voir les notes du carnet</a>';
    h += '<div class="ds-links">' + links + '</div>';
    var ins = []; try { ins = p && T.insectes && T.insectes.pourPlante ? T.insectes.pourPlante(p.id) : []; } catch (e) { ins = []; }
    if (ins.length) h += '<div class="card"><h3>Insectes concernés</h3>' + ins.slice(0, 8).map(function (x) { return '<a class="item" href="#/insecte/' + esc(x.id) + '"><b>' + esc(x.nom) + '</b><i>' + (x.camp === 'ami' ? 'Ami du jardin' : 'Indésirable') + '</i></a>'; }).join('') + '</div>';
    h += '<div class="row" style="margin-bottom:.8rem"><button class="btn grow" data-act="dsedit" data-id="' + esc(pot.id) + '">Modifier la fiche</button><button class="btn danger grow" data-act="dsdel" data-id="' + esc(pot.id) + '">Retirer cette plante</button></div><a class="btn block" href="#/dossier/plantes">Retour à Mes plantes</a>';
    return { title: nameOf(pot), html: h };
  });

  /* ---------- Mes pots et endroits ---------- */
  T.route(/^\/dossier\/endroits$/, 'pots', function () {
    var pots = D.plants(), zones = []; try { zones = P.zones(); } catch (e) { zones = []; }
    var h = '<div class="hero"><h2>Mes pots et endroits</h2><p>Où se trouve chaque plante dans votre cour ou votre maison.</p></div>';
    h += '<div class="ds-links"><a class="btn primary block" href="#/jardin">Le plan de ma cour</a><a class="btn block" href="#/pots">Où placer mes pots</a></div>';
    var known = {};
    zones.forEach(function (z) {
      known[z.id] = 1;
      var here = pots.filter(function (p) { return p.zone === z.id; });
      h += '<div class="card"><div class="zone-head"><h3>' + esc(z.nom) + '</h3><span class="tag">' + here.length + ' plante' + (here.length > 1 ? 's' : '') + '</span></div><p class="small muted">' + esc(z.comment_le_reconnaitre || '') + '</p>' +
        (here.length ? here.map(function (p) { return '<a class="item" href="#/dossier/plante/' + esc(encodeURIComponent(p.id)) + '"><b>' + esc(nameOf(p)) + '</b>' + (p.endroit ? '<i>' + esc(p.endroit) + '</i>' : '') + '</a>'; }).join('') : '<p class="small">Aucune plante ici pour l\'instant.</p>') +
        '<button class="btn block" data-act="dsadd" data-zone="' + esc(z.id) + '">Ajouter une plante ici</button></div>';
    });
    var other = pots.filter(function (p) { return !known[p.zone]; });
    if (other.length) h += '<div class="card"><h3>Endroit pas encore choisi</h3><p class="small muted">Touchez une plante, puis « Modifier la fiche », pour choisir son endroit.</p>' + other.map(function (p) { return '<a class="item" href="#/dossier/plante/' + esc(encodeURIComponent(p.id)) + '"><b>' + esc(nameOf(p)) + '</b></a>'; }).join('') + '</div>';
    return { title: 'Mes pots et endroits', html: h + '<a class="btn block" href="#/dossier">Retour à Mon jardin</a>' };
  });

  /* ---------- Mes soins ---------- */
  T.route(/^\/dossier\/soins$/, 'pots', function () {
    var pots = D.plants(), h = '<div class="hero"><h2>Mes soins</h2><p>Ce qu\'il y a à faire, et ce que vous avez déjà fait.</p></div>';
    var todo = []; try { var g = T.planning.groups(); todo = g.late.concat(g.today, g.week).slice(0, 6); } catch (e) { todo = []; }
    h += '<div class="card"><h3>À faire bientôt</h3>' + (todo.length ? todo.map(function (x) { return '<a class="item" href="#/planning"><b>' + esc(x.titre) + '</b><i>' + esc(x.date < T.planning.today() ? 'En retard' : T.planning.label(x.date)) + '</i></a>'; }).join('') : '<p class="small" style="margin:0 0 .5rem">Rien de prévu pour le moment.</p>') +
      '<div class="row"><button class="btn primary grow" data-act="ptadd">Ajouter une tâche</button><a class="btn grow" href="#/planning">Voir le planning</a></div></div>';
    var all = []; pots.forEach(function (p) { (p.soins || []).forEach(function (s) { if (s && s.t) all.push({ s: s, p: p }); }); });
    all.sort(function (a, b) { return b.s.t - a.s.t; });
    h += '<div class="card"><h3>Derniers soins</h3>' + (all.length ? '<ul class="ds-hist">' + all.slice(0, 20).map(function (x) {
      return '<li><a href="#/dossier/plante/' + esc(encodeURIComponent(x.p.id)) + '"><b>' + esc(nameOf(x.p)) + '</b></a> : ' + esc(KIND_TXT[x.s.k] || 'Soin') + '<small>' + esc(tsFr(x.s.t)) + ', ' + esc(ago(x.s.t)) + '</small></li>';
    }).join('') + '</ul>' : '<p class="small" style="margin:0">Aucun soin noté. Ouvrez une plante et touchez « J\'ai arrosé » ou « J\'ai nourri ».</p>') + '</div>';
    if (!pots.length) h += '<button class="btn primary block" data-act="dsadd" style="margin-bottom:.8rem">Ajouter ma première plante</button>';
    return { title: 'Mes soins', html: h + '<a class="btn block" href="#/dossier">Retour à Mon jardin</a>' };
  });

  /* ---------- Enregistrer / retrouver le dossier (fichier JSON, tout reste local) ---------- */
  D.build = function () {
    var s = T.store.s, tasks = (s.tasks || []).filter(function (t) { return t && t.id && t.titre; });
    return { app: 'tifa-nature-dossier', version: 1, saved: new Date().toISOString(), pots: JSON.parse(JSON.stringify(D.plants())), journal: JSON.parse(JSON.stringify(s.journal || [])), tasks: JSON.parse(JSON.stringify(tasks)), garden: s.garden ? JSON.parse(JSON.stringify(s.garden)) : null };
  };
  D.exportText = function () { return JSON.stringify(D.build()); };
  function fileName() { return 'mon-jardin-' + today() + '.json'; }
  function markSaved() { try { T.store.s.flags.dossierSave = Date.now(); T.store.save(); } catch (e) {} }
  function textModal(json) {
    T.modal({ title: 'Copier mon dossier', html: '<p>Le fichier n\'a pas pu être créé. Copiez ce texte et gardez-le dans une note : vous pourrez le recoller avec « Retrouver mon dossier ».</p><textarea id="ds-json" class="field" rows="8" readonly></textarea>',
      buttons: [{ label: 'Fermer' }, { label: 'Copier le texte', primary: true, onClick: function () {
        var ta = document.getElementById('ds-json'); if (!ta) return false;
        function sel() { ta.focus(); ta.select(); try { if (document.execCommand('copy')) { T.toast('Texte copié.'); markSaved(); return; } } catch (e) {} T.toast('Texte sélectionné : copiez-le avec le menu de votre téléphone.', 4200); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(json).then(function () { T.toast('Texte copié.'); markSaved(); }, sel); else sel();
        return false;
      } }] });
    var ta = document.getElementById('ds-json'); if (ta) ta.value = json;
  }
  T.act.dsexport = function () {
    var json = D.exportText(), name = fileName(), N = T.native || {}, P2 = N.P || {};
    function viaNative() {
      if (!P2.FS || !P2.FS.writeFile) return Promise.reject(new Error('non'));
      var dir = (P2.Dir && (P2.Dir.Documents || 'DOCUMENTS')) || 'DOCUMENTS';
      return P2.FS.writeFile({ path: name, data: json, directory: dir, encoding: 'utf8', recursive: true }).then(function () { return 'Dossier enregistré dans le dossier Documents du téléphone : ' + name; });
    }
    function viaShare() {
      if (!(navigator.share && window.File && navigator.canShare)) return Promise.reject(new Error('non'));
      var f = new File([json], name, { type: 'application/json' });
      if (!navigator.canShare({ files: [f] })) return Promise.reject(new Error('non'));
      return navigator.share({ files: [f], title: 'Mon jardin' }).then(function () { return 'Dossier prêt : choisissez où le garder.'; });
    }
    function viaDownload() {
      return new Promise(function (resolve, reject) {
        try {
          var url = URL.createObjectURL(new Blob([json], { type: 'application/json' })), a = document.createElement('a');
          a.href = url; a.download = name; a.style.display = 'none'; document.body.appendChild(a); a.click();
          setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {} }, 4000);
          resolve('Fichier créé : ' + name + '. Cherchez-le dans les téléchargements.');
        } catch (e) { reject(e); }
      });
    }
    var order = N.isNative ? [viaNative, viaShare, viaDownload] : [viaDownload, viaShare, viaNative];
    var chain = Promise.reject(new Error('start'));
    order.forEach(function (fn) { chain = chain.catch(function (e) { if (e && e.name === 'AbortError') throw e; return fn(); }); });
    chain.then(function (msg) { markSaved(); T.toast(msg, 4800); if (/^#\/dossier$/.test(location.hash)) T.render(true); }, function (e) {
      if (e && e.name === 'AbortError') return;
      textModal(json);
    });
  };

  /* Nettoyage d'un dossier lu : on ne garde que des valeurs de bon type et de taille raisonnable. */
  function cleanPot(x) {
    if (!x || typeof x !== 'object') return null;
    var pl = typeof x.plantId === 'string' && T.plante(x.plantId) ? x.plantId : '', nom = str(x.nom, 60) || (pl ? T.plante(pl).nom : '');
    if (!nom) return null;
    var o = { id: str(x.id, 64) || T.uid(), plantId: pl, nom: nom, surnom: str(x.surnom, 40), zone: str(x.zone, 40), endroit: str(x.endroit, 60), dateAchat: validDate(x.dateAchat) ? x.dateAchat : '', notes: str(x.notes, 1000), photo: img(x.photo), added: num(x.added) || Date.now(), arrose: num(x.arrose), nourri: num(x.nourri), soins: [] };
    if (Array.isArray(x.soins)) x.soins.slice(-MAX_SOINS).forEach(function (s) { if (s && num(s.t)) o.soins.push({ t: s.t, k: KINDS[s.k] ? s.k : 'autre', x: str(s.x, 200) }); });
    return o;
  }
  function cleanNote(x) {
    if (!x || typeof x !== 'object' || !validDate(x.date)) return null;
    var t = str(x.texte, 2000), ph = img(x.photo); if (!t && !ph) return null;
    return { id: str(x.id, 64) || T.uid(), date: x.date, plantId: str(x.plantId, 64), texte: t, photo: ph, created: num(x.created) || Date.now() };
  }
  function cleanTask(x) {
    if (!x || typeof x !== 'object' || !validDate(x.date) || !str(x.titre, 80)) return null;
    return { id: str(x.id, 64) || T.uid(), titre: str(x.titre, 80), date: x.date, rep: (x.rep === 'week' || x.rep === 'month') ? x.rep : 'none', plantId: str(x.plantId, 64), done: !!x.done, doneAt: validDate(x.doneAt) ? x.doneAt : '' };
  }
  /* Ajoute le contenu du fichier au dossier : rien de ce qui existe n'est effacé. */
  D.importData = function (data) {
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { return { ok: false, msg: 'Ce fichier n\'est pas un dossier Tifa Nature (texte illisible).' }; } }
    if (!data || typeof data !== 'object' || data.app !== 'tifa-nature-dossier' || !Array.isArray(data.pots)) return { ok: false, msg: 'Ce fichier n\'est pas un dossier Tifa Nature.' };
    D.migrate();
    var s = T.store.s, snap = JSON.stringify({ pots: s.pots, journal: s.journal, tasks: s.tasks, garden: s.garden }), c = { pots: 0, notes: 0, tasks: 0 };
    try {
      data.pots.slice(0, MAX_POTS).forEach(function (raw) {
        var n = cleanPot(raw); if (!n) return;
        var ex = find(n.id);
        if (ex) {
          ['plantId', 'nom', 'surnom', 'zone', 'endroit', 'dateAchat', 'notes', 'photo'].forEach(function (k) { if (!ex[k] && n[k]) ex[k] = n[k]; });
          ex.arrose = Math.max(ex.arrose || 0, n.arrose || 0) || null; ex.nourri = Math.max(ex.nourri || 0, n.nourri || 0) || null;
          var seen = {}; ex.soins.forEach(function (q) { seen[q.t + q.k] = 1; });
          n.soins.forEach(function (q) { if (!seen[q.t + q.k]) ex.soins.push(q); });
          ex.soins.sort(function (a, b) { return a.t - b.t; }); ex.soins = ex.soins.slice(-MAX_SOINS);
        } else if (s.pots.length < MAX_POTS) { s.pots.push(n); c.pots++; }
      });
      var ids = {}; s.journal.forEach(function (q) { ids[q.id] = 1; });
      (Array.isArray(data.journal) ? data.journal.slice(0, 1500) : []).forEach(function (raw) { var n = cleanNote(raw); if (n && !ids[n.id]) { ids[n.id] = 1; s.journal.push(n); c.notes++; } });
      if (!Array.isArray(s.tasks)) s.tasks = [];
      var tids = {}; s.tasks.forEach(function (q) { if (q) tids[q.id] = 1; });
      (Array.isArray(data.tasks) ? data.tasks.slice(0, 300) : []).forEach(function (raw) { var n = cleanTask(raw); if (n && !tids[n.id] && s.tasks.length < 300) { tids[n.id] = 1; s.tasks.push(n); c.tasks++; } });
      if (!s.garden && data.garden && typeof data.garden === 'object' && Array.isArray(data.garden.items)) s.garden = data.garden;
    } catch (e) { var o = JSON.parse(snap); s.pots = o.pots; s.journal = o.journal; s.tasks = o.tasks; s.garden = o.garden; return { ok: false, msg: 'Le dossier n\'a pas pu être lu. Rien n\'a été changé.' }; }
    var back = JSON.parse(snap);
    if (!commit(function () { s.pots = back.pots; s.journal = back.journal; s.tasks = back.tasks; s.garden = back.garden; })) return { ok: false, msg: 'Mémoire pleine : rien n\'a été changé.' };
    return { ok: true, counts: c, msg: c.pots + ' plante' + (c.pots > 1 ? 's' : '') + ', ' + c.notes + ' note' + (c.notes > 1 ? 's' : '') + ' et ' + c.tasks + ' tâche' + (c.tasks > 1 ? 's' : '') + ' ajoutée' + ((c.pots + c.notes + c.tasks) > 1 ? 's' : '') + '.' };
  };
  function finishImport(res) { T.toast(res.msg, 5000); if (res.ok) { T.closeModal(); T.render(); } }
  T.act.dsimport = function () {
    T.modal({ title: 'Retrouver mon dossier', html: '<p>Choisissez le fichier que vous avez enregistré. Rien n\'est effacé : son contenu est ajouté à votre jardin.</p><div id="ds-imp"></div>',
      buttons: [{ label: 'Annuler' }, { label: 'Coller le texte', onClick: function (m) {
        m.setBody('<p>Collez ici le texte de votre dossier.</p><textarea id="ds-paste" class="field" rows="8" placeholder="Collez le texte ici"></textarea>');
        m.setButtons([{ label: 'Annuler' }, { label: 'Retrouver', primary: true, onClick: function () { var r = D.importData(val('ds-paste')); finishImport(r); return !r.ok ? false : true; } }]); return false;
      } }, { label: 'Choisir le fichier', primary: true, onClick: function () {
        try {
          var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json,text/plain'; inp.style.display = 'none'; document.body.appendChild(inp);
          inp.onchange = function () {
            var f = inp.files && inp.files[0]; try { document.body.removeChild(inp); } catch (e) {}
            if (!f) return; if (f.size > 25 * 1024 * 1024) { T.toast('Ce fichier est trop gros pour être un dossier.'); return; }
            var r = new FileReader(); r.onload = function () { finishImport(D.importData(String(r.result || ''))); }; r.onerror = function () { T.toast('Le fichier n\'a pas pu être lu.'); }; r.readAsText(f);
          };
          inp.click();
        } catch (e) { T.toast('Impossible d\'ouvrir les fichiers ici : utilisez « Coller le texte ».', 4200); return false; }
        return false;
      } }] });
  };

  try { D.migrate(); } catch (e) {}
})();
