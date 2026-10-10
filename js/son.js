// =====================================================================
// son.js — LA FAÇADE BRANCHÉE SUR LE MOTEUR AUDIO (mission 6)
//
// - ON/OFF : allume ou éteint le son. Le navigateur n'accepte de faire du
//   son qu'après un geste de l'utilisateur ; le premier vrai clic n'importe
//   où sur la page allume donc la machine (décision 6 de l'inventaire).
// - Touche de voix appuyée seule : joue la voix (les combinaisons avec
//   SHIFT, REC, CLEAR, pas… arriveront avec leurs missions).
// - TUNE, DECAY, LEVEL de chaque voix : changent le son, même pendant
//   qu'il sonne.
// =====================================================================

import { creerMoteur, NOMS_VOIX, PARAMS_M6 } from './audio/moteur.js';

export function brancherSon(pupitre) {
  let ctx = null;
  let moteur = null;
  let pret = null; // la promesse « moteur installé »

  function allumer() {
    if (!ctx) {
      ctx = new AudioContext({ latencyHint: 'interactive' });
      pret = creerMoteur(ctx).then((m) => {
        moteur = m;
        // le moteur prend la position actuelle de chaque potard
        for (const n of NOMS_VOIX) for (const nom of PARAMS_M6) m.regler(n, nom, pupitre.valeur(`v${n}-${nom}`));
        return m;
      });
    }
    ctx.resume();
    return pret;
  }
  function eteindre() {
    if (ctx) ctx.suspend();
  }

  // Premier vrai clic sur la page = la machine s'allume (sauf sur ON/OFF lui-même,
  // qui s'en charge). « capture » : on passe avant la façade, pour que la touche
  // cliquée joue déjà.
  window.addEventListener('pointerdown', function premierClic(e) {
    if (!e.isTrusted) return; // les clics simulés des pages de vérif ne comptent pas
    window.removeEventListener('pointerdown', premierClic, true);
    if (!e.target.closest?.('[data-id="power"]') && !pupitre.allumee()) pupitre.basculer('power', 'ON');
  }, true);

  pupitre.ecouter((e) => {
    if (e.type === 'alimentation') {
      if (e.position === 'ON') allumer(); else eteindre();
      return;
    }
    if (!pupitre.allumee()) return;

    if (e.type === 'appui' && e.id.startsWith('voix-') && e.tenues.length === 0) {
      const n = Number(e.id.slice(5));
      if (moteur) moteur.jouer(n);
      else pret?.then((m) => m.jouer(n)); // tout premier clic : le moteur finit de s'installer
      return;
    }

    if (e.type === 'tourne' && moteur) {
      const [, n, nom] = e.id.match(/^v(\d)-(\w+)$/) || [];
      if (n && PARAMS_M6.includes(nom)) moteur.regler(Number(n), nom, e.valeur);
    }
  });

  return {
    moteur: () => moteur,
    allumer,
  };
}
