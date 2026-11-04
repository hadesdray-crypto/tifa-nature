/* Domaine (g) : recherches - vide, accents, fautes, texte long, aucun résultat. + intégrité des données. */
module.exports = async function ({ L, browser, base }) {
  const page = await L.newPage(browser, base, 'Pixel 8 (Android 14)');
  await L.skipOnboarding(page);
  const ev = (f, ...a) => page.evaluate(f, ...a);
  /* --- intégrité des données --- */
  const data = await ev(() => {
    const bad = [], ids = {}, mal = T.D.maladies.map((m) => m.id);
    T.D.plantes.forEach((p) => {
      if (ids[p.id]) bad.push('id en double ' + p.id); ids[p.id] = 1;
      ['semis', 'plantation', 'floraison', 'recolte', 'taille'].forEach((k) => (p[k] || []).forEach((m) => { if (!(m >= 1 && m <= 12)) bad.push(p.id + ' mois ' + k); }));
      (p.problemes || []).forEach((x) => { if (mal.indexOf(x) < 0) bad.push(p.id + ' problème inconnu ' + x); });
      if (!p.nom || !p.latin || !p.conseils.length) bad.push(p.id + ' fiche incomplète');
      if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(JSON.stringify(p))) bad.push(p.id + ' emoji');
    });
    return { n: T.D.plantes.length, m: T.D.maladies.length, c: T.D.conseils.length, g: T.D.guides.length, cal: T.D.calendrier.length, z: T.D.pots.length, bad: bad.slice(0, 8) };
  });
  L.check('données : ' + data.n + ' plantes, ' + data.m + ' maladies, ' + data.c + ' conseils, ' + data.g + ' guides, ' + data.cal + ' mois, ' + data.z + ' zones', data.n >= 85 && data.m === 44 && data.c === 70 && data.g === 10 && data.cal === 12 && data.z === 5);
  L.check('données : références et mois valides, aucun emoji', data.bad.length === 0, data.bad.join(' | '));
  /* --- recherche --- */
  const top = (q, f) => ev((q, f) => T.search.plants(q, f || {}).slice(0, 5).map((r) => r.p.id), q, f);
  const all = await ev(() => T.search.plants('', {}).length);
  L.check('recherche vide : toutes les plantes', all === data.n, all);
  L.check('recherche espaces seuls = vide', (await ev(() => T.search.plants('   ', {}).length)) === data.n);
  for (const [q, want] of [['tomate', 'tomate'], ['TOMATE', 'tomate'], ['tomatte', 'tomate'], ['basilic', 'basilic'], ['basilik', 'basilic'], ['géranium', null], ['hortencia', 'hortensia'], ['lavande', null], ['rosier', null], ['monstera', 'monstera'], ['persil', 'persil'], ['courgete', 'courgette']]) {
    const r = await top(q);
    const ok = want ? r.indexOf(want) >= 0 : r.length > 0;
    L.check('recherche « ' + q + ' » -> ' + (r[0] || 'rien'), ok, JSON.stringify(r));
  }
  const g1 = await top('geranium'), g2 = await top('géranium');
  L.check('accents : « geranium » = « géranium »', JSON.stringify(g1) === JSON.stringify(g2) && g1.length > 0, JSON.stringify([g1, g2]));
  const t0 = Date.now(); const long = await ev(() => { const s = 'tomate '.repeat(800); return T.search.plants(s, {}).length; });
  L.check('texte très long : pas de blocage (' + (Date.now() - t0) + ' ms)', Date.now() - t0 < 1500);
  L.check('aucun résultat : liste vide', (await ev(() => T.search.plants('zzzzqqqq', {}).length)) === 0);
  L.check('caractères spéciaux sans erreur', await ev(() => { try { T.search.plants('<script>alert(1)</script> ((( [[[ \\ ?', {}); T.search.maladies('%%%'); return true; } catch (e) { return false; } }));
  /* filtres */
  const fOmbre = await ev(() => T.search.plants('', { soleil: 'ombre' }).every((r) => r.p.soleil.indexOf('ombre') >= 0));
  L.check('filtre ombre cohérent', fOmbre);
  L.check('filtre intérieur cohérent', await ev(() => T.search.plants('', { interieur: true }).every((r) => r.p.interieur) && T.search.plants('', { interieur: true }).length > 3));
  /* interface réelle : taper dans le champ */
  await ev(() => { location.hash = '#/trouver'; }); await L.sleep(150);
  await page.type('#q', 'tomte'); await L.sleep(150);
  L.check('interface : « tomte » propose la tomate', (await ev(() => document.getElementById('results').innerText)).toLowerCase().includes('tomate'));
  await page.$eval('#q', (e) => { e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.type('#q', 'zzzzqqqq'); await L.sleep(150);
  L.check('interface : aucun résultat = message clair', (await ev(() => document.getElementById('results').innerText)).includes('Aucune plante trouvée'));
  await page.$eval('#q', (e) => { e.value = '<img src=x onerror=alert(1)>'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await L.sleep(100);
  L.check('interface : saisie piégée affichée sans exécution', (await ev(() => !document.querySelector('#results img'))));
  await page.click('.chip[data-key="pot"]'); await L.sleep(100);
  L.check('interface : filtre « En pot » actif', await ev(() => !!document.querySelector('.chip.on[data-key="pot"]')));
  /* maladies et conseils par texte */
  L.check('recherche maladie « puceron »', (await ev(() => T.search.maladies('puceron').map((m) => m.id))).includes('pucerons'));
  L.check('recherche conseil « arroser »', (await ev(() => T.search.conseils('arrosage').length)) > 0);
  L.check('aucune erreur JavaScript pendant le domaine', page.errors.filter((e) => !/script-src/.test(e)).length === 0, page.errors.join(' | '));
  await page.close();
};
