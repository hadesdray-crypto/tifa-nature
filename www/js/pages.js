/* Tifa Nature - accueil, menu Plus, réglages, aide, mentions légales, conditions, confidentialité. */
(function () {
  'use strict';
  var T = window.T, LG = window.TIFA_LEGAL || {};

  function sf(f, d) { try { var v = f(); return v == null ? d : v; } catch (e) { return d; } }
  /* ---------- Accueil ---------- */
  T.route(/^\/accueil$/, 'accueil', function () {
    var hr = new Date().getHours(), hello = hr < 12 ? 'Bonjour' : (hr < 18 ? 'Bon après-midi' : 'Bonsoir');
    var pl = sf(function () { return T.planning.todayCount(); }, 0), cm = T.learn.month(T.monthNow()), tip = T.learn.tipOfDay(), due = T.pots.dueCount(), h = '';
    var dn = new Date(), JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    h += '<div class="hero"><h2>' + hello + '</h2><p class="date">' + JOURS[dn.getDay()] + ' ' + dn.getDate() + ' ' + T.MOIS[dn.getMonth()].toLowerCase() + '</p><p>Votre petit jardin, en toute sérénité.</p><a class="search-fake" href="#/trouver">Chercher une plante ou un conseil…</a></div>';
    var now = T.monthNow(), sow = T.D.plantes.filter(function (p) { return (p.semis || []).indexOf(now) >= 0 || (p.plantation || []).indexOf(now) >= 0; }).slice(0, 14);
    if (sow.length) h += '<div class="strip-h"><h2>À semer ou planter maintenant</h2><a href="#/calendrier">Calendrier</a></div><div class="strip">' + sow.map(function (p) { return '<a href="#/plante/' + T.esc(p.id) + '" class="' + ((p.semis || []).indexOf(now) >= 0 ? '' : 'k-plant') + '"><b>' + T.esc(p.nom) + '</b><i>' + ((p.semis || []).indexOf(now) >= 0 ? 'Semis' : 'Plantation') + '</i></a>'; }).join('') + '</div>';
    h += '<div class="big-grid">' +
      '<a class="big t1" href="#/photo"><b>Reconnaître une plante</b><span>Avec une photo</span></a>' +
      '<a class="big t2" href="#/maladie"><b>Ma plante est malade</b><span>Cause et solution</span></a>' +
      '<a class="big t3" href="#/pots"><b>Mes pots</b><span>Soleil ou ombre ?</span></a>' +
      '<a class="big t5" href="#/trouver"><b>Chercher une plante</b><span>' + T.D.plantes.length + ' fiches</span></a>' +
      '<a class="big t4" href="#/jardin"><b>Mon jardin</b><span>' + T.esc(sf(function () { return T.jardin.summary(); }, 'Plan de la cour')) + '</span></a>' +
      '<a class="big t6" href="#/planning"><b>Mon planning</b><span>' + (pl ? pl + ' à faire' : 'Rien d\'urgent') + '</span></a>' +
      '<a class="big t7" href="#/carnet"><b>Carnet de culture</b><span>Notes et photos</span></a>' +
      '<a class="big t8" href="#/assistant"><b>Poser une question</b><span>Réponse sans connexion</span></a></div>';
    var al = sf(function () { return T.meteo.alertText(); }, '');
    h += '<a class="item" href="#/meteo"><b>Météo du jardin</b><i>' + T.esc(al || 'Gel, canicule, pluie : les alertes') + '</i></a>';
    h += '<a class="item" href="#/calculs"><b>Calculettes</b><i>Arrosage, terreau, engrais, distances, pH</i></a>';
    if (!sf(function () { return T.store.s.settings.region; }, '')) h += '<a class="item" href="#/calendrier"><b>Choisir ma région</b><i>Les dates s\'adaptent à votre climat</i></a>';
    if (due) h += '<a class="item" href="#/pots"><b>' + due + ' pot' + (due > 1 ? 's' : '') + ' à vérifier</b><i>Voir l\'arrosage dans Mes pots</i></a>';
    if (cm) h += '<div class="card"><h3>Ce mois-ci : ' + T.esc(cm.nom) + '</h3><p>' + T.esc(cm.resume) + '</p><ul>' + T.list(cm.aFaire.slice(0, 3)) + '</ul><a class="btn block" href="#/calendrier/' + cm.mois + '">Voir tout le mois</a></div>';
    if (tip) h += '<h2>Conseil du jour</h2>' + T.learn.tipCard(tip);
    return { title: 'Tifa Nature', html: h };
  }, true);

  /* ---------- Plus ---------- */
  function link(href, t, s) { return '<a class="item" href="' + href + '"><b>' + T.esc(t) + '</b>' + (s ? '<i>' + T.esc(s) + '</i>' : '') + '</a>'; }
  T.route(/^\/plus$/, 'plus', function () {
    var h = '<div class="hero"><h2>Plus</h2><p>Réglages, aide et informations.</p></div>';
    h += link('#/jardin', 'Mon jardin', 'Plan de la cour') + link('#/planning', 'Mon planning', 'Tâches et rappels') + link('#/carnet', 'Carnet de culture', 'Notes et photos') + link('#/assistant', 'Poser une question', 'Assistant sans connexion') + link('#/meteo', 'Météo du jardin', 'Alertes gel, chaleur, pluie') + link('#/calculs', 'Calculettes', 'Arrosage, terreau, engrais, pH') + link('#/calendrier', 'Calendrier et ma région', 'Dates adaptées au climat') + link('#/reglages', 'Réglages', 'Taille du texte, apparence, voix') + link('#/aide', 'Comment ça marche', 'Le tour de l\'application') +
      link('#/aide-installation', 'Si l\'installation ou l\'appli est bloquée', 'Samsung, Play Protect, économie de batterie') +
      link('#/maj', 'Mises à jour', 'Rechercher une nouvelle version') + link('#/licence', 'Licence', T.licence.valid ? 'Activée' : 'Activation') +
      link('#/legal/mentions', 'Mentions légales') + link('#/legal/cgu', 'Conditions d\'utilisation') + link('#/legal/confidentialite', 'Politique de confidentialité') + link('#/apropos', 'À propos');
    return { title: 'Plus', html: h };
  }, true);
  T.route(/^\/apropos$/, 'plus', function () {
    return { title: 'À propos', html: '<div class="card"><h2>Tifa Nature</h2><p>L\'application de jardinage pour les petites cours, les pots et les jardins de maison.</p><dl class="kv"><dt>Version</dt><dd>' + T.esc(T.cfg.VERSION_WEB) + '</dd><dt>Fiches</dt><dd>' + T.D.plantes.length + ' plantes, ' + T.D.maladies.length + ' maladies et problèmes, ' + T.D.conseils.length + ' conseils</dd></dl><p class="small muted">Reconnaissance des plantes par photo : service Pl@ntNet (plantnet.org), quand il est activé et que vous êtes en ligne.</p></div>' };
  });

  /* ---------- Réglages ---------- */
  function seg(act, items, cur) { return '<div class="chips">' + items.map(function (i) { return '<button class="chip' + (String(cur) === String(i[0]) ? ' on' : '') + '" data-act="' + act + '" data-val="' + i[0] + '" aria-pressed="' + (String(cur) === String(i[0])) + '">' + T.esc(i[1]) + '</button>'; }).join('') + '</div>'; }
  T.route(/^\/reglages$/, 'plus', function () {
    var s = T.set(), V = T.voice, h = '';
    h += '<div class="card"><h2>Taille du texte</h2>' + seg('setscale', [[1, 'Normal'], [1.2, 'Grand'], [1.4, 'Très grand']], s.scale) + '<p class="muted small">Le texte s\'adapte aussi à la taille réglée dans votre téléphone.</p></div>';
    h += '<div class="card"><h2>Apparence</h2><p class="muted small">Choisissez l\'ambiance qui vous détend. Le style Zen est celui d\'origine.</p>' + seg('settheme', [['zen', 'Zen'], ['foret', 'Forêt'], ['sable', 'Sable'], ['nuit', 'Nuit']], s.theme) + '</div>';
    h += '<div class="card"><h2>Voix</h2><p>Les boutons « Écouter » lisent les conseils à voix haute.</p>' + seg('voiceon', [['1', 'Voix activée'], ['0', 'Voix coupée']], s.voiceOn ? '1' : '0');
    if (!V.available()) h += '<div class="notice warn">Aucune voix n\'a été trouvée sur ce téléphone. Dans les réglages Android, cherchez « Synthèse vocale » et installez « Synthèse vocale Google » avec la langue française.</div>';
    else {
      if (V.voices.length) {
        h += '<p class="muted small">Choisissez une voix de fille ou de garçon, sans ou avec connexion. Faites défiler : la voix se fait entendre.</p><div id="vw-box"></div>';
        h += '<div class="notice"><b>Libérer de la place :</b> les voix sont stockées par Android. Dans les réglages du téléphone, cherchez « Synthèse vocale » (ou « Sortie de synthèse vocale »), touchez la roue dentée du moteur « Google », puis « Installer les données vocales » : vous pouvez y supprimer les langues inutiles.</div>';
        if (!V.voices.some(function (v) { return /^fr/i.test(v.lang); })) h += '<div class="notice warn">Aucune voix française trouvée. Installez la langue française dans « Synthèse vocale » des réglages Android.</div>';
      } else h += '<p class="muted">La voix par défaut du téléphone sera utilisée.</p>' + '<label class="lbl">Vitesse de lecture</label>' + seg('setrate', [[0.8, 'Lente'], [0.95, 'Normale'], [1.15, 'Rapide']], s.rate) + '<button class="btn primary block" style="margin-top:.6rem" data-act="voicetest">Écouter un exemple</button>';
    }
    h += '</div><div class="card"><h2>Mes données</h2><p class="muted small">Vos pots et réglages restent uniquement sur votre téléphone.</p><button class="btn danger" data-act="resetdata">Effacer mes pots et réglages</button></div>';
    return { title: 'Réglages', html: h, after: function () { T.voiceWheel(document.getElementById('vw-box')); } };
  });
  T.act.setscale = function (el) { T.set().scale = parseFloat(el.getAttribute('data-val')) || 1; T.store.save(); T.applyDisplay(); T.render(true); };
  T.act.settheme = function (el) { T.set().theme = el.getAttribute('data-val'); T.store.save(); T.applyDisplay(); T.render(true); };
  T.act.voiceon = function (el) { T.set().voiceOn = el.getAttribute('data-val') === '1'; if (!T.set().voiceOn) T.voice.stop(); T.store.save(); T.render(true); };
  T.act.setvoice = function (el) { T.set().voiceId = el.getAttribute('data-id'); T.store.save(); T.render(true); T.voice.speak('Bonjour, voici ma voix pour Tifa Nature.'); };
  T.act.hidevoice = function (el) { var s = T.set(), id = el.getAttribute('data-id'); s.hiddenVoices = (s.hiddenVoices || []).filter(function (x) { return x !== id; }); if (T.voice.visible().length > 1) s.hiddenVoices.push(id); T.store.save(); T.render(true); };
  T.act.showvoice = function (el) { var s = T.set(), id = el.getAttribute('data-id'); s.hiddenVoices = (s.hiddenVoices || []).filter(function (x) { return x !== id; }); T.store.save(); T.render(true); };
  T.act.setrate = function (el) { T.set().rate = parseFloat(el.getAttribute('data-val')) || 0.95; T.store.save(); T.render(true); T.voice.speak('Voici la vitesse de lecture choisie.'); };
  T.act.voicetest = function () { T.voice.speak('Bonjour, voici ma voix pour Tifa Nature. Bon jardinage !'); };
  T.act.resetdata = function () {
    T.confirm('Tout effacer ?', 'Vos pots et vos réglages seront effacés de ce téléphone. Cette action est définitive.', 'Tout effacer', function () { T.store.reset(); T.applyDisplay(); T.toast('Données effacées.'); location.hash = '#/accueil'; T.render(); }, true);
  };

  /* ---------- Aide ---------- */
  function sec(t, items) { return '<div class="card"><h3>' + T.esc(t) + '</h3><ol class="steps">' + T.list(items) + '</ol></div>'; }
  T.route(/^\/aide$/, 'plus', function () {
    return {
      title: 'Comment ça marche', html: '<div class="hero"><h2>Comment ça marche</h2><p>Quelques minutes pour tout comprendre.</p></div>' +
        sec('Chercher une plante', ['Touchez « Trouver » en bas.', 'Tapez un nom, même avec une faute.', 'Touchez la plante : sa fiche explique soleil, arrosage, saisons et conseils.']) +
        sec('Reconnaître une plante', ['Touchez « Reconnaître une plante » sur l\'accueil.', 'Prenez une photo nette d\'une feuille ou d\'une fleur.', 'Touchez « Reconnaître cette plante ». Sans internet, utilisez le mode guidé.']) +
        sec('Ma plante est malade', ['Touchez « Ma plante est malade ».', 'Prenez une photo (facultatif), puis choisissez où est le problème.', 'Touchez ce que vous voyez, puis « Voir le diagnostic » : cause, solution et prévention.']) +
        sec('Mes pots', ['Touchez « Mes pots », puis « Ajouter un pot ».', 'Choisissez la plante : l\'application propose la bonne place (soleil, mi-ombre ou ombre).', 'Touchez « J\'ai arrosé » après chaque arrosage pour suivre le rythme.']) +
        sec('Conseils et calendrier', ['Touchez « Conseils » pour les guides et les conseils par thème.', 'Le calendrier dit quoi semer, planter et récolter chaque mois.']) +
        sec('Lecture à voix haute', ['Touchez « Écouter » pour entendre un conseil.', 'Choisissez la voix et la vitesse dans Plus, puis Réglages.']) +
        '<div class="card"><h3>Sans internet</h3><p>Les fiches, les conseils, le calendrier, Mes pots et le diagnostic par questions marchent sans connexion. Seules l\'analyse de photo et les mises à jour demandent internet.</p><a class="btn block" href="#/aide-installation">Si l\'installation ou l\'appli est bloquée</a></div>'
    };
  });
  T.route(/^\/aide-installation$/, 'plus', function () {
    return {
      title: 'Si ça bloque', html: '<div class="notice">Les noms des menus peuvent varier un peu selon la marque et la version d\'Android.</div>' +
        sec('Samsung : « Auto Blocker » empêche l\'installation', ['Ouvrez « Paramètres ».', 'Touchez « Sécurité et confidentialité ».', 'Touchez « Auto Blocker ».', 'Désactivez l\'option qui bloque l\'installation d\'applications de sources non autorisées (ou coupez Auto Blocker le temps de l\'installation).', 'Installez l\'application, puis vous pouvez tout réactiver.']) +
        sec('Play Protect affiche un avertissement', ['Quand le message apparaît, touchez « Détails » (ou « Plus de détails »).', 'Touchez « Installer quand même ».', 'Si besoin : ouvrez Play Store, touchez votre profil, puis « Play Protect », puis l\'engrenage, et désactivez « Analyser les applications avec Play Protect » le temps de l\'installation.']) +
        sec('Samsung : mise en veille de l\'application', ['Ouvrez « Paramètres », puis « Batterie » (ou « Batterie et entretien de l\'appareil »).', 'Touchez « Limites d\'utilisation en arrière-plan ».', 'Touchez « Applications jamais en veille », puis ajoutez Tifa Nature.']) +
        sec('Xiaomi : économie de batterie', ['Ouvrez « Paramètres », puis « Applications », puis « Gérer les applications ».', 'Touchez Tifa Nature, puis « Économiseur de batterie ».', 'Choisissez « Aucune restriction ».']) +
        sec('Honor : lancement des applications', ['Ouvrez « Paramètres », puis « Batterie ».', 'Touchez « Lancement d\'applications », puis Tifa Nature.', 'Choisissez « Gérer manuellement » et laissez tout activé.']) +
        sec('Appareil non compatible', ['Il faut Android 7 ou plus.', 'Mettez à jour « Android System WebView » et « Google Chrome » depuis le Play Store.', 'Fermez l\'application complètement, puis rouvrez-la.'])
    };
  });

  /* ---------- Textes légaux (avec encadrés « à compléter ») ---------- */
  function f(v) { return /\[À COMPLÉTER/.test(v || '') ? '<div class="todo">' + T.esc(v) + '</div>' : T.esc(v); }
  function line(l, v) { return '<p><b>' + T.esc(l) + ' :</b> ' + f(v) + '</p>'; }
  var LEGAL = {
    mentions: function () {
      return '<div class="legal"><h2>Mentions légales</h2><h2>Éditeur de l\'application</h2>' + line('Nom ou raison sociale', LG.editeurNom) + line('Statut', LG.editeurStatut) + line('SIRET', LG.siret) + line('Adresse', LG.adresse) + line('Contact', LG.contact) + line('Directeur de la publication', LG.directeurPublication) + line('TVA', LG.tva) +
        '<h2>Distribution et hébergement</h2><p>L\'application s\'installe sur votre téléphone et fonctionne en grande partie hors connexion. Les mises à jour sont distribuées par GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.</p>' +
        '<h2>Propriété intellectuelle</h2><p>L\'application, ses textes, son code et son identité visuelle sont protégés. Toute copie, revente ou diffusion sans accord écrit de l\'éditeur est interdite.</p>' +
        '<h2>Reconnaissance des plantes</h2><p>La reconnaissance par photo et l\'analyse des maladies sont fournies par le service Pl@ntNet (plantnet.org), lorsqu\'il est activé et que vous êtes connecté à internet.</p>' +
        '<h2>Médiation de la consommation</h2>' + f(LG.mediation) + '<p class="small muted">Dernière mise à jour : ' + f(LG.dateMiseAJour) + '</p></div>';
    },
    cgu: function () {
      return '<div class="legal"><h2>Conditions d\'utilisation</h2>' +
        '<h2>1. Objet</h2><p>Tifa Nature est une application d\'aide au jardinage : fiches de plantes, conseils, calendrier, placement des pots, reconnaissance de plantes et diagnostic des maladies.</p>' +
        '<h2>2. Licence d\'utilisation</h2><p>L\'éditeur vous accorde un droit d\'usage personnel, non exclusif et non transmissible de l\'application. Il est interdit de la copier, de la revendre, de la modifier ou de partager votre code d\'activation.</p>' +
        '<h2>3. Prix et paiement</h2>' + line('Prix de la licence', LG.prix) + '<p>Le paiement est réalisé via un prestataire tiers (PayPal). Après paiement, un code d\'activation vous est remis.</p>' +
        '<h2>4. Conseils indicatifs</h2><p>Les informations sont données à titre indicatif. Elles ne remplacent pas l\'avis d\'un professionnel. Les résultats de la reconnaissance par photo et du diagnostic ne sont pas garantis. Avant d\'utiliser un produit de traitement, lisez toujours son étiquette. Certaines plantes sont toxiques pour les enfants et les animaux : renseignez-vous avant de les installer.</p>' +
        '<h2>5. Mises à jour</h2><p>L\'éditeur peut publier des mises à jour. L\'application vous les propose et vous les validez vous-même.</p>' +
        '<h2>6. Disponibilité</h2><p>L\'application fonctionne hors connexion. L\'analyse de photo et les mises à jour demandent internet et dépendent de services tiers, pouvant être indisponibles.</p>' +
        '<h2>7. Responsabilité</h2><p>Dans les limites permises par la loi, l\'éditeur ne peut être tenu responsable des dommages liés à une mauvaise utilisation des conseils. Les droits légaux du consommateur restent applicables.</p>' +
        '<h2>8. Droit de rétractation et remboursement</h2>' + f(LG.remboursement) +
        '<h2>9. Droit applicable et médiation</h2><p>Les présentes conditions sont soumises au droit français.</p>' + f(LG.mediation) +
        '<h2>10. Contact</h2>' + f(LG.contact) + '<p class="small muted">Dernière mise à jour : ' + f(LG.dateMiseAJour) + '</p></div>';
    },
    confidentialite: function () {
      return '<div class="legal"><h2>Politique de confidentialité</h2>' +
        '<h2>Qui est responsable ?</h2><p>L\'éditeur indiqué dans les mentions légales. Contact :</p>' + f(LG.contact) +
        '<h2>Ce qui reste sur votre téléphone</h2><p>Vos pots, vos réglages et votre licence sont enregistrés uniquement sur votre téléphone. Il n\'y a ni compte, ni publicité, ni outil de suivi.</p>' +
        '<h2>Vos photos</h2><p>Une photo reste sur votre téléphone. Elle n\'est envoyée que lorsque vous touchez « Reconnaître cette plante » ou « Voir le diagnostic », avec internet, au service Pl@ntNet (tiers) pour obtenir le résultat. L\'éditeur ne conserve pas vos photos. Pl@ntNet traite la photo selon sa propre politique (plantnet.org).</p>' +
        '<h2>Appareil photo</h2><p>L\'accès à l\'appareil photo est demandé une seule fois et sert uniquement à photographier vos plantes.</p>' +
        '<h2>Mises à jour et licence</h2><p>Pour chercher une mise à jour, l\'application contacte GitHub : votre adresse internet (IP) est alors visible par ce service. Le code d\'activation est vérifié sur votre téléphone. Si une vérification en ligne est activée, seuls la référence de la licence et un identifiant aléatoire d\'installation sont envoyés.</p>' +
        '<h2>Voix</h2><p>La lecture à voix haute utilise le moteur de synthèse vocale de votre téléphone. Avec une voix « avec connexion », le texte lu peut être traité par ce moteur.</p>' +
        '<h2>Vos droits</h2><p>Vous pouvez effacer vos données à tout moment dans Plus, Réglages, « Effacer mes pots et réglages », ou en désinstallant l\'application. Vous pouvez aussi nous écrire à l\'adresse de contact, ou saisir la CNIL (cnil.fr).</p><p class="small muted">Dernière mise à jour : ' + f(LG.dateMiseAJour) + '</p></div>';
    }
  };
  T.route(/^\/legal\/(mentions|cgu|confidentialite)$/, 'plus', function (m) {
    var t = { mentions: 'Mentions légales', cgu: 'Conditions d\'utilisation', confidentialite: 'Confidentialité' }[m[1]];
    return { title: t, html: '<div class="card">' + LEGAL[m[1]]() + '</div>' };
  });
})();
