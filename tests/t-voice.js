/* Domaine (d) : voix. Moteurs simulés : plugin natif, synthèse du navigateur, aucun moteur ; pannes en cours de lecture. */
const FAKE_BROWSER = () => {
  window.__spoken = [];
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  const S = { _v: [{ name: 'Google français', lang: 'fr-FR', voiceURI: 'gfr', localService: false }, { name: 'Voix locale', lang: 'fr-FR', voiceURI: 'lfr', localService: true }, { name: 'English', lang: 'en-US', voiceURI: 'en', localService: true }],
    getVoices() { return this._v; }, addEventListener() {}, cancel() { window.__cancelled = (window.__cancelled || 0) + 1; },
    speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 5); } };
  Object.defineProperty(window, 'speechSynthesis', { value: S, configurable: true });
};
const FAKE_PLUGIN = (failSpeak) => () => {
  window.__ps = [];
  window.__TIFA_FAKE_NATIVE = { TTS: {
    getSupportedVoices: () => Promise.resolve({ voices: [{ name: 'fr-fr-x-local', lang: 'fr-FR', voiceURI: 'fr-fr-x-local', localService: true }, { name: 'fr-fr-network', lang: 'fr-FR', voiceURI: 'fr-fr-network', localService: false }, { name: 'fr-fr-x-frb-local', lang: 'fr-FR', voiceURI: 'fr-fr-x-frb-local', localService: true }, { name: 'en', lang: 'en-US', voiceURI: 'en', localService: true }] }),
    speak: (o) => { window.__ps.push(o); return window.__FAILSPEAK ? Promise.reject(new Error('moteur absent')) : Promise.resolve(); },
    stop: () => { window.__pstop = (window.__pstop || 0) + 1; return Promise.resolve(); } } };
};
const NONE = () => { Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); window.SpeechSynthesisUtterance = undefined; };
module.exports = async function ({ L, browser, base }) {
  const mk = async (bl, hash) => { const p = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: bl }); await L.skipOnboarding(p); await p.evaluate(() => T.voice.init()); return p; };
  /* 1. moteur du téléphone */
  let p = await mk(FAKE_PLUGIN());
  let r = await p.evaluate(() => ({ e: T.voice.engine, n: T.voice.voices.length, l: T.voice.voices.map((v) => v.label) }));
  L.check('voix : moteur du téléphone, 3 voix françaises (l\'anglaise écartée)', r.e === 'plugin' && r.n === 3, JSON.stringify(r));
  L.check('voix : menu indique « sans connexion » et « avec connexion »', r.l.some((x) => /sans connexion/.test(x)) && r.l.some((x) => /avec connexion/.test(x)), r.l.join('|'));
  await p.evaluate(() => { T.voice.speak('Bonjour. Voici un conseil. '.repeat(30)); }); await L.sleep(300);
  r = await p.evaluate(() => ({ n: window.__ps.length, max: Math.max(...window.__ps.map((o) => o.text.length)), lang: window.__ps[0].lang }));
  L.check('voix : texte long lu par morceaux (' + r.n + ' morceaux, plus long ' + r.max + ' car.)', r.n >= 2 && r.max <= 260 && r.lang === 'fr-FR', JSON.stringify(r));
  await p.evaluate(() => { T.set().voiceId = 'fr-fr-network'; T.store.save(); T.voice.speak('Test.'); }); await L.sleep(100);
  L.check('voix : la voix choisie est utilisée', (await p.evaluate(() => window.__ps[window.__ps.length - 1].voice)) === 1);
  await p.evaluate(() => { T.voice.speak('Aigu.', { id: 'fr-fr-x-local', pitch: 1.5, rate: 1.2 }); }); await L.sleep(100);
  r = await p.evaluate(() => window.__ps[window.__ps.length - 1]);
  L.check('voix : aigu/grave et vitesse transmis au moteur', r.pitch === 1.5 && r.rate === 1.2 && r.voice === 0, JSON.stringify(r));
  /* molette */
  await p.evaluate(() => { T.set().voiceOn = true; location.hash = '#/reglages'; }); await L.sleep(300);
  r = await p.evaluate(() => ({ cols: document.querySelectorAll('.vw-col').length, items: document.querySelectorAll('.vw-it').length, ok: !!document.querySelector('.vw-ok'), g: document.querySelectorAll('.vw-gb').length, txt: document.getElementById('vw-box').innerText }));
  L.check('molette : voix fille/garçon, 2 colonnes sans/avec connexion, bouton Garder', r.cols === 2 && r.g === 2 && r.ok && /Sans connexion/.test(r.txt) && /Avec connexion/.test(r.txt), JSON.stringify(r));
  await p.evaluate(() => { window.__ps.length = 0; document.querySelector('.vw-gb[data-g="m"]').click(); }); await L.sleep(700);
  r = await p.evaluate(() => ({ items: [...document.querySelectorAll('.vw-it')].map((x) => x.dataset.n) }));
  L.check('molette : « Voix de garçon » ne montre que la voix masculine', r.items.length === 1 && /frb/.test(r.items[0]), JSON.stringify(r));
  await p.evaluate(() => { document.querySelector('.vw-gb[data-g="f"]').click(); }); await L.sleep(700);
  await p.evaluate(() => { window.__ps.length = 0; const sc = document.querySelector('.vw-col[data-t="net"] .vw-sc'); sc.scrollTop = 0; sc.dispatchEvent(new Event('scroll')); });
  const items = await p.evaluate(() => document.querySelectorAll('.vw-col[data-t="local"] .vw-it').length);
  await p.evaluate(() => { document.querySelector('.vw-col[data-t="net"] .vw-it').click(); }); await L.sleep(500);
  L.check('molette : toucher une voix la fait entendre aussitôt', (await p.evaluate(() => window.__ps.length)) >= 1 && (await p.evaluate(() => window.__ps[0].voice)) === 1);
  await p.evaluate(() => { document.querySelector('.vw-ok').click(); });
  L.check('molette : « Garder cette voix » enregistre la voix', (await p.evaluate(() => T.set().voiceId)) === 'fr-fr-network');
  await p.evaluate(() => { const e = document.querySelector('.vw-p'); e.value = 1.4; e.dispatchEvent(new Event('change')); }); await L.sleep(400);
  L.check('molette : le réglage grave/aigu est conservé', (await p.evaluate(() => T.set().pitch)) === 1.4);
  await p.evaluate(() => { T.voice.speak('Un. Deux. '.repeat(100)); }); await L.sleep(30);
  const before = await p.evaluate(() => window.__ps.length); await p.evaluate(() => T.voice.stop()); await L.sleep(200);
  L.check('voix : « Arrêter » coupe la lecture immédiatement', (await p.evaluate(() => window.__ps.length)) - before <= 1 && (await p.evaluate(() => window.__pstop)) >= 1);
  await p.evaluate(() => { T.set().voiceOn = false; T.voice.speak('x'); }); await L.sleep(50);
  L.check('voix : coupée dans Réglages = message clair, aucun son', (await p.evaluate(() => document.getElementById('toast').innerText)).includes('coupée'));
  /* 2. panne du moteur du téléphone -> repli navigateur */
  p = await mk('(' + FAKE_PLUGIN() + ')();(' + FAKE_BROWSER + ')();window.__FAILSPEAK=true;');
  await p.evaluate(() => T.voice.speak('Une phrase. Une autre phrase.')); await L.sleep(300);
  L.check('voix : moteur du téléphone en panne -> repli automatique sur la synthèse du navigateur', (await p.evaluate(() => window.__spoken.length)) >= 1);
  /* 3. navigateur seul */
  p = await mk(FAKE_BROWSER);
  r = await p.evaluate(() => ({ e: T.voice.engine, l: T.voice.voices.map((v) => v.label) }));
  L.check('voix : navigateur seul, 2 voix françaises avec/sans connexion', r.e === 'browser' && r.l.length === 2 && /sans/.test(r.l[1]) && /avec/.test(r.l[0]), JSON.stringify(r));
  await p.evaluate(() => T.voice.speak('Bonjour.')); await L.sleep(100);
  L.check('voix : lecture par le navigateur', (await p.evaluate(() => window.__spoken.join())) === 'Bonjour.');
  /* interface : Réglages + bouton Écouter */
  await p.evaluate(() => { location.hash = '#/reglages'; }); await L.sleep(200);
  const ui = await p.evaluate(() => document.getElementById('view').innerText);
  L.check('voix : Réglages montre la molette des voix', /Sans connexion/.test(ui) && /Avec connexion/.test(ui) && /Garder cette voix/.test(ui), ui.slice(0, 200));
  await p.evaluate(() => { location.hash = '#/plante/tomate'; }); await L.sleep(200);
  L.check('voix : bouton « Écouter » sur les fiches', await p.evaluate(() => !!document.querySelector('[data-act="speak"]')));
  await p.click('[data-act="speak"]'); await L.sleep(300);
  L.check('voix : toucher « Écouter » lit la fiche', (await p.evaluate(() => window.__spoken.length)) >= 1);
  /* 4. aucun moteur */
  p = await mk(NONE);
  r = await p.evaluate(() => ({ a: T.voice.available(), e: T.voice.engine }));
  L.check('voix : aucun moteur -> « indisponible » sans plantage', r.a === false && r.e === 'none', JSON.stringify(r));
  await p.evaluate(() => T.voice.speak('x')); await L.sleep(100);
  L.check('voix : aucun moteur -> message d\'aide en français', (await p.evaluate(() => document.getElementById('toast').innerText)).includes('Synthèse vocale'));
  await p.evaluate(() => { location.hash = '#/reglages'; }); await L.sleep(200);
  L.check('voix : Réglages sans moteur : écran complet, pas d\'erreur', (await p.evaluate(() => document.getElementById('view').innerText.length)) > 100 && p.errors.filter((e) => !/script-src/.test(e)).length === 0, p.errors.join('|'));
  /* 5. prête dès l'ouverture */
  p = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: FAKE_BROWSER }); await L.sleep(800);
  L.check('voix : prête dès l\'ouverture (sans action)', await p.evaluate(() => T.voice.ready && T.voice.voices.length === 2));
  /* 6. chunking cas limites */
  L.check('voix : textes vide / sans ponctuation / 5000 caractères sans erreur', await p.evaluate(() => { try { return T.voice.chunks('').length === 0 && T.voice.chunks('abc').length === 1 && T.voice.chunks('mot '.repeat(1250)).length >= 1; } catch (e) { return false; } }));
};
module.exports.extra = null;
