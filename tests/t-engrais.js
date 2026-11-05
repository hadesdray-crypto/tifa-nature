/* Domaine : Engrais et astuces maison (données, recherche, par plante, fiche, tactile, débordements, erreurs JS). */
const fs = require('fs'), path = require('path');
module.exports = async function ({ L, browser, base }) {
  const WWW = L.WWW, real = path.join(WWW, 'data', 'engrais.js'), fix = path.join(__dirname, 'fixtures-engrais.js');
  const hasReal = fs.existsSync(real), dataSrc = fs.readFileSync(hasReal ? real : fix, 'utf8');
  console.log('   données : ' + (hasReal ? 'vrai fichier data/engrais.js' : 'fixture de 8 entrées'));
  const clean = (p) => p.errors.filter((e) => !/script-src/.test(e));
  const mk = async (dev, scale) => {
    const p = await L.newPage(browser, base, dev);
    await L.skipOnboarding(p);
    /* le coordinateur branche index.html : ici on injecte css, données et script si absents */
    await p.evaluate(async (src, css, js) => {
      if (!T.engrais) {
        const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = css; document.head.appendChild(l);
        if (!(window.TIFA_DATA && window.TIFA_DATA.engrais)) { const s = document.createElement('script'); s.textContent = src; document.head.appendChild(s); }
        await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = js; s.onload = ok; s.onerror = () => ko(new Error('js')); document.head.appendChild(s); });
      }
    }, dataSrc, 'css/m-engrais.css', 'js/engrais.js');
    if (scale && scale !== 1) await p.evaluate((s) => { T.store.s.settings.scale = s; T.applyDisplay(); }, scale);
    return p;
  };
  const go = async (p, h) => { await p.evaluate((h) => { location.hash = h; }, h); await L.sleep(250); };
  const tap = async (p, sel) => { const e = await p.$(sel); if (!e) throw new Error('introuvable : ' + sel); await e.tap(); await L.sleep(200); };
  const text = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return e ? e.innerText : null; }, sel);
  const PIX = 'Pixel 8 (Android 14)';

  let p = await mk(PIX);
  /* ----- données ----- */
  const D = await p.evaluate(() => {
    const o = { n: 0, bad: [], emoji: [], types: {} }, seen = {};
    const emo = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{27BF}\u{2900}-\u{297F}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]|\p{Extended_Pictographic}/u;
    const E = T.engrais.all(); o.n = E.length;
    E.forEach((e) => {
      if (seen[e.id]) o.bad.push('doublon ' + e.id); seen[e.id] = 1;
      if (!/^[a-z0-9-]+$/.test(e.id)) o.bad.push('id ' + e.id);
      if (['naturel', 'maison', 'eviter'].indexOf(e.type) < 0) o.bad.push(e.id + ' type'); o.types[e.type] = (o.types[e.type] || 0) + 1;
      if (['etabli', 'courant', 'discute', 'mythe'].indexOf(e.niveau_preuve) < 0) o.bad.push(e.id + ' preuve');
      if (!e.nom || !e.resume_court) o.bad.push(e.id + ' texte vide');
      (e.ids_plantes_bien || []).forEach((i) => { if (!T.plante(i)) o.bad.push(e.id + ' plante inconnue ' + i); });
      if (emo.test(JSON.stringify(e))) o.emoji.push(e.id);
    });
    return o;
  });
  L.check('engrais : données valides (' + D.n + ' fiches)', D.n >= 8 && D.bad.length === 0, D.bad.slice(0, 5).join(' | '));
  L.check('engrais : aucun emoji dans les données', D.emoji.length === 0, D.emoji.join(','));
  if (hasReal) L.check('engrais : au moins 32 fiches et les 3 types', D.n >= 32 && D.types.naturel > 0 && D.types.maison > 0 && D.types.eviter > 0, JSON.stringify(D.types));
  L.check('engrais : API all/get/search/pourPlante', await p.evaluate(() => ['all', 'get', 'search', 'pourPlante'].every((k) => typeof T.engrais[k] === 'function')));
  L.check('engrais : get inconnu -> null', await p.evaluate(() => T.engrais.get('zzz') === null && T.engrais.get(null) === null && T.engrais.get(undefined) === null));

  /* ----- recherche ----- */
  const S = (q) => p.evaluate((q) => T.engrais.search(q), q);
  const first = await p.evaluate(() => T.engrais.all()[0]);
  const w = first.nom.split(/\s+/).filter((x) => x.length > 3)[0] || first.nom;
  let r = await S(w.toUpperCase());
  L.check('recherche : un nom de fiche (majuscules) la trouve (« ' + w + ' »)', r.some((x) => x.id === first.id));
  r = await S(first.nom.normalize('NFD').replace(/[̀-ͯ]/g, ''));
  L.check('recherche : sans accents', r.some((x) => x.id === first.id));
  L.check('recherche : vide, espaces, null, absurde -> liste vide sans erreur', (await S('')).length === 0 && (await S('   ')).length === 0 && (await S(null)).length === 0 && (await S('zzxqwv')).length === 0 && (await S('!!??')).length === 0);
  L.check('recherche : texte très long accepté', await p.evaluate(() => Array.isArray(T.engrais.search('café '.repeat(300)))));
  L.check('recherche : tri décroissant', await p.evaluate(() => { const r = T.engrais.search('terre'); return r.every((x, i) => !i || r[i - 1].score >= x.score); }));

  /* ----- par plante ----- */
  const PP = await p.evaluate(() => {
    const out = { inc: T.engrais.pourPlante('inconnue'), nul: T.engrais.pourPlante(null), coh: [] };
    T.D.plantes.forEach((pl) => {
      const r = T.engrais.pourPlante(pl.id), ids = r.bien.map((x) => x.id), ev = r.eviter.map((x) => x.id);
      if (ids.some((i) => ev.indexOf(i) >= 0)) out.coh.push(pl.id + ' à la fois bien et à éviter');
      r.bien.forEach((b) => { const e = T.engrais.get(b.id); if (e.type === 'eviter') out.coh.push(pl.id + ' bien=' + b.id + ' est de type eviter'); if ((e.ids_plantes_eviter || []).some((x) => x === pl.id || x === pl.categorie)) out.coh.push(pl.id + ' bien=' + b.id + ' mais exclu'); });
    });
    return out;
  });
  L.check('par plante : plante inconnue / null -> listes vides', PP.inc.bien.length === 0 && PP.inc.eviter.length === 0 && PP.nul.bien.length === 0);
  L.check('par plante : cohérence sur toutes les plantes (jamais à la fois bien et à éviter)', PP.coh.length === 0, PP.coh.slice(0, 4).join(' | '));
  if (!hasReal) {
    const t = await p.evaluate(() => ({ tom: T.engrais.pourPlante('tomate'), men: T.engrais.pourPlante('menthe'), tc: T.engrais.pourPlante('tomate-cerise') }));
    L.check('par plante (fixture) : tomate -> marc de café bien (précis), purin ortie bien', t.tom.bien.some((x) => x.id === 'marc-de-cafe') && t.tom.bien.some((x) => x.id === 'purin-ortie'));
    L.check('par plante (fixture) : menthe -> marc de café et purin d\'ortie à éviter, mythes à éviter', t.men.eviter.some((x) => x.id === 'marc-de-cafe' && x.precis && /Semis/.test(x.raison)) && t.men.eviter.some((x) => x.id === 'purin-ortie') && t.men.eviter.some((x) => x.id === 'aspirine' && !x.precis) && !t.men.bien.some((x) => x.id === 'marc-de-cafe'));
    L.check('par plante (fixture) : paillage « toutes » et choix précis en premier', t.tc.bien[0].id === 'paillage-paille' && t.tc.bien[0].precis === true);
  }

  /* ----- écrans ----- */
  await go(p, '#/engrais');
  const home = await text(p, '#view');
  L.check('accueil : titre et 3 grandes entrées', /Engrais et astuces maison/.test(home) && /Engrais naturels/.test(home) && /À fabriquer chez soi/.test(home) && /Idées reçues et à éviter/.test(home));
  L.check('accueil : recherche et « Pour ma plante »', !!(await p.$('#en-q')) && !!(await p.$('#en-pl')) && /Pour ma plante/.test(home));
  await p.type('#en-q', w);
  await L.sleep(250);
  L.check('accueil : la saisie affiche des résultats', (await p.$$('#en-res a.en-item')).length >= 1);
  await p.evaluate(() => { const i = document.getElementById('en-q'); i.value = 'zzxqwv'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  L.check('accueil : aucun résultat -> message clair', /Aucun résultat/.test(await text(p, '#en-res')));
  /* plante choisie dans la liste */
  await p.select('#en-pl', 'tomate'); await L.sleep(250);
  L.check('accueil : choisir une plante affiche « Ce qui lui convient » et « À éviter pour elle »', /Pour : Tomate/.test(await text(p, '#en-pp')) && /Ce qui lui convient/.test(await text(p, '#en-pp')) && /À éviter pour elle/.test(await text(p, '#en-pp')));
  /* plante de MES pots */
  await p.evaluate(() => { T.store.s.pots = [{ id: 'p1', plantId: 'menthe', nom: 'Menthe', zone: 'mi_ombre' }, { id: 'p2', plantId: 'menthe', nom: 'Menthe', zone: 'mi_ombre' }]; T.store.save(); });
  await go(p, '#/engrais-liste/naturel'); await go(p, '#/engrais');
  const grp = await p.evaluate(() => { const g = document.querySelector('#en-pl optgroup'); return g ? g.label + ':' + g.children.length : ''; });
  L.check('accueil : groupe « Mes plantes » (sans doublon) construit depuis mes pots', grp === 'Mes plantes:1', grp);
  await p.evaluate(() => { T.store.s.pots = []; T.store.save(); });
  /* listes */
  await tap(p, 'a[href="#/engrais-liste/naturel"]');
  L.check('liste : ouverture par toucher', /#\/engrais-liste\/naturel/.test(await p.evaluate(() => location.hash)) && (await p.$$('a.en-item')).length >= 1);
  await go(p, '#/engrais-liste/nimportequoi');
  L.check('liste : type inconnu -> pas d\'écran vide', (await text(p, '#view') || '').length > 5);
  /* fiche */
  const rich = await p.evaluate(() => { const e = T.engrais.all().filter((x) => x.danger && x.comment && x.comment.length)[0] || T.engrais.all()[0]; return e.id; });
  await go(p, '#/engrais/' + rich);
  const f = await text(p, '#view');
  const e = await p.evaluate((id) => T.engrais.get(id), rich);
  L.check('fiche : nom, résumé, comment faire, dose, quand', f.indexOf(e.nom) >= 0 && f.indexOf(e.resume_court) >= 0 && /Comment faire/.test(f) && /Quelle quantité/.test(f) && /Quand \?/.test(f));
  L.check('fiche : danger en encadré visible avec « Attention »', !e.danger || (await p.evaluate(() => { const d = document.querySelector('.en-danger'); if (!d) return false; const r = d.getBoundingClientRect(); return /Attention/.test(d.innerText) && r.width > 0 && !!d.querySelector('svg'); })));
  L.check('fiche : niveau de preuve en mot ET en forme SVG', await p.evaluate(() => { const b = document.querySelector('.en-head .en-pr'); return !!b && !!b.querySelector('svg.en-shape') && b.innerText.trim().length > 3; }));
  L.check('fiche : bouton Écouter', !!(await p.$('[data-act="speak"]')));
  L.check('fiche : « En savoir plus » repliable', await p.evaluate(() => { const d = document.querySelector('details.en-more'); if (!d) return !T.engrais.get(location.hash.split('/').pop()).en_detail.length; const o = d.open; d.querySelector('summary').click(); return d.open !== o; }));
  L.check('fiche : liens externes avec rel noopener, uniquement http(s)', await p.evaluate(() => { const a = [...document.querySelectorAll('.en-src a')]; return a.every((x) => /noopener/.test(x.rel) && x.target === '_blank' && /^https?:/.test(x.href)); }));
  if (!hasReal) L.check('fiche (fixture) : lien javascript: refusé', await p.evaluate(async () => { location.hash = '#/engrais/purin-ortie'; await new Promise((r) => setTimeout(r, 300)); const a = [...document.querySelectorAll('.en-src a')]; return a.length === 1 && !/javascript/.test(a[0].href); }));
  await go(p, '#/engrais/idinconnu');
  L.check('fiche : id inconnu -> message + retour', /introuvable/.test(await text(p, '#view')) && !!(await p.$('a[href="#/engrais"]')));
  /* hors connexion */
  await p.setOfflineMode(true);
  await p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }); });
  await go(p, '#/engrais/' + rich);
  L.check('fiche : message hors connexion quand il y a des liens', !e.sources || !e.sources.length || /pas connecté/.test(await text(p, '#view')));
  await p.setOfflineMode(false);
  /* voix */
  await p.evaluate(() => { window.__sp = []; T.voice.speak = function (t) { window.__sp.push(String(t)); return Promise.resolve(true); }; });
  await go(p, '#/engrais/' + rich); await tap(p, '[data-act="speak"]');
  const sp = await p.evaluate(() => window.__sp.join(' '));
  L.check('voix : lit le nom, le résumé et le danger', sp.indexOf(e.nom) >= 0 && sp.indexOf(e.resume_court) >= 0 && (!e.danger || sp.indexOf(e.danger) >= 0));
  /* Feuille absente ou cassée */
  await p.evaluate(() => { window.__t = T.feuille; T.feuille = { say() { throw new Error('boum'); } }; });
  await go(p, '#/engrais/' + rich);
  L.check('Feuille qui plante : la fiche s\'affiche quand même', (await text(p, '#view')).indexOf(e.nom) >= 0);
  await p.evaluate(() => { delete T.feuille; });
  await go(p, '#/engrais/' + rich);
  L.check('Feuille absente : la fiche s\'affiche', (await text(p, '#view')).indexOf(e.nom) >= 0);
  /* données absentes */
  await p.evaluate(() => { window.__d = T.D.engrais; T.D.engrais = undefined; });
  await go(p, '#/engrais');
  L.check('données absentes : message, pas d\'écran vide', /pas disponibles/.test(await text(p, '#view')) && !(await p.$('.en-big')));
  await p.evaluate(() => { T.D.engrais = window.__d; });

  /* fiche plante */
  await go(p, '#/plante/tomate');
  L.check('fiche plante : carte « Engrais et astuces pour cette plante » (3 max) + « Tout voir »', await p.evaluate(() => { const c = document.querySelector('.en-card'); return !!c && c.querySelectorAll('.en-chip:not(.en-chip-bad)').length <= 3 && /Tout voir/.test(c.textContent); }));
  await p.evaluate(() => { const h = document.querySelector('.en-card .fold-head'); if (h) h.click(); }); await L.sleep(200);
  await tap(p, '.en-card a.btn');
  L.check('fiche plante : « Tout voir » ouvre la liste complète', /engrais-plante\/tomate/.test(await p.evaluate(() => location.hash)) && /Pour : Tomate/.test(await text(p, '#view')));
  await go(p, '#/engrais-plante/zzz');
  L.check('engrais-plante : plante inconnue -> message', /introuvable/.test(await text(p, '#view')));
  await go(p, '#/plante/cactus-inconnu');
  L.check('0 erreur JS (écrans principaux)', clean(p).length === 0, clean(p).join(' | '));

  /* ----- profils, 200 %, 280 px ----- */
  const profils = [[PIX, 1], ['Samsung Galaxy S24 (Android 15)', 1.5], ['Samsung Tab A9 tablette (Android 14)', 1], ['Samsung Z Fold (plié, Android 14)', 2]];
  for (const [dev, sc] of profils) {
    const q = await mk(dev, sc);
    const label = dev + ' x' + sc;
    const pages = ['#/engrais', '#/engrais-liste/naturel', '#/engrais-liste/maison', '#/engrais-liste/eviter', '#/engrais-plante/tomate', '#/plante/tomate'].concat(await q.evaluate(() => T.engrais.all().slice(0, 12).map((e) => '#/engrais/' + e.id)));
    const bad = [];
    for (const h of pages) {
      await go(q, h);
      if (h === '#/engrais') { await q.select('#en-pl', 'tomate'); await L.sleep(150); await q.evaluate(() => { const i = document.getElementById('en-q'); i.value = 'terre'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await L.sleep(150); }
      if (/#\/engrais\//.test(h)) await q.evaluate(() => { const d = document.querySelector('details.en-more'); if (d) d.open = true; });
      const o = await L.overflow(q); if (o.length) bad.push(h + ' : ' + o[0]);
      const small = await q.evaluate(() => [...document.querySelectorAll('#view a.btn, #view button, #view a.en-chip, #view a.en-link, #view summary, #view select, #view input')].filter((el) => { const r = el.getBoundingClientRect(); return r.width && r.height < 43; }).length);
      if (small) bad.push(h + ' : ' + small + ' zone(s) de toucher < 44 px');
    }
    L.check('affichage ' + label + ' : aucun débordement, boutons >= 44 px (' + pages.length + ' écrans)', bad.length === 0, bad.slice(0, 3).join(' | '));
    L.check('affichage ' + label + ' : 0 erreur JS', clean(q).length === 0, clean(q).join(' | '));
    await q.close();
  }
  await p.close();
};
