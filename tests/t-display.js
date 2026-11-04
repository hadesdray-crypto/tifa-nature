/* Domaines (c) tactile, (e) affichages, (f) modes : matrice de téléphones, tailles de texte, thèmes, paysage. */
const ROUTES = ['#/accueil', '#/trouver', '#/pots', '#/conseils', '#/plus', '#/photo', '#/maladie', '#/maladies', '#/plante/tomate', '#/plante/monstera', '#/maladie/mildiou', '#/calendrier', '#/calendrier/3', '#/conseils/arrosage', '#/guide/' , '#/reglages', '#/aide', '#/aide-installation', '#/maj', '#/licence', '#/legal/mentions', '#/legal/cgu', '#/legal/confidentialite', '#/apropos'];
async function visit(page, L, routes, label, fails) {
  for (const r of routes) {
    await page.evaluate((h) => { location.hash = h; }, r); await L.sleep(60);
    const ov = await L.overflow(page);
    if (ov.length) fails.push(label + ' ' + r + ' : ' + ov.slice(0, 2).join(' ; '));
  }
}
module.exports = async function ({ L, browser, base, part }) {
  const fails = [];
  const guide = await (async () => { const p = await L.newPage(browser, base, 'Pixel 8 (Android 14)'); const id = await p.evaluate(() => T.D.guides[0].id); await p.close(); return id; })();
  const routes = ROUTES.map((r) => (r === '#/guide/' ? '#/guide/' + guide : r));

  if (part === 'tactile') {
    const page = await L.newPage(browser, base, 'Samsung Galaxy A15 (Android 14)'); await L.skipOnboarding(page);
    const small = [];
    for (const r of ['#/accueil', '#/trouver', '#/pots', '#/conseils', '#/plus', '#/plante/tomate', '#/maladie', '#/reglages']) {
      await page.evaluate((h) => { location.hash = h; }, r); await L.sleep(80);
      const s = await page.evaluate(() => Array.from(document.querySelectorAll('#view button, #view a.btn, #view a.item, #view .chip, #tabs button, .top-btn')).filter((e) => e.getBoundingClientRect().width > 0).map((e) => { const b = e.getBoundingClientRect(); return { t: (e.innerText || '').trim().slice(0, 25), w: Math.round(b.width), h: Math.round(b.height) }; }).filter((x) => x.h < 40 || x.w < 40));
      s.forEach((x) => small.push(r + ' ' + JSON.stringify(x)));
    }
    L.check('tactile : toutes les zones de touche font au moins 40 px', small.length === 0, small.slice(0, 4).join(' | '));
    /* toucher vrai : tab -> navigation ; défilement ne déclenche pas de clic */
    await page.evaluate(() => { location.hash = '#/accueil'; }); await L.sleep(100);
    const tab = await page.$('#tabs [data-tab="conseils"]'); await tab.tap(); await L.sleep(150);
    L.check('tactile : toucher « Conseils » change de section', (await page.evaluate(() => document.getElementById('title').textContent)) === 'Conseils');
    const before = await page.evaluate(() => location.hash);
    await page.evaluate(() => { document.getElementById('view').scrollTop = 0; });
    await page.touchscreen.touchStart(200, 600); await page.touchscreen.touchMove(200, 300); await page.touchscreen.touchMove(200, 150); await page.touchscreen.touchEnd(); await L.sleep(200);
    const sc = await page.evaluate(() => ({ top: document.getElementById('view').scrollTop, hash: location.hash }));
    L.check('tactile : glisser fait défiler sans ouvrir de lien', sc.top > 50 && sc.hash === before, JSON.stringify(sc));
    /* bouton retour Android */
    const back = await page.evaluate(() => { const log = []; T.native.exitApp = () => log.push('exit');
      location.hash = '#/accueil'; T.render(); history.replaceState(null, '', '#/accueil');
      location.hash = '#/plante/tomate'; return log; }); await L.sleep(150);
    await page.evaluate(() => T.onBack()); await L.sleep(200);
    L.check('retour Android : depuis une fiche, revient en arrière', (await page.evaluate(() => location.hash)) === '#/accueil');
    await page.evaluate(() => { history.replaceState(null, '', '#/pots'); T.render(); T.onBack(); });
    L.check('retour Android : depuis un onglet, va à l\'accueil', (await page.evaluate(() => location.hash)) === '#/accueil');
    await page.evaluate(() => { window.__exit = 0; T.native.exitApp = () => { window.__exit++; }; T.onBack(); });
    L.check('retour Android : 1er appui sur l\'accueil = message, pas de sortie', (await page.evaluate(() => window.__exit)) === 0 && (await page.evaluate(() => document.getElementById('toast').className)) === 'show');
    await page.evaluate(() => T.onBack());
    L.check('retour Android : 2e appui = sortie', (await page.evaluate(() => window.__exit)) === 1);
    await page.evaluate(() => { T.modal({ title: 'Test', html: 'x' }); T.onBack(); });
    L.check('retour Android : ferme d\'abord la fenêtre ouverte', (await page.evaluate(() => T.modalStack.length)) === 0);
    /* défilement horizontal des chips / double toucher rapide */
    await page.evaluate(() => { location.hash = '#/trouver'; }); await L.sleep(100);
    for (let i = 0; i < 2; i++) { const chip = await page.$('.chip[data-key="soleil"]'); await chip.tap(); await L.sleep(120); }
    L.check('tactile : double toucher sur un filtre revient à l\'état de départ', await page.evaluate(() => !document.querySelector('.chip.on[data-key="soleil"]')));
    L.check('tactile : aucune erreur JavaScript', page.errors.filter((e) => !/script-src/.test(e)).length === 0, page.errors.join(' | '));
    await page.close();
    return;
  }

  if (part === 'affichages') {
    for (const dev of Object.keys(L.DEVICES)) {
      for (const scale of [1, 2]) {
        const page = await L.newPage(browser, base, dev); await L.skipOnboarding(page);
        await page.evaluate((s) => document.documentElement.style.setProperty('--scale', String(s)), scale);
        await visit(page, L, routes, dev + ' texte x' + scale, fails);
        /* fenêtres : boutons visibles */
        for (const open of [() => T.act.addpot({ getAttribute: () => '' }), () => T.confirm('Titre', 'Un texte assez long pour tester le défilement de la fenêtre. '.repeat(30), 'Oui', () => {}), () => T.updater.showModal({ version: '9.9.9', versionCode: 9, date: '2026-11-03', changes: Array.from({ length: 40 }, (_, i) => 'Changement numéro ' + (i + 1) + ' avec une phrase un peu longue'), files: [{ path: 'index.html', sha256: 'a'.repeat(64), size: 1000 }] })]) {
          await page.evaluate(open); await L.sleep(80);
          const ov = await L.overflow(page); if (ov.length) fails.push(dev + ' x' + scale + ' fenêtre : ' + ov.join(' ; '));
          const vis = await page.evaluate(() => { const b = document.querySelector('.modal-foot .btn'); if (!b) return 'aucun bouton'; const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight + 1 && r.width > 0 ? 'ok' : 'hors écran'; });
          if (vis !== 'ok') fails.push(dev + ' x' + scale + ' bouton de fenêtre ' + vis);
          await page.evaluate(() => { while (T.closeModal()); });
        }
        await page.close();
      }
    }
    L.check('affichages : 12 téléphones x texte normal et 200 % x ' + routes.length + ' écrans + 3 fenêtres : zéro débordement', fails.length === 0, fails.slice(0, 5).join(' || ') + ' (total ' + fails.length + ')');
    /* paysage */
    const f2 = [];
    for (const dev of ['Pixel 8 (Android 14)', 'Samsung Galaxy A12 petit (Android 11)', 'Samsung Z Fold (plié, Android 14)', 'Samsung Tab A9 tablette (Android 14)']) {
      const page = await L.newPage(browser, base, dev, { landscape: true }); await L.skipOnboarding(page);
      await visit(page, L, routes, dev + ' paysage', f2);
      await page.evaluate(() => T.confirm('Titre', 'Texte long. '.repeat(60), 'Oui', () => {}));
      const vis = await page.evaluate(() => { const r = document.querySelector('.modal-foot .btn').getBoundingClientRect(); return r.bottom <= window.innerHeight + 1; });
      if (!vis) f2.push(dev + ' paysage : bouton de fenêtre hors écran');
      await page.close();
    }
    L.check('affichages : paysage sur 4 appareils : zéro débordement, boutons de fenêtre visibles', f2.length === 0, f2.slice(0, 4).join(' || '));
    /* toutes les fiches et maladies à la plus petite largeur, texte 200 % */
    const f3 = [];
    const page = await L.newPage(browser, base, 'Samsung Z Fold (plié, Android 14)'); await L.skipOnboarding(page);
    await page.evaluate(() => document.documentElement.style.setProperty('--scale', '2'));
    const ids = await page.evaluate(() => ({ p: T.D.plantes.map((x) => x.id), m: T.D.maladies.map((x) => x.id) }));
    await visit(page, L, ids.p.map((i) => '#/plante/' + i).concat(ids.m.map((i) => '#/maladie/' + i)), 'Z Fold plié x2', f3);
    L.check('affichages : ' + ids.p.length + ' fiches plantes + ' + ids.m.length + ' fiches maladies à 280 px et texte 200 % sans débordement', f3.length === 0, f3.slice(0, 4).join(' || '));
    await page.close();
    return;
  }

  if (part === 'modes') {
    const f4 = [];
    for (const theme of ['zen', 'foret', 'sable', 'nuit']) {
      const page = await L.newPage(browser, base, 'Pixel 8 (Android 14)'); await L.skipOnboarding(page);
      await page.evaluate((t) => { T.set().theme = t; T.applyDisplay(); }, theme);
      await visit(page, L, routes, 'thème ' + theme, f4);
      /* contraste approximatif : texte principal vs fond */
      const c = await page.evaluate(() => { const lum = (s) => { const m = s.match(/\d+(\.\d+)?/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
        const pairs = [['body', document.body], ['.btn.primary', document.querySelector('.btn.primary') || document.body], ['#tabs button.on', document.querySelector('#tabs button.on')]]; const out = [];
        pairs.forEach(([n, e]) => { const st = getComputedStyle(e); let bg = st.backgroundColor, el = e; while ((bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') && el.parentElement) { el = el.parentElement; bg = getComputedStyle(el).backgroundColor; } const a = lum(st.color), b = lum(bg); out.push([n, ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(1)]); }); return out; });
      c.forEach(([n, v]) => { if (parseFloat(v) < 4.5) f4.push('thème ' + theme + ' contraste faible ' + n + ' ' + v); });
      await page.close();
    }
    L.check('modes : 4 thèmes (Zen, Forêt, Sable, Nuit) : aucun débordement, contraste lisible (>= 4,5)', f4.length === 0, f4.slice(0, 4).join(' || '));
    /* réglages réellement appliqués et conservés */
    const page = await L.newPage(browser, base, 'Pixel 8 (Android 14)'); await L.skipOnboarding(page);
    await page.evaluate(() => { location.hash = '#/reglages'; }); await L.sleep(100);
    await page.click('[data-act="settheme"][data-val="nuit"]'); await L.sleep(100);
    L.check('modes : choisir « Nuit » dans Réglages change le thème', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'nuit');
    await page.click('[data-act="setscale"][data-val="1.4"]'); await L.sleep(100);
    L.check('modes : « Très grand » agrandit le texte', parseFloat(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)) > 22);
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction('window.__TIFA_STARTED===true'); await L.sleep(200);
    L.check('modes : le choix est conservé après fermeture/réouverture', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'nuit' && (await page.evaluate(() => T.set().scale)) === 1.4);
    const f5 = []; await visit(page, L, routes, 'Nuit très grand', f5);
    L.check('modes : Nuit + texte très grand : aucun débordement', f5.length === 0, f5.slice(0, 3).join(' || '));
    await page.evaluate(() => { T.store.reset(); T.applyDisplay(); });
    L.check('modes : « Effacer » rétablit le style Zen d\'origine', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'zen');
    /* le style d'origine ne change JAMAIS tout seul (système en mode sombre) */
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]); await page.reload({ waitUntil: 'load' }); await page.waitForFunction('window.__TIFA_STARTED===true');
    L.check('modes : téléphone en mode sombre : le style Zen choisi reste inchangé', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'zen');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await page.reload({ waitUntil: 'load' }); await page.waitForFunction('window.__TIFA_STARTED===true');
    L.check('modes : animations réduites : l\'appli s\'affiche', (await page.evaluate(() => document.getElementById('view').innerText.length)) > 100);
    await page.close();
  }
};
