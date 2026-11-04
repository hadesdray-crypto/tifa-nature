/* Tifa Nature - lecture à voix haute. Solutions en cascade :
   1) moteur de voix du téléphone via le module natif, 2) synthèse vocale du navigateur, 3) message clair si rien n'existe. */
(function () {
  'use strict';
  var T = window.T, N = T.native;
  var V = T.voice = { voices: [], ready: false, engine: 'none', token: 0, texts: {}, counter: 0 };

  function frenchFirst(list) {
    var fr = list.filter(function (v) { return /^fr/i.test(v.lang); });
    return fr.length ? fr : list;
  }
  function decorate(list) {
    var n = 0;
    return list.map(function (v) {
      n += 1;
      var offline = v.offline;
      v.label = 'Voix ' + n + ' - ' + (v.lang || 'fr') + ' (' + (offline ? 'sans connexion' : 'avec connexion') + ')';
      return v;
    });
  }
  function fromPlugin() {
    var P = N.P.TTS;
    if (!P || !P.getSupportedVoices) return Promise.reject();
    return P.getSupportedVoices().then(function (r) {
      var all = (r && r.voices) || [];
      if (!all.length) throw new Error('vide');
      var mapped = all.map(function (v, i) { return { id: v.voiceURI || v.name || ('v' + i), name: v.name, lang: v.lang || '', idx: i, offline: v.localService !== false && !/network/i.test(v.name || v.voiceURI || '') }; });
      V.voices = decorate(frenchFirst(mapped)); V.engine = 'plugin';
    });
  }
  function fromBrowser() {
    return new Promise(function (resolve, reject) {
      var S = window.speechSynthesis;
      if (!S || !window.SpeechSynthesisUtterance) return reject();
      var tries = 0;
      (function poll() {
        var all = S.getVoices() || [];
        if (all.length) {
          var mapped = all.map(function (v) { return { id: v.voiceURI || v.name, name: v.name, lang: v.lang || '', native: v, offline: !!v.localService }; });
          V.voices = decorate(frenchFirst(mapped)); V.engine = 'browser'; return resolve();
        }
        if (++tries > 12) { V.voices = []; V.engine = 'browser'; return resolve(); }   /* moteur présent, voix choisie par le système */
        setTimeout(poll, 250);
      })();
      if (S.addEventListener) S.addEventListener('voiceschanged', function () { fromBrowser().catch(function () {}); }, { once: true });
    });
  }
  V.init = function () {
    return fromPlugin().catch(function () { return fromBrowser(); }).catch(function () { V.engine = 'none'; V.voices = []; }).then(function () { V.ready = true; });
  };
  V.available = function () { return V.engine !== 'none'; };
  /* Voix affichées : celles que la personne n'a pas masquées (il en reste toujours au moins une). */
  V.visible = function () {
    var hid = T.set().hiddenVoices || [], vis = V.voices.filter(function (x) { return hid.indexOf(x.id) < 0; });
    return vis.length ? vis : V.voices.slice(0, 1);
  };
  V.hidden = function () {
    var vis = V.visible();
    return V.voices.filter(function (x) { return vis.indexOf(x) < 0; });
  };
  V.chosen = function () {
    var id = T.set().voiceId, i, list = V.visible();
    for (i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0] || null;     /* première voix française par défaut */
  };
  V.chunks = function (text) {
    var out = [], parts = String(text || '').replace(/\s+/g, ' ').match(/[^.!?;:]+[.!?;:]*\s*/g) || [], cur = '';
    parts = parts.map(function (x) { return x.trim(); }).filter(Boolean);
    parts.forEach(function (p) {
      if ((cur + ' ' + p).length > 230 && cur) { out.push(cur); cur = p; } else cur = cur ? cur + ' ' + p : p;
    });
    if (cur) out.push(cur);
    return out;
  };
  V.stop = function () {
    V.token += 1;
    try { if (N.P.TTS) N.P.TTS.stop().catch(function () {}); } catch (e) {}
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
  };
  function speakChunkPlugin(txt, v, rate, pitch) {
    var o = { text: txt, lang: (v && v.lang) || 'fr-FR', rate: rate, pitch: pitch || 1, volume: 1 };
    if (v && typeof v.idx === 'number') o.voice = v.idx;
    return N.P.TTS.speak(o);
  }
  function speakChunkBrowser(txt, v, rate, pitch) {
    return new Promise(function (resolve, reject) {
      var u = new window.SpeechSynthesisUtterance(txt);
      u.lang = (v && v.lang) || 'fr-FR'; u.rate = rate; u.pitch = pitch || 1; if (v && v.native) u.voice = v.native;
      u.onend = function () { resolve(); }; u.onerror = function (e) { if (e && e.error === 'interrupted') resolve(); else reject(e); };
      window.speechSynthesis.speak(u);
    });
  }
  V.speak = function (text, ov) {
    var s = T.set();
    ov = ov || {};
    if (!s.voiceOn) { T.toast('La lecture à voix haute est coupée dans Réglages.'); return Promise.resolve(false); }
    if (!V.available()) { T.toast('Aucune voix sur ce téléphone. Installez « Synthèse vocale Google » dans les réglages Android.', 4200); return Promise.resolve(false); }
    V.stop();
    var my = V.token, v = ov.id != null ? (V.voices.filter(function (x) { return x.id === ov.id; })[0] || V.chosen()) : V.chosen(), rate = ov.rate || s.rate || 0.95, pitch = ov.pitch || s.pitch || 1, parts = V.chunks(text), i = 0;
    var useBrowser = V.engine === 'browser';
    function next() {
      if (my !== V.token || i >= parts.length) return Promise.resolve(true);
      var t = parts[i++], p;
      try { p = useBrowser ? speakChunkBrowser(t, v, rate, pitch) : speakChunkPlugin(t, v, rate, pitch); } catch (e) { p = Promise.reject(e); }
      return p.then(next, function (err) {
        if (!useBrowser && window.speechSynthesis && window.SpeechSynthesisUtterance) {   /* repli : on passe à la solution suivante */
          useBrowser = true; i -= 1; return next();
        }
        T.toast('La lecture a échoué. Vérifiez le volume et la voix choisie dans Réglages.', 3600); return false;
      });
    }
    return next();
  };
  /* Bouton « Écouter » : le texte est gardé en mémoire le temps de l'écran. */
  V.button = function (text, label) {
    var id = 'say' + (++V.counter); V.texts[id] = text;
    return '<button class="btn" data-act="speak" data-say="' + id + '">' + T.esc(label || 'Écouter') + '</button>';
  };
  V.clearTexts = function () { V.texts = {}; };
  T.act.speak = function (el) { var t = V.texts[el.getAttribute('data-say')]; if (t) V.speak(t); };
  T.act.stopvoice = function () { V.stop(); };
})();
