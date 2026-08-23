import { state } from "./state.js";
import { ALL_HERO_TALENTS } from "./data/heroes/index.js";
import { ProfileGenerator } from "./modules/profile.js";
import { HeroPickerController } from "./modules/hero_picker.js";
import { StatsController } from "./modules/stats.js";
import { GearController } from "./modules/gear.js";
import { LogImporter } from "./modules/importer.js";
import { SimRunner } from "./modules/simulator.js";
import { BuildsController } from "./modules/builds.js";
import { CompareController } from "./modules/compare.js";
import { UpgradeFinderController } from "./modules/upgrade_finder.js";

class Application {
  constructor() {
    this.state = state;
    this.state.talentsData = ALL_HERO_TALENTS;
    this.heroPicker = new HeroPickerController(this.state);
    this.statsController = new StatsController(this.state);
    this.gearController = new GearController(this.state);
    this.compare = new CompareController(this.state, () => ProfileGenerator.updateEditor(this.state));
    this.upgradeFinder = new UpgradeFinderController(this.state, () => ProfileGenerator.updateEditor(this.state));
    this.importer = new LogImporter(this.state, this.heroPicker, this.gearController, this.statsController);
    this.builds = new BuildsController(this.state, this.heroPicker, this.gearController, this.statsController, this.compare);
    this.simulator = new SimRunner(this.state, this.builds, this.heroPicker, this.gearController, this.statsController);
  }

  async init() {
    this.#initTabs();
    this.heroPicker.init();
    this.heroPicker.onHeroChange = () => {
      this.compare.renderCompareBuildsList();
    };
    this.statsController.init();
    this.gearController.init();
    this.compare.init();
    this.upgradeFinder.init();
    this.builds.init();
    this.importer.init();
    this.simulator.init();
    this.#initModeCards();
    this.#initRouteSelector();
    this.#initScaleInputs();
    this.#initAplControls();
    this.#initIterationControls();

    this.heroPicker.selectHero("rime", false);
    this.simulator.checkApiConfig();
    ProfileGenerator.updateEditor(this.state);
  }

  // ─── Private Methods ──────────────────────────────────────────────────────

  /** Set up tab switching between all nav-tab / tab-pane pairs. */
  #initTabs() {
    const tabs = document.querySelectorAll(".nav-tab");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        const targetPane = document.getElementById(tab.dataset.tab);
        if (targetPane) targetPane.classList.add("active");
        ProfileGenerator.updateEditor(this.state);
      });
    });
  }

  /** Wire the simulation mode cards (Dungeon / ST / AoE) to state. */
  #initModeCards() {
    document.querySelectorAll(".mode-card").forEach(card => {
      card.addEventListener("click", (e) => {
        if (["INPUT", "BUTTON", "SELECT"].includes(e.target.tagName)) return;
        document.querySelectorAll(".mode-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        this.state.activeMode = card.dataset.mode || "dungeon";
        ProfileGenerator.updateEditor(this.state);
      });
    });
  }

  /** Wire the dungeon route selector and associated description text. */
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
      ProfileGenerator.updateEditor(this.state);
    });
  }

  /** Wire the damage scale % checkbox and input, plus ST/AoE duration inputs. */
  #initScaleInputs() {
    const inputScale = document.getElementById("input-scale-pct");
    if (inputScale) {
      inputScale.addEventListener("input", (e) => {
        this.state.scalePct = parseFloat(e.target.value) || 100.0;
        ProfileGenerator.updateEditor(this.state);
      });
    }

    const checkScale = document.getElementById("check-scale-damage");
    if (checkScale) {
      checkScale.addEventListener("change", (e) => {
        this.state.enableScale = e.target.checked;
        ProfileGenerator.updateEditor(this.state);
      });
    }

    const refresh = () => ProfileGenerator.updateEditor(this.state);
    document.getElementById("input-st-duration")?.addEventListener("input", refresh);
    document.getElementById("input-aoe-targets")?.addEventListener("input", refresh);
    document.getElementById("input-aoe-duration")?.addEventListener("input", refresh);
  }

  /** Wire APL preset selector and the custom APL toggle + editor. */
  #initAplControls() {
    const selectApl = document.getElementById("select-apl-preset");
    if (selectApl) {
      selectApl.addEventListener("change", (e) => {
        this.state.aplChoice = e.target.value;
        ProfileGenerator.updateEditor(this.state);
      });
    }

    const customAplCheck = document.getElementById("check-custom-apl");
    const customAplCont  = document.getElementById("custom-apl-container");
    if (customAplCheck && customAplCont) {
      customAplCheck.checked = this.state.useCustomApl;
      customAplCont.classList.toggle("hidden", !this.state.useCustomApl);
      if (selectApl) selectApl.disabled = this.state.useCustomApl;

      customAplCheck.addEventListener("change", (e) => {
        this.state.useCustomApl = e.target.checked;
        customAplCont.classList.toggle("hidden", !e.target.checked);
        if (selectApl) selectApl.disabled = this.state.useCustomApl;
        ProfileGenerator.updateEditor(this.state);
      });
    }

    const customAplEd = document.getElementById("custom-apl-editor");
    if (customAplEd) {
      customAplEd.value = this.state.customAplText;
      customAplEd.addEventListener("input", (e) => {
        this.state.customAplText = e.target.value;
        if (this.state.useCustomApl) ProfileGenerator.updateEditor(this.state);
      });
    }
  }

  /** Wire the iteration count chips + manual input, and the thread count input. */
  #initIterationControls() {
    const inputIter = document.getElementById("input-iterations");
    if (inputIter) {
      inputIter.addEventListener("input", (e) => {
        this.state.iterations = parseInt(e.target.value) || 1000;
        ProfileGenerator.updateEditor(this.state);
      });
    }

    document.querySelectorAll(".btn-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".btn-chip").forEach(c => {
          c.classList.remove("btn-primary");
          c.classList.add("btn-secondary");
        });
        chip.classList.remove("btn-secondary");
        chip.classList.add("btn-primary");

        const iters = parseInt(chip.dataset.iterations) || 1000;
        this.state.iterations = iters;
        if (inputIter) inputIter.value = iters;
        ProfileGenerator.updateEditor(this.state);
      });
    });

    const defaultThreads = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : 4;
    const inputThr = document.getElementById("input-threads");
    if (inputThr) {
      inputThr.value = this.state.threads || defaultThreads;
      inputThr.addEventListener("input", (e) => {
        this.state.threads = parseInt(e.target.value) || defaultThreads;
        ProfileGenerator.updateEditor(this.state);
      });
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new Application();
  app.init();
});
