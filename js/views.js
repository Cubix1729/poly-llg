// Une fonction par vue ; chacune renvoie { titre, html }.
import { ajouterLiensVersExos, echapper, rendreBloc, rendreEnLigne } from './render.js';
import { FAIT, A_REVOIR, STATUTS, statutDe } from './store.js';

const URL_ENONCE = 'https://www.louislegrand.fr/wp-content/uploads/2022/01/EXOS-TERMINALE3-3-AVECDESSIN.pdf';
const URL_CORRIGE = 'https://wikiprepa.fr/wp-content/uploads/Correction_Poly_Transition_Prepa_LLG_H4.pdf';

// Compare « 4.10 » et « 4.2 » numériquement, pas alphabétiquement.
function comparerParties(a, b) {
  const [ca, pa] = a.split('.').map(Number);
  const [cb, pb] = b.split('.').map(Number);
  return ca - cb || pa - pb;
}

export function construireIndex(exercices) {
  const parNumero = new Map();
  const chapitres = new Map();
  const parties = new Map();

  for (const exo of exercices) {
    parNumero.set(exo.numero, exo);

    const nc = exo.chapitre.numero;
    if (!chapitres.has(nc)) {
      chapitres.set(nc, { numero: nc, titre: exo.chapitre.titre, parties: [], exercices: [] });
    }
    const chapitre = chapitres.get(nc);
    chapitre.exercices.push(exo);

    const np = exo.sous_reference.numero;
    if (!parties.has(np)) {
      const partie = { numero: np, titre: exo.sous_reference.titre, chapitre, exercices: [] };
      parties.set(np, partie);
      chapitre.parties.push(partie);
    }
    parties.get(np).exercices.push(exo);
  }

  for (const chapitre of chapitres.values()) {
    chapitre.parties.sort((a, b) => comparerParties(a.numero, b.numero));
  }
  const listeParties = [...parties.values()].sort((a, b) => comparerParties(a.numero, b.numero));
  listeParties.forEach((p, i) => {
    p.precedente = listeParties[i - 1] ?? null;
    p.suivante = listeParties[i + 1] ?? null;
  });

  return {
    parNumero,
    chapitres,
    parties,
    listeChapitres: [...chapitres.values()].sort((a, b) => a.numero - b.numero),
  };
}

// Menu latéral : un bloc repliable par chapitre, avec ses parties.
export function menuLateral(index) {
  return index.listeChapitres.map((c) => `
    <details data-chapitre="${c.numero}">
      <summary>${c.numero}. ${rendreEnLigne(c.titre)}</summary>
      <ul>
        <li><a href="#/${c.numero}">Toutes les parties</a></li>
        ${c.parties.map((p) => `<li><a href="#/${p.numero}" data-partie="${p.numero}">${p.numero} ${rendreEnLigne(p.titre)}</a></li>`).join('')}
      </ul>
    </details>`).join('');
}

// Portées de statistiques : « tout », « c:4 » (chapitre), « p:4.1 » (partie), « d:3 » (difficulté).
export function exercicesDe(index, portee) {
  const [genre, valeur] = portee.split(':');
  if (genre === 'c') return index.chapitres.get(Number(valeur))?.exercices ?? [];
  if (genre === 'p') return index.parties.get(valeur)?.exercices ?? [];
  const tous = [...index.parNumero.values()];
  if (genre === 'd') return tous.filter((e) => e.difficulte === Number(valeur));
  return tous;
}

export function compter(exercices) {
  const c = { total: exercices.length, fait: 0, revoir: 0 };
  for (const e of exercices) {
    const s = statutDe(e.numero);
    if (s === FAIT) c.fait++;
    else if (s === A_REVOIR) c.revoir++;
  }
  return c;
}

export function exercicesARevoir(index) {
  return [...index.parNumero.values()].filter((e) => statutDe(e.numero) === A_REVOIR);
}

// Contenu d'un bloc d'avancement (barre + texte), recalculé après chaque changement de statut.
export function contenuAvancement(index, portee) {
  const { total, fait, revoir } = compter(exercicesDe(index, portee));
  const pct = total ? Math.round((100 * fait) / total) : 0;
  const detail = `${fait} / ${total} faits (${pct} %)${revoir ? ` · ${revoir} à revoir` : ''}`;
  return `<progress value="${fait}" max="${total}" aria-label="Avancement : ${detail}"></progress><span class="avancement-texte">${detail}</span>`;
}

export function avancement(index, portee) {
  return `<div class="avancement" data-portee="${portee}">${contenuAvancement(index, portee)}</div>`;
}

function pluriel(n, mot) {
  return `${n} ${mot}${n > 1 ? 's' : ''}`;
}

export function vueAccueil(index) {
  const cartes = index.listeChapitres.map((c) => `
    <li class="carte">
      <a href="#/${c.numero}">
        <span class="carte-titre">${c.numero}. ${rendreEnLigne(c.titre)}</span>
        <span class="carte-detail">${pluriel(c.parties.length, 'partie')} · ${pluriel(c.exercices.length, 'exercice')}</span>
        ${avancement(index, `c:${c.numero}`)}
      </a>
    </li>`).join('');

  const difficultes = [1, 2, 3, 4, 5].map((d) => `
    <li><span class="diff-libelle">${etoiles(d)}</span>${avancement(index, `d:${d}`)}</li>`).join('');

  return {
    titre: 'Accueil',
    html: `
      <h1>Poly LLG</h1>
      <p class="avertissement" role="note">
        Transcription non officielle du polycopié de transition prépa des lycées Louis-le-Grand et Henri-IV :
        des erreurs ont pu s'y glisser. En cas de doute, se référer au document original,
        accessible depuis chaque exercice. Les indices ne figurent pas dans le polycopié : ils ont été
        rédigés par l'IA, et peuvent être de mauvaise qualité ou comporter des erreurs.
      </p>
      <p><b>${pluriel(index.parNumero.size, 'exercice')}</b> répartis en <b>${index.listeChapitres.length} chapitres.</b></p>
      <h2 class="section">Avancement global</h2>
      ${avancement(index, 'tout')}
      <h2 class="section">Chapitres</h2>
      <ul class="cartes">${cartes}</ul>
      <h2 class="section">Par difficulté</h2>
      <ul class="difficultes">${difficultes}</ul>`,
  };
}

function filAriane(elements) {
  const items = elements.map((e, i) => (e.lien && i < elements.length - 1
    ? `<li><a href="${e.lien}">${e.texte}</a></li>`
    : `<li aria-current="page">${e.texte}</li>`)).join('');
  return `<nav class="ariane" aria-label="Fil d'Ariane"><ol>${items}</ol></nav>`;
}

export function vueChapitre(index, numero) {
  const chapitre = index.chapitres.get(numero);
  if (!chapitre) return null;

  const parties = chapitre.parties.map((p) => `
    <li class="carte">
      <a href="#/${p.numero}">
        <span class="carte-titre">${p.numero} ${rendreEnLigne(p.titre)}</span>
        <span class="carte-detail">${pluriel(p.exercices.length, 'exercice')}</span>
        ${avancement(index, `p:${p.numero}`)}
      </a>
    </li>`).join('');

  return {
    titre: `Chapitre ${chapitre.numero}`,
    html: `
      ${filAriane([{ texte: 'Accueil', lien: '#/' }, { texte: `Chapitre ${chapitre.numero}` }])}
      <h1>${chapitre.numero}. ${rendreEnLigne(chapitre.titre)}</h1>
      ${avancement(index, `c:${chapitre.numero}`)}
      <ul class="cartes">${parties}</ul>`,
  };
}

function etoiles(difficulte) {
  const n = Math.max(0, Math.min(5, Number(difficulte) || 0));
  return `<span class="etoiles" role="img" aria-label="Difficulté ${n} sur 5">${'★'.repeat(n)}<span class="etoiles-vides">${'★'.repeat(5 - n)}</span></span>`;
}

function boutonsStatut(exo) {
  const courant = statutDe(exo.numero);
  const boutons = STATUTS.map((st) => `<button type="button" data-statut="${st}" aria-pressed="${st === courant}">${st}</button>`).join('');
  return `<div class="statut" role="group" aria-label="Statut de l'exercice ${exo.numero}" data-numero="${exo.numero}">${boutons}</div>`;
}

// Indices : un bouton les révèle un par un (rendu à la demande, voir main.js).
function blocIndices(exo) {
  const n = (exo.indices_md ?? []).filter((i) => typeof i === 'string').length;
  if (!n) return '';
  return `<div class="indices" data-numero="${exo.numero}">
        <ol class="indices-liste" aria-live="polite"></ol>
        <button type="button" class="indice-suivant">Indice 1 sur ${n}</button>
      </div>`;
}

function vueExercice(exo) {
  const titre = exo.titre ? ` <span class="exo-titre">${rendreEnLigne(exo.titre)}</span>` : '';
  const classique = (exo.is_classique && exo.titre) ? ' <span class="badge">classique</span>' : '';
  const pageEnonce = exo.source?.poly_page;
  const pageCorrige = exo.source?.corrige_pages?.[0];
  const lienEnonce = pageEnonce
    ? `<a href="${URL_ENONCE}#page=${Number(pageEnonce)}" target="_blank" rel="noopener noreferrer">Énoncé (p. ${Number(pageEnonce)})</a>` : '';
  const lienCorrige = pageCorrige
    ? `<span class="lien-corrige"><a href="${URL_CORRIGE}#page=${Number(pageCorrige)}" target="_blank" rel="noopener noreferrer">Corrigé (p. ${Number(pageCorrige)})</a></span>` : '';
  const auteur = exo.auteur_corrige ? `<p class="auteur">Par ${echapper(exo.auteur_corrige)}</p>` : '';

  return `
    <article class="exo" id="exo-${exo.numero}" tabindex="-1">
      <header class="exo-entete">
        <h2>Exercice ${exo.numero}${titre}</h2>
        <p class="exo-meta">${etoiles(exo.difficulte)}${classique}</p>
      </header>
      ${boutonsStatut(exo)}
      <div class="enonce">${rendreBloc(ajouterLiensVersExos(exo.enonce_md))}</div>
      ${blocIndices(exo)}
      <details class="corrige" data-numero="${exo.numero}">
        <summary>Corrigé</summary>
        ${auteur}
        <div class="corrige-contenu"></div>
      </details>
      <p class="sources">${lienEnonce}${lienEnonce && lienCorrige ? '<span class="lien-corrige"> · </span>' : ''}${lienCorrige}</p>
    </article>`;
}

export function vuePartie(index, numero) {
  const partie = index.parties.get(numero);
  if (!partie) return null;
  const chapitre = partie.chapitre;

  const voisine = (p, sens) => (p
    ? `<a class="${sens}" href="#/${p.numero}"><span class="sens">${sens === 'precedente' ? '← Précédente' : 'Suivante →'}</span> ${p.numero} ${rendreEnLigne(p.titre)}</a>`
    : '<span></span>');

  return {
    titre: `${partie.numero} ${partie.titre.replaceAll("$", "")}`, // titre de page : texte brut
    html: `
      ${filAriane([
        { texte: 'Accueil', lien: '#/' },
        { texte: `Chapitre ${chapitre.numero}`, lien: `#/${chapitre.numero}` },
        { texte: partie.numero },
      ])}
      <h1>${partie.numero} ${rendreEnLigne(partie.titre)}</h1>
      ${avancement(index, `p:${partie.numero}`)}
      ${partie.exercices.map(vueExercice).join('')}
      <nav class="voisines" aria-label="Parties voisines">
        ${voisine(partie.precedente, 'precedente')}
        ${voisine(partie.suivante, 'suivante')}
      </nav>`,
  };
}

export function vueRevoir(index) {
  const exos = exercicesARevoir(index);
  let corps = '<p>Aucun exercice à revoir pour le moment. Marquez un exercice « À revoir » pour le retrouver ici.</p>';
  if (exos.length) {
    const groupes = new Map();
    for (const e of exos) {
      const np = e.sous_reference.numero;
      if (!groupes.has(np)) groupes.set(np, []);
      groupes.get(np).push(e);
    }
    const ordre = [...groupes.keys()].sort(comparerParties);
    corps = ordre.map((np) => {
      const partie = index.parties.get(np);
      return `
        <section class="groupe">
          <h2 class="section"><a href="#/${np}">${np} ${rendreEnLigne(partie.titre)}</a></h2>
          ${groupes.get(np).map(vueExercice).join('')}
        </section>`;
    }).join('');
  }
  return {
    titre: 'À revoir',
    html: `
      ${filAriane([{ texte: 'Accueil', lien: '#/' }, { texte: 'À revoir' }])}
      <h1>À revoir (${exos.length})</h1>
      ${corps}`,
  };
}

const LIBELLES_SYNCHRO = {
  inactif: '',
  'en cours': 'Synchronisation en cours…',
  ok: 'Progression synchronisée.',
  echec: 'La dernière synchronisation a échoué ; la progression reste enregistrée sur cet appareil et sera renvoyée plus tard.',
};

export function vueCompte(etat, mdpMin) {
  const intro = '<p>Le compte est facultatif : il sert uniquement à retrouver votre progression sur plusieurs appareils.</p>';
  let corps;
  if (!etat.disponible) {
    corps = '<p>Les comptes sont indisponibles pour le moment. Le site fonctionne normalement, la progression reste sur cet appareil.</p>';
  } else if (etat.email) {
    corps = `
      <p>Connecté en tant que <strong>${echapper(etat.email)}</strong>.</p>
      <p id="synchro-texte" role="status">${echapper(LIBELLES_SYNCHRO[etat.synchro] ?? '')}${etat.synchro === 'echec' && etat.erreur ? ` (${echapper(etat.erreur)})` : ''}</p>
      <p><button type="button" id="deconnexion">Se déconnecter</button></p>`;
  } else {
    corps = `
      <form id="form-compte" novalidate>
        <label>Adresse e-mail
          <input type="email" name="email" autocomplete="email" required></label>
        <label>Mot de passe (${mdpMin} caractères au moins)
          <input type="password" name="mdp" autocomplete="current-password" minlength="${mdpMin}" required></label>
        <div class="actions">
          <button type="submit" value="connexion">Se connecter</button>
          <button type="submit" value="creation">Créer un compte</button>
        </div>
      </form>`;
  }
  return {
    titre: 'Compte',
    html: `
      ${filAriane([{ texte: 'Accueil', lien: '#/' }, { texte: 'Compte' }])}
      <h1>Compte</h1>
      ${intro}
      ${corps}
      <p id="message-compte" role="status"></p>`,
  };
}

export function vueIntrouvable() {
  return { titre: 'Introuvable', html: '<h1>Page introuvable</h1><p><a href="#/">Retour à l\'accueil</a></p>' };
}
