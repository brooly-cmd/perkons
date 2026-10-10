// =====================================================================
// moteur.js — LE MOTEUR AUDIO (mission 6)
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
export const PARAMS_M6 = ['tune', 'decay', 'level']; // potards qui agissent à la mission 6

const VOLUME_SORTIE = 0.5; // marge pour que 4 voix ensemble ne saturent pas (MASTER : mission 28)

export async function creerMoteur(ctx) {
  await ctx.audioWorklet.addModule(new URL('./voix-processeur.js', import.meta.url));

  const sortie = ctx.createGain();
  sortie.gain.value = VOLUME_SORTIE;
  sortie.connect(ctx.destination);

  const voix = NOMS_VOIX.map((n) => {
    const noeud = new AudioWorkletNode(ctx, 'perkons-voix', {
      numberOfInputs: 0,
      outputChannelCount: [1],
      processorOptions: { voix: n },
    });
    noeud.connect(sortie);
    return { noeud, coups: 0 };
  });

  const maintenant = () => ctx.currentTime;
  const param = (n, nom) => voix[n - 1].noeud.parameters.get(nom);

  return {
    ctx,
    sortie, // le mélange des 4 voix (pour les mesures, et le voyant de signal plus tard)
    // Tourner un potard d'une voix (valeur 0 à 10)
    regler(n, nom, valeur, temps = maintenant()) {
      param(n, nom).setValueAtTime(valeur, Math.max(temps, maintenant()));
    },
    // Frapper une voix à une heure précise
    jouer(n, temps = maintenant()) {
      const v = voix[n - 1];
      v.coups += 1;
      param(n, 'coup').setValueAtTime(v.coups, Math.max(temps, maintenant()));
    },
  };
}

// Hors temps réel : fabrique le son d'un coup et rend un AudioBuffer.
//   reglages : { 1: { tune, decay, level }, 2: {...}, ... }
//   coups    : [{ voix: 1, temps: 0 }, ...]
export async function rendreHorsTempsReel({ duree, reglages = {}, coups = [], frequence = 48000 }) {
  const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: Math.ceil(duree * frequence), sampleRate: frequence });
  const moteur = await creerMoteur(ctx);
  for (const [n, r] of Object.entries(reglages)) {
    for (const [nom, valeur] of Object.entries(r)) moteur.regler(Number(n), nom, valeur, 0);
  }
  for (const c of coups) moteur.jouer(c.voix, c.temps);
  return ctx.startRendering();
}
