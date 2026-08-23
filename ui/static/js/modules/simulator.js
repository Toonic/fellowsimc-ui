// Simulation Execution and Results Streaming Module
import { ProfileGenerator } from "./profile.js";
import { HERO_DEFINITIONS } from "../data/heroes/index.js";
import { ALL_BLESSINGS } from "../data/blessings.js";
import { ALL_WEAPON_TRAITS } from "../data/traits.js";
import { ALL_GEAR_SETS } from "../data/gear_sets.js";

export class SimRunner {
  constructor(state, buildsController, heroController, gearController, statsController) {
    this.state = state;
    this.buildsController = buildsController;
    this.heroController = heroController;
    this.gearController = gearController;
    this.statsController = statsController;
  }

  init() {
    const btnRun = document.getElementById("btn-run-sim");
    if (btnRun) {
      btnRun.addEventListener("click", () => this.runSimulation());
    }

    const btnStop = document.getElementById("btn-stop-sim");
    if (btnStop) {
      btnStop.addEventListener("click", () => this.stopSimulation());
    }

    const btnHtml = document.getElementById("btn-open-html-report");
    if (btnHtml) {
      btnHtml.addEventListener("click", () => {
        window.open("/api/report", "_blank");
      });
    }

    // Modal settings — wire to the actual IDs in index.html
    const statusBadge  = document.getElementById("connection-status");
    const btnSettings  = document.getElementById("btn-settings");
    const modalOverlay = document.getElementById("modal-settings");
    const btnClose     = document.getElementById("btn-close-modal");
    const btnSave      = document.getElementById("btn-save-credentials");

    const openModal  = () => {
      if (modalOverlay) {
        modalOverlay.classList.remove("hidden");
        modalOverlay.style.display = "flex";
      }
    };
    const closeModal = () => {
      if (modalOverlay) {
        modalOverlay.classList.add("hidden");
        modalOverlay.style.display = "none";
      }
    };

    if (btnSettings)  btnSettings.addEventListener("click", openModal);
    if (statusBadge)  statusBadge.addEventListener("click", openModal);
    if (btnClose)     btnClose.addEventListener("click", (e) => { e.stopPropagation(); closeModal(); });
    if (btnSave)      btnSave.addEventListener("click", () => this.saveApiConfig());

    // Close when clicking outside the modal card
    if (modalOverlay) {
      modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modalOverlay && modalOverlay.style.display !== "none" && !modalOverlay.classList.contains("hidden")) {
        closeModal();
      }
    });

    this.checkActiveSimulation();
  }

  async checkActiveSimulation() {
    try {
      const res = await fetch("/api/simulation/status");
      if (!res.ok) return;
      const data = await res.json();
      if (data.running) {
        this.attachToSimulationStream();
      }
    } catch (e) {
      console.error("Failed to check simulation status:", e);
    }
  }

  async checkApiConfig() {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      const cfgInput = document.getElementById("cfg-client-id");
      const cfgSec = document.getElementById("cfg-client-secret");
      if (cfgInput && data.client_id) {
        cfgInput.value = data.client_id;
      }
      if (cfgSec && data.client_secret) {
        cfgSec.value = data.client_secret;
      }
      const statusBadge = document.getElementById("connection-status");
      if (statusBadge) {
        if (data.has_secret) {
          statusBadge.className = "status-badge connected";
          statusBadge.querySelector(".status-text").textContent = "API Ready";
        } else {
          statusBadge.className = "status-badge warning";
          statusBadge.querySelector(".status-text").textContent = "Set API Keys";
        }
      }
    } catch (e) {
      console.error("Config check failed", e);
    }
  }

  async saveApiConfig() {
    const cid = document.getElementById("cfg-client-id")?.value || "";
    const sec = document.getElementById("cfg-client-secret")?.value || "";
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: cid, client_secret: sec })
      });
      if (res.ok) {
        const modal = document.getElementById("modal-settings");
        if (modal) modal.classList.add("hidden");
        this.checkApiConfig();
      }
    } catch (e) {
      alert("Failed to save credentials: " + e);
    }
  }

  renderCompareLeaderboard(players, baselineName) {
    const compareCard = document.getElementById("compare-results-card");
    const container = document.getElementById("compare-leaderboard-container");
    if (!compareCard || !container) return;

    if (!players || players.length <= 1) {
      compareCard.classList.add("hidden");
      return;
    }

    compareCard.classList.remove("hidden");
    container.innerHTML = "";

    const topDps = players[0].dps || 1;

    // Find baseline player
    let baselinePlayer = null;
    if (baselineName) {
      baselinePlayer = players.find(p => p.name.toLowerCase() === baselineName.toLowerCase());
    }
    if (!baselinePlayer) {
      baselinePlayer = players.find(p => p.name.toLowerCase() === "current_editor" || p.name.toLowerCase() === "current editor");
    }
    if (!baselinePlayer) {
      baselinePlayer = players[players.length - 1];
    }

    const baselineDps = baselinePlayer ? (baselinePlayer.dps || 1) : 1;

    players.forEach((p, idx) => {
      const dps = Math.round(p.dps);
      const barPct = Math.max(12, Math.round((p.dps / topDps) * 100));
      const diffFromBaseline = Math.round(p.dps - baselineDps);
      const diffPctBaseline = ((p.dps - baselineDps) / baselineDps * 100).toFixed(1);

      const isWinner = idx === 0;
      const isBaseline = p === baselinePlayer;
      const rankClass = idx === 0 ? "rank-gold" : idx === 1 ? "rank-silver" : idx === 2 ? "rank-bronze" : "rank-default";

      let deltaBadgeHtml = "";
      if (isBaseline) {
        deltaBadgeHtml = `<span class="compare-dps-delta" style="color: var(--text-gold); font-weight: 600;">BASELINE</span>`;
      } else if (diffFromBaseline > 0) {
        deltaBadgeHtml = `<span class="compare-dps-delta" style="color: #22c55e; font-weight: 600;">+${diffFromBaseline.toLocaleString()} (+${diffPctBaseline}%)</span>`;
      } else if (diffFromBaseline < 0) {
        deltaBadgeHtml = `<span class="compare-dps-delta" style="color: #ef4444; font-weight: 600;">${diffFromBaseline.toLocaleString()} (${diffPctBaseline}%)</span>`;
      } else {
        deltaBadgeHtml = `<span class="compare-dps-delta" style="color: var(--text-muted);">0 (0.0%)</span>`;
      }

      const row = document.createElement("div");
      row.className = `compare-result-row ${isWinner ? "winner" : ""} ${isBaseline ? "baseline-row" : ""}`;
      row.innerHTML = `
        <div class="compare-rank-badge ${rankClass}">#${idx + 1}</div>
        <div class="compare-bar-container">
          <div class="compare-bar-meta">
            <strong class="compare-actor-name">${p.name.replace(/_/g, ' ')}</strong>
            <div class="compare-dps-values">
              <span class="compare-dps-main">${dps.toLocaleString()} DPS</span>
              ${deltaBadgeHtml}
            </div>
          </div>
          <div class="compare-bar-track">
            <div class="compare-bar-fill ${isWinner ? "gold-gradient" : (isBaseline ? "gold-gradient" : "blue-gradient")}" style="width: ${barPct}%;"></div>
          </div>
          <div class="compare-bar-subtext">
            <span>Range: ${Math.round(p.range).toLocaleString()} DPS (${p.range_pct}%)</span>
            <span>Error: ±${Math.round(p.error)} DPS</span>
          </div>
        </div>
        <div class="compare-row-actions">
          <button type="button" class="btn-load-to-editor" data-actor-name="${p.name}">
            <span>LOAD BUILD</span>
          </button>
        </div>
      `;

      const btnLoad = row.querySelector(".btn-load-to-editor");
      if (btnLoad) {
        btnLoad.addEventListener("click", () => {
          this.loadActorAsEditor(p.name);
          btnLoad.classList.add("loaded");
          btnLoad.innerHTML = `<span>✓ LOADED!</span>`;
          setTimeout(() => {
            btnLoad.classList.remove("loaded");
            btnLoad.innerHTML = `<span>LOAD BUILD</span>`;
          }, 2000);
        });
      }

      container.appendChild(row);
    });
  }

  loadActorAsEditor(actorName) {
    const raw = (actorName || "").trim();
    if (!raw) return;

    // 1. Current Editor
    if (raw.toLowerCase() === "current_editor" || raw.toLowerCase() === "current editor") {
      ProfileGenerator.updateEditor(this.state);
      this.refreshAllControllers();
      return;
    }

    // 2. Saved Build
    const matchedBuild = this.state.savedBuilds.find(b =>
      b.name === raw ||
      b.id === raw ||
      b.name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_') === raw
    );
    if (matchedBuild) {
      if (this.buildsController) {
        this.buildsController.loadBuild(matchedBuild.id);
      } else {
        this.state.applyBuildSnapshot(matchedBuild);
        this.refreshAllControllers();
      }
      return;
    }

    // 3. Next Talent Finder
    if (raw.startsWith("Next: ")) {
      const talName = raw.replace(/^Next:\s*/, '').replace(/\s*\(\+\d+pt\)$/, '').trim();
      const heroKey = (this.state.selectedHero || "rime").toLowerCase();
      const heroDef = HERO_DEFINITIONS[heroKey] || HERO_DEFINITIONS["rime"];
      let foundId = null;
      if (heroDef && heroDef.tiers) {
        for (const tier of heroDef.tiers) {
          for (const t of (tier.talents || [])) {
            if (t.name.toLowerCase() === talName.toLowerCase() || t.id.toLowerCase() === talName.toLowerCase()) {
              foundId = t.id;
              break;
            }
          }
          if (foundId) break;
        }
      }
      if (foundId) {
        if (!this.state.selectedTalents.includes(foundId)) {
          this.state.selectedTalents.push(foundId);
        }
      }
      this.refreshAllControllers();
      return;
    }

    // 4. Blessings Finder
    const bMatch = raw.match(/^(.+?)\s*(?:\(\+1\s*->\s*(\d+)\/4\)|\((\d+)\/4(?:\s+Max)?\))$/i);
    if (bMatch) {
      const bName = bMatch[1].trim();
      const count = parseInt(bMatch[2] || bMatch[3] || "4");
      const foundBlessing = ALL_BLESSINGS.find(b => b.name.toLowerCase() === bName.toLowerCase() || b.id.toLowerCase() === bName.toLowerCase());
      if (foundBlessing) {
        if (!this.state.blessingCounts) this.state.blessingCounts = {};
        if (raw.includes("Max") || bMatch[3]) {
          // Isolated mode: clear others
          this.state.blessingCounts = { [foundBlessing.id]: count };
        } else {
          this.state.blessingCounts[foundBlessing.id] = count;
        }
      }
      this.refreshAllControllers();
      return;
    }

    // 5. Traits Finder
    const trMatch = raw.match(/^(.+?)\s*(?:\(\+1\s*->\s*R(\d+)\)|\(R(\d+)\)|\(4\/4(?:\s+Max)?\))$/i);
    if (trMatch) {
      const trName = trMatch[1].trim();
      let rank = 4;
      if (trMatch[2]) rank = parseInt(trMatch[2]);
      else if (trMatch[3]) rank = parseInt(trMatch[3]);
      const foundTrait = ALL_WEAPON_TRAITS.find(t => t.name.toLowerCase() === trName.toLowerCase() || t.id.toLowerCase() === trName.toLowerCase());
      if (foundTrait) {
        if (!this.state.traitCounts) this.state.traitCounts = {};
        if (raw.includes("Max") || trMatch[3] || raw.includes("4/4")) {
          // Isolated mode: clear others
          this.state.traitCounts = { [foundTrait.id]: rank };
        } else {
          this.state.traitCounts[foundTrait.id] = rank;
        }
      }
      this.refreshAllControllers();
      return;
    }

    // 6. Sets Finder
    if (raw.startsWith("Set: ") || raw.startsWith("Solo Set: ")) {
      const isSolo = raw.startsWith("Solo Set: ");
      const setName = raw.replace(/^(?:Set:\s*|Solo Set:\s*)/, '').replace(/\s*\(\+1\)$/, '').trim();
      const foundSet = ALL_GEAR_SETS.find(s => s.name.toLowerCase() === setName.toLowerCase() || s.id.toLowerCase() === setName.toLowerCase());
      if (foundSet) {
        if (isSolo) {
          this.state.activeSets = new Set([foundSet.id]);
        } else {
          if (!(this.state.activeSets instanceof Set)) {
            this.state.activeSets = new Set(this.state.activeSets || []);
          }
          this.state.activeSets.add(foundSet.id);
        }
      }
      this.refreshAllControllers();
      return;
    }

    // 7. Stats Finder
    const statRatingsMatch = raw.match(/C[:]?\s*(\d+)\s+H[:]?\s*(\d+)\s+E[:]?\s*(\d+)\s+S[:]?\s*(\d+)/i);
    if (statRatingsMatch) {
      if (!this.state.stats) this.state.stats = {};
      this.state.stats.crit = parseInt(statRatingsMatch[1]);
      this.state.stats.haste = parseInt(statRatingsMatch[2]);
      this.state.stats.expertise = parseInt(statRatingsMatch[3]);
      this.state.stats.spirit = parseInt(statRatingsMatch[4]);
      this.refreshAllControllers();
      return;
    }

    if (raw.startsWith("+")) {
      const statDeltaMatch = raw.match(/^\+(\d+)\s*(Crit|Haste|Expertise|Spirit)/i);
      if (statDeltaMatch) {
        const delta = parseInt(statDeltaMatch[1]);
        const sType = statDeltaMatch[2].toLowerCase();
        if (!this.state.stats) this.state.stats = {};
        if (sType.startsWith("crit")) this.state.stats.crit = (this.state.stats.crit || 0) + delta;
        else if (sType.startsWith("haste")) this.state.stats.haste = (this.state.stats.haste || 0) + delta;
        else if (sType.startsWith("exp")) this.state.stats.expertise = (this.state.stats.expertise || 0) + delta;
        else if (sType.startsWith("spirit")) this.state.stats.spirit = (this.state.stats.spirit || 0) + delta;
      }
      this.refreshAllControllers();
      return;
    }
  }

  refreshAllControllers() {
    if (this.heroController) {
      this.heroController.selectHero(this.state.selectedHero, false);
      this.heroController.renderTalentTree();
    }
    if (this.statsController) {
      this.statsController.updateInputs();
    }
    if (this.gearController) {
      this.gearController.updateGemInputs();
      this.gearController.renderGearSets();
      this.gearController.renderWeaponTraits();
      this.gearController.renderBlessings();
    }
    ProfileGenerator.updateEditor(this.state);
  }

  async runSimulation() {
    ProfileGenerator.updateEditor(this.state);
    const profileEditor = document.getElementById("raw-profile-editor") || document.getElementById("editor-profile");
    const profileText = (profileEditor && profileEditor.value.trim()) ? profileEditor.value : ProfileGenerator.generate(this.state);

    const btnRun = document.getElementById("btn-run-sim");
    if (btnRun) {
      btnRun.disabled = true;
      btnRun.innerHTML = `<span>STARTING SIM...</span>`;
    }

    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_text: profileText })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      this.attachToSimulationStream();
    } catch (e) {
      if (btnRun) {
        btnRun.disabled = false;
        btnRun.innerHTML = `<span>RUN SIM</span>`;
      }
      alert("Failed to start simulation: " + e.message);
    }
  }

  async stopSimulation() {
    const btnStop = document.getElementById("btn-stop-sim");
    if (btnStop) {
      btnStop.disabled = true;
      btnStop.textContent = "STOPPING...";
    }
    try {
      await fetch("/api/simulation/stop", { method: "POST" });
    } catch (e) {
      console.error("Failed to stop simulation:", e);
    }
  }

  async attachToSimulationStream() {
    const consoleBox = document.getElementById("sim-console-output");
    const dpsVal = document.getElementById("result-dps-value");
    const metaVal = document.getElementById("result-meta-info");
    const btnRun = document.getElementById("btn-run-sim");
    const btnStop = document.getElementById("btn-stop-sim");
    const btnHtml = document.getElementById("btn-open-html-report");
    const compareCard = document.getElementById("compare-results-card");

    if (compareCard) compareCard.classList.add("hidden");

    // Switch to results tab
    document.querySelectorAll(".fg-tab, .nav-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    const resTab = document.querySelector('[data-tab="tab-results"]');
    const resPane = document.getElementById("tab-results");
    if (resTab) resTab.classList.add("active");
    if (resPane) resPane.classList.add("active");

    if (btnRun) {
      btnRun.disabled = true;
      btnRun.innerHTML = `<span>RUNNING SIM...</span>`;
    }
    if (btnStop) {
      btnStop.classList.remove("hidden");
      btnStop.disabled = false;
      btnStop.textContent = "STOP SIM";
    }
    if (btnHtml) btnHtml.classList.add("hidden");

    const iters = this.state.iterations || 1000;
    const threads = this.state.threads || ((typeof navigator !== "undefined" && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : 4);
    const itersFormatted = iters.toLocaleString();

    if (dpsVal && (!dpsVal.textContent || dpsVal.textContent === "-- DPS" || dpsVal.textContent === "0 DPS")) {
      dpsVal.textContent = "SIMULATING...";
    }
    if (metaVal && (!metaVal.textContent || metaVal.textContent.startsWith("Executing"))) {
      metaVal.textContent = `Executing ${itersFormatted} iterations across ${threads} threads...`;
    }

    let logLines = [];
    const maxLogLines = 150;
    let isDirty = false;
    let animId = null;

    const renderLoop = () => {
      if (isDirty && consoleBox) {
        consoleBox.textContent = logLines.join("\n");
        consoleBox.scrollTop = consoleBox.scrollHeight;
        isDirty = false;
      }
      animId = requestAnimationFrame(renderLoop);
    };
    animId = requestAnimationFrame(renderLoop);

    const appendLog = (text, eol) => {
      if (eol === "\r") {
        if (logLines.length > 0) {
          logLines[logLines.length - 1] = text;
        } else {
          logLines.push(text);
        }
      } else {
        logLines.push(text);
        if (logLines.length > maxLogLines) {
          logLines.shift();
        }
      }
      isDirty = true;
    };

    const startTime = Date.now();
    try {
      const res = await fetch("/api/simulation/stream");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const events = sseBuffer.split("\n\n");
        sseBuffer = events.pop() || "";

        for (const evtBlock of events) {
          if (!evtBlock.trim()) continue;
          const lines = evtBlock.split("\n");
          let eventType = "message";
          let eventData = null;

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              try {
                eventData = JSON.parse(line.slice(5).trim());
              } catch (e) {
                eventData = line.slice(5).trim();
              }
            }
          }

          if (eventType === "log" && eventData) {
            appendLog(eventData.text || "", eventData.eol || "\n");
          } else if (eventType === "done" && eventData) {
            if (animId) {
              cancelAnimationFrame(animId);
              animId = null;
            }

            const elapsedTotal = eventData.elapsed_seconds || ((Date.now() - startTime) / 1000).toFixed(2);
            const meanDps = eventData.mean_dps ? Math.round(eventData.mean_dps) : 0;
            const dpsStr = meanDps > 0 ? `${meanDps.toLocaleString()} DPS` : "COMPLETED";

            if (dpsVal) dpsVal.textContent = dpsStr;
            if (metaVal) metaVal.textContent = `${itersFormatted} Iterations • ${elapsedTotal}s elapsed • Exit code: ${eventData.return_code}`;

            if (consoleBox && eventData.report) {
              const fullReportLines = eventData.report.split("\n");
              if (fullReportLines.length > 250) {
                consoleBox.textContent = fullReportLines.slice(-250).join("\n");
              } else {
                consoleBox.textContent = eventData.report;
              }
              consoleBox.scrollTop = 0;
            }

            if (eventData.players && eventData.players.length > 1) {
              this.renderCompareLeaderboard(eventData.players, eventData.baseline_name);
            }

            if (btnHtml) {
              btnHtml.classList.toggle("hidden", !eventData.has_html);
              btnHtml.disabled = !eventData.has_html;
            }
          }
        }
      }
    } catch (e) {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      if (dpsVal) dpsVal.textContent = "ERROR";
      if (metaVal) metaVal.textContent = `Simulation failed: ${e.message}`;
      if (consoleBox) {
        consoleBox.textContent += `\n\n[Client Error] Simulation stream disconnected: ${e.message}`;
      }
    } finally {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      if (btnRun) {
        btnRun.disabled = false;
        btnRun.innerHTML = `<span>RUN SIM</span>`;
      }
      const btnStop = document.getElementById("btn-stop-sim");
      if (btnStop) {
        btnStop.classList.add("hidden");
        btnStop.disabled = false;
        btnStop.textContent = "STOP SIM";
      }
    }
  }
}
