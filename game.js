// game.js
// Gestion des routes /app/* : home MJ, création de partie, lobby, etc.

console.log("[game.js] chargé");

const DEFAULT_MJ_MESSAGE =
  "Bienvenue dans la partie. Attendez les consignes du MJ avant de commencer à comploter.";

const LG_CURRENT_GAME_KEY = "lg_current_game_id";
const LG_LAST_GAME_DELETED_KEY = "lg_last_game_deleted";

let gameDocUnsub = null; // écoute temps réel sur /games/{id}

// --- Helpers stockage local ---

function getCurrentGameId() {
  try {
    return localStorage.getItem(LG_CURRENT_GAME_KEY) || "";
  } catch (e) {
    console.warn("Impossible de lire localStorage:", e);
    return "";
  }
}

function setCurrentGameId(gameId) {
  try {
    if (gameId) {
      localStorage.setItem(LG_CURRENT_GAME_KEY, gameId);
    } else {
      localStorage.removeItem(LG_CURRENT_GAME_KEY);
    }
  } catch (e) {
    console.warn("Impossible d'écrire dans localStorage:", e);
  }
}

// --- Helpers Firestore côté serveur pour l'état utilisateur ---

async function setUserCurrentGame(uid, gameId, role) {
  if (!uid) return;
  const now = firebase.firestore.FieldValue.serverTimestamp();

  const payload = {
    last_update_at: now,
  };

  if (gameId) {
    payload.current_game_id = gameId;
    payload.current_game_role = role || null; // "mj" | "player"
  } else {
    payload.current_game_id = null;
    payload.current_game_role = null;
  }

  try {
    await db.collection("users").doc(uid).set(payload, { merge: true });
  } catch (e) {
    console.error("[setUserCurrentGame] erreur :", e);
  }
}

function markLastGameDeleted() {
  try {
    sessionStorage.setItem(LG_LAST_GAME_DELETED_KEY, "1");
  } catch (e) {
    console.warn("Impossible d'écrire dans sessionStorage:", e);
  }
}

function consumeLastGameDeletedFlag() {
  try {
    const v = sessionStorage.getItem(LG_LAST_GAME_DELETED_KEY);
    if (v) {
      sessionStorage.removeItem(LG_LAST_GAME_DELETED_KEY);
      return true;
    }
    return false;
  } catch (e) {
    console.warn("Impossible de lire dans sessionStorage:", e);
    return false;
  }
}

// --- Router pour /app/* ---

function handleAppRoute(hash) {
  console.log("[game.js] handleAppRoute", hash);

  const currentGameId = getCurrentGameId();

  // Si on a une partie courante, on bloque l'accès à home / création
  if (
    currentGameId &&
    (hash === "#/app/home" || hash === "#/app/game/new")
  ) {
    console.log(
      "[game.js] Redirection vers le lobby courant depuis",
      hash,
      "->",
      currentGameId
    );
    navigateTo(`#/app/game/${currentGameId}`);
    return;
  }

  if (hash === "#/app/home") {
    renderAppHome();
    return;
  }

  if (hash === "#/app/game/new") {
    renderGameCreate();
    return;
  }

  if (hash.startsWith("#/app/game/")) {
    const gameId = hash.replace("#/app/game/", "");
    renderGameLobby(gameId);
    return;
  }

  navigateTo("#/app/home");
}

// --- Accueil app (création / rejoindre) ---

function renderAppHome() {
  console.log("[game.js] renderAppHome, uid =", authState.uid);
  const app = document.getElementById("app");

  const showDeletedMsg = consumeLastGameDeletedFlag();

  app.innerHTML = `
    <div class="shell">
      <div class="card">

        <!-- Bouton paramètres -->
        <button
          id="btn-settings"
          type="button"
          style="
            position:absolute;
            top:16px;
            right:18px;
            width:32px;
            height:32px;
            border-radius:999px;
            border:1px solid rgba(148,163,184,0.5);
            background:rgba(15,23,42,0.9);
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:16px;
          "
        >
          ⚙️
        </button>

        <!-- Panneau latéral paramètres -->
        <div
          id="settings-panel"
          style="
            position:fixed;
            top:0;
            right:0;
            height:100%;
            width:70%;
            max-width:320px;
            background:rgba(15,23,42,0.98);
            box-shadow:-4px 0 16px rgba(0,0,0,0.5);
            transform:translateX(100%);
            transition:transform 0.2s ease-out;
            z-index:40;
            padding:16px;
            display:flex;
            flex-direction:column;
            gap:12px;
          "
        >
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-weight:600;font-size:15px;">Paramètres</span>
            <button
              id="btn-settings-close"
              type="button"
              style="
                border:none;
                background:transparent;
                font-size:20px;
                line-height:1;
              "
            >
              ✕
            </button>
          </div>

          <button
            id="btn-settings-logout"
            type="button"
            class="btn btn-outline btn-sm"
            style="width:100%;"
          >
            Se déconnecter
          </button>
        </div>

        <!-- Overlay fond pour fermer le panneau -->
        <div
          id="settings-backdrop"
          style="
            position:fixed;
            inset:0;
            background:rgba(15,23,42,0.6);
            opacity:0;
            pointer-events:none;
            transition:opacity 0.2s ease-out;
            z-index:30;
          "
        ></div>

        ${
          showDeletedMsg
            ? `
          <div class="notice-card" style="margin-top:8px;">
            <div class="notice-title">Partie supprimée</div>
            <p class="notice-text">
              La partie à laquelle tu participais a été supprimée par le MJ.
              Tu peux créer ou rejoindre une nouvelle partie.
            </p>
          </div>
        `
            : ""
        }

        <section class="section" style="margin-top:16px;">
          <h2 class="section-title">Créer une partie (MJ)</h2>
          <div class="cta-block">
            <button class="btn btn-primary" id="btn-create-game">
              Créer une partie (MJ)
            </button>
          </div>
        </section>

        <section class="section">
          <h2 class="section-title">Rejoindre une partie</h2>
          <div class="field">
            <label class="label" for="join_code">ID de la partie</label>
            <input
              id="join_code"
              name="join_code"
              type="text"
              class="input"
              placeholder="Ex : DrjasLvdECczfRFVfnch"
            />
          </div>
          <div class="cta-block">
            <button class="btn btn-outline" id="btn-join-game">
              Rejoindre la partie
            </button>
          </div>
        </section>
      </div>
    </div>
  `;

  // Paramètres
  const panel = document.getElementById("settings-panel");
  const backdrop = document.getElementById("settings-backdrop");

  function openSettings() {
    if (!panel || !backdrop) return;
    panel.style.transform = "translateX(0)";
    backdrop.style.opacity = "1";
    backdrop.style.pointerEvents = "auto";
  }

  function closeSettings() {
    if (!panel || !backdrop) return;
    panel.style.transform = "translateX(100%)";
    backdrop.style.opacity = "0";
    backdrop.style.pointerEvents = "none";
  }

  document.getElementById("btn-settings")?.addEventListener("click", openSettings);
  document
    .getElementById("btn-settings-close")
    ?.addEventListener("click", closeSettings);
  backdrop?.addEventListener("click", closeSettings);

  document
    .getElementById("btn-settings-logout")
    ?.addEventListener("click", () => {
      // On NE vide PAS lg_current_game_id ici : au prochain login,
      // on tentera de revenir dans la même partie.
      auth
        .signOut()
        .catch((err) => {
          alert("Erreur lors de la déconnexion : " + err.message);
        })
        .finally(() => {
          closeSettings();
          navigateTo("#/login");
        });
    });

  // Actions
  document.getElementById("btn-create-game")?.addEventListener("click", () => {
    navigateTo("#/app/game/new");
  });

  document
    .getElementById("btn-join-game")
    ?.addEventListener("click", handleJoinGameFromHome);
}

/**
 * Depuis l'accueil, rejoindre une partie via son ID
 */
async function handleJoinGameFromHome() {
  if (!authState.uid) {
    alert("Tu dois être connecté pour rejoindre une partie.");
    navigateTo("#/login");
    return;
  }

  const input = document.getElementById("join_code");
  const raw = (input?.value || "").trim();

  if (!raw) {
    alert("Merci de saisir l'ID de la partie (fourni par le MJ).");
    return;
  }

  const gameId = raw;

  try {
    const docSnap = await db.collection("games").doc(gameId).get();
    if (!docSnap.exists) {
      alert("Aucune partie trouvée avec cet ID. Vérifie avec le MJ.");
      return;
    }

    const game = docSnap.data();

    // Le MJ ne peut pas s'inscrire comme joueur
    if (game.mj_uid === authState.uid) {
      alert("Tu es déjà MJ de cette partie, tu ne peux pas t’y inscrire comme joueur.");
      setCurrentGameId(gameId);
      navigateTo(`#/app/game/${gameId}`);
      return;
    }

    if (game.status !== "draft") {
      alert("Cette partie n'est plus en phase de préparation (draft). Demande au MJ.");
      return;
    }

    renderPlayerForm(gameId, game);
  } catch (err) {
    console.error(err);
    alert("Erreur lors de la recherche de la partie : " + err.message);
  }
}

/**
 * Formulaire joueur pour une partie donnée
 */
async function renderPlayerForm(gameId, gameMeta) {
  const app = document.getElementById("app");

  if (!authState.uid) {
    navigateTo("#/login");
    return;
  }

  let existingName = "";
  let existingPref = "all";

  try {
    const playerRef = db
      .collection("games")
      .doc(gameId)
      .collection("players")
      .doc(authState.uid);

    const snap = await playerRef.get();
    if (snap.exists) {
      const data = snap.data();
      existingName = data.display_name || data.name || "";
      existingPref = data.role_pref || "all";
    }
  } catch (err) {
    console.error("Erreur lecture joueur existant:", err);
  }

  app.innerHTML = `
    <div class="shell">
      <div class="card">
        <div class="game-badge">
          <span class="game-badge-dot"></span>
          <span>Rejoindre la partie</span>
        </div>

        <h1 class="login-title">Tes informations joueur</h1>
        <p class="login-description">
          Ces informations seront visibles par le MJ et utilisées pour équilibrer
          la répartition des rôles.
        </p>

        <section class="section">
          <h2 class="section-title">Partie</h2>
          <ul class="section-list">
            <li>
              <span class="section-bullet"></span>
              <span>
                <strong>ID :</strong>
                <code style="font-size:11px;">${gameId}</code>
              </span>
            </li>
            ${
              gameMeta
                ? `
              <li>
                <span class="section-bullet"></span>
                <span>
                  <strong>Mode :</strong>
                  ${
                    gameMeta.phase_mode === "manual"
                      ? "Manuel (MJ déclenche)"
                      : "Automatique (horaires fixes)"
                  }
                </span>
              </li>
              <li>
                <span class="section-bullet"></span>
                <span>
                  <strong>Durée :</strong> ${gameMeta.days || 7} jours
                </span>
              </li>
              `
                : ""
            }
          </ul>
        </section>

        <section class="section">
          <h2 class="section-title">Tes préférences</h2>

          <div class="field">
            <label class="label" for="player_name">Prénom affiché</label>
            <input
              id="player_name"
              name="player_name"
              type="text"
              class="input"
              placeholder="Ex : Adonis"
              value="${existingName || ""}"
            />
          </div>

          <div class="field">
            <label class="label" for="role_pref">Préférence de rôle</label>
            <select id="role_pref" name="role_pref" class="input">
              <option value="simple" ${
                existingPref === "simple" ? "selected" : ""
              }>
                Plutôt simple (rôle facile à jouer)
              </option>
              <option value="medium" ${
                existingPref === "medium" ? "selected" : ""
              }>
                Moyen (un peu de gestion)
              </option>
              <option value="complex" ${
                existingPref === "complex" ? "selected" : ""
              }>
                Complexe (rôle à responsabilités)
              </option>
              <option value="all" ${
                existingPref === "all" ? "selected" : ""
              }>
                Tout me va
              </option>
            </select>
          </div>
        </section>

        <div class="cta-block">
          <button class="btn btn-primary" id="btn-save-player">
            Enregistrer et aller au lobby
          </button>
          <button class="btn btn-outline btn-sm" id="btn-cancel-player">
            Annuler
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btn-save-player")?.addEventListener("click", () => {
    savePlayerInfoAndGoToLobby(gameId);
  });

  document.getElementById("btn-cancel-player")?.addEventListener("click", () => {
    navigateTo("#/app/home");
  });
}

/**
 * Enregistre le joueur puis redirige vers le lobby.
 */
async function savePlayerInfoAndGoToLobby(gameId) {
  if (!authState.uid) {
    alert("Tu dois être connecté.");
    navigateTo("#/login");
    return;
  }

  const nameEl = document.getElementById("player_name");
  const prefEl = document.getElementById("role_pref");

  const name = (nameEl?.value || "").trim();
  const rolePref = prefEl?.value || "all";

  if (!name) {
    alert("Merci de renseigner ton prénom affiché.");
    return;
  }

  try {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const playerRef = db
      .collection("games")
      .doc(gameId)
      .collection("players")
      .doc(authState.uid);

    const snap = await playerRef.get();
    const existing = snap.exists ? snap.data() : null;

    await playerRef.set(
      {
        uid: authState.uid,
        display_name: name,
        role_pref: rolePref,
        joined_at: existing?.joined_at || now,
        updated_at: now,
      },
      { merge: true }
    );

    // On marque cette partie comme courante (persiste après déconnexion)
    setCurrentGameId(gameId);
    await setUserCurrentGame(authState.uid, gameId, "player");

    navigateTo(`#/app/game/${gameId}`);
  } catch (err) {
    console.error(err);
    alert("Erreur lors de l'enregistrement de tes infos : " + err.message);
  }
}

// --- Création de partie (MJ) ---

function renderGameCreate() {
  const app = document.getElementById("app");
  if (!authState.uid) {
    navigateTo("#/login");
    return;
  }

  app.innerHTML = `
    <div class="shell">
      <div class="card">
        <div class="game-badge">
          <span class="game-badge-dot"></span>
          <span>Création de partie (MJ)</span>
        </div>

        <h1 class="login-title">Configurer ta partie</h1>
        <p class="login-description">
          La partie sera créée en <strong>status = draft</strong>. Tu pourras encore
          ajuster les paramètres tant qu’elle n’est pas lancée.
        </p>

        <form class="form" id="game-form" onsubmit="return false;">
          <div class="field">
            <label class="label" for="phase_mode">Mode de déclenchement des phases</label>
            <select id="phase_mode" class="input" name="phase_mode">
              <option value="auto">Automatique (horaires fixes)</option>
              <option value="manual">Manuel (le MJ déclenche)</option>
            </select>
          </div>

          <div class="field">
            <label class="label" for="days">Nombre de jours</label>
            <input
              id="days"
              name="days"
              type="number"
              min="1"
              max="14"
              value="7"
              class="input"
            />
          </div>

          <div class="field">
            <label class="label" for="kills_per_night">Morts LG par nuit</label>
            <input
              id="kills_per_night"
              name="kills_per_night"
              type="number"
              min="0"
              max="5"
              value="1"
              class="input"
            />
          </div>

          <div class="field">
            <label class="label" for="max_lynch_per_day">Morts par vote (lynchage) par jour</label>
            <input
              id="max_lynch_per_day"
              name="max_lynch_per_day"
              type="number"
              min="0"
              max="5"
              value="1"
              class="input"
            />
          </div>

          <div class="field">
            <label class="label" for="roles_preset">Rôles activés (preset)</label>
            <select id="roles_preset" class="input" name="roles_preset">
              <option value="default">Default (équilibré)</option>
              <option value="no_politics">Sans rôles politiques</option>
              <option value="hardcore">Hardcore (plus de rôles spéciaux)</option>
            </select>
          </div>

          <div class="field">
            <label class="label" for="win_conditions_preset">Conditions de victoire</label>
            <select id="win_conditions_preset" class="input" name="win_conditions_preset">
              <option value="default">Default (classique)</option>
              <option value="time_limited">Limite de jours stricte</option>
            </select>
          </div>

          <div class="cta-block">
            <button type="button" class="btn btn-primary" id="btn-save-game">
              Créer la partie (status = draft)
            </button>
            <button type="button" class="btn btn-outline btn-sm" id="btn-cancel-game">
              Annuler
            </button>
          </div>
        </form>

        <div class="footer">
          Le format sera déterminé automatiquement au lancement de la partie,
          pas à la création.
        </div>
      </div>
    </div>
  `;

  document.getElementById("btn-save-game")?.addEventListener("click", createGameFromForm);
  document.getElementById("btn-cancel-game")?.addEventListener("click", () => {
    navigateTo("#/app/home");
  });
}

/**
 * Création du document Firestore et redirection vers le lobby
 */
async function createGameFromForm() {
  if (!authState.uid) {
    alert("Tu dois être connecté pour créer une partie.");
    navigateTo("#/login");
    return;
  }

  const phaseModeEl = document.getElementById("phase_mode");
  const daysEl = document.getElementById("days");
  const killsEl = document.getElementById("kills_per_night");
  const lynchEl = document.getElementById("max_lynch_per_day");
  const rolesPresetEl = document.getElementById("roles_preset");
  const winPresetEl = document.getElementById("win_conditions_preset");

  const phase_mode = phaseModeEl?.value || "auto";
  const days = parseInt(daysEl?.value || "7", 10) || 7;
  const kills_per_night = parseInt(killsEl?.value || "1", 10) || 1;
  const max_lynch_per_day = parseInt(lynchEl?.value || "1", 10) || 1;
  const roles_preset = rolesPresetEl?.value || "default";
  const win_conditions_preset = winPresetEl?.value || "default";

  if (days < 1 || days > 14) {
    alert("Le nombre de jours doit être entre 1 et 14.");
    return;
  }

  try {
    const now = firebase.firestore.FieldValue.serverTimestamp();

    const gameData = {
      mj_uid: authState.uid,
      status: "draft",
      created_at: now,
      updated_at: now,
      phase_mode,
      days,
      kills_per_night,
      max_lynch_per_day,
      roles_preset,
      win_conditions_preset,
      mj_message: DEFAULT_MJ_MESSAGE,
      join_code: null
    };

    const docRef = await db.collection("games").add(gameData);

    await docRef.update({ join_code: docRef.id });

    // MJ : mémoriser la partie côté serveur + en local (cache)
    setCurrentGameId(docRef.id);
    await setUserCurrentGame(authState.uid, docRef.id, "mj");

    // Aller au lobby
    navigateTo(`#/app/game/${docRef.id}`);
  } catch (err) {
    console.error(err);
    alert("Erreur lors de la création de la partie : " + err.message);
  }
}

// --- Lancer la partie (MJ) ---

async function startGame(gameId) {
  if (!authState.uid) {
    alert("Tu dois être connecté.");
    navigateTo("#/login");
    return;
  }

  if (!gameId) {
    alert("ID de partie manquant.");
    return;
  }

  try {
    const gameRef = db.collection("games").doc(gameId);
    const snap = await gameRef.get();

    if (!snap.exists) {
      alert("Partie introuvable.");
      return;
    }

    const game = snap.data();

    if (game.mj_uid !== authState.uid) {
      alert("Seul le MJ peut lancer la partie.");
      return;
    }

    if (game.status !== "draft") {
      alert("La partie est déjà lancée ou terminée.");
      return;
    }

    const now = firebase.firestore.FieldValue.serverTimestamp();

    await gameRef.update({
      status: "running",
      phase: "night",
      day_index: 1,
      started_at: now,
      updated_at: now,
    });

    // Le onSnapshot sur /games/{id} (renderGameLobby) se chargera
    // d'envoyer tout le monde sur renderGameRunning.
  } catch (err) {
    console.error("[startGame] erreur :", err);
    alert("Erreur lors du lancement de la partie : " + err.message);
  }
}

// --- Lobby d'une partie (abonnement temps réel sur /games/{id}) ---

async function renderGameLobby(gameId) {
  const app = document.getElementById("app");

  if (!authState.uid) {
    navigateTo("#/login");
    return;
  }

  if (!gameId) {
    app.innerHTML = `
      <div class="shell">
        <div class="card">
          <h1 class="login-title">Erreur</h1>
          <p class="login-description">
            ID de partie manquant.
          </p>
          <div class="cta-block">
            <button class="btn btn-outline" onclick="navigateTo('#/app/home')">
              Retour à l’accueil
            </button>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // Écran de chargement initial
  app.innerHTML = `
    <div class="shell">
      <div class="card">
        <div class="game-badge">
          <span class="game-badge-dot"></span>
          <span>Lobby de la partie</span>
        </div>
        <h1 class="login-title">Chargement du lobby...</h1>
        <p class="login-description">
          Récupération des informations de la partie.
        </p>
      </div>
    </div>
  `;

  // On coupe l'ancienne écoute sur ce doc si elle existe
  if (typeof gameDocUnsub === "function") {
    gameDocUnsub();
    gameDocUnsub = null;
  }

  try {
    const docRef = db.collection("games").doc(gameId);

    // Abonnement temps réel sur le document /games/{id}
    gameDocUnsub = docRef.onSnapshot(
      async (docSnap) => {
        // Partie supprimée ou inexistante
        if (!docSnap.exists) {
          setCurrentGameId("");
          if (typeof setUserCurrentGame === "function" && authState.uid) {
            await setUserCurrentGame(authState.uid, null, null);
          }
          if (typeof markLastGameDeleted === "function") {
            markLastGameDeleted();
          }
          navigateTo("#/app/home");
          return;
        }

        const game = docSnap.data();
        const joinCode = game.join_code || docSnap.id;
        const isMj = game.mj_uid === authState.uid;
        const isDraft = game.status === "draft";

        // Vérifie si l'utilisateur est déjà joueur inscrit
        let isCurrentPlayer = false;
        try {
          const playerSnap = await docRef
            .collection("players")
            .doc(authState.uid)
            .get();
          isCurrentPlayer = playerSnap.exists;
        } catch (e) {
          console.warn("[renderGameLobby] Erreur détection joueur courant:", e);
        }

        // Garde d'accès : si l'utilisateur n'est ni MJ ni joueur
        if (!isMj && !isCurrentPlayer) {
          if (isDraft) {
            console.log(
              "[renderGameLobby] Utilisateur non membre -> formulaire joueur"
            );

            // On nettoie les pointeurs "partie courante"
            setCurrentGameId("");
            if (typeof setUserCurrentGame === "function" && authState.uid) {
              await setUserCurrentGame(authState.uid, null, null);
            }

            // On se désabonne du doc de partie pour ne pas rappeler ce callback
            if (typeof gameDocUnsub === "function") {
              gameDocUnsub();
              gameDocUnsub = null;
            }

            await renderPlayerForm(gameId, game);
            return;
          }

          console.log(
            "[renderGameLobby] Utilisateur non membre et partie non draft -> home"
          );

          setCurrentGameId("");
          if (typeof setUserCurrentGame === "function" && authState.uid) {
            await setUserCurrentGame(authState.uid, null, null);
          }

          alert(
            "Tu ne fais pas partie de cette partie. Demande au MJ si tu veux la rejoindre."
          );
          navigateTo("#/app/home");
          return;
        }

        // À partir d'ici : MJ ou joueur officiel → on mémorise la partie courante (local)
        setCurrentGameId(gameId);

        // Affichage selon status
        if (isDraft) {
          renderGameLobbyView(gameId, game, isMj, isCurrentPlayer, joinCode);
          loadLobbyPlayers(gameId, isMj);
        } else {
          // Partie en cours : on délègue à game_running.js
          if (typeof renderGameRunning === "function") {
            renderGameRunning(gameId, game, isMj, isCurrentPlayer, joinCode);
          } else {
            console.error(
              "[renderGameLobby] renderGameRunning non défini. Vérifie que game_running.js est bien chargé."
            );
          }
        }
      },
      (err) => {
        console.error("[renderGameLobby] Erreur écoute doc partie :", err);
        app.innerHTML = `
          <div class="shell">
            <div class="card">
              <h1 class="login-title">Erreur</h1>
              <p class="login-description">
                Impossible de charger la partie : ${err.message}
              </p>
              <div class="cta-block">
                <button class="btn btn-outline" onclick="navigateTo('#/app/home')">
                  Retour à l’accueil
                </button>
              </div>
            </div>
          </div>
        `;
        setCurrentGameId("");
      }
    );
  } catch (err) {
    console.error(err);
    app.innerHTML = `
      <div class="shell">
        <div class="card">
          <h1 class="login-title">Erreur</h1>
          <p class="login-description">
            Impossible de charger la partie : ${err.message}
          </p>
          <div class="cta-block">
            <button class="btn btn-outline" onclick="navigateTo('#/app/home')">
              Retour à l’accueil
            </button>
          </div>
        </div>
      </div>
    `;
    setCurrentGameId("");
  }
}

function renderGameLobbyView(gameId, game, isMj, isCurrentPlayer, joinCode) {
  const app = document.getElementById("app");
  const mjMessage = (game.mj_message || DEFAULT_MJ_MESSAGE).trim();

  app.innerHTML = `
    <div class="shell">
      <div class="card">
        <div class="game-badge">
          <span class="game-badge-dot"></span>
          <span>Lobby de la partie</span>
        </div>

        <!-- Bouton paramètres -->
        <button
          id="btn-settings"
          type="button"
          style="
            position:absolute;
            top:16px;
            right:18px;
            width:32px;
            height:32px;
            border-radius:999px;
            border:1px solid rgba(148,163,184,0.5);
            background:rgba(15,23,42,0.9);
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:16px;
          "
        >
          ⚙️
        </button>

        <!-- Panneau latéral paramètres -->
        <div
          id="settings-panel"
          style="
            position:fixed;
            top:0;
            right:0;
            height:100%;
            width:70%;
            max-width:320px;
            background:rgba(15,23,42,0.98);
            box-shadow:-4px 0 16px rgba(0,0,0,0.5);
            transform:translateX(100%);
            transition:transform 0.2s ease-out;
            z-index:40;
            padding:16px;
            display:flex;
            flex-direction:column;
            gap:12px;
          "
        >
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-weight:600;font-size:15px;">Paramètres</span>
            <button
              id="btn-settings-close"
              type="button"
              style="
                border:none;
                background:transparent;
                font-size:20px;
                line-height:1;
              "
            >
              ✕
            </button>
          </div>

          <button
            id="btn-settings-logout"
            type="button"
            class="btn btn-outline btn-sm"
            style="width:100%;"
          >
            Se déconnecter
          </button>
        </div>

        <div
          id="settings-backdrop"
          style="
            position:fixed;
            inset:0;
            background:rgba(15,23,42,0.6);
            opacity:0;
            pointer-events:none;
            transition:opacity 0.2s ease-out;
            z-index:30;
          "
        ></div>

        <!-- Bloc message MJ + ID + boutons -->
        <section class="section" style="text-align:center; padding-top:8px;">
          <div
            id="mj-message-view"
            class="notice-card"
            style="
              cursor:${isMj ? "pointer" : "default"};
              margin-bottom:8px;
              padding:16px 18px;
            "
          >
            <div class="notice-title">Message du MJ</div>
            <p class="notice-text" id="mj-message-text" style="margin-top:4px;">
              ${mjMessage || DEFAULT_MJ_MESSAGE}
            </p>
            ${
              isMj
                ? `<p style="margin-top:6px;font-size:11px;color:var(--text-muted);">
                     Touchez ce message pour le modifier (visible par tous).
                   </p>`
                : ""
            }
          </div>

          <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">
            ID de la partie :
            <code style="font-size:11px;">${joinCode}</code>
          </div>

          <div class="cta-block" style="justify-content:center; gap:8px;">
            <button class="btn btn-primary" id="btn-copy-id" style="min-width:120px;">
              Copier
            </button>
            <button class="btn btn-outline" id="btn-share-id" style="min-width:120px;">
              Partager
            </button>
          </div>
        </section>

        <!-- Liste des joueurs -->
        <section class="section" style="margin-top:16px;">
          <h2 class="section-title" style="text-align:center;">Liste des joueurs</h2>
          <p class="login-description" style="text-align:center; font-size:13px; margin-bottom:8px;">
            Tous les joueurs de cette partie apparaîtront ici.
          </p>

          <div
            class="players-box"
            style="
              max-height:260px;
              overflow-y:auto;
              padding:8px;
              border-radius:18px;
              background:rgba(15,23,42,0.35);
              display:flex;
              flex-direction:column;
              gap:8px;
            "
          >
            <ul id="players-list" class="section-list" style="width:100%; margin:0;">
              <li>
                <div style="padding:10px 14px; border-radius:16px; background:rgba(15,23,42,0.35); font-size:14px;">
                  Chargement des joueurs...
                </div>
              </li>
            </ul>
          </div>
        </section>

        <div class="cta-block" style="margin-top:18px; flex-direction:column; gap:8px;">
          ${
            isMj
              ? `
                ${
                  game.status === "draft"
                    ? `<button class="btn btn-primary btn-sm" id="btn-start-game">
                         Lancer la partie
                       </button>`
                    : ""
                }
                <button class="btn btn-outline btn-sm" id="btn-delete-game">
                  Supprimer la partie
                </button>
              `
              : isCurrentPlayer
              ? `<button class="btn btn-outline btn-sm" id="btn-leave-game">
                   Quitter la partie
                 </button>`
              : ""
          }
        </div>
      </div>
    </div>
  `;

  // Paramètres
  const panel = document.getElementById("settings-panel");
  const backdrop = document.getElementById("settings-backdrop");

  function openSettings() {
    if (!panel || !backdrop) return;
    panel.style.transform = "translateX(0)";
    backdrop.style.opacity = "1";
    backdrop.style.pointerEvents = "auto";
  }

  function closeSettings() {
    if (!panel || !backdrop) return;
    panel.style.transform = "translateX(100%)";
    backdrop.style.opacity = "0";
    backdrop.style.pointerEvents = "none";
  }

  document.getElementById("btn-settings")?.addEventListener("click", openSettings);
  document
    .getElementById("btn-settings-close")
    ?.addEventListener("click", closeSettings);
  backdrop?.addEventListener("click", closeSettings);

  document
    .getElementById("btn-settings-logout")
    ?.addEventListener("click", () => {
      auth
        .signOut()
        .catch((err) => {
          alert("Erreur lors de la déconnexion : " + err.message);
        })
        .finally(() => {
          closeSettings();
          navigateTo("#/login");
        });
    });

  // Boutons copier / partager
  document.getElementById("btn-copy-id")?.addEventListener("click", () => {
    copyJoinCode(joinCode);
  });

  document.getElementById("btn-share-id")?.addEventListener("click", () => {
    shareGameInvite(joinCode);
  });

  // Edition message MJ
  if (isMj) {
    const msgView = document.getElementById("mj-message-view");
    msgView?.addEventListener("click", async () => {
      const currentText =
        document.getElementById("mj-message-text")?.textContent?.trim() || "";
      const newMsg = window.prompt(
        "Nouveau message visible par tous les joueurs :",
        currentText || DEFAULT_MJ_MESSAGE
      );
      if (newMsg === null) return;
      const trimmed = newMsg.trim();
      try {
        await db.collection("games").doc(gameId).update({
          mj_message: trimmed,
          updated_at: firebase.firestore.FieldValue.serverTimestamp(),
        });
        const txtEl = document.getElementById("mj-message-text");
        if (txtEl) {
          txtEl.textContent = trimmed || DEFAULT_MJ_MESSAGE;
        }
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la mise à jour du message : " + err.message);
      }
    });

    // Lancer la partie (si draft)
    if (game.status === "draft" && document.getElementById("btn-start-game")) {
      document
        .getElementById("btn-start-game")
        .addEventListener("click", async () => {
          const ok = window.confirm(
            "Lancer la partie maintenant ? Les nouveaux joueurs ne pourront plus s’inscrire."
          );
          if (!ok) return;
          await startGame(gameId);
        });
    }

    // Supprimer la partie
    document
      .getElementById("btn-delete-game")
      ?.addEventListener("click", async () => {
        const ok = window.confirm(
          "Supprimer définitivement cette partie (et ses joueurs) ?"
        );
        if (!ok) return;

        try {
          await deleteGameAndPlayers(gameId);
          alert("Partie supprimée.");
          setCurrentGameId("");
          if (typeof setUserCurrentGame === "function" && authState.uid) {
            await setUserCurrentGame(authState.uid, null, null);
          }
          if (typeof markLastGameDeleted === "function") {
            markLastGameDeleted();
          }
          navigateTo("#/app/home");
        } catch (err) {
          console.error(err);
          alert("Erreur lors de la suppression : " + err.message);
        }
      });
  }

  // Quitter la partie (joueur)
  if (!isMj && isCurrentPlayer) {
    document
      .getElementById("btn-leave-game")
      ?.addEventListener("click", async () => {
        const ok = window.confirm(
          "Quitter définitivement cette partie ? Tu devras demander au MJ pour revenir."
        );
        if (!ok) return;

        try {
          await db
            .collection("games")
            .doc(gameId)
            .collection("players")
            .doc(authState.uid)
            .delete();

          if (typeof setUserCurrentGame === "function" && authState.uid) {
            await setUserCurrentGame(authState.uid, null, null);
          }

          alert("Tu as quitté la partie.");
          setCurrentGameId("");
          navigateTo("#/app/home");
        } catch (err) {
          console.error(err);
          alert("Erreur lors de la sortie de la partie : " + err.message);
        }
      });
  }
}

// --- Liste des joueurs (lobby) ---

async function loadLobbyPlayers(gameId, isMj) {
  const listEl = document.getElementById("players-list");
  if (!listEl) return;

  try {
    const snap = await db
      .collection("games")
      .doc(gameId)
      .collection("players")
      .orderBy("joined_at", "asc")
      .get();

    if (snap.empty) {
      listEl.innerHTML = `
        <li>
          <div style="padding:10px 14px; border-radius:16px; background:rgba(15,23,42,0.35); font-size:14px;">
            Aucun joueur pour l’instant. Partage l’ID de la partie.
          </div>
        </li>
      `;
      return;
    }

    const rows = [];
    snap.forEach((doc) => {
      const p = doc.data();
      const name = p.display_name || p.name || "Joueur";

      rows.push(`
        <li data-player-id="${doc.id}">
          <div
            class="player-row"
            style="
              display:flex;
              align-items:center;
              justify-content:space-between;
              gap:8px;
              padding:8px 10px;
              border-radius:999px;
              background:rgba(15,23,42,0.5);
            "
          >
            <div style="display:flex;align-items:center;gap:10px;">
              <div
                style="
                  width:34px;
                  height:34px;
                  border-radius:999px;
                  background:rgba(15,23,42,0.8);
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-size:16px;
                "
              >
                👤
              </div>
              <div class="player-name" style="font-size:15px;">
                ${name}
              </div>
            </div>
            ${
              isMj
                ? `<button
                     class="btn btn-outline btn-sm player-rename"
                     type="button"
                   >
                     Renommer
                   </button>`
                : ""
            }
          </div>
        </li>
      `);
    });

    listEl.innerHTML = rows.join("");

    if (isMj) {
      listEl.querySelectorAll(".player-rename").forEach((btn) => {
        btn.addEventListener("click", () => {
          const li = btn.closest("li");
          if (!li) return;
          const playerId = li.getAttribute("data-player-id");
          const nameEl = li.querySelector(".player-name");
          const currentName = nameEl?.textContent?.trim() || "";
          if (!playerId) return;
          renamePlayer(gameId, playerId, currentName);
        });
      });
    }
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `
      <li>
        <span class="section-bullet"></span>
        <span style="color:var(--danger);">
          Erreur de chargement des joueurs : ${err.message}
        </span>
      </li>
    `;
  }
}

/**
 * Renommer un joueur (MJ uniquement)
 */
async function renamePlayer(gameId, playerId, currentName) {
  const newName = window.prompt(
    "Nouveau prénom pour ce joueur :",
    currentName || ""
  );
  if (newName === null) return;
  const trimmed = newName.trim();
  if (!trimmed || trimmed === currentName) return;

  try {
    await db
      .collection("games")
      .doc(gameId)
      .collection("players")
      .doc(playerId)
      .update({
        display_name: trimmed,
        updated_at: firebase.firestore.FieldValue.serverTimestamp(),
      });

    loadLobbyPlayers(gameId, true);
  } catch (err) {
    console.error(err);
    alert("Erreur lors du renommage du joueur : " + err.message);
  }
}

// --- Utilitaires copie / partage ---

function copyJoinCode(code) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        alert("ID copié dans le presse-papiers.");
      })
      .catch((err) => {
        console.error(err);
        fallbackCopy(code);
      });
  } else {
    fallbackCopy(code);
  }
}

function fallbackCopy(code) {
  window.prompt("Copie cet ID de partie :", code);
}

function shareGameInvite(code) {
  const baseUrl = window.location.href.split("#")[0];
  const joinText = `Rejoins ma partie de Loup-garou IRL – ID : ${code}`;

  if (navigator.share) {
    navigator
      .share({
        title: "Loup-garou IRL – Partie",
        text: joinText,
        url: baseUrl,
      })
      .catch((err) => {
        if (err && err.name !== "AbortError") {
          console.error(err);
          alert("Partage impossible sur ce navigateur.");
        }
      });
  } else {
    copyJoinCode(code);
    alert(
      "Le partage natif n’est pas disponible sur ce navigateur.\nL’ID a été copié, colle-le dans WhatsApp / Snap / etc."
    );
  }
}

/**
 * Suppression de la partie + joueurs (subcollection)
 */
async function deleteGameAndPlayers(gameId) {
  const gameRef = db.collection("games").doc(gameId);
  const playersSnap = await gameRef.collection("players").get();

  const batch = db.batch();

  playersSnap.forEach((doc) => {
    batch.delete(doc.ref);
  });

  batch.delete(gameRef);

  await batch.commit();
}