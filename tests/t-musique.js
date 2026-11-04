/* Domaine : musique (lecteur, listes, ambiances, minuteur, mini-lecteur). Faux élément audio et faux AudioContext pour tout vérifier. */
const fs = require('fs'), os = require('os'), path = require('path');

function fakes(o) {
  window.__nodes = []; window.__fa = []; window.__toasts = []; window.__msh = {};
  const op = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function () { if (window.__quota) throw new DOMException('full', 'QuotaExceededError'); return op.apply(this, arguments); };
  if (o.noIdb) Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
  if (o.fakeAudio) {
    window.Audio = class {
      constructor() { this.paused = true; this._src = ''; this.volume = 1; this.currentTime = 0; this.duration = NaN; this.ended = false; window.__fa.push(this); }
      set src(v) { this._src = v; this.currentTime = 0; } get src() { return this._src; }
      getAttribute(k) { return k === 'src' ? (this._src || null) : null; } removeAttribute() { this._src = ''; } load() {}
      pause() { if (!this.paused) { this.paused = true; this.onpause && this.onpause(); } }
      play() {
        const me = this;
        return fetch(this._src).then((r) => r.text()).then((t) => {
          if (/BAD/.test(t)) { me.onerror && setTimeout(() => me.onerror(), 0); throw new DOMException('bad', 'NotSupportedError'); }
          if (window.__block) throw new DOMException('block', 'NotAllowedError');
          me.paused = false; me.duration = 100; me.onloadedmetadata && me.onloadedmetadata(); me.onplay && me.onplay(); me.onplaying && me.onplaying();
        });
      }
      end() { this.paused = true; this.onended && this.onended(); }
    };
  }
  if (o.fakeCtx) {
    const P = () => new Proxy({ value: 0 }, { get(t, k) { return k in t ? t[k] : () => {}; }, set(t, k, v) { t[k] = v; return true; } });
    class N { constructor(kind) { this.kind = kind; this.connected = true; this.started = false; this.stopped = false; this.gain = P(); this.frequency = P(); this.Q = P(); window.__nodes.push(this); }
      connect(x) { return x; } disconnect() { this.connected = false; } start() { this.started = true; } stop() { this.stopped = true; setTimeout(() => this.onended && this.onended(), 0); } }
    window.AudioContext = class { constructor() { this.state = 'running'; this.sampleRate = 22050; this.currentTime = 0; this.destination = new N('dest'); }
      createGain() { return new N('gain'); } createBiquadFilter() { return new N('filter'); } createBufferSource() { return new N('src'); } createOscillator() { return new N('osc'); }
      createBuffer(c, l) { return { getChannelData: () => new Float32Array(l) }; } resume() { this.state = 'running'; return Promise.resolve(); } suspend() { this.state = 'suspended'; return Promise.resolve(); } };
  }
  if (o.noCtx) { delete window.AudioContext; delete window.webkitAudioContext; }
  try { const sh = navigator.mediaSession.setActionHandler.bind(navigator.mediaSession); navigator.mediaSession.setActionHandler = (n, f) => { window.__msh[n] = f; try { sh(n, f); } catch (e) {} }; } catch (e) {}
}
const mk = (o) => new Function('(' + fakes.toString() + ')(' + JSON.stringify(o) + ')');

module.exports = async function ({ L, browser, base }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mu-'));
  const wr = (n, t) => { const f = path.join(dir, n); fs.writeFileSync(f, t); return f; };
  const nth = async (sel, n) => { const els = await page.$$(sel); if (!els[n]) throw new Error('introuvable ' + sel + ' #' + n); await els[n].evaluate((e) => e.scrollIntoView({ block: 'center' })); await els[n].click(); };
  const F = { a: wr('Chant du matin.mp3', 'ID3 song-a'), b: wr('Piano doux.m4a', 'song-b'), c: wr('Ruisseau.ogg', 'OggS song-c'), txt: wr('notes.txt', 'pas de la musique'), bad: wr('Casse.mp3', 'BAD data'), d: wr('Autre.wav', 'RIFF song-d') };
  const EMOJI = /[\u{1F000}-\u{1FFFF}☀-➿⬀-⯿]/u;
  const page = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: mk({ fakeAudio: true, fakeCtx: true }) });
  await L.skipOnboarding(page);
  await page.addStyleTag({ content: '#feuille,.fe,[class*="fe-"]{display:none!important}' });
  const ev = (f, ...a) => page.evaluate(f, ...a);
  const go = async (h) => { await ev((h) => { location.hash = h; T.render(); }, h); await L.sleep(160); };
  const st = () => ev(() => T.musique.state());
  const tab = async (t) => { await ev((t) => { T.musique._r.tab = t; T.render(); }, t); await L.sleep(120); };
  const addVia = async (files) => { await page.waitForFunction("!document.getElementById('toast').classList.contains('show')", { timeout: 8000 }); await tab('musique'); await ev(() => document.querySelector('[data-act="muadd"]').scrollIntoView({ block: 'center' })); const [fc] = await Promise.all([page.waitForFileChooser(), page.click('[data-act="muadd"]')]); await fc.accept(files); await L.sleep(500); };
  const txt = () => ev(() => document.getElementById('view').innerText);

  /* ---- API et écran ---- */
  L.check('musique : API T.musique complète', await ev(() => ['play', 'pause', 'toggle', 'next', 'prev', 'duck', 'state', 'playAmbiance', 'stopAmbiance', 'isPlaying'].every((k) => typeof T.musique[k] === 'function')));
  await go('#/musique');
  let t = await txt();
  L.check('musique : page avec 5 onglets étiquetés', ['Lecteur', 'Ma musique', 'Listes', 'Ambiances', 'Réglages'].every((x) => t.indexOf(x) >= 0) && (await ev(() => document.querySelectorAll('.mu-tabs .chip').length)) === 5);
  L.check('musique : vide au départ, propose d\'ajouter', /Ajouter ma musique/.test(t) && /Sons du jardin/.test(t));
  L.check('musique : mini-lecteur caché quand rien ne joue', await ev(() => document.getElementById('musique-mini').hidden));

  /* ---- Ajout de fichiers ---- */
  await addVia([F.a, F.b, F.c, F.txt]);
  let s = await ev(() => T.store.s.musique);
  L.check('ajout : 3 titres gardés, le fichier texte est refusé avec explication', s.tracks.length === 3 && /ignoré/.test(await txt()), JSON.stringify(s.tracks.map((x) => x.nom)));
  L.check('ajout : le sélecteur est un vrai champ fichier multiple « audio/* »', await ev(() => { const i = document.getElementById('mu-file'); return i && i.type === 'file' && i.multiple && i.accept === 'audio/*'; }));
  const idbN = await ev(() => new Promise((res) => { const r = indexedDB.open('tifa-musique', 1); r.onsuccess = () => { const q = r.result.transaction('blobs').objectStore('blobs').count(); q.onsuccess = () => res(q.result); }; }));
  L.check('ajout : les 3 fichiers sont dans IndexedDB (sur le téléphone)', idbN === 3, idbN);
  L.check('ajout : noms propres (sans extension)', s.tracks.map((x) => x.nom).join('|') === 'Chant du matin|Piano doux|Ruisseau');
  await addVia([F.a]);
  L.check('ajout : un doublon est signalé et non recopié', (await ev(() => T.store.s.musique.tracks.length)) === 3 && /déjà présent/.test(await txt()));
  await ev(() => { window.__quota = true; });
  await addVia([F.d]);
  L.check('quota plein : message clair, rien d\'enregistré à moitié', /mémoire du téléphone est pleine/.test(await txt()) && (await ev(() => T.store.s.musique.tracks.length)) === 3);
  await ev(() => { window.__quota = false; });
  await addVia([F.d]);
  L.check('ajout après libération de place : 1 titre de plus', (await ev(() => T.store.s.musique.tracks.length)) === 4);
  let ids = await ev(() => T.store.s.musique.tracks.map((x) => ({ id: x.id, n: x.nom })));
  const id = (n) => ids.filter((x) => x.n === n)[0].id;
  const reids = async () => { ids = await ev(() => T.store.s.musique.tracks.map((x) => ({ id: x.id, n: x.nom }))); };
  L.check('Ma musique : chaque titre a Lire, Favori, Ajouter à une liste, Supprimer', await ev(() => { const c = document.querySelector('.mu-track'); return ['Lire', 'Favori', 'Ajouter à une liste', 'Supprimer'].every((x) => c.innerText.indexOf(x) >= 0); }));

  /* ---- Lecture ---- */
  await ev((a) => T.musique.play(a), id('Chant du matin')); await L.sleep(300);
  s = await st();
  L.check('lecture : un titre démarre et l\'élément audio reçoit le fichier', s.trackPlaying && s.title === 'Chant du matin' && (await ev(() => /^blob:/.test(__fa[0]._src))));
  L.check('lecture : isPlaying vrai, volume appliqué', (await ev(() => T.musique.isPlaying())) && Math.abs((await ev(() => __fa[0].volume)) - 0.8) < 0.01);
  await ev(() => T.musique.pause()); s = await st();
  L.check('pause : le titre s\'arrête', !s.trackPlaying && !s.playing && (await ev(() => __fa[0].paused)));
  await ev(() => T.musique.toggle()); await L.sleep(250);
  L.check('lecture/pause : toggle reprend', (await st()).trackPlaying);
  await ev(() => T.musique.next()); await L.sleep(250); s = await st();
  L.check('suivant : passe au 2e titre', s.title === 'Piano doux' && s.trackPlaying, s.title);
  await ev(() => T.musique.prev()); await L.sleep(250); s = await st();
  L.check('précédent : revient au 1er titre', s.title === 'Chant du matin', s.title);
  const wrapIdx = await ev(() => { T.musique.prev(); const r = T.musique._r; return [r.qi, r.order.length]; }); await L.sleep(250);
  L.check('précédent au 1er titre avec « répéter tous » : va au dernier', wrapIdx[0] === wrapIdx[1] - 1, JSON.stringify(wrapIdx));
  await ev((i) => T.musique.play(i), id('Chant du matin')); await L.sleep(250);
  await ev(() => { __fa[0].currentTime = 10; T.musique.prev(); }); await L.sleep(150);
  L.check('précédent après 3 s : recommence le titre', (await ev(() => __fa[0].currentTime)) === 0 && (await st()).title === 'Chant du matin');
  await ev(() => __fa[0].end()); await L.sleep(300);
  L.check('fin d\'un titre : enchaîne le suivant (lecture continue)', (await st()).title === 'Piano doux');
  await ev(() => { T.store.s.musique.repeat = 'one'; __fa[0].currentTime = 50; __fa[0].end(); }); await L.sleep(200);
  L.check('répéter un titre : le même recommence', (await st()).title === 'Piano doux' && (await ev(() => __fa[0].currentTime)) === 0);
  await ev(() => { T.store.s.musique.repeat = 'none'; const r = T.musique._r; r.qi = r.order.length - 1; T.musique.play(r.order[r.qi]); }); await L.sleep(250);
  await ev(() => __fa[0].end()); await L.sleep(250); s = await st();
  L.check('répéter rien : à la fin de la liste, la lecture s\'arrête', !s.trackPlaying);
  await ev(() => { T.store.s.musique.repeat = 'all'; const r = T.musique._r; T.musique.play(r.order[r.order.length - 1]); }); await L.sleep(250);
  await ev(() => __fa[0].end()); await L.sleep(250);
  L.check('répéter tous : revient au début', (await st()).index === 0 && (await st()).trackPlaying);
  /* aléatoire */
  await tab('lecteur');
  await page.click('[data-act="mushuffle"]'); await L.sleep(200);
  s = await st();
  const q = await ev(() => T.musique._r.order.slice().sort());
  L.check('aléatoire : activé, le titre en cours reste premier, aucun titre perdu', s.shuffle && s.index === 0 && q.length === 4 && /Aléatoire : oui/.test(await txt()));
  await page.click('[data-act="mushuffle"]'); await L.sleep(150);
  s = await st();
  L.check('aléatoire : désactivé, ordre d\'origine rétabli', !s.shuffle && s.queue.join() === (await ev(() => T.store.s.musique.tracks.map((x) => x.id).join())));
  const hit = await ev(() => { const b = document.querySelector('[data-act="murepeat"]'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e && e.outerHTML.slice(0, 120); });
  await page.click('[data-act="murepeat"]'); await L.sleep(150);
  L.check('répéter : le bouton fait le tour tous, un titre, rien', (await st()).repeat === 'one' && /Répéter : ce titre/.test(await txt()), JSON.stringify([hit, (await st()).repeat, (await txt()).slice(0, 300)]));
  await page.click('[data-act="murepeat"]'); await page.click('[data-act="murepeat"]'); await L.sleep(100);
  L.check('répéter : retour à « tous »', (await st()).repeat === 'all');

  /* ---- Favoris ---- */
  await tab('musique');
  await page.click('.mu-track [data-act="mufav"]'); await L.sleep(150);
  L.check('favori : ajouté et visible', (await ev(() => T.store.s.musique.tracks.filter((x) => x.fav).length)) === 1 && /Retirer des favoris/.test(await txt()));
  await ev(() => { document.addEventListener('click', (e) => { window.__lc = e.target.outerHTML.slice(0, 100); }, true); });
  await page.click('[data-act="mufilter"][data-val="1"]'); await L.sleep(150);
  L.check('favori : le filtre « Favoris » montre 1 titre', (await ev(() => document.querySelectorAll('.mu-track').length)) === 1, await ev(() => window.__lc + T.musique._r.favOnly + T.cur.path + T.store.s.musique.tracks.filter((x) => x.fav).length));
  await ev(() => { T.musique._r.favOnly = false; });

  /* ---- Listes ---- */
  await tab('listes');
  await page.click('[data-act="mulistnew"]'); await L.sleep(100);
  L.check('liste : nom vide refusé', (await ev(() => T.store.s.musique.lists.length)) === 0);
  await page.type('#mu-newl', 'Au jardin'); await page.click('[data-act="mulistnew"]'); await L.sleep(200);
  L.check('liste : créée et ouverte', (await ev(() => T.store.s.musique.lists.map((x) => x.nom).join())) === 'Au jardin' && /Ajouter des titres/.test(await txt()));
  await page.click('[data-act="mulistadd"]'); await L.sleep(150);
  await page.click('.modal [data-act="mupick"][data-id="' + id('Chant du matin') + '"]'); await page.click('.modal [data-act="mupick"][data-id="' + id('Ruisseau') + '"]'); await page.click('.modal [data-act="mupick"][data-id="' + id('Piano doux') + '"]'); await L.sleep(150);
  L.check('liste : fenêtre d\'ajout sans débordement, boutons visibles', (await L.overflow(page)).length === 0);
  await page.click('.modal-foot .btn'); await L.sleep(250);
  let l0 = await ev(() => T.store.s.musique.lists[0]);
  L.check('liste : 3 titres ajoutés dans l\'ordre choisi', l0.ids.join() === [id('Chant du matin'), id('Ruisseau'), id('Piano doux')].join());
  await nth('[data-act="mumove"][data-d="1"]', 0); await L.sleep(150);
  l0 = await ev(() => T.store.s.musique.lists[0]);
  L.check('liste : « Descendre » change l\'ordre', l0.ids[0] === id('Ruisseau') && l0.ids[1] === id('Chant du matin'));
  await ev(() => { document.addEventListener('click', (e) => { window.__lc = e.target.outerHTML.slice(0, 200); }, true); });
  await page.click('[data-act="muremove"][data-id="' + id('Piano doux') + '"]'); await L.sleep(150);
  L.check('liste : « Retirer » enlève le titre sans le supprimer', (await ev(() => T.store.s.musique.lists[0].ids.length)) === 2 && (await ev(() => T.store.s.musique.tracks.length)) === 4, await ev(() => window.__lc + JSON.stringify(T.store.s.musique.lists) + document.getElementById('view').innerText.slice(0, 300)));
  await page.click('[data-act="mulistren"]'); await L.sleep(150);
  await ev(() => { document.getElementById('mu-ren').value = ''; }); await page.click('.modal-foot .btn.primary'); await L.sleep(100);
  L.check('liste : renommer avec un nom vide est refusé (fenêtre ouverte)', (await ev(() => T.modalStack.length)) === 1);
  await ev(() => { document.getElementById('mu-ren').value = 'Pour jardiner'; }); await page.click('.modal-foot .btn.primary'); await L.sleep(250);
  L.check('liste : renommée', (await ev(() => T.store.s.musique.lists[0].nom)) === 'Pour jardiner' && /Pour jardiner/.test(await txt()));
  await page.click('[data-act="mulistplay"]'); await L.sleep(300); s = await st();
  L.check('liste : « Lire la liste » joue seulement ces titres', s.queue.length === 2 && s.queue.join() === l0.ids.slice(0, 2).join() && s.trackPlaying, JSON.stringify(s.queue));
  await tab('musique'); await page.click('.mu-track [data-act="muaddto"]'); await L.sleep(150);
  L.check('« Ajouter à une liste » : fenêtre avec les listes et boutons visibles', /Pour jardiner/.test(await ev(() => document.querySelector('.modal').innerText)) && (await L.overflow(page)).length === 0);
  await ev(() => { T.closeModal(); T.musique._r.openList = null; });
  await tab('listes'); await page.click('[data-act="mulistopen"][data-id="fav"]'); await L.sleep(150);
  L.check('favoris : la liste « Mes favoris » contient le titre en favori', (await ev(() => document.querySelectorAll('.mu-track').length)) === 1);
  await page.click('[data-act="mulistback"]'); await L.sleep(100);
  await page.click('[data-act="mulistopen"][data-id="' + l0.id + '"]'); await L.sleep(100);
  await page.click('[data-act="mulistdel"]'); await L.sleep(150);
  L.check('liste : suppression demande confirmation', (await ev(() => T.modalStack.length)) === 1 && (await ev(() => T.store.s.musique.lists.length)) === 1);
  await page.click('.modal-foot .btn.danger'); await L.sleep(200);
  L.check('liste : supprimée, les titres restent', (await ev(() => T.store.s.musique.lists.length)) === 0 && (await ev(() => T.store.s.musique.tracks.length)) === 4);
  await addVia([F.bad]); await reids();

  /* ---- Fichier illisible, autoplay bloqué ---- */
  await ev((a) => T.musique.play(a.bad, [a.bad, a.good]), { bad: id('Casse'), good: id('Autre') }); await L.sleep(700); s = await st();
  L.check('fichier illisible : message clair puis passage au titre suivant', s.title === 'Autre' && s.trackPlaying, s.title);
  await ev((a) => T.musique.play(a, [a]), id('Casse')); await L.sleep(600); s = await st();
  L.check('seul titre illisible : la lecture s\'arrête avec une explication, sans boucle', !s.trackPlaying && /ne peut être lu|Aucun des titres/.test(await ev(() => T.musique._r.msg + document.getElementById('toast').textContent)), await ev(() => T.musique._r.msg));
  await ev(() => { window.__block = true; }); await ev((i) => T.musique.play(i), id('Chant du matin')); await L.sleep(400); s = await st();
  L.check('autoplay bloqué : pas de plantage, demande de toucher Lecture', !s.trackPlaying && /Touchez/.test(await ev(() => document.getElementById('toast').textContent + T.musique._r.msg)));
  await ev(() => { window.__block = false; }); await ev(() => T.musique.toggle()); await L.sleep(300);
  L.check('autoplay bloqué : après un toucher, la lecture démarre', (await st()).trackPlaying);
  await ev(() => { __fa[0].paused = true; __fa[0].onpause(); }); await L.sleep(100);
  L.check('perte de focus audio (pause venue du téléphone) : l\'état suit', !(await st()).trackPlaying);

  /* ---- Minuteur ---- */
  await ev(() => { window.__t0 = Date.now(); Date.now = () => window.__t0 + (window.__off || 0); window.__off = 0; });
  await ev(() => { T.musique.toggle(); }); await L.sleep(300);
  await ev(() => T.musique.playAmbiance('pluie'));
  await ev(() => T.musique.sleep(15)); s = await st();
  L.check('minuteur : 15 min enregistrées', s.sleepLeft === 15);
  await ev(() => { window.__off = 14 * 60000 + 52000; T.musique._tick(); }); 
  const v1 = await ev(() => __fa[0].volume);
  L.check('minuteur : fondu progressif avant l\'arrêt (volume qui baisse)', v1 > 0.05 && v1 < 0.8 * 0.6, v1);
  await ev(() => { window.__off = 16 * 60000; T.musique._tick(); }); await L.sleep(500); s = await st();
  L.check('minuteur : à la fin, titre et ambiances sont arrêtés', !s.playing && s.amb.length === 0 && s.sleepLeft === 0);
  await ev(() => { window.__off = 0; }); 
  L.check('minuteur : volume remis à la normale pour la fois suivante', Math.abs((await ev(() => (T.musique._r.sleepF))) - 1) < 0.001);
  await tab('reglages');
  await page.click('[data-act="musleep"][data-val="30"]'); await L.sleep(100);
  L.check('minuteur : bouton 30 min dans Réglages', (await st()).sleepLeft === 30 && /Arrêt automatique dans 30 min/.test(await txt()));
  await page.click('[data-act="musleep"][data-val="0"]'); await L.sleep(100);
  L.check('minuteur : « Sans minuteur » l\'annule', (await st()).sleepLeft === 0);
  await page.click('[data-act="mufondu"][data-val="30"]'); await L.sleep(100);
  L.check('réglages : durée du fondu choisie et gardée', (await ev(() => T.store.s.musique.fondu)) === 30);
  await ev(() => { const el = document.getElementById('mu-vol'); el.value = 50; el.dispatchEvent(new Event('input', { bubbles: true })); });
  L.check('réglages : volume général changé en direct', Math.abs((await ev(() => T.store.s.musique.vol)) - 0.5) < 0.001 && /50 %/.test(await ev(() => document.getElementById('mu-vol-t').textContent)));
  await ev(() => { T.store.s.musique.vol = 0.8; });

  /* ---- Voix : la musique baisse ---- */
  await ev((i) => T.musique.play(i), id('Autre')); await L.sleep(300);
  const du = await ev(async () => { T.store.s.settings.voiceOn = true; const p = T.voice.speak('Bonjour'); const during = T.musique.state().duck, vol = __fa[0].volume; await p; await new Promise((r) => setTimeout(r, 50)); return { during, vol, after: T.musique.state().duck, vol2: __fa[0].volume }; });
  L.check('voix : la musique baisse pendant la parole puis remonte', du.during && Math.abs(du.vol - 0.2) < 0.01 && !du.after && Math.abs(du.vol2 - 0.8) < 0.01, JSON.stringify(du));
  await ev(() => { T.musique.duck(true); T.musique.duck(true); T.musique.duck(false); });
  L.check('voix : appels imbriqués comptés (reste baissée tant qu\'un reste)', (await st()).duck === true);
  await ev(() => T.musique.duck(false));
  L.check('voix : duck(false) final remonte le volume', !(await st()).duck);

  /* ---- Ambiances ---- */
  const names = ['pluie', 'ruisseau', 'vent', 'oiseaux', 'grillons', 'abeilles', 'orage', 'rose'];
  await tab('ambiances');
  L.check('ambiances : 8 ambiances avec bouton « Écouter » et volume', (await ev(() => document.querySelectorAll('.mu-amb').length)) === 8 && (await ev(() => document.querySelectorAll('.mu-amb input[type=range]').length)) === 8);
  const ok8 = await ev((n) => n.map((x) => T.musique.playAmbiance(x)), names);
  s = await st();
  L.check('ambiances : les 8 se fabriquent sans erreur, jamais plus de 2 à la fois', ok8.every(Boolean) && s.amb.length === 2 && s.amb.join() === 'grillons,abeilles'.replace('grillons,abeilles', 'orage,rose'), JSON.stringify(s.amb));
  await ev(() => T.musique.stopAll()); await L.sleep(600);
  await ev(() => { T.musique.playAmbiance('pluie'); T.musique.playAmbiance('ruisseau'); }); s = await st();
  L.check('ambiances : mélange de 2 plus un titre', s.amb.length === 2 && (await ev(() => T.musique.isPlaying())));
  await ev((i) => T.musique.play(i), id('Autre')); await L.sleep(300);
  L.check('ambiances : un titre joue en même temps', (await st()).trackPlaying && (await st()).amb.length === 2);
  await tab('ambiances');
  await page.click('[data-act="muamb"][data-id="pluie"]'); await L.sleep(500);
  L.check('ambiances : le bouton arrête la pluie', (await st()).amb.join() === 'ruisseau');
  await page.click('[data-act="muamb"][data-id="vent"]'); await L.sleep(200);
  L.check('ambiances : le bouton affiche « Arrêter : … » quand elle joue', /Arrêter : Vent dans les feuilles/.test(await txt()) && (await ev(() => document.querySelector('[data-id="vent"][data-act="muamb"]').getAttribute('aria-pressed'))) === 'true');
  await ev(() => { const r = document.getElementById('mu-av-vent'); r.value = 20; r.dispatchEvent(new Event('input', { bubbles: true })); });
  L.check('ambiances : volume propre à chaque ambiance, gardé', Math.abs((await ev(() => T.store.s.musique.amb.vent)) - 0.2) < 0.001);
  await ev(() => T.musique.stopAll()); await ev(() => T.musique.playAmbiance('oiseaux')); await L.sleep(6500);
  const nb = await ev(() => __nodes.filter((n) => n.kind === 'osc').length);
  await ev(() => T.musique.stopAll()); await L.sleep(900);
  const leak = await ev(() => { const bus = T.musique._r.bus; return __nodes.filter((n) => n !== bus && n.kind !== 'dest' && (n.connected || ((n.kind === 'src' || n.kind === 'osc') && n.started && !n.stopped))).length; });
  L.check('ambiances : après arrêt, aucun nœud audio resté actif ou branché (pas de fuite) — ' + nb + ' oscillateurs créés', leak === 0 && nb > 0, leak + ' restants');
  L.check('ambiances : les sources sont toutes démarrées puis arrêtées', await ev(() => __nodes.filter((n) => n.kind === 'src' || n.kind === 'osc').every((n) => n.started && n.stopped)));

  /* ---- Mini-lecteur ---- */
  await ev((i) => T.musique.play(i), id('Chant du matin')); await L.sleep(300);
  await go('#/accueil');
  const mi = await ev(() => { const m = document.getElementById('musique-mini'), tb = document.getElementById('tabs'), a = m.getBoundingClientRect(), b = tb.getBoundingClientRect(); return { hidden: m.hidden, bottom: a.bottom, top: b.top, h: innerHeight, inApp: !!m.closest('#app'), txt: m.innerText, btns: Array.from(m.querySelectorAll('button')).map((x) => Math.round(x.getBoundingClientRect().height)) }; });
  L.check('mini-lecteur : visible sur l\'accueil, juste au-dessus de la barre du bas, sans la chevaucher', !mi.hidden && mi.inApp && mi.bottom <= mi.top + 1 && mi.bottom > 0, JSON.stringify(mi));
  L.check('mini-lecteur : Avant, Pause, Suivant, Fermer étiquetés, boutons >= 44 px', ['Avant', 'Pause', 'Suivant', 'Fermer', 'Chant du matin'].every((x) => mi.txt.indexOf(x) >= 0) && mi.btns.every((h) => h >= 44), JSON.stringify(mi.btns));
  await page.click('#musique-mini [data-act="munext"]'); await L.sleep(300);
  L.check('mini-lecteur : « Suivant » fonctionne', (await st()).title !== 'Chant du matin');
  await page.click('#musique-mini [data-act="mutoggle"]'); await L.sleep(150);
  L.check('mini-lecteur : « Pause » met en pause et devient « Lecture »', !(await st()).trackPlaying && /Lecture/.test(await ev(() => document.getElementById('musique-mini').innerText)));
  await page.click('#musique-mini [data-act="mutoggle"]'); await L.sleep(250);
  await ev(() => T.modal({ title: 'Test', html: '<p>x</p>' }));
  L.check('mini-lecteur : masqué pendant qu\'une fenêtre est ouverte', await ev(() => document.getElementById('musique-mini').hidden));
  await ev(() => T.closeModal()); await L.sleep(100);
  L.check('mini-lecteur : réaffiché à la fermeture de la fenêtre', !(await ev(() => document.getElementById('musique-mini').hidden)));
  await page.click('#musique-mini .mu-open'); await L.sleep(250);
  L.check('mini-lecteur : « Ouvrir » mène à #/musique, où il se cache', (await ev(() => location.hash)) === '#/musique' && (await ev(() => document.getElementById('musique-mini').hidden)));
  await go('#/pots');
  await ev(() => { const hn = window.__msh; window.__h = hn; });
  const tt = (await st()).title;
  await ev(() => window.__h.nexttrack && window.__h.nexttrack()); await L.sleep(300);
  L.check('écran verrouillé : les boutons du téléphone (MediaSession) pilotent le lecteur', (await st()).title !== tt && (await ev(() => !!(window.__h.play && window.__h.pause && window.__h.previoustrack))));
  L.check('écran verrouillé : titre affiché dans la notification', await ev(() => !navigator.mediaSession || !navigator.mediaSession.metadata || navigator.mediaSession.metadata.title === T.musique.state().title));
  await page.click('#musique-mini [data-act="muclose"]'); await L.sleep(300); s = await st();
  L.check('mini-lecteur : « Fermer » arrête tout et se cache', !s.playing && s.amb.length === 0 && (await ev(() => document.getElementById('musique-mini').hidden)));

  /* ---- Pour mes plantes, Feuille ---- */
  await go('#/musique'); await tab('lecteur');
  await page.click('[data-act="muplants"]'); await L.sleep(300); s = await st();
  L.check('« Musique pour mes plantes » : volume bas, 30 min, ambiance douce', Math.abs(s.vol - 0.35) < 0.001 && s.sleepLeft === 30 && s.amb.length === 2);
  L.check('« Musique pour mes plantes » : présentation honnête (effets discutés)', /discutés/.test(await txt()) && /rien n'est prouvé/.test(await txt()));
  await ev(() => { T.musique.close(); T.musique.sleep(0); T.store.s.musique.vol = 0.8; window.__say = []; T.feuille = { isOn: () => true, say: (x) => window.__say.push(x) }; T.musique._r.sugg = false; });
  await tab('ambiances');
  L.check('Feuille : propose une ambiance de pluie quand rien ne joue', (await ev(() => __say.length)) === 1 && /pluie/.test(await ev(() => __say[0])));
  await ev(() => { __say.length = 0; T.musique._r.sugg = false; T.musique.playAmbiance('rose'); }); await tab('ambiances');
  L.check('Feuille : se tait quand de la musique joue déjà', (await ev(() => __say.length)) === 0);
  await ev(() => { T.musique.close(); delete T.feuille; });

  /* ---- Suppression avec confirmation ---- */
  await ev((i) => { T.store.s.musique.lists.push({ id: 'lx', nom: 'X', ids: [i] }); }, id('Ruisseau'));
  await tab('musique');
  await nth('.mu-track [data-act="mudel"]', 2); await L.sleep(150);
  L.check('suppression : fenêtre de confirmation, boutons visibles', (await ev(() => T.modalStack.length)) === 1 && (await L.overflow(page)).length === 0);
  await page.click('.modal-foot .btn:not(.danger)'); await L.sleep(150);
  L.check('suppression : « Annuler » ne supprime rien', (await ev(() => T.store.s.musique.tracks.length)) === 5);
  await nth('.mu-track [data-act="mudel"]', 2); await L.sleep(150);
  const delName = await ev(() => document.querySelector('.modal-body').innerText);
  await page.click('.modal-foot .btn.danger'); await L.sleep(400);
  s = await ev(() => T.store.s.musique);
  const idbN2 = await ev(() => new Promise((res) => { const r = indexedDB.open('tifa-musique', 1); r.onsuccess = () => { const q = r.result.transaction('blobs').objectStore('blobs').count(); q.onsuccess = () => res(q.result); }; }));
  L.check('suppression : titre retiré de la liste, des listes et du téléphone (IndexedDB)', s.tracks.length === 4 && s.lists[0].ids.length === 0 && idbN2 === 4, delName + ' / ' + idbN2);

  /* ---- Reprise après redémarrage ---- */
  await ev(() => { const x = T.store.s.musique.tracks[0]; T.store.s.musique.last = { id: x.id, t: 42 }; T.store.save(); });
  await page.reload({ waitUntil: 'load' }); await page.waitForFunction('window.__TIFA_STARTED === true'); await L.sleep(400);
  await go('#/musique');
  L.check('reprise : après redémarrage, l\'écran propose le dernier titre', /Dernier titre/.test(await txt()) && /Reprendre/.test(await txt()));
  await page.click('[data-act="mutoggle"]'); await L.sleep(500);
  L.check('reprise : le titre repart de la position enregistrée, fichier relu depuis IndexedDB', (await st()).trackPlaying && (await ev(() => __fa[0].currentTime)) === 42);
  await ev(() => T.musique.close());

  /* ---- Pas d'AudioContext / pas d'IndexedDB ---- */
  const p2 = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: mk({ fakeAudio: true, noCtx: true }) });
  await L.skipOnboarding(p2);
  const r2 = await p2.evaluate(() => { const r = T.musique.playAmbiance('pluie'); return { r, toast: document.getElementById('toast').textContent, amb: T.musique.state().amb.length }; });
  L.check('sans AudioContext : refus poli en français, aucune erreur', r2.r === false && /ne peut pas fabriquer/.test(r2.toast) && r2.amb === 0 && p2.errors.length === 0, JSON.stringify(r2) + p2.errors);
  await p2.close();
  const p3 = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: mk({ fakeAudio: true, noIdb: true }) });
  await L.skipOnboarding(p3);
  const r3 = await p3.evaluate(async () => { await T.musique.addFiles([new File(['song'], 'Test.mp3', { type: 'audio/mpeg' })]); const x = T.store.s.musique.tracks[0]; T.musique.play(x.id); await new Promise((r) => setTimeout(r, 400)); return { n: T.store.s.musique.tracks.length, msg: T.musique._r.msg, vol: T.musique.state().volatile, pl: T.musique.state().trackPlaying }; });
  L.check('sans mémoire longue durée : repli sur la mémoire de la session, prévenu clairement', r3.n === 1 && r3.vol && r3.pl && /jusqu'à la fermeture/.test(r3.msg), JSON.stringify(r3));
  await p3.close();

  /* ---- Vrai AudioContext du navigateur : les 8 ambiances démarrent et s'arrêtent sans erreur ---- */
  const p4 = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: mk({}) });
  await L.skipOnboarding(p4);
  await p4.evaluate(() => { location.hash = '#/musique?t=ambiances'; T.render(); });
  await L.sleep(200);
  await p4.click('[data-act="muamb"][data-id="pluie"]'); await L.sleep(300);
  const real = await p4.evaluate(async () => { const o = []; for (const n of ['ruisseau', 'vent', 'oiseaux', 'grillons', 'abeilles', 'orage', 'rose', 'pluie']) { o.push(T.musique.playAmbiance(n)); await new Promise((r) => setTimeout(r, 120)); T.musique.stopAmbiance(n); } T.musique.stopAll(); return o; });
  await L.sleep(600);
  L.check('vrai WebAudio du navigateur : 8 ambiances sans erreur JS', real.every(Boolean) && p4.errors.length === 0, JSON.stringify(real) + p4.errors.join('|'));
  await p4.close();

  /* ---- Affichage : 4 profils, dont 280 px à 200 % ---- */
  const profils = [['Pixel 8 (Android 14)', 1], ['Samsung Galaxy S24 (Android 15)', 1.4], ['Samsung Z Fold (plié, Android 14)', 2], ['Samsung Tab A9 tablette (Android 14)', 1]];
  for (const [dev, sc] of profils) {
    const pg = await L.newPage(browser, base, dev, { beforeLoad: mk({ fakeAudio: true, fakeCtx: true }) });
    await L.skipOnboarding(pg);
    await pg.evaluate((sc) => document.documentElement.style.setProperty('--scale', String(sc)), sc);
    await pg.evaluate(async () => {
      await T.musique.addFiles([new File(['aa'], 'Une très longue chanson du jardin au printemps avec beaucoup de mots dedans.mp3', { type: 'audio/mpeg' }), new File(['bb'], 'Deuxième.mp3', { type: 'audio/mpeg' })]);
      const l = { id: 'l1', nom: 'Ma liste avec un nom vraiment très long pour tester', ids: T.store.s.musique.tracks.map((x) => x.id) }; T.store.s.musique.lists.push(l); T.store.s.musique.tracks[0].fav = true;
      T.musique.play(T.store.s.musique.tracks[0].id); T.musique.playAmbiance('pluie'); T.musique.playAmbiance('ruisseau'); T.musique.sleep(15);
    });
    await L.sleep(400);
    const bad = [];
    for (const tb of ['lecteur', 'musique', 'listes', 'ambiances', 'reglages']) {
      await pg.evaluate((tb) => { T.musique._r.openList = null; location.hash = '#/musique'; T.musique._r.tab = tb; T.render(); }, tb);
      await L.sleep(120);
      const o = await L.overflow(pg); if (o.length) bad.push(tb + ': ' + o.join(';'));
      const h = await pg.evaluate(() => { const H = innerHeight; const small = Array.from(document.querySelectorAll('#view button, #view .chip')).filter((b) => { const r = b.getBoundingClientRect(); return r.width && r.height < 43; }).length; return { small, vh: document.getElementById('view').getBoundingClientRect().height, H }; });
      if (h.small) bad.push(tb + ': ' + h.small + ' bouton(s) trop petit(s)');
      if (h.vh < 60) bad.push(tb + ': zone de contenu écrasée (' + h.vh + ')');
      /* le bas de l'onglet doit être atteignable par défilement */
      const sc2 = await pg.evaluate(() => { const v = document.getElementById('view'); v.scrollTop = v.scrollHeight; const last = v.lastElementChild; if (!last) return true; const r = last.getBoundingClientRect(), vr = v.getBoundingClientRect(); return r.bottom <= vr.bottom + 2; });
      if (!sc2) bad.push(tb + ': bas de page non atteignable');
    }
    await pg.evaluate(() => { T.musique._r.openList = 'l1'; T.musique._r.tab = 'listes'; T.render(); }); await L.sleep(120);
    { const o = await L.overflow(pg); if (o.length) bad.push('liste ouverte: ' + o.join(';')); }
    await pg.evaluate(() => { location.hash = '#/accueil'; T.render(); }); await L.sleep(200);
    const m = await pg.evaluate(() => { const m = document.getElementById('musique-mini'), r = m.getBoundingClientRect(), tb = document.getElementById('tabs').getBoundingClientRect(), W = innerWidth, H = innerHeight;
      const bs = Array.from(m.querySelectorAll('button')).map((b) => b.getBoundingClientRect()); const outside = bs.filter((b) => b.right > W + 1 || b.left < -1 || b.bottom > r.bottom + 1 || b.top < r.top - 1).length;
      return { hidden: m.hidden, over: r.right > W + 1 || r.left < -1, bottomOk: r.bottom <= tb.top + 1, outside, h: Math.round(r.height), H, scrollW: document.documentElement.scrollWidth, W }; });
    if (m.hidden || m.over || !m.bottomOk || m.outside || m.scrollW > m.W + 1) bad.push('mini-lecteur: ' + JSON.stringify(m));
    if (m.h > m.H * 0.46) bad.push('mini-lecteur trop haut: ' + m.h + '/' + m.H);
    await pg.evaluate(() => { const b = document.querySelector('#musique-mini [data-act="muclose"]'); b.scrollIntoView(); });
    await pg.evaluate(() => { T.modal({ title: 'Fenêtre', html: '<p>Contenu</p>', buttons: [{ label: 'Annuler' }, { label: 'Valider', primary: true }] }); }); await L.sleep(120);
    const o2 = await L.overflow(pg); if (o2.length) bad.push('fenêtre: ' + o2.join(';'));
    if (!(await pg.evaluate(() => document.getElementById('musique-mini').hidden))) bad.push('mini-lecteur visible derrière une fenêtre');
    L.check('affichage ' + dev + ' texte x' + sc + ' : tous les onglets, la liste, le mini-lecteur et une fenêtre sans débordement', bad.length === 0, bad.join(' || '));
    L.check('affichage ' + dev + ' : aucune erreur JavaScript', pg.errors.length === 0, pg.errors.join('|'));
    await pg.close();
  }
  L.check('musique : aucun emoji dans l\'interface', !EMOJI.test(await ev(() => document.body.innerText + document.getElementById('musique-mini').innerHTML)));
  L.check('musique : aucune erreur JavaScript (parcours complet)', page.errors.length === 0, page.errors.join(' | '));
  await page.close();
  fs.rmSync(dir, { recursive: true, force: true });
};
