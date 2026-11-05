/* Domaine : bouton « Un souci ? » (signalement depuis la page courante, envoi en cascade). */
module.exports = async function ({ L, browser, base }) {
  const clean = (p) => p.errors.filter((e) => !/script-src|Failed to load resource/.test(e));
  const go = async (p, h) => { await p.evaluate((h) => { location.hash = h; }, h); await L.sleep(300); };
  const act = async (p, sel) => { await p.evaluate((s) => document.querySelector(s).click(), sel); await L.sleep(350); };
  for (const [dev, sc] of [['Pixel 8 (Android 14)', 1], ['Samsung Z Fold (plié, Android 14)', 2], ['Galaxy A12 (Android 11)', 1]]) {
    const p = await L.newPage(browser, base, dev);
    await L.skipOnboarding(p);
    if (sc !== 1) await p.evaluate((s) => { T.store.s.settings.scale = s; T.applyDisplay(); }, sc);
    await p.setRequestInterception(true);
    const net = { mode: 'ok', posts: [] };
    p.on('request', (rq) => {
      if (rq.url().startsWith('https://feedback.test/')) { const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }; if (rq.method() === 'OPTIONS') return rq.respond({ status: 204, headers: H }); net.posts.push(rq.postData()); return net.mode === 'ok' ? rq.respond({ status: 200, body: '{}', headers: H }) : rq.respond({ status: 500, body: 'x', headers: H }); }
      rq.continue();
    });
    const routes = ['#/accueil', '#/trouver', '#/pots', '#/conseils', '#/plus', '#/plante/tomate', '#/maladie', '#/dossier', '#/engrais', '#/insectes', '#/assiette', '#/gestes', '#/labo', '#/calculs', '#/photo', '#/photo/precise', '#/signalements'];
    let miss = [], ovl = [];
    for (const r of routes) {
      await go(p, r);
      const o = await p.evaluate(() => {
        const b = document.getElementById('sg-btn'); if (!b) return { none: true };
        const q = b.getBoundingClientRect(), v = document.getElementById('view').getBoundingClientRect();
        return { w: q.width, h: q.height, onScreen: q.left >= 0 && q.right <= innerWidth && q.top >= 0 && q.bottom <= innerHeight, overTabs: q.bottom > v.top + 1 };
      });
      if (o.none || o.w < 44 || o.h < 44 || !o.onScreen) miss.push(r + JSON.stringify(o));
      if (o.overTabs) ovl.push(r);
    }
    L.check(dev + ' bouton « ? » présent (>= 44 px, dans l\'écran) sur ' + routes.length + ' pages ' + miss.slice(0, 3).join(' '), miss.length === 0);
    L.check(dev + ' le bouton ne recouvre pas le contenu de la page ' + ovl.join(','), ovl.length === 0);
    L.check(dev + ' aucun débordement avec le bouton', (await L.overflow(p)).length === 0);
    /* page courante dans la fenêtre */
    await go(p, '#/plante/tomate'); await act(p, '#sg-btn');
    let t = await p.evaluate(() => document.querySelector('.modal') ? document.querySelector('.modal').innerText : '');
    L.check(dev + ' la fenêtre indique la page concernée (fiche tomate)', /Page concernée/.test(t) && /omate/i.test(t));
    L.check(dev + ' boutons Envoyer et Annuler visibles dans l\'écran', await p.evaluate(() => [...document.querySelectorAll('.modal [data-mbtn]')].every((b) => { const q = b.getBoundingClientRect(); return q.bottom <= innerHeight + 1 && q.top >= 0; })));
    /* texte vide refusé */
    await p.evaluate(() => { document.querySelectorAll('.modal [data-mbtn]')[0].click(); }); await L.sleep(250);
    L.check(dev + ' texte vide refusé, fenêtre toujours ouverte', await p.evaluate(() => !!document.querySelector('.modal textarea')) && (await p.evaluate(() => (T.store.s.signalements || []).length)) === 0);
    /* choix du type + saisie conservée */
    await p.evaluate(() => { document.getElementById('sg-texte').value = 'La dose est fausse'; }); await act(p, '.sg-types .chip:nth-child(2)');
    L.check(dev + ' changer de type garde le texte écrit', await p.evaluate(() => document.getElementById('sg-texte').value === 'La dose est fausse'));
    await act(p, '.sg-types .chip:nth-child(1)');
    L.check(dev + ' champ « ce qui serait juste » pour une info fausse', await p.evaluate(() => !!document.getElementById('sg-corr')));
    /* envoi sans adresse configurée -> copie */
    await p.evaluate(() => { window.__copied = ''; Object.defineProperty(navigator, 'clipboard', { value: { writeText: (x) => { window.__copied = x; return Promise.resolve(); } }, configurable: true }); try { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); } catch (e) {} });
    await p.evaluate(() => { document.getElementById('sg-corr').value = 'Plutôt 5 g'; document.querySelectorAll('.modal [data-mbtn]')[0].click(); }); await L.sleep(700);
    const cp = await p.evaluate(() => window.__copied);
    L.check(dev + ' sans adresse configurée : message copié avec la page et le texte', /Page : .*\/plante\/tomate/.test(cp) && /La dose est fausse/.test(cp) && /Plutôt 5 g/.test(cp));
    L.check(dev + ' le message copié ne contient aucune info personnelle (pas d\'adresse mail)', !/@/.test(cp));
    L.check(dev + ' remerciement affiché + signalement enregistré', await p.evaluate(() => /Merci/.test(document.querySelector('.modal').innerText) && T.store.s.signalements.length === 1));
    await p.evaluate(() => [...document.querySelectorAll('.modal [data-mbtn]')].pop().click()); await L.sleep(250);
    /* mail configuré -> mailto */
    await p.evaluate(() => { window.TIFA_FEEDBACK.email = 'support@exemple.test'; window.__mail = ''; document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href^="mailto:"]'); if (a) { window.__mail = a.href; e.preventDefault(); } }, true); });
    await act(p, '#sg-btn'); await p.evaluate(() => { document.getElementById('sg-texte').value = 'Texte coupé ici'; document.querySelectorAll('.modal [data-mbtn]')[0].click(); }); await L.sleep(700);
    const ml = await p.evaluate(() => decodeURIComponent(window.__mail));
    L.check(dev + ' adresse configurée : mail pré-rempli (objet, page, texte)', /^mailto:support@exemple\.test\?subject=/.test(ml) && /Texte coupé ici/.test(ml) && /tomate/i.test(ml));
    L.check(dev + ' après un envoi par mail : bouton « Copier le message » proposé', await p.evaluate(() => [...document.querySelectorAll('.modal [data-mbtn]')].some((b) => /Copier le message/.test(b.textContent))));
    await p.evaluate(() => [...document.querySelectorAll('.modal [data-mbtn]')].pop().click()); await L.sleep(250);
    /* service configuré : succès puis panne -> repli */
    await p.evaluate(() => { window.TIFA_FEEDBACK.endpoint = 'https://feedback.test/r'; window.__mail = ''; });
    net.mode = 'ok'; await act(p, '#sg-btn'); await p.evaluate(() => { document.getElementById('sg-texte').value = 'Via service'; document.querySelectorAll('.modal [data-mbtn]')[0].click(); }); await L.sleep(900);
    L.check(dev + ' service configuré : envoyé sans ouvrir le mail', net.posts.length === 1 && /Via service/.test(net.posts[0]) && !(await p.evaluate(() => window.__mail)) && (await p.evaluate(() => T.store.s.signalements[0].status)) === 'envoye');
    await p.evaluate(() => [...document.querySelectorAll('.modal [data-mbtn]')].pop().click()); await L.sleep(250);
    net.mode = '500'; await act(p, '#sg-btn'); await p.evaluate(() => { document.getElementById('sg-texte').value = 'Service en panne'; document.querySelectorAll('.modal [data-mbtn]')[0].click(); }); await L.sleep(900);
    L.check(dev + ' service en panne : repli sur le mail, rien de perdu', /Service en panne/.test(await p.evaluate(() => decodeURIComponent(window.__mail))) && (await p.evaluate(() => T.store.s.signalements[0].status)) === 'prepare');
    await p.evaluate(() => [...document.querySelectorAll('.modal [data-mbtn]')].pop().click()); await L.sleep(250);
    /* hors connexion : service ignoré */
    /* page Mes signalements */
    await go(p, '#/signalements');
    t = await p.evaluate(() => document.getElementById('view').innerText);
    L.check(dev + ' « Mes signalements » liste les 4 signalements avec leur page', (t.match(/Renvoyer|Message préparé|Envoyé/g) || []).length >= 4 && /omate/i.test(t));
    await act(p, '[data-act="sgresend"]');
    L.check(dev + ' « Renvoyer » refait l\'envoi', await p.evaluate(() => !!window.__mail));
    L.check(dev + ' aucun débordement sur Mes signalements', (await L.overflow(p)).length === 0);
    await act(p, '[data-act="sgclear"]'); await p.evaluate(() => { const b = [...document.querySelectorAll('.modal [data-mbtn]')].pop(); b.click(); }); await L.sleep(300);
    L.check(dev + ' « Tout effacer » vide la liste', await p.evaluate(() => T.store.s.signalements.length === 0));
    /* erreurs automatiques */
    await p.evaluate(() => { setTimeout(() => { throw new Error('boum test'); }, 0); }); await L.sleep(300);
    L.check(dev + ' une erreur du programme est consignée localement', await p.evaluate(() => (T.store.s.erreursAuto || []).length > 0));
    p.errors = p.errors.filter((e) => !/boum test/.test(e));
    L.check(dev + ' 0 erreur JS ' + clean(p).slice(0, 2).join('|'), clean(p).length === 0);
    await p.close();
  }
};
