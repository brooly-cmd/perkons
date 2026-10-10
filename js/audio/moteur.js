// =====================================================================
// moteur.js — LE MOTEUR AUDIO (missions 6 et 7)
//
// Il installe les 4 voix dans un « contexte audio » et les branche sur
// la sortie. Un contexte audio, c'est la table de mixage du navigateur.
// Il en existe deux sortes, et le moteur marche avec les deux :
//   - AudioContext        : en direct, vers les haut-parleurs ;
//   - OfflineAudioContext : hors temps réel, le son est calculé d'un coup
//                           dans la mémoire (pour l'export WAV).
//
// Toutes les actions prennent une heure sur l'horloge audio (« temps »,
// en secondes). Sans heure : tout de suite. C'est comme poster une lettre
// avec une date d'arrivée garantie, au lieu de compter sur un minuteur.
// =====================================================================

export const NOMS_VOIX = [1, 2, 3, 4];
// Contrôles de voix qui agissent déjà sur le son
export const POTARDS_BRANCHES = ['tune', 'decay', 'level', 'cutoff', 'drive']; // 0 à 10
export const INTERS_BRANCHES = ['vcf'];                                         // position 1, 2 ou 3

const VOLUME_SORTIE = 0.5; // marge pour que 4 voix ensemble ne saturent pas (MASTER : mission 28)

// contourner : pour les mesures seulement, ex. ['vcf', 'drive'] = son sans filtre ni overdrive
export async function creerMoteur(ctx, { contourner = [] } = {}) {
  await ctx.audioWorklet.addModule(new URL('./voix-processeur.js', import.meta.url));

  const sortie = ctx.createGain();
  sortie.gain.value = VOLUME_SORTIE;
  sortie.connect(ctx.destination);

  const voix = NOMS_VOIX.map((n) => {
    const noeud = new AudioWorkletNode(ctx, 'perkons-voix', {
      numberOfInputs: 0,
      outputChannelCount: [1],
      processorOptions: { voix: n, contourner },
    });
    noeud.connect(sortie);
    return { noeud, coups: 0 };
  });

  const maintenant = () => ctx.currentTime;
  const param = (n, nom) => voix[n - 1].noeud.parameters.get(nom);

  return {
    ctx,
    sortie, // le mélange des 4 voix (pour les mesures, et le voyant de signal plus tard)
    // Tourner un potard d'une voix (valeur 0 à 10) ou basculer son interrupteur VCF (1, 2, 3)
    regler(n, nom, valeur, temps = maintenant()) {
      param(n, nom).setValueAtTime(valeur, Math.max(temps, maintenant()));
    },
    // Frapper une voix à une heure précise
    jouer(n, temps = maintenant()) {
      const v = voix[n - 1];
      v.coups += 1;
      param(n, 'coup').setValueAtTime(v.coups, Math.max(temps, maintenant()));
    },
    // Option FILTER SWITCH SLEW (menu de configuration, rangée 2, pas 7 : mission 31).
    // actif = true (réglage d'usine, voyant éteint) : fondu sans clic au changement de filtre.
    antiClic(actif, temps = maintenant()) {
      for (const n of NOMS_VOIX) param(n, 'antiClic').setValueAtTime(actif ? 1 : 0, Math.max(temps, maintenant()));
    },
  };
}

// Hors temps réel : fabrique le son d'un coup et rend un AudioBuffer.
//   reglages : { 1: { tune, decay, level, cutoff, drive, vcf }, 2: {...}, ... }
//   coups    : [{ voix: 1, temps: 0 }, ...]
//   gestes   : [{ voix: 1, nom: 'vcf', valeur: 1, temps: 0.3 }, ...] (réglages changés en cours de route)
//   antiClic : FILTER SWITCH SLEW (true par défaut)
export async function rendreHorsTempsReel({ duree, reglages = {}, coups = [], gestes = [], antiClic = true, contourner = [], frequence = 48000 }) {
  const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: Math.ceil(duree * frequence), sampleRate: frequence });
  const moteur = await creerMoteur(ctx, { contourner });
  moteur.antiClic(antiClic, 0);
  for (const [n, r] of Object.entries(reglages)) {
    for (const [nom, valeur] of Object.entries(r)) moteur.regler(Number(n), nom, valeur, 0);
  }
  for (const g of gestes) moteur.regler(g.voix, g.nom, g.valeur, g.temps);
  for (const c of coups) moteur.jouer(c.voix, c.temps);
  return ctx.startRendering();
}
