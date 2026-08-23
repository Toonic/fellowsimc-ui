// Simulation Execution and Results Streaming Module
import { ProfileGenerator } from "./profile.js";

export class SimRunner {
  constructor(state) {
    this.state = state;
  }

  init() {
    const btnRun = document.getElementById("btn-run-sim");
    if (btnRun) {
      btnRun.addEventListener("click", () => this.runSimulation());
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

  renderCompareLeaderboard(players) {
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
    const baselineDps = players[players.length - 1].dps || 1;

    players.forEach((p, idx) => {
      const dps = Math.round(p.dps);
      const barPct = Math.max(12, Math.round((p.dps / topDps) * 100));
      const diffFromTop = Math.round(p.dps - topDps);
      const diffPctTop = ((p.dps - topDps) / topDps * 100).toFixed(1);
      const diffFromBaseline = Math.round(p.dps - baselineDps);
      const diffPctBaseline = ((p.dps - baselineDps) / baselineDps * 100).toFixed(1);

      const isWinner = idx === 0;
      const rankClass = idx === 0 ? "rank-gold" : idx === 1 ? "rank-silver" : idx === 2 ? "rank-bronze" : "rank-default";

      const row = document.createElement("div");
      row.className = `compare-result-row ${isWinner ? "winner" : ""}`;
      row.innerHTML = `
        <div class="compare-rank-badge ${rankClass}">#${idx + 1}</div>
        <div class="compare-bar-container">
          <div class="compare-bar-meta">
            <strong class="compare-actor-name">${p.name.replace(/_/g, ' ')}</strong>
            <div class="compare-dps-values">
              <span class="compare-dps-main">${dps.toLocaleString()} DPS</span>
              ${idx > 0 ? `<span class="compare-dps-delta negative">${diffFromTop.toLocaleString()} (${diffPctTop}%)</span>` : `<span class="compare-dps-delta winner-tag">TOP BUILD</span>`}
            </div>
          </div>
          <div class="compare-bar-track">
            <div class="compare-bar-fill ${isWinner ? "gold-gradient" : "blue-gradient"}" style="width: ${barPct}%;"></div>
          </div>
          <div class="compare-bar-subtext">
            <span>Range: ${Math.round(p.range).toLocaleString()} DPS (${p.range_pct}%)</span>
            <span>Error: ±${Math.round(p.error)} DPS</span>
            ${idx !== players.length - 1 && diffFromBaseline > 0 ? `<span class="gain-badge">+${diffFromBaseline.toLocaleString()} (+${diffPctBaseline}%) vs lowest</span>` : ""}
          </div>
        </div>
      `;
      container.appendChild(row);
    });
  }

  async runSimulation() {
    ProfileGenerator.updateEditor(this.state);
    const profileText = ProfileGenerator.generate(this.state);
    const consoleBox = document.getElementById("sim-console-output");
    const dpsVal = document.getElementById("result-dps-value");
    const metaVal = document.getElementById("result-meta-info");
    const btnRun = document.getElementById("btn-run-sim");
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
    if (btnHtml) btnHtml.classList.add("hidden");

    const iters = this.state.iterations || 1000;
    const threads = this.state.threads || 12;
    const itersFormatted = iters.toLocaleString();

    if (dpsVal) dpsVal.textContent = "SIMULATING...";
    if (metaVal) metaVal.textContent = `Executing ${itersFormatted} iterations across ${threads} threads...`;
    if (consoleBox) {
      consoleBox.textContent = "";
    }

    const startTime = Date.now();
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
            if (consoleBox) {
              const text = eventData.text || "";
              const eol = eventData.eol || "\n";
              if (eol === "\r" && consoleBox.textContent) {
                const curLines = consoleBox.textContent.split("\n");
                curLines[curLines.length - 1] = text;
                consoleBox.textContent = curLines.join("\n");
              } else {
                consoleBox.textContent += (consoleBox.textContent ? "\n" : "") + text;
              }
              consoleBox.scrollTop = consoleBox.scrollHeight;
            }
          } else if (eventType === "done" && eventData) {
            const elapsedTotal = eventData.elapsed_seconds || ((Date.now() - startTime) / 1000).toFixed(2);
            const meanDps = eventData.mean_dps ? Math.round(eventData.mean_dps) : 0;
            const dpsStr = meanDps > 0 ? `${meanDps.toLocaleString()} DPS` : "COMPLETED";

            if (dpsVal) dpsVal.textContent = dpsStr;
            if (metaVal) metaVal.textContent = `${itersFormatted} Iterations • ${elapsedTotal}s elapsed • Exit code: ${eventData.return_code}`;

            if (consoleBox && eventData.report) {
              consoleBox.textContent += "\n\n" + eventData.report;
              consoleBox.scrollTop = 0;
            }

            if (eventData.players && eventData.players.length > 1) {
              this.renderCompareLeaderboard(eventData.players);
            }

            if (btnHtml) {
              btnHtml.classList.toggle("hidden", !eventData.has_html);
              btnHtml.disabled = !eventData.has_html;
            }
          }
        }
      }
    } catch (e) {
      if (dpsVal) dpsVal.textContent = "ERROR";
      if (metaVal) metaVal.textContent = "Execution error.";
      if (consoleBox) consoleBox.textContent += "\n\nSimulation execution error: " + e;
    } finally {
      if (btnRun) {
        btnRun.disabled = false;
        btnRun.innerHTML = `<span>RUN SIM</span>`;
      }
    }
  }
}
