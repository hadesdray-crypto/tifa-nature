const L = require('./lib');
(async () => {
  const s = await L.serve(L.WWW, 0), base = 'http://127.0.0.1:' + s.port, b = await L.launch();
  const page = await L.newPage(b, base, 'Pixel 8 (Android 14)');
  console.log('erreurs au démarrage:', page.errors);
  await L.skipOnboarding(page);
  const routes = ['#/accueil', '#/trouver', '#/pots', '#/conseils', '#/plus', '#/photo', '#/maladie', '#/maladies', '#/plante/tomate', '#/calendrier', '#/reglages', '#/aide', '#/aide-installation', '#/maj', '#/licence', '#/legal/mentions', '#/legal/cgu', '#/legal/confidentialite', '#/apropos'];
  for (const r of routes) {
    await page.evaluate((h) => { location.hash = h; }, r); await L.sleep(120);
    const info = await page.evaluate(() => ({ t: document.getElementById('title').textContent, n: document.getElementById('view').innerText.length }));
    const ov = await L.overflow(page);
    console.log(r.padEnd(24), JSON.stringify(info), ov.length ? 'DEBORDE: ' + ov.join(' | ') : '');
  }
  console.log('erreurs:', page.errors);
  await page.evaluate(() => { location.hash = '#/accueil'; }); await L.sleep(200);
  await page.screenshot({ path: __dirname + '/out/accueil-v2.png' });
  await b.close(); s.close();
})().catch((e) => { console.error(e); process.exit(1); });
