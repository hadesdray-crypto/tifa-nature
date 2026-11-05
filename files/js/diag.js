/* Tifa Nature - « Ma plante est malade » : photo + questions simples -> cause probable et que faire.
   La photo est analysée en ligne si le service est disponible ; le questionnaire marche toujours, même sans connexion. */
(function () {
  'use strict';
  var T = window.T, D = T.diag = { photo: null, blob: null, organ: 'leaf', plantId: '', sel: {}, parts: {}, show: false, results: null, online: null, busy: false, error: '' };

  var PARTS = [['f', 'Feuilles'], ['t', 'Tiges'], ['fl', 'Fleurs'], ['fr', 'Fruits'], ['r', 'Racines et terre'], ['g', 'Toute la plante']];
  var SYMP = {
    f_jaunissent: 'Les feuilles jaunissent', f_taches_brunes: 'Taches brunes sur les feuilles', f_taches_noires: 'Taches noires sur les feuilles', f_poudre_blanche: 'Poudre blanche sur les feuilles',
    f_pustules_orange_dessous: 'Petits boutons orange sous les feuilles', f_trous: 'Feuilles trouées ou mangées', f_bords_secs: 'Bords des feuilles secs ou brûlés', f_enroulees_deformees: 'Feuilles enroulées ou déformées',
    f_collantes_miellat: 'Feuilles collantes (miellat)', f_noircies_suie: 'Dépôt noir comme de la suie', f_fanent_molles: 'Feuilles molles qui pendent', f_tombent: 'Les feuilles tombent',
    f_pales_decolorees: 'Feuilles pâles ou décolorées', f_nervures_vertes_jaune: 'Feuilles jaunes avec nervures vertes', f_toiles_fines: 'Fines toiles ou points minuscules', f_insectes_visibles: 'Petits insectes visibles',
    f_mouchetees_argentees: 'Feuilles mouchetées, argentées', f_cloque_rouge: 'Feuilles cloquées, rouges ou rosées', f_mosaique: 'Feuilles marbrées en mosaïque', f_pointes_brunes: 'Pointes des feuilles brunes',
    f_taches_jaunes_dessus_duvet_dessous: 'Taches jaunes dessus, duvet dessous', f_chenilles_visibles: 'Chenilles visibles', f_galeries_mines: 'Galeries ou traces dans la feuille',
    t_base_pourrie: 'Le pied de la plante pourrit', t_taches_sombres: 'Taches sombres sur les tiges', t_fonte_couchee: 'Jeunes plants couchés au sol', t_moisissure_grise: 'Moisissure grise sur les tiges',
    t_allongee_etiolee: 'Tiges longues, minces et pâles', t_boucliers_collants: 'Petits boucliers ou coton blanc sur les tiges', t_fourmis_presentes: 'Fourmis sur la plante',
    fl_boutons_tombent: 'Les boutons tombent avant d\'ouvrir', fl_boutons_pourrissent: 'Boutons ou fleurs qui pourrissent', fl_moisissure_grise: 'Moisissure grise sur les fleurs', fl_pas_de_fleurs: 'La plante ne fleurit pas',
    fl_fanent_vite: 'Les fleurs fanent très vite', fl_taches_petales: 'Taches sur les pétales', fl_montee_en_graine: 'La plante monte en graine trop tôt',
    fr_pourriture_pointe: 'Fruits noirs et mous au bout', fr_taches_sombres: 'Taches sombres sur les fruits', fr_eclatent: 'Les fruits éclatent', fr_pourriture_molle_anneaux: 'Fruits qui pourrissent en cercles',
    fr_trous_vers: 'Fruits percés avec des vers', fr_deformes: 'Fruits déformés',
    r_racines_brunes_molles: 'Racines brunes et molles', r_galles_renflements: 'Racines avec des boules ou renflements', r_terreau_moisi_blanc: 'Moisissure blanche sur la terre', r_moucherons_terreau: 'Petits moucherons autour du pot',
    r_sol_dur_craquele: 'Terre dure et fissurée', r_croute_blanche_sel: 'Croûte blanche sur la terre', r_mauvaise_odeur: 'Mauvaise odeur de la terre', r_vers_blancs: 'Vers blancs dans la terre', r_escargots_traces_baves: 'Traces de bave, escargots ou limaces',
    g_croissance_stoppee: 'La plante ne pousse plus', g_plante_entiere_fane: 'Toute la plante fane', g_apres_gel: 'Après une gelée', g_apres_soleil_fort: 'Après un coup de soleil fort', g_pres_chauffage_courant_air: 'Près d\'un chauffage ou d\'un courant d\'air'
  };
  var KW = { aphis: 'pucerons', myzus: 'pucerons', phytophthora: 'mildiou', plasmopara: 'mildiou', peronospora: 'mildiou', bremia: 'mildiou', erysiph: 'oidium', podosphaera: 'oidium', golovinomyces: 'oidium', oidium: 'oidium', puccinia: 'rouille', botrytis: 'botrytis', diplocarpon: 'tache-noire-rosier', marssonina: 'tache-noire-rosier', coccus: 'cochenilles', pseudococc: 'cochenilles', tetranychus: 'acariens-araignees-rouges', trialeurodes: 'aleurodes-mouches-blanches', bemisia: 'aleurodes-mouches-blanches', thrips: 'thrips', frankliniella: 'thrips', leptinotarsa: 'doryphore', arion: 'limaces-escargots', helix: 'limaces-escargots', deroceras: 'limaces-escargots', monilinia: 'moniliose', taphrina: 'cloque-pecher', cydalima: 'pyrale-buis', plasmodiophora: 'hernie-chou', pythium: 'fonte-semis', rhizoctonia: 'fonte-semis', capnodium: 'fumagine', altica: 'altise', phyllotreta: 'altise', otiorhynchus: 'vers-blancs-otiorhynque', delia: 'mouche-carotte' };

  function partOf(id) { for (var i = 0; i < PARTS.length; i++) if (id.indexOf(PARTS[i][0] + '_') === 0) return PARTS[i][0]; return 'g'; }
  function selIds() { return Object.keys(D.sel).filter(function (k) { return D.sel[k]; }); }

  /* ---------- Calcul du diagnostic (à partir des symptômes choisis) ---------- */
  D.compute = function () {
    var sel = selIds(), plant = D.plantId ? T.plante(D.plantId) : null, m = T.monthNow(), out = [];
    if (!sel.length) return out;
    T.D.maladies.forEach(function (d) {
      var sy = d.symptomes || [], hit = sy.filter(function (s) { return sel.indexOf(s) >= 0; }).length;
      if (!hit) return;
      var score = (hit / sel.length) * 0.6 + (hit / Math.max(1, sy.length)) * 0.4;
      if (plant && (plant.problemes || []).indexOf(d.id) >= 0) score += 0.15;
      if ((d.saison || []).indexOf(m) >= 0) score += 0.04;
      out.push({ d: d, score: score, hit: hit });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, 4);
  };
  function conf(score, rank) {
    if (rank === 0 && score >= 0.55) return ['Très probable', 'ok'];
    if (score >= 0.35) return ['Probable', 'ok'];
    return ['Possible', 'warn'];
  }
  function speech(d) { return d.nom + '. ' + d.resume + ' Que faire : ' + d.solutions.map(function (s, i) { return 'Étape ' + (i + 1) + '. ' + s; }).join(' ') + ' Pour éviter que ça revienne : ' + T.plain(d.prevention); }
  function detailHtml(d) {
    return '<h3>Comment le reconnaître</h3><ul>' + T.list(d.reconnaitre) + '</ul><h3>Pourquoi ça arrive</h3><ul>' + T.list(d.pourquoi) + '</ul>' +
      '<h3>Que faire</h3><ol class="steps">' + T.list(d.solutions) + '</ol><h3>Pour que ça ne revienne pas</h3><ul>' + T.list(d.prevention) + '</ul>';
  }
  function tagsOf(d) { return '<div class="tags"><span class="tag">' + T.esc(T.MTYPE[d.type] || d.type) + '</span><span class="tag ' + (d.urgence === 'a_traiter_vite' ? 'bad' : (d.urgence === 'a_surveiller' ? 'warn' : 'ok')) + '">' + T.esc(T.URG[d.urgence] || '') + '</span></div>'; }

  /* ---------- Analyse de la photo (en ligne) ---------- */
  function mapOnline(r) {
    var code = r.name, desc = T.norm(r.description || ''), i, d;
    for (i = 0; i < T.D.maladies.length; i++) { d = T.D.maladies[i]; if ((d.eppo || []).indexOf(code) >= 0) return d; }
    var keys = Object.keys(KW);
    for (i = 0; i < keys.length; i++) if (desc.indexOf(keys[i]) >= 0 && T.maladie(KW[keys[i]])) return T.maladie(KW[keys[i]]);
    return null;
  }
  D.runOnline = function () {
    if (!D.blob || T.plantnet.status() !== 'ok') return;
    D.busy = true; D.online = null; D.error = '';
    T.plantnet.diagnose(D.blob, D.organ).then(function (j) { D.online = (j && j.results) || []; }, function () { D.online = null; D.error = 'L\'analyse de la photo n\'a pas pu se faire. Le diagnostic ci-dessous vient de vos réponses.'; })
      .then(function () { D.busy = false; if (/^#\/maladie(\?|$)/.test(location.hash)) T.render(true); });
  };

  /* ---------- Écran principal ---------- */
  function plantPicker() {
    var p = D.plantId ? T.plante(D.plantId) : null, h = '<div class="card"><h3>Quelle plante ? (facultatif)</h3>';
    if (p) h += '<div class="notice">Plante : <b>' + T.esc(p.nom) + '</b> <button class="chip" data-act="dplant" data-id="">Changer</button></div>';
    else h += '<input class="field" id="dq" type="search" autocomplete="off" maxlength="60" placeholder="Chercher la plante" data-input="diagplant"><div id="dres"></div><p class="small muted">Si vous la connaissez, le diagnostic est plus précis.</p>';
    return h + '</div>';
  }
  T.input.diagplant = function (el) {
    var r = document.getElementById('dres'); if (!r) return;
    var q = el.value.trim(); if (!q) { r.innerHTML = ''; return; }
    r.innerHTML = T.search.plants(q, {}).slice(0, 5).map(function (x) { return '<button class="item" data-act="dplant" data-id="' + T.esc(x.p.id) + '"><b>' + T.esc(x.p.nom) + '</b><i>' + T.esc(x.p.latin) + '</i></button>'; }).join('');
  };
  T.act.dplant = function (el) { D.plantId = el.getAttribute('data-id') || ''; D.results = null; T.render(true); };
  T.act.dpart = function (el) { var k = el.getAttribute('data-p'); D.parts[k] = !D.parts[k]; T.render(true); };
  T.act.dsym = function (el) { var k = el.getAttribute('data-s'); D.sel[k] = !D.sel[k]; T.render(true); };
  T.act.dorgan = function (el) { D.organ = el.getAttribute('data-val'); T.render(true); };
  T.act.diagreset = function () { D.photo = null; D.blob = null; D.plantId = ''; D.sel = {}; D.parts = {}; D.show = false; D.online = null; D.error = ''; T.render(); };
  T.act.diagedit = function () { D.show = false; T.render(); };
  T.act.diaggo = function () {
    if (!selIds().length) { T.toast('Choisissez au moins un signe visible sur la plante.'); return; }
    D.show = true; D.online = null; D.error = ''; D.runOnline(); T.render();
  };

  T.route(/^\/maladie$/, 'trouver', function () {
    var q = T.query || {};
    if (q.plante && !D.plantId && T.plante(q.plante)) D.plantId = q.plante;
    var h = '';
    if (D.show) {
      var res = D.compute(), sel = selIds();
      h += '<div class="hero"><h2>Diagnostic</h2><p>D\'après ce que vous avez observé (' + sel.length + ' signe' + (sel.length > 1 ? 's' : '') + ').</p></div>';
      if (D.photo) h += '<img class="photo" alt="Votre photo" src="' + T.esc(D.photo) + '">';
      if (D.busy) h += '<div class="notice"><b>Analyse de la photo en cours…</b></div>';
      if (D.error) h += '<div class="notice warn">' + T.esc(D.error) + '</div>';
      if (D.online) {
        if (!D.online.length) h += '<div class="notice">L\'analyse de la photo n\'a pas trouvé de maladie précise. Fiez-vous au diagnostic ci-dessous.</div>';
        else {
          h += '<div class="card"><h3>Analyse de la photo</h3>';
          D.online.slice(0, 3).forEach(function (r) {
            var d = mapOnline(r), pct = Math.round((r.score || 0) * 100);
            h += '<div class="item" style="box-shadow:none"><b>' + T.esc(r.description || r.name) + '</b><i>Certitude : ' + pct + ' %</i>' + (d ? '<a class="btn block" style="margin-top:.4rem" href="#/maladie/' + T.esc(d.id) + '">Voir que faire : ' + T.esc(d.nom) + '</a>' : '') + '</div>';
          });
          h += '</div>';
        }
      }
      if (!res.length) h += '<div class="notice warn">Je n\'ai pas trouvé de cause précise avec ces signes. Ajoutez un autre signe visible, ou regardez la <a href="#/maladies">liste des maladies</a>.</div>';
      res.forEach(function (r, i) {
        var c = conf(r.score, i), d = r.d;
        if (i === 0) h += '<div class="card"><div class="tags"><span class="tag ' + c[1] + '">' + c[0] + '</span></div><h2 style="margin-top:.2rem">' + T.esc(d.nom) + '</h2><p>' + T.esc(d.resume) + '</p>' + tagsOf(d) + detailHtml(d) + '<div class="row">' + T.voice.button(speech(d), 'Écouter les conseils') + '</div></div>';
        else h += '<a class="item" href="#/maladie/' + T.esc(d.id) + '"><div class="tags"><span class="tag ' + c[1] + '">' + c[0] + '</span></div><b>' + T.esc(d.nom) + '</b><i>' + T.esc(d.resume) + '</i></a>';
      });
      h += '<p class="small muted">Conseils indicatifs. En cas de doute, montrez la plante à un jardinier ou à votre jardinerie.</p><div class="row"><button class="btn grow" data-act="diagedit">Modifier mes réponses</button><button class="btn grow" data-act="diagreset">Recommencer</button></div>';
      return { title: 'Diagnostic', html: h };
    }
    h += T.photoCard(D, 'diag', 'Ma plante est malade', 'Prenez une photo de la partie abîmée (facultatif), puis dites ce que vous voyez.');
    if (D.photo) h += '<label class="lbl">Que montre la photo ?</label><div class="chips">' + [['leaf', 'Feuille'], ['flower', 'Fleur'], ['fruit', 'Fruit'], ['bark', 'Tige'], ['auto', 'Je ne sais pas']].map(function (o) { return '<button class="chip' + (D.organ === o[0] ? ' on' : '') + '" data-act="dorgan" data-val="' + o[0] + '" aria-pressed="' + (D.organ === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>';
    var st = T.plantnet.status();
    if (D.photo) h += st === 'ok' ? '<p class="small muted">La photo sera analysée en ligne, en plus de vos réponses.</p>' : '<p class="small muted">Sans connexion ou service, la photo reste sur votre téléphone : le diagnostic se fait avec vos réponses.</p>';
    h += '</div>' + plantPicker();
    h += '<div class="card"><h3>Où voyez-vous le problème ?</h3><div class="chips">' + PARTS.map(function (p) { return '<button class="chip' + (D.parts[p[0]] ? ' on' : '') + '" data-act="dpart" data-p="' + p[0] + '" aria-pressed="' + !!D.parts[p[0]] + '">' + p[1] + '</button>'; }).join('') + '</div></div>';
    var shown = PARTS.filter(function (p) { return D.parts[p[0]]; });
    if (!shown.length) h += '<p class="muted">Choisissez une ou plusieurs parties de la plante ci-dessus.</p>';
    shown.forEach(function (p) {
      h += '<div class="card"><h3>' + T.esc(p[1]) + ' : que voyez-vous ?</h3>';
      Object.keys(SYMP).filter(function (k) { return partOf(k) === p[0]; }).forEach(function (k) {
        h += '<button class="item" style="box-shadow:none;' + (D.sel[k] ? 'border-color:var(--primary);background:var(--soft)' : '') + '" data-act="dsym" data-s="' + k + '" aria-pressed="' + !!D.sel[k] + '"><b style="font-family:var(--sans);font-size:.98rem">' + (D.sel[k] ? 'Oui : ' : '') + T.esc(SYMP[k]) + '</b></button>';
      });
      h += '</div>';
    });
    var n = selIds().length;
    h += '<button class="btn primary block" data-act="diaggo"' + (n ? '' : ' disabled') + '>Voir le diagnostic' + (n ? ' (' + n + ' signe' + (n > 1 ? 's' : '') + ')' : '') + '</button>';
    if (D.photo || n || D.plantId) h += '<button class="btn block" style="margin-top:.6rem" data-act="diagreset">Recommencer</button>';
    return { title: 'Ma plante est malade', html: h };
  });

  /* ---------- Liste et fiche d'une maladie ---------- */
  var mq = '';
  function listHtml(q) {
    var list = T.D.maladies.slice();
    if (q) { var toks = T.norm(q).split(' ').filter(Boolean); list = list.filter(function (m) { var hay = T.norm(m.nom + ' ' + m.resume + ' ' + (m.plantes || []).join(' ')); return toks.every(function (t) { return hay.indexOf(t) >= 0; }); }); }
    if (!list.length) return '<div class="notice">Aucun résultat. Essayez un autre mot.</div>';
    var h = '';
    Object.keys(T.MTYPE).forEach(function (t) {
      var g = list.filter(function (m) { return m.type === t; }); if (!g.length) return;
      h += '<h2>' + T.esc(T.MTYPE[t]) + '</h2>' + g.map(function (m) { return '<a class="item" href="#/maladie/' + T.esc(m.id) + '"><b>' + T.esc(m.nom) + '</b><i>' + T.esc(m.resume) + '</i></a>'; }).join('');
    });
    return h;
  }
  T.route(/^\/maladies$/, 'trouver', function () {
    return { title: 'Maladies et problèmes', html: '<div class="card"><input class="field" type="search" id="mq" autocomplete="off" maxlength="60" placeholder="Chercher (pucerons, mildiou, feuilles jaunes…)" value="' + T.esc(mq) + '" data-input="malsearch"></div><div id="mres">' + listHtml(mq) + '</div><a class="btn primary block" href="#/maladie">Faire un diagnostic avec des questions</a>' };
  });
  T.input.malsearch = function (el) { mq = el.value; var r = document.getElementById('mres'); if (r) r.innerHTML = listHtml(mq); };
  T.route(/^\/maladie\/([^/]+)$/, 'trouver', function (m) {
    var d = T.maladie(decodeURIComponent(m[1]));
    if (!d) return { title: 'Maladie', html: '<div class="notice warn">Cette fiche n\'existe pas. <a href="#/maladies">Voir la liste</a></div>' };
    var h = '<div class="card"><h2>' + T.esc(d.nom) + '</h2>' + tagsOf(d) + '<p>' + T.esc(d.resume) + '</p><div class="row">' + T.voice.button(speech(d), 'Écouter les conseils') + '</div></div>';
    h += '<div class="card">' + detailHtml(d) + '</div>';
    var pl = (d.plantes || []).filter(function (x) { return x !== 'toutes'; });
    h += '<div class="card"><h3>Plantes souvent touchées</h3><p>' + (d.plantes && d.plantes[0] === 'toutes' ? 'Toutes les plantes.' : T.esc(pl.join(', '))) + '</p>' + (d.saison && d.saison.length ? '<p class="small muted">Période : ' + T.esc(T.monthsText(d.saison)) + '</p>' + T.months12(d.saison) : '') + '</div>';
    h += '<a class="btn primary block" href="#/maladie">Faire un diagnostic</a>';
    return { title: d.nom, html: h };
  });
})();
