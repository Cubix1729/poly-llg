// Thème : auto (système), clair ou sombre. Choix en localStorage, avec repli en mémoire.
// theme-init.js applique la valeur au chargement ; ce module gère le bouton.
const CLE = 'poly-llg/theme';
const ORDRE = ['auto', 'clair', 'sombre'];
const LIBELLES = { auto: 'automatique', clair: 'clair', sombre: 'sombre' };
const ICONES = {
  auto: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  clair: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  sombre: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
};

let theme = lire();

function lire() {
  try {
    const t = localStorage.getItem(CLE);
    return t === 'clair' || t === 'sombre' ? t : 'auto';
  } catch {
    return 'auto';
  }
}

function appliquer() {
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

function definir(t) {
  theme = t;
  try {
    if (t === 'auto') localStorage.removeItem(CLE);
    else localStorage.setItem(CLE, t);
  } catch {
    // Stockage indisponible : le choix ne vit que dans la page.
  }
  appliquer();
}

export function initialiserTheme(bouton) {
  const suivant = () => ORDRE[(ORDRE.indexOf(theme) + 1) % ORDRE.length];
  const afficher = () => {
    bouton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONES[theme]}</svg>`;
    bouton.setAttribute('aria-label', `Thème : ${LIBELLES[theme]}. Passer à ${LIBELLES[suivant()]}`);
    bouton.title = `Thème : ${LIBELLES[theme]}`;
  };
  appliquer();
  afficher();
  bouton.addEventListener('click', () => {
    definir(suivant());
    afficher();
  });
}
