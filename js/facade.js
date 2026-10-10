// =====================================================================
// facade.js — LE « ROBOT DESSINATEUR » (missions 3 et 4)
//
// Il lit le plan (facade-plan.js) et pose chaque pièce sur la façade.
// Le dessin est en SVG : un format d'image fait de formes (cercles,
// rectangles, textes) plutôt que de pixels. Comme un dessin vectoriel,
// il reste net quelle que soit la taille de l'écran.
//
// Chaque pièce reçoit deux étiquettes invisibles :
//   data-id   = son nom unique (ex. "v1-tune")
//   data-type = sa sorte (potard, inter, touche, voyant, touche-voix)
//
// Mission 4 : ce fichier sait aussi « repeindre » une pièce (poserPotard,
// poserInter, poserAlim, repeindreVoyant). Ce sont les pinceaux ; la main
// qui les tient (la souris) est dans pupitre.js.
// =====================================================================

import * as P from './facade-plan.js';

const NS = 'http://www.w3.org/2000/svg';
const HAUT_SUP = 34; // place au-dessus de la façade pour l'interrupteur ON/OFF

// Petite fonction pour créer une forme SVG avec ses réglages
function el(nom, attrs = {}, parent) {
  const n = document.createElementNS(NS, nom);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}
function texte(parent, x, y, contenu, cls = 'serig', extra = {}) {
  const { fill, 'text-anchor': ancre, 'font-size': taille, ...reste } = extra;
  // couleur, alignement et taille imposés passent par « style » pour l'emporter sur la feuille CSS
  const style = [fill && `fill:${fill}`, ancre && `text-anchor:${ancre}`, taille && `font-size:${taille}px`].filter(Boolean).join(';');
  const t = el('text', { x, y, class: cls, ...reste, ...(style ? { style } : {}) }, parent);
  t.textContent = contenu;
  return t;
}
const rad = (deg) => (deg * Math.PI) / 180;
// Point à une distance r et un angle (0° = midi, sens des aiguilles d'une montre)
const polaire = (r, deg) => [r * Math.sin(rad(deg)), -r * Math.cos(rad(deg))];

// ---------------------------------------------------------------------
// 1. La « boîte de peinture » : dégradés et effets réutilisés partout
// ---------------------------------------------------------------------
function definitions(svg) {
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <radialGradient id="g-jupe" cx="42%" cy="35%" r="70%">
      <stop offset="0" stop-color="#3c3c3c"/><stop offset=".6" stop-color="#191919"/><stop offset="1" stop-color="#050505"/>
    </radialGradient>
    <radialGradient id="g-chapeau" cx="62%" cy="28%" r="80%">
      <stop offset="0" stop-color="#555"/><stop offset=".35" stop-color="#262626"/><stop offset="1" stop-color="#0a0a0a"/>
    </radialGradient>
    <radialGradient id="g-dessus" cx="60%" cy="30%" r="75%">
      <stop offset="0" stop-color="#3a3a3a"/><stop offset="1" stop-color="#121212"/>
    </radialGradient>
    <radialGradient id="g-reflet" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g-led-off" cx="40%" cy="35%" r="65%">
      <stop offset="0" stop-color="#9a1e14"/><stop offset=".55" stop-color="#4a0806"/><stop offset="1" stop-color="#1c0202"/>
    </radialGradient>
    <radialGradient id="g-led-faible" cx="40%" cy="35%" r="65%">
      <stop offset="0" stop-color="#ff8a6a"/><stop offset=".5" stop-color="#c22314"/><stop offset="1" stop-color="#5a0805"/>
    </radialGradient>
    <radialGradient id="g-led-on" cx="45%" cy="40%" r="60%">
      <stop offset="0" stop-color="#fff6dc"/><stop offset=".35" stop-color="#ff9a6c"/><stop offset=".8" stop-color="#ff3a1c"/><stop offset="1" stop-color="#b3150a"/>
    </radialGradient>
    <radialGradient id="g-halo" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ff5a2a" stop-opacity=".55"/><stop offset="1" stop-color="#ff3a1c" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="g-clair-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d4d4d2"/><stop offset="1" stop-color="#a9a9a7"/>
    </linearGradient>
    <linearGradient id="g-clair-levre" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8c8c8a"/><stop offset="1" stop-color="#6c6c6a"/>
    </linearGradient>
    <linearGradient id="g-fonce-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3e3e3e"/><stop offset="1" stop-color="#2a2a2a"/>
    </linearGradient>
    <linearGradient id="g-fonce-levre" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1e1e1e"/><stop offset="1" stop-color="#121212"/>
    </linearGradient>
    <linearGradient id="g-voix" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2c2c2c"/><stop offset=".25" stop-color="#1a1a1a"/><stop offset="1" stop-color="#0c0c0c"/>
    </linearGradient>
    <radialGradient id="g-ecrou" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#f2f2f2"/><stop offset=".5" stop-color="#9a9a9a"/><stop offset="1" stop-color="#4a4a4a"/>
    </radialGradient>
    <radialGradient id="g-levier" cx="35%" cy="30%" r="75%">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#bdbdbd"/><stop offset="1" stop-color="#555"/>
    </radialGradient>
    <linearGradient id="g-bois-g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0c0c0c"/><stop offset=".35" stop-color="#232323"/><stop offset=".8" stop-color="#1a1a1a"/><stop offset="1" stop-color="#080808"/>
    </linearGradient>
    <linearGradient id="g-bois-d" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#0c0c0c"/><stop offset=".35" stop-color="#232323"/><stop offset=".8" stop-color="#1a1a1a"/><stop offset="1" stop-color="#080808"/>
    </linearGradient>
    <linearGradient id="g-plaque" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#161616"/><stop offset="1" stop-color="#0f0f0f"/>
    </linearGradient>
    <linearGradient id="g-chant-bas" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3a3a"/><stop offset=".4" stop-color="#8a8a8a"/><stop offset="1" stop-color="#2a2a2a"/>
    </linearGradient>
    <linearGradient id="g-prise" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0a0a0a"/><stop offset=".45" stop-color="#3a3a3a"/><stop offset="1" stop-color="#0a0a0a"/>
    </linearGradient>
    <filter id="f-ombre" x="-40%" y="-40%" width="180%" height="190%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2.2"/>
      <feOffset dx="0.8" dy="2.2" result="o"/>
      <feComponentTransfer><feFuncA type="linear" slope=".85"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="f-lueur" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.4" result="flou"/>
      <feMerge><feMergeNode in="flou"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="f-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/>
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .05 0"/>
    </filter>
    <filter id="f-veines" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9 .015" numOctaves="2" seed="8"/>
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0"/>
    </filter>`;
}

// ---------------------------------------------------------------------
// 2. Les pièces types (dessinées une fois, réutilisées partout)
// ---------------------------------------------------------------------

// Un voyant (LED) : etat 0 = éteint, 1 = faible, 2 = fort.
// data-etat garde l'état voulu ; on ne le montre que si la machine est sur ON
// (machine éteinte = tous les voyants noirs, comme la vraie).
function voyant(parent, x, y, r, etat, id, forme = 'rond') {
  const g = el('g', { 'data-type': 'voyant', 'data-id': id, 'data-etat': etat, 'data-x': x, 'data-y': y, 'data-r': r, 'data-forme': forme }, parent);
  repeindreVoyant(g);
  return g;
}

export function repeindreVoyant(g) {
  const svg = g.ownerSVGElement;
  const allumee = !svg || svg.dataset.alim === 'ON';
  const etat = allumee ? Number(g.dataset.etat) : 0;
  const x = Number(g.dataset.x), y = Number(g.dataset.y), r = Number(g.dataset.r);
  g.replaceChildren();
  g.dataset.affiche = etat; // ce que l'œil voit vraiment (sert aux vérifs)
  if (g.dataset.forme === 'barre') {
    // fenêtre du voyant d'une touche de voix : petite barre verticale
    if (etat === 2) el('rect', { x: x - 6, y: y - 3.5, width: 12, height: 16, rx: 6, fill: 'url(#g-halo)' }, g);
    el('rect', { x: x - 1.6, y, width: 3.2, height: 9, rx: 1.4, fill: ['#d9d4cc', '#e2604a', '#ff4a26'][etat], opacity: etat ? 1 : 0.85 }, g);
    if (etat) el('rect', { x: x - 0.7, y: y + 1, width: 1.4, height: 4, rx: 0.7, fill: '#fff3e0', opacity: etat === 2 ? 0.9 : 0.5 }, g);
    return;
  }
  if (etat === 2) el('circle', { cx: x, cy: y, r: r * 3.2, fill: 'url(#g-halo)' }, g);
  el('circle', { cx: x, cy: y + 0.4, r: r + 0.9, fill: '#050505' }, g);
  el('circle', { cx: x, cy: y, r, fill: ['url(#g-led-off)', 'url(#g-led-faible)', 'url(#g-led-on)'][etat] }, g);
  el('ellipse', { cx: x - r * 0.3, cy: y - r * 0.38, rx: r * 0.38, ry: r * 0.24, fill: '#fff', opacity: etat ? 0.7 : 0.35 }, g);
}

// Le contour cannelé du chapeau d'un potard (7 bosses, comme sur la photo)
function formeCannelee(r, bosses = 7) {
  const pts = [];
  const n = bosses * 12;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * 360;
    const rr = r * (0.9 + 0.1 * Math.pow(Math.abs(Math.cos(rad(a * bosses / 2))), 0.6));
    const [px, py] = polaire(rr, a);
    pts.push(`${i ? 'L' : 'M'}${px.toFixed(2)},${py.toFixed(2)}`);
  }
  return pts.join('') + 'Z';
}

// Les formes d'onde du potard WAVE (petits dessins de 7 × 5 unités)
const FORMES_ONDE = {
  sinus:     'M-3.5,0 C-2.6,-3 -0.9,-3 0,0 S2.6,3 3.5,0',
  rampe:     'M-3.5,2 L2.5,-2.5 L2.5,2',
  triangle:  'M-3.5,2 L0,-2.5 L3.5,2',
  carre:     'M-3.5,2 L-3.5,-2.5 L1.5,-2.5 L1.5,2 L3.5,2',
  double:    'M-3.5,-2.5 Q-2.5,1.5 -0.2,2 L-0.2,-2.5 Q0.8,1.5 3.5,2',
  scie:      'M-3.5,-2.5 L2.5,2 L2.5,-2.5',
  hasard:    'M-3.5,1 L-2,1 L-2,-2.5 L-0.5,-2.5 L-0.5,2 L1,2 L1,-1 L2.5,-1 L2.5,0.5 L3.5,0.5',
};
const ORDRE_FORMES = ['sinus', 'rampe', 'triangle', 'carre', 'double', 'scie', 'hasard'];

// Un potard complet : graduations + jupe + chapeau + trait blanc
const TAILLES = {
  petit: { R: 14.5, rNum: 22.5, pas: 31, fNum: 5.2, ticks: 'longs' },
  moyen: { R: 20.5, rNum: 27.5, pas: 31, fNum: 5.6, ticks: 'courts' },
  grand: { R: 24.5, rNum: 36, pas: 31, fNum: 9, ticks: 'courts', dy: -3 },
};
// Angle du trait blanc pour une valeur 0 à 10 :
// potards chiffrés de -155° (0) à +155° (10) ; WAVE de -135° à +135°.
function angleDuPotard(taille, formes, valeur) {
  return formes ? -135 + (valeur / 10) * 270 : (valeur - 5) * TAILLES[taille].pas;
}

// Tourne un potard déjà dessiné jusqu'à une valeur (0 à 10)
export function poserPotard(g, valeur) {
  g.dataset.valeur = valeur;
  const angle = angleDuPotard(g.dataset.taille, g.dataset.formes === 'oui', valeur);
  g.querySelector('.tournant').setAttribute('transform', `rotate(${angle.toFixed(1)})`);
}

function potard(parent, p) {
  const T = TAILLES[p.taille];
  const g = el('g', { 'data-type': 'potard', 'data-id': p.id, 'data-valeur': p.valeur, 'data-taille': p.taille, 'data-formes': p.formes ? 'oui' : 'non', transform: `translate(${p.x},${p.y})` }, parent);

  // a) Les graduations imprimées autour
  const echelle = el('g', { class: 'echelle', transform: `translate(0,${T.dy || 0})` }, g);
  if (p.formes) {
    // WAVE : 7 symboles de formes d'onde, de bas-gauche à bas-droite
    ORDRE_FORMES.forEach((f, i) => {
      const a = -135 + i * 45;
      const [sx, sy] = polaire(T.rNum + 2, a);
      const [t1x, t1y] = polaire(T.R + 1.5, a);
      const [t2x, t2y] = polaire(T.R + 4.5, a);
      el('line', { x1: t1x, y1: t1y, x2: t2x, y2: t2y, class: 'tick' }, echelle);
      el('path', { d: FORMES_ONDE[f], transform: `translate(${sx},${sy}) scale(.85)`, class: 'onde', 'data-forme': f }, echelle);
    });
  } else {
    for (let n = 1; n <= 9; n++) {
      const a = (n - 5) * T.pas;
      const [nx, ny] = polaire(T.rNum, a);
      const [t1x, t1y] = polaire(T.R + 1.5, a);
      const [t2x, t2y] = polaire(T.ticks === 'longs' ? T.rNum - 3.5 : T.R + 3.6, a);
      el('line', { x1: t1x, y1: t1y, x2: t2x, y2: t2y, class: 'tick' }, echelle);
      texte(echelle, nx, ny + T.fNum * 0.36, String(n), 'num', { 'font-size': T.fNum });
    }
    // « 0 » et « 10 » sous le potard, reliés par un petit arc
    const yb = T.R + T.fNum * 1.25;
    const xb = T.R * 0.62;
    el('path', { d: `M${-xb + 3},${yb - T.fNum * 0.75} Q0,${yb - T.fNum * 0.15} ${xb - 3},${yb - T.fNum * 0.75}`, class: 'arc' }, echelle);
    const t0 = texte(echelle, -xb, yb, '0', 'num', { 'font-size': T.fNum });
    const t10 = texte(echelle, xb + 1, yb, '10', 'num', { 'font-size': T.fNum });
    if (p.gauche) {
      texte(echelle, -xb - 5, yb, p.gauche, 'num petit', { 'text-anchor': 'end', 'font-size': T.fNum * 0.62 });
      texte(echelle, xb + 8, yb, p.droite, 'num petit', { 'text-anchor': 'start', 'font-size': T.fNum * 0.62 });
      t0.setAttribute('x', -xb + 1); t10.setAttribute('x', xb - 1);
    }
  }
  // b) Le bouton lui-même, avec son ombre portée
  const corps = el('g', { filter: 'url(#f-ombre)' }, g);
  el('circle', { r: T.R, fill: 'url(#g-jupe)', stroke: '#000', 'stroke-width': 0.6 }, corps);
  // Ce groupe tourne avec la valeur (cannelures + trait)
  const angle = angleDuPotard(p.taille, p.formes, p.valeur);
  const tournant = el('g', { class: 'tournant', transform: `rotate(${angle.toFixed(1)})` }, corps);
  el('path', { d: formeCannelee(T.R * 0.86), fill: 'url(#g-chapeau)', stroke: '#000', 'stroke-width': 0.5 }, tournant);
  el('circle', { r: T.R * 0.5, fill: 'url(#g-dessus)', stroke: '#2b2b2b', 'stroke-width': 0.5 }, tournant);
  el('line', { x1: 0, y1: -T.R * 0.32, x2: 0, y2: -T.R * 0.92, class: 'trait', 'stroke-width': Math.max(1.3, T.R * 0.11) }, tournant);
  // Reflet de lumière (fixe : la lampe ne tourne pas avec le bouton)
  el('ellipse', { cx: T.R * 0.22, cy: -T.R * 0.5, rx: T.R * 0.5, ry: T.R * 0.22, fill: 'url(#g-reflet)', transform: `rotate(22 ${T.R * 0.22} ${-T.R * 0.5})` }, corps);

  // c) Le nom imprimé dessous
  if (p.texte) {
    const yNom = p.taille === 'petit' ? T.R + 11.5 : T.R + 16.5;
    texte(g, 0, yNom, p.texte, 'nom');
  }
  return g;
}

// Bascule le levier d'un interrupteur déjà dessiné.
// 3 crans : 1 = haut, 2 = milieu, 3 = bas. 2 crans : 1 = haut, 2 = bas.
export function poserInter(g, position) {
  g.dataset.position = position;
  const crans = Number(g.dataset.crans);
  const decal = crans === 3 ? { 1: -4.5, 2: 0, 3: 4.5 }[position] : (position === 1 ? -4.5 : 4.5);
  const lev = g.querySelector('.levier');
  lev.replaceChildren();
  if (decal !== 0) el('rect', { x: -1.6, y: Math.min(0, decal), width: 3.2, height: Math.abs(decal), fill: '#9a9a9a' }, lev);
  el('ellipse', { cx: 0, cy: decal, rx: 3, ry: decal === 0 ? 3 : 3.6, fill: 'url(#g-levier)', stroke: '#555', 'stroke-width': 0.4 }, lev);
}

// Bascule l'interrupteur ON/OFF (côté enfoncé = côté choisi)
export function poserAlim(g, position) {
  g.dataset.position = position;
  const [gauche, droite] = g.querySelectorAll('.bascule');
  gauche.setAttribute('fill', position === 'OFF' ? '#121212' : '#3a3a3a');
  droite.setAttribute('fill', position === 'ON' ? '#121212' : '#3a3a3a');
  g.ownerSVGElement.dataset.alim = position;
}

// Un interrupteur à levier vu de dessus : écrou hexagonal + tête du levier
function inter(parent, i) {
  const g = el('g', { 'data-type': 'inter', 'data-id': i.id, 'data-position': i.position, 'data-crans': i.crans, transform: `translate(${i.x},${i.y})` }, parent);
  // écrou hexagonal
  const hex = [];
  for (let k = 0; k < 6; k++) { const [hx, hy] = polaire(6.2, 30 + k * 60); hex.push(`${hx},${hy}`); }
  el('polygon', { points: hex.join(' '), fill: 'url(#g-ecrou)', stroke: '#222', 'stroke-width': 0.5 }, g);
  el('circle', { r: 4, fill: '#2a2a2a', stroke: '#888', 'stroke-width': 0.5 }, g);
  el('g', { class: 'levier', filter: 'url(#f-ombre)' }, g);
  poserInter(g, i.position);

  // les inscriptions autour
  const lettres = el('g', { class: 'legendes' }, parent);
  const gros = (s) => (s.length > 2 ? 'mini' : 'num');
  texte(lettres, i.x, i.y - 10.5, i.haut, gros(i.haut));
  if (i.gauche) texte(lettres, i.x - 11, i.y + 2, i.gauche, 'num', { 'text-anchor': 'middle' });
  texte(lettres, i.x, i.y + 15, i.bas, gros(i.bas));
  texte(lettres, i.x + 1, i.y + 21.5, i.nom, 'mini');
  return g;
}

// Une touche carrée (grise ou foncée) avec éventuellement un voyant
function touche(parent, t, couleur = 'clair', yVoyant) {
  const { x, y, l } = t;
  const h = t.h || 33;
  const g = el('g', { 'data-type': 'touche', 'data-id': t.id }, parent);
  // trou dans la façade
  el('rect', { x: x - l / 2 - 1.5, y: y - 1.2, width: l + 3, height: h + 3, rx: 2, fill: '#030303' }, g);
  const corps = el('g', { class: 'corps', filter: 'url(#f-ombre)' }, g);
  el('rect', { x: x - l / 2, y, width: l, height: h, rx: 1.6, fill: `url(#g-${couleur}-levre)` }, corps);
  // face du dessus (les 2/3 du haut) puis la lèvre inclinée en bas
  const hf = h * 0.6;
  el('path', { d: `M${x - l / 2},${y + 1.6} q0,-1.6 1.6,-1.6 h${l - 3.2} q1.6,0 1.6,1.6 v${hf - 1.6} l-2.2,3 h${-(l - 4.4)} z`, fill: `url(#g-${couleur}-face)` }, corps);
  el('line', { x1: x - l / 2 + 2.2, y1: y + hf + 3, x2: x + l / 2 - 2.2, y2: y + hf + 3, stroke: couleur === 'clair' ? '#5e5e5c' : '#0a0a0a', 'stroke-width': 0.6 }, corps);
  el('rect', { class: 'ombre-appui', x: x - l / 2, y, width: l, height: h, rx: 1.6 }, corps);
  if (t.voyant !== false && yVoyant !== undefined) {
    voyant(g, x, yVoyant, 3, t.etat || 0, `${t.id}-led`);
  }
  cadreTenu(g, x - l / 2, y, l, h, 1.6);
  return g;
}

// Le cadre lumineux d'une touche bloquée par un clic droit (caché au départ)
function cadreTenu(g, x, y, l, h, rx) {
  el('rect', { class: 'cadre-tenu', x: x - 2.6, y: y - 2.4, width: l + 5.2, height: h + 5.2, rx: rx + 2, filter: 'url(#f-lueur)' }, g);
}

// Une grosse touche de voix noire, avec sa fenêtre de voyant en haut
function toucheVoix(parent, t) {
  const g = el('g', { 'data-type': 'touche-voix', 'data-id': t.id }, parent);
  const x0 = t.x - t.l / 2;
  el('rect', { x: x0 - 1.5, y: t.y - 1.5, width: t.l + 3, height: t.h + 3, rx: 3, fill: '#020202' }, g);
  const corps = el('g', { class: 'corps', filter: 'url(#f-ombre)' }, g);
  el('rect', { x: x0, y: t.y, width: t.l, height: t.h, rx: 3.5, fill: 'url(#g-voix)', stroke: '#2e2e2e', 'stroke-width': 0.6 }, corps);
  el('path', { d: `M${x0 + 3},${t.y + 9} q${t.l / 2 - 3},-5 ${t.l - 6},0`, stroke: '#3a3a3a', 'stroke-width': 0.8, fill: 'none' }, corps);
  el('rect', { class: 'ombre-appui', x: x0, y: t.y, width: t.l, height: t.h, rx: 3.5 }, corps);
  // fenêtre du voyant : petite barre verticale claire (éteinte sur la photo)
  voyant(g, t.x, t.y + 2.5, 1.6, t.etat, `${t.id}-led`, 'barre');
  cadreTenu(g, x0, t.y, t.l, t.h, 3.5);
  // étiquettes au-dessus : x2 · 1/2 · 2/3 · 10% (cases foncées et claires en alternance)
  const lc = 13.5;
  t.etiquettes.forEach((s, i) => {
    const cx = 666 + lc * i;
    const fonce = i % 2 === 0;
    el('rect', { x: cx + 0.3, y: t.yEtiquette - 3.6, width: lc - 0.6, height: 7.2, fill: fonce ? '#141414' : '#cfcfcf', stroke: '#cfcfcf', 'stroke-width': 0.6 }, parent);
    texte(parent, cx + lc / 2, t.yEtiquette + 2, s, 'mini', { fill: fonce ? '#e6e6e6' : '#6a6a6a' });
  });
  return g;
}

// Un bandeau clair avec texte foncé (VOICE 1, DIVIDE, TEMPO…)
function bandeau(parent, x1, x2, y, contenu, h = 7.6) {
  el('rect', { x: x1, y: y - h / 2, width: x2 - x1, height: h, fill: '#d2d2d2' }, parent);
  texte(parent, (x1 + x2) / 2, y + 2.3, contenu, 'bandeau');
}

// ---------------------------------------------------------------------
// 3. On assemble la façade
// ---------------------------------------------------------------------
export function dessinerFacade(conteneur) {
  const svg = el('svg', {
    viewBox: `0 ${-HAUT_SUP} ${P.LARGEUR} ${P.HAUTEUR + HAUT_SUP - 14}`,
    preserveAspectRatio: 'xMidYMid meet',
    class: 'facade',
    role: 'img',
    'aria-label': 'Façade de la boîte à rythmes HD-01',
    'data-alim': P.ALIMENTATION.position,
  });
  definitions(svg);

  // --- La caisse : prises à l'arrière (décor), joues latérales, plaque ---
  const caisse = el('g', { id: 'caisse' }, svg);
  for (const px of P.PRISES_DECOR) {
    el('rect', { x: px - 11, y: 6, width: 22, height: 10, rx: 2, fill: 'url(#g-prise)' }, caisse);
    el('ellipse', { cx: px, cy: 7, rx: 10, ry: 2.6, fill: '#2a2a2a' }, caisse);
  }
  el('rect', { x: 2, y: 15, width: 880, height: 618, rx: 6, fill: '#070707' }, caisse); // dessus du capot
  el('rect', { x: 24, y: 20, width: 860, height: 612, fill: 'url(#g-plaque)' }, caisse);
  el('rect', { x: 24, y: 20, width: 860, height: 612, filter: 'url(#f-grain)' }, caisse);
  el('rect', { x: 24, y: 20, width: 860, height: 3, fill: '#2a2a2a' }, caisse);
  el('rect', { x: 26, y: 626, width: 856, height: 8, fill: 'url(#g-chant-bas)' }, caisse);
  // joues (côtés) façon bois noir
  el('rect', { x: 0, y: 14, width: 27, height: 627, rx: 4, fill: 'url(#g-bois-g)' }, caisse);
  el('rect', { x: 0, y: 14, width: 27, height: 627, rx: 4, filter: 'url(#f-veines)' }, caisse);
  el('rect', { x: 881, y: 14, width: 29, height: 627, rx: 4, fill: 'url(#g-bois-d)' }, caisse);
  el('rect', { x: 881, y: 14, width: 29, height: 627, rx: 4, filter: 'url(#f-veines)' }, caisse);

  // --- Interrupteur ON/OFF (au-dessus, coin haut droit) ---
  const a = P.ALIMENTATION;
  const alim = el('g', { 'data-type': 'inter', 'data-id': a.id, 'data-position': a.position, 'data-crans': 2, transform: `translate(${a.x},${-18})` }, svg);
  el('rect', { x: -22, y: -11, width: 44, height: 22, rx: 3, fill: '#0b0b0b', stroke: '#333', 'stroke-width': 0.8 }, alim);
  el('rect', { x: -9, y: -7, width: 18, height: 14, rx: 2, fill: '#1c1c1c', stroke: '#000' }, alim);
  // bascule : côté OFF enfoncé à gauche
  el('rect', { class: 'bascule', x: -8, y: -6, width: 8, height: 12, rx: 1.5 }, alim);
  el('rect', { class: 'bascule', x: 0, y: -6, width: 8, height: 12, rx: 1.5 }, alim);
  poserAlim(alim, a.position);
  texte(alim, -15.5, 2, 'OFF', 'mini', { fill: '#bdbdbd' });
  texte(alim, 15.5, 2, 'ON', 'mini', { fill: '#bdbdbd' });
  texte(alim, 0, 17.5, 'POWER', 'mini', { fill: '#8a8a8a' });

  const serig = el('g', { id: 'serigraphie' }, svg);

  // --- Zone 1 : les 4 voix ---
  const zoneVoix = el('g', { id: 'zone-voix' }, svg);
  for (const v of P.VOIX) {
    const c = v.cadre;
    el('rect', { x: c.x1, y: c.y1, width: c.x2 - c.x1, height: c.y2 - c.y1, class: 'cadre' }, serig);
    bandeau(serig, (c.x1 + c.x2) / 2 - 34, (c.x1 + c.x2) / 2 + 34, c.y1 - 0.5, v.titre);
    const g = el('g', { 'data-voix': v.numero }, zoneVoix);
    voyant(g, v.voyant.x, v.voyant.y, 3.2, v.voyant.etat, v.voyant.id);
    v.potards.forEach((p) => potard(g, p));
    v.inters.forEach((i) => inter(g, i));
  }

  // --- Zone 2 : BBD + MASTER ---
  const zoneMaster = el('g', { id: 'zone-bbd-master' }, svg);
  // un seul cadre pour BBD + MASTER, coupé en deux par une ligne verticale
  // qui s'interrompt autour des 2 interrupteurs (comme sur la photo)
  const cb = P.BBD.cadre, cm = P.MASTER.cadre;
  el('rect', { x: cb.x1, y: cb.y1, width: cm.x2 - cb.x1, height: cb.y2 - cb.y1, class: 'cadre' }, serig);
  for (const [y1, y2] of [[cb.y1, 104], [146, 177], [241, cb.y2]]) {
    el('line', { x1: cb.x2, y1, x2: cb.x2, y2, class: 'cadre' }, serig);
  }
  bandeau(serig, cb.x1 + 6, cb.x2 - 4, cb.y1 - 0.5, 'BBD');
  bandeau(serig, cm.x1 + 4, cm.x2 - 3, cm.y1 - 0.5, 'MASTER');
  P.BBD.potards.forEach((p) => potard(zoneMaster, p));
  P.MASTER.potards.forEach((p) => potard(zoneMaster, p));
  // soleil (clair) et lune (sombre) autour de l'interrupteur COLOUR
  const col = P.BBD.inters[1];
  const soleil = el('g', { transform: `translate(${col.x},${col.y - 11})`, class: 'symbole' }, serig);
  el('circle', { r: 1.4 }, soleil);
  for (let k = 0; k < 8; k++) { const [a1, b1] = polaire(2.3, k * 45); const [a2, b2] = polaire(3.4, k * 45); el('line', { x1: a1, y1: b1, x2: a2, y2: b2 }, soleil); }
  el('path', { d: 'M0.6,-2.6 A2.7,2.7 0 1 0 0.6,2.6 A2.1,2.1 0 1 1 0.6,-2.6 Z', transform: `translate(${col.x},${col.y + 13.5})`, class: 'lune' }, serig);
  P.BBD.inters.forEach((i) => inter(zoneMaster, { ...i, gauche: null }));
  voyant(zoneMaster, P.BBD.voyant.x, P.BBD.voyant.y, 3.2, P.BBD.voyant.etat, P.BBD.voyant.id);

  // --- Zone 3 : TEMPO + touches principales ---
  const zoneTempo = el('g', { id: 'zone-tempo' }, svg);
  bandeau(serig, P.TEMPO.bandeau.x1, P.TEMPO.bandeau.x2, P.TEMPO.bandeau.y, P.TEMPO.bandeau.texte);
  potard(zoneTempo, P.TEMPO.potard);
  for (const t of P.TOUCHES_PRINCIPALES) {
    texte(serig, t.x, t.y - 6.5, t.texte, 'nom');
    touche(zoneTempo, t, 'clair', t.voyant ? t.y + 8 : undefined);
  }

  // --- Zone 4 : la grille du séquenceur ---
  const zoneGrille = el('g', { id: 'zone-sequenceur' }, svg);
  const colX = (c) => P.PAS_X0 + P.PAS_ECART * (c - 1);
  for (const b of P.BANDEAUX_GRILLE) bandeau(serig, colX(b.col1) - 14, colX(b.col2) + 14, b.y, b.texte);
  for (const ligne of P.ETIQUETTES_GRILLE) {
    let c = 1;
    for (const groupe of ligne.groupes) {
      const x1 = colX(c) - 14, x2 = colX(c + groupe.length - 1) + 14;
      el('rect', { x: x1, y: ligne.y - 4, width: x2 - x1, height: 8, class: 'case' }, serig);
      groupe.forEach((s, i) => texte(serig, colX(c + i), ligne.y + 2.2, s, 'mini-clair'));
      c += groupe.length;
    }
  }
  for (const p of P.PAS) {
    touche(zoneGrille, { id: p.id, x: p.x, y: p.yVoyant - 8, l: 25, h: 33, etat: p.etat }, p.couleur, p.yVoyant);
  }
  P.TOUCHES_VOIX.forEach((t) => toucheVoix(zoneGrille, t));

  // --- Zone 5 : MODULATION ---
  const M = P.MODULATION;
  const zoneMod = el('g', { id: 'zone-modulation' }, svg);
  bandeau(serig, M.bandeau.x1, M.bandeau.x2, M.bandeau.y, M.bandeau.texte);
  voyant(zoneMod, M.voyant.x, M.voyant.y, 3.4, M.voyant.etat, M.voyant.id);
  potard(zoneMod, M.vitesse);
  potard(zoneMod, M.wave);
  potard(zoneMod, M.modlvl);
  for (const t of M.touches) {
    texte(serig, t.x, t.y - 6.5, t.texte, 'nom');
    texte(serig, t.x, t.y + 41, t.alias, 'nom');
    touche(zoneMod, t, 'clair', t.y + 8);
  }

  // --- Le nom de la machine ---
  texte(serig, P.NOM.x, P.NOM.y, P.NOM.texte, 'marque', { 'text-anchor': 'start' });

  conteneur.appendChild(svg);
  return svg;
}

