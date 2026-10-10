// =====================================================================
// fichier.js — LE FICHIER DE SAUVEGARDE (mission 8, utilisé à la mission 30)
//
// Transforme une sauvegarde (js/donnees/modele.js) en texte, et l'inverse.
// Ce texte remplace la carte SD de la machine : on peut l'enregistrer sur
// le PC et le recharger dans un autre navigateur.
//
// Format : JSON, un texte lisible fait de { } et de [ ], comme une liste de
// courses bien rangée. Les samples (des octets de son) n'existent pas en
// JSON : on les écrit en « base64 », une façon d'écrire des octets avec
// des lettres, comme le morse écrit des mots avec des points et des traits.
// =====================================================================

import { verifierSauvegarde } from './modele.js';

const CLE_OCTETS = '$octets';

function versBase64(tampon) {
  const o = new Uint8Array(tampon);
  let s = '';
  for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode(...o.subarray(i, i + 0x8000));
  return btoa(s);
}
function depuisBase64(texte) {
  const s = atob(texte);
  const o = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i);
  return o.buffer;
}

// Sauvegarde → texte
export function versTexte(sauvegarde) {
  return JSON.stringify(sauvegarde, (cle, v) => (v instanceof ArrayBuffer ? { [CLE_OCTETS]: versBase64(v) } : v));
}

// Texte → sauvegarde. Refuse un fichier abîmé ou qui n'est pas une sauvegarde
// HD-01 (le message dit pourquoi), pour ne jamais écraser les données avec.
export function depuisTexte(texte) {
  let sv;
  try {
    sv = JSON.parse(texte, (cle, v) => (
      v && typeof v === 'object' && Object.keys(v).length === 1 && typeof v[CLE_OCTETS] === 'string' ? depuisBase64(v[CLE_OCTETS]) : v
    ));
  } catch {
    throw new Error("Ce fichier n'est pas lisible (ce n'est pas du JSON).");
  }
  const erreurs = verifierSauvegarde(sv);
  if (erreurs.length) {
    const e = new Error(`Fichier refusé : ${erreurs.length} erreur(s). Première : ${erreurs[0]}`);
    e.erreurs = erreurs;
    throw e;
  }
  return sv;
}
