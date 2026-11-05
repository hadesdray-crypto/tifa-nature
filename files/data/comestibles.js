/* Tifa Nature - « Dans l'assiette » : comestibilité de chaque plante de la base (T.D.comestibles[id]).
   Règle : rien n'est déclaré comestible sans au moins deux sources ; en cas de désaccord ou de doute, on retient le plus prudent.
   Statuts : comestible | partiellement | non | dangereux. Chaque partie : { type: fleur|feuille|fruit|legume|racine, partie, comment, quand }.
   Les champs « enfants » et « animaux » absents sont remplis plus bas à partir de la toxicité de la fiche (p.toxique). */
(function () {
  var D = (window.TIFA_DATA = window.TIFA_DATA || {});
  var C = D.comestibles = D.comestibles || {};

  D.comestiblesMsg = {
    doute: 'En cas de doute, ne mangez pas.',
    secours: 'Après avoir mangé une plante, si vous avez mal au ventre, des vomissements, une gêne pour respirer ou un malaise : appelez le centre antipoison de votre région (le numéro est sur le site de l\'ANSES ou dans l\'annuaire) ou le 15. En urgence vitale (la personne ne répond plus, elle respire mal) : appelez le 15 ou le 112.',
    pesticide: 'Plante d\'ornement achetée en jardinerie : elle a souvent été traitée avec des produits qui ne sont pas faits pour être mangés. Ne la mangez pas si elle n\'a pas été cultivée pour l\'alimentation.',
    animauxT: 'Pas pour les animaux : cette plante est signalée toxique pour les chats et les chiens.',
    animauxOk: 'Non signalée toxique pour les chats et les chiens, mais ne leur en donnez pas : demandez conseil au vétérinaire.',
    enfantsOk: 'Seulement avec un adulte, en petits morceaux et en petite quantité, sans la cueillir seul.',
    enfantsNon: 'Ne pas la mettre en bouche. Expliquez à l\'enfant qu\'on ne mange jamais cette plante, et gardez-la hors de sa portée.'
  };

  function pt(type, partie, comment, quand) { return { type: type, partie: partie, comment: comment, quand: quand }; }
  var FL = ['Cueillez les fleurs fraîches, lavez-les doucement à l\'eau froide, enlevez les parties abîmées.', 'Goûtez d\'abord un seul pétale : certaines personnes font une allergie.'];
  var BIO = 'Mangez seulement des fleurs cultivées sans produit chimique, jamais celles d\'un fleuriste ni du bord de route.';
  var GENV = 'Lavez bien avant de manger.';
  function ok(id, o) { o.statut = 'comestible'; C[id] = o; }
  function part(id, o) { o.statut = 'partiellement'; C[id] = o; }
  function non(id, avert, o) { o = o || {}; o.statut = 'non'; o.avertissement = avert; C[id] = o; }
  function dan(id, avert, o) { o = o || {}; o.statut = 'dangereux'; o.avertissement = avert; C[id] = o; }
  var PASCONF = 'Aucun usage alimentaire n\'est confirmé par deux sources fiables : par prudence, ne la mangez pas.';

  /* ===================== FLEURS ET AROMATES CONFIRMÉES ===================== */
  ok('capucine', {
    parties: [pt('fleur', 'Les fleurs', 'Entières, crues, dans une salade ou sur un plat.', 'Pendant la floraison'), pt('feuille', 'Les feuilles', 'Crues, hachées finement dans une salade ou un pesto.', 'Toute la belle saison'), pt('fruit', 'Les boutons', 'Au vinaigre, comme des câpres.', 'Avant l\'ouverture de la fleur')],
    saveur: 'Poivrée, un peu piquante, proche du cresson. Les feuilles sont plus douces.',
    usages: ['Salade colorée', 'Pesto de feuilles', 'Câpres de capucine', 'Beurre ou fromage frais aux fleurs'],
    precautions: ['Lavez fleurs et feuilles avant de les manger.', 'Goûtez d\'abord un petit morceau : le piquant surprend.'],
    confusions: ['Ne la confondez pas avec une plante d\'ornement inconnue qui aurait des fleurs orange.'],
    quantite: 'En petite quantité : quelques fleurs et quelques feuilles par plat.',
    requetes: ['capucine fleurs salade', 'pesto feuilles de capucine', 'capres de capucine']
  });
  part('bourrache', {
    parties: [pt('fleur', 'Les fleurs bleues', 'Crues, en décoration dans une salade, un dessert ou des glaçons.', 'Pendant la floraison'), pt('feuille', 'Les très jeunes feuilles', 'Hachées finement, en petite quantité seulement.', 'Au printemps et en été')],
    saveur: 'Fraîche, goût de concombre pour les feuilles, un peu d\'huître pour les fleurs selon certaines sources.',
    usages: ['Fleurs en décoration', 'Glaçons aux fleurs', 'Salade (quelques fleurs)'],
    precautions: ['La bourrache contient des substances (alcaloïdes pyrrolizidiniques) qui peuvent abîmer le foie : elle se mange rarement et en tout petit morceau.', 'Ne faites pas de tisane de bourrache.', 'Par prudence, évitez-la pour les jeunes enfants, pendant la grossesse et l\'allaitement.'],
    confusions: ['Les feuilles poilues ressemblent à celles de la consoude, qui est dangereuse à manger.'],
    quantite: 'Très petite quantité et pas tous les jours : quelques fleurs pour décorer.',
    requetes: ['fleurs de bourrache décoration', 'glaçons fleurs bourrache']
  });
  part('souci', {
    parties: [pt('fleur', 'Les pétales', 'Effeuillés, crus, dans une salade, du riz, un gâteau ou un fromage frais.', 'Pendant la floraison')],
    saveur: 'Douce, légèrement poivrée, parfois un peu amère. Elle colore en jaune orangé, comme le safran.',
    usages: ['Riz coloré', 'Salade', 'Beurre ou fromage frais', 'Biscuits'],
    precautions: FL.concat(['Ne mangez que les pétales, pas le cœur de la fleur ni les feuilles.']),
    confusions: ['Ne la confondez pas avec l\'œillet d\'Inde (tagète), dont la fleur est plus grosse et l\'odeur forte : il n\'est pas confirmé ici.'],
    quantite: 'En petite quantité : une cuillère de pétales par plat.',
    requetes: ['pétales de souci recette', 'souci calendula cuisine']
  });
  part('pensee', {
    parties: [pt('fleur', 'Les fleurs', 'Entières, crues, en décoration dans une salade, un dessert ou des glaçons.', 'Pendant la floraison')],
    saveur: 'Très douce, légèrement sucrée, discrète.',
    usages: ['Salade de fleurs', 'Gâteaux décorés', 'Glaçons aux fleurs', 'Fromage frais'],
    precautions: FL.concat(['Ne mangez que la fleur, pas les feuilles ni les tiges.']),
    confusions: [],
    quantite: 'En petite quantité, surtout pour décorer.',
    requetes: ['fleurs de pensée salade', 'pensées comestibles dessert']
  });
  part('primevere', {
    parties: [pt('fleur', 'Les fleurs', 'Crues, en décoration dans une salade ou un dessert.', 'Fin d\'hiver et printemps')],
    saveur: 'Douce et discrète.',
    usages: ['Salade de fleurs', 'Décoration de gâteaux'],
    precautions: FL.concat(['La plante peut irriter l\'estomac si on en mange beaucoup : ne mangez que quelques fleurs, jamais les feuilles ni les racines.']),
    confusions: [],
    quantite: 'En très petite quantité, pour décorer.',
    requetes: ['fleurs de primevère recette']
  });
  ok('violette-odorante', {
    parties: [pt('fleur', 'Les fleurs', 'Crues en décoration, ou en sirop.', 'Fin d\'hiver et printemps'), pt('feuille', 'Les jeunes feuilles', 'Tendres, crues, en petite quantité dans une salade.', 'Au printemps')],
    saveur: 'Très parfumée et sucrée.',
    usages: ['Sirop de violette', 'Glaçons aux fleurs', 'Décoration de desserts'],
    precautions: FL.concat(['Ne mangez que la violette odorante de votre fiche : ne cueillez pas d\'autres fleurs violettes.']),
    confusions: ['Ne la confondez pas avec d\'autres fleurs violettes ou bleues du jardin, dont certaines sont toxiques.'],
    quantite: 'En petite quantité.',
    requetes: ['sirop de violette', 'fleurs de violette dessert']
  });
  part('bleuet', {
    parties: [pt('fleur', 'Les pétales', 'Crus, éparpillés sur une salade, un fromage frais ou un dessert.', 'Pendant la floraison')],
    saveur: 'Douce, légèrement épicée et sucrée.',
    usages: ['Salade colorée', 'Fromage frais', 'Décoration de desserts'],
    precautions: FL.concat(['Ne mangez que les pétales.']),
    confusions: [],
    quantite: 'En petite quantité, pour décorer.',
    requetes: ['pétales de bleuet salade', 'bleuet comestible recette']
  });
  part('rosier-pot', {
    parties: [pt('fleur', 'Les pétales', 'Crus ou en sirop. Coupez la base blanche du pétale, elle est amère.', 'Pendant la floraison')],
    saveur: 'Parfumée, douce ; les roses foncées sont souvent plus parfumées.',
    usages: ['Sirop de pétales de rose', 'Sucre parfumé', 'Confiture', 'Salade'],
    precautions: FL.concat(['Les épines blessent : cueillez avec des gants.']),
    confusions: [],
    quantite: 'En petite quantité : quelques pétales.',
    requetes: ['pétales de rose recette', 'sirop de rose maison']
  });
  part('rosier-grimpant', {
    parties: [pt('fleur', 'Les pétales', 'Crus ou en sirop. Coupez la base blanche du pétale, elle est amère.', 'Pendant la floraison')],
    saveur: 'Parfumée, douce ; les roses foncées sont souvent plus parfumées.',
    usages: ['Sirop de pétales de rose', 'Sucre parfumé', 'Salade'],
    precautions: FL.concat(['Les épines blessent : cueillez avec des gants.']),
    confusions: [],
    quantite: 'En petite quantité : quelques pétales.',
    requetes: ['pétales de rose recette', 'sirop de rose maison']
  });
  part('lavande', {
    parties: [pt('fleur', 'Les fleurs', 'En très petite quantité, dans un gâteau, un sirop, une infusion ou un sucre parfumé. Ne la mangez pas crue en grande quantité.', 'Juin à août')],
    saveur: 'Très forte et parfumée, « le goût de son odeur ».',
    usages: ['Biscuits', 'Sirop', 'Infusion légère', 'Sucre parfumé'],
    precautions: FL.concat(['Utilisez la lavande vraie de votre fiche, pas une autre lavande ni l\'huile essentielle.', 'Ne mangez ni les tiges ni les feuilles.']),
    confusions: [],
    quantite: 'À toute petite dose : une pincée de fleurs pour un gâteau.',
    requetes: ['biscuits à la lavande', 'sirop de lavande']
  });
  ok('courgette', {
    parties: [pt('legume', 'Le fruit (la courgette)', 'Cru en fines tranches ou cuit.', 'Juin à octobre'), pt('fleur', 'Les fleurs', 'Farcies, en beignets, ou crues. Retirez le pistil.', 'Pendant la floraison')],
    saveur: 'Douce pour le fruit ; fleur délicate, un peu sucrée.',
    usages: ['Beignets de fleurs', 'Fleurs farcies', 'Ratatouille', 'Velouté'],
    precautions: ['Si une courgette est très amère, jetez-la sans la goûter davantage : l\'amertume forte peut signaler un problème.', 'Cueillez les fleurs fraîches le matin et lavez-les doucement.'],
    confusions: ['Certaines courges d\'ornement amères ressemblent aux courgettes : ne mangez que celles que vous avez semées vous-même (graines de courgette).'],
    quantite: 'Quantité normale pour le fruit ; fleurs : quelques-unes par personne.',
    requetes: ['beignets fleurs de courgette', 'fleurs de courgette farcies', 'velouté de courgette']
  });
  ok('ciboulette', {
    parties: [pt('feuille', 'Les tiges creuses', 'Crues, coupées aux ciseaux au dernier moment.', 'Avril à octobre'), pt('fleur', 'Les fleurs', 'Défaites en petits brins sur une salade ou un fromage frais.', 'Mai à juillet')],
    saveur: 'Goût d\'oignon doux ; les fleurs sont plus fortes que les tiges.',
    usages: ['Omelette aux fines herbes', 'Fromage frais', 'Beurre aux herbes', 'Salade'],
    precautions: ['Coupez les tiges aux ciseaux, ne les arrachez pas.', 'Une source conseille de ne pas manger le bulbe : mangez seulement les tiges et les fleurs.'],
    confusions: ['Ne la confondez pas avec des plantes à bulbe toxiques aux feuilles fines (comme le colchique ou le muguet) : mangez seulement ce qui sent l\'oignon.'],
    quantite: 'Quantité normale, en assaisonnement.',
    requetes: ['fleurs de ciboulette recette', 'beurre à la ciboulette']
  });
  part('camomille-romaine', {
    parties: [pt('fleur', 'Les fleurs séchées', 'En infusion : un peu de fleurs dans de l\'eau chaude.', 'Juin à août')],
    saveur: 'Douce mais un peu amère.',
    usages: ['Infusion'],
    precautions: FL.concat(['Ne la confondez pas avec la camomille allemande : leur goût est différent.', 'Ne mangez pas les feuilles ni les tiges.']),
    confusions: ['Camomille romaine et camomille allemande : deux plantes différentes, au goût différent.'],
    quantite: 'En petite quantité : une tasse d\'infusion de temps en temps. Statut à confirmer par une seconde source.',
    requetes: ['infusion camomille romaine']
  });
  part('hemerocalle', {
    parties: [pt('fleur', 'Les pétales', 'Crus ou cuits. Retirez les étamines et le pistil.', 'Juin à août')],
    saveur: 'Légèrement sucrée, un peu poivrée selon les sources.',
    usages: ['Salade de fleurs', 'Beignets'],
    precautions: FL.concat(['Ne la confondez pas avec le lis, qui est toxique.', 'Ne mangez ni les feuilles ni les racines.']),
    confusions: ['Le lis ressemble à l\'hémérocalle et il est toxique : n\'en mangez jamais.'],
    quantite: 'En petite quantité : quelques pétales.',
    animaux: 'Pas pour les animaux. Cette plante est très dangereuse pour les chats, même en toute petite quantité : gardez-la loin d\'eux.',
    requetes: ['fleurs d\'hémérocalle recette']
  });
  part('dahlia', {
    parties: [pt('fleur', 'Les pétales', 'Crus, en petite quantité, dans une salade.', 'Juillet à octobre')],
    saveur: 'Variable selon les variétés : goûtez un seul pétale.',
    usages: ['Salade de fleurs'],
    precautions: FL.concat(['Ne mangez ni les feuilles, ni les tiges, ni les tubercules.']),
    confusions: [],
    quantite: 'En très petite quantité.',
    requetes: ['pétales de dahlia salade']
  });
  part('begonia', {
    parties: [pt('fleur', 'Les fleurs', 'Crues, en petite quantité, en décoration.', 'Juin à octobre')],
    saveur: 'Acidulée.',
    usages: ['Décoration de salade'],
    precautions: FL.concat(['Ne mangez pas les feuilles, les tiges ni les tubercules : ils sont toxiques.']),
    confusions: [],
    quantite: 'En très petite quantité.',
    animaux: 'Pas pour les animaux : cette plante est signalée toxique pour les chats et les chiens, surtout les tubercules.',
    requetes: ['fleurs de bégonia comestibles']
  });

  /* ===================== LÉGUMES ===================== */
  var Q = 'Quantité normale d\'un aliment.';
  part('tomate', {
    parties: [pt('fruit', 'Le fruit mûr', 'Cru ou cuit.', 'Juillet à octobre')],
    saveur: 'Sucrée et acidulée.',
    usages: ['Salade', 'Sauce', 'Gaspacho', 'Ratatouille'],
    precautions: ['Ne mangez pas les feuilles, les tiges ni les fleurs : elles sont toxiques.', 'Évitez les fruits encore verts crus.', GENV],
    confusions: [],
    quantite: Q,
    requetes: ['salade de tomates', 'gaspacho', 'sauce tomate maison']
  });
  part('tomate-cerise', {
    parties: [pt('fruit', 'Le fruit mûr', 'Cru, entier ou coupé en deux.', 'Juillet à octobre')],
    saveur: 'Sucrée.',
    usages: ['Apéritif', 'Salade', 'Poêlée', 'Tarte'],
    precautions: ['Ne mangez pas les feuilles, les tiges ni les fleurs : elles sont toxiques.', 'Pour les petits enfants, coupez les tomates cerises en deux pour éviter qu\'ils s\'étouffent.', GENV],
    confusions: [],
    quantite: Q,
    requetes: ['tomates cerises recette', 'salade tomates cerises']
  });
  ok('laitue', { parties: [pt('feuille', 'Les feuilles', 'Crues, lavées.', 'Mai à novembre')], saveur: 'Douce, légèrement croquante.', usages: ['Salade', 'Soupe de laitue'], precautions: [GENV], confusions: [], quantite: Q, requetes: ['salade verte recette'] });
  ok('radis', { parties: [pt('racine', 'La racine', 'Crue, avec un peu de beurre et de sel, ou en salade.', 'Printemps et automne')], saveur: 'Croquante, piquante.', usages: ['Radis beurre', 'Salade'], precautions: [GENV], confusions: [], quantite: Q, requetes: ['radis recette'] });
  ok('carotte', {
    parties: [pt('racine', 'La racine', 'Crue ou cuite.', 'Juin à novembre')],
    saveur: 'Sucrée.', usages: ['Carottes râpées', 'Soupe', 'Rôties au four'],
    precautions: ['Lavez et épluchez ou brossez.', 'Ne cueillez jamais de carottes sauvages : elles ressemblent à des plantes très toxiques.'],
    confusions: ['La carotte sauvage ressemble à la ciguë et à d\'autres plantes très toxiques : ne mangez que les carottes que vous avez semées.'],
    quantite: Q, requetes: ['carottes râpées', 'velouté de carottes']
  });
  part('haricot-nain', {
    parties: [pt('legume', 'Les gousses et les grains', 'Toujours cuits (à l\'eau bouillante plusieurs minutes).', 'Juillet à septembre')],
    saveur: 'Douce, un peu sucrée.', usages: ['Haricots verts à l\'ail', 'Salade tiède', 'Soupe'],
    precautions: ['Ne mangez jamais les haricots crus : ils sont toxiques et peuvent rendre malade.', 'Faites cuire à l\'eau bouillante avant de manger.'],
    confusions: [], quantite: Q + ' Toujours cuits.', requetes: ['haricots verts recette', 'salade de haricots verts']
  });
  part('haricot-grimpant', {
    parties: [pt('legume', 'Les gousses et les grains', 'Toujours cuits (à l\'eau bouillante plusieurs minutes).', 'Juillet à octobre')],
    saveur: 'Douce, un peu sucrée.', usages: ['Haricots verts à l\'ail', 'Salade tiède', 'Soupe'],
    precautions: ['Ne mangez jamais les haricots crus : ils sont toxiques et peuvent rendre malade.', 'Faites cuire à l\'eau bouillante avant de manger.'],
    confusions: ['Ne mangez pas les graines de pois d\'ornement ni de plantes grimpantes décoratives.'], quantite: Q + ' Toujours cuits.', requetes: ['haricots verts recette']
  });
  part('poivron', {
    parties: [pt('fruit', 'Le fruit', 'Cru ou cuit, épépiné.', 'Août à octobre')],
    saveur: 'Douce à sucrée.', usages: ['Salade', 'Poêlée', 'Poivrons grillés', 'Ratatouille'],
    precautions: ['Ne mangez pas les feuilles ni les tiges.', GENV], confusions: [], quantite: Q, requetes: ['poivrons grillés', 'ratatouille']
  });
  part('piment', {
    parties: [pt('fruit', 'Le fruit', 'Très petite quantité, de préférence cuit dans un plat.', 'Août à octobre')],
    saveur: 'Piquante, parfois très forte.',
    usages: ['Assaisonnement', 'Huile pimentée'],
    precautions: ['Mettez des gants pour couper les piments, puis lavez-vous les mains : il ne faut pas se toucher les yeux.', 'Ne donnez jamais de piment à un enfant ni à un animal.', 'Ne mangez pas les feuilles ni les tiges.'],
    confusions: [], quantite: 'Très petite quantité, en assaisonnement.', enfants: 'Ne donnez pas de piment aux jeunes enfants : il brûle la bouche.', requetes: ['huile pimentée maison']
  });
  part('aubergine', {
    parties: [pt('fruit', 'Le fruit', 'Toujours cuit (four, poêle).', 'Août à octobre')],
    saveur: 'Douce, fondante une fois cuite.', usages: ['Ratatouille', 'Aubergines rôties', 'Caviar d\'aubergine'],
    precautions: ['Ne mangez pas les feuilles ni les tiges.', 'Mangez-la cuite.'],
    confusions: [], quantite: Q, requetes: ['aubergines rôties', 'ratatouille']
  });
  ok('concombre', { parties: [pt('fruit', 'Le fruit', 'Cru en rondelles ou en salade.', 'Juillet à septembre')], saveur: 'Fraîche, légère.', usages: ['Salade', 'Tzatziki', 'Gaspacho'], precautions: ['S\'il est très amer, jetez-le.', GENV], confusions: [], quantite: Q, requetes: ['salade de concombre', 'tzatziki'] });
  part('pomme-de-terre', {
    parties: [pt('racine', 'Le tubercule sain', 'Toujours cuit (eau, four, poêle).', 'Juin à septembre')],
    saveur: 'Douce, fondante.', usages: ['Pommes de terre rôties au romarin', 'Soupe', 'Purée'],
    precautions: ['Jetez les pommes de terre vertes, ou les parties vertes : elles sont toxiques.', 'Retirez les germes. Ne mangez jamais les feuilles, les tiges ni les petites boules vertes (baies).', 'Mangez-les cuites.'],
    confusions: [], quantite: Q, requetes: ['pommes de terre rôties', 'soupe pommes de terre']
  });
  ok('ail', { parties: [pt('racine', 'Le bulbe (les gousses)', 'Cru en petite quantité ou cuit.', 'Juin à juillet')], saveur: 'Forte et piquante.', usages: ['Assaisonnement', 'Beurre à l\'ail'], precautions: ['Pelez les gousses avant de manger.'], confusions: ['Ne le confondez pas avec des plantes à bulbe sauvages toxiques (colchique, muguet) : mangez seulement l\'ail que vous avez planté.'], quantite: 'En petite quantité, en assaisonnement.', requetes: ['beurre à l\'ail', 'pesto'] });
  ok('oignon', { parties: [pt('racine', 'Le bulbe', 'Cru ou cuit.', 'Juillet à août')], saveur: 'Piquante crue, douce cuite.', usages: ['Soupe', 'Tarte', 'Salade'], precautions: ['Épluchez avant de manger.'], confusions: ['Ne le confondez pas avec un bulbe d\'ornement (tulipe, narcisse) : les bulbes de fleurs sont toxiques.'], quantite: Q, requetes: ['soupe à l\'oignon', 'oignons caramélisés'] });
  ok('echalote', { parties: [pt('racine', 'Le bulbe', 'Cru ou cuit.', 'Juin à juillet')], saveur: 'Plus douce que l\'oignon.', usages: ['Vinaigrette', 'Poêlée'], precautions: ['Épluchez avant de manger.'], confusions: ['Ne la confondez pas avec un bulbe d\'ornement : les bulbes de fleurs sont toxiques.'], quantite: Q, requetes: ['vinaigrette à l\'échalote'] });
  ok('epinard', { parties: [pt('feuille', 'Les feuilles', 'Crues (jeunes) ou cuites.', 'Printemps et automne')], saveur: 'Douce, un peu minérale.', usages: ['Poêlée', 'Soupe', 'Salade de jeunes pousses'], precautions: ['Lavez bien.', 'Contient de l\'acide oxalique : variez les légumes.'], confusions: [], quantite: 'Quantité normale, sans en manger tous les jours en grande quantité.', requetes: ['épinards poêlés', 'soupe d\'épinards'] });
  ok('poireau', { parties: [pt('legume', 'Le blanc et le vert tendre', 'Cuit, ou cru très fin.', 'Septembre à mars')], saveur: 'Douce, sucrée une fois cuite.', usages: ['Soupe de poireaux', 'Poireaux vinaigrette', 'Tarte'], precautions: ['Lavez bien entre les feuilles : il y a de la terre.'], confusions: [], quantite: Q, requetes: ['soupe poireaux pommes de terre', 'poireaux vinaigrette'] });
  ok('betterave', { parties: [pt('racine', 'La racine', 'Cuite (ou crue râpée).', 'Juillet à novembre')], saveur: 'Sucrée, terreuse.', usages: ['Betterave rôtie', 'Salade', 'Soupe'], precautions: ['Épluchez après cuisson.', 'Elle colore en rouge, c\'est normal.'], confusions: [], quantite: Q, requetes: ['betterave rôtie', 'salade de betteraves'] });
  ok('chou-kale', { parties: [pt('feuille', 'Les feuilles', 'Cuites, ou crues très fines et massées.', 'Septembre à février')], saveur: 'Intense, un peu amère.', usages: ['Chips de kale', 'Soupe', 'Salade massée'], precautions: ['Retirez la grosse nervure dure.', GENV], confusions: [], quantite: Q, requetes: ['chips de chou kale', 'soupe chou kale'] });
  part('rhubarbe', {
    parties: [pt('legume', 'Les tiges (les côtes)', 'Toujours cuites, avec du sucre.', 'Avril à juin')],
    saveur: 'Très acide.', usages: ['Compote', 'Tarte', 'Confiture'],
    precautions: ['Ne mangez jamais les feuilles : elles sont toxiques. Coupez-les et jetez-les.', 'Mangez seulement les tiges, cuites.'],
    confusions: [], quantite: Q + ' Seulement les tiges.', requetes: ['compote de rhubarbe', 'tarte à la rhubarbe']
  });
  part('asperge', {
    parties: [pt('legume', 'Les jeunes pousses (turions)', 'Cuites à l\'eau ou à la vapeur.', 'Avril à juin')],
    saveur: 'Fine, un peu sucrée.', usages: ['Asperges vinaigrette', 'Poêlée', 'Velouté'],
    precautions: ['Ne mangez pas les baies rouges ni les tiges devenues grandes : elles sont toxiques.', 'Mangez seulement les pousses.'],
    confusions: [], quantite: Q, requetes: ['asperges vinaigrette', 'velouté d\'asperges']
  });
  ok('artichaut', { parties: [pt('legume', 'Le cœur et la base des feuilles', 'Cuits à l\'eau.', 'Juin à août')], saveur: 'Douce, légèrement noisette.', usages: ['Artichauts vinaigrette', 'Cœurs poêlés'], precautions: ['Retirez le foin (les poils) au centre avant de manger.'], confusions: [], quantite: Q, requetes: ['artichauts vinaigrette'] });
  part('patate-douce', { parties: [pt('racine', 'Le tubercule', 'Toujours cuit (four, vapeur).', 'Octobre à novembre')], saveur: 'Sucrée.', usages: ['Frites au four', 'Purée', 'Soupe'], precautions: ['Épluchez ou brossez, puis cuisez.', 'Ne mangez pas le feuillage.'], confusions: ['Ne la confondez pas avec les liserons d\'ornement (ipomées), dont les graines sont toxiques.'], quantite: Q, requetes: ['frites de patate douce four', 'purée patate douce'] });
  ok('blette', { parties: [pt('feuille', 'Les feuilles et les côtes', 'Cuites.', 'Juin à novembre')], saveur: 'Douce, proche des épinards.', usages: ['Gratin de blettes', 'Poêlée', 'Tarte'], precautions: ['Lavez bien.'], confusions: [], quantite: Q, requetes: ['gratin de blettes', 'poêlée de blettes'] });
  ok('mache', { parties: [pt('feuille', 'Les feuilles', 'Crues, lavées.', 'Octobre à mars')], saveur: 'Douce, un peu noisette.', usages: ['Salade', 'Salade aux noix'], precautions: ['Lavez bien : elle garde de la terre.'], confusions: [], quantite: Q, requetes: ['salade de mâche', 'mâche aux noix'] });
  ok('roquette', { parties: [pt('feuille', 'Les feuilles', 'Crues.', 'Printemps et automne')], saveur: 'Piquante, un peu poivrée.', usages: ['Salade', 'Pizza', 'Pesto'], precautions: [GENV], confusions: [], quantite: Q, requetes: ['salade de roquette', 'pesto de roquette'] });
  ok('celeri-branche', { parties: [pt('legume', 'Les branches', 'Crues ou cuites.', 'Août à novembre')], saveur: 'Forte, aromatique.', usages: ['Soupe', 'Crudités', 'Gratin'], precautions: ['Épluchez les fils durs.', 'Certaines personnes sont allergiques au céleri.'], confusions: ['Le céleri sauvage ressemble à des plantes toxiques : ne mangez que celui que vous avez planté.'], quantite: Q, requetes: ['céleri branche recette', 'soupe de céleri'] });
  ok('fenouil', { parties: [pt('legume', 'Le bulbe', 'Cru en lamelles ou cuit.', 'Septembre à novembre')], saveur: 'Anisée, douce.', usages: ['Salade', 'Fenouil rôti', 'Gratin'], precautions: [GENV], confusions: ['Le fenouil sauvage ressemble à des plantes toxiques : ne mangez que celui que vous avez planté.'], quantite: Q, requetes: ['fenouil rôti', 'salade de fenouil'] });
  ok('topinambour', { parties: [pt('racine', 'Le tubercule', 'Cuit.', 'Octobre à février')], saveur: 'Proche de l\'artichaut, sucrée.', usages: ['Soupe', 'Rôti au four', 'Purée'], precautions: ['Brossez et épluchez.', 'Il peut donner des gaz si on en mange beaucoup.'], confusions: [], quantite: Q + ' Commencez par une petite portion.', requetes: ['soupe de topinambours', 'topinambours rôtis'] });

  /* ===================== AROMATES ===================== */
  var AQ = 'En assaisonnement, en petite quantité.';
  ok('basilic', { parties: [pt('feuille', 'Les feuilles', 'Fraîches, ajoutées à la fin de la cuisson.', 'Juin à septembre')], saveur: 'Parfumée, douce et poivrée.', usages: ['Pesto', 'Salade de tomates', 'Soupe au pistou'], precautions: [GENV], confusions: [], quantite: AQ, requetes: ['pesto au basilic', 'salade tomate basilic'] });
  ok('persil', { parties: [pt('feuille', 'Les feuilles', 'Fraîches, hachées.', 'Mai à novembre')], saveur: 'Fraîche, herbacée.', usages: ['Taboulé', 'Persillade', 'Omelette aux herbes'], precautions: ['Lavez bien.', 'En très grande quantité, il n\'est pas conseillé : gardez-le pour assaisonner.'], confusions: ['Le persil ressemble à la petite ciguë, très toxique : ne mangez que celui que vous avez semé.'], quantite: AQ, requetes: ['taboulé', 'persillade'] });
  ok('menthe', { parties: [pt('feuille', 'Les feuilles', 'Fraîches, ou en infusion.', 'Mai à octobre')], saveur: 'Fraîche et mentholée.', usages: ['Tisane de menthe', 'Taboulé', 'Salade de fruits'], precautions: ['Ne donnez pas de menthe aux tout-petits.', GENV], confusions: [], quantite: AQ, requetes: ['tisane de menthe fraîche', 'taboulé menthe'] });
  ok('thym', { parties: [pt('feuille', 'Les feuilles', 'Fraîches ou séchées, en cuisson.', 'Toute l\'année')], saveur: 'Parfumée, chaude.', usages: ['Viandes et légumes rôtis', 'Tisane'], precautions: ['Retirez les petites tiges dures.'], confusions: [], quantite: AQ, requetes: ['légumes rôtis au thym'] });
  ok('romarin', { parties: [pt('feuille', 'Les feuilles (aiguilles)', 'En cuisson, hachées ou entières à retirer.', 'Toute l\'année')], saveur: 'Forte, résineuse.', usages: ['Pommes de terre rôties', 'Grillades', 'Pain'], precautions: ['Les aiguilles sont dures : hachez-les fin ou retirez-les du plat.'], confusions: [], quantite: AQ, requetes: ['pommes de terre au romarin'] });
  ok('sauge', { parties: [pt('feuille', 'Les feuilles', 'En cuisson ou en infusion.', 'Avril à octobre')], saveur: 'Forte, camphrée.', usages: ['Beurre de sauge', 'Infusion', 'Pâtes'], precautions: ['Ne l\'utilisez qu\'en petite quantité : elle est très concentrée.'], confusions: [], quantite: 'En petite quantité.', requetes: ['beurre à la sauge'] });
  ok('coriandre', { parties: [pt('feuille', 'Les feuilles', 'Fraîches, hachées.', 'Mai à octobre')], saveur: 'Fraîche, citronnée (certains n\'aiment pas son goût).', usages: ['Salade', 'Soupe', 'Plats épicés'], precautions: [GENV], confusions: [], quantite: AQ, requetes: ['salade à la coriandre'] });
  ok('aneth', { parties: [pt('feuille', 'Les feuilles fines', 'Fraîches, hachées.', 'Juin à septembre')], saveur: 'Anisée, fraîche.', usages: ['Poisson', 'Fromage frais', 'Concombre'], precautions: [GENV], confusions: [], quantite: AQ, requetes: ['fromage frais à l\'aneth'] });
  ok('origan', { parties: [pt('feuille', 'Les feuilles', 'Fraîches ou séchées.', 'Mai à septembre')], saveur: 'Chaude, parfumée.', usages: ['Pizza', 'Sauce tomate'], precautions: [GENV], confusions: [], quantite: AQ, requetes: ['sauce tomate origan'] });
  part('laurier-sauce', {
    parties: [pt('feuille', 'Les feuilles', 'Entières, dans une cuisson longue, à retirer avant de servir.', 'Toute l\'année')],
    saveur: 'Parfumée, un peu amère.', usages: ['Pot-au-feu', 'Sauces', 'Bouquet garni'],
    precautions: ['Retirez la feuille avant de manger : elle est dure et ne se mange pas.', 'Ne le confondez jamais avec le laurier-rose ni le laurier-cerise, qui sont toxiques.'],
    confusions: ['Laurier-rose et laurier-cerise : très toxiques. Le laurier-sauce a des feuilles très parfumées quand on les froisse.'],
    quantite: 'Une ou deux feuilles par plat, à retirer.', requetes: ['bouquet garni', 'pot-au-feu']
  });
  ok('estragon', { parties: [pt('feuille', 'Les feuilles', 'Fraîches, hachées.', 'Mai à septembre')], saveur: 'Anisée, fine.', usages: ['Poulet', 'Sauces', 'Omelette'], precautions: [GENV], confusions: [], quantite: AQ, requetes: ['poulet à l\'estragon'] });
  ok('cerfeuil', { parties: [pt('feuille', 'Les feuilles', 'Fraîches, ajoutées à la fin.', 'Mai à octobre')], saveur: 'Douce, anisée.', usages: ['Omelette', 'Soupe', 'Fines herbes'], precautions: [GENV], confusions: ['Le cerfeuil ressemble à la ciguë, très toxique : ne mangez que celui que vous avez semé.'], quantite: AQ, requetes: ['omelette aux fines herbes'] });
  ok('sarriette', { parties: [pt('feuille', 'Les feuilles', 'Fraîches ou séchées, en cuisson.', 'Juin à septembre')], saveur: 'Poivrée, proche du thym.', usages: ['Haricots', 'Viandes'], precautions: [GENV], confusions: [], quantite: AQ, requetes: ['haricots à la sarriette'] });
  ok('melisse', { parties: [pt('feuille', 'Les feuilles', 'Fraîches ou en infusion.', 'Mai à septembre')], saveur: 'Citronnée, douce.', usages: ['Infusion', 'Salade de fruits'], precautions: [GENV], confusions: [], quantite: AQ, requetes: ['infusion de mélisse'] });
  ok('verveine-citronnelle', { parties: [pt('feuille', 'Les feuilles', 'Fraîches ou séchées, en infusion.', 'Juin à octobre')], saveur: 'Citronnée, parfumée.', usages: ['Infusion', 'Dessert'], precautions: [GENV], confusions: [], quantite: AQ, requetes: ['infusion verveine citronnelle'] });
  ok('citronnelle', { parties: [pt('legume', 'La base des tiges', 'Hachée finement ou entière dans une soupe (à retirer).', 'Août à octobre')], saveur: 'Citronnée, fraîche.', usages: ['Soupes', 'Cuisine asiatique', 'Infusion'], precautions: ['Retirez les feuilles dures et la partie fibreuse.', 'Retirez les gros morceaux avant de servir.'], confusions: [], quantite: AQ, animaux: 'Pas pour les animaux : cette plante peut les faire vomir.', requetes: ['soupe à la citronnelle'] });
  ok('hysope', { parties: [pt('feuille', 'Les feuilles', 'Hachées finement, en toute petite quantité.', 'Juin à août')], saveur: 'Forte, camphrée.', usages: ['Aromate de plats'], precautions: ['Elle est très concentrée : une pincée suffit.', 'Ne l\'utilisez pas pour les petits enfants.'], confusions: [], quantite: 'À toute petite dose.', requetes: ['hysope cuisine'] });
  ok('liveche', { parties: [pt('feuille', 'Les feuilles', 'Hachées finement.', 'Mai à septembre')], saveur: 'Très forte, comme le céleri.', usages: ['Soupe', 'Bouillon'], precautions: ['Une seule feuille suffit pour une grande casserole.'], confusions: ['Elle ressemble à des plantes toxiques de la même famille : ne mangez que celle que vous avez plantée.'], quantite: 'Une feuille par plat.', requetes: ['livèche soupe'] });
  ok('oseille', { parties: [pt('feuille', 'Les feuilles', 'Crues (jeunes) ou cuites.', 'Avril à octobre')], saveur: 'Très acide, citronnée.', usages: ['Soupe d\'oseille', 'Sauce pour poisson', 'Omelette'], precautions: ['Elle contient de l\'acide oxalique : mangez-en peu et pas tous les jours.'], confusions: ['Ne la confondez pas avec l\'arum, dont les feuilles sont toxiques.'], quantite: 'En petite quantité.', requetes: ['soupe à l\'oseille', 'sauce à l\'oseille'] });
  non('stevia', 'Les feuilles de stévia ne sont pas autorisées comme aliment en Europe (seul l\'extrait purifié l\'est). Ne les mangez pas par prudence.', { confusions: [], requetes: [] });

  /* ===================== FRUITS ===================== */
  var FQ = 'Quantité normale pour le fruit mûr.';
  ok('fraisier', { parties: [pt('fruit', 'Le fruit', 'Cru, lavé juste avant de manger.', 'Mai à octobre')], saveur: 'Sucrée.', usages: ['Confiture', 'Tarte', 'Salade de fruits'], precautions: ['Lavez avant d\'enlever la queue.'], confusions: ['La fraise des bois est sucrée ; la fausse fraise (potentille) est fade, mais sans danger.'], quantite: FQ, requetes: ['confiture de fraises', 'tarte aux fraises'] });
  ok('fraisier-des-bois', { parties: [pt('fruit', 'Le fruit', 'Cru.', 'Juin à septembre')], saveur: 'Très parfumée et sucrée.', usages: ['Dessert', 'Fromage blanc'], precautions: ['Lavez doucement.'], confusions: [], quantite: FQ, requetes: ['fraises des bois dessert'] });
  ok('framboisier', { parties: [pt('fruit', 'Le fruit', 'Cru ou cuit.', 'Juin à octobre')], saveur: 'Sucrée et acidulée.', usages: ['Crumble', 'Confiture', 'Coulis'], precautions: ['Lavez très doucement, elle est fragile.'], confusions: [], quantite: FQ, requetes: ['crumble framboises', 'coulis de framboises'] });
  ok('myrtillier', { parties: [pt('fruit', 'La baie bleue', 'Crue ou cuite.', 'Juin à août')], saveur: 'Sucrée, légèrement acide.', usages: ['Muffins', 'Confiture', 'Tarte'], precautions: [GENV], confusions: [], quantite: FQ, requetes: ['muffins aux myrtilles'] });
  ok('groseillier', { parties: [pt('fruit', 'Les baies', 'Crues ou cuites.', 'Juin à août')], saveur: 'Très acide.', usages: ['Gelée', 'Sirop', 'Dessert'], precautions: [GENV], confusions: [], quantite: FQ, requetes: ['gelée de groseilles'] });
  ok('cassissier', { parties: [pt('fruit', 'Les baies noires', 'Cuites de préférence.', 'Juin à août')], saveur: 'Intense, acide.', usages: ['Confiture', 'Sirop', 'Sorbet'], precautions: [GENV], confusions: [], quantite: FQ, requetes: ['confiture de cassis'] });
  ok('groseillier-maquereau', { parties: [pt('fruit', 'Les baies', 'Mûres, crues ou cuites.', 'Juin à juillet')], saveur: 'Acide, sucrée si bien mûre.', usages: ['Compote', 'Confiture', 'Tarte'], precautions: ['Retirez les petites queues.'], confusions: [], quantite: FQ, requetes: ['compote groseilles à maquereau'] });
  ok('murier-sans-epines', { parties: [pt('fruit', 'Les mûres', 'Mûres, crues ou cuites.', 'Juillet à septembre')], saveur: 'Sucrée.', usages: ['Confiture', 'Crumble', 'Coulis'], precautions: [GENV], confusions: [], quantite: FQ, requetes: ['crumble aux mûres'] });
  ok('canneberge', { parties: [pt('fruit', 'Les baies', 'Cuites avec du sucre, ou en jus.', 'Octobre à novembre')], saveur: 'Très acide.', usages: ['Compote', 'Sauce', 'Jus'], precautions: [GENV], confusions: [], quantite: FQ, requetes: ['compote de canneberges'] });
  part('goji', { parties: [pt('fruit', 'Les baies', 'Fraîches ou séchées.', 'Août à octobre')], saveur: 'Légèrement sucrée.', usages: ['Fruits secs', 'Salade de fruits'], precautions: ['Ne mangez que les baies, pas les feuilles ni les tiges.', 'Commencez par peu.'], confusions: ['Ne les confondez pas avec les baies d\'autres plantes de la même famille, dont certaines sont toxiques (morelle).'], quantite: 'En petite quantité au début.', requetes: ['baies de goji recette'] });
  part('citronnier', { parties: [pt('fruit', 'Le fruit', 'Le jus, et le zeste seulement si l\'arbre n\'est pas traité.', 'Novembre à mars')], saveur: 'Acide.', usages: ['Citronnade', 'Gâteau au citron', 'Vinaigrette'], precautions: ['Ne mangez ni les feuilles ni l\'écorce.', 'Lavez bien avant d\'utiliser le zeste.'], confusions: [], quantite: FQ, requetes: ['gâteau au citron', 'citronnade maison'] });
  part('figuier', { parties: [pt('fruit', 'La figue mûre', 'Crue ou cuite.', 'Août à octobre')], saveur: 'Très sucrée.', usages: ['Confiture', 'Tarte', 'Fromage'], precautions: ['La sève blanche irrite la peau et la bouche : touchez peu les feuilles et les tiges, lavez-vous les mains.', 'Ne mangez que la figue mûre.'], confusions: [], quantite: FQ, requetes: ['confiture de figues', 'tarte aux figues'] });
  part('pommier-colonnaire', { parties: [pt('fruit', 'La pomme mûre', 'Crue ou cuite. Ne croquez pas les pépins.', 'Août à octobre')], saveur: 'Sucrée à acidulée.', usages: ['Compote', 'Tarte', 'Crumble'], precautions: ['Ne croquez pas les pépins en grande quantité, et ne mangez pas les feuilles.'], confusions: [], quantite: FQ, requetes: ['compote de pommes', 'tarte aux pommes'] });
  ok('mandarinier', { parties: [pt('fruit', 'Le fruit', 'Épluché, cru.', 'Novembre à février')], saveur: 'Sucrée.', usages: ['Salade de fruits', 'Confiture'], precautions: ['Épluchez et lavez-vous les mains.'], confusions: [], quantite: FQ, requetes: ['salade de mandarines'] });
  ok('kumquat', { parties: [pt('fruit', 'Le fruit entier', 'Cru avec la peau ou confit.', 'Novembre à mars')], saveur: 'Peau sucrée, chair acide.', usages: ['Confiture', 'Fruits confits'], precautions: ['Lavez bien : on mange la peau.'], confusions: [], quantite: FQ, requetes: ['confiture de kumquats'] });
  part('cerisier-nain', { parties: [pt('fruit', 'La cerise mûre', 'Crue ou cuite. Ne croquez pas le noyau.', 'Juin à juillet')], saveur: 'Sucrée à acide.', usages: ['Clafoutis', 'Confiture'], precautions: ['Ne croquez pas le noyau, et ne mangez pas les feuilles ni les tiges.', 'Pour les petits, enlevez les noyaux.'], confusions: [], quantite: FQ, requetes: ['clafoutis aux cerises'] });
  part('pecher-nain', { parties: [pt('fruit', 'La pêche mûre', 'Crue ou cuite. Ne croquez pas le noyau.', 'Juillet à septembre')], saveur: 'Sucrée, juteuse.', usages: ['Tarte', 'Compote'], precautions: ['Ne croquez pas le noyau ; ne mangez ni les feuilles ni les graines.'], confusions: [], quantite: FQ, requetes: ['tarte aux pêches'] });
  ok('poirier-colonnaire', { parties: [pt('fruit', 'La poire mûre', 'Crue ou cuite.', 'Août à octobre')], saveur: 'Sucrée, fondante.', usages: ['Compote', 'Tarte', 'Poires pochées'], precautions: ['Évitez de croquer les pépins en grande quantité.'], confusions: [], quantite: FQ, requetes: ['tarte aux poires'] });
  part('prunier-pot', { parties: [pt('fruit', 'La prune mûre', 'Crue ou cuite. Ne croquez pas le noyau.', 'Août à septembre')], saveur: 'Sucrée, parfumée.', usages: ['Tarte', 'Confiture'], precautions: ['Ne croquez pas le noyau ; ne mangez pas les feuilles.'], confusions: [], quantite: FQ, requetes: ['tarte aux prunes'] });
  ok('kiwi-autofertile', { parties: [pt('fruit', 'Le fruit mûr', 'Épluché, cru.', 'Octobre à novembre')], saveur: 'Sucrée et acide.', usages: ['Salade de fruits'], precautions: ['Certaines personnes sont allergiques au kiwi.'], confusions: [], quantite: FQ, requetes: ['salade de fruits kiwi'] });
  ok('vigne-raisin', { parties: [pt('fruit', 'Le raisin mûr', 'Cru, lavé.', 'Septembre à octobre')], saveur: 'Sucrée.', usages: ['Dessert', 'Jus', 'Tarte'], precautions: ['Lavez bien. Coupez les grains en deux pour les petits enfants.'], confusions: ['Ne le confondez pas avec la vigne vierge, dont les baies sont toxiques.'], quantite: FQ, animaux: 'Pas pour les animaux : le raisin est dangereux pour les chiens, même si la fiche ne le signale pas.', requetes: ['tarte au raisin'] });
  part('grenadier', { parties: [pt('fruit', 'Les graines (arilles) du fruit mûr', 'Crues, en salade ou en jus.', 'Octobre à novembre')], saveur: 'Acidulée et sucrée.', usages: ['Salade', 'Jus'], precautions: ['Ne mangez ni l\'écorce, ni les racines, ni les feuilles.'], confusions: [], quantite: FQ, requetes: ['salade de grenade'] });

  /* ===================== PLANTES « NON » (aucun usage confirmé) ===================== */
  var NONS = {
    'geranium': 'Le pélargonium de balcon n\'est pas confirmé comme comestible, et il est signalé légèrement toxique. Ne le mangez pas.',
    'petunia': 'Le pétunia est de la famille de la tomate et de la pomme de terre : aucun usage alimentaire confirmé. Ne le mangez pas.',
    'impatiens': PASCONF, 'camelia': 'Ce camélia est une plante d\'ornement ; le thé vient d\'une autre espèce. Ne le mangez pas.',
    'erable-japonais': PASCONF, 'hibiscus-jardin': 'L\'hibiscus de jardin n\'est pas confirmé comme comestible et peut donner des troubles digestifs. Ne le mangez pas.',
    'jasmin-etoile': 'Sa sève peut irriter. Ce n\'est pas un vrai jasmin : ne le mangez pas.', 'jasmin-officinal': 'Une source cite des jasmins en infusion, mais cette espèce n\'est pas confirmée : ne la mangez pas.',
    'orchidee': PASCONF, 'chlorophytum': PASCONF, 'peperomia': PASCONF, 'aspidistra': PASCONF, 'calathea': PASCONF, 'saintpaulia': PASCONF, 'hoya': PASCONF,
    'sansevieria': 'Plante d\'intérieur toxique : elle peut donner des vomissements. Ne la mangez pas.',
    'aloe-vera': 'La feuille d\'aloe vera contient un jus jaune irritant ; le gel ne se prépare pas à la maison sans risque. Ne la mangez pas.',
    'yucca': 'Plante d\'intérieur signalée toxique. Ne la mangez pas.', 'dracaena': 'Plante d\'intérieur signalée toxique. Ne la mangez pas.',
    'zamioculcas': 'Plante d\'intérieur toxique, irritante pour la bouche. Ne la mangez pas.', 'pothos': 'Plante d\'intérieur toxique, irritante pour la bouche. Ne la mangez pas.',
    'ficus': 'Sa sève irrite la peau et la bouche. Ne le mangez pas.', 'monstera': 'Les feuilles irritent la bouche et la gorge. Ne mangez rien de cette plante d\'intérieur.',
    'philodendron': 'Plante d\'intérieur toxique, irritante pour la bouche. Ne la mangez pas.', 'spathiphyllum': 'Plante d\'intérieur toxique, irritante pour la bouche. Ne la mangez pas.',
    'tradescantia': 'Plante d\'intérieur signalée toxique pour les animaux et irritante. Ne la mangez pas.', 'crassula': 'Plante d\'intérieur signalée toxique. Ne la mangez pas.',
    'cactus': PASCONF, 'sedum': PASCONF, 'joubarbe': PASCONF, 'echeveria': PASCONF, 'graminees-pot': PASCONF,
    'agapanthe': 'L\'agapanthe est signalée toxique : elle peut irriter l\'estomac. Ne la mangez pas.',
    'hosta': 'Le hosta est signalé toxique pour les animaux ; aucune partie n\'est confirmée comme comestible ici. Ne le mangez pas.',
    'fougere': 'Certaines fougères (comme la fougère aigle) sont déconseillées à la consommation. Ne mangez aucune fougère de jardin.',
    'heuchere': PASCONF, 'bergenie': PASCONF,
    'tagete': 'On cite parfois les pétales du tagète en cuisine, mais ce n\'est pas confirmé par deux sources et il peut irriter. Ne le mangez pas.',
    'cosmos': PASCONF, 'agastache': 'On cite parfois l\'agastache comme comestible, mais une seule source l\'a confirmé : par prudence, ne la mangez pas.',
    'echinacee': PASCONF, 'rudbeckia': PASCONF, 'zinnia': PASCONF, 'alysse-maritime': PASCONF, 'campanule': PASCONF, 'geranium-vivace': PASCONF,
    'phacelie': 'Cette plante est vendue comme engrais vert (pour la terre), pas comme aliment. Ne la mangez pas.',
    'moutarde-blanche': 'Cette plante est vendue comme engrais vert (pour la terre), pas comme aliment : ne la mangez pas, même si ses graines servent de condiment dans le commerce.',
    'trefle-blanc': 'Cette plante est vendue pour la pelouse ou la terre, pas comme aliment. Ne la mangez pas.',
    'sarrasin': 'Les graines de sarrasin sont un aliment, mais celles vendues comme engrais vert ne sont pas faites pour être mangées. Ne les mangez pas.',
    'luzerne': 'Cette plante est vendue comme engrais vert, pas comme aliment. Ne la mangez pas.',
    'pivoine': 'Les racines et les graines sont toxiques ; on cite parfois les pétales, mais par prudence ne mangez rien de la pivoine.'
  };
  Object.keys(NONS).forEach(function (id) { non(id, NONS[id], { confusions: [], requetes: [] }); });

  /* ===================== PLANTES « DANGEREUX » ===================== */
  var DANS = {
    'laurier-rose': 'TRÈS TOXIQUE, même en petite quantité : feuilles, fleurs, tiges, sève et fumée du bois. Ne le mangez JAMAIS. Ne l\'utilisez ni en infusion ni en brochette. Il ressemble au laurier-sauce de la cuisine : ne les confondez pas.',
    'narcisse': 'TRÈS TOXIQUE, surtout les bulbes. Ne mangez JAMAIS un narcisse ni sa fleur. Ne confondez pas le bulbe avec un oignon.',
    'tulipe': 'Toxique, surtout le bulbe. Ne mangez JAMAIS un bulbe de tulipe : on peut le confondre avec un oignon.',
    'hortensia': 'Toxique : feuilles, fleurs et boutons. Ne le mangez JAMAIS et ne le fumez pas.',
    'buis': 'Toxique : feuilles et tiges. Ne le mangez JAMAIS.',
    'rhododendron': 'Toxique, surtout les feuilles. Ne le mangez JAMAIS, et ne consommez pas le miel fait par des abeilles à partir de ses fleurs.',
    'clematite': 'Toxique : la sève irrite la bouche. Ne la mangez JAMAIS.',
    'chevrefeuille': 'Les baies sont toxiques. Ne les mangez JAMAIS.',
    'glycine': 'Toxique : les gousses et les graines surtout. Ne mangez JAMAIS la glycine, même si certaines sources citent ses fleurs.',
    'lierre': 'Toxique : feuilles et baies. Ne le mangez JAMAIS.',
    'vigne-vierge': 'Les baies sont toxiques. Ne les mangez JAMAIS (ne les confondez pas avec le raisin).',
    'aucuba': 'Toxique, surtout les baies. Ne le mangez JAMAIS.',
    'fusain': 'Toxique, surtout les fruits. Ne le mangez JAMAIS.',
    'dieffenbachia': 'TRÈS TOXIQUE : le suc brûle la bouche et la gorge. Ne la mettez JAMAIS en bouche.',
    'cyclamen': 'Les tubercules sont toxiques. Ne le mangez JAMAIS.',
    'kalanchoe': 'Toxique pour les animaux et pour les personnes si on le mange. Ne le mangez JAMAIS.',
    'iris-des-jardins': 'Les rhizomes sont toxiques. Ne mangez JAMAIS un iris.',
    'passiflore': 'Le feuillage donne des troubles digestifs et la plante n\'est pas confirmée comme comestible. Ne la mangez pas.',
    'consoude': 'Contient des substances (alcaloïdes pyrrolizidiniques) qui peuvent abîmer le foie. Ne la mangez pas, ni en tisane, ni en soupe. Ses feuilles ressemblent à celles de la bourrache.',
    'vesce': 'Les graines sont toxiques. Ne les mangez JAMAIS.'
  };
  Object.keys(DANS).forEach(function (id) { dan(id, DANS[id], { confusions: [], requetes: [] }); });
  C['narcisse'].confusions = ['Le bulbe de narcisse ressemble à un oignon ou à une échalote : ne les confondez jamais.'];
  C['tulipe'].confusions = ['Le bulbe de tulipe ressemble à un oignon : ne les confondez jamais.'];
  C['laurier-rose'].confusions = ['Le laurier-sauce (cuisine) : feuilles plus petites et très parfumées quand on les froisse. Le laurier-rose, lui, est un poison.'];
  C['vigne-vierge'].confusions = ['La vigne de table (raisin) : ne mangez que les raisins que vous avez plantés.'];
  C['consoude'].confusions = ['La bourrache : feuilles poilues semblables.'];
  C['iris-des-jardins'].confusions = [];

  /* ortie : comestible cuite */
  part('ortie', {
    parties: [pt('feuille', 'Les jeunes pousses', 'Toujours cuites ou ébouillantées, après avoir mis des gants.', 'Mars à juin')],
    saveur: 'Douce, proche des épinards une fois cuite.', usages: ['Soupe d\'ortie', 'Gratin', 'Omelette'],
    precautions: ['Portez des gants pour la cueillir : elle pique.', 'Mangez seulement les jeunes pousses, cuites. Ne cueillez pas près des routes ni d\'un terrain traité.'],
    confusions: ['Ne la confondez pas avec d\'autres plantes aux feuilles dentelées : la vraie ortie pique quand on la touche.'],
    quantite: Q, requetes: ['soupe d\'ortie', 'gratin d\'orties']
  });

  /* ===================== COMPLÉMENTS AUTOMATIQUES ===================== */
  var ORN = { fleur: 1, arbuste: 1, grimpante: 1, interieur: 1, succulente: 1, ombre: 1 };
  var M = D.comestiblesMsg;
  (D.plantes || []).forEach(function (p) {
    var r = C[p.id]; if (!r) return;
    r.id = p.id;
    r.parties = r.parties || []; r.usages = r.usages || []; r.precautions = r.precautions || []; r.confusions = r.confusions || []; r.requetes = r.requetes || [];
    r.saveur = r.saveur || ''; r.quantite = r.quantite || '';
    var tox = !!(p.toxique && p.toxique.chatChien);
    if (!r.animaux) r.animaux = tox ? M.animauxT : M.animauxOk;
    if (tox && r.animaux.toLowerCase().indexOf('pas pour les animaux') < 0) r.animaux = M.animauxT + ' ' + r.animaux;
    if (!r.enfants) r.enfants = (r.statut === 'comestible' || r.statut === 'partiellement') ? M.enfantsOk : M.enfantsNon;
    if ((r.statut === 'comestible' || r.statut === 'partiellement') && ORN[p.categorie] && r.precautions.indexOf(M.pesticide) < 0) r.precautions = [M.pesticide].concat(r.precautions);
    if ((r.statut === 'comestible' || r.statut === 'partiellement') && p.categorie === 'fleur' && r.precautions.join(' ').indexOf('produit chimique') < 0 && r.parties.some(function (x) { return x.type === 'fleur'; })) r.precautions.push(BIO);
  });
})();
