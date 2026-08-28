// FellowSimc Main Application Orchestrator
import { state } from "./state.js";
import { ALL_HERO_TALENTS } from "./data/heroes/index.js";
import { ProfileGenerator } from "./modules/profile.js";

// Tab Controllers
import { ImporterTab } from "./tabs/tab_importer.js";
import { HeroTab } from "./tabs/tab_hero.js";
import { ModesTab } from "./tabs/tab_modes.js";
import { AdvancedTab } from "./tabs/tab_advanced.js";
import { ResultsTab } from "./tabs/tab_results.js";

const TAB_DEFINITIONS = [
  { id: "tab-importer", file: "tabs/tab_importer.html" },
  { id: "tab-hero",     file: "tabs/tab_hero.html" },
  { id: "tab-modes",    file: "tabs/tab_modes.html" },
  { id: "tab-advanced", file: "tabs/tab_advanced.html" },
  { id: "tab-results",  file: "tabs/tab_results.html" }
];

class Application {
  constructor() {
    this.state = state;
    this.state.talentsData = ALL_HERO_TALENTS;

    // Instantiate tab controllers
    this.modesTab = new ModesTab(this.state, () => ProfileGenerator.updateEditor(this.state));
    this.heroTab = new HeroTab(this.state, this.modesTab.compare);
    this.importerTab = new ImporterTab(
      this.state,
      this.heroTab.heroPicker,
      this.heroTab.gearController,
      this.heroTab.statsController
    );
    this.advancedTab = new AdvancedTab(this.state, () => ProfileGenerator.updateEditor(this.state));
    this.resultsTab = new ResultsTab(
      this.state,
      this.heroTab.builds,
      this.heroTab.heroPicker,
      this.heroTab.gearController,
      this.heroTab.statsController
    );
  }

  /** Load each tab's standalone HTML template into the main content container. */
  async loadTabTemplates() {
    const mainContainer = document.getElementById("main-content");
    if (!mainContainer) return;

    // Skip if tabs are already injected
    if (document.getElementById("tab-importer")) return;

    const htmlFragments = await Promise.all(
      TAB_DEFINITIONS.map(async (tab) => {
        try {
          const res = await fetch(tab.file);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.text();
        } catch (e) {
          console.error(`Failed to load ${tab.file}:`, e);
          return `<section id="${tab.id}" class="tab-pane"><div class="card"><p>Failed to load tab template: ${tab.file}</p></div></section>`;
        }
      })
    );

    mainContainer.innerHTML = htmlFragments.join("\n");
  }

  async init() {
    // 1. Load HTML templates for all 5 tabs
    await this.loadTabTemplates();

    // 2. Set up tab navigation
    this.#initTabs();

    // 3. Initialize tab controllers
    this.heroTab.init();
    this.modesTab.init();
    this.importerTab.init();
    this.advancedTab.init();
    this.resultsTab.init();

    // 4. Initial state setup
    this.heroTab.selectHero("rime", false);
    ProfileGenerator.updateEditor(this.state);
  }

  // ─── Private Navigation Setup ─────────────────────────────────────────────

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

        if (tab.dataset.tab === "tab-modes" && this.modesTab?.compare) {
          this.modesTab.compare.renderCompareBuildsList();
        } else if (tab.dataset.tab === "tab-hero" && this.heroTab?.builds) {
          this.heroTab.builds.populateLoadDropdown();
        }

        ProfileGenerator.updateEditor(this.state);
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new Application();
  app.init();
});
