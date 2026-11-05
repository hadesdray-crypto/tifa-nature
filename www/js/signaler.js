/* Tifa Nature - bouton « Un souci ? » présent sur toutes les pages : signaler une erreur à l'endroit exact où elle se trouve.
   Envoi en cascade : service (si configuré) -> mail pré-rempli -> partage -> copie. Rien ne part sans l'action de la personne
   (sauf service configuré par le développeur, uniquement au toucher sur « Envoyer »). Aucune donnée personnelle collectée. */
(function () {
  'use strict';
  var T = window.T, F = window.TIFA_FEEDBACK || {}, S = T.signaler = {};
  var TYPES = [['fausse', 'Une information est fausse'], ['marche', 'Quelque chose ne marche pas'], ['affichage', 'Texte coupé ou illisible'], ['autre', 'Autre chose']];
  var draft = { type: 'fausse', texte: '', correction: '', tech: true };

  function st() { T.store.s = T.store.s || {}; T.store.s.signalements = T.store.s.signalements || []; T.store.s.erreursAuto = T.store.s.erreursAuto || []; return T.store.s; }
  function save() { try { T.store.save(); } catch (e) {} }
  function clip(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  /* ---------- Erreurs automatiques (locales, jamais envoyées seules) ---------- */
  var busy = false;
  function logErr(msg, src, line) {
    if (busy) return; busy = true;
    try {
      var s = st(); s.erreursAuto.push({ t: Date.now(), m: clip(msg, 160), f: clip(String(src || '').split('/').pop(), 40), l: line || 0, p: S.page().path });
      if (s.erreursAuto.length > 30) s.erreursAuto = s.erreursAuto.slice(-30);
      save();
    } catch (e) {} busy = false;
  }
  window.addEventListener('error', function (e) { if (e) logErr((e.error && e.error.message) || e.message || 'Erreur', e.filename, e.lineno); });
  window.addEventListener('unhandledrejection', function (e) { logErr('Promesse refusée : ' + (e && e.reason && (e.reason.message || e.reason)), '', 0); });

  /* ---------- Contexte : où est la personne ---------- */
  S.page = function () {
    var cur = T.cur || {}, h = (location.hash || '#/accueil').replace(/^#/, '');
    var t = (document.getElementById('title') || {}).textContent || '';
    return { path: cur.path || h, title: t };
  };
  S.tech = function () {
    var ua = navigator.userAgent || '', m = ua.match(/Android [\d.]+/), md = ua.match(/;\s*([^;)]+)\s+Build/);
    return {
      version: (T.cfg && T.cfg.VERSION_WEB) || '?', android: m ? m[0] : 'inconnu', modele: md ? clip(md[1], 30) : '',
      ecran: (window.innerWidth || 0) + 'x' + (window.innerHeight || 0), texte: sf(function () { return T.store.s.settings.scale; }, 1), enLigne: navigator.onLine !== false
    };
  };
  function sf(f, d) { try { var v = f(); return v == null ? d : v; } catch (e) { return d; } }

  S.compose = function (r) {
    var tp = (TYPES.filter(function (x) { return x[0] === r.type; })[0] || ['', 'Autre'])[1], te = r.tech || {}, L = [];
    L.push('Signalement - ' + (F.appNom || 'Application') + ' ' + (te.version || ''));
    L.push('Page : ' + (r.titre || '') + ' (' + r.path + ')');
    L.push('Type : ' + tp);
    L.push('Ce qui ne va pas : ' + (r.texte || '(non précisé)'));
    if (r.correction) L.push('Ma proposition : ' + r.correction);
    if (r.tech) {
      L.push('Appareil : ' + te.android + (te.modele ? ', ' + te.modele : '') + ', écran ' + te.ecran + ', texte x' + te.texte + (te.enLigne ? ', en ligne' : ', hors connexion'));
      if (r.erreurs && r.erreurs.length) L.push('Erreurs récentes : ' + r.erreurs.map(function (e) { return e.f + ':' + e.l + ' ' + e.m; }).join(' | '));
    }
    return L.join('\n');
  };

  /* ---------- Envoi en cascade ---------- */
  function copyText(txt) {
    return new Promise(function (res, rej) {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(res, function () { fallback(); }); return; }
      fallback();
      function fallback() {
        try { var ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); document.body.removeChild(ta); ok ? res() : rej(new Error('copie')); } catch (e) { rej(e); }
      }
    });
  }
  function viaEndpoint(r, txt) {
    if (!F.endpoint || !/^https:\/\//i.test(F.endpoint) || navigator.onLine === false) return Promise.reject(new Error('non configuré'));
    var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 10000);
    return fetch(F.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app: F.appNom, texte: txt, type: r.type, path: r.path, t: r.t }), signal: ctl ? ctl.signal : undefined })
      .then(function (x) { clearTimeout(to); if (!x.ok) throw new Error('http ' + x.status); return 'service'; }, function (e) { clearTimeout(to); throw e; });
  }
  function viaMail(r, txt) {
    if (!F.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(F.email)) return Promise.reject(new Error('non configuré'));
    var url = 'mailto:' + F.email + '?subject=' + encodeURIComponent('Signalement ' + (F.appNom || '') + ' : ' + clip(r.titre || r.path, 60)) + '&body=' + encodeURIComponent(clip(txt, 1200));
    return new Promise(function (res) { var a = document.createElement('a'); a.href = url; a.style.display = 'none'; document.body.appendChild(a); a.click(); setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); res('mail'); }, 200); });
  }
  function viaShare(r, txt) {
    var P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share;
    if (P && P.share) return P.share({ title: 'Signalement ' + (F.appNom || ''), text: txt, dialogTitle: 'Envoyer le signalement' }).then(function () { return 'partage'; });
    if (navigator.share) return navigator.share({ title: 'Signalement ' + (F.appNom || ''), text: txt }).then(function () { return 'partage'; });
    return Promise.reject(new Error('pas de partage'));
  }
  function viaCopy(r, txt) { return copyText(txt).then(function () { return 'copie'; }); }
  S.send = function (r) {
    var txt = S.compose(r), steps = [viaEndpoint, viaMail, viaShare, viaCopy], i = 0;
    return new Promise(function (resolve) {
      (function next() {
        if (i >= steps.length) return resolve({ via: 'aucun', txt: txt });
        steps[i++](r, txt).then(function (via) { resolve({ via: via, txt: txt }); }, next);
      })();
    });
  };

  /* ---------- Fenêtre « Un souci ? » ---------- */
  function formHtml(pg) {
    var h = '<p class="sg-where"><b>Page concernée :</b> ' + T.esc(pg.title || pg.path) + '</p>';
    h += '<div class="sg-types" role="radiogroup" aria-label="Type de problème">' + TYPES.map(function (t) {
      return '<button type="button" class="chip' + (draft.type === t[0] ? ' on' : '') + '" role="radio" aria-checked="' + (draft.type === t[0]) + '" data-act="sgtype" data-v="' + t[0] + '">' + T.esc(t[1]) + '</button>';
    }).join('') + '</div>';
    h += '<label class="lbl" for="sg-texte">Qu\'est-ce qui ne va pas ?</label><textarea id="sg-texte" class="input" rows="4" maxlength="800" placeholder="Décrivez en quelques mots" data-sg="texte">' + T.esc(draft.texte) + '</textarea>';
    if (draft.type === 'fausse') h += '<label class="lbl" for="sg-corr">Ce qui serait juste (facultatif)</label><textarea id="sg-corr" class="input" rows="2" maxlength="500" data-sg="correction">' + T.esc(draft.correction) + '</textarea>';
    h += '<label class="sg-tech"><input type="checkbox" data-sg="tech"' + (draft.tech ? ' checked' : '') + '> Joindre les infos techniques (version, écran, erreurs récentes). Aucune donnée personnelle.</label>';
    return h;
  }
  var cur = null;
  S.open = function (pre) {
    if (pre) { for (var k in pre) draft[k] = pre[k]; }
    var pg = S.page();
    cur = T.modal({
      title: 'Un souci sur cette page ?', html: formHtml(pg),
      buttons: [
        { label: 'Envoyer', primary: true, onClick: function (m) { return submit(m, pg); } },
        { label: 'Annuler', close: true }
      ]
    });
  };
  function readForm() {
    var el = document.getElementById('sg-texte'); if (el) draft.texte = el.value;
    var c = document.getElementById('sg-corr'); if (c) draft.correction = c.value;
    var t = document.querySelector('#modal-root [data-sg="tech"]'); if (t) draft.tech = t.checked;
  }
  function submit(m, pg) {
    readForm();
    if (!draft.texte.trim()) { T.toast('Écrivez d\'abord quelques mots sur le problème.', 3200); var e = document.getElementById('sg-texte'); if (e) e.focus(); return false; }
    var s = st(), r = { id: T.uid ? T.uid() : String(Date.now()), t: Date.now(), path: pg.path, titre: pg.title, type: draft.type, texte: draft.texte.trim(), correction: draft.type === 'fausse' ? draft.correction.trim() : '', status: 'attente' };
    if (draft.tech) { r.tech = S.tech(); r.erreurs = s.erreursAuto.slice(-5); }
    m.setBody('<div class="notice"><b>Envoi en cours…</b></div>'); m.setButtons([]);
    S.send(r).then(function (res) {
      r.status = res.via === 'service' ? 'envoye' : (res.via === 'aucun' ? 'attente' : 'prepare'); r.via = res.via;
      s.signalements.unshift(r); if (s.signalements.length > 50) s.signalements.length = 50; save();
      draft = { type: 'fausse', texte: '', correction: '', tech: draft.tech };
      var msg = { service: 'Merci, votre signalement a été envoyé.', mail: 'Votre message est prêt dans votre application de mail. Il suffit d\'appuyer sur « Envoyer » là-bas.', partage: 'Choisissez où envoyer le message, merci !', copie: 'Le message est copié. Collez-le dans un mail ou une conversation pour l\'envoyer.', aucun: 'Le message est enregistré dans « Mes signalements ». Vous pourrez le renvoyer plus tard.' }[res.via];
      m.setBody('<div class="notice"><b>Merci !</b> ' + T.esc(msg) + '</div><p class="muted small">Vous retrouverez ce signalement dans Plus, « Mes signalements ».</p>');
      m.setButtons([{ label: 'Copier le message', onClick: function () { copyText(res.txt).then(function () { T.toast('Message copié.', 2600); }, function () { T.toast('Copie impossible.', 2600); }); return false; } }, { label: 'Fermer', primary: true, close: true }]);
    });
    return false;
  }
  T.act.sgtype = function (el) { readForm(); draft.type = el.getAttribute('data-v'); if (cur && cur.setBody) cur.setBody(formHtml(S.page())); };
  T.act.signaler = function () { S.open(); };

  /* ---------- Page « Mes signalements » ---------- */
  var VIA = { envoye: 'Envoyé', prepare: 'Message préparé', attente: 'À envoyer' };
  T.route(/^\/signalements$/, 'plus', function () {
    var s = st(), h = '<div class="hero"><h2>Mes signalements</h2><p>Les problèmes que vous avez signalés.</p></div>';
    h += '<button class="btn primary block" data-act="signaler">Signaler un problème</button>';
    if (!s.signalements.length) h += '<div class="card"><p>Aucun signalement pour le moment.</p></div>';
    s.signalements.forEach(function (r, i) {
      h += '<div class="card"><h3>' + T.esc(r.titre || r.path) + '</h3><p class="muted small">' + T.esc(new Date(r.t).toLocaleDateString('fr-FR')) + ' · ' + T.esc(VIA[r.status] || '') + '</p><p>' + T.esc(clip(r.texte, 300)) + '</p>' +
        (r.status !== 'envoye' ? '<button class="btn block" data-act="sgresend" data-i="' + i + '">Renvoyer</button>' : '') + '</div>';
    });
    if (s.signalements.length) h += '<button class="btn danger block" data-act="sgclear">Tout effacer</button>';
    return { title: 'Mes signalements', html: h };
  });
  var resending = false;
  T.act.sgresend = function (el) {
    if (resending) return; resending = true; setTimeout(function () { resending = false; }, 1500);
    var r = st().signalements[parseInt(el.getAttribute('data-i'), 10)]; if (!r) return;
    S.send(r).then(function (res) { r.status = res.via === 'service' ? 'envoye' : (res.via === 'aucun' ? 'attente' : 'prepare'); r.via = res.via; save(); T.toast(res.via === 'copie' ? 'Message copié.' : 'Message préparé.', 2800); T.render(true); });
  };
  T.act.sgclear = function () { T.confirm('Tout effacer ?', 'Vos signalements enregistrés sur ce téléphone seront supprimés.', 'Effacer', function () { st().signalements = []; save(); T.render(true); }, true); };

  /* ---------- Le petit bouton « ? » ---------- */
  function mount() {
    var app = document.getElementById('topbar'); if (!app || document.getElementById('sg-btn')) return;
    var b = document.createElement('button'); b.id = 'sg-btn'; b.type = 'button'; b.setAttribute('data-act', 'signaler');
    b.setAttribute('aria-label', 'Un souci sur cette page ? Signaler un problème'); b.title = 'Un souci ?';
    b.innerHTML = '<span aria-hidden="true">?</span>';
    app.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
