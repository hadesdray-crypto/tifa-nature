// Outil du VENDEUR (à garder hors de l'application et hors du dépôt public).
//   node tools/make-license.js init            -> crée tools/private/keys.json (clé privée) et affiche la clé publique à coller dans www/js/config.js
//   node tools/make-license.js sign REF [JOURS] -> fabrique un code d'activation pour la commande REF (expire après JOURS, facultatif)
// L'appli de vente utilisera la même clé privée pour fabriquer le code après le paiement PayPal.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const dir = path.join(__dirname, 'private'), file = path.join(dir, 'keys.json'), PREFIX = 'TIFA1';
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const cmd = process.argv[2];
if (cmd === 'init') {
  if (fs.existsSync(file)) { console.log('Clés déjà créées : ' + file + ' (ne jamais les changer).'); }
  else {
    fs.mkdirSync(dir, { recursive: true });
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    fs.writeFileSync(file, JSON.stringify({ public: publicKey.export({ format: 'jwk' }), private: privateKey.export({ format: 'jwk' }) }, null, 1), { mode: 0o600 });
  }
  console.log('Clé publique (à coller dans LICENCE_PUBLIC_KEY_JWK) :\n' + JSON.stringify(JSON.parse(fs.readFileSync(file)).public));
} else if (cmd === 'sign') {
  const ref = process.argv[3]; if (!ref) { console.error('Indiquez une référence de commande.'); process.exit(1); }
  const days = parseInt(process.argv[4], 10), k = JSON.parse(fs.readFileSync(file));
  const payload = { v: 1, app: 'tifa-nature', id: ref, iat: Math.floor(Date.now() / 1000) }; if (days) payload.exp = payload.iat + days * 86400;
  const p64 = b64u(JSON.stringify(payload)), key = crypto.createPrivateKey({ key: k.private, format: 'jwk' });
  const sig = crypto.sign('sha256', Buffer.from(PREFIX + '.' + p64), { key, dsaEncoding: 'ieee-p1363' });
  console.log(PREFIX + '.' + p64 + '.' + b64u(sig));
} else console.log('Usage : init | sign REF [JOURS]');
