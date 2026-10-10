// =====================================================================
// facade-plan.js — LE PLAN DE LA FAÇADE (mission 3)
//
// Ce fichier ne dessine rien : c'est la « liste des meubles et de leur place ».
// Toutes les positions sont mesurées sur la photo de référence
// (docs/photo-facade.png, 910 × 658 pixels). Une unité = 1 pixel de la photo.
// Le navigateur agrandit ensuite le tout à la taille de l'écran.
//
// Valeurs des potards : 0 à 10 (comme les chiffres imprimés autour).
// Position des interrupteurs : 1 = en haut, 2 = au milieu, 3 = en bas.
// Voyants : 0 = éteint, 1 = faible, 2 = fort.
// =====================================================================

export const LARGEUR = 910;
export const HAUTEUR = 658;

// --- Zone 1 : les 4 voix ------------------------------------------------
// Une colonne fait 159 unités de large ; on décale la voix 1 pour obtenir les autres.
const ECART_VOIX = 159;

// Les 8 potards d'une voix : [identifiant, texte imprimé, x, y] (pour la voix 1)
const POTARDS_VOIX = [
  ['tune',   'TUNE',    100,  83], ['decay',  'DECAY',   174,  83],
  ['param1', 'PARAM 1', 100, 158], ['param2', 'PARAM 2', 174, 158],
  ['cutoff', 'CUTOFF',  100, 233], ['drive',  'DRIVE',   174, 233],
  ['fxsend', 'FX SEND', 100, 308], ['level',  'LEVEL',   174, 308],
];

// Les 3 interrupteurs d'une voix (3 positions chacun)
const INTERS_VOIX = [
  { id: 'algo', x: 137, y: 122, haut: '1',  gauche: '2',  bas: '3',  nom: 'ALGO' },
  { id: 'mode', x: 137, y: 195, haut: '1',  gauche: '2',  bas: '3',  nom: 'MODE' },
  { id: 'vcf',  x: 138, y: 270, haut: 'HP', gauche: 'BP', bas: 'LP', nom: 'VCF'  },
];

export const VOIX = [0, 1, 2, 3].map((v) => {
  const dx = v * ECART_VOIX;
  const n = v + 1;
  return {
    numero: n,
    titre: `VOICE ${n}`,
    cadre: { x1: 59 + dx, x2: 214 + dx, y1: 49, y2: 349 },
    voyant: { id: `v${n}-led`, x: 136 + dx, y: 64, etat: 0 },
    potards: POTARDS_VOIX.map(([id, texte, x, y]) => ({
      id: `v${n}-${id}`, texte, x: x + dx, y, valeur: 1, taille: 'moyen',
    })),
    inters: INTERS_VOIX.map((i) => ({ ...i, id: `v${n}-${i.id}`, x: i.x + dx, position: 2, crans: 3 })),
  };
});

// --- Zone 2 : BBD et MASTER --------------------------------------------
export const BBD = {
  cadre: { x1: 695, x2: 773, y1: 49, y2: 349 },
  potards: [
    { id: 'bbd-time',     texte: 'TIME',       x: 735, y:  83 },
    { id: 'bbd-feedback', texte: 'FEEDBACK',   x: 735, y: 158 },
    { id: 'bbd-lforate',  texte: 'LFO RATE',   x: 735, y: 233 },
    { id: 'bbd-moddepth', texte: 'MOD. DEPTH', x: 735, y: 308 },
  ].map((p) => ({ ...p, valeur: 1, taille: 'moyen' })),
  inters: [
    { id: 'bbd-range',  x: 774, y: 122, crans: 2, position: 1, haut: 'SHORT', bas: 'LONG', nom: 'MODE' },
    { id: 'bbd-colour', x: 774, y: 195, crans: 2, position: 1, haut: '', bas: '', nom: 'COLOUR' },
  ],
  voyant: { id: 'bbd-led', x: 774, y: 233, etat: 0 },
};

export const MASTER = {
  cadre: { x1: 773, x2: 857, y1: 49, y2: 349 },
  potards: [
    { id: 'master-volume',  texte: 'VOLUME',       x: 816, y:  83 },
    { id: 'master-send',    texte: 'MASTER SEND',  x: 816, y: 158 },
    { id: 'master-thrshld', texte: 'COMP. THRSHLD', x: 816, y: 233 },
    { id: 'master-amt',     texte: 'COMP. AMT',    x: 816, y: 308 },
  ].map((p) => ({ ...p, valeur: 1, taille: 'moyen' })),
};

// --- Zone 3 : TEMPO et touches principales -----------------------------
export const TEMPO = {
  bandeau: { texte: 'TEMPO', x1: 61, x2: 168, y: 359 },
  potard: { id: 'tempo', x: 115, y: 411, valeur: 0.7, taille: 'grand', gauche: 'SLOW', droite: 'FAST' },
};

// Touches grises : [id, texte, x du centre, y du haut, largeur, voyant ?, état du voyant]
export const TOUCHES_PRINCIPALES = [
  { id: 'shift',   texte: 'SHIFT',     x:  70, y: 476, l: 23, voyant: true,  etat: 0 },
  { id: 'shuffle', texte: 'SHUFFLE',   x: 100, y: 476, l: 23, voyant: false },
  { id: 'last',    texte: 'LAST',      x: 129, y: 476, l: 23, voyant: false },
  { id: 'clear',   texte: 'CLEAR',     x: 159, y: 476, l: 23, voyant: false },
  { id: 'rec',     texte: 'REC',       x:  75, y: 529, l: 32, voyant: true,  etat: 0 },
  { id: 'play',    texte: 'PLAY/STOP', x: 115, y: 529, l: 32, voyant: true,  etat: 2 },
  { id: 'reset',   texte: 'RESET',     x: 155, y: 529, l: 32, voyant: false },
];

// --- Zone 4 : le séquenceur (grille 4 × 16) ----------------------------
// Colonne c (0 à 15) : x = 195 + 30 × c.  Rangée r : voyant à y = Y_VOYANTS[r].
export const PAS_X0 = 195;
export const PAS_ECART = 30;
export const Y_VOYANTS = [378, 430, 483, 535];

// Voyants allumés sur la photo (numéros de pas 1 à 16, par rangée)
const ALLUMES_PHOTO = [
  [1, 3, 4, 11, 15],
  [1, 7, 12, 16],
  [1, 2, 5, 9, 13],
  [1, 5, 12, 15],
];

export const PAS = [];
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 16; c++) {
    PAS.push({
      id: `pas-${r + 1}-${c + 1}`,
      rangee: r + 1, colonne: c + 1,
      x: PAS_X0 + PAS_ECART * c,
      yVoyant: Y_VOYANTS[r],
      // Les groupes de 4 alternent : foncé (1-4, 9-12) et gris clair (5-8, 13-16)
      couleur: Math.floor(c / 4) % 2 === 0 ? 'fonce' : 'clair',
      etat: ALLUMES_PHOTO[r].includes(c + 1) ? 2 : 0,
    });
  }
}

// Sérigraphie de la grille : bandeaux pleins (fond clair, texte foncé)
// et cases détourées (texte clair). col1/col2 = première et dernière colonne couvertes.
export const BANDEAUX_GRILLE = [
  { texte: 'DIVIDE',                 col1: 1, col2: 4,  y: 359 },
  { texte: 'MULTIPLY',               col1: 5, col2: 8,  y: 359 },
  { texte: 'GROOVE',                 col1: 9, col2: 12, y: 359 },
  { texte: 'PLAY MODE',              col1: 13, col2: 16, y: 359 },
  { texte: 'MODULATION DESTINATION', col1: 1, col2: 8,  y: 466 },
  { texte: 'MODULATION DEPTH',       col1: 9, col2: 16, y: 466 },
];
export const ETIQUETTES_GRILLE = [
  { y: 413, groupes: [['÷8', '÷4', '÷2', '÷4/3'], ['x1', 'x2', 'x3/2', 'x4'], ['A', 'B', 'C', 'RND'], ['FWD', 'BWD', 'PP', 'RND']] },
  { y: 517, groupes: [['TUNE', 'DECAY', 'P1', 'P2', 'VCF', 'DRIVE', 'FX', 'LVL'], ['10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%']] },
];

// Les 4 grosses touches de voix, à droite de chaque rangée, avec leurs étiquettes
// (ratchet · ODDS1 · ODDS2 · PROB)
export const TOUCHES_VOIX = [
  { id: 'voix-1', y: 370, yEtiquette: 360, etiquettes: ['x2', '1/2', '2/3', '10%'] },
  { id: 'voix-2', y: 422, yEtiquette: 412, etiquettes: ['x3', '1/3', '3/4', '25%'] },
  { id: 'voix-3', y: 476, yEtiquette: 465, etiquettes: ['x4', '1/4', '4/5', '50%'] },
  { id: 'voix-4', y: 528, yEtiquette: 517, etiquettes: ['x5', '1/8', '7/8', '90%'] },
].map((t) => ({ ...t, x: 694, l: 36, h: 36, etat: 0 }));

// --- Zone 5 : MODULATION et configuration ------------------------------
export const MODULATION = {
  bandeau: { texte: 'MODULATION', x1: 740, x2: 856, y: 359 },
  voyant: { id: 'lfo-led', x: 752, y: 377, etat: 2 },
  vitesse: { id: 'lfo-rate', x: 796, y: 415, valeur: 0.4, taille: 'grand', gauche: 'SLOW', droite: 'FAST' },
  wave:    { id: 'lfo-wave', texte: 'WAVE',    x: 766, y: 482, valeur: 0.6, taille: 'petit', formes: true },
  modlvl:  { id: 'mod-lvl',  texte: 'MOD LVL', x: 825, y: 482, valeur: 1,   taille: 'petit' },
  touches: [
    { id: 'pattern', texte: 'PATTERN', alias: 'RATCHET', x: 750 },
    { id: 'kit',     texte: 'KIT',     alias: 'ODDS1',   x: 781 },
    { id: 'sync',    texte: 'SYNC',    alias: 'ODDS2',   x: 810 },
    { id: 'mod',     texte: 'MOD',     alias: 'PROB',    x: 840 },
  ].map((t) => ({ ...t, y: 527, l: 24, voyant: true, etat: 0 })),
};

// --- Le nom de la machine (sans logo Erica Synths) ---------------------
export const NOM = { texte: 'HD-01', x: 58, y: 598 };

// --- Interrupteur ON/OFF (décision 6) : au-dessus du coin haut droit ----
export const ALIMENTATION = { id: 'power', x: 846, y: 6, position: 'OFF' };

// --- Décor : les prises vues sur la tranche du haut (sans fonction) -----
export const PRISES_DECOR = [72, 132, 188, 238, 292, 350, 395, 452, 500, 667, 715];
