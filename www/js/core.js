/* Tifa Nature - noyau : outils, stockage, fenêtres, messages. */
(function () {
  'use strict';
  var T = window.T = window.T || {};
  T.cfg = window.TIFA_CONFIG || {};
  T.D = window.TIFA_DATA || {};
  T.D.plantes = T.D.plantes || []; T.D.maladies = T.D.maladies || []; T.D.conseils = T.D.conseils || [];
  T.D.calendrier = T.D.calendrier || []; T.D.guides = T.D.guides || []; T.D.pots = T.D.pots || []; T.D.orientations = T.D.orientations || {};
  T.act = {};      /* actions déclenchées par data-act */
  T.input = {};    /* réactions à la saisie (data-input) */
  T.routes = [];   /* routes de l'appli */
  T.route = function (re, tab, fn, root) { T.routes.push({ re: re, tab: tab, fn: fn, root: !!root }); };

  /* ---------- Libellés ---------- */
  T.MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  T.MOIS_L = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  T.SOLEIL = { plein_soleil: 'Plein soleil', mi_ombre: 'Mi-ombre', ombre: 'Ombre' };
  T.ARROS = { faible: 'Arrosage faible', moyen: 'Arrosage moyen', eleve: 'Arrosage fréquent' };
  T.CAT = { legume: 'Légume', aromatique: 'Aromatique', fruitier: 'Fruitier', fleur: 'Fleur', arbuste: 'Arbuste', grimpante: 'Grimpante', interieur: 'Plante d\'intérieur', succulente: 'Succulente', ombre: 'Plante d\'ombre' };
  T.THEMES = { arrosage: 'Arrosage', sol_engrais: 'Sol et engrais', compost: 'Compost', semis_plantation: 'Semis et plantation', taille: 'Taille', pots_balcon_cour: 'Pots, balcon et cour', ombre_soleil: 'Ombre et soleil', saisons_hivernage: 'Saisons et hiver', nuisibles_naturels: 'Nuisibles : solutions naturelles', outils_materiel: 'Outils et matériel', economies_eau: 'Économiser l\'eau', biodiversite: 'Biodiversité', interieur: 'Plantes d\'intérieur' };
  T.MTYPE = { insecte: 'Insecte ou ravageur', champignon: 'Champignon', bacterie_virus: 'Bactérie ou virus', carence: 'Manque d\'éléments nutritifs', eau: 'Problème d\'eau', lumiere_temperature: 'Lumière ou température', sol: 'Problème de sol', culture: 'Problème de culture' };
  T.GRAV = { faible: 'Peu grave', moyenne: 'Gravité moyenne', forte: 'Grave' };
  T.URG = { a_traiter_vite: 'À traiter vite', a_surveiller: 'À surveiller', sans_danger: 'Sans danger' };

  /* ---------- Outils ---------- */
  T.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  T.norm = function (s) {
    return String(s == null ? '' : s).toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  };
  T.lev = function (a, b, max) {
    if (a === b) return 0; if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i]; var best = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1; prev = cur;
    }
    return prev[b.length];
  };
  T.byId = function (list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; };
  T.plante = function (id) { return T.byId(T.D.plantes, id); };
  T.maladie = function (id) { return T.byId(T.D.maladies, id); };
  T.monthNow = function () { return new Date().getMonth() + 1; };
  T.uid = function () {
    try { var a = new Uint32Array(3); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (n) { return n.toString(36); }).join(''); } catch (e) { return String(Date.now()) + Math.random().toString(36).slice(2); }
  };
  T.list = function (arr) { return (arr || []).map(function (x) { return '<li>' + T.esc(x) + '</li>'; }).join(''); };
  T.plain = function (arr) { return (arr || []).join('. '); };
  T.months12 = function (arr, cls) {
    var now = T.monthNow(), h = '<div class="months" aria-hidden="true">';
    for (var m = 1; m <= 12; m++) h += '<span class="' + ((arr || []).indexOf(m) >= 0 ? 'on' : '') + (m === now ? ' now' : '') + '">' + T.MOIS_L[m - 1] + '</span>';
    return h + '</div>';
  };
  T.monthsText = function (arr) {
    if (!arr || !arr.length) return 'Pas concerné';
    return arr.slice().sort(function (a, b) { return a - b; }).map(function (m) { return T.MOIS[m - 1].toLowerCase(); }).join(', ');
  };

  /* ---------- Stockage (localStorage + copie native de sécurité) ---------- */
  var KEY = 'tifa.v1';
  function defaults() {
    return { v: 1, installId: '', settings: { theme: 'zen', scale: 1, voiceOn: true, voiceId: '', rate: 0.95, region: null }, pots: [], garden: null, journal: [], flags: {}, licence: null, ota: {}, lastCheck: 0, diagHistory: [], meteo: null, tasks: [], planAuto: {}, ahist: [] };
  }
  T.store = {
    s: defaults(), timer: null,
    init: function () {
      var self = this;
      return new Promise(function (resolve) {
        var raw = null;
        try { raw = window.localStorage.getItem(KEY); } catch (e) { raw = null; }
        function apply(r) {
          if (!r) return;
          try {
            var o = JSON.parse(r), d = defaults();
            Object.keys(d).forEach(function (k) { if (o[k] !== undefined) d[k] = o[k]; });
            /* champs ajoutés par les modules (jardin, carnet, planning…) : on les garde tels quels */
            Object.keys(o).forEach(function (k) { if (d[k] === undefined) d[k] = o[k]; });
            d.settings = Object.assign(defaults().settings, (o.settings && typeof o.settings === 'object') ? o.settings : {});
            /* données au mauvais format : on remet les bonnes formes plutôt que de planter */
            if (!Array.isArray(d.pots)) d.pots = [];
            d.pots = d.pots.filter(function (x) { return x && typeof x === 'object'; });
            if (!Array.isArray(d.diagHistory)) d.diagHistory = [];
            ['flags', 'ota'].forEach(function (k) { if (!d[k] || typeof d[k] !== 'object' || Array.isArray(d[k])) d[k] = {}; });
            self.s = d;
          } catch (e) { /* données illisibles : on repart de zéro sans planter */ }
        }
        function done() { if (!self.s.installId) { self.s.installId = T.uid(); self.save(); } resolve(); }
        if (raw) { apply(raw); return done(); }
        var P = T.native && T.native.P && T.native.P.Prefs;
        if (P) {
          var to = setTimeout(done, 1500);
          P.get({ key: KEY }).then(function (r) { clearTimeout(to); apply(r && r.value); done(); }, function () { clearTimeout(to); done(); });
        } else done();
      });
    },
    save: function () {
      var self = this, json = JSON.stringify(self.s);
      try { window.localStorage.setItem(KEY, json); } catch (e) { /* stockage plein ou bloqué */ T.storageError = true; }
      clearTimeout(self.timer);
      self.timer = setTimeout(function () {
        var P = T.native && T.native.P && T.native.P.Prefs;
        if (P) { try { P.set({ key: KEY, value: json }).catch(function () {}); } catch (e) {} }
      }, 400);
    },
    reset: function () {
      var keep = this.s.installId; this.s = defaults(); this.s.installId = keep; this.save();
    }
  };
  T.set = function () { return T.store.s.settings; };

  /* ---------- Messages ---------- */
  var toastTimer;
  T.toast = function (msg, ms) {
    var t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.className = 'show';
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.className = ''; }, ms || 2600);
  };

  /* ---------- Fenêtres (toujours défilantes, boutons toujours visibles) ---------- */
  T.modalStack = [];
  T.modal = function (o) {
    var root = document.getElementById('modal-root'), id = 'm' + T.uid();
    function btnsHtml(list) {
      return list.map(function (b, i) {
        return '<button class="btn ' + (b.primary ? 'primary' : '') + (b.danger ? ' danger' : '') + '" data-mbtn="' + i + '">' + T.esc(b.label) + '</button>';
      }).join('');
    }
    var el = document.createElement('div');
    el.className = 'overlay'; el.id = id;
    var list0 = o.buttons || [{ label: 'Fermer', close: true }];
    el.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="' + T.esc(o.title || '') + '"><div class="modal-head"><h2>' + T.esc(o.title || '') + '</h2></div><div class="modal-body">' + (o.html || '') + '</div><div class="modal-foot">' + btnsHtml(list0) + '</div></div>';
    root.appendChild(el);
    var m = {
      id: id, el: el, o: o, buttons: list0,
      close: function () { if (el.parentNode) el.parentNode.removeChild(el); T.modalStack = T.modalStack.filter(function (x) { return x !== m; }); if (o.onClose) o.onClose(); },
      setBody: function (html) { var b = el.querySelector('.modal-body'); if (b) { b.innerHTML = html; b.scrollTop = 0; } },
      setButtons: function (list) { m.buttons = list; var f = el.querySelector('.modal-foot'); if (f) f.innerHTML = btnsHtml(list); }
    };
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mbtn]');
      if (b) {
        var def = m.buttons[parseInt(b.getAttribute('data-mbtn'), 10)] || {};
        var keep = false;
        if (def.onClick) keep = def.onClick(m) === false;
        if (def.close !== false && !keep) m.close();
      } else if (e.target === el && o.dismissable !== false) m.close();
    });
    T.modalStack.push(m);
    var first = el.querySelector('input,select,textarea'); if (first && o.focus) first.focus();
    return m;
  };
  T.closeModal = function () { var m = T.modalStack[T.modalStack.length - 1]; if (m) { m.close(); return true; } return false; };
  T.confirm = function (title, text, okLabel, onOk, danger) {
    T.modal({ title: title, html: '<p>' + T.esc(text) + '</p>', buttons: [{ label: 'Annuler' }, { label: okLabel || 'Oui', primary: !danger, danger: !!danger, onClick: function () { onOk(); } }] });
  };

  /* ---------- Réglages d'affichage ---------- */
  T.applyDisplay = function () {
    var s = T.set(), r = document.documentElement;
    r.setAttribute('data-theme', s.theme || 'zen');
    r.style.setProperty('--scale', String(s.scale || 1));
    var meta = document.querySelector('meta[name="color-scheme"]'); if (meta) meta.setAttribute('content', s.theme === 'nuit' ? 'dark' : 'light');
    var tc = document.querySelector('meta[name="theme-color"]');
    var colors = { zen: '#f4f1e8', foret: '#e3ebe2', sable: '#f1e9dc', nuit: '#17201b' };
    if (tc) tc.setAttribute('content', colors[s.theme] || colors.zen);
    if (T.native && T.native.statusBar) T.native.statusBar(s.theme === 'nuit');
  };

  /* ---------- Image : réduction avant envoi ---------- */
  T.shrink = function (dataUrl, max) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, (max || 1280) / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var url = c.toDataURL('image/jpeg', 0.82);
        if (c.toBlob) c.toBlob(function (b) { resolve({ dataUrl: url, blob: b }); }, 'image/jpeg', 0.82); else resolve({ dataUrl: url, blob: null });
      };
      img.onerror = function () { reject(new Error('image illisible')); };
      img.src = dataUrl;
    });
  };
})();
