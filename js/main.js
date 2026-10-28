// Routeur, chargement des données, orchestration.
import {
  construireIndex, vueAccueil, vueChapitre, vuePartie, vueRevoir, vueIntrouvable, menuLateral,
  contenuAvancement, exercicesARevoir, vueCompte,
} from './views.js';
import { definir, surChangement } from './store.js';
import { rendreBloc } from './render.js';
import { initialiserTheme } from './theme.js';
import { etatActuel, surEtat, connecter, creerCompte, deconnecter, MDP_MIN } from './sync.js';

const vue = document.getElementById('vue');
const menu = document.getElementById('menu');
const lienRevoir = document.getElementById('lien-revoir');
const boutonMenu = document.getElementById('bouton-menu');
const voile = document.getElementById('voile');
let index = null;

initialiserTheme(document.getElementById('bouton-theme'));

async function charger() {
  const reponse = await fetch('data/exercices.json');
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
  const donnees = await reponse.json();
  return construireIndex(donnees.exercices);
}

function analyserAdresse() {
  const chemin = location.hash.replace(/^#\/?/, '');
  let m;
  if (chemin === '') return { type: 'accueil' };
  if (chemin === 'revoir') return { type: 'revoir' };
  if (chemin === 'compte') return { type: 'compte' };
  if ((m = chemin.match(/^ex\/(\d+)$/))) return { type: 'exercice', numero: Number(m[1]) };
  if ((m = chemin.match(/^(\d+)$/))) return { type: 'chapitre', numero: Number(m[1]) };
  if ((m = chemin.match(/^(\d+\.\d+)$/))) return { type: 'partie', numero: m[1] };
  if ((m = chemin.match(/^(\d+\.\d+\.\d+)$/))) return { type: 'partie', numero: m[1] }; // cas spécifique des sous-parties
  return null;
}

function afficher(resultat, defilerEnHaut = true) {
  vue.innerHTML = resultat.html;
  document.title = `${resultat.titre} — Poly LLG`;
  if (defilerEnHaut) window.scrollTo(0, 0);
  const titre = vue.querySelector('h1');
  if (titre) {
    titre.tabIndex = -1;
    titre.classList.add("focus-programmatique");
    titre.focus({ preventScroll: true });
  }
}

// Tiroir ouvert : le focus y entre, y reste (Tab boucle) et revient au bouton à la fermeture.
function ouvrirMenu(ouvert) {
  const etaitOuvert = document.body.classList.contains('menu-ouvert');
  document.body.classList.toggle('menu-ouvert', ouvert);
  boutonMenu.setAttribute('aria-expanded', String(ouvert));
  voile.hidden = !ouvert;
  if (ouvert && !etaitOuvert) menu.querySelector('summary, a')?.focus();
  else if (!ouvert && etaitOuvert && menu.contains(document.activeElement)) boutonMenu.focus({ preventScroll: true });
}

function boucleFocusMenu(evt) {
  if (evt.key !== 'Tab' || !document.body.classList.contains('menu-ouvert')) return;
  const cibles = [boutonMenu, ...menu.querySelectorAll('summary, details[open] a')];
  const premier = cibles[0];
  const dernier = cibles[cibles.length - 1];
  if (evt.shiftKey && document.activeElement === premier) { evt.preventDefault(); dernier.focus(); }
  else if (!evt.shiftKey && document.activeElement === dernier) { evt.preventDefault(); premier.focus(); }
}

// Surligne la partie courante et déplie son chapitre.
function marquerMenu(adresse) {
  menu.querySelectorAll('[aria-current]').forEach((a) => a.removeAttribute('aria-current'));
  let partie = null;
  let chapitre = null;
  if (adresse.type === 'partie') partie = adresse.numero;
  else if (adresse.type === 'exercice') partie = index.parNumero.get(adresse.numero)?.sous_reference.numero;
  else if (adresse.type === 'chapitre') chapitre = adresse.numero;
  if (partie) chapitre = Number(partie.split('.')[0]);
  const lien = partie && menu.querySelector(`a[data-partie="${partie}"]`);
  if (lien) lien.setAttribute('aria-current', 'page');
  const bloc = chapitre && menu.querySelector(`details[data-chapitre="${chapitre}"]`);
  if (bloc) {
    bloc.open = true;
    if (lien && window.matchMedia('(min-width: 64rem)').matches) lien.scrollIntoView({ block: 'nearest' });
  }
}

function router() {
  if (!index) return;
  const adresse = analyserAdresse();
  if (!adresse) {
    location.replace('#/');
    return;
  }
  let resultat;
  let cible = null;
  switch (adresse.type) {
    case 'accueil':
      resultat = vueAccueil(index);
      break;
    case 'revoir':
      resultat = vueRevoir(index);
      break;
    case 'compte':
      resultat = vueCompte(etatActuel(), MDP_MIN);
      break;
    case 'chapitre':
      resultat = vueChapitre(index, adresse.numero);
      break;
    case 'partie':
      resultat = vuePartie(index, adresse.numero);
      break;
    case 'exercice': {
      const exo = index.parNumero.get(adresse.numero);
      if (exo) {
        resultat = vuePartie(index, exo.sous_reference.numero);
        cible = `exo-${exo.numero}`;
      }
      break;
    }
  }
  if (!resultat) resultat = vueIntrouvable();
  afficher(resultat, !cible);
  ouvrirMenu(false);
  marquerMenu(adresse);
  if (cible) {
    const el = document.getElementById(cible);
    if (el) {
      el.scrollIntoView();
      el.focus({ preventScroll: true });
    }
  }
}

// Lien « À revoir (n) » de l'en-tête, visible seulement si n > 0.
function majCompteurRevoir() {
  const n = exercicesARevoir(index).length;
  document.getElementById('nb-revoir').textContent = n;
  lienRevoir.hidden = n === 0;
}

// Boutons de statut : effet immédiat, sans refaire la vue (le défilement et les corrigés ouverts restent).
vue.addEventListener('click', (evt) => {
  const bouton = evt.target.closest('.statut button');
  if (!bouton) return;
  definir(Number(bouton.closest('.statut').dataset.numero), bouton.dataset.statut);
});

surChangement((numero, statut) => {
  document.querySelectorAll(`.statut[data-numero="${numero}"] button`).forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.statut === statut));
  });
  document.querySelectorAll('[data-portee]').forEach((el) => {
    el.innerHTML = contenuAvancement(index, el.dataset.portee);
  });
  majCompteurRevoir();
});

// Compte : connexion, création, déconnexion.
function direCompte(message, erreur = false) {
  const el = document.getElementById('message-compte');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('erreur', erreur);
}

vue.addEventListener('submit', async (evt) => {
  if (evt.target.id !== 'form-compte') return;
  evt.preventDefault();
  const form = evt.target;
  const email = form.email.value.trim();
  const mdp = form.mdp.value;
  if (!email || !mdp) {
    direCompte('Renseignez l\'adresse e-mail et le mot de passe.', true);
    return;
  }
  const creation = evt.submitter?.value === 'creation';
  form.querySelectorAll('button').forEach((b) => { b.disabled = true; });
  const r = await (creation ? creerCompte(email, mdp) : connecter(email, mdp));
  form.querySelectorAll('button').forEach((b) => { b.disabled = false; });
  // Une connexion réussie réaffiche la vue via surEtat ; sinon on affiche le message sur place.
  if (!r.ok || r.message) direCompte(r.message ?? '', !r.ok);
});

vue.addEventListener('click', (evt) => {
  if (evt.target.id === 'deconnexion') deconnecter();
});

// Changement d'état du compte : rafraîchit la vue Compte si elle est affichée, sinon le signal d'en-tête.
let dernierEmail = etatActuel().email;
surEtat((etat) => {
  const etatSync = document.getElementById('etat-sync');
  if (etatSync) {
    etatSync.hidden = etat.synchro !== 'echec';
    etatSync.textContent = etat.synchro === 'echec' ? 'Synchro en échec' : '';
  }
  if (!index || analyserAdresse()?.type !== 'compte') return;
  if (etat.email !== dernierEmail) {
    dernierEmail = etat.email;
    afficher(vueCompte(etat, MDP_MIN), false);
  } else {
    const texte = document.getElementById('synchro-texte');
    if (texte) afficher(vueCompte(etat, MDP_MIN), false);
  }
});

// Corrigés : rendu à la première ouverture seulement.
vue.addEventListener('toggle', (evt) => {
  const details = evt.target;
  if (!details.matches || !details.matches('details.corrige') || !details.open) return;
  const conteneur = details.querySelector('.corrige-contenu');
  if (conteneur.dataset.rendu) return;
  const exo = index.parNumero.get(Number(details.dataset.numero));
  conteneur.innerHTML = rendreBloc(exo.corrige_md);
  conteneur.dataset.rendu = '1';
}, true);

window.addEventListener('hashchange', router);
boutonMenu.addEventListener('click', () => ouvrirMenu(!document.body.classList.contains('menu-ouvert')));
voile.addEventListener('click', () => ouvrirMenu(false));
document.addEventListener('keydown', (evt) => {
  if (evt.key === 'Escape') ouvrirMenu(false);
  boucleFocusMenu(evt);
});
// Lien d'évitement : #vue est aussi une adresse du routeur ; on focalise sans toucher à l'adresse.
document.getElementById('evitement').addEventListener('click', (evt) => {
  evt.preventDefault();
  vue.focus();
});
// Un clic sur le lien de la page déjà affichée ne change pas l'adresse : refermer quand même.
menu.addEventListener('click', (evt) => {
  if (evt.target.closest('a')) ouvrirMenu(false);
});

charger().then((idx) => {
  index = idx;
  menu.innerHTML = menuLateral(index);
  majCompteurRevoir();
  router();
}).catch((erreur) => {
  vue.innerHTML = `<h1>Erreur</h1><p>Impossible de charger les exercices (${String(erreur.message)}).</p>`;
});
