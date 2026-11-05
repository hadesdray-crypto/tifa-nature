/* Tifa Nature - « Gestes du jardinier » : procédures pas à pas, illustrées, lisibles à voix haute.
   Données : data/gestes.js (T.D.gestes). Progression : T.store.s.gestes = { prog: { id: { step, done[], mat[] } }, fini: { id: date }, rec: [ids] }.
   API : T.gestes = { all(), get(id), search(q), suggestionPourLeMois(mois?), cats(), schemas() }.
   Routes : #/gestes (accueil du module), #/geste/<id> (la procédure). Aucun minuteur système. */
(function () {
  'use strict';
  var T = window.T, GZ = T.gestes = {}, esc = T.esc;
  var qState = '', catState = '', modeState = '', OV = null, idx = null;

  function LIST() { return (T.D && Array.isArray(T.D.gestes)) ? T.D.gestes : []; }
  function CATS() { return (T.D && Array.isArray(T.D.gestesCats)) ? T.D.gestesCats : []; }
  function catName(id) { var c = CATS().filter(function (x) { return x.id === id; })[0]; return c ? c.nom : ''; }

  /* ---------- Schémas SVG (sobres, couleurs du thème, sans texte décoratif) ---------- */
  var SV = {
    pot: ['Pot vu en coupe : billes au fond, terreau, racines, la motte 2 cm sous le bord.',
      '<path class="gz-t" d="M54 60h92l-8 52H62z"/><path class="gz-l" d="M46 50h108M52 50l10 62h76l10-62"/><g class="gz-f gz-l"><circle cx="76" cy="105" r="4"/><circle cx="90" cy="105" r="4"/><circle cx="104" cy="105" r="4"/><circle cx="118" cy="105" r="4"/></g><path class="gz-l" d="M100 60V24"/><path class="gz-f gz-l" d="M100 40c-16 0-26-8-28-16 16-2 26 4 28 16zM100 34c16 0 26-8 28-16-16-2-26 4-28 16z"/><path class="gz-l" d="M100 60c-8 10-12 18-18 30M100 60c0 12 2 22 0 36M100 60c8 10 12 18 18 30"/><path class="gz-k" d="M162 50v10M158 50h8M158 60h8"/><text class="gz-tx" x="170" y="58">2 cm</text><text class="gz-tx" x="100" y="123" text-anchor="middle">billes au fond</text>'],
    tige: ['Tige avec trois nœuds, d\'où partent les feuilles.',
      '<path class="gz-l" d="M100 118V10"/><g class="gz-f gz-l"><circle cx="100" cy="90" r="5"/><circle cx="100" cy="60" r="5"/><circle cx="100" cy="30" r="5"/><path d="M100 90c-14-2-24-10-26-18 14-1 24 5 26 18zM100 90c14-2 24-10 26-18-14-1-24 5-26 18z"/><path d="M100 60c-14-2-24-10-26-18 14-1 24 5 26 18zM100 60c14-2 24-10 26-18-14-1-24 5-26 18z"/><path d="M100 30c-12-2-20-8-22-14 12-1 20 4 22 14zM100 30c12-2 20-8 22-14-12-1-20 4-22 14z"/></g><path class="gz-k" d="M108 60h28"/><text class="gz-tx" x="140" y="64">nœud</text>'],
    biseau: ['Tige coupée en biseau, juste au-dessus d\'un bourgeon.',
      '<path class="gz-f gz-l" d="M94 120V52l12-10V120z"/><path class="gz-l gz-d" d="M94 52V14M106 42V14"/><path class="gz-f gz-l" d="M106 84c10-4 20-2 24-12-10 0-20 4-24 12z"/><path class="gz-k" d="M86 58L114 38"/><text class="gz-tx" x="6" y="28">coupe en</text><text class="gz-tx" x="6" y="40">biseau</text><text class="gz-tx" x="134" y="80">bourgeon</text>'],
    racines: ['À gauche des racines saines, à droite des racines abîmées à couper.',
      '<path class="gz-t" d="M24 40c0-12 52-12 52 0v28c0 20-52 20-52 0z"/><path class="gz-l" d="M36 70c-2 14 0 20-4 28M50 72c0 12 0 22 0 30M64 70c2 14 2 20 6 28"/><path class="gz-t" d="M124 40c0-12 52-12 52 0v28c0 20-52 20-52 0z"/><path class="gz-l" d="M136 70c-2 14 0 20-4 28M150 72c0 12 0 22 0 30M164 70c2 14 2 20 6 28"/><path class="gz-k gz-d" d="M120 88h60"/><text class="gz-tx" x="50" y="118" text-anchor="middle">saines</text><text class="gz-tx" x="150" y="118" text-anchor="middle">à couper</text>'],
    eau: ['Bocal d\'eau avec une tige dont le nœud trempe dans l\'eau.',
      '<path class="gz-w" d="M70 62v38c0 8 6 12 14 12h32c8 0 14-4 14-12V62z"/><path class="gz-l" d="M70 30v70c0 8 6 12 14 12h32c8 0 14-4 14-12V30"/><path class="gz-l" d="M100 8V92"/><circle class="gz-f gz-l" cx="100" cy="84" r="4"/><path class="gz-f gz-l" d="M100 22c-12-2-20-8-22-14 12-1 20 4 22 14zM100 22c12-2 20-8 22-14-12-1-20 4-22 14z"/><path class="gz-l" d="M100 90c-6 6-10 8-12 14M100 90c4 8 6 10 6 16"/><path class="gz-k" d="M118 62h24"/><text class="gz-tx" x="146" y="60">niveau</text><text class="gz-tx" x="146" y="72">de l\'eau</text>'],
    marcotte: ['Branche couchée dans la terre et maintenue par un crochet, le bout dressé sur un tuteur.',
      '<rect class="gz-t" x="0" y="70" width="200" height="56"/><path class="gz-l" d="M0 70H200"/><path class="gz-l" d="M20 70V30"/><path class="gz-f gz-l" d="M20 44c-12 0-18-6-20-12 12-2 18 2 20 12zM20 38c12 0 18-6 20-12-12-2-18 2-20 12z"/><path class="gz-l" d="M20 50C46 46 56 66 72 84S120 96 138 80S154 56 154 26"/><path class="gz-k" d="M96 78v18M90 96h12"/><path class="gz-l" d="M164 20V76"/><text class="gz-tx" x="4" y="20">plante mère</text><text class="gz-tx" x="100" y="118" text-anchor="middle">branche enterrée</text>'],
    aerien: ['Tige entourée d\'une boule de mousse humide fermée par un film.',
      '<path class="gz-l" d="M100 120V14"/><path class="gz-f gz-l" d="M100 24c-14-2-24-8-26-16 14-2 24 4 26 16zM100 24c14-2 24-8 26-16-14-2-24 4-26 16z"/><rect class="gz-w gz-l" x="78" y="44" width="44" height="50" rx="16"/><path class="gz-l" d="M92 78c-2 6-2 10-4 14M100 80c0 6 0 10 0 14M108 78c2 6 2 10 4 14"/><path class="gz-k" d="M76 48h48M76 90h48"/><text class="gz-tx" x="6" y="68">mousse</text><text class="gz-tx" x="6" y="80">humide</text><text class="gz-tx" x="130" y="50">film</text>'],
    division: ['Une grosse touffe à gauche, deux morceaux séparés à droite.',
      '<rect class="gz-t" x="0" y="84" width="200" height="42"/><path class="gz-l" d="M0 84H200"/><g class="gz-f gz-l"><path d="M18 84c0-24 6-40 22-40s22 16 22 40z"/></g><path class="gz-l" d="M30 84v-24M40 84V50M50 84v-24"/><path class="gz-l" d="M76 62h22M92 56l6 6-6 6"/><g class="gz-f gz-l"><path d="M112 84c0-16 4-28 14-28s14 12 14 28z"/><path d="M156 84c0-16 4-28 14-28s14 12 14 28z"/></g><text class="gz-tx" x="40" y="108" text-anchor="middle">1 touffe</text><text class="gz-tx" x="148" y="108" text-anchor="middle">2 morceaux</text>'],
    godet: ['Petit pot de terre avec une graine enterrée à deux fois sa taille et une plantule qui sort.',
      '<path class="gz-t" d="M60 48h80l-8 62H68z"/><path class="gz-l" d="M54 40h92M60 40l8 70h64l8-70"/><circle class="gz-f gz-l" cx="116" cy="72" r="4"/><path class="gz-k" d="M130 48v24M126 48h8M126 72h8"/><text class="gz-tx" x="152" y="64">2 fois</text><text class="gz-tx" x="152" y="76">sa taille</text><path class="gz-l" d="M82 48V28"/><path class="gz-f gz-l" d="M82 30c-8 0-14-4-16-8 8-2 14 2 16 8zM82 30c8 0 14-4 16-8-8-2-14 2-16 8z"/><path class="gz-l" d="M82 48c-2 8-2 12-4 18"/>'],
    trou: ['Trou large dans le sol avec une motte posée au niveau du sol.',
      '<rect class="gz-t" x="0" y="52" width="200" height="74"/><path class="gz-card" d="M36 52h128v52H36z"/><path class="gz-l" d="M36 52v52h128V52"/><path class="gz-f gz-l" d="M78 62h44v30c0 8-10 12-22 12s-22-4-22-12z"/><path class="gz-l" d="M100 62V22"/><path class="gz-f gz-l" d="M100 40c-14 0-24-8-26-16 14-2 24 4 26 16zM100 34c14 0 24-8 26-16-14-2-24 4-26 16z"/><path class="gz-k gz-d" d="M4 52H196"/><text class="gz-tx" x="100" y="120" text-anchor="middle">trou plus large que la motte</text>'],
    tuteur: ['Tuteur planté près de la tige, avec un lien en forme de huit.',
      '<rect class="gz-t" x="0" y="104" width="200" height="22"/><path class="gz-l" d="M150 14V110"/><path class="gz-l" d="M100 108C100 80 106 50 106 22"/><path class="gz-f gz-l" d="M104 54c-14 0-22-6-24-12 12-2 22 2 24 12zM106 36c14 0 22-6 24-12-12-2-22 2-24 12z"/><path class="gz-k" d="M106 66C124 66 130 80 150 80M106 80C124 80 130 66 150 66"/><text class="gz-tx" x="6" y="30">lien en huit</text>'],
    paillage: ['Paillis étalé sur la terre, avec un vide autour de la tige.',
      '<rect class="gz-t" x="0" y="86" width="200" height="40"/><path class="gz-m" d="M6 72h78v14H6zM116 72h78v14h-78z"/><path class="gz-l" d="M100 86V22"/><path class="gz-f gz-l" d="M100 44c-14 0-22-6-24-12 12-2 22 2 24 12zM100 36c14 0 22-6 24-12-12-2-22 2-24 12z"/><path class="gz-k" d="M84 62h32M84 58v8M116 58v8"/><text class="gz-tx" x="100" y="54" text-anchor="middle">5 cm libres</text><text class="gz-tx" x="100" y="112" text-anchor="middle">paillis 5 à 8 cm</text>'],
    compost: ['Bac à compost en coupe : couches de déchets secs, humides, et compost mûr en bas.',
      '<path class="gz-l" d="M50 18v96h100V18"/><rect class="gz-m" x="52" y="26" width="96" height="22"/><rect class="gz-w" x="52" y="48" width="96" height="16"/><rect class="gz-m" x="52" y="64" width="96" height="20"/><rect class="gz-t" x="52" y="84" width="96" height="28"/><text class="gz-tx" x="156" y="40">secs</text><text class="gz-tx" x="156" y="60">humides</text><text class="gz-tx" x="156" y="78">secs</text><text class="gz-tx" x="156" y="102">mûr</text>'],
    greffe: ['Jeune tronc fendu au sommet et un rameau taillé en coin glissé dans la fente.',
      '<path class="gz-f gz-l" d="M82 122V62h36v60z"/><path class="gz-k gz-d" d="M100 62v26"/><path class="gz-f gz-l" d="M94 14h12v38l-6 24-6-24z"/><circle class="gz-f gz-l" cx="106" cy="28" r="3"/><circle class="gz-f gz-l" cx="94" cy="40" r="3"/><path class="gz-k" d="M60 30h30"/><text class="gz-tx" x="6" y="34">greffon</text><text class="gz-tx" x="124" y="100">porte-greffe</text>'],
    feuille: ['Longue feuille coupée en trois morceaux, chacun marqué d\'un V en haut.',
      '<path class="gz-f gz-l" d="M88 118V22c0-12 24-12 24 0V118z"/><path class="gz-k gz-d" d="M78 52H122M78 84H122"/><path class="gz-l" d="M92 66l8 6 8-6M92 98l8 6 8-6M92 36l8 6 8-6"/><text class="gz-tx" x="128" y="22">haut</text><text class="gz-tx" x="128" y="114">bas : en terre</text>'],
    taille: ['Arbuste avec une branche morte qui croise les autres, à couper.',
      '<path class="gz-l" d="M100 120V72M100 72L66 26M100 72L136 24M100 90L158 62"/><path class="gz-f gz-l" d="M66 26c-6 2-10 0-12-4 6-2 10 0 12 4zM136 24c6 2 10 0 12-4-6-2-10 0-12 4z"/><path class="gz-k" d="M138 66l14 10"/><path class="gz-k gz-d" d="M100 90L158 62"/><text class="gz-tx" x="130" y="96">à couper</text>'],
    arrosoir: ['Arrosoir qui verse l\'eau au pied de la plante, sur la terre.',
      '<path class="gz-t" d="M86 78h60l-8 38H94z"/><path class="gz-l" d="M80 70h72M86 70l8 46h44l8-46"/><path class="gz-l" d="M116 76V34"/><path class="gz-f gz-l" d="M116 50c-14 0-22-6-24-12 12-2 22 2 24 12zM116 42c14 0 22-6 24-12-12-2-22 2-24 12z"/><path class="gz-f gz-l" d="M8 18h34v26H8z"/><path class="gz-l" d="M42 26l30 14"/><path class="gz-w" d="M74 46v8M82 50v8M90 58v8"/><path class="gz-l" d="M74 46v8M82 50v8M90 58v8"/>'],
    voile: ['Plante recouverte d\'un voile d\'hivernage fermé en bas par une ficelle.',
      '<rect class="gz-t" x="0" y="104" width="200" height="22"/><path class="gz-w gz-l" d="M36 104C36 30 164 30 164 104z"/><path class="gz-l" d="M100 104V74"/><path class="gz-f gz-l" d="M100 84c-12 0-20-6-22-12 10-2 20 2 22 12zM100 78c12 0 20-6 22-12-10-2-20 2-22 12z"/><path class="gz-k" d="M38 98H162"/><text class="gz-tx" x="100" y="48" text-anchor="middle">voile</text><text class="gz-tx" x="100" y="120" text-anchor="middle">ficelle en bas</text>'],
    graines: ['Capsule ouverte avec des graines à l\'intérieur et une enveloppe en papier pour les ranger.',
      '<path class="gz-f gz-l" d="M70 20c-10 20-10 44 0 62h30c10-18 10-42 0-62z"/><g class="gz-t gz-l"><circle cx="78" cy="40" r="4"/><circle cx="90" cy="46" r="4"/><circle cx="82" cy="58" r="4"/><circle cx="94" cy="64" r="4"/></g><path class="gz-l" d="M85 82v30"/><path class="gz-f gz-l" d="M124 70h56v44h-56zM124 70l28 20 28-20"/><text class="gz-tx" x="152" y="124" text-anchor="middle">nom et année</text>'],
    limace: ['Feuille trouée avec une limace et des pucerons dessous.',
      '<path class="gz-f gz-l" d="M30 60c20-40 100-50 140-10-20 40-100 50-140 10z"/><circle class="gz-card gz-l" cx="100" cy="48" r="9"/><path class="gz-l" d="M30 60l-20 10"/><path class="gz-t gz-l" d="M60 100c20-8 50-8 70 0 6 4 6 10 0 12H64c-6-2-6-8-4-12z"/><path class="gz-l" d="M130 100l10-10M136 100l10-10"/><circle class="gz-l" cx="80" cy="84" r="2"/><circle class="gz-l" cx="90" cy="80" r="2"/><text class="gz-tx" x="100" y="124" text-anchor="middle">trous, traces brillantes</text>'],
    outil: ['Lame posée sur une pierre à aiguiser, en suivant son angle.',
      '<rect class="gz-t gz-l" x="24" y="88" width="152" height="24" rx="4"/><path class="gz-f gz-l" d="M30 74L150 48l6 10L38 90z"/><path class="gz-k" d="M44 88h26M70 88a26 26 0 0 0-4-10"/><text class="gz-tx" x="100" y="28" text-anchor="middle">suivre l\'angle</text><text class="gz-tx" x="100" y="40" text-anchor="middle">de la lame</text>']
  };
  GZ.schemas = function () { return Object.keys(SV); };
  function svg(key, big) {
    var s = SV[key]; if (!s) return '';
    return '<figure class="gz-fig' + (big ? ' big' : '') + '"><svg class="gz-svg" viewBox="0 0 200 126" role="img" aria-label="' + esc(s[0]) + '" focusable="false">' + s[1] + '</svg><figcaption>' + esc(s[0]) + '</figcaption></figure>';
  }

  /* ---------- Progression mémorisée ---------- */
  function root() {
    var s = T.store.s, g = s.gestes;
    if (!g || typeof g !== 'object' || Array.isArray(g)) g = s.gestes = {};
    if (!g.prog || typeof g.prog !== 'object' || Array.isArray(g.prog)) g.prog = {};
    if (!g.fini || typeof g.fini !== 'object' || Array.isArray(g.fini)) g.fini = {};
    if (!Array.isArray(g.rec)) g.rec = [];
    return g;
  }
  function ints(a, n) {
    var out = [];
    if (!Array.isArray(a)) return out;
    a.forEach(function (v) { v = parseInt(v, 10); if (isFinite(v) && v >= 0 && v < n && out.indexOf(v) < 0) out.push(v); });
    return out;
  }
  function P(g) {
    var raw = root().prog[g.id], n = g.etapes.length;
    if (!raw || typeof raw !== 'object') return { step: 0, done: [], mat: [] };
    var st = parseInt(raw.step, 10); if (!isFinite(st)) st = 0;
    return { step: Math.max(0, Math.min(n - 1, st)), done: ints(raw.done, n), mat: ints(raw.mat, g.mat.length) };
  }
  function putP(g, p) {
    var r = root();
    if (!p.step && !p.done.length && !p.mat.length) delete r.prog[g.id]; else r.prog[g.id] = { step: p.step, done: p.done, mat: p.mat };
    T.store.save();
  }
  function started(g) { var p = P(g); return p.step > 0 || p.done.length > 0; }
  function isFini(g) { return !!root().fini[g.id]; }
  function touchRecent(id) {
    var r = root(); r.rec = r.rec.filter(function (x) { return x !== id; }); r.rec.unshift(id); r.rec = r.rec.slice(0, 8); T.store.save();
  }

  /* ---------- Recherche (accents, fautes, mots courts) ---------- */
  var STOP = ['de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'en', 'au', 'aux', 'et', 'ou', 'a', 'd', 'l', 'pour', 'comment', 'sur', 'mon', 'ma', 'mes', 'ses', 'son', 'ce', 'cette', 'dans', 'avec', 'sans', 'que', 'qui', 'faire', 'fait'];
  function build() {
    idx = LIST().map(function (g) {
      var t = T.norm(g.titre), m = T.norm(g.mots || ''), cat = T.norm(catName(g.cat));
      var steps = T.norm(g.etapes.map(function (e) { return e.t; }).join(' ')), mat = T.norm((g.mat || []).join(' '));
      return { g: g, t: t, tt: t.split(' '), m: m, mt: m.split(' ').filter(Boolean), cat: cat, b: T.norm(g.but), x: steps + ' ' + mat };
    });
  }
  function has(arr, w) { return arr.indexOf(w) >= 0; }
  function starts(arr, w) { for (var i = 0; i < arr.length; i++) if (arr[i].indexOf(w) === 0) return true; return false; }
  function tokScore(e, q) {
    var s = 0;
    if (has(e.tt, q)) s = 10; else if (starts(e.tt, q)) s = 8; else if (q.length >= 3 && e.t.indexOf(q) >= 0) s = 5;
    if (s < 7) { if (has(e.mt, q)) s = Math.max(s, 7); else if (starts(e.mt, q)) s = Math.max(s, 5); else if (q.length >= 4 && e.m.indexOf(q) >= 0) s = Math.max(s, 3); }
    if (s < 4 && q.length >= 3 && e.cat.indexOf(q) >= 0) s = Math.max(s, 4);
    if (s < 3 && q.length >= 4 && e.b.indexOf(q) >= 0) s = Math.max(s, 2);
    if (s < 2 && q.length >= 4 && e.x.indexOf(q) >= 0) s = Math.max(s, 1);
    if (s < 4 && q.length >= 4) {
      var max = q.length >= 7 ? 2 : 1, pool = e.tt.concat(e.mt), i;
      for (i = 0; i < pool.length; i++) if (pool[i].length >= 4 && T.lev(q, pool[i], max) <= max) { s = Math.max(s, 4); break; }
    }
    return s;
  }
  GZ.search = function (query) {
    try {
      if (!idx) build();
      var toks = T.norm(String(query == null ? '' : query).slice(0, 80)).split(' ').filter(function (w) { return w && STOP.indexOf(w) < 0; }).slice(0, 8);
      if (!toks.length) return [];
      var out = [];
      idx.forEach(function (e) {
        var total = 0, hit = 0;
        toks.forEach(function (t) { var s = tokScore(e, t); if (s > 0) { total += s; hit += 1; } });
        var need = toks.length <= 2 ? toks.length : Math.ceil(toks.length * 0.6);
        if (hit > 0 && hit >= need) out.push({ id: e.g.id, titre: e.g.titre, cat: e.g.cat, score: total });
      });
      out.sort(function (a, b) { return b.score - a.score || a.titre.localeCompare(b.titre, 'fr'); });
      return out;
    } catch (err) { return []; }
  };
  GZ.all = function () { return LIST().slice(); };
  GZ.get = function (id) { return T.byId(LIST(), id); };
  GZ.cats = function () { return CATS().slice(); };
  /* Un geste de saison (change chaque jour, évite ceux déjà terminés si possible). */
  GZ.suggestionPourLeMois = function (mois) {
    try {
      var m = parseInt(mois, 10); if (!(m >= 1 && m <= 12)) m = T.monthNow();
      var all = LIST().filter(function (g) { return g.mois.indexOf(m) >= 0; });
      var spec = all.filter(function (g) { return g.mois.length < 12; });
      var pool = spec.length ? spec : all;
      var fresh = pool.filter(function (g) { return !isFini(g); });
      if (fresh.length) pool = fresh;
      if (!pool.length) return null;
      var d = new Date(), day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
      var g = pool[day % pool.length];
      return { id: g.id, titre: g.titre, cat: g.cat, but: g.but, duree: g.duree, diff: g.diff };
    } catch (e) { return null; }
  };

  /* ---------- Textes ---------- */
  function moisTxt(g) { return g.mois.length >= 12 ? 'Toute l\'année' : T.monthsText(g.mois).replace(/^./, function (c) { return c.toUpperCase(); }); }
  function diffTxt(g) { return g.diff === 'moyen' ? 'Moyen' : 'Facile'; }
  function status(g) {
    if (isFini(g)) return 'Terminé';
    if (started(g)) return 'En cours : étape ' + (P(g).step + 1) + ' sur ' + g.etapes.length;
    return '';
  }
  function stepSpeech(g, i) {
    var e = g.etapes[i], n = g.etapes.length, t = 'Étape ' + (i + 1) + ' sur ' + n + '. ' + e.t + '. ' + e.c;
    if (e.a) t += ' Attention : ' + e.a;
    if (e.p) t += ' Pourquoi : ' + e.p;
    return t;
  }
  function say(text) {
    try {
      if (T.voice && typeof T.voice.speak === 'function') { var r = T.voice.speak(text); if (r && r.catch) r.catch(function () {}); return true; }
    } catch (e) { /* on essaie le message ci-dessous */ }
    T.toast('La lecture à voix haute n\'est pas disponible sur ce téléphone.');
    return false;
  }
  function feuilleSay(text, mood) { try { if (T.feuille && typeof T.feuille.say === 'function') T.feuille.say(text, mood); } catch (e) { /* Feuille est facultative */ } }

  /* ---------- Accueil du module ---------- */
  function visible() {
    var base, m = T.monthNow();
    if (T.norm(qState)) {
      var hits = GZ.search(qState); base = hits.map(function (h) { return GZ.get(h.id); }).filter(Boolean);
    } else base = LIST().slice();
    if (catState) base = base.filter(function (g) { return g.cat === catState; });
    if (modeState === 'mois') base = base.filter(function (g) { return g.mois.indexOf(m) >= 0 && g.mois.length < 12; });
    else if (modeState === 'cours') base = base.filter(function (g) { return started(g) && !isFini(g); });
    else if (modeState === 'finis') base = base.filter(isFini);
    return base;
  }
  function itemHtml(g) {
    var st = status(g);
    return '<a class="item gz-item" href="#/geste/' + esc(g.id) + '"><b>' + esc(g.titre) + '</b><span class="gz-but">' + esc(g.but) + '</span><i>' + esc(diffTxt(g) + ' - ' + g.duree + ' - ' + catName(g.cat)) + '</i>' + (st ? '<span class="gz-tag' + (isFini(g) ? ' ok' : '') + '">' + esc(st) + '</span>' : '') + '</a>';
  }
  function listHtml() {
    var list = visible(), q = T.norm(qState), h = '';
    h += '<p class="small muted gz-count" aria-live="polite">' + list.length + ' geste' + (list.length > 1 ? 's' : '') + (q ? ' pour « ' + esc(qState.trim().slice(0, 40)) + ' »' : '') + '</p>';
    if (!list.length) {
      var msg = modeState === 'cours' ? 'Aucun geste en cours. Ouvrez un geste et touchez « Commencer pas à pas ».' : modeState === 'finis' ? 'Aucun geste terminé pour le moment.' : q ? 'Aucun geste ne correspond. Essayez un mot plus simple : bouture, semis, taille, arrosage, compost.' : 'Aucun geste dans cette catégorie.';
      h += '<div class="notice">' + esc(msg) + '</div><button class="btn block" data-act="gzclear">Tout afficher</button>';
    } else h += list.map(itemHtml).join('');
    return h;
  }
  function chipsHtml() {
    function chip(k, label, on) { return '<button class="chip gz-chip' + (on ? ' on' : '') + '" data-act="gzfilter" data-k="' + esc(k) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(label) + '</button>'; }
    var h = '<div class="chips" role="group" aria-label="Catégories">' + chip('all', 'Tous', !catState && !modeState);
    CATS().forEach(function (c) { h += chip('cat:' + c.id, c.nom, catState === c.id); });
    h += '</div><div class="chips" role="group" aria-label="Mon suivi">' + chip('mode:mois', 'Ce mois-ci', modeState === 'mois') + chip('mode:cours', 'En cours', modeState === 'cours') + chip('mode:finis', 'Terminés', modeState === 'finis') + '</div>';
    return h;
  }
  function homeHtml() {
    var h = '<div class="hero"><h2>Gestes du jardinier</h2><p>Chaque geste est expliqué pas à pas, avec des dessins. Vous pouvez aussi vous le faire lire à voix haute.</p></div>';
    h += '<div class="card gz-search"><label class="lbl" for="gz-q" style="margin-top:0">Chercher un geste</label><div class="row"><input id="gz-q" class="gz-q grow" type="search" inputmode="search" autocomplete="off" placeholder="Exemple : bouture, rempoter, tomate" data-input="gzq" value="' + esc(qState) + '" maxlength="80"><button class="btn" data-act="gzclear">Effacer</button></div></div>';
    h += '<div id="gz-chips">' + chipsHtml() + '</div>';
    var enc = LIST().filter(function (g) { return started(g) && !isFini(g); });
    var rec = root().rec.map(GZ.get).filter(function (g) { return g && enc.indexOf(g) >= 0; })[0] || enc[0];
    if (rec && !T.norm(qState) && !catState && !modeState) {
      h += '<div class="card gz-resume"><h3>Reprendre où vous en étiez</h3><p><b>' + esc(rec.titre) + '</b><br><span class="muted small">Étape ' + (P(rec).step + 1) + ' sur ' + rec.etapes.length + '</span></p><a class="btn primary block" href="#/geste/' + esc(rec.id) + '">Reprendre ce geste</a></div>';
    }
    var sug = GZ.suggestionPourLeMois();
    if (sug && !T.norm(qState) && !catState && !modeState) {
      h += '<div class="card gz-sug"><h3>Ce mois-ci</h3><p><b>' + esc(sug.titre) + '</b><br><span class="muted">' + esc(sug.but) + '</span></p><a class="btn block" href="#/geste/' + esc(sug.id) + '">Voir ce geste</a></div>';
    }
    h += '<div id="gz-list">' + listHtml() + '</div>';
    return h;
  }
  function refreshList() {
    var el = document.getElementById('gz-list'); if (el) el.innerHTML = listHtml();
    var c = document.getElementById('gz-chips'); if (c) c.innerHTML = chipsHtml();
  }
  T.input.gzq = function (el) { qState = String(el.value || '').slice(0, 80); refreshList(); };
  T.act.gzclear = function () { qState = ''; catState = ''; modeState = ''; var i = document.getElementById('gz-q'); if (i) i.value = ''; refreshList(); };
  T.act.gzfilter = function (el) {
    var k = el.getAttribute('data-k') || 'all';
    if (k === 'all') { catState = ''; modeState = ''; }
    else if (k.indexOf('cat:') === 0) { var c = k.slice(4); catState = catState === c ? '' : c; modeState = ''; }
    else if (k.indexOf('mode:') === 0) { var m = k.slice(5); modeState = modeState === m ? '' : m; catState = ''; }
    refreshList();
  };

  T.route(/^\/gestes$/, 'conseils', function () {
    return { title: 'Gestes du jardinier', html: homeHtml() };
  });

  /* ---------- Page d'un geste ---------- */
  function missing() {
    return { title: 'Gestes du jardinier', html: '<div class="card"><h2>Ce geste n\'existe pas</h2><p>Il a peut-être changé de nom. Retournez à la liste pour le retrouver.</p><a class="btn primary block" href="#/gestes">Voir tous les gestes</a></div>' };
  }
  function checkBtn(on, act, extra, label) {
    return '<button class="gz-chk' + (on ? ' on' : '') + '" role="checkbox" aria-checked="' + (on ? 'true' : 'false') + '" data-act="' + act + '" ' + extra + '><span class="gz-box" aria-hidden="true"></span><span class="gz-lbl">' + esc(label) + '</span></button>';
  }
  function pageHtml(g) {
    var p = P(g), n = g.etapes.length, now = T.monthNow(), h = '';
    h += '<div class="card gz-head"><h2>' + esc(g.titre) + '</h2><p class="gz-purpose">' + esc(g.but) + '</p>';
    h += '<div class="gz-facts"><span><b>Difficulté</b>' + esc(diffTxt(g)) + '</span><span><b>Durée</b>' + esc(g.duree) + '</span><span><b>Catégorie</b>' + esc(catName(g.cat)) + '</span></div>';
    h += '<h3>Quand le faire</h3>' + T.months12(g.mois) + '<p class="small muted">' + esc(moisTxt(g)) + '</p>';
    if (g.mois.indexOf(now) >= 0 && g.mois.length < 12) h += '<div class="notice ok">C\'est le bon moment pour ce geste.</div>';
    h += '</div>';
    var label = isFini(g) && !started(g) ? 'Refaire pas à pas' : started(g) ? 'Reprendre à l\'étape ' + (p.step + 1) : 'Commencer pas à pas';
    h += '<button class="btn primary block gz-start" data-act="gzstart" data-id="' + esc(g.id) + '">' + esc(label) + '</button>';
    h += '<div class="gz-two"><button class="btn" data-act="gzreadall" data-id="' + esc(g.id) + '">Écouter la présentation</button>';
    if (started(g) || p.mat.length) h += '<button class="btn" data-act="gzreset" data-id="' + esc(g.id) + '">Recommencer à zéro</button>';
    h += '</div>';
    if (isFini(g)) h += '<div class="notice ok">Vous avez déjà terminé ce geste.</div>';
    h += '<div class="card"><h3>Ce qu\'il vous faut</h3><p class="small muted">Touchez pour cocher ce que vous avez préparé.</p><div class="gz-mats">';
    g.mat.forEach(function (m, i) { h += checkBtn(p.mat.indexOf(i) >= 0, 'gzmat', 'data-id="' + esc(g.id) + '" data-i="' + i + '"', m); });
    h += '</div></div>';
    h += '<div class="card"><h3>Les étapes (' + n + ')</h3><ol class="gz-steps">';
    g.etapes.forEach(function (e, i) {
      h += '<li><b>' + esc(e.t) + '</b><br>' + esc(e.c) + (e.a ? '<div class="notice warn small">Attention : ' + esc(e.a) + '</div>' : '') + (e.p ? '<div class="small muted">Pourquoi : ' + esc(e.p) + '</div>' : '') + (e.s ? svg(e.s) : '') + '</li>';
    });
    h += '</ol></div>';
    h += '<div class="notice warn"><b>Sécurité</b><br>Mettez des gants : la sève de certaines plantes (ficus, euphorbes, lierre, rue…) irrite la peau et les yeux, lavez-vous les mains ensuite. Beaucoup de plantes sont toxiques pour les enfants et les animaux : gardez outils, produits et déchets de taille hors de leur portée, et ne goûtez jamais une plante que vous ne connaissez pas.</div>';
    h += '<div class="card"><h3>Erreurs fréquentes</h3><ul class="gz-list">' + T.list(g.erreurs) + '</ul></div>';
    h += '<div class="card"><h3>Et après ?</h3><ul class="gz-list">' + T.list(g.apres) + '</ul></div>';
    var pl = (g.plantes || []).map(function (id) { return T.plante(id); }).filter(Boolean);
    if (pl.length) {
      h += '<div class="card"><h3>Plantes concernées</h3><div class="chips">' + pl.map(function (x) { return '<a class="chip gz-chip" href="#/plante/' + esc(x.id) + '">' + esc(x.nom) + '</a>'; }).join('') + '</div></div>';
    }
    var near = LIST().filter(function (o) { return o.cat === g.cat && o.id !== g.id; }).slice(0, 3);
    if (near.length) h += '<h3>Gestes proches</h3>' + near.map(itemHtml).join('');
    h += '<a class="btn block" href="#/gestes" style="margin-top:.6rem">Voir tous les gestes</a>';
    return h;
  }
  T.route(/^\/geste\/([^\/?]+)$/, 'conseils', function (m) {
    var g = GZ.get(decodeURIComponent(m[1]));
    if (!g) return missing();
    touchRecent(g.id);
    return { title: g.titre, html: pageHtml(g), after: function () {
      if (T.query && T.query.pas === '1') {
        T.query.pas = '';
        try { history.replaceState(null, '', location.hash.replace(/[?&]pas=1/, '')); } catch (e) { /* rien */ }
        openOv(g, null);
      }
    } };
  });

  T.act.gzmat = function (el) {
    var g = GZ.get(el.getAttribute('data-id')); if (!g) return;
    var i = parseInt(el.getAttribute('data-i'), 10), p = P(g), k = p.mat.indexOf(i);
    if (k >= 0) p.mat.splice(k, 1); else p.mat.push(i);
    putP(g, p);
    var on = k < 0; el.classList.toggle('on', on); el.setAttribute('aria-checked', on ? 'true' : 'false');
  };
  T.act.gzreadall = function (el) {
    var g = GZ.get(el.getAttribute('data-id')); if (!g) return;
    say(g.titre + '. ' + g.but + ' Difficulté : ' + diffTxt(g).toLowerCase() + '. Durée : ' + g.duree + '. Il vous faut : ' + g.mat.join(', ') + '.');
  };
  T.act.gzstart = function (el) {
    var g = GZ.get(el.getAttribute('data-id')); if (!g) return;
    if (isFini(g) && !started(g)) { delete root().fini[g.id]; T.store.save(); }
    openOv(g, null);
  };
  T.act.gzreset = function (el) {
    var g = GZ.get(el.getAttribute('data-id')); if (!g) return;
    T.confirm('Recommencer à zéro ?', 'Les étapes cochées et le matériel coché de ce geste seront effacés.', 'Oui, recommencer', function () {
      delete root().prog[g.id]; delete root().fini[g.id]; T.store.save(); T.render(true);
    }, true);
  };

  /* ---------- Mode pas à pas, plein écran ---------- */
  function ovCurrent() { return OV ? OV.g : null; }
  function closeOv() {
    if (!OV) return;
    var o = OV; OV = null;
    try { if (T.voice && T.voice.stop) T.voice.stop(); } catch (e) { /* rien */ }
    if (o.el && o.el.parentNode) o.el.parentNode.removeChild(o.el);
    T.modalStack = T.modalStack.filter(function (x) { return x !== o.entry; });
    document.body.classList.remove('gz-noscroll');
    if (/^\/gestes?(\/|$)/.test(T.cur.path || '')) { try { T.render(true); } catch (e) { /* rien */ } }
  }
  function openOv(g, start) {
    if (OV) closeOv();
    var p = P(g), i = start == null ? p.step : start;
    var el = document.createElement('div');
    el.id = 'gz-ov'; el.className = 'gz-ov'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Pas à pas : ' + g.titre);
    el.innerHTML = '<div class="gz-ov-head"><div class="gz-ov-t"><b>' + esc(g.titre) + '</b><span id="gz-count"></span></div><button class="btn" data-act="gzquit">Quitter</button></div>' +
      '<div class="gz-bar" id="gz-bar" role="progressbar" aria-label="Progression" aria-valuemin="0" aria-valuemax="' + g.etapes.length + '"><i></i></div>' +
      '<div class="gz-ov-body" id="gz-body"></div>' +
      '<div class="gz-ov-foot"><button class="btn block" id="gz-read" data-act="gzread">Lire à voix haute</button><div class="gz-nav"><button class="btn" id="gz-prev" data-act="gzprev">Précédent</button><button class="btn primary" id="gz-next" data-act="gznext">Suivant</button></div></div>';
    document.body.appendChild(el);
    document.body.classList.add('gz-noscroll');
    var entry = { id: 'gz-ov', el: el, o: { dismissable: true }, close: closeOv };
    T.modalStack.push(entry);
    OV = { g: g, i: Math.max(0, Math.min(g.etapes.length - 1, i)), el: el, entry: entry };
    drawStep();
  }
  function drawStep() {
    if (!OV) return;
    var g = OV.g, i = OV.i, n = g.etapes.length, e = g.etapes[i], p = P(g), done = p.done.indexOf(i) >= 0;
    p.step = i; putP(g, p);
    var el = OV.el;
    el.querySelector('#gz-count').textContent = 'Étape ' + (i + 1) + ' sur ' + n;
    var bar = el.querySelector('#gz-bar'); bar.setAttribute('aria-valuenow', String(i + 1)); bar.querySelector('i').style.width = Math.round((i + 1) / n * 100) + '%';
    var h = (e.s ? svg(e.s, true) : '') + '<h2 class="gz-st">' + esc(e.t) + '</h2><p class="gz-c">' + esc(e.c) + '</p>';
    if (e.a) h += '<div class="notice warn"><b>Attention.</b> ' + esc(e.a) + '</div>';
    if (e.p) h += '<div class="notice"><b>Pourquoi ?</b> ' + esc(e.p) + '</div>';
    h += checkBtn(done, 'gzdone', '', 'J\'ai fini cette étape');
    var body = el.querySelector('#gz-body'); body.innerHTML = h; body.scrollTop = 0;
    el.querySelector('#gz-prev').disabled = i === 0;
    el.querySelector('#gz-next').textContent = i === n - 1 ? 'Terminer' : 'Suivant';
  }
  T.act.gzquit = function () { closeOv(); };
  T.act.gzprev = function () { if (OV && OV.i > 0) { OV.i -= 1; try { T.voice.stop(); } catch (e) { /* rien */ } drawStep(); } };
  T.act.gznext = function () {
    if (!OV) return;
    var n = OV.g.etapes.length;
    if (OV.i < n - 1) { OV.i += 1; try { T.voice.stop(); } catch (e) { /* rien */ } drawStep(); } else finish();
  };
  T.act.gzdone = function (el) {
    if (!OV) return;
    var g = OV.g, p = P(g), k = p.done.indexOf(OV.i);
    if (k >= 0) p.done.splice(k, 1); else p.done.push(OV.i);
    p.step = OV.i; putP(g, p);
    var on = k < 0; el.classList.toggle('on', on); el.setAttribute('aria-checked', on ? 'true' : 'false');
  };
  T.act.gzread = function () { if (OV) say(stepSpeech(OV.g, OV.i)); };
  function finish() {
    var g = OV.g, r = root(), el = OV.el;
    r.fini[g.id] = Date.now(); delete r.prog[g.id]; T.store.save();
    try { T.voice.stop(); } catch (e) { /* rien */ }
    var h = '<h2 class="gz-st">Bravo, c\'est terminé !</h2><p class="gz-c">Vous avez fini : ' + esc(g.titre) + '.</p><div class="notice ok"><b>Et après ?</b><ul class="gz-list">' + T.list(g.apres) + '</ul></div>';
    el.querySelector('#gz-body').innerHTML = h; el.querySelector('#gz-body').scrollTop = 0;
    el.querySelector('#gz-count').textContent = 'Terminé';
    var bar = el.querySelector('#gz-bar'); bar.setAttribute('aria-valuenow', String(g.etapes.length)); bar.querySelector('i').style.width = '100%';
    el.querySelector('.gz-ov-foot').innerHTML = '<button class="btn block" data-act="gzread">Lire à voix haute</button><button class="btn primary block" data-act="gzquit">Fermer</button>';
    OV.finished = true;
    feuilleSay('Bravo ! Le geste « ' + g.titre + ' » est terminé.', 'fier');
  }
  /* Quand le geste est fini, « Lire » lit la conclusion. */
  var readStep = T.act.gzread;
  T.act.gzread = function () {
    if (OV && OV.finished) { say('Bravo, c\'est terminé. Et après ? ' + OV.g.apres.join(' ')); return; }
    readStep();
  };
  window.addEventListener('hashchange', function () { if (OV) { var o = OV; OV = null; if (o.el.parentNode) o.el.parentNode.removeChild(o.el); T.modalStack = T.modalStack.filter(function (x) { return x !== o.entry; }); document.body.classList.remove('gz-noscroll'); } });
  GZ.ouvert = function () { var g = ovCurrent(); return g ? { id: g.id, etape: OV.i + 1 } : null; };
  GZ.resume = function () { var enc = LIST().filter(function (g) { return started(g) && !isFini(g); }); return enc.length + ' geste' + (enc.length > 1 ? 's' : '') + ' en cours'; };
})();
