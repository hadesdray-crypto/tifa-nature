/* Feuille, le personnage compagnon : affichage, rangement, déplacement tactile, bulle et voix (simulée), niveaux, heures calmes,
   genre, accessoires, alertes, aide sur chaque écran, mode enfant, débordements sur 4 profils, fenêtres, aucune erreur JS. */
module.exports = async function ({ L, browser, base }) {
  const PIX = 'Pixel 8 (Android 14)';
  const clean = (p) => p.errors.filter((e) => !/script-src/.test(e));
  /* page prête : visite déjà faite, bonjour déjà dit, voix simulée qui compte les appels */
  async function fresh(dev, setup, opts) {
    let p = await L.newPage(browser, base, dev, opts);
    await L.skipOnboarding(p, true);
    await p.evaluate((s) => { T.store.s.feuille = Object.assign({ tourDone: true, lastGreet: (function () { const d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); })() }, s || {}); T.store.save(); }, setup);
    await p.reload({ waitUntil: 'load' }); await p.waitForFunction('window.__TIFA_STARTED === true');
    await p.waitForFunction('T.feuille && T.feuille.state().ready', { timeout: 8000 });
    await mock(p);
    return p;
  }
  async function mock(p) { await p.evaluate(() => { window.__sp = []; window.__hs = []; window.addEventListener('hashchange', (e) => window.__hs.push(e.newURL.split('#')[1])); T.voice.speak = function (t, o) { window.__sp.push({ t: t, o: o }); return Promise.resolve(true); }; T.voice.available = function () { return true; }; T.voice.stop = function () {}; }); }
  async function reload(p) { await p.reload({ waitUntil: 'load' }); await p.waitForFunction('window.__TIFA_STARTED === true'); await p.waitForFunction('T.feuille && T.feuille.state().ready'); await mock(p); }
  const st = (p) => p.evaluate(() => T.feuille.state());
  const spoken = (p) => p.evaluate(() => window.__sp.length);
  const go = async (p, h) => { await p.evaluate((h) => { location.hash = h; }, h); await L.sleep(300); };
  const rectOf = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, vis: cs.visibility !== 'hidden' && cs.display !== 'none' }; }, sel);
  const tabsTop = (p) => p.evaluate(() => document.getElementById('tabs').getBoundingClientRect().top);
  const tapAt = async (p, x, y) => { await p.touchscreen.tap(x, y); await L.sleep(450); };
  const tapFeuille = async (p) => { const r = await rectOf(p, '#feuille'); await tapAt(p, r.l + r.w / 2, r.t + r.h / 2); };
  const inScreen = (r, W, H) => r && r.l >= -1 && r.t >= -1 && r.r <= W + 1 && r.b <= H + 1;

  /* ================= AFFICHAGE, HUMEURS, YEUX ================= */
  let p = await fresh(PIX);
  const vp = await p.evaluate(() => ({ W: innerWidth, H: innerHeight }));
  let r = await rectOf(p, '#feuille'), tt = await tabsTop(p);
  L.check('affichage : Feuille visible par défaut, dans l\'écran', r && r.vis && inScreen(r, vp.W, vp.H), JSON.stringify(r));
  L.check('affichage : jamais derrière la barre du bas', r.b <= tt + 0.5, r.b + ' > ' + tt);
  L.check('affichage : visage dessiné en SVG (yeux, bouche, feuille)', await p.evaluate(() => { const s = document.querySelector('#feuille svg'); return !!s && s.querySelectorAll('.fe-eo').length === 2 && !!s.querySelector('.fe-mo') && s.querySelectorAll('.fe-brl,.fe-brr').length === 2; }));
  L.check('affichage : zone de toucher >= 44 px', r.w >= 44 && r.h >= 44);
  L.check('affichage : aucun emoji dans le DOM de Feuille', await p.evaluate(() => !/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.getElementById('feuille').outerHTML + document.querySelector('.fe-pill').outerHTML)));
  const moods = ['doux', 'joie', 'surprise', 'pense', 'ecoute', 'desole', 'fier'];
  const seen = [];
  for (const m of moods) { await p.evaluate((m) => T.feuille.say('Test', m), m); seen.push(await p.evaluate(() => document.querySelector('#feuille svg').getAttribute('data-mood') + '|' + document.querySelector('#feuille .fe-mo').getAttribute('d'))); }
  L.check('humeurs : 7 humeurs donnent 7 bouches différentes', new Set(seen.map((s) => s.split('|')[1])).size === 7 && seen.every((s, i) => s.split('|')[0] === moods[i]), seen.join(' ; '));
  await p.evaluate(() => { T.feuille.say('Test', 'dort'); });
  L.check('humeurs : « dort » (yeux fermés)', await p.evaluate(() => document.querySelector('#feuille svg').getAttribute('data-eyes') === 'closed' && document.querySelectorAll('#feuille .fe-ea')[0].getAttribute('d').length > 3));
  L.check('humeurs : humeur inconnue retombe sur « doux »', await p.evaluate(() => { T.feuille.say('Test', 'zzz'); return document.querySelector('#feuille svg').getAttribute('data-mood') === 'doux'; }));
  /* les yeux suivent le doigt */
  const lookAt = (x, y) => p.evaluate((x, y) => { window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y })); return new Promise((res) => setTimeout(() => { const s = document.querySelector('#feuille svg'); res([parseFloat(s.style.getPropertyValue('--lx')), parseFloat(s.style.getPropertyValue('--ly'))]); }, 120)); }, x, y);
  const cy = r.t + r.h / 2, lL = await lookAt(2, cy), lU = await lookAt(r.l + r.w / 2, 100);
  L.check('yeux : suivent le doigt (à gauche, puis en haut)', lL[0] < -0.5 && lU[1] < -0.5, JSON.stringify([lL, lU]));
  const lD = await lookAt(r.l + r.w / 2, vp.H - 1);
  L.check('yeux : regardent en bas quand le doigt est en bas', lD[1] > 0.3, JSON.stringify(lD));
  L.check('yeux : clignent (classe temporaire)', await p.evaluate(() => new Promise((res) => { const s = document.querySelector('#feuille svg'); let hit = false; const mo = new MutationObserver(() => { if (s.classList.contains('blink')) hit = true; }); mo.observe(s, { attributes: true }); setTimeout(() => { mo.disconnect(); res(hit); }, 7000); })));

  /* ================= RANGER / RAPPELER ================= */
  await p.evaluate(() => T.feuille.hide());
  r = await rectOf(p, '#feuille'); let pr = await rectOf(p, '.fe-pill'); tt = await tabsTop(p);
  L.check('ranger : Feuille cachée, petit bouton « Feuille » visible', !r.vis && pr.vis && !(await p.evaluate(() => T.feuille.isOn())));
  L.check('ranger : le bouton est dans l\'écran, >= 44 px, jamais derrière la barre du bas', inScreen(pr, vp.W, vp.H) && pr.h >= 44 && pr.w >= 44 && pr.b <= tt + 0.5, JSON.stringify(pr) + ' tabs ' + tt);
  L.check('ranger : le bouton porte une étiquette lisible', await p.evaluate(() => /Feuille/.test(document.querySelector('.fe-pill').textContent) && /Rappeler/.test(document.querySelector('.fe-pill').getAttribute('aria-label'))));
  L.check('ranger : choix mémorisé après rechargement', await (async () => { await reload(p); return !(await p.evaluate(() => T.feuille.isOn())) && (await rectOf(p, '.fe-pill')).vis; })());
  pr = await rectOf(p, '.fe-pill'); await tapAt(p, pr.l + pr.w / 2, pr.t + pr.h / 2);
  L.check('rappeler : toucher le bouton rappelle Feuille', (await st(p)).on && (await rectOf(p, '#feuille')).vis && !(await rectOf(p, '.fe-pill')).vis);
  L.check('rappeler : elle dit « Me revoilà »', /Me revoilà/.test((await st(p)).bubble));

  /* ================= MENU ================= */
  await p.evaluate(() => { window.__sp = []; });
  const hl0 = await p.evaluate(() => history.length);
  await tapFeuille(p);
  let ms = await st(p);
  L.check('menu : un toucher ouvre le menu', ms.menu);
  const items = await p.evaluate(() => Array.from(document.querySelectorAll('.fe-menu .fe-it')).map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), h: r.height, ok: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight }; }));
  const want = ['Aide sur cette page', 'Que faire aujourd\'hui ?', 'Poser une question', 'Gestes du jardinier', 'Musique', 'Écouter la plante', 'Changer sa voix', 'Mes réglages Feuille', 'Refaire la visite', 'Me ranger'];
  L.check('menu : 10 puces étiquetées comme demandé', JSON.stringify(items.map((i) => i.t)) === JSON.stringify(want), JSON.stringify(items.map((i) => i.t)));
  L.check('menu : toutes les puces >= 44 px et visibles à l\'écran', items.every((i) => i.h >= 44 && i.ok), JSON.stringify(items.filter((i) => i.h < 44 || !i.ok)));
  const fx = await rectOf(p, '.fe-x');
  L.check('menu : bouton « Fermer » visible', fx && fx.h >= 44 && inScreen(fx, vp.W, vp.H));
  L.check('menu : ouvrir le menu n\'ajoute rien à l\'historique (le Retour Android reste celui de l\'appli)', (await p.evaluate(() => history.length)) === hl0);
  L.check('menu : sans débordement', (await L.overflow(p)).length === 0);
  await p.click('.fe-x'); await L.sleep(150);
  L.check('menu : « Fermer » le ferme', !(await st(p)).menu);
  await tapFeuille(p); await L.sleep(450); await p.mouse.click(5, 120); await L.sleep(200);
  L.check('menu : toucher le voile le ferme', !(await st(p)).menu);
  await tapFeuille(p);
  const navs = [['ask', '#/assistant'], ['gestes', '#/gestes'], ['musique', '#/musique'], ['labo', '#/labo'], ['reglages', '#/feuille'], ['voix', '#/reglages']];
  for (const [k, h] of navs) {
    if (!(await st(p)).menu) await tapFeuille(p);
    await p.click('.fe-it[data-fe="' + k + '"]'); await L.sleep(450);
    L.check('menu : « ' + want[['aide', 'today', 'ask', 'gestes', 'musique', 'labo', 'voix', 'reglages', 'visite', 'ranger'].indexOf(k)] + ' » ouvre ' + h, (await p.evaluate((h) => window.__hs.some((x) => x.indexOf(h.slice(1)) === 0) || location.hash.indexOf(h) === 0, h)) && !(await st(p)).menu, await p.evaluate(() => JSON.stringify(window.__hs)));
  }
  await go(p, '#/pots');
  await tapFeuille(p); await p.click('.fe-it[data-fe="aide"]'); await L.sleep(500);
  let s2 = await st(p);
  L.check('menu : « Aide sur cette page » explique l\'écran Mes pots dans la bulle', /Mes pots/.test(s2.bubble) && /J'ai arrosé/.test(s2.bubble), s2.bubble.slice(0, 80));
  L.check('menu : l\'aide est dite à voix haute', (await spoken(p)) >= 1);
  await p.evaluate(() => { T.feuille.help(); });
  L.check('aide : bulle avec bouton « Merci » visible dans l\'écran', await p.evaluate(() => { const b = document.querySelector('.fe-bb'); if (!b) return false; const r = b.getBoundingClientRect(); return r.height >= 44 && r.bottom <= innerHeight && r.top >= 0; }));
  await p.evaluate(() => { document.querySelector('.fe-bb').click(); });
  L.check('aide : « Merci » range la bulle', !(await st(p)).bubble);
  await p.evaluate(() => { window.__sp = []; });
  await tapFeuille(p); await p.click('.fe-it[data-fe="ranger"]'); await L.sleep(2400);
  L.check('menu : « Me ranger » range Feuille', !(await st(p)).on && (await rectOf(p, '.fe-pill')).vis);
  await p.evaluate(() => T.feuille.show());

  /* ================= DÉPLACEMENT TACTILE ================= */
  const drag = async (x0, y0, x1, y1) => { await p.touchscreen.touchStart(x0, y0); for (let i = 1; i <= 8; i++) { await p.touchscreen.touchMove(x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); } await p.touchscreen.touchEnd(); await L.sleep(300); };
  await go(p, '#/accueil'); await p.evaluate(() => T.feuille.closeMenu());
  r = await rectOf(p, '#feuille'); const c0 = { x: r.l + r.w / 2, y: r.t + r.h / 2 };
  await drag(c0.x, c0.y, 120, 300);
  r = await rectOf(p, '#feuille');
  L.check('déplacement : glisser le doigt déplace Feuille', Math.abs(r.l + r.w / 2 - 120) < 25 && Math.abs(r.t + r.h / 2 - 300) < 25, JSON.stringify(r));
  L.check('déplacement : un glissement n\'ouvre pas le menu', !(await st(p)).menu);
  let beforeSave = await rectOf(p, '#feuille');
  await reload(p); await L.sleep(300);
  r = await rectOf(p, '#feuille');
  L.check('déplacement : position conservée après rechargement', Math.abs(r.l - beforeSave.l) < 2 && Math.abs(r.t - beforeSave.t) < 2, JSON.stringify([beforeSave, r]));
  r = await rectOf(p, '#feuille'); await drag(r.l + r.w / 2, r.t + r.h / 2, vp.W + 40, vp.H + 60);
  r = await rectOf(p, '#feuille'); tt = await tabsTop(p);
  L.check('déplacement : jamais hors écran à droite/en bas, ni derrière la barre du bas', inScreen(r, vp.W, vp.H) && r.b <= tt + 0.5, JSON.stringify(r) + ' tabs ' + tt);
  r = await rectOf(p, '#feuille'); await drag(r.l + r.w / 2, r.t + r.h / 2, -50, -50);
  r = await rectOf(p, '#feuille'); const tbb = await p.evaluate(() => document.getElementById('topbar').getBoundingClientRect().bottom);
  L.check('déplacement : jamais hors écran en haut/à gauche, ni sur la barre du haut', inScreen(r, vp.W, vp.H) && r.t >= tbb - 0.5, JSON.stringify(r) + ' topbar ' + tbb);
  await p.evaluate(() => T.store.s.feuille.pos = { x: 5, y: 9 }); await p.evaluate(() => window.dispatchEvent(new Event('resize')));
  L.check('déplacement : position enregistrée absurde ramenée dans l\'écran au rechargement', await (async () => { await reload(p); const q = await rectOf(p, '#feuille'); return inScreen(q, vp.W, vp.H); })());
  /* reste utilisable : toucher après avoir déplacé ouvre le menu */
  await tapFeuille(p); L.check('déplacement : toucher après déplacement ouvre le menu', (await st(p)).menu); await p.evaluate(() => T.feuille.closeMenu());
  /* tablette : on peut bouger partout */
  /* ================= BULLE ET VOIX ================= */
  await p.evaluate(() => { window.__sp = []; T.store.s.feuille.mute = false; T.store.s.feuille.qOn = false; T.store.s.settings.voiceOn = true; });
  await p.evaluate(() => T.feuille.say('Bonjour le jardin', 'joie'));
  L.check('voix : une phrase = une bulle écrite + un appel à T.voice.speak', (await spoken(p)) === 1 && /Bonjour le jardin/.test((await st(p)).bubble));
  L.check('voix : la bouche s\'anime pendant que Feuille parle', await p.evaluate(() => new Promise((res) => { const m = document.querySelector('#feuille .fe-mo'); const a = m.getAttribute('d'); T.voice.speak = function () { return new Promise((r) => setTimeout(r, 900)); }; T.feuille.say('Je parle un peu plus longtemps ici', 'doux'); setTimeout(() => { const ds = new Set(); const t0 = Date.now(); (function l() { ds.add(m.getAttribute('d')); if (Date.now() - t0 < 450) setTimeout(l, 40); else res(ds.size >= 2); })(); }, 60); })));
  await p.evaluate(() => { window.__sp = []; T.voice.speak = function (t, o) { window.__sp.push({ t: t, o: o }); return Promise.resolve(true); }; });
  await L.sleep(700);
  await p.evaluate(() => T.feuille.set('mute', true)); await p.evaluate(() => T.feuille.say('Je suis muette', 'doux'));
  L.check('voix coupée : bulle écrite mais aucun appel à T.voice.speak', (await spoken(p)) === 0 && /Je suis muette/.test((await st(p)).bubble));
  await p.evaluate(() => T.feuille.set('mute', false));
  await p.evaluate(() => { T.store.s.settings.voiceOn = false; T.feuille.say('Voix générale coupée', 'doux'); });
  L.check('voix générale coupée dans Réglages : Feuille respecte, bulle écrite', (await spoken(p)) === 0 && /Voix générale/.test((await st(p)).bubble));
  await p.evaluate(() => { T.store.s.settings.voiceOn = true; });
  const q = await p.evaluate(() => { const D = (h, m) => new Date(2026, 0, 5, h, m); const o = {}; T.feuille.set('qOn', true); T.feuille.set('qFrom', '22:00'); T.feuille.set('qTo', '07:00'); o.a = T.feuille.quietNow(D(23, 0)); o.b = T.feuille.quietNow(D(3, 30)); o.c = T.feuille.quietNow(D(12, 0)); o.d = T.feuille.quietNow(D(7, 0)); o.e = T.feuille.quietNow(D(22, 0)); T.feuille.set('qFrom', '13:00'); T.feuille.set('qTo', '14:00'); o.f = T.feuille.quietNow(D(13, 30)); o.g = T.feuille.quietNow(D(14, 0)); o.h = T.feuille.quietNow(D(12, 59)); T.feuille.set('qOn', false); o.i = T.feuille.quietNow(D(13, 30)); return o; });
  L.check('heures calmes : 22h-7h passe minuit, 13h-14h dans la journée, désactivées = jamais', q.a && q.b && !q.c && !q.d && q.e && q.f && !q.g && !q.h && !q.i, JSON.stringify(q));
  await p.evaluate(() => { window.__sp = []; const n = new Date(), a = n.getHours() * 60 + n.getMinutes(); const f = (m) => { m = (m + 1440) % 1440; return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }; T.feuille.set('qOn', true); T.feuille.set('qFrom', f(a - 30)); T.feuille.set('qTo', f(a + 30)); T.feuille.say('Pendant les heures calmes', 'doux'); });
  L.check('heures calmes : pas de voix pendant les heures calmes, mais bulle écrite', (await spoken(p)) === 0 && /heures calmes/.test((await st(p)).bubble));
  await p.evaluate(() => { const n = new Date(), a = n.getHours() * 60 + n.getMinutes(); const f = (m) => { m = (m + 1440) % 1440; return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }; T.feuille.set('qFrom', f(a + 60)); T.feuille.set('qTo', f(a + 120)); T.feuille.say('Hors des heures calmes', 'doux'); });
  L.check('heures calmes : hors des heures calmes, elle parle', (await spoken(p)) === 1);
  await p.evaluate(() => { window.__sp = []; T.feuille.help(); T.feuille.closeMenu(); });
  L.check('voix : l\'aide demandée est dite (appel T.voice.speak)', (await spoken(p)) === 1);

  /* ================= NIVEAUX D'INSISTANCE ET ALERTES ================= */
  const sim = (p, o) => p.evaluate((o) => { window.__sp = []; T.meteo.alertText = () => o.meteo; T.planning.todayCount = () => o.n; T.planning.top = () => []; T.pots.dueCount = () => o.due; T.store.s.feuille.alertDay = ''; T.store.s.feuille.alertSeen = {}; T.store.s.feuille.mute = false; T.store.s.feuille.qOn = false; T.feuille.closeMenu(); document.querySelectorAll('.fe-bb').forEach(() => 0); }, o);
  const reset = async (lvl) => { await p.evaluate((l) => { T.feuille.set('level', l); }, lvl); };
  await p.evaluate(() => { const m = T.learn.month(T.monthNow()); window.__m = m; });
  /* Discrète */
  await reset('discrete'); await sim(p, { meteo: 'Gel annoncé cette nuit.', n: 2, due: 1 });
  await p.evaluate(() => { document.querySelectorAll('.fe-bub').forEach((b) => b.hidden = true); T.feuille.check(); });
  s2 = await st(p);
  L.check('niveau Discrète : une pastille, mais ni bulle ni voix', s2.pending >= 3 && !s2.bubble && (await spoken(p)) === 0 && await p.evaluate(() => !document.querySelector('#feuille .fe-badge').hidden), JSON.stringify(s2));
  L.check('niveau Discrète : la pastille montre le nombre d\'alertes', await p.evaluate(() => +document.querySelector('#feuille .fe-badge').textContent >= 3));
  L.check('niveau Discrète : sans demande, pas de narration de page', await (async () => { await go(p, '#/conseils'); await L.sleep(900); return !(await st(p)).bubble && (await spoken(p)) === 0; })());
  /* Normale */
  await reset('normale'); await sim(p, { meteo: 'Gel annoncé cette nuit.', n: 2, due: 1 });
  await p.evaluate(() => { document.querySelectorAll('.fe-bub').forEach((b) => b.hidden = true); T.feuille.check(); });
  s2 = await st(p);
  L.check('niveau Normale : tâches et pots annoncés, pas la météo', /2 tâches/.test(s2.bubble) && /1 pot/.test(s2.bubble) && !/Gel annoncé/.test(s2.bubble), s2.bubble);
  L.check('niveau Normale : une seule voix pour toutes les alertes du moment', (await spoken(p)) === 1);
  /* non répétition */
  await p.evaluate(() => { document.querySelectorAll('.fe-bub').forEach((b) => b.hidden = true); window.__sp = []; T.feuille.check(); T.feuille.check(); });
  L.check('alertes : jamais deux fois la même alerte le même jour (bulle et voix)', !(await st(p)).bubble && (await spoken(p)) === 0);
  /* Merci / Plus tard */
  await p.evaluate(() => { T.store.s.feuille.alertSeen = {}; T.feuille.check(); });
  L.check('alertes : boutons « Merci » et « Plus tard » présents', await p.evaluate(() => Array.from(document.querySelectorAll('.fe-bb')).map((b) => b.textContent).join('|') === 'Merci|Plus tard'));
  await p.evaluate(() => Array.from(document.querySelectorAll('.fe-bb')).filter((b) => b.textContent === 'Plus tard')[0].click());
  s2 = await st(p);
  L.check('alertes : « Plus tard » range la bulle, la pastille reste', !s2.bubble && s2.pending >= 2, JSON.stringify(s2));
  await p.evaluate(() => { window.__sp = []; T.feuille.check(); });
  L.check('alertes : après « Plus tard », elle ne répète pas la même alerte', !(await st(p)).bubble && (await spoken(p)) === 0);
  await p.evaluate(() => { T.store.s.feuille.alertSeen = {}; T.feuille.check(); Array.from(document.querySelectorAll('.fe-bb')).filter((b) => b.textContent === 'Merci')[0].click(); });
  s2 = await st(p);
  L.check('alertes : « Merci » efface la pastille', s2.pending === 0 && !s2.bubble, JSON.stringify(s2));
  /* nouveau jour */
  await p.evaluate(() => { window.__sp = []; T.store.s.feuille.alertDay = '2000-01-01'; T.feuille.check(); });
  L.check('alertes : le lendemain, les alertes reviennent', /tâches/.test((await st(p)).bubble) && (await spoken(p)) === 1);
  /* alerte qui change */
  await p.evaluate(() => { document.querySelectorAll('.fe-bb').forEach((b) => b.textContent === 'Merci' && b.click()); window.__sp = []; T.planning.todayCount = () => 5; T.feuille.check(); });
  L.check('alertes : une alerte différente (5 tâches) est annoncée', /5 tâches/.test((await st(p)).bubble));
  /* Attentive */
  await reset('attentive'); await sim(p, { meteo: 'Gel annoncé cette nuit.', n: 0, due: 0 });
  await p.evaluate(() => { document.querySelectorAll('.fe-bub').forEach((b) => b.hidden = true); T.feuille.check(); });
  s2 = await st(p);
  L.check('niveau Attentive : prévient du gel annoncé (météo)', /Gel annoncé/.test(s2.bubble) && s2.mood === 'surprise' && (await spoken(p)) === 1, JSON.stringify(s2));
  /* semis du mois */
  await sim(p, { meteo: '', n: 0, due: 0 });
  await p.evaluate(() => { document.querySelectorAll('.fe-bub').forEach((b) => b.hidden = true); T.feuille.check(); });
  const hasSemer = await p.evaluate(() => { const m = T.learn.month(T.monthNow()); return !!(m && m.semer && m.semer.length); });
  L.check('alertes : semis du mois annoncés', hasSemer ? /semer/.test((await st(p)).bubble) : true, (await st(p)).bubble);
  /* un message ne coupe pas un autre : fenêtre ouverte = on attend */
  await sim(p, { meteo: '', n: 3, due: 0 });
  await p.evaluate(() => { document.querySelectorAll('.fe-bub').forEach((b) => b.hidden = true); window.__mm = T.modal({ title: 'Test', html: '<p>x</p>' }); T.feuille.check(); });
  L.check('alertes : pas de bulle pendant qu\'une fenêtre est ouverte', !(await st(p)).bubble && (await spoken(p)) === 0);
  await p.evaluate(() => window.__mm.close());
  /* données absentes ou cassées */
  const safe = await p.evaluate(() => { const s = { m: T.meteo, pl: T.planning, po: T.pots, le: T.learn }; try { T.meteo = undefined; T.planning = undefined; T.pots = null; T.learn = {}; T.store.s.feuille.alertSeen = {}; const t = T.feuille.today(); const l = T.feuille.check(); return [typeof t, Array.isArray(l)]; } catch (e) { return 'ERR ' + e.message; } finally { T.meteo = s.m; T.planning = s.pl; T.pots = s.po; T.learn = s.le; } });
  L.check('alertes et « Que faire » : modules absents ou cassés = aucun plantage', Array.isArray(safe) && safe[0] === 'string' && safe[1] === true, JSON.stringify(safe));
  /* Que faire aujourd'hui */
  await sim(p, { meteo: 'Canicule demain.', n: 2, due: 1 });
  await p.evaluate(() => { T.planning.top = () => [{ titre: 'Arroser : Basilic', late: true, today: false }, { titre: 'Rempoter la menthe', late: false, today: true }, { titre: 'Plus tard', late: false, today: false }]; });
  const todayTxt = await p.evaluate(() => T.feuille.today());
  L.check('« Que faire aujourd\'hui ? » : combine météo, tâches, pots et mois', /Canicule demain/.test(todayTxt) && /2 tâches/.test(todayTxt) && /Arroser : Basilic/.test(todayTxt) && /Rempoter la menthe/.test(todayTxt) && !/Plus tard/.test(todayTxt) && /1 pot/.test(todayTxt) && (hasSemer ? /Ce mois-ci/.test(todayTxt) : true), todayTxt);
  L.check('« Que faire aujourd\'hui ? » : affiché dans la bulle, voix, pastille effacée', /Canicule/.test((await st(p)).bubble) && (await st(p)).pending === 0);
  await sim(p, { meteo: '', n: 0, due: 0 }); await p.evaluate(() => { T.learn.month = () => null; });
  L.check('« Que faire aujourd\'hui ? » : rien d\'urgent dit simplement', /Rien d'urgent/.test(await p.evaluate(() => T.feuille.today())));
  await p.evaluate(() => T.feuille.closeMenu());
  L.check('aucune erreur JS (affichage, voix, alertes)', clean(p).length === 0, clean(p).join(' | '));
  await p.browserContext().close();

  /* ================= MODE ENFANT ================= */
  p = await fresh(PIX, { level: 'enfant' });
  await p.evaluate(() => { T.meteo.alertText = () => ''; T.planning.todayCount = () => 0; T.pots.dueCount = () => 0; });
  await go(p, '#/pots'); await L.sleep(1100);
  s2 = await st(p);
  L.check('mode enfant : lit le nouvel écran en phrases très simples (Mes pots)', /Voici tes pots/.test(s2.bubble) && (await spoken(p)) >= 1, s2.bubble);
  await go(p, '#/calendrier'); await L.sleep(1100);
  L.check('mode enfant : phrase différente sur un autre écran', /mois du jardin/.test((await st(p)).bubble), (await st(p)).bubble);
  await p.evaluate(() => { window.__sp = []; }); await go(p, '#/pots'); await go(p, '#/pots'); await L.sleep(800);
  L.check('mode enfant : ne répète pas le même écran en boucle', (await spoken(p)) === 0);
  L.check('mode enfant : la voix du jour dit les phrases du mode enfant sans erreur', clean(p).length === 0, clean(p).join('|'));
  await p.browserContext().close();

  /* ================= GENRE, ACCESSOIRES, COULEURS ================= */
  p = await fresh(PIX);
  L.check('genre : féminin par défaut', (await p.evaluate(() => T.feuille.accord('prête', 'prêt'))) === 'prête' && await p.evaluate(() => document.querySelector('#feuille svg').getAttribute('data-genre') === 'f'));
  L.check('genre : visage féminin = cils et joues', await p.evaluate(() => !!document.querySelector('#feuille .fe-lash') && document.querySelectorAll('#feuille .fe-ck').length === 2));
  await p.evaluate(() => T.feuille.say('Je suis ravi[e|] et prêt[e|] à jardiner', 'joie'));
  L.check('genre : accord féminin dans les phrases', /ravie et prête/.test((await st(p)).bubble), (await st(p)).bubble);
  await p.evaluate(() => { window.__sp = []; T.feuille.settings({ genre: 'm' }); T.feuille.say('Je suis ravi[e|] et prêt[e|] à jardiner', 'joie'); });
  L.check('genre : accord masculin dans les phrases', /Je suis ravi et prêt à jardiner/.test((await st(p)).bubble), (await st(p)).bubble);
  L.check('genre : accord(f, m) renvoie la forme masculine', (await p.evaluate(() => T.feuille.accord('prête', 'prêt'))) === 'prêt');
  L.check('genre : visage masculin différent (pas de cils ni de joues, sourcils épais)', await p.evaluate(() => { const s = document.querySelector('#feuille svg'); return s.getAttribute('data-genre') === 'm' && !s.querySelector('.fe-lash') && !s.querySelector('.fe-ck') && parseFloat(s.querySelector('.fe-brl').getAttribute('stroke-width')) > 3; }));
  L.check('genre : le nom reste « Feuille » et l\'étiquette s\'accorde', await p.evaluate(() => /Feuille, votre compagnon/.test(document.getElementById('feuille').getAttribute('aria-label'))));
  L.check('genre : voix masculine conseillée = ton plus grave si aucun réglage de ton', await p.evaluate(() => { const l = window.__sp[window.__sp.length - 1]; return !!l && l.o && l.o.pitch === 0.85; }));
  L.check('genre : le réglage est mémorisé après rechargement', await (async () => { await reload(p); return (await p.evaluate(() => T.store.s.feuille.genre)) === 'm' && await p.evaluate(() => document.querySelector('#feuille svg').getAttribute('data-genre') === 'm'); })());
  await p.evaluate(() => T.feuille.settings({ genre: 'f' }));
  const fills = [];
  for (const c of ['vert', 'clair', 'turquoise', 'olive', 'automne']) { await p.evaluate((c) => T.feuille.settings({ color: c }), c); fills.push(await p.evaluate(() => document.querySelector('#feuille svg path[stroke-width="2.2"]').getAttribute('fill'))); }
  L.check('couleur : 5 couleurs de feuille différentes', new Set(fills).size === 5, fills.join(','));
  L.check('couleur : couleur invalide refusée', await p.evaluate(() => { T.feuille.settings({ color: 'rose-bonbon' }); return T.feuille.settings().color === 'automne'; }));
  const accs = {};
  for (const a of ['aucun', 'chapeau', 'fleur', 'lunettes']) { await p.evaluate((a) => T.feuille.settings({ acc: a }), a); accs[a] = await p.evaluate(() => { const s = document.querySelector('#feuille svg'); return s.querySelectorAll('.fe-acc').length + ':' + (s.querySelector('.fe-acc') ? s.querySelector('.fe-acc').innerHTML.length : 0); }); }
  L.check('accessoires : aucun / chapeau de paille / fleur / lunettes tous dessinés', accs.aucun === '0:0' && ['chapeau', 'fleur', 'lunettes'].every((a) => /^1:/.test(accs[a]) && +accs[a].split(':')[1] > 100) && new Set(Object.values(accs)).size === 4, JSON.stringify(accs));
  L.check('accessoires : l\'accessoire reste après un changement d\'humeur', await p.evaluate(() => { T.feuille.settings({ acc: 'lunettes' }); T.feuille.say('x', 'surprise'); return document.querySelectorAll('#feuille .fe-acc').length === 1; }));
  L.check('réglages corrompus : valeurs absurdes ramenées aux valeurs par défaut', await p.evaluate(() => { T.store.s.feuille = { size: 'zz', level: 'fou', genre: 'x', color: 9, acc: [], qFrom: 'abc', pos: 'hop', alertSeen: 5 }; const s = T.feuille.settings(); return s.size === 'm' && s.level === 'normale' && s.genre === 'f' && s.color === 'vert' && s.acc === 'aucun' && s.qFrom === '22:00' && s.pos === null && typeof s.alertSeen === 'object'; }));
  L.check('réglages corrompus : feuille = texte ou null ne plante pas', await p.evaluate(() => { T.store.s.feuille = 'abc'; const a = typeof T.feuille.settings(); T.store.s.feuille = null; return a === 'object' && T.feuille.settings().on === true; }));
  /* tailles */
  for (const [k, w] of [['p', 56], ['m', 76], ['g', 104]]) { await p.evaluate((k) => T.feuille.settings({ size: k }), k); L.check('taille : ' + k + ' = ' + w + ' px', Math.round((await rectOf(p, '#feuille')).w) === w); }
  r = await rectOf(p, '#feuille'); tt = await tabsTop(p);
  L.check('taille : grande reste dans l\'écran et au-dessus de la barre du bas', inScreen(r, vp.W, vp.H) && r.b <= tt + 0.5, JSON.stringify(r));
  L.check('aucune erreur JS (genre, accessoires)', clean(p).length === 0, clean(p).join('|'));
  await p.browserContext().close();

  /* ================= PAGE #/feuille ================= */
  p = await fresh(PIX);
  await go(p, '#/feuille');
  const txt = await p.evaluate(() => document.getElementById('view').innerText);
  L.check('page Feuille : tous les réglages demandés sont là', ['Présence', 'Taille', 'Quand parle-t-elle', 'Discrète', 'Normale', 'Attentive', 'Mode enfant', 'Voix', 'Changer sa voix', 'Heures calmes', 'Bonjour du jour', 'Féminin', 'Masculin', 'Couleur de la feuille', 'Accessoire', 'Chapeau de paille', 'Lunettes', 'Réécouter un exemple', 'Refaire la visite', 'Remettre mes réglages par défaut'].every((t) => txt.includes(t)), ['Présence', 'Taille', 'Discrète', 'Chapeau de paille', 'Remettre mes réglages par défaut'].filter((t) => !txt.includes(t)).join());
  L.check('page Feuille : aperçu du personnage', await p.evaluate(() => !!document.querySelector('#view .fe-prev svg')));
  L.check('page Feuille : 5 couleurs avec pastille de couleur', await p.evaluate(() => document.querySelectorAll('#view .fe-sw').length === 5));
  L.check('page Feuille : « Changer sa voix » mène aux Réglages', await p.evaluate(() => document.querySelector('#view a[href="#/reglages"]').textContent.trim() === 'Changer sa voix'));
  L.check('page Feuille : boutons >= 44 px et dans l\'écran', await p.evaluate(() => Array.from(document.querySelectorAll('#view .btn, #view .chip')).every((b) => { const r = b.getBoundingClientRect(); return r.height >= 40 && r.left >= 0 && r.right <= innerWidth; })));
  const clickAct = async (k, v) => { await p.evaluate((k, v) => { document.querySelector('[data-act="fe-set"][data-k="' + k + '"][data-v="' + v + '"]').click(); }, k, v); await L.sleep(250); };
  await clickAct('size', 'g'); L.check('page Feuille : taille Grande', Math.round((await rectOf(p, '#feuille')).w) === 104 && (await p.evaluate(() => T.store.s.feuille.size)) === 'g');
  await clickAct('level', 'attentive'); L.check('page Feuille : niveau Attentive coché', await p.evaluate(() => document.querySelector('[data-k="level"][data-v="attentive"]').getAttribute('aria-pressed') === 'true' && T.feuille.settings().level === 'attentive'));
  await clickAct('genre', 'm'); L.check('page Feuille : genre Masculin appliqué au personnage et à l\'aperçu', await p.evaluate(() => document.querySelector('#feuille svg').getAttribute('data-genre') === 'm' && document.querySelector('#view .fe-prev svg').getAttribute('data-genre') === 'm'));
  await clickAct('color', 'turquoise'); await clickAct('acc', 'chapeau');
  L.check('page Feuille : couleur et accessoire appliqués', await p.evaluate(() => document.querySelector('#feuille svg').getAttribute('data-color') === 'turquoise' && document.querySelector('#feuille svg').getAttribute('data-acc') === 'chapeau'));
  await p.evaluate(() => { window.__sp = []; }); await clickAct('mute', '1');
  L.check('page Feuille : « Elle se tait » coupe la voix', await p.evaluate(() => T.feuille.settings().mute === true) && (await spoken(p)) === 0);
  await p.evaluate(() => { document.querySelector('[data-act="fe-example"]').click(); });
  L.check('page Feuille : « Réécouter un exemple » voix coupée = message écrit, pas de voix', /voix est coupée/.test((await st(p)).bubble) && (await spoken(p)) === 0);
  await clickAct('mute', '0'); await p.evaluate(() => { window.__sp = []; T.store.s.feuille.qOn = true; const n = new Date(), a = n.getHours() * 60 + n.getMinutes(); const f = (m) => { m = (m + 1440) % 1440; return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }; T.store.s.feuille.qFrom = f(a - 5); T.store.s.feuille.qTo = f(a + 5); document.querySelector('[data-act="fe-example"]').click(); });
  L.check('page Feuille : « Réécouter un exemple » parle, même en heures calmes', (await spoken(p)) === 1 && /ravi/.test((await st(p)).bubble) && !/ravie/.test((await st(p)).bubble), (await st(p)).bubble);
  await p.$eval('#fe-qf', (e) => { e.value = '21:15'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await p.$eval('#fe-qt', (e) => { e.value = '06:45'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  L.check('page Feuille : heures calmes de/à enregistrées', await p.evaluate(() => T.store.s.feuille.qFrom === '21:15' && T.store.s.feuille.qTo === '06:45'));
  await p.$eval('#fe-qf', (e) => { e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); });
  L.check('page Feuille : heure vide ignorée', await p.evaluate(() => T.store.s.feuille.qFrom === '21:15'));
  await clickAct('qOn', '0'); await clickAct('greet', '0');
  L.check('page Feuille : heures calmes et bonjour désactivables', await p.evaluate(() => !T.feuille.settings().qOn && !T.feuille.settings().greet));
  await p.evaluate(() => { document.querySelector('[data-act="fe-reset"]').click(); }); await L.sleep(200);
  L.check('page Feuille : « Remettre » demande confirmation, fenêtre avec boutons visibles', (await p.evaluate(() => T.modalStack.length)) === 1 && (await L.overflow(p)).length === 0);
  L.check('page Feuille : pendant la fenêtre, Feuille se masque pour laisser les boutons', !(await rectOf(p, '#feuille')).vis);
  await p.evaluate(() => { Array.from(document.querySelectorAll('.modal-foot .btn')).filter((b) => b.textContent === 'Annuler')[0].click(); }); await L.sleep(300);
  L.check('page Feuille : « Annuler » ne change rien', (await p.evaluate(() => T.feuille.settings().size)) === 'g' && (await rectOf(p, '#feuille')).vis);
  await p.evaluate(() => { document.querySelector('[data-act="fe-reset"]').click(); }); await L.sleep(200);
  await p.evaluate(() => { Array.from(document.querySelectorAll('.modal-foot .btn')).filter((b) => b.textContent === 'Remettre')[0].click(); }); await L.sleep(400);
  const dflt = await p.evaluate(() => T.feuille.settings());
  L.check('page Feuille : remise par défaut (taille, niveau, genre, couleur, accessoire, heures calmes, bonjour)', dflt.size === 'm' && dflt.level === 'normale' && dflt.genre === 'f' && dflt.color === 'vert' && dflt.acc === 'aucun' && dflt.qOn && dflt.qFrom === '22:00' && dflt.greet && dflt.on && dflt.tourDone === true, JSON.stringify(dflt));
  L.check('page Feuille : la page se met à jour après la remise à zéro', await p.evaluate(() => document.querySelector('[data-k="size"][data-v="m"]').getAttribute('aria-pressed') === 'true'));
  await p.evaluate(() => { document.querySelector('[data-act="fe-tour"]').click(); }); await L.sleep(300);
  L.check('page Feuille : « Refaire la visite » relance la visite', (await st(p)).tour && /Bonjour, je m'appelle Feuille/.test((await st(p)).bubble));
  await p.evaluate(() => Array.from(document.querySelectorAll('.fe-bb')).filter((b) => /Passer/.test(b.textContent))[0].click());
  L.check('aucune erreur JS (page Feuille)', clean(p).length === 0, clean(p).join('|'));
  L.check('page Feuille : sans débordement', (await L.overflow(p)).length === 0);
  await p.browserContext().close();

  /* ================= VISITE GUIDÉE ET BONJOUR (première ouverture) ================= */
  p = await L.newPage(browser, base, PIX);
  await p.evaluate(() => { window.__sp = []; T.voice.speak = function (t) { window.__sp.push(t); return Promise.resolve(true); }; T.voice.available = () => true; });
  await L.sleep(2500);
  L.check('visite : rien tant que la présentation de l\'appli est affichée', !(await st(p)).tour && !(await st(p)).bubble);
  await L.skipOnboarding(p, true); await L.sleep(3200);
  s2 = await st(p);
  L.check('visite : se lance après la présentation, première étape lue à voix haute', s2.tour && /je m'appelle Feuille/.test(s2.bubble) && (await spoken(p)) >= 1, JSON.stringify(s2));
  L.check('visite : boutons « Suivant » et « Passer la visite »', await p.evaluate(() => Array.from(document.querySelectorAll('.fe-bb')).map((b) => b.textContent).join('|') === 'Suivant|Passer la visite'));
  let seenSteps = 1;
  for (let i = 0; i < 4; i++) {
    await p.evaluate(() => document.querySelector('.fe-bb.main').click());
    if (i === 1) L.check('visite : l\'étape 3 met en valeur la barre du bas', await p.evaluate(() => document.getElementById('tabs').classList.contains('fe-hl')));
    seenSteps++;
  }
  L.check('visite : dernière étape = « Terminer »', await p.evaluate(() => document.querySelector('.fe-bb.main').textContent === 'Terminer'));
  await p.evaluate(() => document.querySelector('.fe-bb.main').click());
  s2 = await st(p);
  L.check('visite : terminée, mémorisée, surbrillance retirée', !s2.tour && (await p.evaluate(() => T.store.s.feuille.tourDone === true && !document.getElementById('tabs').classList.contains('fe-hl'))) && /visite est finie/.test(s2.bubble), JSON.stringify(s2));
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction('T.feuille && T.feuille.state().ready'); await L.sleep(3000);
  L.check('visite : ne revient pas au démarrage suivant', !(await st(p)).tour);
  L.check('bonjour du jour : dit une fois au démarrage après la visite, pas deux fois le même jour', !(await st(p)).tour && (await p.evaluate(() => T.store.s.feuille.lastGreet)) !== '');
  /* passer la visite */
  await p.evaluate(() => { T.store.s.feuille.tourDone = false; T.feuille.tour(); }); await L.sleep(200);
  await p.evaluate(() => Array.from(document.querySelectorAll('.fe-bb')).filter((b) => /Passer/.test(b.textContent))[0].click());
  L.check('visite : passable à tout moment', !(await st(p)).tour && (await p.evaluate(() => T.store.s.feuille.tourDone)));
  L.check('visite : relançable depuis le menu', await (async () => { await p.evaluate(() => { T.feuille.openMenu(); }); await L.sleep(520); await p.click('.fe-it[data-fe="visite"]'); await L.sleep(300); const t = (await st(p)).tour; await p.evaluate(() => Array.from(document.querySelectorAll('.fe-bb')).filter((b) => /Passer/.test(b.textContent))[0].click()); return t; })());
  /* bonjour du jour */
  await p.evaluate(() => { window.__sp = []; T.store.s.feuille.lastGreet = ''; T.store.s.feuille.level = 'normale'; T.store.save(); });
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction('T.feuille && T.feuille.state().ready'); await p.evaluate(() => { window.__sp = []; T.voice.speak = function (t) { window.__sp.push(t); return Promise.resolve(true); }; T.voice.available = () => true; }); await L.sleep(3000);
  L.check('bonjour du jour : « Bonjour / Bon après-midi / Bonsoir » dans la bulle + voix', /^(Bonjour|Bon après-midi|Bonsoir) !/.test((await st(p)).bubble) && (await spoken(p)) >= 1, (await st(p)).bubble);
  await p.evaluate(() => { window.__sp = []; T.store.s.feuille.lastGreet = ''; T.store.s.feuille.greet = false; T.store.save(); });
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction('T.feuille && T.feuille.state().ready'); await L.sleep(2800);
  L.check('bonjour du jour : désactivable', !/^(Bonjour|Bon après-midi|Bonsoir) !/.test((await st(p)).bubble));
  L.check('aucune erreur JS (visite, bonjour)', clean(p).length === 0, clean(p).join('|'));
  await p.browserContext().close();

  /* ================= AIDE SUR CHAQUE ÉCRAN ================= */
  p = await fresh(PIX);
  const paths = ['#/accueil', '#/trouver', '#/plante/tomate', '#/photo', '#/maladie', '#/maladies', '#/maladie/mildiou', '#/pots', '#/conseils', '#/conseils/arrosage', '#/conseil/x', '#/guide/x', '#/calendrier', '#/calendrier/4', '#/jardin', '#/planning', '#/carnet', '#/carnet/saisons', '#/assistant', '#/meteo', '#/calculs', '#/reglages', '#/aide', '#/aide-installation', '#/maj', '#/licence', '#/plus', '#/apropos', '#/legal/cgu', '#/legal/mentions', '#/gestes', '#/geste/rempotage', '#/musique', '#/labo', '#/labo/ecoute', '#/feuille', '#/inconnu-total'];
  const keys = {};
  for (const h of paths) {
    await go(p, h);
    const o = await p.evaluate(() => { const t = T.feuille.help(); T.feuille.closeMenu(); return { k: T.feuille.routeKey(), t: t, b: document.querySelector('.fe-bub') && !document.querySelector('.fe-bub').hidden ? document.querySelector('.fe-bub .fe-bt').textContent : '' }; });
    keys[h] = o.k;
    const bad = [];
    if (!o.t || o.t.length < 60) bad.push('texte trop court');
    if (o.b !== o.t) bad.push('bulle différente du texte');
    if (/undefined|\[object|NaN|\[[^\]]*\|/.test(o.t)) bad.push('texte cassé');
    if (/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(o.t)) bad.push('emoji');
    L.check('aide ' + h + ' (' + o.k + ')', bad.length === 0, bad.join(','));
  }
  L.check('aide : les écrans gestes, musique, labo, feuille ont leur texte propre (pas le texte générique)', ['gestes', 'musique', 'labo', 'feuille'].every((k) => Object.values(keys).indexOf(k) >= 0) && (keys['#/inconnu-total'] === 'autre' || keys['#/inconnu-total'] === 'accueil'));
  L.check('aide : chaque route existante de l\'appli a un texte propre', await p.evaluate(() => { const res = ['accueil', 'trouver', 'plante', 'photo', 'maladie', 'pots', 'conseils', 'calendrier', 'jardin', 'planning', 'carnet', 'assistant', 'meteo', 'calculs', 'reglages', 'aide', 'maj', 'licence', 'plus', 'gestes', 'musique', 'labo', 'feuille']; return res.every((k) => T.feuille.routes().indexOf(k) >= 0 && T.feuille.helpFor(k).length > 80); }));
  L.check('aide : chaque texte nomme les boutons de l\'écran (vérifié sur 6 écrans clés)', await p.evaluate(() => [['pots', 'J\'ai arrosé'], ['planning', 'Fait'], ['photo', 'Reconnaître cette plante'], ['jardin', 'Créer mon plan'], ['carnet', 'Ajouter une note'], ['assistant', 'Demander']].every((x) => T.feuille.helpFor(x[0]).indexOf(x[1]) >= 0)));
  L.check('aide : aucun jargon sans explication (pas de « API », « cache », « SVG »)', await p.evaluate(() => T.feuille.routes().every((k) => !/\b(API|cache|SVG|JSON|localStorage)\b/.test(T.feuille.helpFor(k)))));
  L.check('aide : textes au masculin et au féminin sans crochet restant', await p.evaluate(() => { T.feuille.settings({ genre: 'm' }); const a = T.feuille.routes().every((k) => !/[\[\]|]/.test(T.feuille.helpFor(k))); T.feuille.settings({ genre: 'f' }); return a; }));
  L.check('aide : aucune erreur JS sur toutes les routes', clean(p).length === 0, clean(p).join(' | '));
  await p.browserContext().close();

  /* ================= FENÊTRES : Feuille ne masque jamais les boutons ================= */
  p = await fresh(PIX, { pos: { x: 0.5, y: 0.93 } });
  await p.evaluate(() => { window.__mm = T.modal({ title: 'Une fenêtre', html: '<p>Texte</p>', buttons: [{ label: 'Annuler' }, { label: 'Valider', primary: true }] }); }); await L.sleep(250);
  const ov = await p.evaluate(() => Array.from(document.querySelectorAll('.modal-foot .btn')).map((b) => { const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e === b || b.contains(e); }));
  L.check('fenêtre : les boutons de validation reçoivent le toucher (rien par-dessus)', ov.length === 2 && ov.every(Boolean), JSON.stringify(ov));
  L.check('fenêtre : Feuille est masquée pendant la fenêtre, bulle aussi', !(await rectOf(p, '#feuille')).vis && (await st(p)).away);
  await p.evaluate(() => { T.feuille.say('Pendant la fenêtre', 'doux'); }); await L.sleep(100);
  L.check('fenêtre : même si Feuille parle, sa bulle reste cachée', !(await rectOf(p, '.fe-bub')).vis);
  await p.evaluate(() => window.__mm.close()); await L.sleep(700);
  L.check('fenêtre : Feuille revient quand la fenêtre se ferme', (await rectOf(p, '#feuille')).vis && !(await st(p)).away);
  /* menu ouvert puis fenêtre */
  await tapFeuille(p); await p.evaluate(() => { T.modal({ title: 'Autre', html: 'x' }); }); await L.sleep(300);
  L.check('fenêtre : le menu de Feuille se ferme quand une fenêtre s\'ouvre', !(await st(p)).menu);
  await p.evaluate(() => T.closeModal());
  /* clavier : champ de saisie */
  await go(p, '#/assistant'); await L.sleep(300);
  await p.focus('#ass-q'); await L.sleep(250);
  L.check('saisie : Feuille se cache pendant la frappe pour ne pas gêner le clavier', !(await rectOf(p, '#feuille')).vis);
  await p.evaluate(() => document.activeElement.blur()); await L.sleep(350);
  L.check('saisie : elle revient ensuite', (await rectOf(p, '#feuille')).vis);
  /* retour Android */
  await tapFeuille(p);
  const back = await p.evaluate(() => { const h0 = location.hash; T.onBack(); return h0; }); await L.sleep(100);
  L.check('retour Android : toujours celui de l\'appli (le menu de Feuille ne le détourne pas)', typeof back === 'string' && clean(p).length === 0);
  L.check('aucune erreur JS (fenêtres)', clean(p).length === 0, clean(p).join('|'));
  await p.browserContext().close();

  /* ================= MOUVEMENT RÉDUIT ================= */
  p = await fresh(PIX);
  const animOn = await p.evaluate(() => getComputedStyle(document.querySelector('#feuille .fe-body')).animationName);
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await L.sleep(150);
  const animOff = await p.evaluate(() => getComputedStyle(document.querySelector('#feuille .fe-body')).animationName);
  L.check('mouvement réduit : le balancement doux s\'arrête', /fe-float/.test(animOn) && animOff === 'none', animOn + ' -> ' + animOff);
  await p.browserContext().close();

  /* ================= THÈMES ET DÉBORDEMENTS SUR 4 PROFILS ================= */
  const profiles = [[PIX, 1], ['Samsung Galaxy S24 (Android 15)', 1.4], ['Samsung Tab A9 tablette (Android 14)', 1.2], ['Samsung Z Fold (plié, Android 14)', 2]];
  for (const [dev, scale] of profiles) {
    const px = await fresh(dev);
    await px.evaluate((s) => { T.store.s.settings.scale = s; T.applyDisplay(); }, scale); await L.sleep(800);
    const V = await px.evaluate(() => ({ W: innerWidth, H: innerHeight }));
    const tag = dev.split(' (')[0] + ' x' + scale + ' : ';
    for (const h of ['#/accueil', '#/feuille', '#/pots']) {
      await go(px, h);
      const rr = await rectOf(px, '#feuille'), t2 = await tabsTop(px);
      L.check(tag + h + ' Feuille dans l\'écran, au-dessus de la barre du bas', inScreen(rr, V.W, V.H) && rr.b <= t2 + 0.5, JSON.stringify(rr));
      L.check(tag + h + ' sans débordement', (await L.overflow(px)).length === 0, (await L.overflow(px)).join(';'));
    }
    /* bulle d'aide longue */
    await go(px, '#/accueil');
    await px.evaluate(() => { T.feuille.help(); }); await L.sleep(200);
    const bb = await rectOf(px, '.fe-bub'), t3 = await tabsTop(px), tb3 = await px.evaluate(() => document.getElementById('topbar').getBoundingClientRect().bottom);
    L.check(tag + 'bulle d\'aide longue dans l\'écran, entre les barres', inScreen(bb, V.W, V.H) && bb.b <= t3 + 1 && bb.t >= tb3 - 1, JSON.stringify(bb) + ' ' + t3 + ' ' + tb3);
    const bt = await px.evaluate(() => { const b = document.querySelector('.fe-bb'), r = b.getBoundingClientRect(); return { h: r.height, ok: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth }; });
    L.check(tag + 'bouton « Merci » de la bulle visible et >= 44 px', bt.ok && bt.h >= 43, JSON.stringify(bt));
    L.check(tag + 'texte de la bulle défilant (rien de coupé)', await px.evaluate(() => { const t = document.querySelector('.fe-bub .fe-bt'); return getComputedStyle(t).overflowY === 'auto'; }));
    await px.evaluate(() => document.querySelector('.fe-bb').click());
    /* menu */
    await px.evaluate(() => T.feuille.openMenu()); await L.sleep(150);
    const mr2 = await rectOf(px, '.fe-menu'), fx2 = await rectOf(px, '.fe-x');
    L.check(tag + 'menu dans l\'écran, bouton Fermer visible', inScreen(mr2, V.W, V.H) && inScreen(fx2, V.W, V.H) && mr2.b <= t3 + 8, JSON.stringify([mr2, fx2]));
    const mi = await px.evaluate(() => Array.from(document.querySelectorAll('.fe-ml .fe-it')).map((b) => { const r = b.getBoundingClientRect(), box = document.querySelector('.fe-ml').getBoundingClientRect(); return r.width > 0 && r.left >= box.left - 1 && r.right <= box.right + 1; }).every(Boolean));
    L.check(tag + 'puces du menu sans débordement horizontal', mi);
    L.check(tag + 'la liste du menu défile quand elle est trop haute', await px.evaluate(() => { const l = document.querySelector('.fe-ml'); return getComputedStyle(l).overflowY === 'auto' && (l.scrollHeight <= l.clientHeight || l.scrollHeight > l.clientHeight); }));
    if (scale >= 2) {
      await px.evaluate(() => { const l = document.querySelector('.fe-ml'); l.scrollTop = l.scrollHeight; }); await L.sleep(100);
      const last = await px.evaluate(() => { const b = Array.from(document.querySelectorAll('.fe-it')).pop(), r = b.getBoundingClientRect(), l = document.querySelector('.fe-ml').getBoundingClientRect(); return r.bottom <= l.bottom + 1; });
      L.check(tag + 'en défilant, la dernière puce « Me ranger » est atteignable', last);
    }
    await px.evaluate(() => T.feuille.closeMenu());
    /* pastille et bouton rangé */
    await px.evaluate(() => { T.planning.todayCount = () => 3; T.feuille.set('level', 'discrete'); T.feuille.check(); T.feuille.hide(); });
    const pl = await rectOf(px, '.fe-pill');
    L.check(tag + 'bouton rangé dans l\'écran avec sa pastille', inScreen(pl, V.W, V.H) && pl.b <= t3 + 1 && await px.evaluate(() => !document.querySelector('.fe-pill .fe-badge').hidden));
    /* thèmes */
    for (const th of ['zen', 'foret', 'sable', 'nuit']) { await px.evaluate((t) => { T.store.s.settings.theme = t; T.applyDisplay(); }, th); }
    L.check(tag + 'aucune erreur JS', clean(px).length === 0, clean(px).join('|'));
    await px.browserContext().close();
  }
  L.check('thèmes : bulle et menu utilisent les variables de thème (nuit comprise)', await (async () => {
    const px = await fresh(PIX); await px.evaluate(() => { T.store.s.settings.theme = 'nuit'; T.applyDisplay(); T.feuille.say('Nuit', 'doux'); });
    const o = await px.evaluate(() => { const b = getComputedStyle(document.querySelector('.fe-bub')); return [b.backgroundColor, b.color]; }); await px.browserContext().close();
    return o[0] !== o[1] && /rgb\(3[0-9], 4[0-9]/.test(o[0].replace(/\s+/g, ' ')) || o[0] !== 'rgb(251, 250, 245)';
  })());
  /* écran très étroit en paysage */
  const pl2 = await fresh(PIX); await pl2.setViewport({ width: 640, height: 300, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await L.sleep(400);
  const lr = await rectOf(pl2, '#feuille'), lt = await tabsTop(pl2);
  L.check('paysage bas (640 x 300) : Feuille dans l\'écran et au-dessus de la barre du bas', inScreen(lr, 640, 300) && lr.b <= lt + 0.5, JSON.stringify(lr) + ' ' + lt);
  await pl2.browserContext().close();
};
