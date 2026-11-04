/* Tifa Nature - démarrage, navigation, bouton retour, première ouverture. */
(function () {
  'use strict';
  var T = window.T;
  var TABS = ['accueil', 'trouver', 'pots', 'conseils', 'plus'];
  T.cur = { path: '', tab: 'accueil', root: true }; T.query = {};
  var LICENCE_OK = /^\/(licence|legal\/|aide|apropos)/;

  function parseHash() {
    var h = (location.hash || '').replace(/^#/, '') || '/accueil', q = {}, i = h.indexOf('?');
    if (i >= 0) { h.slice(i + 1).split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); }); h = h.slice(0, i); }
    if (h.charAt(0) !== '/') h = '/' + h;
    return { path: h, query: q };
  }
  function errorPage() { return { title: 'Tifa Nature', html: '<div class="card"><h2>Oups</h2><p>Cette page n\'a pas pu s\'afficher. Revenez à l\'accueil, tout est conservé.</p><a class="btn primary block" href="#/accueil">Retour à l\'accueil</a></div>' }; }

  T.render = function (keep) {
    var view = document.getElementById('view'), top = view.scrollTop, p = parseHash(), res = null, r = null, i, m;
    if (T.licence && T.licence.blocked() && !LICENCE_OK.test(p.path)) { p = { path: '/licence', query: {} }; history.replaceState(null, '', '#/licence'); }
    T.query = p.query; T.voice.clearTexts();
    for (i = 0; i < T.routes.length; i++) { m = T.routes[i].re.exec(p.path); if (m) { r = T.routes[i]; break; } }
    if (!r) { p = { path: '/accueil', query: {} }; r = T.routes.filter(function (x) { return x.re.test('/accueil'); })[0]; m = r.re.exec('/accueil'); history.replaceState(null, '', '#/accueil'); }
    try { res = r.fn(m); } catch (e) { if (window.console) console.error(e); res = errorPage(); }
    T.cur = { path: p.path, tab: r.tab, root: !!r.root };
    view.innerHTML = res.html;
    document.getElementById('title').textContent = res.title || 'Tifa Nature';
    document.getElementById('btn-back').hidden = !!r.root;
    TABS.forEach(function (t) { var b = document.querySelector('#tabs [data-tab="' + t + '"]'); if (b) { b.classList.toggle('on', t === r.tab); b.setAttribute('aria-current', t === r.tab ? 'page' : 'false'); } });
    view.scrollTop = keep ? top : 0;
    if (res.after) res.after();
  };
  window.addEventListener('hashchange', function () { T.voice.stop(); T.render(); });

  /* ---------- Clics et saisie (délégation) ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var name = el.getAttribute('data-act'), fn = T.act[name];
    if (el.tagName === 'BUTTON' && el.disabled) return;
    if (fn) { try { fn(el, e); } catch (err) { if (window.console) console.error(err); T.toast('Une action n\'a pas pu se faire. Réessayez.'); } }
  });
  document.addEventListener('input', function (e) {
    var el = e.target.closest ? e.target.closest('[data-input]') : null; if (!el) return;
    var fn = T.input[el.getAttribute('data-input')]; if (fn) { try { fn(el, e); } catch (err) { if (window.console) console.error(err); } }
  });
  T.act.tab = function (el) {
    var t = el.getAttribute('data-tab'), target = '#/' + t;
    if (location.hash !== target) history.replaceState(null, '', target);
    T.voice.stop(); T.render();
  };
  T.act.back = function () { if (history.length > 1) history.back(); else { location.hash = '#/accueil'; } };

  /* ---------- Bouton retour Android ---------- */
  var lastBack = 0;
  function onBack() {
    var top = T.modalStack[T.modalStack.length - 1];
    if (top) { if (top.o.dismissable === false) return; top.close(); return; }
    if (!T.cur.root) { T.act.back(); return; }
    if (T.cur.tab !== 'accueil') { history.replaceState(null, '', '#/accueil'); T.render(); return; }
    if (Date.now() - lastBack < 2200) { T.native.exitApp(); return; }
    lastBack = Date.now(); T.toast('Appuyez encore une fois pour quitter');
  }
  T.onBack = onBack;

  /* ---------- Première ouverture ---------- */
  function onboarding() {
    var step = 0, m;
    var steps = [
      { t: 'Bienvenue dans Tifa Nature', h: '<p>Votre compagnon de jardinage pour la maison et la petite cour.</p><ul><li>Reconnaître une plante avec une photo</li><li>Comprendre pourquoi elle est malade, et que faire</li><li>Placer chaque pot au soleil ou à l\'ombre</li><li>Des conseils simples, mois par mois</li></ul>' },
      { t: 'Comment s\'en servir', h: '<ol class="steps"><li>Les boutons du bas changent de section.</li><li>Touchez « Écouter » pour entendre un conseil.</li><li>Tout marche sans internet, sauf l\'analyse de photo et les mises à jour.</li><li>Le menu « Plus » règle la taille du texte et la voix.</li></ol>' },
      { t: 'L\'appareil photo', h: '<p>Pour reconnaître vos plantes, l\'application a besoin de l\'appareil photo. Le téléphone va vous poser la question <b>une seule fois</b>.</p><p class="small muted">Vos photos restent sur votre téléphone. Elles ne partent que si vous demandez une analyse, avec internet.</p>' }
    ];
    function show() {
      var s = steps[step], last = step === steps.length - 1, btns = [];
      if (step > 0) btns.push({ label: 'Précédent', close: false, onClick: function () { step -= 1; show(); return false; } });
      if (!last) btns.push({ label: 'Suivant', primary: true, close: false, onClick: function () { step += 1; show(); return false; } });
      else btns.push({ label: 'Autoriser et commencer', primary: true, close: false, onClick: function () { finish(); return false; } });
      if (!m) m = T.modal({ title: s.t, html: s.h, dismissable: false, buttons: btns });
      else { m.el.querySelector('.modal-head h2').textContent = s.t; m.setBody(s.h); m.setButtons(btns); }
    }
    function finish() {
      var st = T.store.s; st.flags.onboarded = true; T.store.save();
      T.native.askPermissionsOnce().then(function () {}, function () {}).then(function () { m.close(); T.render(); });
    }
    show();
  }

  /* ---------- Démarrage ---------- */
  function boot() {
    if (window.__TIFA_INCOMPAT) { document.getElementById('incompat').hidden = false; T.native.hideSplash(); window.__TIFA_STARTED = true; return; }
    T.store.init().then(function () { return T.licence.init().catch(function () {}); }).then(function () {
      T.applyDisplay(); T.native.info(); T.native.checkOnline();
      return T.updater.boot().catch(function () {});
    }).then(function () {
      document.getElementById('app').hidden = false;
      T.render(); window.__TIFA_STARTED = true; T.native.hideSplash();
      T.voice.init();
      T.native.onBack(onBack);
      T.native.onResume(function () { T.native.checkOnline(); });
      setTimeout(function () { T.updater.markHealthy(); }, 3000);
      if (!T.store.s.flags.onboarded) onboarding(); else setTimeout(function () { T.updater.autoCheck(); }, 2500);
    }).catch(function (e) {
      if (window.console) console.error(e);
      document.getElementById('app').hidden = false; document.getElementById('view').innerHTML = errorPage().html; window.__TIFA_STARTED = true; T.native.hideSplash();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
