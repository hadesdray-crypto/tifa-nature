/* Tifa Nature - molette des voix : on fait défiler, la voix se fait entendre tout de suite.
   Même fonctionnement que dans les autres applis : voix de fille / de garçon, deux colonnes
   (sans connexion / avec connexion), grave-aigu et vitesse dans le même cadran, bouton « Garder cette voix ». */
(function () {
  'use strict';
  var T = window.T, V = T.voice, IH = 44;
  var MALE = /frb|frd|male|homme|paul|henri|thomas|antoine|nicolas|louis|bertrand|guillaume|claude|jean|mathieu|remy|rémy|bernard|yannick|lucas|hugo/i;
  function isM(v) { return MALE.test(v.name || v.id || '') && !/female|femme/i.test(v.name || v.id || ''); }
  function nice(v) { return String((v && (v.name || v.id)) || '').replace(/^(Microsoft|Google)\s+/i, '').replace(/^.*?-x-/, 'Voix ').slice(0, 24); }

  T.voiceWheel = function (box) {
    if (!box) return;
    var act = 'local', quiet = true, g = null, note = '', timer = 0;
    function draw() {
      quiet = true;
      var s = T.set(), base = V.voices.slice(), cur = V.chosen() ? V.chosen().id : '';
      if (!g) { var f = base.filter(function (x) { return x.id === cur; })[0]; g = f ? (isM(f) ? 'm' : 'f') : 'f'; }
      var list = base.filter(function (x) { return g === 'm' ? isM(x) : !isM(x); });
      note = '';
      if (!list.length) { list = base; note = g === 'm' ? 'Aucune voix de garçon reconnue sur ce téléphone : voici toutes les voix.' : 'Aucune voix de fille reconnue : voici toutes les voix.'; }
      var cols = { local: list.filter(function (x) { return x.offline; }), net: list.filter(function (x) { return !x.offline; }) };
      function col(t, h) {
        var it = cols[t];
        return '<div class="vw-col" data-t="' + t + '"><div class="vw-h">' + h + '</div><div class="vw-win"><div class="vw-hl"></div><div class="vw-sc" tabindex="0" aria-label="' + h + ' : faites défiler pour entendre chaque voix">' +
          (it.length ? it.map(function (x, i) { return '<button class="vw-it" data-i="' + i + '" data-n="' + T.esc(x.id) + '" aria-pressed="' + (x.id === cur) + '">' + T.esc(nice(x)) + '</button>'; }).join('') : '<div class="vw-no">Aucune voix</div>') + '</div></div></div>';
      }
      box.innerHTML = '<div class="vw"><div class="vw-g" role="group" aria-label="Voix de fille ou de garçon">' +
        '<button class="vw-gb" data-g="f" aria-pressed="' + (g === 'f') + '">Voix de fille</button>' +
        '<button class="vw-gb" data-g="m" aria-pressed="' + (g === 'm') + '">Voix de garçon</button></div>' +
        '<p class="muted small vw-tip">Faites défiler : la voix au centre se fait entendre.' + (note ? '<br><i>' + note + '</i>' : '') + '</p>' +
        '<div class="vw-cols">' + col('local', 'Sans connexion') + col('net', 'Avec connexion') + '</div>' +
        '<p class="vw-cur" aria-live="polite"></p>' +
        '<div class="field"><label>Plus grave ou plus aiguë : <b class="vw-pv"></b></label><input type="range" class="vw-p" min="0.3" max="2" step="0.05" aria-label="Plus grave ou plus aiguë"></div>' +
        '<div class="field"><label>Vitesse : <b class="vw-rv"></b></label><input type="range" class="vw-r" min="0.5" max="2" step="0.05" aria-label="Vitesse de lecture"></div>' +
        '<div class="vw-row"><button class="btn primary vw-ok">Garder cette voix</button><button class="btn vw-again">Réécouter</button></div></div>';
      var sl = box.querySelector('.vw-p'), sr = box.querySelector('.vw-r');
      sl.value = s.pitch || 1; sr.value = s.rate || 0.95;
      function paint() {
        box.querySelector('.vw-pv').textContent = Math.round(sl.value * 100) + ' %';
        box.querySelector('.vw-rv').textContent = '×' + (+sr.value).toFixed(2).replace('.', ',');
        var c = V.chosen();
        box.querySelector('.vw-cur').textContent = 'Voix gardée : ' + (c ? nice(c) : 'voix du téléphone');
      }
      paint();
      function centered(t) {
        var c = box.querySelector('.vw-col[data-t="' + t + '"] .vw-sc'), it = Array.prototype.slice.call(c.querySelectorAll('.vw-it'));
        if (!it.length) return null;
        var i = Math.max(0, Math.min(it.length - 1, Math.round(c.scrollTop / IH)));
        return { el: it[i], id: it[i].getAttribute('data-n'), i: i };
      }
      function hear(t) {
        var c = centered(t); if (!c) return; act = t;
        Array.prototype.forEach.call(box.querySelectorAll('.vw-it'), function (x) { x.classList.remove('on'); });
        c.el.classList.add('on');
        V.speak('Bonjour, voici ma voix pour Tifa Nature. Vous m\'entendez bien ?', { id: c.id, rate: +sr.value, pitch: +sl.value });
      }
      Array.prototype.forEach.call(box.querySelectorAll('.vw-gb'), function (b) { b.onclick = function () { if (g === b.getAttribute('data-g')) return; g = b.getAttribute('data-g'); draw(); }; });
      Array.prototype.forEach.call(box.querySelectorAll('.vw-col'), function (colEl) {
        var t = colEl.getAttribute('data-t'), sc = colEl.querySelector('.vw-sc');
        var its = Array.prototype.slice.call(sc.querySelectorAll('.vw-it')); if (!its.length) return;
        var tm = 0, last = -1, ix = 0;
        its.forEach(function (x, i) { if (x.getAttribute('data-n') === cur) ix = i; });
        sc.scrollTop = ix * IH; last = ix; its[ix].classList.add('on'); if (its[ix].getAttribute('data-n') === cur) act = t;
        sc.addEventListener('scroll', function () {
          clearTimeout(tm);
          tm = setTimeout(function () {
            if (quiet) return;
            var c = centered(t);
            if (c && c.i !== last) { last = c.i; hear(t); }
            else if (c) { its.forEach(function (x) { x.classList.remove('on'); }); c.el.classList.add('on'); }
          }, 170);
        }, { passive: true });
        its.forEach(function (b, i) {
          b.onclick = function () {
            act = t; var mv = Math.abs(sc.scrollTop - i * IH) > 2;
            if (sc.scrollTo) sc.scrollTo({ top: i * IH, behavior: 'smooth' }); else sc.scrollTop = i * IH;
            if (!mv) { last = i; hear(t); }
          };
        });
      });
      setTimeout(function () { quiet = false; }, 500);
      function save() { var st = T.set(); st.pitch = +sl.value; st.rate = +sr.value; T.store.save(); }
      [sl, sr].forEach(function (x) {
        x.addEventListener('input', paint);
        x.addEventListener('change', function () { save(); clearTimeout(timer); timer = setTimeout(function () { hear(act); }, 200); });
      });
      box.querySelector('.vw-again').onclick = function () { hear(act); };
      box.querySelector('.vw-ok').onclick = function () {
        var c = centered(act) || centered('local') || centered('net'); if (!c) return;
        save(); T.set().voiceId = c.id; T.store.save();
        Array.prototype.forEach.call(box.querySelectorAll('.vw-it'), function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-n') === c.id && x.closest('.vw-col').getAttribute('data-t') === act)); });
        paint(); T.toast('Voix gardée.', 1600);
      };
    }
    draw();
  };
})();
