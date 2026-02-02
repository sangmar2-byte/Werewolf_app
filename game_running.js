// game_running.js
// Logique d’affichage de la partie en cours (status = "running")

/**
 * Changer de phase (MJ uniquement)
 * - nextPhase: "night" ou "day"
 * - nextDayIndex: numéro de jour (1, 2, 3…)
 */
async function changePhase(gameId, nextPhase, nextDayIndex) {
  if (!authState.uid) {
    alert("Tu dois être connecté pour changer de phase.");
    navigateTo("#/login");
    return;
  }

  if (!gameId) {
    alert("ID de partie manquant.");
    return;
  }

  if (nextPhase !== "night" && nextPhase !== "day") {
    console.error("[changePhase] phase invalide:", nextPhase);
    return;
  }

  try {
    const gameRef = db.collection("games").doc(gameId);
    const gameSnap = await gameRef.get();

    if (!gameSnap.exists) {
      alert("Partie introuvable.");
      return;
    }

    const game = gameSnap.data();

    if (game.mj_uid !== authState.uid) {
      alert("Seul le MJ peut changer de phase.");
      return;
    }

    if (game.status !== "running") {
      alert("La partie n'est pas en cours.");
      return;
    }

    const now = firebase.firestore.FieldValue.serverTimestamp();

    await gameRef.update({
      phase: nextPhase,
      day_index: nextDayIndex,
      updated_at: now,
    });
    // onSnapshot sur /games/{id} (dans game.js) redessinera tout le monde.
  } catch (err) {
    console.error("[changePhase] erreur :", err);
    alert("Erreur lors du changement de phase : " + err.message);
  }
}

/**
 * Vue "Partie en cours"
 * Appelée depuis renderGameLobby (game.js) quand status = "running"
 */
function renderGameRunning(gameId, game, isMj, isCurrentPlayer, joinCode) {
  const app = document.getElementById("app");

  const phase = game.phase || "night";
  const dayIndex = game.day_index || 1;

  const phaseLabel =
    phase === "night"
      ? `Nuit ${dayIndex}`
      : `Jour ${dayIndex}`;

  const phaseDescription =
    phase === "night"
      ? "Les actions de nuit (Loups-garous, pouvoirs, etc.) seront gérées dans une étape ultérieure du développement."
      : "Les discussions et votes de jour seront branchés plus tard (grille des joueurs, votes, etc.).";

  let phaseControlsHtml = "";
  if (isMj) {
    if (phase === "night") {
      // Nuit -> Jour N
      phaseControlsHtml = `
        <button
          class="btn btn-primary btn-sm"
          id="btn-phase-to-day"
          style="width:100%;"
        >
          Passer au jour ${dayIndex}
        </button>
      `;
    } else {
      // Jour -> Nuit N+1
      const nextDay = dayIndex + 1;
      phaseControlsHtml = `
        <button
          class="btn btn-primary btn-sm"
          id="btn-phase-to-night"
          style="width:100%;"
        >
          Passer à la nuit ${nextDay}
        </button>
      `;
    }
  }

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
            ${phaseDescription}
          </p>

          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;">
            ID de la partie :
            <code style="font-size:11px;">${joinCode}</code>
          </p>
        </section>

        <section class="section">
          <div class="notice-card">
            <div class="notice-title">Écran provisoire</div>
            <p class="notice-text">
              Cette vue sera progressivement remplacée par :
            </p>
            <ul class="section-list" style="margin-top:8px;">
              <li>
                <span class="section-bullet"></span>
                <span>La grille des joueurs (vivants / morts, camps inconnus, etc.).</span>
              </li>
              <li>
                <span class="section-bullet"></span>
                <span>Les votes de jour (lynchage) avec limitations par jour.</span>
              </li>
              <li>
                <span class="section-bullet"></span>
                <span>Les actions de nuit (Loups-garous, pouvoirs spéciaux, etc.).</span>
              </li>
            </ul>
          </div>
        </section>

        ${
          isMj
            ? `
              <section class="section">
                <h2 class="section-title">Contrôle MJ</h2>
                <p class="login-description" style="font-size:13px;margin-bottom:8px;">
                  Utilise ces boutons pour faire avancer la partie manuellement.
                </p>
                <div class="cta-block" style="flex-direction:column;gap:8px;">
                  ${phaseControlsHtml}
                </div>
              </section>
            `
            : ""
        }
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

  // Boutons MJ pour avancer la phase
  if (isMj) {
    if (phase === "night") {
      const btn = document.getElementById("btn-phase-to-day");
      btn?.addEventListener("click", async () => {
        const ok = window.confirm(
          `Passer au jour ${dayIndex} ?\nLes actions de nuit sont supposées terminées.`
        );
        if (!ok) return;
        await changePhase(gameId, "day", dayIndex);
      });
    } else {
      const btn = document.getElementById("btn-phase-to-night");
      btn?.addEventListener("click", async () => {
        const nextDay = dayIndex + 1;
        const ok = window.confirm(
          `Passer à la nuit ${nextDay} ?\nLes discussions et votes du jour sont supposés terminés.`
        );
        if (!ok) return;
        await changePhase(gameId, "night", nextDay);
      });
    }
  }
}