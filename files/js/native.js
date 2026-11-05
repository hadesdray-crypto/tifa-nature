/* Tifa Nature - accès au téléphone (caméra, réseau, bouton retour…), avec solutions de repli sur le navigateur. */
(function () {
  'use strict';
  var T = window.T, N = T.native = {};
  function g(p) { try { return p.split('.').reduce(function (o, k) { return o && o[k]; }, window) || null; } catch (e) { return null; } }
  N.isNative = !!(window.__TIFA_FAKE_NATIVE || (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()));
  N.P = window.__TIFA_FAKE_NATIVE ? window.__TIFA_FAKE_NATIVE : {
    App: g('capacitorApp.App'), Camera: g('capacitorCamera.Camera'), FS: g('capacitorFilesystemPluginCapacitor.Filesystem'), Dir: g('capacitorFilesystemPluginCapacitor.Directory'),
    Prefs: g('capacitorPreferences.Preferences'), Network: g('capacitorNetwork.Network'), Splash: g('capacitorSplashScreen.SplashScreen'),
    StatusBar: g('capacitorStatusBar.StatusBar'), TTS: g('capacitorTextToSpeech.TextToSpeech'), WebView: g('capacitorExports.WebView')
  };
  if (!N.isNative) { N.P.Camera = null; N.P.Prefs = null; N.P.TTS = null; N.P.FS = null; N.P.WebView = null; N.P.App = null; N.P.StatusBar = null; N.P.Splash = null; }
  N.build = 0; N.nativeVersion = '';

  /* ---------- Réseau ---------- */
  N.online = (typeof navigator.onLine === 'boolean') ? navigator.onLine : true;
  N.checkOnline = function () {
    return new Promise(function (resolve) {
      var P = N.P.Network;
      if (N.isNative && P) {
        P.getStatus().then(function (s) { N.online = !!s.connected; resolve(N.online); }, function () { resolve(N.online = navigator.onLine !== false); });
      } else resolve(N.online = navigator.onLine !== false);
    });
  };
  window.addEventListener('online', function () { N.online = true; });
  window.addEventListener('offline', function () { N.online = false; });

  /* ---------- Photo : appareil photo / galerie, avec repli sur le sélecteur de fichier ---------- */
  N.photo = function (source) {
    return new Promise(function (resolve, reject) {
      var C = N.P.Camera;
      function viaInput() {
        var inp = document.getElementById('file-input');
        inp.value = '';
        if (source === 'camera') inp.setAttribute('capture', 'environment'); else inp.removeAttribute('capture');
        inp.onchange = function () {
          var f = inp.files && inp.files[0]; if (!f) return reject(new Error('annule'));
          var r = new FileReader();
          r.onload = function () { resolve(r.result); };
          r.onerror = function () { reject(new Error('lecture')); };
          r.readAsDataURL(f);
        };
        inp.click();
      }
      if (C) {
        C.getPhoto({ quality: 85, resultType: 'dataUrl', source: source === 'camera' ? 'CAMERA' : 'PHOTOS', correctOrientation: true, width: 1600 }).then(
          function (p) { resolve(p.dataUrl); },
          function (e) { if (/cancel|annul|no image/i.test(String((e && e.message) || e))) reject(new Error('annule')); else viaInput(); }
        );
      } else viaInput();
    });
  };

  /* Demande des accès : une seule fois, au premier lancement. */
  N.askPermissionsOnce = function () {
    var st = T.store.s;
    if (st.flags.permAsked) return Promise.resolve('deja');
    st.flags.permAsked = true; T.store.save();
    var C = N.P.Camera;
    if (!C) return Promise.resolve('aucun');
    return C.requestPermissions({ permissions: ['camera'] }).then(function (r) { return r && r.camera; }, function () { return 'refuse'; });
  };

  /* ---------- Apparence du téléphone ---------- */
  N.statusBar = function (dark) {
    var S = N.P.StatusBar; if (!S) return;
    try { S.setStyle({ style: dark ? 'DARK' : 'LIGHT' }).catch(function () {}); } catch (e) {}
  };
  N.hideSplash = function () { var S = N.P.Splash; if (S) { try { S.hide().catch(function () {}); } catch (e) {} } };
  N.info = function () {
    var A = N.P.App; if (!A) return Promise.resolve(null);
    return A.getInfo().then(function (i) { N.build = parseInt(i.build, 10) || 0; N.nativeVersion = i.version || ''; return i; }, function () { return null; });
  };
  N.exitApp = function () { var A = N.P.App; if (A && A.exitApp) A.exitApp(); };
  N.onBack = function (cb) { var A = N.P.App; if (A && A.addListener) A.addListener('backButton', cb); };
  N.onResume = function (cb) {
    var A = N.P.App;
    if (A && A.addListener) A.addListener('appStateChange', function (s) { if (s && s.isActive) cb(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) cb(); });
  };
})();
