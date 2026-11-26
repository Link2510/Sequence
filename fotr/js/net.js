/* net.js — optional Firebase Realtime Database sync for 2-device play.
   Loads the Firebase compat SDK from gstatic only when a config is present.
   Offline/local play never loads these scripts. */
(function (root) {
  'use strict';

  var CFG = root.FIREBASE_CONFIG || {};
  var enabled = !!(CFG.apiKey && CFG.databaseURL && CFG.projectId && CFG.appId && CFG.databaseURL.indexOf('YOUR-PROJECT') < 0);
  var db = null, ready = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function init() {
    if (!enabled) return Promise.resolve(false);
    if (ready) return ready;
    ready = Promise.resolve()
      .then(function () {
        if (!root.firebase) return loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
      })
      .then(function () {
        if (!root.firebase.database) return loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js');
      })
      .then(function () {
        if (!root.firebase.apps || !root.firebase.apps.length) root.firebase.initializeApp(CFG);
        db = root.firebase.database();
        return true;
      })
      .catch(function () { return false; });
    return ready;
  }

  function ref(code) { return db.ref('lotr-fotr-rooms/' + code); }

  root.LOTRNet = {
    enabled: enabled,
    init: init,
    isReady: function () { return !!db; },
    createRoom: function (code, meta) { return ref(code).child('meta').set(meta); },
    joinRoom: function (code) { return ref(code).child('meta').once('value').then(function (s) { return s.val(); }); },
    markGuest: function (code) { return ref(code).child('meta/guestJoined').set(true); },
    watchMeta: function (code, cb) { ref(code).child('meta').on('value', function (s) { cb(s.val()); }); },
    watchState: function (code, cb) { ref(code).child('state').on('value', function (s) { cb(s.val()); }); },
    publishState: function (code, state) { return ref(code).child('state').set(state); },
    sendIntent: function (code, intent) { return ref(code).child('intents').push(intent); },
    watchIntents: function (code, cb) {
      ref(code).child('intents').on('child_added', function (s) { cb({ key: s.key, value: s.val() }); });
    },
    removeIntent: function (code, key) { return ref(code).child('intents').child(key).remove(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
