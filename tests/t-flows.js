/* Domaine (h) : parcours complets - première ouverture/permission, pots, diagnostic, licence, hors connexion, données abîmées. */
module.exports = async function ({ L, browser, base }) {
  const ok = (p) => p.errors.filter((e) => !/script-src/.test(e)).length === 0;
  /* ---- 1. Première ouverture : accès demandés une seule fois ---- */
  const FAKE_CAM = () => { window.__perm = 0; window.__TIFA_FAKE_NATIVE = { Camera: { requestPermissions: () => { window.__perm++; return Promise.resolve({ camera: 'granted' }); } } }; };
  let p = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: FAKE_CAM });
  await L.sleep(400);
  const seen = await p.evaluate(() => ({ modal: T.modalStack.length, txt: (document.querySelector('.modal') || {}).innerText || '' }));
  L.check('première ouverture : la présentation s\'affiche', seen.modal === 1 && /Bienvenue/.test(seen.txt), seen.txt.slice(0, 80));
  for (let i = 0; i < 5 && (await p.evaluate(() => T.modalStack.length)); i++) {
    const b = await p.$$('.modal-foot .btn'); await b[b.length - 1].tap(); await L.sleep(250);
  }
  L.check('première ouverture : l\'accès à l\'appareil photo est demandé UNE fois', (await p.evaluate(() => window.__perm)) === 1 && (await p.evaluate(() => T.store.s.flags.permAsked)) === true);
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction('window.__TIFA_STARTED===true'); await L.sleep(500);
  L.check('deuxième ouverture : ni présentation ni nouvelle demande', (await p.evaluate(() => T.modalStack.length)) === 0 && (await p.evaluate(() => window.__perm)) === 0);
  L.check('première ouverture : aucune erreur', ok(p));
  /* ---- 2. Pots ---- */
  p = await L.newPage(browser, base, 'Pixel 8 (Android 14)'); await L.skipOnboarding(p);
  await p.evaluate(() => { location.hash = '#/pots'; }); await L.sleep(250);
  L.check('pots : écran vide clair (aucun pot)', (await p.evaluate(() => document.getElementById('view').innerText)).length > 40);
  await p.evaluate(() => T.act.addpot({ getAttribute: () => '' })); await L.sleep(200);
  await p.type('#pot-q', 'tomte'); await L.sleep(200);
  await p.click('[data-act="potpick"]'); await L.sleep(100);
  const hint = await p.evaluate(() => document.getElementById('pot-hint').innerText);
  L.check('pots : l\'indication soleil/ombre s\'affiche pour la zone', hint.length > 5, hint);
  await p.type('#pot-alias', 'Pot du fond');
  const addb = await p.$$('.modal-foot .btn'); await addb[addb.length - 1].tap(); await L.sleep(300);
  L.check('pots : le pot est ajouté et visible', (await p.evaluate(() => T.store.s.pots.length)) === 1 && (await p.evaluate(() => document.getElementById('view').innerText)).includes('Pot du fond'));
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction('window.__TIFA_STARTED===true'); await L.sleep(400);
  L.check('pots : le pot est conservé après fermeture/réouverture', (await p.evaluate(() => T.store.s.pots.length)) === 1);
  await p.evaluate(() => { T.store.s.flags.onboarded = true; location.hash = '#/pots'; }); await L.sleep(200);
  await p.evaluate(() => T.act.water({ getAttribute: () => T.store.s.pots[0].id })); await L.sleep(100);
  L.check('pots : « Arroser » enregistre la date', (await p.evaluate(() => T.store.s.pots[0].arrose)) > 0);
  /* pot sans plante / injection de nom / 100 pots */
  const many = await p.evaluate(() => { for (let i = 0; i < 100; i++) T.store.s.pots.push({ id: 'x' + i, plantId: 'tomate', alias: '<b>' + i, zone: 'ombre', ajoute: Date.now(), arrose: 0 }); T.store.save(); location.hash = '#/pots'; T.render(); return document.getElementById('view').innerHTML.includes('<b>0'); });
  L.check('pots : 100 pots et noms piégés sans plantage ni injection', many === false && ok(p));
  /* ---- 3. Diagnostic : chaque maladie ressort avec ses propres symptômes ---- */
  const miss = await p.evaluate(() => { const bad = []; T.D.maladies.forEach((m) => { T.diag.sel = {}; (m.symptomes || []).forEach((s) => { T.diag.sel[s] = true; }); T.diag.plantId = ''; const top = T.diag.compute().slice(0, 4).map((r) => r.d.id); if (top.indexOf(m.id) < 0) bad.push(m.id); }); return bad; }).catch((e) => ['ERR ' + e.message]);
  L.check('diagnostic : chacune des 44 maladies ressort dans les 4 premières avec ses symptômes', miss.length === 0, miss.join(','));
  await p.evaluate(() => { location.hash = '#/maladie'; }); await L.sleep(250);
  const dui = await p.evaluate(() => document.getElementById('view').innerText);
  L.check('diagnostic : écran complet (photo facultative, plante, parties, symptômes)', /photo/i.test(dui) && dui.length > 300, dui.slice(0, 100));
  await p.evaluate(() => { location.hash = '#/maladie'; T.diag.sel = { f_insectes_visibles: true }; T.diag.show = true; T.render(); }); await L.sleep(200);
  L.check('diagnostic : le résultat propose une solution', /Que faire/i.test(await p.evaluate(() => document.getElementById('view').innerText)));
  L.check('diagnostic : aucune erreur', ok(p));
  /* ---- 4. Reconnaissance : sans clé = mode guidé hors connexion ---- */
  await p.evaluate(() => { location.hash = '#/photo'; }); await L.sleep(250);
  const iui = await p.evaluate(() => document.getElementById('view').innerText);
  L.check('reconnaissance : sans clé/connexion, écran guidé clair (pas d\'erreur visible)', iui.length > 100 && !/undefined|NaN|\[object/.test(iui) && ok(p), iui.slice(0, 120));
  /* ---- 5. Licence avec une vraie paire de clés de test ---- */
  const lic = await p.evaluate(async () => {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const jwk = await crypto.subtle.exportKey('jwk', kp.publicKey);
    const b64u = (b) => btoa(String.fromCharCode.apply(null, new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const pl = b64u(new TextEncoder().encode(JSON.stringify({ v: 1, id: 'TEST-1', app: 'tifa-nature' })));
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(T.cfg.LICENCE_PREFIXE + '.' + pl));
    T.cfg.LICENCE_PUBLIC_KEY_JWK = jwk;
    const good = await T.licence.verify(T.cfg.LICENCE_PREFIXE + '.' + pl + '.' + b64u(sig));
    const bad = await T.licence.verify(T.cfg.LICENCE_PREFIXE + '.' + pl + 'x.' + b64u(sig));
    const junk = await T.licence.verify('n importe quoi');
    const empty = await T.licence.verify('');
    const mk = async (o) => { const q = b64u(new TextEncoder().encode(JSON.stringify(o))); const g = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(T.cfg.LICENCE_PREFIXE + '.' + q)); return T.cfg.LICENCE_PREFIXE + '.' + q + '.' + b64u(g); };
    const other = await T.licence.verify(await mk({ v: 1, id: 'X', app: 'autre-appli' }));
    const old = await T.licence.verify(await mk({ v: 1, id: 'X', app: 'tifa-nature', exp: 1000 }));
    return { good: !!good.ok, bad: !!bad.ok, junk: !!junk.ok, empty: !!empty.ok, other: !!other.ok, expired: !!old.ok };
  });
  L.check('licence : un code signé valide est accepté, un code modifié/faux/vide/d\'une autre appli/expiré est refusé', lic.good && !lic.bad && !lic.junk && !lic.empty && !lic.other && !lic.expired, JSON.stringify(lic));
  await p.evaluate(() => { location.hash = '#/licence'; }); await L.sleep(200);
  L.check('licence : écran clair (mode libre ou activation)', (await p.evaluate(() => document.getElementById('view').innerText.length)) > 80 && ok(p));
  /* ---- 6. Hors connexion et réseau coupé ---- */
  const ctx = p.browserContext(); await p.setOfflineMode(true);
  for (const h of ['#/accueil', '#/trouver', '#/plante/tomate', '#/pots', '#/maladie', '#/photo', '#/maj', '#/reglages', '#/conseils']) {
    await p.evaluate((x) => { location.hash = x; }, h); await L.sleep(120);
    const n = await p.evaluate(() => document.getElementById('view').innerText.length);
    if (n < 60) L.check('hors connexion : ' + h + ' affiche un écran complet', false, 'texte ' + n);
  }
  L.check('hors connexion : tous les écrans principaux s\'affichent, sans erreur', ok(p));
  await p.evaluate(() => { location.hash = '#/maj'; }); await L.sleep(150);
  await p.evaluate(() => { const b = document.querySelector('[data-act="majcheck"]'); if (b) b.click(); }); await L.sleep(1500);
  L.check('mise à jour hors connexion : message clair, pas de plantage', (await p.evaluate(() => document.getElementById('view').innerText.length)) > 60 && ok(p));
  await p.setOfflineMode(false);
  /* ---- 7. Données abîmées / stockage plein ---- */
  const dmg = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: () => { try { localStorage.setItem('tifa.v1', '{ceci n est pas du json'); } catch (e) {} } });
  L.check('données abîmées : l\'appli démarre quand même (réinitialisation propre)', (await dmg.evaluate(() => document.getElementById('view').innerText.length)) > 60 && ok(dmg));
  const odd = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: () => { try { localStorage.setItem('tifa.v1', JSON.stringify({ v: 1, settings: null, pots: 'oups', flags: 5 })); } catch (e) {} } });
  L.check('données au mauvais format : l\'appli démarre quand même', (await odd.evaluate(() => document.getElementById('view').innerText.length)) > 60 && ok(odd), odd.errors.join('|'));
  const full = await L.newPage(browser, base, 'Pixel 8 (Android 14)'); await L.skipOnboarding(full);
  await full.evaluate(() => { Storage.prototype.setItem = function () { throw new DOMException('plein', 'QuotaExceededError'); }; T.store.s.pots.push({ id: 'q1', plantId: 'tomate', alias: 'Q', zone: 'ombre', ajoute: Date.now(), arrose: 0 }); try { T.store.save(); } catch (e) { window.__thrown = true; } location.hash = '#/pots'; T.render(); }); await L.sleep(500);
  L.check('stockage plein : pas de plantage ni d\'écran vide', !(await full.evaluate(() => window.__thrown)) && (await full.evaluate(() => document.getElementById('view').innerText.length)) > 40 && ok(full), full.errors.join('|'));
  /* ---- 8. Routes inconnues / liens cassés ---- */
  const q = await L.newPage(browser, base, 'Pixel 8 (Android 14)'); await L.skipOnboarding(q);
  for (const h of ['#/nimportequoi', '#/plante/inconnue', '#/maladie/xxx', '#/guide/zzz', '#/calendrier/99', '#/conseils/zzz', '#']) {
    await q.evaluate((x) => { location.hash = x; }, h); await L.sleep(120);
    const t = await q.evaluate(() => document.getElementById('view').innerText);
    if (t.length < 15 || /undefined|NaN|\[object/.test(t)) L.check('lien cassé ' + h + ' : message clair', false, t.slice(0, 80));
  }
  L.check('liens cassés : message clair avec retour possible, sans erreur', ok(q), q.errors.join('|'));
};
