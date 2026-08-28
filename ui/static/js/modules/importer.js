// FellowshipLogs Importer Module
import { HERO_DEFINITIONS } from "../data/heroes/index.js";
import { ProfileGenerator } from "./profile.js";
import { showThemedNotice } from "./modal_utils.js";

export class LogImporter {
  constructor(state, heroController, gearController, statsController) {
    this.state = state;
    this.heroController = heroController;
    this.gearController = gearController;
    this.statsController = statsController;
  }

  init() {
    const btnFetch = document.getElementById("btn-fetch-report");
    if (btnFetch) {
      btnFetch.addEventListener("click", () => this.fetchReport());
    }

    const btnLoadChar = document.getElementById("btn-load-character");
    if (btnLoadChar) {
      btnLoadChar.addEventListener("click", () => this.importCharacter());
    }

    const btnImportLogRoute = document.getElementById("btn-import-log-route");
    if (btnImportLogRoute) {
      btnImportLogRoute.addEventListener("click", () => this.importCustomRoute());
    }

    const inputRoute = document.getElementById("input-route-url");
    const btnUseCurrLog = document.getElementById("btn-use-current-log-route");

    const updateRouteButtonVisibility = () => {
      if (btnImportLogRoute && inputRoute) {
        btnImportLogRoute.classList.toggle("hidden", !inputRoute.value.trim());
      }
    };

    if (inputRoute) {
      inputRoute.addEventListener("input", updateRouteButtonVisibility);
    }

    if (btnUseCurrLog) {
      btnUseCurrLog.addEventListener("click", () => {
        const currentUrl = document.getElementById("input-report-url")?.value || "";
        if (inputRoute) {
          inputRoute.value = currentUrl;
          updateRouteButtonVisibility();
        }
      });
    }

    const selFight = document.getElementById("select-fight");
    if (selFight) {
      selFight.addEventListener("change", () => {
        this.updatePlayerDropdown(this.state.currentFights, this.state.currentActors, selFight.value);
      });
    }
  }

  async fetchReport() {
    const inputUrl = document.getElementById("input-report-url");
    const urlOrCode = inputUrl?.value.trim() || "";
    const btn = document.getElementById("btn-fetch-report");
    if (!btn || !urlOrCode) return;

    btn.textContent = "Fetching...";
    btn.disabled = true;

    try {
      const res = await fetch("/api/import-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url_or_code: urlOrCode })
      });
      const data = await res.json();
      if (data.error) {
        showThemedNotice({
          title: data.error_type === "api_key_missing" || data.error_type === "api_key_invalid"
            ? "API NOT CONFIGURED"
            : "REPORT IMPORT ERROR",
          message: data.error,
          type: "error",
          isApiConfig: data.error_type === "api_key_missing" || data.error_type === "api_key_invalid"
        });
        return;
      }

      this.state.reportCode = data.report_code;
      const fights = (data.report && data.report.fights) ? data.report.fights : [];
      const actors = (data.report && data.report.masterData) ? data.report.masterData.actors : [];

      this.state.currentFights = fights;
      this.state.currentActors = actors;

      // Populate Fights Dropdown
      let selectedFightId = data.default_fight_id != null ? data.default_fight_id : (fights[0] ? fights[0].id : 1);
      const selectFight = document.getElementById("select-fight");
      if (selectFight) {
        selectFight.innerHTML = "";
        fights.forEach(f => {
          const opt = document.createElement("option");
          opt.value = f.id;
          opt.textContent = `Fight ${f.id}: ${f.name} (${f.kill ? "Kill" : "Wipe"})`;
          if (data.default_fight_id != null && String(f.id) === String(data.default_fight_id)) {
            opt.selected = true;
            selectedFightId = f.id;
          }
          selectFight.appendChild(opt);
        });
        if (selectedFightId != null) {
          selectFight.value = String(selectedFightId);
        }
        if (selectFight.value) {
          selectedFightId = selectFight.value;
        }
      }

      this.updatePlayerDropdown(fights, actors, selectedFightId, data.default_source_id);

      const importArea = document.getElementById("import-selection-area");
      if (importArea) importArea.classList.remove("hidden");
    } catch (e) {
      showThemedNotice({
        title: "NETWORK ERROR",
        message: "Failed to connect to server: " + e.message,
        type: "error",
        isApiConfig: false
      });
    } finally {
      btn.textContent = "FETCH FIGHTS";
      btn.disabled = false;
    }
  }

  getHeroClassName(actor) {
    if (actor.subType && actor.subType !== "Player" && actor.subType.toLowerCase() !== "unknown") {
      return actor.subType;
    }
    if (actor.type && actor.type !== "Player" && actor.type.toLowerCase() !== "unknown") {
      return actor.type;
    }
    if (actor.icon && !actor.icon.toLowerCase().includes("unknown")) {
      const cleanIcon = actor.icon.split("-")[0].replace(/[^a-zA-Z]/g, '');
      if (cleanIcon && cleanIcon.toLowerCase() !== "unknown") {
        return cleanIcon.charAt(0).toUpperCase() + cleanIcon.slice(1);
      }
    }
    return "Unknown";
  }

  updatePlayerDropdown(fights, actors, selectedFightId, defaultSourceId = null) {
    const selectPlayer = document.getElementById("select-player");
    if (!selectPlayer) return;
    selectPlayer.innerHTML = "";

    const fight = (fights || []).find(f => String(f.id) === String(selectedFightId));
    let filteredActors = actors || [];
    if (fight && Array.isArray(fight.friendlyPlayers) && fight.friendlyPlayers.length > 0) {
      const allowedIds = new Set(fight.friendlyPlayers.map(id => String(id)));
      const subset = (actors || []).filter(a => allowedIds.has(String(a.id)));
      if (subset.length > 0) {
        filteredActors = subset;
      }
    }

    const validPlayers = [];
    const seenNames = new Set();

    filteredActors.forEach(a => {
      const heroClass = this.getHeroClassName(a);
      if (heroClass === "Unknown" || heroClass.toLowerCase() === "unknown") return;
      const cleanName = (a.name || "").trim().toLowerCase();
      if (seenNames.has(cleanName)) return;
      seenNames.add(cleanName);
      validPlayers.push({ actor: a, heroClass: heroClass });
    });

    validPlayers.forEach((item, idx) => {
      const a = item.actor;
      const heroClass = item.heroClass;
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.dataset.name = a.name;
      opt.dataset.type = heroClass.toLowerCase();
      opt.textContent = `${a.name} (${heroClass})`;
      if (defaultSourceId) {
        if (String(a.id) === String(defaultSourceId) || a.name.toLowerCase() === String(defaultSourceId).toLowerCase()) {
          opt.selected = true;
        }
      } else if (idx === 0) {
        opt.selected = true;
      }
      selectPlayer.appendChild(opt);
    });
  }

  async importCharacter() {
    const inputUrl = document.getElementById("input-report-url");
    const urlOrCode = inputUrl ? inputUrl.value.trim() : "";
    const reportCode = this.state.reportCode || urlOrCode;

    const selectFight = document.getElementById("select-fight");
    const selectPlayer = document.getElementById("select-player");
    const fightId = selectFight && selectFight.value ? parseInt(selectFight.value) : (this.state.selectedFightId || 1);
    const playerId = selectPlayer && selectPlayer.value ? parseInt(selectPlayer.value) : (this.state.selectedPlayerId || 1);
    const playerName = selectPlayer && selectPlayer.selectedOptions && selectPlayer.selectedOptions[0] ? selectPlayer.selectedOptions[0].dataset.name : (this.state.selectedPlayerName || "Toonic");

    this.state.selectedFightId = fightId;
    this.state.selectedPlayerId = playerId;
    this.state.selectedPlayerName = playerName;

    const btn = document.getElementById("btn-load-character");
    if (btn) {
      btn.textContent = "Importing Loadout...";
      btn.disabled = true;
    }

    try {
      const res = await fetch("/api/import-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url_or_code: reportCode,
          report_code: reportCode,
          fight_id: fightId,
          player_id: playerId,
          player_name: playerName
        })
      });
      const data = await res.json();
      if (data.error) {
        showThemedNotice({
          title: data.error_type === "api_key_missing" || data.error_type === "api_key_invalid"
            ? "API NOT CONFIGURED"
            : "IMPORT FAILED",
          message: data.error,
          type: "error",
          isApiConfig: data.error_type === "api_key_missing" || data.error_type === "api_key_invalid"
        });
        return;
      }

      this.state.characterData = data;
      const gen = data.generated_profile_components || data.generated_profile;

      // Switch Hero
      const rawHeroType = (gen.hero_type || "rime").toLowerCase();
      const heroKey = HERO_DEFINITIONS[rawHeroType] ? rawHeroType : "rime";
      this.heroController.selectHero(heroKey, false);

      // Summary Header
      const nameEl = document.getElementById("summary-name");
      const classEl = document.getElementById("summary-class");
      if (nameEl) nameEl.textContent = playerName.toUpperCase();
      if (classEl) classEl.textContent = heroKey.toUpperCase();

      // Summary Quick Stats
      const statsEl = document.getElementById("summary-stats");
      if (statsEl) {
        statsEl.innerHTML = `
          <span>Primary: <strong>${gen.attrs.Intellect || gen.attrs.Agility || gen.attrs.Strength || gen.attrs.Attack_Power || 183}</strong></span>
          <span>Stam: <strong>${gen.attrs.Stamina}</strong></span>
          <span>Haste: <strong>${gen.attrs.Haste}</strong></span>
          <span>Crit: <strong>${gen.attrs['Critical Strike']}</strong></span>
          <span>Expertise: <strong>${gen.attrs.Expertise}</strong></span>
          <span>Spirit: <strong>${gen.attrs.Spirit}</strong></span>
          <span>Armor: <strong>${gen.attrs.Armor}</strong></span>
        `;
      }
      const badgeCard = document.getElementById("character-summary-badge");
      if (badgeCard) badgeCard.classList.remove("hidden");

      // Direct Stat Inputs (gen.attrs already includes +100 base primary stat for UI display)
      const rawPrim = gen.attrs.Intellect || gen.attrs.Agility || gen.attrs.Strength || gen.attrs.Attack_Power || 159;
      const primStatVal = rawPrim;

      this.state.stats = {
        primary: primStatVal,
        stamina: gen.attrs.Stamina || 0,
        haste: gen.attrs.Haste || 0,
        expertise: gen.attrs.Expertise || 0,
        crit: gen.attrs["Critical Strike"] || 0,
        spirit: gen.attrs.Spirit || 0,
        armor: gen.attrs.Armor || 0
      };

      this.statsController.updateInputs();

      // Talents
      this.state.selectedTalents.clear();
      const heroTree = this.state.talentsData?.[heroKey] || this.state.talentsData?.["rime"];
      const allHeroTalents = [];
      if (heroTree && heroTree.tiers) {
        heroTree.tiers.forEach(tr => {
          tr.talents.forEach(tal => allHeroTalents.push(tal));
        });
      }

      if (Array.isArray(gen.talents)) {
        gen.talents.forEach(tStr => {
          const rawClean = tStr.toLowerCase().replace(/[^a-z0-9]/g, '');
          const matched = allHeroTalents.find(tal => {
            const idClean = tal.id.toLowerCase().replace(/[^a-z0-9]/g, '');
            const nameClean = tal.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return idClean === rawClean || nameClean === rawClean;
          });
          if (matched) {
            this.state.selectedTalents.add(matched.id);
          } else {
            this.state.selectedTalents.add(tStr.toLowerCase().replace(/[^a-z0-9]/g, '_'));
          }
        });
      }
      this.heroController.renderTalentTree();

      // Gems, Traits, Blessings
      this.state.gems = {
        sapphire: gen.gems?.sapphire || 0,
        amethyst: gen.gems?.amethyst || 0,
        emerald: gen.gems?.emerald || 0,
        ruby: gen.gems?.ruby || 0,
        diamond: gen.gems?.diamond || 0,
        topaz: gen.gems?.topaz || 0
      };
      this.gearController.updateGemInputs();

      this.state.traitCounts = gen.trait_counts || {};
      this.state.blessingCounts = gen.blessing_counts || {};
      this.state.gearItemNames = gen.gear_item_names || this.state.gearItemNames || {};
      this.state.gearAffixes = gen.gear_items_output || [];
      this.state.weapon = gen.weapon || "chronoshift";

      const selWeap = document.getElementById("select-weapon");
      if (selWeap) selWeap.value = this.state.weapon;

      if (gen.legendary && gen.legendary !== "none") {
        this.state.legendary = gen.legendary;
      } else {
        this.state.legendary = "none";
      }
      const selectLeg = document.getElementById("select-legendary");
      if (selectLeg) selectLeg.value = this.state.legendary;

      if (gen.active_sets && Array.isArray(gen.active_sets)) {
        this.state.activeSets = new Set(gen.active_sets);
      }
      this.gearController.renderGearSets();
      this.gearController.renderWeaponTraits();
      this.gearController.renderBlessings();

      ProfileGenerator.updateEditor(this.state);
    } catch (e) {
      showThemedNotice({
        title: "IMPORT ERROR",
        message: "Failed to import character loadout: " + e.message,
        type: "error",
        isApiConfig: false
      });
    } finally {
      if (btn) {
        btn.textContent = "IMPORT CHARACTER LOADOUT";
        btn.disabled = false;
      }
    }
  }

  async importCustomRoute() {
    const urlOrCode = document.getElementById("input-route-url")?.value || this.state.reportCode;
    const selectFight = document.getElementById("select-fight");
    const fightId = selectFight ? parseInt(selectFight.value) : (this.state.selectedFightId || 32);
    const statusDiv = document.getElementById("route-import-status");
    const btn = document.getElementById("btn-import-log-route");

    if (btn) {
      btn.textContent = "Importing Route...";
      btn.disabled = true;
    }

    try {
      const res = await fetch("/api/import-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url_or_code: urlOrCode,
          fight_id: fightId,
          scale_pct: this.state.scalePct
        })
      });
      const data = await res.json();
      if (data.error) {
        showThemedNotice({
          title: data.error_type === "api_key_missing" || data.error_type === "api_key_invalid"
            ? "API NOT CONFIGURED"
            : "ROUTE IMPORT ERROR",
          message: data.error,
          type: "error",
          isApiConfig: data.error_type === "api_key_missing" || data.error_type === "api_key_invalid"
        });
        return;
      }

      this.state.customRouteText100 = data.route_text_100 || data.route_text;
      this.state.customRouteText = data.route_text;
      
      if (statusDiv) {
        statusDiv.textContent = `Successfully imported 100% Health Route: ${data.fight_name} (${data.enemies_count} enemy types, Scaled to ${this.state.enableScale ? this.state.scalePct + '%' : '100%'} for Sim)`;
        statusDiv.classList.remove("hidden");
      }

      const selDungeonRoute = document.getElementById("select-dungeon-route");
      if (selDungeonRoute) {
        selDungeonRoute.value = "custom_imported";
        this.state.selectedRouteType = "custom_imported";
      }
      const desc = document.getElementById("dungeon-route-desc");
      if (desc) desc.textContent = `Custom route: ${data.fight_name} (100% Base HP, scaled to ${this.state.enableScale ? this.state.scalePct + '%' : '100%'} in sim).`;

      document.querySelectorAll(".mode-card").forEach(c => c.classList.remove("active"));
      const cardDungeon = document.getElementById("card-mode-dungeon");
      if (cardDungeon) cardDungeon.classList.add("active");
      this.state.activeMode = "dungeon";

      ProfileGenerator.updateEditor(this.state);
    } catch (e) {
      showThemedNotice({
        title: "ROUTE IMPORT ERROR",
        message: "Failed to import dungeon route: " + e.message,
        type: "error",
        isApiConfig: false
      });
    } finally {
      if (btn) {
        btn.textContent = "IMPORT ROUTE";
        btn.disabled = false;
      }
    }
  }
}
