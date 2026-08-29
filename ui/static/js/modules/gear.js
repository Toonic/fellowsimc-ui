// Gear Sets, Weapon Traits, Blessings, and Gems Controller
import { ALL_GEAR_SETS } from "../data/gear_sets.js";
import { ALL_WEAPON_TRAITS } from "../data/traits.js";
import { ALL_BLESSINGS } from "../data/blessings.js";
import { ProfileGenerator } from "./profile.js";

export class GearController {
  constructor(state) {
    this.state = state;
  }

  init() {
    this.initGemInputs();
    this.renderGearSets();
    this.renderWeaponTraits();
    this.renderBlessings();

    const selWeapon = document.getElementById("select-weapon");
    if (selWeapon) {
      selWeapon.value = this.state.weapon || "chronoshift";
      selWeapon.addEventListener("change", (e) => {
        this.state.weapon = e.target.value;
        ProfileGenerator.updateEditor(this.state);
      });
    }

    const selLegendary = document.getElementById("select-legendary");
    if (selLegendary) {
      selLegendary.addEventListener("change", (e) => {
        this.state.legendary = e.target.value;
        ProfileGenerator.updateEditor(this.state);
      });
    }
  }

  renderGearSets() {
    const container = document.getElementById("gear-sets-container");
    if (!container) return;
    container.innerHTML = "";

    ALL_GEAR_SETS.forEach(set => {
      const isActive = this.state.activeSets.has(set.id);
      const card = document.createElement("div");
      card.className = `set-card ${isActive ? "active" : ""}`;
      card.innerHTML = `
        <span class="set-card-name">${set.name}</span>
        <div class="set-card-checkbox">${isActive ? "✓" : ""}</div>
      `;

      card.addEventListener("click", () => {
        if (this.state.activeSets.has(set.id)) {
          this.state.activeSets.delete(set.id);
        } else {
          this.state.activeSets.add(set.id);
        }
        this.renderGearSets();
        ProfileGenerator.updateEditor(this.state);
      });

      container.appendChild(card);
    });

    const totalEl = document.getElementById("sets-total-counter");
    if (totalEl) {
      totalEl.textContent = `${this.state.activeSets.size} Active`;
    }
  }

  initGemInputs() {
    const gemKeys = ["sapphire", "amethyst", "emerald", "ruby", "diamond", "topaz"];
    gemKeys.forEach(key => {
      const el = document.getElementById(`gem-${key}`);
      if (el) {
        el.value = this.state.gems[key] || 0;
        el.addEventListener("input", (e) => {
          this.state.gems[key] = Math.max(0, parseInt(e.target.value) || 0);
          ProfileGenerator.updateEditor(this.state);
        });
      }
    });
  }

  updateGemInputs() {
    const gemKeys = ["sapphire", "amethyst", "emerald", "ruby", "diamond", "topaz"];
    gemKeys.forEach(key => {
      const el = document.getElementById(`gem-${key}`);
      if (el) {
        el.value = this.state.gems[key] || 0;
      }
    });
  }

  renderWeaponTraits() {
    const container = document.getElementById("weapon-traits-container");
    if (!container) return;
    container.innerHTML = "";

    let totalPoints = 0;

    ALL_WEAPON_TRAITS.forEach(trait => {
      const count = this.state.traitCounts[trait.id] || 0;
      totalPoints += count;

      const card = document.createElement("div");
      card.className = `stepper-card ${count > 0 ? "active" : ""}`;
      card.innerHTML = `
        <span class="stepper-name" title="${trait.name}">${trait.name}</span>
        <div class="stepper-controls">
          <button type="button" class="btn-step btn-minus" ${count <= 0 ? "disabled" : ""}>−</button>
          <span class="step-val">${count}/4</span>
          <button type="button" class="btn-step btn-plus" ${count >= 4 ? "disabled" : ""}>+</button>
        </div>
      `;

      card.querySelector(".btn-minus").addEventListener("click", (e) => {
        e.stopPropagation();
        const current = this.state.traitCounts[trait.id] || 0;
        if (current > 0) {
          this.state.traitCounts[trait.id] = current - 1;
          if (this.state.traitCounts[trait.id] === 0) {
            delete this.state.traitCounts[trait.id];
          }
          this.renderWeaponTraits();
          ProfileGenerator.updateEditor(this.state);
        }
      });

      card.querySelector(".btn-plus").addEventListener("click", (e) => {
        e.stopPropagation();
        const current = this.state.traitCounts[trait.id] || 0;
        if (current < 4) {
          this.state.traitCounts[trait.id] = current + 1;
          this.renderWeaponTraits();
          ProfileGenerator.updateEditor(this.state);
        }
      });

      container.appendChild(card);
    });

    const totalEl = document.getElementById("traits-total-counter");
    if (totalEl) {
      totalEl.textContent = `${totalPoints} Total`;
    }
  }

  renderBlessings() {
    const container = document.getElementById("blessings-container");
    if (!container) return;
    container.innerHTML = "";

    let totalPoints = 0;

    ALL_BLESSINGS.forEach(blessing => {
      const count = this.state.blessingCounts[blessing.id] || (blessing.id === "the_subduer" ? this.state.blessingCounts["subduer"] : (blessing.id === "subduer" ? this.state.blessingCounts["the_subduer"] : 0)) || 0;
      totalPoints += count;

      const card = document.createElement("div");
      card.className = `stepper-card ${count > 0 ? "active" : ""}`;
      card.innerHTML = `
        <span class="stepper-name" title="${blessing.name}">${blessing.name}</span>
        <div class="stepper-controls">
          <button type="button" class="btn-step btn-minus" ${count <= 0 ? "disabled" : ""}>−</button>
          <span class="step-val">${count}/4</span>
          <button type="button" class="btn-step btn-plus" ${count >= 4 ? "disabled" : ""}>+</button>
        </div>
      `;

      card.querySelector(".btn-minus").addEventListener("click", (e) => {
        e.stopPropagation();
        const current = this.state.blessingCounts[blessing.id] || 0;
        if (current > 0) {
          this.state.blessingCounts[blessing.id] = current - 1;
          if (this.state.blessingCounts[blessing.id] === 0) {
            delete this.state.blessingCounts[blessing.id];
          }
          this.renderBlessings();
          ProfileGenerator.updateEditor(this.state);
        }
      });

      card.querySelector(".btn-plus").addEventListener("click", (e) => {
        e.stopPropagation();
        const current = this.state.blessingCounts[blessing.id] || 0;
        if (current < 4) {
          this.state.blessingCounts[blessing.id] = current + 1;
          this.renderBlessings();
          ProfileGenerator.updateEditor(this.state);
        }
      });

      container.appendChild(card);
    });

    const totalEl = document.getElementById("blessings-total-counter");
    if (totalEl) {
      totalEl.textContent = `${totalPoints} Total`;
    }
  }
}
