/* Tifa Nature - Musique : lecteur, playlists, ambiances du jardin (WebAudio), minuteur de sommeil, mini-lecteur.
   Les fichiers de l'utilisatrice restent sur le téléphone (IndexedDB). Rien n'est envoyé nulle part.
   Branchement avec la voix (déjà fait ici) : T.voice.speak est enveloppée pour baisser la musique pendant la parole.
   Si un autre module lit un texte autrement, il appelle T.musique.duck(true) avant et T.musique.duck(false) après. */
(function () {
  'use strict';
  var T = window.T;
  var LIMITS = { titres: 200, octets: 600 * 1024 * 1024, fichier: 150 * 1024 * 1024 };
  var EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|weba|webm|3gp|amr|mp4)$/i;
  var AMBS = [
    { id: 'pluie', nom: 'Pluie douce', d: 'Une pluie fine sur les feuilles.', lvl: 0.55 },
    { id: 'ruisseau', nom: 'Ruisseau', d: 'De l\'eau qui coule doucement.', lvl: 0.5 },
    { id: 'vent', nom: 'Vent dans les feuilles', d: 'Le vent qui passe dans les arbres.', lvl: 0.6 },
    { id: 'oiseaux', nom: 'Brise et oiseaux', d: 'Une petite brise et des chants d\'oiseaux (sons simples).', lvl: 0.5 },
    { id: 'grillons', nom: 'Nuit d\'été', d: 'Les grillons du soir.', lvl: 0.35 },
    { id: 'abeilles', nom: 'Bourdonnement d\'abeilles', d: 'Un doux bourdonnement dans les fleurs.', lvl: 0.4 },
    { id: 'orage', nom: 'Orage lointain', d: 'Un grondement au loin, sans éclat.', lvl: 0.7 },
    { id: 'rose', nom: 'Bruit rose apaisant', d: 'Un souffle régulier qui détend.', lvl: 0.5 }
  ];
  var M = T.musique = {};
  var R = {   /* état de la session (non enregistré) */
    el: null, url: null, cur: null, ctxIds: [], order: [], qi: -1, playing: false, closed: false, loadTok: 0, fails: 0,
    pendingSeek: 0, internalPause: false, ctx: null, bus: null, msd: null, ambEl: null, amb: {}, ambOrder: [], ambPaused: false,
    duckN: 0, sleepEnd: 0, sleepF: 1, tick: null, tab: 'lecteur', openList: null, msg: '', db: null, mem: {}, volatile: false,
    noise: {}, lastSave: 0, hookDone: false, sugg: false, picker: null
  };
  M._r = R;

  /* ---------- Données enregistrées ---------- */
  function S() {
    var st = T.store.s, m = st.musique;
    if (!m || typeof m !== 'object' || Array.isArray(m)) m = st.musique = {};
    if (!Array.isArray(m.tracks)) m.tracks = [];
    if (!Array.isArray(m.lists)) m.lists = [];
    if (typeof m.vol !== 'number') m.vol = 0.8;
    if (typeof m.fondu !== 'number') m.fondu = 15;
    if (['none', 'one', 'all'].indexOf(m.repeat) < 0) m.repeat = 'all';
    if (typeof m.shuffle !== 'boolean') m.shuffle = false;
    if (!m.amb || typeof m.amb !== 'object') m.amb = {};
    if (!m.last || typeof m.last !== 'object') m.last = null;
    return m;
  }
  function save() { try { T.store.save(); } catch (e) {} }
  function track(id) { var a = S().tracks; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  function list(id) { var a = S().lists; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  function ambDef(id) { for (var i = 0; i < AMBS.length; i++) if (AMBS[i].id === id) return AMBS[i]; return null; }
  function ambVol(id) { var v = S().amb[id]; return typeof v === 'number' ? v : 0.6; }
  function clamp(v, a, b) { v = Number(v); if (isNaN(v)) v = a; return Math.max(a, Math.min(b, v)); }
  function fmt(s) { s = Math.max(0, Math.round(s || 0)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function mo(n) { return (n / 1048576 < 10 ? (n / 1048576).toFixed(1) : Math.round(n / 1048576)).toString().replace('.', ',') + ' Mo'; }
  function refresh() { try { if (T.cur && T.cur.path === '/musique') T.render(true); } catch (e) {} updateMini(); }

  /* ---------- Fichiers gardés dans IndexedDB (repli : mémoire de la session) ---------- */
  function openDB() {
    if (R.db) return R.db;
    R.db = new Promise(function (resolve, reject) {
      try {
        var rq = window.indexedDB.open('tifa-musique', 1);
        rq.onupgradeneeded = function () { try { rq.result.createObjectStore('blobs'); } catch (e) {} };
        rq.onsuccess = function () { resolve(rq.result); };
        rq.onerror = function () { reject(rq.error || new Error('idb')); };
        rq.onblocked = function () { reject(new Error('idb bloquée')); };
      } catch (e) { reject(e); }
    }).catch(function () { R.volatile = true; return null; });
    return R.db;
  }
  function idbDo(mode, fn) {
    return openDB().then(function (db) {
      if (!db) return { mem: true };
      return new Promise(function (resolve, reject) {
        try {
          var tx = db.transaction('blobs', mode), st = tx.objectStore('blobs'), out;
          out = fn(st);
          tx.oncomplete = function () { resolve({ v: out && out.result }); };
          tx.onerror = function () { reject(tx.error || (out && out.error) || new Error('idb')); };
          tx.onabort = function () { reject(tx.error || new Error('idb annulée')); };
        } catch (e) { reject(e); }
      });
    });
  }
  function blobPut(id, blob) {
    return idbDo('readwrite', function (st) { return st.put(blob, id); }).then(function (r) { if (r && r.mem) R.mem[id] = blob; });
  }
  function blobGet(id) {
    if (R.mem[id]) return Promise.resolve(R.mem[id]);
    return idbDo('readonly', function (st) { return st.get(id); }).then(function (r) { return (r && r.v) || null; }, function () { return null; });
  }
  function blobDel(id) {
    delete R.mem[id];
    return idbDo('readwrite', function (st) { return st.delete(id); }).catch(function () {});
  }
  function isQuota(e) { return !!e && (e.name === 'QuotaExceededError' || e.code === 22 || /quota|full|plein/i.test(String(e.message || ''))); }

  /* ---------- Lecteur audio ---------- */
  function audio() {
    if (R.el) return R.el;
    if (!window.Audio) return null;
    try {
      var a = new window.Audio();
      a.preload = 'auto';
      a.onplay = function () { R.playing = true; R.closed = false; setSession(); refresh(); };
      a.onplaying = function () { R.fails = 0; };
      a.onpause = function () {
        if (R.internalPause || (a.ended)) return;
        if (R.playing) { R.playing = false; savePos(true); refresh(); }   /* pause venue du téléphone (appel, autre appli) */
      };
      a.onended = function () { onEnded(); };
      a.onerror = function () { var t = R.cur && track(R.cur); if (!t || !R.srcReady || !a.getAttribute('src')) return; failTrack(t); };
      a.onloadedmetadata = function () {
        var t = R.cur && track(R.cur);
        if (t && isFinite(a.duration) && a.duration > 0) { t.dur = Math.round(a.duration); save(); }
        if (R.pendingSeek) { try { a.currentTime = R.pendingSeek; } catch (e) {} R.pendingSeek = 0; }
      };
      a.ontimeupdate = function () { onTime(); };
      R.el = a;
    } catch (e) { R.el = null; }
    return R.el;
  }
  function onTime() {
    var a = R.el; if (!a) return;
    var p = document.getElementById('mu-pos'), tm = document.getElementById('mu-time');
    var d = isFinite(a.duration) ? a.duration : 0;
    if (p && !p.__drag) { p.max = String(Math.max(1, Math.round(d))); p.value = String(Math.round(a.currentTime || 0)); }
    if (tm) tm.textContent = fmt(a.currentTime) + ' / ' + fmt(d);
    savePos(false);
    try { if (navigator.mediaSession && navigator.mediaSession.setPositionState && d) navigator.mediaSession.setPositionState({ duration: d, position: Math.min(d, a.currentTime || 0), playbackRate: 1 }); } catch (e) {}
  }
  function savePos(force) {
    var now = Date.now(); if (!R.cur || !R.el) return;
    if (!force && now - R.lastSave < 5000) return;
    R.lastSave = now; S().last = { id: R.cur, t: Math.floor(R.el.currentTime || 0) }; save();
  }
  function applyVol() {
    var f = S().vol * duckF() * R.sleepF;
    if (R.el) { try { R.el.volume = clamp(f, 0, 1); } catch (e) {} }
    if (R.bus) { setParam(R.bus.gain, f, 0.08); }
  }
  function duckF() { return R.duckN > 0 ? 0.25 : 1; }
  function setParam(p, v, tc) {
    try { if (R.ctx && p.setTargetAtTime) { p.setTargetAtTime(v, R.ctx.currentTime, tc || 0.05); return; } } catch (e) {}
    try { p.value = v; } catch (e) {}
  }
  M.duck = function (on) {
    R.duckN = Math.max(0, R.duckN + (on ? 1 : -1));
    applyVol(); return R.duckN > 0;
  };

  function buildOrder(ids, startId) {
    ids = ids.filter(function (id) { return !!track(id); });
    R.ctxIds = ids.slice();
    var order = ids.slice();
    if (S().shuffle) {
      var rest = order.filter(function (x) { return x !== startId; }), i, j, t;
      for (i = rest.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
      order = (startId && order.indexOf(startId) >= 0) ? [startId].concat(rest) : rest;
    }
    R.order = order; R.qi = startId ? order.indexOf(startId) : 0;
  }
  function allIds() { return S().tracks.map(function (t) { return t.id; }); }

  /* Lance un titre. ids : liste de lecture (par défaut tous les titres). */
  M.play = function (id, ids) {
    try {
      if (!id) return M.resume();
      if (!track(id)) { T.toast('Ce titre n\'existe plus.'); return false; }
      if (ids || R.order.indexOf(id) < 0) buildOrder(ids || allIds(), id); else R.qi = R.order.indexOf(id);
      R.fails = 0; R.closed = false;
      return loadAndPlay(id, 0, true);
    } catch (e) { T.toast('La lecture n\'a pas pu démarrer.'); return false; }
  };
  M.resume = function () {
    var l = S().last, t = l && track(l.id);
    if (!t) { var a = S().tracks; if (!a.length) { T.toast('Ajoutez d\'abord des musiques dans « Ma musique ».'); return false; } t = a[0]; l = { t: 0 }; }
    buildOrder(allIds(), t.id); R.fails = 0; R.closed = false;
    return loadAndPlay(t.id, l.t || 0, true);
  };
  function loadAndPlay(id, startAt, autoplay) {
    var a = audio(), t = track(id);
    if (!a) { T.toast('Ce téléphone ne sait pas lire de musique ici.'); return false; }
    var my = ++R.loadTok;
    R.cur = id; R.pendingSeek = startAt || 0; R.srcReady = false;
    blobGet(id).then(function (blob) {
      if (my !== R.loadTok) return;
      if (!blob) { T.toast('Le fichier « ' + t.nom + ' » est introuvable. Ajoutez-le de nouveau.', 3800); R.fails += 1; return skipAfterFail(); }
      try { if (R.url) URL.revokeObjectURL(R.url); } catch (e) {}
      try { R.url = URL.createObjectURL(blob); } catch (e) { return failTrack(t); }
      R.internalPause = true; try { a.pause(); } catch (e) {} R.internalPause = false;
      a.src = R.url; R.srcReady = true; applyVol(); setSession();
      if (!autoplay) { R.playing = false; refresh(); return; }
      var p; try { p = a.play(); } catch (e) { p = Promise.reject(e); }
      if (p && p.then) p.then(function () { if (my === R.loadTok) { R.playing = true; R.fails = 0; refresh(); } }, function (e) {
        if (my !== R.loadTok) return;
        var n = e && e.name;
        if (n === 'NotAllowedError') { R.playing = false; R.msg = 'Le téléphone demande de toucher le bouton Lecture pour lancer le son.'; T.toast('Touchez « Lecture » pour démarrer.', 3200); refresh(); }
        else if (n === 'AbortError') { /* remplacé par un autre titre */ }
        else failTrack(t);
      }); else { R.playing = true; refresh(); }
    });
    refresh();
    return true;
  }
  function failTrack(t) {
    R.fails += 1; R.loadTok += 1; R.srcReady = false;
    T.toast('Ce fichier ne peut pas être lu : « ' + t.nom + ' ». On passe au suivant.', 3800);
    skipAfterFail();
  }
  function skipAfterFail() {
    if (R.fails >= Math.max(1, R.order.length)) {
      R.playing = false; R.msg = 'Aucun des titres de cette liste ne peut être lu. Essayez d\'autres fichiers (mp3, m4a, ogg ou wav).'; R.fails = 0; refresh(); return;
    }
    M.next(true);
  }
  function onEnded() {
    var tr = R.cur && track(R.cur);
    if (S().repeat === 'one' && tr) { try { R.el.currentTime = 0; var p = R.el.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} return; }
    M.next(true);
  }
  M.next = function (auto) {
    if (auto && auto.type) auto = false;
    var n = R.order.length; if (!n) { return M.resume(); }
    var qi = R.qi + 1;
    if (qi >= n) {
      if (S().repeat === 'all') { if (S().shuffle) buildOrder(R.ctxIds, null); qi = 0; }
      else if (auto) { R.playing = false; R.internalPause = true; try { R.el.pause(); } catch (e) {} R.internalPause = false; R.closed = false; refresh(); return false; }
      else { T.toast('C\'est le dernier titre.'); return false; }
    }
    R.qi = qi; return loadAndPlay(R.order[qi], 0, true);
  };
  M.prev = function () {
    var n = R.order.length; if (!n) return false;
    if (R.el && R.el.currentTime > 3) { try { R.el.currentTime = 0; } catch (e) {} return true; }
    var qi = R.qi - 1;
    if (qi < 0) { if (S().repeat === 'all') qi = n - 1; else { try { if (R.el) R.el.currentTime = 0; } catch (e) {} return true; } }
    R.qi = qi; return loadAndPlay(R.order[qi], 0, true);
  };
  M.pause = function () {
    savePos(true);
    if (R.el && R.playing) { R.internalPause = true; try { R.el.pause(); } catch (e) {} R.internalPause = false; }
    R.playing = false;
    if (ambCount() && R.ctx && !R.ambPaused) { R.ambPaused = true; try { R.ctx.suspend(); } catch (e) {} }
    setSession(); refresh();
  };
  M.toggle = function () {
    if (M.isPlaying()) return M.pause();
    R.closed = false;
    var did = false;
    if (ambCount() && R.ambPaused) { R.ambPaused = false; did = true; try { R.ctx.resume(); } catch (e) {} }
    if (R.cur && R.el && R.el.getAttribute('src')) {
      did = true;
      var p; try { p = R.el.play(); } catch (e) { p = Promise.reject(e); }
      R.playing = true;
      if (p && p.then) p.then(function () { R.playing = true; refresh(); }, function (e) {
        R.playing = false;
        if (e && e.name === 'NotAllowedError') T.toast('Touchez « Lecture » pour démarrer.'); else failTrack(track(R.cur) || { nom: 'ce titre' });
        refresh();
      });
    } else if (!did) M.resume();
    setSession(); refresh();
  };
  M.isPlaying = function () { return !!R.playing || (ambCount() > 0 && !R.ambPaused); };
  function stopTrack() {
    R.loadTok += 1; savePos(true);
    R.internalPause = true; try { if (R.el) { R.el.pause(); } } catch (e) {} R.internalPause = false;
    R.cur = null; R.playing = false;
    try { if (R.el) { R.el.removeAttribute('src'); if (R.el.load) R.el.load(); } } catch (e) {}
    try { if (R.url) URL.revokeObjectURL(R.url); } catch (e) {} R.url = null;
  }
  M.close = function () { stopTrack(); M.stopAll(); R.closed = true; R.sleepEnd = 0; R.sleepF = 1; setSession(); refresh(); };

  /* ---------- Écran verrouillé / notification (MediaSession) ---------- */
  function setSession() {
    var ms = navigator.mediaSession; if (!ms) return;
    try {
      var t = R.cur && track(R.cur);
      if (window.MediaMetadata) ms.metadata = new window.MediaMetadata({ title: t ? t.nom : (ambCount() ? 'Ambiance du jardin' : 'Tifa Nature'), artist: 'Tifa Nature', album: t ? 'Ma musique' : 'Ambiances' });
      ms.playbackState = M.isPlaying() ? 'playing' : 'paused';
      var set = function (n, f) { try { ms.setActionHandler(n, f); } catch (e) {} };
      set('play', function () { if (!M.isPlaying()) M.toggle(); });
      set('pause', function () { M.pause(); });
      set('previoustrack', function () { M.prev(); });
      set('nexttrack', function () { M.next(); });
      set('stop', function () { M.pause(); });
      set('seekto', function (d) { try { if (R.el && d && typeof d.seekTime === 'number') R.el.currentTime = d.seekTime; } catch (e) {} });
    } catch (e) {}
  }

  /* ---------- Minuteur de sommeil ---------- */
  M.sleep = function (min) {
    min = Number(min) || 0;
    if (min <= 0) { R.sleepEnd = 0; R.sleepF = 1; applyVol(); updateMini(); refresh(); return 0; }
    R.sleepEnd = Date.now() + min * 60000; R.sleepF = 1; applyVol();
    if (!R.tick) R.tick = setInterval(M._tick, 1000);
    refresh(); return R.sleepEnd;
  };
  M._tick = function () {
    try {
      if (!R.sleepEnd) { updateSleepText(); return; }
      var left = R.sleepEnd - Date.now(), fade = S().fondu * 1000;
      if (left <= 0) {
        R.sleepEnd = 0; stopTrack(); M.stopAll(); R.sleepF = 1; R.closed = true; applyVol(); setSession();
        T.toast('Bonne nuit. La musique s\'est arrêtée.', 3500); refresh(); return;
      }
      var f = left < fade ? Math.max(0, left / fade) : 1;
      if (f !== R.sleepF) { R.sleepF = f; applyVol(); }
      updateSleepText();
    } catch (e) {}
  };
  function sleepLeftMin() { return R.sleepEnd ? Math.max(0, Math.ceil((R.sleepEnd - Date.now()) / 60000)) : 0; }
  function updateSleepText() {
    var s = document.getElementById('mu-sleep'); if (!s) return;
    s.textContent = R.sleepEnd ? 'Arrêt automatique dans ' + sleepLeftMin() + ' min.' : 'Pas de minuteur.';
  }

  /* ---------- Ambiances (fabriquées sur le téléphone avec WebAudio) ---------- */
  function ambCount() { return R.ambOrder.length; }
  function getCtx() {
    if (R.ctx) return R.ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      var c = new AC();
      R.ctx = c; R.noise = {};
      R.bus = c.createGain(); R.bus.gain.value = S().vol * duckF() * R.sleepF;
      var routed = false;
      try {
        if (c.createMediaStreamDestination && window.Audio && 'srcObject' in window.Audio.prototype) {
          var d = c.createMediaStreamDestination(), e = new window.Audio();
          e.srcObject = d.stream;
          R.bus.connect(d); R.msd = d; R.ambEl = e; routed = true;
          var back = function () {   /* repli : sortie directe si l'élément ne démarre pas */
            if (R.msd) { try { R.bus.disconnect(); } catch (x) {} try { R.bus.connect(c.destination); } catch (x) {} R.msd = null; }
          };
          var pr = e.play(); if (pr && pr.catch) pr.catch(back);
        }
      } catch (e2) { routed = false; try { R.bus.disconnect(); } catch (x) {} }
      if (!routed) R.bus.connect(c.destination);
      if (c.onstatechange !== undefined) c.onstatechange = function () { /* « interrupted » : repris au prochain toucher */ };
      return c;
    } catch (e) { R.ctx = null; return null; }
  }
  function noiseBuf(kind) {
    var c = R.ctx; if (R.noise[kind]) return R.noise[kind];
    var rate = c.sampleRate || 44100, len = Math.floor(rate * 4), b = c.createBuffer(1, len, rate), d = b.getChannelData(0), i;
    if (kind === 'white') { for (i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
    else if (kind === 'pink') {
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, w;
      for (i = 0; i < len; i++) {
        w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      }
    } else { var last = 0; for (i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; } }
    R.noise[kind] = b; return b;
  }
  /* Petit assembleur de graphe audio, avec nettoyage complet à l'arrêt. */
  function Graph(lvl) {
    var c = R.ctx, g = this;
    g.nodes = []; g.srcs = []; g.timers = []; g.trans = []; g.dead = false;
    g.out = g.n(c.createGain()); g.out.gain.value = 0; g.out.connect(R.bus); g.lvl = lvl;
  }
  Graph.prototype.n = function (node) { this.nodes.push(node); return node; };
  Graph.prototype.start = function (s) { this.srcs.push(s); s.start(0); return s; };
  Graph.prototype.noise = function (kind) { var s = this.n(R.ctx.createBufferSource()); s.buffer = noiseBuf(kind); s.loop = true; return this.start(s); };
  Graph.prototype.filter = function (type, f, q) { var x = this.n(R.ctx.createBiquadFilter()); x.type = type; x.frequency.value = f; if (q != null) x.Q.value = q; return x; };
  Graph.prototype.gain = function (v) { var x = this.n(R.ctx.createGain()); x.gain.value = v; return x; };
  Graph.prototype.lfo = function (freq, depth, param, type) {
    var o = this.n(R.ctx.createOscillator()), d = this.gain(depth); o.type = type || 'sine'; o.frequency.value = freq; o.connect(d); d.connect(param); this.start(o); return o;
  };
  Graph.prototype.every = function (minMs, maxMs, fn) {
    var g = this;
    (function go() {
      var h = setTimeout(function () {
        var i = g.timers.indexOf(h); if (i >= 0) g.timers.splice(i, 1);
        if (g.dead) return; try { fn(); } catch (e) {} go();
      }, minMs + Math.random() * (maxMs - minMs));
      g.timers.push(h);
    })();
  };
  Graph.prototype.blip = function (type, f0, f1, t0, dur, peak, dest) {   /* petit son bref (chant d'oiseau) */
    var c = R.ctx, g = this, o = c.createOscillator(), e = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    e.gain.setValueAtTime(0.0001, t0); e.gain.linearRampToValueAtTime(peak, t0 + dur * 0.2); e.gain.linearRampToValueAtTime(0, t0 + dur);
    o.connect(e); e.connect(dest || g.out);
    var rec = { o: o, e: e }; g.trans.push(rec);
    o.onended = function () { try { o.disconnect(); e.disconnect(); } catch (x) {} var i = g.trans.indexOf(rec); if (i >= 0) g.trans.splice(i, 1); };
    o.start(t0); o.stop(t0 + dur + 0.05);
  };
  Graph.prototype.kill = function () {
    var g = this; g.dead = true;
    g.timers.forEach(function (h) { clearTimeout(h); }); g.timers = [];
    g.trans.slice().forEach(function (r) { try { r.o.stop(0); } catch (x) {} try { r.o.disconnect(); r.e.disconnect(); } catch (x) {} }); g.trans = [];
    g.srcs.forEach(function (s) { try { s.stop(0); } catch (x) {} try { s.disconnect(); } catch (x) {} }); g.srcs = [];
    g.nodes.forEach(function (n) { try { n.disconnect(); } catch (x) {} }); g.nodes = [];
  };
  var BUILD = {
    pluie: function (g) {
      var n = g.noise('white'), hp = g.filter('highpass', 900, 0.5), lp = g.filter('lowpass', 9000, 0.5), v = g.gain(0.5);
      n.connect(hp); hp.connect(lp); lp.connect(v); v.connect(g.out); g.lfo(0.13, 0.12, v.gain);
      var n2 = g.noise('pink'), bp = g.filter('bandpass', 2500, 0.7), v2 = g.gain(0.35);   /* gouttes plus lourdes */
      n2.connect(bp); bp.connect(v2); v2.connect(g.out); g.lfo(0.31, 0.12, v2.gain);
    },
    ruisseau: function (g) {
      var n = g.noise('white'), bp = g.filter('bandpass', 1300, 0.9), v = g.gain(0.55);
      n.connect(bp); bp.connect(v); v.connect(g.out); g.lfo(0.37, 420, bp.frequency); g.lfo(0.83, 260, bp.frequency); g.lfo(0.21, 0.15, v.gain);
      var n2 = g.noise('pink'), bp2 = g.filter('bandpass', 3200, 1.4), v2 = g.gain(0.22);
      n2.connect(bp2); bp2.connect(v2); v2.connect(g.out); g.lfo(1.3, 700, bp2.frequency); g.lfo(0.5, 0.1, v2.gain);
    },
    vent: function (g) {
      var n = g.noise('pink'), bp = g.filter('bandpass', 420, 0.6), v = g.gain(0.7);
      n.connect(bp); bp.connect(v); v.connect(g.out); g.lfo(0.07, 260, bp.frequency); g.lfo(0.11, 0.3, v.gain);
      var n2 = g.noise('white'), hp = g.filter('highpass', 4200, 0.4), v2 = g.gain(0.06);   /* frottement des feuilles */
      n2.connect(hp); hp.connect(v2); v2.connect(g.out); g.lfo(0.17, 0.05, v2.gain);
    },
    oiseaux: function (g) {
      var n = g.noise('pink'), bp = g.filter('bandpass', 500, 0.5), v = g.gain(0.3);
      n.connect(bp); bp.connect(v); v.connect(g.out); g.lfo(0.09, 180, bp.frequency); g.lfo(0.13, 0.12, v.gain);
      g.every(1400, 6000, function () {
        var t = R.ctx.currentTime + 0.02, k = 2 + Math.floor(Math.random() * 4), f = 2400 + Math.random() * 2200, i;
        for (i = 0; i < k; i++) { g.blip('sine', f, f * (1.15 + Math.random() * 0.35), t, 0.09, 0.22); t += 0.13; f *= 0.97 + Math.random() * 0.1; }
      });
    },
    grillons: function (g) {
      var n = g.noise('pink'), lp = g.filter('lowpass', 700, 0.5), v = g.gain(0.1);
      n.connect(lp); lp.connect(v); v.connect(g.out);
      [[4300, 31, 1000, 1700], [4750, 27, 1300, 2100]].forEach(function (p) {
        var o = g.n(R.ctx.createOscillator()), am = g.gain(0.5), gate = g.gain(0), lv = g.gain(0.16);
        o.type = 'sine'; o.frequency.value = p[0]; o.connect(am); am.connect(gate); gate.connect(lv); lv.connect(g.out);
        g.lfo(p[1], 0.5, am.gain, 'square'); g.start(o);
        g.every(p[2], p[3], function () {
          var t = R.ctx.currentTime + 0.02, k = 3 + Math.floor(Math.random() * 3), i;
          for (i = 0; i < k; i++) { gate.gain.setValueAtTime(1, t); gate.gain.setValueAtTime(0, t + 0.055); t += 0.11; }
        });
      });
    },
    abeilles: function (g) {
      var bp = g.filter('bandpass', 320, 2.2), v = g.gain(0.45); bp.connect(v); v.connect(g.out);
      [150, 154, 301].forEach(function (f, i) {
        var o = g.n(R.ctx.createOscillator()), og = g.gain(i === 2 ? 0.12 : 0.4);
        o.type = 'sawtooth'; o.frequency.value = f; o.connect(og); og.connect(bp); g.start(o); g.lfo(6 + i, 3, o.frequency);
      });
      g.lfo(0.25, 0.2, v.gain);
      var n = g.noise('pink'), bp2 = g.filter('bandpass', 900, 1.2), v2 = g.gain(0.05); n.connect(bp2); bp2.connect(v2); v2.connect(g.out);
    },
    orage: function (g) {
      var n = g.noise('brown'), lp = g.filter('lowpass', 170, 0.7), rg = g.gain(0.08);
      n.connect(lp); lp.connect(rg); rg.connect(g.out);
      g.every(7000, 18000, function () {
        var t = R.ctx.currentTime + 0.05, up = 1.2 + Math.random() * 1.8;
        rg.gain.setValueAtTime(0.08, t); rg.gain.linearRampToValueAtTime(0.95, t + up); rg.gain.linearRampToValueAtTime(0.08, t + up + 5 + Math.random() * 4);
        lp.frequency.setValueAtTime(140, t); lp.frequency.linearRampToValueAtTime(240, t + up); lp.frequency.linearRampToValueAtTime(140, t + up + 6);
      });
      var n2 = g.noise('pink'), lp2 = g.filter('lowpass', 1500, 0.5), v2 = g.gain(0.1);   /* un peu de pluie au loin */
      n2.connect(lp2); lp2.connect(v2); v2.connect(g.out);
    },
    rose: function (g) {
      var n = g.noise('pink'), lp = g.filter('lowpass', 6500, 0.5), v = g.gain(0.9); n.connect(lp); lp.connect(v); v.connect(g.out);
    }
  };
  M.playAmbiance = function (nom) {
    var def = ambDef(nom);
    if (!def) return false;
    try {
      if (R.amb[nom]) return true;
      var c = getCtx();
      if (!c) { T.toast('Ce téléphone ne peut pas fabriquer les sons d\'ambiance.', 3800); return false; }
      try { var rp = c.resume && c.resume(); if (rp && rp.then) rp.then(function () { if (c.state === 'suspended') T.toast('Touchez de nouveau le bouton pour lancer le son.', 3200); }, function () {}); } catch (e) {}
      if (R.ambOrder.length >= 2) M.stopAmbiance(R.ambOrder[0]);
      var g = new Graph(def.lvl);
      BUILD[nom](g);
      R.amb[nom] = g; R.ambOrder.push(nom); R.ambPaused = false; R.closed = false;
      g.out.gain.setValueAtTime(0, c.currentTime); g.out.gain.linearRampToValueAtTime(ambVol(nom) * def.lvl, c.currentTime + 0.6);
      setSession(); refresh(); return true;
    } catch (e) {
      try { if (R.amb[nom]) { R.amb[nom].kill(); delete R.amb[nom]; } R.ambOrder = R.ambOrder.filter(function (x) { return x !== nom; }); } catch (x) {}
      T.toast('Cette ambiance n\'a pas pu démarrer.'); return false;
    }
  };
  M.stopAmbiance = function (nom) {
    var g = R.amb[nom]; if (!g) return false;
    delete R.amb[nom]; R.ambOrder = R.ambOrder.filter(function (x) { return x !== nom; });
    try { g.out.gain.cancelScheduledValues(R.ctx.currentTime); g.out.gain.setTargetAtTime(0, R.ctx.currentTime, 0.08); } catch (e) {}
    setTimeout(function () { g.kill(); }, 350);
    if (!R.ambOrder.length) R.ambPaused = false;
    setSession(); refresh(); return true;
  };
  M.stopAll = function () { R.ambOrder.slice().forEach(function (n) { M.stopAmbiance(n); }); };
  M.ambiances = function () { return R.ambOrder.slice(); };
  function setAmbVol(nom, v) {
    S().amb[nom] = v; save();
    var g = R.amb[nom], d = ambDef(nom);
    if (g && d) setParam(g.out.gain, v * d.lvl, 0.05);
  }

  /* ---------- État ---------- */
  M.state = function () {
    var t = R.cur && track(R.cur), m = S();
    return {
      playing: M.isPlaying(), trackPlaying: !!R.playing, trackId: R.cur, title: t ? t.nom : '', index: R.qi, queue: R.order.slice(), shuffle: m.shuffle, repeat: m.repeat,
      amb: R.ambOrder.slice(), sleepLeft: sleepLeftMin(), duck: R.duckN > 0, vol: m.vol, volatile: R.volatile, closed: R.closed, tracks: m.tracks.length
    };
  };

  /* ---------- Ajout, suppression ---------- */
  function addFiles(files) {
    files = Array.prototype.slice.call(files || []);
    if (!files.length) return Promise.resolve();
    var ok = 0, dup = 0, bad = 0, big = 0, full = '', stop = false, m = S();
    function total() { return m.tracks.reduce(function (s, t) { return s + (t.taille || 0); }, 0); }
    var chain = Promise.resolve();
    files.forEach(function (f) {
      chain = chain.then(function () {
        if (stop) return;
        var type = String(f.type || ''), name = String(f.name || 'Titre');
        if (!(/^audio\//.test(type) || (!type || type === 'application/octet-stream') && EXT.test(name) || (/^video\/(mp4|webm|3gpp)$/.test(type) && EXT.test(name)))) { bad += 1; return; }
        if (m.tracks.some(function (t) { return t.nom === name.replace(/\.[^.]+$/, '') && t.taille === f.size; })) { dup += 1; return; }
        if (f.size > LIMITS.fichier) { big += 1; return; }
        if (m.tracks.length >= LIMITS.titres) { full = 'Il y a déjà ' + LIMITS.titres + ' titres. Supprimez-en quelques-uns pour en ajouter.'; stop = true; return; }
        if (total() + f.size > LIMITS.octets) { full = 'La place réservée à la musique est pleine (' + mo(LIMITS.octets) + '). Supprimez des titres pour en ajouter.'; stop = true; return; }
        var id = 't' + T.uid();
        return blobPut(id, f).then(function () {
          m.tracks.push({ id: id, nom: name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').slice(0, 120) || 'Titre', taille: f.size, type: type, dur: 0, fav: false, ajout: Date.now() });
          ok += 1; save();
        }, function (e) {
          stop = true;
          full = isQuota(e) ? 'La mémoire du téléphone est pleine. Libérez de la place (supprimez des photos, des vidéos ou des titres), puis réessayez.' : 'Un fichier n\'a pas pu être enregistré. Réessayez.';
        });
      });
    });
    return chain.then(function () {
      var parts = [];
      if (ok) parts.push(ok + (ok > 1 ? ' titres ajoutés' : ' titre ajouté'));
      if (dup) parts.push(dup + ' déjà présent' + (dup > 1 ? 's' : ''));
      if (bad) parts.push(bad + ' fichier' + (bad > 1 ? 's' : '') + ' ignoré' + (bad > 1 ? 's' : '') + ' (ce n\'est pas de la musique)');
      if (big) parts.push(big + ' trop gros (plus de ' + mo(LIMITS.fichier) + ')');
      R.msg = (parts.join(', ') || 'Rien n\'a été ajouté') + '.' + (full ? ' ' + full : '');
      R.msgBad = !!full || (!ok && !dup);
      if (R.volatile && ok) R.msg += ' Attention : sur ce téléphone, ces titres ne sont gardés que jusqu\'à la fermeture de l\'appli.';
      T.toast(full || parts[0] || 'Rien n\'a été ajouté', 3800); refresh();
    }).catch(function () { T.toast('L\'ajout a échoué. Réessayez.'); });
  }
  M.addFiles = addFiles;
  function removeTrack(id) {
    if (R.cur === id) stopTrack();
    var m = S(); m.tracks = m.tracks.filter(function (t) { return t.id !== id; });
    m.lists.forEach(function (l) { l.ids = l.ids.filter(function (x) { return x !== id; }); });
    R.order = R.order.filter(function (x) { return x !== id; }); R.ctxIds = R.ctxIds.filter(function (x) { return x !== id; });
    if (m.last && m.last.id === id) m.last = null;
    save(); blobDel(id); refresh();
  }

  /* ---------- Réglages rapides ---------- */
  M.plantPreset = function () {
    var m = S(); m.vol = 0.35; save(); applyVol();
    M.playAmbiance('ruisseau'); M.playAmbiance('oiseaux');
    setAmbVol('ruisseau', 0.5); setAmbVol('oiseaux', 0.35);
    M.sleep(30);
    T.toast('Ambiance douce lancée pour 30 minutes.');
  };

  /* ---------- Interface ---------- */
  var ICO = {
    prev: '<path d="M6 5v14M19 5v14L8 12z"/>', next: '<path d="M18 5v14M5 5v14l11-7z"/>',
    play: '<path d="M7 4.5v15l13-7.5z"/>', pause: '<path d="M7 4h4v16H7zM13 4h4v16h-4z"/>',
    close: '<path d="M5 5l14 14M19 5L5 19"/>', shuffle: '<path d="M3 7h4c4 0 6 10 10 10h3M3 17h4c1.5 0 2.600-1.200 3.600-2.800M13.400 9.200C14.400 8 15.500 7 17 7h3M17 4l3 3-3 3M17 14l3 3-3 3"/>',
    repeat: '<path d="M4 11V9a3 3 0 013-3h12M16 3l3 3-3 3M20 13v2a3 3 0 01-3 3H5M8 21l-3-3 3-3"/>', heart: '<path d="M12 20s-7-4.500-7-10a4 4 0 017-2.600A4 4 0 0119 10c0 5.500-7 10-7 10z"/>',
    wave: '<path d="M3 12h2l2-6 3 12 3-9 2 5 2-2h4"/>', plus: '<path d="M12 5v14M5 12h14"/>', trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    note: '<path d="M9 18V5l11-2v13M9 18a3 3 0 11-3-3 3 3 0 013 3zM20 16a3 3 0 11-3-3 3 3 0 013 3z"/>', up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>'
  };
  function ico(n, fill) { return '<svg class="mu-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="' + (fill ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICO[n] || '') + '</svg>'; }
  function tbtn(act, icon, label, extra, cls) {
    return '<button type="button" class="mu-btn ' + (cls || '') + '" data-act="' + act + '"' + (extra || '') + '>' + ico(icon, icon === 'play' || icon === 'pause') + '<span>' + T.esc(label) + '</span></button>';
  }

  /* Mini-lecteur : barre dans la page, entre le contenu et la barre du bas (jamais cachée par elle). */
  function mini() {
    var m = document.getElementById('musique-mini');
    if (m) return m;
    var app = document.getElementById('app'), tabs = document.getElementById('tabs');
    if (!app || !tabs) return null;
    m = document.createElement('section'); m.id = 'musique-mini'; m.hidden = true; m.setAttribute('aria-label', 'Lecteur de musique');
    app.insertBefore(m, tabs);
    return m;
  }
  function updateMini() {
    var m = mini(); if (!m) return;
    var st = M.state(), onPage = T.cur && T.cur.path === '/musique', modal = T.modalStack && T.modalStack.length > 0;
    var active = !R.closed && (!!R.cur || ambCount() > 0);
    var show = active && !onPage && !modal;
    m.hidden = !show;
    if (!show) return;
    var names = R.ambOrder.map(function (n) { return ambDef(n).nom; }).join(' + ');
    var title = st.title || (names ? 'Ambiance : ' + names : '');
    var h = '<div class="mu-mini-t"><a href="#/musique" class="mu-open" aria-label="Ouvrir le lecteur de musique">' + ico('note') + '<b>' + T.esc(title) + '</b><span class="mu-more">Ouvrir</span></a></div><div class="mu-mini-b">';
    if (R.cur) h += tbtn('muprev', 'prev', 'Avant') + tbtn('mutoggle', st.trackPlaying ? 'pause' : 'play', st.trackPlaying ? 'Pause' : 'Lecture', '', 'big') + tbtn('munext', 'next', 'Suivant');
    else h += tbtn('mutoggle', M.isPlaying() ? 'pause' : 'play', M.isPlaying() ? 'Pause' : 'Lecture', '', 'big');
    h += tbtn('muclose', 'close', 'Fermer', ' aria-label="Fermer et arrêter la musique"') + '</div>';
    m.innerHTML = h;
  }

  function seg(act, items, cur) {
    return '<div class="chips">' + items.map(function (i) { return '<button type="button" class="chip' + (String(cur) === String(i[0]) ? ' on' : '') + '" data-act="' + act + '" data-val="' + T.esc(i[0]) + '" aria-pressed="' + (String(cur) === String(i[0])) + '">' + T.esc(i[1]) + '</button>'; }).join('') + '</div>';
  }
  function slider(id, label, val, input, key) {
    return '<label class="lbl" for="' + id + '"><span id="' + id + '-t">' + T.esc(label) + ' : ' + Math.round(val * 100) + ' %</span></label><input type="range" class="mu-range" id="' + id + '" min="0" max="100" value="' + Math.round(val * 100) + '" data-input="' + input + '"' + (key ? ' data-key="' + key + '"' : '') + ' aria-label="' + T.esc(label) + '">';
  }
  var TABS = [['lecteur', 'Lecteur'], ['musique', 'Ma musique'], ['listes', 'Listes'], ['ambiances', 'Ambiances'], ['reglages', 'Réglages']];
  function tabsHtml() {
    return '<div class="mu-tabs" role="tablist">' + TABS.map(function (t) { return '<button type="button" role="tab" class="chip' + (R.tab === t[0] ? ' on' : '') + '" aria-selected="' + (R.tab === t[0]) + '" data-act="mutab" data-val="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
  }
  function msgHtml() {
    if (!R.msg) return '';
    return '<div class="notice ' + (R.msgBad ? 'warn' : 'ok') + '" role="status">' + T.esc(R.msg) + ' <button type="button" class="chip" data-act="mumsgx">Compris</button></div>';
  }
  function trackRow(t, ctxIds) {
    var cur = R.cur === t.id;
    return '<div class="card mu-track' + (cur ? ' now' : '') + '"><b class="mu-name">' + T.esc(t.nom) + '</b><div class="small muted">' + (t.dur ? fmt(t.dur) + ' - ' : '') + mo(t.taille || 0) + (t.fav ? ' - Favori' : '') + '</div><div class="mu-actions">' +
      tbtn('muplay', cur && R.playing ? 'pause' : 'play', cur && R.playing ? 'Pause' : 'Lire', ' data-id="' + t.id + '"' + (ctxIds ? ' data-ctx="' + ctxIds + '"' : '')) +
      tbtn('mufav', 'heart', t.fav ? 'Retirer des favoris' : 'Favori', ' data-id="' + t.id + '" aria-pressed="' + !!t.fav + '"', t.fav ? 'on' : '') +
      tbtn('muaddto', 'plus', 'Ajouter à une liste', ' data-id="' + t.id + '"') +
      tbtn('mudel', 'trash', 'Supprimer', ' data-id="' + t.id + '"', 'danger') + '</div></div>';
  }
  function viewLecteur() {
    var m = S(), st = M.state(), t = R.cur && track(R.cur), h = '', last = m.last && track(m.last.id);
    h += '<div class="card mu-now"><h2>' + (t ? 'En ce moment' : 'Rien en lecture') + '</h2>';
    if (t) {
      h += '<p class="mu-title">' + T.esc(t.nom) + '</p><input type="range" class="mu-range" id="mu-pos" min="0" max="' + Math.max(1, t.dur || 1) + '" value="0" data-input="museek" aria-label="Position dans le titre"><p class="small muted" id="mu-time">0:00 / ' + fmt(t.dur) + '</p>';
    } else if (!m.tracks.length && !ambCount()) {
      h += '<p>Vous n\'avez pas encore de musique ici. Ajoutez des titres de votre téléphone, ou écoutez les sons du jardin.</p><div class="row"><button type="button" class="btn primary" data-act="mutab" data-val="musique">Ajouter ma musique</button><button type="button" class="btn" data-act="mutab" data-val="ambiances">Sons du jardin</button></div>';
    } else if (last) {
      h += '<p>Dernier titre : <b>' + T.esc(last.nom) + '</b>.</p>';
    } else h += '<p>Choisissez un titre dans « Ma musique », ou appuyez sur Lecture.</p>';
    if (ambCount()) h += '<p class="small">Ambiance en cours : ' + T.esc(R.ambOrder.map(function (n) { return ambDef(n).nom; }).join(' + ')) + '.</p>';
    h += msgHtml();
    h += '<div class="mu-main">' + tbtn('muprev', 'prev', 'Avant') + tbtn('mutoggle', M.isPlaying() ? 'pause' : 'play', M.isPlaying() ? 'Pause' : (!t && last ? 'Reprendre' : 'Lecture'), '', 'big') + tbtn('munext', 'next', 'Suivant') + '</div>';
    h += '<div class="mu-actions">' +
      tbtn('mushuffle', 'shuffle', 'Aléatoire : ' + (m.shuffle ? 'oui' : 'non'), ' aria-pressed="' + m.shuffle + '"', m.shuffle ? 'on' : '') +
      tbtn('murepeat', 'repeat', 'Répéter : ' + ({ none: 'non', one: 'ce titre', all: 'tous' }[m.repeat]), '', m.repeat !== 'none' ? 'on' : '') +
      (t ? tbtn('mufav', 'heart', t.fav ? 'Retirer des favoris' : 'Favori', ' data-id="' + t.id + '" aria-pressed="' + !!t.fav + '"', t.fav ? 'on' : '') : '') + '</div></div>';
    h += '<div class="card"><h2>Minuteur de sommeil</h2><p class="small" id="mu-sleep"></p>' + seg('musleep', [[15, '15 min'], [30, '30 min'], [60, '60 min'], [0, 'Sans minuteur']], R.sleepEnd ? '-' : 0) + '<p class="small muted">Le son baisse doucement avant de s\'arrêter.</p></div>';
    h += plantCard();
    if (R.order.length > 1) {
      h += '<h2>À suivre</h2>' + R.order.slice(0, 40).map(function (id, i) { var x = track(id); return x ? '<button type="button" class="item" data-act="muqueue" data-i="' + i + '"><b>' + T.esc(x.nom) + '</b><i>' + (i === R.qi ? 'En cours' : 'Toucher pour écouter') + '</i></button>' : ''; }).join('');
    }
    return h;
  }
  function plantCard() {
    return '<div class="card"><h2>Musique pour mes plantes</h2><p>Un son doux, à faible volume, pendant 30 minutes, pendant que vous jardinez.</p><button type="button" class="btn primary block" data-act="muplants">Lancer la musique pour mes plantes</button>' +
      '<p class="small muted">Des études ont observé des effets du son sur des plantes, mais les résultats sont discutés et rien n\'est prouvé. Voyez-le surtout comme un moment agréable pour vous.</p></div>';
  }
  function viewMusique() {
    var m = S(), h = msgHtml(), only = R.favOnly, tot = m.tracks.reduce(function (s, t) { return s + (t.taille || 0); }, 0);
    h += '<div class="card"><h2>Ma musique</h2><p>Les fichiers restent sur ce téléphone. Rien n\'est envoyé sur internet.</p>' +
      '<button type="button" class="btn primary block" data-act="muadd">' + ico('plus') + '<span>Ajouter des musiques du téléphone</span></button>' +
      '<p class="small muted">' + m.tracks.length + ' titre' + (m.tracks.length > 1 ? 's' : '') + ', ' + mo(tot) + ' sur ' + mo(LIMITS.octets) + ' au maximum.</p>' +
      (R.volatile ? '<div class="notice warn">La mémoire longue durée n\'est pas disponible ici : vos titres seront gardés seulement jusqu\'à la fermeture de l\'appli.</div>' : '') + '</div>';
    if (m.tracks.length) h += seg('mufilter', [['0', 'Tous'], ['1', 'Favoris']], only ? '1' : '0');
    var arr = m.tracks.filter(function (t) { return !only || t.fav; });
    if (!arr.length) h += '<div class="notice">' + (only ? 'Aucun favori pour le moment. Touchez « Favori » sous un titre.' : 'Aucun titre pour le moment.') + '</div>';
    else h += arr.map(function (t) { return trackRow(t, only ? 'fav' : ''); }).join('');
    return h;
  }
  function viewListes() {
    var m = S(), h = '', L = R.openList;
    if (L) {
      var fav = L === 'fav', l = fav ? { id: 'fav', nom: 'Mes favoris', ids: m.tracks.filter(function (t) { return t.fav; }).map(function (t) { return t.id; }) } : list(L);
      if (!l) { R.openList = null; return viewListes(); }
      h += '<button type="button" class="btn" data-act="mulistback">Retour aux listes</button><div class="card"><h2>' + T.esc(l.nom) + '</h2><p class="small muted">' + l.ids.length + ' titre' + (l.ids.length > 1 ? 's' : '') + '</p><div class="mu-actions">' +
        tbtn('mulistplay', 'play', 'Lire la liste', ' data-id="' + l.id + '"', 'big') + (fav ? '' : tbtn('mulistadd', 'plus', 'Ajouter des titres', ' data-id="' + l.id + '"') + tbtn('mulistren', 'note', 'Renommer', ' data-id="' + l.id + '"') + tbtn('mulistdel', 'trash', 'Supprimer la liste', ' data-id="' + l.id + '"', 'danger')) + '</div></div>';
      if (!l.ids.length) h += '<div class="notice">Cette liste est vide. ' + (fav ? 'Touchez « Favori » sous un titre.' : 'Touchez « Ajouter des titres ».') + '</div>';
      l.ids.forEach(function (id, i) {
        var t = track(id); if (!t) return;
        h += '<div class="card mu-track"><b class="mu-name">' + T.esc(t.nom) + '</b><div class="mu-actions">' + tbtn('muplay', 'play', 'Lire', ' data-id="' + id + '" data-ctx="' + l.id + '"') +
          (fav ? '' : tbtn('mumove', 'up', 'Monter', ' data-l="' + l.id + '" data-i="' + i + '" data-d="-1"' + (i === 0 ? ' disabled' : '')) + tbtn('mumove', 'down', 'Descendre', ' data-l="' + l.id + '" data-i="' + i + '" data-d="1"' + (i === l.ids.length - 1 ? ' disabled' : '')) + tbtn('muremove', 'close', 'Retirer', ' data-l="' + l.id + '" data-id="' + id + '"')) + '</div></div>';
      });
      return h;
    }
    h += '<div class="card"><h2>Nouvelle liste</h2><label class="lbl" for="mu-newl">Nom de la liste</label><input id="mu-newl" class="field" maxlength="40" autocomplete="off" placeholder="Par exemple : Au jardin"><button type="button" class="btn primary block" data-act="mulistnew">Créer la liste</button></div>';
    var nf = m.tracks.filter(function (t) { return t.fav; }).length;
    h += '<button type="button" class="item" data-act="mulistopen" data-id="fav"><b>Mes favoris</b><i>' + nf + ' titre' + (nf > 1 ? 's' : '') + '</i></button>';
    h += m.lists.map(function (l) { return '<button type="button" class="item" data-act="mulistopen" data-id="' + l.id + '"><b>' + T.esc(l.nom) + '</b><i>' + l.ids.length + ' titre' + (l.ids.length > 1 ? 's' : '') + ' - toucher pour ouvrir</i></button>'; }).join('');
    if (!m.lists.length) h += '<div class="notice">Vous n\'avez pas encore de liste. Créez-en une ci-dessus.</div>';
    return h;
  }
  function viewAmbiances() {
    var h = '<div class="notice">Ces sons sont fabriqués par votre téléphone : ils marchent sans internet. Vous pouvez en mélanger 2 à la fois, avec un titre de votre musique.</div>';
    h += AMBS.map(function (a) {
      var on = !!R.amb[a.id];
      return '<div class="card mu-amb' + (on ? ' now' : '') + '"><h3>' + T.esc(a.nom) + '</h3><p class="small muted">' + T.esc(a.d) + '</p>' +
        '<button type="button" class="btn ' + (on ? 'danger' : 'primary') + ' block" data-act="muamb" data-id="' + a.id + '" aria-pressed="' + on + '">' + (on ? 'Arrêter : ' : 'Écouter : ') + T.esc(a.nom) + '</button>' +
        slider('mu-av-' + a.id, 'Volume', ambVol(a.id), 'muambvol', a.id) + '</div>';
    }).join('');
    if (ambCount()) h += '<button type="button" class="btn block" data-act="muambstop">Arrêter toutes les ambiances</button>';
    return h + plantCard();
  }
  function viewReglages() {
    var m = S();
    return '<div class="card"><h2>Volume</h2>' + slider('mu-vol', 'Volume général', m.vol, 'muvol') + '<p class="small muted">Le volume du téléphone reste réglé avec ses boutons.</p></div>' +
      '<div class="card"><h2>Minuteur de sommeil</h2><p class="small" id="mu-sleep"></p>' + seg('musleep', [[15, '15 min'], [30, '30 min'], [60, '60 min'], [0, 'Sans minuteur']], R.sleepEnd ? '-' : 0) + '<h3>Durée du fondu</h3><p class="small muted">Le son baisse doucement pendant ce temps avant l\'arrêt.</p>' + seg('mufondu', [[5, '5 secondes'], [15, '15 secondes'], [30, '30 secondes']], m.fondu) + '</div>' +
      '<div class="card"><h2>Écran éteint</h2><p>La musique continue écran éteint grâce à la lecture du téléphone. Selon la marque, Android peut l\'arrêter pour économiser la batterie : si cela arrive, retirez Tifa Nature des applis en économie d\'énergie dans les réglages du téléphone.</p></div>' + plantCard();
  }
  T.route(/^\/musique$/, 'plus', function () {
    if (T.query && T.query.t && TABS.some(function (x) { return x[0] === T.query.t; })) R.tab = T.query.t;
    var body;
    try { body = R.tab === 'musique' ? viewMusique() : R.tab === 'listes' ? viewListes() : R.tab === 'ambiances' ? viewAmbiances() : R.tab === 'reglages' ? viewReglages() : viewLecteur(); }
    catch (e) { if (window.console) console.error(e); body = '<div class="notice warn">Cet écran n\'a pas pu s\'afficher. Changez d\'onglet.</div>'; }
    return {
      title: 'Musique', html: '<div class="hero"><h2>Musique</h2><p>Votre musique et les sons du jardin.</p></div>' + tabsHtml() + '<div class="mu-body">' + body + '</div>',
      after: function () {
        updateMini(); updateSleepText(); onTime();
        if (R.tab === 'ambiances' && !R.sugg && !M.isPlaying() && T.feuille && T.feuille.isOn && T.feuille.isOn()) {
          R.sugg = true; try { T.feuille.say('Je mets une ambiance de pluie ? Touchez « Écouter : Pluie douce ».', 'doux'); } catch (e) {}
        }
        var p = document.getElementById('mu-pos');
        if (p) { p.addEventListener('touchstart', function () { p.__drag = true; }, { passive: true }); p.addEventListener('touchend', function () { p.__drag = false; }); p.addEventListener('change', function () { p.__drag = false; }); }
      }
    };
  });

  /* ---------- Actions ---------- */
  var A = T.act, I = T.input;
  A.mutab = function (el) { R.tab = el.getAttribute('data-val') || 'lecteur'; R.msg = ''; T.render(); };
  A.mumsgx = function () { R.msg = ''; refresh(); };
  A.mutoggle = function () { M.toggle(); };
  A.muprev = function () { M.prev(); };
  A.munext = function () { M.next(); };
  A.muclose = function () { M.close(); };
  A.muplay = function (el) {
    var id = el.getAttribute('data-id'), c = el.getAttribute('data-ctx');
    if (R.cur === id && R.playing) return M.pause();
    if (R.cur === id && R.el && R.el.getAttribute('src')) return M.toggle();
    var ids = null;
    if (c === 'fav') ids = S().tracks.filter(function (t) { return t.fav; }).map(function (t) { return t.id; });
    else if (c) { var l = list(c); if (l) ids = l.ids.slice(); }
    M.play(id, ids);
  };
  A.muqueue = function (el) { var i = parseInt(el.getAttribute('data-i'), 10); if (R.order[i]) { R.qi = i; loadAndPlay(R.order[i], 0, true); } };
  A.mufav = function (el) { var t = track(el.getAttribute('data-id')); if (t) { t.fav = !t.fav; save(); T.toast(t.fav ? 'Ajouté aux favoris.' : 'Retiré des favoris.'); refresh(); } };
  A.mufilter = function (el) { R.favOnly = el.getAttribute('data-val') === '1'; T.render(true); };
  A.mushuffle = function () { var m = S(); m.shuffle = !m.shuffle; save(); if (R.cur) buildOrder(R.ctxIds.length ? R.ctxIds : allIds(), R.cur); refresh(); };
  A.murepeat = function () { var m = S(), o = ['all', 'one', 'none']; m.repeat = o[(o.indexOf(m.repeat) + 1) % 3]; save(); refresh(); };
  A.musleep = function (el) { var v = parseInt(el.getAttribute('data-val'), 10) || 0; M.sleep(v); T.toast(v ? 'La musique s\'arrêtera dans ' + v + ' minutes.' : 'Minuteur arrêté.'); };
  A.mufondu = function (el) { S().fondu = parseInt(el.getAttribute('data-val'), 10) || 15; save(); refresh(); };
  A.muplants = function () { M.plantPreset(); };
  A.muamb = function (el) { var id = el.getAttribute('data-id'); if (R.amb[id]) M.stopAmbiance(id); else M.playAmbiance(id); };
  A.muambstop = function () { M.stopAll(); };
  I.muvol = function (el) { var v = clamp(el.value, 0, 100) / 100; S().vol = v; save(); applyVol(); var t = document.getElementById('mu-vol-t'); if (t) t.textContent = 'Volume général : ' + Math.round(v * 100) + ' %'; };
  I.muambvol = function (el) { var k = el.getAttribute('data-key'), v = clamp(el.value, 0, 100) / 100; setAmbVol(k, v); var t = document.getElementById(el.id + '-t'); if (t) t.textContent = 'Volume : ' + Math.round(v * 100) + ' %'; };
  I.museek = function (el) { try { if (R.el && isFinite(R.el.duration)) R.el.currentTime = clamp(el.value, 0, R.el.duration); } catch (e) {} };

  var inp = null;
  A.muadd = function () {
    if (!inp) {
      inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = 'audio/*'; inp.id = 'mu-file'; inp.hidden = true; inp.setAttribute('aria-hidden', 'true'); inp.tabIndex = -1;
      inp.addEventListener('change', function () { var f = Array.prototype.slice.call(inp.files || []); inp.value = ''; addFiles(f); });
      document.body.appendChild(inp);
    }
    inp.click();
  };
  A.mudel = function (el) {
    var t = track(el.getAttribute('data-id')); if (!t) return;
    T.confirm('Supprimer ce titre ?', '« ' + t.nom + ' » sera effacé de ce téléphone. Votre fichier d\'origine n\'est pas touché.', 'Supprimer', function () { removeTrack(t.id); T.toast('Titre supprimé.'); }, true);
  };
  function newList(nom) {
    nom = String(nom || '').replace(/\s+/g, ' ').trim().slice(0, 40); if (!nom) return null;
    var l = { id: 'l' + T.uid(), nom: nom, ids: [] }; S().lists.push(l); save(); return l;
  }
  A.mulistnew = function () {
    var f = document.getElementById('mu-newl'), l = newList(f && f.value);
    if (!l) { T.toast('Écrivez d\'abord un nom pour la liste.'); return; }
    R.openList = l.id; refresh(); T.toast('Liste créée.');
  };
  A.mulistopen = function (el) { R.openList = el.getAttribute('data-id'); T.render(); };
  A.mulistback = function () { R.openList = null; T.render(); };
  A.mulistplay = function (el) {
    var id = el.getAttribute('data-id'), ids = id === 'fav' ? S().tracks.filter(function (t) { return t.fav; }).map(function (t) { return t.id; }) : (list(id) || { ids: [] }).ids.slice();
    if (!ids.length) { T.toast('Cette liste est vide.'); return; }
    var start = ids[0]; if (S().shuffle) start = ids[Math.floor(Math.random() * ids.length)];
    M.play(start, ids);
  };
  A.mulistdel = function (el) {
    var l = list(el.getAttribute('data-id')); if (!l) return;
    T.confirm('Supprimer la liste ?', 'La liste « ' + l.nom + ' » sera supprimée. Vos titres restent dans « Ma musique ».', 'Supprimer', function () { var m = S(); m.lists = m.lists.filter(function (x) { return x.id !== l.id; }); R.openList = null; save(); refresh(); }, true);
  };
  A.mulistren = function (el) {
    var l = list(el.getAttribute('data-id')); if (!l) return;
    T.modal({ title: 'Renommer la liste', html: '<label class="lbl" for="mu-ren">Nouveau nom</label><input id="mu-ren" class="field" maxlength="40" autocomplete="off" value="' + T.esc(l.nom) + '">', buttons: [{ label: 'Annuler' }, { label: 'Enregistrer', primary: true, onClick: function () {
      var v = String((document.getElementById('mu-ren') || {}).value || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      if (!v) { T.toast('Le nom ne peut pas être vide.'); return false; }
      l.nom = v; save(); setTimeout(refresh, 0);
    } }] });
  };
  A.mumove = function (el) {
    var l = list(el.getAttribute('data-l')), i = parseInt(el.getAttribute('data-i'), 10), d = parseInt(el.getAttribute('data-d'), 10), j = i + d;
    if (!l || j < 0 || j >= l.ids.length) return;
    var x = l.ids[i]; l.ids[i] = l.ids[j]; l.ids[j] = x; save(); refresh();
  };
  A.muremove = function (el) { var l = list(el.getAttribute('data-l')); if (!l) return; l.ids = l.ids.filter(function (x) { return x !== el.getAttribute('data-id'); }); save(); refresh(); };
  A.mulistadd = function (el) {
    var l = list(el.getAttribute('data-id')); if (!l) return;
    var m = S();
    function body() {
      if (!m.tracks.length) return '<p>Vous n\'avez pas encore de titres. Ajoutez-en dans « Ma musique ».</p>';
      return m.tracks.map(function (t) { var inL = l.ids.indexOf(t.id) >= 0; return '<div class="card mu-pick"><b class="mu-name">' + T.esc(t.nom) + '</b><button type="button" class="btn ' + (inL ? '' : 'primary') + ' block" data-act="mupick" data-l="' + l.id + '" data-id="' + t.id + '">' + (inL ? 'Retirer de la liste' : 'Ajouter à la liste') + '</button></div>'; }).join('');
    }
    R.picker = T.modal({ title: 'Ajouter à « ' + l.nom + ' »', html: body(), buttons: [{ label: 'Terminé', primary: true, onClick: function () { setTimeout(refresh, 0); } }] });
    R.picker.__body = body;
  };
  A.mupick = function (el) {
    var l = list(el.getAttribute('data-l')), id = el.getAttribute('data-id'); if (!l) return;
    var i = l.ids.indexOf(id); if (i >= 0) l.ids.splice(i, 1); else l.ids.push(id);
    save(); if (R.picker && R.picker.__body && R.picker.el.parentNode) { var m = S(); R.picker.setBody(R.picker.__body()); }
  };
  A.muaddto = function (el) {
    var id = el.getAttribute('data-id'), t = track(id); if (!t) return;
    var m = S();
    function body() {
      var h = m.lists.map(function (l) { var inL = l.ids.indexOf(id) >= 0; return '<button type="button" class="btn ' + (inL ? '' : 'primary') + ' block mu-gap" data-act="mupick" data-l="' + l.id + '" data-id="' + id + '">' + (inL ? 'Retirer de : ' : 'Ajouter à : ') + T.esc(l.nom) + '</button>'; }).join('');
      if (!m.lists.length) h = '<p>Vous n\'avez pas encore de liste. Créez-en une ici.</p>';
      return h + '<label class="lbl" for="mu-newl2">Nouvelle liste</label><input id="mu-newl2" class="field" maxlength="40" autocomplete="off" placeholder="Nom de la liste"><button type="button" class="btn block mu-gap" data-act="mucreateadd" data-id="' + id + '">Créer la liste et y ajouter ce titre</button>';
    }
    R.picker = T.modal({ title: 'Ajouter « ' + t.nom + ' » à une liste', html: body(), buttons: [{ label: 'Terminé', primary: true, onClick: function () { setTimeout(refresh, 0); } }] });
    R.picker.__body = body;
  };
  A.mucreateadd = function (el) {
    var f = document.getElementById('mu-newl2'), l = newList(f && f.value);
    if (!l) { T.toast('Écrivez d\'abord un nom pour la liste.'); return; }
    l.ids.push(el.getAttribute('data-id')); save(); if (R.picker) R.picker.setBody(R.picker.__body()); T.toast('Liste créée.');
  };

  /* ---------- Démarrage : branchements ---------- */
  function boot() {
    mini();
    try { var r0 = T.render; if (r0 && !r0.__mu) { T.render = function () { var x = r0.apply(this, arguments); updateMini(); return x; }; T.render.__mu = true; } } catch (e) {}
    window.addEventListener('hashchange', function () { setTimeout(updateMini, 0); });
    var mr = document.getElementById('modal-root');
    if (mr && window.MutationObserver) new MutationObserver(function () { updateMini(); }).observe(mr, { childList: true });
    /* Le son reprend après une interruption dès qu'on touche l'écran. */
    document.addEventListener('click', function () {
      try { if (R.ctx && R.ctx.state === 'suspended' && ambCount() && !R.ambPaused) R.ctx.resume(); } catch (e) {}
    }, true);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { updateMini(); try { if (R.el && R.playing && R.el.paused) { R.playing = false; refresh(); } } catch (e) {} } });
    /* Baisse la musique pendant que la voix parle. */
    try {
      var V = T.voice;
      if (V && V.speak && !V.speak.__mu) {
        var orig = V.speak;
        V.speak = function () {
          var p, on = M.isPlaying(); if (on) M.duck(true);
          try { p = orig.apply(V, arguments); } catch (e) { if (on) M.duck(false); throw e; }
          var done = function () { if (on) { on = false; M.duck(false); } };
          if (p && p.then) p.then(done, done); else done();
          return p;
        };
        V.speak.__mu = true;
      }
    } catch (e) {}
    setSession();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 0); }); else setTimeout(boot, 0);
})();
