/* Tifa Nature - « Assistant jardin » : répond aux questions en français courant, HORS CONNEXION.
   Aucune IA en ligne et aucun appel réseau : l'assistant comprend l'intention de la question (quand semer, où placer,
   combien arroser, pourquoi les feuilles jaunissent...) puis répond avec les fiches de l'application, citées en lien. */
(function () {
  'use strict';
  var T = window.T, A = T.assistant = { last: null, lastQ: '' };

  /* ---------- Outils de texte ---------- */
  function sing(w) { return w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w; }
  /* texte normalisé avec chaque mot au singulier : « tomates cerises » -> « tomate cerise » */
  function singStr(s) { return T.norm(s).split(' ').map(sing).join(' '); }
  function has(hay, phrase) { return (' ' + hay + ' ').indexOf(' ' + phrase + ' ') >= 0; }
  function uniq(a) { var o = [], i; for (i = 0; i < a.length; i++) if (o.indexOf(a[i]) < 0) o.push(a[i]); return o; }
  function names(list) { return list.join(', '); }
  function firstSentences(t, n) {
    var parts = String(t || '').match(/[^.!?]+[.!?]+/g) || [String(t || '')];
    return parts.slice(0, n || 2).join(' ').replace(/\s+/g, ' ').trim();
  }
  function lc(s) { return String(s || '').toLowerCase(); }

  /* ---------- Correction des fautes de frappe sur les mots-clés ---------- */
  var KEYS = ('semer semis semez semons semailles planter plantation plantez repiquer transplanter recolter recolte recoltez cueillir cueillette tailler taille taillez elaguer rabattre ' +
    'arroser arrosage arrosez arrosoir fleurir fleurit fleurissent floraison jaunissent jaunit jaunes jaunissement fletrissent fletries fletri tombent taches tache brunes noires blanche blanches poudre ' +
    'trous mangees grignotees moisissure pourrissent pourrie pourriture ombre soleil balcon terrasse toxique toxiques facile faciles interieur appartement voisins voisin associer association associations ' +
    'hiver rentrer printemps automne exposition ensoleillement lumiere placer installer mettre quand combien comment pourquoi mois janvier fevrier avril juillet aout septembre octobre novembre decembre ' +
    'feuilles fleurs fruits racines insectes pucerons puceron araignee araignees limaces escargots mildiou oidium cochenilles cochenille chenilles fourmis compost rempoter rempotage engrais terreau ' +
    'chats chiens animaux enfants debutant resistant resiste rustique jardiniere frequence quantite problem probleme malade meurt mourir secher dessecher desseche enroulees deformees collantes ' +
    'orange rouille taches moisies insecte bestioles champignon champignons gelee froid chauffage lumineux lumineuse humidite boutures bouture arrosee trop manque carence excès exces ' +
    'conseil conseils astuce guide mensuel calendrier semaine planning aromatiques legumes arbuste arbustes grimpante grimpantes succulentes tolerer supporte supportent craint craignent').split(' ');
  var KEYSET = {}, i0;
  for (i0 = 0; i0 < KEYS.length; i0++) KEYSET[T.norm(KEYS[i0])] = 1;
  var KNOWN = ('plantes plante plants jardin jardins pourrait pourraient faites mettez mettre mettent quelle quelles quelque quelques entre comme avant apres pendant depuis toujours jamais aussi encore ' +
    'beaucoup petite petites petits grande grands grandes autre autres toutes tous tout chaque cette cettes votre notre merci bonjour bonsoir salut coucou faire faut peut peuvent veut voulez ' +
    'plusieurs souvent parfois vraiment vraie vrais besoin choisir choisis choix idees idee exemple simple simples facilement rapide rapides pousse poussent pousser nourrir nourriture jardinier ' +
    'maison maisons cour cours fenetre fenetres pieces piece salon chambre cuisine bureau sorte sortes espece especes variete varietes nouveau nouvelle voisine voisines').split(' ');
  for (i0 = 0; i0 < KNOWN.length; i0++) KEYSET[KNOWN[i0]] = 1;

  var idxP = null, PV = {}, MAL = null, DOCS = null, SYMIDS = null;

  /* Plantes : toutes les façons de les nommer (nom, synonymes, mot entre parenthèses, sans « en pot »). */
  function buildPlants() {
    idxP = []; PV = {};
    T.D.plantes.forEach(function (p) {
      var raw = [p.nom].concat(p.synonymes || []), seen = {}, noms = {};
      raw.slice().forEach(function (r) {
        var m = /^([^(]+)\(([^)]+)\)\s*$/.exec(r);
        if (m) { raw.push(m[1]); raw.push(m[2]); if (r === p.nom) { noms[m[1]] = 1; noms[m[2]] = 1; } }
      });
      raw.slice().forEach(function (r) {
        var x = r.replace(/\s+en (pot|sac)\s*$/i, '').replace(/\([^)]*\)/g, ' ');
        if (x !== r) { raw.push(x); if (r === p.nom) noms[x] = 1; }
      });
      raw.forEach(function (r) {
        var ph = singStr(r.replace(/\([^)]*\)/g, ' ')); if (!ph || ph.length < 2 || seen[ph]) return;
        seen[ph] = 1; idxP.push({ p: p, ph: ph, n: ph.split(' ').length, nom: r === p.nom || !!noms[r] });
        ph.split(' ').forEach(function (w) { PV[w] = 1; });
      });
    });
  }
  function spellfix(n) {
    if (!idxP) buildPlants();
    return n.split(' ').map(function (t) {
      if (t.length < 6 || KEYSET[t] || KEYSET[sing(t)] || PV[sing(t)] || /\d/.test(t)) return t;
      var max = t.length >= 8 ? 2 : 1, best = null, bd = 9;
      Object.keys(KEYSET).forEach(function (k) {
        if (k.charAt(0) !== t.charAt(0) || Math.abs(k.length - t.length) > max) return;
        var d = T.lev(t, k, max); if (d <= max && d < bd) { bd = d; best = k; }
      });
      return best || t;
    }).join(' ');
  }

  /* Plante citée dans la question : nom exact (le plus long gagne), sinon faute de frappe proche. */
  var NOFUZZY = /^(quand|combien|comment|pourquoi|plante|feuille|fleur|fruit|tige|racine|terre|terreau|pot|jardin|arbre|arbuste|legume|aromatique|conseil|astuce|guide|calendrier|planning|cour|balcon|terrasse|maison|chambre|salon|bureau|cuisine|fenetre|appartement|eau|engrais|compost|chat|chien|animal|enfant|jaune|jaunir|brun|noir|blanc|rouge|vert|gris|mois|saison|semaine|hiver|ete|automne|printemps|soleil|ombre|lumiere|toxique|facile|simple|resistant|rapide|petit|grand|beau|belle|bon|bonne|mauvais|autre|dessus|dessous|cote|voisin|pres|avec|sans|pour|dans|sous|entre|plusieurs|beaucoup|danger|dangereux|dangereuse|poison|nocif|animaux|sans|faire|mettre|placer|trop|assez|peu|tres|pousser|pousse|tomber|tombe|couleur|odeur|moisi|sec|seche|mou|molle|trou|tache|insecte|bete|pourri|malade|mort|vivant)$/;
  function findPlant(sq, tokens) {
    if (!idxP) buildPlants();
    var best = null, bs = 0, hay = ' ' + sq + ' ';
    idxP.forEach(function (e) {
      if (hay.indexOf(' ' + e.ph + ' ') >= 0) { var s = e.n * 100 + e.ph.length + (e.nom ? 50 : 0); if (s > bs) { bs = s; best = e.p; } }
    });
    if (best) return best;
    var cand = null, cs = 0;
    tokens.forEach(function (t) {
      if (t.length < 4 || KEYSET[t] || KEYSET[sing(t)] || NOFUZZY.test(t) || NOFUZZY.test(sing(t))) return;
      var r = T.search.plants(t, {}); if (r.length && r[0].score >= 4 && r[0].score > cs) { cs = r[0].score; cand = r[0].p; }
    });
    return cand;
  }

  /* ---------- Maladies citées par leur nom ou par une expression courante ---------- */
  var ALIAS = {
    'pucerons': ['puceron'], 'cochenilles': ['cochenille'], 'mildiou': ['mildiou'], 'oidium': ['oidium', 'blanc du rosier', 'maladie du blanc'], 'rouille': ['rouille'],
    'tache-noire-rosier': ['tache noire du rosier', 'taches noires du rosier', 'marsonia'], 'botrytis': ['botrytis', 'pourriture grise', 'moisissure grise'],
    'fonte-semis': ['fonte des semis', 'fonte de semis', 'semis pourrissent', 'semis fondent', 'semis qui pourrissent'], 'limaces-escargots': ['limace', 'escargot', 'baves'],
    'acariens-araignees-rouges': ['acarien', 'araignee rouge', 'tetranyque', 'araignee'], 'aleurodes-mouches-blanches': ['aleurode', 'mouche blanche'], 'thrips': ['thrips'],
    'chenilles': ['chenille'], 'doryphore': ['doryphore'], 'mouche-carotte': ['mouche de la carotte', 'mouche carotte', 'mouche des carotte'], 'altise': ['altise'],
    'cloque-pecher': ['cloque', 'cloque du pecher'], 'moniliose': ['moniliose'], 'pourriture-apicale': ['cul noir', 'pourriture apicale', 'bout noir'],
    'pourriture-racines': ['racine pourrie', 'racines pourries', 'pourriture des racines', 'pourriture racinaire'],
    'exces-arrosage': ['trop arrose', 'trop arrosee', 'trop d eau', 'trop d arrosage', 'exces d eau', 'exces d arrosage', 'noye', 'noyee', 'eau stagnante', 'arrose trop', 'trop de pluie'],
    'manque-eau': ['manque d eau', 'pas assez d eau', 'pas assez arrose', 'pas assez arrosee', 'soif', 'assoiffee', 'oublie d arroser', 'pas arrose', 'secheresse'],
    'manque-lumiere': ['manque de lumiere', 'pas assez de lumiere', 'pas assez de soleil', 'manque de soleil', 'etiolee', 'etiolement', 's etire', 'file vers la lumiere'],
    'coup-de-soleil': ['coup de soleil', 'brulure de soleil', 'brulee par le soleil', 'brule au soleil', 'brulee au soleil'],
    'gel-froid': ['gel', 'gelee', 'gele', 'geler', 'givre', 'froid', 'brulee par le gel'], 'carence-azote': ['carence en azote', 'manque d azote'],
    'carence-fer-chlorose': ['chlorose', 'carence en fer', 'manque de fer'], 'carence-potassium': ['carence en potassium', 'manque de potassium'],
    'carence-magnesium': ['carence en magnesium', 'manque de magnesium'], 'sol-trop-calcaire': ['sol calcaire', 'terre calcaire', 'trop calcaire', 'calcaire'],
    'sol-tasse-asphyxie': ['sol tasse', 'terre tassee', 'terre compactee', 'terre dure', 'asphyxie'], 'fourmis': ['fourmi'],
    'vers-blancs-otiorhynque': ['ver blanc', 'otiorhynque', 'larve blanche'], 'cicadelles': ['cicadelle'],
    'mouche-oignon-poireau': ['mouche de l oignon', 'mouche du poireau', 'mouche de l oignon et du poireau', 'mouche oignon'], 'hernie-chou': ['hernie du chou', 'hernie'],
    'virus-mosaique': ['mosaique', 'virus'], 'fumagine': ['fumagine', 'suie'], 'eclatement-fruits': ['eclatement', 'fruit qui eclate', 'fruit fendu', 'fruit fendus', 'eclatent', 'eclate'],
    'montaison-prematuree': ['monte en graine', 'montee en graine', 'monter en graine', 'montaison', 'montent en graine'],
    'brulure-engrais': ['brulure d engrais', 'trop d engrais', 'exces d engrais', 'engrais brule'], 'courant-air-chauffage': ['courant d air', 'chauffage', 'radiateur'],
    'moucherons-terreau': ['moucheron', 'petite mouche', 'petites mouches'], 'pyrale-buis': ['pyrale', 'pyrale du buis', 'chenille du buis']
  };
  function buildMal() {
    MAL = [];
    T.D.maladies.forEach(function (d) {
      var phr = (ALIAS[d.id] || []).slice();
      var nm = d.nom.replace(/\([^)]*\)/g, ' '); phr.push(nm);
      (/\(([^)]+)\)/.exec(d.nom) || []).slice(1).forEach(function (x) { phr.push(x); });
      uniq(phr.map(singStr)).forEach(function (ph) { if (ph) MAL.push({ d: d, ph: ph, n: ph.split(' ').length }); });
    });
  }
  function findMal(sq) {
    if (!MAL) buildMal();
    var best = null, bs = 0, hay = ' ' + sq + ' ';
    MAL.forEach(function (e) {
      if (hay.indexOf(' ' + e.ph + ' ') >= 0) { var s = e.n * 100 + e.ph.length; if (s > bs) { bs = s; best = e.d; } }
    });
    return best;
  }

  /* ---------- Symptômes (mêmes identifiants que « Ma plante est malade ») ---------- */
  var SYM = [
    [/jaunis|jaunit|jaunir|jaunie|vire\w* au jaune|feuilles? [a-z ]{0,18}jaune/, ['f_jaunissent']],
    [/tache[a-z ]{0,20}(brun|marron)|(brun|marron)[a-z ]{0,12}tache/, ['f_taches_brunes']], [/tache[a-z ]{0,20}noir|noir[a-z ]{0,12}tache/, ['f_taches_noires']],
    [/\btaches?\b/, ['f_taches_brunes', 'f_taches_noires']], [/poudre|farine|feuilles? [a-z ]{0,12}blanch|blanc sur|duvet blanc|blanchatre/, ['f_poudre_blanche']],
    [/pustule|boutons? orange|taches? orange|points? orange|poudre orange|orange sous/, ['f_pustules_orange_dessous']], [/\btrous?\b|trouee|mangee|grignot|rongee|croquee|dentel|perforee/, ['f_trous']],
    [/bords?[a-z ]{0,14}(sec|brun|brul|crame|jaun)|(sec|brun|brul|crame)[a-z ]{0,10}bords?/, ['f_bords_secs']], [/(pointe|bout)s?[a-z ]{0,14}(sec|brun)/, ['f_pointes_brunes']],
    [/enroul|recroquevil|deform|cloque|frise|crispe/, ['f_enroulees_deformees']], [/collant|poisse|poisseu|miellat|gluant/, ['f_collantes_miellat']], [/suie|noircie|depot noir/, ['f_noircies_suie']],
    [/fletri|flasque|molle|\bmous?\b|pendent|retombent|affaiss|avach|baisse la tete|fanent|fane\b|fanee|se couche/, ['f_fanent_molles']],
    [/tombent|\bchute\b|perd\w* ses feuilles|perd\w* les feuilles|lache ses feuilles/, ['f_tombent']], [/\bpales?\b|decolor|delav|blafard|terne|perd sa couleur/, ['f_pales_decolorees']],
    [/toile|araignee/, ['f_toiles_fines']], [/insecte|bestiole|petite bete|parasite|puceron/, ['f_insectes_visibles']], [/argent|mouchet/, ['f_mouchetees_argentees']],
    [/mosaique|marbr/, ['f_mosaique']], [/chenille/, ['f_chenilles_visibles']], [/galerie|serpentin|dessin dans la feuille/, ['f_galeries_mines']], [/fourmi/, ['t_fourmis_presentes']],
    [/moisi|moisissure|pourriture grise|duvet gris/, ['t_moisissure_grise']], [/(fleur|bouton)s?[a-z ]{0,14}(tombent|chute)/, ['fl_boutons_tombent']], [/(fleur|bouton)s?[a-z ]{0,14}(pourri|moisi)/, ['fl_boutons_pourrissent']],
    [/ne fleurit (pas|plus)|fleurit (pas|plus|jamais)|ne fleurissent (pas|plus)|refuse de fleurir|pas de fleur|plus de fleur|aucune fleur/, ['fl_pas_de_fleurs']],
    [/fleurs?[a-z ]{0,14}(fanent|fane|durent pas|ne durent)/, ['fl_fanent_vite']], [/fleurs?[a-z ]{0,10}tache|tache[a-z ]{0,10}petale/, ['fl_taches_petales']],
    [/(bout|pointe|cul)[a-z ]{0,8}noir|noir[a-z ]{0,8}(bout|pointe)/, ['fr_pourriture_pointe']], [/eclatent|eclate|eclatement|fendu|fendent|se fend/, ['fr_eclatent']], [/fruits?[a-z ]{0,10}tache/, ['fr_taches_sombres']],
    [/fruits?[a-z ]{0,10}deform/, ['fr_deformes']], [/fruits?[a-z ]{0,12}(ver|perc|trou)/, ['fr_trous_vers']],
    [/(terre|terreau)[a-z ]{0,14}(moisi|blanc)|moisi[a-z ]{0,10}(terre|terreau)/, ['r_terreau_moisi_blanc']], [/croute|sel blanc/, ['r_croute_blanche_sel']],
    [/(terre|sol|terreau)[a-z ]{0,10}(dur|craquel|fissur)/, ['r_sol_dur_craquele']], [/odeur|sent mauvais|\bpue\b|sent mal/, ['r_mauvaise_odeur']], [/racines?[a-z ]{0,12}(brun|mou|pourri|noir)/, ['r_racines_brunes_molles']],
    [/galle|boules? [a-z ]{0,10}racine|renflement/, ['r_galles_renflements']], [/larve|vers blanc/, ['r_vers_blancs']], [/\betir|etiole|filant|file vers/, ['t_allongee_etiolee']],
    [/base[a-z ]{0,10}(pourri|noire|mole)|collet/, ['t_base_pourrie']], [/ne pousse (plus|pas)|pousse (plus|pas)|croissance (stoppee|bloquee|arretee)|stagne|ne grandit|rabougri/, ['g_croissance_stoppee']],
    [/apres[a-z ]{0,10}gel|a gele|gelee/, ['g_apres_gel']], [/apres[a-z ]{0,12}(soleil|canicule|chaleur)/, ['g_apres_soleil_fort']], [/chauffage|courant d air|radiateur/, ['g_pres_chauffage_courant_air']],
    [/toute la plante[a-z ]{0,10}(fane|meurt|seche)|plante entiere/, ['g_plante_entiere_fane']]
  ];
  function allSymIds() {
    if (SYMIDS) return SYMIDS;
    SYMIDS = {}; T.D.maladies.forEach(function (d) { (d.symptomes || []).forEach(function (s) { SYMIDS[s] = 1; }); }); return SYMIDS;
  }
  function symptoms(n) {
    var out = [], ok = allSymIds();
    SYM.forEach(function (r) { if (r[0].test(n)) r[1].forEach(function (id) { if (ok[id] && out.indexOf(id) < 0) out.push(id); }); });
    /* « taches » générique : si un type précis a été trouvé, on retire le générique */
    if (out.indexOf('f_taches_brunes') >= 0 && out.indexOf('f_taches_noires') >= 0 && /tache[a-z ]{0,20}(brun|marron)|tache[a-z ]{0,20}noir|(brun|marron|noir)[a-z ]{0,12}tache/.test(n)) {
      if (!/noir/.test(n)) out.splice(out.indexOf('f_taches_noires'), 1); else if (!/brun|marron/.test(n)) out.splice(out.indexOf('f_taches_brunes'), 1);
    }
    return out;
  }
  function diagnose(sel, plantId) {
    var D = T.diag; if (!D || !D.compute) return [];
    var bs = D.sel, bp = D.plantId, res = [];
    try { var o = {}; sel.forEach(function (s) { o[s] = true; }); D.sel = o; D.plantId = plantId || ''; res = D.compute(); } catch (e) { res = []; }
    D.sel = bs; D.plantId = bp; return res;
  }

  /* ---------- Mois, listes ---------- */
  var MONTHN = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  function monthIn(n, toks) {
    var i, j;
    for (i = 0; i < toks.length; i++) for (j = 0; j < 12; j++) if (toks[i] === MONTHN[j] || (toks[i].length >= 6 && T.lev(toks[i], MONTHN[j], 1) <= 1)) return j + 1;
    return 0;
  }
  function filterPlants(f) {
    var list = T.search.plants('', { soleil: f.soleil || '', pot: !!f.pot, interieur: !!f.interieur, facile: !!f.facile, cat: f.cat || '' });
    list = list.map(function (r) { return r.p; });
    if (f.safe) list = list.filter(function (p) { return !(p.toxique && p.toxique.chatChien); });
    if (f.toxic) list = list.filter(function (p) { return p.toxique && p.toxique.chatChien; });
    return list;
  }

  /* ---------- Fabrication des réponses ---------- */
  function link(href, label, sub) { return { href: href, label: label, sub: sub || '' }; }
  function plantLink(p) { return link('#/plante/' + p.id, 'Fiche : ' + p.nom, p.latin); }
  function malLink(d) { return link('#/maladie/' + d.id, d.nom, d.resume); }
  function conseil(id) { var c = T.byId(T.D.conseils, id); return c ? link('#/conseil/' + c.id, c.titre, T.THEMES[c.theme] || '') : null; }
  function guide(id) { var g = T.byId(T.D.guides, id); return g ? link('#/guide/' + g.id, g.titre, 'Guide pas à pas') : null; }
  function add(arr) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) arr.push(arguments[i]); return arr; }
  function regionNote() {
    var R = T.region, r = R ? R.current() : null;
    return r ? 'Dates adaptées à votre région : ' + r.nom + '.' : 'Dates pour un climat moyen. Choisissez votre région pour les adapter.';
  }
  function regionAct() { var R = T.region; return R && !R.current() ? [{ act: 'regionpick', label: 'Choisir ma région' }] : []; }

  var EVERY = { faible: 10, moyen: 5, eleve: 2 };

  function ansTiming(p, n) {
    var R = T.region, want = [], paras = [], lines = [];
    var kinds = [['semis', 'Semis', /\b(semer|semis|seme|semez|semons|semailles)\b/], ['plantation', 'Plantation', /\b(planter|plantation|plantez|plantons|replanter|repiquer|transplanter|mettre en terre)\b|\bplante t? ?on\b/],
      ['recolte', 'Récolte', /\b(recolter|recolte|recoltez|cueillir|cueillette|ramasser|maturite)\b/], ['taille', 'Taille', /\b(tailler|taille|taillez|elaguer|rabattre|couper|pincer|elagage)\b/], ['floraison', 'Floraison', /\b(fleurir|fleurit|fleurissent|floraison|fleurira)\b/]];
    kinds.forEach(function (k) { if (k[2].test(n)) want.push(k); });
    if (!want.length) want = kinds.slice();
    var explicit = want.length < kinds.length, m = T.monthNow(), title = p.nom + ' : les bonnes périodes';
    want.forEach(function (k) {
      var arr = R ? R.monthsFor(p, k[0]) : (p[k[0]] || []);
      if (arr.length) lines.push(k[1] + ' : ' + T.monthsText(arr) + '.' + (arr.indexOf(m) >= 0 ? ' C\'est le bon moment ce mois-ci.' : ''));
      else if (explicit) lines.push(k[1] + ' : pas conseillé ou sans objet pour cette plante.' + (k[0] === 'semis' && (p.plantation || []).length ? ' On l\'achète plutôt en plant : plantation en ' + T.monthsText(R ? R.monthsFor(p, 'plantation') : p.plantation) + '.' : ''));
    });
    if (!lines.length) lines.push('Je n\'ai pas de dates précises pour cette plante.');
    paras = lines.concat([regionNote()]);
    var links = add([plantLink(p)], guide(want[0] && want[0][0] === 'taille' ? 'tailler-sans-se-tromper' : 'semer-pas-a-pas'), link('#/calendrier', 'Calendrier du jardin', 'Mois par mois'));
    return { intent: 'timing', title: title, paras: paras, links: links, plantId: p.id, actions: regionAct() };
  }
  function ansWater(p, n) {
    var fq = p.arrosage.frequence, every = EVERY[fq] || 5, m = T.monthNow(), paras = [];
    paras.push(firstSentences(p.arrosage.conseil, 2));
    paras.push('Repère : ' + (T.ARROS[fq] || 'arrosage moyen').toLowerCase() + ', environ tous les ' + every + ' jours. Vérifiez toujours la terre avec le doigt.');
    if (m >= 6 && m <= 8) paras.push('En été, surveillez plus souvent, surtout en pot.'); else if (m === 11 || m === 12 || m <= 2) paras.push('En hiver, arrosez moins : la terre sèche plus lentement.');
    return { intent: 'water', title: 'Arroser : ' + p.nom, paras: paras, links: add([plantLink(p)], conseil('test-du-doigt'), guide('bien-arroser')), plantId: p.id };
  }
  function ansWhere(p, n) {
    var z = T.pots ? T.pots.zoneFor(p) : null, paras = [], sol = p.soleil || [];
    if (/\bmi ombre\b/.test(n)) paras.push(sol.indexOf('mi_ombre') >= 0 ? 'Oui, la mi-ombre lui convient.' : 'La mi-ombre n\'est pas idéale pour elle.');
    else if (/\bombre\b/.test(n)) paras.push(sol.indexOf('ombre') >= 0 ? 'Oui, elle supporte l\'ombre.' : 'Non, elle a besoin de plus de lumière.');
    else if (/\bsoleil\b/.test(n)) paras.push(sol.indexOf('plein_soleil') >= 0 ? 'Oui, elle aime le soleil.' : 'Attention : trop de soleil direct peut la brûler.');
    paras.push('Lumière : ' + p.heuresSoleil + '.');
    if (z) paras.push('Meilleure place : ' + z.nom + '.');
    if (T.pots && T.pots.orientation) paras.push('Orientation conseillée : ' + T.pots.orientation(p) + '.');
    paras.push(p.pot && p.pot.possible ? 'En pot : oui, pot d\'environ ' + p.pot.volumeLitres + ' litres. ' + firstSentences(p.pot.conseil, 1) : 'En pot : mieux vaut la pleine terre. ' + firstSentences((p.pot && p.pot.conseil) || '', 1));
    if (p.interieur && !p.exterieur) paras.push('C\'est une plante d\'intérieur.'); else if (p.interieur) paras.push('Elle vit aussi bien dedans que dehors.');
    return { intent: 'where', title: 'Où placer : ' + p.nom, paras: paras, links: add([plantLink(p)], link('#/pots', 'Mes pots', 'Placer chaque pot au bon endroit')), plantId: p.id };
  }
  function ansCompanion(p) {
    var amies = p.amies || [], ennemies = p.ennemies || [], paras = [], links = [plantLink(p)];
    paras.push(amies.length ? 'Bons voisins de ' + lc(p.nom) + ' : ' + names(amies) + '.' : 'Je n\'ai pas de bons voisins précis pour cette plante.');
    if (ennemies.length) paras.push('À éviter à côté : ' + names(ennemies) + '.');
    amies.slice(0, 4).forEach(function (a) { var r = T.search.plants(a, {}); if (r.length && r[0].score >= 8 && r[0].p.id !== p.id) links.push(plantLink(r[0].p)); });
    return { intent: 'companion', title: 'À côté de : ' + p.nom, paras: paras, links: links, plantId: p.id };
  }
  function ansToxic(p) {
    var t = p.toxique || {}, paras = [];
    if (t.chatChien) { paras.push('Attention : ' + lc(p.nom) + ' est toxique pour les chats et les chiens.'); if (t.note) paras.push(t.note); paras.push('Placez-la hors de portée des animaux et des jeunes enfants.'); }
    else { paras.push(p.nom + ' n\'est pas signalée comme toxique pour les chats et les chiens dans l\'application.'); if (t.note) paras.push(t.note); paras.push('Par prudence, empêchez les animaux de la grignoter en grande quantité.'); }
    return { intent: 'toxic', title: 'Toxicité : ' + p.nom, paras: paras, links: [plantLink(p)], plantId: p.id };
  }
  function ansWinter(p) {
    return { intent: 'winter', title: 'Froid et hiver : ' + p.nom, paras: ['Résistance : ' + p.rusticite, p.hivernage], links: add([plantLink(p)], guide('proteger-du-gel'), conseil('voile-d-hivernage')), plantId: p.id };
  }
  function ansSummary(p, extra) {
    var z = T.pots ? T.pots.zoneFor(p) : null;
    var paras = [p.description, 'Lumière : ' + p.heuresSoleil + '.', (T.ARROS[p.arrosage.frequence] || '') + '. ' + firstSentences(p.arrosage.conseil, 1), (p.pot && p.pot.possible) ? 'Elle peut vivre en pot.' : 'Mieux vaut la pleine terre.'];
    if (z) paras.splice(2, 0, 'Meilleure place : ' + z.nom + '.');
    return { intent: 'plant', title: p.nom, paras: paras, links: add([plantLink(p)].concat(extra || [])), plantId: p.id };
  }
  function malDetail(d, introP) {
    var paras = [d.resume], lis = [];
    if ((d.reconnaitre || []).length) paras.push('Comment le reconnaître : ' + (d.reconnaitre || []).slice(0, 2).join(' ; ') + '.');
    (d.solutions || []).slice(0, 3).forEach(function (s) { lis.push(s); });
    return { paras: paras, list: lis };
  }
  function ansMal(d, p) {
    var x = malDetail(d), links = [malLink(d)]; if (p) links.push(plantLink(p));
    return { intent: 'maladie', title: d.nom, paras: x.paras.concat(x.list.length ? ['Que faire :'] : []), list: x.list, links: links, maladieId: d.id, plantId: p ? p.id : '' };
  }
  function ansSymptoms(sel, p) {
    var res = diagnose(sel, p ? p.id : ''), top = res.slice(0, 3);
    if (!top.length) return null;
    var d = top[0].d, x = malDetail(d), paras = ['La cause la plus probable : ' + lc(d.nom) + '.'].concat(x.paras.slice(0, 1));
    if (top.length > 1) paras.push('Autres pistes : ' + names(top.slice(1).map(function (r) { return lc(r.d.nom); })) + '.');
    paras.push('Que faire en premier :');
    var links = top.map(function (r) { return malLink(r.d); }); if (p) links.push(plantLink(p));
    return { intent: 'symptome', title: 'Pourquoi cela arrive', paras: paras, list: x.list.slice(0, 2), links: links, maladieId: d.id, plantId: p ? p.id : '', symptoms: sel, actions: [{ act: 'asstdiag', label: 'Faire le diagnostic complet', data: { sym: sel.join(','), plant: p ? p.id : '' } }] };
  }
  function ansMonth(mois, n, focus) {
    var R = T.region, L = T.learn, ref = L.month(R ? R.refMonth(mois) : mois) || L.month(mois), c = L.month(mois);
    if (!c) return null;
    var paras = [c.resume], links = [], list = (ref.aFaire || []).slice(0, 5);
    var kinds = focus ? [focus] : ['semis', 'plantation', 'recolte'], labels = { semis: 'À semer', plantation: 'À planter', recolte: 'À récolter' };
    kinds.forEach(function (k) {
      var pl = R ? R.plantsNow(k, mois) : [];
      if (pl.length) { paras.push(labels[k] + ' : ' + names(pl.slice(0, 8).map(function (x) { return x.nom; })) + (pl.length > 8 ? ' et ' + (pl.length - 8) + ' autres' : '') + '.'); pl.slice(0, 3).forEach(function (x) { links.push(plantLink(x)); }); }
    });
    paras.push(regionNote());
    return { intent: 'mois', title: 'Que faire en ' + c.nom.toLowerCase(), paras: [paras[0], 'À faire :'], list: list, paras2: paras.slice(1), links: add([link('#/calendrier/' + mois, 'Calendrier de ' + c.nom.toLowerCase(), c.resume), link('#/planning', 'Mon planning', 'Les gestes de la semaine')], null).concat(links), month: mois, actions: regionAct() };
  }
  function ansList(f, n) {
    var list = filterPlants(f), bits = [];
    if (f.toxic) bits.push('toxiques pour les chats et les chiens'); if (f.safe) bits.push('sans danger pour les chats et les chiens');
    if (f.soleil === 'ombre') bits.push('qui aiment l\'ombre'); else if (f.soleil === 'mi_ombre') bits.push('de mi-ombre'); else if (f.soleil === 'plein_soleil') bits.push('de plein soleil');
    if (f.pot) bits.push('adaptées aux pots, balcon et terrasse'); if (f.interieur) bits.push('d\'intérieur'); if (f.facile) bits.push('faciles');
    var label = (f.cat ? lc(T.CAT[f.cat] || f.cat) + 's ' : 'Plantes ') + names(bits);
    if (!list.length) return { intent: 'liste', title: 'Plantes', paras: ['Je n\'ai trouvé aucune plante avec tous ces critères. Essayez avec moins de critères.'], links: [link('#/trouver', 'Chercher une plante', 'Avec les filtres')], count: 0, filters: f };
    var shown = list.slice(0, 10), paras = [list.length + ' plante' + (list.length > 1 ? 's' : '') + ' : ' + label.charAt(0).toUpperCase() + label.slice(1) + '.'];
    if (f.toxic) paras.push('Gardez-les hors de portée des animaux et des enfants.');
    paras.push(list.length > 10 ? 'Voici les 10 premières.' : 'Les voici.');
    return { intent: 'liste', title: 'Mes idées de plantes', paras: paras, links: shown.map(function (p) { return link('#/plante/' + p.id, p.nom, p.latin); }), count: list.length, filters: f, actions: [{ act: 'asstsearch', label: 'Voir toutes dans la recherche', data: { f: JSON.stringify({ soleil: f.soleil || '', pot: !!f.pot, interieur: !!f.interieur, facile: !!f.facile, cat: f.cat || '' }) } }] };
  }

  /* ---------- Recherche de secours dans les maladies, conseils et guides ---------- */
  var GENERIC = /^(comment|quand|pourquoi|combien|quel|quelle|quels|quelles|faire|faut|fait|peut|dois|puis|plante|plantes|mon|mes|ma|ton|tes|leur|leurs|pour|dans|avec|sans|sur|sous|chez|cette|cela|ceci|trop|assez|tres|bien|mal|moi|nous|vous|ils|elles|est|sont|etre|avoir|ont|aux|des|les|une|que|qui|quoi|dont|mais|donc|car|puis|aussi|plus|moins|tout|tous|toute|toutes|autre|autres|meme|entre|apres|avant|depuis|jusqu|quand|chaque|pouvoir|savoir|veux|voudrais|aimerais|conseil|conseils|astuce|astuces|idee|idees|jardin|jardiner)$/;
  function stemsOf(str) {
    var o = {}; T.norm(str).split(' ').forEach(function (w) { w = sing(w); if (w.length >= 4 && !GENERIC.test(w)) o[w.slice(0, 5)] = 1; }); return o;
  }
  function buildDocs() {
    DOCS = [];
    T.D.maladies.forEach(function (d) { DOCS.push({ k: 'm', ref: d, t: stemsOf(d.nom), b: stemsOf(d.resume + ' ' + (d.plantes || []).join(' ')), link: malLink(d) }); });
    T.D.conseils.forEach(function (c) { DOCS.push({ k: 'c', ref: c, t: stemsOf(c.titre), b: stemsOf(c.texte + ' ' + (c.astuce || '')), link: link('#/conseil/' + c.id, c.titre, T.THEMES[c.theme] || '') }); });
    T.D.guides.forEach(function (g) { DOCS.push({ k: 'g', ref: g, t: stemsOf(g.titre), b: stemsOf(g.intro + ' ' + (g.etapes || []).join(' ')), link: link('#/guide/' + g.id, g.titre, 'Guide pas à pas') }); });
  }
  function searchDocs(q, min) {
    if (!DOCS) buildDocs();
    var qs = Object.keys(stemsOf(q)), out = [];
    if (!qs.length) return out;
    DOCS.forEach(function (d) {
      var s = 0; qs.forEach(function (w) { if (d.t[w]) s += 3; else if (d.b[w]) s += 1; });
      if (s >= min) out.push({ d: d, s: s });
    });
    out.sort(function (a, b) { return b.s - a.s; });
    return out;
  }
  function ansFallback(q) {
    var found = searchDocs(q, 3).slice(0, 4);
    if (found.length) {
      var top = found[0].d, paras = [], list = [];
      if (top.k === 'c') paras.push(firstSentences(top.ref.texte, 2)); else if (top.k === 'm') { paras.push(top.ref.resume); list = (top.ref.solutions || []).slice(0, 2); } else paras.push(firstSentences(top.ref.intro, 2));
      return { intent: 'conseil', title: top.ref.titre || top.ref.nom, paras: paras, list: list, links: found.map(function (x) { return x.d.link; }) };
    }
    return null;
  }
  function ansNone(q, toks) {
    var links = [], seen = {};
    toks.forEach(function (t) {
      if (t.length < 4 || GENERIC.test(sing(t))) return;
      T.search.plants(t, {}).slice(0, 2).forEach(function (r) { if (!seen[r.p.id] && links.length < 4) { seen[r.p.id] = 1; links.push(plantLink(r.p)); } });
    });
    searchDocs(q, 1).slice(0, 3).forEach(function (x) { links.push(x.d.link); });
    var paras = ['Je n\'ai pas la réponse hors connexion.', 'Je ne sais répondre qu\'avec les fiches de l\'application : quand semer, où placer, combien arroser, pourquoi une plante va mal.'];
    paras.push(links.length ? 'Voici les fiches les plus proches de votre question.' : 'Essayez avec le nom d\'une plante, ou utilisez la recherche.');
    links.push(link('#/trouver', 'Chercher dans les plantes', 'La recherche tolère les fautes'));
    return { intent: 'none', title: 'Je n\'ai pas la réponse hors connexion', paras: paras, links: links, actions: [{ act: 'asstsearch', label: 'Lancer la recherche', data: { q: q } }] };
  }

  /* ---------- Cerveau : de la question à la réponse ---------- */
  A.answer = function (question) {
    var q = String(question == null ? '' : question).slice(0, 200).trim();
    if (!q) return { intent: 'vide', title: 'Posez votre question', paras: ['Écrivez une question, ou touchez un exemple.'], links: [] };
    if (!idxP) buildPlants();
    var n0 = T.norm(q), n = spellfix(n0), toks = n.split(' '), sq = singStr(n), toks0 = n0.split(' ');
    var P = findPlant(singStr(n0), toks0) || findPlant(sq, toks);
    var padded = ' ' + n + ' ';
    function re(r) { return r.test(padded); }

    var sow = re(/ (semer|semis|seme|semez|semons|semailles) /), plant = re(/ (planter|plantation|plantez|plantons|replanter|repiquer|repiquage|transplanter|enterrer) | mettre en terre | plante t? ?on /);
    var harv = re(/ (recolter|recolte|recoltez|cueillir|cueillette|cueille|ramasser|maturite) /), prune = re(/ (tailler|taille|taillez|elaguer|rabattre|couper|pincer|elagage) /) && !re(/ taille (du|de|des|d un|d une) (pot|bac|jardiniere|contenant)/);
    var flow = re(/ (fleurir|fleurit|fleurissent|floraison|fleurira) /) && !re(/ (ne fleurit|fleurit pas|fleurit plus|fleurit jamais|pas de fleur|plus de fleur|refuse|ne fleurissent)/);
    var whenq = re(/ (quand|quel mois|quelle periode|quelle saison|quelle epoque|periode|epoque|saison|moment) /), timeVerb = sow || plant || harv || prune || flow;
    var water = re(/ (arroser|arrose|arrosage|arrosee|arrosez|arrosons|arrosoir|eau|humidite|irriguer|abreuver) /);
    var whereOu = re(/ ou (placer|mettre|installer|poser|planter|positionner|ranger|mets|met|le|la|les|l|je|on|puis|vais|dois|peut|faut|est ce que) /) || /^ou /.test(n) || re(/ (placer|placement|installer|positionner) /);
    var whereW = re(/ (exposition|expose|exposee|orientation|ensoleillement|soleil|ombre|lumiere|clarte|pot|pots|balcon|terrasse|jardiniere|exterieur|interieur|dehors|dedans|appartement|fenetre|bac|contenant|pleine terre|cour|salon|chambre|bureau|cuisine|salle de bain|maison|piece|veranda) /) || re(/ taille (du|de|des|d un|d une) (pot|bac|jardiniere|contenant) /);
    var comp = re(/ (a cote|cote a cote|voisin|voisins|voisinage|associer|association|associations|associee|associees|compagnon|compagnons|planter avec|cohabiter|ami|amie|amies|amis|ennemi|ennemie|ennemis|avec quoi|marier|ensemble|pres de) /);
    var tox = re(/ (toxique|toxiques|toxicite|poison|poisonneuse|dangereux|dangereuse|nocif|nocive|empoisonner|empoisonne|mortelle|danger) /), pet = re(/ (chat|chats|chien|chiens|animaux|animal|chaton|enfant|enfants|bebe) /);
    var winter = re(/ (hiver|hivernage|rustique|rustiques|rentrer|rentre|resiste|resistante|supporte|supportent|craint|craignent|gel|gele|gelee|froid) /) && !re(/ (jaunit|jaunissent|tombent|noircit|noircies?) /);
    var monthNum = monthIn(n, toks), seasonM = re(/ hiver /) ? 1 : (re(/ printemps /) ? 4 : (re(/ ete /) ? 7 : (re(/ automne /) ? 10 : 0)));
    var monthq = re(/ (ce mois|mois ci|ce moment|maintenant|cette semaine|cette saison|aujourd hui|a faire|que faire|quoi faire|travaux|programme) /) || (re(/ (que|quoi) (semer|planter|recolter|tailler|faire) /));
    var problemW = re(/ (pourquoi|probleme|problemes|malade|mourir|meurt|mort|morte|depérit|deperit|sauver|soigner|traiter|solution|aide|souci|anomalie|va mal|alarmant) /);
    var hello = /^(bonjour|salut|coucou|bonsoir|merci)( |$)/.test(n) && toks.length <= 4;

    if (hello) return { intent: 'hello', title: 'Bonjour', paras: ['Posez-moi une question sur vos plantes : quand semer, où placer, combien arroser, pourquoi une plante va mal.'], links: [] };

    var sel = symptoms(n), M = findMal(sq);
    var partW = re(/ (feuille|feuilles|tige|tiges|fleur|fleurs|fruit|fruits|racine|racines|terre|terreau|plante|plantes|pousse|pousses|bouton|boutons|branche|branches|ecorce|tronc|bulbe|semis|gazon|pot) /);

    /* Questions sur une plante précise */
    if (P) {
      if (tox || (pet && !re(/ (jaunit|jaunissent) /))) return ansToxic(P);
      if (winter && !problemW && !sel.length && !timeVerb) return ansWinter(P);
      if (comp) return ansCompanion(P);
      if (M && !(water && re(/ (combien|frequence|quand|fois|souvent|faut il|quantite|litre|rythme) /)) && !timeVerb) return ansMal(M, P);
      if (sel.length) { var sa = ansSymptoms(sel, P); if (sa) return sa; }
      if (whereOu) return ansWhere(P, padded);
      if (timeVerb || (whenq && !water)) return ansTiming(P, padded);
      if (water) return ansWater(P, padded);
      if (whereW) return ansWhere(P, padded);
      if (problemW) { var bad = ansFallback(q); if (bad) return bad; return { intent: 'plant', title: 'Problème sur ' + lc(P.nom), paras: ['Dites-moi ce que vous voyez sur la plante : feuilles jaunes, taches, feuilles molles, insectes...'], links: [plantLink(P), link('#/maladie?plante=' + P.id, 'Ma plante est malade', 'Diagnostic par symptômes')], actions: [], plantId: P.id }; }
      var extra = searchDocs(q, 3).slice(0, 2).map(function (x) { return x.d.link; });
      return ansSummary(P, extra);
    }

    /* Maladie citée par son nom, ou signes visibles */
    if (M && !(water && !problemW && !re(/ (trop|manque) /))) return ansMal(M, null);
    if (sel.length && (problemW || partW) && !(timeVerb && !problemW)) { var sb = ansSymptoms(sel, null); if (sb) return sb; }
    if (problemW && !timeVerb) {
      var fb0 = ansFallback(q);
      return fb0 || { intent: 'symptome', title: 'Pourquoi une plante va mal', paras: ['Dites-moi ce que vous voyez : feuilles jaunes, taches, feuilles molles, insectes...', 'Vous pouvez aussi lancer le diagnostic par symptômes.'], links: [link('#/maladie', 'Ma plante est malade', 'Diagnostic par symptômes'), conseil('test-du-doigt')].filter(Boolean) };
    }

    /* Listes de plantes */
    var f = {}, flag = false;
    if (re(/ (ombre|ombrage|ombrages|mi ombre|peu de lumiere|peu de soleil|pas de soleil|sans soleil) /)) { f.soleil = re(/ mi ombre /) ? 'mi_ombre' : 'ombre'; flag = true; }
    else if (re(/ (plein soleil|beaucoup de soleil|soleil|ensoleillee|ensoleille|expose sud) /)) { f.soleil = 'plein_soleil'; flag = true; }
    if (re(/ (balcon|terrasse|pot|pots|jardiniere|jardinieres|petit espace|petite cour|rebord|cour) /)) { f.pot = true; flag = true; }
    if (re(/ (interieur|appartement|salon|chambre|bureau|salle de bain|dedans|maison) /)) { f.interieur = true; flag = true; }
    if (re(/ (facile|faciles|debutant|debutante|simple|simples|sans effort|peu d entretien|increvable|increvables|resistante|resistantes|oubli|oublier|paresseux|paresseuse) /)) { f.facile = true; flag = true; }
    if (tox || pet) { if (re(/ (sans danger|non toxique|non toxiques|pas toxique|pas toxiques|inoffensive|inoffensives|sans risque|sure|sures|compatible|compatibles|adaptee|adaptees|ok) /)) f.safe = true; else f.toxic = true; flag = true; }
    if (re(/ (legume|legumes|potager) /)) { f.cat = 'legume'; flag = true; } else if (re(/ (aromatique|aromatiques|herbe|herbes|condiment) /)) { f.cat = 'aromatique'; flag = true; }
    else if (re(/ (fleur|fleurs|fleurie|fleuries) /)) { f.cat = 'fleur'; flag = true; } else if (re(/ (fruitier|fruitiers|fruit|fruits|fraise|fraises|baie|baies) /)) { f.cat = 'fruitier'; flag = true; }
    else if (re(/ (arbuste|arbustes|haie) /)) { f.cat = 'arbuste'; flag = true; } else if (re(/ (grimpante|grimpantes|treille) /)) { f.cat = 'grimpante'; flag = true; }
    else if (re(/ (succulente|succulentes|cactus|grasse|grasses) /)) { f.cat = 'succulente'; flag = true; }
    var listWord = !!f.cat || re(/ (plantes|plante|quelles|quelle|quoi|idee|idees|choisir|conseille|conseiller|recommande|que planter|que mettre|quel|quels|liste|exemples) /) || /^(plantes?|fleurs?|legumes?|arbustes?)/.test(n);
    if (flag && !monthNum && (listWord || tox || pet) && !re(/ (comment|pourquoi) /)) return ansList(f, n);

    /* Mois */
    if (monthNum || (seasonM && !flag) || (monthq && !timeVerb) || (monthq && re(/ (ce mois|mois ci|ce moment|maintenant) /))) {
      var mm = monthNum || seasonM || T.monthNow(), focus = sow ? 'semis' : (plant ? 'plantation' : (harv ? 'recolte' : ''));
      var am = ansMonth(mm, n, focus); if (am) return am;
    }

    /* Arrosage ou calendrier sans plante précise */
    var cw = water ? ansFallback(q) : null;
    if (water && cw && !re(/ (arroser|arrose|arrosage|arrosez|arrosoir) /)) return cw;
    if (water) { return { intent: 'water', title: 'Arroser, en général', paras: [firstSentences(T.byId(T.D.conseils, 'test-du-doigt').texte, 2), firstSentences(T.byId(T.D.conseils, 'arroser-a-fond').texte, 2)], links: add([conseil('test-du-doigt'), conseil('arroser-a-fond'), guide('bien-arroser')], cw && cw.links && cw.links[0]) }; }
    if (timeVerb || whenq) {
      var focus2 = sow ? 'semis' : (plant ? 'plantation' : (harv ? 'recolte' : ''));
      if (focus2) { var am2 = ansMonth(T.monthNow(), n, focus2); if (am2) { am2.title = 'Ce mois-ci'; return am2; } }
    }

    var fb = ansFallback(q); if (fb) return fb;
    return ansNone(q, toks);
  };

  /* ---------- Écran ---------- */
  var EXEMPLES = ['Quand semer les tomates ?', 'Où placer un géranium ?', 'Combien arroser ma menthe ?', 'Pourquoi les feuilles de mon rosier jaunissent ?', 'Quelles plantes à côté du basilic ?',
    'Que faire ce mois-ci ?', 'Plantes pour l\'ombre', 'Plantes pour un balcon', 'Plantes toxiques pour les chats', 'Plantes faciles'];

  function ansHtml(a) {
    var h = '<div class="card ass-answer' + (a.intent === 'none' ? ' none' : '') + '" id="ass-answer"><h3>' + T.esc(a.title) + '</h3>';
    (a.paras || []).forEach(function (p) { h += '<p>' + T.esc(p) + '</p>'; });
    if (a.list && a.list.length) h += '<ul>' + T.list(a.list) + '</ul>';
    (a.paras2 || []).forEach(function (p) { h += '<p>' + T.esc(p) + '</p>'; });
    var speak = [a.title].concat(a.paras || [], a.list || [], a.paras2 || []).join('. ');
    h += '<div class="row ass-actions">' + T.voice.button(speak, 'Écouter la réponse');
    (a.actions || []).forEach(function (x) {
      var d = ''; Object.keys(x.data || {}).forEach(function (k) { d += ' data-' + k + '="' + T.esc(x.data[k]) + '"'; });
      h += '<button class="btn" data-act="' + T.esc(x.act) + '"' + d + '>' + T.esc(x.label) + '</button>';
    });
    h += '</div></div>';
    if (a.links && a.links.length) {
      h += '<h3 class="ass-src">Source dans l\'application</h3>';
      a.links.forEach(function (l) { h += '<a class="item" href="' + T.esc(l.href) + '"><b>' + T.esc(l.label) + '</b>' + (l.sub ? '<i>' + T.esc(l.sub) + '</i>' : '') + '</a>'; });
    }
    return h;
  }
  function hist() {
    var s = T.store.s; if (!Array.isArray(s.ahist)) s.ahist = []; return s.ahist;
  }
  function histHtml() {
    var h = hist(); if (!h.length) return '';
    return '<h3>Vos dernières questions</h3><div class="chips" id="ass-hist">' + h.map(function (q) { return '<button class="chip" data-act="asstask" data-q="' + T.esc(q) + '">' + T.esc(q) + '</button>'; }).join('') + '</div>' +
      '<div class="row" style="margin-top:.5rem"><button class="btn" data-act="asstclear">Effacer l\'historique</button></div>';
  }
  A.ask = function (q) {
    q = String(q || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    var out = document.getElementById('ass-out'); if (!q) { T.toast('Écrivez votre question.'); return null; }
    T.voice.clearTexts();
    var a; try { a = A.answer(q); } catch (e) { if (window.console) console.error(e); a = { intent: 'none', title: 'Je n\'ai pas la réponse hors connexion', paras: ['Une erreur est survenue. Essayez avec d\'autres mots.'], links: [] }; }
    A.last = a; A.lastQ = q;
    var h = hist().filter(function (x) { return x !== q; }); h.unshift(q); T.store.s.ahist = h.slice(0, 10); T.store.save();
    if (out) out.innerHTML = ansHtml(a);
    var hh = document.getElementById('ass-histbox'); if (hh) hh.innerHTML = histHtml();
    var ans = document.getElementById('ass-answer'); if (ans && ans.scrollIntoView) { try { ans.scrollIntoView({ block: 'nearest' }); } catch (e2) {} }
    return a;
  };

  T.route(/^\/assistant$/, 'conseils', function () {
    var h = '<div class="hero"><h2>Assistant jardin</h2><p>Posez votre question en français courant. Je réponds sans connexion, avec les fiches de l\'application.</p></div>';
    h += '<form class="card" id="ass-form" autocomplete="off"><label class="lbl" for="ass-q" style="margin-top:0">Votre question</label>' +
      '<input id="ass-q" class="field" type="search" inputmode="search" enterkeyhint="search" maxlength="200" autocapitalize="none" spellcheck="false" placeholder="Par exemple : quand semer les carottes ?" value="' + T.esc(A.lastQ || '') + '">' +
      '<div class="row" style="margin-top:.6rem"><button class="btn primary grow" type="submit">Demander</button></div></form>';
    h += '<h3>Essayez par exemple</h3><div class="chips" id="ass-ex">' + EXEMPLES.map(function (e) { return '<button class="chip" data-act="asstask" data-q="' + T.esc(e) + '">' + T.esc(e) + '</button>'; }).join('') + '</div>';
    h += '<div id="ass-out" aria-live="polite">' + (A.last ? ansHtml(A.last) : '') + '</div><div id="ass-histbox">' + histHtml() + '</div>';
    h += '<p class="small muted">Cet assistant fonctionne entièrement sur votre téléphone. Aucune question n\'est envoyée sur internet.</p>';
    return { title: 'Assistant jardin', html: h };
  });
  document.addEventListener('submit', function (e) {
    if (e.target && e.target.id === 'ass-form') { e.preventDefault(); var i = document.getElementById('ass-q'); A.ask(i ? i.value : ''); if (i && i.blur) i.blur(); }
  });
  T.act.asstask = function (el) {
    var q = el.getAttribute('data-q') || '', i = document.getElementById('ass-q'); if (i) i.value = q;
    A.ask(q);
  };
  T.act.asstclear = function () { T.store.s.ahist = []; T.store.save(); var hh = document.getElementById('ass-histbox'); if (hh) hh.innerHTML = ''; T.toast('Historique effacé.'); };
  T.act.asstsearch = function (el) {
    var f = el.getAttribute('data-f'), q = el.getAttribute('data-q') || '';
    var st = { soleil: '', pot: false, interieur: false, facile: false, cat: '' };
    if (f) { try { var o = JSON.parse(f); Object.keys(st).forEach(function (k) { if (o[k] !== undefined) st[k] = o[k]; }); } catch (e) {} }
    T.searchState.f = st; T.searchState.q = q; location.hash = '#/trouver'; if (location.hash === '#/trouver') T.render();
  };
  T.act.asstdiag = function (el) {
    var D = T.diag, sym = (el.getAttribute('data-sym') || '').split(',').filter(Boolean), pl = el.getAttribute('data-plant') || '';
    if (!D) return;
    D.sel = {}; sym.forEach(function (s) { D.sel[s] = true; }); D.plantId = pl; D.photo = null; D.blob = null; D.show = true; D.online = null; D.error = '';
    if (location.hash === '#/maladie') T.render(); else location.hash = '#/maladie';
  };
})();
