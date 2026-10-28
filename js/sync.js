// Compte facultatif et synchronisation Supabase. Le site reste entièrement utilisable sans elle :
// toute erreur réseau est signalée (état) sans jamais bloquer le stockage local.
import { SUPABASE_URL, SUPABASE_CLE } from './config.js';
import { instantane, appliquerDistant, surChangement } from './store.js';

const MDP_MIN = 10;
const abonnes = new Set();
let client = null;
let session = null;
const enAttente = new Set(); // exercices modifiés dont l'envoi a échoué
const etat = { disponible: false, email: null, synchro: 'inactif', erreur: null };

try {
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_CLE, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  etat.disponible = true;
} catch {
  // Bibliothèque absente ou bloquée : pas de compte, le reste fonctionne.
}

function notifier() {
  abonnes.forEach((f) => f({ ...etat }));
}

function definirEtat(changements) {
  Object.assign(etat, changements);
  notifier();
}

export function etatActuel() {
  return { ...etat };
}

// Appelle f(etat) à chaque changement (connexion, synchronisation, erreur).
export function surEtat(f) {
  abonnes.add(f);
}

function ligne(numero, v) {
  return {
    user_id: session.user.id,
    exercice_id: Number(numero),
    statut: v.s,
    updated_at: new Date(v.t || Date.now()).toISOString(),
  };
}

async function envoyer(numeros) {
  if (!client || !session || numeros.length === 0) return;
  const local = instantane();
  const lignes = numeros.filter((n) => local[n]).map((n) => ligne(n, local[n]));
  if (lignes.length === 0) return;
  const { error } = await client.from('progression')
    .upsert(lignes, { onConflict: 'user_id,exercice_id' });
  if (error) throw error;
}

// Fusion exercice par exercice : l'horodatage le plus récent gagne (égalité : le serveur).
async function synchroniser() {
  if (!client || !session) return;
  definirEtat({ synchro: 'en cours', erreur: null });
  try {
    const { data, error } = await client.from('progression')
      .select('exercice_id, statut, updated_at');
    if (error) throw error;
    const distant = {};
    for (const r of data) distant[r.exercice_id] = { s: r.statut, t: Date.parse(r.updated_at) || 0 };
    const local = instantane();
    const versLocal = {};
    const versServeur = new Set(enAttente);
    for (const [n, d] of Object.entries(distant)) {
      if (!local[n] || d.t >= local[n].t) versLocal[n] = d;
      else versServeur.add(n);
    }
    for (const n of Object.keys(local)) if (!distant[n]) versServeur.add(n);
    appliquerDistant(versLocal);
    await envoyer([...versServeur]);
    enAttente.clear();
    definirEtat({ synchro: 'ok' });
  } catch (e) {
    definirEtat({ synchro: 'echec', erreur: e.message ?? String(e) });
  }
}

surChangement(async (numero, _statut, origine) => {
  if (origine !== 'local' || !session) return;
  enAttente.add(String(numero));
  try {
    await envoyer([...enAttente]);
    enAttente.clear();
    definirEtat({ synchro: 'ok' });
  } catch (e) {
    definirEtat({ synchro: 'echec', erreur: e.message ?? String(e) });
  }
});

window.addEventListener('online', () => {
  if (session && etat.synchro === 'echec') synchroniser();
});

if (client) {
  client.auth.onAuthStateChange((evenement, nouvelle) => {
    const avait = session?.user?.id;
    session = nouvelle;
    etat.email = nouvelle?.user?.email ?? null;
    if (!nouvelle) {
      definirEtat({ synchro: 'inactif', erreur: null });
      return;
    }
    notifier();
    // Pas d'appel supabase dans ce rappel (verrou interne) : on diffère.
    if (nouvelle.user.id !== avait || evenement === 'SIGNED_IN') setTimeout(synchroniser, 0);
  });
}

function traduire(erreur) {
  const m = erreur?.message ?? '';
  if (/invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.';
  if (/email not confirmed/i.test(m)) return 'Adresse e-mail non confirmée : ouvrez le lien reçu par e-mail.';
  if (/already registered/i.test(m)) return 'Un compte existe déjà avec cette adresse.';
  if (/rate limit|too many/i.test(m)) return 'Trop de tentatives, réessayez dans quelques minutes.';
  if (/password/i.test(m)) return `Mot de passe refusé : ${m}`;
  if (/fetch|network/i.test(m)) return 'Serveur injoignable : réessayez plus tard.';
  return m || 'Erreur inconnue.';
}

// Les trois actions renvoient {ok, message}.
export async function connecter(email, mdp) {
  if (!client) return { ok: false, message: 'Comptes indisponibles.' };
  try {
    const { error } = await client.auth.signInWithPassword({ email, password: mdp });
    return error ? { ok: false, message: traduire(error) } : { ok: true };
  } catch (e) {
    return { ok: false, message: traduire(e) };
  }
}

export async function creerCompte(email, mdp) {
  if (!client) return { ok: false, message: 'Comptes indisponibles.' };
  if (mdp.length < MDP_MIN) return { ok: false, message: `Le mot de passe doit faire au moins ${MDP_MIN} caractères.` };
  try {
    const { data, error } = await client.auth.signUp({
      email, password: mdp,
      options: { emailRedirectTo: location.origin + location.pathname },
    });
    if (error) return { ok: false, message: traduire(error) };
    // Adresse déjà inscrite : Supabase renvoie un utilisateur sans identité, sans révéler le fait.
    return { ok: true, message: data.session
      ? 'Compte créé.'
      : 'Compte créé : un e-mail de confirmation vient d\'être envoyé. Cliquez sur le lien, puis connectez-vous.' };
  } catch (e) {
    return { ok: false, message: traduire(e) };
  }
}

export async function deconnecter() {
  if (!client) return;
  try {
    await client.auth.signOut();
  } catch {
    // Session purgée localement même si le serveur est injoignable.
    await client.auth.signOut({ scope: 'local' }).catch(() => {});
  }
}

export { MDP_MIN };
