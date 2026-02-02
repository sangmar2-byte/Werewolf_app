// game_running.js
// Vue "Partie en cours" (status = running)

console.log("[game_running.js] chargé");

// Abonnement temps réel à la liste des joueurs pendant la partie
let villagePlayersUnsub = null;

function unsubscribeVillagePlayers() {
  if (typeof villagePlayersUnsub === "function") {
    villagePlayersUnsub();
    villagePlayersUnsub = null;
  }
}

/**
 * Écran "partie en cours" pour MJ + joueurs.
 * Appelée depuis game.js : renderGameRunning(gameId, game, isMj, isCurrentPlayer, joinCode)
 */
function renderGameRunning(gameId, game, isMj, isCurrentPlayer, joinCode) {
  const app = document.getElementById("app");

  const phase = game.phase || "night";
  const dayIndex = game.day_index || 1;
  const phaseLabel = phase === "night" ? `Nuit ${dayIndex}` : `Jour ${dayIndex}`;

  app.innerHTML = `
    <div
      class="shell"
      style="
        height: 100vh;
        width: 100%;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 16px 12px;
        box-sizing: border-box;
        overflow: hidden;
      "
    >
      <div
        class="card"
        style="
          position: relative;
          width: 100%;
          max-width: 480px;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding-bottom: 16px;
        "
      >
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
          <div
            style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              margin-bottom:8px;
            "
          >
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

          <div
            style="
              font-size:12px;
              color:var(--text-muted);
              word-break:break-all;
              padding:6px 8px;
              border-radius:10px;
              background:rgba(15,23,42,0.7);
            "
          >
            ID de la partie :
            <code style="font-size:11px;">${joinCode}</code>
          </div>

          <button
            id="btn-settings-leave"
            type="button"
            class="btn btn-outline btn-sm"
            style="width:100%;"
          >
            ${isMj ? "Supprimer la partie" : "Quitter la partie"}
          </button>

          <button
            id="btn-settings-logout"
            type="button"
            class="btn btn-outline btn-sm"
            style="width:100%;margin-top:4px;"
          >
            Se déconnecter
          </button>
        </div>

        <!-- Overlay pour fermer le panneau -->
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

        <!-- ENTÊTE PHASE + BOUTONS -->
        <section
          class="section"
          style="
            margin-top:28px;
            text-align:center;
            padding-bottom:8px;
          "
        >
          <h1 class="login-title" style="margin-bottom:8px;">${phaseLabel}</h1>

          <div
            class="cta-block"
            style="
              display:flex;
              flex-direction:row;
              gap:12px;
              justify-content:center;
              margin-top:4px;
            "
          >
            <button class="btn btn-primary" id="btn-vote" style="flex:1;">
              Vote
            </button>
            <button class="btn btn-outline" id="btn-action" style="flex:1;">
              Action
            </button>
          </div>
        </section>

        <!-- ZONE SCROLLABLE POUR LES JOUEURS -->
        <div
          id="village-scroll"
          style="
            flex:1;
            margin-top:12px;
            padding:12px 4px 4px 4px;
            border-radius:20px;
            background:rgba(15,23,42,0.4);
            overflow-y:auto;
          "
        >
          <!-- VIVANTS -->
          <section class="section" style="padding-top:0;padding-bottom:8px;">
            <h2
              class="section-title"
              style="
                font-size:13px;
                letter-spacing:0.08em;
                text-transform:uppercase;
              "
            >
              Vivants
            </h2>
            <div
              id="village-alive-grid"
              style="
                margin-top:8px;
                display:grid;
                grid-template-columns:repeat(5, minmax(0, 1fr));
                gap:8px 6px;
              "
            >
              <!-- cartes vivants -->
            </div>
          </section>

          <hr
            style="
              border:none;
              border-top:1px solid rgba(148,163,184,0.25);
              margin:4px 0 10px 0;
            "
          />

          <!-- MORTS -->
          <section class="section" style="padding-top:0;">
            <h2
              class="section-title"
              style="
                font-size:13px;
                letter-spacing:0.08em;
                text-transform:uppercase;
              "
            >
              Morts
            </h2>
            <div
              id="village-dead-grid"
              style="
                margin-top:8px;
                display:grid;
                grid-template-columns:repeat(5, minmax(0, 1fr));
                gap:8px 6px;
              "
            >
              <!-- cartes morts -->
            </div>
            <p
              id="village-dead-empty"
              style="
                margin-top:6px;
                font-size:12px;
                color:var(--text-muted);
              "
            >
              Aucun joueur mort pour l’instant.
            </p>
          </section>
        </div>

        <!-- NAVIGATION BAS -->
        <div
          class="cta-block"
          style="
            margin-top:10px;
            gap:8px;
            justify-content:space-between;
            display:flex;
            flex-direction:row;
          "
        >
          <button
            class="btn btn-primary btn-sm"
            id="tab-village"
            style="flex:1;"
          >
            Vue du village
          </button>
          <button
            class="btn btn-outline btn-sm"
            id="tab-profile"
            style="flex:1;"
          >
            Profil
          </button>
        </div>
      </div>
    </div>
  `;

  /* ==== Paramètres : ouverture / fermeture ==== */
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
  document.getElementById("btn-settings-close")?.addEventListener("click", closeSettings);
  backdrop?.addEventListener("click", closeSettings);

  // Quitter / supprimer depuis les paramètres
  document
    .getElementById("btn-settings-leave")
    ?.addEventListener("click", async () => {
      if (isMj) {
        const ok = window.confirm(
          "Supprimer définitivement cette partie (et tous les joueurs) ?"
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
          console.error(err);
          alert("Erreur lors de la suppression : " + err.message);
        }
      } else {
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
          console.error(err);
          alert("Erreur lors de la sortie de la partie : " + err.message);
        }
      }
    });

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

  /* ==== Navigation bas : onglets ==== */
  document.getElementById("tab-village")?.addEventListener("click", () => {
    // déjà sur la vue du village
  });

  document.getElementById("tab-profile")?.addEventListener("click", () => {
    if (typeof renderProfileView === "function") {
      renderProfileView(gameId, game, isMj, isCurrentPlayer, joinCode);
    } else {
      alert("L’onglet Profil sera branché dans une prochaine itération.");
    }
  });

  /* ==== Boutons Vote / Action ==== */
  document.getElementById("btn-vote")?.addEventListener("click", () => {
    if (typeof openVoteModal === "function") {
      openVoteModal(gameId, game, isMj, isCurrentPlayer);
    } else {
      alert("Le système de vote sera ajouté dans une prochaine itération.");
    }
  });

  document.getElementById("btn-action")?.addEventListener("click", () => {
    if (typeof openActionModal === "function") {
      openActionModal(gameId, game, isMj, isCurrentPlayer);
    } else {
      alert("Le système d’actions de rôle sera ajouté dans une prochaine itération.");
    }
  });

  // Abonnement temps réel sur les joueurs pour remplir les grilles
  subscribeVillagePlayers(gameId, isMj);
}

/**
 * Abonnement temps réel sur /games/{id}/players pendant la partie.
 * Affiche la grille 5xN "vivants" en haut, "morts" en bas.
 * Un joueur est mort si p.is_dead === true (sinon vivant).
 */
function subscribeVillagePlayers(gameId, isMj) {
  const aliveGrid = document.getElementById("village-alive-grid");
  const deadGrid = document.getElementById("village-dead-grid");
  const deadEmpty = document.getElementById("village-dead-empty");

  if (!aliveGrid || !deadGrid) {
    console.warn("[village] conteneurs non trouvés");
    return;
  }

  // Nettoie un éventuel ancien abonnement
  unsubscribeVillagePlayers();

  villagePlayersUnsub = db
    .collection("games")
    .doc(gameId)
    .collection("players")
    .orderBy("joined_at", "asc")
    .onSnapshot(
      (snap) => {
        if (snap.empty) {
          aliveGrid.innerHTML = `
            <div style="
              grid-column:1/-1;
              padding:10px 14px;
              border-radius:16px;
              background:rgba(15,23,42,0.5);
              font-size:13px;
              text-align:center;
            ">
              Aucun joueur pour l’instant. Ajoute des joueurs ou des bots.
            </div>
          `;
          deadGrid.innerHTML = "";
          if (deadEmpty) deadEmpty.style.display = "block";
          return;
        }

        const alive = [];
        const dead = [];

        snap.forEach((doc) => {
          const p = doc.data();
          const name = (p.display_name || p.name || "Joueur").toString();
          const isDead = !!p.is_dead;
          const isBot = !!p.is_bot;
          const isSelf = doc.id === authState.uid;

          const cardHtml = `
            <div
              class="village-card-wrapper"
              style="
                display:flex;
                flex-direction:column;
                align-items:center;
                gap:4px;
              "
            >
              <div
                style="
                  width:100%;
                  padding-top:140%;
                  border-radius:12px;
                  overflow:hidden;
                  background:#020617;
                  box-shadow:0 0 0 1px rgba(15,23,42,0.9);
                  background-image:url('/assets/cards/back-neutral.png');
                  background-size:cover;
                  background-position:center;
                  opacity:${isDead ? 0.4 : 1};
                  position:relative;
                "
              >
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
                    "
                  >
                    mort
                  </div>
                  `
                    : ""
                }
              </div>
              <div
                style="
                  font-size:12px;
                  font-weight:600;
                  text-align:center;
                  color:#e5e7eb;
                  text-shadow:0 1px 2px rgba(0,0,0,0.9);
                  line-height:1.2;
                "
              >
                ${name}${isBot ? " (bot)" : isSelf ? " (toi)" : ""}
              </div>
            </div>
          `;

          if (isDead) {
            dead.push(cardHtml);
          } else {
            alive.push(cardHtml);
          }
        });

        aliveGrid.innerHTML =
          alive.length > 0
            ? alive
                .map(
                  (h) => `
              <div>${h}</div>
            `
                )
                .join("")
            : `
          <div style="
            grid-column:1/-1;
            padding:8px 6px;
            border-radius:10px;
            background:rgba(15,23,42,0.35);
            font-size:12px;
            text-align:center;
          ">
            Aucun joueur vivant pour l’instant.
          </div>
        `;

        deadGrid.innerHTML =
          dead.length > 0
            ? dead
                .map(
                  (h) => `
              <div>${h}</div>
            `
                )
                .join("")
            : "";

        if (deadEmpty) {
          deadEmpty.style.display = dead.length === 0 ? "block" : "none";
        }
      },
      (err) => {
        console.error("[village] erreur snapshot joueurs :", err);
        aliveGrid.innerHTML = `
          <div style="
            grid-column:1/-1;
            padding:10px 14px;
            border-radius:16px;
            background:rgba(127,29,29,0.5);
            font-size:13px;
            text-align:center;
          ">
            Erreur de chargement des joueurs : ${err.message}
          </div>
        `;
      }
    );
}