// Fabrique le paquet de mise à jour sur place : dossier files/ + manifest.json (somme de contrôle de chaque fichier).
// Usage : node scripts/build-ota.js --out DOSSIER [--manifest-url URL]
// La version vient de www/js/config.js ; la liste des changements vient de update/changes.json.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > -1 ? process.argv[i + 1] : d; };
const root = path.join(__dirname, '..'), www = path.join(root, 'www');
const out = path.resolve(arg('out', path.join(root, 'update', 'dist'))), murl = arg('manifest-url', '');
const cfg = fs.readFileSync(path.join(www, 'js', 'config.js'), 'utf8');
const version = (cfg.match(/VERSION_WEB:\s*'([^']+)'/) || [])[1], code = parseInt((cfg.match(/VERSION_CODE:\s*(\d+)/) || [])[1], 10);
if (!version || !code) throw new Error('VERSION_WEB / VERSION_CODE introuvables dans config.js');
const ch = JSON.parse(fs.readFileSync(path.join(root, 'update', 'changes.json'), 'utf8'));
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, 'files'), { recursive: true });
const files = [];
(function walk(d, rel) {
  for (const n of fs.readdirSync(d).sort()) {
    if (n.startsWith('.')) continue;
    const full = path.join(d, n), r = rel ? rel + '/' + n : n;
    if (fs.statSync(full).isDirectory()) { walk(full, r); continue; }
    let buf = fs.readFileSync(full);
    if (r === 'js/config.js' && murl) buf = Buffer.from(buf.toString('utf8').replace('__UPDATE_MANIFEST_URL__', murl));
    fs.mkdirSync(path.dirname(path.join(out, 'files', r)), { recursive: true });
    fs.writeFileSync(path.join(out, 'files', r), buf);
    files.push({ path: r, sha256: crypto.createHash('sha256').update(buf).digest('hex'), size: buf.length });
  }
})(www, '');
const manifest = { version, versionCode: code, date: new Date().toISOString().slice(0, 10), minNative: 1, changes: ch.changes || [], files };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log('Paquet', version, '(code ' + code + ') :', files.length, 'fichiers ->', out);
