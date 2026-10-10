// =====================================================================
// voix-processeur.js — LE CŒUR D'UNE VOIX (mission 6)
//
// Ce fichier tourne dans « l'atelier audio » du navigateur (AudioWorklet) :
// un petit atelier à part qui fabrique le son échantillon par échantillon,
// 48 000 fois par seconde, sans être dérangé par le reste de la page.
// Le même code sert en temps réel (on entend) et hors temps réel
// (export WAV, calculé d'un coup comme un four en mode accéléré).
//
// Mission 6 : un son de base par voix, en attendant les vrais algos
// (missions 10 à 17). Seuls TUNE, DECAY et LEVEL agissent.
//   voix 1 : sinus grave        voix 2 : sinus médium
//   voix 3 : sinus + bruit      voix 4 : bruit « digital » (TUNE = vitesse)
//
// Les réglages arrivent par des « paramètres audio » (AudioParam) : des
// boutons que la page peut tourner à une heure précise de l'horloge audio.
//   tune, decay, level : 0 à 10, comme les chiffres de la façade ;
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

// Passer de 0..10 à une plage qui grandit « en multipliant », comme les octaves
const expo = (v, a, b) => a * Math.pow(b / a, Math.min(10, Math.max(0, v)) / 10);

class VoixPerkons extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'tune',  defaultValue: 5, minValue: 0, maxValue: 10, automationRate: 'k-rate' },
      { name: 'decay', defaultValue: 5, minValue: 0, maxValue: 10, automationRate: 'k-rate' },
      { name: 'level', defaultValue: 5, minValue: 0, maxValue: 10, automationRate: 'k-rate' },
      { name: 'coup',  defaultValue: 0, automationRate: 'a-rate' },
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
    const lissage = 1 - Math.exp(-1 / (0.005 * sr));
    const pasMontee = 1 / (MONTEE * sr);
    if (this.gain < 0) this.gain = gainVise; // au démarrage : directement la bonne position
    const coups = p.coup;

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

      if (this.env === 0) { sortie[i] = 0; continue; }

      let s;
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
      sortie[i] = s * this.env * this.gain;
    }
    return true;
  }
}

registerProcessor('perkons-voix', VoixPerkons);
