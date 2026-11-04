/* Toxicité : explication détaillée au toucher du badge « Toxique ». */
(function () {
  'use strict';
  var T = window.T;
  if (!T) return;
  var NIV = { aucune: 'Non toxique (selon les sources)', faible: 'Toxicité faible', moderee: 'Toxicité modérée', elevee: 'Toxicité élevée', inconnu: 'Toxicité non confirmée' };
  function e(x) { return T.esc(x == null ? '' : String(x)); }
  function ul(a) { return a && a.length ? '<ul>' + a.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ul>' : ''; }
  function entry(id) { return (T.D.toxicite || {})[id]; }
  T.toxicite = {
    get: entry,
    html: function (p) {
      var t = entry(p.id), h = '<div class="toxm">';
      h += '<p class="muted"><b>Toxicité</b> : une plante est toxique quand une de ses parties contient des substances qui, mangées (parfois touchées), rendent malade un être vivant. La dose, la partie de la plante et la taille de la personne ou de l\'animal changent tout.</p>';
      if (!t) {
        h += '<div class="notice warn">Aucun détail vérifié pour cette plante. ' + e((p.toxique && p.toxique.note) || '') + ' Par prudence, ne la laissez pas à portée des enfants et des animaux.</div>';
      } else {
        h += '<div class="notice ' + (t.niveau === 'aucune' ? '' : 'bad') + '"><b>' + e(NIV[t.niveau] || NIV.inconnu) + '.</b> ' + e(t.resume) + '</div>';
        if (t.animaux) h += '<h3>Animaux</h3><ul><li>Chats : ' + e(t.animaux.chats) + '</li><li>Chiens : ' + e(t.animaux.chiens) + '</li>' + (t.animaux.autres ? '<li>Autres : ' + e(t.animaux.autres) + '</li>' : '') + '</ul>';
        if (t.humains) h += '<h3>Humains</h3><ul><li>Enfants : ' + e(t.humains.enfants) + '</li><li>Adultes : ' + e(t.humains.adultes) + '</li></ul>' + (t.humains.texte ? '<p>' + e(t.humains.texte) + '</p>' : '');
        if (t.parties && t.parties.length) h += '<h3>Parties concernées</h3>' + ul(t.parties);
        if (t.substances && t.substances.length) h += '<h3>Substances</h3>' + ul(t.substances);
        if (t.pourquoi) h += '<h3>Pourquoi c\'est toxique</h3><p>' + e(t.pourquoi) + '</p>';
        if (t.symptomes && t.symptomes.length) h += '<h3>Signes possibles</h3>' + ul(t.symptomes);
        if (t.que_faire && t.que_faire.length) h += '<h3>Que faire</h3>' + ul(t.que_faire);
        if (t.precautions && t.precautions.length) h += '<h3>Précautions</h3>' + ul(t.precautions);
        if (t.precision) h += '<p class="muted small">' + e(t.precision) + '</p>';
        if (t.sources && t.sources.length) h += '<h3>Sources</h3><ul>' + t.sources.map(function (s) { return '<li><a href="' + e(s.url) + '" target="_blank" rel="noopener">' + e(s.titre) + '</a></li>'; }).join('') + '</ul>';
        if (!t.verifie) h += '<p class="muted small">Informations non confirmées par deux sources : restez prudent.</p>';
      }
      h += '<div class="notice warn"><b>En cas d\'ingestion</b> : appelez un centre antipoison (humains) ou votre vétérinaire (animaux) ; en urgence, le 15 ou le 112.</div></div>';
      return h;
    },
    speech: function (p) { var d = document.createElement('div'); d.innerHTML = T.toxicite.html(p); return p.nom + '. ' + (d.textContent || ''); },
    open: function (id) {
      var p = T.plante(id); if (!p) return;
      var b = [{ label: 'Fermer', primary: true, close: true }];
      T.modal({ title: 'Toxicité : ' + p.nom, html: T.toxicite.html(p) + '<div class="row">' + T.voice.button(T.toxicite.speech(p), 'Écouter') + '</div>', buttons: b });
    }
  };
  T.act.toxinfo = function (el) { T.toxicite.open(el.getAttribute('data-id')); };
  T.act.edibleinfo = function (el) { if (T.assiette && T.assiette.resume) T.assiette.resume(el.getAttribute('data-id')); };
  /* Le fichier de toxicité fait foi sur les drapeaux chats/chiens. */
  function sync() {
    var X = T.D.toxicite || {};
    (T.D.plantes || []).forEach(function (p) {
      var t = X[p.id]; if (!t) return;
      var a = t.animaux || {}, oui = /^oui/i.test(a.chats || '') || /^oui/i.test(a.chiens || ''), non = /^non/i.test(a.chats || '') && /^non/i.test(a.chiens || '');
      if (oui) p.toxique = { chatChien: true, note: (p.toxique && p.toxique.chatChien && p.toxique.note) || t.resume || '' };
      else if (non && t.verifie) p.toxique = { chatChien: false, note: '' };
    });
  }
  T.toxicite.sync = sync; sync();
})();
