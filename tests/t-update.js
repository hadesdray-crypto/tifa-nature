/* Mise à jour sur place : faux téléphone (fichiers en mémoire, WebView simulé) + serveur de mise à jour simulé (paquet réellement fabriqué par scripts/build-ota.js). */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const FAKE = () => {
  const store = {}; window.__FS = store; window.__calls = { dl: 0, set: [], persist: 0, fetch: 0 };
  const b64 = (s) => s;
  const kids = (p) => Object.keys(store).filter((k) => k === p || k.indexOf(p + '/') === 0);
  window.__TIFA_FAKE_NATIVE = {
    Dir: { Data: 'DATA' },
    FS: {
      writeFile: (o) => { if (window.__FAILWRITE && window.__FAILWRITE(o.path)) return Promise.reject(new Error('disque plein')); store[o.path] = o.data; return Promise.resolve(); },
      readFile: (o) => (o.path in store ? Promise.resolve({ data: store[o.path] }) : Promise.reject(new Error('absent'))),
      downloadFile: (o) => { if (window.__NODL) return Promise.reject(new Error('pas de téléchargement natif')); window.__calls.dl++; return fetch(o.url).then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); }).then((buf) => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); store[o.path] = btoa(s); }); },
      rename: (o) => { const m = kids(o.from); if (!m.length) return Promise.reject(new Error('rien')); m.forEach((k) => { store[o.to + k.slice(o.from.length)] = store[k]; delete store[k]; }); return Promise.resolve(); },
      rmdir: (o) => { kids(o.path).forEach((k) => delete store[k]); return Promise.resolve(); },
      readdir: (o) => { const set = {}; Object.keys(store).forEach((k) => { if (k.indexOf(o.path + '/') === 0) set[k.slice(o.path.length + 1).split('/')[0]] = 1; }); return Promise.resolve({ files: Object.keys(set).map((n) => ({ name: n })) }); },
      getUri: (o) => Promise.resolve({ uri: 'file:///data/user/0/app/files/' + o.path })
    },
    WebView: { setServerBasePath: (o) => { window.__calls.set.push(o.path); return Promise.resolve(); }, persistServerBasePath: () => { window.__calls.persist++; return Promise.resolve(); } }
  };
};
module.exports = async function ({ L, browser, base }) {
  const S = '/tmp/claude-0/-home-claude/291d91b7-2b30-5f78-9362-9fd9913133b2/scratchpad/otatest';
  execFileSync('node', [path.join(__dirname, '..', 'scripts', 'build-ota.js'), '--out', S, '--manifest-url', 'https://ota.test/ota/manifest.json']);
  const man = JSON.parse(fs.readFileSync(S + '/manifest.json', 'utf8'));
  man.versionCode = 99; man.version = '9.9.9'; man.changes = Array.from({ length: 40 }, (_, i) => 'Nouveauté numéro ' + (i + 1) + ' : une phrase un peu longue pour tester.');
  const state = { manifest: man, corrupt: null, failAfter: null, served: 0, hits: {} };
  async function attach(p) {
    await p.setRequestInterception(true);
    p.on('request', (req) => {
      const u = req.url();
      if (!u.startsWith('https://ota.test/')) return req.continue();
      const rel = u.replace('https://ota.test/ota/', '').split('?')[0];
      if (state.offline) return req.abort('internetdisconnected');
      if (rel === 'manifest.json') return state.badManifest ? req.respond({ status: 200, contentType: 'application/json', body: '{"oups":1}' }) : req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(state.manifest), headers: { 'Access-Control-Allow-Origin': '*' } });
      const f = rel.replace(/^files\//, ''), fp = path.join(S, 'files', f);
      state.hits[f] = (state.hits[f] || 0) + 1;
      if (state.failAfter !== null && state.served >= state.failAfter) return req.respond({ status: 503, body: 'indisponible', headers: { 'Access-Control-Allow-Origin': '*' } });
      if (!fs.existsSync(fp)) return req.respond({ status: 404, body: 'x' });
      state.served++;
      let body = fs.readFileSync(fp); if (state.corrupt === f) body = Buffer.concat([body, Buffer.from('X')]);
      req.respond({ status: 200, body, headers: { 'Access-Control-Allow-Origin': '*' } });
    });
  }
  async function mk(opts) {
    const p = await L.newPage(browser, base, (opts && opts.dev) || 'Pixel 8 (Android 14)', { beforeLoad: FAKE });
    await L.skipOnboarding(p);
    await attach(p);
    await p.evaluate(() => { T.cfg.UPDATE_MANIFEST_URL = 'https://ota.test/ota/manifest.json'; });
    return p;
  }
  const ok = (p) => p.errors.filter((e) => !/script-src|ERR_|Failed to load|503|404/.test(e)).length === 0;
  const lastCalls = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.__calls)));

  /* 1. Détection + fenêtre */
  let p = await mk();
  let st = await p.evaluate(() => T.updater.check());
  L.check('mise à jour : une nouvelle version est détectée', st === 'disponible', st);
  await p.evaluate(() => T.updater.showModal(T.updater.manifest)); await L.sleep(200);
  const mo = await p.evaluate(() => { const m = document.querySelector('.modal'); return { txt: m.innerText, buttons: [...document.querySelectorAll('.modal-foot .btn')].map((b) => b.innerText) }; });
  L.check('mise à jour : la fenêtre liste ce qui change et propose Plus tard / Mettre à jour', /Version 9.9.9/.test(mo.txt) && /Nouveauté numéro 40/.test(mo.txt) && mo.buttons.join('|') === 'Plus tard|Mettre à jour', JSON.stringify(mo.buttons));
  L.check('mise à jour : fenêtre sans débordement, boutons visibles (40 changements)', (await L.overflow(p)).length === 0);
  /* 2. Installation complète (téléchargement natif) */
  await (await p.$$('.modal-foot .btn'))[1].tap();
  await p.waitForFunction('window.__calls.set.length>0', { timeout: 20000 }).catch(() => {});
  let c = await lastCalls(p);
  L.check('mise à jour : tous les fichiers sont téléchargés et vérifiés (' + man.files.length + ')', Object.keys(await p.evaluate(() => window.__FS)).filter((k) => k.indexOf('ota/v99/') === 0).length === man.files.length);
  L.check('mise à jour : l\'appli bascule sur le nouveau dossier (setServerBasePath)', c.set.length === 1 && /ota\/v99$/.test(c.set[0]), JSON.stringify(c.set));
  L.check('mise à jour : la version d\'essai est notée, rien n\'est encore définitif', (await p.evaluate(() => T.store.s.ota.trial && T.store.s.ota.trial.vc)) === 99 && c.persist === 0);
  L.check('mise à jour : pas de dossier temporaire laissé', !Object.keys(await p.evaluate(() => window.__FS)).some((k) => k.indexOf('tmp-') >= 0));
  /* 3. Redémarrage qui échoue (le code d'appli reste 1) -> retour automatique */
  const saved = await p.evaluate(() => ({ s: localStorage.getItem('tifa.v1'), fs: window.__FS }));
  const p2 = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: `(${FAKE})();(()=>{try{localStorage.setItem('tifa.v1',${JSON.stringify(saved.s)})}catch(e){}; const S=window.__FS; const FS0=${JSON.stringify(saved.fs)}; Object.keys(FS0).forEach(k=>S[k]=FS0[k]);})();` });
  await attach(p2); await L.sleep(600);
  const rb = await p2.evaluate(() => ({ cur: T.store.s.ota.current, failed: T.store.s.ota.failed, trial: T.store.s.ota.trial, toast: document.getElementById('toast').innerText, left: Object.keys(window.__FS).filter((k) => k.indexOf('ota/v99') === 0).length }));
  L.check('mise à jour : si la nouvelle version ne démarre pas, retour automatique à l\'ancienne + message', rb.cur === null && rb.failed.indexOf(99) >= 0 && rb.trial === null && /conservée/.test(rb.toast) && rb.left === 0, JSON.stringify(rb));
  st = await p2.evaluate(() => { T.cfg.UPDATE_MANIFEST_URL = 'https://ota.test/ota/manifest.json'; return T.updater.check(); });
  L.check('mise à jour : une version qui a échoué n\'est pas reproposée en boucle', st === 'a_jour', st);
  /* 4. Démarrage réussi -> validation définitive + nettoyage */
  const p3 = await mk(); await p3.evaluate(() => T.updater.check()); await p3.evaluate(() => T.updater.run(T.updater.manifest)).catch(() => {});
  await p3.evaluate(() => { T.cfg.VERSION_CODE = 99; T.updater.markHealthy(); }); await L.sleep(400);
  c = await lastCalls(p3);
  L.check('mise à jour : au démarrage réussi, la nouvelle version devient définitive', c.persist === 1 && (await p3.evaluate(() => T.store.s.ota.trial)) === null);
  /* 5. Reprise après coupure en plein téléchargement */
  state.hits = {}; state.served = 0; state.failAfter = 10;
  const p4 = await mk(); await p4.evaluate(() => { window.__NODL = false; });
  await p4.evaluate(() => T.updater.check());
  const r1 = await p4.evaluate(() => T.updater.run(T.updater.manifest).then(() => 'ok', (e) => 'echec:' + e.message));
  const partial = Object.keys(await p4.evaluate(() => window.__FS)).filter((k) => k.indexOf('tmp-99/') >= 0).length;
  L.check('mise à jour : réseau coupé en route -> échec propre, fichiers déjà reçus conservés (' + partial + ')', /^echec/.test(r1) && partial >= 5 && (await lastCalls(p4)).set.length === 0, r1 + ' ' + partial);
  state.failAfter = null; state.hits = {};
  const r2 = await p4.evaluate(() => T.updater.run(T.updater.manifest).then(() => 'ok', (e) => 'echec:' + e.message));
  const reDl = Object.values(state.hits).reduce((a, b) => a + b, 0);
  L.check('mise à jour : « Reprendre » ne retélécharge que ce qui manque (' + reDl + ' / ' + man.files.length + ' fichiers)', r2 === 'ok' && reDl < man.files.length && (await lastCalls(p4)).set.length === 1, r2 + ' ' + reDl);
  /* 6. Cascade de méthodes : téléchargement natif indisponible -> fetch/XHR */
  state.hits = {}; const p5 = await mk(); await p5.evaluate(() => { window.__NODL = true; }); await p5.evaluate(() => T.updater.check());
  const r3 = await p5.evaluate(() => T.updater.run(T.updater.manifest).then(() => 'ok', (e) => 'echec:' + e.message));
  L.check('mise à jour : sans téléchargement natif, la méthode suivante (fetch) prend le relais', r3 === 'ok' && (await lastCalls(p5)).dl === 0 && (await lastCalls(p5)).set.length === 1, r3);
  /* 7. Fichier corrompu -> refusé, jamais installé */
  state.corrupt = 'js/app.js'; const p6 = await mk(); await p6.evaluate(() => T.updater.check());
  const r4 = await p6.evaluate(() => T.updater.run(T.updater.manifest).then(() => 'ok', (e) => 'echec:' + e.message));
  L.check('mise à jour : un fichier corrompu est détecté (somme de contrôle) et RIEN n\'est installé', /^echec/.test(r4) && (await lastCalls(p6)).set.length === 0 && (await p6.evaluate(() => T.store.s.ota.current || null)) === null, r4);
  state.corrupt = null;
  /* 8. Manifest invalide / même version / hors connexion / chemin dangereux */
  state.badManifest = true; const p7 = await mk(); st = await p7.evaluate(() => T.updater.check());
  L.check('mise à jour : fichier de mise à jour incorrect -> erreur claire', st === 'erreur', st); state.badManifest = false;
  const evil = JSON.parse(JSON.stringify(man)); evil.files[1].path = '../../etc/passwd'; state.manifest = evil;
  const p8 = await mk(); st = await p8.evaluate(() => T.updater.check());
  L.check('mise à jour : chemin dangereux (../) refusé', st === 'erreur', st);
  const same = JSON.parse(JSON.stringify(man)); same.versionCode = 1; state.manifest = same; const p9 = await mk(); st = await p9.evaluate(() => T.updater.check());
  L.check('mise à jour : même version = « à jour »', st === 'a_jour', st);
  state.manifest = man; state.offline = true; const p10 = await mk(); st = await p10.evaluate(() => T.updater.check());
  L.check('mise à jour : serveur injoignable -> message clair, sans plantage', st === 'erreur' && ok(p10), st); state.offline = false;
  const hosts = JSON.parse(JSON.stringify(man)); hosts.base = 'https://autre-serveur.test/files/'; state.manifest = hosts; const p11 = await mk(); await p11.evaluate(() => T.updater.check()).catch(() => {});
  const r5 = await p11.evaluate(() => T.updater.run(T.updater.manifest).then(() => 'ok', (e) => 'echec:' + e.message)); state.manifest = man;
  L.check('mise à jour : adresse de téléchargement sur un autre serveur refusée', /^echec/.test(r5), r5);
  /* 9. Retour manuel à la version précédente */
  const p12 = await mk(); await p12.evaluate(() => { const o = T.store.s.ota; o.previous = { vc: 1, rel: 'ota/v1', version: '1.0.0' }; o.current = { vc: 99, rel: 'ota/v99', version: '9.9.9' }; return T.updater.rollback(); });
  L.check('mise à jour : « Revenir à la version précédente » fonctionne', (await lastCalls(p12)).set.some((x) => /ota\/v1$/.test(x)));
  /* 10. Écran Mises à jour et appli non native */
  const web = await L.newPage(browser, base, 'Pixel 8 (Android 14)'); await L.skipOnboarding(web);
  await web.evaluate(() => { location.hash = '#/maj'; }); await L.sleep(200);
  L.check('mise à jour : dans le navigateur, écran explicatif sans erreur', (await web.evaluate(() => document.getElementById('view').innerText)).includes('Mises à jour') && ok(web));
};
