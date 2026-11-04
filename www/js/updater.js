/* Tifa Nature - mises à jour SUR PLACE (jamais de nouvelle APK à installer).
   1) l'appli lit le fichier manifest.json publié par GitHub, 2) affiche la liste des changements,
   3) après validation, télécharge chaque fichier avec une barre de progression (reprise si coupure, vérification d'intégrité),
   4) bascule sur la nouvelle version ; l'ancienne reste conservée et revient toute seule si la nouvelle ne démarre pas. */
(function () {
  'use strict';
  var T = window.T, U = T.updater = { status: 'idle', manifest: null, error: '', busy: false };
  var OTA = 'ota';

  function P() { return T.native.P; }
  function supported() { return !!(T.native.isNative && P().FS && P().WebView); }
  function dirData() { return (P().Dir && P().Dir.Data) || 'DATA'; }
  function ota() { var s = T.store.s; if (!s.ota) s.ota = {}; return s.ota; }
  function toHex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function b64ToBytes(b64) { var bin = atob(b64), a = new Uint8Array(bin.length), i; for (i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function bytesToB64(bytes) { var s = '', i, n = 0x8000; for (i = 0; i < bytes.length; i += n) s += String.fromCharCode.apply(null, bytes.subarray(i, i + n)); return btoa(s); }
  function sha256(bytes) { return crypto.subtle.digest('SHA-256', bytes).then(toHex); }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  U.configured = function () { var u = T.cfg.UPDATE_MANIFEST_URL; return !!u && !/__/.test(u) && /^https:\/\//.test(u); };
  U.current = function () { return parseInt(T.cfg.VERSION_CODE, 10) || 1; };

  /* ---------- 1) Lecture du manifest ---------- */
  function fetchManifest() {
    var url = T.cfg.UPDATE_MANIFEST_URL + (T.cfg.UPDATE_MANIFEST_URL.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now();
    function viaFetch() {
      var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
      return fetch(url, { cache: 'no-store', signal: ctl ? ctl.signal : undefined }).then(function (r) { clearTimeout(to); if (!r.ok) throw new Error('http ' + r.status); return r.json(); }, function (e) { clearTimeout(to); throw e; });
    }
    function viaXhr() {
      return new Promise(function (resolve, reject) {
        var x = new XMLHttpRequest(); x.open('GET', url); x.timeout = 15000;
        x.onload = function () { try { if (x.status < 200 || x.status >= 300) throw new Error('http ' + x.status); resolve(JSON.parse(x.responseText)); } catch (e) { reject(e); } };
        x.onerror = function () { reject(new Error('reseau')); }; x.ontimeout = function () { reject(new Error('delai')); }; x.send();
      });
    }
    return viaFetch().catch(viaXhr);                       /* cascade */
  }
  function validManifest(m) {
    if (!m || typeof m !== 'object' || typeof m.versionCode !== 'number' || !Array.isArray(m.files) || !m.files.length || m.files.length > 400) return false;
    var hasIndex = false, total = 0;
    for (var i = 0; i < m.files.length; i++) {
      var f = m.files[i];
      if (!f || typeof f.path !== 'string' || !/^[A-Za-z0-9._\/-]+$/.test(f.path) || f.path.indexOf('..') >= 0 || f.path.charAt(0) === '/' || !/^[0-9a-f]{64}$/.test(f.sha256 || '')) return false;
      if (f.path === 'index.html') hasIndex = true; total += f.size || 0;
    }
    return hasIndex && total < 40 * 1024 * 1024;
  }
  function baseUrl(m) {
    var man = T.cfg.UPDATE_MANIFEST_URL.split('?')[0], b = m.base || man.replace(/manifest\.json$/, 'files/');
    if (!/^https:\/\//.test(b)) throw new Error('base');
    if (new URL(b).hostname !== new URL(man).hostname) throw new Error('base');   /* même serveur que le manifest */
    return b.charAt(b.length - 1) === '/' ? b : b + '/';
  }
  U.check = function () {
    if (U.busy) return Promise.resolve(U.status);
    if (!U.configured()) { U.status = 'non_configure'; return Promise.resolve(U.status); }
    return T.native.checkOnline().then(function (on) {
      if (!on) { U.status = 'hors_ligne'; return U.status; }
      U.status = 'verification';
      return fetchManifest().then(function (m) {
        T.store.s.lastCheck = Date.now(); T.store.save();
        if (!validManifest(m)) { U.status = 'erreur'; U.error = 'Le fichier de mise à jour est incorrect.'; return U.status; }
        if (m.versionCode <= U.current()) { U.status = 'a_jour'; U.manifest = null; return U.status; }
        if ((ota().failed || []).indexOf(m.versionCode) >= 0) { U.status = 'a_jour'; return U.status; }
        if (m.minNative && T.native.build && T.native.build < m.minNative) { U.status = 'native_requis'; U.manifest = m; return U.status; }
        U.manifest = m; U.status = 'disponible'; return U.status;
      }, function () { U.status = 'erreur'; U.error = 'Impossible de joindre le serveur de mises à jour. Réessayez plus tard.'; return U.status; });
    });
  };

  /* ---------- 2) Téléchargement fiable : plusieurs méthodes, reprise, vérification ---------- */
  function readBytes(rel) {
    return P().FS.readFile({ path: rel, directory: dirData() }).then(function (r) { return b64ToBytes(typeof r.data === 'string' ? r.data : ''); });
  }
  function existsOk(rel, sha) { return readBytes(rel).then(function (b) { return sha256(b).then(function (h) { return h === sha; }); }, function () { return false; }); }
  function downloadOne(url, rel, sha, attempt) {
    var methods = [
      function () { return P().FS.downloadFile ? P().FS.downloadFile({ url: url, path: rel, directory: dirData(), recursive: true }) : Promise.reject(new Error('pas de telechargement natif')); },
      function () { return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); }).then(function (buf) { return P().FS.writeFile({ path: rel, directory: dirData(), data: bytesToB64(new Uint8Array(buf)), recursive: true }); }); },
      function () {
        return new Promise(function (resolve, reject) { var x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer'; x.timeout = 40000; x.onload = function () { x.status >= 200 && x.status < 300 ? resolve(x.response) : reject(new Error('http ' + x.status)); }; x.onerror = function () { reject(new Error('reseau')); }; x.ontimeout = function () { reject(new Error('delai')); }; x.send(); })
          .then(function (buf) { return P().FS.writeFile({ path: rel, directory: dirData(), data: bytesToB64(new Uint8Array(buf)), recursive: true }); });
      }
    ];
    return methods[attempt % methods.length]().then(function () { return existsOk(rel, sha); }).then(function (ok) { if (!ok) throw new Error('integrite'); });
  }
  function withRetries(url, rel, sha) {
    var attempt = 0;
    function go() {
      return downloadOne(url, rel, sha, attempt).catch(function (e) {
        attempt += 1; if (attempt >= 4) throw e;
        return delay(700 * attempt).then(go);                   /* on réessaie avec la méthode suivante */
      });
    }
    return go();
  }

  /* ---------- 3) Installation ---------- */
  function rmDir(rel) { return P().FS.rmdir({ path: rel, directory: dirData(), recursive: true }).catch(function () {}); }
  U.download = function (m, onProgress) {
    var base = baseUrl(m), tmp = OTA + '/tmp-' + m.versionCode, files = m.files, total = files.reduce(function (s, f) { return s + (f.size || 1); }, 0), done = 0, i = 0;
    function next() {
      if (i >= files.length) return Promise.resolve();
      var f = files[i++], rel = tmp + '/' + f.path;
      return existsOk(rel, f.sha256).then(function (ok) {                  /* reprise : ce qui est déjà bon n'est pas retéléchargé */
        return ok ? null : withRetries(base + f.path.split('/').map(encodeURIComponent).join('/'), rel, f.sha256);
      }).then(function () { done += (f.size || 1); onProgress && onProgress(Math.min(100, Math.round(done * 100 / total)), i, files.length); return next(); });
    }
    return next().then(function () {
      var fin = OTA + '/v' + m.versionCode;
      return rmDir(fin).then(function () { return P().FS.rename({ from: tmp, to: fin, directory: dirData(), toDirectory: dirData() }); }).then(function () { return fin; }, function () { return tmp; });
    });
  };
  function absPath(rel) {
    return P().FS.getUri({ path: rel, directory: dirData() }).then(function (r) { return String(r.uri || '').replace(/^file:\/\//, ''); });
  }
  U.apply = function (m, rel) {
    return absPath(rel).then(function (abs) {
      var o = ota(); o.previous = o.current || null; o.current = { vc: m.versionCode, rel: rel, version: m.version || '' }; o.trial = { vc: m.versionCode, ts: Date.now() };
      T.store.save();
      return delay(250).then(function () { return P().WebView.setServerBasePath({ path: abs }); });   /* la page se recharge sur la nouvelle version */
    });
  };
  U.run = function (m, onProgress) {
    if (!supported()) return Promise.reject(new Error('non_supporte'));
    U.busy = true;
    return U.download(m, onProgress).then(function (rel) { return U.apply(m, rel); }).then(function () { U.busy = false; }, function (e) { U.busy = false; throw e; });
  };

  /* ---------- 4) Démarrage : validation ou retour automatique à l'ancienne version ---------- */
  U.boot = function () {
    if (!supported()) return Promise.resolve();
    var o = ota();
    if (o.trial && o.trial.vc !== U.current()) {                      /* la nouvelle version n'a pas démarré : on est revenu à l'ancienne */
      o.failed = (o.failed || []).concat([o.trial.vc]).slice(-10);
      var bad = o.current; o.current = o.previous || null; o.previous = null; o.trial = null; T.store.save();
      T.toast('La mise à jour n\'a pas pu démarrer. L\'ancienne version a été conservée.', 4500);
      return bad && bad.rel ? rmDir(bad.rel) : Promise.resolve();
    }
    return Promise.resolve();
  };
  U.markHealthy = function () {
    if (!supported()) return;
    var o = ota();
    if (o.trial && o.trial.vc === U.current()) {
      P().WebView.persistServerBasePath().then(function () {
        o.trial = null; T.store.save();
        var keep = [o.current && o.current.rel, o.previous && o.previous.rel].filter(Boolean).map(function (r) { return r.split('/').pop(); });
        return P().FS.readdir({ path: OTA, directory: dirData() }).then(function (r) {
          var names = (r.files || []).map(function (f) { return typeof f === 'string' ? f : f.name; });
          return Promise.all(names.filter(function (n) { return keep.indexOf(n) < 0; }).map(function (n) { return rmDir(OTA + '/' + n); }));
        });
      }).catch(function () {});
    }
  };
  U.rollback = function () {
    var o = ota(); if (!supported() || !o.previous) return Promise.reject(new Error('rien'));
    var prev = o.previous, cur = o.current;
    return absPath(prev.rel).then(function (abs) {
      o.current = prev; o.previous = cur; o.trial = { vc: prev.vc, ts: Date.now() }; T.store.save();
      return P().WebView.setServerBasePath({ path: abs });
    });
  };

  /* ---------- Fenêtre de mise à jour ---------- */
  function sizeText(m) { var b = m.files.reduce(function (s, f) { return s + (f.size || 0); }, 0); return b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' Mo' : Math.max(1, Math.round(b / 1024)) + ' Ko'; }
  U.showModal = function (m) {
    var changes = (m.changes && m.changes.length ? m.changes : ['Améliorations et corrections.']);
    var info = '<p><b>Version ' + T.esc(m.version || m.versionCode) + '</b>' + (m.date ? ' du ' + T.esc(m.date) : '') + ' - ' + sizeText(m) + '</p><h3>Ce qui change</h3><ul>' + T.list(changes) + '</ul><p class="small muted">La mise à jour se fait directement dans l\'application, sans rien réinstaller. Vos pots et réglages sont conservés.</p>';
    var modal;
    function failed(msg) { modal.setBody('<div class="notice bad">' + T.esc(msg) + '</div><p>Les fichiers déjà reçus sont conservés : en appuyant sur « Reprendre », le téléchargement continue là où il s\'était arrêté.</p>'); modal.setButtons([{ label: 'Plus tard' }, { label: 'Reprendre', primary: true, onClick: start }]); }
    function start() {
      modal.setBody('<p><b>Téléchargement en cours…</b></p><div class="bar"><div id="up-bar" style="width:0%"></div></div><p id="up-txt" class="muted">0 %</p>');
      modal.setButtons([{ label: 'Patientez…', close: false, onClick: function () { return false; } }]);
      U.run(m, function (pct, n, tot) { var b = document.getElementById('up-bar'), t = document.getElementById('up-txt'); if (b) b.style.width = pct + ' %'.replace(' %', '%'); if (t) t.textContent = pct + ' % (' + n + ' / ' + tot + ' fichiers)'; })
        .then(function () { modal.setBody('<div class="notice ok"><b>Mise à jour installée.</b> L\'application redémarre…</div>'); }, function (e) {
          failed(e && e.message === 'non_supporte' ? 'Les mises à jour sur place fonctionnent dans l\'application installée sur le téléphone.' : 'Le téléchargement s\'est arrêté (' + (e && e.message ? e.message : 'erreur') + ').');
        });
      return false;
    }
    modal = T.modal({ title: 'Mise à jour disponible', html: info, dismissable: false, buttons: [{ label: 'Plus tard' }, { label: 'Mettre à jour', primary: true, onClick: start }] });
  };
  U.autoCheck = function () {
    var every = (T.cfg.UPDATE_CHECK_EVERY_HOURS || 6) * 3600000;
    if (!U.configured() || Date.now() - (T.store.s.lastCheck || 0) < every || T.licence && T.licence.blocked && T.licence.blocked()) return;
    U.check().then(function (st) { if (st === 'disponible' && U.manifest && !T.modalStack.length) U.showModal(U.manifest); });
  };

  /* ---------- Écran « Mises à jour » ---------- */
  var MSG = { idle: '', non_configure: 'Les mises à jour ne sont pas encore configurées dans cette version.', hors_ligne: 'Pas de connexion internet. Réessayez quand vous êtes en ligne.', verification: 'Recherche en cours…', a_jour: 'Votre application est à jour.', erreur: '', native_requis: 'Cette mise à jour demande une version plus récente de l\'application. Contactez le vendeur.', disponible: 'Une mise à jour est disponible.' };
  T.route(/^\/maj$/, 'plus', function () {
    var o = ota(), h = '<div class="card"><h2>Mises à jour</h2><dl class="kv"><dt>Version</dt><dd>' + T.esc(T.cfg.VERSION_WEB) + '</dd><dt>Dernière recherche</dt><dd>' + (T.store.s.lastCheck ? new Date(T.store.s.lastCheck).toLocaleString('fr-FR') : 'jamais') + '</dd></dl>';
    var msg = U.status === 'erreur' ? U.error : (MSG[U.status] || '');
    if (msg) h += '<div class="notice ' + (U.status === 'a_jour' ? 'ok' : (U.status === 'erreur' || U.status === 'hors_ligne' ? 'warn' : '')) + '">' + T.esc(msg) + '</div>';
    h += '<button class="btn primary block" data-act="majcheck">Rechercher une mise à jour</button>';
    if (U.status === 'disponible' && U.manifest) h += '<button class="btn block" style="margin-top:.6rem" data-act="majshow">Voir la mise à jour (version ' + T.esc(U.manifest.version || U.manifest.versionCode) + ')</button>';
    h += '<p class="small muted" style="margin-top:.8rem">Les mises à jour se font directement ici, sans réinstaller l\'application. Vos pots et réglages sont conservés.</p></div>';
    if (o.previous && supported()) h += '<div class="card"><h3>Revenir en arrière</h3><p class="small">Si la nouvelle version vous pose problème, vous pouvez retrouver la précédente.</p><button class="btn danger" data-act="majback">Revenir à la version précédente</button></div>';
    return { title: 'Mises à jour', html: h };
  });
  T.act.majcheck = function () { U.status = 'verification'; T.render(true); U.check().then(function (st) { T.render(true); if (st === 'disponible' && U.manifest) U.showModal(U.manifest); }); };
  T.act.majshow = function () { if (U.manifest) U.showModal(U.manifest); };
  T.act.majback = function () { T.confirm('Revenir à la version précédente ?', 'L\'application va redémarrer sur l\'ancienne version. Vos pots et réglages sont conservés.', 'Revenir', function () { U.rollback().catch(function () { T.toast('Retour impossible pour le moment.'); }); }, true); };
})();
