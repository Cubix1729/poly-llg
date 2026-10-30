// Mode « sans aides » : masque corrigés et indices (règle CSS sur data-aides).
// Choix en localStorage, avec repli en mémoire.
const CLE = 'poly-llg/aides';
const ICONE = '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>';
const BARRE = '<path d="M3 3l18 18"/>';

let sans = lire();

function lire() {
  try {
    return localStorage.getItem(CLE) === 'sans';
  } catch {
    return false;
  }
}

function appliquer() {
  if (sans) document.documentElement.dataset.aides = 'sans';
  else delete document.documentElement.dataset.aides;
}

function definir(valeur) {
  sans = valeur;
  try {
    if (sans) localStorage.setItem(CLE, 'sans');
    else localStorage.removeItem(CLE);
  } catch {
    // Stockage indisponible : le choix ne vit que dans la page.
  }
  appliquer();
}

export function initialiserAides(bouton) {
  const afficher = () => {
    bouton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONE}${sans ? BARRE : ''}</svg>`;
    bouton.setAttribute('aria-pressed', String(sans));
    bouton.setAttribute('aria-label', 'Masquer les corrigés et les indices');
    bouton.title = sans ? 'Corrigés et indices masqués' : 'Corrigés et indices disponibles';
  };
  appliquer();
  afficher();
  bouton.addEventListener('click', () => {
    definir(!sans);
    afficher();
  });
}
