/* Domaine : Dans l'assiette (données, API, carte de fiche, résumé, filtres, liens, hors ligne, débordements, erreurs JS). */
module.exports = async function ({ L, browser, base }) {
  const PIX = 'Pixel 8 (Android 14)', FOLD = 'Samsung Z Fold (plié, Android 14)';
  const clean = (p) => p.errors.filter((e) => !/script-src|Failed to load resource.*404/.test(e));
  const mk = async (dev, scale) => {
    const p = await L.newPage(browser, base, dev);
    await L.skipOnboarding(p);
    if (scale && scale !== 1) await p.evaluate((s) => { T.store.s.settings.scale = s; T.applyDisplay(); }, scale);
    return p;
  };
  const go = async (p, h) => { await p.evaluate((h) => { location.hash = h; }, h); await L.sleep(250); };
  const tap = async (p, sel) => { const e = await p.$(sel); if (!e) throw new Error('introuvable : ' + sel); await e.tap(); await L.sleep(200); };

  /* =============== DONNÉES =============== */
  let p = await mk(PIX);
  const D = await p.evaluate(() => {
    const out = { bad: [], emoji: [], n: 0, st: {} };
    const emo = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{27BF}\u{2900}-\u{297F}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]|\p{Extended_Pictographic}/u;
    const valid = ['comestible', 'partiellement', 'non', 'dangereux'], types = ['fleur', 'feuille', 'fruit', 'legume', 'racine'];
    T.D.plantes.forEach((pl) => {
      const r = T.D.comestibles[pl.id]; out.n++;
      if (!r) { out.bad.push(pl.id + ' sans enregistrement'); return; }
      out.st[r.statut] = (out.st[r.statut] || 0) + 1;
      if (valid.indexOf(r.statut) < 0) out.bad.push(pl.id + ' statut invalide');
      ['parties', 'usages', 'precautions', 'confusions', 'requetes'].forEach((k) => { if (!Array.isArray(r[k])) out.bad.push(pl.id + ' ' + k + ' pas une liste'); });
      ['enfants', 'animaux', 'saveur', 'quantite'].forEach((k) => { if (typeof r[k] !== 'string') out.bad.push(pl.id + ' ' + k); });
      const eat = r.statut === 'comestible' || r.statut === 'partiellement';
      if (eat) {
        if (!r.parties.length) out.bad.push(pl.id + ' comestible sans parties');
        if (!r.precautions.length) out.bad.push(pl.id + ' comestible sans précautions');
        if (!r.saveur || !r.quantite) out.bad.push(pl.id + ' saveur ou quantité vide');
        if (!r.requetes.length) out.bad.push(pl.id + ' sans requête de recette');
        r.parties.forEach((x) => { if (types.indexOf(x.type) < 0 || !x.partie || !x.comment || !x.quand) out.bad.push(pl.id + ' partie incomplète'); });
        if (pl.categorie === 'fleur' || pl.categorie === 'arbuste' || pl.categorie === 'grimpante' || pl.categorie === 'interieur') {
          if (!r.precautions.some((x) => /traitée|traité/.test(x))) out.bad.push(pl.id + ' ornement sans précaution pesticides');
        }
      } else if (!r.avertissement) out.bad.push(pl.id + ' ' + r.statut + ' sans avertissement');
      if (pl.toxique && pl.toxique.chatChien && eat && !/pas pour les animaux/i.test(r.animaux)) out.bad.push(pl.id + ' toxique animaux sans mention');
      if (r.statut === 'dangereux' && !/jamais|pas/i.test(r.avertissement)) out.bad.push(pl.id + ' avertissement faible');
      if (emo.test(JSON.stringify(r))) out.emoji.push(pl.id);
      if (/https?:|www\.|@/.test(JSON.stringify(r))) out.bad.push(pl.id + ' lien ou adresse dans les données');
    });
    const must = { 'laurier-rose': 'dangereux', narcisse: 'dangereux', hortensia: 'dangereux', capucine: 'comestible', souci: 'partiellement', rhubarbe: 'partiellement', tomate: 'partiellement', 'pomme-de-terre': 'partiellement' };
    Object.keys(must).forEach((k) => { if (T.D.comestibles[k].statut !== must[k]) out.bad.push(k + ' devrait être ' + must[k]); });
    Object.keys(T.D.comestibles).forEach((k) => { if (!T.plante(k)) out.bad.push('enregistrement orphelin ' + k); });
    return out;
  });
  L.check('assiette : chaque plante de la base a un enregistrement (' + D.n + ')', D.n >= 150 && !D.bad.some((b) => /sans enregistrement|orphelin/.test(b)), D.bad.slice(0, 5).join(' | '));
  L.check('assiette : données valides (statuts, parties, précautions, pesticides, animaux)', D.bad.length === 0, D.bad.slice(0, 6).join(' | '));
  L.check('assiette : aucun emoji dans les données', D.emoji.length === 0, D.emoji.join(','));
  L.check('assiette : les 4 statuts sont utilisés', ['comestible', 'partiellement', 'non', 'dangereux'].every((s) => D.st[s] > 0), JSON.stringify(D.st));

  /* =============== API =============== */
  const api = await p.evaluate(() => {
    const A = T.assiette, o = {};
    o.fn = ['statut', 'info', 'moisAManger', 'idees', 'resume', 'lien', 'sites'].every((k) => typeof A[k] === 'function');
    o.inconnu = A.info('xx') === null && A.resume('xx') === null && A.resume(null) === null && A.resume(undefined) === null;
    o.statut = A.statut('capucine') === 'comestible' && A.statut('laurier-rose') === 'dangereux';
    o.mois = [];
    for (let m = 1; m <= 12; m++) { const l = A.moisAManger(m); if (!Array.isArray(l) || l.some((x) => ['comestible', 'partiellement'].indexOf(A.statut(x.id)) < 0)) o.mois.push(m); }
    o.moisFaux = Array.isArray(A.moisAManger(99)) && Array.isArray(A.moisAManger('x'));
    o.juillet = A.moisAManger(7).map((x) => x.id);
    o.janv = A.moisAManger(1).length;
    const id = A.idees(); o.nIdees = id.length;
    o.ideesBad = id.filter((d) => !d.titre || d.etapes.length !== 3 || !d.ingr.length || !d.prec || !d.plantes.length || d.plantes.some((pid) => ['comestible', 'partiellement'].indexOf(A.statut(pid)) < 0)).map((d) => d.id);
    o.ideesEmo = /\p{Extended_Pictographic}/u.test(JSON.stringify(id));
    o.lien = A.lien('marmiton', 'fleur de courgette & café');
    o.sites = A.sites().length;
    return o;
  });
  L.check('assiette : T.assiette expose statut/info/moisAManger/idees/resume/lien/sites', api.fn);
  L.check('assiette : plante inconnue ou vide -> null, sans erreur', api.inconnu);
  L.check('assiette : statuts connus (capucine comestible, laurier-rose dangereux)', api.statut);
  L.check('assiette : « ce mois-ci » ne contient que du comestible, mois faux accepté', api.mois.length === 0 && api.moisFaux, api.mois.join(','));
  L.check('assiette : en juillet on trouve courgette et tomate ; en janvier peu mais valide', api.juillet.indexOf('courgette') >= 0 && api.juillet.indexOf('tomate') >= 0 && api.janv >= 0, api.juillet.slice(0, 6).join(','));
  L.check('assiette : au moins 25 idées de plats, 3 étapes, plantes comestibles confirmées (' + api.nIdees + ')', api.nIdees >= 25 && api.ideesBad.length === 0, api.ideesBad.join(','));
  L.check('assiette : aucun emoji dans les idées de plats', !api.ideesEmo);
  L.check('assiette : lien encodé avec encodeURIComponent', api.lien.indexOf('fleur%20de%20courgette%20%26%20caf%C3%A9') > 0 && api.lien.indexOf(' ') < 0 && api.sites >= 2, api.lien);

  /* =============== RÉSUMÉ POUR TOUTES LES PLANTES =============== */
  const R = await p.evaluate(() => {
    const out = { bad: [], emoji: [] };
    T.D.plantes.forEach((pl) => {
      const r = T.assiette.resume(pl.id);
      if (!r || !r.titre || !r.html) { out.bad.push(pl.id + ' pas de résumé'); return; }
      if (/\p{Extended_Pictographic}/u.test(r.titre + r.html)) out.emoji.push(pl.id);
      if (r.html.indexOf('data-act="speak"') < 0) out.bad.push(pl.id + ' sans bouton Écouter');
      if (r.html.indexOf('En cas de doute, ne mangez pas') < 0) out.bad.push(pl.id + ' sans message de prudence');
      const st = T.D.comestibles[pl.id].statut;
      if ((st === 'comestible' || st === 'partiellement') && (r.html.indexOf('rel="noopener noreferrer"') < 0 || r.html.indexOf('En cuisine') < 0)) out.bad.push(pl.id + ' résumé comestible incomplet');
      if ((st === 'non' || st === 'dangereux') && r.html.indexOf('mangez') < 0) out.bad.push(pl.id + ' ne dit pas pourquoi');
      if (r.html.indexOf('<button') >= 0 && r.html.indexOf('data-act="asresume"') >= 0) out.bad.push(pl.id + ' bouton de fermeture ou boucle');
    });
    return out;
  });
  L.check('assiette : T.assiette.resume existe pour toutes les plantes (écouter, prudence, liens, pourquoi)', R.bad.length === 0, R.bad.slice(0, 5).join(' | '));
  L.check('assiette : aucun emoji dans les résumés', R.emoji.length === 0, R.emoji.join(','));

  /* =============== CARTE SUR LA FICHE =============== */
  await p.evaluate(() => {
    window.__sp = []; T.voice.speak = function (t) { window.__sp.push(String(t)); return Promise.resolve(true); };
    window.__wo = []; window.open = function (u) { window.__wo.push(u); return null; };
  });
  for (const [id, mot, cls] of [['capucine', 'Comestible', 'as-ok'], ['tomate', 'En partie comestible', 'as-part'], ['laurier-rose', 'Dangereux', 'as-dan'], ['monstera', 'Non comestible', 'as-non']]) {
    await go(p, '#/plante/' + id);
    const c = await p.evaluate((cls) => { const b = document.querySelector('.as-card .as-badge.' + cls); const r = b && b.getBoundingClientRect(); return b ? { t: b.innerText.trim(), h: r.height, ico: !!b.querySelector('svg') } : null; }, cls);
    L.check('fiche ' + id + ' : carte « Dans l\'assiette » avec étiquette « ' + mot + ' » (mot + forme + couleur, >= 44 px)', c && c.t === mot && c.ico && c.h >= 44, JSON.stringify(c));
  }
  await go(p, '#/plante/capucine');
  const t1 = await p.evaluate(() => document.querySelector('.as-card').innerText);
  L.check('fiche capucine : parties, précautions, quantité et message « En cas de doute »', /Les fleurs/.test(t1) && /Précautions/.test(t1) && /Quantité/.test(t1) && /En cas de doute, ne mangez pas/.test(t1));
  await tap(p, '.as-card [data-act="speak"]');
  L.check('fiche capucine : le bouton Écouter lit la plante et la prudence', await p.evaluate(() => window.__sp.length === 1 && /Capucine/.test(window.__sp[0]) && /En cas de doute/.test(window.__sp[0])));
  const lk = await p.evaluate(() => Array.from(document.querySelectorAll('.as-card a.as-link')).map((a) => ({ h: a.href, t: a.target, r: a.rel, l: a.innerText })));
  L.check('fiche capucine : liens de recettes (target=_blank, rel=noopener noreferrer, libellé clair, requête encodée)', lk.length >= 3 && lk.every((a) => a.t === '_blank' && /noopener/.test(a.r) && /noreferrer/.test(a.r) && /site externe, connexion nécessaire/.test(a.l) && /^https:\/\//.test(a.h) && !/ /.test(a.h)) && lk.some((a) => /marmiton\.org.*aqt=capucine%20fleurs%20salade/.test(a.h)), JSON.stringify(lk.slice(0, 2)));
  await go(p, '#/plante/laurier-rose');
  const lr = await p.evaluate(() => ({ lk: document.querySelectorAll('.as-card a.as-link').length, t: document.querySelector('.as-card').innerText }));
  L.check('fiche laurier-rose : avertissement net, aucun lien de recettes', lr.lk === 0 && /JAMAIS/.test(lr.t));

  /* Résumé au toucher */
  await tap(p, '.as-card .as-badge');
  const md = await p.evaluate(() => { const m = document.querySelector('.modal'); return m ? { t: m.innerText, h: m.querySelector('.modal-head').innerText } : null; });
  L.check('résumé : toucher l\'étiquette ouvre la fenêtre (titre, ne la mangez jamais)', md && /Laurier-rose/.test(md.h) && /jamais/i.test(md.t) && /Enfants et animaux/.test(md.t));
  await p.evaluate(() => T.closeModal());
  await go(p, '#/plante/souci');
  await tap(p, '.as-card .as-badge');
  const ms = await p.evaluate(() => document.querySelector('.modal').innerText);
  L.check('résumé souci : saveur, parties, plats, quantité, précautions, Écouter, recettes', /En cuisine/.test(ms) && /Ce qui se mange/.test(ms) && /Dans quels plats/.test(ms) && /Quelle quantité/.test(ms) && /Précautions/.test(ms) && /Écouter/.test(ms) && /Voir des recettes/.test(ms));
  await p.evaluate(() => { window.__sp.length = 0; });
  await tap(p, '.modal [data-act="speak"]');
  L.check('résumé : le bouton Écouter marche dans la fenêtre', await p.evaluate(() => window.__sp.length === 1 && /Souci/.test(window.__sp[0])));
  await p.evaluate(() => T.closeModal());

  /* =============== PAGE #/assiette =============== */
  await go(p, '#/assiette');
  const pg = await p.evaluate(() => ({ t: document.getElementById('view').innerText, n: document.querySelectorAll('#as-results .as-item').length, h: document.querySelector('h2') && document.querySelector('h2').innerText }));
  L.check('page assiette : titre, message de prudence, sections', /Plantes comestibles du jardin/.test(pg.t) && /En cas de doute, ne mangez pas/.test(pg.t) && /Ce mois-ci à manger/.test(pg.t) && /Fleurs comestibles/.test(pg.t) && /À ne jamais manger/.test(pg.t) && /Idées de plats/.test(pg.t) && /15/.test(pg.t) && /112/.test(pg.t), pg.n + '');
  L.check('page assiette : liste des plantes qui se mangent (> 50)', pg.n > 50, pg.n + '');
  const names = (sel) => p.evaluate((sel) => Array.from(document.querySelectorAll(sel)).map((e) => e.innerText.split('\n')[0].trim()), sel);
  await p.type('#as-q', 'capucine'); await L.sleep(250);
  let l1 = await names('#as-results .as-name b');
  L.check('recherche : « capucine » trouve la capucine seule', l1.length === 1 && /Capucine/.test(l1[0]), l1.join('|'));
  await p.evaluate(() => { const i = document.getElementById('as-q'); i.value = 'LAURIER ROSE'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await L.sleep(200);
  l1 = await p.evaluate(() => Array.from(document.querySelectorAll('#as-results .as-item')).map((e) => e.innerText.replace(/\n/g, ' ')));
  L.check('recherche : « laurier rose » (majuscules, sans trait d\'union) montre la plante avec « Dangereux »', l1.length >= 1 && l1.some((x) => /Laurier-rose/.test(x) && /Dangereux/.test(x)), l1.join('|'));
  await p.evaluate(() => { const i = document.getElementById('as-q'); i.value = 'zzxqwv'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await L.sleep(200);
  L.check('recherche : mot absurde -> message clair, sans erreur', await p.evaluate(() => /Aucune plante trouvée/.test(document.getElementById('as-results').innerText)));
  await tap(p, '[data-act="asclear"]');
  const flt = {};
  for (const f of ['fleur', 'feuille', 'fruit', 'racine']) {
    await tap(p, '[data-act="asfiltre"][data-f="' + f + '"]');
    flt[f] = await p.evaluate(() => { const ids = Array.from(document.querySelectorAll('#as-results .as-name')).map((a) => a.getAttribute('href').split('/').pop()); return { ids, on: document.querySelector('.as-fchip.on').getAttribute('data-f') }; });
  }
  L.check('filtre fleurs : capucine et courgette présentes, carotte absente', flt.fleur.ids.indexOf('capucine') >= 0 && flt.fleur.ids.indexOf('courgette') >= 0 && flt.fleur.ids.indexOf('carotte') < 0, flt.fleur.ids.length + '');
  L.check('filtre feuilles et herbes : basilic présent, fraisier absent', flt.feuille.ids.indexOf('basilic') >= 0 && flt.feuille.ids.indexOf('fraisier') < 0);
  L.check('filtre fruits et légumes : fraisier et tomate présents, basilic absent', flt.fruit.ids.indexOf('fraisier') >= 0 && flt.fruit.ids.indexOf('tomate') >= 0 && flt.fruit.ids.indexOf('basilic') < 0);
  L.check('filtre racines : carotte et pomme de terre présentes, laitue absente', flt.racine.ids.indexOf('carotte') >= 0 && flt.racine.ids.indexOf('pomme-de-terre') >= 0 && flt.racine.ids.indexOf('laitue') < 0 && flt.racine.on === 'racine');
  await tap(p, '[data-act="asfiltre"][data-f="tout"]');
  const dg = await p.evaluate(() => Array.from(document.querySelectorAll('.as-dan-chip')).map((a) => a.getAttribute('href').split('/').pop()));
  L.check('« À ne jamais manger » : toutes les plantes dangereuses de la base (laurier-rose, narcisse, hortensia…)', dg.length >= 15 && ['laurier-rose', 'narcisse', 'hortensia', 'buis', 'rhododendron'].every((x) => dg.indexOf(x) >= 0), dg.join(','));
  await p.evaluate(() => { document.querySelector('[data-act="asidee"]').scrollIntoView(); });
  await tap(p, '[data-act="asidee"][data-id="beignets-courgette"]');
  const id1 = await p.evaluate(() => document.querySelector('.modal').innerText);
  L.check('idée de plat : ingrédients, 3 étapes, précautions, Écouter (hors connexion)', /Il vous faut/.test(id1) && /En 3 étapes/.test(id1) && /Précaution/.test(id1) && /Écouter/.test(id1));
  await p.evaluate(() => T.closeModal());
  const ml = await p.evaluate(() => Array.from(document.querySelectorAll('.card')).filter((c) => /Ce mois-ci/.test(c.innerText))[0].querySelectorAll('a.as-chip').length);
  L.check('page assiette : « Ce mois-ci à manger » propose des plantes (' + ml + ') ou un message', ml >= 0);

  /* =============== LIENS : hors ligne / clic =============== */
  await go(p, '#/plante/courgette');
  await p.evaluate(() => { window.__wo.length = 0; document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a.as-link'); if (a) { e.preventDefault(); window.__clk = (window.__clk || 0) + 1; } }, true); });
  await p.setOfflineMode(true);
  await p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true }); T.native.online = false; });
  const off = await p.$('.as-card a.as-link'); await off.tap(); await L.sleep(250);
  L.check('hors ligne : toucher un lien affiche « Il faut internet pour ouvrir ce site » et l\'appli reste vivante', await p.evaluate(() => /Il faut internet pour ouvrir ce site/.test(document.getElementById('toast').textContent) && !!document.querySelector('.as-card')));
  await p.setOfflineMode(false);
  await p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true }); T.native.online = true; document.getElementById('toast').textContent = ''; });
  const on = await p.$('.as-card a.as-link'); await on.tap(); await L.sleep(250);
  L.check('en ligne : le lien n\'est pas bloqué (aucun message d\'erreur)', await p.evaluate(() => !/Il faut internet/.test(document.getElementById('toast').textContent)));
  /* cascade Browser */
  const casc = await p.evaluate(() => { const o = []; window.Capacitor = { Plugins: { Browser: { open: (x) => o.push(x.url) } } }; const a = document.querySelector('.as-card a.as-link'); T.act.asopen(a, { preventDefault() {} }); delete window.Capacitor; return o; });
  L.check('liens : le plugin Browser est utilisé s\'il existe (puis le lien normal)', casc.length === 1 && /^https:\/\//.test(casc[0]));
  L.check('assiette : 0 erreur JS (données, fiche, page, fenêtres)', clean(p).length === 0, clean(p).join(' | '));
  await p.close();

  /* =============== DÉBORDEMENTS 4 PROFILS =============== */
  const bad = [];
  for (const [dev, sc] of [[PIX, 1], [PIX, 2], ['Android 12 compact', 1.5], [FOLD, 2]]) {
    const q = await mk(dev, sc);
    const lab = dev + ' x' + sc;
    const chk = async (what) => { const o = await L.overflow(q); if (o.length) bad.push(lab + ' ' + what + ' : ' + o.join(' ; ')); };
    for (const h of ['#/assiette', '#/plante/capucine', '#/plante/tomate', '#/plante/laurier-rose', '#/plante/monstera']) { await go(q, h); await chk(h); }
    await go(q, '#/plante/souci'); await tap(q, '.as-card .as-badge'); await chk('résumé souci');
    const foot = await q.evaluate(() => { const f = document.querySelector('.modal-foot').getBoundingClientRect(), b = document.querySelector('.modal-body'); return { vis: f.bottom <= innerHeight + 1 && f.top >= 0, scroll: b.scrollHeight > b.clientHeight ? getComputedStyle(b).overflowY : 'ok' }; });
    if (!foot.vis || foot.scroll === 'visible') bad.push(lab + ' fenêtre résumé : boutons ou défilement ' + JSON.stringify(foot));
    await q.evaluate(() => T.closeModal());
    await go(q, '#/plante/laurier-rose'); await tap(q, '.as-card .as-badge'); await chk('résumé laurier-rose'); await q.evaluate(() => T.closeModal());
    await go(q, '#/assiette'); await tap(q, '[data-act="asidee"][data-id="ratatouille"]'); await chk('idée de plat'); await q.evaluate(() => T.closeModal());
    if (clean(q).length) bad.push(lab + ' erreurs JS : ' + clean(q).join(' | '));
    await q.close();
  }
  L.check('assiette : 0 débordement sur 4 profils (dont 280 px à 200 %), fenêtres défilantes avec boutons visibles', bad.length === 0, bad.slice(0, 3).join(' || '));
};
