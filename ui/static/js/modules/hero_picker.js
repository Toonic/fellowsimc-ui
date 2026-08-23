// Hero Picker and Talent Tree Controller
import { HERO_DEFINITIONS, HERO_LEGENDARIES } from "../data/heroes.js";
import { ProfileGenerator } from "./profile.js";

export class HeroPickerController {
  constructor(state) {
    this.state = state;
  }

  init() {
    const items = document.querySelectorAll("#hero-picker-container .hero-picker-item:not(.disabled)");
    items.forEach(item => {
      item.addEventListener("click", () => {
        const heroKey = item.dataset.hero;
        if (heroKey && HERO_DEFINITIONS[heroKey]) {
          this.selectHero(heroKey, true);
        }
      });
    });

    const btnClear = document.getElementById("btn-clear-talents");
    if (btnClear) {
      btnClear.onclick = () => {
        this.state.selectedTalents.clear();
        this.updateTalentDisplay();
        ProfileGenerator.updateEditor(this.state);
      };
    }
  }

  selectHero(heroKey, resetTalents = false) {
    heroKey = heroKey.toLowerCase();
    if (!HERO_DEFINITIONS[heroKey]) {
      console.warn(`Hero ${heroKey} not recognized.`);
      return;
    }

    this.state.selectedHero = heroKey;
    const def = HERO_DEFINITIONS[heroKey];

    // Update Hero Picker UI
    document.querySelectorAll("#hero-picker-container .hero-picker-item").forEach(item => {
      item.classList.toggle("active", item.dataset.hero === heroKey);
    });

    // Update Primary Stat Label
    const primaryLabel = document.getElementById("label-stat-primary");
    if (primaryLabel) {
      primaryLabel.textContent = def.primaryStatLabel;
    }

    // Update Legendary Dropdown
    const selectLeg = document.getElementById("select-legendary");
    if (selectLeg) {
      selectLeg.innerHTML = "";
      const noneOpt = document.createElement("option");
      noneOpt.value = "none";
      noneOpt.textContent = "None";
      selectLeg.appendChild(noneOpt);

      const legList = HERO_LEGENDARIES[heroKey] || HERO_LEGENDARIES["rime"];
      legList.forEach(leg => {
        const opt = document.createElement("option");
        opt.value = leg.id;
        opt.textContent = leg.name;
        selectLeg.appendChild(opt);
      });
      selectLeg.value = this.state.legendary || "none";
    }

    // Update APL Presets dropdown
    const selectApl = document.getElementById("select-apl-preset");
    if (selectApl) {
      selectApl.innerHTML = "";
      if (heroKey === "rime") {
        selectApl.innerHTML = `
          <option value="base" selected>Dynamic Build Router (rime_base_apl.simc)</option>
          <option value="talons">Icy Talons APL (rime_talons_apl.simc)</option>
          <option value="frostweaver">Frostweaver's Wrath APL (rime_frostweaver_apl.simc)</option>
          <option value="soulfrost">Soulfrost Torrent APL (rime_soulfrost_apl.simc)</option>
          <option value="generic">Generic APL (rime_generic_apl.simc)</option>
        `;
      } else {
        selectApl.innerHTML = `
          <option value="base" selected>Base APL (${heroKey}_base_apl.simc)</option>
        `;
      }
      this.state.aplChoice = "base";
    }

    if (resetTalents) {
      this.state.selectedTalents.clear();
    }

    this.renderTalentTree();
    ProfileGenerator.updateEditor(this.state);
  }

  renderTalentTree() {
    const container = document.getElementById("talent-tiers-container");
    if (!container) return;

    const heroKey = (this.state.selectedHero || "rime").toLowerCase();
    const heroTree = this.state.talentsData?.[heroKey] || this.state.talentsData?.["rime"];

    if (!heroTree || !heroTree.tiers) {
      container.innerHTML = `<div class="text-muted" style="padding: 20px;">Loading talents for ${heroKey}...</div>`;
      return;
    }

    container.innerHTML = "";

    heroTree.tiers.forEach(tierObj => {
      const tierRow = document.createElement("div");
      tierRow.className = "talent-tier-row";

      const tierIndicator = document.createElement("div");
      tierIndicator.className = "tier-indicator";
      tierIndicator.textContent = tierObj.label;
      tierRow.appendChild(tierIndicator);

      const cardsGrid = document.createElement("div");
      cardsGrid.className = "tier-cards-grid";

      tierObj.talents.forEach(t => {
        const isSelected = this.state.selectedTalents.has(t.id);
        const card = document.createElement("div");
        card.className = `talent-card ${isSelected ? "active" : ""}`;
        card.dataset.talentId = t.id;
        card.dataset.pointCost = t.pointCost || 1;

        const iconSrc = t.localIcon || t.iconUrl || "";

        card.innerHTML = `
          <div class="talent-info-group">
            <div class="talent-icon-box">
              <img src="${iconSrc}" class="talent-icon-img" alt="${t.name}" onerror="this.style.display='none'">
            </div>
            <span class="talent-name">${t.name}</span>
          </div>
          <span class="talent-pts-badge">${t.pointCost}pt</span>
        `;

        card.addEventListener("click", (e) => {
          e.preventDefault();
          this.toggleTalentSelection(t);
        });

        cardsGrid.appendChild(card);
      });

      tierRow.appendChild(cardsGrid);
      container.appendChild(tierRow);
    });

    this.updateTalentDisplay();
  }

  toggleTalentSelection(talent) {
    const isSelected = this.state.selectedTalents.has(talent.id);
    const cost = talent.pointCost || 1;
    const currentSpent = this.getTotalTalentPointsSpent();

    if (isSelected) {
      this.state.selectedTalents.delete(talent.id);
    } else {
      if (currentSpent + cost <= 14) {
        this.state.selectedTalents.add(talent.id);
      } else {
        const pointsEl = document.getElementById("talent-points-available");
        if (pointsEl) {
          pointsEl.style.color = "#f43f5e";
          setTimeout(() => { pointsEl.style.color = "#ffffff"; }, 350);
        }
        return;
      }
    }

    this.updateTalentDisplay();
    ProfileGenerator.updateEditor(this.state);
  }

  getTotalTalentPointsSpent() {
    if (!this.state.talentsData) return this.state.selectedTalents.size;
    const heroKey = (this.state.selectedHero || "rime").toLowerCase();
    const heroTree = this.state.talentsData[heroKey] || this.state.talentsData["rime"];
    if (!heroTree) return this.state.selectedTalents.size;

    let total = 0;
    const talentMap = {};
    heroTree.tiers.forEach(tr => {
      tr.talents.forEach(t => { talentMap[t.id] = t.pointCost || 1; });
    });

    this.state.selectedTalents.forEach(tid => {
      total += talentMap[tid] || 1;
    });
    return total;
  }

  updateTalentDisplay() {
    const totalSpent = this.getTotalTalentPointsSpent();
    const available = Math.max(0, 14 - totalSpent);

    const pointsEl = document.getElementById("talent-points-available");
    if (pointsEl) {
      pointsEl.textContent = available;
    }

    document.querySelectorAll(".talent-card").forEach(card => {
      const tid = card.dataset.talentId;
      card.classList.toggle("active", this.state.selectedTalents.has(tid));
    });
  }
}
