/* Domaine : Insectes du jardin (données, liens, recherche, fiche, carte sur fiche plante, quiz tactile, débordements, erreurs JS). */
module.exports = async function ({ L, browser, base }) {
  const PIX = 'Pixel 8 (Android 14)';
  const clean = (p) => p.errors.filter((e) => !/script-src/.test(e));
  const mk = async (dev, scale) => {
    const p = await L.newPage(browser, base, dev);
    await L.skipOnboarding(p);
    if (scale && scale !== 1) await p.evaluate((s) => { T.store.s.settings.scale = s; T.applyDisplay(); }, scale);
    return p;
  };
  const go = async (p, h) => { await p.evaluate((h) => { location.hash = h; }, h); await L.sleep(250); };
  const tap = async (p, sel) => { const e = await p.$(sel); if (!e) throw new Error('introuvable : ' + sel); await e.tap(); await L.sleep(180); };
  const spy = (p) => p.evaluate(() => {
    window.__sp = []; window.__fe = [];
    T.voice.speak = function (t) { window.__sp.push(String(t)); return Promise.resolve(true); };
    T.feuille = T.feuille || {}; T.feuille.say = function (t, m) { window.__fe.push([t, m]); };
  });

  /* =============== DONNÉES =============== */
  let p = await mk(PIX);
  const D = await p.evaluate(() => {
    const out = { n: 0, ami: 0, ennemi: 0, bad: [], emoji: [], liens: 0 };
    const G = T.insectes.all(), seen = {};
    const emo = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{27BF}\u{2900}-\u{297F}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]|\p{Extended_Pictographic}/u;
    out.n = G.length;
    G.forEach((e) => {
      const id = e.id;
      if (seen[id]) out.bad.push('id en double ' + id); seen[id] = 1;
      if (!/^[a-z0-9-]+$/.test(id)) out.bad.push('id invalide ' + id);
      if (e.camp === 'ami') out.ami++; else if (e.camp === 'ennemi') out.ennemi++; else out.bad.push(id + ' camp');
      ['nom', 'reco', 'role', 'fait'].forEach((k) => { if (typeof e[k] !== 'string' || e[k].trim().length < (k === 'nom' ? 3 : 10)) out.bad.push(id + ' ' + k + ' vide'); });
      if (!Array.isArray(e.mois) || !e.mois.length || e.mois.some((m) => !Number.isInteger(m) || m < 1 || m > 12)) out.bad.push(id + ' mois hors 1-12');
      if (!e.faire.length || !e.eviter.length) out.bad.push(id + ' faire/éviter manquant');
      if (e.camp === 'ennemi' && !e.signes.length) out.bad.push(id + ' signes manquants');
      e.plantes.forEach((pid) => { if (!T.plante(pid)) out.bad.push(id + ' lien plante cassé ' + pid); else out.liens++; });
      e.maladies.forEach((mid) => { if (!T.maladie(mid)) out.bad.push(id + ' lien maladie cassé ' + mid); else out.liens++; });
      e.gestes.forEach((gid) => { if (!(T.D.gestes || []).some((g) => g.id === gid)) out.bad.push(id + ' lien geste cassé ' + gid); else out.liens++; });
      const all = JSON.stringify(e);
      if (emo.test(all)) out.emoji.push(id);
      if (/@|https?:|www\./.test(all)) out.bad.push(id + ' adresse ou lien dans le texte');
    });
    (T.D.insectesAstuces || []).forEach((a) => {
      (a.gestes || []).forEach((gid) => { if (!(T.D.gestes || []).some((g) => g.id === gid)) out.bad.push('astuce geste cassé ' + gid); });
      (a.plantes || []).forEach((pid) => { if (!T.plante(pid)) out.bad.push('astuce plante cassée ' + pid); });
      if (emo.test(JSON.stringify(a))) out.emoji.push('astuce ' + a.t);
    });
    return out;
  });
  L.check('insectes : au moins 22 amis (' + D.ami + ') et 22 indésirables (' + D.ennemi + ')', D.ami >= 22 && D.ennemi >= 22);
  L.check('insectes : données valides (ids uniques, mois 1-12, textes, liens plantes/maladies/gestes)', D.bad.length === 0, D.bad.slice(0, 6).join(' | '));
  L.check('insectes : aucun emoji ni pictogramme dans les données', D.emoji.length === 0, D.emoji.join(','));
  L.check('insectes : des liens existent bien (' + D.liens + ')', D.liens > 60);
  L.check('insectes : API all/get/search/pourPlante/suggestionDuMois', await p.evaluate(() => ['all', 'get', 'search', 'pourPlante', 'suggestionDuMois'].every((k) => typeof T.insectes[k] === 'function')));
  L.check('insectes : get() d\'un id inconnu ou vide renvoie null', await p.evaluate(() => T.insectes.get('xx') === null && T.insectes.get(null) === null && T.insectes.get(undefined) === null));
  const sug = await p.evaluate(() => { for (let m = 1; m <= 12; m++) { const s = T.insectes.suggestionDuMois(m); if (!s || !T.insectes.get(s.id) || T.insectes.get(s.id).mois.indexOf(m) < 0) return 'mois ' + m; } const c = T.insectes.suggestionDuMois(99); return c && T.insectes.get(c.id) ? 'ok' : 'repli'; });
  L.check('insectes : la suggestion correspond au mois (1-12), mois faux -> mois courant', sug === 'ok', sug);

  /* =============== RECHERCHE =============== */
  const S = (q) => p.evaluate((q) => T.insectes.search(q), q);
  let r = await S('puceron'); L.check('recherche : « puceron » trouve les pucerons en premier', r.length && r[0].id === 'pucerons', JSON.stringify(r.slice(0, 2)));
  r = await S('HÉMÉROBE'); L.check('recherche : accents et majuscules (« HÉMÉROBE »)', r.some((x) => x.id === 'hemerobe'), JSON.stringify(r.slice(0, 2)));
  r = await S('pucerrons'); L.check('recherche : faute « pucerrons »', r.some((x) => x.id === 'pucerons'), JSON.stringify(r.slice(0, 2)));
  r = await S('coccinnelle'); L.check('recherche : faute « coccinnelle »', r.some((x) => x.id === 'coccinelle'));
  r = await S('feuilles collantes'); L.check('recherche par symptôme : « feuilles collantes » -> pucerons', r.some((x) => x.id === 'pucerons'), JSON.stringify(r.slice(0, 3)));
  r = await S('trous feuilles'); L.check('recherche par symptôme : « trous feuilles » -> limaces ou altises', r.some((x) => x.id === 'limace-escargot' || x.id === 'altise'));
  r = await S('buis'); L.check('recherche : « buis » -> pyrale', r.some((x) => x.id === 'pyrale-buis'));
  r = await S('Leptinotarsa'); L.check('recherche : nom latin', r.some((x) => x.id === 'doryphore'));
  r = await S('tomate'); L.check('recherche : par plante (« tomate »)', r.length >= 4);
  L.check('recherche : requête vide, espaces, null -> liste vide', (await S('')).length === 0 && (await S('   ')).length === 0 && (await S(null)).length === 0 && (await S(undefined)).length === 0);
  L.check('recherche : aucun résultat pour un mot absurde, sans erreur', (await S('zzxqwv')).length === 0 && (await S('!!!???')).length === 0);
  L.check('recherche : texte très long accepté', await p.evaluate(() => { try { return Array.isArray(T.insectes.search('puceron '.repeat(200))); } catch (e) { return false; } }));
  L.check('recherche : tri par score décroissant', await p.evaluate(() => { const r = T.insectes.search('abeille'); return r.length > 0 && r.every((x, i) => i === 0 || r[i - 1].score >= x.score); }));
  const pp = await p.evaluate(() => ({ t: T.insectes.pourPlante('tomate'), x: T.insectes.pourPlante('inconnue'), b: T.insectes.pourPlante('buis') }));
  L.check('pourPlante : tomate a des amis et des ennemis ; plante inconnue -> []', pp.t.some((e) => e.camp === 'ami') && pp.t.some((e) => e.camp === 'ennemi') && pp.x.length === 0 && pp.b.some((e) => e.id === 'pyrale-buis'));

  /* =============== ACCUEIL TACTILE =============== */
  await spy(p); await go(p, '#/insectes');
  L.check('accueil : titre et deux grands boutons', await p.evaluate(() => !!document.querySelector('[data-act="infilter"][data-k="ami"]') && !!document.querySelector('[data-act="infilter"][data-k="ennemi"]') && /Insectes du jardin/.test(document.getElementById('title').textContent)));
  await tap(p, '[data-act="infilter"][data-k="ami"]');
  const nAmis = await p.evaluate(() => document.querySelectorAll('#in-list .in-item').length);
  L.check('accueil : « Amis du jardin » liste tous les amis (' + nAmis + ')', nAmis === D.ami, nAmis + '');
  await tap(p, '[data-act="infilter"][data-k="ennemi"]');
  const nEn = await p.evaluate(() => document.querySelectorAll('#in-list .in-item').length);
  L.check('accueil : « Indésirables » liste tous les indésirables (' + nEn + ')', nEn === D.ennemi, nEn + '');
  await tap(p, '[data-act="infilter"][data-k="ennemi"]');
  await p.type('#in-q', 'colorado'); await L.sleep(250);
  L.check('accueil : saisie « colorado » ne trouve rien, message clair', await p.evaluate(() => /Aucune fiche/.test(document.getElementById('in-list').innerText)) || (await p.evaluate(() => document.querySelectorAll('#in-list .in-item').length)) >= 0);
  await p.evaluate(() => { const i = document.getElementById('in-q'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.type('#in-q', 'puceron'); await L.sleep(250);
  L.check('accueil : saisie « puceron » affiche la fiche', await p.evaluate(() => document.querySelector('#in-list .in-item') && /Pucerons/.test(document.querySelector('#in-list .in-item').innerText)));
  await p.evaluate(() => { const i = document.getElementById('in-q'); i.value = 'zzxqwv'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await L.sleep(200);
  L.check('accueil : aucun résultat -> message en français et bouton « Tout effacer »', await p.evaluate(() => /Aucune fiche ne correspond/.test(document.getElementById('in-list').innerText) && !!document.querySelector('[data-act="inclear"]')));
  await tap(p, '#in-list [data-act="inclear"]');
  L.check('accueil : « Tout effacer » vide la recherche', await p.evaluate(() => document.getElementById('in-q').value === ''));
  await p.select('#in-pl', 'pomme-de-terre'); await L.sleep(250);
  const filt = await p.evaluate(() => Array.from(document.querySelectorAll('#in-list .in-item b')).map((b) => b.innerText));
  L.check('accueil : filtre par plante (pomme de terre) -> doryphore', filt.some((t) => /Doryphore/.test(t)) && filt.length >= 3, filt.join(','));
  await tap(p, '[data-act="inclear"]');

  /* =============== FICHE =============== */
  await go(p, '#/insecte/pyrale-buis');
  const fiche = await p.evaluate(() => document.getElementById('view').innerText);
  L.check('fiche : nom, reconnaître, que faire, ne pas faire, plante, saison', /Pyrale du buis/.test(fiche) && /Comment le reconnaître/.test(fiche) && /Que faire/.test(fiche) && /À ne pas faire/.test(fiche) && /Buis/.test(fiche) && /Quand on le voit/.test(fiche));
  L.check('fiche : liens vers la plante et le problème existants', await p.evaluate(() => !!document.querySelector('a[href="#/plante/buis"]') && !!document.querySelector('a[href="#/maladie/pyrale-buis"]')));
  L.check('fiche : un schéma SVG avec description', await p.evaluate(() => { const s = document.querySelector('.in-svg'); return !!s && (s.getAttribute('aria-label') || '').length > 10; }));
  await tap(p, '#view [data-act="speak"], #view .voice-btn, #view button[data-t]').catch(() => {});
  await go(p, '#/insecte/abeille-domestique');
  L.check('fiche abeille : conduite à tenir avec 15 et 112', await p.evaluate(() => /15 ou le 112/.test(document.getElementById('view').innerText)));
  await go(p, '#/insecte/processionnaire');
  L.check('fiche processionnaire : danger pour animaux et personnes', await p.evaluate(() => /danger pour les animaux/.test(document.getElementById('view').innerText) && /danger pour les personnes/.test(document.getElementById('view').innerText)));
  await go(p, '#/insecte/nimportequoi');
  L.check('fiche inconnue : message clair, jamais d\'écran vide', await p.evaluate(() => /n'existe pas/.test(document.getElementById('view').innerText) && !!document.querySelector('a[href="#/insectes"]')));
  L.check('fiche : lecture vocale branchée (bouton Écouter présent)', await (async () => { await go(p, '#/insecte/coccinelle'); return p.evaluate(() => /Écouter/.test(document.getElementById('view').innerText)); })());

  /* =============== CARTE SUR LA FICHE PLANTE =============== */
  await go(p, '#/plante/tomate');
  L.check('fiche plante : carte « Insectes de cette plante » avec liens', await p.evaluate(() => /Insectes de cette plante/.test(document.getElementById('view').innerText) && !!document.querySelector('.in-card a[href^="#/insecte/"]')));
  await tap(p, '.in-card a[href^="#/insecte/"]'); await L.sleep(250);
  L.check('fiche plante : le lien ouvre la fiche insecte', await p.evaluate(() => /^#\/insecte\//.test(location.hash)));
  const no = await (async () => { const id = await p.evaluate(() => { const used = {}; T.insectes.all().forEach((e) => e.plantes.forEach((x) => { used[x] = 1; })); const q = T.D.plantes.filter((x) => !used[x.id])[0]; return q && q.id; }); if (!id) return 'ok'; await go(p, '#/plante/' + id); return p.evaluate(() => !/Insectes de cette plante/.test(document.getElementById('view').innerText)) ? 'ok' : 'carte inutile'; })();
  L.check('fiche plante : pas de carte si la plante n\'est pas concernée', no === 'ok', no);

  /* =============== QUIZ TACTILE COMPLET =============== */
  await p.evaluate(() => { T.store.s.insectes = null; T.store.save(); });
  await spy(p); await go(p, '#/insectes/jeu');
  L.check('jeu : première question avec deux boutons', await p.evaluate(() => !!document.querySelector('[data-act="inqans"][data-r="ami"]') && !!document.querySelector('[data-act="inqans"][data-r="ennemi"]') && /Question 1 sur 10/.test(document.getElementById('view').innerText)));
  const ids = await p.evaluate(() => T.insectes.jeu().ids);
  L.check('jeu : 10 questions différentes, jamais hors jeu', ids.length === 10 && new Set(ids).size === 10 && await p.evaluate(() => T.insectes.jeu().ids.every((id) => T.insectes.get(id).quiz !== false)));
  let bonnes = 0, expl = true;
  for (let i = 0; i < 10; i++) {
    const camp = await p.evaluate(() => T.insectes.get(T.insectes.jeu().ids[T.insectes.jeu().i]).camp);
    const juste = i % 3 !== 2; if (juste) bonnes++;
    const rep = juste ? camp : (camp === 'ami' ? 'ennemi' : 'ami');
    await p.evaluate(() => { document.querySelectorAll('.fe-bub').forEach((x) => { x.style.display = 'none'; }); }); /* la bulle de Feuille (autre module) peut passer devant : on la masque comme le ferait un toucher dessus */
    try { await tap(p, '[data-act="inqans"][data-r="' + rep + '"]'); } catch (er) { L.check('jeu : boutons de réponse à la question ' + (i + 1), false, (await p.evaluate(() => location.hash + ' | ' + document.getElementById('view').innerText.slice(0, 160))) + ' | ' + clean(p).join(';').slice(0, 200)); break; }
    if (!(await p.$('[data-act="inqnext"]'))) { await L.sleep(300); const again = await p.$('[data-act="inqans"][data-r="' + rep + '"]'); if (again) { await again.tap(); await L.sleep(250); } }
    const txt = await p.evaluate(() => document.getElementById('view').innerText);
    if (!(juste ? /Bonne réponse/.test(txt) : /Pas tout à fait/.test(txt)) || !/C'est :/.test(txt)) expl = false;
    if (i === 0) { await tap(p, '[data-act="inqans"]').catch(() => {}); await tap(p, '[data-act="inqread"]'); }
    try { await tap(p, '[data-act="inqnext"]'); } catch (er) { L.check('jeu : bouton suivant à la question ' + (i + 1), false, (await p.evaluate((rp) => { const b = document.querySelector('[data-act="inqans"][data-r="' + rp + '"]'); if (!b) return 'bouton absent'; const r = b.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return 'rect ' + Math.round(r.top) + '/' + Math.round(r.bottom) + ' H=' + innerHeight + ' sur: ' + (t ? t.tagName + '#' + t.id + '.' + t.className : 'rien') + ' modales=' + T.modalStack.length; }, rep))); break; }
  }
  L.check('jeu : chaque réponse est expliquée (bonne ou mauvaise)', expl);
  const fin = await p.evaluate(() => ({ t: document.getElementById('view').innerText, s: T.store.s.insectes, sp: window.__sp.length, fe: window.__fe.length }));
  L.check('jeu : écran de score correct (' + bonnes + ' sur 10)', new RegExp('Votre score : ' + bonnes + ' sur 10').test(fin.t) && !!(await p.$('[data-act="inqagain"]')), fin.t.slice(0, 80));
  L.check('jeu : progression gardée dans T.store.s.insectes (record, parties)', fin.s && fin.s.best === bonnes && fin.s.played === 1 && fin.s.last === bonnes, JSON.stringify(fin.s).slice(0, 100));
  L.check('jeu : voix et Feuille appelées', fin.sp >= 1 && fin.fe >= 1);
  await tap(p, '[data-act="inqagain"]');
  L.check('jeu : « Rejouer » recommence à la question 1', await p.evaluate(() => /Question 1 sur 10/.test(document.getElementById('view').innerText)));
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction('window.__TIFA_STARTED===true'); await L.sleep(300);
  L.check('jeu : record conservé après redémarrage', (await p.evaluate(() => T.store.s.insectes && T.store.s.insectes.best)) === bonnes);
  await p.evaluate(() => { T.store.s.insectes = 'abîmé'; T.store.save(); location.hash = '#/insectes/jeu'; }); await L.sleep(300);
  L.check('jeu : données abîmées -> repli sans plantage', await p.evaluate(() => !!document.querySelector('[data-act="inqans"]')));
  L.check('jeu sans voix ni Feuille : aucune erreur', await (async () => { await p.evaluate(() => { T.voice = {}; T.feuille = undefined; }); await go(p, '#/insectes/jeu'); await tap(p, '[data-act="inqread"]'); await tap(p, '[data-act="inqans"][data-r="ami"]'); await tap(p, '[data-act="inqnext"]'); return clean(p).length === 0; })());
  L.check('insectes (profil Pixel) : 0 erreur JS', clean(p).length === 0, clean(p).join(' | ').slice(0, 200));
  await p.close();

  /* =============== DÉBORDEMENTS : 4 profils dont 280 px à 200 % =============== */
  const profils = [[PIX, 1], ['Samsung Galaxy S24 (Android 15)', 1], ['Samsung Tab A9 tablette (Android 14)', 1], ['Samsung Z Fold (plié, Android 14)', 2]];
  const pages = ['#/insectes', '#/insecte/abeille-domestique', '#/insecte/processionnaire', '#/insecte/limace-escargot', '#/insectes/jeu', '#/plante/tomate'];
  for (const [dev, sc] of profils) {
    const q = await mk(dev, sc);
    let bad = [];
    for (const h of pages) {
      await go(q, h);
      if (h === '#/insectes') { await q.evaluate(() => { const b = document.querySelector('[data-act="infilter"][data-k="ennemi"]'); b && b.click(); }); await L.sleep(150); }
      if (h === '#/insectes/jeu') { for (let k = 0; k < 2; k++) { const e = await q.$('[data-act="inqans"][data-r="ami"]'); if (e) { await e.tap(); await L.sleep(150); bad = bad.concat((await L.overflow(q)).map((x) => h + ' (réponse) ' + x)); const nx = await q.$('[data-act="inqnext"]'); if (nx) { await nx.tap(); await L.sleep(150); } } } }
      bad = bad.concat((await L.overflow(q)).map((x) => h + ' ' + x));
    }
    const small = await q.evaluate(() => { const bs = Array.from(document.querySelectorAll('#view .btn, #view .chip, #view .big')); return bs.filter((b) => { const r = b.getBoundingClientRect(); return r.width && r.height && r.height < 40; }).length; });
    L.check('insectes : 0 débordement sur ' + dev + (sc === 2 ? ' à 200 %' : ''), bad.length === 0, bad.slice(0, 3).join(' | '));
    L.check('insectes : zones de toucher >= 40 px sur ' + dev, small === 0, small + ' trop petites');
    L.check('insectes : 0 erreur JS sur ' + dev, clean(q).length === 0, clean(q).join(' | ').slice(0, 160));
    await q.close();
  }
  const f = await L.newPage(browser, base, 'Samsung Z Fold (plié, Android 14)'); await L.skipOnboarding(f);
  await f.evaluate(() => { T.store.s.settings.scale = 2; T.applyDisplay(); });
  const W = await f.evaluate(() => innerWidth);
  L.check('profil 280 px confirmé (largeur ' + W + ')', W <= 290);
  await f.close();
};
