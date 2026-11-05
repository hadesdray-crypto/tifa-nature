/* Tifa Nature - licence / activation, compatible avec l'appli de vente (code reçu après paiement).
   Code = PRÉFIXE.charge.signature (ECDSA P-256). Vérification hors connexion avec la clé publique de la config.
   Une vérification en ligne facultative (révocation) est possible si LICENCE_VERIF_URL est renseignée. */
(function () {
  'use strict';
  var T = window.T, Lc = T.licence = { valid: false, info: null };

  function b64uToBytes(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    var bin = atob(s), a = new Uint8Array(bin.length), i; for (i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a;
  }
  function cleanCode(c) { return String(c || '').replace(/\s+/g, ''); }
  Lc.configured = function () { return !!(T.cfg.LICENCE_PUBLIC_KEY_JWK && window.crypto && crypto.subtle); };
  Lc.verify = function (code) {
    code = cleanCode(code);
    return new Promise(function (resolve) {
      if (!Lc.configured()) return resolve({ ok: false, reason: 'non_configure' });
      var parts = code.split('.');
      if (parts.length !== 3 || parts[0] !== T.cfg.LICENCE_PREFIXE) return resolve({ ok: false, reason: 'format' });
      var payload;
      try { payload = JSON.parse(new TextDecoder().decode(b64uToBytes(parts[1]))); } catch (e) { return resolve({ ok: false, reason: 'format' }); }
      crypto.subtle.importKey('jwk', T.cfg.LICENCE_PUBLIC_KEY_JWK, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']).then(function (key) {
        return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64uToBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
      }).then(function (good) {
        if (!good) return resolve({ ok: false, reason: 'signature' });
        if (payload.app !== 'tifa-nature') return resolve({ ok: false, reason: 'autre_appli' });
        if (payload.exp && Date.now() > payload.exp * 1000) return resolve({ ok: false, reason: 'expire', payload: payload });
        resolve({ ok: true, payload: payload });
      }, function () { resolve({ ok: false, reason: 'erreur' }); });
    });
  };
  /* Vérification en ligne facultative : si le serveur répond « révoqué », on refuse ; sans réponse, on accepte (hors connexion d'abord). */
  Lc.online = function (payload) {
    if (!T.cfg.LICENCE_VERIF_URL || !T.native.online) return Promise.resolve(true);
    var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    return fetch(T.cfg.LICENCE_VERIF_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: payload.id, installation: T.store.s.installId }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(to); if (!r.ok) return true; return r.json().then(function (j) { return j.ok !== false; }, function () { return true; }); }, function () { clearTimeout(to); return true; });
  };
  Lc.MSG = {
    non_configure: 'L\'activation par code n\'est pas disponible dans cette version.',
    format: 'Ce code n\'a pas la bonne forme. Copiez-le en entier, sans rien ajouter.',
    signature: 'Ce code n\'est pas valide. Vérifiez-le ou contactez le vendeur.',
    autre_appli: 'Ce code est destiné à une autre application.',
    expire: 'Ce code a expiré. Contactez le vendeur.',
    erreur: 'La vérification a échoué. Réessayez.',
    revoque: 'Ce code a été désactivé. Contactez le vendeur.'
  };
  Lc.activate = function (code) {
    return Lc.verify(code).then(function (r) {
      if (!r.ok) return r;
      return Lc.online(r.payload).then(function (good) {
        if (!good) return { ok: false, reason: 'revoque' };
        T.store.s.licence = { code: cleanCode(code), id: r.payload.id || '', at: Date.now() }; T.store.save();
        Lc.valid = true; Lc.info = r.payload; return r;
      });
    });
  };
  Lc.init = function () {
    var l = T.store.s.licence;
    if (!l || !l.code) return Promise.resolve();
    return Lc.verify(l.code).then(function (r) { Lc.valid = !!r.ok; Lc.info = r.ok ? r.payload : null; });
  };
  Lc.blocked = function () { return !!T.cfg.LICENCE_OBLIGATOIRE && !Lc.valid; };
  Lc.remove = function () { T.store.s.licence = null; Lc.valid = false; Lc.info = null; T.store.save(); };

  T.route(/^\/licence$/, 'plus', function () {
    var h = '', req = !!T.cfg.LICENCE_OBLIGATOIRE;
    if (Lc.valid) {
      h += '<div class="card"><h2>Licence activée</h2><div class="notice ok">Merci ! Toutes les fonctions sont débloquées sur cet appareil.</div>' + (Lc.info && Lc.info.id ? '<p class="small muted">Référence : ' + T.esc(Lc.info.id) + '</p>' : '') + '<button class="btn danger" data-act="licremove">Retirer la licence de cet appareil</button></div>';
    } else if (!req) {
      h += '<div class="card"><h2>Licence</h2><div class="notice ok">Cette version est en accès libre : aucun code n\'est nécessaire.</div></div>';
      if (Lc.configured()) h += lic_form();
    } else {
      h += '<div class="hero"><h2>Activer Tifa Nature</h2><p>Saisissez le code reçu après votre achat.</p></div>' + lic_form();
    }
    return { title: 'Licence', html: h };
  });
  function lic_form() {
    return '<div class="card"><label class="lbl" for="lic" style="margin-top:0">Code d\'activation</label><textarea id="lic" class="field" rows="3" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Collez ici le code reçu après le paiement"></textarea><p class="small muted">Le code est vérifié sur votre téléphone. Aucune donnée personnelle n\'est demandée.</p><button class="btn primary block" data-act="licgo">Activer</button><div id="lic-msg" aria-live="polite"></div></div>';
  }
  T.act.licgo = function () {
    var v = (document.getElementById('lic') || {}).value || '', box = document.getElementById('lic-msg');
    if (!v.trim()) { box.innerHTML = '<div class="notice warn">Collez d\'abord votre code.</div>'; return; }
    box.innerHTML = '<div class="notice">Vérification…</div>';
    Lc.activate(v).then(function (r) {
      if (r.ok) { T.toast('Licence activée. Merci !'); location.hash = '#/accueil'; T.render(); }
      else box.innerHTML = '<div class="notice bad">' + T.esc(Lc.MSG[r.reason] || Lc.MSG.erreur) + '</div>';
    });
  };
  T.act.licremove = function () { T.confirm('Retirer la licence ?', 'Vous pourrez la réactiver avec votre code.', 'Retirer', function () { Lc.remove(); T.render(); }, true); };
})();
