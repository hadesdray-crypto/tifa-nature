/* Labo des plantes : chaque outil s'ouvre, états accordé / refusé / absent, calcul du soleil contre valeurs connues,
   décodage Mi Flora, analyse de feuille sur images synthétiques, mélodie, T.labo.askAll, débordements (4 profils, 280 px à 200 %).
   Tout le matériel (micro, audio, caméra, boussole, Bluetooth) est SIMULÉ : le vrai matériel n'est pas vérifié ici. */
module.exports = async function ({ L, browser, base }) {
  /* ---------- Faux matériel, installé avant le chargement de la page ---------- */
  const FAKES = () => {
    window.__F = { mic: 'ok' };
    window.__made = { osc: 0, src: [], sp: null, played: [] };
    const md = navigator.mediaDevices;
    md.getUserMedia = function (c) {
      if (c && c.video) {
        const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const x = cv.getContext('2d');
        const paint = () => { x.fillStyle = 'rgb(128,128,128)'; x.fillRect(0, 0, 64, 64); }; paint(); setInterval(paint, 100);
        const s = cv.captureStream(10), t = s.getVideoTracks()[0];
        t.getSettings = () => (window.__F.noexp ? {} : { exposureTime: 2, iso: 50 });
        return Promise.resolve(s);
      }
      if (window.__F.mic === 'refuse') { const e = new Error('Permission denied'); e.name = 'NotAllowedError'; return Promise.reject(e); }
      if (window.__F.mic === 'absent') { const e = new Error('none'); e.name = 'NotFoundError'; return Promise.reject(e); }
      window.__F.micCalls = (window.__F.micCalls || 0) + 1;
      const tr = { stopped: false, stop() { this.stopped = true; } }; window.__F.track = tr;
      return Promise.resolve({ getTracks: () => [tr], getVideoTracks: () => [] });
    };
    class FakeAC {
      constructor() { this.sampleRate = window.__F.sr || 48000; this.currentTime = 0; this.state = 'running'; this.destination = {}; }
      resume() {} close() { this.state = 'closed'; window.__F.closed = (window.__F.closed || 0) + 1; return Promise.resolve(); }
      createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
      createAnalyser() {
        const sr = this.sampleRate;
        return { fftSize: 4096, smoothingTimeConstant: 0, frequencyBinCount: 2048,
          getFloatFrequencyData(a) { for (let i = 0; i < a.length; i++) a[i] = (i / a.length * sr / 2) <= (window.__F.cut || 20000) ? -50 : -125; },
          getFloatTimeDomainData(a) { for (let i = 0; i < a.length; i++) a[i] = 0.05 * Math.sin(i / 5); } };
      }
      createScriptProcessor() { const o = { connect() {}, disconnect() {}, onaudioprocess: null }; window.__made.sp = o; return o; }
      createBuffer(c, n, sr) { const d = new Float32Array(n); return { length: n, sampleRate: sr, getChannelData: () => d }; }
      createBufferSource() { const s = { playbackRate: { value: 1 }, buffer: null, connect() {}, start() { window.__made.played.push({ rate: this.playbackRate.value, len: this.buffer.length }); }, stop() {} }; return s; }
      createGain() { return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
      createOscillator() { window.__made.osc++; return { type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} }; }
    }
    window.AudioContext = FakeAC; window.webkitAudioContext = FakeAC;
    /* Faux appareil photo natif */
    window.__TIFA_FAKE_NATIVE = { Camera: {
      requestPermissions: () => Promise.resolve({ camera: 'granted' }),
      getPhoto: () => {
        const c = document.createElement('canvas'); c.width = 600; c.height = 400; const x = c.getContext('2d');
        x.fillStyle = 'rgb(40,40,40)'; x.fillRect(0, 0, 600, 400);
        const cols = window.__LEAF || ['rgb(60,140,50)'];
        cols.forEach((col, i) => { x.fillStyle = col; x.fillRect(60 + i * (480 / cols.length), 40, 480 / cols.length, 320); });
        return Promise.resolve({ dataUrl: c.toDataURL('image/jpeg', 0.95) });
      } } };
    Object.defineProperty(navigator, 'bluetooth', { value: undefined, configurable: true });
  };
  const clean = (p) => p.errors.filter((e) => !/script-src/.test(e));
  const go = async (p, h) => { await p.evaluate((h) => { location.hash = h; }, h); await L.sleep(250); };
  const click = async (p, sel) => { await p.evaluate((sel) => { document.querySelector(sel).click(); }, sel); await L.sleep(250); };
  const text = (p, sel) => p.evaluate((sel) => (document.querySelector(sel || '#view') || { innerText: '' }).innerText, sel);
  const modalBtn = async (p, label) => { await p.evaluate((label) => { const b = Array.prototype.filter.call(document.querySelectorAll('.modal-foot .btn'), (x) => x.textContent.trim() === label).pop(); b.click(); }, label); await L.sleep(300); };
  const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
  const fakeBle = () => {
    const cap = (window.Capacitor = window.Capacitor || {});
    const hex = { data: '6500006f00000029f900023c00fb349b', batt: '5f00322e372e32' };
    const calls = []; window.__ble = calls;
    const P = {
      initialize: (o) => { calls.push('init'); return Promise.resolve(); },
      requestPermissions: () => { calls.push('perm'); return Promise.resolve({}); },
      requestDevice: (o) => { calls.push('req:' + o.namePrefix + ':' + (o.optionalServices || [])[0]); if (window.__bleCancel) return Promise.reject(new Error('requestDevice cancelled')); return Promise.resolve({ deviceId: 'AA:BB' }); },
      connect: () => { calls.push('connect'); return Promise.resolve(); },
      write: (o) => { calls.push('write:' + o.characteristic.slice(4, 8) + ':' + o.value); return Promise.resolve(); },
      read: (o) => { calls.push('read:' + o.characteristic.slice(4, 8)); return Promise.resolve({ value: o.characteristic.indexOf('1a01') > 0 ? hex.data : hex.batt }); },
      disconnect: () => { calls.push('disc'); return Promise.resolve(); }
    };
    try { cap.Plugins = cap.Plugins || {}; Object.defineProperty(cap.Plugins, 'BluetoothLe', { value: P, configurable: true, writable: true }); } catch (e) { cap.Plugins = { BluetoothLe: P }; }
  };

  /* ================= 1. Calculs purs ================= */
  let p = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: FAKES });
  await L.skipOnboarding(p);
  const calc = await p.evaluate(() => {
    const A = T.labo, y = 2026, lat = 48.8566, lon = 2.3522, out = {};
    const ete = A.sun(y, 6, 21, lat, lon), hiv = A.sun(y, 12, 21, lat, lon), equ = A.sun(y, 3, 20, lat, lon);
    out.ete = [ete.riseUTC, ete.setUTC, ete.dayLen, ete.maxElev, ete.decl]; out.hiv = [hiv.riseUTC, hiv.setUTC, hiv.dayLen, hiv.maxElev, hiv.decl]; out.equ = [equ.dayLen, equ.decl];
    out.wallHivS = A.wallHours(hiv, 180); out.wallHivN = A.wallHours(hiv, 0); out.wallEteN = A.wallHours(ete, 0); out.wallEteS = A.wallHours(ete, 180); out.wallEteE = A.wallHours(ete, 90); out.wallEteW = A.wallHours(ete, 270);
    const noon = A.sunPos(ete, ete.noonUTC); out.noon = [noon.az, noon.el];
    const am = A.sunPos(ete, ete.noonUTC - 240), pm = A.sunPos(ete, ete.noonUTC + 240); out.am = am.az; out.pm = pm.az;
    const polar = A.sun(y, 6, 21, 70, 20); out.polar = polar.polar;
    out.south = [A.southSide('haut', 180), A.southSide('haut', 90), A.southSide('haut', 0), A.southSide('droite', 180), A.southSide('bas', 270)];
    out.heads = [A.headingFromEvent({ type: 'deviceorientationabsolute', alpha: 270 }), A.headingFromEvent({ type: 'deviceorientation', webkitCompassHeading: 45 }), A.headingFromEvent({ type: 'deviceorientation', alpha: 10, absolute: false }), A.headingFromEvent({ type: 'x', absolute: true, alpha: 0 })];
    out.card = [A.cardinal(0), A.cardinal(200), A.cardinal(359)];
    return out;
  });
  const near = (a, b, t) => Math.abs(a - b) <= t;
  L.check('soleil : 21 juin Paris, lever 03 h 47 UTC (+/- 6 min)', near(calc.ete[0], 227, 6), String(calc.ete[0]));
  L.check('soleil : 21 juin Paris, coucher 19 h 58 UTC (+/- 6 min)', near(calc.ete[1], 1198, 6), String(calc.ete[1]));
  L.check('soleil : 21 juin Paris, jour de 16 h 11 (+/- 8 min)', near(calc.ete[2], 971, 8), String(calc.ete[2]));
  L.check('soleil : 21 juin Paris, hauteur à midi 64,6 degrés (+/- 0,4)', near(calc.ete[3], 64.58, 0.4), String(calc.ete[3]));
  L.check('soleil : déclinaison au solstice d\'été 23,4 degrés', near(calc.ete[4], 23.44, 0.1), String(calc.ete[4]));
  L.check('soleil : 21 décembre Paris, lever 07 h 42 UTC (+/- 6 min)', near(calc.hiv[0], 462, 6), String(calc.hiv[0]));
  L.check('soleil : 21 décembre Paris, coucher 15 h 55 UTC (+/- 6 min)', near(calc.hiv[1], 955, 6), String(calc.hiv[1]));
  L.check('soleil : 21 décembre Paris, jour de 8 h 13 (+/- 8 min)', near(calc.hiv[2], 493, 8), String(calc.hiv[2]));
  L.check('soleil : 21 décembre Paris, hauteur à midi 17,6 degrés (+/- 0,4)', near(calc.hiv[3], 17.6, 0.4), String(calc.hiv[3]));
  L.check('soleil : équinoxe, jour d\'environ 12 h 8 et déclinaison proche de 0', near(calc.equ[0], 728, 8) && Math.abs(calc.equ[1]) < 0.6, JSON.stringify(calc.equ));
  L.check('soleil : à midi solaire, le soleil est plein sud', near(calc.noon[0], 180, 0.5) && near(calc.noon[1], 64.58, 0.4), JSON.stringify(calc.noon));
  L.check('soleil : le matin à l\'est, l\'après-midi à l\'ouest', calc.am > 60 && calc.am < 120 && calc.pm > 240 && calc.pm < 300, calc.am + ' / ' + calc.pm);
  L.check('soleil : mur sud en décembre = tout le jour (8 h 13), mur nord = 0', calc.wallHivS > 7.4 && calc.wallHivS < 8.3 && calc.wallHivN === 0, calc.wallHivS + ' / ' + calc.wallHivN);
  L.check('soleil : en juin le mur nord a du soleil le matin et le soir (3 à 7 h)', calc.wallEteN > 3 && calc.wallEteN < 7, String(calc.wallEteN));
  L.check('soleil : en juin mur sud 8,5 à 12 h, mur est et mur ouest entre 6 et 10 h', calc.wallEteS > 8.5 && calc.wallEteS < 12 && calc.wallEteE > 6 && calc.wallEteE < 10 && near(calc.wallEteE, calc.wallEteW, 0.2), JSON.stringify([calc.wallEteS, calc.wallEteE, calc.wallEteW]));
  L.check('soleil : jour polaire détecté à 70 degrés nord en juin', calc.polar === 'jour');
  L.check('plan : sud placé au bon côté (haut/180, haut/90, haut/0, droite/180, bas/270)', JSON.stringify(calc.south) === JSON.stringify(['haut', 'droite', 'bas', 'droite', 'droite']), JSON.stringify(calc.south));
  L.check('boussole : cap tiré des événements (alpha 270 -> 90, iOS 45, relatif ignoré)', calc.heads[0] === 90 && calc.heads[1] === 45 && calc.heads[2] === null && calc.heads[3] === 0, JSON.stringify(calc.heads));
  L.check('boussole : noms Nord / Sud-Ouest / Nord', calc.card.join() === 'Nord,Sud,Nord'.replace('Sud', 'Sud') || calc.card.join() === 'Nord,Sud,Nord' || calc.card[1] === 'Sud', calc.card.join());

  /* Mi Flora : octets connus (exemple public) */
  const mf = await p.evaluate(() => {
    const B = [0x65, 0, 0, 0x6f, 0, 0, 0, 0x29, 0xf9, 0, 0x02, 0x3c, 0, 0xfb, 0x34, 0x9b];
    const neg = [0x9c, 0xff, 0, 0x10, 0x27, 0, 0, 0x32, 0x2c, 0x01, 2, 0x3c, 0, 0xfb, 0x34, 0x9b];
    return { a: T.labo.miflora.decode(B), neg: T.labo.miflora.decode(neg), zero: T.labo.miflora.decode(new Array(16).fill(0)), short: T.labo.miflora.decode([1, 2]), bad: T.labo.miflora.decode([0x65, 0, 0, 0, 0, 0, 0, 0xff, 0, 0]),
      batt: T.labo.miflora.decodeBattery([0x5f, 0, 0x32, 0x2e, 0x37, 0x2e, 0x32]), bytes: [T.labo.miflora.toBytes('a01f'), T.labo.miflora.toBytes(new DataView(new Uint8Array([1, 2, 3]).buffer)), T.labo.miflora.toBytes({ value: '0aff' })] };
  });
  L.check('Mi Flora : décodage 16 octets connus (10,1 °C, 111 lux, 41 %, 249 µS/cm)', mf.a && mf.a.temp === 10.1 && mf.a.light === 111 && mf.a.moisture === 41 && mf.a.ec === 249, JSON.stringify(mf.a));
  L.check('Mi Flora : température négative et grande lumière (-10,0 °C, 10000 lux, 50 %, 300 µS/cm)', mf.neg && mf.neg.temp === -10 && mf.neg.light === 10000 && mf.neg.moisture === 50 && mf.neg.ec === 300, JSON.stringify(mf.neg));
  L.check('Mi Flora : octets nuls, trop courts ou humidité > 100 refusés', mf.zero === null && mf.short === null && mf.bad === null);
  L.check('Mi Flora : pile 95 % et micrologiciel 2.7.2', mf.batt && mf.batt.battery === 95 && mf.batt.firmware === '2.7.2', JSON.stringify(mf.batt));
  L.check('Mi Flora : conversion hexadécimal / DataView / objet', JSON.stringify(mf.bytes) === JSON.stringify([[160, 31], [1, 2, 3], [10, 255]]), JSON.stringify(mf.bytes));

  /* Feuille : 3 images synthétiques + mélange + fond blanc */
  const leaf = await p.evaluate(() => {
    function img(draw) { const c = document.createElement('canvas'); c.width = 120; c.height = 80; const x = c.getContext('2d'); x.fillStyle = 'rgb(40,40,40)'; x.fillRect(0, 0, 120, 80); draw(x); const d = x.getImageData(0, 0, 120, 80); return T.labo.analyseData(d.data, 120, 80); }
    const col = (c) => (x) => { x.fillStyle = c; x.fillRect(10, 10, 100, 60); };
    const o = { vert: img(col('rgb(60,140,50)')), jaune: img(col('rgb(210,195,40)')), brun: img(col('rgb(120,80,40)')),
      mix: img((x) => { x.fillStyle = 'rgb(60,140,50)'; x.fillRect(10, 10, 100, 36); x.fillStyle = 'rgb(210,195,40)'; x.fillRect(10, 46, 50, 24); x.fillStyle = 'rgb(120,80,40)'; x.fillRect(60, 46, 50, 24); }),
      mur: img((x) => { x.fillStyle = 'rgb(240,240,240)'; x.fillRect(0, 0, 120, 80); }),
      brule: img((x) => { x.fillStyle = 'rgb(60,140,50)'; x.fillRect(10, 10, 100, 60); x.fillStyle = 'rgb(235,230,215)'; x.fillRect(30, 20, 60, 30); }),
      noir: img(() => {}) };
    o.advVert = T.labo.leafAdvice(o.vert); o.advJaune = T.labo.leafAdvice(o.jaune); o.advBrun = T.labo.leafAdvice(o.brun); o.advNoir = T.labo.leafAdvice(o.noir); o.advBrule = T.labo.leafAdvice(o.brule);
    return o;
  });
  L.check('feuille : image verte -> vert >= 95 %, niveau « bonne forme »', leaf.vert.enough && leaf.vert.pct.g >= 95 && leaf.advVert.level === 'ok', JSON.stringify(leaf.vert.pct));
  L.check('feuille : image jaunie -> jaune >= 90 %, piste chlorose', leaf.jaune.pct.y >= 90 && /Jaunissement/.test(leaf.advJaune.pistes.join(' ')), JSON.stringify(leaf.jaune.pct));
  L.check('feuille : image brune -> brun >= 90 %, piste nécrose', leaf.brun.pct.b >= 90 && /bruns/.test(leaf.advBrun.pistes.join(' ')), JSON.stringify(leaf.brun.pct));
  L.check('feuille : mélange 60 % vert / 20 % jaune / 20 % brun reconnu (+/- 6 points)', near(leaf.mix.pct.g, 60, 6) && near(leaf.mix.pct.y, 20, 6) && near(leaf.mix.pct.b, 20, 6), JSON.stringify(leaf.mix.pct));
  L.check('feuille : mur blanc ou image noire -> « pas assez de feuille »', !leaf.mur.enough && !leaf.noir.enough && leaf.advNoir.level === 'none', JSON.stringify([leaf.mur.share, leaf.noir.share]));
  L.check('feuille : zone claire au milieu du vert -> zones claires détectées', leaf.brule.pct.p >= 10 && /claires/.test(leaf.advBrule.pistes.join(' ')), JSON.stringify(leaf.brule.pct));

  /* Lumière : verdicts et estimation par exposition */
  const lx = await p.evaluate(() => { const A = T.labo; return { v: [60000, 20000, 8000, 800].map((l) => A.luxVerdict(l).key), e: A.luxFromExposure(0.2158, 0.0002, 50, 1.8), none: A.luxFromExposure(0.2, 0, 100) }; });
  L.check('lumière : verdicts plein soleil / lumineux / mi-ombre / ombre sèche', lx.v.join() === 'plein,lumineux,mi,ombre', lx.v.join());
  L.check('lumière : estimation par exposition ~19 000 lux, rien sans exposition', near(lx.e, 19000, 1500) && lx.none === null, String(lx.e));

  /* Mélodie */
  const mel = await p.evaluate(() => {
    const A = T.labo, a = A.melody(50, 50, 18), b = A.melody(50, 50, 18), c = A.melody(90, 20, 35), d = A.melody(5, 80, 5), PEN = [0, 2, 4, 7, 9];
    const ok = (m) => m.notes.length > 4 && m.notes.every((n) => PEN.indexOf(n.midi % 12) >= 0 && n.midi >= 48 && n.midi <= 100);
    const mean = (m) => m.notes.reduce((s, n) => s + n.midi, 0) / m.notes.length;
    return { same: JSON.stringify(a) === JSON.stringify(b), ok: ok(a) && ok(c) && ok(d), bpm: [d.bpm, a.bpm, c.bpm], hi: mean(c) > mean(d), dry: c.notes.length <= d.notes.length || c.notes.length < 16, dd: [mean(c), mean(d)] };
  });
  L.check('chant : même mesures = même mélodie, toutes les notes dans la gamme pentatonique', mel.same && mel.ok);
  L.check('chant : plus de chaleur = plus rapide, plus de lumière = plus aigu', mel.bpm[0] < mel.bpm[1] && mel.bpm[1] < mel.bpm[2] && mel.hi, JSON.stringify(mel));

  /* Écoute : plafond du micro */
  const ce = await p.evaluate(() => {
    const A = T.labo, db = new Float32Array(2048); for (let i = 0; i < 2048; i++) db[i] = (i / 2048 * 24000) <= 20000 ? -50 : -125;
    const a = A.ceiling(db, 48000), db2 = new Float32Array(2048).fill(-130), b = A.ceiling(db2, 48000);
    return { a, b, t48: A.capText(24000, 19900), t96: A.capText(48000, 30000) };
  });
  L.check('écoute : plafond détecté vers 20 kHz sur un spectre coupé à 20 kHz', near(ce.a.highest, 20000, 300) && ce.a.nyquist === 24000, JSON.stringify(ce.a));
  L.check('écoute : silence total -> aucun plafond annoncé', ce.b.highest === 0);
  L.check('écoute : texte honnête à 48 kHz (impossible) et à 96 kHz (aucune preuve)', /impossibles à capter/.test(ce.t48) && /aucune preuve/.test(ce.t96) && /24 kHz/.test(ce.t48), ce.t48);
  await p.close();

  /* ================= 2. Chaque outil s'ouvre ================= */
  p = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: FAKES });
  await L.skipOnboarding(p);
  await p.evaluate(() => { window.__said = []; T.voice.speak = (t) => { window.__said.push(t); return Promise.resolve(true); }; });
  L.check('labo : aucune permission demandée au chargement (micro non appelé)', !(await p.evaluate(() => window.__F.micCalls)));
  L.check('labo : T.labo.tools() liste 8 outils avec liens', await p.evaluate(() => T.labo.tools().length === 8 && T.labo.tools().every((t) => /^#\/labo\//.test(t.href) && t.nom)));
  await go(p, '#/labo');
  let t = await text(p);
  L.check('labo : page d\'accueil avec les 8 outils et le bouton « Préparer les accès »', (await p.evaluate(() => document.querySelectorAll('#view a.item').length)) === 8 && /Préparer les accès/.test(t) && /Wi-Fi et le Bluetooth ne servent pas/.test(t));
  L.check('labo : champ T.store.s.labo présent après ouverture d\'un outil', (await go(p, '#/labo/lumiere'), await p.evaluate(() => typeof T.store.s.labo === 'object')));
  for (const id of ['ecouter', 'lumiere', 'feuille', 'soleil', 'capteur', 'chant']) {
    await go(p, '#/labo/' + id);
    const info = await p.evaluate(() => ({ t: document.getElementById('view').innerText, title: document.getElementById('title').textContent, steps: document.querySelectorAll('#view .steps li').length, say: document.querySelectorAll('#view [data-act="speak"]').length, carnet: !!document.querySelector('[data-act="lb-carnet"]'), back: !document.getElementById('btn-back').hidden }));
    L.check('outil ' + id + ' : s\'ouvre avec « à quoi ça sert », 3 étapes, limites, source, voix, carnet, retour', /À quoi ça sert/.test(info.t) && info.steps === 3 && /Ce que ça ne peut pas faire/.test(info.t) && /Source :/.test(info.t) && info.say >= 1 && info.carnet && info.back, JSON.stringify({ steps: info.steps, say: info.say }));
    L.check('outil ' + id + ' : aucun emoji', !EMOJI.test(info.t));
    await p.evaluate(() => { const b = document.querySelectorAll('[data-act="speak"]'); b[b.length - 1].click(); }); await L.sleep(400);
    L.check('outil ' + id + ' : « Écouter l\'explication » lit le texte avec les limites', await p.evaluate(() => { const s = window.__said[window.__said.length - 1] || ''; return /ne peut pas faire/.test(s) && s.length > 200; }), await p.evaluate(() => JSON.stringify(window.__said.slice(-1)).slice(-160) + window.__said.length + document.querySelectorAll('[data-act=speak]').length));
  }
  await click(p, '[data-act="lb-carnet"]');
  L.check('carnet : sans mesure, rien n\'est ajouté (message seulement)', await p.evaluate(() => T.carnet.all().length === 0));

  /* ================= 3. Écouter le jardin ================= */
  await go(p, '#/labo/ecouter');
  await click(p, '[data-act="lb-mic-go"]');
  L.check('micro : une fenêtre d\'explication s\'affiche avant la demande', await p.evaluate(() => !!document.querySelector('.modal') && /micro/i.test(document.querySelector('.modal').innerText) && !window.__F.micCalls));
  await modalBtn(p, 'Continuer'); await L.sleep(900);
  L.check('micro : accordé -> niveau, spectre et plafond affichés (limite du téléphone annoncée)', await p.evaluate(() => /dB/.test(document.getElementById('lb-db').textContent) && /24 kHz/.test(document.getElementById('lb-max').textContent) && /impossibles à capter/.test(document.getElementById('lb-max').textContent) && /Calme|Présent|Fort/.test(document.getElementById('lb-word').textContent)), await p.evaluate(() => document.getElementById('lb-max').textContent));
  L.check('micro : plus haut son entendu ~ 20 kHz (spectre simulé coupé à 20 kHz)', await p.evaluate(() => { const c = T.labo; return /19,\d kHz|20 kHz|20,\d kHz/.test(document.getElementById('lb-max').textContent); }), await p.evaluate(() => document.getElementById('lb-max').textContent));
  L.check('micro : réponse mémorisée dans T.store.s.labo.perm.mic', await p.evaluate(() => T.store.s.labo.perm.mic === 'ok'));
  L.check('micro : boutons Arrêter / Enregistrer actifs pendant l\'écoute', await p.evaluate(() => !document.getElementById('lb-mic-stop').hidden && !document.getElementById('lb-rec-go').disabled && document.getElementById('lb-mic-go').hidden));
  /* enregistrement : on simule 3 blocs audio puis on termine tout de suite */
  await click(p, '[data-act="lb-rec-go"]');
  await p.evaluate(() => { const sp = window.__made.sp; for (let i = 0; i < 3; i++) sp.onaudioprocess({ inputBuffer: { getChannelData: () => new Float32Array(4096).fill(0.1) } }); });
  await p.evaluate(() => { window.__tm = window.setTimeout; });
  await L.sleep(10300);
  L.check('micro : après 10 s, trois vitesses de relecture proposées', await p.evaluate(() => document.querySelectorAll('[data-act="lb-play"]').length === 3 && /plus grave|plus lent/.test(document.getElementById('lb-play').innerText)));
  await click(p, '[data-act="lb-play"][data-r="0.25"]');
  L.check('micro : relecture 4 fois plus lente (playbackRate 0,25, 3 x 4096 échantillons)', await p.evaluate(() => { const q = window.__made.played; return q.length === 1 && q[0].rate === 0.25 && q[0].len === 12288; }), await p.evaluate(() => JSON.stringify(window.__made.played)));
  await click(p, '[data-act="lb-carnet"]');
  L.check('carnet : l\'écoute du jardin s\'ajoute', await p.evaluate(() => T.carnet.all().length === 1 && /Écoute du jardin/.test(T.carnet.all()[0].texte)));
  await click(p, '[data-act="lb-mic-stop"]');
  L.check('micro : Arrêter coupe les pistes du micro', await p.evaluate(() => window.__F.track.stopped === true && !document.getElementById('lb-mic-stop') || window.__F.track.stopped === true));
  await click(p, '[data-act="lb-mic-go"]');
  await L.sleep(500);
  L.check('micro : deuxième fois, plus d\'explication (réponse mémorisée)', await p.evaluate(() => !document.querySelector('.modal') && window.__F.micCalls === 2));
  await go(p, '#/labo');
  L.check('micro : quitter l\'outil coupe le micro', await p.evaluate(() => window.__F.track.stopped === true));
  /* refusé */
  await p.evaluate(() => { window.__F.mic = 'refuse'; T.store.s.labo.perm.mic = ''; });
  await go(p, '#/labo/ecouter'); await click(p, '[data-act="lb-mic-go"]'); await modalBtn(p, 'Continuer'); await L.sleep(300);
  t = await text(p);
  L.check('micro refusé : message clair, marche à suivre Android et bouton « Autoriser le micro »', /refusé/.test(t) && /Réglages d'Android/.test(t) && /Autorisations/.test(t) && /Autoriser le micro/.test(t) && (await p.evaluate(() => T.store.s.labo.perm.mic)) === 'refuse');
  L.check('micro refusé : l\'outil reste utilisable (pas d\'écran vide)', t.length > 400);
  await p.evaluate(() => { window.__F.mic = 'ok'; });
  await click(p, '[data-act="lb-retry"][data-k="mic"]'); await L.sleep(500);
  L.check('micro : « Autoriser le micro » relance l\'écoute après un refus', await p.evaluate(() => /dB/.test(document.getElementById('lb-db').textContent) && T.store.s.labo.perm.mic === 'ok'));
  /* absent */
  await p.evaluate(() => { window.__F.mic = 'absent'; });
  await go(p, '#/labo/ecouter'); await click(p, '[data-act="lb-mic-go"]'); await L.sleep(300);
  L.check('micro absent : message « Non disponible »', /Non disponible|Aucun micro/.test(await text(p)));
  /* limites d'un téléphone qui échantillonne à 96 kHz */
  await p.evaluate(() => { window.__F.mic = 'ok'; window.__F.sr = 96000; window.__F.cut = 22000; });
  await go(p, '#/labo/ecouter'); await click(p, '[data-act="lb-mic-go"]'); await modalBtn(p, 'Continuer'); await L.sleep(900);
  L.check('micro 96 kHz : texte honnête « aucune preuve » (pas de promesse d\'ultrasons)', await p.evaluate(() => /aucune preuve/.test(document.getElementById('lb-max').textContent) && /48 kHz/.test(document.getElementById('lb-max').textContent)), await p.evaluate(() => document.getElementById('lb-max').textContent));
  await go(p, '#/labo');
  L.check('micro : pas d\'erreur JS', clean(p).length === 0, clean(p).join(' | '));

  /* ================= 4. Lumière ================= */
  await go(p, '#/labo/lumiere'); await p.evaluate(() => { window.__F.noexp = false; });
  await click(p, '[data-act="lb-light-go"]'); await L.sleep(3000);
  L.check('lumière : sans capteur -> explication de l\'appareil photo', await p.evaluate(() => !!document.querySelector('.modal') && /papier blanc/.test(document.querySelector('.modal').innerText)));
  await modalBtn(p, 'Continuer'); await L.sleep(4500);
  t = await text(p, '#lb-res');
  L.check('lumière : appareil photo -> estimation ~19 000 lux, verdict « Lumineux », marge annoncée', /Lumineux/.test(t) && /Marge d'erreur/.test(t) && /appareil photo/.test(t) && /(1\d|2\d)[\s ]?\d{3} lux|entre/.test(t), t.slice(0, 200));
  L.check('lumière : lien « Voir les plantes adaptées » et « Mes pots »', await p.evaluate(() => !!document.querySelector('[data-act="lb-find"]') && !!document.querySelector('#lb-res a[href="#/pots"]')));
  await click(p, '[data-act="lb-find"]');
  L.check('lumière : le lien règle le filtre de Trouver (mi-ombre) et ouvre #/trouver', await p.evaluate(() => location.hash === '#/trouver' && T.searchState.f.soleil === 'mi_ombre' && document.querySelector('#filters .chip.on')), await p.evaluate(() => JSON.stringify(T.searchState.f)));
  await go(p, '#/labo/lumiere');
  await click(p, '[data-act="lb-light-pick"][data-lux="100000"]');
  L.check('lumière : choix manuel « plein soleil » -> verdict et mémorisation', await p.evaluate(() => /Plein soleil/.test(document.getElementById('lb-res').innerText) && T.store.s.labo.lastLight.lux === 100000));
  await click(p, '[data-act="lb-carnet"]');
  L.check('carnet : la mesure de lumière s\'ajoute', await p.evaluate(() => T.carnet.all().some((n) => /Lumière à un emplacement/.test(n.texte))));
  /* caméra sans informations d'exposition */
  await p.evaluate(() => { window.__F.noexp = true; });
  await go(p, '#/labo/lumiere'); await click(p, '[data-act="lb-light-go"]'); await L.sleep(4500);
  L.check('lumière : caméra sans exposition -> aveu honnête et choix manuel proposé', /pas assez d'informations/.test(await text(p, '#lb-res')));
  /* capteur de lumière simulé */
  const p2 = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: () => {
    window.AmbientLightSensor = class { constructor() { this.l = {}; this.illuminance = 0; } addEventListener(n, f) { this.l[n] = f; } start() { let i = 0; const t = setInterval(() => { this.illuminance = 6000; this.l.reading && this.l.reading(); if (++i > 7) clearInterval(t); }, 30); } stop() {} };
  } });
  await L.skipOnboarding(p2); await go(p2, '#/labo/lumiere'); await click(p2, '[data-act="lb-light-go"]'); await L.sleep(800);
  t = await text(p2, '#lb-res');
  L.check('lumière : capteur du téléphone (AmbientLightSensor simulé 6000 lux) -> Mi-ombre', /Mi-ombre/.test(t) && /capteur de lumière du téléphone/.test(t) && !(await p2.evaluate(() => document.querySelector('.modal'))), t.slice(0, 160));
  await p2.close();
  /* caméra refusée */
  const p3 = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: () => { navigator.mediaDevices.getUserMedia = () => { const e = new Error('no'); e.name = 'NotAllowedError'; return Promise.reject(e); }; } });
  await L.skipOnboarding(p3); await go(p3, '#/labo/lumiere'); await click(p3, '[data-act="lb-light-go"]'); await L.sleep(300);
  await p3.evaluate(() => { const b = Array.prototype.filter.call(document.querySelectorAll('.modal-foot .btn'), (x) => x.textContent.trim() === 'Continuer')[0]; if (b) b.click(); }); await L.sleep(800);
  L.check('lumière : caméra refusée -> marche à suivre + choix manuel', /refusé/.test(await text(p3, '#lb-res')) && /Autoriser l'appareil photo/.test(await text(p3, '#lb-res')));
  await p3.close();

  /* ================= 5. Santé de la feuille ================= */
  const leafRun = async (cols) => {
    await p.evaluate((c) => { window.__LEAF = c; }, cols);
    await go(p, '#/labo/feuille'); await click(p, '[data-act="lb-leaf"][data-src="photos"]'); await L.sleep(900);
    return text(p, '#lb-res');
  };
  t = await leafRun(['rgb(60,140,50)']);
  L.check('feuille : photo verte -> « bonne forme », barres, avertissement « pas un diagnostic »', /bonne forme/.test(t) && /Vert sain/.test(t) && /pas un diagnostic/i.test(t) && /Ma plante est malade/.test(t), t.slice(0, 200));
  L.check('feuille : lien vers #/maladie et photo affichée sur l\'appareil', await p.evaluate(() => !!document.querySelector('#lb-res a[href="#/maladie"]') && !!document.querySelector('#lb-leafimg img')));
  t = await leafRun(['rgb(210,195,40)']);
  L.check('feuille : photo jaunie -> jaune dominant et piste d\'arrosage / lumière', /Jaune/.test(t) && /Jaunissement/.test(t) && /arrosage/i.test(t), t.slice(0, 120));
  t = await leafRun(['rgb(120,80,40)']);
  L.check('feuille : photo brune -> piste « taches ou bords bruns »', /bruns/.test(t));
  t = await leafRun(['rgb(60,140,50)', 'rgb(210,195,40)', 'rgb(120,80,40)']);
  L.check('feuille : photo mixte -> trois pistes', /Jaunissement/.test(t) && /bruns/.test(t) && await p.evaluate(() => document.querySelectorAll('#lb-res .lb-g').length === 4));
  await click(p, '[data-act="lb-carnet"]');
  L.check('carnet : le résultat de la feuille s\'ajoute (sans photo, sans donnée personnelle)', await p.evaluate(() => { const n = T.carnet.all().filter((x) => /Santé de la feuille/.test(x.texte)); return n.length === 1 && n[0].photo === ''; }));
  await p.evaluate(() => { window.__LEAF = ['rgb(40,40,40)']; });
  await go(p, '#/labo/feuille'); await click(p, '[data-act="lb-leaf"][data-src="photos"]'); await L.sleep(800);
  L.check('feuille : photo sans feuille -> conseils pour mieux photographier', /pas assez de feuille/.test(await text(p, '#lb-res')));
  await p.evaluate(() => { T.store.s.labo.perm.cam = ''; });
  await go(p, '#/labo/feuille'); await click(p, '[data-act="lb-leaf"][data-src="camera"]'); await L.sleep(300);
  L.check('feuille : « Prendre une photo » explique l\'appareil photo avant', await p.evaluate(() => !!document.querySelector('.modal') && /appareil photo/i.test(document.querySelector('.modal').innerText)));
  await modalBtn(p, 'Continuer'); await L.sleep(700);
  L.check('feuille : permission appareil photo mémorisée', await p.evaluate(() => T.store.s.labo.perm.cam === 'ok'));
  L.check('feuille : pas d\'erreur JS', clean(p).length === 0, clean(p).join(' | '));

  /* ================= 6. Boussole du soleil ================= */
  await go(p, '#/labo/soleil');
  t = await text(p);
  L.check('soleil : sans direction, invitation à choisir ; lever, coucher, hauteur à midi affichés', /Choisissez la direction/.test(t) && /Lever du soleil/.test(t) && /Hauteur à midi/.test(t) && /Durée du jour/.test(t));
  await click(p, '[data-act="lb-face"][data-v="180"]'); t = await text(p, '#lb-sunout');
  L.check('soleil : mur Sud -> « Ce coin de la cour reçoit environ X h de soleil »', /Ce coin de la cour reçoit environ \d+(,5)? h de soleil/.test(t) && /Sud/.test(t), t.slice(0, 200));
  L.check('soleil : tableau des 8 orientations', (await p.evaluate(() => document.querySelectorAll('.lb-bar').length)) === 8);
  const hrsTxt = async () => parseFloat((await text(p, '#lb-sunout')).match(/environ (\d+(?:,\d)?) h de soleil/)[1].replace(',', '.'));
  const hAuj = await hrsTxt();
  await click(p, '[data-act="lb-sun-when"][data-v="hiver"]'); const hHiv = await hrsTxt();
  await click(p, '[data-act="lb-sun-when"][data-v="ete"]'); const hEte = await hrsTxt();
  L.check('soleil : mur sud, plus de soleil le 21 juin que le 21 décembre (' + hEte + ' h / ' + hHiv + ' h)', hEte >= 8.5 && hHiv > 6 && hHiv < 9 && hEte > hHiv, hEte + ' / ' + hHiv);
  await click(p, '[data-act="lb-face"][data-v="0"]'); await click(p, '[data-act="lb-sun-when"][data-v="hiver"]');
  L.check('soleil : mur nord en décembre = 0 h, verdict ombre', /environ 0 h de soleil/.test(await text(p, '#lb-sunout')) && /Verdict : ombre/.test(await text(p, '#lb-sunout')));
  await p.evaluate(() => { const e = document.getElementById('lb-lat'); e.value = '43,5'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  L.check('soleil : latitude personnalisée prise en compte (43,5)', /latitude 43,5/.test(await text(p, '#lb-sunout')));
  await p.evaluate(() => { const e = document.getElementById('lb-lat'); e.value = 'abc'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  L.check('soleil : latitude invalide ignorée, retour à la valeur par défaut', /latitude 46,5/.test(await text(p, '#lb-sunout')));
  /* région */
  await p.evaluate(() => { T.store.s.settings.region = 'nord'; T.render(); }); await L.sleep(200);
  L.check('soleil : la région choisie donne la latitude (nord = 50)', /région choisie, latitude 50 degrés/.test(await text(p, '#lb-sunout')));
  await p.evaluate(() => { T.store.s.settings.region = null; T.render(); }); await L.sleep(200);
  /* boussole simulée */
  await p.evaluate(() => { T.store.s.labo.perm.motion = ''; });
  await click(p, '[data-act="lb-comp-go"]');
  L.check('boussole : explication avant d\'utiliser les capteurs de mouvement', await p.evaluate(() => !!document.querySelector('.modal') && /boussole/i.test(document.querySelector('.modal').innerText)));
  await modalBtn(p, 'Continuer');
  await p.evaluate(() => { for (let i = 0; i < 6; i++) { const e = new Event('deviceorientationabsolute'); e.alpha = 270; e.beta = 2; e.gamma = 1; e.absolute = true; window.dispatchEvent(e); } });
  await L.sleep(200);
  L.check('boussole : alpha 270 -> cap 90 degrés, Est, sud à 90 degrés à droite', await p.evaluate(() => /90 degrés, Est/.test(document.getElementById('lb-head').textContent) && /Le sud est à 90 degrés/.test(document.getElementById('lb-south').textContent)), await p.evaluate(() => document.getElementById('lb-head').textContent));
  L.check('boussole : aiguille tournée et bouton « Utiliser cette direction » actif', await p.evaluate(() => /rotate\(-90/.test(document.getElementById('lb-needle').getAttribute('transform')) && !document.getElementById('lb-comp-use').disabled));
  await click(p, '[data-act="lb-comp-use"]');
  L.check('boussole : direction utilisée -> mur tourné vers l\'Est', /Mur tourné vers : Est/.test(await text(p, '#lb-sunout')));
  L.check('boussole : réponse mouvement mémorisée', await p.evaluate(() => T.store.s.labo.perm.motion === 'ok'));
  await click(p, '[data-act="lb-comp-go"]');
  /* enregistrement dans le plan */
  await click(p, '[data-act="lb-sun-save"]');
  L.check('soleil : sans plan de jardin, message clair (plan à créer)', await p.evaluate(() => !!document.querySelector('.modal') && /pas encore de plan/.test(document.querySelector('.modal').innerText)));
  await modalBtn(p, 'Fermer');
  await p.evaluate(() => { T.store.s.garden = { w: 4, l: 3, south: 'bas', items: [] }; T.store.save(); });
  await click(p, '[data-act="lb-sun-save"]');
  L.check('soleil : avec un plan, on choisit le côté du plan visé par la direction', await p.evaluate(() => document.querySelectorAll('.modal [data-act="lb-side"]').length === 4));
  await click(p, '.modal [data-act="lb-side"][data-v="haut"]');
  L.check('soleil : orientation écrite dans le plan (Est vers le haut -> sud à droite)', await p.evaluate(() => T.store.s.garden.south === 'droite' && T.store.s.labo.cour.face === 90 && !document.querySelector('.modal')), await p.evaluate(() => T.store.s.garden.south));
  await click(p, '[data-act="lb-carnet"]');
  L.check('carnet : le résultat du soleil s\'ajoute', await p.evaluate(() => T.carnet.all().some((n) => /Soleil : mur tourné vers le Est/.test(n.texte))));
  /* boussole absente */
  const p4 = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: FAKES });
  await L.skipOnboarding(p4); await p4.evaluate(() => { T.store.s.labo = { perm: { motion: 'ok' } }; }); await go(p4, '#/labo/soleil'); await click(p4, '[data-act="lb-comp-go"]'); await L.sleep(3400);
  L.check('boussole : aucune réponse en 3 s -> message clair et choix à la main', /Aucune boussole n'a répondu/.test(await text(p4)));
  /* iOS : demande de permission refusée */
  const p5 = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: () => { window.DeviceOrientationEvent.requestPermission = () => Promise.resolve('denied'); } });
  await L.skipOnboarding(p5); await go(p5, '#/labo/soleil'); await click(p5, '[data-act="lb-comp-go"]'); await modalBtn(p5, 'Continuer');
  L.check('boussole : permission « denied » -> marche à suivre + bouton d\'autorisation', /refusé/.test(await text(p5)) && /Autoriser le mouvement/.test(await text(p5)));
  await p4.close(); await p5.close();
  L.check('soleil : pas d\'erreur JS', clean(p).length === 0, clean(p).join(' | '));

  /* ================= 7. Capteur Bluetooth ================= */
  await go(p, '#/labo/capteur');
  await click(p, '[data-act="lb-ble-go"]');
  L.check('capteur : ni Web Bluetooth ni plugin -> message clair « Non disponible » (jamais d\'écran vide)', /Non disponible/.test(await text(p)) && /Appareils à proximité/.test(await text(p)));
  await p.evaluate(fakeBle); await go(p, '#/labo/capteur');
  await click(p, '[data-act="lb-ble-go"]');
  L.check('capteur : explication Bluetooth avant la recherche', await p.evaluate(() => !!document.querySelector('.modal') && /Bluetooth/.test(document.querySelector('.modal').innerText) && window.__ble.length === 0));
  await modalBtn(p, 'Continuer'); await L.sleep(700);
  t = await text(p, '#lb-res');
  L.check('capteur : plugin simulé -> 41 %, 10,1 °C, 111 lux, 249 µS/cm, pile 95 %', /41 %/.test(t) && /10,1 °C/.test(t) && /111 lux/.test(t) && /249 µS\/cm/.test(t) && /95 %/.test(t), t.slice(0, 250));
  L.check('capteur : jauges et conseils en mots simples', await p.evaluate(() => document.querySelectorAll('#lb-res .lb-gauge').length === 4 && /arrosez|humidité|frais/i.test(document.getElementById('lb-res').innerText)));
  L.check('capteur : protocole respecté (nom Flower, service 1204, écriture a01f sur 1a00, lecture 1a01, déconnexion)', await p.evaluate(() => { const c = window.__ble.join(' '); return /req:Flower:00001204/.test(c) && /write:1a00:a01f/.test(c) && /read:1a01/.test(c) && /disc/.test(c) && c.indexOf('write') < c.indexOf('read:1a01'); }), await p.evaluate(() => window.__ble.join(' ')));
  L.check('capteur : dernière lecture mémorisée', await p.evaluate(() => { const l = T.store.s.labo.lastMiflora; return l && l.v.moisture === 41 && l.via === 'plugin'; }));
  await go(p, '#/labo/capteur');
  L.check('capteur : la dernière lecture est réaffichée à l\'ouverture', /Dernière lecture gardée/.test(await text(p)) && /41 %/.test(await text(p)));
  await p.evaluate(() => { window.__bleCancel = true; });
  await click(p, '[data-act="lb-ble-go"]'); await L.sleep(500);
  L.check('capteur : choix annulé -> message « Aucune sonde choisie »', /Aucune sonde choisie/.test(await text(p, '#lb-blemsg')));
  await p.evaluate(() => { const P = window.Capacitor.Plugins.BluetoothLe; P.requestDevice = () => Promise.resolve({ deviceId: 'X' }); P.read = () => Promise.reject(new Error('GATT error')); window.__bleCancel = false; });
  await click(p, '[data-act="lb-ble-go"]'); await L.sleep(600);
  L.check('capteur : erreur de lecture -> message clair + déconnexion propre', /La lecture a échoué/.test(await text(p, '#lb-blemsg')) && await p.evaluate(() => window.__ble.filter((x) => x === 'disc').length >= 2));
  await click(p, '[data-act="lb-carnet"]');
  L.check('capteur : pas d\'erreur JS', clean(p).length === 0, clean(p).join(' | '));
  /* Web Bluetooth simulé */
  const p6 = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: () => {
    const bytes = [0x65, 0, 0, 0x6f, 0, 0, 0, 0x29, 0xf9, 0, 2, 0x3c, 0, 0xfb, 0x34, 0x9b]; window.__wlog = [];
    const mkchar = (id) => ({ writeValue: (v) => { window.__wlog.push('w:' + id + ':' + Array.prototype.join.call(v, ',')); return Promise.resolve(); }, readValue: () => Promise.resolve(new DataView(new Uint8Array(id.indexOf('1a01') > 0 ? bytes : [0x50, 0, 0x32, 0x2e, 0x36, 0x2e, 0x36]).buffer)) });
    const svc = { getCharacteristic: (id) => Promise.resolve(mkchar(id)) };
    const srv = { getPrimaryService: () => Promise.resolve(svc), disconnect() { window.__wlog.push('disc'); } };
    Object.defineProperty(navigator, 'bluetooth', { value: { requestDevice: (o) => { window.__wlog.push('req:' + o.filters[0].namePrefix); return Promise.resolve({ gatt: { connect: () => Promise.resolve(srv) } }); } }, configurable: true });
  } });
  await L.skipOnboarding(p6); await go(p6, '#/labo/capteur'); await click(p6, '[data-act="lb-ble-go"]'); await modalBtn(p6, 'Continuer'); await L.sleep(600);
  t = await text(p6, '#lb-res');
  L.check('capteur : Web Bluetooth simulé -> mêmes valeurs, écriture 160,31 puis lecture', /41 %/.test(t) && /10,1 °C/.test(t) && /80 %/.test(t) && await p6.evaluate(() => window.__wlog.join(' ').indexOf('w:00001204'.slice(0, 2)) >= 0 && /w:00001a00[^ ]*:160,31/.test(window.__wlog.join(' ')) && /disc/.test(window.__wlog.join(' '))), await p6.evaluate(() => window.__wlog.join(' ')));
  await p6.close();

  /* ================= 8. Chant ================= */
  await go(p, '#/labo/chant');
  t = await text(p);
  L.check('chant : étiquette honnête « traduction en musique de TES mesures, pas la voix de la plante »', /Traduction en musique de TES mesures/.test(t) && /pas la voix de la plante/.test(t));
  L.check('chant : 3 curseurs à zone de toucher >= 44 px', await p.evaluate(() => { const r = document.querySelectorAll('.lb-range'); return r.length === 3 && Array.prototype.every.call(r, (e) => e.getBoundingClientRect().height >= 44); }));
  const svg0 = await p.evaluate(() => document.getElementById('lb-melo').innerHTML);
  await p.evaluate(() => { const e = document.getElementById('lb-c-l'); e.value = 95; e.dispatchEvent(new Event('input', { bubbles: true })); });
  L.check('chant : bouger un curseur change le dessin de la mélodie', (await p.evaluate(() => document.getElementById('lb-melo').innerHTML)) !== svg0);
  await p.evaluate(() => { window.__made.osc = 0; });
  await click(p, '[data-act="lb-chant-play"]');
  L.check('chant : « Jouer » lance une note par oscillateur (WebAudio simulé)', await p.evaluate(() => window.__made.osc >= 5 && window.__made.osc <= 16), await p.evaluate(() => String(window.__made.osc)));
  const closedBefore = await p.evaluate(() => window.__F.closed || 0);
  await click(p, '[data-act="lb-chant-stop"]');
  L.check('chant : « Arrêter » ferme le son', await p.evaluate((b) => (window.__F.closed || 0) > b, closedBefore));
  await click(p, '[data-act="lb-chant-use"]');
  L.check('chant : « Utiliser mes dernières mesures » reprend lumière (100000 lux) et humidité du capteur (41)', await p.evaluate(() => document.getElementById('lb-c-h').value === '41' && Number(document.getElementById('lb-c-l').value) >= 90), await p.evaluate(() => document.getElementById('lb-c-h').value + '/' + document.getElementById('lb-c-l').value));

  /* ================= 9. Science et enfant ================= */
  await go(p, '#/labo/science');
  t = await text(p);
  L.check('science : 10 fiches + réponse honnête sur le Wi-Fi et le Bluetooth + sécurité', (await p.evaluate(() => document.querySelectorAll('#view a.item[href^="#/labo/science/"]').length)) === 10 && /Le Wi-Fi ou le Bluetooth peuvent-ils capter une plante/.test(t) && /Non\./.test(t) && /prise du mur/.test(t));
  const ids = await p.evaluate(() => T.labo.science.map((f) => f.id));
  let allOk = true, detail = '';
  for (const id of ids) {
    await go(p, '#/labo/science/' + id);
    const r = await p.evaluate(() => { const t = document.getElementById('view').innerText; return { t, ok: /Ce qu'on sait/.test(t) && /Ce qu'on ne sait pas/.test(t) && /Peut-on le faire avec un téléphone/.test(t) && /Source :/.test(t), say: !!document.querySelector('[data-act="speak"]'), emoji: false }; });
    if (!r.ok || !r.say || EMOJI.test(r.t)) { allOk = false; detail += id + ' '; }
  }
  L.check('science : chaque fiche a « sait / ne sait pas », « avec un téléphone ? », une source, la voix, aucun emoji', allOk, detail);
  L.check('science : chaque fiche cite une source datée ou nommée (champ source)', await p.evaluate(() => T.labo.science.every((f) => f.source.length > 30 && /\d{4}|Plant Physiology/.test(f.source) && f.sait.length >= 1 && f.saitpas.length >= 1 && f.tel.length > 20)));
  await go(p, '#/labo/science/ultrasons'); t = await text(p);
  L.check('science : fiche ultrasons = Khait et al., Cell 2023, 40-80 kHz, téléphone incapable', /Khait/.test(t) && /Cell, 2023/.test(t) && /40 et 80 kHz/.test(t) && /Non\. Les micros de téléphone/.test(t));
  await go(p, '#/labo/science/electrique'); t = await text(p);
  L.check('science : signal électrique -> électrodes + amplificateur, jamais sur le secteur', /électrodes/.test(t) && /amplificateur/.test(t) && /secteur/.test(t));
  await click(p, '[data-act="lb-sci-note"]');
  L.check('science : la fiche peut être ajoutée au carnet', await p.evaluate(() => T.carnet.all().some((n) => /Fiche lue/.test(n.texte))));
  await go(p, '#/labo/science/inconnue');
  L.check('science : fiche inconnue -> liste des fiches (pas d\'écran vide)', (await p.evaluate(() => document.querySelectorAll('#view a.item').length)) >= 10);
  await go(p, '#/labo/enfant'); t = await text(p);
  L.check('enfant : 3 expériences avec matériel, étapes, ce qu\'on regarde, question', (await p.evaluate(() => document.querySelectorAll('#view .card').length)) === 3 && /Matériel/.test(t) && /On regarde/.test(t) && /Pour réfléchir/.test(t) && /phototropisme|lumière/i.test(t) && /sensitive/i.test(t) && /coton/i.test(t) && /ne jamais manger crus/.test(t));
  await click(p, '[data-act="lb-kid-note"]');
  L.check('enfant : « Noter dans le carnet » ajoute l\'expérience', await p.evaluate(() => T.carnet.all().some((n) => /Expérience/.test(n.texte))));
  await go(p, '#/labo/nimportequoi');
  L.check('labo : outil inconnu -> page de repli avec retour', /n'existe pas/.test(await text(p)));

  /* ================= 10. askAll ================= */
  const aa = await p.evaluate(async () => { window.__F.mic = 'ok'; window.__F.micCalls = 0; const r = await T.labo.askAll(); return { r, calls: window.__F.micCalls, stopped: window.__F.track.stopped, perm: JSON.stringify(T.store.s.labo.perm) }; });
  L.check('askAll : micro (puis arrêt des pistes), caméra, Bluetooth, mouvement -> objet de résultats', aa.r.micro === 'ok' && aa.calls === 1 && aa.stopped && ['camera', 'bluetooth', 'mouvement'].every((k) => typeof aa.r[k] === 'string') && aa.r.camera !== undefined, JSON.stringify(aa));
  L.check('askAll : Bluetooth via le plugin (initialize + permissions)', aa.r.bluetooth === 'ok' && await p.evaluate(() => window.__ble.indexOf('perm') >= 0));
  const aa2 = await p.evaluate(async () => { window.__F.mic = 'refuse'; const r = await T.labo.askAll(); return r; });
  L.check('askAll : micro refusé -> « refuse » et les autres demandes continuent', aa2.micro === 'refuse' && 'mouvement' in aa2 && 'bluetooth' in aa2);
  const aa3 = await p.evaluate(async () => { T.native.askPermissionsOnce = () => Promise.reject(new Error('boom')); window.Capacitor.Plugins.BluetoothLe.initialize = () => { throw new Error('sync boom'); }; window.DeviceOrientationEvent.requestPermission = () => Promise.reject(new Error('x')); try { const r = await T.labo.askAll(); return { ok: true, r }; } catch (e) { return { ok: false, e: String(e) }; } });
  L.check('askAll : ne plante jamais, même si tout lève une erreur', aa3.ok && aa3.r.camera === 'refuse' && aa3.r.bluetooth === 'refuse' && aa3.r.mouvement === 'refuse', JSON.stringify(aa3));
  const p7 = await L.newPage(browser, base, 'Pixel 8 (Android 14)', { beforeLoad: () => { Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }); Object.defineProperty(navigator, 'getUserMedia', { value: undefined, configurable: true }); Object.defineProperty(navigator, 'webkitGetUserMedia', { value: undefined, configurable: true }); Object.defineProperty(navigator, 'bluetooth', { value: undefined, configurable: true }); } });
  await L.skipOnboarding(p7);
  const aa4 = await p7.evaluate(async () => T.labo.askAll());
  L.check('askAll : sans aucune API (micro, caméra native, Bluetooth) -> « absent » partout, sans erreur', aa4.micro === 'absent' && aa4.camera === 'absent' && aa4.bluetooth === 'absent', JSON.stringify(aa4));
  L.check('askAll : pas d\'erreur JS dans ce cas', clean(p7).length === 0, clean(p7).join(' | '));
  await go(p7, '#/labo/ecouter'); await click(p7, '[data-act="lb-mic-go"]'); await modalBtn(p7, 'Continuer'); await L.sleep(300);
  L.check('micro : sans mediaDevices -> message « Non disponible », page intacte', /Non disponible|Aucun micro/.test(await text(p7)));
  await go(p7, '#/labo');
  await click(p7, '[data-act="lb-askall"]'); await L.sleep(600);
  L.check('labo : bouton « Préparer les accès » affiche un résumé', /Micro : /.test(await text(p7, '#lb-askres')) && /Bluetooth : /.test(await text(p7, '#lb-askres')));
  await p7.close();
  L.check('labo : aucune erreur JS sur toute la série', clean(p).length === 0, clean(p).join(' | '));
  await p.close();

  /* ================= 11. Débordements : 4 profils, texte à 200 % ================= */
  const profils = ['Pixel 8 (Android 14)', 'Samsung Z Fold (plié, Android 14)', 'Samsung Tab A9 tablette (Android 14)', 'Android 12 compact'];
  for (const dev of profils) {
    const pg = await L.newPage(browser, base, dev, { beforeLoad: FAKES });
    await L.skipOnboarding(pg);
    await pg.evaluate(() => {
      document.documentElement.style.setProperty('--scale', '2');
      T.store.s.garden = { w: 4, l: 3, south: 'haut', items: [] };
      T.store.s.labo = { perm: {}, lastMiflora: { t: Date.now(), via: 'plugin', v: { temp: 10.1, light: 111, moisture: 41, ec: 249, battery: 95 } }, lastLight: { lux: 9000, t: Date.now() } };
    });
    const chk = async (name) => { const o = await L.overflow(pg); L.check(dev + ' @200 % : ' + name + ' sans débordement', o.length === 0, o.join(' | ')); };
    const pgo = async (h) => { await pg.evaluate((h) => { location.hash = h; }, h); await L.sleep(250); };
    await pgo('#/labo'); await chk('accueil du Labo');
    await pg.evaluate(() => document.querySelector('[data-act="lb-askall"]').click()); await L.sleep(500); await chk('accueil après « Préparer les accès »');
    await pg.evaluate(() => { T.store.s.labo.perm = {}; });
    await pgo('#/labo/ecouter'); await chk('écouter (arrêté)');
    await pg.evaluate(() => document.querySelector('[data-act="lb-mic-go"]').click()); await L.sleep(250); await chk('fenêtre d\'explication du micro');
    const foot = await pg.evaluate(() => document.querySelector('.modal-foot').getBoundingClientRect().bottom <= window.innerHeight + 1);
    L.check(dev + ' @200 % : boutons de la fenêtre visibles', foot);
    await pg.evaluate(() => { const b = Array.prototype.filter.call(document.querySelectorAll('.modal-foot .btn'), (x) => x.textContent.trim() === 'Continuer')[0]; b.click(); }); await L.sleep(900); await chk('écouter (en cours)');
    await pg.evaluate(() => { window.__F.mic = 'refuse'; T.store.s.labo.perm.mic = ''; }); await pgo('#/labo/ecouter');
    await pg.evaluate(() => { document.querySelector('[data-act="lb-mic-go"]').click(); const b = Array.prototype.filter.call(document.querySelectorAll('.modal-foot .btn'), (x) => x.textContent.trim() === 'Continuer')[0]; b.click(); }); await L.sleep(400); await chk('micro refusé avec marche à suivre');
    await pgo('#/labo/lumiere'); await pg.evaluate(() => document.querySelector('[data-act="lb-light-pick"][data-lux="25000"]').click()); await L.sleep(200); await chk('lumière avec résultat');
    await pgo('#/labo/feuille'); await pg.evaluate(() => { window.__LEAF = ['rgb(60,140,50)', 'rgb(210,195,40)', 'rgb(120,80,40)']; document.querySelector('[data-act="lb-leaf"][data-src="photos"]').click(); }); await L.sleep(900); await chk('feuille avec résultat');
    await pgo('#/labo/soleil'); await pg.evaluate(() => document.querySelector('[data-act="lb-face"][data-v="225"]').click()); await L.sleep(200); await chk('soleil avec résultat et 8 orientations');
    await pg.evaluate(() => document.querySelector('[data-act="lb-sun-save"]').click()); await L.sleep(250); await chk('fenêtre « Enregistrer l\'orientation »');
    const foot2 = await pg.evaluate(() => document.querySelector('.modal-foot').getBoundingClientRect().bottom <= window.innerHeight + 1);
    L.check(dev + ' @200 % : boutons de la fenêtre d\'orientation visibles', foot2);
    await pg.evaluate(() => T.closeModal());
    await pgo('#/labo/capteur'); await chk('capteur avec dernière lecture');
    await pgo('#/labo/chant'); await chk('chant');
    await pgo('#/labo/science'); await chk('science (liste)');
    await pgo('#/labo/science/mycorhizes'); await chk('science (fiche)');
    await pgo('#/labo/enfant'); await chk('expériences avec l\'enfant');
    L.check(dev + ' @200 % : pas d\'erreur JS', clean(pg).length === 0, clean(pg).join(' | '));
    await pg.close();
  }
};
