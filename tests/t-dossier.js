/* Dossier « Mon jardin » : migration d'anciennes données, cas vides, soins, notes/photos, planning, export/import, débordements (dont 280 px à 200 %). */
const fs = require('fs'), path = require('path');
module.exports = async function ({ L, browser, base }) {
  const FAKE = () => {
    window.__TIFA_FAKE_NATIVE = { Camera: {
      requestPermissions: () => Promise.resolve({ camera: 'granted' }),
      getPhoto: () => { const c = document.createElement('canvas'); c.width = 1600; c.height = 1000; const x = c.getContext('2d'); x.fillStyle = '#4a8040'; x.fillRect(0, 0, 1600, 1000); for (let i = 0; i < 400; i++) { x.fillStyle = 'rgb(' + (i * 7 % 255) + ',' + (i * 13 % 255) + ',' + (i * 29 % 255) + ')'; x.fillRect((i * 37) % 1500, (i * 53) % 900, 60, 40); } return Promise.resolve({ dataUrl: c.toDataURL('image/jpeg', 0.95) }); }
    } };
  };
  /* Ancien stockage : seulement id, plantId, nom, surnom, zone, added, arrose (aucun champ du dossier) */
  const OLD = () => {
    try {
      if (localStorage.getItem('tifa.v1')) return;
      localStorage.setItem('tifa.v1', JSON.stringify({ v: 1, installId: 'x', settings: { theme: 'zen', scale: 1 }, flags: { onboarded: true }, journal: [{ id: 'j1', date: '2026-05-01', plantId: 'tomate', texte: 'Ancienne note', photo: '', created: 1 }],
        pots: [{ id: 'old1', plantId: 'tomate', nom: 'Tomate', surnom: 'Ma tomate', zone: 'plein_soleil', added: 1700000000000, arrose: Date.now() - 3 * 86400000 }, { id: 'old2', plantId: '', nom: 'Mon cactus', surnom: '', zone: 'ombre', added: 1700000000001, arrose: null }, null, 'abc'] }));
    } catch (e) {}
  };
  const clean = (p) => p.errors.filter((e) => !/script-src/.test(e));
  const load = async (p) => {
    await p.addStyleTag({ url: base + '/css/m-dossier.css' });
    await p.addScriptTag({ url: base + '/js/dossier.js' });
    await p.evaluate(() => { T.store.s.flags.onboarded = true; T.store.save(); const m = T.modalStack[0]; if (m) m.close(); });
  };
  const go = async (p, h) => { await p.evaluate((h) => { location.hash = h; }, h); await L.sleep(250); };
  const text = (p) => p.evaluate(() => document.getElementById('view').innerText);
  const st = (p) => p.evaluate(() => JSON.parse(JSON.stringify({ pots: T.store.s.pots, journal: T.store.s.journal, tasks: T.store.s.tasks, flags: T.store.s.flags })));
  const click = async (p, sel) => { await p.click(sel); await L.sleep(250); };
  const modalBtn = async (p, label) => { await p.evaluate((label) => { const b = Array.prototype.filter.call(document.querySelectorAll('.modal-foot .btn'), (x) => x.textContent.trim() === label).pop(); b.click(); }, label); await L.sleep(300); };

  /* ===== 1. code : aucune info personnelle, aucun emoji ===== */
  const src = fs.readFileSync(path.join(L.WWW, 'js', 'dossier.js'), 'utf8') + fs.readFileSync(path.join(L.WWW, 'css', 'm-dossier.css'), 'utf8');
  L.check('dossier : aucun emoji dans le code', !/\p{Extended_Pictographic}/u.test(src));
  L.check('dossier : aucune adresse e-mail ni numéro dans le code', !/[\w.+-]+@[\w-]+\.\w+/.test(src) && !/\b0[1-9](?:[ .]?\d{2}){4}\b/.test(src));

  /* ===== 2. page vide (téléphone neuf) ===== */
  let p = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: FAKE });
  await L.skipOnboarding(p); await load(p);
  await go(p, '#/dossier');
  let t = await text(p);
  L.check('vide : titre Mon jardin et état vide chaleureux', /Mon jardin/.test(t) && /Votre jardin vous attend/.test(t) && /Ajouter ma première plante/.test(t));
  L.check('vide : 4 grandes cartes', await p.evaluate(() => document.querySelectorAll('.ds-card').length === 4) && ['Mes plantes', 'Mes pots et endroits', 'Mon carnet', 'Mes soins'].every((x) => t.includes(x)));
  L.check('vide : résumé du jour affiché ou état vide, max 3 lignes', await p.evaluate(() => document.querySelectorAll('.ds-today .ds-line').length <= 3));
  for (const h of ['#/dossier/plantes', '#/dossier/endroits', '#/dossier/soins', '#/dossier/plante/inconnu']) { await go(p, h); L.check('vide : ' + h + ' s\'affiche', (await text(p)).length > 30); }
  await go(p, '#/dossier/plante/inconnu');
  L.check('vide : plante introuvable -> message clair', /n'est plus dans votre jardin/.test(await text(p)));
  L.check('vide : routes existantes toujours là (#/pots #/carnet #/planning #/jardin)', await p.evaluate(() => ['/pots', '/carnet', '/planning', '/jardin'].every((x) => T.routes.some((r) => r.re.test(x)))));

  /* ===== 3. ajout d'une plante, photo, fiche ===== */
  await go(p, '#/dossier/plantes'); await click(p, '[data-act="dsadd"]');
  await p.type('#ds-q', 'tomate'); await L.sleep(300);
  L.check('ajout : la recherche propose la tomate', await p.evaluate(() => !!document.querySelector('[data-act="dspick"][data-id="tomate"]')));
  await click(p, '[data-act="dspick"][data-id="tomate"]');
  await p.type('#ds-alias', 'Tomate du balcon'); await p.type('#ds-endroit', 'près de la fenêtre');
  await p.$eval('#ds-date', (e) => { e.value = '2026-04-20'; });
  await p.type('#ds-notes', 'Offerte par une voisine');
  await click(p, '[data-act="dsphoto"][data-src="camera"]'); await L.sleep(900);
  L.check('ajout : photo prise et réduite (< 90 000 caractères)', await p.evaluate(() => { const i = document.querySelector('#ds-photo img'); return !!i && i.src.length < 90001 && i.src.indexOf('data:image/jpeg') === 0; }));
  await modalBtn(p, 'Ajouter à mon jardin');
  let s = await st(p), pot = s.pots[0];
  L.check('ajout : plante enregistrée avec tous les champs', s.pots.length === 1 && pot.plantId === 'tomate' && pot.surnom === 'Tomate du balcon' && pot.endroit === 'près de la fenêtre' && pot.dateAchat === '2026-04-20' && pot.notes === 'Offerte par une voisine' && pot.photo.length > 500 && pot.zone === 'plein_soleil');
  L.check('ajout : on arrive sur la fiche de la plante', await p.evaluate(() => /^#\/dossier\/plante\//.test(location.hash)));
  t = await text(p);
  L.check('fiche : nom, surnom, dates, notes visibles', /Tomate du balcon/.test(t) && /20 avril 2026/.test(t) && /Offerte par une voisine/.test(t) && /près de la fenêtre/.test(t));
  L.check('fiche : en un coup d\'oeil + « En savoir plus » repliable', /En un coup d.oeil/.test(t) && await p.evaluate(() => { const d = document.querySelector('details.ds-more'); return !!d && !d.open && /En savoir plus/.test(d.querySelector('summary').textContent); }));
  L.check('fiche : liens fiche complète et engrais (engrais)', await p.evaluate(() => !!document.querySelector('a[href="#/plante/tomate"]') && !!document.querySelector('a[href^="#/engrais"], a[href="#/calculs"]')));
  L.check('fiche : insectes concernés = ceux de T.insectes.pourPlante', await p.evaluate(() => { const n = T.insectes && T.insectes.pourPlante ? Math.min(8, T.insectes.pourPlante('tomate').length) : 0; return document.querySelectorAll('#view > .card a[href^="#/insecte/"]').length === n; }));
  /* si une route /engrais existe, le lien doit la viser */
  await p.evaluate(() => { T.route(/^\/engrais-plante\/([^\/?]+)$/, 'plus', function () { return { title: 'x', html: 'x' }; }); T.render(); });
  L.check('fiche : lien vers la page engrais de la plante quand elle existe', await p.evaluate(() => !!document.querySelector('a[href="#/engrais-plante/tomate"]')));
  await p.evaluate(() => { T.routes = T.routes.filter((r) => !r.re.test('/engrais-plante/x')); T.render(); });
  await p.evaluate(() => { document.querySelector('details.ds-more summary').click(); }); await L.sleep(150);
  L.check('fiche : « En savoir plus » s\'ouvre et montre des conseils', await p.evaluate(() => { const d = document.querySelector('details.ds-more'); return d.open && d.innerText.length > 80; }));

  /* soins */
  const pid = pot.id;
  await click(p, '[data-act="dsarroser"]');
  s = await st(p); pot = s.pots[0];
  L.check('soins : « J\'ai arrosé » enregistre la date et l\'historique', Date.now() - pot.arrose < 5000 && pot.soins.some((x) => x.k === 'eau'));
  L.check('soins : l\'arrosage apparaît dans le planning (tâche d\'arrosage liée)', await p.evaluate((id) => T.planning.all().some((x) => x.kind === 'eau' && x.potId === id), pid));
  L.check('soins : historique visible sur la fiche', /Arrosage/.test(await text(p)));
  const jn = s.journal.length;
  await click(p, '[data-act="dsnourrir"]');
  s = await st(p); pot = s.pots[0];
  L.check('engrais : date enregistrée + note dans le carnet', Date.now() - pot.nourri < 5000 && s.journal.length === jn + 1 && /engrais/.test(s.journal[s.journal.length - 1].texte));
  L.check('engrais : proposition de rappel', await p.evaluate(() => /rappel/i.test(document.querySelector('.modal').innerText)));
  const tn = s.tasks.length;
  await modalBtn(p, 'Dans 1 mois'); s = await st(p);
  L.check('engrais : rappel ajouté au planning', s.tasks.length === tn + 1 && /Nourrir/.test(s.tasks[s.tasks.length - 1].titre));
  /* note + photo */
  await click(p, '[data-act="dsnote"]');
  await p.type('#ds-text', 'Première fleur jaune');
  await click(p, '[data-act="dsphoto"][data-src="gallery"]'); await L.sleep(900);
  await p.evaluate(() => { document.getElementById('ds-asmain').click(); });
  await modalBtn(p, 'Enregistrer'); s = await st(p);
  const nj = s.journal[s.journal.length - 1];
  L.check('note : enregistrée dans le carnet avec photo, liée à la plante', nj.texte === 'Première fleur jaune' && nj.plantId === 'tomate' && nj.photo.length > 500 && nj.photo.length < 90001);
  L.check('note : visible dans le carnet (#/carnet)', await (async () => { await go(p, '#/carnet'); return /Première fleur jaune/.test(await text(p)); })());
  await go(p, '#/dossier/plante/' + pid);
  await click(p, '[data-act="dsnote"]'); await modalBtn(p, 'Enregistrer');
  L.check('note : vide refusée avec message', await p.evaluate(() => /Écrivez une note/.test(document.getElementById('toast').textContent)) && await p.evaluate(() => !!document.querySelector('.modal')));
  await modalBtn(p, 'Annuler');
  /* arrosage depuis Mes pots -> historique du dossier */
  await go(p, '#/pots'); const before = (await st(p)).pots[0].soins.length;
  await click(p, '[data-act="water"]');
  L.check('compat : l\'arrosage fait dans Mes pots s\'ajoute à l\'historique', (await st(p)).pots[0].soins.length === before + 1);
  /* modifier / retirer */
  await go(p, '#/dossier/plante/' + pid); await click(p, '[data-act="dsedit"]');
  await p.$eval('#ds-alias', (e) => { e.value = 'Tomate cerise'; }); await modalBtn(p, 'Enregistrer');
  L.check('modifier : le surnom est changé', (await st(p)).pots[0].surnom === 'Tomate cerise');
  await go(p, '#/dossier');
  t = await text(p);
  L.check('accueil dossier : compteurs plantes/notes/soin', /1 plante/.test(t) && /note/.test(t) && /Dernier soin/.test(t));

  /* ===== 4. export / import ===== */
  await p.evaluate(() => { window.__BLOBS = []; const o = URL.createObjectURL; URL.createObjectURL = function (b) { window.__BLOBS.push(b); return o.call(URL, b); }; HTMLAnchorElement.prototype.click = function () { window.__DL = this.download; }; });
  await click(p, '[data-act="dsexport"]');
  const json = await p.evaluate(async () => window.__BLOBS.length ? await window.__BLOBS[0].text() : '');
  let obj = null; try { obj = JSON.parse(json); } catch (e) {}
  L.check('export : fichier JSON créé (mon-jardin-DATE.json)', !!obj && obj.app === 'tifa-nature-dossier' && /^mon-jardin-\d{4}-\d{2}-\d{2}\.json$/.test(await p.evaluate(() => window.__DL)));
  L.check('export : contient plantes, carnet, tâches', obj && obj.pots.length === 1 && obj.journal.length >= 2 && obj.tasks.length >= 1);
  L.check('export : date d\'enregistrement notée', !!(await st(p)).flags.dossierSave);
  /* import dans un store vide : retrouve tout */
  await p.evaluate(() => { T.store.s.pots = []; T.store.s.journal = []; T.store.s.tasks = []; T.store.save(); });
  let r = await p.evaluate((j) => T.dossier.importData(j), json);
  s = await st(p);
  L.check('import : tout est retrouvé (' + r.msg + ')', r.ok && s.pots.length === 1 && s.journal.length === obj.journal.length && s.tasks.length === obj.tasks.length && s.pots[0].photo === obj.pots[0].photo);
  r = await p.evaluate((j) => T.dossier.importData(j), json); s = await st(p);
  L.check('import : le refaire ne crée aucun doublon', r.ok && s.pots.length === 1 && s.journal.length === obj.journal.length && s.tasks.length === obj.tasks.length);
  const snap = JSON.stringify(await st(p));
  for (const bad of ['pas du json', '{"app":"autre"}', '[]', 'null', '{"app":"tifa-nature-dossier","pots":"x"}']) {
    r = await p.evaluate((j) => T.dossier.importData(j), bad);
    L.check('import : refus propre de « ' + bad.slice(0, 20) + ' »', !r.ok && JSON.stringify(await st(p)) === snap);
  }
  r = await p.evaluate(() => T.dossier.importData({ app: 'tifa-nature-dossier', pots: [{ id: 5, nom: 12, photo: 'http://x/y.png', notes: { a: 1 }, soins: 'x' }, { nom: 'Plante inconnue', arrose: 'hier', soins: [{ t: 'a' }, { t: 5, k: 'zzz', x: 'ok' }] }], journal: [{ date: 'zzz' }, { date: '2026-01-02', texte: 'ok' }], tasks: [{ titre: '', date: '2026-01-01' }] }));
  s = await st(p);
  L.check('import : données au mauvais format nettoyées sans plantage', r.ok && s.pots.length === 2 && s.pots[1].nom === 'Plante inconnue' && s.pots[1].arrose === null && s.pots[1].photo === '' && s.pots[1].soins.length === 1 && s.pots[1].soins[0].k === 'autre' && s.journal.some((n) => n.texte === 'ok'));
  /* fenêtre de retrouvage */
  await go(p, '#/dossier'); await click(p, '[data-act="dsimport"]');
  L.check('import : fenêtre claire avec 3 boutons étiquetés', await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.modal-foot .btn'), (b) => b.textContent.trim()).join('|') === 'Annuler|Coller le texte|Choisir le fichier'));
  await modalBtn(p, 'Coller le texte');
  await p.$eval('#ds-paste', (e, j) => { e.value = j; }, json); await modalBtn(p, 'Retrouver');
  L.check('import : collage du texte accepté, fenêtre fermée', await p.evaluate(() => !document.querySelector('.modal')));
  L.check('0 erreur JS (parcours principal)', clean(p).length === 0, clean(p).join(' | '));
  await p.close();

  /* ===== 5. migration d'un ancien stockage ===== */
  p = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: OLD });
  await load(p);
  await go(p, '#/dossier');
  s = await st(p);
  L.check('migration : les 2 plantes valides sont gardées, les entrées abîmées écartées', s.pots.length === 2 && s.pots[0].id === 'old1' && s.pots[1].id === 'old2');
  L.check('migration : anciennes valeurs intactes (nom, surnom, zone, arrose, added)', s.pots[0].nom === 'Tomate' && s.pots[0].surnom === 'Ma tomate' && s.pots[0].zone === 'plein_soleil' && s.pots[0].added === 1700000000000 && Date.now() - s.pots[0].arrose > 2.9 * 86400000 && s.pots[1].arrose === null);
  L.check('migration : nouveaux champs ajoutés à vide', s.pots.every((x) => x.endroit === '' && x.dateAchat === '' && x.notes === '' && x.photo === '' && x.nourri === null && Array.isArray(x.soins)));
  L.check('migration : ancien carnet intact', s.journal.length === 1 && s.journal[0].texte === 'Ancienne note');
  await go(p, '#/dossier/plantes'); t = await text(p);
  L.check('migration : les 2 plantes s\'affichent (Ma tomate, Mon cactus)', /Ma tomate/.test(t) && /Mon cactus/.test(t));
  await go(p, '#/dossier/plante/old2'); t = await text(p);
  L.check('migration : fiche d\'une plante au nom libre (sans fiche générale) sans erreur', /Mon cactus/.test(t) && !/En un coup d.oeil/.test(t) && /Pas encore d'arrosage noté/.test(t));
  await go(p, '#/pots'); L.check('migration : #/pots fonctionne toujours', /Ma tomate/.test(await text(p)) && /Mon cactus/.test(await text(p)));
  await go(p, '#/dossier'); t = await text(p);
  L.check('migration : « À faire aujourd\'hui » lit le planning (arrosage de la tomate en retard)', /Arroser : Ma tomate/.test(t), t.slice(0, 200));
  L.check('migration : 0 erreur JS', clean(p).length === 0, clean(p).join(' | '));
  await p.close();

  /* ===== 6. affichage : 4 profils, texte 100 % et 200 %, beaucoup de plantes, noms très longs ===== */
  const LONG = 'Une plante avec un nom vraiment très très long qui doit passer à la ligne sans rien casser du tout';
  for (const dev of ['Pixel 8 (Android 14)', 'Samsung Z Fold (plié, Android 14)', 'Samsung Galaxy A12 petit (Android 11)', 'Samsung Tab A9 tablette (Android 14)']) {
    for (const scale of [1, 2]) {
      const q = await L.newPage(browser, base, dev, { beforeLoad: FAKE });
      await L.skipOnboarding(q); await load(q);
      await q.evaluate((scale, LONG) => {
        T.store.s.settings.scale = scale; T.applyDisplay();
        const ids = T.D.plantes.slice(0, 12).map((x) => x.id);
        T.store.s.pots = ids.map((id, i) => ({ id: 'p' + i, plantId: id, nom: T.plante(id).nom, surnom: i === 0 ? LONG : '', zone: ['plein_soleil', 'mi_ombre', 'ombre'][i % 3], added: 1, arrose: i % 2 ? Date.now() - 12 * 86400000 : null }));
        T.store.s.pots.push({ id: 'free', plantId: '', nom: LONG, surnom: '', zone: '', added: 1, arrose: null, endroit: LONG, notes: LONG + LONG });
        T.store.save();
      }, scale, LONG);
      const tag = dev.split(' (')[0] + ' x' + scale;
      for (const h of ['#/dossier', '#/dossier/plantes', '#/dossier/plante/p0', '#/dossier/plante/free', '#/dossier/endroits', '#/dossier/soins']) {
        await go(q, h);
        const ov = await L.overflow(q);
        L.check('affichage ' + tag + ' ' + h + ' : aucun débordement', ov.length === 0, ov.join(' ; '));
        const small = await q.evaluate(() => Array.prototype.filter.call(document.querySelectorAll('#view .btn, #view .item, #view summary, #view a.ds-card'), (b) => { const r = b.getBoundingClientRect(); return r.width && r.height && r.height < 43.5; }).length);
        L.check('affichage ' + tag + ' ' + h + ' : zones de toucher >= 44 px', small === 0, small + ' trop petite(s)');
      }
      /* fenêtres : boutons visibles et corps défilant */
      await go(q, '#/dossier/plante/p0');
      for (const act of ['dsedit', 'dsnote', 'dsimport']) {
        await q.evaluate((act) => { const b = document.querySelector('[data-act="' + act + '"]'); if (b) T.act[act](b); else T.act[act](); }, act); await L.sleep(250);
        const ov = await L.overflow(q);
        const foot = await q.evaluate(() => { const f = document.querySelector('.modal-foot'), b = document.querySelector('.modal-body'); if (!f) return 'pas de fenêtre'; const r = f.getBoundingClientRect(); return (r.bottom <= innerHeight + 1 && r.top >= 0) ? (getComputedStyle(b).overflowY !== 'visible' ? 'ok' : 'corps non défilant') : 'boutons hors écran'; });
        L.check('fenêtre ' + act + ' ' + tag + ' : boutons visibles, corps défilant, pas de débordement', foot === 'ok' && ov.length === 0, foot + ' ' + ov.join(' ; '));
        await q.evaluate(() => { T.closeModal(); });
      }
      L.check('affichage ' + tag + ' : 0 erreur JS', clean(q).length === 0, clean(q).join(' | '));
      await q.close();
    }
  }

  /* ===== 7. thèmes (sombre) lisibles : fond et texte différents ===== */
  p = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: FAKE });
  await L.skipOnboarding(p); await load(p);
  await p.evaluate(() => { T.store.s.settings.theme = 'nuit'; T.applyDisplay(); });
  await go(p, '#/dossier');
  L.check('thème nuit : cartes lisibles (texte différent du fond)', await p.evaluate(() => { const c = document.querySelector('.ds-card'), s = getComputedStyle(c); return s.color !== s.backgroundColor; }));
  /* limite de 200 plantes */
  await p.evaluate(() => { T.store.s.pots = []; for (let i = 0; i < 200; i++) T.store.s.pots.push({ id: 'z' + i, plantId: '', nom: 'P' + i, surnom: '', zone: '', added: 1, arrose: null }); T.store.save(); });
  await go(p, '#/dossier/plantes'); await click(p, '[data-act="dsadd"]'); await p.type('#ds-free', 'Une de plus'); await modalBtn(p, 'Ajouter à mon jardin');
  L.check('limite : 200 plantes maximum, message clair', (await st(p)).pots.length === 200 && /200 plantes/.test(await p.evaluate(() => document.getElementById('toast').textContent)));
  L.check('0 erreur JS (fin)', clean(p).length === 0, clean(p).join(' | '));
  await p.close();
};
