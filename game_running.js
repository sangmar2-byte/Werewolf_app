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
              <!-- cartes vivants remplies dynamiquement -->
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
              <!-- cartes morts remplies dynamiquement -->
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
    // déjà sur la vue du village -> rien pour l’instant
  });

  document.getElementById("tab-profile")?.addEventListener("click", () => {
    if (typeof renderProfileView === "function") {
      renderProfileView(gameId, game, isMj, isCurrentPlayer, joinCode);
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

  // À ce stade, une autre fonction (déjà présente dans ton fichier)
  // doit remplir #village-alive-grid et #village-dead-grid avec les cartes joueurs.
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