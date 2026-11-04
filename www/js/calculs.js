/* Tifa Nature - Calculs du jardinier : 5 calculettes hors connexion (terreau, plants, arrosage, engrais, acidité du sol).
   Les valeurs sont des estimations prudentes. Virgule française acceptée. ES5. */
(function () {
  'use strict';
  var T = window.T, C = T.calculs = { cur: 'terreau', vals: {}, res: {} };

  /* ---------- Nombres ---------- */
  function fmt(n, dec) {                                   /* 12.5 -> « 12,5 » ; 12 -> « 12 » ; grands nombres avec espaces */
    var p = Math.pow(10, dec === undefined ? 1 : dec), r = Math.round(n * p) / p, s = String(r);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join(',');
  }
  C.fmt = fmt;
  /* Lit un nombre tapé : « 12,5 », « 12.5 », espaces tolérés. Renvoie {v} ou {err}. */
  function parseNum(raw, f) {
    var s = String(raw === undefined || raw === null ? '' : raw).replace(/\s/g, '').replace(',', '.'), q = '« ' + f.label + ' »', v;
    if (s === '') return { err: 'Remplissez ' + q + '.' };
    if (!/^-?\d+(\.\d+)?$/.test(s)) return { err: q + ' : tapez un nombre, par exemple ' + (f.ex || '12,5') + '.' };
    v = parseFloat(s);
    if (v < 0) return { err: q + ' ne peut pas être négatif.' };
    if (f.min !== undefined && v < f.min) return { err: f.range ? q + ' doit être entre ' + fmt(f.min) + ' et ' + fmt(f.max) + '.' : q + (f.min < 1 && v === 0 ? ' doit être supérieur à 0.' : ' doit être au moins ' + fmt(f.min) + ' ' + (f.unit || '') + '.') };
    if (f.max !== undefined && v > f.max) return { err: f.range ? q + ' doit être entre ' + fmt(f.min) + ' et ' + fmt(f.max) + '.' : q + ' semble trop grand (maximum ' + fmt(f.max) + ' ' + (f.unit || '') + '). Vérifiez l\'unité.' };
    return { v: v };
  }
  function ceil(x) { return Math.ceil(x - 1e-9); }           /* arrondi au-dessus, sans erreur de virgule flottante */
  function floor(x) { return Math.floor(x + 1e-9); }
  function plural(n, one, many) { return n + ' ' + (n > 1 ? many : one); }

  /* ---------- Données ---------- */
  var SEASONS = [['printemps', 'Printemps'], ['ete', 'Été'], ['automne', 'Automne'], ['hiver', 'Hiver']];
  var EXPOS = [['soleil', 'Plein soleil'], ['mi', 'Mi-ombre'], ['ombre', 'Ombre']];
  /* Nombre d'arrosages par semaine selon saison et exposition (pots dehors) */
  var FREQ = { printemps: { soleil: 3, mi: 2, ombre: 2 }, ete: { soleil: 5, mi: 4, ombre: 3 }, automne: { soleil: 2, mi: 2, ombre: 1 }, hiver: { soleil: 1, mi: 1, ombre: 1 } };
  var WATER_SHARE = 0.2;                                     /* un arrosage = environ 1/5 du volume du pot */
  /* Espacement entre plants (cm) : id de fiche -> [libellé de secours, espacement] ; le nom vient de T.D.plantes si la fiche existe */
  var SPACING = [['tomate', 'Tomate', 60], ['tomate-cerise', 'Tomate cerise', 50], ['courgette', 'Courgette', 80], ['concombre', 'Concombre', 50], ['aubergine', 'Aubergine', 50],
    ['poivron', 'Poivron', 40], ['piment', 'Piment', 40], ['laitue', 'Laitue', 25], ['radis', 'Radis', 6], ['carotte', 'Carotte', 8], ['haricot-nain', 'Haricot nain', 15],
    ['epinard', 'Épinard', 10], ['poireau', 'Poireau', 12], ['oignon', 'Oignon', 10], ['ail', 'Ail', 10], ['betterave', 'Betterave', 12], ['basilic', 'Basilic', 20],
    ['persil', 'Persil', 15], ['ciboulette', 'Ciboulette', 15], ['menthe', 'Menthe', 30], ['thym', 'Thym', 25], ['romarin', 'Romarin', 50], ['fraisier', 'Fraisier', 30],
    ['geranium', 'Géranium', 25], ['petunia', 'Pétunia', 25], ['pensee', 'Pensée', 15], ['capucine', 'Capucine', 30], ['lavande', 'Lavande', 40]];
  function spacingList() {
    return SPACING.map(function (s) { var p = T.plante ? T.plante(s[0]) : null; return { id: s[0], nom: (p && p.nom) || s[1], cm: s[2] }; });
  }
  var PH = { hortensia: { nom: 'l\'hortensia', min: 5.5, max: 6.5 }, myrtillier: { nom: 'le myrtillier', min: 4.5, max: 5.5 }, lavande: { nom: 'la lavande', min: 6.5, max: 8 }, potager: { nom: 'le potager', min: 6, max: 7 } };

  function seasonNow() { var m = T.monthNow(); return m >= 3 && m <= 5 ? 'printemps' : (m >= 6 && m <= 8 ? 'ete' : (m >= 9 && m <= 11 ? 'automne' : 'hiver')); }

  /* ---------- Définition des calculettes ----------
     fields(v) : champs affichés (type num | chips | select) ; compute(v) : {err:[...]} ou {big, text, note, warn, kind} */
  var CALCS = [
    { id: 'terreau', tab: 'Terreau', title: 'Terreau pour un pot',
      intro: 'Combien de litres de terreau acheter pour un pot rond, un pot rectangulaire ou une jardinière ?',
      fields: function (v) {
        var f = [{ k: 'forme', type: 'chips', label: 'Forme du pot', opts: [['rond', 'Pot rond'], ['rect', 'Pot rectangulaire ou jardinière']], def: 'rond' }];
        if (v.forme === 'rect') f.push({ k: 'long', label: 'Longueur', unit: 'cm', def: 60, min: 10, max: 500 }, { k: 'larg', label: 'Largeur', unit: 'cm', def: 20, min: 10, max: 300 });
        else f.push({ k: 'diam', label: 'Diamètre en haut', unit: 'cm', def: 30, min: 10, max: 300 });
        f.push({ k: 'haut', label: 'Hauteur du pot', unit: 'cm', def: v.forme === 'rect' ? 20 : 30, min: 10, max: 200 });
        return f;
      },
      compute: function (v) {
        var area = v.forme === 'rect' ? v.long * v.larg : Math.PI * Math.pow(v.diam / 2, 2);
        var drain = v.haut <= 20 ? 2 : (v.haut <= 40 ? 3 : 5), soilH = v.haut - 2 - drain;
        var litres = ceil(area * soilH / 1000 * 1.1), sacs = ceil(litres / 40), billes = area * drain / 1000;
        return { big: litres + ' litres de terreau (' + plural(sacs, 'sac', 'sacs') + ' de 40 litres)',
          text: 'Prévoyez aussi environ ' + fmt(billes) + ' litres de billes d\'argile ou de graviers sur ' + drain + ' cm au fond du pot, pour le drainage.',
          note: 'Calcul : volume du pot, moins ' + drain + ' cm de drainage et 2 cm sous le bord pour l\'arrosage, plus 10 % car le terreau se tasse. Le dernier sac peut rester entamé.' };
      } },

    { id: 'plants', tab: 'Plants', title: 'Nombre de plants',
      intro: 'Combien de plants tiennent dans une jardinière ou sur une planche, en respectant la bonne distance ?',
      fields: function (v) {
        var f = [{ k: 'plante', type: 'select', label: 'Plante', def: 'basilic', opts: spacingList().map(function (s) { return [s.id, s.nom + ' (' + s.cm + ' cm)']; }).concat([['autre', 'Autre plante (je choisis la distance)']]) }];
        if (v.plante === 'autre') f.push({ k: 'esp', label: 'Distance entre deux plants', unit: 'cm', def: 30, min: 3, max: 200 });
        f.push({ k: 'long', label: 'Longueur', unit: 'cm', def: 100, min: 5, max: 5000 }, { k: 'larg', label: 'Largeur', unit: 'cm', def: 25, min: 5, max: 5000 });
        return f;
      },
      compute: function (v) {
        var esp = v.esp, i, s = spacingList();
        if (v.plante !== 'autre') for (i = 0; i < s.length; i++) if (s[i].id === v.plante) esp = s[i].cm;
        var nl = floor(v.long / esp), nw = floor(v.larg / esp);
        if (nl < 1 || nw < 1) return { warn: true, big: '0 plant', text: 'La surface est trop petite : il faut au moins ' + fmt(esp) + ' cm dans chaque sens pour cette plante. Choisissez un plus grand contenant ou une plante plus petite.', note: '' };
        return { big: plural(nl * nw, 'plant', 'plants'),
          text: nl + ' dans la longueur sur ' + nw + ' dans la largeur, à ' + fmt(esp) + ' cm les uns des autres.',
          note: 'On compte un plant tous les ' + fmt(esp) + ' cm. Pour une plante qui s\'étale ou qui grimpe, laissez un peu plus de place.' };
      } },

    { id: 'arrosage', tab: 'Arrosage', title: 'Arrosage de la semaine',
      intro: 'Quelle quantité d\'eau prévoir par semaine pour un pot, selon la saison et l\'exposition ?',
      fields: function () {
        return [{ k: 'vol', label: 'Volume du pot', unit: 'litres', def: 10, min: 0.5, max: 1000 },
          { k: 'saison', type: 'chips', label: 'Saison', opts: SEASONS, def: seasonNow() },
          { k: 'expo', type: 'chips', label: 'Exposition du pot', opts: EXPOS, def: 'mi' }];
      },
      compute: function (v) {
        var n = FREQ[v.saison][v.expo], one = v.vol * WATER_SHARE;
        var hiver = v.saison === 'hiver' ? ' En hiver, arrosez seulement si la terre est sèche sur 3 cm et qu\'il ne gèle pas.' : '';
        return { big: fmt(one * n) + ' litres par semaine', text: 'Environ ' + plural(n, 'arrosage', 'arrosages') + ' de ' + fmt(one) + ' litre' + (one >= 2 ? 's' : '') + ' chacun.' + hiver,
          note: 'Un arrosage apporte à peu près un cinquième du volume du pot. C\'est une moyenne : enfoncez un doigt de 3 cm dans la terre et n\'arrosez que si elle est sèche. Par forte chaleur, il faut plus.' };
      } },

    { id: 'engrais', tab: 'Engrais', title: 'Compost et engrais',
      intro: 'Quelle dose de compost ou d\'engrais granulé, par mètre carré ou par pot ?',
      fields: function (v) {
        var f = [{ k: 'produit', type: 'chips', label: 'Produit', opts: [['compost', 'Compost mûr'], ['granule', 'Engrais organique en granulés']], def: 'compost' },
          { k: 'mode', type: 'chips', label: 'Pour', opts: [['m2', 'Un sol (par m²)'], ['pot', 'Un pot']], def: 'm2' }];
        if (v.mode === 'pot') f.push({ k: 'potl', label: 'Volume du pot', unit: 'litres', def: 10, min: 0.5, max: 1000 });
        else f.push({ k: 'surf', label: 'Surface à nourrir', unit: 'm²', def: 4, min: 0.1, max: 10000 });
        return f;
      },
      compute: function (v) {
        var big, text;
        function g(x) { return x >= 1000 ? fmt(x / 1000, 2) + ' kg' : fmt(x) + ' g'; }
        if (v.produit === 'compost') {
          var l = v.mode === 'pot' ? v.potl * 0.1 : v.surf * 3;
          big = fmt(l) + ' litres de compost mûr';
          text = v.mode === 'pot' ? 'Griffez-le en surface du pot (environ 1 litre pour 10 litres de terre), au printemps.' : 'Soit 3 litres par m², à étaler et griffer légèrement au printemps, une fois par an.';
        } else {
          var gr = v.mode === 'pot' ? v.potl * 1.5 : v.surf * 80;
          big = g(gr) + ' d\'engrais en granulés';
          text = v.mode === 'pot' ? 'Soit environ 1,5 g par litre de terre, mélangé à la surface puis arrosé, au printemps.' : 'Soit 80 g par m², griffés en surface au printemps, puis arrosés.';
        }
        return { big: big, text: text, warn: false, note: 'Valeurs prudentes. Suivez toujours l\'étiquette du produit : trop d\'engrais brûle les racines et ne rend pas les plantes plus belles.', extraWarn: 'Suivez l\'étiquette du produit que vous achetez : elle prime sur ces valeurs.' };
      } },

    { id: 'ph', tab: 'Acidité du sol', title: 'Acidité du sol (pH)',
      intro: 'Votre terre est-elle adaptée à la plante ? Entrez le pH mesuré avec un testeur ou un kit.',
      fields: function () {
        return [{ k: 'ph', label: 'pH mesuré', unit: 'pH', def: 6.5, min: 3, max: 10, range: true, ex: '6,5' },
          { k: 'cible', type: 'chips', label: 'Plante visée', opts: [['hortensia', 'Hortensia'], ['myrtillier', 'Myrtillier'], ['lavande', 'Lavande'], ['potager', 'Potager']], def: 'potager' }];
      },
      compute: function (v) {
        var t = PH[v.cible], ph = Math.round(v.ph * 10) / 10, range = fmt(t.min) + ' à ' + fmt(t.max);
        if (ph >= t.min && ph <= t.max) return { big: 'pH adapté', text: 'Un pH de ' + fmt(ph) + ' convient pour ' + t.nom + ' (idéal : ' + range + '). Vous n\'avez rien à ajouter.', note: 'Refaites un test chaque année : le pH change avec les arrosages et les apports.' };
        var g, dose;
        if (ph < t.min) {
          g = Math.round((t.min - ph) * 10) / 10; dose = Math.min(v.cible === 'myrtillier' ? 50 : 300, Math.round(g * 150 / 5) * 5);
          return { big: 'Sol trop acide : environ ' + dose + ' g de chaux par m²', warn: true,
            text: 'Pour ' + t.nom + ' (pH idéal ' + range + '), la terre est trop acide. Apport indicatif : environ ' + dose + ' g par m² de chaux (carbonate de calcium), épandus en surface à l\'automne' + (dose > 150 ? ', en deux fois à trois mois d\'écart' : '') + '. Pour un pot, remplacez plutôt une partie de la terre par du terreau universel.',
            note: 'Calcul : environ 150 g par m² pour remonter le pH de 1 point, sans dépasser 300 g par m² et par an. Refaites un test 3 mois après.', extraWarn: (v.cible === 'myrtillier' ? 'Le myrtillier supporte très mal la chaux : ne dépassez jamais cette dose. ' : '') + 'N\'appliquez jamais chaux et soufre ensemble, ni chaux et fumier le même jour.' };
        }
        g = Math.round((ph - t.max) * 10) / 10; dose = Math.min(100, Math.round(g * 50 / 5) * 5);
        return { big: 'Sol trop basique : environ ' + dose + ' g de soufre par m²', warn: true,
          text: 'Pour ' + t.nom + ' (pH idéal ' + range + '), la terre est trop basique. Apport indicatif : environ ' + dose + ' g par m² de soufre en poudre, griffé en surface au printemps. Plus doux : paillis d\'aiguilles de pin ou de feuilles, compost de feuilles. En pot : utilisez de la terre de bruyère.',
          note: 'Calcul : environ 50 g par m² pour baisser le pH de 1 point, sans dépasser 100 g par m² et par an. Si le sol est très calcaire (pH au-dessus de 8), préférez la culture en pot avec de la terre de bruyère.', extraWarn: 'N\'appliquez jamais chaux et soufre ensemble.' };
      } }
  ];
  function calc(id) { for (var i = 0; i < CALCS.length; i++) if (CALCS[i].id === id) return CALCS[i]; return CALCS[0]; }

  /* ---------- Valeurs saisies ---------- */
  function vals(c) { return C.vals[c.id] || (C.vals[c.id] = {}); }
  function fieldVal(store, f) { return store[f.k] !== undefined ? store[f.k] : (f.type ? f.def : fmt(f.def, 2)); }
  /* Champs actuels (selon les valeurs, ex. forme du pot) */
  function currentFields(c) {
    var st = vals(c), probe = {}, k;
    for (k in st) probe[k] = st[k];
    var first = c.fields(probe), i;
    for (i = 0; i < first.length; i++) if (first[i].type && probe[first[i].k] === undefined) probe[first[i].k] = first[i].def;
    return c.fields(probe);
  }

  /* ---------- Affichage ---------- */
  function fieldHtml(c, f, st) {
    var id = 'cl-' + f.k, val = fieldVal(st, f), h = '';
    if (f.type === 'chips') {
      h += '<label class="lbl">' + T.esc(f.label) + '</label><div class="chips" role="group" aria-label="' + T.esc(f.label) + '">' + f.opts.map(function (o) {
        return '<button class="chip' + (String(val) === o[0] ? ' on' : '') + '" data-act="calcset" data-k="' + f.k + '" data-v="' + o[0] + '" aria-pressed="' + (String(val) === o[0]) + '">' + T.esc(o[1]) + '</button>';
      }).join('') + '</div>';
    } else if (f.type === 'select') {
      h += '<label class="lbl" for="' + id + '">' + T.esc(f.label) + '</label><select class="field" id="' + id + '" data-input="calcin" data-k="' + f.k + '">' + f.opts.map(function (o) {
        return '<option value="' + o[0] + '"' + (String(val) === o[0] ? ' selected' : '') + '>' + T.esc(o[1]) + '</option>';
      }).join('') + '</select>';
    } else {
      h += '<label class="lbl" for="' + id + '">' + T.esc(f.label) + '</label><div class="cl-unit"><input class="field" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" data-input="calcin" data-k="' + f.k + '" value="' + T.esc(val) + '"><span>' + T.esc(f.unit) + '</span></div>';
    }
    return h;
  }
  function resultHtml(r) {
    if (!r) return '';
    if (r.errs) return '<div class="notice bad cl-res" role="alert"><b>Vérifiez la saisie</b><ul>' + T.list(r.errs) + '</ul></div>';
    var spoken = r.big + '. ' + r.text + ' ' + (r.note || '');
    return '<div class="notice ' + (r.warn ? 'warn' : 'ok') + ' cl-res" role="status"><p class="big-num">' + T.esc(r.big) + '</p><p>' + T.esc(r.text) + '</p>' + (r.note ? '<p class="small">' + T.esc(r.note) + '</p>' : '') +
      (r.extraWarn ? '<p class="small"><b>Attention :</b> ' + T.esc(r.extraWarn) + '</p>' : '') + '</div>' + '<div class="cl-listen">' + T.voice.button(spoken, 'Écouter') + '</div>';
  }
  T.route(/^\/calculs$/, 'plus', function () {
    var c = calc(C.cur), st = vals(c), h = '';
    h += '<div class="hero"><h2>Calculs du jardinier</h2><p>Cinq petites calculettes, sans internet.</p></div>';
    h += '<label class="lbl">Quel calcul ?</label><div class="chips cl-tabs">' + CALCS.map(function (x) {
      return '<button class="chip' + (x.id === c.id ? ' on' : '') + '" data-act="calcsel" data-id="' + x.id + '" aria-pressed="' + (x.id === c.id) + '">' + T.esc(x.tab) + '</button>';
    }).join('') + '</div>';
    h += '<div class="card"><h2>' + T.esc(c.title) + '</h2><p class="muted small">' + T.esc(c.intro) + '</p>' + currentFields(c).map(function (f) { return fieldHtml(c, f, st); }).join('') +
      '<button class="btn primary block cl-go" data-act="calcgo">Calculer</button><div id="cl-out">' + resultHtml(C.res[c.id]) + '</div></div>';
    h += '<div class="notice warn cl-warn">Ces résultats sont des estimations prudentes. Suivez toujours l\'étiquette des produits que vous utilisez.</div>';
    return { title: 'Calculs du jardinier', html: h };
  });

  /* ---------- Actions ---------- */
  T.act.calcsel = function (el) { C.cur = el.getAttribute('data-id'); T.render(); };
  T.act.calcset = function (el) { var c = calc(C.cur); vals(c)[el.getAttribute('data-k')] = el.getAttribute('data-v'); C.res[c.id] = null; T.render(true); };
  /* Saisie : on garde la valeur et on efface l'ancien résultat (il ne correspondrait plus) */
  T.input.calcin = function (el) {
    var c = calc(C.cur), k = el.getAttribute('data-k'), out = document.getElementById('cl-out');
    vals(c)[k] = el.value; C.res[c.id] = null;
    if (el.tagName === 'SELECT') { T.render(true); return; }              /* la liste change les champs (ex. « Autre plante ») */
    if (out) out.innerHTML = '';
  };
  T.act.calcgo = function () {
    var c = calc(C.cur), st = vals(c), fields = currentFields(c), errs = [], v = {}, i, f, el, p;
    for (i = 0; i < fields.length; i++) {                              /* relire l'écran : la saisie semi-automatique n'envoie pas toujours d'événement */
      f = fields[i]; el = document.getElementById('cl-' + f.k);
      if (el && !f.type) st[f.k] = el.value;
    }
    for (i = 0; i < fields.length; i++) {
      f = fields[i];
      if (f.type) { v[f.k] = String(fieldVal(st, f)); continue; }
      p = parseNum(fieldVal(st, f), f);
      if (p.err) errs.push(p.err); else v[f.k] = p.v;
    }
    C.res[c.id] = errs.length ? { errs: errs } : c.compute(v);
    T.render(true);
    var o = document.getElementById('cl-out'); if (o && o.scrollIntoView) { try { o.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ancien WebView */ } }
  };
  /* Touche Entrée dans un champ : lance le calcul */
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.keyCode === 13) && e.target && /^cl-/.test(e.target.id || '') && e.target.tagName === 'INPUT') { e.preventDefault(); T.act.calcgo(); }
  });
})();
