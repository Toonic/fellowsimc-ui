// ============================================================================
// Automated Upgrade Finder Controller & Simulation Generators
// ============================================================================
import { ALL_BLESSINGS } from "../data/blessings.js";
import { ALL_WEAPON_TRAITS } from "../data/traits.js";
import { ALL_GEAR_SETS } from "../data/gear_sets.js";
import { calculateSheetStats } from "./stat_utils.js";

const MAX_TALENT_POINTS = 16;

export class UpgradeFinderController {
  constructor(state, onUpdate) {
    this.state = state;
    this.onUpdate = onUpdate || (() => {});
  }

  init() {
    const chkEnableUpgrade = document.getElementById("check-enable-upgrade");
    const upgradeBox = document.getElementById("upgrade-options-box");
    const chkEnableCompare = document.getElementById("check-enable-compare");
    const compareBox = document.getElementById("compare-builds-box");

    if (chkEnableUpgrade) {
      chkEnableUpgrade.checked = this.state.enableUpgrade;
      if (upgradeBox) upgradeBox.classList.toggle("disabled-box", !this.state.enableUpgrade);

      chkEnableUpgrade.addEventListener("change", (e) => {
        this.state.enableUpgrade = e.target.checked;
        if (upgradeBox) upgradeBox.classList.toggle("disabled-box", !e.target.checked);

        // Mutually exclusive: if Upgrade Finder is enabled, disable Compare Mode
        if (e.target.checked && chkEnableCompare && chkEnableCompare.checked) {
          chkEnableCompare.checked = false;
          this.state.enableCompare = false;
          if (compareBox) compareBox.classList.add("disabled-box");
        }
        this.onUpdate();
      });
    }

    if (chkEnableCompare) {
      chkEnableCompare.addEventListener("change", (e) => {
        if (e.target.checked && chkEnableUpgrade && chkEnableUpgrade.checked) {
          chkEnableUpgrade.checked = false;
          this.state.enableUpgrade = false;
          if (upgradeBox) upgradeBox.classList.add("disabled-box");
        }
      });
    }

    document.querySelectorAll("[data-upgrade]").forEach(card => {
      card.addEventListener("click", (e) => {
        if (["INPUT", "BUTTON", "SELECT"].includes(e.target.tagName)) return;
        document.querySelectorAll("[data-upgrade]").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        this.state.upgradeType = card.dataset.upgrade || "stats";
        this.onUpdate();
      });
    });

    const selectBlessingTier = document.getElementById("select-upgrade-blessing-tier");
    if (selectBlessingTier) {
      selectBlessingTier.addEventListener("change", (e) => {
        this.state.upgradeBlessingTier = e.target.value || "plus_one";
        this.onUpdate();
      });
    }

    const selectTraitTier = document.getElementById("select-upgrade-trait-tier");
    if (selectTraitTier) {
      selectTraitTier.addEventListener("change", (e) => {
        this.state.upgradeTraitTier = e.target.value || "plus_one";
        this.onUpdate();
      });
    }

    const selectSetTier = document.getElementById("select-upgrade-set-tier");
    if (selectSetTier) {
      selectSetTier.addEventListener("change", (e) => {
        this.state.upgradeSetTier = e.target.value || "add_one";
        this.onUpdate();
      });
    }
  }

  /**
   * Generates all candidate upgrade actor copies based on the active upgradeType.
   */
  static generateUpgradeActors(state) {
    const lines = [];
    const upgradeType = state.upgradeType || "stats";

    if (upgradeType === "stats") {
      lines.push(...this.generateStatsUpgrade(state));
    } else if (upgradeType === "blessings") {
      lines.push(...this.generateBlessingsUpgrade(state));
    } else if (upgradeType === "traits") {
      lines.push(...this.generateTraitsUpgrade(state));
    } else if (upgradeType === "sets") {
      lines.push(...this.generateSetsUpgrade(state));
    } else if (upgradeType === "talents") {
      lines.push(...this.generateTalentsUpgrade(state));
    }

    return lines;
  }

  static generateStatsUpgrade(state) {
    const lines = [];
    lines.push(``);
    lines.push(`# ====================================================================`);
    lines.push(`# Upgrade Finder: Realistic Secondary Stat Distributions (Gear Stats)`);
    lines.push(`# ====================================================================`);

    const curCrit = state.stats?.crit || 0;
    const curHaste = state.stats?.haste || 0;
    const curExp = state.stats?.expertise || 0;
    const curSpirit = state.stats?.spirit || 0;
    const totalBudget = (curCrit + curHaste + curExp + curSpirit) || 512;

    const totalParts = 10;
    const maxParts = 6; // Max 60% concentration on any single stat to reflect real gear limits
    const minParts = 1; // Min 10% on remaining gear slots

    for (let c = maxParts; c >= minParts; c--) {
      for (let h = maxParts; h >= minParts; h--) {
        for (let e = maxParts; e >= minParts; e--) {
          const s = totalParts - c - h - e;
          if (s >= minParts && s <= maxParts) {
            const cRating = Math.round((c / totalParts) * totalBudget);
            const hRating = Math.round((h / totalParts) * totalBudget);
            const eRating = Math.round((e / totalParts) * totalBudget);
            const sRating = totalBudget - cRating - hRating - eRating;

            const sheet = calculateSheetStats(cRating, hRating, eRating, sRating);

            const parts = [];
            parts.push(`Crit ${sheet.critPct.toFixed(1)}%`);
            parts.push(`Haste ${sheet.hastePct.toFixed(1)}%`);
            parts.push(`Exp ${sheet.expPct.toFixed(1)}%`);
            parts.push(`Spirit ${sheet.spiritPct.toFixed(1)}%`);

            const label = `Gear: ${parts.join(" / ")} (C ${cRating} H ${hRating} E ${eRating} S ${sRating})`;

            lines.push(``);
            lines.push(`copy="${label}","Current_Editor"`);
            lines.push(`gear_crit_rating=${cRating}`);
            lines.push(`gear_haste_rating=${hRating}`);
            lines.push(`gear_expertise_rating=${eRating}`);
            lines.push(`gear_spirit=${sRating}`);
          }
        }
      }
    }
    return lines;
  }

  static generateBlessingsUpgrade(state) {
    const lines = [];
    lines.push(``);
    lines.push(`# ====================================================================`);
    lines.push(`# Upgrade Finder: Blessings Evaluation`);
    lines.push(`# ====================================================================`);

    const tierMode = state.upgradeBlessingTier || "plus_one";
    const curBlessings = state.blessingCounts || {};

    ALL_BLESSINGS.forEach(b => {
      if (tierMode === "plus_one") {
        // "+1 to Current Build": Current_Editor's baseline still carries the real
        // loadout, so build on top of it - keep every existing blessing, bump this one.
        const counts = { ...curBlessings };
        counts[b.id] = Math.min(4, (counts[b.id] || 0) + 1);
        const affixList = [];
        Object.entries(counts).forEach(([id, num]) => {
          for (let i = 0; i < num; i++) affixList.push(id);
        });
        lines.push(``);
        lines.push(`copy="${b.name} (+1 -> ${counts[b.id]}/4)","Current_Editor"`);
        lines.push(`trinket2=relic2,affixes=${affixList.join("/")}`);
      } else if (tierMode === "all_tiers") {
        // Not "+1 to Current Build": Current_Editor's baseline is generated bare
        // (trinket2=relic2, no affixes) for this tier, so we only need to state
        // the affixes we actually want to test - nothing else to strip.
        for (let r = 1; r <= 4; r++) {
          const affixList = [];
          for (let i = 0; i < r; i++) affixList.push(b.id);
          lines.push(``);
          lines.push(`copy="${b.name} (${r}/4)","Current_Editor"`);
          lines.push(`trinket2=relic2,affixes=${affixList.join("/")}`);
        }
      } else {
        lines.push(``);
        lines.push(`copy="${b.name} (4/4 Max)","Current_Editor"`);
        lines.push(`trinket2=relic2,affixes=${b.id}/${b.id}/${b.id}/${b.id}`);
      }
    });
    return lines;
  }

  static generateTraitsUpgrade(state) {
    const lines = [];
    lines.push(``);
    lines.push(`# ====================================================================`);
    lines.push(`# Upgrade Finder: Traits Evaluation`);
    lines.push(`# ====================================================================`);

    const traitMode = state.upgradeTraitTier || "plus_one";

    ALL_WEAPON_TRAITS.forEach(tr => {
      if (traitMode === "plus_one") {
        // "+1 to Current Build": baseline still carries the real trait ranks.
        const curRank = state.traitCounts?.[tr.id] || 0;
        const newRank = curRank + 1;
        lines.push(``);
        lines.push(`copy="${tr.name} (+1 -> R${newRank})","Current_Editor"`);
        lines.push(`weapon_trait.${tr.id}=${newRank}`);
      } else {
        // Not "+1 to Current Build": baseline is generated with no weapon_trait
        // lines at all for this tier, so we only need to state the trait we're
        // testing - nothing else to strip.
        const ranks = traitMode === "all_ranks" ? [1, 2, 3, 4] : [4];
        ranks.forEach(r => {
          const label = traitMode === "all_ranks" ? `${tr.name} (R${r})` : `${tr.name} (4/4 Max)`;
          lines.push(``);
          lines.push(`copy="${label}","Current_Editor"`);
          lines.push(`weapon_trait.${tr.id}=${r}`);
        });
      }
    });
    return lines;
  }

  static generateSetsUpgrade(state) {
    const lines = [];
    lines.push(``);
    lines.push(`# ====================================================================`);
    lines.push(`# Upgrade Finder: Gear Sets Evaluation`);
    lines.push(`# ====================================================================`);

    const setMode = state.upgradeSetTier || "add_one";

    ALL_GEAR_SETS.forEach(gs => {
      if (setMode === "add_one") {
        // "+1 to Current Build": baseline still carries the real active sets.
        lines.push(``);
        lines.push(`copy="Set: ${gs.name} (+1)","Current_Editor"`);
        lines.push(`sets.${gs.id}=1`);
      } else {
        // Not "+1 to Current Build": baseline is generated with no sets lines
        // at all for this tier, so we only need to state the set we're testing -
        // nothing else to strip.
        lines.push(``);
        lines.push(`copy="Solo Set: ${gs.name}","Current_Editor"`);
        lines.push(`sets.${gs.id}=1`);
      }
    });
    return lines;
  }

  static generateTalentsUpgrade(state) {
    const lines = [];
    lines.push(``);
    lines.push(`# ====================================================================`);
    lines.push(`# Upgrade Finder: Next Talent Point Choices`);
    lines.push(`# ====================================================================`);

    const heroKey = (state.selectedHero || "rime").toLowerCase();
    const heroTree = state.talentsData?.[heroKey] || state.talentsData?.["rime"];

    if (heroTree && heroTree.tiers) {
      let currentSpent = 0;
      const currentSelected = state.selectedTalents instanceof Set ? Array.from(state.selectedTalents) : (state.selectedTalents || []);
      const currentSet = new Set(currentSelected);

      heroTree.tiers.forEach(tr => {
        (tr.talents || []).forEach(t => {
          if (currentSet.has(t.id)) {
            currentSpent += (t.pointCost || 1);
          }
        });
      });
      const pointsAvailable = Math.max(0, MAX_TALENT_POINTS - currentSpent);

      heroTree.tiers.forEach(tr => {
        (tr.talents || []).forEach(t => {
          if (!currentSet.has(t.id)) {
            if (pointsAvailable === 0 || (t.pointCost || 1) <= pointsAvailable) {
              const testTalents = [...currentSelected, t.id];
              const talentStr = testTalents.map(id => `${id}:1`).join("/");
              lines.push(``);
              lines.push(`copy="Next: ${t.name} (+${t.pointCost || 1}pt)","Current_Editor"`);
              lines.push(`talents=${talentStr}`);
            }
          }
        });
      });
    }
    return lines;
  }
}