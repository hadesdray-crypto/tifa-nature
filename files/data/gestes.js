/* Tifa Nature - Gestes du jardinier : procédures pas à pas (données, hors connexion).
   Chaque procédure : id, titre, cat, but (à quoi ça sert), diff (facile|moyen), duree, mois (1 à 12), mat (matériel),
   etapes [{t titre, c consigne, a attention, p pourquoi, s schéma}], erreurs, apres, mots (recherche), plantes (ids de fiches). */
(function () {
  var D = (window.TIFA_DATA = window.TIFA_DATA || {});
  var L = [];
  function E(t, c, a, p, s) { return { t: t, c: c, a: a || "", p: p || "", s: s || "" }; }
  function G(o) { L.push(o); }
  D.gestesCats = [
    { id: "rempoter", nom: "Rempoter", aide: "Changer une plante de pot" },
    { id: "multiplier", nom: "Multiplier", aide: "Boutures, marcottes, divisions, greffe" },
    { id: "semer", nom: "Semer et planter", aide: "Graines, plants, plantation" },
    { id: "tailler", nom: "Tailler et soutenir", aide: "Tailles, pincement, tuteurs" },
    { id: "entretenir", nom: "Entretenir", aide: "Arroser, pailler, soigner les outils" },
    { id: "proteger", nom: "Protéger", aide: "Froid, limaces, pucerons, soins naturels" },
    { id: "fabriquer", nom: "Fabriquer", aide: "Compost, terreau" }
  ];

  G({ id: "rempoter-interieur", titre: "Rempoter une plante d'intérieur", cat: "rempoter",
    but: "Donner plus de place aux racines et de la terre fraîche à une plante qui est à l'étroit.",
    diff: "facile", duree: "30 minutes", mois: [3, 4, 5, 6, 9],
    mat: ["Un pot neuf, 2 à 4 cm plus large que l'ancien, avec des trous au fond", "Du terreau pour plantes d'intérieur", "Des billes d'argile (facultatif)", "Un journal ou une bâche pour protéger la table", "Un arrosoir", "Un sécateur propre"],
    etapes: [
      E("Choisir le bon moment", "Rempotez au printemps, quand la plante repart. Signes qu'il faut rempoter : des racines sortent par les trous, ou la terre sèche très vite. Arrosez la plante la veille.", "Ne rempotez pas une plante qui fleurit ou qui est malade.", "Une plante bien arrosée la veille sort plus facilement du pot et souffre moins.", ""),
      E("Préparer le nouveau pot", "Prenez un pot 2 à 4 cm plus large que l'ancien. Il doit avoir des trous au fond. Un vieux pot doit être lavé à l'eau savonneuse.", "Un pot neuf en terre cuite se trempe 1 heure dans l'eau avant, sinon il boit l'eau de la plante.", "Un pot trop grand garde la terre mouillée et fait pourrir les racines.", ""),
      E("Mettre le fond", "Si vous en avez, déposez 2 cm de billes d'argile au fond (facultatif), puis 2 à 3 cm de terreau.", "", "L'essentiel, ce sont les trous du pot : l'eau en trop doit pouvoir sortir. Les billes évitent aussi que le terreau bouche les trous.", "pot"),
      E("Sortir la plante", "Posez une main sur la terre, la tige entre deux doigts. Retournez le pot et tapotez le fond et les côtés. La motte glisse.", "Ne tirez jamais sur la tige : elle peut casser.", "Tapoter décolle la terre sans abîmer les racines.", ""),
      E("Regarder les racines", "Des racines blanches ou beiges et fermes sont saines. Coupez avec un sécateur propre les racines brunes, molles ou noires. Démêlez doucement celles qui tournent en rond.", "", "Les racines abîmées pourrissent et peuvent faire mourir la plante.", "racines"),
      E("Installer la plante", "Posez la motte au centre du pot. Le haut de la motte doit être 2 cm sous le bord. Ajoutez ou retirez du terreau au fond pour régler la hauteur.", "N'enterrez pas la tige plus qu'avant.", "Ces 2 cm laissent la place de verser l'eau sans déborder.", "pot"),
      E("Remplir autour", "Versez le terreau tout autour. Tassez doucement avec les doigts, sans écraser.", "", "Le terreau doit combler les vides pour que les racines touchent la terre.", ""),
      E("Arroser", "Arrosez lentement jusqu'à ce que l'eau sorte par le fond. Videz la soucoupe au bout de 15 minutes.", "Une soucoupe pleine d'eau fait pourrir les racines.", "L'arrosage plaque la terre contre les racines.", ""),
      E("Remettre en place", "Posez la plante dans un endroit clair, mais sans soleil direct pendant 1 à 2 semaines.", "Pas d'engrais pendant 1 mois.", "La plante a besoin de calme pour refaire ses racines.", "")
    ],
    erreurs: ["Prendre un pot beaucoup trop grand.", "Un pot sans trou au fond.", "Mettre de l'engrais tout de suite.", "Enterrer la tige plus profond qu'avant.", "Laisser de l'eau dans la soucoupe."],
    apres: ["Arrosez seulement quand le dessus de la terre est sec sur 2 cm.", "Pas d'engrais pendant 4 à 6 semaines.", "Quelques feuilles qui jaunissent sont normales. La plante repart en 2 à 3 semaines.", "Rempotez de nouveau dans 1 à 2 ans."],
    mots: "rempotage rempoter changer de pot plus grand pot racines qui sortent plante verte ficus monstera terreau rampotage rempotter empoter",
    plantes: ["monstera", "pothos", "ficus", "sansevieria"] });

  G({ id: "rempoter-arbuste-bac", titre: "Rempoter un arbuste ou un rosier en bac", cat: "rempoter",
    but: "Renouveler la terre et donner de la place à un arbuste ou un rosier qui vit dans un grand pot.",
    diff: "moyen", duree: "1 heure", mois: [2, 3, 10, 11],
    mat: ["Un bac stable, 5 à 10 cm plus large, percé au fond", "Du terreau et un peu de compost mûr", "Des graviers ou des billes d'argile", "Un sécateur propre", "Des gants", "Un arrosoir"],
    etapes: [
      E("Choisir la date", "Rempotez quand la plante se repose : en novembre, ou en février-mars. Évitez le gel et les grosses chaleurs.", "Ne faites pas ce travail un jour de gel.", "La plante, au repos, supporte mieux d'avoir ses racines touchées.", ""),
      E("Préparer le bac", "Le bac fait 5 à 10 cm de plus que l'ancien et au moins 30 cm de profondeur. Vérifiez les trous. Mettez 3 à 5 cm de graviers ou de billes d'argile au fond (facultatif).", "", "Un grand bac sèche moins vite et reste stable au vent.", ""),
      E("Préparer le mélange", "Mélangez deux tiers de terreau et un tiers de compost mûr. Remplissez le bac d'un quart.", "", "Le compost nourrit doucement la plante toute l'année.", ""),
      E("Sortir l'arbuste", "Arrosez la veille. Couchez le pot, tapotez, puis tirez le pot en tenant le pied de la plante. Au besoin, passez un couteau entre la motte et le pot.", "Portez des gants : les rosiers piquent.", "Un pot lourd se vide plus facilement couché.", ""),
      E("Soigner les racines", "Grattez le tour de la motte avec les doigts. Coupez les racines cassées, noires ou qui font le tour du pot.", "", "Des racines qui font le tour du pot ne repartent plus vers l'extérieur.", "racines"),
      E("Placer la plante", "Posez la motte au centre. Le haut de la motte arrive 3 cm sous le bord du bac. Pour un rosier greffé, la bosse de la greffe (en bas des tiges) se met au niveau de la terre ou un peu en dessous.", "", "Garder 3 cm de vide permet d'arroser sans déborder.", ""),
      E("Remplir et tasser", "Ajoutez le mélange autour de la motte par petites couches. Tassez avec les mains à chaque couche.", "", "Il ne doit rester aucun vide d'air autour des racines.", ""),
      E("Arroser beaucoup", "Arrosez lentement, jusqu'à ce que l'eau sorte par le fond du bac. Recommencez une fois.", "", "Cela fait descendre la terre contre les racines.", ""),
      E("Couvrir la terre", "Étalez 3 à 5 cm de paillis (écorces, paille, feuilles sèches) sur la terre. Gardez 3 cm libres autour de la tige.", "", "Le paillis garde la terre fraîche et évite les mauvaises herbes.", "")
    ],
    erreurs: ["Rempoter en pleine chaleur ou par gel.", "Choisir un bac trop petit ou trop léger : il se renverse.", "Enterrer le rosier trop profond.", "Mettre l'engrais au fond du trou.", "Oublier d'arroser les jours suivants."],
    apres: ["Arrosez régulièrement, sans laisser de l'eau dans la soucoupe.", "Donnez un engrais selon sa notice, à partir de 6 semaines environ après, au printemps.", "Rempotez de nouveau dans 2 à 3 ans, et changez les 5 premiers cm de terre chaque année."],
    mots: "rempotage rosier en pot arbuste en bac grand pot terrasse cour changer terre hortensia rempoter rosié",
    plantes: ["rosier-pot", "hortensia", "lavande"] });

  G({ id: "depoter-difficile", titre: "Sortir une plante coincée dans son pot", cat: "rempoter",
    but: "Sortir sans l'abîmer une plante aux racines très serrées, ou dont la terre est devenue dure et trop riche en engrais.",
    diff: "moyen", duree: "45 minutes", mois: [3, 4, 5, 6, 9],
    mat: ["Un couteau fin à lame lisse", "Un grand bac ou un évier", "Des ciseaux solides", "Du terreau neuf", "Un pot un peu plus grand", "Un arrosoir"],
    etapes: [
      E("Reconnaître le problème", "Signes : des racines sortent partout, la motte est dure, une croûte blanche couvre la terre, le bout des feuilles est brun. La croûte blanche vient souvent de l'engrais en trop ou du calcaire de l'eau.", "", "Trop d'engrais laisse des sels qui brûlent les racines.", ""),
      E("Ramollir la motte", "Posez le pot dans un bac d'eau jusqu'au bord pendant 15 à 30 minutes, jusqu'à ce que les bulles s'arrêtent.", "", "La terre dure se détache bien mieux quand elle est mouillée.", ""),
      E("Décoller la terre", "Passez un couteau fin entre la terre et le pot, tout autour, sur toute la hauteur.", "Poussez la lame vers l'extérieur, loin de vos doigts.", "Cela casse les liens entre les racines et la paroi.", ""),
      E("Presser et tapoter", "Pot souple : serrez les côtés avec les mains. Pot dur : retournez-le et tapez sur le fond avec la paume. Tenez la plante à sa base.", "", "Les petits chocs desserrent la motte.", ""),
      E("Couper le pot si besoin", "Si la plante ne sort pas, découpez le côté d'un pot en plastique avec des ciseaux solides. Un pot en terre cuite se casse en dernier recours, enveloppé dans un chiffon.", "Protégez vos mains et vos yeux contre les éclats.", "Un pot se remplace ; une plante ancienne est plus précieuse.", ""),
      E("Rincer la motte", "Enlevez les 2 cm de terre du dessus. Rincez la motte à l'eau tiède pour retirer l'excès d'engrais. Laissez bien égoutter.", "", "Le rinçage emporte les sels en trop.", ""),
      E("Libérer les racines", "Écartez les racines avec les doigts. Coupez les racines noires ou molles. Si les racines forment un feutre dur, coupez 2 à 3 cm au bas de la motte avec un couteau propre. Faites 3 ou 4 entailles verticales sur les côtés.", "", "Couper un peu fait repartir de jeunes racines dans la terre neuve.", "racines"),
      E("Replanter", "Remettez du terreau neuf au fond d'un pot un peu plus grand, posez la plante, comblez autour, tassez doucement. Arrosez bien.", "", "Une terre neuve et légère donne un nouveau départ.", ""),
      E("Laisser reposer", "Posez la plante dans un endroit clair, sans soleil direct. Pas d'engrais pendant 2 mois.", "", "La plante a besoin de calme pour refaire ses racines.", "")
    ],
    erreurs: ["Tirer sur la tige pour la sortir.", "Couper beaucoup de racines.", "Remettre de l'engrais tout de suite.", "Choisir un pot beaucoup plus grand.", "Casser un pot sans protéger ses mains."],
    apres: ["Arrosez peu les 2 premières semaines, puis normalement.", "Pas d'engrais pendant 2 mois.", "Des feuilles abîmées peuvent tomber : c'est normal. Les nouvelles pousses reviennent en général en quelques semaines."],
    mots: "depoter dépotage racines serrées motte dure plante coincée trop engrais sel croute blanche racines qui tournent bloquée impossible a sortir pot",
    plantes: ["ficus", "dracaena", "yucca"] });

  G({ id: "empoter-jardinerie", titre: "Installer une plante achetée en jardinerie", cat: "rempoter",
    but: "Bien accueillir une plante neuve, la vérifier et la mettre dans de la bonne terre.",
    diff: "facile", duree: "30 minutes", mois: [3, 4, 5, 6, 9, 10],
    mat: ["Un pot un peu plus grand, percé au fond", "Du terreau adapté à la plante", "Des ciseaux", "Un arrosoir", "Une loupe (facultatif)"],
    etapes: [
      E("Défaire l'emballage", "Retirez le papier, le film plastique et les filets. Gardez l'étiquette avec le nom.", "", "Un emballage serré étouffe la plante et garde l'humidité.", ""),
      E("Regarder la plante", "Observez le dessus et le dessous des feuilles, les tiges et la terre. Cherchez de petits insectes, des toiles fines, des taches collantes.", "", "Mieux vaut trouver un problème tout de suite que le donner à vos autres plantes.", ""),
      E("Mettre à l'écart", "Gardez la plante seule pendant 2 semaines, loin des autres, pour être sûr qu'elle est saine.", "", "Les petits insectes se propagent vite d'une plante à l'autre.", ""),
      E("Lui laisser une semaine", "Laissez la plante dans son pot d'origine 1 semaine, dans un endroit clair. Ne rempotez pas tout de suite, sauf si les racines sortent en masse.", "", "Un changement de lieu est déjà un choc pour une plante.", ""),
      E("Vérifier le pot", "Regardez en dessous. Si des racines sortent des trous ou si la terre est dure comme du bois, il faut rempoter.", "", "Les plantes de magasin restent souvent dans une terre pauvre.", ""),
      E("Choisir la bonne terre", "Terreau pour plantes vertes, terreau pour cactées ou mélange pour orchidées : lisez le nom de la plante pour choisir.", "", "Chaque plante aime un sol différent.", ""),
      E("Rempoter", "Suivez les gestes de la fiche « Rempoter une plante d'intérieur ». Le nouveau pot est 2 à 3 cm plus large. Le haut de la motte reste 2 cm sous le bord.", "", "Un pot trop grand n'aide pas la plante.", "pot"),
      E("Cache-pot : attention", "Si vous mettez le pot dans un cache-pot, videz l'eau après chaque arrosage.", "", "Les racines pourrissent dans l'eau stagnante.", ""),
      E("Placer et noter", "Cherchez sur sa fiche la lumière qu'elle aime. Notez la date dans le carnet pour penser à l'arrosage.", "", "Une plante bien placée reste belle plus longtemps.", "")
    ],
    erreurs: ["Rempoter le jour de l'achat sans raison.", "Laisser l'emballage autour des feuilles.", "Mettre la nouvelle plante près des autres tout de suite.", "Laisser de l'eau dans le cache-pot."],
    apres: ["Arrosez selon sa fiche.", "Regardez ses feuilles une fois par semaine pendant un mois.", "Pas d'engrais pendant 1 mois."],
    mots: "plante achetee jardinerie magasin rempotage nouvelle plante quarantaine cache pot emballage acheter ramener maison",
    plantes: ["monstera", "orchidee", "ficus"] });

  G({ id: "bouture-eau", titre: "Faire une bouture de tige dans l'eau", cat: "multiplier",
    but: "Faire pousser des racines à un morceau de tige, dans un verre d'eau, pour obtenir une nouvelle plante.",
    diff: "facile", duree: "15 minutes, puis 2 à 4 semaines d'attente", mois: [4, 5, 6, 7, 8, 9],
    mat: ["Un verre ou un bocal propre", "Un sécateur ou des ciseaux propres", "De l'eau du robinet ou de pluie, à température ambiante", "Un endroit clair", "Un pot et du terreau pour la suite"],
    etapes: [
      E("Choisir la tige", "Prenez une tige saine, sans fleur, longue de 10 à 15 cm, avec 2 ou 3 nœuds. Un nœud est la petite bosse d'où part une feuille.", "", "Les racines sortent surtout des nœuds.", "tige"),
      E("Couper sous un nœud", "Coupez net, 1 cm sous un nœud, avec des ciseaux propres.", "", "Une coupe nette guérit vite et ne pourrit pas.", ""),
      E("Enlever les feuilles du bas", "Retirez les feuilles qui seraient dans l'eau. Gardez 2 ou 3 feuilles en haut.", "Les feuilles dans l'eau pourrissent.", "Une feuille dans l'eau abîme l'eau et fait pourrir la tige.", ""),
      E("Remplir le verre", "Versez de l'eau propre. Le nœud du bas doit être bien sous l'eau.", "", "Les racines apparaissent à l'endroit du nœud.", "eau"),
      E("Choisir la place", "Mettez le verre près d'une fenêtre claire, sans soleil direct. Idéal : 18 à 22 degrés.", "", "Trop de soleil chauffe l'eau et fait pourrir la tige.", ""),
      E("Changer l'eau", "Changez l'eau 1 fois par semaine. Rincez la tige et le verre si l'eau devient trouble.", "", "Une eau propre apporte de l'air aux racines.", ""),
      E("Attendre les racines", "Les premières racines blanches apparaissent après 1 à 4 semaines. Attendez qu'elles fassent 3 à 5 cm.", "", "Les racines très courtes sont fragiles.", ""),
      E("Planter en terreau", "Plantez la bouture dans un petit pot de terreau léger. Arrosez et gardez la terre humide pendant 2 à 3 semaines.", "Ne laissez pas sécher la terre au début.", "Les racines de l'eau doivent s'habituer à la terre.", "")
    ],
    erreurs: ["Mettre des feuilles dans l'eau.", "Oublier de changer l'eau.", "Laisser le verre en plein soleil.", "Attendre trop longtemps avant de planter : les racines d'eau deviennent fragiles."],
    apres: ["Gardez la terre légèrement humide pendant 3 semaines.", "Placez le pot dans un endroit clair sans soleil direct.", "Pas d'engrais avant 1 mois.", "Quand les nouvelles feuilles poussent, la plante est bien reprise."],
    mots: "bouture eau verre bocal faire des racines pothos monstera begonia tradescantia coleus menthe basilic marcottage bouturage boutturer",
    plantes: ["pothos", "monstera", "tradescantia", "begonia", "menthe"] });

  G({ id: "bouture-terre", titre: "Faire une bouture de tige en terre", cat: "multiplier",
    but: "Faire racines à un morceau de tige tendre directement dans la terre, avec une petite serre.",
    diff: "facile", duree: "30 minutes, puis 3 à 5 semaines d'attente", mois: [4, 5, 6, 7, 8, 9],
    mat: ["Un pot de 9 à 10 cm avec trous", "Un mélange à parts égales de terreau et de sable", "Un sécateur propre", "Un crayon", "Un sachet transparent", "Des bâtonnets", "Un pulvérisateur"],
    etapes: [
      E("Préparer le pot", "Remplissez le pot du mélange terreau et sable. Mouillez bien la terre, laissez égoutter.", "", "Un mélange léger laisse de l'air aux jeunes racines.", ""),
      E("Couper la tige", "Le matin, coupez une tige saine de 8 à 12 cm, sans fleur, juste sous un nœud, avec un sécateur propre.", "", "Le matin, la tige est pleine d'eau et reprend mieux.", "tige"),
      E("Préparer la bouture", "Enlevez les feuilles du bas. Coupez en deux les grandes feuilles qui restent. Retirez fleurs et boutons.", "", "Moins de feuilles, moins de perte d'eau avant les racines.", ""),
      E("Faire le trou", "Faites un trou avec un crayon dans la terre. Cela évite de racler l'écorce de la tige.", "", "Une écorce intacte aide à faire des racines.", ""),
      E("Planter", "Enfoncez la tige sur un tiers à la moitié de sa longueur. Les nœuds du bas sont dans la terre. Tassez doucement.", "", "Les racines partent des nœuds enterrés.", ""),
      E("Faire une mini-serre", "Plantez 3 bâtonnets et posez un sachet transparent dessus, sans toucher les feuilles. Ouvrez-le 5 minutes chaque jour.", "Le sachet ne doit jamais toucher les feuilles.", "L'air humide évite que la tige sèche avant d'avoir des racines.", ""),
      E("Placer", "Mettez le pot dans un endroit clair, sans soleil direct.", "", "Le soleil sous le plastique brûle la bouture.", ""),
      E("Vérifier", "Après 3 semaines, tirez très doucement sur la tige. Si elle résiste, elle a des racines. Une nouvelle feuille qui pousse est aussi un bon signe.", "", "Tirer doucement permet de savoir sans arracher.", ""),
      E("Enlever la serre", "Ouvrez peu à peu le sachet pendant une semaine, puis retirez-le. Rempotez quand les racines sortent du pot.", "", "La jeune plante doit s'habituer à l'air de la maison.", "")
    ],
    erreurs: ["Garder le sachet fermé sans jamais l'ouvrir.", "Mettre la bouture en plein soleil.", "Planter dans une terre trop riche ou trop lourde.", "Utiliser un outil sale : il transmet des maladies."],
    apres: ["Arrosez quand le dessus de la terre est sec.", "Pas d'engrais pendant 1 mois.", "Pincez le bout des tiges quand elles ont 3 paires de feuilles pour qu'elles se ramifient."],
    mots: "bouture terre tige herbacee godet mini serre sachet bouturage begonia impatiens petunia plante annuelle fuchsia bouture de tige",
    plantes: ["begonia", "impatiens", "petunia", "menthe"] });

  G({ id: "bouture-feuille", titre: "Faire une bouture de feuille", cat: "multiplier",
    but: "Faire une nouvelle plante à partir d'une seule feuille ou d'un morceau de feuille (sansevieria, bégonia rex, succulentes).",
    diff: "facile", duree: "30 minutes, puis plusieurs semaines d'attente (parfois quelques mois)", mois: [4, 5, 6, 7, 8],
    mat: ["Une feuille saine et bien formée", "Un couteau ou des ciseaux propres", "Un mélange de terreau et de sable (ou terreau pour cactées)", "Un pot plat ou une barquette avec trous", "Un pulvérisateur"],
    etapes: [
      E("Choisir la feuille", "Prenez une belle feuille adulte, ferme et sans tache. Sur une succulente, détachez-la en la tournant doucement, avec sa base complète.", "Une sansevieria avec un bord jaune perd ce bord en bouture : la nouvelle plante sera toute verte.", "Une feuille abîmée n'a pas la force de faire des racines.", ""),
      E("Préparer selon la plante", "Sansevieria : coupez la feuille en morceaux de 5 à 8 cm. Bégonia rex : entaillez les grosses nervures du dessous. Succulente : gardez la feuille entière.", "", "Chaque coupe peut donner de nouvelles racines.", "feuille"),
      E("Marquer le sens", "Sur les morceaux de sansevieria, faites un petit V en haut du morceau. Le bas du morceau va dans la terre.", "Un morceau planté à l'envers ne fait pas de racines.", "Les racines naissent toujours du côté qui était vers le pied.", "feuille"),
      E("Laisser sécher les coupes", "Sansevieria et succulentes : laissez 2 ou 3 jours à l'air, à l'ombre, pour que les coupes cicatrisent.", "Pour le bégonia, passez directement à la suite.", "Une coupe sèche ne pourrit pas dans la terre.", ""),
      E("Préparer la terre", "Remplissez un pot avec le mélange léger. Humidifiez-le légèrement.", "", "Trop d'eau fait pourrir la feuille.", ""),
      E("Poser ou planter", "Sansevieria : plantez le bas du morceau sur 2 cm. Bégonia : posez la feuille à plat sur la terre, nervures contre la terre, avec de petits cailloux dessus. Succulente : posez la feuille à plat sur la terre.", "", "Le contact avec la terre aide les racines à apparaître.", ""),
      E("Arroser très peu", "Brumisez la terre une fois par semaine pour qu'elle reste à peine humide. Pas de gros arrosage.", "Surtout pas d'eau dans la soucoupe.", "Une feuille coupée pourrit très vite si elle est mouillée.", ""),
      E("Patienter", "Mettez le pot dans un endroit lumineux sans soleil direct. Les petites racines puis de minuscules feuilles apparaissent après plusieurs semaines, parfois 2 à 3 mois selon la plante.", "", "Une bouture de feuille est lente : c'est normal.", ""),
      E("Séparer et rempoter", "Quand la nouvelle plante a quelques feuilles, sortez-la avec précaution. Plantez-la dans son propre pot.", "", "Les racines jeunes sont fragiles : soulevez avec une cuillère.", "")
    ],
    erreurs: ["Arroser trop pour « aider » la feuille.", "Planter le morceau à l'envers.", "Mettre en plein soleil.", "Abandonner trop tôt : certaines mettent plus de 2 mois."],
    apres: ["Arrosez peu au début, plus normalement quand les feuilles poussent.", "Pas d'engrais pendant 2 mois.", "La feuille mère se dessèche : c'est normal."],
    mots: "bouture feuille sansevieria begonia rex succulente echeveria crassula kalanchoe langue de belle mere feuille coupee bouturage feuilles",
    plantes: ["sansevieria", "begonia", "echeveria", "crassula", "kalanchoe"] });

  G({ id: "bouture-ligneuse", titre: "Faire une bouture ligneuse en hiver", cat: "multiplier",
    but: "Multiplier un arbuste ou un petit fruitier en plantant un morceau de branche dure, en hiver.",
    diff: "moyen", duree: "40 minutes, puis attendre le printemps", mois: [11, 12, 1, 2],
    mat: ["Un sécateur propre et bien affûté", "Du sable ou de la terre légère", "Un pot haut ou une tranchée dans la terre", "Du raphia ou un élastique", "Des étiquettes", "De la paille ou des feuilles sèches"],
    etapes: [
      E("Choisir le moment", "Travaillez entre novembre et février, quand les feuilles sont tombées, sans gel fort.", "", "La plante dort, elle supporte la coupe.", ""),
      E("Choisir les branches", "Prenez des pousses de l'année, dures et brunes, grosses comme un crayon, bien saines.", "", "Les pousses de l'année s'enracinent mieux que le vieux bois.", ""),
      E("Couper les morceaux", "Faites des morceaux de 15 à 25 cm avec 3 ou 4 nœuds. En bas, coupe droite juste sous un nœud. En haut, coupe en biseau 5 mm au-dessus d'un nœud.", "Gardez bien le sens : le bas va en terre.", "Les deux coupes différentes évitent de se tromper de sens.", "biseau"),
      E("Faire un petit paquet", "Attachez 5 à 10 morceaux ensemble, pointes vers le haut, le temps de les préparer. Étiquetez avec le nom.", "", "Un paquet étiqueté évite de mélanger les variétés et de se tromper de sens. Plantez-les ensuite un par un.", ""),
      E("Préparer le sol", "Faites une tranchée de 20 cm dans un coin abrité, ou remplissez un pot profond de sable et de terreau à parts égales. Mouillez.", "", "Un sol léger laisse passer l'air.", ""),
      E("Planter", "Enfoncez chaque morceau aux deux tiers. Il doit rester 1 ou 2 yeux dehors, le biseau vers le haut. Tassez la terre.", "", "Les yeux enterrés font les racines, ceux du haut les feuilles.", ""),
      E("Arroser et couvrir", "Arrosez. Posez au pied un peu de paille ou de feuilles sèches pour protéger du froid.", "", "Le paillis garde l'humidité et protège du gel.", ""),
      E("Attendre", "Ne touchez à rien jusqu'au printemps. Quand les bourgeons s'ouvrent, arrosez si la terre est sèche.", "Ne tirez pas sur les boutures pour vérifier.", "Tirer arrache les racines naissantes.", ""),
      E("Planter ailleurs", "À l'automne suivant, déplacez les boutures réussies avec une bonne motte à leur place définitive.", "", "Il leur faut une année pour avoir des racines solides.", "")
    ],
    erreurs: ["Planter les morceaux à l'envers.", "Couper trop court (moins de 2 nœuds).", "Laisser sécher la terre au printemps.", "Prendre du bois mort, pas du bois de l'année."],
    apres: ["Arrosez si le printemps est sec.", "Retirez les mauvaises herbes autour.", "Replantez à l'automne suivant."],
    mots: "bouture ligneuse hiver bouture bois groseillier cassis figuier hortensia vigne rosier saule arbuste branche couper rameau planter morceau de branche",
    plantes: ["groseillier", "cassissier", "figuier", "hortensia", "vigne-raisin"] });

  G({ id: "bouture-geranium", titre: "Bouturer un géranium (pélargonium)", cat: "multiplier",
    but: "Faire de nouveaux géraniums gratuitement pour garnir vos jardinières ou pour garder une plante pour l'an prochain.",
    diff: "facile", duree: "20 minutes, puis 3 à 6 semaines d'attente", mois: [4, 5, 8, 9],
    mat: ["Un sécateur ou un couteau propre", "Un petit pot avec trous", "Un mélange sableux (terreau + sable)", "Un endroit lumineux", "Un crayon"],
    etapes: [
      E("Choisir le moment", "Fin d'été (août-septembre) ou printemps (avril-mai).", "", "La plante est en pleine force, les racines viennent vite.", ""),
      E("Prendre une tige", "Choisissez une tige saine, sans fleur, de 8 à 10 cm, avec au moins 3 nœuds.", "", "Les nœuds sont l'endroit où naissent les racines.", "tige"),
      E("Couper", "Coupez sous un nœud, bien net, avec un outil propre.", "", "Une coupe propre guérit mieux.", ""),
      E("Nettoyer", "Retirez les feuilles du bas, les boutons de fleurs et les petites feuilles collées à la base.", "", "Les fleurs prennent l'énergie des racines.", ""),
      E("Laisser sécher", "Posez la tige à l'air, à l'ombre, pendant 24 heures. La coupe doit sécher un peu.", "", "Un géranium aime la sécheresse : une coupe humide pourrit.", ""),
      E("Préparer le pot", "Remplissez de mélange sableux, mouillé puis égoutté. Faites un trou au crayon.", "", "La terre doit être légère.", ""),
      E("Planter", "Enfoncez la tige de 2 à 3 cm, tassez un peu. Arrosez une seule fois, légèrement.", "N'utilisez pas de sachet plastique : il fait pourrir le géranium.", "Un géranium bouture mieux à l'air libre.", ""),
      E("Surveiller", "Placez-le dans un endroit très clair. Arrosez seulement quand le dessus de la terre est sec.", "", "Trop d'eau est le premier danger.", ""),
      E("Rempoter", "Après 3 à 6 semaines, une nouvelle feuille apparaît : rempotez dans un pot de 10-12 cm. Gardez-le à l'abri du gel.", "", "Le géranium ne supporte pas le gel.", "")
    ],
    erreurs: ["Trop arroser.", "Mettre un sachet plastique dessus.", "Laisser les fleurs sur la bouture.", "Garder les boutures dehors par gel."],
    apres: ["Arrosez peu : une fois que le dessus est sec.", "Mettez en place dehors quand il n'y a plus de gel (après la mi-mai).", "Pincez les bouts pour que la plante se ramifie."],
    mots: "bouture geranium pelargonium geraniums balcon jardiniere multiplier gratuit geranium bouturer",
    plantes: ["geranium"] });

  G({ id: "bouture-aromatiques", titre: "Bouturer menthe, basilic et romarin", cat: "multiplier",
    but: "Avoir de nouveaux pieds d'aromatiques gratuits, en pot ou au jardin.",
    diff: "facile", duree: "20 minutes, puis 1 à 8 semaines d'attente", mois: [5, 6, 7, 8, 9],
    mat: ["Des ciseaux propres", "Un verre d'eau (menthe, basilic)", "Un petit pot avec terreau et sable (romarin)", "Un endroit clair"],
    etapes: [
      E("Choisir le pied", "Prenez des tiges de la plante bien portante, sans fleur ni maladie.", "", "Les boutures reprennent le goût de la plante mère.", ""),
      E("Couper la tige", "Menthe et basilic : tige de 10 cm, coupée sous un nœud. Romarin : tige de l'année de 8 à 10 cm, coupée sous un nœud.", "", "Une tige souple de l'année s'enracine plus vite.", ""),
      E("Nettoyer le bas", "Retirez les feuilles sur les 3 cm du bas. Enlevez les fleurs du basilic.", "", "Les feuilles enterrées ou mouillées pourrissent.", ""),
      E("Menthe et basilic : l'eau", "Mettez les tiges dans un verre d'eau claire, près de la fenêtre. Changez l'eau tous les 3 ou 4 jours.", "", "Elles font des racines en 1 à 2 semaines.", "eau"),
      E("Romarin et thym : la terre", "Plantez la tige à 3 cm de profondeur dans un mélange de sable et de terreau. Arrosez une fois. Le thym se bouture de la même façon.", "Le romarin déteste l'eau stagnante.", "Un sol léger évite la pourriture.", ""),
      E("Attendre", "Menthe et basilic : 1 à 2 semaines. Romarin : souvent 4 à 8 semaines, parfois plus. Tirez très doucement : s'il y a de la résistance, il y a des racines.", "", "Les racines apparaissent d'abord invisibles.", ""),
      E("Rempoter", "Plantez les boutures racinées dans un pot de terreau. Menthe : un pot à part, car elle prend toute la place.", "Ne mettez jamais la menthe en pleine terre à côté d'autres plantes.", "La menthe envahit tout.", ""),
      E("Pincer", "Quand elles ont plusieurs feuilles, coupez le bout des tiges. Elles feront plus de branches.", "", "Plus de branches, plus de feuilles à récolter.", "")
    ],
    erreurs: ["Laisser les feuilles tremper dans l'eau.", "Arroser trop le romarin.", "Planter la menthe au milieu d'autres plantes.", "Oublier de changer l'eau."],
    apres: ["Gardez le pot près d'une fenêtre claire.", "Récoltez les premières feuilles après 1 mois.", "Basilic : ne laissez pas monter à fleur."],
    mots: "bouture menthe basilic romarin aromatiques herbes aromatique thym sauge multiplier gratuit bouturage herbes basilique",
    plantes: ["menthe", "basilic", "romarin", "thym"] });

  G({ id: "marcottage-simple", titre: "Marcotter une branche basse (marcottage simple)", cat: "multiplier",
    but: "Faire raciner une branche encore attachée à la plante mère, puis la couper pour avoir un nouvel arbuste.",
    diff: "moyen", duree: "30 minutes, puis 6 à 12 mois d'attente", mois: [3, 4, 9, 10],
    mat: ["Un couteau propre", "Un crochet en fil de fer (ou une pierre)", "Un tuteur et un lien souple", "Du terreau", "Un arrosoir"],
    etapes: [
      E("Choisir la branche", "Prenez une branche souple et jeune, proche du sol, assez longue pour toucher la terre à 30 cm de son bout.", "", "Une branche souple se plie sans casser.", ""),
      E("Ameublir la terre", "Griffez la terre à l'endroit où la branche touchera le sol et ajoutez un peu de terreau.", "", "Une terre légère aide les racines à passer.", ""),
      E("Creuser une rigole", "Faites une rigole de 10 cm de profondeur, en pente douce.", "", "La branche doit pouvoir être enterrée sur quelques centimètres.", ""),
      E("Blesser légèrement", "Sous un nœud, enlevez un petit morceau d'écorce de 2 cm, ou faites une petite entaille.", "Coupez en vous éloignant de vos doigts.", "La blessure appelle la plante à faire des racines.", ""),
      E("Coucher et fixer", "Posez la partie blessée au fond de la rigole. Maintenez-la avec un crochet en fil de fer.", "", "Elle ne doit pas se relever.", "marcotte"),
      E("Recouvrir", "Recouvrez de terre. Redressez le bout de la branche (20 cm hors de terre) et attachez-le à un tuteur.", "", "Le bout dressé continue de pousser.", "marcotte"),
      E("Arroser", "Arrosez, puis gardez la terre fraîche pendant toute la période.", "", "Les racines ne se forment que dans une terre humide.", ""),
      E("Attendre un an", "Laissez la marcotte au moins 6 mois, souvent un an. Tirez très doucement le bout : s'il résiste, il y a des racines.", "", "Les racines mettent des mois à se former.", ""),
      E("Séparer", "Coupez la branche entre la marcotte et la plante mère. Déterrez avec sa motte et plantez-la ailleurs. Arrosez.", "", "Elle vit maintenant de ses propres racines.", "")
    ],
    erreurs: ["Casser la branche en la pliant.", "Laisser la terre sécher.", "Couper la marcotte trop tôt.", "Enterrer aussi le bout de la tige."],
    apres: ["Arrosez régulièrement pendant tout l'été suivant.", "Mettez du paillis au pied.", "Plantez-la à son emplacement définitif au printemps ou à l'automne."],
    mots: "marcottage marcotte simple branche basse enraciner clematite hortensia chevrefeuille rosier grimpant multiplier arbuste marcoter marcotage",
    plantes: ["clematite", "hortensia", "chevrefeuille", "rosier-grimpant"] });

  G({ id: "marcottage-aerien", titre: "Marcotter dans l'air (plante d'intérieur)", cat: "multiplier",
    but: "Faire des racines au milieu d'une grande tige (ficus, dracaena, monstera) pour la couper et en faire une nouvelle plante.",
    diff: "moyen", duree: "40 minutes, puis plusieurs semaines d'attente", mois: [4, 5, 6, 7, 8],
    mat: ["Un couteau propre", "Un cure-dent ou une allumette", "De la mousse de sphaigne humide (ou du terreau)", "Un film plastique transparent", "Des liens souples ou de la ficelle", "Un pot et du terreau pour la fin"],
    etapes: [
      E("Choisir l'endroit", "Cherchez une tige saine, 20 à 30 cm sous le sommet, juste sous un nœud.", "", "Les racines sortent plus facilement près d'un nœud.", ""),
      E("Blesser la tige", "Faites une entaille oblique vers le haut, sur le tiers de l'épaisseur. Ou enlevez un anneau d'écorce de 1 cm de large.", "Coupez en vous éloignant de vos doigts.", "La blessure oblige la plante à faire des racines.", ""),
      E("Garder la plaie ouverte", "Coincez un cure-dent dans l'entaille pour qu'elle reste bâillante.", "", "Si elle se referme, il n'y aura pas de racines.", ""),
      E("Préparer la mousse", "Trempez la sphaigne dans l'eau, puis pressez-la : elle doit être humide, sans goutter.", "", "Trop d'eau fait pourrir la tige.", ""),
      E("Entourer", "Entourez la plaie d'une boule de mousse de la taille d'une balle de tennis.", "", "La mousse garde l'humidité autour de la plaie.", "aerien"),
      E("Envelopper", "Enroulez le film plastique autour et attachez-le en haut et en bas.", "Fermez bien : l'humidité ne doit pas s'échapper.", "Le film garde l'humidité sans qu'il faille arroser.", "aerien"),
      E("Attendre", "Regardez à travers le film chaque semaine. Des racines blanches apparaissent souvent après 4 à 8 semaines, parfois plus.", "", "Les racines visibles montrent que c'est prêt.", ""),
      E("Couper et planter", "Quand les racines sont abondantes, coupez la tige juste sous la boule. Retirez le film. Plantez avec la mousse dans un pot de terreau.", "", "Les racines gardent leur mousse pour ne pas être abîmées.", ""),
      E("Soigner les deux", "Arrosez la jeune plante. Le pied d'origine repousse souvent de nouvelles tiges sous la coupe.", "", "Vous gardez deux plantes au lieu d'une.", "")
    ],
    erreurs: ["Mousse trop mouillée ou trop sèche.", "Film mal fermé.", "Couper avant que les racines soient nombreuses.", "Laisser la plaie se refermer."],
    apres: ["Arrosez peu dans les premiers jours.", "Placez la plante dans un endroit clair sans soleil direct.", "Pas d'engrais pendant 1 mois."],
    mots: "marcottage aerien marcotte ficus dracaena monstera philodendron tige trop haute dégarnie racines sur la tige film plastique sphaigne",
    plantes: ["ficus", "dracaena", "monstera", "philodendron"] });

  G({ id: "division-touffe", titre: "Diviser une touffe de vivace", cat: "multiplier",
    but: "Couper en plusieurs morceaux une grosse plante vivace pour la rajeunir et avoir de nouveaux pieds.",
    diff: "facile", duree: "1 heure", mois: [3, 4, 9, 10],
    mat: ["Une bêche ou une fourche-bêche", "Un couteau ou un sécateur propre", "Du compost", "Un arrosoir", "Du paillis"],
    etapes: [
      E("Choisir le moment", "Début du printemps (mars-avril) ou début de l'automne (septembre-octobre). Divisez une touffe qui a au moins 3 ou 4 ans, ou dont le centre se dégarnit.", "", "Une touffe dégarnie au centre est fatiguée : la diviser lui redonne de la force.", ""),
      E("Arroser la veille", "Arrosez bien le pied la veille pour que la terre soit souple.", "", "La terre mouillée tient aux racines et les protège.", ""),
      E("Déterrer", "Enfoncez la bêche en cercle autour de la touffe, à 15 cm du pied, puis soulevez la touffe entière.", "Ne coupez pas les racines trop près du pied.", "Il faut garder un maximum de racines.", ""),
      E("Secouer", "Secouez la terre pour voir les racines et les tiges.", "", "On voit mieux où couper.", ""),
      E("Couper en morceaux", "Coupez la touffe en 2 ou 3 morceaux, ou plus. Chaque morceau garde des tiges, plusieurs bourgeons et de bonnes racines. Coupez avec la bêche, un couteau ou un sécateur propre.", "Iris : divisez plutôt après la floraison (juillet-août). Coupez le rhizome (la grosse tige à plat) en tronçons, chacun avec un éventail de feuilles et des racines. Raccourcissez les feuilles à environ 15 cm et replantez le rhizome à fleur de terre.", "Chaque morceau devient une plante complète.", "division"),
      E("Jeter le centre", "Si le centre de la touffe est vieux, ligneux ou sans pousses, ne le replantez pas.", "", "Les jeunes bords repartent mieux que le vieux centre.", ""),
      E("Replanter tout de suite", "Plantez chaque morceau dans un trou assez large, avec du compost, à la même profondeur qu'avant.", "", "Des racines à l'air sèchent vite.", "trou"),
      E("Arroser et pailler", "Arrosez beaucoup. Mettez 5 cm de paillis autour, sans toucher les tiges.", "", "Le paillis garde la fraîcheur.", "paillage")
    ],
    erreurs: ["Diviser en pleine chaleur ou en pleine floraison.", "Faire des morceaux trop petits.", "Laisser les racines à l'air.", "Replanter trop profond."],
    apres: ["Arrosez chaque semaine le premier mois si le temps est sec.", "Elles refleurissent souvent dès l'année suivante.", "Divisez de nouveau dans 3 à 5 ans."],
    mots: "division diviser touffe vivace hosta hemerocalle iris geranium vivace heuchere bergenie agapanthe multiplier pied separer plante",
    plantes: ["hosta", "hemerocalle", "geranium-vivace", "heuchere", "bergenie", "iris-des-jardins"] });

  G({ id: "separer-rejets", titre: "Séparer les rejets (les « bébés »)", cat: "multiplier",
    but: "Détacher les petites plantes qui poussent au pied d'une grande (aloe, chlorophytum) pour en avoir de nouvelles.",
    diff: "facile", duree: "30 minutes", mois: [4, 5, 6, 7, 8, 9],
    mat: ["Un petit pot avec trous", "Du terreau pour cactées ou terreau léger", "Un couteau propre", "Un journal"],
    etapes: [
      E("Repérer les bébés", "Choisissez des rejets qui ont déjà 3 à 5 feuilles et, si possible, leurs propres racines.", "", "Un trop petit rejet n'a pas assez de force pour vivre seul.", ""),
      E("Préparer la terre", "Laissez la terre un peu humide mais pas détrempée avant de sortir la plante.", "", "Une terre trop sèche emporte les petites racines.", ""),
      E("Sortir la plante", "Sortez la plante de son pot et posez-la sur du papier journal (voir la fiche « Rempoter »).", "", "On voit mieux où sont les rejets.", ""),
      E("Séparer les rejets", "Chlorophytum : coupez le fil qui relie le bébé, quand de petites racines pointent. Aloe : séparez le rejet avec les doigts ou un couteau propre, avec ses propres racines.", "Aloe : la tige n'a pas de racine ? Laissez sécher 2 jours.", "Un rejet avec racines reprend plus facilement.", "division"),
      E("Laisser cicatriser", "Aloe : posez le rejet 1 ou 2 jours à l'air, à l'ombre, pour que la coupe sèche.", "", "Une coupe humide pourrit dans la terre.", ""),
      E("Planter", "Mettez un peu de terreau dans un petit pot. Placez le rejet, comblez, tassez doucement.", "Ne l'enterrez pas plus que sur ses racines.", "Trop enterré, il pourrit.", ""),
      E("Arroser peu", "Arrosez légèrement. Pour l'aloe, attendez 1 semaine avant d'arroser vraiment.", "", "Les racines coupées boivent mal au début.", ""),
      E("Remettre la mère", "Replantez la plante mère dans son pot avec du terreau neuf.", "", "Vous avez deux plantes au lieu d'une.", "")
    ],
    erreurs: ["Séparer un bébé trop petit.", "Arroser tout de suite l'aloe.", "Enterrer le cœur de la plante.", "Mettre les deux plantes en plein soleil tout de suite."],
    apres: ["Placez dans un endroit clair sans soleil direct pendant 2 semaines.", "Reprenez un arrosage normal quand de nouvelles feuilles apparaissent.", "Pas d'engrais pendant 1 mois."],
    mots: "rejets bebes plantule aloe vera chlorophytum plante araignee separer drageons stolons multiplier petites plantes au pied",
    plantes: ["aloe-vera", "chlorophytum"] });

  G({ id: "greffe-fente", titre: "Greffer en fente (pour les curieux)", cat: "multiplier",
    but: "Faire pousser une variété choisie (par exemple une pomme que vous aimez) sur un jeune arbre de la même espèce.",
    diff: "moyen", duree: "1 heure, puis plusieurs semaines d'attente", mois: [2, 3, 4],
    mat: ["Un greffoir ou un couteau très affûté et propre", "Un sécateur propre", "Du ruban ou du raphia à greffer", "Du mastic à greffer", "Un jeune arbre bien enraciné (le porte-greffe)", "Des rameaux de la variété voulue (les greffons)"],
    etapes: [
      E("Comprendre le principe", "On colle un petit rameau (le greffon) sur un jeune arbre (le porte-greffe). Les deux doivent être de la même espèce ou d'espèces très proches : pommier sur pommier, poirier sur poirier.", "", "Des arbres trop différents ne se soudent pas.", "greffe"),
      E("Couper les greffons", "En janvier ou février, par temps sans gel, coupez des rameaux de l'année, gros comme un crayon, de 20 cm, avec 3 ou 4 bourgeons.", "", "Le greffon doit dormir encore à la greffe.", ""),
      E("Garder au frais", "Enveloppez-les dans un linge humide, dans un sac, au bas du réfrigérateur, jusqu'en mars.", "", "Ils restent endormis et frais.", ""),
      E("Couper le porte-greffe", "En mars, quand la sève monte, coupez le porte-greffe en plat, à 10-20 cm du sol, juste au-dessus d'une partie lisse.", "", "La sève doit commencer à monter pour que ça prenne.", ""),
      E("Faire la fente", "Fendez le haut du tronc au milieu, sur 3 à 4 cm, avec le greffoir.", "Coupez toujours en vous éloignant de vos doigts.", "La fente accueille le greffon.", "greffe"),
      E("Tailler le greffon", "Taillez le bas du greffon en coin des deux côtés, sur 3 à 4 cm de long.", "", "Un coin large colle mieux.", "greffe"),
      E("Insérer", "Glissez le coin dans la fente. Alignez au moins un côté de l'écorce du greffon avec celle du porte-greffe.", "Les écorces doivent se toucher : c'est par là que la sève passe.", "Sans contact des écorces, la greffe ne prend pas.", "greffe"),
      E("Ligaturer et protéger", "Serrez avec le ruban de greffe. Recouvrez toutes les coupes de mastic à greffer, y compris le sommet du greffon.", "", "Le mastic empêche l'eau et les maladies d'entrer.", ""),
      E("Surveiller", "Les bourgeons verts apparaissent après quelques semaines. Supprimez les pousses qui sortent du porte-greffe sous la greffe.", "", "Ces pousses prennent la sève du greffon.", "")
    ],
    erreurs: ["Utiliser un couteau mal affûté ou sale.", "Greffer des espèces trop différentes.", "Écorces qui ne se touchent pas.", "Oublier le mastic."],
    apres: ["Enlevez la ligature quand la greffe est bien soudée (au bout de quelques mois à un an).", "Attachez la jeune pousse à un tuteur.", "Les premiers fruits arrivent souvent au bout de quelques années.", "Un échec n'est pas grave : beaucoup de greffes demandent plusieurs essais."],
    mots: "greffe greffer fente arbre fruitier pommier poirier greffon porte greffe rameau variete greffage",
    plantes: ["pommier-colonnaire", "poirier-colonnaire"] });

  G({ id: "semis-godet", titre: "Semer en godets à l'abri", cat: "semer",
    but: "Faire démarrer des graines au chaud, à l'intérieur, pour avoir de jeunes plants prêts à sortir au printemps.",
    diff: "facile", duree: "30 minutes, puis 2 à 3 semaines d'attente", mois: [2, 3, 4, 5],
    mat: ["Des godets ou petits pots percés", "Du terreau de semis", "Des graines", "Des étiquettes et un crayon", "Un pulvérisateur", "Un couvercle ou un sachet transparent", "Une assiette ou un plateau"],
    etapes: [
      E("Lire le sachet", "Regardez la date de semis, la profondeur et la chaleur conseillées.", "", "Chaque graine a ses besoins.", ""),
      E("Remplir les godets", "Remplissez de terreau de semis jusqu'à 1 cm sous le bord. Tassez légèrement. Humidifiez avec le pulvérisateur.", "", "Un terreau fin et humide aide les graines à germer.", ""),
      E("Semer", "Mettez 2 ou 3 graines par godet. Enfoncez-les à deux fois leur taille. Les graines très fines se posent en surface sans les enterrer.", "", "Une graine trop profonde n'arrive pas à sortir.", "godet"),
      E("Recouvrir", "Couvrez d'un peu de terreau, sauf pour les graines très fines. Tassez avec le bout des doigts.", "", "Le contact avec la terre aide la graine à boire.", ""),
      E("Étiqueter", "Écrivez le nom et la date sur chaque étiquette.", "", "Les jeunes plantes se ressemblent toutes.", ""),
      E("Arroser en pluie fine", "Mouillez avec le pulvérisateur. Posez les godets sur une assiette ou un plateau.", "Pas de jet fort : les graines iraient dans un coin.", "L'eau douce ne déplace pas les graines.", ""),
      E("Créer une mini-serre", "Couvrez d'un couvercle ou d'un sachet transparent. Mettez dans un endroit tiède (vers 18 à 22 degrés, ou la chaleur indiquée sur le sachet), très clair.", "", "La chaleur et l'humidité font germer les graines.", ""),
      E("Aérer chaque jour", "Soulevez le couvercle 5 minutes par jour. Gardez la terre juste humide.", "", "L'air évite les moisissures.", ""),
      E("Enlever le couvercle", "Dès que les premières feuilles sortent, retirez le couvercle et mettez à la lumière maximum, près d'une fenêtre.", "Une plante qui s'allonge et pâlit manque de lumière.", "Sans lumière, la plantule devient longue et faible.", ""),
      E("Éclaircir", "S'il y a 2 plantules par godet, gardez la plus belle. Coupez l'autre aux ciseaux, au ras de la terre.", "Ne l'arrachez pas : vous abîmeriez les racines de la voisine.", "Une seule plante forte vaut mieux que deux faibles.", "")
    ],
    erreurs: ["Semer trop profond.", "Trop arroser : les plantules fondent.", "Garder le couvercle fermé toute la journée.", "Oublier les étiquettes.", "Mettre dans un endroit sombre."],
    apres: ["Arrosez par le dessous : versez l'eau dans l'assiette, retirez le surplus après 15 minutes.", "Repiquez quand 2 à 4 vraies feuilles sont là.", "Habituez au dehors petit à petit avant la plantation."],
    mots: "semis semer godet graines tomate poivron aubergine basilic courgette germination terreau de semis mini serre abri chaud intérieur",
    plantes: ["tomate", "poivron", "aubergine", "basilic", "courgette"] });

  G({ id: "semis-pleine-terre", titre: "Semer en pleine terre", cat: "semer",
    but: "Semer directement dans le jardin ou une grande jardinière, pour les légumes et fleurs qui n'aiment pas être déplacés.",
    diff: "facile", duree: "30 minutes, puis 1 à 3 semaines d'attente", mois: [3, 4, 5, 6, 7, 8],
    mat: ["Un râteau ou une griffe", "Un cordeau ou une règle", "Les graines", "Un arrosoir à pomme fine", "Des étiquettes", "Un voile ou un filet de protection (facultatif)"],
    etapes: [
      E("Choisir le moment", "Lisez le sachet : la terre doit être dégelée et réchauffée. Radis, carottes et laitues se sèment tôt ; haricots et courgettes seulement après les derniers risques de gel (mai, souvent après la mi-mai).", "", "Une graine semée dans une terre froide pourrit.", ""),
      E("Préparer la terre", "Ôtez les pierres et les herbes. Griffez ou bêchez sur 10 à 15 cm. Émiettez les mottes. Râtissez pour avoir une terre fine.", "", "Une terre fine aide les graines minuscules.", ""),
      E("Tracer le sillon", "Tracez une ligne avec un cordeau. Creusez avec le manche du râteau : la profondeur est deux fois la taille de la graine.", "", "Une ligne facilite l'arrosage et le désherbage.", ""),
      E("Semer clair", "Laissez tomber les graines une à une, ou en les roulant entre les doigts. Évitez de semer trop serré.", "", "Trop serrées, les plantules se gênent.", ""),
      E("Recouvrir", "Rebouchez le sillon avec la terre. Tassez avec le plat de la main.", "", "La graine doit toucher la terre pour boire.", ""),
      E("Arroser en pluie fine", "Utilisez l'arrosoir avec une pomme fine. Mouillez bien, sans faire de flaque.", "", "Un jet fort déterre les graines.", "arrosoir"),
      E("Étiqueter", "Plantez une étiquette au bout du rang avec le nom et la date.", "", "On oublie vite ce qu'on a semé où.", ""),
      E("Protéger", "Posez un voile ou un filet contre les oiseaux. Surveillez les limaces le soir.", "", "Les oiseaux mangent les graines, les limaces les jeunes pousses.", ""),
      E("Éclaircir", "Quand les plantules ont 2 ou 3 vraies feuilles, gardez-en une tous les 3 à 10 cm selon le sachet. Coupez les autres au ras du sol.", "", "Chaque plante a besoin de place pour grandir.", "")
    ],
    erreurs: ["Semer trop tôt dans une terre froide.", "Semer trop profond ou trop serré.", "Laisser sécher la terre avant la levée.", "Ne pas éclaircir."],
    apres: ["Gardez la terre humide, en pluie fine, jusqu'à la levée.", "Désherbez avec précaution.", "Pailler autour des plants quand ils sont grands."],
    mots: "semis pleine terre semer jardin potager rang sillon radis carotte laitue haricot graines directement dehors semi",
    plantes: ["radis", "carotte", "laitue", "haricot-nain"] });

  G({ id: "repiquage", titre: "Repiquer de jeunes plants", cat: "semer",
    but: "Déplacer de petites plantules dans un pot plus grand pour qu'elles aient de la place et de bonnes racines.",
    diff: "facile", duree: "30 minutes", mois: [3, 4, 5],
    mat: ["Des godets de 7 à 9 cm avec trous", "Du terreau", "Une cuillère ou un bâtonnet", "Un crayon", "Un arrosoir ou un pulvérisateur"],
    etapes: [
      E("Choisir le moment", "Repiquez quand les plantules ont 2 à 4 vraies feuilles. Les 2 premières feuilles rondes ne comptent pas.", "", "Les vraies feuilles montrent que la plante est assez forte.", ""),
      E("Arroser la veille", "Arrosez les plantules la veille pour que la terre tienne bien aux racines.", "", "La terre humide se détache en morceaux, sans casser les racines.", ""),
      E("Préparer les godets", "Remplissez les godets de terreau. Faites un trou au crayon, assez profond pour les racines.", "", "Un trou prêt évite de plier les racines.", ""),
      E("Soulever la plantule", "Glissez la cuillère sous les racines. Soulevez avec un peu de terre. Tenez la plantule par une feuille, jamais par la tige.", "Ne pincez jamais la tige : elle est trop fragile.", "Une feuille repousse, une tige écrasée meurt.", ""),
      E("Trier", "Gardez les plus belles plantules : vertes, droites, avec de bonnes racines. Jetez les faibles.", "", "Une plante forte au départ donne une belle plante.", ""),
      E("Installer", "Posez la plantule dans le trou, racines bien droites. Pour la tomate, enterrez la tige jusqu'aux premières feuilles.", "", "La tomate fait des racines tout le long de la tige enterrée.", "godet"),
      E("Tasser et arroser", "Tassez la terre avec les doigts. Arrosez doucement.", "", "Il ne doit pas y avoir de vide autour des racines.", ""),
      E("Laisser reposer", "Mettez les godets à mi-ombre 2 ou 3 jours, puis dans un endroit très clair.", "", "La plante se remet de son déménagement.", "")
    ],
    erreurs: ["Tenir la plantule par la tige.", "Replier les racines.", "Repiquer trop petit ou trop tard.", "Mettre aussitôt en plein soleil."],
    apres: ["Arrosez régulièrement sans mouiller les feuilles.", "Habituez progressivement au dehors avant de planter.", "Plantez en place après les dernières gelées."],
    mots: "repiquage repiquer plantules jeunes plants godet tomate poivron aubergine laitue déplacer petites plantes repiqué",
    plantes: ["tomate", "poivron", "aubergine", "laitue"] });

  G({ id: "durcissement-plants", titre: "Habituer les plants au dehors (durcissement)", cat: "semer",
    but: "Sortir petit à petit des plants élevés à l'abri, pour qu'ils ne soient pas brûlés par le soleil ni abîmés par le vent.",
    diff: "facile", duree: "10 jours, un peu plus de temps dehors chaque jour", mois: [4, 5],
    mat: ["Les plants en godets", "Un plateau pour les porter", "Un endroit abrité du vent", "Un voile d'hivernage (facultatif)"],
    etapes: [
      E("Choisir la période", "Commencez 10 jours avant la plantation, quand les gelées sont finies ou presque. Regardez la météo.", "", "Un plant d'intérieur n'a jamais senti le vent ni le soleil.", ""),
      E("Jours 1 et 2", "Sortez les plants 1 à 2 heures, à l'ombre, dans un endroit sans vent.", "", "La première sortie doit rester douce.", ""),
      E("Jours 3 et 4", "Laissez-les 3 à 4 heures dehors, toujours à l'ombre claire.", "", "Les feuilles s'habituent à la lumière naturelle.", ""),
      E("Jours 5 et 6", "Laissez-les une demi-journée, avec un peu de soleil le matin.", "Pas de soleil de midi.", "Le soleil de midi brûle les jeunes feuilles.", ""),
      E("Jours 7 et 8", "Laissez-les toute la journée au soleil. Rentrez-les le soir.", "", "Ils s'habituent au vent et à la chaleur.", ""),
      E("Surveiller l'eau", "Regardez les godets deux fois par jour. Dehors, ils sèchent plus vite.", "", "Un jeune plant desséché ne se rattrape pas.", ""),
      E("Nuits dehors", "Jours 9 et 10 : laissez-les dehors la nuit si la nuit reste au-dessus de 10 degrés. Sinon, rentrez-les ou couvrez d'un voile fermé en bas par une ficelle.", "Tomate, aubergine, poivron : craignent le froid.", "Un froid soudain arrête leur croissance.", "voile"),
      E("Planter", "Plantez au jardin ou en bac le jour 11, de préférence par temps couvert.", "", "Un jour nuageux évite un choc de soleil à la plantation.", "")
    ],
    erreurs: ["Sortir directement en plein soleil.", "Oublier d'arroser.", "Laisser dehors par nuit froide.", "Planter avant le risque de gel passé (saints de glace, mi-mai)."],
    apres: ["Arrosez bien après la plantation.", "Gardez un voile sous la main au cas où une nuit froide arrive.", "Protégez-les des limaces."],
    mots: "durcissement acclimater plants sortir dehors habituer endurcir tomate aubergine poivron courgette saints de glace jeunes plants",
    plantes: ["tomate", "aubergine", "poivron", "courgette"] });

  G({ id: "plantation-pleine-terre", titre: "Planter en pleine terre", cat: "semer",
    but: "Installer une plante achetée ou élevée en pot dans le sol du jardin, pour qu'elle s'enracine bien.",
    diff: "facile", duree: "30 minutes", mois: [3, 4, 5, 10, 11],
    mat: ["Une bêche", "Du compost mûr", "Un seau d'eau", "Un arrosoir", "Un tuteur (si besoin)", "Du paillis"],
    etapes: [
      E("Choisir la place", "Regardez sur la fiche de la plante si elle aime le soleil, la mi-ombre ou l'ombre. Prévoyez la place qu'elle prendra adulte.", "", "Une plante au mauvais endroit souffre.", ""),
      E("Tremper la motte", "Plongez le pot dans un seau d'eau jusqu'à ce que les bulles s'arrêtent (10 à 15 minutes).", "", "Une motte sèche ne se mouille plus une fois en terre.", ""),
      E("Creuser le trou", "Creusez un trou 2 ou 3 fois plus large que la motte et aussi profond. Ameublissez le fond et les côtés avec la bêche.", "", "Les racines avancent bien dans une terre souple.", "trou"),
      E("Enrichir la terre", "Mélangez la terre sortie avec un peu de compost mûr.", "Pas d'engrais en contact avec les racines.", "Le compost nourrit doucement sans brûler les racines.", ""),
      E("Sortir du pot", "Retournez le pot, tapotez, sortez la motte. Démêlez les racines enroulées avec les doigts.", "", "Des racines en spirale continuent de tourner sur elles-mêmes.", ""),
      E("Installer", "Posez la motte dans le trou. Le haut de la motte arrive au niveau du sol, jamais en dessous.", "Ne couvrez pas le collet (le bas de la tige).", "Un collet enterré pourrit.", "trou"),
      E("Reboucher", "Remplissez de terre. Tassez avec les mains. Faites une cuvette autour de la plante.", "", "La cuvette retient l'eau d'arrosage.", ""),
      E("Arroser", "Arrosez largement : un arrosoir complet pour un arbuste, un demi pour une petite plante.", "", "L'eau fait descendre la terre entre les racines.", ""),
      E("Pailler", "Étalez 5 cm de paillis. Gardez 5 cm libres autour de la tige. Ajoutez un tuteur si le vent est fort.", "", "Le paillis garde l'humidité.", "paillage")
    ],
    erreurs: ["Planter trop profond.", "Oublier de tremper la motte.", "Trou trop petit.", "Planter par gel ou grosse chaleur."],
    apres: ["Arrosez chaque semaine la première année s'il ne pleut pas.", "Surveillez les limaces.", "Taillez très peu la première année."],
    mots: "plantation planter pleine terre arbuste jardin trou motte collet arbre fleurs planter dehors enterrer",
    plantes: ["lavande", "hortensia", "hosta"] });

  G({ id: "plantation-bac", titre: "Planter dans un bac ou une jardinière", cat: "semer",
    but: "Composer un bac fleuri ou un petit potager sur la terrasse, le balcon ou la cour.",
    diff: "facile", duree: "40 minutes", mois: [3, 4, 5, 9, 10],
    mat: ["Un bac ou une jardinière avec trous", "Des billes d'argile ou graviers", "Du terreau adapté", "Les plantes", "Un arrosoir", "Du paillis léger"],
    etapes: [
      E("Choisir le bac", "Pour les fleurs : 20 cm de profondeur. Pour les légumes : au moins 30 cm. Vérifiez qu'il a des trous.", "", "Un bac trop petit sèche en une journée.", ""),
      E("Nettoyer", "Lavez le bac à l'eau savonneuse s'il a déjà servi.", "", "Cela enlève les maladies de l'an dernier.", ""),
      E("Mettre le drainage", "Posez 3 à 5 cm de billes d'argile ou de graviers au fond (facultatif).", "", "Les trous restent dégagés et l'eau en trop peut sortir.", "pot"),
      E("Remplir à moitié", "Versez du terreau jusqu'à la moitié du bac.", "Pas de terre de jardin seule : elle durcit en bac.", "Le terreau reste léger et aéré.", ""),
      E("Essayer la disposition", "Posez les plantes dans leur pot sur le terreau. Laissez-leur la place de grandir (voir l'écart conseillé sur l'étiquette). Les plus grandes au fond ou au centre.", "Mettez ensemble des plantes qui aiment la même lumière et le même arrosage.", "Si l'une meurt de soif, l'autre meurt noyée.", ""),
      E("Planter", "Sortez chaque plante, démêlez les racines. Posez-la au niveau voulu, comblez de terreau et tassez.", "", "Elle doit être à la même hauteur qu'en pot.", ""),
      E("Laisser de la place", "Le terreau s'arrête 2 à 3 cm sous le bord du bac.", "", "L'eau reste dans le bac au lieu de déborder.", ""),
      E("Arroser", "Arrosez jusqu'à ce que l'eau sorte par le fond.", "", "Cela plaque le terreau contre les racines.", ""),
      E("Pailler et placer", "Ajoutez un paillis léger. Placez le bac à l'endroit voulu, sur des cales.", "", "Les cales laissent partir l'eau.", "")
    ],
    erreurs: ["Bac sans trou.", "Plantes qui n'aiment pas la même lumière.", "Trop de plantes serrées.", "Soucoupe pleine d'eau."],
    apres: ["Arrosez dès que le dessus du terreau est sec sur 2 cm.", "Donnez de l'engrais liquide léger après 1 mois.", "Retirez les fleurs fanées."],
    mots: "plantation bac jardiniere pot balcon terrasse cour fleurs potager en pot composer mettre plantes en bac balconniere",
    plantes: ["petunia", "geranium", "basilic", "begonia"] });

  G({ id: "recolte-graines", titre: "Récolter et garder ses graines", cat: "semer",
    but: "Garder les graines de vos plantes pour les semer l'an prochain, gratuitement.",
    diff: "facile", duree: "20 minutes, puis séchage de 1 à 2 semaines", mois: [7, 8, 9, 10],
    mat: ["Des enveloppes en papier ou petits bocaux", "Un crayon", "Une assiette ou du papier", "Un tamis (facultatif)", "Un pot d'eau (pour la tomate)"],
    etapes: [
      E("Choisir les plantes", "Choisissez de beaux pieds en bonne santé. Les graines des variétés « F1 » donnent des plantes différentes : prenez plutôt des variétés anciennes.", "", "Les graines viennent de la plante : elle en transmet ses défauts.", ""),
      E("Laisser mûrir", "Laissez les fleurs ou les fruits sur la plante jusqu'à ce que les capsules ou gousses soient sèches et brunes.", "", "Une graine non mûre ne germe pas.", ""),
      E("Récolter par temps sec", "Cueillez à la fin de la matinée par temps sec, après la rosée.", "", "Des graines mouillées moisissent.", ""),
      E("Graines sèches", "Haricots, capucines, soucis, cosmos : étalez les capsules sur du papier, à l'ombre, 1 à 2 semaines. Frottez-les ensuite pour libérer les graines.", "", "Elles doivent être bien sèches avant le rangement.", ""),
      E("Graines humides (tomate)", "Pressez les graines avec la pulpe dans un verre d'eau, pendant 2 à 3 jours. Rincez ensuite. Étalez sur une assiette et laissez sécher.", "Pas sur du papier : elles s'y collent.", "Cela retire l'enveloppe qui empêche la germination.", ""),
      E("Trier", "Retirez les débris, les graines abîmées ou vides.", "", "Seules les belles graines vont germer.", ""),
      E("Ranger", "Mettez dans une enveloppe en papier. Écrivez le nom et l'année. Gardez dans un endroit frais, sec et sombre.", "Pas de sachet plastique.", "L'humidité fait moisir les graines.", "graines"),
      E("Tester avant de semer", "Au printemps, posez 10 graines sur du coton humide dans une assiette. Comptez celles qui germent après 1 à 2 semaines.", "", "Cela dit si vos graines sont encore vivantes.", "")
    ],
    erreurs: ["Récolter trop tôt.", "Ranger des graines humides.", "Oublier le nom et l'année.", "Récolter sur un pied malade."],
    apres: ["La durée de vie des graines varie selon l'espèce, de 1 an à plusieurs années : le test de germination vous le dira.", "Semez plus serré si elles sont anciennes.", "Échangez-les avec des amis jardiniers."],
    mots: "graines recolter conserver sécher semences tomate capucine tagete haricot garder les graines conservation semence",
    plantes: ["tomate", "capucine", "tagete", "haricot-nain"] });

  G({ id: "taille-arbuste", titre: "Tailler et éclaircir un arbuste", cat: "tailler",
    but: "Garder un arbuste en bonne santé, aéré et bien fleuri en enlevant ce qui est mort, gênant ou trop dense.",
    diff: "facile", duree: "40 minutes", mois: [2, 3, 6, 7],
    mat: ["Un sécateur affûté et propre", "Un ébrancheur pour les grosses branches", "Des gants", "Une bâche pour les déchets", "De l'alcool pour nettoyer les outils"],
    etapes: [
      E("Savoir quand tailler", "Arbuste qui fleurit en fin d'été sur les pousses de l'année (buddléia, hortensia paniculé) : taillez en fin d'hiver (février-mars). Arbuste qui fleurit au printemps ou au début de l'été : taillez juste après la floraison. Hortensia à grosses boules : au printemps, retirez seulement le bois mort et les fleurs fanées. Jamais par gel.", "Si vous ne savez pas, attendez la fin de la floraison.", "Tailler au mauvais moment retire les fleurs de l'année.", ""),
      E("Préparer les outils", "Nettoyez les lames à l'alcool. Vérifiez qu'elles coupent net.", "Certains arbustes (fusain, laurier-rose, if...) sont toxiques : portez des gants et lavez-vous les mains après.", "Des lames propres évitent de transmettre des maladies.", ""),
      E("Reculer et regarder", "Faites un pas en arrière et regardez la forme. Imaginez ce que vous voulez garder.", "", "On voit mieux les problèmes de loin.", ""),
      E("Enlever le bois mort", "Coupez les branches sèches, cassées ou malades. Coupez jusqu'au bois vert à l'intérieur.", "", "Le bois mort peut abriter des maladies.", "taille"),
      E("Enlever les gêneuses", "Supprimez les branches qui se croisent, se frottent ou poussent vers le centre.", "", "Le centre doit rester aéré pour que l'arbuste sèche vite.", "taille"),
      E("Éclaircir", "Coupez à la base quelques-unes des plus vieilles branches (jusqu'au quart de l'arbuste).", "", "Cela fait repartir de jeunes branches.", ""),
      E("Raccourcir", "Si besoin, raccourcissez en coupant en biseau, 5 mm au-dessus d'un bourgeon qui regarde vers l'extérieur.", "", "La nouvelle branche pousse vers l'extérieur.", "biseau"),
      E("Reculer et vérifier", "Regardez de nouveau. Rééquilibrez si un côté est trop vide.", "Ne retirez jamais plus du tiers de l'arbuste d'un coup.", "Trop couper l'affaiblit.", ""),
      E("Nettoyer", "Ramassez les branches. Nettoyez les outils.", "", "Les déchets malades peuvent contaminer le sol.", "")
    ],
    erreurs: ["Tailler au mauvais moment.", "Couper trop court d'un coup.", "Laisser des chicots (moignons).", "Tailler avec des outils sales."],
    apres: ["Arrosez si le temps est sec.", "Mettez un peu de compost au pied.", "Taillez de nouveau l'an prochain, un peu à la fois."],
    mots: "taille tailler arbuste eclaircir formation couper branches sécateur élagage elaguer haie bois mort",
    plantes: ["fusain", "aucuba", "hortensia"] });

  G({ id: "taille-rosiers", titre: "Tailler les rosiers", cat: "tailler",
    but: "Avoir plus de fleurs et un rosier en bonne santé, grâce à une taille de fin d'hiver.",
    diff: "moyen", duree: "30 minutes par rosier", mois: [2, 3],
    mat: ["Un sécateur affûté et propre", "Des gants épais", "De l'alcool pour désinfecter", "Un sac pour les branches"],
    etapes: [
      E("Choisir le bon moment", "Taillez fin février à mars, quand les bourgeons gonflent et que les forsythias fleurissent, hors gel fort.", "Rosiers qui ne fleurissent qu'une fois : taillez après la floraison.", "Tailler trop tôt expose les jeunes pousses au gel.", ""),
      E("S'équiper", "Mettez des gants épais. Passez de l'alcool sur les lames.", "", "Les épines blessent, les lames sales transmettent des maladies.", ""),
      E("Retirer le bois mort", "Coupez toute tige noire, sèche ou dont l'intérieur est brun. Coupez jusqu'à voir le cœur blanc.", "", "Un cœur blanc, c'est du bois sain.", "taille"),
      E("Retirer les faibles", "Coupez les tiges plus fines qu'un crayon et celles qui se croisent.", "", "Elles prennent de la sève sans donner de belles fleurs.", "taille"),
      E("Garder les fortes", "Gardez 3 à 5 tiges solides, bien réparties, qui forment un vase ouvert.", "", "Un vase ouvert laisse passer l'air et la lumière.", ""),
      E("Raccourcir", "Rosier buisson : coupez chaque tige gardée à 3 à 5 bourgeons au-dessus du sol (environ 15 à 20 cm).", "", "Plus on coupe court, souvent moins de fleurs mais plus grandes.", "biseau"),
      E("Bien couper", "Faites une coupe en biseau, 5 mm au-dessus d'un bourgeon tourné vers l'extérieur.", "", "La pousse part vers l'extérieur et la pluie s'écoule.", "biseau"),
      E("Rosier grimpant", "Ne raccourcissez pas les grandes branches. Raccourcissez seulement les petites branches latérales à 2 ou 3 bourgeons.", "", "Les grandes branches portent les fleurs de demain.", ""),
      E("Ramasser", "Ramassez toutes les branches et les feuilles tombées. Jetez-les à la déchetterie, pas au compost si elles sont tachées.", "", "Les taches noires peuvent revenir par les feuilles au sol.", "")
    ],
    erreurs: ["Tailler en plein gel.", "Couper au ras du sol.", "Oublier de désinfecter les outils.", "Couper trop près ou trop loin du bourgeon.", "Laisser du bois mort."],
    apres: ["Mettez du compost au pied.", "Arrosez en cas de sécheresse.", "Retirez les fleurs fanées pendant l'été pour avoir plus de fleurs."],
    mots: "taille rosier rosiers tailler fin d'hiver forsythia buisson grimpant sécateur rosé rosiers en pot",
    plantes: ["rosier-pot", "rosier-grimpant"] });

  G({ id: "pincement-tomate", titre: "Pincer les gourmands de la tomate", cat: "tailler",
    but: "Retirer les petites pousses inutiles pour que la tomate donne plus de fruits et plus gros.",
    diff: "facile", duree: "10 minutes par semaine", mois: [6, 7, 8],
    mat: ["Vos doigts", "Un sécateur propre (pour les grosses pousses)", "Un tuteur", "Un lien souple"],
    etapes: [
      E("Vérifier la variété", "Ce geste est pour les tomates « à croissance indéfinie » (celles qui montent haut avec un tuteur). Les tomates buisson ou naines ne se pincent pas.", "Si le sachet ne le dit pas, ne pincez pas.", "Pincer une tomate buisson réduit la récolte.", ""),
      E("Trouver les gourmands", "Un gourmand est une petite pousse qui naît entre la tige principale et une branche à feuilles.", "", "Ces pousses prennent de la sève et encombrent le plant.", ""),
      E("Choisir le bon jour", "Faites-le le matin par temps sec, une fois par semaine, dès que le plant a 30 cm.", "", "Les petites plaies sèchent vite par temps sec.", ""),
      E("Pincer", "Pincez entre le pouce et l'index les gourmands de moins de 5 cm. Pincez d'un geste net.", "Gros gourmand : coupez au sécateur propre.", "Les plaies sont plus petites quand on pince tôt.", ""),
      E("Garder la tige principale", "Ne touchez pas à la tige principale ni aux fleurs.", "", "Ce sont elles qui portent les fruits.", ""),
      E("Retirer les feuilles du bas", "Coupez les feuilles jaunes ou qui touchent le sol, jusqu'au premier bouquet de fruits.", "", "Cela évite les maladies de la terre.", ""),
      E("Attacher", "Attachez régulièrement la tige au tuteur avec un lien souple.", "", "La tige chargée de fruits doit être soutenue.", "tuteur"),
      E("Étêter en fin d'été", "En fin d'été (août, un peu plus tôt dans le Nord), coupez le haut de la tige 2 feuilles au-dessus du dernier bouquet.", "", "La plante met son énergie dans les fruits déjà là.", "")
    ],
    erreurs: ["Pincer des tomates buisson.", "Pincer par temps humide.", "Couper les fleurs.", "Utiliser un outil sale."],
    apres: ["Arrosez au pied, régulièrement.", "Donnez un engrais pour tomates selon sa notice (souvent toutes les 2 semaines).", "Récoltez quand les fruits sont bien colorés."],
    mots: "pincement tomate gourmands ebourgeonnage ébourgeonner tomates tuteur pincer aisselle gourmant",
    plantes: ["tomate", "tomate-cerise"] });

  G({ id: "tuteurage", titre: "Mettre un tuteur à une plante", cat: "tailler",
    but: "Soutenir une plante fragile ou haute pour qu'elle ne casse pas avec le vent ou le poids des fruits.",
    diff: "facile", duree: "15 minutes", mois: [4, 5, 6, 7, 8],
    mat: ["Un tuteur (bambou, piquet)", "Un lien souple (raphia, tissu, attache de jardin)", "Un maillet ou un marteau (si piquet épais)"],
    etapes: [
      E("Choisir le tuteur", "Prenez-en un aussi haut que la plante adulte. Il doit être solide.", "", "Un tuteur trop court ne sert à rien.", ""),
      E("Le placer tôt", "Plantez le tuteur en même temps que la plante, ou quand elle est encore petite.", "", "Si on l'enfonce plus tard, on abîme les racines.", ""),
      E("L'enfoncer", "Enfoncez-le à 5-10 cm de la tige, sur 20 à 30 cm de profondeur.", "", "Un tuteur bien enfoncé ne bouge pas.", "tuteur"),
      E("Choisir le côté", "Mettez-le du côté du vent dominant.", "", "La plante s'appuie sur le tuteur au lieu de casser.", ""),
      E("Préparer le lien", "Prenez un lien souple et plat. N'utilisez pas de fil de fer nu.", "", "Un fil dur coupe la tige.", ""),
      E("Faire un huit", "Passez le lien autour du tuteur, croisez-le en forme de 8, puis autour de la tige. Nouez au tuteur.", "Le lien ne doit pas serrer la tige.", "Le huit laisse la tige grossir sans être coincée.", "tuteur"),
      E("Attacher sous une feuille", "Attachez sous une feuille ou un nœud, pour que le lien ne glisse pas.", "", "Le lien ne descend pas.", ""),
      E("Remonter les liens", "Ajoutez un lien tous les 20 à 30 cm à mesure que la plante grandit.", "", "La plante est soutenue sur toute sa hauteur.", ""),
      E("Contrôler", "Regardez après chaque coup de vent. Desserrez si le lien serre.", "", "Une tige qui grossit peut se blesser.", "")
    ],
    erreurs: ["Utiliser un fil dur.", "Serrer trop fort.", "Mettre le tuteur trop tard.", "Prendre un tuteur trop court."],
    apres: ["Vérifiez les liens chaque semaine.", "Retirez les liens et tuteurs une fois la plante solide.", "Rangez les tuteurs au sec en fin de saison."],
    mots: "tuteur tuteurage soutenir attacher piquet bambou lien raphia tomate haricot grimpant plante qui tombe",
    plantes: ["tomate", "haricot-grimpant", "rosier-grimpant"] });

  G({ id: "paillage", titre: "Pailler le sol", cat: "entretenir",
    but: "Couvrir la terre pour garder l'humidité, limiter les mauvaises herbes et protéger du froid.",
    diff: "facile", duree: "30 minutes", mois: [4, 5, 6, 10, 11],
    mat: ["Du paillis : tonte sèche, feuilles mortes, paille, écorces, broyat ou paillettes de lin", "Une fourche ou un seau", "Un arrosoir"],
    etapes: [
      E("Choisir le paillis", "Tonte de gazon séchée, feuilles mortes, paille, écorces ou broyat : tout convient. Évitez les paillis traités.", "La tonte fraîche s'étale en couche très fine (2 cm), sinon elle chauffe et sent mauvais.", "Un paillis naturel nourrit aussi la terre en se décomposant.", ""),
      E("Désherber", "Arrachez les herbes qui poussent déjà.", "", "Sinon elles poussent à travers le paillis.", ""),
      E("Arroser la terre", "Arrosez avant de pailler, si la terre est sèche.", "", "Le paillis garde l'humidité qui s'y trouve ; il ne la crée pas.", ""),
      E("Attendre que le sol soit chaud", "Au printemps, attendez que la terre se soit réchauffée (avril-mai).", "", "Un paillis trop tôt garde le froid dans le sol.", ""),
      E("Étaler", "Étalez une couche de 5 à 8 cm sur toute la surface autour des plantes.", "", "Cette épaisseur empêche la lumière de faire pousser les mauvaises herbes.", "paillage"),
      E("Laisser un vide", "Gardez 5 cm sans paillis autour de la tige ou du tronc.", "Un paillis collé à la tige la fait pourrir.", "L'air doit toucher le collet de la plante.", "paillage"),
      E("Surveiller les limaces", "Regardez le soir : un paillis humide abrite des limaces. Pour les salades, mettez une couche plus fine.", "", "Les limaces aiment l'humidité.", ""),
      E("Renouveler", "Ajoutez du paillis quand il est décomposé, une ou deux fois par an.", "", "Le paillis fond doucement dans la terre.", "")
    ],
    erreurs: ["Pailler un sol sec ou glacé.", "Étaler le paillis contre les tiges.", "Mettre une couche trop épaisse de tonte fraîche.", "Utiliser du paillis traité."],
    apres: ["Arrosez moins souvent : la terre reste fraîche.", "Complétez quand la couche devient fine.", "En automne, un paillis de feuilles protège du gel."],
    mots: "paillage pailler paillis tonte paille ecorces broyat mauvaises herbes humidité sol couvrir la terre mulch",
    plantes: ["tomate", "rosier-pot", "hortensia"] });

  G({ id: "arrosage", titre: "Bien arroser (pot, cour, vacances)", cat: "entretenir",
    but: "Donner la bonne quantité d'eau, au bon moment, pour que la plante ne manque ni ne se noie.",
    diff: "facile", duree: "10 minutes", mois: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    mat: ["Un arrosoir à pomme fine", "Une soucoupe", "Une corde en coton et un seau (vacances)", "Du paillis"],
    etapes: [
      E("Tester la terre", "Enfoncez un doigt à 2 ou 3 cm dans la terre. Si elle est sèche, arrosez. Si elle est humide, attendez.", "", "Le doigt est le meilleur outil : il évite d'arroser par habitude.", ""),
      E("Choisir l'heure", "Arrosez tôt le matin ou en fin de journée, jamais en plein soleil.", "", "Au soleil, l'eau s'évapore avant d'avoir pénétré dans la terre.", ""),
      E("Arroser au pied", "Versez l'eau sur la terre, pas sur les feuilles et les fleurs.", "", "Des feuilles mouillées attrapent des maladies.", "arrosoir"),
      E("Arroser lentement", "Versez peu à peu et à plusieurs reprises, jusqu'à ce que l'eau sorte par le fond du pot.", "", "Une terre sèche laisse d'abord filer l'eau.", "arrosoir"),
      E("Vider la soucoupe", "Après 15 minutes, videz l'eau restée dans la soucoupe ou le cache-pot.", "Une plante qui a les pieds dans l'eau pourrit.", "Les racines ont besoin d'air.", ""),
      E("Cour et bacs en été", "Arrosez moins souvent mais plus fort. Un paillis sur la terre aide. Utilisez l'eau de pluie si possible.", "", "Un arrosage profond fait descendre les racines.", ""),
      E("Avant les vacances", "Arrosez largement. Déplacez les plantes à l'ombre. Posez une corde en coton : un bout dans un seau d'eau, l'autre enfoncé dans le pot.", "Essayez le système une semaine avant de partir.", "La corde amène l'eau doucement, pendant des jours.", ""),
      E("Hiver", "Arrosez beaucoup moins : souvent une fois toutes les 2 à 3 semaines pour les plantes d'intérieur au repos. Vérifiez toujours avec le doigt.", "", "Les plantes boivent moins quand il fait froid et sombre.", "")
    ],
    erreurs: ["Arroser un peu tous les jours.", "Laisser de l'eau dans la soucoupe.", "Arroser en plein soleil.", "Mouiller les feuilles le soir."],
    apres: ["Feuilles molles et flétries : souvent un manque d'eau. Feuilles jaunes et molles : souvent trop d'eau. Vérifiez avec le doigt.", "Notez vos arrosages dans le carnet.", "Utilisez de l'eau à température ambiante."],
    mots: "arrosage arroser eau pot cour vacances goutte a goutte soif plante qui seche trop arrosé combien d'eau pluie mèche",
    plantes: ["tomate", "monstera", "geranium", "basilic"] });

  G({ id: "nettoyage-outils", titre: "Nettoyer et désinfecter ses outils", cat: "entretenir",
    but: "Garder des outils propres, tranchants et sans rouille, et éviter de transmettre des maladies d'une plante à l'autre.",
    diff: "facile", duree: "20 minutes", mois: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    mat: ["Une brosse dure", "Du savon et de l'eau", "De l'alcool à 70 degrés ou du vinaigre blanc", "De la laine d'acier fine", "Un chiffon", "De l'huile (huile à machine à coudre ou huile végétale)", "Une pierre à aiguiser"],
    etapes: [
      E("Quand le faire", "Après chaque usage, et avant de passer d'une plante malade à une plante saine.", "", "Une lame sale transporte des maladies.", ""),
      E("Brosser", "Enlevez la terre et les débris avec la brosse dure.", "", "La terre garde l'humidité qui fait rouiller.", ""),
      E("Laver", "Lavez à l'eau savonneuse. Rincez.", "", "Le savon retire la sève collante.", ""),
      E("Enlever la rouille", "Frottez avec de la laine d'acier fine. Pour une rouille tenace, trempez dans du vinaigre blanc une nuit.", "", "La rouille use les lames.", ""),
      E("Désinfecter", "Passez un chiffon imbibé d'alcool à 70 degrés sur les lames pendant 1 minute. Laissez sécher.", "Pas de flamme à côté de l'alcool.", "L'alcool tue les germes sur la lame.", ""),
      E("Affûter", "Passez la pierre à aiguiser en suivant l'angle de la lame, toujours dans le même sens.", "Lame vers l'extérieur, loin de vos mains.", "Une lame tranchante fait une coupe nette qui guérit vite.", "outil"),
      E("Sécher", "Essuyez avec un chiffon sec. Laissez sécher à l'air.", "", "Un outil humide rouille vite.", ""),
      E("Huiler", "Mettez une goutte d'huile sur les lames et les ressorts. Essuyez l'excès.", "", "L'huile protège de la rouille.", ""),
      E("Ranger", "Suspendez les outils au sec, lames fermées, hors de portée des enfants.", "", "Les outils posés par terre rouillent et blessent.", "")
    ],
    erreurs: ["Ranger les outils mouillés.", "Oublier de désinfecter après une plante malade.", "Utiliser de l'huile en trop.", "Laisser les outils à portée des enfants."],
    apres: ["Vérifiez les poignées en bois : huile de lin si elles sèchent.", "Affûtez deux fois par an.", "Faites une révision complète en fin de saison."],
    mots: "outils nettoyer desinfecter sécateur lame rouille affuter huile entretien outillage alcool vinaigre pelle bêche",
    plantes: [] });

  G({ id: "compost-petit-espace", titre: "Faire du compost en petit espace", cat: "fabriquer",
    but: "Transformer épluchures et feuilles en terreau gratuit, dans un bac sur la cour ou avec un lombricomposteur.",
    diff: "facile", duree: "20 minutes pour commencer, puis 6 à 12 mois", mois: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    mat: ["Un composteur de cour (300 à 400 litres) ou un lombricomposteur", "Des déchets de cuisine végétaux", "Du carton brun ou des feuilles sèches", "Un couteau pour couper les déchets", "Une fourche à compost"],
    etapes: [
      E("Choisir le bac", "Bac de cour : posez-le sur la terre nue, à mi-ombre. Lombricomposteur : à l'intérieur, entre 15 et 25 degrés, à l'abri du gel et du soleil.", "", "Les petites bêtes du sol et les vers font le travail.", ""),
      E("Savoir quoi mettre", "Épluchures de légumes et fruits, marc de café, sachets de thé, coquilles d'œufs écrasées, carton brun déchiré, feuilles mortes.", "", "Ce sont des déchets végétaux, sans huile.", ""),
      E("Savoir quoi éviter", "Pas de viande, poisson, produits laitiers, huile, restes cuits, plantes malades. Lombricomposteur : peu d'agrumes, ail et oignon.", "", "Ils sentent mauvais et attirent les rongeurs.", ""),
      E("Équilibrer", "Pour 1 part de déchets humides (verts), mettez environ 1 à 2 parts de déchets secs (bruns) comme du carton ou des feuilles.", "", "Cet équilibre évite les mauvaises odeurs.", "compost"),
      E("Couper petit", "Coupez les gros déchets en morceaux de 2 à 3 cm.", "", "Petits morceaux, compost plus rapide.", ""),
      E("Aérer", "Brassez le bac de cour toutes les 2 à 4 semaines avec la fourche.", "", "L'air aide les bactéries utiles.", ""),
      E("Surveiller l'humidité", "Le compost doit être humide comme une éponge essorée. Trop sec : ajoutez de l'eau. Trop mouillé : ajoutez du carton.", "", "Trop d'eau chasse l'air, trop peu arrête le travail.", ""),
      E("Lombricomposteur", "Ajoutez les déchets par petites quantités, une fois par semaine, et couvrez-les d'un carton. Le jus qui coule au robinet (le lixiviat) s'utilise dilué dans beaucoup d'eau (souvent 1 volume pour 10 d'eau), jamais pur.", "", "Les vers mangent peu à peu ; trop d'un coup les rend malades.", ""),
      E("Récolter", "Le compost est mûr quand il est brun foncé, friable, avec une odeur de sous-bois (souvent 6 à 12 mois). Tamisez-le.", "", "Un compost mûr ne brûle pas les racines.", ""),
      E("L'utiliser", "Étalez 1 à 2 cm au pied des plantes ou mélangez-le au terreau.", "", "Il nourrit doucement le sol.", "")
    ],
    erreurs: ["Mettre de la viande ou des plats cuits.", "Oublier les déchets secs.", "Laisser le tas trop mouillé.", "Utiliser le compost encore frais."],
    apres: ["Continuez à ajouter des déchets, en alternant secs et humides.", "Gardez toujours un sac de feuilles sèches à côté.", "Pour un compost sans odeur, pensez à brasser."],
    mots: "compost composteur lombricomposteur vers dechets cuisine epluchures terreau gratuit petit espace bac balcon cour ver de terre composter",
    plantes: [] });

  G({ id: "terreau-maison", titre: "Préparer son terreau maison", cat: "fabriquer",
    but: "Faire un mélange de terre adapté à ce que vous voulez planter : plantes vertes, cactées ou semis.",
    diff: "facile", duree: "30 minutes", mois: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    mat: ["Du compost mûr tamisé", "De la terre de jardin saine", "Du sable grossier ou de la perlite", "Un seau ou un pot pour mesurer", "Une bâche", "Un tamis"],
    etapes: [
      E("Choisir la recette", "Plantes vertes : 2 parts de compost mûr + 1 part de terre + 1 part de sable ou perlite. Cactées et succulentes : 1 part de compost + 1 part de terre + 2 parts de sable grossier. Semis : 1 part de compost très fin + 1 part de sable + 1 part de terre fine.", "Ce sont des recettes courantes de jardiniers, pas une norme : ajustez selon vos plantes. Pour les semis, un terreau de semis du commerce est plus sûr.", "Chaque plante aime un sol différent.", ""),
      E("Rassembler", "Posez tous les ingrédients sur une bâche. Utilisez toujours le même seau pour mesurer.", "", "Les « parts » doivent être égales.", ""),
      E("Tamiser", "Passez la terre et le compost dans un tamis. Enlevez cailloux et racines.", "", "Une terre fine convient aux petites racines.", ""),
      E("Mesurer", "Versez chaque ingrédient avec le seau, selon la recette.", "", "Les bonnes proportions donnent la bonne texture.", ""),
      E("Mélanger", "Mélangez à la pelle ou à la main, jusqu'à ce que la couleur soit partout la même.", "", "Un mélange régulier évite les poches trop humides.", ""),
      E("Humidifier", "Ajoutez un peu d'eau. En serrant une poignée, elle doit se tenir, puis s'émietter quand on la touche.", "", "Un mélange sec est difficile à mouiller ensuite.", ""),
      E("Tester", "Remplissez un pot et arrosez-le. L'eau doit passer en quelques secondes.", "Si l'eau reste dessus : ajoutez du sable.", "L'eau doit s'écouler, sinon les racines pourrissent.", "pot"),
      E("Ranger", "Gardez le mélange dans un seau fermé, au sec. Étiquetez-le. Utilisez-le dans les 3 à 6 mois.", "", "Un mélange mouillé et fermé moisit.", "")
    ],
    erreurs: ["Utiliser de la terre de jardin malade.", "Mélange trop tassé et lourd.", "Compost pas mûr.", "Oublier de tester le drainage."],
    apres: ["Les plantes en pot peuvent recevoir un engrais léger après 1 à 2 mois.", "Gardez les restes dans un seau fermé.", "Notez la recette qui marche bien dans le carnet."],
    mots: "terreau maison melange terre compost sable perlite fabriquer substrat cactees plantes vertes semis recette de terreau",
    plantes: [] });

  G({ id: "protection-hiver", titre: "Protéger les plantes du froid", cat: "proteger",
    but: "Éviter que le gel abîme les plantes fragiles de la cour : les rentrer ou les couvrir.",
    diff: "facile", duree: "1 heure", mois: [10, 11, 12, 1, 2],
    mat: ["Un voile d'hivernage", "De la paille ou des feuilles sèches", "Du papier bulle ou de la toile de jute", "Des cales ou briques", "De la ficelle"],
    etapes: [
      E("Regarder la météo", "Surveillez les prévisions dès octobre. Protégez les plantes sensibles avant la première nuit de gel.", "", "Un seul gel fort peut tuer une plante fragile.", ""),
      E("Trier les plantes", "Géranium, laurier-rose, agrumes, hibiscus d'intérieur et plantes d'intérieur sorties l'été doivent rentrer. Les arbustes rustiques restent dehors.", "Laurier-rose : toute la plante est toxique et sa sève irrite. Portez des gants, lavez-vous les mains ensuite et tenez-le loin des enfants et des animaux.", "Chaque plante supporte un froid différent.", ""),
      E("Nettoyer avant de rentrer", "Retirez les feuilles mortes. Regardez le dessous des feuilles : pas d'insectes ? Ils passeraient à l'intérieur.", "", "Vous n'amenez pas les insectes dans la maison.", ""),
      E("Choisir la pièce", "Un endroit clair et frais, entre 5 et 12 degrés, hors gel : véranda, garage vitré, escalier.", "", "Trop chaud, la plante s'étiole.", ""),
      E("Arroser moins", "Arrosez très peu : seulement pour que la terre ne devienne pas poussiéreuse.", "", "La plante dort, elle boit peu.", ""),
      E("Pots restés dehors", "Regroupez les pots contre un mur au sud. Posez-les sur des cales. Entourez-les de papier bulle ou de toile de jute.", "", "Un pot qui gèle fait éclater les racines.", ""),
      E("Couvrir avec un voile", "Posez un voile d'hivernage sur la plante et fermez-le en bas avec de la ficelle.", "Pas de plastique étanche : la plante étouffe.", "Le voile laisse passer l'air.", "voile"),
      E("Pailler le pied", "Mettez 10 à 15 cm de paille ou de feuilles sèches à la base.", "", "Cela protège les racines.", ""),
      E("Aérer", "Les jours doux, soulevez le voile quelques heures. Enlevez-le quand les gelées ne sont plus à craindre (mars-avril selon la région).", "", "L'humidité sous un voile fermé fait pourrir.", "")
    ],
    erreurs: ["Intervenir trop tard.", "Utiliser du plastique fermé.", "Rentrer dans un endroit chauffé trop fort.", "Arroser comme en été."],
    apres: ["Regardez vos plantes une fois par mois.", "Sortez-les progressivement en avril-mai.", "Les premiers jours dehors, laissez-les à l'ombre."],
    mots: "hivernage hiver gel froid proteger voile rentrer pots laurier rose geranium agrumes citronnier mandarinier protection hivernale gelée",
    plantes: ["geranium", "laurier-rose", "citronnier", "mandarinier", "figuier"] });

  G({ id: "traitement-bio", titre: "Soigner avec des produits naturels", cat: "proteger",
    but: "Utiliser purin d'ortie, savon noir ou bouillie bordelaise de façon prudente, pour nourrir ou soigner vos plantes.",
    diff: "moyen", duree: "30 minutes, puis 2 semaines pour le purin", mois: [4, 5, 6, 7, 8, 9],
    mat: ["Des gants et des lunettes", "Un seau en plastique (pas en métal)", "Des orties fraîches", "Du savon noir liquide, de préférence vendu pour traiter les plantes", "Un pulvérisateur propre", "Une passoire fine", "Des étiquettes"],
    etapes: [
      E("Choisir le produit", "Purin d'ortie : pour nourrir et fortifier la plante. Savon noir : contre les pucerons et les cochenilles. Bouillie bordelaise (à base de cuivre) : contre des maladies comme le mildiou, seulement en dernier recours, avec un produit portant la mention « Emploi autorisé dans les jardins », à la dose de sa notice.", "En France, un jardinier amateur n'a droit qu'aux produits naturels ou de biocontrôle portant la mention « Emploi autorisé dans les jardins » (loi Labbé). Le cuivre reste dans le sol : peu et rarement. Lisez toujours la notice.", "Chaque produit sert à un usage précis.", ""),
      E("S'équiper", "Mettez des gants et des lunettes. Tenez enfants et animaux à distance.", "", "Même naturels, ces produits irritent peau et yeux.", ""),
      E("Préparer le purin", "Avec des gants (les orties piquent), mettez 1 kg d'orties fraîches (ou 200 g sèches) dans 10 litres d'eau de pluie, dans un seau en plastique. Couvrez d'un grillage ou d'un couvercle posé sans le fermer.", "", "Les orties fermentent dans l'eau.", ""),
      E("Remuer", "Remuez tous les jours avec un bâton. Le purin est souvent prêt en 1 à 2 semaines (plus vite s'il fait chaud), quand il ne mousse plus.", "Il sent très fort : mettez-le loin des fenêtres.", "L'odeur montre que la fermentation fonctionne.", ""),
      E("Filtrer et diluer", "Filtrez à la passoire. Diluez à 10 % pour arroser (1 litre de purin dans 9 litres d'eau). Diluez à 5 % pour pulvériser.", "Ne jamais utiliser pur.", "Pur, il brûle les feuilles et les racines.", "arrosoir"),
      E("Préparer le savon noir", "Suivez la notice du produit (souvent environ 1 cuillère à soupe de savon noir liquide par litre d'eau tiède). Choisissez un savon noir sans parfum ni additifs.", "Le savon noir peut aussi toucher les coccinelles : visez seulement les pucerons. Ne le versez pas dans un bassin ou une mare.", "Le savon gêne les pucerons en les asphyxiant, s'il est bien dosé.", ""),
      E("Essayer d'abord", "Pulvérisez sur une seule feuille. Attendez 24 heures. Si elle jaunit ou se tache, ne continuez pas.", "", "Certaines plantes sont plus fragiles.", ""),
      E("Pulvériser", "Pulvérisez le soir, sans vent, dessus et dessous des feuilles. Pas de soleil, pas de pluie prévue, pas de fleurs ouvertes visitées par les abeilles.", "Ne traitez jamais en fleur.", "Le soir, les abeilles ne butinent plus et les feuilles ne brûlent pas.", ""),
      E("Recommencer", "Recommencez après 5 à 7 jours si besoin, 3 fois au maximum. Rincez les légumes avant de les manger.", "", "Les œufs éclosent ensuite : une seule fois ne suffit pas.", ""),
      E("Ranger", "Étiquetez et fermez les flacons. Gardez-les hors de portée des enfants et des animaux. Le purin se garde quelques semaines au frais, dans un récipient non métallique.", "", "Un flacon sans étiquette est dangereux.", "")
    ],
    erreurs: ["Utiliser un produit pur.", "Traiter en plein soleil.", "Traiter des plantes en fleur.", "Oublier d'étiqueter les flacons.", "Dépasser la dose."],
    apres: ["Regardez vos plantes après 2 jours.", "Évitez les doses trop fortes : un dosage faible, plus souvent, vaut mieux.", "Nettoyez le pulvérisateur à l'eau claire."],
    mots: "purin ortie savon noir bouillie bordelaise traitement bio naturel pucerons mildiou cochenilles maladie champignon produit naturel pulveriser",
    plantes: ["ortie", "tomate", "rosier-pot"] });

  G({ id: "limaces-pucerons", titre: "Lutter contre limaces et pucerons sans chimie", cat: "proteger",
    but: "Garder ses plantes en bonne santé en limitant les limaces et les pucerons avec des moyens doux et sans danger.",
    diff: "facile", duree: "15 minutes", mois: [3, 4, 5, 6, 7, 8, 9],
    mat: ["Une lampe de poche", "Un seau pour ramasser les limaces", "Une planche ou une tuile", "Du savon noir", "Un pulvérisateur", "Du ruban de cuivre (facultatif)"],
    etapes: [
      E("Observer", "Regardez vos plantes le soir et au petit matin. Cherchez trous dans les feuilles, traces brillantes, ou petits insectes verts ou noirs sous les feuilles.", "", "Plus on réagit tôt, moins il y a de dégâts.", "limace"),
      E("Pucerons : jet d'eau", "Enlevez-les avec un jet d'eau doux ou avec les doigts.", "", "Beaucoup partent ainsi, et ne reviennent pas tous.", ""),
      E("Pucerons : savon noir", "Pulvérisez de l'eau mélangée à du savon noir, à la dose de la notice, le soir (voir la fiche « Soigner avec des produits naturels »).", "", "Le savon bloque les pucerons.", ""),
      E("Appeler les amis", "Gardez des fleurs pour attirer coccinelles et syrphes, mettez un nichoir pour les mésanges. Laissez un coin d'herbes sauvages.", "", "Coccinelles et syrphes (leurs larves) mangent beaucoup de pucerons.", ""),
      E("Limaces : ramassage", "Le soir ou après la pluie, ramassez les limaces à la lampe et déposez-les loin du jardin.", "", "C'est le geste le plus sûr.", ""),
      E("Limaces : pièges", "Posez une planche ou une tuile humide. Le matin, soulevez-la et ramassez les limaces dessous.", "", "Les limaces se cachent là pendant la journée.", ""),
      E("Limaces : barrières", "Entourez les pots d'une bande de cuivre ou d'un anneau de laine de bois. L'effet est variable.", "", "Certaines limaces hésitent à passer dessus.", ""),
      E("Arroser le matin", "Arrosez le matin plutôt que le soir.", "", "Le sol est sec la nuit, quand les limaces sortent.", ""),
      E("Granulés : prudence", "En dernier recours, choisissez des granulés au phosphate de fer (« Emploi autorisé dans les jardins »), à la dose de la notice. N'utilisez pas les granulés bleus classiques (métaldéhyde) : ils sont dangereux pour hérissons, oiseaux, chiens et chats.", "Lisez toujours la notice. Ne mettez jamais plus que la dose.", "Un surdosage, même de phosphate de fer, nuit aux vers de terre et aux animaux.", "")
    ],
    erreurs: ["Utiliser des granulés bleus.", "Pulvériser du savon en plein soleil.", "Arroser le soir sur les salades.", "Tuer les coccinelles par erreur."],
    apres: ["Regardez vos plantes chaque soir pendant une semaine.", "Gardez des plantes à fleurs dans le jardin.", "Recommencez le ramassage régulièrement."],
    mots: "limaces escargots pucerons sans chimie bio naturel coccinelle savon noir cuivre bière granulés lutte ravageurs insectes nuisibles",
    plantes: ["laitue", "tomate", "hosta"] });

  /* On expose la liste, triée comme écrite. */
  D.gestes = L;
})();
