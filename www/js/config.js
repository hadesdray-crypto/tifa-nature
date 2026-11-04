/* Réglages de l'éditeur de l'application. Aucune donnée personnelle ici.
   Les valeurs « __…__ » sont remplacées automatiquement par GitHub Actions. */
window.TIFA_CONFIG = {
  NOM: 'Tifa Nature',
  VERSION_WEB: '1.3.2',
  VERSION_CODE: 6,                /* numéro de version des fichiers de l'appli (augmente à chaque mise à jour) */

  /* Reconnaissance par photo (Pl@ntNet). Clé à créer sur my.plantnet.org puis à coller ici.
     Tant que la clé est vide, l'appli utilise le mode guidé hors connexion. */
  PLANTNET_API_KEY: '',
  PLANTNET_URL: 'https://my-api.plantnet.org',

  /* Mises à jour sur place (adresse du fichier manifest.json publié par GitHub). */
  UPDATE_MANIFEST_URL: '__UPDATE_MANIFEST_URL__',
  UPDATE_CHECK_EVERY_HOURS: 6,

  /* Licence / activation (compatible avec la future appli de vente).
     LICENCE_OBLIGATOIRE=false : l'appli s'utilise sans code (mode libre).
     LICENCE_OBLIGATOIRE=true  : un code d'activation reçu après paiement est demandé. */
  LICENCE_OBLIGATOIRE: false,
  LICENCE_PUBLIC_KEY_JWK: null,   /* clé publique ECDSA P-256 au format JWK, fournie par l'appli de vente */
  LICENCE_VERIF_URL: '',          /* adresse optionnelle de vérification en ligne (révocation) */
  LICENCE_PREFIXE: 'TIFA1'
};
