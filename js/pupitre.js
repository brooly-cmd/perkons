// =====================================================================
// pupitre.js — LA FAÇADE RÉAGIT À LA SOURIS (mission 4)
//
// facade.js dessine les pièces ; ici on les fait bouger :
//   - potard  : on le tourne en glissant la souris vers le haut / le bas,
//               ou avec la molette ;
//   - inter   : un clic au-dessus du levier le monte d'un cran,
//               un clic en dessous le descend d'un cran ;
//   - touche  : clic gauche = appui normal (enfoncée tant que le bouton
//               de la souris est tenu) ; clic droit = touche bloquée
//               enfoncée (cadre lumineux) jusqu'au prochain clic dessus ;
//               Échap relâche toutes les touches bloquées (CLAUDE.md, « Souris »).
//
// Le pupitre ne sait pas ce que « veut dire » une touche : il annonce
// seulement ce qui arrive, comme un standardiste qui passe les appels.
// Les missions suivantes s'abonnent avec pupitre.ecouter(...) et reçoivent :
//   { type: 'appui' | 'relache', id, tenues }
//   { type: 'tourne', id, valeur, tenues }
//   { type: 'bascule', id, position, tenues }
//   { type: 'alimentation', position: 'ON' | 'OFF' }
// « tenues » = les autres touches enfoncées à ce moment (bloquées ou tenues
// à la souris). Ainsi « SHIFT bloqué + potard tourné » arrive comme
// « maintenir SHIFT + tourner », exactement comme sur la vraie machine.
// =====================================================================

import { poserPotard, poserInter, poserAlim, repeindreVoyant } from './facade.js';

const PIXELS_PAR_TOUR = 200; // glisser de 200 pixels = aller de 0 à 10
const PAS_MOLETTE = 0.25;    // un cran de molette = un quart de graduation

const borne = (v, min, max) => Math.min(max, Math.max(min, v));
const arrondi = (v) => Math.round(v * 100) / 100;

export function brancherPupitre(svg) {
  const piece = (id) => svg.querySelector(`[data-id="${id}"]:not([data-type="voyant"])`);
  const led = (id) => svg.querySelector(`[data-type="voyant"][data-id="${id}"]`);
  const abonnes = [];
  const annoncer = (evt) => abonnes.forEach((fn) => fn(evt));

  // --- Touches ----------------------------------------------------------
  const enfoncees = new Map(); // id → 'souris' (clic gauche tenu) ou 'bloquee' (clic droit)
  let toucheSouris = null;     // la touche tenue par le bouton gauche

  const tenuesSauf = (id) => [...enfoncees.keys()].filter((k) => k !== id);

  function appuyer(id, facon) {
    enfoncees.set(id, facon);
    const g = piece(id);
    g.classList.add('enfoncee');
    g.classList.toggle('tenue', facon === 'bloquee');
    annoncer({ type: 'appui', id, tenues: tenuesSauf(id) });
  }
  function relacher(id) {
    if (!enfoncees.has(id)) return;
    enfoncees.delete(id);
    piece(id).classList.remove('enfoncee', 'tenue');
    annoncer({ type: 'relache', id, tenues: tenuesSauf(id) });
  }
  function relacherTout() {
    for (const [id, facon] of [...enfoncees]) if (facon === 'bloquee') relacher(id);
  }

  // --- Potards ----------------------------------------------------------
  function tourner(id, valeur) {
    const g = piece(id);
    const v = arrondi(borne(valeur, 0, 10));
    if (v === Number(g.dataset.valeur)) return;
    poserPotard(g, v);
    annoncer({ type: 'tourne', id, valeur: v, tenues: tenuesSauf(id) });
  }
  let glisse = null; // potard en train d'être tourné : { id, y0, v0 }

  // --- Interrupteurs ----------------------------------------------------
  function basculer(id, position) {
    const g = piece(id);
    if (id === 'power') {
      if (position === g.dataset.position) return;
      poserAlim(g, position);
      svg.querySelectorAll('[data-type="voyant"]').forEach(repeindreVoyant);
      annoncer({ type: 'alimentation', position });
      return;
    }
    const p = borne(position, 1, Number(g.dataset.crans));
    if (p === Number(g.dataset.position)) return;
    poserInter(g, p);
    annoncer({ type: 'bascule', id, position: p, tenues: tenuesSauf(id) });
  }
  // Clic au-dessus du centre de l'écrou = un cran vers le haut ; en dessous = vers le bas
  function cranVise(g, e) {
    const r = g.firstElementChild.getBoundingClientRect();
    return e.clientY < r.top + r.height / 2 ? -1 : 1;
  }

  // --- La souris --------------------------------------------------------
  const cible = (e) => e.target.closest('[data-type="potard"], [data-type="inter"], [data-type="touche"], [data-type="touche-voix"]');

  svg.addEventListener('pointerdown', (e) => {
    const g = cible(e);
    if (!g) return;
    e.preventDefault();
    const { id, type } = g.dataset;
    const droit = e.button === 2;
    if (e.button !== 0 && !droit) return;
    // « capturer » la souris : on reçoit le relâchement même s'il a lieu hors de la fenêtre
    if (!droit) try { svg.setPointerCapture(e.pointerId); } catch { /* clic simulé par une vérif */ }

    if (type === 'touche' || type === 'touche-voix') {
      if (enfoncees.get(id) === 'bloquee') { relacher(id); return; } // nouveau clic = relâchée
      if (enfoncees.has(id)) return;
      if (droit) { appuyer(id, 'bloquee'); return; }
      appuyer(id, 'souris');
      toucheSouris = id;
    } else if (droit) {
      return; // clic droit sur un potard ou un interrupteur : rien (comme une deuxième main posée à côté)
    } else if (type === 'potard') {
      glisse = { id, y0: e.clientY, v0: Number(g.dataset.valeur) };
    } else if (id === 'power') {
      basculer(id, g.dataset.position === 'ON' ? 'OFF' : 'ON');
    } else {
      basculer(id, Number(g.dataset.position) + cranVise(g, e));
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!glisse) return;
    tourner(glisse.id, glisse.v0 + ((glisse.y0 - e.clientY) / PIXELS_PAR_TOUR) * 10);
  });

  window.addEventListener('pointerup', (e) => {
    if (e.button !== 0) return;
    glisse = null;
    if (toucheSouris) { const id = toucheSouris; toucheSouris = null; relacher(id); }
  });
  // si la fenêtre perd la souris (Alt+Tab…), on lâche comme si le bouton remontait
  window.addEventListener('blur', () => {
    glisse = null;
    if (toucheSouris) { const id = toucheSouris; toucheSouris = null; relacher(id); }
  });

  svg.addEventListener('wheel', (e) => {
    const g = cible(e);
    if (!g) return;
    e.preventDefault();
    const sens = e.deltaY < 0 ? 1 : -1; // molette vers l'avant = tourner à droite / monter
    if (g.dataset.type === 'potard') tourner(g.dataset.id, Number(g.dataset.valeur) + sens * PAS_MOLETTE);
    else if (g.dataset.type === 'inter' && g.dataset.id !== 'power') basculer(g.dataset.id, Number(g.dataset.position) - sens);
  }, { passive: false });

  // Pas de menu du navigateur au clic droit sur la façade
  svg.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') relacherTout();
  });

  // --- Ce que les autres missions pourront utiliser ---------------------
  return {
    ecouter(fn) { abonnes.push(fn); return () => abonnes.splice(abonnes.indexOf(fn), 1); },
    valeur: (id) => Number(piece(id).dataset.valeur),
    position: (id) => (id === 'power' ? piece(id).dataset.position : Number(piece(id).dataset.position)),
    tourner, basculer, appuyer: (id) => appuyer(id, 'bloquee'), relacher, relacherTout,
    tenues: () => [...enfoncees.keys()],
    estEnfoncee: (id) => enfoncees.has(id),
    allumee: () => svg.dataset.alim === 'ON',
    // Allumer un voyant : niveau 0 = éteint, 1 = faible, 2 = fort
    voyant(id, niveau) {
      const g = led(id);
      if (niveau === undefined) return Number(g.dataset.etat);
      g.dataset.etat = niveau;
      repeindreVoyant(g);
    },
  };
}
