// Appliqué avant le premier rendu pour éviter un flash : lit le thème choisi (voir theme.js).
try {
  const t = localStorage.getItem('poly-llg/theme');
  if (t === 'clair' || t === 'sombre') document.documentElement.dataset.theme = t;
} catch {
  // Stockage indisponible : mode auto.
}
