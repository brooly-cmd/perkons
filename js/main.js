// =====================================================================
// main.js — LE POINT DE DÉPART DE LA PAGE
//
// 1. facade.js dessine la façade (mission 3) ;
// 2. pupitre.js la rend vivante à la souris (mission 4) ;
// 3. son.js la branche sur le moteur audio (mission 6).
// Les missions suivantes (séquenceur…) se brancheront ici.
// =====================================================================

import { dessinerFacade } from './facade.js';
import { brancherPupitre } from './pupitre.js';
import { brancherSon } from './son.js';

const svg = dessinerFacade(document.getElementById('facade'));
export const pupitre = brancherPupitre(svg);
export const son = brancherSon(pupitre);
