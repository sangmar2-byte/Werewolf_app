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
    <div class="shell">
      <div class="card">
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
                   Vue MJ – tu vois tous les joueurs et pourras plus tard déclencher les phases et les résolutions.
                 </p>`
              : `<p style="font-size:12px;color:var(--text-muted);margin-top:4px;">
                   Vue joueur – ton rôle et tes actions apparaîtront ici dans une prochaine version.
                 </p>`
          }
        </section>

        <!-- Bloc "Tes infos" pour le joueur courant -->
        <section class="section">
          <h2 class="section-title">Ton statut</h2>
          <div
            id="current-player-box"
            class="notice-card"
            style="margin-bottom:8px;"
          >
            <div class="notice-title">
              ${
                isMj
                  ? "Tu es le MJ de cette partie."
                  : "Ton statut sera détaillé ici."
              }
            </div>
            <p class="notice-text" id="current-player-text">
              ${
                isMj
                  ? "Tu contrôleras plus tard les phases, les morts annoncées et la résolution des pouvoirs."
                  : "Pour l’instant, cet encart sert juste à valider la synchro de la partie en cours."
              }
            </p>
          </div>
        </section>

        <!-- Liste des joueurs (grille) -->
        <section class="section">
          <h2 class="section-title" style="text-align:center;">Joueurs dans la partie</h2>
          <p class="login-description" style="text-align:center; font-size:13px; margin-bottom:8px;">
            Vue temps réel. Les joueurs fictifs (bots) sont marqués en conséquence.
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
            <ul id="running-players-list" class="section-list" style="width:100%; margin:0;">
              <li>
                <div style="padding:10px 14px; border-radius:16px; background:rgba(15,23,42,0.35); font-size:14px;">
                  Chargement des joueurs...
                </div>
              </li>
            </ul>
          </div>
        </section>

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

  // Abonnement temps réel à la liste des joueurs
  loadRunningPlayers(gameId, isMj);
}

/**
 * Abonnement temps réel sur /games/{id}/players pendant la partie
 */
function loadRunningPlayers(gameId, isMj) {
  const listEl = document.getElementById("running-players-list");
  if (!listEl) return;

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
        listEl.innerHTML = `
          <li>
            <div style="padding:10px 14px; border-radius:16px; background:rgba(15,23,42,0.35); font-size:14px;">
              Aucun joueur trouvé pour cette partie.
            </div>
          </li>
        `;
        return;
      }

      const rows = [];
      snap.forEach((doc) => {
        const p = doc.data();
        const name = p.display_name || p.name || "Joueur";
        const isBot = !!p.is_bot;
        const isSelf = doc.id === authState.uid;

        const icon = isBot ? "🤖" : "👤";
        const badgeSelf = isSelf ? `<span style="font-size:11px;color:#38bdf8;">(toi)</span>` : "";
        const badgeBot = isBot ? `<span style="font-size:11px;color:#a855f7;">bot</span>` : "";

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
                  ${icon}
                </div>
                <div style="display:flex;flex-direction:column;">
                  <span class="player-name" style="font-size:15px;">
                    ${name} ${badgeSelf}
                  </span>
                  <span style="font-size:11px;color:var(--text-muted);">
                    ${
                      isBot
                        ? "Joueur fictif (pour tests)"
                        : "Joueur réel"
                    }
                    ${badgeBot}
                  </span>
                </div>
              </div>
              ${
                isMj && isBot
                  ? `<button
                       class="btn btn-outline btn-sm running-remove-bot"
                       type="button"
                     >
                       Retirer
                     </button>`
                  : ""
              }
            </div>
          </li>
        `);
      });

      listEl.innerHTML = rows.join("");

      // Le MJ peut retirer un bot pendant la partie
      if (isMj) {
        listEl.querySelectorAll(".running-remove-bot").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const li = btn.closest("li");
            if (!li) return;
            const playerId = li.getAttribute("data-player-id");
            if (!playerId) return;

            const ok = window.confirm(
              "Retirer ce joueur fictif de la partie ?"
            );
            if (!ok) return;

            try {
              await db
                .collection("games")
                .doc(gameId)
                .collection("players")
                .doc(playerId)
                .delete();
            } catch (err) {
              console.error("[running] erreur suppression bot :", err);
              alert("Erreur lors de la suppression du bot : " + err.message);
            }
          });
        });
      }
    },
    (err) => {
      console.error("[running] erreur onSnapshot players :", err);
      listEl.innerHTML = `
        <li>
          <div style="padding:10px 14px; border-radius:16px; background:rgba(127,29,29,0.8); font-size:14px;">
            Erreur de chargement des joueurs : ${err.message}
          </div>
        </li>
      `;
    }
  );
}