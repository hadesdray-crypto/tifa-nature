/* Tifa Nature - « Planning » : les gestes de la semaine (arrosages, gestes du mois, semis, tâches perso).
   Tout est visible dans l'application : aucune notification système, aucune permission en plus. */
(function () {
  'use strict';
  var T = window.T, PL = T.planning = {};
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var REP = { none: 'Une seule fois', week: 'Chaque semaine', month: 'Chaque mois' };

  /* ---------- Dates (texte AAAA-MM-JJ, heure locale) ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0);
    return (d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]) ? d : null;
  }
  function today() { return ymd(new Date()); }
  function addDays(s, n) { var d = parse(s) || new Date(); d.setDate(d.getDate() + n); return ymd(d); }
  function addMonth(s) {
    var d = parse(s) || new Date(), day = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + 1);
    var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last)); return ymd(d);
  }
  function diffDays(a, b) { return Math.round((parse(a).getTime() - parse(b).getTime()) / 86400000); }
  function endOfWeek() { var d = new Date(), dow = (d.getDay() + 6) % 7; return addDays(ymd(d), 6 - dow); }
  PL.today = today; PL.addDays = addDays;
  PL.label = function (s) {
    var d = parse(s); if (!d) return '';
    var n = diffDays(s, today());
    if (n === 0) return 'Aujourd\'hui'; if (n === 1) return 'Demain'; if (n === -1) return 'Hier';
    return JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + T.MOIS[d.getMonth()].toLowerCase();
  };

  /* ---------- Données (lecture défensive : ancien stockage sans ces champs) ---------- */
  function st() {
    var s = T.store.s;
    if (!Array.isArray(s.tasks)) s.tasks = [];
    if (!s.planAuto || typeof s.planAuto !== 'object' || Array.isArray(s.planAuto)) s.planAuto = {};
    return s;
  }
  function monthKey() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }

  /* Tâches automatiques : calculées à chaque affichage, seul l'état (fait / reporté) est gardé. */
  function autoTasks() {
    var s = st(), out = [], t0 = today(), limit = addDays(t0, 6), mk = monthKey(), eow = endOfWeek();
    function push(o) {
      var a = s.planAuto[o.key] || {};
      o.auto = true; o.done = !!a.done; if (a.date) o.date = a.date;
      if (o.kind === 'eau' && !o.done && o.date > limit) return;      /* arrosage trop lointain : pas encore affiché */
      out.push(o);
    }
    /* (a) arrosages à faire d'après « Mes pots » */
    if (T.pots && T.pots.all) T.pots.all().forEach(function (pot) {
      var w = T.pots.waterInfo(pot); if (!w || !pot.arrose) return;
      push({ key: 'eau:' + pot.id + ':' + pot.arrose, kind: 'eau', titre: 'Arroser : ' + (pot.surnom || pot.nom), detail: 'Touchez la terre avant d\'arroser. En général tous les ' + w.every + ' jours.', date: ymd(new Date(pot.arrose + w.every * 86400000)), plantId: pot.plantId, potId: pot.id, href: '#/pots' });
    });
    /* (b) gestes du mois, adaptés à la région */
    var R = T.region, L = T.learn, m = T.monthNow();
    var cm = L && L.month ? (L.month(R ? R.refMonth(m) : m) || L.month(m)) : null;
    if (cm) (cm.aFaire || []).slice(0, 4).forEach(function (g, i) {
      push({ key: 'geste:' + mk + ':' + i, kind: 'geste', titre: g, detail: 'Geste du mois de ' + cm.nom.toLowerCase() + '.', date: eow, href: '#/calendrier' });
    });
    /* (c) semis et plantations du mois pour les plantes de mes pots */
    var mine = {};
    (T.pots && T.pots.all ? T.pots.all() : []).forEach(function (pot) { if (pot.plantId) mine[pot.plantId] = true; });
    if (R) [['semis', 'Semer'], ['plantation', 'Planter']].forEach(function (k) {
      R.plantsNow(k[0], m).forEach(function (p) {
        if (!mine[p.id]) return;
        push({ key: (k[0] === 'semis' ? 'sem:' : 'plt:') + mk + ':' + p.id, kind: k[0], titre: k[1] + ' : ' + p.nom, detail: 'C\'est le bon moment dans votre région pour cette plante de vos pots.', date: eow, plantId: p.id, href: '#/plante/' + p.id });
      });
    });
    return out;
  }
  function persoTasks() {
    return st().tasks.filter(function (t) { return t && t.id && t.titre && parse(t.date); }).map(function (t) {
      return { key: 'p:' + t.id, auto: false, kind: 'perso', id: t.id, titre: t.titre, date: t.date, rep: t.rep || 'none', plantId: t.plantId || '', done: !!t.done, doneAt: t.doneAt || '', detail: '' };
    });
  }
  PL.all = function () { return autoTasks().concat(persoTasks()); };
  function byKey(k) { var a = PL.all(); for (var i = 0; i < a.length; i++) if (a[i].key === k) return a[i]; return null; }
  function sortFn(a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : a.titre.localeCompare(b.titre, 'fr')); }

  /* Pour l'accueil : nombre de tâches du jour + en retard, et les n premières. */
  PL.todayCount = function () {
    try { var t0 = today(); return PL.all().filter(function (x) { return !x.done && x.date <= t0; }).length; } catch (e) { return 0; }
  };
  PL.top = function (n) {
    try {
      var t0 = today();
      return PL.all().filter(function (x) { return !x.done; }).sort(sortFn).slice(0, n || 3).map(function (x) {
        return { key: x.key, titre: x.titre, date: x.date, label: PL.label(x.date), late: x.date < t0, today: x.date === t0, href: '#/planning' };
      });
    } catch (e) { return []; }
  };

  /* ---------- Actions sur les tâches ---------- */
  function prune() {
    var s = st(), live = {}, keep = [];
    autoTasks().forEach(function (x) { live[x.key] = 1; });
    Object.keys(s.planAuto).forEach(function (k) { if (!live[k]) delete s.planAuto[k]; });
    var done = s.tasks.filter(function (t) { return t.done; }).sort(function (a, b) { return a.doneAt < b.doneAt ? 1 : -1; }).slice(0, 30);
    s.tasks.forEach(function (t) { if (!t.done || done.indexOf(t) >= 0) keep.push(t); });
    s.tasks = keep.slice(-300);
  }
  function persoRaw(id) { var a = st().tasks; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  function nextDate(t) {
    var d = t.date, t0 = today(), n = 0;
    do { d = t.rep === 'month' ? addMonth(d) : addDays(d, 7); n++; } while (d <= t0 && n < 120);
    return d;
  }
  function done(k) {
    var x = byKey(k); if (!x) return;
    var s = st();
    if (x.auto) {
      if (x.kind === 'eau') { var pot = T.pots.all().filter(function (p) { return p.id === x.potId; })[0]; if (pot) pot.arrose = Date.now(); }
      else s.planAuto[x.key] = { done: today() };
    } else {
      var t = persoRaw(x.id); if (!t) return;
      t.done = true; t.doneAt = today();
      if (t.rep === 'week' || t.rep === 'month') {
        var nt = { id: T.uid(), titre: t.titre, date: nextDate(t), rep: t.rep, plantId: t.plantId || '', done: false, doneAt: '' };
        t.next = nt.id; s.tasks.push(nt);
      }
    }
    prune(); T.store.save(); T.toast('C\'est fait.'); T.render(true);
  }
  function later(k, days) {
    var x = byKey(k); if (!x) return;
    var base = days === 1 ? today() : (x.date > today() ? x.date : today()), nd = addDays(base, days);
    if (x.auto) st().planAuto[x.key] = { date: nd };
    else { var t = persoRaw(x.id); if (t) t.date = nd; }
    T.store.save(); T.toast('Reporté : ' + PL.label(nd).toLowerCase() + '.'); T.render(true);
  }
  function undo(k) {
    var x = byKey(k); if (!x) return;
    if (x.auto) delete st().planAuto[x.key];
    else {
      var t = persoRaw(x.id); if (!t) return;
      t.done = false; t.doneAt = '';
      if (t.next) { var n = persoRaw(t.next); if (n && !n.done) st().tasks = st().tasks.filter(function (y) { return y !== n; }); delete t.next; }
    }
    T.store.save(); T.render(true);
  }
  function kOf(el) { return el.getAttribute('data-k') || ''; }
  T.act.ptdone = function (el) { done(kOf(el)); };
  T.act.ptlater1 = function (el) { later(kOf(el), 1); };
  T.act.ptlater7 = function (el) { later(kOf(el), 7); };
  T.act.ptundo = function (el) { undo(kOf(el)); };
  T.act.ptdel = function (el) {
    var x = byKey(kOf(el)); if (!x || x.auto) return;
    T.confirm('Supprimer cette tâche ?', 'La tâche « ' + x.titre + ' » sera supprimée' + (x.rep !== 'none' ? ', ainsi que sa répétition' : '') + '.', 'Supprimer', function () {
      var s = st(); s.tasks = s.tasks.filter(function (t) { return t.id !== x.id; }); T.store.save(); T.toast('Tâche supprimée.'); T.render(true);
    }, true);
  };

  /* Ajout d'une tâche perso */
  PL.add = function (o) {
    var titre = String(o.titre || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!titre) return 'Écrivez ce qu\'il faut faire.';
    if (!parse(o.date)) return 'Choisissez une date.';
    var s = st(); if (s.tasks.length >= 300) return 'Trop de tâches : supprimez-en quelques-unes.';
    s.tasks.push({ id: T.uid(), titre: titre, date: o.date, rep: REP[o.rep] ? o.rep : 'none', plantId: (o.plantId && T.plante(o.plantId)) ? o.plantId : '', done: false, doneAt: '' });
    T.store.save(); return '';
  };
  T.act.ptadd = function () {
    var plants = T.D.plantes.slice().sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
    var html = '<label class="lbl" for="pl-titre" style="margin-top:0">Quoi faire ?</label><input id="pl-titre" class="field" maxlength="80" autocomplete="off" placeholder="Par exemple : rempoter le basilic">' +
      '<label class="lbl" for="pl-date">Pour quel jour ?</label><input id="pl-date" class="field" type="date" value="' + today() + '">' +
      '<label class="lbl" for="pl-rep">Répéter ?</label><select id="pl-rep" class="field"><option value="none">Une seule fois</option><option value="week">Chaque semaine</option><option value="month">Chaque mois</option></select>' +
      '<label class="lbl" for="pl-plante">Plante concernée (facultatif)</label><select id="pl-plante" class="field"><option value="">Aucune</option>' + plants.map(function (p) { return '<option value="' + T.esc(p.id) + '">' + T.esc(p.nom) + '</option>'; }).join('') + '</select>';
    T.modal({
      title: 'Nouvelle tâche', html: html, focus: true,
      buttons: [{ label: 'Annuler' }, {
        label: 'Ajouter', primary: true, onClick: function () {
          var err = PL.add({ titre: document.getElementById('pl-titre').value, date: document.getElementById('pl-date').value, rep: document.getElementById('pl-rep').value, plantId: document.getElementById('pl-plante').value });
          if (err) { T.toast(err); return false; }
          T.toast('Tâche ajoutée.'); T.render(true); return true;
        }
      }]
    });
  };

  /* ---------- Affichage ---------- */
  function taskCard(x, late) {
    var p = x.plantId ? T.plante(x.plantId) : null, meta = [];
    if (!x.done) meta.push(late ? 'En retard : ' + PL.label(x.date).toLowerCase() : PL.label(x.date));
    else meta.push('Fait' + (x.doneAt ? ' le ' + PL.label(x.doneAt).toLowerCase() : ''));
    if (x.rep && x.rep !== 'none') meta.push(REP[x.rep]);
    if (x.auto) meta.push('Proposé par l\'application');
    var h = '<div class="card task' + (late ? ' late' : '') + (x.done ? ' is-done' : '') + '" data-key="' + T.esc(x.key) + '"><h3>' + T.esc(x.titre) + '</h3><p class="small muted task-meta">' + T.esc(meta.join(' - ')) + '</p>';
    if (x.detail && !x.done) h += '<p class="small">' + T.esc(x.detail) + '</p>';
    if (p) h += '<p class="small"><a href="#/plante/' + T.esc(p.id) + '">Fiche : ' + T.esc(p.nom) + '</a></p>';
    h += '<div class="row task-actions">';
    if (!x.done) {
      h += '<button class="btn primary" data-act="ptdone" data-k="' + T.esc(x.key) + '">Fait</button>' +
        '<button class="btn" data-act="ptlater1" data-k="' + T.esc(x.key) + '">Reporter à demain</button>' +
        '<button class="btn" data-act="ptlater7" data-k="' + T.esc(x.key) + '">Reporter d\'une semaine</button>';
    } else h += '<button class="btn" data-act="ptundo" data-k="' + T.esc(x.key) + '">Remettre à faire</button>';
    if (!x.auto) h += '<button class="btn danger" data-act="ptdel" data-k="' + T.esc(x.key) + '">Supprimer</button>';
    return h + '</div></div>';
  }
  function section(title, list, late) {
    if (!list.length) return '';
    return '<h2 class="plan-h">' + T.esc(title) + ' <span class="tag' + (late ? ' bad' : '') + '">' + list.length + '</span></h2>' + list.map(function (x) { return taskCard(x, late); }).join('');
  }
  PL.groups = function () {
    var t0 = today(), wk = addDays(t0, 6), all = PL.all(), g = { late: [], today: [], week: [], later: [], done: [] };
    all.forEach(function (x) {
      if (x.done) g.done.push(x);
      else if (x.date < t0) g.late.push(x); else if (x.date === t0) g.today.push(x); else if (x.date <= wk) g.week.push(x); else g.later.push(x);
    });
    Object.keys(g).forEach(function (k) { g[k].sort(sortFn); });
    g.done.sort(function (a, b) { return (a.doneAt || '') < (b.doneAt || '') ? 1 : -1; });
    g.done = g.done.slice(0, 10);
    return g;
  };

  T.route(/^\/planning$/, 'accueil', function () {
    var g = PL.groups(), R = T.region, reg = R ? R.current() : null, n = g.late.length + g.today.length + g.week.length + g.later.length;
    var h = '<div class="hero"><h2>Planning</h2><p>Les gestes de la semaine pour vos pots et votre cour. Les rappels sont visibles ici, dans l\'application.</p></div>';
    h += '<div class="row" style="margin-bottom:.8rem"><button class="btn primary grow" data-act="ptadd">Ajouter une tâche</button><button class="btn grow" data-act="regionpick">' + (reg ? 'Ma région : ' + T.esc(reg.nom) : 'Choisir ma région') + '</button></div>';
    if (!reg) h += '<div class="notice small">Choisissez votre région pour que les semis et plantations proposés tombent au bon moment.</div>';
    if (g.late.length) h += '<div class="notice warn"><b>' + g.late.length + ' tâche' + (g.late.length > 1 ? 's' : '') + ' en retard.</b></div>';
    if (!n) h += '<div class="card"><h3>Rien à faire pour le moment</h3><p>Ajoutez une tâche, ou ajoutez des pots dans « Mes pots » pour recevoir des rappels d\'arrosage.</p><a class="btn block" href="#/pots">Aller à Mes pots</a></div>';
    h += section('En retard', g.late, true) + section('Aujourd\'hui', g.today) + section('Cette semaine', g.week) + section('Plus tard', g.later) + section('Fait', g.done);
    return { title: 'Planning', html: h };
  });
})();
