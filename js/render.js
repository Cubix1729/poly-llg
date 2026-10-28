// Rendu Markdown + LaTeX. Seul point d'entrée pour du texte venant du JSON.

const md = window.markdownit({ html: false, linkify: false, typographer: false })
  .use(window.texmath, {
    engine: window.katex,
    delimiters: 'dollars',
    katexOptions: { strict: false, throwOnError: false },
  });

export function echapper(texte) {
  return String(texte ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function rendreBloc(source) {
  return md.render(source ?? '');
}

export function rendreEnLigne(source) {
  return md.renderInline(source ?? '');
}

export function ajouterLiensVersExos(source) {
  return String(source ?? '').replace(/exercice (\d+)/gi, '[exercice $1](#ex/$1)');
}
