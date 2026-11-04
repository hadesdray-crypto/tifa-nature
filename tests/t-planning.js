/* Domaine : région, planning et assistant jardin (hors connexion). */
module.exports = async function ({ L, browser, base }) {
  const PIX = 'Pixel 8 (Android 14)';
  const page = await L.newPage(browser, base, PIX);
  await L.skipOnboarding(page);
  const ev = (f, ...a) => page.evaluate(f, ...a);
  const go = async (h) => { await ev((h) => { location.hash = h; T.render(); }, h); await L.sleep(180); };
  const visibleText = () => ev(() => document.getElementById('view').innerText);

  /* ================= RÉGION ================= */
  L.check('région : non choisie par défaut', (await ev(() => T.region.current())) === null);
  const shifts = await ev(() => {
    const o = {}; ['mediterranee', 'sudouest', 'ouest', 'centre', 'nord', 'est', 'montagne'].forEach((id) => { T.region.set(id); o[id] = [T.region.shift(), T.region.shift(true), T.region.adjust(3, 'semis'), T.region.adjust(10, 'plantation'), T.region.adjust(7, 'recolte')]; });
    T.region.set(null); return o;
  });
  L.check('région : décalages du printemps', shifts.mediterranee[0] === -1 && shifts.sudouest[0] === 0 && shifts.ouest[0] === 0 && shifts.centre[0] === 0 && shifts.nord[0] === 1 && shifts.est[0] === 1 && shifts.montagne[0] === 2, JSON.stringify(shifts));
  L.check('région : décalage inverse à l\'automne', shifts.nord[1] === -1 && shifts.mediterranee[1] === 1 && shifts.montagne[1] === -2);
  L.check('région : adjust semis mars (nord=avril, méditerranée=février, montagne=mai)', shifts.nord[2] === 4 && shifts.mediterranee[2] === 2 && shifts.montagne[2] === 5 && shifts.centre[2] === 3);
  L.check('région : plantation d\'octobre plus tôt au nord (septembre), plus tard au sud (novembre)', shifts.nord[3] === 9 && shifts.mediterranee[3] === 11 && shifts.montagne[3] === 8);
  L.check('région : la récolte suit le décalage du printemps toute l\'année', shifts.nord[4] === 8);
  const pn = await ev(() => { T.region.set('nord'); const a = T.region.plantsNow('semis', 4).some((p) => p.id === 'tomate'), b = T.region.plantsNow('semis', 2).some((p) => p.id === 'tomate'); T.region.set('mediterranee'); const c = T.region.plantsNow('semis', 1).some((p) => p.id === 'tomate'); T.region.set(null); const d = T.region.plantsNow('semis', 2).some((p) => p.id === 'tomate'); return [a, b, c, d]; });
  L.check('région : plantsNow décale les semis de tomate (nord avril, sud janvier)', pn[0] === true && pn[1] === false && pn[2] === true && pn[3] === true, JSON.stringify(pn));
  const ph = await ev(() => T.region.pickerHtml());
  L.check('région : sélecteur avec 7 régions, exemples de villes, sans localisation', (ph.match(/data-act="setregion"/g) || []).length === 8 && /Marseille/.test(ph) && /Lille/.test(ph) && /Strasbourg/.test(ph) && /Bordeaux/.test(ph) && /Nantes/.test(ph) && /Alpes/.test(ph) && /Paris/.test(ph));
  L.check('région : gelées moyennes décrites pour chaque région', await ev(() => T.region.LIST.every((r) => r.derniere && r.premiere && r.villes)));
  await go('#/calendrier/4');
  const calBase = await ev(() => document.querySelector('#view').innerText);
  L.check('calendrier : bandeau « Région non choisie » et bouton', /Région non choisie/.test(calBase) && !!(await page.$('[data-act="regionpick"]')));
  await page.click('[data-act="regionpick"]'); await L.sleep(150);
  L.check('calendrier : fenêtre de choix de région affichée avec boutons visibles', (await ev(() => document.querySelectorAll('.modal [data-act="setregion"]').length)) === 8 && (await L.overflow(page)).length === 0);
  await page.click('.modal [data-act="setregion"][data-id="nord"]'); await L.sleep(250);
  const calNord = await ev(() => document.querySelector('#view').innerText);
  L.check('calendrier : affiche la région choisie (Nord) et « Changer ma région »', /Ma région : Nord/.test(calNord) && /Changer ma région/.test(calNord) && /Dernière gelée/.test(calNord));
  const semNord = await ev(() => { const m3 = T.learn.month(3); return [T.learn.month(4).semer.join('|'), m3.semer.join('|')]; });
  L.check('calendrier : en avril, le nord lit les semis de mars', await ev((s) => { const chips = Array.prototype.map.call(document.querySelectorAll('#view .card .chip'), (c) => c.textContent).join('|'); return s.split('|').every((x) => chips.indexOf(x) >= 0); }, semNord[1]));
  await page.reload({ waitUntil: 'load' }); await page.waitForFunction('window.__TIFA_STARTED === true'); await L.sleep(300);
  L.check('région : survit au rechargement', (await ev(() => T.store.s.settings.region)) === 'nord' && (await ev(() => T.region.current().id)) === 'nord');
  await go('#/calendrier/4'); await page.click('[data-act="regionpick"]'); await L.sleep(120);
  L.check('région : la région choisie est marquée dans la liste', await ev(() => !!document.querySelector('.modal .region-btn.on[data-id="nord"]')));
  await ev(() => T.closeModal());
  await ev(() => { const raw = JSON.parse(localStorage.getItem('tifa.v1')); delete raw.tasks; delete raw.planAuto; delete raw.ahist; delete raw.settings.region; localStorage.setItem('tifa.v1', JSON.stringify(raw)); });
  await page.reload({ waitUntil: 'load' }); await page.waitForFunction('window.__TIFA_STARTED === true'); await L.sleep(300);
  const def = await ev(() => ({ t: Array.isArray(T.store.s.tasks), a: typeof T.store.s.planAuto, h: Array.isArray(T.store.s.ahist), r: T.region.current() }));
  L.check('stockage : ancien enregistrement sans tasks/region reste valide', def.t && def.a === 'object' && def.h && def.r === null, JSON.stringify(def));

  /* ================= PLANNING ================= */
  await ev(() => { T.store.s.tasks = []; T.store.s.planAuto = {}; T.region.set('centre'); });
  const mine = await ev(() => { const p = T.region.plantsNow('semis').concat(T.region.plantsNow('plantation'))[0]; return p ? { id: p.id, nom: p.nom, kind: T.region.plantsNow('semis').indexOf(p) >= 0 ? 'Semer' : 'Planter' } : null; });
  await ev((mine) => {
    const old = Date.now() - 10 * 86400000;
    T.store.s.pots = [{ id: 'pt1', plantId: 'tomate', nom: 'Tomate', surnom: 'Pot du coin', zone: 'plein_soleil', added: old, arrose: old }];
    if (mine) T.store.s.pots.push({ id: 'pt2', plantId: mine.id, nom: mine.nom, surnom: '', zone: 'mi_ombre', added: old, arrose: Date.now() });
    T.store.save();
  }, mine);
  await go('#/planning');
  let txt = await visibleText();
  L.check('planning : écran « Planning » affiché', /Planning/.test(txt) && /Ajouter une tâche/.test(txt));
  L.check('planning : arrosage en retard généré depuis les pots', /En retard/.test(txt) && /Arroser : Pot du coin/.test(txt));
  L.check('planning : gestes du mois générés (cette semaine ou aujourd\'hui)', await ev(() => T.planning.all().filter((x) => x.kind === 'geste').length === 4));
  if (mine) L.check('planning : ' + mine.kind + ' ' + mine.nom + ' proposé pour la plante d\'un pot', await ev((m) => T.planning.all().some((x) => x.titre === m.kind + ' : ' + m.nom), mine));
  const c0 = await ev(() => T.planning.todayCount());
  L.check('planning : todayCount compte le retard (>= 1)', c0 >= 1, c0);
  L.check('planning : top(3) renvoie des tâches triées avec retard en premier', await ev(() => { const t = T.planning.top(3); return t.length === 3 && t[0].late === true && t[0].titre.indexOf('Arroser') === 0; }));
  /* ajout via l'interface */
  await page.click('[data-act="ptadd"]'); await L.sleep(150);
  await page.click('.modal-foot .btn.primary'); await L.sleep(150);
  L.check('planning : titre vide refusé, la fenêtre reste ouverte', (await ev(() => T.modalStack.length)) === 1 && (await ev(() => T.store.s.tasks.length)) === 0);
  await page.type('#pl-titre', 'Rempoter le basilic'); await page.select('#pl-rep', 'week'); await page.select('#pl-plante', 'basilic');
  L.check('planning : fenêtre d\'ajout sans débordement', (await L.overflow(page)).length === 0);
  await page.click('.modal-foot .btn.primary'); await L.sleep(250);
  txt = await visibleText();
  L.check('planning : tâche perso ajoutée, dans « Aujourd\'hui », avec répétition et plante', /Aujourd'hui/.test(txt) && /Rempoter le basilic/.test(txt) && /Chaque semaine/.test(txt) && /Fiche : Basilic/.test(txt));
  const saved = await ev(() => JSON.parse(localStorage.getItem('tifa.v1')).tasks);
  L.check('planning : tâche enregistrée', saved.length === 1 && saved[0].plantId === 'basilic' && saved[0].rep === 'week');
  /* cocher : se recrée à la date suivante */
  await page.click('.card.task [data-act="ptdone"][data-k^="p:"]'); await L.sleep(250);
  const afterDone = await ev(() => { const t = T.store.s.tasks; return { n: t.length, done: t.filter((x) => x.done).length, next: t.filter((x) => !x.done)[0], today: T.planning.today() }; });
  L.check('planning : cocher une tâche hebdomadaire crée la suivante +7 jours', afterDone.n === 2 && afterDone.done === 1 && afterDone.next && afterDone.next.date === (await ev((d) => T.planning.addDays(d, 7), afterDone.today)), JSON.stringify(afterDone));
  txt = await visibleText();
  L.check('planning : section « Fait » et « Cette semaine » affichées', /Fait/.test(txt) && /Cette semaine/.test(txt));
  /* reporter */
  await page.click('.card.task [data-act="ptlater1"][data-k^="p:"]'); await L.sleep(200);
  let d1 = await ev(() => T.store.s.tasks.filter((x) => !x.done)[0].date), tm = await ev(() => T.planning.addDays(T.planning.today(), 1));
  L.check('planning : « Reporter à demain »', d1 === tm, d1 + ' / ' + tm);
  await page.click('.card.task [data-act="ptlater7"][data-k^="p:"]'); await L.sleep(200);
  d1 = await ev(() => T.store.s.tasks.filter((x) => !x.done)[0].date);
  L.check('planning : « Reporter d\'une semaine »', d1 === (await ev(() => T.planning.addDays(T.planning.addDays(T.planning.today(), 1), 7))), d1);
  /* tâche auto : reporter et cocher */
  const geste = await ev(() => T.planning.all().filter((x) => x.kind === 'geste')[0].key);
  await page.evaluate((k) => { document.querySelector('[data-act="ptlater1"][data-k="' + k + '"]').click(); }, geste); await L.sleep(150);
  L.check('planning : une tâche automatique peut être reportée', await ev((k) => T.planning.all().filter((x) => x.key === k)[0].date === T.planning.addDays(T.planning.today(), 1), geste));
  await page.evaluate((k) => { document.querySelector('[data-act="ptdone"][data-k="' + k + '"]').click(); }, geste); await L.sleep(150);
  L.check('planning : une tâche automatique peut être cochée', await ev((k) => T.planning.all().filter((x) => x.key === k)[0].done === true, geste));
  /* arrosage coché = pot arrosé */
  const eauKey = await ev(() => T.planning.all().filter((x) => x.kind === 'eau')[0].key);
  await page.evaluate((k) => { document.querySelector('[data-act="ptdone"][data-k="' + k + '"]').click(); }, eauKey); await L.sleep(150);
  L.check('planning : cocher un arrosage marque le pot comme arrosé', await ev(() => T.pots.all().filter((p) => p.id === 'pt1')[0].arrose > Date.now() - 5000) && !(await ev(() => T.planning.all().some((x) => x.kind === 'eau' && !x.done && x.potId === 'pt1' && x.date <= T.planning.today()))));
  /* répétition mensuelle et retard */
  const m = await ev(() => {
    const P = T.planning; P.add({ titre: 'Engrais', date: P.today(), rep: 'month', plantId: '' }); P.add({ titre: 'Hier oublié', date: P.addDays(P.today(), -1), rep: 'none' }); P.add({ titre: 'Plus tard', date: P.addDays(P.today(), 20), rep: 'none' });
    return { bad1: P.add({ titre: '', date: P.today() }), bad2: P.add({ titre: 'x', date: 'pas une date' }), g: P.groups() };
  });
  L.check('planning : refus d\'un titre vide ou d\'une date invalide', !!m.bad1 && !!m.bad2);
  L.check('planning : sections En retard / Plus tard remplies', m.g.late.some((x) => x.titre === 'Hier oublié') && m.g.later.some((x) => x.titre === 'Plus tard'));
  await go('#/planning');
  await page.evaluate(() => { const b = Array.prototype.filter.call(document.querySelectorAll('.card.task'), (c) => /^Engrais/.test(c.querySelector('h3').textContent))[0]; b.querySelector('[data-act="ptdone"]').click(); }); await L.sleep(200);
  const mo = await ev(() => { const t = T.store.s.tasks.filter((x) => x.titre === 'Engrais'); const nx = t.filter((x) => !x.done)[0]; const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 1); return { n: t.length, nx: nx && nx.date, ym: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') }; });
  L.check('planning : répétition mensuelle recrée la tâche le mois suivant', mo.n === 2 && mo.nx && mo.nx.slice(0, 7) === mo.ym, JSON.stringify(mo));
  /* suppression avec confirmation */
  await page.evaluate(() => { const b = Array.prototype.filter.call(document.querySelectorAll('.card.task'), (c) => /^Hier oublié/.test(c.querySelector('h3').textContent))[0]; b.querySelector('[data-act="ptdel"]').click(); }); await L.sleep(150);
  L.check('planning : suppression demande confirmation', (await ev(() => T.modalStack.length)) === 1 && /Supprimer cette tâche/.test(await ev(() => document.querySelector('.modal').innerText)));
  await page.click('.modal-foot .btn:not(.danger):not(.primary)'); await L.sleep(120);
  L.check('planning : annuler garde la tâche', await ev(() => T.store.s.tasks.some((x) => x.titre === 'Hier oublié')));
  await page.evaluate(() => { const b = Array.prototype.filter.call(document.querySelectorAll('.card.task'), (c) => /^Hier oublié/.test(c.querySelector('h3').textContent))[0]; b.querySelector('[data-act="ptdel"]').click(); }); await L.sleep(150);
  await page.click('.modal-foot .btn.danger'); await L.sleep(200);
  L.check('planning : suppression confirmée', !(await ev(() => T.store.s.tasks.some((x) => x.titre === 'Hier oublié'))));
  /* persistance */
  const before = await ev(() => ({ n: T.store.s.tasks.length, auto: Object.keys(T.store.s.planAuto).length }));
  await page.reload({ waitUntil: 'load' }); await page.waitForFunction('window.__TIFA_STARTED === true'); await L.sleep(300);
  const after = await ev(() => ({ n: T.store.s.tasks.length, auto: Object.keys(T.store.s.planAuto).length, done: T.planning.all().filter((x) => x.auto && x.done).length }));
  L.check('planning : tâches et états des tâches automatiques survivent au rechargement', before.n === after.n && before.auto === after.auto && after.done >= 1, JSON.stringify([before, after]));
  /* boutons >= 44 px (échelle normale) */
  await go('#/planning');
  const small = await ev(() => Array.prototype.filter.call(document.querySelectorAll('#view button, #view a.btn, #view .chip'), (b) => { const r = b.getBoundingClientRect(); return r.width && r.height < 43.5; }).map((b) => b.textContent.slice(0, 20)));
  L.check('planning : boutons >= 44 px', small.length === 0, small.join('|'));

  /* ================= ASSISTANT ================= */
  const ask = (q) => ev((q) => { const a = T.assistant.answer(q); return { intent: a.intent, title: a.title, text: [a.title].concat(a.paras || [], a.list || [], a.paras2 || []).join(' | '), hrefs: (a.links || []).map((l) => l.href), mal: a.maladieId || '', month: a.month || 0, count: a.count || 0, plant: a.plantId || '', syms: a.symptoms || [] }; }, q);
  const has = (r, s) => r.hrefs.some((h) => h.indexOf(s) >= 0);
  const Q = [
    ['Quand semer les tomates ?', 'timing', '#/plante/tomate'],
    ['quand semer les tomates cerises', 'timing', '#/plante/tomate-cerise'],
    ['A quelle periode planter la lavande', 'timing', '#/plante/lavande'],
    ['quand recolter les courgettes', 'timing', '#/plante/courgette'],
    ['quant tailler les hortensias', 'timing', '#/plante/hortensia'],
    ['quand tailler le rosier', 'timing', '#/plante/rosier'],
    ['kan semer les carrotes', 'timing', '#/plante/carotte'],
    ['quand fleurit le dahlia', 'timing', '#/plante/dahlia'],
    ['quand mettre les bulbes de tulipes en terre', 'timing', '#/plante/tulipe'],
    ['semer le basilic en quel mois', 'timing', '#/plante/basilic'],
    ['quand recolter l ail', 'timing', '#/plante/ail'],
    ['Où placer un géranium ?', 'where', '#/plante/geranium'],
    ['ou mettre ma menthe', 'where', '#/plante/menthe'],
    ['le basilic aime t il le soleil', 'where', '#/plante/basilic'],
    ['hortensia soleil ou ombre', 'where', '#/plante/hortensia'],
    ['peut on mettre un monstera dans le salon', 'where', '#/plante/monstera'],
    ['la lavande en pot sur mon balcon', 'where', '#/plante/lavande'],
    ['Combien arroser ma menthe ?', 'water', '#/plante/menthe'],
    ['a quelle frequence arroser le cactus', 'water', '#/plante/cactus'],
    ['arosage du ficus', 'water', '#/plante/ficus'],
    ['faut il arroser souvent les tomates', 'water', '#/plante/tomate'],
    ['combien d eau pour mon aloe vera', 'water', '#/plante/aloe-vera'],
    ['Pourquoi les feuilles de mon rosier jaunissent ?', 'symptome', '#/plante/rosier'],
    ['pourquoi mes feuilles jaunissent', 'symptome', '#/maladie/'],
    ['mes feuilles jaunisent', 'symptome', '#/maladie/'],
    ['ma tomate a des taches brunes sur les feuilles', 'symptome', '#/maladie/'],
    ['feuilles couvertes de poudre blanche', 'symptome', '#/maladie/oidium'],
    ['mon basilic est tout fletri', 'symptome', '#/plante/basilic'],
    ['mon ficus perd ses feuilles', 'symptome', '#/plante/ficus'],
    ['comment traiter le mildiou', 'maladie', '#/maladie/mildiou'],
    ['j ai des pucerons sur mes rosiers', 'maladie', '#/maladie/pucerons'],
    ['limaces dans mon potager', 'maladie', '#/maladie/limaces-escargots'],
    ['mon pot est noye, trop arrose', 'maladie', '#/maladie/exces-arrosage'],
    ['comment lutter contre l oidium', 'maladie', '#/maladie/oidium'],
    ['Quelles plantes à côté du basilic ?', 'companion', '#/plante/basilic'],
    ['avec quoi associer les tomates', 'companion', '#/plante/tomate'],
    ['quels sont les mauvais voisins de la carotte', 'companion', '#/plante/carotte'],
    ['Que faire ce mois-ci ?', 'mois', '#/calendrier/'],
    ['que faire au jardin en mars', 'mois', '#/calendrier/3'],
    ['quoi semer en avril', 'mois', '#/calendrier/4'],
    ['quest ce que je peux planter en octobre', 'mois', '#/calendrier/10'],
    ['Plantes pour l\'ombre', 'liste', '#/plante/'],
    ['plantes pour un balcon', 'liste', '#/plante/'],
    ['plantes toxiques pour les chats', 'liste', '#/plante/'],
    ['plantes sans danger pour mon chat', 'liste', '#/plante/'],
    ['des plantes faciles pour debutant', 'liste', '#/plante/'],
    ['plantes d\'interieur', 'liste', '#/plante/'],
    ['quelles fleurs en plein soleil', 'liste', '#/plante/'],
    ['le laurier rose est il toxique pour mon chien', 'toxic', '#/plante/laurier-rose'],
    ['mon citronnier craint il le froid', 'winter', '#/plante/citronnier'],
    ['faut il rentrer le geranium l hiver', 'winter', '#/plante/geranium'],
    ['comment faire du compost', 'conseil', 'compost'],
    ['comment rempoter une plante', 'conseil', 'rempot'],
    ['quel engrais pour mes plantes', 'conseil', 'engrais'],
    ['recuperer l eau de pluie', 'conseil', 'pluie'],
    ['parle moi du basilic', 'plant', '#/plante/basilic'],
    ['quel est le meilleur club de football', 'none', '#/trouver'],
    ['xyzzy qsdfg', 'none', '#/trouver']
  ];
  let bad = 0;
  for (const [q, intent, href] of Q) {
    const r = await ask(q);
    const ok = r.intent === intent && has(r, href);
    if (!ok) bad++;
    L.check('assistant « ' + q + ' » -> ' + intent, ok, r.intent + ' ' + r.hrefs.slice(0, 3).join(','));
  }
  L.check('assistant : ' + Q.length + ' questions variées comprises', bad === 0, bad + ' échec(s)');
  /* contenus des réponses */
  let r = await ask('Quand semer les tomates ?');
  L.check('assistant : semis de tomate = février, mars', /Semis : février, mars/.test(r.text), r.text);
  await ev(() => T.region.set('nord'));
  r = await ask('Quand semer les tomates ?');
  L.check('assistant : semis de tomate décalés au nord = mars, avril', /Semis : mars, avril/.test(r.text) && /Nord/.test(r.text), r.text);
  await ev(() => T.region.set(null));
  r = await ask('feuilles couvertes de poudre blanche');
  L.check('assistant : poudre blanche -> oïdium en premier', r.mal === 'oidium', r.mal);
  r = await ask('plantes pour l\'ombre');
  L.check('assistant : liste d\'ombre = que des plantes d\'ombre', await ev((h) => h.every((x) => { const p = T.plante(x.replace('#/plante/', '')); return !p || p.soleil.indexOf('ombre') >= 0; }), r.hrefs.filter((h) => h.indexOf('#/plante/') === 0)) && r.count > 5);
  r = await ask('plantes toxiques pour les chats');
  L.check('assistant : liste toxique = que des plantes toxiques', await ev((h) => h.filter((x) => x.indexOf('#/plante/') === 0).every((x) => T.plante(x.replace('#/plante/', '')).toxique.chatChien), r.hrefs));
  r = await ask('plantes sans danger pour mon chat');
  L.check('assistant : liste sans danger = aucune plante toxique', await ev((h) => h.filter((x) => x.indexOf('#/plante/') === 0).every((x) => !T.plante(x.replace('#/plante/', '')).toxique.chatChien), r.hrefs) && r.count > 5);
  r = await ask('quel est le meilleur club de football');
  L.check('assistant : question hors sujet = honnêteté « pas la réponse hors connexion »', /pas la réponse hors connexion/.test(r.text), r.text);
  r = await ask('');
  L.check('assistant : question vide sans erreur', r.intent === 'vide');
  r = await ask('<img src=x onerror=alert(1)> ' + 'tomate '.repeat(60));
  L.check('assistant : texte piégé ou très long sans erreur', !!r.intent);
  /* Chaque plante est reconnue par son nom */
  const miss = await ev(() => T.D.plantes.filter((p) => { const a = T.assistant.answer('Quand semer ' + p.nom + ' ?'); return a.plantId !== p.id; }).map((p) => p.id + '->' + T.assistant.answer('Quand semer ' + p.nom + ' ?').plantId));
  L.check('assistant : les ' + (await ev(() => T.D.plantes.length)) + ' plantes sont reconnues par leur nom', miss.length === 0, miss.slice(0, 6).join(' ; '));
  const miss2 = await ev(() => T.D.plantes.filter((p) => { const a = T.assistant.answer('combien arroser ' + p.latin.split(' ')[0].toLowerCase()); return a.intent === 'water' && a.plantId && false; }).length);
  /* interface */
  await go('#/assistant');
  const reqs = []; const onReq = (rq) => { if (!/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(rq.url())) reqs.push(rq.url()); }; page.on('request', onReq);
  await ev(() => { T.store.s.ahist = []; });
  await page.type('#ass-q', 'quand semer les tomates'); await page.keyboard.press('Enter'); await L.sleep(250);
  let out = await ev(() => document.getElementById('ass-out').innerText);
  L.check('assistant (écran) : réponse affichée avec source en lien cliquable', /Semis/.test(out) && !!(await page.$('#ass-out a[href="#/plante/tomate"]')));
  L.check('assistant (écran) : bouton « Écouter la réponse »', /Écouter la réponse/.test(out));
  await page.click('#ass-ex .chip'); await L.sleep(200);
  out = await ev(() => document.getElementById('ass-out').innerText);
  L.check('assistant (écran) : exemple cliquable répond', /Semis/.test(out) || out.length > 20);
  for (let i = 0; i < 12; i++) await ev((i) => T.assistant.ask('quand semer les carottes ' + i), i);
  const hl = await ev(() => T.store.s.ahist.length);
  L.check('assistant : historique limité à 10 questions', hl === 10, hl);
  L.check('assistant (écran) : historique visible en puces', (await ev(() => document.querySelectorAll('#ass-hist .chip').length)) === 10);
  await page.click('[data-act="asstclear"]'); await L.sleep(100);
  L.check('assistant : effacer l\'historique', (await ev(() => T.store.s.ahist.length)) === 0);
  await ev(() => T.assistant.ask('xyzzy qsdfg')); await L.sleep(100);
  out = await ev(() => document.getElementById('ass-out').innerText);
  L.check('assistant (écran) : réponse inconnue honnête + recherche proposée', /pas la réponse hors connexion/.test(out) && !!(await page.$('#ass-out [data-act="asstsearch"]')));
  await page.click('#ass-out [data-act="asstsearch"]'); await L.sleep(250);
  L.check('assistant : le bouton de recherche ouvre « Trouver »', (await ev(() => location.hash)) === '#/trouver');
  await go('#/assistant'); await ev(() => T.assistant.ask('pourquoi mes feuilles jaunissent')); await L.sleep(100);
  await page.click('#ass-out [data-act="asstdiag"]'); await L.sleep(300);
  L.check('assistant : lance le diagnostic par symptômes', (await ev(() => location.hash)) === '#/maladie' && /Diagnostic/.test(await visibleText()) && (await ev(() => T.diag.show)) === true);
  await ev(() => { T.diag.show = false; T.diag.sel = {}; });
  page.off('request', onReq);
  L.check('assistant : aucun appel réseau pendant les questions', reqs.length === 0, reqs.join(' '));
  L.check('aucune erreur JavaScript (région, planning, assistant)', page.errors.filter((e) => !/script-src/.test(e)).length === 0, page.errors.join(' | '));
  await page.close();

  /* ================= DÉBORDEMENTS : 4 profils, texte à 200 % ================= */
  const profils = ['Pixel 8 (Android 14)', 'Samsung Z Fold (plié, Android 14)', 'Samsung Tab A9 tablette (Android 14)', 'Android 12 compact'];
  for (const dev of profils) {
    const pg = await L.newPage(browser, base, dev);
    await L.skipOnboarding(pg);
    await pg.evaluate(() => {
      document.documentElement.style.setProperty('--scale', '2');
      T.store.s.settings.region = 'montagne';
      const old = Date.now() - 12 * 86400000;
      T.store.s.pots = [{ id: 'a', plantId: 'tomate', nom: 'Tomate cerise', surnom: 'Pot de la fenêtre de la cuisine', zone: 'plein_soleil', added: old, arrose: old }];
      T.store.s.tasks = [];
      T.planning.add({ titre: 'Rempoter le grand hortensia du fond de la cour avant les premières gelées', date: T.planning.addDays(T.planning.today(), -2), rep: 'week', plantId: 'hortensia' });
      T.planning.add({ titre: 'Engrais', date: T.planning.today(), rep: 'month' });
      T.planning.add({ titre: 'Tailler', date: T.planning.addDays(T.planning.today(), 3), rep: 'none' });
      T.planning.add({ titre: 'Récolter', date: T.planning.addDays(T.planning.today(), 30), rep: 'none' });
      T.store.save();
    });
    const pgo = async (h) => { await pg.evaluate((h) => { location.hash = h; T.render(); }, h); await L.sleep(200); };
    const chk = async (name) => { const o = await L.overflow(pg); L.check(dev + ' @200 % : ' + name + ' sans débordement', o.length === 0, o.join(' | ')); };
    await pgo('#/calendrier/4'); await chk('calendrier avec région');
    await pg.click('[data-act="regionpick"]'); await L.sleep(150); await chk('fenêtre de choix de région');
    await pg.evaluate(() => T.closeModal());
    await pgo('#/planning'); await chk('planning');
    await pg.evaluate(() => { const b = document.querySelector('[data-act="ptdone"]'); b.click(); }); await L.sleep(150);
    await chk('planning après avoir coché');
    await pg.click('[data-act="ptadd"]'); await L.sleep(150); await chk('fenêtre « Nouvelle tâche »');
    const foot = await pg.evaluate(() => { const f = document.querySelector('.modal-foot').getBoundingClientRect(); return f.bottom <= window.innerHeight + 1; });
    L.check(dev + ' @200 % : boutons de la fenêtre visibles', foot);
    await pg.evaluate(() => T.closeModal());
    await pg.evaluate(() => { document.querySelector('[data-act="ptdel"]').click(); }); await L.sleep(150); await chk('confirmation de suppression');
    await pg.evaluate(() => T.closeModal());
    await pgo('#/assistant');
    for (const q of ['Quelles plantes à côté du basilic ?', 'plantes toxiques pour les chats', 'Pourquoi les feuilles de mon rosier jaunissent ?', 'xyzzy qsdfg', 'que faire ce mois-ci']) {
      await pg.evaluate((q) => T.assistant.ask(q), q); await L.sleep(120); await chk('assistant « ' + q.slice(0, 22) + ' »');
    }
    L.check(dev + ' : aucune erreur JavaScript', pg.errors.filter((e) => !/script-src/.test(e)).length === 0, pg.errors.join(' | '));
    await pg.close();
  }
};
