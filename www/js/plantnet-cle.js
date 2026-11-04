/* Tifa Nature - activation de la reconnaissance précise : chaque personne met sa propre clé Pl@ntNet gratuite, une seule fois. */
(function () {
  'use strict';
  var T = window.T, PN = T.plantnet, ST = { busy: false, msg: '', kind: '', val: '' };
  function st() { T.store.s = T.store.s || {}; T.store.s.plantnet = T.store.s.plantnet || {}; return T.store.s.plantnet; }
  PN.clean = function (v) {
    v = String(v == null ? '' : v).trim();
    var m = v.match(/api-key=([^&\s]+)/i); if (m) v = m[1];
    v = v.replace(/^["'«\s]+|["'»\s]+$/g, '');
    return v;
  };
  PN.valid = function (v) { return /^[A-Za-z0-9._$-]{10,100}$/.test(v); };
  /* Vérifie la clé auprès du service : lecture du quota du jour (ne consomme aucune identification). */
  PN.check = function (key) {
    var url = T.cfg.PLANTNET_URL + '/v2/quota/daily?api-key=' + encodeURIComponent(key);
    function parse(status, text) {
      if (status >= 200 && status < 300) { var j = {}; try { j = JSON.parse(text); } catch (e) {} return { ok: true, remaining: j && j.quota && j.quota.identify ? j.quota.identify.remaining : null }; }
      if (status === 429) return { ok: true, remaining: 0, limited: true };
      if (status >= 400 && status < 500) return { ok: false, bad: true };
      throw new Error('http ' + status);
    }
    function viaFetch() {
      var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
      return fetch(url, { signal: ctl ? ctl.signal : undefined }).then(function (r) { clearTimeout(to); return r.text().then(function (t) { return parse(r.status, t); }); }, function (e) { clearTimeout(to); throw e; });
    }
    function viaXhr() {
      return new Promise(function (res, rej) {
        var x = new XMLHttpRequest(); x.open('GET', url); x.timeout = 20000;
        x.onload = function () { try { res(parse(x.status, x.responseText)); } catch (e) { rej(e); } };
        x.onerror = function () { rej(new Error('reseau')); }; x.ontimeout = function () { rej(new Error('delai')); };
        x.send();
      });
    }
    return viaFetch().catch(function () { return viaXhr(); });   /* cascade : fetch puis XHR */
  };
  function link(href, label) { return '<a class="btn block" href="' + href + '" target="_blank" rel="noopener noreferrer">' + T.esc(label) + '</a>'; }
  function page() {
    var u = st(), on = !!u.key, h = '';
    if (on) {
      h += '<div class="notice"><b>Connecté.</b> La reconnaissance précise est activée. Vous n\'aurez plus rien à refaire : prenez simplement une photo.</div>';
      if (u.remaining != null) h += '<p class="muted small">Identifications restantes aujourd\'hui : ' + T.esc(u.remaining) + '</p>';
      h += '<a class="btn primary block" href="#/photo">Reconnaître une plante</a><button class="btn danger block" data-act="pnremove">Retirer ma clé</button>';
      h += '<p class="muted small">Votre clé reste sur ce téléphone. Les photos envoyées pour la reconnaissance sont traitées par Pl@ntNet.</p>';
      return h;
    }
    h += '<div class="card"><h2>Photo précise (facultatif)</h2><p>Si vous le souhaitez, il est possible d\'utiliser gratuitement, pour votre usage privé, le service de reconnaissance Pl@ntNet. C\'est un site indépendant de cette application. Une fois la clé ajoutée, il n\'y a plus rien à refaire. Vous pouvez aussi ne rien faire : le mode guidé reste disponible.</p></div>';
    h += '<div class="card"><h3>Étape possible 1 : un compte gratuit</h3>' + link('https://my.plantnet.org/signup', 'Voir l\'inscription Pl@ntNet') + '<p class="muted small">Le site propose de créer un compte (« Sign up »), éventuellement avec confirmation de l\'adresse e-mail.</p></div>';
    h += '<div class="card"><h3>Étape possible 2 : la clé</h3>' + link('https://my.plantnet.org/settings/api-key', 'Voir la page de la clé') + '<p class="muted small">Une fois connecté, cette page permet de générer (« Generate ») puis de copier la clé : une longue suite de lettres et de chiffres.</p></div>';
    h += '<div class="card"><h3>Étape possible 3 : l\'ajouter ici</h3><label class="lbl" for="pn-key">Ma clé</label><input id="pn-key" class="input" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="140" placeholder="Collez la clé ici" value="' + T.esc(ST.val) + '" data-pnkey="1">' +
      '<div class="row"><button class="btn grow" data-act="pnpaste">Coller</button><button class="btn primary grow" data-act="pncheck"' + (ST.busy ? ' disabled' : '') + '>Valider ma clé</button></div>';
    if (ST.busy) h += '<div class="notice"><b>Vérification en cours…</b></div>';
    if (ST.msg) h += '<div class="notice ' + (ST.kind || '') + '" role="status">' + T.esc(ST.msg) + '</div>';
    h += '</div><p class="muted small">Pl@ntNet est un service indépendant de Tifa Nature : son usage relève de ses propres conditions.</p>';
    return h;
  }
  T.act.pnpaste = function () {
    var inp = document.getElementById('pn-key');
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (t) { ST.val = PN.clean(t); if (inp) inp.value = ST.val; }, function () { T.toast('Collage impossible : touchez le champ et collez-y la clé.', 3600); });
    } else T.toast('Touchez le champ et collez-y la clé.', 3600);
  };
  T.act.pncheck = function () {
    var inp = document.getElementById('pn-key'), key = PN.clean(inp ? inp.value : ST.val); ST.val = key;
    ST.msg = ''; ST.kind = '';
    if (!key) { ST.msg = 'Collez d\'abord votre clé dans le champ.'; ST.kind = 'warn'; T.render(true); return; }
    if (!PN.valid(key)) { ST.msg = 'Cette clé ne ressemble pas à une clé Pl@ntNet. Copiez-la en entier, sans espace.'; ST.kind = 'warn'; T.render(true); return; }
    if (!T.native.online) { ST.msg = 'Pas de connexion internet. Réessayez dès que vous êtes en ligne.'; ST.kind = 'warn'; T.render(true); return; }
    ST.busy = true; T.render(true);
    PN.check(key).then(function (r) {
      ST.busy = false;
      if (r.ok) { var u = st(); u.key = key; u.remaining = r.remaining; u.day = new Date().toISOString().slice(0, 10); T.store.save(); ST.msg = ''; ST.val = ''; T.toast(r.limited ? 'Clé enregistrée. Le quota du jour est atteint : réessayez demain.' : 'Connecté. C\'est fait pour toujours.', 3600); }
      else { ST.msg = 'Cette clé n\'est pas acceptée. Vérifiez que vous l\'avez copiée en entier.'; ST.kind = 'bad'; }
    }, function () { ST.busy = false; ST.msg = 'Impossible de vérifier pour le moment (connexion ou service). Réessayez dans un instant.'; ST.kind = 'warn'; }).then(function () { T.render(true); });
  };
  T.act.pnremove = function () {
    T.confirm('Retirer ma clé ?', 'La reconnaissance précise sera désactivée sur ce téléphone. Vous pourrez la réactiver avec la même clé.', 'Retirer', function () {
      var u = st(); delete u.key; delete u.remaining; T.store.save(); ST.msg = ''; T.render(true);
    }, true);
  };
  document.addEventListener('input', function (e) { if (e.target && e.target.getAttribute && e.target.getAttribute('data-pnkey')) ST.val = e.target.value; });
  T.route(/^\/photo\/precise$/, 'trouver', function () { return { title: 'Photo précise', html: page() }; });
})();
