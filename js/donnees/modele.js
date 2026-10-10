// =====================================================================
// modele.js — LE MODÈLE DE DONNÉES (mission 8)
//
// Le « plan des étagères » de la machine : comment on range un pas, une
// piste, un pattern, un kit, une banque, les réglages et la session.
// Toutes les missions suivantes utilisent CE fichier ; on n'invente pas
// d'autre façon de ranger (règle du projet). Explication case par case :
// docs/MODELE-DONNEES.md.
//
// Ce fichier fabrique des objets JavaScript simples (des « fiches ») :
//   - nouveauXxx()  : une fiche vierge, avec les valeurs d'usine ;
//   - verifierXxx() : la liste des erreurs d'une fiche (vide = tout va bien),
//                     comme un contrôleur qui relit un formulaire ;
//   - identiques()  : deux fiches ont-elles exactement le même contenu ?
//
// Échelles (les mêmes que la façade, js/facade-plan.js) :
//   potard        : nombre de 0 à 10 (les chiffres imprimés autour) ;
//   interrupteur  : position 1 (en haut), 2 (milieu), 3 (en bas) ;
//                   VCF : 1 = HP, 2 = BP, 3 = LP.
// Numéros de pas, de pattern, de kit, de banque : à partir de 1, comme
// sur la machine. Dans les listes JavaScript, l'élément 0 est donc le n° 1.
// =====================================================================

import { VOIX, BBD, MASTER, TEMPO, MODULATION } from '../facade-plan.js';

export const VERSION = 1; // augmente si un jour la forme des fiches change

// --- Les tailles de la machine ------------------------------------------
export const NB_VOIX = 4;
export const NB_PAS = 16;            // pas par piste (une rangée)
export const NB_SLOTS = 64;          // patterns et kits par banque (p. 24, 25)
export const NB_BANQUES = 64;        // p. 28
export const LONGUEUR_MAITRE_MAX = 64; // p. 15

// --- Les 11 contrôles d'une voix (p. 7) ----------------------------------
export const POTARDS_VOIX = ['tune', 'decay', 'param1', 'param2', 'cutoff', 'drive', 'fxsend', 'level'];
export const INTERS_VOIX = ['algo', 'mode', 'vcf'];
export const CONTROLES_VOIX = [...POTARDS_VOIX, ...INTERS_VOIX]; // ceux qu'on peut verrouiller (p. 23)

// --- Réglages d'une piste, dans l'ordre des pas avec SHIFT (p. 19, 20) ---
// Vitesse : pas 1 à 8 ; « facteur » = combien de pas la piste avance pour un pas du tempo
export const VITESSES = [
  { code: '÷8', facteur: 1 / 8 }, { code: '÷4', facteur: 1 / 4 },
  { code: '÷2', facteur: 1 / 2 }, { code: '÷4/3', facteur: 3 / 4 },
  { code: 'x1', facteur: 1 },     { code: 'x2', facteur: 2 },
  { code: 'x3/2', facteur: 3 / 2 }, { code: 'x4', facteur: 4 },
];
export const CODES_VITESSE = VITESSES.map((v) => v.code);
export const GROOVES = ['A', 'B', 'C', 'RND'];       // pas 9 à 12 (null = aucun groove)
export const SENS = ['FWD', 'BWD', 'PP', 'RND'];     // pas 13 à 16
export const SHUFFLE_MAX = 15;                       // 0 = pas 1 (minimum) … 15 = pas 16 (maximum)

// --- Réglages d'un pas (p. 22, 23), dans l'ordre des touches de voix 1 à 4 -
export const RATCHETS = [2, 3, 4, 5];                // 1 = pas de ratchet
export const CHANCES = {
  odds1: ['1/2', '1/3', '1/4', '1/8'],
  odds2: ['2/3', '3/4', '4/5', '7/8'],
  prob: ['10%', '25%', '50%', '90%'],
};
export const TOUTES_CHANCES = [...CHANCES.odds1, ...CHANCES.odds2, ...CHANCES.prob];
// La famille d'une chance : '1/3' → 'odds1', '90%' → 'prob'
export const familleChance = (c) => Object.keys(CHANCES).find((f) => CHANCES[f].includes(c)) ?? null;

// --- Menu MOD (p. 29) ----------------------------------------------------
// Destinations = pas 1 à 8 (VCF = le CUTOFF) ; profondeurs = pas 9 à 16
export const DESTINATIONS_MOD = ['tune', 'decay', 'param1', 'param2', 'cutoff', 'drive', 'fxsend', 'level'];
export const PROFONDEURS_MOD = [10, 20, 30, 40, 50, 60, 70, 80];

// --- Menu de configuration (p. 31 à 33) ----------------------------------
// Rangée 2, pas 1 à 12 (+ rangée 4, pas 1), dans l'ordre des pas.
// Valeur = réglage d'usine (voyant allumé = true).
export const OPTIONS_USINE = {
  kitLink: true,          // r2 p1  : « linked » par défaut (p. 25)
  potCatch: false,        // r2 p2  : 🔸 non écrit (question 19)
  accent: false,          // r2 p3  : 🔸 non écrit (question 19)
  paramRecSmooth: false,  // r2 p4  : voyant éteint = DISCRETE (p. 32) ; 🔸 défaut non écrit
  vintageBbd: false,      // r2 p5  : 🔸 non écrit (question 19)
  trigMute: false,        // r2 p6  : 🔸 non écrit (question 19)
  filterSwitchSlew: false, // r2 p7 : OFF par défaut = anti-clic actif (p. 32)
  kitFx: false,           // r2 p8  : « if the setting is ON » (p. 34)
  inverseOdds: false,     // r2 p9  : « by default, the step will be played in the first pass » (p. 32)
  bbdSync: false,         // r2 p10 : « with this setting enabled » (p. 33)
  muteSound: false,       // r2 p11 : « disabled (by default) » (p. 33)
  trackRotate: false,     // r2 p12 : « disabled (by default) » (p. 33)
  sampleStart: false,     // r4 p1  : « disabled (by default) » (p. 33)
};
export const NOMS_OPTIONS = Object.keys(OPTIONS_USINE);

export const HORLOGES = ['interne', 'midi'];          // r1 p1, p2 (ANALOG retirée, décision 5)
export const MODES_MIDI = ['single', 'multi'];        // r3 p1, p2
export const INTERRUPTEURS_MIDI = ['clockOut', 'clockContinue', 'thru', 'seqOut', 'ccOut', 'velocite']; // r3 p3 à p8
export const TABLES_CC = ['p36', 'p35', 'perso'];     // décision 1

// --- Les positions de la façade -----------------------------------------
// Tous les potards et interrupteurs (sauf ON/OFF), avec leur position de départ
// lue sur le plan de la façade : la façade et le modèle ne peuvent pas diverger.
const piecesFacade = () => {
  const pots = [
    ...VOIX.flatMap((v) => v.potards), ...BBD.potards, ...MASTER.potards,
    TEMPO.potard, MODULATION.vitesse, MODULATION.wave, MODULATION.modlvl,
  ];
  const inters = [...VOIX.flatMap((v) => v.inters), ...BBD.inters];
  return { pots, inters };
};
export const IDS_POTARDS_FACADE = piecesFacade().pots.map((p) => p.id);
export const IDS_INTERS_FACADE = piecesFacade().inters.map((i) => i.id);
const CRANS_FACADE = Object.fromEntries(piecesFacade().inters.map((i) => [i.id, i.crans]));

// =====================================================================
// LES FICHES VIERGES
// =====================================================================

// Un PAS : une case de la rangée (p. 17, 22, 23, 34)
export function nouveauPas() {
  return {
    actif: false,     // le pas déclenche-t-il la voix ?
    accent: false,    // joué plus fort (option ACCENT)
    ratchet: 1,       // 1 = un coup ; 2 à 5 = coups répétés dans le pas
    chance: null,     // null = joue toujours ; sinon un ODDS ('1/3', '7/8'…) OU une PROB ('25%'…)
    locks: {},        // parameter locks : { cutoff: 7.5, vcf: 3, … } (contrôles de la voix seulement)
    note: null,       // note MIDI chromatique 0 à 127 (mode multi-canal, V1.1) ; null = hauteur du potard
    velocite: null,   // force MIDI 1 à 127 (option MIDI VELOCITY) ; null = normale
  };
}

// Une PISTE : la séquence d'une voix (une rangée) et ses réglages (p. 15, 19, 20)
export function nouvellePiste() {
  return {
    pas: Array.from({ length: NB_PAS }, nouveauPas),
    dernierPas: NB_PAS, // LAST + pas (décision 2) : la piste boucle après ce pas
    vitesse: 'x1',      // division / multiplication (SHIFT + pas 1 à 8)
    groove: null,       // null, 'A', 'B', 'C' ou 'RND' (SHIFT + pas 9 à 12)
    sens: 'FWD',        // sens de lecture (SHIFT + pas 13 à 16)
    shuffle: 0,         // 0 (pas 1, minimum) à 15 (pas 16, maximum)
    automation: {},     // REC + potard : { decay: [16 valeurs ou null], … }
  };
}

// Un PATTERN : les 4 pistes + la longueur maître + le kit lié (p. 15, 24, 25)
export function nouveauPattern() {
  return {
    pistes: Array.from({ length: NB_VOIX }, nouvellePiste),
    longueurMaitre: null, // null = pas de longueur maître ; sinon 1 à 64 (SHIFT + LAST)
    kit: null,            // KIT LINK : numéro (1 à 64) du kit de la même banque, ou null
  };
}

// Le réglage d'une voix dans un kit : ses 11 contrôles
export function nouvelleVoixKit(n) {
  const v = VOIX[n - 1];
  const r = {};
  for (const p of v.potards) r[p.id.split('-')[1]] = p.valeur;
  for (const i of v.inters) r[i.id.split('-')[1]] = i.position;
  return r;
}

// Un KIT : les sons des 4 voix + le menu MOD (+ le BBD si KIT FX) (p. 24, 29, 34)
export function nouveauKit() {
  return {
    voix: [1, 2, 3, 4].map(nouvelleVoixKit),
    // menu MOD : pour chaque voix, la profondeur (10 à 80) de chaque destination, ou null
    modulation: Array.from({ length: NB_VOIX }, () => Object.fromEntries(DESTINATIONS_MOD.map((d) => [d, null]))),
    fx: null, // KIT FX allumé au moment de la sauvegarde : { time, feedback } ; sinon null
  };
}

// Une BANQUE : 64 emplacements de patterns + 64 de kits (p. 28)
export function nouvelleBanque() {
  return {
    patterns: Array(NB_SLOTS).fill(null), // null = emplacement vide
    kits: Array(NB_SLOTS).fill(null),
    dernierPattern: 1, // le dernier choisi, rechargé en revenant dans la banque
    dernierKit: 1,
  };
}

// Les RÉGLAGES : le menu de configuration (p. 31 à 33) + ce qui remplace la carte SD
export function reglagesUsine() {
  return {
    horloge: 'interne',
    options: { ...OPTIONS_USINE },
    midi: {
      mode: 'single',             // 🔸 non écrit (question 19)
      canalUnique: 1,             // sous-menu SINGLE CHANNEL MIDI CONFIG
      canauxVoix: [1, 2, 3, 4],   // sous-menu MULTI CHANNEL : « Voice 1 = MIDI CH1… » (p. 34)
      clockOut: false, clockContinue: false, thru: false, seqOut: false, ccOut: false, velocite: false,
      tableCC: 'p36',             // décision 1 : table du fichier p. 36 au départ
      ccPerso: null,              // table perso (fichier single-midi-cc.json) : { voix1: { tune: 70, … }, … }
    },
    samples: [null, null, null],  // WAV perso de V4 algo 3 (dossier SAMPLES) : { nom, octets }
  };
}

// La SESSION : ce que la machine retrouve en se rallumant (p. 28) et la place
// physique des potards (un potard ne bouge pas quand on éteint la machine).
export function nouvelleSession() {
  const { pots, inters } = piecesFacade();
  return {
    banque: 1,              // banque en cours (son dernier pattern et kit sont dans la banque)
    facade: Object.fromEntries([...pots.map((p) => [p.id, p.valeur]), ...inters.map((i) => [i.id, i.position])]),
    tempoTape: null,        // BPM tapé (SHIFT + pas, TAP TEMPO) qui remplace le potard ; null = potard
    lfoSync: false,         // touche SYNC du LFO (p. 30)
    fill: Array(NB_VOIX).fill('x1'), // densité de fill de chaque piste (p. 21)
    mutes: Array(NB_VOIX).fill(false),
    chaine: null,           // patterns chaînés : { debut, fin } (p. 27) ; null = pas de chaîne
  };
}

// La MACHINE en mémoire pendant qu'on joue : tout le rangé + les copies de travail.
// pattern et kit sont les copies qu'on modifie ; elles ne vont dans la banque
// qu'avec REC (p. 24, 25). Éteindre sans sauver les perd, comme sur la vraie.
export function nouvelleMachine() {
  return {
    reglages: reglagesUsine(),
    session: nouvelleSession(),
    banques: Array.from({ length: NB_BANQUES }, nouvelleBanque),
    pattern: nouveauPattern(),
    kit: nouveauKit(),
  };
}

// Le FICHIER DE SAUVEGARDE (remplace la carte SD) : tout ce qui est rangé.
export function nouvelleSauvegarde(machine = nouvelleMachine()) {
  return {
    format: 'perkons-hd01',
    version: VERSION,
    reglages: machine.reglages,
    session: machine.session,
    banques: machine.banques,
  };
}

// =====================================================================
// LE CONTRÔLEUR : chaque fonction rend la liste des erreurs trouvées
// =====================================================================

const estObjet = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const entier = (x, min, max) => Number.isInteger(x) && x >= min && x <= max;
const potard = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 10;
const parmi = (x, liste) => liste.includes(x);

// Un contrôle de voix (potard 0 à 10, ou interrupteur 1 à 3)
const valeurControle = (nom, x) => (INTERS_VOIX.includes(nom) ? entier(x, 1, 3) : potard(x));

// Les clés d'une fiche sont-elles exactement celles attendues ? (rien d'oublié, rien en trop)
function memesCles(obj, attendues, ou, erreurs) {
  if (!estObjet(obj)) { erreurs.push(`${ou} : fiche absente`); return false; }
  for (const c of attendues) if (!(c in obj)) erreurs.push(`${ou} : « ${c} » manque`);
  for (const c of Object.keys(obj)) if (!attendues.includes(c)) erreurs.push(`${ou} : « ${c} » inconnu`);
  return true;
}
const liste = (x, n, ou, erreurs) => {
  if (Array.isArray(x) && x.length === n) return true;
  erreurs.push(`${ou} : il faut une liste de ${n}`);
  return false;
};

export function verifierPas(p, ou = 'pas', erreurs = []) {
  if (!memesCles(p, Object.keys(nouveauPas()), ou, erreurs)) return erreurs;
  if (typeof p.actif !== 'boolean') erreurs.push(`${ou}.actif : oui ou non`);
  if (typeof p.accent !== 'boolean') erreurs.push(`${ou}.accent : oui ou non`);
  if (!entier(p.ratchet, 1, 5)) erreurs.push(`${ou}.ratchet : 1 à 5 (reçu ${p.ratchet})`);
  if (p.chance !== null && !parmi(p.chance, TOUTES_CHANCES)) erreurs.push(`${ou}.chance : « ${p.chance} » n'existe pas`);
  if (estObjet(p.locks)) {
    for (const [nom, v] of Object.entries(p.locks)) {
      if (!CONTROLES_VOIX.includes(nom)) erreurs.push(`${ou}.locks : « ${nom} » n'est pas un contrôle de voix (pas de lock sur la section master)`);
      else if (!valeurControle(nom, v)) erreurs.push(`${ou}.locks.${nom} : valeur ${v} hors plage`);
    }
  } else erreurs.push(`${ou}.locks : fiche absente`);
  if (p.note !== null && !entier(p.note, 0, 127)) erreurs.push(`${ou}.note : 0 à 127`);
  if (p.velocite !== null && !entier(p.velocite, 1, 127)) erreurs.push(`${ou}.velocite : 1 à 127`);
  return erreurs;
}

export function verifierPiste(t, ou = 'piste', erreurs = []) {
  if (!memesCles(t, Object.keys(nouvellePiste()), ou, erreurs)) return erreurs;
  if (liste(t.pas, NB_PAS, `${ou}.pas`, erreurs)) t.pas.forEach((p, i) => verifierPas(p, `${ou}.pas ${i + 1}`, erreurs));
  if (!entier(t.dernierPas, 1, NB_PAS)) erreurs.push(`${ou}.dernierPas : 1 à ${NB_PAS}`);
  if (!parmi(t.vitesse, CODES_VITESSE)) erreurs.push(`${ou}.vitesse : « ${t.vitesse} » n'existe pas`);
  if (t.groove !== null && !parmi(t.groove, GROOVES)) erreurs.push(`${ou}.groove : « ${t.groove} » n'existe pas`);
  if (!parmi(t.sens, SENS)) erreurs.push(`${ou}.sens : « ${t.sens} » n'existe pas`);
  if (!entier(t.shuffle, 0, SHUFFLE_MAX)) erreurs.push(`${ou}.shuffle : 0 à ${SHUFFLE_MAX}`);
  if (estObjet(t.automation)) {
    for (const [nom, valeurs] of Object.entries(t.automation)) {
      if (!CONTROLES_VOIX.includes(nom)) { erreurs.push(`${ou}.automation : « ${nom} » n'est pas un contrôle de voix`); continue; }
      if (!liste(valeurs, NB_PAS, `${ou}.automation.${nom}`, erreurs)) continue;
      valeurs.forEach((v, i) => {
        if (v !== null && !valeurControle(nom, v)) erreurs.push(`${ou}.automation.${nom} pas ${i + 1} : valeur ${v} hors plage`);
      });
    }
  } else erreurs.push(`${ou}.automation : fiche absente`);
  return erreurs;
}

export function verifierPattern(pt, ou = 'pattern', erreurs = []) {
  if (!memesCles(pt, Object.keys(nouveauPattern()), ou, erreurs)) return erreurs;
  if (liste(pt.pistes, NB_VOIX, `${ou}.pistes`, erreurs)) pt.pistes.forEach((t, i) => verifierPiste(t, `${ou}.piste ${i + 1}`, erreurs));
  if (pt.longueurMaitre !== null && !entier(pt.longueurMaitre, 1, LONGUEUR_MAITRE_MAX)) erreurs.push(`${ou}.longueurMaitre : 1 à 64`);
  if (pt.kit !== null && !entier(pt.kit, 1, NB_SLOTS)) erreurs.push(`${ou}.kit : 1 à 64`);
  return erreurs;
}

export function verifierKit(k, ou = 'kit', erreurs = []) {
  if (!memesCles(k, Object.keys(nouveauKit()), ou, erreurs)) return erreurs;
  if (liste(k.voix, NB_VOIX, `${ou}.voix`, erreurs)) {
    k.voix.forEach((v, i) => {
      if (!memesCles(v, CONTROLES_VOIX, `${ou}.voix ${i + 1}`, erreurs)) return;
      for (const nom of CONTROLES_VOIX) if (!valeurControle(nom, v[nom])) erreurs.push(`${ou}.voix ${i + 1}.${nom} : valeur ${v[nom]} hors plage`);
    });
  }
  if (liste(k.modulation, NB_VOIX, `${ou}.modulation`, erreurs)) {
    k.modulation.forEach((m, i) => {
      if (!memesCles(m, DESTINATIONS_MOD, `${ou}.modulation ${i + 1}`, erreurs)) return;
      for (const d of DESTINATIONS_MOD) {
        if (m[d] !== null && !parmi(m[d], PROFONDEURS_MOD)) erreurs.push(`${ou}.modulation ${i + 1}.${d} : 10 à 80 %, par 10`);
      }
    });
  }
  if (k.fx !== null && memesCles(k.fx, ['time', 'feedback'], `${ou}.fx`, erreurs)) {
    if (!potard(k.fx.time) || !potard(k.fx.feedback)) erreurs.push(`${ou}.fx : potards de 0 à 10`);
  }
  return erreurs;
}

export function verifierBanque(b, ou = 'banque', erreurs = []) {
  if (!memesCles(b, Object.keys(nouvelleBanque()), ou, erreurs)) return erreurs;
  if (liste(b.patterns, NB_SLOTS, `${ou}.patterns`, erreurs)) b.patterns.forEach((p, i) => p !== null && verifierPattern(p, `${ou}.pattern ${i + 1}`, erreurs));
  if (liste(b.kits, NB_SLOTS, `${ou}.kits`, erreurs)) b.kits.forEach((k, i) => k !== null && verifierKit(k, `${ou}.kit ${i + 1}`, erreurs));
  if (!entier(b.dernierPattern, 1, NB_SLOTS)) erreurs.push(`${ou}.dernierPattern : 1 à 64`);
  if (!entier(b.dernierKit, 1, NB_SLOTS)) erreurs.push(`${ou}.dernierKit : 1 à 64`);
  return erreurs;
}

function verifierTableCC(t, ou, erreurs) {
  if (!memesCles(t, ['voix1', 'voix2', 'voix3', 'voix4'], ou, erreurs)) return;
  for (const [v, cc] of Object.entries(t)) {
    if (!memesCles(cc, CONTROLES_VOIX, `${ou}.${v}`, erreurs)) continue;
    for (const nom of CONTROLES_VOIX) if (!entier(cc[nom], 0, 127)) erreurs.push(`${ou}.${v}.${nom} : CC 0 à 127`);
  }
}

export function verifierReglages(r, ou = 'reglages', erreurs = []) {
  if (!memesCles(r, Object.keys(reglagesUsine()), ou, erreurs)) return erreurs;
  if (!parmi(r.horloge, HORLOGES)) erreurs.push(`${ou}.horloge : « ${r.horloge} » n'existe pas`);
  if (memesCles(r.options, NOMS_OPTIONS, `${ou}.options`, erreurs)) {
    for (const o of NOMS_OPTIONS) if (typeof r.options[o] !== 'boolean') erreurs.push(`${ou}.options.${o} : oui ou non`);
  }
  const m = r.midi;
  if (memesCles(m, Object.keys(reglagesUsine().midi), `${ou}.midi`, erreurs)) {
    if (!parmi(m.mode, MODES_MIDI)) erreurs.push(`${ou}.midi.mode : single ou multi`);
    if (!entier(m.canalUnique, 1, 16)) erreurs.push(`${ou}.midi.canalUnique : 1 à 16`);
    if (!liste(m.canauxVoix, NB_VOIX, `${ou}.midi.canauxVoix`, erreurs) || !m.canauxVoix.every((c) => entier(c, 1, 16))) erreurs.push(`${ou}.midi.canauxVoix : canaux 1 à 16`);
    for (const s of INTERRUPTEURS_MIDI) if (typeof m[s] !== 'boolean') erreurs.push(`${ou}.midi.${s} : oui ou non`);
    if (!parmi(m.tableCC, TABLES_CC)) erreurs.push(`${ou}.midi.tableCC : p36, p35 ou perso`);
    if (m.ccPerso !== null) verifierTableCC(m.ccPerso, `${ou}.midi.ccPerso`, erreurs);
    if (m.tableCC === 'perso' && m.ccPerso === null) erreurs.push(`${ou}.midi : table perso choisie mais absente`);
  }
  if (liste(r.samples, 3, `${ou}.samples`, erreurs)) {
    r.samples.forEach((s, i) => {
      if (s === null) return;
      if (memesCles(s, ['nom', 'octets'], `${ou}.sample ${i + 1}`, erreurs)
        && (typeof s.nom !== 'string' || !(s.octets instanceof ArrayBuffer))) erreurs.push(`${ou}.sample ${i + 1} : un nom et des octets`);
    });
  }
  return erreurs;
}

export function verifierSession(s, ou = 'session', erreurs = []) {
  if (!memesCles(s, Object.keys(nouvelleSession()), ou, erreurs)) return erreurs;
  if (!entier(s.banque, 1, NB_BANQUES)) erreurs.push(`${ou}.banque : 1 à 64`);
  if (memesCles(s.facade, [...IDS_POTARDS_FACADE, ...IDS_INTERS_FACADE], `${ou}.facade`, erreurs)) {
    for (const id of IDS_POTARDS_FACADE) if (!potard(s.facade[id])) erreurs.push(`${ou}.facade.${id} : 0 à 10`);
    for (const id of IDS_INTERS_FACADE) if (!entier(s.facade[id], 1, CRANS_FACADE[id])) erreurs.push(`${ou}.facade.${id} : 1 à ${CRANS_FACADE[id]}`);
  }
  if (s.tempoTape !== null && !(typeof s.tempoTape === 'number' && s.tempoTape >= 1 && s.tempoTape <= 999)) erreurs.push(`${ou}.tempoTape : 1 à 999 BPM`);
  if (typeof s.lfoSync !== 'boolean') erreurs.push(`${ou}.lfoSync : oui ou non`);
  if (!liste(s.fill, NB_VOIX, `${ou}.fill`, erreurs) || !s.fill.every((f) => parmi(f, CODES_VITESSE))) erreurs.push(`${ou}.fill : densités ÷8 à x4`);
  if (!liste(s.mutes, NB_VOIX, `${ou}.mutes`, erreurs) || !s.mutes.every((x) => typeof x === 'boolean')) erreurs.push(`${ou}.mutes : oui ou non`);
  if (s.chaine !== null) {
    if (!memesCles(s.chaine, ['debut', 'fin'], `${ou}.chaine`, erreurs)) return erreurs;
    if (!entier(s.chaine.debut, 1, NB_SLOTS) || !entier(s.chaine.fin, s.chaine.debut, NB_SLOTS)) erreurs.push(`${ou}.chaine : début ≤ fin, de 1 à 64`);
  }
  return erreurs;
}

export function verifierSauvegarde(sv, erreurs = []) {
  if (!memesCles(sv, Object.keys(nouvelleSauvegarde()), 'sauvegarde', erreurs)) return erreurs;
  if (sv.format !== 'perkons-hd01') erreurs.push("ce n'est pas un fichier de sauvegarde HD-01");
  if (sv.version !== VERSION) erreurs.push(`version ${sv.version} inconnue (cette page lit la version ${VERSION})`);
  verifierReglages(sv.reglages, 'reglages', erreurs);
  verifierSession(sv.session, 'session', erreurs);
  if (liste(sv.banques, NB_BANQUES, 'banques', erreurs)) sv.banques.forEach((b, i) => verifierBanque(b, `banque ${i + 1}`, erreurs));
  return erreurs;
}

// =====================================================================
// OUTILS
// =====================================================================

// Copie complète et indépendante d'une fiche (les samples compris)
export const copier = (x) => structuredClone(x);

// Deux fiches ont-elles exactement le même contenu ? (comparaison case par case)
export function identiques(a, b) {
  if (a === b) return true;
  if (a instanceof ArrayBuffer || b instanceof ArrayBuffer) {
    if (!(a instanceof ArrayBuffer && b instanceof ArrayBuffer) || a.byteLength !== b.byteLength) return false;
    const x = new Uint8Array(a), y = new Uint8Array(b);
    return x.every((o, i) => o === y[i]);
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ca = Object.keys(a), cb = Object.keys(b);
  return ca.length === cb.length && ca.every((c) => c in b && identiques(a[c], b[c]));
}
