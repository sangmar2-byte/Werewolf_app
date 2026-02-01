// app.js

// Firebase instances (créées à partir de la config dans index.html)
const auth = firebase.auth();
const db = firebase.firestore();
auth.getRedirectResult()
  .then((result) => {
    if (result.user) {
      console.log("Connexion Google OK :", result.user.uid);
      // rien d'autre ici, on laisse auth.onAuthStateChanged gérer la suite
    }
  })
  .catch((error) => {
    console.error("Erreur Google redirect:", error);
    alert("Erreur Google : " + error.message);
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
  const hash = window.location.hash || "#/";

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
  const app = document.getElementById("app");
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
            L’accès au jeu nécessite une connexion (Téléphone, Google ou Apple).
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
 * Render: Page de login (T0.2 – UI + logique Auth)
 */
function renderLogin() {
  const app = document.getElementById("app");
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
          <div class="field">
            <label class="label" for="phone">Téléphone (OTP SMS)</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              class="input"
              placeholder="+33 6 12 34 56 78"
            />
          </div>

          <div id="recaptcha-container"></div>

          <button type="button" class="btn btn-primary" id="btn-phone-login">
            Recevoir un code OTP
          </button>

          <div class="field">
            <span class="label">Ou continue avec</span>
            <button type="button" class="btn btn-outline" id="btn-google">
              Google
            </button>
            <button type="button" class="btn btn-outline" id="btn-apple">
              Apple
            </button>
          </div>

          <div class="field">
            <span class="label">Déjà connecté sur ce device ?</span>
            <button type="button" class="btn btn-outline btn-sm" id="btn-go-app">
              Aller à l’application
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
  const app = document.getElementById("app");
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

/**
 * Handlers de la page de login (T0.2)
 */
function setupLoginHandlers() {
  const phoneInput = document.getElementById("phone");
  const btnPhone = document.getElementById("btn-phone-login");
  const btnGoogle = document.getElementById("btn-google");
  const btnApple = document.getElementById("btn-apple");
  const btnGoApp = document.getElementById("btn-go-app");

  // Phone + OTP
  if (btnPhone) {
    btnPhone.addEventListener("click", async () => {
      const phoneNumber = (phoneInput?.value || "").trim();
      if (!phoneNumber) {
        alert("Merci de saisir un numéro de téléphone.");
        return;
      }

      try {
        if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
            "recaptcha-container",
            { size: "invisible" }
          );
        }

        const appVerifier = window.recaptchaVerifier;
        const confirmationResult = await auth.signInWithPhoneNumber(
          phoneNumber,
          appVerifier
        );

        const code = window.prompt("Entre le code OTP reçu par SMS :");
        if (!code) {
          alert("Code OTP manquant.");
          return;
        }

        await confirmationResult.confirm(code);
      } catch (err) {
        console.error(err);
        alert("Erreur OTP : " + err.message);
      }
    });
  }

// google

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();

  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

  if (isMobile) {
    auth.signInWithRedirect(provider);
  } else {
    auth.signInWithPopup(provider).catch((err) => {
      console.error("Erreur Google popup:", err);
      alert("Erreur Google : " + err.message);
    });
  }
}
if (btnGoogle) {
  btnGoogle.addEventListener("click", signInWithGoogle);
}

  // Apple (nécessite config côté Firebase + Apple)
  if (btnApple) {
    btnApple.addEventListener("click", async () => {
      try {
        const provider = new firebase.auth.OAuthProvider("apple.com");
        provider.addScope("email");
        provider.addScope("name");
        await auth.signInWithPopup(provider);
      } catch (err) {
        console.error(err);
        alert(
          "Erreur Apple : " +
            err.message +
            "\nVérifie la configuration Apple dans Firebase."
        );
      }
    });
  }

  if (btnGoApp) {
    btnGoApp.addEventListener("click", () => {
      if (!authState.isAuthenticated) {
        alert("Tu n’es pas connecté sur ce device.");
        return;
      }
      navigateTo("#/app/home");
    });
  }
}

/**
 * Listener global sur l’état d’authentification Firebase
 */
auth.onAuthStateChanged(async (user) => {
  authState.isAuthenticated = !!user;
  authState.uid = user ? user.uid : null;

  const hash = window.location.hash || "#/";

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
          // On met juste à jour le cache local
          setCurrentGameId(currentGameId);
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

        setCurrentGameId("");
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
window.addEventListener("load", () => {
  // Service worker désactivé pendant le développement pour éviter les problèmes de cache.
  // if ("serviceWorker" in navigator) {
  //   navigator.serviceWorker
  //     .register("./service-worker.js")
  //     .catch((err) => {
  //       console.warn("Service worker registration failed:", err);
  //     });
  // }

  router();
});