// game_running.js
// Vue "Partie en cours" (status = running)

console.log("[game_running.js] chargé");

// Abonnement temps réel à la liste des joueurs pendant la partie
let runningPlayersUnsub = null;

function unsubscribeRunningPlayers() {
  if (typeof runningPlayersUnsub === "function") {
    runningPlayersUnsub();
    runningPlayersUnsub = null;
  }
}

/**
 * Écran "partie en cours" pour MJ + joueurs.
 * Appelée depuis game.js : renderGameRunning(gameId, game, isMj, isCurrentPlayer, joinCode)
 */
function renderGameRunning(gameId, game, isMj, isCurrentPlayer, joinCode) {
  const app = document.getElementById("app");
  if (!app) return;

  // On coupe un éventuel ancien abonnement de la vue "running"
  unsubscribeRunningPlayers();

  const phase = game.phase || "night"; // "night" | "day"
  const dayIndex = game.day_index || 1;

  const phaseLabel =
    phase === "night" ? `Nuit ${dayIndex}` : `Jour ${dayIndex}`;
  const subtitle =
    phase === "night"
      ? "Les actions de nuit seront gérées dans une prochaine itération."
      : "Les votes et résolutions du jour seront branchés plus tard.";

  app.innerHTML = `
    <div class="shell" style="max-width:100%; padding:8px 4px;">
      <div class="card" style="width:100%; max-width:100%; margin:0 auto;">
        <div class="game-badge">
          <span class="game-badge-dot"></span>
          <span>Partie en cours</span>
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

          ${
            isMj
              ? `
                <button
                  id="btn-settings-delete-game"
                  type="button"
                  class="btn btn-outline btn-sm"
                  style="width:100%;border-color:#f97373;color:#fecaca;"
                >
                  Supprimer la partie
                </button>
              `
              : isCurrentPlayer
              ? `
                <button
                  id="btn-settings-leave-game"
                  type="button"
                  class="btn btn-outline btn-sm"
                  style="width:100%;border-color:#f97373;color:#fecaca;"
                >
                  Quitter la partie
                </button>
              `
              : ""
          }
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

        <!-- HEADER PHASE / INFO -->
        <section class="section" style="margin-top:16px;text-align:center;">
          <h1 class="login-title">${phaseLabel}</h1>
          <p class="login-description">
            ${subtitle}
          </p>

          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;">
            ID de la partie :
            <code style="font-size:11px;">${joinCode}</code>
          </p>

          ${
            isMj
              ? `<p style="font-size:12px;color:var(--text-muted);margin-top:4px;">
                   Vue MJ – tu vois tous les joueurs, et tu contrôleras plus tard phases et résolutions.
                 </p>`
              : `<p style="font-size:12px;color:var(--text-muted);margin-top:4px;">
                   Vue joueur – ton rôle, tes actions et ton historique seront affichés ici plus tard.
                 </p>`
          }
        </section>

        <!-- INTERFACE PRINCIPALE : VILLAGE / PROFIL -->
        <section class="section" style="margin-top:8px;">
          <!-- Onglets top ? Non : navigation en bas, mais on garde un container ici -->
          <div id="view-village" style="display:block;">
            <!-- Top bar : Vote / Action -->
            <div
              class="village-topbar"
              style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:8px;
                margin-bottom:8px;
              "
            >
              <button
                id="btn-vote"
                class="btn btn-outline btn-sm"
                type="button"
                style="flex:1;"
              >
                Vote
              </button>
              <button
                id="btn-action"
                class="btn btn-outline btn-sm"
                type="button"
                style="flex:1;"
              >
                Action
              </button>
            </div>

            <!-- Grille des joueurs (vivants / morts) -->
            <div
              class="players-section"
              style="display:flex;flex-direction:column;gap:10px;"
            >
              <div>
                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    margin-bottom:4px;
                  "
                >
                  <h2 class="section-title" style="margin-bottom:0;">Vivants</h2>
                </div>
                <div
                  id="village-grid-alive"
                  class="village-grid"
                  style="
                    display:grid;
                    grid-template-columns:repeat(5, minmax(0,1fr));
                    gap:4px;
                  "
                >
                  <!-- cartes vivants -->
                </div>
              </div>

              <hr style="border:none;border-top:1px solid rgba(148,163,184,0.4);margin:4px 0;" />

              <div>
                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    margin-bottom:4px;
                  "
                >
                  <h2 class="section-title" style="margin-bottom:0;">Morts</h2>
                </div>
                <div
                  id="village-grid-dead"
                  class="village-grid"
                  style="
                    display:grid;
                    grid-template-columns:repeat(5, minmax(0,1fr));
                    gap:4px;
                  "
                >
                  <!-- cartes morts -->
                </div>
              </div>
            </div>
          </div>

          <!-- Vue Profil -->
          <div id="view-profile" style="display:none; margin-top:4px;">
            <h2 class="section-title">Profil</h2>
            <div class="notice-card" id="profile-box">
              <div class="notice-title">Tes informations</div>
              <p class="notice-text" id="profile-text">
                Chargement de ton profil joueur...
              </p>
            </div>
          </div>
        </section>

        <!-- BOTTOM NAVIGATION -->
        <div
          id="bottom-nav"
          style="
            position:sticky;
            bottom:-16px;
            left:0;
            right:0;
            margin-top:12px;
            padding-top:8px;
          "
        >
          <div
            style="
              display:flex;
              justify-content:space-around;
              gap:8px;
              padding:6px 4px 0 4px;
              border-top:1px solid rgba(148,163,184,0.3);
            "
          >
            <button
              id="tab-village"
              type="button"
              style="
                flex:1;
                padding:8px 4px;
                border-radius:999px;
                border:none;
                font-size:13px;
                background:rgba(148,163,184,0.16);
              "
            >
              Vue du village
            </button>
            <button
              id="tab-profile"
              type="button"
              style="
                flex:1;
                padding:8px 4px;
                border-radius:999px;
                border:none;
                font-size:13px;
                background:transparent;
              "
            >
              Profil
            </button>
          </div>
        </div>

      </div>
    </div>
  `;

  // Paramètres – même logique que dans le lobby
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

  // Déconnexion
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

  // Supprimer la partie (MJ) depuis paramètres
  if (isMj) {
    const btnDelete = document.getElementById("btn-settings-delete-game");
    if (btnDelete) {
      btnDelete.addEventListener("click", async () => {
        const ok = window.confirm(
          "Supprimer définitivement cette partie (et ses joueurs) ?"
        );
        if (!ok) return;
        try {
          await deleteGameAndPlayers(gameId);
          setCurrentGameId("");
          if (typeof setUserCurrentGame === "function" && authState.uid) {
            await setUserCurrentGame(authState.uid, null, null);
          }
          if (typeof markLastGameDeleted === "function") {
            markLastGameDeleted();
          }
          closeSettings();
          navigateTo("#/app/home");
        } catch (err) {
          console.error("[running] erreur suppression partie :", err);
          alert("Erreur lors de la suppression : " + err.message);
        }
      });
    }
  }

  // Quitter la partie (joueur) depuis paramètres
  if (!isMj && isCurrentPlayer) {
    const btnLeave = document.getElementById("btn-settings-leave-game");
    if (btnLeave) {
      btnLeave.addEventListener("click", async () => {
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

          setCurrentGameId("");
          closeSettings();
          navigateTo("#/app/home");
        } catch (err) {
          console.error("[running] erreur quitter partie :", err);
          alert("Erreur lors de la sortie de la partie : " + err.message);
        }
      });
    }
  }

  // Tabs Village / Profil
  initRunningBottomNav();

  // Boutons Vote / Action (UX seulement pour l'instant)
  document.getElementById("btn-vote")?.addEventListener("click", () => {
    alert(
      "Interface de vote à venir : sélectionne un joueur et envoie un vote pour ce jour / phase."
    );
  });

  document.getElementById("btn-action")?.addEventListener("click", () => {
    alert(
      "Interface d'action de rôle à venir : sélection, double sélection, motion, etc."
    );
  });

  // Abonnement temps réel à la liste des joueurs
  loadRunningPlayers(gameId);
}

/**
 * Nav bas : bascule Vue du village / Profil
 */
function initRunningBottomNav() {
  const tabVillage = document.getElementById("tab-village");
  const tabProfile = document.getElementById("tab-profile");
  const viewVillage = document.getElementById("view-village");
  const viewProfile = document.getElementById("view-profile");

  if (!tabVillage || !tabProfile || !viewVillage || !viewProfile) return;

  function selectVillage() {
    viewVillage.style.display = "block";
    viewProfile.style.display = "none";

    tabVillage.style.background = "rgba(148,163,184,0.16)";
    tabProfile.style.background = "transparent";
  }

  function selectProfile() {
    viewVillage.style.display = "none";
    viewProfile.style.display = "block";

    tabVillage.style.background = "transparent";
    tabProfile.style.background = "rgba(148,163,184,0.16)";
  }

  tabVillage.addEventListener("click", selectVillage);
  tabProfile.addEventListener("click", selectProfile);

  // Onglet par défaut
  selectVillage();
}

/**
 * Abonnement temps réel sur /games/{id}/players pendant la partie
 * Affiche la grille 5xN "vivants" en haut, "morts" en bas.
 * Hypothèse : un joueur est mort si p.state === "dead" (sinon vivant).
 */
function loadRunningPlayers(gameId) {
  const gridAlive = document.getElementById("village-grid-alive");
  const gridDead = document.getElementById("village-grid-dead");
  const profileText = document.getElementById("profile-text");

  if (!gridAlive || !gridDead) return;

  // Nettoie un éventuel ancien abonnement
  unsubscribeRunningPlayers();

  const playersRef = db
    .collection("games")
    .doc(gameId)
    .collection("players")
    .orderBy("joined_at", "asc");

  runningPlayersUnsub = playersRef.onSnapshot(
    (snap) => {
      if (snap.empty) {
        gridAlive.innerHTML = `
          <div style="grid-column:1 / -1; padding:10px 8px; border-radius:12px; background:rgba(15,23,42,0.35); font-size:13px; text-align:center;">
            Aucun joueur trouvé pour cette partie.
          </div>
        `;
        gridDead.innerHTML = "";
        if (profileText) {
          profileText.textContent =
            "Impossible de trouver ton profil joueur pour cette partie.";
        }
        return;
      }

      const aliveCards = [];
      const deadCards = [];
      let selfInfo = null;

      snap.forEach((doc) => {
        const p = doc.data();
        const id = doc.id;
        const name = (p.display_name || p.name || "Joueur").toString();
        const isBot = !!p.is_bot;
        const icon = isBot ? "🤖" : "👤";
        const state = p.state || "alive"; // "alive" | "dead"
        const isDead = state === "dead";
        const isSelf = id === authState.uid;

        if (isSelf) {
          selfInfo = { name, isBot, isDead, state };
        }

        const cardHtml = `
  <div
    class="village-slot"
    style="
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:2px;
    "
  >
    <button
      type="button"
      class="village-card"
      data-player-id="${id}"
      style="
        position:relative;
        width:100%;
        aspect-ratio:5/7;
        border-radius:10px;
        border:1px solid rgba(15,23,42,0.8);
        background:linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,64,175,0.7));
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:flex-end;
        padding:4px;
        overflow:hidden;
        opacity:${isDead ? 0.4 : 1};
      "
    >
<img
  src="/assets/cards/back-neutral.png"
  alt="Dos de carte"
  style="
    position:absolute;
    inset:0;
    width:100%;
    height:100%;
    object-fit:cover;
    pointer-events:none;
    border-radius:10px;
  "
/>

      <!-- Badge mort uniquement -->
      ${
        isDead
          ? `
        <div
          style="
            position:absolute;
            top:4px;
            right:4px;
            font-size:11px;
            padding:2px 6px;
            border-radius:999px;
            background:rgba(15,23,42,0.9);
            color:#fca5a5;
            z-index:2;
          "
        >
          mort
        </div>
        `
          : ""
      }

      <!-- (pas de prénom dans la carte pour éviter le noir sur noir) -->
    </button>

    <!-- Prénom sous la carte, bien lisible -->
    <div
      class="village-name"
      style="
        font-size:13px;
        font-weight:600;
        color:#e5e7eb;
        text-align:center;
        max-width:100%;
        word-break:break-word;
      "
    >
      ${name}${isBot ? " (bot)" : isSelf ? " (toi)" : ""}
    </div>
  </div>
`;

        if (isDead) {
          deadCards.push(cardHtml);
        } else {
          aliveCards.push(cardHtml);
        }
      });

      gridAlive.innerHTML =
        aliveCards.length > 0
          ? aliveCards.join("")
          : `
        <div style="grid-column:1 / -1; padding:8px 6px; border-radius:10px; background:rgba(15,23,42,0.35); font-size:12px; text-align:center;">
          Aucun joueur vivant pour l’instant.
        </div>
      `;

      gridDead.innerHTML =
        deadCards.length > 0
          ? deadCards.join("")
          : `
        <div style="grid-column:1 / -1; padding:8px 6px; border-radius:10px; background:rgba(15,23,42,0.12); font-size:12px; text-align:center;">
          Aucun joueur mort pour l’instant.
        </div>
      `;

      // Mise à jour du profil simple
      if (profileText) {
        if (!selfInfo) {
          profileText.textContent =
            "Ton joueur n’a pas été trouvé dans cette partie.";
        } else {
          const lignes = [];
          lignes.push(`Prénom affiché : ${selfInfo.name}`);
          lignes.push(
            `Type : ${selfInfo.isBot ? "Joueur fictif (bot)" : "Joueur réel"}`
          );
          lignes.push(
            `Statut : ${selfInfo.isDead ? "mort" : "vivant"}`
          );
          lignes.push(
            "Ton rôle, tes actions et ton historique seront affichés ici dans une prochaine version."
          );
          profileText.textContent = lignes.join("\n");
        }
      }
    },
    (err) => {
      console.error("[running] erreur onSnapshot players :", err);
      gridAlive.innerHTML = `
        <div style="grid-column:1 / -1; padding:10px 8px; border-radius:12px; background:rgba(127,29,29,0.8); font-size:13px; text-align:center;">
          Erreur de chargement des joueurs : ${err.message}
        </div>
      `;
      gridDead.innerHTML = "";
      if (profileText) {
        profileText.textContent =
          "Erreur de chargement des données joueur.";
      }
    }
  );
}