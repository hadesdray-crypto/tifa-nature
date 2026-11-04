/* Domaine : Gestes du jardinier (données, recherche, pas à pas tactile, voix simulée, débordements, erreurs JS). */
module.exports = async function ({ L, browser, base }) {
  const PIX = 'Pixel 8 (Android 14)';
  const clean = (p) => p.errors.filter((e) => !/script-src/.test(e));
  const mk = async (dev, scale) => {
    const p = await L.newPage(browser, base, dev);
    await L.skipOnboarding(p);
    if (scale && scale !== 1) await p.evaluate((s) => { T.store.s.settings.scale = s; T.applyDisplay(); }, scale);
    return p;
  };
  const go = async (p, h) => { await p.evaluate((h) => { location.hash = h; }, h); await L.sleep(200); };
  const tap = async (p, sel) => { const e = await p.$(sel); if (!e) throw new Error('introuvable : ' + sel); await e.tap(); await L.sleep(180); };
  const spy = (p) => p.evaluate(() => {
    window.__sp = []; window.__fe = [];
    T.voice.speak = function (t) { window.__sp.push(String(t)); return Promise.resolve(true); };
    T.feuille = T.feuille || {}; T.feuille.say = function (t, m) { window.__fe.push([t, m]); };
  });
  const text = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return e ? e.innerText : null; }, sel);

  /* =============== DONNÉES =============== */
  let p = await mk(PIX);
  const D = await p.evaluate(() => {
    const out = { n: 0, bad: [], cats: {}, emoji: [], liens: [], ids: [] };
    const G = T.gestes.all(), cats = T.gestes.cats().map((c) => c.id), sch = T.gestes.schemas();
    const emo = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{27BF}\u{2900}-\u{297F}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]|\p{Extended_Pictographic}/u;
    out.n = G.length;
    const seen = {};
    G.forEach((g) => {
      const id = g.id; out.ids.push(id);
      if (seen[id]) out.bad.push('id en double ' + id); seen[id] = 1;
      if (!/^[a-z0-9-]+$/.test(id)) out.bad.push('id invalide ' + id);
      if (cats.indexOf(g.cat) < 0) out.bad.push(id + ' catégorie inconnue'); out.cats[g.cat] = (out.cats[g.cat] || 0) + 1;
      ['titre', 'but', 'duree', 'mots'].forEach((k) => { if (typeof g[k] !== 'string' || g[k].trim().length < 3) out.bad.push(id + ' ' + k + ' vide'); });
      if (['facile', 'moyen'].indexOf(g.diff) < 0) out.bad.push(id + ' difficulté');
      if (!Array.isArray(g.mois) || !g.mois.length || g.mois.some((m) => !Number.isInteger(m) || m < 1 || m > 12)) out.bad.push(id + ' mois hors 1-12');
      if (!Array.isArray(g.mat) || g.mat.length < 2 || g.mat.some((x) => !x || !x.trim())) out.bad.push(id + ' matériel');
      if (!Array.isArray(g.etapes) || g.etapes.length < 6 || g.etapes.length > 10) out.bad.push(id + ' nombre d\'étapes ' + (g.etapes && g.etapes.length));
      (g.etapes || []).forEach((e, i) => {
        if (!e.t || !e.t.trim() || !e.c || e.c.trim().length < 10) out.bad.push(id + ' étape ' + (i + 1) + ' vide');
        if (e.t && e.t.length > 50) out.bad.push(id + ' titre d\'étape trop long ' + (i + 1));
        if (e.c && e.c.length > 420) out.bad.push(id + ' consigne trop longue ' + (i + 1));
        if (e.s && sch.indexOf(e.s) < 0) out.bad.push(id + ' schéma inconnu ' + e.s);
      });
      if (!Array.isArray(g.erreurs) || g.erreurs.length < 2) out.bad.push(id + ' erreurs');
      if (!Array.isArray(g.apres) || g.apres.length < 2) out.bad.push(id + ' après');
      (g.plantes || []).forEach((pid) => { if (!T.plante(pid)) out.bad.push(id + ' lien plante cassé ' + pid); });
      if (!g.etapes.some((e) => e.s)) out.bad.push(id + ' sans schéma');
      const all = JSON.stringify(g);
      if (emo.test(all)) out.emoji.push(id);
      if (/@|https?:|www\./.test(all)) out.bad.push(id + ' adresse ou lien dans le texte');
    });
    return out;
  });
  L.check('gestes : au moins 28 procédures (' + D.n + ')', D.n >= 28);
  L.check('gestes : données valides (ids uniques, étapes 6 à 10, mois 1-12, schémas, liens)', D.bad.length === 0, D.bad.slice(0, 6).join(' | '));
  L.check('gestes : aucun emoji ni pictogramme dans les données', D.emoji.length === 0, D.emoji.join(','));
  L.check('gestes : les 7 catégories contiennent des gestes', ['rempoter', 'multiplier', 'semer', 'tailler', 'entretenir', 'proteger', 'fabriquer'].every((c) => D.cats[c] > 0), JSON.stringify(D.cats));
  const need = ['rempot', 'bouture', 'marcott', 'division', 'rejet', 'semis', 'repiquage', 'durcissement', 'plantation', 'taille', 'pincement', 'tuteur', 'paillage', 'arrosage', 'compost', 'graines', 'hiver', 'bio', 'outils', 'terreau', 'limaces', 'greffe'];
  L.check('gestes : tous les sujets demandés sont présents', need.every((k) => D.ids.some((i) => i.indexOf(k) >= 0)), need.filter((k) => !D.ids.some((i) => i.indexOf(k) >= 0)).join(','));
  L.check('gestes : T.gestes expose all/get/search/suggestionPourLeMois', await p.evaluate(() => ['all', 'get', 'search', 'suggestionPourLeMois'].every((k) => typeof T.gestes[k] === 'function')));
  L.check('gestes : get() d\'un id inconnu renvoie null', await p.evaluate(() => T.gestes.get('nimportequoi') === null && T.gestes.get(null) === null && T.gestes.get(undefined) === null));
  const sugOk = await p.evaluate(() => { for (let m = 1; m <= 12; m++) { const s = T.gestes.suggestionPourLeMois(m); if (!s || !T.gestes.get(s.id) || T.gestes.get(s.id).mois.indexOf(m) < 0) return 'mois ' + m; } const c = T.gestes.suggestionPourLeMois(99); return c && T.gestes.get(c.id) ? 'ok' : 'mois invalide sans repli'; });
  L.check('gestes : la suggestion correspond bien au mois demandé (1-12) et un mois faux se replie sur le mois courant', sugOk === 'ok', sugOk);

  /* =============== RECHERCHE =============== */
  const S = (q) => p.evaluate((q) => T.gestes.search(q), q);
  let r = await S('bouture');
  L.check('recherche : « bouture » trouve au moins 6 gestes de multiplication', r.length >= 6 && r.every((x) => x.id && x.titre && x.cat && typeof x.score === 'number'), r.length + '');
  r = await S('Bouturé GÉRANIUM'); L.check('recherche : accents et majuscules (« Bouturé GÉRANIUM »)', r.length && r[0].id === 'bouture-geranium', JSON.stringify(r.slice(0, 2)));
  r = await S('rampotage'); L.check('recherche : faute courante « rampotage » -> rempotage', r.some((x) => x.id === 'rempoter-interieur'), JSON.stringify(r.slice(0, 3)));
  r = await S('rempottage plante'); L.check('recherche : « rempottage plante »', r.some((x) => x.id === 'rempoter-interieur'));
  r = await S('tomate'); L.check('recherche : « tomate » -> pincement', r.some((x) => x.id === 'pincement-tomate'));
  r = await S('taille rosier'); L.check('recherche : « taille rosier » classe les rosiers en premier', r.length && r[0].id === 'taille-rosiers', JSON.stringify(r.slice(0, 2)));
  r = await S('pucerons'); L.check('recherche : synonymes (« pucerons » -> limaces et pucerons)', r.some((x) => x.id === 'limaces-pucerons'));
  r = await S('mildiou'); L.check('recherche : mot-clé (« mildiou » -> soins naturels)', r.some((x) => x.id === 'traitement-bio'));
  L.check('recherche : requête vide ou espaces -> liste vide', (await S('')).length === 0 && (await S('   ')).length === 0 && (await S(null)).length === 0 && (await S(undefined)).length === 0);
  L.check('recherche : aucun résultat pour un mot absurde, sans erreur', (await S('zzxqwv')).length === 0 && (await S('!!!???')).length === 0);
  L.check('recherche : mots vides seuls (« de la ») -> liste vide', (await S('de la')).length === 0);
  L.check('recherche : texte très long accepté', await p.evaluate(() => { try { return Array.isArray(T.gestes.search('bouture '.repeat(200))); } catch (e) { return false; } }));
  L.check('recherche : tri par score décroissant', await p.evaluate(() => { const r = T.gestes.search('bouture'); return r.every((x, i) => i === 0 || r[i - 1].score >= x.score); }));

  /* =============== ÉCRAN D'ACCUEIL =============== */
  await go(p, '#/gestes');
  L.check('accueil : titre et zone de recherche', /Gestes du jardinier/.test(await text(p, '#view')) && !!(await p.$('#gz-q')));
  const nItems = await p.evaluate(() => document.querySelectorAll('#gz-list .gz-item').length);
  L.check('accueil : tous les gestes listés (' + nItems + ')', nItems === D.n);
  L.check('accueil : une carte « Ce mois-ci »', /Ce mois-ci/.test(await text(p, '#view')));
  await p.type('#gz-q', 'greffe'); await L.sleep(200);
  L.check('accueil : saisie dans la recherche filtre la liste', (await p.evaluate(() => document.querySelectorAll('#gz-list .gz-item').length)) === 1 && /Greffer/.test(await text(p, '#gz-list')));
  L.check('accueil : le champ garde le focus pendant la frappe', await p.evaluate(() => document.activeElement && document.activeElement.id === 'gz-q'));
  await p.$eval('#gz-q', (e) => { e.value = ''; }); await p.type('#gz-q', 'zzxqwv'); await L.sleep(200);
  L.check('accueil : aucun résultat -> message clair et bouton « Tout afficher »', /Aucun geste ne correspond/.test(await text(p, '#gz-list')) && !!(await p.$('#gz-list [data-act="gzclear"]')));
  await tap(p, '#gz-list [data-act="gzclear"]');
  L.check('accueil : « Tout afficher » remet toute la liste', (await p.evaluate(() => document.querySelectorAll('#gz-list .gz-item').length)) === D.n && (await p.$eval('#gz-q', (e) => e.value)) === '');
  await tap(p, '.gz-chip[data-k="cat:rempoter"]');
  const nRem = await p.evaluate(() => document.querySelectorAll('#gz-list .gz-item').length);
  L.check('accueil : catégorie « Rempoter » (' + nRem + ' gestes)', nRem === D.cats.rempoter && await p.evaluate(() => document.querySelector('.gz-chip[data-k="cat:rempoter"]').getAttribute('aria-pressed') === 'true'));
  await tap(p, '.gz-chip[data-k="mode:finis"]');
  L.check('accueil : « Terminés » vide -> message', /Aucun geste terminé/.test(await text(p, '#gz-list')));
  await tap(p, '.gz-chip[data-k="all"]');
  L.check('accueil : boutons >= 44 px', await p.evaluate(() => Array.prototype.every.call(document.querySelectorAll('#view .btn, #view .chip'), (b) => b.getBoundingClientRect().height >= 43.5)));

  /* =============== PAGE D'UN GESTE + PAS À PAS =============== */
  const ID = 'rempoter-interieur';
  await go(p, '#/geste/' + ID);
  await spy(p);
  const nSteps = await p.evaluate((id) => T.gestes.get(id).etapes.length, ID);
  const pg = await text(p, '#view');
  L.check('geste : page complète (but, difficulté, durée, matériel, étapes, erreurs, après)', ['Difficulté', 'Durée', 'Quand le faire', 'Ce qu\'il vous faut', 'Les étapes', 'Erreurs fréquentes', 'Et après ?', 'Commencer pas à pas'].every((k) => pg.toLowerCase().indexOf(k.toLowerCase()) >= 0));
  L.check('geste : schémas SVG en ligne dans la page', (await p.evaluate(() => document.querySelectorAll('#view svg.gz-svg').length)) >= 2);
  L.check('geste : liens vers les fiches plantes valides', await p.evaluate(() => { const a = document.querySelectorAll('#view a[href^="#/plante/"]'); return a.length >= 1 && Array.prototype.every.call(a, (x) => T.plante(decodeURIComponent(x.getAttribute('href').slice(9)))); }));
  await tap(p, '.gz-mats .gz-chk');
  L.check('matériel : case cochée au toucher, mémorisée', await p.evaluate((id) => { const g = T.store.s.gestes; return g && g.prog[id] && g.prog[id].mat.indexOf(0) >= 0; }, ID) && await p.evaluate(() => document.querySelector('.gz-mats .gz-chk').getAttribute('aria-checked') === 'true'));
  await tap(p, '.gz-mats .gz-chk');
  L.check('matériel : se décoche et ne laisse rien en mémoire', await p.evaluate((id) => !T.store.s.gestes.prog[id], ID));

  await tap(p, '[data-act="gzstart"]');
  L.check('pas à pas : plein écran ouvert, étape 1', !!(await p.$('#gz-ov')) && (await text(p, '#gz-count')) === 'Étape 1 sur ' + nSteps);
  L.check('pas à pas : couvre tout l\'écran', await p.evaluate(() => { const r = document.getElementById('gz-ov').getBoundingClientRect(); return r.left === 0 && r.top === 0 && Math.round(r.width) === innerWidth && Math.round(r.height) === innerHeight; }));
  L.check('pas à pas : « Précédent » désactivé à la première étape', await p.evaluate(() => document.getElementById('gz-prev').disabled));
  L.check('pas à pas : barre de progression', await p.evaluate((n) => { const b = document.getElementById('gz-bar'); return b.getAttribute('role') === 'progressbar' && b.getAttribute('aria-valuenow') === '1' && Math.abs(b.querySelector('i').getBoundingClientRect().width / b.getBoundingClientRect().width - 1 / n) < 0.03; }, nSteps));
  await tap(p, '#gz-next'); await tap(p, '#gz-next');
  L.check('pas à pas : « Suivant » x2 -> étape 3', (await text(p, '#gz-count')) === 'Étape 3 sur ' + nSteps);
  await tap(p, '#gz-prev');
  L.check('pas à pas : « Précédent » -> étape 2', (await text(p, '#gz-count')) === 'Étape 2 sur ' + nSteps);
  await tap(p, '#gz-next');
  await tap(p, '#gz-body .gz-chk');
  L.check('pas à pas : « J\'ai fini cette étape » cochée', await p.evaluate((id) => T.store.s.gestes.prog[id].done.indexOf(2) >= 0, ID) && await p.evaluate(() => document.querySelector('#gz-body .gz-chk').getAttribute('aria-checked') === 'true'));
  await tap(p, '#gz-read');
  const sp = await p.evaluate(() => window.__sp.slice());
  L.check('voix : « Lire à voix haute » appelle T.voice.speak 1 fois', sp.length === 1, JSON.stringify(sp));
  L.check('voix : le texte lu contient le numéro, le titre et la consigne de l\'étape', await p.evaluate((a) => { const g = T.gestes.get(a[0]), e = g.etapes[2]; return a[1][0].indexOf('Étape 3 sur ' + g.etapes.length) === 0 && a[1][0].indexOf(e.t) > 0 && a[1][0].indexOf(e.c) > 0; }, [ID, sp]));
  await tap(p, '#gz-read'); await tap(p, '#gz-next'); await tap(p, '#gz-read');
  L.check('voix : 3 lectures = 3 appels', (await p.evaluate(() => window.__sp.length)) === 3);
  L.check('progression mémorisée à l\'étape 4', await p.evaluate((id) => T.store.s.gestes.prog[id].step === 3, ID));
  /* Retour Android : ferme le plein écran, ne quitte pas la page */
  await p.evaluate(() => T.onBack()); await L.sleep(200);
  L.check('retour Android : ferme le pas à pas, reste sur la page du geste', !(await p.$('#gz-ov')) && /rempoter-interieur/.test(await p.evaluate(() => location.hash)));
  L.check('page : bouton « Reprendre à l\'étape 4 » et « Recommencer à zéro »', /Reprendre à l'étape 4/.test(await text(p, '.gz-start')) && !!(await p.$('[data-act="gzreset"]')));
  /* Rechargement complet */
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction('window.__TIFA_STARTED === true'); await L.sleep(300);
  await go(p, '#/geste/' + ID); await spy(p);
  L.check('reprise après rechargement : « Reprendre à l\'étape 4 »', /Reprendre à l'étape 4/.test(await text(p, '.gz-start')));
  await tap(p, '[data-act="gzstart"]');
  L.check('reprise : le pas à pas rouvre à l\'étape 4', (await text(p, '#gz-count')) === 'Étape 4 sur ' + nSteps);
  await tap(p, '#gz-prev');
  L.check('reprise : l\'étape 3 est toujours cochée', await p.evaluate(() => document.querySelector('#gz-body .gz-chk').getAttribute('aria-checked') === 'true'));
  L.check('accueil du module : « Reprendre où vous en étiez » après rechargement', await (async () => { await p.evaluate(() => T.onBack()); await go(p, '#/gestes'); return /Reprendre où vous en étiez/.test(await text(p, '#view')); })());
  await go(p, '#/geste/' + ID + '?pas=1');
  L.check('lien direct ?pas=1 ouvre le pas à pas', !!(await p.$('#gz-ov')));
  /* aller jusqu'à la fin */
  for (let i = 0; i < nSteps; i++) { if (await p.evaluate(() => document.getElementById('gz-next').textContent.trim() === 'Terminer')) break; await tap(p, '#gz-next'); }
  L.check('dernière étape : le bouton devient « Terminer »', (await text(p, '#gz-next')) === 'Terminer');
  await tap(p, '#gz-next');
  L.check('fin : message « Bravo », conseils « Et après ? »', /Bravo/.test(await text(p, '#gz-body')) && /Et après/.test(await text(p, '#gz-body')));
  L.check('fin : geste marqué terminé, progression en cours effacée', await p.evaluate((id) => !!T.store.s.gestes.fini[id] && !T.store.s.gestes.prog[id], ID));
  L.check('fin : Feuille prévenue de façon défensive', (await p.evaluate(() => window.__fe.length)) === 1);
  await tap(p, '[data-act="gzquit"]');
  L.check('fin : « Fermer » ramène à la page, marquée « Terminé »', !(await p.$('#gz-ov')) && /Vous avez déjà terminé/.test(await text(p, '#view')));
  await go(p, '#/gestes'); await tap(p, '.gz-chip[data-k="mode:finis"]');
  L.check('accueil : « Terminés » liste le geste fini', (await p.evaluate(() => document.querySelectorAll('#gz-list .gz-item').length)) === 1);
  /* réinitialiser */
  await p.evaluate((id) => { T.store.s.gestes.prog[id] = { step: 2, done: [0, 1], mat: [0] }; T.store.save(); }, ID);
  await go(p, '#/geste/' + ID);
  await tap(p, '[data-act="gzreset"]');
  await p.evaluate(() => { const b = Array.prototype.filter.call(document.querySelectorAll('.modal-foot .btn'), (x) => /recommencer/i.test(x.textContent)).pop(); b.click(); }); await L.sleep(300);
  L.check('réinitialisation : progression et « terminé » effacés', await p.evaluate((id) => !T.store.s.gestes.prog[id] && !T.store.s.gestes.fini[id], ID));

  /* =============== CAS LIMITES / ERREURS =============== */
  await go(p, '#/geste/nimportequoi');
  L.check('geste inconnu : message clair, pas d\'écran vide', /n'existe pas/.test(await text(p, '#view')) && !!(await p.$('#view a[href="#/gestes"]')));
  await p.evaluate(() => { T.act.gzclear && T.act.gzclear(); T.store.s.gestes = 'abîmé'; });
  await go(p, '#/gestes');
  L.check('données de progression abîmées : l\'écran s\'affiche', (await p.evaluate(() => document.querySelectorAll('#gz-list .gz-item').length)) > 20);
  await p.evaluate(() => { T.store.s.gestes = { prog: { 'rempoter-interieur': { step: 99, done: ['x', -4, 2, 2, 1000], mat: 'oups' } }, fini: [], rec: 'x' }; });
  await go(p, '#/geste/rempoter-interieur');
  L.check('progression incohérente : corrigée sans erreur', /Reprendre à l'étape 9/.test(await text(p, '.gz-start')), await text(p, '.gz-start'));
  /* voix et Feuille absentes ou en panne */
  await p.evaluate(() => { T.store.s.gestes = null; T.feuille = undefined; T.voice.speak = function () { throw new Error('panne simulée'); }; });
  await go(p, '#/geste/' + ID);
  await tap(p, '[data-act="gzstart"]'); await tap(p, '#gz-read');
  L.check('voix en panne : message au lieu d\'un plantage', /pas disponible/.test(await p.evaluate(() => document.getElementById('toast').textContent)) && !!(await p.$('#gz-ov')));
  await p.evaluate(() => { for (let i = 0; i < 20; i++) if (document.getElementById('gz-next') && document.getElementById('gz-next').textContent.trim() !== 'Terminer') T.act.gznext(); T.act.gznext(); });
  L.check('Feuille absente : la fin du geste fonctionne', /Bravo/.test(await text(p, '#gz-body')));
  await tap(p, '[data-act="gzquit"]');
  L.check('aucune minuterie système utilisée par le module', !/setInterval/.test(require('fs').readFileSync(require('path').join(L.WWW, 'js', 'gestes.js'), 'utf8')));
  L.check('gestes : 0 erreur JavaScript (données, recherche, pas à pas)', clean(p).length === 0, clean(p).join(' | '));
  await p.browserContext().close();

  /* =============== DÉBORDEMENTS : 4 profils dont 280 px à 200 % =============== */
  const PROFILS = [[PIX, 1], ['Samsung Galaxy S24 (Android 15)', 2], ['Samsung Z Fold (plié, Android 14)', 2], ['Samsung Tab A9 tablette (Android 14)', 1]];
  for (const [dev, sc] of PROFILS) {
    const q = await mk(dev, sc), tag = dev.split(' (')[0] + ' x' + sc;
    await spy(q);
    const bad = [];
    const ovfl = async (label) => { const o = await L.overflow(q); if (o.length) bad.push(label + ' : ' + o.join(' ; ')); };
    await go(q, '#/gestes'); await ovfl('accueil'); await q.type('#gz-q', 'bouture'); await L.sleep(150); await ovfl('accueil recherche'); await q.type('#gz-q', 'zzxqwv'); await L.sleep(150); await ovfl('accueil vide');
    const ids = await q.evaluate(() => T.gestes.all().map((g) => g.id));
    /* page de chaque geste (à tous les profils) */
    for (const id of ids) { await go(q, '#/geste/' + id); await ovfl('page ' + id); }
    /* pas à pas : toutes les étapes de tous les gestes, avec contrôle des boutons */
    for (const id of ids) {
      await go(q, '#/geste/' + id + '?pas=1');
      const res = await q.evaluate(() => {
        const out = [], n = T.gestes.ouvert() ? T.gestes.get(T.gestes.ouvert().id).etapes.length : 0, W = innerWidth, H = innerHeight;
        function chk(tag) {
          const ov = document.getElementById('gz-ov'); if (!ov) { out.push(tag + ' plein écran absent'); return; }
          if (document.documentElement.scrollWidth > W + 1) out.push(tag + ' page plus large');
          ov.querySelectorAll('*').forEach((el) => { const r = el.getBoundingClientRect(); if (!r.width) return; if (r.right > W + 1 || r.left < -1) out.push(tag + ' ' + el.tagName + '.' + el.className + ' hors écran ' + Math.round(r.left) + '>' + Math.round(r.right)); });
          const foot = ov.querySelector('.gz-ov-foot'), fr = foot.getBoundingClientRect();
          if (fr.bottom > H + 1) out.push(tag + ' pied hors écran');
          if (foot.scrollHeight > foot.clientHeight + 1) out.push(tag + ' boutons coupés dans le pied (' + foot.scrollHeight + '>' + foot.clientHeight + ')');
          foot.querySelectorAll('.btn').forEach((b) => { const r = b.getBoundingClientRect(); if (r.bottom > H + 1 || r.top < 0 || r.height < 43) out.push(tag + ' bouton ' + b.textContent.trim() + ' hors zone/trop petit'); });
          const body = ov.querySelector('.gz-ov-body'), br = body.getBoundingClientRect(); if (br.height < 60) out.push(tag + ' zone de lecture trop petite (' + Math.round(br.height) + ')');
          const hd = ov.querySelector('.gz-ov-head').getBoundingClientRect(); if (hd.top < 0 || hd.bottom > H * 0.45) out.push(tag + ' en-tête trop haut');
        }
        for (let i = 0; i < n; i++) { chk('étape ' + (i + 1)); T.act.gznext(); }
        chk('fin'); T.act.gzquit(); return out.slice(0, 4);
      });
      if (res.length) bad.push('pas à pas ' + id + ' : ' + res.join(' ; '));
    }
    L.check('débordement ' + tag + ' : ' + ids.length + ' pages et toutes les étapes en plein écran', bad.length === 0, bad.slice(0, 3).join(' || '));
    L.check('erreurs JS ' + tag, clean(q).length === 0, clean(q).join(' | '));
    await q.browserContext().close();
  }
};
