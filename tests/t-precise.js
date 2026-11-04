/* Domaine : Reconnaissance précise (clé Pl@ntNet de l'utilisateur) - réseau simulé. */
module.exports = async function ({ L, browser, base }) {
  const GOOD = 'ABCDEF1234567890good', BAD = 'ABCDEF1234567890badd';
  const st = { calls: [], mode: 'ok' };
  async function mk(dev, scale) {
    const p = await L.newPage(browser, base, dev);
    await L.skipOnboarding(p);
    if (scale && scale !== 1) await p.evaluate((s) => { T.store.s.settings.scale = s; T.applyDisplay(); }, scale);
    await p.setRequestInterception(true);
    p.on('request', (req) => {
      const u = req.url();
      if (!u.startsWith('https://my-api.plantnet.org/')) return req.continue();
      st.calls.push(u);
      const H = { 'Access-Control-Allow-Origin': '*' };
      if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: Object.assign({ 'Access-Control-Allow-Headers': '*' }, H) });
      if (st.mode === 'down') return req.abort('internetdisconnected');
      if (st.mode === '500') return req.respond({ status: 500, body: 'x', headers: H });
      if (u.includes('api-key=' + BAD)) return req.respond({ status: 401, body: '{"error":"x"}', contentType: 'application/json', headers: H });
      if (u.includes('/quota/daily')) return req.respond({ status: 200, contentType: 'application/json', headers: H, body: '{"day":"2026-11-04","quota":{"identify":{"count":2,"total":500,"remaining":498}}}' });
      if (u.includes('/identify/')) return req.respond({ status: 200, contentType: 'application/json', headers: H, body: '{"results":[{"score":0.9,"species":{"scientificNameWithoutAuthor":"Ocimum basilicum","commonNames":["Basilic"]}}]}' });
      req.respond({ status: 404, body: '{}', headers: H });
    });
    return p;
  }
  const go = async (p, h) => { await p.evaluate((h) => { location.hash = h; }, h); await L.sleep(300); };
  const setKey = async (p, v) => { await p.evaluate((v) => { document.getElementById('pn-key').value = v; }, v); };
  const act = async (p, a) => { await p.evaluate((a) => document.querySelector('[data-act="' + a + '"]').click(), a); await L.sleep(500); };
  const txt = (p) => p.evaluate(() => document.body.innerText);
  const clean = (p) => p.errors.filter((e) => !/script-src|Failed to load resource/.test(e));

  for (const [dev, sc] of [['Pixel 8 (Android 14)', 1], ['Samsung Z Fold (plié, Android 14)', 2], ['Galaxy S24 (Android 14)', 1]]) {
    st.calls = []; st.mode = 'ok';
    const p = await mk(dev, sc);
    await go(p, '#/photo');
    L.check(dev + ' bouton « Activer la reconnaissance précise » présent sans clé', await p.evaluate(() => !!document.querySelector('a[href="#/photo/precise"]')));
    await go(p, '#/photo/precise');
    let t = await txt(p);
    L.check(dev + ' explications 3 étapes + lien du site', /1\. Créer un compte/.test(t) && /3\. La coller/.test(t) && await p.evaluate(() => !!document.querySelector('a[href^="https://my.plantnet.org"][target="_blank"]')));
    L.check(dev + ' une seule fois annoncé', /une seule fois/i.test(t));
    L.check(dev + ' aucun débordement', (await L.overflow(p)).length === 0);
    /* vide, trop court, mauvais */
    await act(p, 'pncheck'); L.check(dev + ' champ vide -> message', /Collez d'abord/.test(await txt(p)));
    await setKey(p, 'abc'); await act(p, 'pncheck'); L.check(dev + ' clé trop courte refusée sans réseau', /ne ressemble pas/.test(await txt(p)) && st.calls.length === 0);
    await setKey(p, BAD); await act(p, 'pncheck'); L.check(dev + ' clé refusée (401) -> message clair, rien enregistré', /pas acceptée/.test(await txt(p)) && !(await p.evaluate(() => (T.store.s.plantnet || {}).key)));
    L.check(dev + ' la saisie reste dans le champ après une erreur', await p.evaluate((k) => document.getElementById('pn-key').value === k, BAD));
    st.mode = 'down'; await setKey(p, GOOD); await p.evaluate((k) => { const i = document.getElementById('pn-key'); i.value = k; i.dispatchEvent(new Event('input', { bubbles: true })); }, GOOD); await act(p, 'pncheck'); L.check(dev + ' réseau coupé -> message, rien enregistré', /Impossible de vérifier/.test(await txt(p)) && !(await p.evaluate(() => (T.store.s.plantnet || {}).key)));
    L.check(dev + ' après réseau coupé, la clé saisie est conservée', await p.evaluate((k) => document.getElementById('pn-key').value === k, GOOD));
    st.mode = '500'; await act(p, 'pncheck'); L.check(dev + ' service en panne (500) -> pas de fausse validation', !(await p.evaluate(() => (T.store.s.plantnet || {}).key)));
    st.mode = 'ok'; await setKey(p, '  api-key=' + GOOD + ' '); await act(p, 'pncheck');
    t = await txt(p);
    L.check(dev + ' bonne clé (même collée avec api-key=) -> « Connecté »', /Connecté/.test(t) && /498/.test(t) && await p.evaluate((k) => T.store.s.plantnet.key === k, GOOD));
    L.check(dev + ' la vérification ne consomme pas d\'identification', st.calls.every((u) => !/identify/.test(u)));
    /* persistance */
    await p.reload({ waitUntil: 'load' }); await L.sleep(600);
    L.check(dev + ' clé conservée après redémarrage', await p.evaluate((k) => T.plantnet.key() === k, GOOD));
    await go(p, '#/photo');
    L.check(dev + ' plus de bouton d\'activation, état « activée »', !(await p.evaluate(() => !!document.querySelector('a[href="#/photo/precise"].btn'))) && /activée/.test(await txt(p)));
    /* la reconnaissance utilise la clé de la personne */
    await p.evaluate(() => { I = T.ident; I.photo = 'data:image/jpeg;base64,/9j/4AAQ'; I.blob = new Blob(['x'], { type: 'image/jpeg' }); T.native.online = true; T.render(true); });
    st.calls = []; await act(p, 'identgo'); await L.sleep(400);
    L.check(dev + ' identification envoyée avec la clé de la personne', st.calls.some((u) => /identify\/all/.test(u) && u.includes('api-key=' + GOOD)));
    L.check(dev + ' résultat affiché + mention Pl@ntNet', /Basilic/.test(await txt(p)) && /Propulsé par Pl@ntNet/.test(await txt(p)));
    /* retirer */
    await go(p, '#/photo/precise'); await act(p, 'pnremove'); await L.sleep(300);
    await p.evaluate(() => { const b = [...document.querySelectorAll('.modal [data-mbtn]')].pop(); b.click(); }); await L.sleep(400);
    L.check(dev + ' clé retirée', !(await p.evaluate(() => T.plantnet.key())));
    L.check(dev + ' 0 erreur JS', clean(p).length === 0 && !void console.log(clean(p).slice(0, 2)));
    await p.close();
  }
};
