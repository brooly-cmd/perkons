// =====================================================================
// stockage.js — LE RANGEMENT DANS LE NAVIGATEUR (mission 8, utilisé à la mission 29)
//
// IndexedDB = un placard du navigateur qui garde les données après
// fermeture de la page. On y range les fiches de js/donnees/modele.js,
// telles quelles :
//   - tiroir « banques » : une banque par numéro (1 à 64) ;
//   - tiroir « machine » : « reglages » et « session ».
// Une banque jamais touchée n'est pas rangée : on rend une banque vide.
// =====================================================================

import { NB_BANQUES, nouvelleBanque, reglagesUsine, nouvelleSession, nouvelleSauvegarde, VERSION } from './modele.js';

export const NOM_PLACARD = 'perkons-hd01';

// Une demande au placard → une promesse (on attend la réponse sans bloquer la page)
const attendre = (demande) => new Promise((ok, ko) => {
  demande.onsuccess = () => ok(demande.result);
  demande.onerror = () => ko(demande.error);
});
const finTransaction = (t) => new Promise((ok, ko) => {
  t.oncomplete = () => ok();
  t.onerror = t.onabort = () => ko(t.error);
});

export async function ouvrirStockage(nom = NOM_PLACARD) {
  const demande = indexedDB.open(nom, VERSION);
  demande.onupgradeneeded = () => {
    const db = demande.result;
    if (!db.objectStoreNames.contains('banques')) db.createObjectStore('banques');
    if (!db.objectStoreNames.contains('machine')) db.createObjectStore('machine');
  };
  const db = await attendre(demande);

  const lire = async (tiroir, cle) => attendre(db.transaction(tiroir).objectStore(tiroir).get(cle));
  const ecrire = async (tiroir, cle, valeur) => {
    const t = db.transaction(tiroir, 'readwrite');
    t.objectStore(tiroir).put(valeur, cle);
    return finTransaction(t);
  };

  return {
    async lireBanque(n) { return (await lire('banques', n)) ?? nouvelleBanque(); },
    ecrireBanque: (n, banque) => ecrire('banques', n, banque),
    async lireReglages() { return (await lire('machine', 'reglages')) ?? reglagesUsine(); },
    ecrireReglages: (r) => ecrire('machine', 'reglages', r),
    async lireSession() { return (await lire('machine', 'session')) ?? nouvelleSession(); },
    ecrireSession: (s) => ecrire('machine', 'session', s),

    // Tout le placard → une sauvegarde (pour l'export du fichier)
    async toutLire() {
      const banques = [];
      for (let n = 1; n <= NB_BANQUES; n++) banques.push(await this.lireBanque(n));
      return nouvelleSauvegarde({ reglages: await this.lireReglages(), session: await this.lireSession(), banques });
    },
    // Une sauvegarde (vérifiée avant !) → remplace tout le placard, en une seule fois
    async toutRemplacer(sv) {
      const t = db.transaction(['banques', 'machine'], 'readwrite');
      const b = t.objectStore('banques'), m = t.objectStore('machine');
      b.clear();
      sv.banques.forEach((banque, i) => b.put(banque, i + 1));
      m.put(sv.reglages, 'reglages');
      m.put(sv.session, 'session');
      return finTransaction(t);
    },
    fermer: () => db.close(),
  };
}

// Vider complètement un placard (factory reset, et nettoyage des vérifs)
export function effacerStockage(nom = NOM_PLACARD) {
  return attendre(indexedDB.deleteDatabase(nom));
}
