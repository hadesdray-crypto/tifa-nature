/* Tifa Nature - « Dans l'assiette » : cette plante se mange-t-elle ? comment ? avec quelles précautions ?
   Données : data/comestibles.js (T.D.comestibles[id]).
   API : T.assiette = { statut(id), info(id), moisAManger(m), idees(), resume(id), sites(), lien(site, requete), badge(id) }.
   Routes : #/assiette (onglet « plus »). Crochet : T.fichePlus (carte « Dans l'assiette » sur chaque fiche plante).
   Liens externes : <a target="_blank" rel="noopener noreferrer">. Dans l'APK Capacitor, la navigation vers un hôte étranger à l'appli
   est confiée au navigateur du téléphone (Bridge.launchIntent -> ACTION_VIEW) : l'ouverture est automatique ; on tente tout de même
   le plugin Browser s'il existe, puis le comportement normal du lien. Hors connexion : message, aucun lien ne s'ouvre. */
(function () {
  'use strict';
  var T = window.T, A = T.assiette = {}, esc = T.esc;
  var qState = '', fState = 'tout';

  var LAB = {
    comestible: ['Comestible', 'ok', 'as-ok'],
    partiellement: ['En partie comestible', 'warn', 'as-part'],
    non: ['Non comestible', 'warn', 'as-non'],
    dangereux: ['Dangereux', 'bad', 'as-dan']
  };
  var FILT = [['tout', 'Tout'], ['fleur', 'Fleurs'], ['feuille', 'Feuilles et herbes'], ['fruit', 'Fruits et légumes'], ['racine', 'Racines et bulbes']];
  var TYPE_LAB = { fleur: 'Fleurs', feuille: 'Feuilles et herbes', fruit: 'Fruits', legume: 'Légumes', racine: 'Racines et bulbes' };

  var SITES = [
    { id: 'marmiton', nom: 'Marmiton', url: 'https://www.marmiton.org/recettes/recherche.aspx?aqt=' },
    { id: 'cuisineaz', nom: 'CuisineAZ', url: 'https://www.cuisineaz.com/recettes/recherche_terme.aspx?recherche=' },
    { id: '750g', nom: '750g', url: 'https://www.750g.com/recherche.htm?search=' }
  ];
  var MOTEUR = { id: 'moteur', nom: 'un moteur de recherche', url: 'https://www.google.com/search?q=', suffixe: ' recette' };

  function MSG() { return (T.D && T.D.comestiblesMsg) || { doute: 'En cas de doute, ne mangez pas.', secours: '' }; }
  function COM() { return (T.D && T.D.comestibles) || {}; }
  function plantes() { return (T.D && T.D.plantes) || []; }
  function isEdible(r) { return !!r && (r.statut === 'comestible' || r.statut === 'partiellement'); }

  A.sites = function () { return SITES.map(function (s) { return { id: s.id, nom: s.nom, url: s.url }; }); };
  A.lien = function (site, requete) {
    var s = typeof site === 'string' ? SITES.concat([MOTEUR]).filter(function (x) { return x.id === site; })[0] : site;
    if (!s) return '';
    return s.url + encodeURIComponent(String(requete || '') + (s.suffixe || ''));
  };
  A.statut = function (id) { var r = COM()[id]; return r ? r.statut : 'non'; };
  A.info = function (id) {
    var p = T.plante(id), r = COM()[id];
    if (!p) return null;
    if (!r) r = { id: id, statut: 'non', parties: [], usages: [], precautions: [], confusions: [], requetes: [], saveur: '', quantite: '', avertissement: 'Aucune information sûre sur cette plante : ne la mangez pas.', enfants: (MSG().enfantsNon || ''), animaux: (MSG().animauxOk || '') };
    var o = {}; Object.keys(r).forEach(function (k) { o[k] = r[k]; });
    o.id = id; o.plante = p; o.label = LAB[o.statut] ? LAB[o.statut][0] : 'Non comestible';
    return o;
  };

  /* ---------- Étiquette : couleur + forme + mot ---------- */
  var ICO = {
    comestible: '<path d="M4 12l5 5L20 6" />',
    partiellement: '<circle cx="12" cy="12" r="8" /><path d="M12 4v16" />',
    non: '<path d="M6 6l12 12M18 6L6 18" />',
    dangereux: '<path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.5" />'
  };
  function svgIco(st) { return '<svg class="as-ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' + (ICO[st] || ICO.non) + '</svg>'; }
  A.badge = function (id, asButton) {
    var st = A.statut(id), L = LAB[st] || LAB.non;
    if (asButton === false) return '<span class="as-badge ' + L[2] + '">' + svgIco(st) + '<span>' + esc(L[0]) + '</span></span>';
    return '<button type="button" class="as-badge ' + L[2] + '" data-act="asresume" data-id="' + esc(id) + '" aria-label="' + esc(L[0] + ' : touchez pour voir le résumé') + '">' + svgIco(st) + '<span>' + esc(L[0]) + '</span></button>';
  };

  /* ---------- Liens de recettes ---------- */
  function linkHtml(site, q, label) {
    return '<a class="btn as-link" href="' + esc(A.lien(site, q)) + '" target="_blank" rel="noopener noreferrer" data-act="asopen">' + esc(label) + '</a>';
  }
  function recettesHtml(r, max) {
    var qs = (r.requetes || []).slice(0, max || 2);
    if (!qs.length) return '';
    var h = '<div class="as-rec"><h4>Idées de recettes</h4><p class="small muted">Ces boutons ouvrent un site de recettes sur internet (connexion nécessaire). Sans internet, regardez les idées de plats de l\'appli.</p>';
    qs.forEach(function (q, i) {
      h += '<div class="as-recq"><b>' + esc(q) + '</b><div class="as-links">';
      (i === 0 ? SITES : SITES.slice(0, 1)).forEach(function (s) { h += linkHtml(s, q, 'Voir des recettes : ' + s.nom + ' (site externe, connexion nécessaire)'); });
      h += '</div></div>';
    });
    h += '<div class="as-links">' + linkHtml(MOTEUR, qs[0], 'Autre choix : chercher avec un moteur de recherche (site externe, connexion nécessaire)') + '</div></div>';
    return h;
  }
  T.act.asopen = function (el, e) {
    var offline = false;
    try { offline = (navigator.onLine === false) || (T.native && T.native.online === false); } catch (x) { offline = false; }
    if (offline) { if (e && e.preventDefault) e.preventDefault(); T.toast('Il faut internet pour ouvrir ce site.', 3200); return; }
    try {
      var cap = window.Capacitor, B = cap && cap.Plugins && cap.Plugins.Browser;
      if (B && typeof B.open === 'function') { if (e && e.preventDefault) e.preventDefault(); B.open({ url: el.getAttribute('href') }); }
    } catch (x) { /* le lien normal prend le relais */ }
  };

  /* ---------- Texte à lire ---------- */
  function speech(o) {
    var t = o.plante.nom + '. ' + o.label + '. ';
    if (o.avertissement) t += o.avertissement + ' ';
    if (isEdible(o)) {
      if (o.saveur) t += 'Saveur : ' + o.saveur + ' ';
      o.parties.forEach(function (x) { t += x.partie + ' : ' + x.comment + ' '; });
      if (o.quantite) t += o.quantite + ' ';
      if (o.precautions.length) t += 'Précautions. ' + o.precautions.join(' ') + ' ';
      if (o.confusions.length) t += 'Attention aux confusions. ' + o.confusions.join(' ') + ' ';
    }
    if (o.animaux) t += o.animaux + ' ';
    t += MSG().doute;
    return t.replace(/\s+/g, ' ');
  }
  function listHtml(arr, cls) { return arr && arr.length ? '<ul class="' + (cls || 'as-list') + '">' + T.list(arr) + '</ul>' : ''; }
  function partsHtml(o) {
    if (!o.parties.length) return '';
    return '<ul class="as-parts">' + o.parties.map(function (x) {
      return '<li><b>' + esc(x.partie) + '</b><br>' + esc(x.comment) + (x.quand ? '<br><span class="muted small">Quand : ' + esc(x.quand) + '</span>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  function whyHtml(o) {
    if (isEdible(o)) return '';
    return '<div class="notice ' + (o.statut === 'dangereux' ? 'bad' : 'warn') + '"><b>' + (o.statut === 'dangereux' ? 'Ne la mangez jamais.' : 'On ne la mange pas.') + '</b> ' + esc(o.avertissement || '') + '</div>';
  }
  function footHtml() { return '<div class="notice warn as-doute"><b>' + esc(MSG().doute) + '</b><br><span class="small">' + esc(MSG().secours) + '</span></div>'; }

  /* ---------- Fenêtre-résumé ---------- */
  A.resume = function (id) {
    var o; try { o = A.info(id); } catch (e) { o = null; }
    if (!o) return null;
    var h = '<div class="as-res">' + A.badge(id, false);
    h += whyHtml(o);
    if (isEdible(o)) {
      if (o.saveur) h += '<h3>En cuisine</h3><p>' + esc(o.saveur) + '</p>';
      h += '<h3>Ce qui se mange, et comment</h3>' + partsHtml(o);
      if (o.usages.length) h += '<h3>Dans quels plats</h3><div class="tags">' + o.usages.map(function (u) { return '<span class="tag">' + esc(u) + '</span>'; }).join('') + '</div>';
      if (o.quantite) h += '<h3>Quelle quantité</h3><p>' + esc(o.quantite) + '</p>';
      if (o.precautions.length) h += '<h3>Précautions</h3>' + listHtml(o.precautions);
      if (o.confusions.length) h += '<div class="notice bad"><b>Confusions dangereuses</b>' + listHtml(o.confusions) + '</div>';
    }
    h += '<h3>Enfants et animaux</h3><p>' + esc(o.enfants) + '</p><p>' + esc(o.animaux) + '</p>';
    h += '<div class="row">' + T.voice.button(speech(o), 'Écouter') + '</div>';
    if (isEdible(o)) h += recettesHtml(o, 2);
    h += footHtml() + '</div>';
    return { titre: o.plante.nom + ' : ' + o.label, html: h };
  };
  T.act.asresume = function (el) {
    var r = A.resume(el.getAttribute('data-id'));
    if (!r) { T.toast('Pas de résumé pour cette plante.'); return; }
    T.modal({ title: r.titre, html: r.html });
  };

  /* ---------- Carte sur la fiche plante ---------- */
  T.fichePlus = T.fichePlus || [];
  T.fichePlus.push(function (p) {
    var o = A.info(p.id); if (!o) return '';
    var h = '<div class="card as-card"><h3>Dans l\'assiette</h3><div class="row as-head">' + A.badge(p.id) + '</div><p class="small muted">Touchez l\'étiquette pour voir le résumé.</p>';
    h += whyHtml(o);
    if (isEdible(o)) {
      h += partsHtml(o);
      if (o.quantite) h += '<p><b>Quantité :</b> ' + esc(o.quantite) + '</p>';
      h += '<h4>Précautions</h4>' + listHtml(o.precautions);
      if (o.confusions.length) h += '<div class="notice bad"><b>Confusions possibles</b>' + listHtml(o.confusions) + '</div>';
    }
    h += '<p class="small"><b>Animaux :</b> ' + esc(o.animaux) + '</p>';
    h += '<div class="row">' + T.voice.button(speech(o), 'Écouter') + '</div>';
    if (isEdible(o)) h += recettesHtml(o, 1);
    h += '<p class="small muted"><b>' + esc(MSG().doute) + '</b></p></div>';
    return h;
  });

  /* ---------- Ce mois-ci ---------- */
  function types(o) { var t = {}; (o.parties || []).forEach(function (x) { t[x.type] = 1; }); return Object.keys(t); }
  A.moisAManger = function (m) {
    m = parseInt(m, 10); if (!(m >= 1 && m <= 12)) m = T.monthNow();
    var out = [];
    plantes().forEach(function (p) {
      var r = COM()[p.id]; if (!isEdible(r)) return;
      var hit = r.parties.some(function (x) {
        if (x.type === 'fleur') return (p.floraison || []).indexOf(m) >= 0;
        return (p.recolte || []).indexOf(m) >= 0;
      });
      if (hit) out.push({ id: p.id, nom: p.nom, statut: r.statut, types: types(r) });
    });
    out.sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
    return out;
  };

  /* ---------- Idées de plats (sans connexion) ---------- */
  var IDEES = [
    { id: 'salade-fleurs', titre: 'Salade de fleurs', plantes: ['laitue', 'capucine', 'pensee', 'souci', 'bleuet'], ingr: ['Quelques feuilles de laitue', 'Quelques fleurs de capucine, de pensée, de souci ou de bleuet', 'Huile, citron, sel'], etapes: ['Lavez la laitue et les fleurs doucement, séchez-les.', 'Mélangez huile, citron et sel dans un bol.', 'Versez sur la laitue et posez les fleurs au dernier moment.'], prec: 'Fleurs non traitées seulement. Goûtez un pétale avant.' },
    { id: 'beignets-courgette', titre: 'Beignets de fleurs de courgette', plantes: ['courgette'], ingr: ['6 fleurs de courgette', '100 g de farine', 'Eau pétillante ou eau froide', 'Huile pour frire, sel'], etapes: ['Mélangez farine, eau et sel pour une pâte épaisse comme une crème.', 'Retirez le pistil des fleurs, trempez-les dans la pâte.', 'Faites dorer dans l\'huile chaude, égouttez sur du papier.'], prec: 'La friture est faite par un adulte. Cueillez les fleurs le matin.' },
    { id: 'fleurs-farcies', titre: 'Fleurs de courgette farcies', plantes: ['courgette', 'ciboulette'], ingr: ['6 fleurs de courgette', '150 g de fromage frais', 'Ciboulette, sel, poivre'], etapes: ['Mélangez le fromage frais avec la ciboulette coupée.', 'Ouvrez doucement les fleurs, retirez le pistil, garnissez.', 'Refermez les pétales et cuisez 10 minutes au four moyen.'], prec: 'Four : à faire avec un adulte.' },
    { id: 'pesto-capucine', titre: 'Pesto de feuilles de capucine', plantes: ['capucine'], ingr: ['Une poignée de feuilles de capucine', 'Huile d\'olive', 'Fromage râpé', 'Une petite gousse d\'ail'], etapes: ['Lavez et séchez les feuilles.', 'Mixez-les avec l\'ail, le fromage et un peu d\'huile.', 'Ajoutez de l\'huile jusqu\'à la texture voulue, goûtez.'], prec: 'Piquant : goûtez avant d\'en mettre beaucoup. À garder au frais et à manger vite.' },
    { id: 'capres-capucine', titre: 'Câpres de capucine', plantes: ['capucine'], ingr: ['Boutons de capucine', 'Vinaigre', 'Un peu de sel', 'Un petit bocal propre'], etapes: ['Cueillez les boutons avant l\'ouverture, lavez-les.', 'Mettez-les dans le bocal avec un peu de sel.', 'Couvrez de vinaigre, fermez et attendez quelques semaines au frais.'], prec: 'Bocal bien propre. Gardez au frigo après ouverture.' },
    { id: 'beurre-ciboulette', titre: 'Beurre aux fleurs de ciboulette', plantes: ['ciboulette'], ingr: ['100 g de beurre mou', 'Fleurs et tiges de ciboulette', 'Une pincée de sel'], etapes: ['Coupez fin les tiges et défaites les fleurs en brins.', 'Écrasez le beurre mou avec la ciboulette et le sel.', 'Roulez en boudin dans du papier et gardez au frais.'], prec: 'Ne mangez pas le bulbe de la ciboulette.' },
    { id: 'omelette-herbes', titre: 'Omelette aux fines herbes', plantes: ['ciboulette', 'persil', 'cerfeuil', 'estragon'], ingr: ['3 oeufs', 'Ciboulette, persil, cerfeuil ou estragon', 'Beurre, sel'], etapes: ['Battez les oeufs avec le sel.', 'Ajoutez les herbes hachées.', 'Cuisez à la poêle avec un peu de beurre.'], prec: 'Cuisson par un adulte. Herbes que vous avez semées vous-même.' },
    { id: 'sucre-rose', titre: 'Sucre parfumé aux pétales de rose', plantes: ['rosier-pot', 'rosier-grimpant'], ingr: ['Pétales de rose non traitée', '200 g de sucre', 'Un bocal propre'], etapes: ['Coupez la base blanche des pétales et lavez-les rapidement.', 'Séchez-les bien dans un linge propre.', 'Mélangez avec le sucre dans le bocal, fermez et attendez quelques jours.'], prec: 'Pétales séchés avec soin : l\'humidité fait moisir. Roses sans produit chimique.' },
    { id: 'sirop-rose', titre: 'Sirop de pétales de rose', plantes: ['rosier-pot', 'rosier-grimpant'], ingr: ['Une poignée de pétales de rose non traitée', '250 g de sucre', '25 cl d\'eau', 'Un peu de citron'], etapes: ['Chauffez l\'eau et le sucre jusqu\'à ce que le sucre fonde.', 'Hors du feu, ajoutez les pétales et le citron, laissez infuser.', 'Filtrez, versez dans une bouteille propre et gardez au frais.'], prec: 'Chaud : fait avec un adulte. Roses sans produit chimique.' },
    { id: 'glacons-fleurs', titre: 'Glaçons aux fleurs', plantes: ['pensee', 'bleuet', 'violette-odorante', 'bourrache'], ingr: ['Petites fleurs de pensée, de violette ou de bleuet', 'Eau', 'Un bac à glaçons'], etapes: ['Posez une fleur dans chaque case du bac.', 'Remplissez d\'eau et mettez au congélateur.', 'Servez dans un verre d\'eau ou de sirop.'], prec: 'Fleurs non traitées. La bourrache : une seule fleur par glaçon, et pas tous les jours.' },
    { id: 'sirop-violette', titre: 'Sirop de violette', plantes: ['violette-odorante'], ingr: ['Une grosse poignée de fleurs de violette', '25 cl d\'eau chaude', '250 g de sucre'], etapes: ['Versez l\'eau chaude sur les fleurs et laissez infuser une nuit.', 'Filtrez, ajoutez le sucre et chauffez doucement pour le faire fondre.', 'Mettez en bouteille propre, gardez au frais.'], prec: 'Fleurs de violette odorante seulement, non traitées. Chaud : avec un adulte.' },
    { id: 'biscuits-lavande', titre: 'Biscuits à la lavande', plantes: ['lavande'], ingr: ['Votre pâte à sablés habituelle', 'Une toute petite pincée de fleurs de lavande'], etapes: ['Préparez la pâte à sablés.', 'Ajoutez seulement une pincée de fleurs, pas plus.', 'Étalez, découpez et faites cuire comme d\'habitude.'], prec: 'La lavande est très forte : très peu suffit. Fleurs de lavande vraie, non traitées.' },
    { id: 'tisane-menthe', titre: 'Tisane de menthe fraîche', plantes: ['menthe'], ingr: ['Quelques feuilles de menthe', 'De l\'eau chaude'], etapes: ['Lavez les feuilles.', 'Versez l\'eau chaude dessus.', 'Laissez infuser 5 minutes et filtrez.'], prec: 'Eau chaude : avec un adulte. Pas pour les tout-petits.' },
    { id: 'tisane-verveine', titre: 'Infusion de verveine citronnelle ou de mélisse', plantes: ['verveine-citronnelle', 'melisse'], ingr: ['Quelques feuilles de verveine ou de mélisse', 'De l\'eau chaude'], etapes: ['Lavez les feuilles.', 'Versez l\'eau chaude dessus.', 'Laissez infuser quelques minutes et filtrez.'], prec: 'Eau chaude : avec un adulte.' },
    { id: 'taboule', titre: 'Taboulé de persil et de menthe', plantes: ['persil', 'menthe', 'tomate'], ingr: ['Semoule', 'Beaucoup de persil et un peu de menthe', 'Tomates mûres', 'Citron, huile, sel'], etapes: ['Gonflez la semoule avec de l\'eau chaude, laissez refroidir.', 'Hachez les herbes et coupez les tomates en petits dés.', 'Mélangez tout avec citron, huile et sel.'], prec: 'Tomates mûres seulement. Persil que vous avez semé.' },
    { id: 'soupe-ortie', titre: 'Soupe d\'ortie', plantes: ['ortie', 'pomme-de-terre', 'oignon'], ingr: ['Jeunes pousses d\'ortie', '2 pommes de terre', '1 oignon', 'Eau ou bouillon'], etapes: ['Avec des gants, lavez les orties.', 'Cuisez pommes de terre, oignon et orties dans l\'eau 20 minutes.', 'Mixez et assaisonnez.'], prec: 'Gants pour cueillir. Orties cuites seulement, loin des routes.' },
    { id: 'salade-tomate-basilic', titre: 'Salade de tomates au basilic', plantes: ['tomate', 'tomate-cerise', 'basilic'], ingr: ['Tomates bien mûres', 'Feuilles de basilic', 'Huile d\'olive, sel'], etapes: ['Lavez et coupez les tomates.', 'Ajoutez le basilic déchiré avec les doigts.', 'Assaisonnez d\'huile et de sel.'], prec: 'Jamais les feuilles ni les tiges de tomate. Tomates mûres.' },
    { id: 'ratatouille', titre: 'Ratatouille', plantes: ['courgette', 'aubergine', 'poivron', 'tomate', 'oignon'], ingr: ['Courgettes, aubergine, poivron, tomates, oignon', 'Huile d\'olive, sel', 'Thym'], etapes: ['Coupez tous les légumes en morceaux.', 'Faites revenir l\'oignon, puis ajoutez les autres légumes.', 'Laissez mijoter 40 minutes avec le thym.'], prec: 'Cuisson par un adulte. L\'aubergine se mange cuite.' },
    { id: 'gaspacho', titre: 'Gaspacho', plantes: ['tomate', 'concombre', 'poivron', 'basilic'], ingr: ['Tomates mûres', 'Un concombre', 'Un poivron', 'Huile, sel, basilic'], etapes: ['Coupez les légumes en morceaux.', 'Mixez-les avec un peu d\'huile, du sel et du basilic.', 'Gardez au frais au moins une heure.'], prec: 'Légumes bien lavés. Tomates mûres seulement.' },
    { id: 'confiture-fraises', titre: 'Confiture de fraises', plantes: ['fraisier', 'fraisier-des-bois'], ingr: ['500 g de fraises', '300 g de sucre', 'Un citron'], etapes: ['Lavez les fraises, retirez les queues, coupez-les.', 'Cuisez-les avec le sucre et le jus de citron 20 minutes.', 'Versez dans des pots propres et fermez.'], prec: 'Cuisson et pots chauds : avec un adulte.' },
    { id: 'compote-rhubarbe', titre: 'Compote de rhubarbe', plantes: ['rhubarbe'], ingr: ['Tiges de rhubarbe', 'Sucre', 'Un peu d\'eau'], etapes: ['Coupez les tiges en morceaux et JETEZ les feuilles.', 'Cuisez avec le sucre et un peu d\'eau 15 minutes.', 'Écrasez à la fourchette et laissez refroidir.'], prec: 'Les feuilles de rhubarbe sont toxiques : ne les mangez jamais.' },
    { id: 'crumble-rouges', titre: 'Crumble aux fruits rouges', plantes: ['framboisier', 'myrtillier', 'murier-sans-epines'], ingr: ['Framboises, myrtilles ou mûres', 'Farine, beurre, sucre'], etapes: ['Mettez les fruits dans un plat.', 'Émiettez du beurre, de la farine et du sucre du bout des doigts.', 'Couvrez les fruits et cuisez 25 minutes au four.'], prec: 'Four : avec un adulte.' },
    { id: 'gelee-groseilles', titre: 'Gelée de groseilles', plantes: ['groseillier'], ingr: ['Groseilles', 'Sucre', 'Un peu d\'eau'], etapes: ['Cuisez les groseilles avec un peu d\'eau.', 'Passez au tamis pour enlever peaux et pépins.', 'Ajoutez le sucre, cuisez encore, versez dans des pots propres.'], prec: 'Cuisson : avec un adulte.' },
    { id: 'veloute-courgette', titre: 'Velouté de courgette', plantes: ['courgette', 'oignon'], ingr: ['2 courgettes', '1 oignon', 'Eau ou bouillon, sel'], etapes: ['Coupez les légumes en morceaux.', 'Cuisez-les 20 minutes dans l\'eau.', 'Mixez et assaisonnez.'], prec: 'Mixeur et cuisson : avec un adulte.' },
    { id: 'chips-kale', titre: 'Chips de chou kale', plantes: ['chou-kale'], ingr: ['Feuilles de chou kale', 'Un filet d\'huile', 'Du sel'], etapes: ['Retirez les nervures dures et déchirez les feuilles.', 'Mélangez-les avec l\'huile et le sel.', 'Faites cuire 10 à 15 minutes au four doux, en surveillant.'], prec: 'Four : avec un adulte. Surveillez, ça brûle vite.' },
    { id: 'pommes-romarin', titre: 'Pommes de terre rôties au romarin', plantes: ['pomme-de-terre', 'romarin'], ingr: ['Pommes de terre saines', 'Romarin', 'Huile, sel'], etapes: ['Lavez et coupez les pommes de terre, jetez toute partie verte.', 'Mélangez avec huile, sel et romarin haché.', 'Faites rôtir au four jusqu\'à ce qu\'elles soient dorées.'], prec: 'Jamais de pomme de terre verte ni de germes. Four : avec un adulte.' },
    { id: 'haricots-ail', titre: 'Haricots verts à l\'ail', plantes: ['haricot-nain', 'haricot-grimpant', 'ail'], ingr: ['Haricots verts', 'Une gousse d\'ail', 'Huile, sel'], etapes: ['Cuisez les haricots à l\'eau bouillante plusieurs minutes.', 'Égouttez-les.', 'Faites-les sauter avec l\'ail haché et l\'huile.'], prec: 'Les haricots ne se mangent JAMAIS crus.' },
    { id: 'betterave-rotie', titre: 'Betteraves rôties', plantes: ['betterave'], ingr: ['Betteraves', 'Huile, sel'], etapes: ['Lavez les betteraves.', 'Enveloppez-les dans du papier avec un peu d\'huile.', 'Cuisez au four jusqu\'à ce qu\'un couteau entre facilement, puis épluchez.'], prec: 'Four : avec un adulte. Elles tachent les doigts, c\'est normal.' },
    { id: 'topinambours', titre: 'Topinambours rôtis', plantes: ['topinambour'], ingr: ['Topinambours', 'Huile, sel'], etapes: ['Brossez et épluchez les topinambours.', 'Coupez-les en morceaux et mélangez-les avec huile et sel.', 'Faites rôtir au four jusqu\'à ce qu\'ils soient tendres.'], prec: 'Commencez par une petite portion. Four : avec un adulte.' },
    { id: 'poelee-epinards', titre: 'Poêlée d\'épinards ou de blettes', plantes: ['epinard', 'blette', 'ail'], ingr: ['Épinards ou blettes', 'Un peu d\'ail', 'Huile, sel'], etapes: ['Lavez bien les feuilles.', 'Faites chauffer l\'huile avec l\'ail.', 'Ajoutez les feuilles et cuisez quelques minutes.'], prec: 'Cuisson : avec un adulte. Lavez bien.' },
    { id: 'gateau-citron', titre: 'Gâteau au citron', plantes: ['citronnier'], ingr: ['Votre gâteau yaourt habituel', 'Le jus d\'un citron', 'Un peu de zeste d\'un citron non traité'], etapes: ['Préparez la pâte du gâteau.', 'Ajoutez le jus et le zeste.', 'Cuisez comme d\'habitude.'], prec: 'Zeste seulement si le citron n\'est pas traité. Four : avec un adulte.' },
    { id: 'salade-agrumes', titre: 'Salade de mandarines et de kumquats', plantes: ['mandarinier', 'kumquat'], ingr: ['Mandarines', 'Quelques kumquats', 'Un peu de miel (facultatif)'], etapes: ['Épluchez les mandarines.', 'Coupez les kumquats en rondelles fines, avec la peau.', 'Mélangez et laissez reposer un moment.'], prec: 'Lavez bien les kumquats : on mange leur peau.' },
    { id: 'soupe-poireaux', titre: 'Soupe de poireaux et pommes de terre', plantes: ['poireau', 'pomme-de-terre'], ingr: ['2 poireaux', '2 pommes de terre', 'Eau ou bouillon, sel'], etapes: ['Lavez bien les poireaux, coupez en rondelles.', 'Cuisez-les avec les pommes de terre 25 minutes.', 'Mixez ou écrasez à la fourchette.'], prec: 'Pommes de terre saines, sans partie verte. Cuisson : avec un adulte.' }
  ];
  A.idees = function () { return IDEES.map(function (x) { return x; }); };
  function ideeById(id) { for (var i = 0; i < IDEES.length; i++) if (IDEES[i].id === id) return IDEES[i]; return null; }
  function ideeSpeech(d) { return d.titre + '. Il vous faut : ' + d.ingr.join(', ') + '. Étapes : ' + d.etapes.map(function (e, i) { return (i + 1) + '. ' + e; }).join(' ') + ' Précaution : ' + d.prec + ' ' + MSG().doute; }
  T.act.asidee = function (el) {
    var d = ideeById(el.getAttribute('data-id')); if (!d) return;
    var pl = d.plantes.map(function (id) { var p = T.plante(id); return p ? '<a class="chip as-chip" href="#/plante/' + esc(id) + '" data-act="asclose">' + esc(p.nom) + '</a>' : ''; }).join('');
    var h = '<h3>Il vous faut</h3>' + listHtml(d.ingr) + '<h3>En 3 étapes</h3><ol class="as-list">' + T.list(d.etapes) + '</ol><div class="notice warn"><b>Précaution :</b> ' + esc(d.prec) + '</div>' +
      '<div class="chips">' + pl + '</div><div class="row">' + T.voice.button(ideeSpeech(d), 'Écouter') + '</div>' + footHtml();
    T.modal({ title: d.titre, html: h });
  };
  T.act.asclose = function () { T.closeModal(); };

  /* ---------- Page « Plantes comestibles du jardin » ---------- */
  function matchQ(p, q) {
    if (!q) return true;
    var hay = T.norm([p.nom, p.latin].concat(p.synonymes || []).join(' '));
    return q.split(' ').every(function (w) { return hay.indexOf(w) >= 0; });
  }
  function itemHtml(p) {
    var o = COM()[p.id] || {}, ty = types(o).map(function (t) { return TYPE_LAB[t]; }).filter(Boolean).join(', ');
    return '<div class="item as-item"><a class="as-name" href="#/plante/' + esc(p.id) + '"><b>' + esc(p.nom) + '</b><span class="muted small">' + esc(ty || (o.avertissement ? 'À ne pas manger' : '')) + '</span></a>' + A.badge(p.id) + '</div>';
  }
  function resultsHtml() {
    var q = T.norm(qState), out = [];
    plantes().forEach(function (p) {
      var r = COM()[p.id]; if (!r || !matchQ(p, q)) return;
      if (!q && !isEdible(r)) return;
      if (fState !== 'tout') {
        if (!isEdible(r)) return;
        var ok = r.parties.some(function (x) { return fState === 'fruit' ? (x.type === 'fruit' || x.type === 'legume') : x.type === fState; });
        if (!ok) return;
      }
      out.push(p);
    });
    out.sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
    if (!out.length) return '<div class="notice">Aucune plante trouvée. Essayez un autre mot, ou touchez « Tout ».</div>';
    return '<p class="small muted as-count">' + out.length + ' plante' + (out.length > 1 ? 's' : '') + (q ? '' : ' qui se mangent (en tout ou en partie)') + '.</p>' + out.map(itemHtml).join('');
  }
  function chipsHtml() {
    return FILT.map(function (f) { return '<button type="button" class="chip as-fchip' + (fState === f[0] ? ' on' : '') + '" data-act="asfiltre" data-f="' + f[0] + '" aria-pressed="' + (fState === f[0]) + '">' + esc(f[1]) + '</button>'; }).join('');
  }
  function refresh() {
    var c = document.getElementById('as-results'); if (c) c.innerHTML = resultsHtml();
    var f = document.getElementById('as-chips'); if (f) f.innerHTML = chipsHtml();
  }
  T.input.asq = function (el) { qState = el.value || ''; refresh(); };
  T.act.asfiltre = function (el) { fState = el.getAttribute('data-f') || 'tout'; refresh(); };
  T.act.asclear = function () { qState = ''; fState = 'tout'; var i = document.getElementById('as-q'); if (i) i.value = ''; refresh(); };

  function pageHtml() {
    var m = T.monthNow(), mois = A.moisAManger(m), h = '';
    h += '<div class="card"><h2>Plantes comestibles du jardin</h2><p>Cherchez une plante, ou choisissez un groupe. Touchez l\'étiquette de couleur pour voir le résumé.</p>' +
      '<div class="notice warn as-doute"><b>' + esc(MSG().doute) + '</b><br><span class="small">' + esc(MSG().secours) + '</span></div>' +
      '<label class="small muted" for="as-q">Nom de la plante</label><input id="as-q" class="field as-q" type="search" data-input="asq" placeholder="Par exemple : capucine" autocomplete="off" value="' + esc(qState) + '">' +
      '<div class="chips" id="as-chips">' + chipsHtml() + '</div><button type="button" class="btn as-clear" data-act="asclear">Tout effacer</button></div>';
    h += '<div class="card"><h3>Ce mois-ci à manger (' + esc(T.MOIS[m - 1]) + ')</h3>';
    if (mois.length) h += '<p class="small muted">Plantes en fleur ou à récolter ce mois-ci. Touchez pour voir la fiche.</p><div class="chips">' + mois.map(function (x) { return '<a class="chip as-chip" href="#/plante/' + esc(x.id) + '">' + esc(x.nom) + '</a>'; }).join('') + '</div>';
    else h += '<p>Rien à signaler ce mois-ci dans votre base.</p>';
    h += '</div>';
    h += '<div class="card"><h3>Résultats</h3><div id="as-results">' + resultsHtml() + '</div></div>';
    var fl = plantes().filter(function (p) { var r = COM()[p.id]; return isEdible(r) && r.parties.some(function (x) { return x.type === 'fleur'; }); });
    h += '<div class="card"><h3>Fleurs comestibles</h3><div class="notice warn">Fleurs non traitées seulement (jamais celles d\'un fleuriste ni du bord de route). Lavez-les, goûtez d\'abord un seul pétale, et mangez-en peu. ' + esc(MSG().doute) + '</div><div class="chips">' +
      fl.sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); }).map(function (p) { return '<a class="chip as-chip" href="#/plante/' + esc(p.id) + '">' + esc(p.nom) + '</a>'; }).join('') + '</div></div>';
    h += '<div class="card"><h3>Idées de plats (sans internet)</h3><p class="small muted">Touchez un plat : ingrédients, 3 étapes, précautions.</p><div class="as-ideas">' +
      IDEES.map(function (d) { return '<button type="button" class="btn as-idee" data-act="asidee" data-id="' + esc(d.id) + '">' + esc(d.titre) + '</button>'; }).join('') + '</div></div>';
    var dg = plantes().filter(function (p) { return COM()[p.id] && COM()[p.id].statut === 'dangereux'; }).sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
    h += '<div class="card"><h3>À ne jamais manger</h3><div class="notice bad">Ces plantes de votre base sont dangereuses. Même hors de cette liste, le muguet, la digitale et l\'if sont très toxiques.</div><div class="chips">' +
      dg.map(function (p) { return '<a class="chip as-chip as-dan-chip" href="#/plante/' + esc(p.id) + '">' + esc(p.nom) + '</a>'; }).join('') + '</div></div>';
    return h;
  }
  T.route(/^\/assiette$/, 'plus', function () {
    var h;
    try { h = pageHtml(); } catch (e) { h = '<div class="notice warn">Cette page n\'a pas pu s\'afficher. Revenez en arrière et réessayez.</div>'; }
    return { title: 'Plantes comestibles du jardin', html: h };
  });
})();
