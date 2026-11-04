/* Gestes au hasard + endurance : aucune erreur JS, aucun écran vide, mémoire stable. */
module.exports = async function ({ L, browser, base }) {
  const p = await L.newPage(browser, base, 'Galaxy A14 (Android 13)').catch(() => L.newPage(browser, base, 'Pixel 8 (Android 14)'));
  await L.skipOnboarding(p);
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const routes = ['accueil', 'trouver', 'pots', 'conseils', 'plus', 'jardin', 'planning', 'carnet', 'assistant', 'meteo', 'calculs', 'calendrier', 'maladie', 'photo', 'reglages', 'aide', 'maj', 'plante/tomate', 'plante/basilic'];
  const vp = p.viewport(); let empty = 0, n = 0; const t0 = Date.now();
  const mem0 = await p.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : 0);
  while (Date.now() - t0 < 90000) {
    const a = rnd();
    try {
      if (a < 0.3) await p.evaluate((r) => { location.hash = '#/' + r; }, routes[Math.floor(rnd() * routes.length)]);
      else if (a < 0.8) await p.touchscreen.tap(Math.floor(rnd() * vp.width), Math.floor(rnd() * vp.height));
      else if (a < 0.9) await p.evaluate(() => history.back());
      else await p.evaluate((y) => window.scrollBy(0, y), Math.floor(rnd() * 600 - 300));
      await L.sleep(40);
    } catch (e) {}
    n++;
    if (n % 25 === 0) { const t = await p.evaluate(() => (document.getElementById('view') || document.body).innerText.trim().length); if (t < 5) empty++; }
  }
  const mem1 = await p.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : 0);
  L.check('gestes au hasard (' + n + ' actions en 90 s) : aucune erreur JavaScript', p.errors.filter((e) => !/script-src|ERR_|Failed to load/.test(e)).length === 0, p.errors.slice(0, 3).join(' | '));
  L.check('gestes au hasard : jamais d\'écran vide (' + empty + ')', empty === 0);
  L.check('endurance : mémoire stable (' + Math.round(mem0 / 1e6) + ' → ' + Math.round(mem1 / 1e6) + ' Mo)', !mem0 || mem1 < mem0 * 4 + 30e6);
  await p.evaluate(() => { location.hash = '#/accueil'; }); await L.sleep(300);
  L.check('endurance : l\'appli répond encore', (await p.evaluate(() => document.getElementById('view').innerText)).includes('Bonjour'));
};
