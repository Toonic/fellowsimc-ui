// Tab 3: Modes Controller
import { CompareController } from "../modules/compare.js";
import { UpgradeFinderController } from "../modules/upgrade_finder.js";
import { ProfileGenerator } from "../modules/profile.js";

export class ModesTab {
  constructor(state, onProfileUpdate) {
    this.state = state;
    this.onProfileUpdate = onProfileUpdate || (() => ProfileGenerator.updateEditor(this.state));
    this.compare = new CompareController(this.state, this.onProfileUpdate);
    this.upgradeFinder = new UpgradeFinderController(this.state, this.onProfileUpdate);
  }

  init() {
    this.compare.init();
    this.upgradeFinder.init();
    this.#initModeCards();
    this.#initRouteSelector();
    this.#initScaleInputs();
  }

  #initModeCards() {
    document.querySelectorAll(".mode-card").forEach(card => {
      card.addEventListener("click", (e) => {
        if (["INPUT", "BUTTON", "SELECT"].includes(e.target.tagName)) return;
        document.querySelectorAll(".mode-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        this.state.activeMode = card.dataset.mode || "dungeon";
        this.onProfileUpdate();
      });
    });
  }

  #initRouteSelector() {
    const selDungeonRoute = document.getElementById("select-dungeon-route");
    if (!selDungeonRoute) return;

    selDungeonRoute.addEventListener("change", (e) => {
      this.state.selectedRouteType = e.target.value;
      const desc = document.getElementById("dungeon-route-desc");
      if (desc) {
        desc.textContent = e.target.value === "eternal_62"
          ? "Exported from a Wyrmheart 62 route."
          : this.state.customRouteText
            ? "Custom route imported from log."
            : "Custom route (import a log below).";
      }
      this.onProfileUpdate();
    });
  }

  #initScaleInputs() {
    const inputScale = document.getElementById("input-scale-pct");
    if (inputScale) {
      inputScale.addEventListener("input", (e) => {
        this.state.scalePct = parseFloat(e.target.value) || 100.0;
        this.onProfileUpdate();
      });
    }

    const checkScale = document.getElementById("check-scale-damage");
    if (checkScale) {
      checkScale.addEventListener("change", (e) => {
        this.state.enableScale = e.target.checked;
        this.onProfileUpdate();
      });
    }

    const refresh = () => this.onProfileUpdate();
    document.getElementById("input-st-duration")?.addEventListener("input", refresh);
    document.getElementById("input-aoe-targets")?.addEventListener("input", refresh);
    document.getElementById("input-aoe-duration")?.addEventListener("input", refresh);
  }
}

