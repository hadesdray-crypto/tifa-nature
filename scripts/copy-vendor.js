// Copie les versions "navigateur" (IIFE) de Capacitor et de ses plugins dans www/vendor.
// Exécuté avant chaque synchronisation Android (voir .github/workflows).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'www', 'vendor');
fs.mkdirSync(out, { recursive: true });
const files = {
  '@capacitor/core/dist/capacitor.js': 'cap-core.js',
  '@capacitor/app/dist/plugin.js': 'cap-app.js',
  '@capacitor/camera/dist/plugin.js': 'cap-camera.js',
  '@capacitor/filesystem/dist/plugin.js': 'cap-filesystem.js',
  '@capacitor/preferences/dist/plugin.js': 'cap-preferences.js',
  '@capacitor/network/dist/plugin.js': 'cap-network.js',
  '@capacitor/splash-screen/dist/plugin.js': 'cap-splash.js',
  '@capacitor/status-bar/dist/plugin.js': 'cap-statusbar.js',
  '@capacitor-community/text-to-speech/dist/plugin.js': 'cap-tts.js',
  '@capacitor-community/bluetooth-le/dist/plugin.js': 'cap-ble.js'
};
for (const [src, dst] of Object.entries(files)) {
  fs.copyFileSync(path.join(root, 'node_modules', src), path.join(out, dst));
}
// Le plugin Filesystem attend une variable globale « synapse » (module @capacitor/synapse, version navigateur).
fs.writeFileSync(path.join(out, 'cap-synapse.js'), fs.readFileSync(path.join(root, 'node_modules', '@capacitor/synapse/dist/synapse.js'), 'utf8') + '\nvar synapse = (typeof outsystemsSynapse !== "undefined") ? outsystemsSynapse : {};\n');
console.log('vendor OK:', Object.keys(files).length, 'fichiers');
