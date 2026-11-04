/* Calculs du jardinier (5 calculettes) + Météo du jardinier (faux serveur Open-Meteo local) + débordements à 200 %. */
const http = require('http');
module.exports = async function ({ L, browser, base }) {
  const sleep = L.sleep;
  /* ================= Outils calculettes ================= */
  const fill = (page, k, v) => page.$eval('#cl-' + k, (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  const chip = async (page, k, v) => { await page.click('.chip[data-k="' + k + '"][data-v="' + v + '"]'); await sleep(40); };
  const pick = async (page, id) => { await page.click('.chip[data-act="calcsel"][data-id="' + id + '"]'); await sleep(40); };
  const go = async (page) => { await page.click('[data-act="calcgo"]'); await sleep(60); return page.$eval('#cl-out', (e) => e.innerText.replace(/\s+/g, ' ')); };

  const page = await L.newPage(browser, base, 'Pixel 8 (Android 14)');
  await L.skipOnboarding(page);
  await page.evaluate(() => { location.hash = '#/calculs'; }); await sleep(150);
  const has = (txt, sub) => txt.indexOf(sub) >= 0;
  const t = (name, txt, subs) => L.check('calcul ' + name, subs.every((s) => has(txt, s)), 'obtenu : ' + txt);

  /* ---- (a) terreau : valeurs vérifiées à la main ---- */
  await pick(page, 'terreau');
  t('terreau rond 30x30 = 20 L, 1 sac, 2,1 L de billes', await go(page), ['20 litres de terreau (1 sac de 40 litres)', '2,1 litres de billes']);
  await chip(page, 'forme', 'rect'); await fill(page, 'long', '60'); await fill(page, 'larg', '20'); await fill(page, 'haut', '20');
  t('terreau rectangle 60x20x20 = 22 L, 2,4 L de billes', await go(page), ['22 litres de terreau (1 sac', '2,4 litres de billes']);
  await fill(page, 'long', '100'); await fill(page, 'larg', '25'); await fill(page, 'haut', '25');
  t('jardinière 100x25x25 = 55 L, 2 sacs, 7,5 L de billes', await go(page), ['55 litres de terreau (2 sacs de 40 litres)', '7,5 litres de billes']);
  await chip(page, 'forme', 'rond'); await fill(page, 'diam', '30,5'); await fill(page, 'haut', '30');
  t('terreau virgule « 30,5 » = 21 L', await go(page), ['21 litres de terreau']);
  await fill(page, 'diam', ''); t('terreau vide', await go(page), ['Remplissez « Diamètre en haut »']);
  await fill(page, 'diam', '-5'); t('terreau négatif', await go(page), ['ne peut pas être négatif']);
  await fill(page, 'diam', '0'); t('terreau zéro', await go(page), ['doit être au moins 10 cm']);
  await fill(page, 'diam', '99999'); t('terreau énorme', await go(page), ['semble trop grand (maximum 300 cm)']);
  await fill(page, 'diam', 'abc'); t('terreau texte', await go(page), ['tapez un nombre']);
  await fill(page, 'diam', '30'); await fill(page, 'haut', '');
  t('terreau vide + erreur affichée dans la zone', await go(page), ['Remplissez « Hauteur du pot »']);

  /* ---- (b) plants ---- */
  await pick(page, 'plants');
  t('plants basilic 100x25 = 5', await go(page), ['5 plants', '5 dans la longueur sur 1 dans la largeur', '20 cm']);
  await fill(page, 'plante', 'tomate'); await fill(page, 'long', '100'); await fill(page, 'larg', '100');
  t('plants tomate 100x100 = 1 plant', await go(page), ['1 plant,'.replace(',', '') ]);
  await fill(page, 'plante', 'radis'); await fill(page, 'larg', '25');
  t('plants radis 100x25 = 64', await go(page), ['64 plants']);
  await fill(page, 'plante', 'laitue'); await fill(page, 'long', '200,5'); await fill(page, 'larg', '50');
  t('plants laitue 200,5x50 = 16 (virgule)', await go(page), ['16 plants']);
  await fill(page, 'plante', 'autre'); await sleep(80);
  await fill(page, 'esp', '30'); await fill(page, 'long', '90'); await fill(page, 'larg', '60');
  t('plants autre 30 cm, 90x60 = 6', await go(page), ['6 plants']);
  await fill(page, 'plante', 'tomate'); await sleep(80); await fill(page, 'long', '50'); await fill(page, 'larg', '50');
  t('plants tomate 50x50 = 0 (trop petit)', await go(page), ['0 plant', 'trop petite']);
  await fill(page, 'larg', ''); t('plants vide', await go(page), ['Remplissez « Largeur »']);
  await fill(page, 'larg', '-3'); t('plants négatif', await go(page), ['ne peut pas être négatif']);
  await fill(page, 'larg', '99999'); t('plants énorme', await go(page), ['semble trop grand (maximum 5 000 cm)']);
  const opts = await page.$$eval('#cl-plante option', (o) => o.map((x) => x.textContent));
  L.check('plants : liste de plantes (' + opts.length + ') avec noms des fiches', opts.length >= 20 && opts.some((x) => /Tomate \(60 cm\)/.test(x)), opts.slice(0, 3).join('|'));

  /* ---- (c) arrosage ---- */
  await pick(page, 'arrosage');
  await fill(page, 'vol', '10'); await chip(page, 'saison', 'ete'); await chip(page, 'expo', 'soleil');
  t('arrosage 10 L été soleil = 10 L, 5 x 2 L', await go(page), ['10 litres par semaine', '5 arrosages de 2 litres']);
  await fill(page, 'vol', '20'); await chip(page, 'saison', 'hiver'); await chip(page, 'expo', 'ombre');
  t('arrosage 20 L hiver ombre = 4 L, 1 arrosage', await go(page), ['4 litres par semaine', '1 arrosage de 4 litres', 'ne gèle pas']);
  await fill(page, 'vol', '7,5'); await chip(page, 'saison', 'printemps'); await chip(page, 'expo', 'mi');
  t('arrosage 7,5 L printemps mi-ombre = 3 L (virgule)', await go(page), ['3 litres par semaine', '2 arrosages de 1,5 litre chacun']);
  await fill(page, 'vol', '0'); t('arrosage zéro', await go(page), ['supérieur à 0']);
  await fill(page, 'vol', ''); t('arrosage vide', await go(page), ['Remplissez « Volume du pot »']);
  await fill(page, 'vol', '-2'); t('arrosage négatif', await go(page), ['ne peut pas être négatif']);
  await fill(page, 'vol', '5000'); t('arrosage énorme', await go(page), ['semble trop grand']);
  await fill(page, 'vol', '10'); await go(page);
  L.check('arrosage : bouton Écouter présent', await page.evaluate(() => !!document.querySelector('[data-act="speak"]')));

  /* ---- (d) engrais ---- */
  await pick(page, 'engrais');
  t('compost 4 m² = 12 L', await go(page), ['12 litres de compost mûr', 'étiquette']);
  await chip(page, 'mode', 'pot'); await fill(page, 'potl', '10');
  t('compost pot 10 L = 1 L', await go(page), ['1 litres de compost mûr'.replace('1 litres', '1 litres')]);
  await chip(page, 'produit', 'granule');
  t('granulés pot 10 L = 15 g', await go(page), ['15 g d\'engrais', 'étiquette']);
  await chip(page, 'mode', 'm2'); await fill(page, 'surf', '4');
  t('granulés 4 m² = 320 g', await go(page), ['320 g d\'engrais']);
  await fill(page, 'surf', '100,5'); t('granulés 100,5 m² = 8,04 kg (virgule)', await go(page), ['8,04 kg']);
  await fill(page, 'surf', ''); t('engrais vide', await go(page), ['Remplissez « Surface à nourrir »']);
  await fill(page, 'surf', '-1'); t('engrais négatif', await go(page), ['ne peut pas être négatif']);
  await fill(page, 'surf', '99999'); t('engrais énorme', await go(page), ['semble trop grand']);

  /* ---- (e) pH ---- */
  await pick(page, 'ph');
  t('pH 6,5 potager = adapté', await go(page), ['pH adapté']);
  await chip(page, 'cible', 'lavande'); await fill(page, 'ph', '5');
  t('pH 5 lavande = 225 g de chaux/m²', await go(page), ['225 g de chaux par m²', 'Attention']);
  await chip(page, 'cible', 'potager'); await fill(page, 'ph', '4');
  t('pH 4 potager = 300 g (plafond), en deux fois', await go(page), ['300 g de chaux', 'en deux fois']);
  await chip(page, 'cible', 'myrtillier'); await fill(page, 'ph', '4,0');
  t('pH 4,0 myrtillier = 50 g (plafond prudent)', await go(page), ['50 g de chaux', 'myrtillier supporte très mal']);
  await fill(page, 'ph', '7'); t('pH 7 myrtillier = 75 g de soufre', await go(page), ['75 g de soufre', 'terre de bruyère']);
  await fill(page, 'ph', '8'); t('pH 8 myrtillier = 100 g de soufre (plafond)', await go(page), ['100 g de soufre']);
  await chip(page, 'cible', 'hortensia'); await fill(page, 'ph', '6,0'); t('pH 6,0 hortensia adapté', await go(page), ['pH adapté']);
  await fill(page, 'ph', '2'); t('pH 2 refusé', await go(page), ['doit être entre 3 et 10']);
  await fill(page, 'ph', '11'); t('pH 11 refusé', await go(page), ['doit être entre 3 et 10']);
  await fill(page, 'ph', ''); t('pH vide', await go(page), ['Remplissez « pH mesuré »']);
  await fill(page, 'ph', '-4'); t('pH négatif', await go(page), ['ne peut pas être négatif']);
  /* tailles tactiles (>= 44 px) */
  const small = await page.evaluate(() => Array.from(document.querySelectorAll('#view .btn, #view .chip, #view .field')).filter((e) => e.getBoundingClientRect().height < 43.9).map((e) => e.className + ' ' + Math.round(e.getBoundingClientRect().height)));
  L.check('calculs : boutons et champs >= 44 px', small.length === 0, small.join(' | '));
  L.check('calculs : aucune erreur JavaScript', page.errors.length === 0, page.errors.join(' | '));
  await page.close();

  /* ================= Météo : faux serveur local ================= */
  const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); const p = (x) => (x < 10 ? '0' : '') + x; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
  const week = (o) => ({ daily: { time: [0, 1, 2, 3, 4, 5, 6].map(iso), temperature_2m_min: o.min, temperature_2m_max: o.max, precipitation_sum: o.rain || [0, 0, 0, 0, 0, 0, 0], relative_humidity_2m_mean: o.hum || [50, 50, 50, 50, 50, 50, 50], wind_speed_10m_max: o.wind || [10, 10, 10, 10, 10, 10, 10] } });
  const SCEN = {
    '10.01': week({ min: [5, 1, -1, 0, 4, 6, 7], max: [12, 11, 10, 10, 12, 14, 15] }),                                   /* gel */
    '10.02': week({ min: [15, 16, 18, 19, 17, 15, 14], max: [30, 33, 35, 34, 31, 28, 26] }),                             /* chaleur */
    '10.03': week({ min: [8, 9, 10, 11, 10, 9, 8], max: [14, 16, 18, 20, 19, 12, 12], hum: [60, 85, 90, 82, 81, 70, 60] }), /* mildiou : 4 jours */
    '10.04': { daily: { time: 'x' } },                                                                                   /* réponse invalide */
    '10.05': week({ min: [8, 8, 8, 8, 8, 8, 8], max: [18, 18, 18, 18, 18, 18, 18] }),                                     /* calme */
    '10.07': week({ min: [8, 8, 8, 8, 8, 8, 8], max: [18, 18, 18, 18, 18, 18, 18], rain: [0, 25, 0, 0, 0, 0, 0], wind: [10, 10, 60, 10, 10, 10, 10] }) /* pluie + vent */
  };
  const GEO = {
    Gelville: [{ name: 'Gelville', latitude: 10.01, longitude: 1, admin1: 'Rhône', country_code: 'FR' }],
    Chaudville: [{ name: 'Chaudville', latitude: 10.02, longitude: 1, admin1: 'Var', country_code: 'FR' }],
    Mildiouville: [{ name: 'Mildiouville', latitude: 10.03, longitude: 1, admin1: 'Gironde', country_code: 'FR' }],
    Casseville: [{ name: 'Casseville', latitude: 10.04, longitude: 1, admin1: 'Nord', country_code: 'FR' }],
    Calmeville: [{ name: 'Calmeville', latitude: 10.05, longitude: 1, admin1: 'Cher', country_code: 'FR' }],
    Ventville: [{ name: 'Ventville', latitude: 10.07, longitude: 1, admin1: 'Manche', country_code: 'FR' }],
    Saint: [{ name: 'Saint-Un', latitude: 10.05, longitude: 1, admin1: 'Cher', country_code: 'FR' }, { name: 'Saint-Deux', latitude: 10.01, longitude: 1, admin1: 'Ain', country_code: 'FR' }],
    Lent2: [{ name: 'Lent2', latitude: 10.06, longitude: 1, admin1: 'X', country_code: 'FR' }]
  };
  const fake = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), send = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
    if (u.pathname === '/geo') {
      const n = u.searchParams.get('name');
      if (n === 'Lent') { setTimeout(() => { try { send(200, {}); } catch (e) {} }, 6000).unref(); return; }
      if (n === 'Pasjson') return send(200, '<html>erreur</html>');
      if (n === 'Panne') return send(503, { error: true });
      return send(200, GEO[n] ? { results: GEO[n] } : { generationtime_ms: 0.4 });         /* commune inconnue : pas de clé « results », comme le vrai service */
    }
    if (u.pathname === '/forecast') {
      const lat = u.searchParams.get('latitude');
      if (lat === '10.06') { setTimeout(() => { try { send(200, SCEN['10.05']); } catch (e) {} }, 6000).unref(); return; }
      return send(200, SCEN[lat] || { error: true });
    }
    send(404, {});
  });
  await new Promise((r) => fake.listen(0, '127.0.0.1', r));
  const fport = fake.address().port;
  const seen = [];
  const hookNet = async (page) => {
    await page.setRequestInterception(true);
    page.on('request', (rq) => {
      const url = rq.url();
      if (/^http:\/\/127\.0\.0\.1/.test(url)) return rq.continue();
      if (/^https?:/.test(url)) seen.push(url);
      let path = null;
      if (/^https:\/\/geocoding-api\.open-meteo\.com\/v1\/search/.test(url)) path = '/geo' + url.slice(url.indexOf('?'));
      else if (/^https:\/\/api\.open-meteo\.com\/v1\/forecast/.test(url)) path = '/forecast' + url.slice(url.indexOf('?'));
      if (!path) return rq.abort();
      http.get({ host: '127.0.0.1', port: fport, path }, (r) => {
        let b = ''; r.on('data', (c) => { b += c; });
        r.on('end', () => rq.respond({ status: r.statusCode, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: b }).catch(() => {}));
      }).on('error', () => rq.abort());
    });
  };
  const mpage = async (dev) => { const p = await L.newPage(browser, base, dev || 'Pixel 8 (Android 14)'); await L.skipOnboarding(p); await hookNet(p); await p.evaluate(() => { T.meteo.timeout = 1500; location.hash = '#/meteo'; }); await sleep(150); return p; };
  const ask = async (p, name) => {
    await p.$eval('#meteo-q', (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, name);
    await p.click('[data-act="meteogo"]');
    await p.waitForFunction('!document.querySelector(".notice[role=status]") || document.body.innerText.indexOf("Chargement en cours") < 0', { timeout: 6000 }).catch(() => {});
    await sleep(120);
    return p.$eval('#view', (e) => e.innerText.replace(/\s+/g, ' '));
  };
  const mt = (name, txt, subs, no) => L.check('météo ' + name, subs.every((s) => txt.indexOf(s) >= 0) && (no || []).every((s) => txt.indexOf(s) < 0), 'obtenu : ' + txt.slice(0, 400));

  let m = await mpage();
  await m.evaluate(() => { T.store.s.pots = [{ id: 'a', plantId: 'tomate', nom: 'Tomate' }, { id: 'b', plantId: 'menthe', nom: 'Menthe' }, { id: 'c', plantId: 'geranium', nom: 'Géranium' }]; });
  /* l'écran sans cache ni réseau lancé : conseils saisonniers, pas d'écran vide */
  mt('écran initial sans cache : message clair + conseils de gel', await m.$eval('#view', (e) => e.innerText.replace(/\s+/g, ' ')), ['Aucune prévision enregistrée', 'Conseils gel sans internet']);
  /* champ vide */
  mt('commune vide : message', await ask(m, '   '), ['Tapez d\'abord le nom de votre commune']);
  /* gel */
  let txt = await ask(m, 'Gelville');
  mt('gel : alerte, minimum -1 °C, plantes frileuses de l\'utilisateur (sans la menthe)', txt, ['Alerte gel', 'minimum -1 °C', 'Vos plantes frileuses : Tomate et Géranium', 'Prévisions : Gelville (Rhône)', 'Min -1 °C'], ['Menthe', 'Aucune alerte']);
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const dn = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return jours[d.getDay()]; };
  const expGel = [dn(1), dn(2), dn(3)];
  mt('gel : jours attendus (' + expGel.join(', ') + ')', txt, ['Gel ou risque de gel les jours suivants : ' + expGel[0] + ', ' + expGel[1] + ' et ' + expGel[2]]);
  L.check('météo : 7 jours affichés', (await m.$$eval('.mt-day', (e) => e.length)) === 7);
  L.check('météo : URLs exactes (commune seule, aucun GPS)', seen[0] === 'https://geocoding-api.open-meteo.com/v1/search?name=Gelville&count=5&language=fr&format=json' &&
    seen[1] === 'https://api.open-meteo.com/v1/forecast?latitude=10.01&longitude=1.00&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max&timezone=auto&forecast_days=7', seen.join(' || '));
  L.check('météo : alertText() annonce le gel', (await m.evaluate(() => T.meteo.alertText())).indexOf('Alerte gel : ' + expGel.join(', ').replace(/, ([^,]*)$/, ' et $1')) === 0, await m.evaluate(() => T.meteo.alertText()));
  L.check('météo : bouton Écouter sur l\'alerte', await m.evaluate(() => !!document.querySelector('.mt-alert [data-act="speak"]')));
  /* persistance : le cache survit au rechargement */
  await m.reload({ waitUntil: 'load' }); await m.waitForFunction('window.__TIFA_STARTED === true'); await sleep(150);
  L.check('météo : cache conservé après rechargement', await m.evaluate(() => !!(T.store.s.meteo && T.store.s.meteo.daily && T.store.s.meteo.daily.length === 7 && T.store.s.meteo.ville === 'Gelville (Rhône)')));
  await m.evaluate(() => { T.meteo.timeout = 1500; location.hash = '#/meteo'; T.render(); }); await sleep(150);
  mt('rechargé : prévision « enregistrée le » affichée sans réseau', await m.$eval('#view', (e) => e.innerText.replace(/\s+/g, ' ')), ['Prévision enregistrée le', 'Alerte gel']);
  /* hors ligne avec cache */
  await m.setOfflineMode(true);
  txt = await ask(m, 'Gelville');
  mt('hors ligne avec cache : message + dernière prévision enregistrée', txt, ['Pas de connexion internet', 'dernière prévision enregistrée', 'Prévision enregistrée le', 'Alerte gel']);
  L.check('météo : 7 jours encore visibles hors ligne', (await m.$$eval('.mt-day', (e) => e.length)) === 7);
  await m.setOfflineMode(false); await m.evaluate(() => { T.native.online = true; });
  /* alertText : prévision ancienne -> vide */
  L.check('alertText vide si prévision périmée', await m.evaluate(() => { const s = T.store.s.meteo, sv = JSON.stringify(s); s.daily.forEach((d) => { d.d = '2020-01-01'; }); const r = T.meteo.alertText(); T.store.s.meteo = JSON.parse(sv); return r === ''; }));
  L.check('alertText vide sans cache', await m.evaluate(() => { const sv = T.store.s.meteo; T.store.s.meteo = null; const r = T.meteo.alertText(); T.store.s.meteo = sv; return r === ''; }));
  /* chaleur */
  txt = await ask(m, 'Chaudville');
  mt('chaleur : alerte, jusqu\'à 35 °C, pas de gel', txt, ['Alerte chaleur', 'jusqu\'à 35 °C'], ['Alerte gel']);
  /* mildiou */
  txt = await ask(m, 'Mildiouville');
  mt('mildiou : 4 jours doux et humides', txt, ['Alerte mildiou', 'pendant 4 jours', 'tomates'], ['Alerte gel', 'Alerte chaleur']);
  /* pluie + vent */
  txt = await ask(m, 'Ventville');
  mt('pluie forte et vent fort', txt, ['Alerte forte pluie', 'Alerte vent fort'], ['Alerte gel']);
  /* calme */
  txt = await ask(m, 'Calmeville');
  mt('calme : aucune alerte', txt, ['Aucune alerte', 'Prévisions : Calmeville'], ['Alerte gel', 'Alerte mildiou']);
  L.check('alertText vide sans alerte', (await m.evaluate(() => T.meteo.alertText())) === '');
  /* plusieurs communes */
  txt = await ask(m, 'Saint');
  mt('plusieurs communes : liste à choisir', txt, ['Plusieurs communes trouvées', 'Saint-Un', 'Saint-Deux']);
  await m.click('[data-act="meteopick"][data-i="1"]'); await sleep(400);
  mt('choix de la 2e commune', await m.$eval('#view', (e) => e.innerText.replace(/\s+/g, ' ')), ['Prévisions : Saint-Deux (Ain)', 'Alerte gel']);
  /* commune introuvable */
  mt('commune introuvable', await ask(m, 'Zzzqqq'), ['Commune introuvable'], []);
  /* réponse invalide (géocodage non JSON, prévisions invalides, panne 503) */
  mt('géocodage non JSON : message, pas de plantage', await ask(m, 'Pasjson'), ['réponse inattendue']);
  mt('prévision invalide : message, pas de plantage', await ask(m, 'Casseville'), ['réponse inattendue']);
  mt('service en panne (503)', await ask(m, 'Panne'), ['n\'a pas pu être récupérée']);
  /* actualiser */
  await ask(m, 'Gelville');
  await m.click('[data-act="meteorefresh"]'); await sleep(500);
  mt('actualiser : refait la prévision', await m.$eval('#view', (e) => e.innerText.replace(/\s+/g, ' ')), ['mise à jour le', 'Alerte gel']);
  /* délai dépassé */
  let t0 = Date.now(); txt = await ask(m, 'Lent');
  mt('délai dépassé (géocodage) : message, durée ' + (Date.now() - t0) + ' ms', txt, ['met trop de temps', 'dernière prévision enregistrée']);
  L.check('délai dépassé : coupé à ~1,5 s (pas d\'attente infinie)', Date.now() - t0 < 4500, String(Date.now() - t0));
  mt('délai dépassé (prévisions)', await ask(m, 'Lent2'), ['met trop de temps']);
  /* repli XHR quand fetch est indisponible */
  await m.evaluate(() => { window.fetch = undefined; });
  mt('repli XHR si fetch absent', await ask(m, 'Calmeville'), ['Prévisions : Calmeville']);
  /* échappement HTML d'un nom piégé */
  await ask(m, '<img src=x onerror=alert(1)>');
  L.check('nom piégé affiché sans exécution', await m.evaluate(() => !document.querySelector('#view img')));
  L.check('météo : aucune erreur JavaScript', m.errors.filter((e) => !/503/.test(e)).length === 0, m.errors.join(' | '));
  const hosts = Array.from(new Set(seen.map((u) => new URL(u).host)));
  L.check('météo : seuls les 2 hôtes Open-Meteo sont contactés', hosts.every((h) => /^(geocoding-api|api)\.open-meteo\.com$/.test(h)), hosts.join(','));
  await m.close();

  /* hors ligne SANS cache */
  const o = await mpage();
  await o.setOfflineMode(true);
  txt = await ask(o, 'Lyon');
  mt('hors ligne sans cache : message clair + conseils de gel (pas d\'écran vide)', txt, ['Pas de connexion internet', 'première fois', 'Conseils gel sans internet'], ['Prévisions :']);
  L.check('hors ligne : aucune erreur JavaScript', o.errors.length === 0, o.errors.join(' | '));
  await o.close();

  /* ================= Débordements : 4 profils, texte à 200 % ================= */
  const profils = ['Pixel 8 (Android 14)', 'Samsung Z Fold (plié, Android 14)', 'Samsung Tab A9 tablette (Android 14)', 'Android 12 compact'];
  for (const dev of profils) {
    const p = await mpage(dev);
    await p.evaluate(() => { document.documentElement.style.setProperty('--scale', '2'); });
    const bad = [];
    /* météo : gel + plantes, puis erreurs */
    await p.evaluate(() => { T.store.s.pots = [{ id: 'a', plantId: 'tomate' }, { id: 'c', plantId: 'geranium' }, { id: 'd', plantId: 'basilic' }]; });
    await ask(p, 'Gelville'); bad.push(...(await L.overflow(p)).map((x) => 'météo gel: ' + x));
    await ask(p, 'Saint'); bad.push(...(await L.overflow(p)).map((x) => 'météo choix: ' + x));
    await ask(p, 'Zzzqqq'); bad.push(...(await L.overflow(p)).map((x) => 'météo introuvable: ' + x));
    await ask(p, 'Mildiouville'); bad.push(...(await L.overflow(p)).map((x) => 'météo mildiou: ' + x));
    /* calculs : chaque calculette avec résultat puis erreur */
    await p.evaluate(() => { location.hash = '#/calculs'; }); await sleep(150);
    for (const id of ['terreau', 'plants', 'arrosage', 'engrais', 'ph']) {
      await pick(p, id); await go(p); bad.push(...(await L.overflow(p)).map((x) => 'calcul ' + id + ': ' + x));
      const k = await p.$eval('.field', (e) => e.id.replace('cl-', ''));
      if (k !== 'plante') { await fill(p, k, ''); await go(p); bad.push(...(await L.overflow(p)).map((x) => 'calcul ' + id + ' erreur: ' + x)); }
    }
    await pick(p, 'ph'); await chip(p, 'cible', 'myrtillier'); await fill(p, 'ph', '8'); await go(p); bad.push(...(await L.overflow(p)).map((x) => 'calcul ph soufre: ' + x));
    await pick(p, 'plants'); await fill(p, 'plante', 'autre'); await sleep(80); bad.push(...(await L.overflow(p)).map((x) => 'calcul plants autre: ' + x));
    const e200 = p.errors.slice();
    L.check(dev + ' à 200 % : aucun débordement (météo + 5 calculs)', bad.length === 0, bad.slice(0, 4).join(' | '));
    L.check(dev + ' : aucune erreur JavaScript', e200.length === 0, e200.join(' | '));
    await p.close();
  }
  fake.close();
};
