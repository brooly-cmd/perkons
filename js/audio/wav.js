// =====================================================================
// wav.js — RANGER UN SON DANS UN FICHIER WAV (mission 6)
//
// Un fichier WAV, c'est une petite étiquette (« 48 000 échantillons par
// seconde, 1 canal, 16 bits ») suivie de la liste des échantillons,
// comme un carnet de notes de hauteur d'eau relevées très vite.
// =====================================================================

export function versWav(buffer) {
  const canaux = buffer.numberOfChannels;
  const n = buffer.length;
  const octets = new DataView(new ArrayBuffer(44 + n * canaux * 2));
  const ecrire = (pos, texte) => [...texte].forEach((c, i) => octets.setUint8(pos + i, c.charCodeAt(0)));

  ecrire(0, 'RIFF'); octets.setUint32(4, 36 + n * canaux * 2, true); ecrire(8, 'WAVE');
  ecrire(12, 'fmt '); octets.setUint32(16, 16, true); octets.setUint16(20, 1, true);
  octets.setUint16(22, canaux, true); octets.setUint32(24, buffer.sampleRate, true);
  octets.setUint32(28, buffer.sampleRate * canaux * 2, true); octets.setUint16(32, canaux * 2, true);
  octets.setUint16(34, 16, true); ecrire(36, 'data'); octets.setUint32(40, n * canaux * 2, true);

  const donnees = [...Array(canaux)].map((_, c) => buffer.getChannelData(c));
  let pos = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < canaux; c++) {
      const s = Math.max(-1, Math.min(1, donnees[c][i]));
      octets.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      pos += 2;
    }
  }
  return new Blob([octets], { type: 'audio/wav' });
}
