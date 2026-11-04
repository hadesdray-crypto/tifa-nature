/* Tifa Nature - « Insectes du jardin » : amis et indésirables, fiches, recherche, jeu « Ami ou ennemi ? ».
   Données : data/insectes.js (T.D.insectes). Progression du jeu : T.store.s.insectes = { best, played, last, vus: { id: [bon, faux] } }.
   API : T.insectes = { all(), get(id), search(q), pourPlante(id), suggestionDuMois(mois?) }.
   Routes : #/insectes (accueil), #/insectes/jeu (quiz), #/insecte/<id> (fiche). Onglet : plus.
   Branche aussi T.fichePlus (carte « Insectes de cette plante »). Tout est défensif : jamais d'écran vide. */
(function () {
  'use strict';
  var T = window.T, IN = T.insectes = {}, esc = T.esc;
  var qState = '', campState = '', plState = '', idx = null, QZ = null;

  function LIST() { return (T.D && Array.isArray(T.D.insectes)) ? T.D.insectes : []; }
  function ASTUCES() { return (T.D && Array.isArray(T.D.insectesAstuces)) ? T.D.insectesAstuces : []; }
  function campTxt(c) { return c === 'ami' ? 'Ami du jardin' : 'Indésirable'; }
  function planteNom(id) { try { var p = T.plante(id); return p ? p.nom : ''; } catch (e) { return ''; } }
  function geste(id) { try { return T.byId((T.D && T.D.gestes) || [], id); } catch (e) { return null; } }
  function maladie(id) { try { return T.maladie(id); } catch (e) { return null; } }

  /* ---------- Schémas SVG sobres (formes générales, pas à l'échelle) ---------- */
  var SV = {
    rond: ['Scarabée vu de dessus : corps bombé, tête, six pattes.', '<ellipse class="in-f" cx="60" cy="44" rx="24" ry="28"/><circle class="in-f" cx="60" cy="14" r="9"/><path class="in-l" d="M60 20v52M36 34l-14-8M36 46l-16 2M38 58l-14 10M84 34l14-8M84 46l16 2M82 58l14 10"/><circle class="in-a" cx="48" cy="38" r="3.5"/><circle class="in-a" cx="72" cy="38" r="3.5"/><circle class="in-a" cx="46" cy="54" r="3.5"/><circle class="in-a" cx="74" cy="54" r="3.5"/>'],
    long: ['Coléoptère allongé vu de dessus : corps étroit, longues pattes.', '<ellipse class="in-f" cx="60" cy="46" rx="15" ry="30"/><circle class="in-f" cx="60" cy="12" r="8"/><path class="in-l" d="M60 20v54M46 30l-22-8M45 44l-24 2M46 58l-22 12M74 30l22-8M75 44l24 2M74 58l22 12M54 6l-8-6M66 6l8-6"/>'],
    larve: ['Chenille ou larve : corps en anneaux, tête et pattes courtes.', '<g class="in-f"><circle cx="22" cy="48" r="11"/><circle cx="38" cy="44" r="12"/><circle cx="56" cy="42" r="12"/><circle cx="74" cy="44" r="12"/><circle cx="92" cy="48" r="11"/></g><circle class="in-a" cx="104" cy="46" r="8"/><path class="in-l" d="M32 56v10M50 54v12M68 54v12M86 58v10"/>'],
    aile4: ['Insecte volant : corps fin, quatre ailes, antennes.', '<ellipse class="in-f" cx="60" cy="44" rx="7" ry="26"/><circle class="in-f" cx="60" cy="14" r="7"/><ellipse class="in-w" cx="36" cy="30" rx="26" ry="9" transform="rotate(-18 36 30)"/><ellipse class="in-w" cx="84" cy="30" rx="26" ry="9" transform="rotate(18 84 30)"/><ellipse class="in-w" cx="40" cy="48" rx="20" ry="7" transform="rotate(-8 40 48)"/><ellipse class="in-w" cx="80" cy="48" rx="20" ry="7" transform="rotate(8 80 48)"/><path class="in-l" d="M56 8l-6-8M64 8l6-8"/>'],
    mouche: ['Mouche : gros yeux, seulement deux ailes.', '<ellipse class="in-f" cx="60" cy="48" rx="10" ry="24"/><circle class="in-f" cx="60" cy="18" r="9"/><circle class="in-a" cx="53" cy="16" r="4"/><circle class="in-a" cx="67" cy="16" r="4"/><ellipse class="in-w" cx="34" cy="38" rx="26" ry="9" transform="rotate(-12 34 38)"/><ellipse class="in-w" cx="86" cy="38" rx="26" ry="9" transform="rotate(12 86 38)"/><path class="in-l" d="M52 52l-14 10M68 52l14 10M54 62l-12 12M66 62l12 12"/>'],
    papillon: ['Papillon : quatre grandes ailes, corps fin, antennes.', '<path class="in-w" d="M60 40C44 14 14 12 14 32c0 16 24 22 46 14zM60 40C76 14 106 12 106 32c0 16-24 22-46 14z"/><path class="in-f" d="M60 46C44 50 26 56 30 68c6 8 24 0 30-14zM60 46C76 50 94 56 90 68c-6 8-24 0-30-14z"/><ellipse class="in-f" cx="60" cy="46" rx="4" ry="22"/><path class="in-l" d="M58 24c-4-10-8-14-12-16M62 24c4-10 8-14 12-16"/>'],
    perce: ['Perce-oreille : corps allongé et deux pinces au bout.', '<ellipse class="in-f" cx="60" cy="40" rx="12" ry="28"/><circle class="in-f" cx="60" cy="10" r="7"/><path class="in-l" d="M56 4l-8-4M64 4l8-4M48 28l-16-6M72 28l16-6M48 42l-18 2M72 42l18 2"/><path class="in-a" d="M56 70c-6 4-8 8-6 10M64 70c6 4 8 8 6 10"/>'],
    araignee: ['Araignée : huit pattes, deux parties du corps, pas d\'antennes.', '<circle class="in-f" cx="60" cy="30" r="9"/><ellipse class="in-f" cx="60" cy="52" rx="14" ry="17"/><path class="in-l" d="M52 28l-22-14M52 32l-28 2M52 36l-28 14M54 40l-22 28M68 28l22-14M68 32l28 2M68 36l28 14M66 40l22 28"/>'],
    punaise: ['Punaise : corps plat en forme de bouclier, antennes.', '<path class="in-f" d="M60 12c20 0 34 14 32 34-2 18-14 28-32 28S30 64 28 46C26 26 40 12 60 12z"/><path class="in-l" d="M60 16v54M40 30l-18-8M40 46l-20 4M42 62l-16 14M80 30l18-8M80 46l20 4M78 62l16 14"/><path class="in-a" d="M54 6l-8-6M66 6l8-6"/>'],
    petit: ['Toute petite bête (très agrandie) : corps ovale et pattes courtes.', '<ellipse class="in-f" cx="60" cy="42" rx="22" ry="17"/><circle class="in-f" cx="40" cy="38" r="7"/><path class="in-l" d="M44 56l-8 10M54 58l-4 12M66 58l4 12M76 56l8 10M80 34l12-6M82 42l14 0"/>'],
    escargot: ['Escargot : coquille en spirale et corps mou avec deux tentacules.', '<path class="in-f" d="M14 64c0-8 8-12 20-12h50c8 0 14 6 20 6l-8 8H22c-6 0-8-2-8-2z"/><circle class="in-f" cx="68" cy="34" r="22"/><path class="in-l" d="M68 34m-12 0a12 12 0 1 1 12 12M68 34m-5 0a5 5 0 1 1 5 5"/><path class="in-l" d="M104 54v-12M110 56l6-10"/>'],
    ver: ['Ver ou mille-pattes : corps long en anneaux.', '<path class="in-l2" d="M12 56c14-28 22 24 36-2s22 24 36-2c8-14 14-6 24 0"/><circle class="in-a" cx="108" cy="54" r="4"/>'],
    cloporte: ['Cloporte : corps ovale en plaques, quatorze pattes.', '<ellipse class="in-f" cx="60" cy="42" rx="22" ry="30"/><path class="in-l" d="M40 28h40M38 40h44M38 52h44M42 64h36M38 22l-14-6M38 36l-16-2M38 48l-16 4M40 60l-14 10M82 22l14-6M82 36l16-2M82 48l16 4M80 60l14 10"/>']
  };
  function svg(key) {
    var s = SV[key] || SV.petit;
    return '<figure class="in-fig"><svg class="in-svg" viewBox="0 0 120 80" role="img" aria-label="' + esc(s[0]) + '" focusable="false">' + s[1] + '</svg><figcaption>' + esc(s[0]) + ' Dessin simplifié, pas à l\'échelle.</figcaption></figure>';
  }

  /* ---------- Progression (jeu) ---------- */
  function root() {
    var s = T.store.s, g = s.insectes;
    if (!g || typeof g !== 'object' || Array.isArray(g)) g = s.insectes = {};
    ['best', 'played', 'last'].forEach(function (k) { var v = parseInt(g[k], 10); g[k] = isFinite(v) && v >= 0 ? v : 0; });
    if (!g.vus || typeof g.vus !== 'object' || Array.isArray(g.vus)) g.vus = {};
    return g;
  }

  /* ---------- Accès aux données ---------- */
  IN.all = function () { return LIST().slice(); };
  IN.get = function (id) { try { return T.byId(LIST(), id == null ? '' : String(id)); } catch (e) { return null; } };
  IN.pourPlante = function (pid) {
    try { return LIST().filter(function (e) { return e.plantes.indexOf(pid) >= 0; }).map(function (e) { return { id: e.id, nom: e.nom, camp: e.camp }; }); } catch (e) { return []; }
  };
  IN.suggestionDuMois = function (mois) {
    try {
      var m = parseInt(mois, 10); if (!(m >= 1 && m <= 12)) m = T.monthNow();
      var pool = LIST().filter(function (e) { return e.mois && e.mois.indexOf(m) >= 0 && e.mois.length < 12; });
      if (!pool.length) pool = LIST().filter(function (e) { return e.mois && e.mois.indexOf(m) >= 0; });
      if (!pool.length) return null;
      var d = new Date(), day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000), e = pool[day % pool.length];
      return { id: e.id, nom: e.nom, camp: e.camp, role: e.role };
    } catch (err) { return null; }
  };

  /* ---------- Recherche tolérante (accents, fautes, symptômes) ---------- */
  var STOP = ['de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'en', 'au', 'aux', 'et', 'ou', 'a', 'd', 'l', 'sur', 'mon', 'ma', 'mes', 'ce', 'cette', 'dans', 'avec', 'sans', 'que', 'qui', 'il', 'elle', 'sont', 'est'];
  function build() {
    idx = LIST().map(function (e) {
      var t = T.norm(e.nom + ' ' + e.latin), m = T.norm(e.mots || ''), pl = T.norm((e.plantes || []).map(planteNom).join(' '));
      return { e: e, t: t, tt: t.split(' ').filter(Boolean), m: m, mt: m.split(' ').filter(Boolean), pl: pl, x: T.norm((e.signes || []).join(' ') + ' ' + e.fait + ' ' + e.reco) };
    });
  }
  function has(a, w) { return a.indexOf(w) >= 0; }
  function starts(a, w) { for (var i = 0; i < a.length; i++) if (a[i].indexOf(w) === 0) return true; return false; }
  function tokScore(x, q) {
    var s = 0;
    if (has(x.tt, q)) s = 10; else if (starts(x.tt, q)) s = 8; else if (q.length >= 3 && x.t.indexOf(q) >= 0) s = 5;
    if (s < 7) { if (has(x.mt, q)) s = Math.max(s, 7); else if (starts(x.mt, q)) s = Math.max(s, 5); else if (q.length >= 4 && x.m.indexOf(q) >= 0) s = Math.max(s, 3); }
    if (s < 4 && q.length >= 3 && x.pl.indexOf(q) >= 0) s = Math.max(s, 4);
    if (s < 2 && q.length >= 4 && x.x.indexOf(q) >= 0) s = Math.max(s, 1);
    if (s < 4 && q.length >= 4) {
      var max = q.length >= 7 ? 2 : 1, pool = x.tt.concat(x.mt), i;
      for (i = 0; i < pool.length; i++) if (pool[i].length >= 4 && T.lev(q, pool[i], max) <= max) { s = Math.max(s, 4); break; }
    }
    return s;
  }
  IN.search = function (query) {
    try {
      if (!idx) build();
      var toks = T.norm(String(query == null ? '' : query).slice(0, 80)).split(' ').filter(function (w) { return w && STOP.indexOf(w) < 0; }).slice(0, 8);
      if (!toks.length) return [];
      var out = [];
      idx.forEach(function (x) {
        var total = 0, hit = 0;
        toks.forEach(function (t) { var s = tokScore(x, t); if (s > 0) { total += s; hit += 1; } });
        var need = toks.length <= 2 ? toks.length : Math.ceil(toks.length * 0.6);
        if (hit > 0 && hit >= need) out.push({ id: x.e.id, nom: x.e.nom, camp: x.e.camp, score: total });
      });
      out.sort(function (a, b) { return b.score - a.score || a.nom.localeCompare(b.nom, 'fr'); });
      return out;
    } catch (err) { return []; }
  };

  /* ---------- Voix et Feuille (défensifs) ---------- */
  function say(text) {
    try { if (T.voice && typeof T.voice.speak === 'function') { var r = T.voice.speak(text); if (r && r.catch) r.catch(function () {}); return true; } } catch (e) { /* message ci-dessous */ }
    try { T.toast('La lecture à voix haute n\'est pas disponible sur ce téléphone.'); } catch (e2) { /* rien */ }
    return false;
  }
  function feuille(text, mood) { try { if (T.feuille && typeof T.feuille.say === 'function') T.feuille.say(text, mood); } catch (e) { /* facultatif */ } }
  function speech(e) {
    var t = e.nom + '. ' + campTxt(e.camp) + '. Pour le reconnaître : ' + e.reco + ' ' + e.role + ' ' + e.fait;
    if (e.faire.length) t += ' Que faire : ' + e.faire.join(' ');
    if (e.eviter.length) t += ' À ne pas faire : ' + e.eviter.join(' ');
    if (e.danger) t += ' Attention : ' + e.danger;
    return t;
  }

  /* ---------- Accueil du module ---------- */
  function plantesListe() {
    var seen = {}, out = [];
    LIST().forEach(function (e) { e.plantes.forEach(function (id) { if (!seen[id]) { var n = planteNom(id); if (n) { seen[id] = 1; out.push({ id: id, nom: n }); } } }); });
    out.sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
    return out;
  }
  function visible() {
    var base;
    if (T.norm(qState)) base = IN.search(qState).map(function (h) { return IN.get(h.id); }).filter(Boolean);
    else base = LIST().slice();
    if (campState) base = base.filter(function (e) { return e.camp === campState; });
    if (plState) base = base.filter(function (e) { return e.plantes.indexOf(plState) >= 0; });
    return base;
  }
  function itemHtml(e) {
    return '<a class="item in-item" href="#/insecte/' + esc(e.id) + '"><b>' + esc(e.nom) + '</b><span class="in-tag ' + (e.camp === 'ami' ? 'ok' : 'warn') + '">' + esc(campTxt(e.camp)) + '</span><span class="in-sum">' + esc(e.role) + '</span></a>';
  }
  function listHtml() {
    var list = visible(), q = T.norm(qState), h = '';
    if (!q && !campState && !plState) {
      return '<div class="notice">Touchez « Amis du jardin » ou « Indésirables », ou cherchez un nom ou un signe (par exemple : feuilles collantes, trous, petits points blancs).</div>';
    }
    h += '<p class="small muted in-count" aria-live="polite">' + list.length + ' fiche' + (list.length > 1 ? 's' : '') + (q ? ' pour « ' + esc(qState.trim().slice(0, 40)) + ' »' : '') + '</p>';
    if (!list.length) h += '<div class="notice">Aucune fiche ne correspond. Essayez un mot plus simple : puceron, limace, trou, feuilles collantes, abeille.</div><button class="btn block" data-act="inclear">Tout effacer</button>';
    else h += list.map(itemHtml).join('');
    return h;
  }
  function campBtns() {
    var a = LIST().filter(function (e) { return e.camp === 'ami'; }).length, n = LIST().length - a;
    function b(k, cls, t, sub, count) { var on = campState === k; return '<button class="big in-big ' + cls + (on ? ' on' : '') + '" data-act="infilter" data-k="' + k + '" aria-pressed="' + (on ? 'true' : 'false') + '"><b>' + esc(t) + '</b><span>' + esc(sub) + ' (' + count + ')</span></button>'; }
    return '<div class="in-two">' + b('ami', 't2', 'Amis du jardin', 'Ils aident les plantes', a) + b('ennemi', 't1', 'Indésirables', 'Ils abîment les plantes', n) + '</div>';
  }
  function filtresHtml() {
    var h = '<label class="lbl in-lbl" for="in-pl">Les insectes d\'une plante</label><select id="in-pl" class="field in-sel" data-input="inpl"><option value="">Toutes les plantes</option>';
    plantesListe().forEach(function (p) { h += '<option value="' + esc(p.id) + '"' + (p.id === plState ? ' selected' : '') + '>' + esc(p.nom) + '</option>'; });
    return h + '</select>';
  }
  function homeHtml() {
    var h = '<div class="hero"><h2>Insectes du jardin</h2><p>Qui aide vos plantes, et qui les abîme ? Reconnaissez-les, et sachez quoi faire. Beaucoup de petites bêtes sont utiles : ne les écrasez pas trop vite.</p></div>';
    h += '<div class="card in-search"><label class="lbl" for="in-q" style="margin-top:0">Chercher un nom ou un signe</label><div class="row"><input id="in-q" class="in-q grow" type="search" inputmode="search" autocomplete="off" placeholder="Exemple : puceron, trous, collant" data-input="inq" value="' + esc(qState) + '" maxlength="80"><button class="btn" data-act="inclear">Effacer</button></div></div>';
    h += '<div id="in-camps">' + campBtns() + '</div>';
    h += '<div class="card">' + filtresHtml() + '</div>';
    h += '<div id="in-list">' + listHtml() + '</div>';
    var sug = IN.suggestionDuMois();
    if (sug && !T.norm(qState) && !campState && !plState) {
      h += '<div class="card"><h3>Ce mois-ci</h3><p><b>' + esc(sug.nom) + '</b><br><span class="muted">' + esc(sug.role) + '</span></p><a class="btn block" href="#/insecte/' + esc(sug.id) + '">Voir cette fiche</a></div>';
    }
    h += '<a class="big in-game" href="#/insectes/jeu"><b>Jeu : Ami ou ennemi ?</b><span>10 questions pour tester vos yeux' + (root().best ? ' (votre record : ' + root().best + ' sur 10)' : '') + '</span></a>';
    h += '<div class="card"><h3>Attirer les amis du jardin</h3><ul class="in-list">';
    ASTUCES().forEach(function (a) {
      h += '<li><b>' + esc(a.t) + '.</b> ' + esc(a.c);
      var gl = (a.gestes || []).map(geste).filter(Boolean);
      if (gl.length) h += '<div class="chips">' + gl.map(function (g) { return '<a class="chip in-chip" href="#/geste/' + esc(g.id) + '">' + esc(g.titre) + '</a>'; }).join('') + '</div>';
      h += '</li>';
    });
    h += '</ul></div>';
    h += '<div class="notice warn"><b>Piqûres.</b> Abeilles, guêpes et frelons piquent si on les menace. Restez calme et ne les frappez pas. ' + esc('En cas de gêne pour respirer, de gonflement du visage, de la langue ou de la gorge, ou de malaise : appelez tout de suite le 15 ou le 112.') + '</div>';
    return h;
  }
  function refresh() {
    var el = document.getElementById('in-list'); if (el) el.innerHTML = listHtml();
    var c = document.getElementById('in-camps'); if (c) c.innerHTML = campBtns();
  }
  T.input.inq = function (el) { qState = String(el.value || '').slice(0, 80); refresh(); };
  T.input.inpl = function (el) { plState = String(el.value || ''); refresh(); };
  T.act.inclear = function () { qState = ''; campState = ''; plState = ''; var i = document.getElementById('in-q'); if (i) i.value = ''; var s = document.getElementById('in-pl'); if (s) s.value = ''; refresh(); };
  T.act.infilter = function (el) { var k = el.getAttribute('data-k'); campState = campState === k ? '' : k; refresh(); };

  T.route(/^\/insectes$/, 'plus', function () { return { title: 'Insectes du jardin', html: homeHtml() }; });

  /* ---------- Fiche d'un insecte ---------- */
  function missing() {
    return { title: 'Insectes du jardin', html: '<div class="card"><h2>Cette fiche n\'existe pas</h2><p>Elle a peut-être changé de nom. Retournez à la liste pour la retrouver.</p><a class="btn primary block" href="#/insectes">Voir tous les insectes</a></div>' };
  }
  function section(titre, arr) { return arr && arr.length ? '<div class="card"><h3>' + esc(titre) + '</h3><ul class="in-list">' + T.list(arr) + '</ul></div>' : ''; }
  function pageHtml(e) {
    var h = '', now = T.monthNow();
    h += '<div class="card in-head">' + svg(e.svg) + '<h2>' + esc(e.nom) + '</h2>' + (e.latin ? '<p class="muted"><i>' + esc(e.latin) + '</i></p>' : '') +
      '<div class="tags"><span class="in-tag ' + (e.camp === 'ami' ? 'ok' : 'warn') + '">' + esc(campTxt(e.camp)) + '</span>' + (e.taille ? '<span class="tag">Taille : ' + esc(e.taille) + '</span>' : '') + '</div>' +
      '<div class="row">' + T.voice.button(speech(e), 'Écouter la fiche') + '</div></div>';
    h += '<div class="card"><h3>Comment le reconnaître ?</h3><p>' + esc(e.reco) + '</p></div>';
    h += '<div class="card"><h3>Ami ou ennemi ?</h3><p>' + esc(e.role) + '</p><h3>Ce qu\'il fait au jardin</h3><p>' + esc(e.fait) + '</p></div>';
    if (e.danger) h += '<div class="notice bad"><b>Attention, danger pour les personnes.</b><br>' + esc(e.danger) + '</div>';
    if (e.animaux) h += '<div class="notice bad"><b>Attention, danger pour les animaux.</b><br>' + esc(e.animaux) + '</div>';
    if (e.mois && e.mois.length) {
      h += '<div class="card"><h3>Quand on le voit</h3>' + T.months12(e.mois) + '<p class="small muted">' + esc(e.mois.length >= 12 ? 'Toute l\'année' : T.monthsText(e.mois).replace(/^./, function (c) { return c.toUpperCase(); })) + '</p>';
      if (e.mois.indexOf(now) >= 0 && e.mois.length < 12) h += '<div class="notice ok">On peut le voir en ce moment.</div>';
      h += '</div>';
    }
    var pl = e.plantes.map(function (id) { return T.plante(id); }).filter(Boolean);
    if (pl.length) h += '<div class="card"><h3>' + (e.camp === 'ami' ? 'Plantes qu\'il visite ou aide' : 'Plantes qu\'il attaque') + '</h3><div class="chips">' + pl.map(function (p) { return '<a class="chip in-chip" href="#/plante/' + esc(p.id) + '">' + esc(p.nom) + '</a>'; }).join('') + '</div></div>';
    h += section('Signes de sa présence', e.signes);
    h += section('Que faire', e.faire);
    h += section('À ne pas faire', e.eviter);
    var ml = e.maladies.map(maladie).filter(Boolean);
    if (ml.length) h += '<div class="card"><h3>Problème lié dans l\'application</h3>' + ml.map(function (m) { return '<a class="item" href="#/maladie/' + esc(m.id) + '"><b>' + esc(m.nom) + '</b><i>' + esc(m.resume) + '</i></a>'; }).join('') + '</div>';
    var gl = e.gestes.map(geste).filter(Boolean);
    if (gl.length) h += '<div class="card"><h3>Gestes pour vous aider</h3><div class="chips">' + gl.map(function (g) { return '<a class="chip in-chip" href="#/geste/' + esc(g.id) + '">' + esc(g.titre) + '</a>'; }).join('') + '</div></div>';
    var near = LIST().filter(function (o) { return o.camp === e.camp && o.id !== e.id; }).slice(0, 3);
    if (near.length) h += '<h3>Fiches proches</h3>' + near.map(itemHtml).join('');
    h += '<a class="btn block" href="#/insectes" style="margin-top:.6rem">Voir tous les insectes</a>';
    return h;
  }
  T.route(/^\/insecte\/([^\/?]+)$/, 'plus', function (m) {
    var e = IN.get(decodeURIComponent(m[1]));
    if (!e) return missing();
    return { title: e.nom, html: pageHtml(e) };
  });

  /* ---------- Jeu « Ami ou ennemi ? » ---------- */
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function newGame() {
    var pool = LIST().filter(function (e) { return e.quiz !== false; });
    var ami = shuffle(pool.filter(function (e) { return e.camp === 'ami'; })), en = shuffle(pool.filter(function (e) { return e.camp === 'ennemi'; }));
    var qs = ami.slice(0, 5).concat(en.slice(0, 5));
    if (qs.length < 10) qs = shuffle(pool.slice()).slice(0, 10);
    QZ = { qs: shuffle(qs).map(function (e) { return e.id; }), i: 0, score: 0, rep: null, done: false };
  }
  function quizBody() {
    if (!QZ) newGame();
    var h = '';
    if (!QZ.qs.length) return '<div class="card"><h2>Le jeu n\'est pas disponible</h2><p>Il n\'y a pas de fiche à jouer pour le moment.</p><a class="btn block" href="#/insectes">Retour</a></div>';
    if (QZ.done) {
      var r = root(), n = QZ.qs.length, msg = QZ.score >= n * 0.8 ? 'Bravo, vous avez l\'œil !' : QZ.score >= n * 0.5 ? 'Bien joué, vous progressez.' : 'Pas grave : on apprend en jouant. Relisez les fiches et rejouez.';
      h += '<div class="card in-score"><h2>Votre score : ' + QZ.score + ' sur ' + n + '</h2><p>' + esc(msg) + '</p><p class="muted">Votre record : ' + r.best + ' sur 10. Parties jouées : ' + r.played + '.</p>' +
        '<button class="btn primary block" data-act="inqagain">Rejouer</button><a class="btn block" href="#/insectes">Retour aux insectes</a></div>';
      return h;
    }
    var e = IN.get(QZ.qs[QZ.i]);
    if (!e) { QZ.i += 1; if (QZ.i >= QZ.qs.length) QZ.done = true; return quizBody(); }
    var n2 = QZ.qs.length;
    h += '<p class="small muted in-count" aria-live="polite">Question ' + (QZ.i + 1) + ' sur ' + n2 + ' - Score : ' + QZ.score + '</p><div class="in-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + n2 + '" aria-valuenow="' + QZ.i + '"><i style="width:' + Math.round(QZ.i / n2 * 100) + '%"></i></div>';
    h += '<div class="card in-q-card">' + svg(e.svg) + '<h2>' + esc(e.nom) + '</h2><p>' + esc(e.reco) + '</p>';
    if (!QZ.rep) {
      h += '<div class="in-stick"><p><b>Ami ou ennemi des plantes ?</b></p><div class="in-two"><button class="btn primary in-ans" data-act="inqans" data-r="ami">Ami du jardin</button><button class="btn in-ans" data-act="inqans" data-r="ennemi">Indésirable</button></div></div>';
    } else {
      var ok = QZ.rep.ok;
      h += '<div class="notice ' + (ok ? 'ok' : 'bad') + '" role="status"><b>' + (ok ? 'Bonne réponse !' : 'Pas tout à fait.') + '</b> C\'est : ' + esc(campTxt(e.camp)) + '.<br>' + esc(e.role) + '<br>' + esc(e.fait) + '</div>' +
        '<div class="in-stick"><div class="row"><button class="btn primary grow" data-act="inqnext">' + (QZ.i >= n2 - 1 ? 'Voir mon score' : 'Question suivante') + '</button><a class="btn" href="#/insecte/' + esc(e.id) + '">Voir la fiche</a></div></div>';
    }
    h += '</div><button class="btn block" data-act="inqread">Lire cette question à voix haute</button>';
    return h;
  }
  function drawQuiz() { var el = document.getElementById('in-quiz'); if (el) { el.innerHTML = quizBody(); try { el.scrollIntoView && document.getElementById('view') && (document.getElementById('view').scrollTop = 0); } catch (e) { /* rien */ } } }
  T.act.inqans = function (el) {
    if (!QZ || QZ.rep || QZ.done) return;
    var e = IN.get(QZ.qs[QZ.i]); if (!e) return;
    var ok = el.getAttribute('data-r') === e.camp, r = root();
    if (ok) QZ.score += 1;
    var v = r.vus[e.id]; if (!Array.isArray(v)) v = r.vus[e.id] = [0, 0]; v[ok ? 0 : 1] += 1;
    QZ.rep = { ok: ok }; T.store.save(); drawQuiz();
  };
  T.act.inqnext = function () {
    if (!QZ || !QZ.rep) return;
    QZ.rep = null; QZ.i += 1;
    if (QZ.i >= QZ.qs.length) {
      QZ.done = true; var r = root(); r.played += 1; r.last = QZ.score; if (QZ.score > r.best) r.best = QZ.score; T.store.save();
      feuille(QZ.score >= 8 ? 'Bravo ! Tu connais bien les insectes : ' + QZ.score + ' sur ' + QZ.qs.length + '.' : 'Tu as eu ' + QZ.score + ' sur ' + QZ.qs.length + '. On rejoue pour apprendre ?', QZ.score >= 8 ? 'fier' : 'doux');
    }
    drawQuiz();
  };
  T.act.inqagain = function () { newGame(); drawQuiz(); };
  T.act.inqread = function () {
    if (!QZ) return;
    if (QZ.done) { say('Votre score : ' + QZ.score + ' sur ' + QZ.qs.length + '.'); return; }
    var e = IN.get(QZ.qs[QZ.i]); if (!e) return;
    say(QZ.rep ? ((QZ.rep.ok ? 'Bonne réponse. ' : 'Pas tout à fait. ') + 'C\'est : ' + campTxt(e.camp) + '. ' + e.role + ' ' + e.fait) : (e.nom + '. ' + e.reco + ' Ami ou ennemi des plantes ?'));
  };
  T.route(/^\/insectes\/jeu$/, 'plus', function () {
    if (!QZ || !T.cur || T.cur.path !== '/insectes/jeu') newGame(); /* un simple réaffichage ne relance pas la partie */
    return { title: 'Ami ou ennemi ?', html: '<div id="in-quiz">' + quizBody() + '</div>' };
  });
  IN.jeu = function () { return QZ ? { i: QZ.i, score: QZ.score, done: QZ.done, ids: QZ.qs.slice() } : null; };

  /* ---------- Carte sur la fiche d'une plante ---------- */
  T.fichePlus = T.fichePlus || [];
  T.fichePlus.push(function (p) {
    try {
      if (!p || !p.id) return '';
      var all = LIST().filter(function (e) { return e.plantes.indexOf(p.id) >= 0; });
      if (!all.length) return '';
      var am = all.filter(function (e) { return e.camp === 'ami'; }), en = all.filter(function (e) { return e.camp === 'ennemi'; });
      function chips(l) { return '<div class="chips">' + l.map(function (e) { return '<a class="chip in-chip" href="#/insecte/' + esc(e.id) + '">' + esc(e.nom) + '</a>'; }).join('') + '</div>'; }
      var h = '<div class="card in-card"><h3>Insectes de cette plante</h3>';
      if (en.length) h += '<p class="muted small">À surveiller :</p>' + chips(en);
      if (am.length) h += '<p class="muted small">Amis qui peuvent l\'aider :</p>' + chips(am);
      return h + '<a class="btn block" href="#/insectes">Tous les insectes du jardin</a></div>';
    } catch (e) { return ''; }
  });
})();
