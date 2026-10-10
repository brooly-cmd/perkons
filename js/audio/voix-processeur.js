// =====================================================================
// voix-processeur.js — LE CŒUR D'UNE VOIX (missions 6 et 7)
//
// Ce fichier tourne dans « l'atelier audio » du navigateur (AudioWorklet) :
// un petit atelier à part qui fabrique le son échantillon par échantillon,
// 48 000 fois par seconde, sans être dérangé par le reste de la page.
// Le même code sert en temps réel (on entend) et hors temps réel
// (export WAV, calculé d'un coup comme un four en mode accéléré).
//
// Mission 6 : un son de base par voix, en attendant les vrais algos
// (missions 10 à 17). TUNE, DECAY et LEVEL agissent.
//   voix 1 : sinus grave        voix 2 : sinus médium
//   voix 3 : sinus + bruit      voix 4 : bruit « digital » (TUNE = vitesse)
// Mission 7 : le son passe ensuite dans le filtre (VCF + CUTOFF) puis dans
// l'overdrive (DRIVE), avant LEVEL, dans l'ordre de la machine (fiche §2) :
//   moteur → filtre → overdrive → LEVEL
//
// Les réglages arrivent par des « paramètres audio » (AudioParam) : des
// boutons que la page peut tourner à une heure précise de l'horloge audio.
//   tune, decay, level, cutoff, drive : 0 à 10, comme les chiffres de la façade ;
//   vcf : position de l'interrupteur (1 = HP en haut, 2 = BP au milieu, 3 = LP en bas) ;
//   antiClic : FILTER SWITCH SLEW (1 = actif, réglage d'usine ; 0 = coupé) ;
//   coup : un compteur. Chaque fois qu'il change de valeur, la voix est
//          frappée, à l'échantillon près. C'est ce qui permet de
//          programmer des notes à l'avance, sans minuteur.
// =====================================================================

// Plage de chaque voix : hauteur (Hz) à TUNE 0 et 10, durée (s) à DECAY 0 et 10
const PLAGES = {
  1: { f0: 30,   f1: 300,   d0: 0.02,  d1: 4 },
  2: { f0: 60,   f1: 600,   d0: 0.02,  d1: 3 },
  3: { f0: 100,  f1: 1000,  d0: 0.01,  d1: 2 },
  4: { f0: 2000, f1: 24000, d0: 0.005, d1: 1.5 }, // ici « hauteur » = vitesse du bruit
};

const MONTEE = 0.0005;    // 0,5 ms de montée pour éviter un « clic » au départ
const SILENCE = 0.00001;  // en dessous, la voix se tait (et ne calcule plus rien)
const LISSAGE = 0.005;    // 5 ms : un potard tourné glisse au lieu de sauter (pas de « zip »)

// --- Le filtre (VCF) ---------------------------------------------------
// Un filtre, c'est une passoire à fréquences : LP (passe-bas) garde les
// graves, HP (passe-haut) garde les aigus, BP (passe-bande) garde le milieu.
// CUTOFF règle où passe la limite : de 10 Hz (tout à gauche) à 22 000 Hz
// (tout à droite). Donc LP est grand ouvert tout à droite et HP grand
// ouvert tout à gauche, comme le dit le manuel p. 7.
// Pas de résonance, comme la vraie machine : la passoire ne « siffle » jamais.
// Pente : 24 dB par octave (au-delà de la limite, le son est divisé par 16
// à chaque octave). Le manuel ne la donne pas : choix B de la question 17.
// Pour l'obtenir, deux passoires de 12 dB sont mises l'une derrière l'autre.
const CUTOFF_MIN = 10;      // Hz, potard à 0
const CUTOFF_MAX = 22000;   // Hz, potard à 10
// Amortissement des deux passoires, réglé « Butterworth » : la courbe reste
// plate jusqu'à la limite, sans bosse, donc sans résonance
const AMORTI_1 = 2 * Math.cos(Math.PI / 8); // 1,848
const AMORTI_2 = 2 * Math.cos(3 * Math.PI / 8); // 0,765
const LISSAGE_CUTOFF = 0.01; // 10 ms : CUTOFF glisse un peu plus (un filtre raide s'ouvre vite)
const FONDU_FILTRE = 0.01;  // 10 ms : FILTER SWITCH SLEW, fondu d'un type de filtre à l'autre

// --- L'overdrive (DRIVE) -----------------------------------------------
// L'overdrive, c'est un ampli poussé trop fort qui « écrase » le haut des
// ondes : le son devient plus dense et plus rugueux, comme une voix qui
// crie dans un mégaphone. DRIVE dose le mélange son propre / son saturé
// (« dry / wet », comme du sirop dans l'eau) : à 0 l'overdrive est
// contourné, à 10 tout le son y passe.
const GAIN_DRIVE = 8;       // l'overdrive pousse le son 8 fois (+18 dB) avant de l'écraser
const SORTIE_DRIVE = 0.7;   // puis le ramène à un volume proche du son propre
const ANTI_CONTINU = 8;     // Hz : enlève le décalage créé par l'écrasement asymétrique

// Une passoire de 12 dB, dite « à variables d'état » : le même petit circuit
// donne en même temps les sorties HP, BP et LP. Ses deux « mémoires » (m1, m2)
// sont l'état du circuit, comme deux condensateurs qui se chargent.
//   g : réglage de la limite (vient de CUTOFF) ; k : amortissement
const nouvellePassoire = () => ({ m1: 0, m2: 0, hp: 0, bp: 0, lp: 0 });
function passer(p, x, g, k) {
  const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
  const v3 = x - p.m2;
  const v1 = a1 * p.m1 + a2 * v3;
  const v2 = p.m2 + a2 * p.m1 + a3 * v3;
  p.m1 = 2 * v1 - p.m1;
  p.m2 = 2 * v2 - p.m2;
  p.hp = x - k * v1 - v2;
  p.bp = k * v1; // ramené pour valoir 1 au sommet
  p.lp = v2;
}
const auRepos = (p) => Math.abs(p.m1) + Math.abs(p.m2) < 1e-9;
const vider = (p) => { p.m1 = p.m2 = 0; };

// Passer de 0..10 à une plage qui grandit « en multipliant », comme les octaves
const expo = (v, a, b) => a * Math.pow(b / a, Math.min(10, Math.max(0, v)) / 10);

class VoixPerkons extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'tune',     defaultValue: 5,  minValue: 0, maxValue: 10, automationRate: 'k-rate' },
      { name: 'decay',    defaultValue: 5,  minValue: 0, maxValue: 10, automationRate: 'k-rate' },
      { name: 'level',    defaultValue: 5,  minValue: 0, maxValue: 10, automationRate: 'k-rate' },
      { name: 'cutoff',   defaultValue: 10, minValue: 0, maxValue: 10, automationRate: 'k-rate' },
      { name: 'drive',    defaultValue: 0,  minValue: 0, maxValue: 10, automationRate: 'k-rate' },
      { name: 'vcf',      defaultValue: 3,  minValue: 1, maxValue: 3,  automationRate: 'k-rate' },
      { name: 'antiClic', defaultValue: 1,  minValue: 0, maxValue: 1,  automationRate: 'k-rate' },
      { name: 'coup',     defaultValue: 0, automationRate: 'a-rate' },
    ];
  }

  constructor(options) {
    super();
    this.n = options.processorOptions.voix;
    this.plage = PLAGES[this.n];
    this.dernierCoup = 0;
    this.env = 0;          // enveloppe de volume : 1 au coup, puis elle s'éteint
    this.montee = 0;       // > 0 pendant la petite montée
    this.phase = 0;        // position dans l'onde (0 à 1)
    this.gain = -1;        // LEVEL lissé, pour ne pas « craquer » quand on tourne (-1 = pas encore lu)
    this.bruitTenu = 0;    // voix 4 : valeur de bruit tenue
    this.compteBruit = 1;
    this.graine = 22222 + this.n; // bruit identique à chaque export (mesures répétables)

    // Filtre : une première passoire commune, puis une deuxième pour chaque
    // type (HP, BP, LP), le CUTOFF lissé et la part de HP / BP / LP entendue
    this.etage1 = nouvellePassoire();
    this.etages2 = [nouvellePassoire(), nouvellePassoire(), nouvellePassoire()];
    this.frequence = -1;
    this.poids = null;
    // Overdrive : mélange lissé et mémoire de l'anti-décalage
    this.melange = -1;
    this.dcEntree = 0;
    this.dcSortie = 0;

    // Pour les mesures seulement (pages de vérif) : contourner un circuit
    const contourner = options.processorOptions.contourner || [];
    this.sansFiltre = contourner.includes('vcf');
    this.sansDrive = contourner.includes('drive');
  }

  bruit() {
    // petit générateur de hasard (toujours la même suite : utile pour comparer)
    this.graine = (this.graine * 1664525 + 1013904223) >>> 0;
    return this.graine / 2147483648 - 1;
  }

  process(entrees, sorties, p) {
    const sortie = sorties[0][0];
    const sr = sampleRate;
    const { f0, f1, d0, d1 } = this.plage;
    const freq = expo(p.tune[0], f0, f1);
    const duree = expo(p.decay[0], d0, d1);
    // à chaque échantillon, l'enveloppe est multipliée par ce nombre :
    // après « duree » secondes, elle est à -60 dB (un millième)
    const chute = Math.exp(Math.log(0.001) / (duree * sr));
    const l = p.level[0] / 10;
    const gainVise = l * l;                       // courbe « audio » : comme un vrai potard de volume
    const lissage = 1 - Math.exp(-1 / (LISSAGE * sr));
    const lissageCutoff = 1 - Math.exp(-1 / (LISSAGE_CUTOFF * sr));
    const pasMontee = 1 / (MONTEE * sr);
    if (this.gain < 0) this.gain = gainVise; // au démarrage : directement la bonne position
    const coups = p.coup;

    // Filtre : la limite visée (sans dépasser ce que le numérique sait faire)
    const frequenceVisee = Math.min(expo(p.cutoff[0], CUTOFF_MIN, CUTOFF_MAX), 0.49 * sr);
    if (this.frequence < 0) this.frequence = frequenceVisee;
    const type = Math.round(p.vcf[0]) - 1; // 0 = HP, 1 = BP, 2 = LP
    // anti-clic coupé (ou démarrage) : on saute directement au nouveau type
    if (!this.poids || p.antiClic[0] < 0.5) this.poids = [0, 1, 2].map((t) => (t === type ? 1 : 0));
    const w = this.poids;
    const pasFondu = 1 / (FONDU_FILTRE * sr);
    // Overdrive
    const melangeVise = p.drive[0] / 10;
    if (this.melange < 0) this.melange = melangeVise;
    const rAnti = 1 - (2 * Math.PI * ANTI_CONTINU) / sr;

    for (let i = 0; i < sortie.length; i++) {
      const c = coups.length > 1 ? coups[i] : coups[0];
      if (c !== this.dernierCoup) {
        this.dernierCoup = c;
        this.montee = this.env; // repart de là où on en est, puis monte vite à 1
        this.phase = 0;
        if (this.montee <= 0) this.montee = 1e-9;
      }

      if (this.montee > 0) {
        this.env = Math.min(1, this.montee += pasMontee);
        if (this.env >= 1) this.montee = 0;
      } else if (this.env > SILENCE) {
        this.env *= chute;
      } else {
        this.env = 0;
      }
      this.gain += (gainVise - this.gain) * lissage;
      this.frequence *= Math.pow(frequenceVisee / this.frequence, lissageCutoff); // glisse « en octaves »
      this.melange += (melangeVise - this.melange) * lissage;
      for (let t = 0; t < 3; t++) w[t] = t === type ? Math.min(1, w[t] + pasFondu) : Math.max(0, w[t] - pasFondu);

      // Voix éteinte et circuits au repos : rien à calculer
      if (this.env === 0 && auRepos(this.etage1) && this.etages2.every(auRepos) && Math.abs(this.dcSortie) < 1e-9) {
        vider(this.etage1); this.etages2.forEach(vider);
        this.dcEntree = this.dcSortie = 0;
        sortie[i] = 0;
        continue;
      }

      // 1. Le moteur (son de base de la mission 6)
      let s = 0;
      if (this.env > 0) {
        if (this.n === 4) {
          // bruit tenu puis renouvelé « freq » fois par seconde (plus vite = plus brillant)
          this.compteBruit -= freq / sr;
          if (this.compteBruit <= 0) { this.compteBruit += 1; this.bruitTenu = this.bruit(); }
          s = this.bruitTenu;
        } else {
          s = Math.sin(2 * Math.PI * this.phase);
          if (this.n === 3) s = 0.5 * s + 0.5 * this.bruit();
          this.phase += freq / sr;
          if (this.phase >= 1) this.phase -= 1;
        }
        s *= this.env;
      }

      // 2. Le filtre (VCF) : deux passoires de 12 dB l'une derrière l'autre = 24 dB.
      // La première est commune ; la deuxième existe en trois exemplaires
      // (un par type), qui tournent tout le temps : c'est ce qui permet de
      // passer d'un type à l'autre en fondu, sans clic.
      if (!this.sansFiltre) {
        const g = Math.tan(Math.PI * this.frequence / sr);
        const e1 = this.etage1, [eHP, eBP, eLP] = this.etages2;
        passer(e1, s, g, AMORTI_1);
        passer(eHP, e1.hp, g, AMORTI_2);
        passer(eBP, e1.bp, g, AMORTI_2);
        passer(eLP, e1.lp, g, AMORTI_2);
        s = w[0] * eHP.hp + w[1] * eBP.bp + w[2] * eLP.lp;
      }

      // 3. L'overdrive (DRIVE), mélangé au son propre. À 0 : contourné.
      if (!this.sansDrive && this.melange > 0) {
        const u = s * GAIN_DRIVE;
        // écrasement un peu asymétrique (le bas s'écrase plus tôt que le haut),
        // comme un circuit analogique : ça ajoute de la chaleur
        const ecrase = u >= 0 ? Math.tanh(u) : Math.tanh(1.4 * u) / 1.4;
        // l'asymétrie pousse l'onde vers le haut : on enlève ce décalage
        this.dcSortie = ecrase - this.dcEntree + rAnti * this.dcSortie;
        this.dcEntree = ecrase;
        s = (1 - this.melange) * s + this.melange * SORTIE_DRIVE * this.dcSortie;
      } else {
        this.dcEntree = this.dcSortie = 0;
      }

      // 4. LEVEL
      sortie[i] = s * this.gain;
    }
    return true;
  }
}

registerProcessor('perkons-voix', VoixPerkons);
