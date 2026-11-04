/* Tifa Nature - photo, reconnaissance des plantes (Pl@ntNet en ligne) et mode guidé sans connexion. */
(function () {
  'use strict';
  var T = window.T, I = T.ident = { photo: null, blob: null, organ: 'auto', busy: false, results: null, error: '', guide: { cat: '', lieu: '', fleurit: '' } };
  var PN = T.plantnet = {};
  var ORGANS = [['auto', 'Je ne sais pas'], ['leaf', 'Feuille'], ['flower', 'Fleur'], ['fruit', 'Fruit'], ['bark', 'Écorce']];

  function dataUrlToBlob(u) {
    try {
      var p = u.split(','), mime = (p[0].match(/:(.*?);/) || [0, 'image/jpeg'])[1], bin = atob(p[1]), n = bin.length, a = new Uint8Array(n);
      while (n--) a[n] = bin.charCodeAt(n);
      return new Blob([a], { type: mime });
    } catch (e) { return null; }
  }

  /* ---------- Photo (commun à la reconnaissance et au diagnostic) ---------- */
  T.photoFlow = function (target, source) {
    T.native.photo(source).then(function (url) { return T.shrink(url, 1280); }).then(function (r) {
      target.photo = r.dataUrl; target.blob = r.blob || dataUrlToBlob(r.dataUrl); target.results = null; target.error = ''; T.render(true);
    }).catch(function (e) {
      if (e && e.message === 'annule') return;
      T.toast('La photo n\'a pas pu être prise. Réessayez, ou choisissez une photo dans la galerie.', 3600);
    });
  };
  T.photoCard = function (target, ctx, title, intro) {
    var h = '<div class="card"><h2>' + T.esc(title) + '</h2><p>' + T.esc(intro) + '</p>';
    h += '<div class="row"><button class="btn primary grow" data-act="photoget" data-ctx="' + ctx + '" data-src="camera">Prendre une photo</button><button class="btn grow" data-act="photoget" data-ctx="' + ctx + '" data-src="gallery">Choisir une photo</button></div>';
    if (target.photo) h += '<img class="photo" alt="Votre photo" src="' + T.esc(target.photo) + '">';
    return h;
  };
  T.act.photoget = function (el) { T.photoFlow(el.getAttribute('data-ctx') === 'diag' ? T.diag : I, el.getAttribute('data-src')); };

  /* ---------- Service Pl@ntNet ---------- */
  PN.status = function () {
    if (!T.cfg.PLANTNET_API_KEY) return 'nokey';
    if (!T.native.online) return 'offline';
    return 'ok';
  };
  PN.post = function (path, field, blob, organ) {
    var url = T.cfg.PLANTNET_URL + path + '?api-key=' + encodeURIComponent(T.cfg.PLANTNET_API_KEY) + '&lang=fr&nb-results=5';
    function build() { var fd = new FormData(); fd.append(field, blob, 'photo.jpg'); fd.append('organs', organ || 'auto'); return fd; }
    function parse(status, text) {
      if (status === 404) return { results: [] };
      if (status < 200 || status >= 300) { var e = new Error('http ' + status); e.status = status; throw e; }
      return JSON.parse(text);
    }
    function viaFetch() {
      var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 30000);
      return fetch(url, { method: 'POST', body: build(), signal: ctl ? ctl.signal : undefined }).then(function (r) { clearTimeout(to); return r.text().then(function (t) { return parse(r.status, t); }); }, function (e) { clearTimeout(to); throw e; });
    }
    function viaXhr() {
      return new Promise(function (resolve, reject) {
        var x = new XMLHttpRequest(); x.open('POST', url); x.timeout = 30000;
        x.onload = function () { try { resolve(parse(x.status, x.responseText)); } catch (e) { reject(e); } };
        x.onerror = function () { reject(new Error('reseau')); }; x.ontimeout = function () { reject(new Error('delai')); };
        x.send(build());
      });
    }
    return viaFetch().catch(function (e) { if (e && e.status) throw e; return viaXhr(); });   /* cascade : fetch puis XHR */
  };
  PN.identify = function (blob, organ) { return PN.post('/v2/identify/all', 'images', blob, organ); };
  PN.diagnose = function (blob, organ) { return PN.post('/v2/diseases/identify', 'image', blob, organ); };

  /* ---------- Reconnaissance : correspondance avec les fiches de l'appli ---------- */
  function localMatch(sci, commons) {
    var s = T.norm(sci).split(' ').slice(0, 2).join(' '), i, p, names = (commons || []).map(T.norm);
    for (i = 0; i < T.D.plantes.length; i++) {
      p = T.D.plantes[i]; var l = T.norm(p.latin);
      if (s && (l.indexOf(s) === 0 || s.indexOf(l.split(' ').slice(0, 2).join(' ')) === 0)) return p;
    }
    for (i = 0; i < T.D.plantes.length; i++) {
      p = T.D.plantes[i]; var all = [T.norm(p.nom)].concat((p.synonymes || []).map(T.norm));
      if (names.some(function (n) { return all.indexOf(n) >= 0; })) return p;
    }
    return null;
  }
  function resultCard(r) {
    var sp = r.species || {}, sci = sp.scientificNameWithoutAuthor || sp.scientificName || 'Nom inconnu', cn = (sp.commonNames || []).slice(0, 3), pct = Math.round((r.score || 0) * 100);
    var lp = localMatch(sci, cn), title = cn[0] || sci;
    return '<div class="card"><h3>' + T.esc(title) + '</h3><p class="muted small"><i>' + T.esc(sci) + '</i>' + (sp.family && sp.family.scientificNameWithoutAuthor ? ' - famille ' + T.esc(sp.family.scientificNameWithoutAuthor) : '') + '</p>' +
      '<div class="tags"><span class="tag ' + (pct >= 60 ? 'ok' : (pct >= 30 ? 'warn' : '')) + '">Certitude : ' + pct + ' %</span></div>' +
      (lp ? '<a class="btn primary block" href="#/plante/' + T.esc(lp.id) + '">Voir la fiche : ' + T.esc(lp.nom) + '</a>' : '<button class="btn block" data-act="searchfor" data-q="' + T.esc(cn[0] || sci.split(' ')[0]) + '">Chercher dans l\'application</button>') + '</div>';
  }

  /* ---------- Mode guidé hors connexion ---------- */
  var G_CATS = [['', 'Je ne sais pas'], ['legume', 'Légume'], ['aromatique', 'Aromatique'], ['fleur', 'Fleur'], ['arbuste', 'Arbuste'], ['grimpante', 'Grimpante'], ['interieur', 'Plante d\'intérieur'], ['fruitier', 'Fruitier'], ['succulente', 'Succulente'], ['ombre', 'Plante d\'ombre']];
  var G_LIEU = [['', 'Je ne sais pas'], ['plein_soleil', 'Dehors, plein soleil'], ['mi_ombre', 'Dehors, mi-ombre'], ['ombre', 'Dehors, ombre'], ['interieur', 'À l\'intérieur']];
  function guided() {
    var g = I.guide, m = T.monthNow();
    var list = T.D.plantes.filter(function (p) {
      if (g.cat && p.categorie !== g.cat) return false;
      if (g.lieu === 'interieur' && !p.interieur) return false;
      if (g.lieu && g.lieu !== 'interieur' && (p.soleil || []).indexOf(g.lieu) < 0) return false;
      if (g.fleurit === 'oui' && (p.floraison || []).indexOf(m) < 0) return false;
      if (g.fleurit === 'non' && (p.floraison || []).indexOf(m) >= 0) return false;
      return true;
    });
    return list;
  }
  function chipsFor(opts, cur, key) { return '<div class="chips">' + opts.map(function (o) { return '<button class="chip' + (cur === o[0] ? ' on' : '') + '" data-act="gset" data-key="' + key + '" data-val="' + T.esc(o[0]) + '" aria-pressed="' + (cur === o[0]) + '">' + T.esc(o[1]) + '</button>'; }).join('') + '</div>'; }
  T.act.gset = function (el) { I.guide[el.getAttribute('data-key')] = el.getAttribute('data-val'); T.render(true); };
  T.act.organ = function (el) { I.organ = el.getAttribute('data-val'); T.render(true); };
  T.act.identreset = function () { I.photo = null; I.blob = null; I.results = null; I.error = ''; I.guide = { cat: '', lieu: '', fleurit: '' }; T.render(); };
  T.act.identgo = function () {
    if (!I.photo || !I.blob) { T.toast('Prenez d\'abord une photo.'); return; }
    if (PN.status() !== 'ok') { T.toast('La reconnaissance par photo n\'est pas disponible pour le moment.'); return; }
    I.busy = true; I.error = ''; I.results = null; T.render(true);
    PN.identify(I.blob, I.organ).then(function (j) { I.results = (j && j.results) || []; }, function (e) {
      I.error = (e && e.status === 429) ? 'Le service de reconnaissance est très demandé aujourd\'hui. Réessayez plus tard, ou utilisez le mode guidé.' : 'La reconnaissance n\'a pas pu se faire (connexion ou service indisponible). Utilisez le mode guidé ci-dessous.';
    }).then(function () { I.busy = false; T.render(true); });
  };

  T.route(/^\/photo$/, 'trouver', function () {
    var st = PN.status(), h = T.photoCard(I, 'ident', 'Reconnaître une plante', 'Prenez en photo une feuille ou une fleur, bien nette et bien éclairée, sur fond simple.');
    if (I.photo) {
      h += '<label class="lbl">Que montre la photo ?</label><div class="chips">' + ORGANS.map(function (o) { return '<button class="chip' + (I.organ === o[0] ? ' on' : '') + '" data-act="organ" data-val="' + o[0] + '" aria-pressed="' + (I.organ === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>';
      h += '<button class="btn primary block" data-act="identgo"' + (st !== 'ok' || I.busy ? ' disabled' : '') + '>Reconnaître cette plante</button>';
    }
    if (st === 'nokey') h += '<div class="notice">La reconnaissance par photo n\'est pas activée dans cette version. Le mode guidé ci-dessous fonctionne sans connexion.</div>';
    else if (st === 'offline') h += '<div class="notice warn">Pas de connexion internet : la reconnaissance par photo est en pause. Utilisez le mode guidé ci-dessous.</div>';
    if (I.busy) h += '<div class="notice"><b>Analyse en cours…</b> Cela peut prendre quelques secondes.</div>';
    if (I.error) h += '<div class="notice bad">' + T.esc(I.error) + '</div>';
    h += '</div>';
    if (I.results) {
      if (!I.results.length) h += '<div class="notice warn">Aucune plante reconnue sur cette photo. Essayez une photo plus nette, avec une seule feuille ou fleur bien visible.</div>';
      else h += '<h2>Résultats possibles</h2><p class="muted small">Résultat indicatif : comparez toujours avec la fiche et votre plante.</p>' + I.results.slice(0, 4).map(resultCard).join('');
    }
    var cand = guided(), anyG = I.guide.cat || I.guide.lieu || I.guide.fleurit;
    h += '<div class="card"><h2>Mode guidé (sans connexion)</h2><p class="muted small">Répondez aux questions : l\'application propose des pistes parmi ses fiches.</p>' +
      '<label class="lbl">Quel genre de plante ?</label>' + chipsFor(G_CATS, I.guide.cat, 'cat') +
      '<label class="lbl">Où pousse-t-elle ?</label>' + chipsFor(G_LIEU, I.guide.lieu, 'lieu') +
      '<label class="lbl">Fleurit-elle en ce moment ?</label>' + chipsFor([['', 'Je ne sais pas'], ['oui', 'Oui'], ['non', 'Non']], I.guide.fleurit, 'fleurit') + '</div>';
    if (anyG) {
      h += '<h2>' + cand.length + ' piste' + (cand.length > 1 ? 's' : '') + '</h2>' + (cand.length ? cand.slice(0, 20).map(T.search.item).join('') : '<div class="notice warn">Aucune fiche ne correspond. Changez une réponse (par exemple « Je ne sais pas »).</div>');
      if (cand.length > 20) h += '<p class="muted small">Répondez à plus de questions pour réduire la liste.</p>';
    }
    if (I.photo || anyG || I.results) h += '<button class="btn block" data-act="identreset">Recommencer</button>';
    return { title: 'Reconnaître une plante', html: h };
  });
})();
