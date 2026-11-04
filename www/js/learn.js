/* Tifa Nature - conseils par thème, guides pas à pas et calendrier du jardin. */
(function () {
  'use strict';
  var T = window.T, L = T.learn = {};

  L.tipOfDay = function () {
    var n = T.D.conseils.length; if (!n) return null;
    var d = new Date(), start = new Date(d.getFullYear(), 0, 0), day = Math.floor((d - start) / 86400000);
    return T.D.conseils[day % n];
  };
  L.tipCard = function (c, full) {
    var h = '<div class="card"><div class="tags"><span class="tag">' + T.esc(T.THEMES[c.theme] || c.theme) + '</span></div><h3>' + T.esc(c.titre) + '</h3><p>' + T.esc(c.texte) + '</p>';
    if (c.astuce) h += '<div class="notice ok"><b>Astuce :</b> ' + T.esc(c.astuce) + '</div>';
    h += '<div class="row">' + T.voice.button(c.titre + '. ' + c.texte + ' Astuce : ' + (c.astuce || ''), 'Écouter') + '</div></div>';
    return h;
  };
  L.month = function (m) { return T.D.calendrier.filter(function (x) { return x.mois === m; })[0] || null; };

  /* ---------- Onglet Conseils ---------- */
  T.route(/^\/conseils$/, 'conseils', function () {
    var cm = L.month(T.monthNow()), tip = L.tipOfDay(), h = '';
    h += '<div class="hero"><h2>Conseils</h2><p>Tout ce qu\'il faut savoir pour un petit jardin heureux.</p></div>';
    if (cm) h += '<a class="item" href="#/calendrier/' + cm.mois + '"><b>Calendrier : ' + T.esc(cm.nom) + '</b><i>' + T.esc(cm.resume) + '</i></a>';
    h += '<a class="item" href="#/calendrier"><b>Calendrier du jardin, mois par mois</b><i>Quoi semer, planter, récolter</i></a>';
    if (tip) h += '<h2>Conseil du jour</h2>' + L.tipCard(tip);
    h += '<h2>Guides pas à pas</h2>' + T.D.guides.map(function (g) { return '<a class="item" href="#/guide/' + T.esc(g.id) + '"><b>' + T.esc(g.titre) + '</b><i>' + T.esc(g.intro) + '</i></a>'; }).join('');
    h += '<h2>Conseils par thème</h2><div class="big-grid">' + Object.keys(T.THEMES).map(function (k) {
      var n = T.D.conseils.filter(function (c) { return c.theme === k; }).length;
      return n ? '<a class="big" href="#/conseils/' + k + '"><b>' + T.esc(T.THEMES[k]) + '</b><span>' + n + ' conseils</span></a>' : '';
    }).join('') + '</div>';
    return { title: 'Conseils', html: h };
  }, true);
  T.route(/^\/conseils\/([a-z_]+)$/, 'conseils', function (m) {
    var k = m[1], list = T.D.conseils.filter(function (c) { return c.theme === k; });
    if (!list.length) return { title: 'Conseils', html: '<div class="notice warn">Ce thème n\'existe pas. <a href="#/conseils">Retour aux conseils</a></div>' };
    return { title: T.THEMES[k] || 'Conseils', html: list.map(function (c) { return L.tipCard(c); }).join('') };
  });
  T.route(/^\/conseil\/([^/]+)$/, 'conseils', function (m) {
    var c = T.byId(T.D.conseils, decodeURIComponent(m[1]));
    return c ? { title: 'Conseil', html: L.tipCard(c) } : { title: 'Conseil', html: '<div class="notice warn">Ce conseil n\'existe pas. <a href="#/conseils">Retour</a></div>' };
  });

  /* ---------- Guides ---------- */
  T.route(/^\/guide\/([^/]+)$/, 'conseils', function (m) {
    var g = T.byId(T.D.guides, decodeURIComponent(m[1]));
    if (!g) return { title: 'Guide', html: '<div class="notice warn">Ce guide n\'existe pas. <a href="#/conseils">Retour</a></div>' };
    var h = '<div class="card"><h2>' + T.esc(g.titre) + '</h2><p>' + T.esc(g.intro) + '</p><div class="row">' + T.voice.button(g.titre + '. ' + g.intro + ' ' + g.etapes.map(function (e, i) { return 'Étape ' + (i + 1) + '. ' + e; }).join(' '), 'Écouter le guide') + '</div></div>';
    h += '<div class="card"><h3>Les étapes</h3><ol class="steps">' + T.list(g.etapes) + '</ol></div>';
    if ((g.aSavoir || []).length) h += '<div class="card"><h3>À savoir</h3><ul>' + T.list(g.aSavoir) + '</ul></div>';
    return { title: 'Guide', html: h };
  });

  /* ---------- Calendrier ---------- */
  function monthChips(cur) {
    return '<div class="chips" role="group" aria-label="Mois">' + T.MOIS.map(function (n, i) { return '<a class="chip' + (cur === i + 1 ? ' on' : '') + '" style="text-decoration:none;display:inline-flex;align-items:center" href="#/calendrier/' + (i + 1) + '">' + T.esc(n) + '</a>'; }).join('') + '</div>';
  }
  function nameChips(arr) {
    if (!arr || !arr.length) return '<p class="muted small">Rien de particulier ce mois-ci.</p>';
    return '<div class="chips">' + arr.map(function (n) { return '<button class="chip" data-act="searchfor" data-q="' + T.esc(n) + '">' + T.esc(n) + '</button>'; }).join('') + '</div>';
  }
  function calPage(mois) {
    var c = L.month(mois);
    if (!c) return { title: 'Calendrier', html: '<div class="notice warn">Ce mois n\'existe pas.</div>' };
    var h = monthChips(mois) + '<div class="card"><h2>' + T.esc(c.nom) + '</h2><p>' + T.esc(c.resume) + '</p><div class="row">' + T.voice.button(c.nom + '. ' + c.resume + ' À faire : ' + c.aFaire.join('. '), 'Écouter le mois') + '</div></div>';
    h += '<div class="card"><h3>À faire dans la cour</h3><ul>' + T.list(c.aFaire) + '</ul></div>';
    h += '<div class="card"><h3>À semer</h3>' + nameChips(c.semer) + '<h3>À planter</h3>' + nameChips(c.planter) + '<h3>À récolter</h3>' + nameChips(c.recolter) + '</div>';
    h += '<div class="card"><h3>À protéger</h3><ul>' + T.list(c.proteger) + '</ul></div>';
    if (c.astuce) h += '<div class="notice ok"><b>Astuce :</b> ' + T.esc(c.astuce) + '</div>';
    return { title: 'Calendrier : ' + c.nom, html: h };
  }
  T.route(/^\/calendrier$/, 'conseils', function () { return calPage(T.monthNow()); });
  T.route(/^\/calendrier\/(\d{1,2})$/, 'conseils', function (m) { return calPage(parseInt(m[1], 10)); });
})();
