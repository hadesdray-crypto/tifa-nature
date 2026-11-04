/* Tifa Nature - région du jardin : adapte le calendrier (semis, plantation, récolte) au climat.
   Aucune localisation n'est demandée : la personne choisit elle-même une région dans une liste. */
(function () {
  'use strict';
  var T = window.T, R = T.region = {};

  /* Décalage en mois du printemps/été par rapport à un climat « centre » (valeur positive = plus tard).
     Le sud-ouest (-0,5 mois) est arrondi à 0 : le calendrier ne gère pas les demi-mois. */
  R.LIST = [
    { id: 'mediterranee', nom: 'Méditerranée', villes: 'Marseille, Nice, Montpellier, Perpignan, Ajaccio', shift: -1, derniere: 'fin février à mi-mars (rare sur la côte)', premiere: 'décembre, parfois pas du tout', note: 'Printemps précoce, été chaud et sec : on sème plus tôt et on arrose davantage.' },
    { id: 'sudouest', nom: 'Sud-Ouest', villes: 'Bordeaux, Toulouse, Pau, Biarritz, Agen', shift: 0, derniere: 'fin mars à début avril', premiere: 'début novembre', note: 'Climat doux et assez humide, proche du calendrier de base.' },
    { id: 'ouest', nom: 'Ouest et côte atlantique', villes: 'Nantes, Rennes, Brest, La Rochelle, Angers', shift: 0, derniere: 'mi-mars à début avril (plus tôt près de la mer)', premiere: 'fin novembre', note: 'Hivers doux, étés tempérés : le calendrier de base convient bien.' },
    { id: 'centre', nom: 'Centre et région parisienne', villes: 'Paris, Orléans, Tours, Lyon, Dijon', shift: 0, derniere: 'mi-avril (Saints de glace à la mi-mai pour les plantes frileuses)', premiere: 'mi-octobre à début novembre', note: 'C\'est le calendrier de base de l\'application.' },
    { id: 'nord', nom: 'Nord', villes: 'Lille, Amiens, Rouen, Caen, Calais', shift: 1, derniere: 'mi à fin avril', premiere: 'fin octobre', note: 'Printemps plus tardif : on attend un mois de plus, et on plante les arbustes plus tôt à l\'automne.' },
    { id: 'est', nom: 'Est', villes: 'Strasbourg, Metz, Nancy, Mulhouse, Reims', shift: 1, derniere: 'fin avril à début mai', premiere: 'mi-octobre', note: 'Hivers froids, étés chauds : on attend un mois de plus au printemps.' },
    { id: 'montagne', nom: 'Montagne', villes: 'Alpes, Pyrénées, Massif central, Jura, Vosges (au-dessus de 800 m)', shift: 2, derniere: 'mi-mai à juin', premiere: 'septembre à début octobre', note: 'Saison courte : deux mois de décalage, protégez les pots dès septembre.' }
  ];

  function byId(id) { for (var i = 0; i < R.LIST.length; i++) if (R.LIST[i].id === id) return R.LIST[i]; return null; }
  R.byId = byId;

  /* Région choisie (objet) ou null si la personne n'a pas choisi. Lecture défensive. */
  R.current = function () {
    var s = T.store && T.store.s && T.store.s.settings;
    return byId(s && s.region);
  };
  R.set = function (id) {
    var s = T.store.s.settings; s.region = byId(id) ? id : null; T.store.save();
  };

  /* Décalage de base : printemps/été (défaut) ; si autumn est vrai, l'inverse (plantations d'automne plus tôt au nord). */
  R.shift = function (autumn) {
    var r = R.current(), v = r ? r.shift : 0;
    return autumn ? -v : v;
  };

  function wrap(m) { return ((Math.round(m) - 1) % 12 + 12) % 12 + 1; }

  /* Mois réel dans la région pour un mois de référence du calendrier.
     kind : 'semis' ou 'plantation' -> les mois d'août à décembre suivent le décalage inverse ;
     'recolte', 'floraison', 'taille' -> décalage du printemps toute l'année. Sans kind : règle des saisons. */
  R.adjust = function (mois, kind) {
    var autumnRule = (!kind || kind === 'semis' || kind === 'plantation') && mois >= 8;
    return wrap(mois + R.shift(autumnRule));
  };
  R.adjustList = function (arr, kind) {
    var out = [];
    (arr || []).forEach(function (m) { var x = R.adjust(m, kind); if (out.indexOf(x) < 0) out.push(x); });
    return out.sort(function (a, b) { return a - b; });
  };
  /* Mois de référence à consulter dans le calendrier de base pour le mois réel donné. */
  R.refMonth = function (mois, kind) {
    var autumnRule = (!kind || kind === 'semis' || kind === 'plantation') && mois >= 8;
    return wrap(mois - R.shift(autumnRule));
  };

  var KINDS = { semis: 'semis', semer: 'semis', plantation: 'plantation', planter: 'plantation', recolte: 'recolte', recolter: 'recolte', floraison: 'floraison', taille: 'taille', tailler: 'taille' };
  /* Plantes à semer / planter / récolter ce mois-ci (ou le mois donné) selon la région. */
  R.plantsNow = function (kind, mois) {
    var k = KINDS[kind] || kind, m = mois || T.monthNow(), out = [];
    T.D.plantes.forEach(function (p) {
      var arr = p[k]; if (!arr || !arr.length) return;
      for (var i = 0; i < arr.length; i++) { if (R.adjust(arr[i], k) === m) { out.push(p); return; } }
    });
    return out;
  };
  /* Les mois d'une plante pour ce geste, adaptés à la région. */
  R.monthsFor = function (p, kind) { return R.adjustList(p && p[KINDS[kind] || kind], KINDS[kind] || kind); };

  /* Texte court sur la région choisie (gelées, décalage). */
  R.summaryHtml = function () {
    var r = R.current();
    if (!r) return '<div class="notice" id="region-note"><b>Région non choisie.</b> Choisissez-la pour adapter le calendrier à votre climat. Rien n\'est demandé à votre téléphone.</div>';
    var sh = r.shift === 0 ? 'Calendrier de base, sans décalage.' : (r.shift < 0 ? 'Semis et plantations de printemps ' + Math.abs(r.shift) + ' mois plus tôt.' : 'Semis et plantations de printemps ' + r.shift + ' mois plus tard.');
    return '<div class="notice ok" id="region-note"><b>Ma région : ' + T.esc(r.nom) + '</b><br>' + T.esc(sh) + '<br><span class="small">Dernière gelée en moyenne : ' + T.esc(r.derniere) + '.<br>Première gelée en moyenne : ' + T.esc(r.premiere) + '.</span></div>';
  };

  /* Sélecteur : une grosse touche par région, avec des exemples de villes. */
  R.pickerHtml = function () {
    var cur = R.current(), h = '<p class="small muted">Choisissez la région qui ressemble le plus à la vôtre. Ce sont des exemples : aucune localisation n\'est demandée.</p><div class="region-list">';
    R.LIST.forEach(function (r) {
      var on = cur && cur.id === r.id;
      h += '<button class="region-btn' + (on ? ' on' : '') + '" data-act="setregion" data-id="' + r.id + '" aria-pressed="' + (on ? 'true' : 'false') + '"><b>' + T.esc(r.nom) + (on ? ' (choisie)' : '') + '</b><span>' + T.esc(r.villes) + '</span><span class="small">Dernière gelée : ' + T.esc(r.derniere) + '</span></button>';
    });
    h += '<button class="region-btn" data-act="setregion" data-id=""><b>Je ne veux pas choisir</b><span>Le calendrier de base est utilisé.</span></button></div>';
    return h;
  };
  T.act.regionpick = function () {
    T.modal({ title: 'Ma région', html: R.pickerHtml(), buttons: [{ label: 'Fermer' }] });
  };
  T.act.setregion = function (el) {
    var id = el.getAttribute('data-id') || '';
    R.set(id);
    T.closeModal();
    var r = R.current();
    T.toast(r ? 'Région enregistrée : ' + r.nom + '.' : 'Calendrier de base utilisé.');
    T.render(true);
  };
})();
