/* Tifa Nature - « Labo des plantes » : le téléphone comme instrument, sans rien promettre d'irréel.
   Routes : #/labo (accueil) et #/labo/<outil> avec decouvertes (+ decouvertes/<fiche>), ecouter, lumiere, feuille, soleil, capteur, chant, science (+ science/<fiche>), enfant.
   Données des « Découvertes incroyables » : data/decouvertes.js (T.decouvertes).
   Données : T.store.s.labo = { perm: { mic, cam, bt, motion }, lastLight, lastMiflora, ... }
   API : T.labo.askAll(), T.labo.tools(). Tout accès au téléphone est demandé à l'ouverture d'un outil, jamais au chargement. */
(function () {
  'use strict';
  var T = window.T, L = T.labo = {};
  var live = [];            /* ressources en cours (micro, capteurs, sons) à couper en quittant l'outil */
  var S = { note: '', sun: { when: 'today', face: null, lat: null }, chant: { light: 50, hum: 50, temp: 18 }, rec: null, ceil: null };

  /* ---------- Outils communs ---------- */
  function esc(s) { return T.esc(s); }
  function st() {
    var s = T.store.s;
    if (!s.labo || typeof s.labo !== 'object' || Array.isArray(s.labo)) s.labo = {};
    if (!s.labo.perm || typeof s.labo.perm !== 'object') s.labo.perm = {};
    return s.labo;
  }
  function save() { try { T.store.save(); } catch (e) {} }
  function att0(name, fn) { T.act[name] = function (el, ev) { try { return fn(el, ev); } catch (e) { if (window.console) console.error(e); T.toast("Une action n'a pas pu se faire. Réessayez."); } }; }
  function say(t, mood) { try { if (T.feuille && T.feuille.say) T.feuille.say(t, mood); } catch (e) {} }
  function speakBtn(text, label) { try { return T.voice.button(text, label || "Écouter l'explication"); } catch (e) { return ''; } }
  function $(id) { return document.getElementById(id); }
  function setHtml(id, h) { var e = $(id); if (e) e.innerHTML = h; }
  function onStop(fn) { live.push(fn); }
  function stopAll() { var l = live; live = []; l.forEach(function (f) { try { f(); } catch (e) {} }); }
  L.stopAll = stopAll;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(v, d) { v = parseFloat(String(v).replace(',', '.')); return isFinite(v) ? v : d; }
  function fr(v, dec) { return (Math.round(v * Math.pow(10, dec || 0)) / Math.pow(10, dec || 0)).toString().replace('.', ','); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayIso() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function withTimeout(p, ms, msg) {
    return new Promise(function (resolve, reject) {
      var done = false, t = setTimeout(function () { if (!done) { done = true; var e = new Error(msg || 'delai'); e.name = 'Timeout'; reject(e); } }, ms);
      Promise.resolve(p).then(function (v) { if (!done) { done = true; clearTimeout(t); resolve(v); } }, function (e) { if (!done) { done = true; clearTimeout(t); reject(e); } });
    });
  }
  function li(a) { return (a || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join(''); }
  function toCarnet(texte) {
    if (!texte) { T.toast("Faites d'abord une mesure, puis ajoutez-la au carnet."); return false; }
    try {
      var a = (T.carnet && T.carnet.all) ? T.carnet.all() : (Array.isArray(T.store.s.journal) ? T.store.s.journal : null);
      if (!a) { T.toast("Le carnet n'est pas disponible."); return false; }
      a.push({ id: T.uid(), date: todayIso(), plantId: '', texte: String(texte).slice(0, 1900), photo: '', created: Date.now() });
      save(); T.toast('Ajouté au carnet de culture.'); return true;
    } catch (e) { T.toast("Le carnet n'a pas pu être mis à jour."); return false; }
  }

  /* ---------- Accès au téléphone : explication avant, mémorisation, marche à suivre si refusé ---------- */
  var KIND = { mic: ['le micro', 'Micro'], cam: ["l'appareil photo", 'Appareil photo'], motion: ['les capteurs de mouvement', 'Capteurs de mouvement'], bt: ['le Bluetooth', 'Appareils à proximité'] };
  var BTN_AUTH = { mic: 'Autoriser le micro', cam: "Autoriser l'appareil photo", motion: 'Autoriser le mouvement', bt: 'Autoriser le Bluetooth' };
  function permGet(k) { return st().perm[k] || ''; }
  function permSet(k, v) { st().perm[k] = v; save(); }
  function explainThen(k, title, html, go, onCancel) {
    if (permGet(k) === 'ok') { go(); return; }
    T.modal({ title: title, html: html + '<p class="small muted">Vous pouvez refuser : l\'appli continuera de marcher. Cette explication ne sera plus affichée après votre accord.</p>', buttons: [{ label: 'Plus tard', onClick: function () { try { if (onCancel) onCancel(); } catch (e) {} } }, { label: 'Continuer', primary: true, onClick: function () { go(); } }] });
  }
  function deniedHtml(k) {
    var n = KIND[k] || ['cet accès', 'Autorisation'];
    return "<div class='notice warn' id='lb-denied'><b>L'accès à " + esc(n[0]) + " est refusé.</b> Pour l'autoriser :<ol class='steps'><li>Ouvrez les Réglages d'Android.</li><li>Touchez « Applications », puis « Tifa Nature », puis « Autorisations ».</li><li>Touchez « " + esc(n[1]) + " » et choisissez « Autoriser pendant l'utilisation ».</li><li>Revenez ici et touchez le bouton ci-dessous.</li></ol><button class='btn primary block' data-act='lb-retry' data-k='" + k + "'>" + esc(BTN_AUTH[k] || 'Réessayer') + '</button></div>';
  }
  function absentHtml(txt) { return "<div class='notice warn'><b>Non disponible sur ce téléphone.</b> " + esc(txt) + '</div>'; }
  function gum(constraints) {
    return new Promise(function (resolve, reject) {
      var md = navigator.mediaDevices;
      if (md && md.getUserMedia) { md.getUserMedia(constraints).then(resolve, reject); return; }
      var old = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
      if (old) { old.call(navigator, constraints, resolve, reject); return; }
      var e = new Error('absent'); e.name = 'NotFoundError'; reject(e);
    });
  }
  function gumState(e) {
    var n = (e && e.name) || '';
    if (/NotAllowed|Security|Permission/i.test(n)) return 'refuse';
    if (/NotReadable|TrackStart|Abort/i.test(n)) return 'occupe';
    return 'absent';
  }
  function stopStream(s) { try { s.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} }

  /* ================== Liste des outils ================== */
  var TOOLS = [
    { id: 'decouvertes', nom: 'Découvertes incroyables', court: 'Des découvertes vraies sur les plantes, avec leur niveau de preuve, et les mythes démêlés' },
    { id: 'ecouter', nom: 'Écouter le jardin', court: 'Le micro : niveau du son et sons ralentis' },
    { id: 'lumiere', nom: 'Mesurer la lumière', court: 'Plein soleil, mi-ombre ou ombre ?' },
    { id: 'feuille', nom: 'Santé de la feuille', court: 'Une photo, des couleurs, des pistes' },
    { id: 'soleil', nom: 'La boussole du soleil', court: 'Combien d\'heures de soleil dans ma cour ?' },
    { id: 'capteur', nom: 'Capteur de plante Bluetooth', court: 'Sonde Mi Flora : sol, lumière, température' },
    { id: 'chant', nom: 'Le chant de ma plante', court: 'Mes mesures transformées en musique' },
    { id: 'science', nom: 'La science des plantes qui communiquent', court: '10 fiches : ce qu\'on sait, ce qu\'on ne sait pas' },
    { id: 'enfant', nom: 'Fais-le avec ton enfant', court: '3 expériences sûres et faciles' }
  ];
  L.tools = function () { return TOOLS.map(function (t) { return { id: t.id, nom: t.nom, court: t.court, href: '#/labo/' + t.id }; }); };

  /* ================== Calcul du soleil (formules de la NOAA, précision de quelques minutes) ================== */
  var RAD = Math.PI / 180;
  function dayOfYear(y, m, d) { return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86400000); }
  L.sun = function (y, m, d, lat, lon) {
    var n = dayOfYear(y, m, d), g = 2 * Math.PI / 365 * (n - 1 + 0.5);
    var decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    var eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    var noon = 720 - 4 * lon - eq, phi = lat * RAD;
    var c = (Math.cos(90.833 * RAD) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl));
    var o = { decl: decl / RAD, eq: eq, noonUTC: noon, lat: lat, lon: lon, riseUTC: null, setUTC: null, dayLen: c > 1 ? 0 : (c < -1 ? 1440 : null), polar: c > 1 ? 'nuit' : (c < -1 ? 'jour' : '') };
    if (c >= -1 && c <= 1) {
      var H = Math.acos(c) / RAD;
      o.riseUTC = noon - 4 * H; o.setUTC = noon + 4 * H; o.dayLen = 8 * H;
    }
    o.maxElev = 90 - Math.abs(lat - o.decl);
    return o;
  };
  /* Position du soleil à une minute UTC donnée : azimut (0 = nord, 90 = est, 180 = sud) et hauteur en degrés */
  L.sunPos = function (sun, utcMin) {
    var H = ((utcMin - sun.noonUTC) / 4) * RAD, phi = sun.lat * RAD, dl = sun.decl * RAD;
    var sinEl = Math.sin(phi) * Math.sin(dl) + Math.cos(phi) * Math.cos(dl) * Math.cos(H);
    var el = Math.asin(clamp(sinEl, -1, 1)) / RAD;
    var az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dl) * Math.cos(phi)) / RAD + 180;
    return { az: ((az % 360) + 360) % 360, el: el };
  };
  /* Heures de soleil direct sur un mur vertical tourné vers face (degrés, 0 = nord), horizon dégagé */
  L.wallHours = function (sun, face) {
    var step = 2, tot = 0, t;
    for (t = 0; t < 1440; t += step) {
      var p = L.sunPos(sun, sun.noonUTC - 720 + t);
      if (p.el > 1 && Math.cos((p.az - face) * RAD) > 0.0001) tot += step;
    }
    return tot / 60;
  };
  L.diffAngle = function (a, b) { var d = Math.abs(((a - b) % 360 + 360) % 360); return d > 180 ? 360 - d : d; };
  var CARD8 = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
  L.cardinal = function (deg) { return CARD8[Math.round((((deg % 360) + 360) % 360) / 45) % 8]; };
  /* Position approximative (latitude, longitude) selon la région choisie dans l'appli */
  var REG = { mediterranee: [43.5, 5.4], sudouest: [44.0, 0.6], ouest: [47.5, -1.5], centre: [47.0, 3.0], nord: [50.0, 2.8], est: [48.6, 6.5], montagne: [45.5, 6.5] };
  L.where = function () {
    var id = ''; try { id = T.store.s.settings.region || ''; } catch (e) {}
    var p = REG[id];
    if (p) return { lat: p[0], lon: p[1], region: id, approx: true };
    return { lat: 46.5, lon: 2.5, region: '', approx: true };
  };
  function localHm(sun, utcMin, y, m, d) {
    if (utcMin == null) return '--';
    var dt = new Date(Date.UTC(y, m - 1, d) + Math.round(utcMin) * 60000);
    return dt.getHours() + ' h ' + pad(dt.getMinutes());
  }
  function hoursTxt(h) {
    var r = Math.round(h * 2) / 2;
    return fr(r, 1) + ' h';
  }
  function sunDate() {
    var now = new Date(), y = now.getFullYear();
    if (S.sun.when === 'ete') return [y, 6, 21];
    if (S.sun.when === 'hiver') return [y, 12, 21];
    return [y, now.getMonth() + 1, now.getDate()];
  }

  /* ================== Lumière : verdict ================== */
  L.luxVerdict = function (lux) {
    if (lux >= 32000) return { key: 'plein', nom: 'Plein soleil', soleil: 'plein_soleil', texte: "Beaucoup de lumière directe : bon pour les légumes-fruits, les aromatiques du Sud et les plantes qui aiment le soleil." };
    if (lux >= 16000) return { key: 'lumineux', nom: 'Lumineux', soleil: 'mi_ombre', texte: "Très clair, avec un peu de soleil direct ou une belle lumière : bon pour la plupart des fleurs et des légumes-feuilles." };
    if (lux >= 5000) return { key: 'mi', nom: 'Mi-ombre', soleil: 'mi_ombre', texte: "Lumière douce ou soleil quelques heures : bon pour beaucoup de plantes d'intérieur, les fougères, les hortensias." };
    return { key: 'ombre', nom: 'Ombre sèche', soleil: 'ombre', texte: "Peu de lumière : choisissez des plantes d'ombre (fougères, hostas, lierre). Les plantes qui aiment le soleil y s'étiolent." };
  };
  function luxRound(l) {
    if (l >= 10000) return Math.round(l / 1000) * 1000;
    if (l >= 1000) return Math.round(l / 100) * 100;
    return Math.round(l / 10) * 10;
  }
  function luxFmt(l) { return String(luxRound(l)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  /* Estimation depuis l'exposition de la caméra : E = 272 x luminance linéaire x N² / (t x ISO), N = f/1,8 supposé */
  L.luxFromExposure = function (yLin, tSec, iso, fNumber) {
    if (!(tSec > 0) || !(iso > 0) || !(yLin > 0)) return null;
    var n = fNumber || 1.8;
    return 272 * yLin * n * n / (tSec * iso);
  };
  function srgbToLin(v) { v = v / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  L.meanLuma = function (data) {
    var i, sum = 0, n = 0;
    for (i = 0; i + 3 < data.length; i += 4) { sum += 0.2126 * srgbToLin(data[i]) + 0.7152 * srgbToLin(data[i + 1]) + 0.0722 * srgbToLin(data[i + 2]); n++; }
    return n ? sum / n : 0;
  };

  /* ================== Feuille : analyse des couleurs ================== */
  function hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (d > 0) {
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, mx === 0 ? 0 : d / mx, mx];
  }
  /* g = vert sain, y = jaune (chlorose), b = brun (nécrose), p = clair (brûlure, poudre), null = autre (fond, ombre) */
  L.classify = function (r, g, b) {
    var c = hsv(r, g, b), h = c[0], s = c[1], v = c[2];
    if (v < 0.12) return null;
    if (s < 0.22 && v >= 0.72) return 'p';
    if (s < 0.12) return null;
    if (h >= 75 && h <= 170 && s >= 0.22) return 'g';
    if (h >= 44 && h < 75) { if (s >= 0.3 && v >= 0.45) return 'y'; if (s < 0.3 && v >= 0.7) return 'p'; return v < 0.45 && s >= 0.3 ? 'b' : null; }
    if (h >= 10 && h < 44 && s >= 0.25) { if (h >= 36 && v >= 0.8 && s > 0.5) return 'y'; return 'b'; }
    return null;
  };
  L.analyseData = function (data, w, h) {
    var N = w * h, cls = new Array(N), i, x, y, cnt = { g: 0, y: 0, b: 0, p: 0 };
    for (i = 0; i < N; i++) cls[i] = L.classify(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    var D = 3, leafLike = function (k) { return k === 'g' || k === 'y' || k === 'b'; };
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var k = cls[y * w + x];
      if (!k) continue;
      if (k === 'p') {   /* un pixel clair ne compte que s'il touche la feuille (pas un mur blanc derrière) */
        var near = (x >= D && leafLike(cls[y * w + x - D])) || (x < w - D && leafLike(cls[y * w + x + D])) || (y >= D && leafLike(cls[(y - D) * w + x])) || (y < h - D && leafLike(cls[(y + D) * w + x]));
        if (!near) continue;
      }
      cnt[k]++;
    }
    var leaf = cnt.g + cnt.y + cnt.b + cnt.p;
    var res = { total: N, leaf: leaf, share: N ? leaf / N : 0, count: cnt, pct: { g: 0, y: 0, b: 0, p: 0 }, enough: N > 0 && leaf / N >= 0.08 };
    if (leaf) ['g', 'y', 'b', 'p'].forEach(function (k) { res.pct[k] = Math.round(cnt[k] / leaf * 100); });
    return res;
  };
  L.leafAdvice = function (a) {
    var out = [], p = a.pct;
    if (!a.enough) return { level: 'none', titre: 'Je ne vois pas assez de feuille', pistes: ["Rapprochez-vous : la feuille doit remplir une bonne partie de la photo.", "Posez-la sur un fond uni (une table, une assiette) et prenez la photo à la lumière du jour, sans ombre forte."] };
    if (p.y >= 15) out.push("Jaunissement (chlorose) : souvent un manque de lumière, un excès d'eau qui étouffe les racines, ou un manque d'azote (vieilles feuilles jaunes) ou de fer (jeunes feuilles jaunes aux nervures vertes). Vérifiez d'abord l'arrosage : la terre doit sécher un peu entre deux arrosages.");
    if (p.b >= 10) out.push("Taches ou bords bruns : air trop sec, manque d'eau ou excès d'engrais, coup de froid ou de soleil. Des taches rondes avec un cercle plus foncé peuvent être un champignon : retirez les feuilles touchées.");
    if (p.p >= 10) out.push("Zones claires : un coup de soleil sur des feuilles non habituées (surtout après un déplacement), ou une poudre blanche (oïdium), ou de minuscules points clairs laissés par des acariens. Regardez de près et sous la feuille.");
    if (!out.length) {
      if (p.g >= 85) return { level: 'ok', titre: 'Feuille en bonne forme', pistes: ["Presque toute la feuille est d'un vert sain. Continuez comme ça. Regardez quand même le dessous de la feuille de temps en temps."] };
      out.push("Quelques zones changent de couleur, sans que ce soit net. Surveillez la feuille pendant une semaine et comparez avec une nouvelle photo.");
      return { level: 'watch', titre: 'À surveiller', pistes: out };
    }
    return { level: 'watch', titre: 'Quelques signes à regarder', pistes: out };
  };

  /* ================== Mi Flora (HHCC « Flower Care ») ================== */
  var MF = L.miflora = {
    SERVICE: '00001204-0000-1000-8000-00805f9b34fb',
    CHAR_MODE: '00001a00-0000-1000-8000-00805f9b34fb',
    CHAR_DATA: '00001a01-0000-1000-8000-00805f9b34fb',
    CHAR_BATT: '00001a02-0000-1000-8000-00805f9b34fb',
    MODE_ON: [0xA0, 0x1F]
  };
  /* 16 octets : température (int16 / 10, octets 0-1), lumière (uint32, octets 3-6), humidité du sol (octet 7), conductivité (uint16, octets 8-9) */
  MF.decode = function (b) {
    if (!b || b.length < 10) return null;
    var temp = ((b[0] | (b[1] << 8)) << 16 >> 16) / 10;
    var light = (b[3] | (b[4] << 8) | (b[5] << 16)) + b[6] * 16777216;
    var moist = b[7], ec = b[8] | (b[9] << 8);
    var allZero = true, i; for (i = 0; i < b.length; i++) if (b[i]) { allZero = false; break; }
    if (allZero || moist > 100 || temp < -30 || temp > 80) return null;
    return { temp: temp, light: light, moisture: moist, ec: ec };
  };
  MF.decodeBattery = function (b) {
    if (!b || b.length < 1) return null;
    var fw = '', i; for (i = 2; i < b.length; i++) { if (b[i] >= 32 && b[i] < 127) fw += String.fromCharCode(b[i]); }
    return { battery: clamp(b[0], 0, 100), firmware: fw };
  };
  function toBytes(v) {
    if (v == null) return null;
    if (typeof v === 'object' && !(v instanceof ArrayBuffer) && !ArrayBuffer.isView(v) && !Array.isArray(v) && v.value != null) v = v.value;
    if (typeof v === 'string') {
      var h = v.replace(/[^0-9a-fA-F]/g, ''), out = [], i; for (i = 0; i + 1 < h.length; i += 2) out.push(parseInt(h.substr(i, 2), 16));
      return out;
    }
    if (v instanceof ArrayBuffer) return Array.prototype.slice.call(new Uint8Array(v));
    if (ArrayBuffer.isView(v)) return Array.prototype.slice.call(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
    if (Array.isArray(v)) return v.slice();
    return null;
  }
  MF.toBytes = toBytes;
  function hexOf(a) { return a.map(function (x) { return pad2h(x); }).join(''); }
  function pad2h(x) { var s = x.toString(16); return s.length < 2 ? '0' + s : s; }
  function blePlugin() { try { var C = window.Capacitor, real = window.capacitorCommunityBluetoothLe && window.capacitorCommunityBluetoothLe.BluetoothLe, native = !!(C && C.isNativePlatform && C.isNativePlatform()); var P = C && C.Plugins && C.Plugins.BluetoothLe; if (!(P && P.initialize)) P = real; if (!(P && P.initialize)) return null; if (!native && P === real) return null; return P; } catch (e) { return null; } }
  var BLE_TO = 20000;
  /* Première solution : Web Bluetooth (navigateur) */
  var webDriver = {
    nom: 'navigateur',
    available: function () { return !!(navigator.bluetooth && navigator.bluetooth.requestDevice); },
    run: function () {
      var server = null;
      return withTimeout(navigator.bluetooth.requestDevice({ filters: [{ namePrefix: 'Flower' }], optionalServices: [MF.SERVICE] }), 60000, 'choix')
        .then(function (dev) { return withTimeout(dev.gatt.connect(), BLE_TO, 'connexion'); })
        .then(function (srv) { server = srv; return srv.getPrimaryService(MF.SERVICE); })
        .then(function (svc) {
          return svc.getCharacteristic(MF.CHAR_MODE).then(function (c) { return c.writeValue(new Uint8Array(MF.MODE_ON)); }).catch(function () {})
            .then(function () { return svc.getCharacteristic(MF.CHAR_DATA); })
            .then(function (c) { return withTimeout(c.readValue(), BLE_TO, 'lecture'); })
            .then(function (dv) {
              var data = toBytes(dv);
              return svc.getCharacteristic(MF.CHAR_BATT).then(function (c) { return c.readValue(); }).then(toBytes, function () { return null; }).then(function (bat) { return { data: data, battery: bat }; });
            });
        })
        .then(function (r) { try { server.disconnect(); } catch (e) {} return r; }, function (e) { try { if (server) server.disconnect(); } catch (x) {} throw e; });
    }
  };
  /* Deuxième solution : plugin Capacitor Bluetooth LE (appli Android) */
  var pluginDriver = {
    nom: 'plugin',
    available: function () { return !!blePlugin(); },
    run: function () {
      var P = blePlugin(), id = null;
      function done(r) { return P.disconnect({ deviceId: id }).then(function () { return r; }, function () { return r; }); }
      return withTimeout(P.initialize({ androidNeverForLocation: true }), BLE_TO, 'initialisation')
        .then(function () { return withTimeout(P.requestDevice({ namePrefix: 'Flower', optionalServices: [MF.SERVICE] }), 60000, 'choix'); })
        .then(function (d) { id = d && d.deviceId; if (!id) throw new Error('aucun'); return withTimeout(P.connect({ deviceId: id }), BLE_TO, 'connexion'); })
        .then(function () { return P.write({ deviceId: id, service: MF.SERVICE, characteristic: MF.CHAR_MODE, value: hexOf(MF.MODE_ON) }).catch(function () {}); })
        .then(function () { return withTimeout(P.read({ deviceId: id, service: MF.SERVICE, characteristic: MF.CHAR_DATA }), BLE_TO, 'lecture'); })
        .then(function (r) {
          var data = toBytes(r);
          return P.read({ deviceId: id, service: MF.SERVICE, characteristic: MF.CHAR_BATT }).then(toBytes, function () { return null; }).then(function (bat) { return { data: data, battery: bat }; });
        })
        .then(done, function (e) { return (id ? P.disconnect({ deviceId: id }).catch(function () {}) : Promise.resolve()).then(function () { throw e; }); });
    }
  };
  MF.drivers = [webDriver, pluginDriver];
  /* Lit le capteur : essaie chaque solution à tour de rôle. Renvoie { ok, valeurs, via } ou { ok:false, raison } */
  MF.read = function () {
    var list = MF.drivers.filter(function (d) { return d.available(); });
    if (!list.length) return Promise.resolve({ ok: false, raison: 'absent' });
    var i = 0, last = null;
    function next() {
      if (i >= list.length) return Promise.resolve({ ok: false, raison: last && /NotFound|annul|cancel|aucun|choix/i.test(String(last.name + ' ' + last.message)) ? 'annule' : (last && /Timeout|delai/i.test(String(last.name + last.message)) ? 'delai' : 'echec') });
      var d = list[i++];
      return Promise.resolve().then(function () { return d.run(); }).then(function (r) {
        var v = MF.decode(r && r.data);
        if (!v) { last = new Error('lecture invalide'); return next(); }
        var b = MF.decodeBattery(r.battery); if (b) { v.battery = b.battery; v.firmware = b.firmware; }
        return { ok: true, valeurs: v, via: d.nom };
      }, function (e) {
        last = e || new Error('echec');
        if (/NotFound|cancel|annul/i.test(String(last.name + ' ' + last.message)) && !/ble|plugin/i.test(d.nom)) { return { ok: false, raison: 'annule' }; }
        return next();
      });
    }
    return next();
  };
  function moistTxt(m) { return m < 15 ? ['Très sec', 'bad', "La terre est très sèche : arrosez bientôt, doucement."] : m < 25 ? ['Plutôt sec', 'warn', "La terre commence à sécher : vérifiez avec le doigt, arrosez si la plante aime l'eau."] : m <= 60 ? ['Bien', 'ok', "L'humidité est correcte pour la plupart des plantes."] : ['Très humide', 'warn', "La terre est très mouillée : attendez avant d'arroser, et vérifiez que l'eau s'évacue."]; }
  function tempTxt(t) { return t < 8 ? ['Froid', 'bad', "Trop froid pour beaucoup de plantes : protégez-les du gel."] : t < 15 ? ['Frais', 'warn', "Frais : les plantes d'intérieur ralentissent."] : t <= 28 ? ['Bien', 'ok', "Température agréable pour la plupart des plantes."] : ['Chaud', 'warn', "Chaud : arrosez le matin ou le soir, évitez le plein soleil sur les feuilles."]; }
  function ecTxt(e) { return e < 50 ? ['Très bas', 'warn', "Presque aucun engrais dans la terre (ou la sonde est dans l'air)."] : e < 350 ? ['Pauvre', 'warn', "Terre pauvre : un peu d'engrais doux si la plante pousse en ce moment."] : e <= 1800 ? ['Correct', 'ok', "La terre contient assez d'éléments nutritifs."] : ['Très riche', 'bad', "Beaucoup de sels : arrosez abondamment pour rincer, et arrêtez l'engrais."]; }
  function gaugeHtml(label, valTxt, pct, tone, advice) {
    return "<div class='lb-g'><div class='lb-g-top'><b>" + esc(label) + '</b><span>' + esc(valTxt) + "</span></div><div class='lb-gauge " + tone + "' role='img' aria-label='" + esc(label + ' : ' + valTxt) + "'><i style='width:" + clamp(Math.round(pct), 2, 100) + "%'></i></div><p class='small'>" + esc(advice) + '</p></div>';
  }
  L.sensorHtml = function (v) {
    var m = moistTxt(v.moisture), t = tempTxt(v.temp), e = ecTxt(v.ec), lv = L.luxVerdict(v.light);
    var h = gaugeHtml('Humidité du sol', v.moisture + ' %', v.moisture, m[1], m[0] + '. ' + m[2]);
    h += gaugeHtml('Température', fr(v.temp, 1) + ' °C', (v.temp + 5) / 45 * 100, t[1], t[0] + '. ' + t[2]);
    h += gaugeHtml('Lumière', String(v.light).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') + ' lux', Math.log10(Math.max(v.light, 1)) / 5 * 100, lv.key === 'ombre' ? 'warn' : 'ok', lv.nom + '. ' + lv.texte);
    h += gaugeHtml('Éléments nutritifs (conductivité)', v.ec + ' µS/cm', v.ec / 2500 * 100, e[1], e[0] + '. ' + e[2]);
    if (v.battery != null) h += "<p class='small muted'>Pile de la sonde : " + v.battery + ' %.</p>';
    return h;
  };
  function sensorSpeech(v) {
    var m = moistTxt(v.moisture), t = tempTxt(v.temp), e = ecTxt(v.ec);
    return 'Humidité du sol ' + v.moisture + ' pour cent. ' + m[2] + ' Température ' + fr(v.temp, 1) + ' degrés. ' + t[2] + ' Lumière ' + luxFmt(v.light) + ' lux. ' + L.luxVerdict(v.light).nom + '. Éléments nutritifs ' + v.ec + '. ' + e[2];
  }

  /* ================== Le chant de ma plante ================== */
  var PENTA = [0, 2, 4, 7, 9];
  /* Renvoie { bpm, notes: [ { midi, start, dur } ] } : même mesures, même mélodie. Gamme pentatonique de do. */
  L.melody = function (light, hum, temp) {
    light = clamp(light, 0, 100); hum = clamp(hum, 0, 100); temp = clamp(temp, 0, 40);
    var seed = Math.floor(light * 7 + hum * 13 + temp * 17 + 1) % 2147483647 || 1;
    function rnd() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }
    var bpm = Math.round(clamp(56 + temp * 1.4, 54, 110)), root = light < 25 ? 48 : (light < 70 ? 60 : 72);
    var ladder = [], o, k; for (o = 0; o < 2; o++) for (k = 0; k < 5; k++) ladder.push(root + 12 * o + PENTA[k]);
    var idx = Math.floor(light / 100 * 6), t = 0, notes = [], i, dry = hum < 35, wet = hum > 65;
    for (i = 0; i < 16; i++) {
      var step = Math.floor(rnd() * 5) - 2; idx = clamp(idx + step, 0, ladder.length - 1);
      var dur = dry ? 0.5 : (wet ? 1.5 : 1);
      if (!(dry && rnd() < 0.3)) notes.push({ midi: ladder[idx], start: t, dur: wet ? dur * 1.4 : dur * 0.9 });
      t += dur;
    }
    return { bpm: bpm, notes: notes, beats: t };
  };
  function melodySvg(m) {
    var h = "<svg class='lb-melody' viewBox='0 0 160 50' role='img' aria-label='Dessin de la mélodie' preserveAspectRatio='none'>", lo = 48, hi = 89;
    m.notes.forEach(function (n) {
      var x = n.start / m.beats * 156, w = Math.max(3, n.dur / m.beats * 156 * 0.8), y = 46 - (n.midi - lo) / (hi - lo) * 40;
      h += "<rect x='" + x.toFixed(1) + "' y='" + y.toFixed(1) + "' width='" + w.toFixed(1) + "' height='4' rx='2'></rect>";
    });
    return h + '</svg>';
  }
  var AC = function () { return window.AudioContext || window.webkitAudioContext; };
  function playMelody(m) {
    var C = AC(); if (!C) { T.toast("Ce téléphone ne sait pas jouer de sons ici."); return false; }
    stopAll();
    var ctx = new C(); try { if (ctx.resume) ctx.resume(); } catch (e) {}
    var master = ctx.createGain(); master.gain.value = 0.22; master.connect(ctx.destination);
    var beat = 60 / m.bpm, t0 = ctx.currentTime + 0.1, last = 0;
    m.notes.forEach(function (n) {
      var o = ctx.createOscillator(), g = ctx.createGain(), s = t0 + n.start * beat, e = s + n.dur * beat;
      o.type = 'triangle'; o.frequency.value = 440 * Math.pow(2, (n.midi - 69) / 12);
      g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(0.9, s + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, e + 0.25);
      o.connect(g); g.connect(master); o.start(s); o.stop(e + 0.3); last = Math.max(last, e + 0.3);
    });
    var timer = setTimeout(function () { stopAll(); var b = $('lb-chant-play'); if (b) b.textContent = 'Jouer la mélodie'; }, Math.ceil((last - ctx.currentTime) * 1000) + 200);
    onStop(function () { clearTimeout(timer); try { ctx.close(); } catch (e) {} });
    return true;
  }

  /* ================== Fiches « La science » ================== */
  var SCI = [
    { id: 'electrique', titre: "Signaux électriques et ondes de calcium",
      resume: "Quand une feuille est blessée, un signal part dans toute la plante en quelques minutes.",
      sait: ["Une blessure déclenche des signaux électriques et une onde de calcium qui se propagent vers les autres feuilles.", "Chez la petite plante de laboratoire Arabidopsis, attaquée par des chenilles, ce signal passe par des canaux de type récepteurs au glutamate. Il prépare les feuilles lointaines à se défendre (hormone jasmonate)."],
      saitpas: ["On ne sait pas encore tout de la façon dont le signal est lu et mélangé avec d'autres, ni si les résultats de cette plante modèle valent pour toutes les plantes.", "Ce n'est pas un « cerveau » : les plantes n'ont pas de neurones."],
      tel: "Non, pas avec le téléphone seul. Ces signaux sont faibles (de l'ordre de quelques millivolts à quelques dizaines de millivolts, selon les mesures) : il faudrait des électrodes et un amplificateur spécial, un montage de bricolage utilisé en classe. Le Wi-Fi et le Bluetooth ne servent pas à les capter. Ne branchez jamais rien d'improvisé sur le secteur (la prise murale).",
      source: "Toyota et al., Science, 2018 : « Glutamate triggers long-distance, calcium-based plant defense signaling »." },
    { id: 'volatils', titre: "Les odeurs d'alerte (composés volatils)",
      resume: "Une plante attaquée par des chenilles libère des molécules odorantes dans l'air.",
      sait: ["Ces molécules attirent parfois des insectes qui mangent les chenilles.", "Des plantes voisines peuvent préparer leurs défenses quand elles les respirent. C'est l'odeur de l'herbe coupée."],
      saitpas: ["Dans la nature, on discute encore : est-ce un vrai « message » envoyé aux voisines, ou la voisine qui profite d'une fuite ?", "Les effets mesurés en laboratoire sont plus nets que dans les champs."],
      tel: "Non. Le téléphone n'a pas de capteur de molécules. Votre nez fait mieux : froissez une feuille de tomate ou de menthe et sentez.",
      source: "Heil et Karban, Trends in Ecology and Evolution, 2010 : « Explaining evolution of plant communication by airborne signals »." },
    { id: 'mycorhizes', titre: "Le « réseau sous la forêt » (mycorhizes)",
      resume: "Des champignons vivent collés aux racines et relient parfois plusieurs arbres sous terre.",
      sait: ["Les champignons mycorhiziens aident la plante à trouver l'eau et les minéraux, et reçoivent du sucre en échange.", "Des expériences en conditions contrôlées (Simard, 1997) ont mesuré du carbone passant d'un jeune arbre à un autre d'espèce différente, par un chemin où les champignons interviennent."],
      saitpas: ["L'idée d'« arbres-mères qui nourrissent leurs petits » est très répandue, mais une revue de 2023 n'a trouvé aucune preuve publiée sur le terrain, et estime que beaucoup d'affirmations vont plus loin que les résultats. Cette revue est elle-même discutée par d'autres chercheurs.", "On ne sait pas si ces échanges profitent vraiment aux arbres dans une forêt normale."],
      tel: "Non. Tout se passe sous terre. Pour s'en approcher : un peu de terre de forêt, ou un produit mycorhizien du commerce, mis au rempotage.",
      source: "Simard et al., Nature, 1997 ; Karst et al., Nature Ecology and Evolution, 2023 (critique des conclusions trop fortes)." },
    { id: 'ultrasons', titre: "Les clics des plantes stressées",
      resume: "Des tomates et des tabacs manquant d'eau ou coupés produisent des petits clics trop aigus pour l'oreille.",
      sait: ["Dans une étude de 2023, des micros spéciaux placés à environ 10 cm ont enregistré des clics, surtout entre 20 et 100 kHz (pic moyen vers 50 à 58 kHz), sur des tomates et des tabacs privés d'eau ou coupés.", "Les plantes tranquilles en font très peu (moins d'un par heure). Un programme informatique pouvait deviner le type de stress d'après les clics."],
      saitpas: ["On ne sait pas pourquoi : la piste principale est la formation de bulles d'air dans les petits tuyaux d'eau de la tige (cavitation), pas un « message » : les auteurs eux-mêmes disent que le mécanisme est mal compris.", "On ne sait pas si d'autres êtres vivants les entendent vraiment, ni si cela marche au jardin avec le vent et les insectes."],
      tel: "Non. Les micros de téléphone enregistrent au mieux jusqu'à 20 ou 24 kHz : l'essentiel des clics est hors de portée. L'outil « Écouter le jardin » vous montre la limite exacte de VOTRE téléphone.",
      source: "Khait et al., Cell, 2023 : « Sounds emitted by plants under stress are airborne and informative »." },
    { id: 'heliotropisme', titre: "Le tournesol qui suit le soleil (héliotropisme)",
      resume: "Les jeunes tournesols tournent leur tête d'est en ouest pendant la journée, puis reviennent la nuit.",
      sait: ["Le mouvement vient d'une croissance différente des deux côtés de la tige, réglée par l'horloge interne de la plante.", "Quand la fleur est adulte, elle s'arrête et regarde vers l'est : dans l'étude, ces fleurs se réchauffaient plus vite le matin et recevaient environ cinq fois plus de visites d'insectes pollinisateurs."],
      saitpas: ["Les détails de l'horloge qui commande ce mouvement sont encore étudiés."],
      tel: "Oui, en photo : prenez la même plante chaque heure et comparez. Le téléphone sert alors d'appareil photo, pas de capteur.",
      source: "Atamian et al., Science, 2016 : « Circadian regulation of sunflower heliotropism, floral orientation, and pollinator visits »." },
    { id: 'nyctinastie', titre: "Les feuilles qui se couchent la nuit (nyctinastie)",
      resume: "Haricot, oxalis, trèfle : leurs feuilles se replient le soir et se rouvrent au matin.",
      sait: ["Le mouvement vient de petits renflements à la base des feuilles qui gonflent ou se vident d'eau.", "Il continue même dans une obscurité permanente pendant un temps : c'est l'horloge interne qui le commande, pas seulement la lumière."],
      saitpas: ["À quoi ça sert exactement est discuté : plusieurs explications ont été proposées (par exemple limiter les pertes de chaleur la nuit), sans qu'une seule fasse l'unanimité."],
      tel: "Oui, avec patience : une photo à midi et une photo à la nuit tombée, avec la même lumière douce. Pas de flash fort.",
      source: "Minorsky, Biological Reviews, 2019 : « The functions of foliar nyctinasty: a review and hypothesis » (revue des explications proposées)." },
    { id: 'phototropisme', titre: "Se pencher vers la lumière (phototropisme)",
      resume: "Une plante sur un rebord de fenêtre se penche vers le verre.",
      sait: ["Des récepteurs à la lumière bleue (les phototropines) déclenchent une répartition d'une hormone, l'auxine, plus abondante côté ombre.", "Le côté ombre pousse plus vite, donc la tige se courbe vers la lumière. Darwin l'a étudié dès 1880."],
      saitpas: ["Les détails du passage entre le récepteur et l'hormone sont toujours en recherche."],
      tel: "Oui, c'est l'expérience la plus simple. Voir « Fais-le avec ton enfant ». Le capteur de lumière du téléphone aide à comparer les côtés.",
      source: "Christie, Annual Review of Plant Biology, 2007 : « Phototropin blue-light receptors »." },
    { id: 'sensitive', titre: "La sensitive qui se referme (Mimosa pudica)",
      resume: "Touchée, la sensitive replie ses feuilles en une ou deux secondes.",
      sait: ["Un signal électrique part du point touché, et de l'eau quitte vite des cellules à la base des petites feuilles : elles s'affaissent.", "Elle se rouvre au bout de quelques minutes."],
      saitpas: ["Une étude de 2014 (Gagliano et collègues) dit que la plante « s'habitue » et ne se ferme plus quand on la fait tomber de façon répétée sans danger. Ce résultat est discuté : des chercheurs estiment que les preuves sont insuffisantes et parlent de fatigue plutôt que d'apprentissage. Voir la fiche « La sensitive apprend-elle ? » dans les Découvertes."],
      tel: "Oui, mais c'est l'œil le meilleur instrument. Le téléphone peut filmer : mettez-le en vidéo, touchez très doucement une feuille, regardez au ralenti.",
      source: "Volkov et al., Plant, Cell and Environment, 2010 : « Mimosa pudica: electrical and mechanical stimulation of plant movements »." },
    { id: 'toucher', titre: "Le toucher et le vent (thigmomorphogenèse)",
      resume: "Une plante frôlée ou secouée tous les jours reste plus petite et plus solide.",
      sait: ["Le frottement ou le vent modifie la croissance : tige plus courte et plus épaisse.", "Des plants de légumes élevés en serre sans vent sont plus fragiles : le jardinier les « endurcit » avant de les planter."],
      saitpas: ["Comment la plante « sent » le toucher est encore étudié (calcium, hormones de défense)."],
      tel: "Oui, une expérience : caressez 10 fois par jour une plante et pas sa voisine. Comparez leur hauteur avec une règle après deux semaines.",
      source: "Jaffe, Planta, 1973 : « Thigmomorphogenesis: the response of plant growth and development to mechanical stimulation »." },
    { id: 'circadien', titre: "L'horloge interne des plantes (rythmes circadiens)",
      resume: "Les plantes ont une horloge d'environ 24 heures, même dans le noir.",
      sait: ["Cette horloge règle, entre autres, l'ouverture des pores des feuilles et le mouvement des feuilles.", "Chez la plante de laboratoire Arabidopsis, celles dont l'horloge est accordée à la durée du jour et de la nuit ont plus de chlorophylle, captent plus de carbone, poussent plus vite et survivent mieux (Dodd et collègues, 2005)."],
      saitpas: ["Les plantes n'ont pas qu'une horloge : plusieurs horloges, dans différents organes, se coordonnent de façon encore mal connue."],
      tel: "Oui, indirectement : la photo toutes les 3 heures montre les feuilles qui bougent. Évitez d'éclairer la plante la nuit.",
      source: "Dodd et al., Science, 2005 : « Plant circadian clocks increase photosynthesis, growth, survival, and competitive advantage »." }
  ];
  L.science = SCI;
  function sciSpeech(f) { return f.titre + '. ' + f.resume + " Ce qu'on sait. " + f.sait.join(' ') + " Ce qu'on ne sait pas. " + f.saitpas.join(' ') + ' Peut-on le faire avec un téléphone ? ' + f.tel; }

  var KIDS = [
    { id: 'photo', titre: "Le haricot qui cherche la lumière", mat: "Une boîte en carton, un pot de terreau avec une graine de haricot ou de cresson, des ciseaux, une fenêtre.",
      etapes: ["Semez une graine dans un pot et arrosez un peu.", "Découpez un trou rond (3 cm) sur un côté de la boîte et posez la boîte sur le pot, le trou tourné vers la fenêtre.", "Chaque jour, soulevez la boîte, regardez et prenez une photo. Rendez la boîte au même endroit."],
      regarde: "Après quelques jours, la petite tige se courbe vers le trou, vers la lumière.", question: "Que se passe-t-il si on tourne le pot d'un demi-tour ?", note: "Expérience : phototropisme. Pot avec boîte percée tournée vers la fenêtre, photo chaque jour." },
    { id: 'coton', titre: "Le haricot dans le coton", mat: "Du coton, un pot de yaourt transparent, 3 haricots secs (à ne jamais manger crus), de l'eau.",
      etapes: ["Mettez du coton mouillé (pas trempé) au fond du pot.", "Posez les haricots contre la paroi, pour les voir de côté. Placez le pot dans un endroit clair, à l'abri du froid.", "Chaque jour, gardez le coton humide et dessinez ou photographiez ce que vous voyez."],
      regarde: "Au bout de 2 à 3 jours, une petite racine sort, puis une tige monte et les feuilles s'ouvrent. La racine pousse toujours vers le bas.", question: "Que fait la racine si on couche le pot sur le côté ?", note: "Expérience : germination d'un haricot dans le coton, observation quotidienne." },
    { id: 'sensitive', titre: "Toucher la sensitive (si vous en avez une)", mat: "Une sensitive (Mimosa pudica), vendue en jardinerie. Tout se passe avec un doigt très doux. Lavez-vous les mains après (ne la mettez pas en bouche).",
      etapes: ["Regardez la plante : ses petites feuilles sont ouvertes.", "Effleurez le bout d'une feuille avec le doigt, très doucement, une seule fois.", "Comptez combien de secondes avant la fermeture, puis combien de minutes avant qu'elle rouvre. Ne recommencez pas trop : elle se fatigue."],
      regarde: "Les petites feuilles se referment l'une après l'autre en une ou deux secondes, et se rouvrent au bout de quelques minutes.", question: "Se referme-t-elle aussi quand on souffle dessus ? Et quand on la touche toujours au même endroit ?", note: "Expérience : la sensitive se referme quand on la touche. Temps de fermeture et de réouverture notés." }
  ];
  function kidSpeech(k) { return k.titre + '. Matériel : ' + k.mat + ' Étapes. ' + k.etapes.map(function (e, i) { return (i + 1) + '. ' + e; }).join(' ') + " On regarde : " + k.regarde + ' Pour réfléchir : ' + k.question; }

  /* ================== Cadre commun d'un outil ================== */
  var DEF = {
    ecouter: {
      sert: "Voir en direct le niveau du son et ses aigus et graves, et enregistrer quelques secondes pour les réécouter au ralenti (insectes, pluie sur les feuilles).",
      etapes: ["Touchez « Commencer à écouter » et acceptez le micro.", "Approchez le téléphone d'un massif, d'une haie ou d'une feuille. Faites un bruit net (clés, papier froissé) pour voir la limite du micro.", "Touchez « Enregistrer 10 secondes », puis choisissez la vitesse de relecture."],
      limites: ["Il n'entend pas les clics ultrasonores des plantes : ils sont surtout entre 20 et 100 kHz (pic vers 50 kHz) et un micro de téléphone s'arrête vers 20 à 24 kHz.", "Ce n'est pas un sonomètre : les niveaux sont indicatifs.", "Le ralenti ne crée pas de sons de plante : il rend plus graves les sons qui existent déjà."],
      source: "Khait et al., Cell, 2023 (clics de plantes, surtout 20-100 kHz, mesurés à 10 cm avec du matériel ultrasonore spécialisé)." },
    lumiere: {
      sert: "Savoir si un emplacement est en plein soleil, lumineux, en mi-ombre ou à l'ombre, pour choisir la bonne plante.",
      etapes: ["Placez-vous à l'endroit de la plante, écran tourné vers le ciel (ou la lumière).", "Touchez « Mesurer maintenant ». Le téléphone utilise son capteur de lumière, sinon l'appareil photo, sinon vous choisissez vous-même.", "Lisez le verdict et touchez « Voir les plantes adaptées »."],
      limites: ["Le résultat est approximatif : environ 30 % d'écart avec le capteur du téléphone, un facteur 3 avec l'appareil photo.", "Une mesure ne vaut que pour l'heure où vous la faites : le soleil bouge. Refaites-la matin et après-midi.", "Les nuages, un mur ou un arbre changent beaucoup le résultat."],
      source: "Repères de jardinage usuels : plein soleil au-dessus de 32 000 lux, ombre en dessous de 5 000 lux. Le capteur Web (AmbientLightSensor) n'est pas géré par tous les navigateurs." },
    feuille: {
      sert: "Regarder les couleurs d'une feuille : part de vert sain, de jaune, de brun et de zones claires, avec des pistes en mots simples.",
      etapes: ["Posez une feuille sur un fond uni, à la lumière du jour.", "Touchez « Prendre une photo » ou « Choisir dans la galerie ».", "Lisez les pourcentages et les pistes. La photo reste sur le téléphone."],
      limites: ["Ce n'est PAS un diagnostic. Le jaune peut venir de l'eau, de la lumière, de la saison ou d'une maladie.", "Une photo sombre, floue ou prise sous une lampe jaune fausse les couleurs.", "L'analyse ne voit pas le dessous de la feuille ni les insectes."],
      source: "Méthode : classement des pixels par teinte (vert, jaune, brun, clair), sans envoi de donnée. Lien avec la page « Ma plante est malade » pour aller plus loin." },
    soleil: {
      sert: "Calculer combien d'heures de soleil direct reçoit un mur ou un coin de la cour, selon son orientation et la date.",
      etapes: ["Touchez « Utiliser la boussole » et posez le téléphone à plat, dos contre le mur, le haut du téléphone pointé vers l'extérieur. Ou choisissez la direction à la main.", "Touchez « Utiliser cette direction ».", "Lisez : « Ce coin reçoit environ X h de soleil ». Comparez été et hiver."],
      limites: ["Le calcul suppose un ciel sans nuage et aucun obstacle : arbres, toits voisins et murs réduisent les heures réelles.", "La position est approximative (région choisie, ou centre de la France) : l'écart sur les heures reste de quelques minutes à un quart d'heure.", "La boussole du téléphone est trompée par les aimants, les objets en fer et les coques magnétiques."],
      source: "Formules astronomiques de la NOAA (déclinaison et équation du temps). Comparées à l'algorithme complet de la NOAA pour Paris aux solstices et aux équinoxes : écart de 2,5 minutes au plus sur les heures de lever et de coucher." },
    capteur: {
      sert: "Lire une sonde Bluetooth Xiaomi Mi Flora (Flower Care) plantée dans le pot : humidité du sol, température, lumière, éléments nutritifs.",
      etapes: ["Plantez la sonde dans la terre et allumez le Bluetooth du téléphone.", "Touchez « Chercher ma sonde » et choisissez-la dans la liste (nom : Flower care).", "Lisez les jauges et les conseils. La dernière lecture est gardée."],
      limites: ["Seule la sonde Mi Flora / HHCC est prise en charge, pas les autres marques.", "Le Bluetooth sert à parler à la sonde, jamais à « capter la plante » : la sonde mesure, le téléphone lit.", "Cette partie n'a été testée qu'avec une fausse sonde : sur votre téléphone, elle peut échouer. Les conseils sont des repères, pas des règles."],
      source: "Protocole public de la sonde (service Bluetooth 00001204, écriture des deux octets A0 1F pour activer la mesure, lecture de 16 octets), décrit par des projets libres de lecture de la sonde Flower Care." },
    chant: {
      sert: "Transformer VOS mesures (lumière, humidité, température) en une petite mélodie douce, pour le plaisir et pour les enfants.",
      etapes: ["Réglez les trois curseurs, ou touchez « Utiliser mes dernières mesures ».", "Touchez « Jouer la mélodie ».", "Changez un curseur et réécoutez : plus de lumière donne des notes plus aiguës, plus de chaleur donne un rythme plus rapide, plus d'humidité donne des notes plus longues."],
      limites: ["Ce n'est pas la voix de la plante : c'est une traduction en musique de TES mesures, choisie par l'appli.", "Aucune plante ne « chante » : la mélodie n'apporte aucune information cachée.", "Utile pour jouer, pas pour soigner."],
      source: "Sonification : on associe des mesures à des notes de la gamme pentatonique (do, ré, mi, sol, la), qui sonne toujours juste." }
  };
  function frame(id, panel, extra) {
    var d = DEF[id], nom = TOOLS.filter(function (t) { return t.id === id; })[0].nom;
    var sp = nom + '. ' + d.sert + ' Comment faire. ' + d.etapes.map(function (e, i) { return (i + 1) + '. ' + e; }).join(' ') + " Ce que ça ne peut pas faire. " + d.limites.join(' ');
    var h = '<div class="card"><h2>À quoi ça sert</h2><p>' + esc(d.sert) + '</p></div>';
    h += '<div class="card"><h2>Comment faire</h2><ol class="steps">' + li(d.etapes) + '</ol></div>';
    h += '<div class="card lb-panel">' + panel + '</div>';
    h += '<div class="row lb-actions">' + speakBtn(sp) + '<button class="btn" data-act="lb-carnet">Ajouter au carnet</button></div>';
    h += '<div class="notice warn"><b>Ce que ça ne peut pas faire</b><ul>' + li(d.limites) + '</ul></div>';
    h += '<p class="small muted lb-src">Source : ' + esc(d.source) + '</p>';
    h += (extra || '') + '<a class="btn block" href="#/labo">Tous les outils du Labo</a>';
    return { title: nom, html: h };
  }
  function resultBox(html) { return '<div id="lb-res" class="lb-res" aria-live="polite" tabindex="-1">' + (html || '') + '</div>'; }
  function showResult(html, note) {
    setHtml('lb-res', html);
    if (note != null) S.note = note;
    var r = $('lb-res'); if (r && r.scrollIntoView) { try { r.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
  }

  /* ================== Outil 1 : écouter le jardin ================== */
  L.ceiling = function (db, sampleRate) {
    var n = db.length, nyq = sampleRate / 2, i, vals = [], from = Math.floor(n * 0.92);
    for (i = from; i < n; i++) vals.push(isFinite(db[i]) ? db[i] : -140);
    vals.sort(function (a, b) { return a - b; });
    var floor = vals.length ? vals[Math.floor(vals.length / 2)] : -140, hi = -1;
    for (i = n - 1; i > 0; i--) { if (isFinite(db[i]) && db[i] > floor + 10 && db[i] > -100) { hi = i; break; } }
    return { nyquist: nyq, floorDb: floor, highest: hi > 0 ? hi / n * nyq : 0 };
  };
  L.capText = function (nyq, highest) {
    var k = function (v) { return fr(v / 1000, 1) + ' kHz'; };
    var t = 'Ce téléphone enregistre au mieux jusqu\'à ' + k(nyq) + (highest > 0 ? ' ; le plus haut son entendu jusqu\'ici : ' + k(highest) + '.' : '.');
    if (nyq < 40000) return t + " Les clics de plantes stressées de l'étude (surtout 20 à 100 kHz, pic vers 50 kHz) sont donc pour l'essentiel impossibles à capter avec ce téléphone.";
    return t + " Le téléphone échantillonne assez vite, mais son micro est fait pour la voix : aucune preuve qu'il capte les 20 à 100 kHz des plantes. Il faudrait un micro à ultrasons.";
  };
  function levelWord(dbfs) { return dbfs < -62 ? 'Très calme' : dbfs < -48 ? 'Calme' : dbfs < -34 ? 'Présent' : dbfs < -20 ? 'Fort' : 'Très fort'; }
  function drawSpec(cv, db, nyq) {
    var c; try { c = cv.getContext('2d'); } catch (e) { return; } if (!c) return;
    var W = cv.width, H = cv.height, bars = 64, i, col = '#4f7a58';
    try { col = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || col; } catch (e) {}
    c.clearRect(0, 0, W, H);
    var per = Math.floor(db.length / bars);
    for (i = 0; i < bars; i++) {
      var m = -140, j; for (j = 0; j < per; j++) { var v = db[i * per + j]; if (isFinite(v) && v > m) m = v; }
      var p = clamp((m + 100) / 80, 0, 1), bh = Math.max(1, p * (H - 4));
      c.fillStyle = col; c.globalAlpha = 0.85; c.fillRect(i * (W / bars) + 1, H - bh, W / bars - 2, bh);
    }
    c.globalAlpha = 1;
    if (nyq > 20000) { var x = 20000 / nyq * W; c.fillStyle = col; c.fillRect(x, 0, 2, H); }
  }
  function toolEcouter() {
    var h = '<h2>Écouter</h2><div class="lb-big" id="lb-db" aria-live="off">--</div><div class="lb-meter" role="img" aria-label="Niveau du son"><i id="lb-lvl" style="width:2%"></i></div>';
    h += '<p id="lb-word" class="small muted">Le micro est arrêté.</p><canvas id="lb-spec" class="lb-spec" width="320" height="110" role="img" aria-label="Aigus et graves du son en direct"></canvas>';
    h += '<div class="lb-axis small muted"><span>Graves</span><span id="lb-axmid"></span><span id="lb-axhi">Aigus</span></div><p id="lb-max" class="small"></p>';
    h += '<div class="row"><button class="btn primary grow" id="lb-mic-go" data-act="lb-mic-go">Commencer à écouter</button><button class="btn grow" id="lb-mic-stop" data-act="lb-mic-stop" hidden>Arrêter</button></div>';
    h += '<div id="lb-micmsg"></div><div class="row lb-rec"><button class="btn grow" id="lb-rec-go" data-act="lb-rec-go" disabled>Enregistrer 10 secondes</button></div><div id="lb-play"></div>';
    h += resultBox('');
    return frame('ecouter', h);
  }
  function micStart() {
    stopAll();
    var msg = $('lb-micmsg'); if (msg) msg.innerHTML = '';
    var C = AC();
    if (!C) { if (msg) msg.innerHTML = absentHtml("Ce téléphone ne sait pas analyser le son ici."); return; }
    gum({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).catch(function (e) {
      if (gumState(e) === 'absent' && e && /Overconstrained|Type/i.test(e.name || '')) return gum({ audio: true });
      throw e;
    }).then(function (stream) {
      permSet('mic', 'ok');
      var ctx = new C(), an, src, pr = null, stopped = false, raf = 0, rec = { on: false, chunks: [], timer: 0 };
      try { if (ctx.resume) ctx.resume(); } catch (e) {}
      src = ctx.createMediaStreamSource(stream); an = ctx.createAnalyser(); an.fftSize = 4096; an.smoothingTimeConstant = 0.55;
      src.connect(an);
      if (ctx.createScriptProcessor) {
        try { pr = ctx.createScriptProcessor(4096, 1, 1); src.connect(pr); pr.connect(ctx.destination); pr.onaudioprocess = function (ev) { if (rec.on) rec.chunks.push(new Float32Array(ev.inputBuffer.getChannelData(0))); }; } catch (e) { pr = null; }
      }
      var mr = null;
      if (!pr && window.MediaRecorder) { try { mr = new MediaRecorder(stream); mr.ondataavailable = function (ev) { if (ev.data && ev.data.size) rec.chunks.push(ev.data); }; } catch (e) { mr = null; } }
      var freq = new Float32Array(an.frequencyBinCount), tim = new Float32Array(an.fftSize), best = 0, nyq = ctx.sampleRate / 2, frames = 0, lastTxt = 0;
      var cv = $('lb-spec');
      setHtml('lb-axmid', fr(nyq / 2000, 0) + ' kHz'); setHtml('lb-axhi', 'Aigus (' + fr(nyq / 1000, 0) + ' kHz)');
      S.ceil = { nyq: nyq, highest: 0 };
      function frame1() {
        if (stopped) return;
        try {
          an.getFloatFrequencyData(freq); an.getFloatTimeDomainData(tim);
          var sum = 0, i; for (i = 0; i < tim.length; i++) sum += tim[i] * tim[i];
          var rms = Math.sqrt(sum / tim.length), dbfs = rms > 0 ? 20 * Math.log10(rms) : -100;
          var pct = clamp((dbfs + 70) / 70 * 100, 2, 100);
          setHtml('lb-db', Math.round(clamp(dbfs, -99, 0)) + ' dB');
          var lv = $('lb-lvl'); if (lv) lv.style.width = pct + '%';
          if (cv) drawSpec(cv, freq, nyq);
          frames++;
          var c = L.ceiling(freq, ctx.sampleRate);
          if (dbfs > -55 && c.highest > best) best = c.highest;
          var now = Date.now();
          if (now - lastTxt > 600) { lastTxt = now; setHtml('lb-word', levelWord(dbfs) + ". Ce n'est pas un vrai sonomètre."); setHtml('lb-max', esc(L.capText(nyq, best))); S.ceil = { nyq: nyq, highest: best }; }
        } catch (e) {}
        raf = window.requestAnimationFrame ? window.requestAnimationFrame(frame1) : setTimeout(frame1, 120);
      }
      function stop() {
        if (stopped) return; stopped = true;
        try { if (window.cancelAnimationFrame) cancelAnimationFrame(raf); clearTimeout(raf); } catch (e) {}
        clearTimeout(rec.timer); stopStream(stream); try { src.disconnect(); } catch (e) {} try { if (pr) pr.disconnect(); } catch (e) {}
        try { ctx.close(); } catch (e) {}
        var g = $('lb-mic-go'), s = $('lb-mic-stop'), r = $('lb-rec-go'); if (g) g.hidden = false; if (s) s.hidden = true; if (r) r.disabled = true;
      }
      S.audio = { ctx: ctx, stop: stop, rec: rec, pr: pr, mr: mr };
      onStop(stop);
      var g = $('lb-mic-go'), s = $('lb-mic-stop'), r = $('lb-rec-go'); if (g) g.hidden = true; if (s) s.hidden = false; if (r) r.disabled = false;
      frame1();
      say("Je t'écoute. Fais un petit bruit près de la feuille.", 'ecoute');
      S.note = "Écoute du jardin : le téléphone enregistre jusqu'à environ " + fr(nyq / 1000, 0) + " kHz ; les clics de plantes (surtout 20 à 100 kHz) ne sont pas captables.";
      permSet('mic', 'ok');
    }, function (e) {
      var s = gumState(e); permSet('mic', s);
      if (msg) msg.innerHTML = s === 'refuse' ? deniedHtml('mic') : (s === 'occupe' ? absentHtml("Le micro est utilisé par une autre appli. Fermez-la et réessayez.") : absentHtml("Aucun micro n'a été trouvé ou l'accès n'est pas possible dans cette version."));
    });
  }
  function recStart() {
    var A = S.audio; if (!A || !A.ctx) { T.toast("Commencez d'abord à écouter."); return; }
    var b = $('lb-rec-go'); if (b) { b.disabled = true; b.textContent = 'Enregistrement en cours…'; }
    A.rec.chunks = []; A.rec.on = true;
    if (A.mr) { try { A.mr.start(); } catch (e) {} }
    var left = 10, tick = function () {
      left -= 1; if (b) b.textContent = 'Enregistrement : encore ' + left + ' s';
      if (left <= 0) recEnd(); else A.rec.timer = setTimeout(tick, 1000);
    };
    A.rec.timer = setTimeout(tick, 1000);
  }
  function recEnd() {
    var A = S.audio; if (!A) return;
    A.rec.on = false; clearTimeout(A.rec.timer);
    var b = $('lb-rec-go'); if (b) { b.disabled = false; b.textContent = 'Enregistrer 10 secondes'; }
    var ctx = A.ctx;
    function ready(buf) {
      S.rec = buf;
      setHtml('lb-play', "<h3>Réécouter</h3><div class='row'><button class='btn grow' data-act='lb-play' data-r='1'>Vitesse normale</button><button class='btn grow' data-act='lb-play' data-r='0.5'>2 fois plus lent</button><button class='btn grow' data-act='lb-play' data-r='0.25'>4 fois plus lent</button><button class='btn grow' data-act='lb-play-stop'>Arrêter</button></div><p class='small muted'>Plus lent, les sons deviennent plus graves : on entend mieux les petits bruits d'insectes ou de gouttes. Écouter au casque est plus agréable.</p>");
    }
    if (A.pr) {
      var tot = 0, i; A.rec.chunks.forEach(function (c) { tot += c.length; });
      if (!tot) { T.toast("Rien n'a été enregistré. Réessayez."); return; }
      var buf = ctx.createBuffer(1, tot, ctx.sampleRate), ch = buf.getChannelData(0), off = 0;
      A.rec.chunks.forEach(function (c) { ch.set(c, off); off += c.length; });
      ready(buf);
    } else if (A.mr) {
      try {
        A.mr.onstop = function () {
          var blob = new Blob(A.rec.chunks, { type: A.mr.mimeType || 'audio/webm' });
          var fin = function (ab) { ctx.decodeAudioData(ab, ready, function () { T.toast("L'enregistrement n'a pas pu être relu."); }); };
          if (blob.arrayBuffer) blob.arrayBuffer().then(fin); else { var fr2 = new FileReader(); fr2.onload = function () { fin(fr2.result); }; fr2.readAsArrayBuffer(blob); }
        };
        A.mr.stop();
      } catch (e) { T.toast("L'enregistrement n'a pas pu se terminer."); }
    } else T.toast("Ce téléphone ne permet pas d'enregistrer ici.");
  }
  function playRec(rate) {
    var A = S.audio, buf = S.rec; if (!buf) return;
    var C = AC(), ctx = (A && A.ctx && A.ctx.state !== 'closed') ? A.ctx : (C ? new C() : null); if (!ctx) { T.toast('Impossible de jouer le son.'); return; }
    try { if (S.src) S.src.stop(); } catch (e) {}
    var src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate; src.connect(ctx.destination); src.start(0); S.src = src;
    S.note = "Écoute du jardin : enregistrement de 10 secondes, relu " + (rate < 1 ? (rate === 0.5 ? '2 fois' : '4 fois') + ' plus lentement.' : 'à vitesse normale.');
    onStop(function () { try { src.stop(); } catch (e) {} });
  }

  /* ================== Outil 2 : lumière ================== */
  function lightResult(lux, via, margin) {
    var v = L.luxVerdict(lux), lo = lux / margin, hi = lux * margin;
    st().lastLight = { lux: Math.round(lux), t: Date.now(), via: via }; save();
    var txt = v.nom + '. Environ ' + luxFmt(lux) + ' lux (entre ' + luxFmt(lo) + ' et ' + luxFmt(hi) + '). ' + v.texte;
    var h = "<div class='lb-verdict " + v.key + "'><h3>" + esc(v.nom) + "</h3><div class='lb-big'>" + luxFmt(lux) + " <small>lux</small></div><p class='small'>Marge d'erreur : entre " + luxFmt(lo) + ' et ' + luxFmt(hi) + ' lux. Mesuré par : ' + esc(via) + '.</p><p>' + esc(v.texte) + '</p></div>';
    h += "<div class='row'>" + speakBtn(txt, 'Écouter le résultat') + "<button class='btn primary grow' data-act='lb-find' data-v='" + v.soleil + "'>Voir les plantes adaptées</button><a class='btn grow' href='#/pots'>Voir Mes pots</a></div>";
    showResult(h, 'Lumière à un emplacement : ' + v.nom + ', environ ' + luxFmt(lux) + ' lux (' + via + ').');
    say('Ici, ce serait : ' + v.nom.toLowerCase() + '.', 'pense');
  }
  function toolLumiere() {
    var h = '<h2>Mesurer</h2><div class="row"><button class="btn primary grow" id="lb-light-go" data-act="lb-light-go">Mesurer maintenant</button></div><div id="lb-lmsg" class="small muted" aria-live="polite"></div>';
    h += '<h3>Ou choisissez vous-même</h3><div class="chips" role="group" aria-label="Choisir la lumière">';
    [['100000', 'Plein soleil, ciel dégagé'], ['25000', 'Très clair, soleil filtré'], ['9000', 'Mi-ombre, lumière douce'], ['2500', 'Ombre, on lit sans lampe']].forEach(function (c) { h += "<button class='chip' data-act='lb-light-pick' data-lux='" + c[0] + "'>" + esc(c[1]) + '</button>'; });
    h += '</div>' + resultBox('');
    var last = st().lastLight;
    if (last && last.lux) h += "<p class='small muted'>Dernière mesure : " + luxFmt(last.lux) + ' lux.</p>';
    return frame('lumiere', h);
  }
  function lightSensor() {
    return new Promise(function (resolve, reject) {
      var vals = [], settled = false, sensor = null, lis = null;
      function end(ok, err) {
        if (settled) return; settled = true; clearTimeout(to); try { if (sensor) sensor.stop(); } catch (e) {} if (lis) window.removeEventListener('devicelight', lis);
        if (ok) resolve(vals); else reject(err || new Error('absent'));
      }
      var to = setTimeout(function () { end(vals.length > 0, new Error('delai')); }, 2200);
      function add(v) { if (typeof v === 'number' && isFinite(v)) { vals.push(v); if (vals.length >= 5) end(true); } }
      var tried = false;
      try {
        if (window.AmbientLightSensor) {
          sensor = new window.AmbientLightSensor({ frequency: 4 }); tried = true;
          sensor.addEventListener('reading', function () { add(sensor.illuminance); });
          sensor.addEventListener('error', function (ev) { if (!vals.length) { sensor = null; startEvent(); } });
          sensor.start();
        }
      } catch (e) { sensor = null; tried = false; }
      function startEvent() {
        if (lis || settled) return;
        if (!('ondevicelight' in window)) { if (!tried) end(false, new Error('absent')); else end(false, new Error('absent')); return; }
        lis = function (ev) { add(ev.value); }; window.addEventListener('devicelight', lis);
      }
      if (!tried) startEvent();
    });
  }
  function lightCamera() {
    return gum({ video: { facingMode: { ideal: 'environment' } }, audio: false }).then(function (stream) {
      permSet('cam', 'ok');
      return new Promise(function (resolve, reject) {
        var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.srcObject = stream;
        var cv = document.createElement('canvas'); cv.width = 32; cv.height = 32;
        var samples = [], n = 0, track = stream.getVideoTracks && stream.getVideoTracks()[0], settings = {};
        function fin(e) { stopStream(stream); if (e) reject(e); else resolve({ luma: samples.length ? samples.reduce(function (a, b) { return a + b; }, 0) / samples.length : 0, settings: settings }); }
        var to = setTimeout(function () { fin(new Error('delai')); }, 6000);
        function grab() {
          try {
            var c = cv.getContext('2d'); c.drawImage(v, 0, 0, 32, 32);
            var d = c.getImageData(0, 0, 32, 32).data; samples.push(L.meanLuma(d));
            try { settings = (track && track.getSettings && track.getSettings()) || {}; } catch (e) {}
          } catch (e) {}
          n++; if (n >= 5) { clearTimeout(to); fin(null); } else setTimeout(grab, 350);
        }
        var started = false, go = function () { if (started) return; started = true; setTimeout(grab, 600); };
        v.onloadeddata = go; v.onplaying = go;
        try { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
        setTimeout(go, 1200);
      });
    });
  }
  function lightGo() {
    var b = $('lb-light-go');
    var msg = function (t) { setHtml('lb-lmsg', esc(t)); };
    msg('Je cherche le capteur de lumière…');
    function end() { if (b) b.disabled = false; }
    if (b) b.disabled = true;
    lightSensor().then(function (vals) {
      var avg = vals.reduce(function (a, c) { return a + c; }, 0) / vals.length; msg(''); lightResult(avg, 'capteur de lumière du téléphone', 1.35); end();
    }, function () {
      msg("Pas de capteur de lumière accessible. J'essaie l'appareil photo…");
      explainThen('cam', "Appareil photo", "<p>Sans capteur de lumière, l'appli peut regarder la luminosité d'une image avec l'appareil photo. Pointez-le vers une feuille de papier blanche posée à l'endroit à tester. Rien n'est enregistré ni envoyé.</p>", function () {
        lightCamera().then(function (r) {
          var s = r.settings || {}, t = typeof s.exposureTime === 'number' ? s.exposureTime * 0.0001 : 0, lux = L.luxFromExposure(r.luma, t, s.iso, 1.8);
          if (lux) { msg(''); lightResult(lux, 'appareil photo (estimation grossière)', 3); }
          else { msg(''); showResult("<div class='notice warn'><b>L'appareil photo ne donne pas assez d'informations</b> (vitesse et sensibilité inconnues) pour calculer des lux.</div><p>Choisissez plutôt la situation qui ressemble à votre emplacement ci-dessus.</p>"); }
          end();
        }, function (e) {
          msg(''); var s = gumState(e); permSet('cam', s);
          showResult(s === 'refuse' ? deniedHtml('cam') + '<p>Vous pouvez aussi choisir la situation vous-même ci-dessus.</p>' : absentHtml("Ni capteur de lumière ni appareil photo utilisable ici. Choisissez la situation vous-même ci-dessus."));
          end();
        });
      }, function () { msg('Mesure annulée. Vous pouvez choisir la situation vous-même ci-dessus.'); end(); });
    });
  }

  /* ================== Outil 3 : santé de la feuille ================== */
  function toolFeuille() {
    var h = '<h2>Ma feuille</h2><div class="row"><button class="btn primary grow" data-act="lb-leaf" data-src="camera">Prendre une photo</button><button class="btn grow" data-act="lb-leaf" data-src="photos">Choisir dans la galerie</button></div>';
    h += '<p class="small muted">La photo est analysée sur le téléphone. Rien n\'est envoyé.</p><div id="lb-leafimg"></div>' + resultBox('');
    return frame('feuille', h);
  }
  function leafBars(a) {
    var rows = [['g', 'Vert sain', 'ok'], ['y', 'Jaune (chlorose)', 'warn'], ['b', 'Brun (nécrose)', 'bad'], ['p', 'Zones claires', 'pale']], h = '';
    rows.forEach(function (r) {
      h += "<div class='lb-g'><div class='lb-g-top'><b>" + r[1] + '</b><span>' + a.pct[r[0]] + " %</span></div><div class='lb-gauge " + r[2] + "' role='img' aria-label='" + esc(r[1] + ' : ' + a.pct[r[0]] + ' pour cent') + "'><i style='width:" + clamp(a.pct[r[0]], 1, 100) + "%'></i></div></div>";
    });
    return h;
  }
  function leafAnalyse(dataUrl) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, k = Math.min(1, 240 / Math.max(w, h, 1));
          var cw = Math.max(8, Math.round(w * k)), ch = Math.max(8, Math.round(h * k)), cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
          var c = cv.getContext('2d'); c.drawImage(img, 0, 0, cw, ch);
          resolve(L.analyseData(c.getImageData(0, 0, cw, ch).data, cw, ch));
        } catch (e) { reject(e); }
      };
      img.onerror = function () { reject(new Error('image illisible')); };
      img.src = dataUrl;
    });
  }
  function leafGo(src) {
    function run() {
      T.native.photo(src).then(function (url) {
        permSet('cam', 'ok');
        setHtml('lb-leafimg', "<img class='photo' alt='Votre feuille' src='" + esc(url) + "'>");
        return leafAnalyse(url);
      }).then(function (a) {
        var adv = L.leafAdvice(a), h = '';
        if (!a.enough) h = "<div class='notice warn'><b>" + esc(adv.titre) + '</b><ul>' + li(adv.pistes) + '</ul></div>';
        else h = '<h3>' + esc(adv.titre) + '</h3>' + leafBars(a) + '<ul class="lb-pistes">' + li(adv.pistes) + '</ul>';
        h += "<div class='notice'><b>Ce n'est pas un diagnostic.</b> Ce sont des couleurs, pas une maladie prouvée.</div>";
        var sp = adv.titre + '. ' + (a.enough ? 'Vert sain ' + a.pct.g + ' pour cent, jaune ' + a.pct.y + ', brun ' + a.pct.b + ', zones claires ' + a.pct.p + '. ' : '') + adv.pistes.join(' ') + " Ce n'est pas un diagnostic.";
        h += "<div class='row'>" + speakBtn(sp, 'Écouter le résultat') + "<a class='btn primary grow' href='#/maladie'>Ma plante est malade</a></div>";
        showResult(h, a.enough ? 'Santé de la feuille (couleurs) : vert ' + a.pct.g + ' %, jaune ' + a.pct.y + ' %, brun ' + a.pct.b + ' %, clair ' + a.pct.p + ' %. ' + adv.titre + '.' : '');
        say(adv.level === 'ok' ? 'Elle a l\'air en forme !' : 'Regardons ça ensemble.', adv.level === 'ok' ? 'joie' : 'pense');
      }).catch(function (e) {
        if (e && e.message === 'annule') return;
        var den = /permission|denied|refus|autoris/i.test(String((e && e.message) || e));
        showResult((den ? deniedHtml('cam') : '') + "<div class='notice warn'><b>La photo n'a pas pu être lue.</b> Réessayez, ou choisissez une photo dans la galerie.</div>");
      });
    }
    if (!T.native || !T.native.photo) { showResult(absentHtml("La prise de photo n'est pas disponible ici.")); return; }
    if (src === 'camera') explainThen('cam', 'Appareil photo', "<p>Pour photographier la feuille, l'appli a besoin de l'appareil photo. La photo est analysée sur votre téléphone et n'est jamais envoyée.</p>", run); else run();
  }

  /* ================== Outil 4 : boussole du soleil ================== */
  L.headingFromEvent = function (e) {
    if (!e) return null;
    if (typeof e.webkitCompassHeading === 'number' && isFinite(e.webkitCompassHeading)) return (e.webkitCompassHeading + 360) % 360;
    if ((e.absolute || e.type === 'deviceorientationabsolute') && typeof e.alpha === 'number') return (360 - e.alpha + 360) % 360;
    return null;
  };
  L.southSide = function (measuredSide, headingDeg) {   /* où dessiner le sud sur le plan : côté du plan mesuré + heading du mur */
    var sides = ['haut', 'droite', 'bas', 'gauche'], quarter = Math.round((((180 - headingDeg) % 360) + 360) % 360 / 90) % 4;
    return sides[(sides.indexOf(measuredSide) + quarter) % 4];
  };
  function sunBlock() {
    var d = sunDate(), w = L.where(), lat = S.sun.lat != null ? S.sun.lat : w.lat, sun = L.sun(d[0], d[1], d[2], lat, w.lon), h = '';
    var nowTxt = { today: "Aujourd'hui", ete: "Jour le plus long (21 juin)", hiver: "Jour le plus court (21 décembre)" }[S.sun.when];
    h += "<div class='chips' role='group' aria-label='Choisir la date'>";
    [['today', "Aujourd'hui"], ['ete', '21 juin'], ['hiver', '21 décembre']].forEach(function (c) { h += "<button class='chip" + (S.sun.when === c[0] ? ' on' : '') + "' data-act='lb-sun-when' data-v='" + c[0] + "' aria-pressed='" + (S.sun.when === c[0]) + "'>" + c[1] + '</button>'; });
    h += '</div>';
    var rows = '', sp = nowTxt + '. ';
    if (sun.riseUTC == null) { rows = '<p>' + (sun.polar === 'jour' ? 'Le soleil ne se couche pas ce jour-là.' : 'Le soleil ne se lève pas ce jour-là.') + '</p>'; }
    else {
      rows = "<dl class='kv lb-kv'><dt>Lever du soleil</dt><dd>" + localHm(sun, sun.riseUTC, d[0], d[1], d[2]) + '</dd><dt>Coucher du soleil</dt><dd>' + localHm(sun, sun.setUTC, d[0], d[1], d[2]) + '</dd><dt>Midi solaire</dt><dd>' + localHm(sun, sun.noonUTC, d[0], d[1], d[2]) + '</dd><dt>Hauteur à midi</dt><dd>' + Math.round(sun.maxElev) + ' degrés</dd><dt>Durée du jour</dt><dd>' + hoursTxt(sun.dayLen / 60) + '</dd></dl>';
      sp += 'Lever à ' + localHm(sun, sun.riseUTC, d[0], d[1], d[2]) + ', coucher à ' + localHm(sun, sun.setUTC, d[0], d[1], d[2]) + '. Le soleil monte à ' + Math.round(sun.maxElev) + ' degrés à midi. ';
    }
    h += rows;
    h += "<p class='small muted'>Position utilisée : " + (w.region ? 'région choisie, ' : 'centre de la France, ') + 'latitude ' + fr(lat, 1) + ' degrés nord (approximative).</p>';
    if (S.sun.face != null) {
      var hrs = L.wallHours(sun, S.sun.face), name = L.cardinal(S.sun.face);
      h += "<div class='lb-verdict " + (hrs >= 6 ? 'plein' : (hrs >= 3 ? 'mi' : 'ombre')) + "'><h3>Mur tourné vers : " + esc(name) + ' (' + Math.round(S.sun.face) + " degrés)</h3><div class='lb-big'>" + hoursTxt(hrs) + "</div><p><b>Ce coin de la cour reçoit environ " + hoursTxt(hrs) + ' de soleil</b> ce jour-là, au mieux (sans arbre ni toit voisin).</p><p class="small">Verdict : ' + (hrs >= 6 ? 'plein soleil' : (hrs >= 3 ? 'mi-ombre' : 'ombre')) + '.</p></div>';
      sp += 'Ce coin de la cour, tourné vers le ' + name + ', reçoit environ ' + hoursTxt(hrs) + ' de soleil.';
      h += "<h3>Selon l'orientation du mur</h3><div class='lb-bars'>";
      for (var k = 0; k < 8; k++) { var f = k * 45, hh = L.wallHours(sun, f); h += "<div class='lb-bar'><span>" + CARD8[k] + "</span><div class='lb-gauge ok'><i style='width:" + clamp(hh / 16 * 100, 1, 100) + "%'></i></div><b>" + hoursTxt(hh) + '</b></div>'; }
      h += '</div>';
      S.note = "Soleil : mur tourné vers le " + name + ", environ " + hoursTxt(hrs) + ' de soleil (' + nowTxt.toLowerCase() + ').';
      h += "<div class='row'>" + speakBtn(sp, 'Écouter le résultat') + "<button class='btn grow' data-act='lb-sun-save'>Enregistrer l'orientation de ma cour</button><button class='btn grow' data-act='lb-find' data-v='" + (hrs >= 6 ? 'plein_soleil' : (hrs >= 3 ? 'mi_ombre' : 'ombre')) + "'>Voir les plantes adaptées</button></div>";
    } else h += "<div class='notice'>Choisissez la direction du mur ou du coin pour savoir combien d'heures de soleil il reçoit.</div><div class='row'>" + speakBtn(sp, 'Écouter le résultat') + '</div>';
    return h;
  }
  function toolSoleil() {
    var h = '<h2>Direction</h2>';
    h += "<div class='lb-compass'><svg id='lb-needle-svg' viewBox='0 0 120 120' role='img' aria-label='Boussole'><circle cx='60' cy='60' r='54' class='lb-ring'/><text x='60' y='15' text-anchor='middle' class='lb-n'>N</text><text x='108' y='64' text-anchor='middle' class='lb-n'>E</text><text x='60' y='112' text-anchor='middle' class='lb-n'>S</text><text x='12' y='64' text-anchor='middle' class='lb-n'>O</text><g id='lb-needle'><polygon points='60,18 67,60 53,60' class='lb-nn'/><polygon points='60,102 67,60 53,60' class='lb-ns'/></g></svg><div><div class='lb-big' id='lb-head'>--</div><p id='lb-south' class='small muted'>La boussole est arrêtée.</p></div></div>";
    h += "<div class='row'><button class='btn primary grow' id='lb-comp-go' data-act='lb-comp-go'>Utiliser la boussole</button><button class='btn grow' id='lb-comp-use' data-act='lb-comp-use' disabled>Utiliser cette direction</button></div><div id='lb-compmsg'></div>";
    h += "<h3>Ou choisissez à la main</h3><p class='small muted'>Vers où regarde le mur (le côté où l'on voit le ciel) ?</p><div class='chips' role='group' aria-label='Direction du mur'>";
    CARD8.forEach(function (n, i) { h += "<button class='chip" + (S.sun.face === i * 45 ? ' on' : '') + "' data-act='lb-face' data-v='" + (i * 45) + "'>" + n + '</button>'; });
    h += "</div><label class='lbl' for='lb-lat'>Latitude (facultatif, degrés nord)</label><input class='field' id='lb-lat' type='text' inputmode='decimal' maxlength='6' placeholder='46,5' value='" + esc(S.sun.lat != null ? fr(S.sun.lat, 1) : '') + "' data-input='lb-lat'>";
    h += "<div id='lb-sunout'>" + sunBlock() + '</div>' + resultBox('');
    return frame('soleil', h);
  }
  function compassStart() {
    stopAll();
    var msg = $('lb-compmsg'); if (msg) msg.innerHTML = '';
    function go() {
      var heading = null, sx = 0, sy = 0, cnt = 0, got = false, abs = false, tilt = false, stopped = false;
      function upd(e) {
        var hd = L.headingFromEvent(e); if (hd == null) return;
        if (e.type === 'deviceorientationabsolute') abs = true; else if (abs) return;
        got = true; sx = sx * 0.8 + Math.cos(hd * RAD) * 0.2; sy = sy * 0.8 + Math.sin(hd * RAD) * 0.2; cnt++;
        if (cnt === 1) { sx = Math.cos(hd * RAD); sy = Math.sin(hd * RAD); }
        heading = (Math.atan2(sy, sx) / RAD + 360) % 360;
        tilt = Math.abs(e.beta || 0) > 30 || Math.abs(e.gamma || 0) > 30;
        var nd = $('lb-needle'); if (nd) nd.setAttribute('transform', 'rotate(' + (-heading).toFixed(1) + ' 60 60)');
        setHtml('lb-head', Math.round(heading) + ' degrés, ' + L.cardinal(heading));
        setHtml('lb-south', (tilt ? 'Posez le téléphone à plat pour une lecture juste. ' : '') + 'Le haut du téléphone pointe vers : ' + L.cardinal(heading) + '. Le sud est à ' + Math.round((180 - heading + 360) % 360) + ' degrés à droite du haut du téléphone.');
        var u = $('lb-comp-use'); if (u) { u.disabled = false; u.setAttribute('data-h', String(Math.round(heading))); }
      }
      var stop = function () { if (stopped) return; stopped = true; S.compStop = null; window.removeEventListener('deviceorientationabsolute', upd, true); window.removeEventListener('deviceorientation', upd, true); var g = $('lb-comp-go'); if (g) g.textContent = 'Utiliser la boussole'; };
      window.addEventListener('deviceorientationabsolute', upd, true); window.addEventListener('deviceorientation', upd, true);
      onStop(stop); S.compStop = stop;
      var g = $('lb-comp-go'); if (g) g.textContent = 'Arrêter la boussole';
      setTimeout(function () {
        if (!got && !stopped) { stop(); if ($('lb-compmsg')) setHtml('lb-compmsg', absentHtml("Aucune boussole n'a répondu sur ce téléphone, ou elle est coupée. Choisissez la direction du mur à la main ci-dessous.")); }
      }, 3000);
    }
    if (typeof window.DeviceOrientationEvent === 'undefined' && !('ondeviceorientationabsolute' in window)) { setHtml('lb-compmsg', absentHtml("Ce téléphone ne donne pas accès à sa boussole. Choisissez la direction du mur à la main ci-dessous.")); return; }
    explainThen('motion', 'Capteurs de mouvement', "<p>Pour trouver où est le sud, l'appli lit la boussole de votre téléphone. Rien n'est enregistré ni envoyé. Posez le téléphone à plat et éloignez-le des objets en fer.</p>", function () {
      var D = window.DeviceOrientationEvent;
      if (D && typeof D.requestPermission === 'function') {
        D.requestPermission().then(function (r) { if (r === 'granted') { permSet('motion', 'ok'); go(); } else { permSet('motion', 'refuse'); setHtml('lb-compmsg', deniedHtml('motion')); } }, function () { permSet('motion', 'refuse'); setHtml('lb-compmsg', deniedHtml('motion')); });
      } else { permSet('motion', 'ok'); go(); }
    });
  }
  function saveOrientation(heading) {
    var g = null; try { g = T.jardin && T.jardin.get ? T.jardin.get() : null; } catch (e) {}
    if (!g) {
      T.modal({ title: 'Plan de la cour', html: "<p>Vous n'avez pas encore de plan. Créez-le dans « Mon jardin », puis revenez enregistrer l'orientation. L'information reste affichée ici en attendant.</p>", buttons: [{ label: 'Fermer' }, { label: 'Ouvrir Mon jardin', primary: true, onClick: function () { location.hash = '#/jardin'; } }] });
      return;
    }
    var face = S.sun.face, SIDES = [['haut', 'Vers le haut du plan'], ['droite', 'Vers la droite du plan'], ['bas', 'Vers le bas du plan'], ['gauche', 'Vers la gauche du plan']];
    var body = "<p>Le mur mesuré regarde vers le <b>" + esc(L.cardinal(face)) + "</b>. Sur votre plan, vers quel côté cette direction pointe-t-elle ?</p><div class='chips' id='lb-sides'>" + SIDES.map(function (s) { return "<button class='chip' data-act='lb-side' data-v='" + s[0] + "'>" + s[1] + '</button>'; }).join('') + '</div><p class="small muted">Le sud sera placé au quart de tour le plus proche.</p>';
    T.modal({ title: "Enregistrer l'orientation", html: body, buttons: [{ label: 'Annuler' }] });
  }

  /* ================== Outil 5 : capteur Bluetooth ================== */
  function toolCapteur() {
    var last = st().lastMiflora, h = '<h2>Ma sonde</h2><div class="row"><button class="btn primary grow" id="lb-ble-go" data-act="lb-ble-go">Chercher ma sonde</button></div><div id="lb-blemsg" aria-live="polite"></div>';
    h += resultBox(last && last.v ? lastSensorHtml(last) : '');
    return frame('capteur', h);
  }
  function lastSensorHtml(last) {
    var d = new Date(last.t), when = d.getDate() + ' ' + T.MOIS[d.getMonth()].toLowerCase() + ' à ' + d.getHours() + ' h ' + pad(d.getMinutes());
    return "<p class='small muted'>Dernière lecture gardée : " + esc(when) + '.</p>' + L.sensorHtml(last.v) + "<div class='row'>" + speakBtn(sensorSpeech(last.v), 'Écouter le résultat') + '</div>';
  }
  function bleGo() {
    var msg = function (h) { setHtml('lb-blemsg', h); }, b = $('lb-ble-go');
    msg('');
    function end() { if (b) b.disabled = false; }
    var plugin = blePlugin(), web = webDriver.available();
    if (!plugin && !web) {
      msg(absentHtml("Le Bluetooth ne peut pas être utilisé ici. Il faut l'appli installée sur un téléphone Android, avec l'accès « Appareils à proximité » accordé, et le Bluetooth allumé.")); end(); return;
    }
    explainThen('bt', 'Bluetooth', "<p>Pour lire la sonde, l'appli cherche les appareils Bluetooth proches. Android peut demander « Appareils à proximité » (ou la localisation sur les vieux téléphones : l'appli ne s'en sert pas). Vous choisirez la sonde dans une liste.</p>", function () {
      if (b) b.disabled = true;
      msg('<p class="small muted">Recherche de la sonde et connexion… cela peut prendre une dizaine de secondes.</p>');
      MF.read().then(function (r) {
        end();
        if (r.ok) {
          permSet('bt', 'ok'); var v = r.valeurs; st().lastMiflora = { t: Date.now(), v: v, via: r.via }; save(); msg('');
          showResult(lastSensorHtml(st().lastMiflora), 'Sonde Mi Flora : sol ' + v.moisture + ' %, ' + fr(v.temp, 1) + ' °C, ' + luxFmt(v.light) + ' lux, ' + v.ec + ' µS/cm.');
          say('J\'ai lu ta sonde.', 'joie');
        } else {
          var t = { absent: "Le Bluetooth n'est pas disponible ici.", annule: "Aucune sonde choisie. Approchez-la (à moins d'un mètre), allumez le Bluetooth et réessayez.", delai: "La sonde n'a pas répondu à temps. Approchez le téléphone et réessayez.", echec: "La lecture a échoué. Vérifiez que le Bluetooth est allumé, que « Appareils à proximité » est autorisé, que la sonde est bien une Mi Flora, et réessayez." }[r.raison] || 'La lecture a échoué.';
          msg("<div class='notice warn'><b>" + esc(t) + '</b></div>' + (r.raison === 'echec' ? deniedHtml('bt') : ''));
        }
      });
    });
  }

  /* ================== Outil 6 : chant de ma plante ================== */
  function slider(id, label, min, max, val, left, right) {
    return "<label class='lbl' for='" + id + "'>" + esc(label) + " : <b id='" + id + "-v'>" + val + "</b></label><input type='range' class='lb-range' id='" + id + "' min='" + min + "' max='" + max + "' value='" + val + "' data-input='lb-chant' aria-label='" + esc(label) + "'><div class='lb-ends small muted'><span>" + esc(left) + '</span><span>' + esc(right) + '</span></div>';
  }
  function toolChant() {
    var c = S.chant, m = L.melody(c.light, c.hum, c.temp);
    var h = "<div class='notice'><b>Traduction en musique de TES mesures.</b> Ce n'est pas la voix de la plante.</div>";
    h += slider('lb-c-l', 'Lumière', 0, 100, c.light, 'Sombre', 'Très lumineux') + slider('lb-c-h', 'Humidité', 0, 100, c.hum, 'Sec', 'Très humide') + slider('lb-c-t', 'Température (degrés)', 0, 40, c.temp, 'Froid', 'Chaud');
    h += "<div class='row'><button class='btn' data-act='lb-chant-use'>Utiliser mes dernières mesures</button></div><div id='lb-melo'>" + melodySvg(m) + "</div><div class='row'><button class='btn primary grow' id='lb-chant-play' data-act='lb-chant-play'>Jouer la mélodie</button><button class='btn grow' data-act='lb-chant-stop'>Arrêter</button></div>" + resultBox('');
    return frame('chant', h);
  }


  /* ================== Découvertes incroyables ================== */
  var DS = { q: '', cat: '', said: {} };
  function DD() { try { var d = T.decouvertes; return d && d.items && d.items.length ? d : null; } catch (e) { return null; } }
  function decCount() { var d = DD(); return d ? d.items.length : 0; }
  L.decouvertes = function () { var d = DD(); return d ? d.items.slice() : []; };
  L.decouvertesCats = function () { var d = DD(); return d ? d.cats.slice() : []; };
  function decLevel(k) { var d = DD(); return (d && d.levels[k]) || { nom: 'Niveau inconnu', court: '?', def: '' }; }
  function decCat(id) { var d = DD(), r = null; if (d) d.cats.forEach(function (c) { if (c.id === id) r = c; }); return r; }
  function norm(x) {
    x = String(x == null ? '' : x).toLowerCase();
    try { x = x.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { x = x.replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/ç/g, 'c'); }
    return x.replace(/[^a-z0-9]+/g, ' ').trim();
  }
  var LV_SVG = {
    solide: "<svg viewBox='0 0 16 16' width='16' height='16' aria-hidden='true' focusable='false'><circle cx='8' cy='8' r='7' fill='currentColor'></circle><path d='M4.5 8.3l2.4 2.4 4.6-5' fill='none' stroke='var(--card)' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'></path></svg>",
    discute: "<svg viewBox='0 0 16 16' width='16' height='16' aria-hidden='true' focusable='false'><circle cx='8' cy='8' r='6.2' fill='none' stroke='currentColor' stroke-width='1.7'></circle><path d='M8 1.8a6.2 6.2 0 0 0 0 12.4z' fill='currentColor'></path></svg>",
    non: "<svg viewBox='0 0 16 16' width='16' height='16' aria-hidden='true' focusable='false'><circle cx='8' cy='8' r='6.2' fill='none' stroke='currentColor' stroke-width='1.7'></circle><path d='M3.9 12.1L12.1 3.9' stroke='currentColor' stroke-width='1.9' stroke-linecap='round'></path></svg>"
  };
  /* Étiquette de niveau de preuve : un mot ET une forme (jamais la couleur seule) */
  function lvBadge(k) {
    var l = decLevel(k);
    return "<span class='lb-lvl lb-lvl-" + esc(k) + "'>" + (LV_SVG[k] || '') + '<span>' + esc(l.nom) + '</span></span>';
  }
  function decHay(f) { return norm([f.titre, f.accroche, f.quoi, f.mots || '', decLevel(f.niveau).nom, (decCat(f.cat) || {}).nom, (f.certain || []).join(' '), (f.discute || []).join(' ')].join(' ')); }
  L.decSearch = function (q, cat) {
    var d = DD(); if (!d) return [];
    var toks = norm(q).split(' ').filter(Boolean);
    return d.items.filter(function (f) {
      if (cat && f.cat !== cat) return false;
      if (!toks.length) return true;
      var hay = f._hay || (f._hay = decHay(f));
      return toks.every(function (t) { return hay.indexOf(t) >= 0; });
    });
  };
  function decListHtml() {
    var r = L.decSearch(DS.q, DS.cat), d = DD(), h = '';
    var top = r.filter(function (f) { return f.une; }), rest = r.filter(function (f) { return !f.une; });
    h += "<p class='small muted' role='status' aria-live='polite'>" + (r.length === d.items.length ? d.items.length + ' fiches.' : r.length + (r.length > 1 ? ' fiches trouvées' : ' fiche trouvée') + ' sur ' + d.items.length + '.') + '</p>';
    if (!r.length) return h + "<div class='notice'><b>Aucune fiche ne correspond.</b> Essayez un mot plus court (par exemple « arbre » ou « son »).</div><button class='btn block' data-act='lb-dreset'>Tout afficher</button>";
    top.concat(rest).forEach(function (f) {
      h += "<a class='item" + (f.une ? ' lb-star' : '') + "' href='#/labo/decouvertes/" + esc(f.id) + "'>" + lvBadge(f.niveau) + '<b>' + esc(f.titre) + '</b><i>' + esc(f.accroche) + '</i></a>';
    });
    return h;
  }
  function decChips() {
    var d = DD(), h = "<div class='chips' role='group' aria-label='Choisir un thème'>";
    h += "<button class='chip" + (DS.cat ? '' : ' on') + "' data-act='lb-dcat' data-v='' aria-pressed='" + (DS.cat ? 'false' : 'true') + "'>Tout</button>";
    d.cats.forEach(function (c) { h += "<button class='chip" + (DS.cat === c.id ? ' on' : '') + "' data-act='lb-dcat' data-v='" + esc(c.id) + "' aria-pressed='" + (DS.cat === c.id ? 'true' : 'false') + "'>" + esc(c.nom) + '</button>'; });
    return h + '</div>';
  }
  function decLegend() {
    var d = DD(), h = "<div class='card'><h3>Comment lire les étiquettes</h3><ul class='lb-legend'>";
    ['solide', 'discute', 'non'].forEach(function (k) { h += '<li>' + lvBadge(k) + '<span class="small">' + esc(d.levels[k].def) + '</span></li>'; });
    return h + '</ul></div>';
  }
  function decSpeech(f) {
    var m = f.cat === 'mythe', t = f.titre + '. ' + f.accroche + ' Niveau de preuve : ' + decLevel(f.niveau).nom + '. ' + (m ? "Ce qu'on raconte. " : "Ce qu'on a découvert. ") + f.quoi + (m ? ' Ce que la science montre. ' : " Ce qui est certain. ") + (f.certain || []).join(' ') + (m ? ' Ce qui reste discuté. ' : ' Ce qui est discuté. ') + (f.discute || []).join(' ');
    (f.sections || []).forEach(function (s) { t += ' ' + s.t + ' ' + s.p.join(' '); });
    if (f.expe) t += ' À essayer. ' + f.expe;
    return t.replace(/\s+/g, ' ');
  }
  function decOpenLink(u) { return u ? " <a class='btn lb-open' href='" + esc(u) + "' target='_blank' rel='noopener noreferrer' data-act='lb-dopen'>Ouvrir la page (connexion nécessaire)</a>" : ''; }
  function decPage(f, d) {
    var m = f.cat === 'mythe', i = d.items.indexOf(f), prev = d.items[i - 1], next = d.items[i + 1], c = decCat(f.cat), h = '';
    h += "<div class='card'><div class='tags'><span class='tag'>" + esc(c ? c.nom : '') + '</span></div><h2>' + esc(f.titre) + '</h2><p>' + esc(f.accroche) + '</p>' + lvBadge(f.niveau) + "<p class='small muted lb-def'>" + esc(decLevel(f.niveau).def) + '</p></div>';
    h += "<div class='card'><h3>" + (m ? "Ce qu'on raconte" : "Ce qu'on a découvert") + '</h3><p>' + esc(f.quoi) + '</p></div>';
    h += "<div class='card'><h3>" + (m ? 'Ce que la science montre' : 'Ce qui est certain') + '</h3><ul>' + li(f.certain) + '</ul></div>';
    h += "<div class='card'><h3>" + (m ? 'Ce qui reste discuté' : 'Ce qui est discuté') + '</h3><ul>' + li(f.discute) + '</ul></div>';
    (f.sections || []).forEach(function (s) { h += "<div class='card'><h3>" + esc(s.t) + '</h3>' + s.p.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') + '</div>'; });
    if (f.id === 'kirlian') h += "<div class='notice warn'><b>Sécurité.</b> Ne fabriquez ni n'utilisez jamais d'appareil à haute tension chez vous. Aucune expérience de cette page n'en a besoin.</div>";
    if (f.expe) h += "<div class='card'><h3>À essayer, sans danger</h3><p>" + esc(f.expe) + '</p></div>';
    h += "<div class='row lb-actions'>" + speakBtn(decSpeech(f), 'Écouter la fiche') + "<button class='btn' data-act='lb-dec-note' data-id='" + esc(f.id) + "'>Ajouter au carnet</button></div>";
    h += "<div class='card'><h3>Sources</h3><ul class='lb-srcs'>" + (f.src || []).map(function (x) { return '<li>' + esc(x.t) + decOpenLink(x.u) + '</li>'; }).join('') + "</ul><p class='small muted'>Le texte de la fiche s'affiche sans connexion. Seuls les liens ont besoin d'internet.</p></div>";
    h += "<div class='row'>" + (prev ? "<a class='btn grow' href='#/labo/decouvertes/" + esc(prev.id) + "'>Fiche précédente</a>" : '') + (next ? "<a class='btn grow' href='#/labo/decouvertes/" + esc(next.id) + "'>Fiche suivante</a>" : '') + "</div><a class='btn block' href='#/labo/decouvertes'>Toutes les découvertes</a>";
    return h;
  }
  function pageDecouvertes(sub) {
    var d = DD();
    if (!d) return { title: 'Découvertes', html: "<div class='card'><h2>Les fiches ne sont pas disponibles</h2><p>Fermez puis rouvrez l'appli. Si le problème continue, les autres outils du Labo restent utilisables.</p></div><a class='btn primary block' href='#/labo'>Retour au Labo</a>" };
    var f = null; d.items.forEach(function (x) { if (x.id === sub) f = x; });
    if (f) {
      if (!DS.said[f.id]) { DS.said[f.id] = 1; say(f.cat === 'mythe' ? 'Voyons ce que la science dit vraiment : ' + f.titre : 'Une découverte : ' + f.titre, f.cat === 'mythe' ? 'pense' : 'surprise'); }
      return { title: 'Découvertes', html: decPage(f, d) };
    }
    var h = "<div class='hero'><h2>Découvertes incroyables</h2><p>Ce que les chercheurs ont vraiment trouvé sur les plantes et la nature. Chaque fiche dit ce qui est certain, ce qui est discuté, et ce qu'on n'a pas pu prouver.</p></div>";
    h += decLegend();
    h += "<div class='card'><label class='lbl' for='lb-dq'>Chercher une découverte</label><input id='lb-dq' class='field' type='search' inputmode='search' enterkeyhint='search' maxlength='60' autocomplete='off' placeholder='Par exemple : arbre, son, Kirlian' data-input='lb-dsearch' value='" + esc(DS.q) + "'>" + decChips() + '</div>';
    h += "<div id='lb-dlist'>" + decListHtml() + '</div>';
    h += "<a class='btn block' href='#/labo'>Tous les outils du Labo</a>";
    return { title: 'Découvertes', html: h };
  }
  function decRefresh() { setHtml('lb-dlist', decListHtml()); }
  att0('lb-dcat', function (el) { DS.cat = el.getAttribute('data-v') || ''; var cs = document.querySelectorAll('[data-act="lb-dcat"]'); Array.prototype.forEach.call(cs, function (b) { var on = (b.getAttribute('data-v') || '') === DS.cat; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); decRefresh(); });
  att0('lb-dreset', function () { DS.q = ''; DS.cat = ''; var q = $('lb-dq'); if (q) q.value = ''; var cs = document.querySelectorAll('[data-act="lb-dcat"]'); Array.prototype.forEach.call(cs, function (b) { var on = !(b.getAttribute('data-v') || ''); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); decRefresh(); });
  att0('lb-dec-note', function (el) {
    var d = DD(), f = null; if (d) d.items.forEach(function (x) { if (x.id === el.getAttribute('data-id')) f = x; });
    if (f && toCarnet('Découverte lue : ' + f.titre + '. Niveau de preuve : ' + decLevel(f.niveau).nom + '. ' + f.accroche)) say('Je l\'ai noté dans ton carnet.', 'fier');
  });
  att0('lb-dopen', function (el, e) {
    var offline = false;
    try { offline = (navigator.onLine === false) || (T.native && T.native.online === false); } catch (x) { offline = false; }
    if (offline) { if (e && e.preventDefault) e.preventDefault(); T.toast('Il faut internet pour ouvrir cette page.', 3200); return; }
    try { var cap = window.Capacitor, B = cap && cap.Plugins && cap.Plugins.Browser; if (B && typeof B.open === 'function') { if (e && e.preventDefault) e.preventDefault(); B.open({ url: el.getAttribute('href') }); } } catch (x) { /* le lien normal prend le relais */ }
  });
  T.input['lb-dsearch'] = function (el) { DS.q = el.value || ''; decRefresh(); };

  /* ================== Pages ================== */
  T.route(/^\/labo(?:\/([a-z]+)(?:\/([a-z0-9_]+))?)?$/, 'plus', function (m) {
    stopAll();
    var id = m[1] || '', sub = m[2] || '', h = '';
    try {
      if (!id) {
        h += '<div class="hero"><h2>Labo des plantes</h2><p>Votre téléphone devient un petit instrument pour mieux comprendre vos plantes. Ici, rien n\'est inventé : on dit toujours ce que le téléphone peut faire, et ce qu\'il ne peut pas.</p></div>';
        h += TOOLS.map(function (t) { return '<a class="item' + (t.id === 'decouvertes' ? ' lb-star' : '') + '" href="#/labo/' + t.id + '"><b>' + esc(t.nom) + '</b><i>' + esc(t.court) + (t.id === 'decouvertes' ? ' (' + decCount() + ' fiches)' : '') + '</i></a>'; }).join('');
        h += '<div class="card"><h3>Préparer les accès</h3><p class="small">Micro, appareil photo, mouvement, Bluetooth : le téléphone vous pose les questions une seule fois, au lieu de les poser plus tard au milieu d\'un outil.</p><button class="btn block" data-act="lb-askall">Préparer les accès</button><div id="lb-askres" aria-live="polite"></div></div>';
        h += '<div class="notice"><b>Le saviez-vous ?</b> Le Wi-Fi et le Bluetooth ne servent pas à capter une plante : ce sont des radios pour parler à d\'autres appareils. Seule une sonde spéciale, plantée dans la terre, mesure quelque chose.</div>';
        return { title: 'Labo des plantes', html: h };
      }
      if (id === 'decouvertes') return pageDecouvertes(sub);
      if (id === 'ecouter') return toolEcouter();
      if (id === 'lumiere') return toolLumiere();
      if (id === 'feuille') return toolFeuille();
      if (id === 'soleil') return toolSoleil();
      if (id === 'capteur') return toolCapteur();
      if (id === 'chant') return toolChant();
      if (id === 'science') {
        if (sub) {
          var f = SCI.filter(function (x) { return x.id === sub; })[0];
          if (f) {
            var i = SCI.indexOf(f), prev = SCI[i - 1], next = SCI[i + 1];
            h = '<div class="card"><h2>' + esc(f.titre) + '</h2><p>' + esc(f.resume) + '</p></div>';
            h += '<div class="card"><h3>Ce qu\'on sait</h3><ul>' + li(f.sait) + '</ul></div><div class="card"><h3>Ce qu\'on ne sait pas</h3><ul>' + li(f.saitpas) + '</ul></div>';
            h += '<div class="card"><h3>Peut-on le faire avec un téléphone ?</h3><p>' + esc(f.tel) + '</p></div>';
            h += '<div class="row">' + speakBtn(sciSpeech(f), 'Écouter la fiche') + '<button class="btn" data-act="lb-sci-note" data-id="' + f.id + '">Ajouter au carnet</button></div>';
            h += '<p class="small muted lb-src">Source : ' + esc(f.source) + '</p><div class="row">' + (prev ? '<a class="btn grow" href="#/labo/science/' + prev.id + '">Fiche précédente</a>' : '') + (next ? '<a class="btn grow" href="#/labo/science/' + next.id + '">Fiche suivante</a>' : '') + '</div><a class="btn block" href="#/labo/science">Toutes les fiches</a>';
            return { title: 'La science', html: h };
          }
        }
        h = '<div class="hero"><h2>Les plantes communiquent-elles ?</h2><p>Dix fiches courtes, avec ce que la science a prouvé et ce qu\'elle ne sait pas encore.</p></div>';
        h += '<div class="notice"><b>Le Wi-Fi ou le Bluetooth peuvent-ils capter une plante ?</b> Non. Ce sont des radios qui servent à échanger des données entre appareils. Un signal électrique de plante est minuscule (de l\'ordre du millivolt à quelques dizaines de millivolts) : il faut des électrodes et un amplificateur, un montage de bricolage d\'école. Ne branchez jamais rien d\'improvisé sur la prise du mur.</div>';
        h += SCI.map(function (x) { return '<a class="item" href="#/labo/science/' + x.id + '"><b>' + esc(x.titre) + '</b><i>' + esc(x.resume) + '</i></a>'; }).join('');
        h += '<a class="item" href="#/labo/decouvertes"><b>Découvertes incroyables</b><i>Plus de fiches vérifiées, avec le niveau de preuve</i></a>';
        h += '<a class="item" href="#/labo/enfant"><b>Fais-le avec ton enfant</b><i>3 expériences sûres</i></a>';
        return { title: 'La science', html: h };
      }
      if (id === 'enfant') {
        h = '<div class="hero"><h2>Fais-le avec ton enfant</h2><p>Trois expériences sûres, avec ce qu\'on a à la maison. Un adulte aide pour les ciseaux.</p></div>';
        KIDS.forEach(function (k) {
          h += '<div class="card"><h3>' + esc(k.titre) + '</h3><p><b>Matériel :</b> ' + esc(k.mat) + '</p><ol class="steps">' + li(k.etapes) + '</ol><p><b>On regarde :</b> ' + esc(k.regarde) + '</p><p><b>Pour réfléchir :</b> ' + esc(k.question) + '</p><div class="row">' + speakBtn(kidSpeech(k), 'Écouter') + '<button class="btn" data-act="lb-kid-note" data-id="' + k.id + '">Noter dans le carnet</button></div></div>';
        });
        h += '<a class="btn block" href="#/labo/science">Les fiches de science</a>';
        return { title: 'Avec ton enfant', html: h };
      }
    } catch (e) { if (window.console) console.error(e); }
    return { title: 'Labo des plantes', html: '<div class="card"><h2>Cet outil n\'existe pas</h2><a class="btn primary block" href="#/labo">Retour au Labo</a></div>' };
  }, false);

  /* ================== Actions ================== */
  var AA = T.act, att = function (name, fn) { AA[name] = function (el, ev) { try { return fn(el, ev); } catch (e) { if (window.console) console.error(e); T.toast("Une action n'a pas pu se faire. Réessayez."); } }; };
  att('lb-carnet', function () { toCarnet(S.note); });
  att('lb-mic-go', function () { explainThen('mic', 'Micro', "<p>Pour écouter le jardin, l'appli a besoin du micro. Le son reste sur votre téléphone : rien n'est envoyé, rien n'est gardé sans que vous touchiez « Enregistrer ».</p>", micStart); });
  att('lb-mic-stop', function () { stopAll(); });
  att('lb-rec-go', function () { recStart(); });
  att('lb-play', function (el) { playRec(parseFloat(el.getAttribute('data-r')) || 1); });
  att('lb-play-stop', function () { try { if (S.src) S.src.stop(); } catch (e) {} });
  att('lb-retry', function (el) {
    var k = el.getAttribute('data-k');
    if (k === 'mic') micStart(); else if (k === 'cam') { var l = $('lb-light-go'); if (l) lightGo(); else leafGo('camera'); } else if (k === 'motion') compassStart(); else if (k === 'bt') bleGo();
  });
  att('lb-light-go', function () { lightGo(); });
  att('lb-light-pick', function (el) { lightResult(parseFloat(el.getAttribute('data-lux')) || 1000, 'votre choix', 2); });
  att('lb-find', function (el) {
    var v = el.getAttribute('data-v') || '';
    try { if (T.searchState && T.searchState.f) { T.searchState.q = ''; T.searchState.f = { soleil: v, pot: false, interieur: false, facile: false, cat: '' }; } } catch (e) {}
    if (location.hash === '#/trouver') T.render(); else location.hash = '#/trouver';
  });
  att('lb-leaf', function (el) { leafGo(el.getAttribute('data-src') === 'camera' ? 'camera' : 'photos'); });
  att('lb-comp-go', function () { if (S.compStop) { var s = S.compStop; S.compStop = null; s(); return; } compassStart(); });
  att('lb-comp-use', function (el) { var h = parseFloat(el.getAttribute('data-h')); if (isFinite(h)) { S.sun.face = (h + 360) % 360; S.sun.fromHeading = h; refreshSun(); } });
  att('lb-face', function (el) { S.sun.face = parseFloat(el.getAttribute('data-v')); S.sun.fromHeading = null; refreshSun(); document.querySelectorAll('[data-act="lb-face"]').forEach(function (b) { b.classList.toggle('on', parseFloat(b.getAttribute('data-v')) === S.sun.face); }); });
  att('lb-sun-when', function (el) { S.sun.when = el.getAttribute('data-v'); refreshSun(); });
  att('lb-sun-save', function () { if (S.sun.face == null) { T.toast("Choisissez d'abord une direction."); return; } saveOrientation(S.sun.face); });
  att('lb-side', function (el) {
    var side = el.getAttribute('data-v'), g = T.jardin && T.jardin.get ? T.jardin.get() : null; if (!g || S.sun.face == null) return;
    var south = L.southSide(side, S.sun.face);
    g.south = south; st().cour = { face: S.sun.face, side: side, t: Date.now() }; save();
    T.closeModal(); T.toast('Orientation enregistrée dans votre plan : sud ' + { haut: 'en haut', droite: 'à droite', bas: 'en bas', gauche: 'à gauche' }[south] + '.', 3600);
  });
  att('lb-ble-go', function () { bleGo(); });
  att('lb-chant-play', function () {
    var c = S.chant; if (playMelody(L.melody(c.light, c.hum, c.temp))) { var b = $('lb-chant-play'); if (b) b.textContent = 'Rejouer'; say('Voici tes mesures en musique.', 'joie'); S.note = 'Chant de ma plante : lumière ' + c.light + ', humidité ' + c.hum + ', température ' + c.temp + ' degrés, transformés en mélodie.'; }
  });
  att('lb-chant-stop', function () { stopAll(); });
  att('lb-chant-use', function () {
    var s = st(), c = S.chant, used = false;
    if (s.lastLight && s.lastLight.lux) { c.light = Math.round(clamp(Math.log10(Math.max(s.lastLight.lux, 10)) / 5 * 100, 0, 100)); used = true; }
    if (s.lastMiflora && s.lastMiflora.v) { c.hum = clamp(s.lastMiflora.v.moisture, 0, 100); c.temp = clamp(Math.round(s.lastMiflora.v.temp), 0, 40); if (!s.lastLight) c.light = Math.round(clamp(Math.log10(Math.max(s.lastMiflora.v.light, 10)) / 5 * 100, 0, 100)); used = true; }
    if (!used) { T.toast("Pas encore de mesure gardée. Mesurez la lumière ou lisez une sonde, ou réglez les curseurs."); return; }
    [['lb-c-l', c.light], ['lb-c-h', c.hum], ['lb-c-t', c.temp]].forEach(function (p) { var e = $(p[0]); if (e) e.value = p[1]; setHtml(p[0] + '-v', p[1]); });
    setHtml('lb-melo', melodySvg(L.melody(c.light, c.hum, c.temp)));
  });
  T.input['lb-chant'] = function (el) {
    var c = S.chant, v = parseFloat(el.value) || 0;
    if (el.id === 'lb-c-l') c.light = v; else if (el.id === 'lb-c-h') c.hum = v; else if (el.id === 'lb-c-t') c.temp = v;
    setHtml(el.id + '-v', v); setHtml('lb-melo', melodySvg(L.melody(c.light, c.hum, c.temp)));
  };
  T.input['lb-lat'] = function (el) { var v = num(el.value, null); S.sun.lat = (v != null && v >= 0 && v <= 66) ? v : null; refreshSun(); };
  function refreshSun() { setHtml('lb-sunout', sunBlock()); }
  att('lb-sci-note', function (el) { var f = SCI.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0]; if (f) toCarnet('Fiche lue : ' + f.titre + '. ' + f.resume); });
  att('lb-kid-note', function (el) { var k = KIDS.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0]; if (k) toCarnet(k.note); });
  att('lb-askall', function () {
    var b = document.querySelector('[data-act="lb-askall"]'); if (b) b.disabled = true;
    setHtml('lb-askres', '<p class="small muted">Le téléphone va poser ses questions, l\'une après l\'autre…</p>');
    L.askAll().then(function (r) {
      var nm = { micro: 'Micro', camera: 'Appareil photo', bluetooth: 'Bluetooth', mouvement: 'Mouvement' }, w = { ok: 'accordé', deja: 'déjà demandé', refuse: 'refusé', absent: 'non disponible', granted: 'accordé', occupe: 'occupé' };
      setHtml('lb-askres', '<ul>' + Object.keys(nm).map(function (k) { return '<li>' + nm[k] + ' : ' + esc(w[r[k]] || r[k] || '?') + '</li>'; }).join('') + '</ul><p class="small muted">Un accès refusé peut être accordé plus tard dans les Réglages d\'Android, ou quand vous ouvrez l\'outil.</p>');
      if (b) b.disabled = false;
    });
  });

  /* ================== Autoriser en une fois (appelée par le coordinateur) ================== */
  L.askAll = function () {
    var out = {};
    function step(name, fn) {
      return function () {
        return withTimeout(Promise.resolve().then(fn), 90000, 'delai').then(function (v) { out[name] = v || 'ok'; }, function (e) { out[name] = e && e.name === 'Timeout' ? 'delai' : 'refuse'; });
      };
    }
    var mic = function () {
      return gum({ audio: true }).then(function (s) { stopStream(s); permSet('mic', 'ok'); return 'ok'; }, function (e) { var s = gumState(e); permSet('mic', s); return s; });
    };
    var cam = function () {
      if (!T.native || !T.native.askPermissionsOnce) return 'absent';
      return T.native.askPermissionsOnce().then(function (r) { r = String(r || ''); if (r === 'granted') { permSet('cam', 'ok'); return 'ok'; } if (r === 'deja') return 'deja'; if (r === 'aucun') return 'absent'; return r === 'denied' || r === 'refuse' ? 'refuse' : r; }, function () { return 'refuse'; });
    };
    var bt = function () {
      var P = blePlugin(); if (!P) return navigator.bluetooth ? 'absent' : 'absent';
      return P.initialize({ androidNeverForLocation: true }).then(function () { return P.requestPermissions ? P.requestPermissions().catch(function () {}) : null; }).then(function () { permSet('bt', 'ok'); return 'ok'; }, function () { permSet('bt', 'refuse'); return 'refuse'; });
    };
    var motion = function () {
      var D = window.DeviceOrientationEvent; if (typeof D === 'undefined') return 'absent';
      if (typeof D.requestPermission === 'function') return D.requestPermission().then(function (r) { permSet('motion', r === 'granted' ? 'ok' : 'refuse'); return r === 'granted' ? 'ok' : 'refuse'; }, function () { permSet('motion', 'refuse'); return 'refuse'; });
      permSet('motion', 'ok'); return 'ok';
    };
    return step('micro', mic)().then(step('camera', cam)).then(step('bluetooth', bt)).then(step('mouvement', motion)).then(function () { return out; }, function () { return out; });
  };

  /* Les ressources en cours sont coupées dès qu'on quitte le Labo ou que l'appli passe en arrière-plan */
  window.addEventListener('hashchange', function () { if (!/^#\/labo/.test(location.hash)) stopAll(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopAll(); });
})();
