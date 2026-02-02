// app.js

// ==== Handlers d'erreurs globales (debug page blanche) ====
window.addEventListener("error", (event) => {
  console.error("[GLOBAL ERROR]", event.message, event.filename, event.lineno, event.colno, event.error);
  // Aide debug sur téléphone quand la console n'est pas visible
  alert("Erreur JS : " + event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[UNHANDLED REJECTION]", event.reason);
  alert("Erreur asynchrone : " + (event.reason && event.reason.message ? event.reason.message : event.reason));
});

// Vérifie si le stockage local est disponible (important pour Firebase Auth web)
function storageAvailable() {
  try {
    const testKey = "__lg_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

// Firebase instances (créées à partir de la config dans index.html)
const auth = firebase.auth();
const db = firebase.firestore();

console.log("[INIT] location:", window.location.href);
console.log("[INIT] userAgent:", navigator.userAgent);
console.log("[INIT] storageAvailable:", storageAvailable());

/* ==== Paramètres et helpers pour le lien magique email ==== */

// IMPORTANT : mets bien ton domaine Netlify ici
const ACTION_CODE_SETTINGS = {
  url: "https://loup-garou-hardcore.netlify.app/#/login",
  handleCodeInApp: true,
};

function rememberMagicLinkEmail(email) {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem("lg_magic_email", email);
  } catch (e) {
    console.warn("[magic-link] impossible de stocker l'email :", e);
  }
}

function getRememberedMagicLinkEmail() {
  if (!storageAvailable()) return null;
  try {
    return window.localStorage.getItem("lg_magic_email");
  } catch (e) {
    console.warn("[magic-link] impossible de lire l'email :", e);
    return null;
  }
}

function clearRememberedMagicLinkEmail() {
  if (!storageAvailable()) return;
  try {
    window.localStorage.removeItem("lg_magic_email");
  } catch (e) {
    console.warn("[magic-link] impossible d'effacer l'email :", e);
  }
}

// Gestion du retour Google après signInWithRedirect
auth
  .getRedirectResult()
  .then((result) => {
    console.log("[getRedirectResult] result:", result);

    if (result.user) {
      console.log("[getRedirectResult] user connecté:", result.user.uid);

      // FIX : si on revient sans hash (#), on force une route connue
      if (!window.location.hash || window.location.hash === "#") {
        const base = window.location.origin + window.location.pathname;
        console.log("[getRedirectResult] hash manquant, redirection vers #/login");
        window.location.replace(base + "#/login");
        return;
      }

      // onAuthStateChanged prendra le relais pour la navigation
      return;
    }

    // Aucun user après un redirect → cas typique "pas d'event auth"
    if (!result.user && storageAvailable() === false) {
      alert(
        "La connexion Google n'a pas pu être conservée.\n" +
          "Ton navigateur bloque le stockage (mode privé ou restrictions).\n" +
          "Utilise la connexion par e-mail pour jouer."
      );
    } else {
      console.log(
        "[getRedirectResult] Aucun utilisateur trouvé après la redirection."
      );
    }
  })
  .catch((error) => {
    console.error("[getRedirectResult] Erreur Google redirect:", error);

    let msg = "Erreur Google : " + error.message;

    if (error.code === "auth/unauthorized-domain") {
      msg =
        "Domaine non autorisé pour Google.\n" +
        "Vérifie dans Firebase Authentication → Paramètres → Domaines autorisés\n" +
        "que loup-garou-hardcore.netlify.app est bien présent.";
    } else if (error.code === "auth/operation-not-allowed") {
      msg =
        "La connexion Google n'est pas activée sur ce projet Firebase.\n" +
        "Active le fournisseur Google dans Firebase → Authentication → Méthode de connexion.";
    } else if (error.code === "auth/no-auth-event") {
      msg =
        "Google n'a pas renvoyé d'information de connexion.\n" +
        "Sur certains navigateurs (mode privé, blocage du stockage), la connexion Google ne fonctionne pas.\n" +
        "Utilise plutôt la connexion par e-mail.";
    }

    alert(msg);
  });

// État d'authentification (piloté par Firebase)
let authState = {
  isAuthenticated: false,
  uid: null,
};

// Optionnel : mémoriser la route d’App qu’on voulait atteindre
let pendingAppRoute = null;

/**
 * Helper navigation
 */
function navigateTo(hash, options = {}) {
  if (options.replace) {
    const base = window.location.href.split("#")[0];
    window.history.replaceState(null, "", base + hash);
    router();
  } else {
    window.location.hash = hash;
  }
}

/**
 * Router simple basé sur location.hash
 * Ici : seulement les routes publiques + garde pour /app/*
 */
function router() {
  let hash = window.location.hash;
  // FIX : sécuriser les cas où le hash est vide ou juste "#"
  if (!hash || hash === "#") {
    hash = "#/";
  }

  console.log("[router] hash =", hash);

  // Garde : toute route /app/* nécessite l’auth
  if (hash.startsWith("#/app/")) {
    if (!authState.isAuthenticated) {
      pendingAppRoute = hash; // on mémorise où l’utilisateur voulait aller
      navigateTo("#/login", { replace: true });
      return;
    }

    // Délègue la route à game.js
    if (typeof handleAppRoute === "function") {
      handleAppRoute(hash);
      return;
    } else {
      // sécurité : si game.js n’est pas chargé
      navigateTo("#/app/home", { replace: true });
      return;
    }
  }

  // Si user authentifié et tente /login, on le pousse vers l’app
  if (hash === "#/login" && authState.isAuthenticated) {
    navigateTo(pendingAppRoute || "#/app/home", { replace: true });
    pendingAppRoute = null;
    return;
  }

  // Routes publiques
  switch (hash) {
    case "#/":
      renderLanding();
      break;
    case "#/login":
      renderLogin();
      break;
    case "#/rules":
      renderRules();
      break;
    default:
      // 404 → accueil public
      navigateTo("#/");
      break;
  }
}

/**
 * Render: Landing publique
 */
function renderLanding() {
  console.log("[renderLanding]");
  const app = document.getElementById("app");
  if (!app) {
    console.error("[renderLanding] #app introuvable");
    return;
  }

  app.innerHTML = `
    <div class="shell">
      <div class="card">
        <div class="game-badge">
          <span class="game-badge-dot"></span>
          <span>Jeu IRL</span>
        </div>

        <h1 class="game-title">Loup-garou IRL – hardcore</h1>
        <p class="game-subtitle">
          Un jeu de rôles cachés à vivre en vrai, sur plusieurs jours, avec gestion
          complète des pouvoirs, votes et messages via l’application.
        </p>

        <div class="hero-visual">
          <p class="hero-tagline">
            Le village ne dort jamais vraiment. Les Loups-garous non plus.
          </p>
          <p class="hero-meta">
            • Gestion : <strong>MJ + application</strong><br />
            • Durée : <strong>7 jours / 7 nuits par défaut</strong><br />
            • Camps : <strong>Villageois, Loups-garous et Occultes</strong><br />
            • Rôles : <strong>13 rôles répartis entre tous les joueurs</strong>
          </p>
        </div>

        <section class="section">
          <h2 class="section-title">Ce que fait l’application</h2>
          <ul class="section-list">
            <li>
              <span class="section-bullet"></span>
              <span>Création et gestion de partie par le MJ (formats en fonction du nombre de joueurs).</span>
            </li>
            <li>
              <span class="section-bullet"></span>
              <span>Attribution secrète des camps et des rôles, avec préférences par joueur.</span>
            </li>
            <li>
              <span class="section-bullet"></span>
              <span>Votes, pouvoirs, historiques personnels et logs système centralisés.</span>
            </li>
          </ul>
        </section>

        <section class="section">
          <h2 class="section-title">Confidentialité & règles</h2>
          <ul class="section-list">
            <li>
              <span class="section-bullet"></span>
              <span>Aucune capture d’écran ou photo de l’App ne peut servir de preuve en jeu.</span>
            </li>
            <li>
              <span class="section-bullet"></span>
              <span>La parole est libre, les morts peuvent continuer à parler mais restent affiliés à leur camp.</span>
            </li>
            <li>
              <span class="section-bullet"></span>
              <span>Les informations affichées sont personnelles : il est interdit de MONTRER son écran à un autre joueur.</span>
            </li>
          </ul>
        </section>

        <div class="notice-card">
          <div class="notice-title">Message important</div>
          <p class="notice-text">
            Toute information non produite par l’application est non vérifiable
            et ne peut jamais être considérée comme une preuve.
          </p>
        </div>

        <div class="cta-block">
          <button class="btn btn-primary" id="btn-start">
            Commencer / Rejoindre une partie
          </button>
          <button class="btn btn-outline btn-sm" id="btn-privacy">
            Voir les règles complètes &amp; confidentialité
          </button>
          <p class="cta-subtext">
            L’accès au jeu nécessite une connexion (e-mail ou Google).
          </p>
        </div>

        <div class="footer">
          Version alpha • Données stockées côté serveur et synchronisées sur ton téléphone.
        </div>
      </div>
    </div>
  `;

  document.getElementById("btn-start")?.addEventListener("click", () => {
    navigateTo("#/login");
  });

  document.getElementById("btn-privacy")?.addEventListener("click", () => {
    navigateTo("#/rules");
  });
}

/**
 * Render: Page de login (email magique + Google)
 */
function renderLogin() {
  console.log("[renderLogin]");
  const app = document.getElementById("app");
  if (!app) {
    console.error("[renderLogin] #app introuvable");
    return;
  }

  app.innerHTML = `
    <div class="shell">
      <div class="card">
        <div class="game-badge">
          <span class="game-badge-dot"></span>
          <span>Connexion requise</span>
        </div>

        <h1 class="login-title">Connexion au village</h1>
        <p class="login-description">
          Choisis ta méthode de connexion. Sans authentification, tu ne peux ni
          créer ni rejoindre une partie.
        </p>

        <form class="form" id="login-form" onsubmit="return false;">
          <!-- Connexion par e-mail (lien magique) -->
          <div class="field">
            <label class="label" for="email">Adresse e-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              class="input"
              placeholder="ex : joueur@exemple.com"
              autocomplete="email"
            />
          </div>

          <button type="button" class="btn btn-primary" id="btn-email-link">
            Recevoir un lien par e-mail
          </button>

          <div class="field">
            <span class="label">Ou continue avec</span>
            <button type="button" class="btn btn-outline" id="btn-google">
              Google
            </button>
          </div>
        </form>

        <div class="footer">
          Tes identifiants servent uniquement à gérer ton compte joueur et tes parties.
        </div>
      </div>
    </div>
  `;

  setupLoginHandlers();
}

/**
 * Render: Règles & confidentialité
 */
function renderRules() {
  console.log("[renderRules]");
  const app = document.getElementById("app");
  if (!app) {
    console.error("[renderRules] #app introuvable");
    return;
  }

  app.innerHTML = `
    <div class="shell">
      <div class="card">
        <div class="game-badge">
          <span class="game-badge-dot"></span>
          <span>Règles & Confidentialité</span>
        </div>

        <h1 class="login-title">Règles générales du jeu</h1>
        <p class="login-description">
          Cette page présentera les règles détaillées du jeu, les rôles, les camps,
          ainsi que la politique de confidentialité de l’application.
        </p>

        <section class="section">
          <h2 class="section-title">Principes clés</h2>
          <ul class="section-list">
            <li>
              <span class="section-bullet"></span>
              <span>Tout se fait sur l’application : votes, pouvoirs, communication avec les MJ.</span>
            </li>
            <li>
              <span class="section-bullet"></span>
              <span>Les morts sont annoncés, mais leurs rôles et camps ne le sont pas par défaut.</span>
            </li>
            <li>
              <span class="section-bullet"></span>
              <span>Un joueur mort peut continuer à parler et reste affilié à son camp.</span>
            </li>
          </ul>
        </section>

        <div class="notice-card">
          <div class="notice-title">Message important</div>
          <p class="notice-text">
            Toute information non produite par l’application est non vérifiable
            et ne peut jamais être considérée comme une preuve.
          </p>
        </div>

        <div class="cta-block">
          <button class="btn btn-outline" id="btn-back-home">
            Retour à l’accueil
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btn-back-home")?.addEventListener("click", () => {
    navigateTo("#/");
  });
}

/* ==== Helpers d'environnement et Google Sign-in ==== */

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isStandalonePWA() {
  const mq =
    window.matchMedia && window.matchMedia("(display-mode: standalone)");
  return (mq && mq.matches) || window.navigator.standalone === true;
}

function isEmbeddedBrowser() {
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line\/|Twitter/i.test(ua);
}

function signInWithGoogle() {
  if (isIOS() && isStandalonePWA()) {
    alert(
      "La connexion Google n'est pas supportée en mode 'application' sur iPhone.\n" +
        "Ouvre le site dans Safari ou utilise la connexion par e-mail."
    );
    return;
  }

  if (isEmbeddedBrowser()) {
    alert(
      "La connexion Google ne fonctionne pas dans ce navigateur intégré.\n" +
        "Ouvre le lien dans le navigateur de ton téléphone (Safari / Chrome)\n" +
        "ou utilise la connexion par e-mail."
    );
    return;
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

  if (isMobile) {
    console.log("[Google] signInWithRedirect");
    auth
      .signInWithRedirect(provider)
      .catch((err) => {
        console.error("Erreur Google redirect:", err);
        alert("Erreur Google : " + err.message);
      });
  } else {
    console.log("[Google] signInWithPopup");
    auth
      .signInWithPopup(provider)
      .catch((err) => {
        console.error("Erreur Google popup:", err);
        alert("Erreur Google : " + err.message);
      });
  }
}

/**
 * Handlers de la page de login (email + Google)
 */
function setupLoginHandlers() {
  const emailInput = document.getElementById("email");
  const btnEmailLink = document.getElementById("btn-email-link");
  const btnGoogle = document.getElementById("btn-google");

  // Envoi du lien magique
  async function sendMagicLink() {
    const email = (emailInput?.value || "").trim();
    if (!email) {
      alert("Merci de saisir ton adresse e-mail.");
      return;
    }

    try {
      rememberMagicLinkEmail(email);
      await auth.sendSignInLinkToEmail(email, ACTION_CODE_SETTINGS);

      alert(
        "Un lien de connexion t'a été envoyé.\n" +
          "Clique dessus depuis ta boîte mail pour te connecter au village. Regarde dans tes spams."
      );
    } catch (err) {
      console.error("[magic-link] erreur:", err);
      alert("Erreur lors de l'envoi du lien : " + err.message);
    }
  }

  if (btnEmailLink) {
    btnEmailLink.addEventListener("click", sendMagicLink);
  }

  if (btnGoogle) {
    btnGoogle.addEventListener("click", signInWithGoogle);
  }
}

/**
 * Traite un éventuel lien magique email à l'arrivée sur la page
 */
async function handleEmailLinkSignInIfNeeded() {
  try {
    if (!firebase.auth().isSignInWithEmailLink(window.location.href)) {
      return; // pas un lien magique
    }

    let email = getRememberedMagicLinkEmail();
    if (!email) {
      email = window.prompt(
        "Entre l'adresse e-mail que tu as utilisée pour recevoir ce lien :"
      );
      if (!email) {
        alert("Connexion annulée : e-mail manquant.");
        return;
      }
    }

    const result = await auth.signInWithEmailLink(
      email,
      window.location.href
    );
    console.log("[magic-link] connexion OK:", result.user.uid);
    clearRememberedMagicLinkEmail();

    // Nettoyage de l'URL (on reste sur #/login, onAuthStateChanged redirigera)
    const base = window.location.origin + window.location.pathname + "#/login";
    window.history.replaceState(null, "", base);
  } catch (err) {
    console.error("[magic-link] erreur de connexion:", err);
    alert("Erreur lors de la connexion avec le lien : " + err.message);
  }
}

/**
 * Listener global sur l’état d’authentification Firebase
 */
auth.onAuthStateChanged(async (user) => {
  authState.isAuthenticated = !!user;
  authState.uid = user ? user.uid : null;

  let hash = window.location.hash;
  if (!hash || hash === "#") {
    hash = "#/";
  }

  console.log("[onAuthStateChanged] user:", !!user, user && user.uid, "hash:", hash);

  // Utilisateur déconnecté
  if (!authState.isAuthenticated) {
    // Si on était sur une route /app/* → pousser vers /login
    if (hash.startsWith("#/app/")) {
      navigateTo("#/login", { replace: true });
    }
    return;
  }

  // Utilisateur connecté : on demande au serveur s'il appartient déjà à une partie
  try {
    const userDoc = await db.collection("users").doc(authState.uid).get();
    const data = userDoc.exists ? userDoc.data() : null;
    const currentGameId = data?.current_game_id || null;

    if (currentGameId) {
      // Vérifier que la partie existe toujours
      const gameSnap = await db.collection("games").doc(currentGameId).get();

      if (gameSnap.exists) {
        // La partie existe → on va au lobby de cette partie,
        // quel que soit ce qu'il y avait dans le hash (sauf si on y est déjà).
        if (!hash.startsWith("#/app/game/")) {
          navigateTo(`#/app/game/${currentGameId}`, { replace: true });
        } else {
          // On met juste à jour le cache local, si la fonction existe
          if (typeof setCurrentGameId === "function") {
            setCurrentGameId(currentGameId);
          }
        }
        return;
      } else {
        // La partie a été supprimée entre temps :
        // on nettoie côté serveur + petit flag pour afficher "Partie supprimée"
        await db
          .collection("users")
          .doc(authState.uid)
          .set(
            {
              current_game_id: null,
              current_game_role: null,
              last_update_at: firebase.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

        if (typeof setCurrentGameId === "function") {
          setCurrentGameId("");
        }
        if (typeof markLastGameDeleted === "function") {
          markLastGameDeleted();
        }
      }
    }
  } catch (e) {
    console.error("[auth.onAuthStateChanged] erreur reprise de partie :", e);
    // En cas d'erreur, on laisse tomber et on continue le flow normal.
  }

  // Flow normal si aucune partie courante (ou partie supprimée)
  if (hash === "#/login" || hash === "#/") {
    navigateTo(pendingAppRoute || "#/app/home", { replace: true });
    pendingAppRoute = null;
  }
});

// Initialisation générale
window.addEventListener("hashchange", router);
window.addEventListener("load", async () => {
  console.log("[load] start, href:", window.location.href);

  // 1. Si on arrive via un lien magique email, on le traite d'abord
  try {
    if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
      console.log("[load] lien magique détecté");
      await handleEmailLinkSignInIfNeeded();
    } else {
      console.log("[load] pas de lien magique");
    }
  } catch (e) {
    console.error("[load] erreur check email link:", e);
  }

  // 2. Puis on route
  router();
});