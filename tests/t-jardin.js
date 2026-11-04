/* Modules « Mon jardin » (plan 2D) et « Carnet de culture » : fonctions réelles, glisser, persistance, débordements à 200 % de texte. */
module.exports = async function ({ L, browser, base }) {
  /* Appareil photo simulé : une image de 1200 x 800 dessinée au démarrage */
  const FAKE = () => {
    window.__TIFA_FAKE_NATIVE = { Camera: {
      requestPermissions: () => Promise.resolve({ camera: 'granted' }),
      getPhoto: () => { const c = document.createElement('canvas'); c.width = 1200; c.height = 800; const x = c.getContext('2d'); x.fillStyle = '#4a8040'; x.fillRect(0, 0, 1200, 800); x.fillStyle = '#f1c76a'; x.fillRect(300, 200, 600, 400); return Promise.resolve({ dataUrl: c.toDataURL('image/jpeg', 0.9) }); }
    } };
  };
  const clean = (p) => p.errors.filter((e) => !/script-src/.test(e));
  const go = async (p, h) => { await p.evaluate((h) => { location.hash = h; }, h); await L.sleep(250); };
  const rect = async (p, sel) => { await p.evaluate((sel) => { document.querySelector(sel).scrollIntoView({ block: 'center' }); }, sel); await L.sleep(350); return p.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }, sel); };
  const garden = (p) => p.evaluate(() => JSON.parse(JSON.stringify(T.store.s.garden)));
  const modalBtn = async (p, label) => { await p.evaluate((label) => { const b = Array.prototype.filter.call(document.querySelectorAll('.modal-foot .btn'), (x) => x.textContent.trim() === label).pop(); b.click(); }, label); await L.sleep(250); };

  /* ================= JARDIN ================= */
  let p = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: FAKE });
  await L.skipOnboarding(p);
  L.check('jardin : champs garden et journal présents dès le départ', await p.evaluate(() => 'garden' in T.store.s && Array.isArray(T.store.s.journal)));
  await go(p, '#/jardin');
  L.check('jardin : sans plan, bouton « Créer mon plan »', (await p.evaluate(() => document.getElementById('view').innerText)).includes('Créer mon plan'));
  L.check('jardin : résumé sans plan', await p.evaluate(() => /Pas encore/.test(T.jardin.summary())));
  await p.click('[data-act="jcreate"]'); await L.sleep(250);
  let g = await garden(p);
  L.check('jardin : plan créé 4 x 3 m, sud en haut', g && g.w === 4 && g.l === 3 && g.south === 'haut');
  L.check('jardin : le plan SVG est affiché', await p.evaluate(() => !!document.querySelector('#jd-svg')));

  /* dimensions */
  const setField = async (sel, v) => { await p.$eval(sel, (e, v) => { e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, v); await L.sleep(250); };
  await setField('[data-jf="plan.w"]', '5,5'); await setField('[data-jf="plan.l"]', '4');
  g = await garden(p);
  L.check('jardin : dimensions réglées (5,5 x 4 m, virgule acceptée)', g.w === 5.5 && g.l === 4, JSON.stringify([g.w, g.l]));
  await setField('[data-jf="plan.w"]', '999');
  L.check('jardin : dimension trop grande ramenée à 30 m', (await garden(p)).w === 30);
  await setField('[data-jf="plan.w"]', 'abc');
  L.check('jardin : saisie invalide ignorée', (await garden(p)).w === 30);
  await setField('[data-jf="plan.w"]', '4'); await setField('[data-jf="plan.l"]', '3');

  /* ajouter chaque type */
  for (const t of ['planche', 'bac', 'pot', 'allee', 'composteur', 'recup', 'mur']) { await p.click('[data-act="jadd"][data-type="' + t + '"]'); await L.sleep(120); }
  g = await garden(p);
  L.check('jardin : 7 types d\'éléments ajoutés', g.items.length === 7 && new Set(g.items.map((i) => i.type)).size === 7);
  const inside = g.items.every((i) => i.x >= 0 && i.y >= 0 && i.x + i.w <= g.w + 0.001 && i.y + i.h <= g.l + 0.001);
  L.check('jardin : tous les éléments sont dans le plan', inside);
  L.check('jardin : taille des touches >= 44 px (boutons d\'ajout)', await p.evaluate(() => Array.prototype.every.call(document.querySelectorAll('.jd-add .btn'), (b) => b.getBoundingClientRect().height >= 44)));
  L.check('jardin : cible tactile >= 44 px sur le petit pot', await p.evaluate(() => { const hit = document.querySelector('.jd-hd[data-w="0.4"]').getBoundingClientRect(); return hit.width >= 43.5 && hit.height >= 43.5; }));

  /* glisser à la souris */
  const bacId = g.items.filter((i) => i.type === 'bac')[0].id;
  const sel = '.jd-hd[data-jid="' + bacId + '"]';
  let r = await rect(p, sel);
  await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.mouse.move(r.x + 40, r.y + 25, { steps: 6 }); await p.mouse.move(r.x + 90, r.y + 40, { steps: 6 }); await p.mouse.up(); await L.sleep(300);
  let g2 = await garden(p), b1 = g.items.filter((i) => i.id === bacId)[0], b2 = g2.items.filter((i) => i.id === bacId)[0];
  L.check('jardin : glisser à la souris déplace le bac (' + b1.x + ',' + b1.y + ' -> ' + b2.x + ',' + b2.y + ')', b2.x !== b1.x || b2.y !== b1.y);
  L.check('jardin : aimantation 0,1 m', [b2.x, b2.y].every((v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-6));
  /* glisser très loin hors du plan : doit rester dedans */
  r = await rect(p, sel);
  await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.mouse.move(await p.evaluate(() => innerWidth) - 3, await p.evaluate(() => innerHeight) - 3, { steps: 8 }); await p.mouse.up(); await L.sleep(300);
  g2 = await garden(p); b2 = g2.items.filter((i) => i.id === bacId)[0];
  L.check('jardin : jamais hors du plan (' + b2.x + ',' + b2.y + ')', b2.x + b2.w <= g2.w + 0.001 && b2.y + b2.h <= g2.l + 0.001 && b2.x >= 0 && b2.y >= 0);
  r = await rect(p, sel);
  await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.mouse.move(3, 3, { steps: 8 }); await p.mouse.up(); await L.sleep(300);
  b2 = (await garden(p)).items.filter((i) => i.id === bacId)[0];
  L.check('jardin : bord haut-gauche respecté', b2.x === 0 && b2.y === 0, b2.x + ',' + b2.y);
  /* glisser au doigt */
  r = await rect(p, sel);
  let touched = true;
  try { await p.touchscreen.touchStart(r.x, r.y); await p.touchscreen.touchMove(r.x + 30, r.y + 30); await p.touchscreen.touchMove(r.x + 70, r.y + 60); await p.touchscreen.touchEnd(); } catch (e) { touched = false; }
  await L.sleep(300);
  const bt = (await garden(p)).items.filter((i) => i.id === bacId)[0];
  L.check('jardin : glisser au doigt déplace le bac', touched && (bt.x !== 0 || bt.y !== 0), JSON.stringify(bt));
  /* boutons de déplacement */
  const before = (await garden(p)).items.filter((i) => i.id === bacId)[0];
  await p.evaluate((id) => T.act.jnudge({ getAttribute: (k) => ({ 'data-id': id, 'data-dx': '1', 'data-dy': '0' })[k] }), bacId);
  const after = (await garden(p)).items.filter((i) => i.id === bacId)[0];
  L.check('jardin : bouton « Droite » déplace de 0,1 m', Math.abs(after.x - before.x - 0.1) < 1e-6 || after.x + after.w >= 3.99);
  /* taille */
  await setField('[data-jf="it.w"][data-id="' + bacId + '"]', '1,5');
  L.check('jardin : largeur de l\'élément réglable', (await garden(p)).items.filter((i) => i.id === bacId)[0].w === 1.5);
  await setField('[data-jf="it.w"][data-id="' + bacId + '"]', '50');
  const bw = (await garden(p)).items.filter((i) => i.id === bacId)[0];
  L.check('jardin : élément jamais plus grand que le plan', bw.w <= 4 && bw.x + bw.w <= 4.001);

  /* plante + soleil */
  await p.evaluate((id) => T.act.jsel({ getAttribute: () => id }), bacId); /* ferme les réglages */
  await p.evaluate((id) => { const it = T.store.s.garden.items.filter((i) => i.id === id)[0]; it.w = 0.8; it.x = 1; it.y = 0.1; T.store.save(); T.render(true); }, bacId);
  await p.click('[data-row="' + bacId + '"] [data-act="jplant"]'); await L.sleep(250);
  L.check('jardin : fenêtre de choix de plante avec suggestions', (await p.evaluate(() => document.querySelector('.modal').innerText)).includes('conviennent'));
  await p.type('#jp-q', 'tomte'); await L.sleep(250);
  await p.click('[data-act="jppick"]'); await L.sleep(300);
  g = await garden(p);
  const bac = g.items.filter((i) => i.id === bacId)[0];
  L.check('jardin : plante associée (' + bac.plantId + ')', bac.plantId === 'tomate');
  let txt = await p.evaluate((id) => document.querySelector('[data-row="' + id + '"]').innerText, bacId);
  L.check('jardin : tomate côté sud = « Bien placée » en texte', /Bien placée/.test(txt) && /plein soleil/.test(txt), txt.replace(/\n/g, ' | '));
  await p.click('[data-act="jsouth"][data-val="bas"]'); await L.sleep(250);
  txt = await p.evaluate((id) => document.querySelector('[data-row="' + id + '"]').innerText, bacId);
  L.check('jardin : sud en bas, la tomate est dans l\'ombre -> « À déplacer » + explication', /À déplacer/.test(txt) && /ombre/.test(txt) && /lumière|Mieux vaut/.test(txt), txt.replace(/\n/g, ' | '));
  L.check('jardin : le plan marque aussi le problème par un signe (x)', await p.evaluate((id) => /x$/.test(document.querySelector('[data-gid="' + id + '"] .jd-lab').textContent.trim()), bacId));
  await p.click('[data-act="jsouth"][data-val="haut"]'); await L.sleep(200);
  L.check('jardin : résumé avec plan', await p.evaluate(() => /Plan 4 x 3 m, 7 éléments/.test(T.jardin.summary())), await p.evaluate(() => T.jardin.summary()));
  /* Ajouter à Mes pots */
  const np = await p.evaluate(() => T.store.s.pots.length);
  await p.click('[data-row="' + bacId + '"] [data-act="jtopots"]'); await L.sleep(200);
  await p.click('[data-row="' + bacId + '"] [data-act="jtopots"]'); await L.sleep(200);
  L.check('jardin : « Ajouter à Mes pots » ajoute une seule fois', (await p.evaluate(() => T.store.s.pots.length)) === np + 1);
  /* suppression avec confirmation */
  await p.click('[data-row="' + bacId + '"] [data-act="jdel"]'); await L.sleep(250);
  L.check('jardin : suppression demande confirmation', (await p.evaluate(() => !!document.querySelector('.modal'))) && (await garden(p)).items.length === 7);
  await modalBtn(p, 'Annuler');
  L.check('jardin : Annuler conserve l\'élément', (await garden(p)).items.length === 7);
  await p.click('[data-row="' + bacId + '"] [data-act="jdel"]'); await L.sleep(250); await modalBtn(p, 'Supprimer');
  L.check('jardin : élément supprimé après confirmation', (await garden(p)).items.length === 6);

  /* persistance */
  const snap = JSON.stringify(await garden(p));
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction('window.__TIFA_STARTED===true'); await L.sleep(400);
  L.check('jardin : plan conservé après rechargement', JSON.stringify(await garden(p)) === snap);
  await go(p, '#/jardin');
  L.check('jardin : plan réaffiché après rechargement', (await p.evaluate(() => document.querySelectorAll('.jd-it').length)) === 6);
  await p.evaluate(() => { T.store.s.garden.items[0].x = 'oups'; T.store.s.garden.items.push(null, { type: 'inconnu' }); T.store.s.garden.w = -5; });
  await p.evaluate(() => { T.render(); });
  L.check('jardin : données abîmées corrigées sans erreur', (await p.evaluate(() => T.store.s.garden.w >= 1 && T.store.s.garden.items.length === 6)));
  await p.click('[data-act="jreset"]'); await L.sleep(250); await modalBtn(p, 'Tout effacer');
  L.check('jardin : effacer tout le plan', (await p.evaluate(() => T.store.s.garden)) === null);
  L.check('jardin : aucune erreur JavaScript', clean(p).length === 0, clean(p).join(' | '));
  await p.close();

  /* ================= CARNET ================= */
  p = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: FAKE });
  await L.skipOnboarding(p);
  await go(p, '#/carnet');
  L.check('carnet : vide = message clair', (await p.evaluate(() => document.getElementById('view').innerText)).includes('Le carnet est vide'));
  L.check('carnet : count() = 0', (await p.evaluate(() => T.carnet.count())) === 0);
  /* note sans photo, avec plante */
  await p.click('[data-act="cnadd"]'); await L.sleep(250);
  const today = await p.evaluate(() => { const d = new Date(), z = (n) => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); });
  L.check('carnet : date par défaut = aujourd\'hui', (await p.$eval('#cn-date', (e) => e.value)) === today);
  await modalBtn(p, 'Enregistrer');
  L.check('carnet : note vide refusée, fenêtre toujours ouverte', (await p.evaluate(() => T.carnet.count())) === 0 && (await p.evaluate(() => !!document.querySelector('.modal'))));
  await p.type('#cn-pq', 'tomte'); await L.sleep(200); await p.click('[data-act="cnpick"]'); await L.sleep(150);
  await p.type('#cn-text', 'Premières fleurs sur la tomate.');
  await modalBtn(p, 'Enregistrer');
  L.check('carnet : note sans photo enregistrée', (await p.evaluate(() => T.carnet.count())) === 1 && (await p.evaluate(() => T.store.s.journal[0].plantId)) === 'tomate');
  /* note avec photo (appareil simulé) */
  await p.click('[data-act="cnadd"]'); await L.sleep(250);
  await p.$eval('#cn-date', (e) => { e.value = '2025-06-10'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.type('#cn-text', 'Photo du premier fruit.');
  await p.type('#cn-pq', 'tomate'); await L.sleep(200); await p.click('[data-act="cnpick"]');
  await p.click('[data-act="cnphoto"][data-src="camera"]'); await p.waitForSelector('#cn-photo img', { timeout: 6000 }).catch(() => {});
  L.check('carnet : aperçu de la photo dans la fenêtre', await p.evaluate(() => !!document.querySelector('#cn-photo img')));
  L.check('carnet : boutons de la fenêtre visibles', (await L.overflow(p)).length === 0, (await L.overflow(p)).join(' | '));
  await modalBtn(p, 'Enregistrer');
  const ph = await p.evaluate(() => { const n = T.store.s.journal.filter((x) => x.photo)[0]; return n ? { len: n.photo.length, ok: /^data:image\/jpeg/.test(n.photo) } : null; });
  L.check('carnet : photo réduite en JPEG (' + (ph && Math.round(ph.len / 1000)) + ' ko)', ph && ph.ok && ph.len < 160000);
  const dim = await p.evaluate(() => new Promise((res) => { const i = new Image(); i.onload = () => res(Math.max(i.naturalWidth, i.naturalHeight)); i.src = T.store.s.journal.filter((x) => x.photo)[0].photo; }));
  L.check('carnet : photo <= 900 px (' + dim + ')', dim <= 900);
  /* trier, filtrer */
  await p.evaluate(() => { T.store.s.journal.push({ id: 'zz', date: '2026-03-01', plantId: 'basilic', texte: 'Semis du basilic.', photo: '', created: 1 }); T.store.save(); T.render(); }); await L.sleep(200);
  const order = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.cn-note h3'), (e) => e.textContent));
  L.check('carnet : liste datée, plus récente d\'abord', order.length === 3 && order[2].includes('2025'), order.join(' / '));
  await p.select('[data-cn="filter"]', 'tomate'); await L.sleep(250);
  L.check('carnet : filtre par plante', (await p.evaluate(() => document.querySelectorAll('.cn-note').length)) === 2);
  L.check('carnet : bouton Écouter sur chaque note', (await p.evaluate(() => document.querySelectorAll('.cn-note [data-act="speak"]').length)) === 2);
  await p.click('a[href^="#/carnet/saisons/"]'); await L.sleep(300);
  const sais = await p.evaluate(() => ({ n: document.querySelectorAll('.cn-note').length, d: Array.prototype.map.call(document.querySelectorAll('.cn-note h3'), (e) => e.textContent), s: Array.prototype.map.call(document.querySelectorAll('.cn-season'), (e) => e.textContent) }));
  L.check('carnet : comparer les saisons, triées par date croissante', sais.n === 2 && sais.d[0].includes('2025') && sais.s.length >= 1, JSON.stringify(sais));
  /* modifier puis supprimer */
  await go(p, '#/carnet');
  await p.click('.cn-note [data-act="cnedit"]'); await L.sleep(250);
  await p.$eval('#cn-text', (e) => { e.value = 'Texte modifié.'; });
  await modalBtn(p, 'Enregistrer');
  L.check('carnet : note modifiée', await p.evaluate(() => T.store.s.journal.some((n) => n.texte === 'Texte modifié.')));
  const cnt = await p.evaluate(() => T.carnet.count());
  await p.click('.cn-note [data-act="cnedit"]'); await L.sleep(250); await modalBtn(p, 'Supprimer');
  L.check('carnet : suppression demande confirmation', (await p.evaluate(() => T.carnet.count())) === cnt);
  await modalBtn(p, 'Supprimer');
  L.check('carnet : note supprimée après confirmation', (await p.evaluate(() => T.carnet.count())) === cnt - 1);
  /* persistance */
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction('window.__TIFA_STARTED===true'); await L.sleep(400);
  L.check('carnet : notes conservées après rechargement', (await p.evaluate(() => T.carnet.count())) === cnt - 1);
  /* stockage plein : note gardée sans photo */
  await go(p, '#/carnet'); await p.click('[data-act="cnadd"]'); await L.sleep(250);
  await p.evaluate(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(v).split('data:image').length > 2) throw new Error('QuotaExceededError'); return o.call(this, k, v); }; });
  await p.type('#cn-text', 'Note avec photo, mémoire pleine.');
  await p.click('[data-act="cnphoto"][data-src="gallery"]'); await p.waitForSelector('#cn-photo img', { timeout: 6000 }).catch(() => {});
  await modalBtn(p, 'Enregistrer');
  const full = await p.evaluate(() => ({ n: T.store.s.journal.filter((x) => /mémoire pleine/.test(x.texte)).length, ph: T.store.s.journal.filter((x) => /mémoire pleine/.test(x.texte))[0].photo, toast: document.getElementById('toast').textContent }));
  L.check('carnet : mémoire pleine -> note gardée sans photo + message clair', full.n === 1 && full.ph === '' && /pleine/.test(full.toast), JSON.stringify(full).slice(0, 160));
  /* limite de photos */
  await p.evaluate(() => { for (let i = 0; i < 60; i++) T.store.s.journal.push({ id: 'p' + i, date: '2026-01-01', plantId: '', texte: 'x', photo: 'data:image/jpeg;base64,AAAA', created: i }); });
  await p.click('[data-act="cnadd"]'); await L.sleep(250); await p.click('[data-act="cnphoto"][data-src="camera"]'); await L.sleep(500);
  L.check('carnet : limite de 60 photos annoncée', (await p.evaluate(() => document.getElementById('toast').textContent)).includes('60 photos') && (await p.evaluate(() => !document.querySelector('#cn-photo img'))));
  await modalBtn(p, 'Annuler');
  L.check('carnet : aucune erreur JavaScript', clean(p).length === 0, clean(p).join(' | '));
  await p.close();

  /* ============ Débordements : 4 profils, texte à 200 % ============ */
  for (const dev of ['Pixel 8 (Android 14)', 'Samsung Z Fold (plié, Android 14)', 'Samsung Tab A9 tablette (Android 14)', 'Android 12 compact']) {
    const q = await L.newPage(browser, base, dev, { beforeLoad: FAKE });
    await L.skipOnboarding(q);
    await q.evaluate(() => {
      T.store.s.garden = { w: 4, l: 3, south: 'gauche', items: [
        { id: 'a', type: 'planche', x: 0.2, y: 0.2, w: 1.2, h: 0.6, plantId: 'tomate' }, { id: 'b', type: 'bac', x: 2.5, y: 1, w: 0.8, h: 0.4, plantId: 'basilic' },
        { id: 'c', type: 'pot', x: 3, y: 2.4, w: 0.4, h: 0.4, plantId: 'hortensia' }, { id: 'd', type: 'mur', x: 0, y: 2.8, w: 2, h: 0.2 }, { id: 'e', type: 'recup', x: 1, y: 1.5, w: 0.5, h: 0.5 }] };
      T.store.s.journal = [{ id: 'j1', date: '2026-05-02', plantId: 'tomate', texte: 'Un texte assez long pour vérifier le retour à la ligne dans une carte étroite, avec un motmotmotmotmotmotmotmotmotmotmot très long.', photo: '', created: 1 }];
      T.store.save();
      document.documentElement.style.setProperty('--scale', '2');
    });
    const tag = dev.split(' (')[0];
    for (const h of ['#/jardin', '#/carnet', '#/carnet/saisons/tomate']) {
      await go(q, h);
      if (h === '#/jardin') { await q.evaluate(() => { T.act.jsel({ getAttribute: () => 'a' }); }); await L.sleep(200); }
      const o = await L.overflow(q);
      L.check(tag + ' 200 % : ' + h + ' sans débordement', o.length === 0, o.join(' | '));
    }
    await go(q, '#/jardin');
    const svgW = await q.evaluate(() => document.getElementById('jd-svg').getBoundingClientRect().width);
    const vw = await q.evaluate(() => window.innerWidth);
    L.check(tag + ' : le plan tient dans l\'écran (' + Math.round(svgW) + ' px sur ' + vw + ')', svgW <= vw && svgW > 150);
    await q.evaluate(() => T.act.jplant({ getAttribute: () => 'a' })); await L.sleep(250);
    let o = await L.overflow(q);
    L.check(tag + ' 200 % : fenêtre de choix de plante sans débordement', o.length === 0, o.join(' | '));
    await q.evaluate(() => T.closeModal());
    await go(q, '#/carnet'); await q.evaluate(() => T.act.cnadd()); await L.sleep(250);
    o = await L.overflow(q);
    const foot = await q.evaluate(() => { const f = document.querySelector('.modal-foot').getBoundingClientRect(); return f.bottom <= window.innerHeight + 1 && f.height > 40; });
    L.check(tag + ' 200 % : fenêtre de note, boutons visibles', o.length === 0 && foot, o.join(' | '));
    L.check(tag + ' : aucune erreur JavaScript', clean(q).length === 0, clean(q).join(' | '));
    await q.close();
  }
};
