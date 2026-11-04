/* Tifa Nature - Météo du jardinier : prévisions sur 7 jours (Open-Meteo), alertes gel, chaleur, pluie, vent et mildiou.
   Vie privée : SEUL le nom de commune tapé est envoyé (jamais de position GPS). Rien d'autre n'est transmis.
   Hors connexion : la dernière prévision enregistrée (T.store.s.meteo) est affichée avec sa date. ES5. */
(function () {
  'use strict';
  var T = window.T, M = T.meteo = {};

  /* ---------- Réglages (modifiables par les tests) ---------- */
  M.timeout = 8000;                                                   /* délai maximal total d'un appel réseau, en ms */
  M.GEO = 'https://geocoding-api.open-meteo.com/v1/search';
  M.FC = 'https://api.open-meteo.com/v1/forecast';
  var SEUIL_GEL = 2, SEUIL_CHALEUR = 32, SEUIL_PLUIE = 20, SEUIL_VENT = 50;   /* °C, °C, mm par jour, km/h */
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  /* Plantes (ids des fiches) qui craignent le gel, parmi celles qui vivent dehors */
  var FRILEUSES = ['tomate', 'tomate-cerise', 'courgette', 'poivron', 'piment', 'aubergine', 'concombre', 'haricot-nain', 'haricot-grimpant', 'basilic', 'coriandre', 'aneth',
    'citronnier', 'figuier', 'geranium', 'petunia', 'begonia', 'impatiens', 'dahlia', 'capucine', 'tagete', 'laurier-rose', 'jasmin-etoile', 'hibiscus-jardin', 'agapanthe', 'echeveria', 'kalanchoe', 'rosier-pot'];

  /* État de l'écran (en mémoire) : view = { busy, msg, kind, cands, data, from } */
  var V = M.view = { busy: false, msg: '', kind: '', cands: null, data: null, from: '', query: '' }, token = 0;

  /* ---------- Outils ---------- */
  function fmt(n) { return String(Math.round(n * 10) / 10).replace('.', ','); }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function parseDay(s) {                                              /* « 2026-11-04 » -> Date locale, ou null */
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    return m ? new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)) : null;
  }
  function dayName(s) { var d = parseDay(s); return d ? JOURS[d.getDay()] : '?'; }
  function dayLong(s) { var d = parseDay(s); return d ? JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + T.MOIS[d.getMonth()].toLowerCase() : '?'; }
  function dateTime(ms) {
    var d = new Date(ms); if (isNaN(d.getTime())) return 'une date inconnue';
    var mm = d.getMinutes();
    return d.getDate() + ' ' + T.MOIS[d.getMonth()].toLowerCase() + ' ' + d.getFullYear() + ' à ' + d.getHours() + ' h ' + (mm < 10 ? '0' : '') + mm;
  }
  function todayStr() { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function listFr(arr) { return arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' et ' + arr[arr.length - 1]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------- Réseau en cascade : CapacitorHttp -> fetch -> XHR (délai global M.timeout) ---------- */
  function httpGet(url) {
    var start = Date.now();
    function left() { return M.timeout - (Date.now() - start); }
    function tooLate() { var e = new Error('delai'); e.timeout = true; return e; }
    function parse(status, text) {
      if (status < 200 || status >= 300) { var e = new Error('http ' + status); e.status = status; throw e; }
      try { return JSON.parse(text); } catch (e2) { var e3 = new Error('reponse illisible'); e3.status = 200; e3.invalid = true; throw e3; }
    }
    function viaCap() {
      var H = null; try { H = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp; } catch (e) { H = null; }
      if (!T.native.isNative || !H || !H.get) return Promise.reject(new Error('absent'));
      return new Promise(function (resolve, reject) {
        var done = false, to = setTimeout(function () { done = true; reject(tooLate()); }, Math.max(left(), 1));
        H.get({ url: url, readTimeout: M.timeout, connectTimeout: M.timeout }).then(function (r) {
          if (done) return; done = true; clearTimeout(to);
          try { resolve(parse(r.status, typeof r.data === 'string' ? r.data : JSON.stringify(r.data))); } catch (e) { reject(e); }
        }, function (e) { if (done) return; done = true; clearTimeout(to); reject(e || new Error('reseau')); });
      });
    }
    function viaFetch() {
      if (left() < 300) return Promise.reject(tooLate());
      if (!window.fetch) return Promise.reject(new Error('absent'));
      return new Promise(function (resolve, reject) {
        var done = false, ctl = window.AbortController ? new AbortController() : null;
        var to = setTimeout(function () { done = true; if (ctl) ctl.abort(); reject(tooLate()); }, left());
        fetch(url, { signal: ctl ? ctl.signal : undefined }).then(function (r) { return r.text().then(function (t) { return [r.status, t]; }); }).then(function (a) {
          if (done) return; done = true; clearTimeout(to);
          try { resolve(parse(a[0], a[1])); } catch (e) { reject(e); }
        }, function (e) { if (done) return; done = true; clearTimeout(to); reject(e || new Error('reseau')); });
      });
    }
    function viaXhr() {
      if (left() < 300) return Promise.reject(tooLate());
      return new Promise(function (resolve, reject) {
        var x = new XMLHttpRequest(); x.open('GET', url); x.timeout = left();
        x.onload = function () { try { resolve(parse(x.status, x.responseText)); } catch (e) { reject(e); } };
        x.onerror = function () { reject(new Error('reseau')); };
        x.ontimeout = function () { reject(tooLate()); };
        x.send();
      });
    }
    /* Une vraie réponse du serveur (même mauvaise) ou un délai dépassé arrête la cascade ; une panne de méthode passe à la suivante. */
    function stop(e) { return !!(e && (e.status || e.timeout)); }
    return viaCap().catch(function (e) { if (stop(e)) throw e; return viaFetch(); })
      .catch(function (e) { if (stop(e)) throw e; return viaXhr(); });
  }

  /* ---------- Recherche de la commune et prévisions ---------- */
  M.search = function (name) {
    var url = M.GEO + '?name=' + encodeURIComponent(name) + '&count=5&language=fr&format=json';
    return httpGet(url).then(function (j) {
      var list = (j && j.results) || [], out = [];
      if (!Array.isArray(list)) throw Object.assign(new Error('invalide'), { invalid: true });
      list.forEach(function (r) {
        if (r && typeof r.name === 'string' && isNum(r.latitude) && isNum(r.longitude)) {
          out.push({ name: r.name, admin: typeof r.admin1 === 'string' ? r.admin1 : '', cc: typeof r.country_code === 'string' ? r.country_code : '', lat: r.latitude, lon: r.longitude });
        }
      });
      out.sort(function (a, b) { return (b.cc === 'FR' ? 1 : 0) - (a.cc === 'FR' ? 1 : 0); });   /* communes françaises d'abord (tri stable non requis) */
      return out;
    });
  };
  /* Transforme la réponse en tableau de jours propre ; lève une erreur si inutilisable. */
  M.parseForecast = function (j) {
    var d = j && j.daily, bad = Object.assign(new Error('invalide'), { invalid: true });
    if (!d || !Array.isArray(d.time) || !Array.isArray(d.temperature_2m_min) || !Array.isArray(d.temperature_2m_max)) throw bad;
    var out = [], i, a;
    for (i = 0; i < d.time.length && i < 7; i++) {
      if (!parseDay(d.time[i]) || !isNum(d.temperature_2m_min[i]) || !isNum(d.temperature_2m_max[i])) continue;
      a = function (k) { var v = Array.isArray(d[k]) ? d[k][i] : null; return isNum(v) ? v : null; };
      out.push({ d: String(d.time[i]).slice(0, 10), min: d.temperature_2m_min[i], max: d.temperature_2m_max[i], pluie: a('precipitation_sum'), hum: a('relative_humidity_2m_mean'), vent: a('wind_speed_10m_max') });
    }
    if (!out.length) throw bad;
    return out;
  };
  M.forecast = function (lat, lon) {
    var url = M.FC + '?latitude=' + encodeURIComponent(lat.toFixed(2)) + '&longitude=' + encodeURIComponent(lon.toFixed(2)) +
      '&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max&timezone=auto&forecast_days=7';
    return httpGet(url).then(M.parseForecast);
  };

  /* ---------- Alertes (calcul pur : tableau de jours -> liste d'alertes) ---------- */
  M.alerts = function (days) {
    var out = [], gel = [], chaud = [], pluie = [], vent = [], i, x;
    for (i = 0; i < days.length; i++) {
      x = days[i];
      if (x.min <= SEUIL_GEL) gel.push(x);
      if (x.max >= SEUIL_CHALEUR) chaud.push(x);
      if (x.pluie !== null && x.pluie >= SEUIL_PLUIE) pluie.push(x);
      if (x.vent !== null && x.vent >= SEUIL_VENT) vent.push(x);
    }
    function names(a) { return listFr(a.map(function (y) { return dayName(y.d); })); }
    if (gel.length) {
      var mn = Math.min.apply(null, gel.map(function (y) { return y.min; }));
      out.push({ id: 'gel', level: mn <= 0 ? 'bad' : 'warn', title: 'Alerte gel', when: names(gel),
        text: 'Gel ou risque de gel ' + (gel.length > 1 ? 'les jours suivants' : 'le jour suivant') + ' : ' + names(gel) + ' (minimum ' + fmt(mn) + ' °C).' });
    }
    if (chaud.length) {
      var mx = Math.max.apply(null, chaud.map(function (y) { return y.max; }));
      out.push({ id: 'chaleur', level: 'warn', title: 'Alerte chaleur', when: names(chaud), text: 'Forte chaleur : ' + names(chaud) + ' (jusqu\'à ' + fmt(mx) + ' °C).' });
    }
    if (pluie.length) out.push({ id: 'pluie', level: 'warn', title: 'Alerte forte pluie', when: names(pluie), text: 'Pluie abondante : ' + names(pluie) + ' (20 mm ou plus par jour).' });
    if (vent.length) out.push({ id: 'vent', level: 'warn', title: 'Alerte vent fort', when: names(vent), text: 'Vent fort : ' + names(vent) + ' (50 km/h ou plus).' });
    /* Mildiou : au moins 3 jours de suite doux (moyenne de 10 à 25 °C) et humides (humidité de 80 % ou plus, ou pluie d'au moins 1 mm) */
    var run = [], best = [];
    for (i = 0; i < days.length; i++) {
      x = days[i];
      var moy = (x.min + x.max) / 2, humide = (x.hum !== null && x.hum >= 80) || (x.pluie !== null && x.pluie >= 1);
      if (moy >= 10 && moy <= 25 && humide) { run.push(x); if (run.length > best.length) best = run.slice(); } else run = [];
    }
    if (best.length >= 3) out.push({ id: 'mildiou', level: 'warn', title: 'Alerte mildiou', when: names(best),
      text: 'Temps doux et humide pendant ' + best.length + ' jours (' + names(best) + ') : risque de mildiou sur les tomates, les pommes de terre et la vigne.' });
    return out;
  };

  /* Plantes frileuses de l'utilisateur (depuis Mes pots), sans doublon */
  function myFrail() {
    var pots = (T.store.s.pots || []), seen = {}, out = [];
    pots.forEach(function (p) {
      if (!p || !p.plantId || FRILEUSES.indexOf(p.plantId) < 0) return;
      var pl = T.plante(p.plantId), nm = (pl && pl.nom) || p.nom || p.plantId;
      if (!seen[nm]) { seen[nm] = 1; out.push(nm); }
    });
    return out.slice(0, 12);
  }
  var ADVICE = {
    gel: ['Rentrez les pots de plantes frileuses (tomates, basilic, géraniums, agrumes) dans une pièce lumineuse non chauffée, un garage vitré ou une véranda.',
      'Pour ce qui ne peut pas rentrer : voile d\'hivernage ou vieux drap sur la plante le soir, retiré le matin ; ne laissez pas de plastique collé aux feuilles.',
      'Serrez les pots contre un mur exposé au sud, surélevez-les sur des cales, entourez-les de carton ou de papier bulle.',
      'Paillez la terre (feuilles sèches, paille). N\'arrosez pas juste avant une nuit de gel ; videz les soucoupes pour éviter la glace.'],
    chaleur: ['Arrosez tôt le matin ou tard le soir, au pied, jamais en plein soleil.', 'Déplacez les pots à l\'ombre de l\'après-midi ou posez un voile d\'ombrage.', 'Paillez pour garder la fraîcheur et vérifiez la terre chaque jour avec le doigt.'],
    pluie: ['Videz les soucoupes et vérifiez que les trous de drainage ne sont pas bouchés.', 'Inutile d\'arroser : laissez la terre ressuyer.', 'Abritez les pots de plantes sensibles à l\'humidité (lavande, plantes grasses).'],
    vent: ['Couchez ou calez les grands pots, rentrez les petits et les suspensions.', 'Vérifiez les tuteurs et les attaches des tomates et des plantes grimpantes.'],
    mildiou: ['Arrosez au pied, le matin, sans mouiller les feuilles.', 'Aérez : espacez les plants, enlevez les feuilles du bas, retirez et jetez (pas au compost) les feuilles tachées.', 'Si besoin, un traitement préventif à base de cuivre existe : suivez strictement l\'étiquette du produit.']
  };

  /* Texte court pour l'accueil : alertes à venir du cache, ou '' */
  M.alertText = function () {
    try {
      var c = T.store.s.meteo; if (!c || !Array.isArray(c.daily)) return '';
      var t = todayStr(), days = c.daily.filter(function (x) { return x && typeof x.d === 'string' && x.d >= t && isNum(x.min) && isNum(x.max); });
      if (!days.length) return '';
      var al = M.alerts(days); if (!al.length) return '';
      return al.map(function (a) { return a.title + ' : ' + a.when + '.'; }).join(' ');
    } catch (e) { return ''; }
  };

  /* ---------- Conseils saisonniers de gel (sans réseau) ---------- */
  function seasonTips() {
    var m = T.monthNow();
    if (m >= 11 || m <= 2) return { t: 'En hiver', items: ['Le gel est possible toutes les nuits : rentrez les plantes frileuses (géraniums, agrumes, plantes grasses, aromatiques fragiles).', 'Protégez les pots : papier bulle, voile d\'hivernage, pots surélevés contre un mur.', 'Arrosez très peu, par temps doux, en milieu de journée.'] };
    if (m === 3 || m === 4 || m === 5) return { t: 'Au printemps', items: ['Un gel tardif reste possible jusqu\'à la mi-mai (Saints de glace, du 11 au 13 mai) : attendez avant de sortir tomates, basilic et courgettes.', 'Gardez un voile d\'hivernage à portée de main pour les nuits claires et froides.', 'Rentrez le soir les jeunes plants sortis dans la journée.'] };
    if (m === 9 || m === 10) return { t: 'En automne', items: ['Les premières gelées arrivent souvent fin octobre : récoltez les dernières tomates et courgettes.', 'Préparez la rentrée des plantes frileuses avant les nuits sous 5 °C.', 'Gardez un voile d\'hivernage prêt.'] };
    return { t: 'En été', items: ['Le gel est très peu probable. Pensez plutôt à l\'arrosage et à l\'ombre en cas de forte chaleur.', 'Gardez ces conseils pour l\'automne : premières gelées souvent fin octobre.'] };
  }

  /* ---------- Affichage ---------- */
  function dayCard(x) {
    var cls = x.min <= SEUIL_GEL ? ' gel' : (x.max >= SEUIL_CHALEUR ? ' chaud' : '');
    return '<div class="mt-day' + cls + '"><b>' + T.esc(cap(dayLong(x.d))) + '</b><div class="tags">' +
      '<span class="tag' + (x.min <= SEUIL_GEL ? ' bad' : '') + '">Min ' + fmt(x.min) + ' °C</span>' +
      '<span class="tag' + (x.max >= SEUIL_CHALEUR ? ' warn' : '') + '">Max ' + fmt(x.max) + ' °C</span>' +
      (x.pluie !== null ? '<span class="tag">Pluie ' + fmt(x.pluie) + ' mm</span>' : '') +
      (x.hum !== null ? '<span class="tag">Humidité ' + Math.round(x.hum) + ' %</span>' : '') +
      (x.vent !== null ? '<span class="tag">Vent ' + Math.round(x.vent) + ' km/h</span>' : '') + '</div></div>';
  }
  function alertCards(days) {
    var al = M.alerts(days), h = '';
    if (!al.length) return '<div class="notice ok"><b>Aucune alerte.</b> Pas de gel, de chaleur, de pluie forte, de vent fort ni de risque de mildiou annoncés sur ces jours.</div>';
    al.forEach(function (a) {
      var adv = (ADVICE[a.id] || []).slice(), extra = '';
      if (a.id === 'gel') {
        var mine = myFrail();
        extra = mine.length ? '<p><b>Vos plantes frileuses :</b> ' + T.esc(listFr(mine)) + '.</p>' : '<p class="small muted">Ajoutez vos plantes dans « Mes pots » : l\'application vous dira lesquelles protéger.</p>';
      }
      h += '<div class="notice ' + a.level + ' mt-alert" role="alert"><b>' + T.esc(a.title) + '</b><p>' + T.esc(a.text) + '</p>' + extra + '<ul>' + T.list(adv) + '</ul>' +
        T.voice.button(a.title + '. ' + a.text + ' ' + adv.join(' '), 'Écouter l\'alerte') + '</div>';
    });
    return h;
  }
  function render() {
    var s = T.store.s.meteo, h = '', q = V.query || (s && s.saisie) || '';
    h += '<div class="card mt-search"><h2>Ma commune</h2><p class="muted small">Tapez le nom de votre commune. Seul ce nom est envoyé au service météo Open-Meteo : jamais votre position.</p>' +
      '<label class="lbl" for="meteo-q">Nom de la commune</label><input class="field" id="meteo-q" type="text" maxlength="80" autocomplete="off" autocapitalize="words" enterkeyhint="search" placeholder="Par exemple : Lyon" data-input="meteoq" value="' + T.esc(q) + '">' +
      '<button class="btn primary block" data-act="meteogo"' + (V.busy ? ' disabled' : '') + '>Voir la météo</button>';
    if (s && s.lat !== undefined) h += '<button class="btn block" data-act="meteorefresh"' + (V.busy ? ' disabled' : '') + '>Actualiser pour ' + T.esc(s.ville || 'ma commune') + '</button>';
    h += '</div>';
    if (V.busy) h += '<div class="notice" role="status"><b>Chargement en cours…</b> Cela peut prendre quelques secondes.</div>';
    if (V.msg) h += '<div class="notice ' + (V.kind || 'warn') + '" role="alert">' + T.esc(V.msg) + '</div>';
    if (V.cands && V.cands.length) {
      h += '<div class="card"><h3>Plusieurs communes trouvées</h3><p class="small muted">Touchez la vôtre.</p>';
      V.cands.forEach(function (c, i) {
        h += '<button class="item" data-act="meteopick" data-i="' + i + '"><b>' + T.esc(c.name) + '</b><i>' + T.esc((c.admin ? c.admin + ', ' : '') + (c.cc || '')) + '</i></button>';
      });
      h += '</div>';
    }
    var data = null;
    if (V.data) data = V.data; else if (s && Array.isArray(s.daily) && s.daily.length) data = s.daily;
    if (data) {
      var fromCache = !V.data || V.from === 'cache';
      h += '<h2>Prévisions : ' + T.esc((s && s.ville) || 'ma commune') + '</h2>';
      if (s && s.at) h += '<p class="small muted mt-date">' + (fromCache ? 'Prévision enregistrée le ' : 'Prévision mise à jour le ') + T.esc(dateTime(s.at)) + '.</p>';
      h += alertCards(data) + '<h3>7 jours</h3>' + data.map(dayCard).join('');
      h += '<p class="small muted">Prévisions indicatives. Source : Open-Meteo.</p>';
    } else if (!V.busy && !V.cands) {
      var st = seasonTips();
      h += '<div class="notice">Aucune prévision enregistrée pour l\'instant. Tapez votre commune ci-dessus (internet nécessaire la première fois).</div>' +
        '<div class="card"><h3>Conseils gel sans internet : ' + T.esc(st.t.toLowerCase()) + '</h3><ul>' + T.list(st.items) + '</ul>' + T.voice.button(st.items.join(' '), 'Écouter') + '</div>';
    }
    return h;
  }
  function redraw() { if (T.cur && T.cur.path === '/meteo') { M.redrawing = true; T.render(true); M.redrawing = false; } }

  /* ---------- Actions ---------- */
  function fail(e, my) {
    if (my !== token) return;
    V.busy = false; V.cands = null; V.data = null;
    var s = T.store.s.meteo, hasCache = s && Array.isArray(s.daily) && s.daily.length;
    if (e && e.timeout) V.msg = 'Le service météo met trop de temps à répondre.' + (hasCache ? ' Voici la dernière prévision enregistrée.' : ' Réessayez dans un moment.');
    else if (e && e.invalid) V.msg = 'Le service météo a envoyé une réponse inattendue.' + (hasCache ? ' Voici la dernière prévision enregistrée.' : ' Réessayez plus tard.');
    else if (T.native.online === false) V.msg = 'Pas de connexion internet.' + (hasCache ? ' Voici la dernière prévision enregistrée.' : ' Les prévisions ont besoin d\'internet la première fois.');
    else V.msg = 'La météo n\'a pas pu être récupérée (connexion ou service indisponible).' + (hasCache ? ' Voici la dernière prévision enregistrée.' : ' Réessayez dans un moment.');
    V.kind = 'warn'; V.from = 'cache'; redraw();
  }
  function loadForecast(c, saisie, my) {
    M.forecast(c.lat, c.lon).then(function (days) {
      if (my !== token) return;
      var label = c.name + (c.admin ? ' (' + c.admin + ')' : '');
      T.store.s.meteo = { ville: label, saisie: saisie || c.name, lat: c.lat, lon: c.lon, at: Date.now(), daily: days };
      T.store.save();
      V.busy = false; V.msg = ''; V.cands = null; V.data = days; V.from = 'reseau'; redraw();
    }, function (e) { fail(e, my); });
  }
  function start(my) { V.busy = true; V.msg = ''; V.kind = ''; V.cands = null; V.data = null; V.from = ''; redraw(); }
  function offlineNow(my) {
    return T.native.checkOnline().then(function (on) { return on === false; }, function () { return false; });
  }
  T.input.meteoq = function (el) { V.query = el.value; };
  T.act.meteogo = function () {
    var inp = document.getElementById('meteo-q'), name = ((inp && inp.value) || V.query || '').replace(/\s+/g, ' ').trim();
    V.query = name;
    if (V.busy) return;
    if (!name) { V.msg = 'Tapez d\'abord le nom de votre commune.'; V.kind = 'warn'; V.cands = null; redraw(); return; }
    if (name.length < 2) { V.msg = 'Le nom est trop court. Tapez au moins 2 lettres.'; V.kind = 'warn'; V.cands = null; redraw(); return; }
    var my = ++token; start(my);
    offlineNow().then(function (off) {
      if (my !== token) return;
      if (off) return fail(null, my);
      return M.search(name).then(function (list) {
        if (my !== token) return;
        if (!list.length) { V.busy = false; V.data = null; V.cands = null; V.msg = 'Commune introuvable : « ' + name + ' ». Vérifiez l\'orthographe, ou essayez sans accent.'; V.kind = 'warn'; V.from = 'cache'; return redraw(); }
        if (list.length === 1) return loadForecast(list[0], name, my);
        V.busy = false; V.cands = list; V.pending = name; redraw();
      }, function (e) { fail(e, my); });
    });
  };
  T.act.meteopick = function (el) {
    var c = V.cands && V.cands[parseInt(el.getAttribute('data-i'), 10)]; if (!c || V.busy) return;
    var my = ++token, name = V.pending || V.query; V.query = name; start(my);
    offlineNow().then(function (off) { if (my !== token) return; if (off) return fail(null, my); loadForecast(c, name, my); });
  };
  T.act.meteorefresh = function () {
    var s = T.store.s.meteo; if (!s || V.busy || !isNum(s.lat) || !isNum(s.lon)) return;
    var my = ++token, c = { name: String(s.ville || '').replace(/ \(.*\)$/, ''), admin: (/\((.*)\)$/.exec(s.ville || '') || [0, ''])[1], lat: s.lat, lon: s.lon };
    start(my);
    offlineNow().then(function (off) { if (my !== token) return; if (off) return fail(null, my); loadForecast(c, s.saisie, my); });
  };
  /* Touche Entrée dans le champ */
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.keyCode === 13) && e.target && e.target.id === 'meteo-q') { e.preventDefault(); T.act.meteogo(); }
  });

  T.route(/^\/meteo$/, 'accueil', function () {
    /* Ouverture de l'écran : on repart du cache enregistré. Pendant un simple redessin (redraw), l'état courant est conservé. */
    if (!M.redrawing) { V.data = null; if (!V.busy) { V.msg = ''; V.cands = null; V.from = 'cache'; } }
    M.redrawing = false;
    return { title: 'Météo du jardinier', html: '<div class="hero"><h2>Météo du jardinier</h2><p>Gel, chaleur, pluie, mildiou : ce qu\'il faut savoir pour vos plantes.</p></div>' + render() };
  });
})();
