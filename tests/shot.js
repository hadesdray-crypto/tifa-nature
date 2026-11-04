const L=require('./lib');(async()=>{const s=await L.serve(L.WWW,0),b=await L.launch(),base='http://127.0.0.1:'+s.port;
const p=await L.newPage(b,base,'Pixel 8 (Android 14)');await L.skipOnboarding(p);
const out=process.argv[2]||'/tmp/claude-0/-home-claude/291d91b7-2b30-5f78-9362-9fd9913133b2/scratchpad/';
for(const [n,h] of [['accueil','#/accueil'],['trouver','#/trouver'],['plante','#/plante/tomate'],['pots','#/pots']]){await p.evaluate(h=>location.hash=h,h);await L.sleep(250);await p.screenshot({path:out+'v-'+n+'.png'});}
await b.close();s.close()})();
