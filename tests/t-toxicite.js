/* Domaine : Toxicité détaillée (données, fenêtre au toucher, débordements, erreurs JS). */
module.exports = async function ({ L, browser, base }) {
  const clean = (p) => p.errors.filter((e) => !/script-src/.test(e));
  for (const [dev, scale] of [['Pixel 8 (Android 14)', 1], ['Samsung Z Fold (plié, Android 14)', 2]]) {
    const p = await L.newPage(browser, base, dev);
    await L.skipOnboarding(p);
    if (scale !== 1) await p.evaluate((s) => { T.store.s.settings.scale = s; T.applyDisplay(); }, scale);
    const D = await p.evaluate(() => {
      const bad = [], emo = /\p{Extended_Pictographic}/u;
      T.D.plantes.forEach((pl) => {
        const t = (T.D.toxicite || {})[pl.id];
        if (!t) { bad.push(pl.id + ' absent'); return; }
        ['niveau', 'resume', 'pourquoi', 'precision'].forEach((k) => { if (typeof t[k] !== 'string' || !t[k]) bad.push(pl.id + ' ' + k); });
        if (['aucune', 'faible', 'moderee', 'elevee'].indexOf(t.niveau) < 0) bad.push(pl.id + ' niveau');
        if (!Array.isArray(t.sources)) bad.push(pl.id + ' sources');
        if (t.niveau === 'aucune' && !(t.sources || []).length) bad.push(pl.id + ' aucune sans source');
        if (emo.test(JSON.stringify(t))) bad.push(pl.id + ' emoji');
      });
      return bad;
    });
    L.check(D.length === 0, dev + ' toxicité : 160 fiches valides ' + D.slice(0, 5).join('; '));
    for (const id of ['laurier-rose', 'estragon']) {
      await p.evaluate((h) => { location.hash = h; }, '#/plante/' + id);
      await L.sleep(300);
      const b = await p.$('[data-act="toxinfo"]');
      L.check(dev + ' ' + id + ' badge toxique cliquable', !!b);
      if (!b) continue;
      await b.tap(); await L.sleep(300);
      const m = await p.evaluate(() => { const e = document.querySelector('.modal'); return e ? { txt: e.innerText, btn: !!e.querySelector('[data-mbtn]'), w: e.scrollWidth <= e.clientWidth + 1 } : null; });
      L.check(dev + ' ' + id + ' fenêtre complète sans débordement', m && /Pourquoi/.test(m.txt) && /antipoison/.test(m.txt) && m.btn && m.w);
      await p.evaluate(() => document.querySelector('[data-mbtn]').click()); await L.sleep(250);
      L.check(dev + ' fenêtre se ferme', !(await p.$('.modal')));
    }
    L.check(dev + ' aucune erreur JS ' + clean(p).slice(0, 2).join('|'), clean(p).length === 0);
    await p.close();
  }
};
