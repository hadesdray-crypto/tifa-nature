/* Orchestrateur : exécute les domaines dans l'ordre demandé. Usage : node run-all.js [domaine...] */
const L = require('./lib');
const STEPS = [
  ['(c) tactile', './t-display', 'tactile'],
  ['(d) voix', './t-voice', null],
  ['(e) affichages', './t-display', 'affichages'],
  ['(f) modes', './t-display', 'modes'],
  ['(g) recherches', './t-search', null],
];
(async () => {
  const only = process.argv.slice(2);
  const s = await L.serve(L.WWW, 0), base = 'http://127.0.0.1:' + s.port, browser = await L.launch();
  for (const [name, mod, part] of STEPS) {
    if (only.length && !only.some((o) => name.includes(o))) continue;
    console.log('\n== ' + name);
    const before = L.results.filter((r) => !r.ok).length;
    try { await require(mod)({ L, browser, base, part }); } catch (e) { L.check(name + " : exécution", false, e.stack.split("\n").slice(0,3).join(" | ")); }
    console.log('   -> ' + (L.results.filter((r) => !r.ok).length === before ? 'DOMAINE OK' : 'DOMAINE EN ECHEC'));
  }
  const bad = L.results.filter((r) => !r.ok);
  console.log('\nTotal : ' + L.results.length + ' contrôles, ' + bad.length + ' échec(s)');
  await browser.close(); s.close(); process.exit(bad.length ? 1 : 0);
})();
