// Statuts des exercices : localStorage, avec repli en mémoire si le stockage est indisponible.
// La synchronisation (sync.js) s'y branche par surChangement, l'origine distinguant local et distant.
export const A_FAIRE = 'À faire';
export const FAIT = 'Fait';
export const A_REVOIR = 'À revoir';
export const STATUTS = [A_FAIRE, FAIT, A_REVOIR];

const CLE = 'poly-llg/statuts';
let statuts = lire();
const abonnes = new Set();

function lire() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) ?? '{}');
    if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return {};
    const propre = {};
    for (const [numero, v] of Object.entries(brut)) {
      if (v && STATUTS.includes(v.s)) propre[numero] = { s: v.s, t: Number(v.t) || 0 };
    }
    return propre;
  } catch {
    return {};
  }
}

function ecrire() {
  try {
    localStorage.setItem(CLE, JSON.stringify(statuts));
  } catch {
    // Stockage indisponible ou plein : la progression ne vit que dans la page.
  }
}

export function statutDe(numero) {
  return statuts[numero]?.s ?? A_FAIRE;
}

export function definir(numero, statut) {
  if (!STATUTS.includes(statut) || statut === statutDe(numero)) return;
  statuts[numero] = { s: statut, t: Date.now() };
  ecrire();
  abonnes.forEach((f) => f(numero, statut, 'local'));
}

// Copie de l'état complet : {numero: {s, t}}.
export function instantane() {
  return JSON.parse(JSON.stringify(statuts));
}

// Applique des entrées {numero: {s, t}} issues du serveur. Les abonnés reçoivent l'origine 'distant'.
export function appliquerDistant(entrees) {
  for (const [numero, v] of Object.entries(entrees)) {
    if (!STATUTS.includes(v.s)) continue;
    const avant = statutDe(numero);
    statuts[numero] = { s: v.s, t: v.t };
    if (avant !== v.s) abonnes.forEach((f) => f(Number(numero), v.s, 'distant'));
  }
  ecrire();
}

// Appelle f(numero, statut, origine) après chaque changement.
export function surChangement(f) {
  abonnes.add(f);
}
