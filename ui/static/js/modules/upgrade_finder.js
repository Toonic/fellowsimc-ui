// ============================================================================
// Automated Upgrade Finder Controller & Simulation Generators
// ============================================================================
import { ALL_BLESSINGS } from "../data/blessings.js";
import { ALL_WEAPON_TRAITS } from "../data/traits.js";
import { ALL_GEAR_SETS } from "../data/gear_sets.js";
import { calculateSheetStats } from "./stat_utils.js";

const MAX_TALENT_POINTS = 16;

const GEM_TIERS = [80, 150, 220, 300, 450, 600, 800, 1000, 1250, 1500];

const ALL_GEMS = [
  { id: "sapphire", name: "Sapphire", desc: "Spirit on Cast & Spirit Cost Reduction" },
  { id: "amethyst", name: "Amethyst", desc: "Execute Damage & High HP Crit Amp" },
  { id: "emerald",  name: "Emerald",  desc: "Cooldown Reduction & First Strike Sprint" },
  { id: "ruby",     name: "Ruby",     desc: "Low-HP Damage Amp & Minotaur Enrage" },
  { id: "diamond",  name: "Diamond",  desc: "Harmonious Shielding & Damage Reduction" },
  { id: "topaz",    name: "Topaz",    desc: "Cast Speed Acceleration & Virtuoso Surge" }
];

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

    const selectGemTier = document.getElementById("select-upgrade-gem-tier");
    if (selectGemTier) {
      selectGemTier.addEventListener("change", (e) => {
        this.state.upgradeGemTier = e.target.value || "next_tier";
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
    } else if (upgradeType === "gems") {
      lines.push(...this.generateGemsUpgrade(state));
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
        // Keep all current blessings, add 1 of this one (capped at 4)
        const counts = { ...curBlessings };
        counts[b.id] = Math.min(4, (counts[b.id] || 0) + 1);
        const affixList = [];
        Object.entries(counts).forEach(([id, num]) => {
          for (let i = 0; i < num; i++) affixList.push(id);
        });
        lines.push(``);
        lines.push(`copy="${b.name} (+1 -> ${counts[b.id]}/4)","Current_Editor"`);
        lines.push(`trinket2=relic2,affixes=${affixList.join("/")}`);
      } else if (tierMode === "plus_four") {
        // Keep all current blessings, set this one to 4 (keep others as-is)
        const counts = { ...curBlessings };
        counts[b.id] = 4;
        const affixList = [];
        Object.entries(counts).forEach(([id, num]) => {
          for (let i = 0; i < num; i++) affixList.push(id);
        });
        lines.push(``);
        lines.push(`copy="${b.name} (+4 Max Keep Others)","Current_Editor"`);
        lines.push(`trinket2=relic2,affixes=${affixList.join("/")}`);
      } else if (tierMode === "all_tiers") {
        // Clear all other blessings — test only this one at each rank
        for (let r = 1; r <= 4; r++) {
          const affixList = [];
          for (let i = 0; i < r; i++) affixList.push(b.id);
          lines.push(``);
          lines.push(`copy="${b.name} (${r}/4)","Current_Editor"`);
          lines.push(`trinket2=relic2,affixes=${affixList.join("/")}`);
        }
      } else {
        // 4_only: clear all other blessings — test only this one at 4
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
        // Keep all current traits, add +1 to this one (capped at 4)
        const curRank = state.traitCounts?.[tr.id] || 0;
        const newRank = Math.min(4, curRank + 1);
        lines.push(``);
        lines.push(`copy="${tr.name} (+1 -> R${newRank})","Current_Editor"`);
        lines.push(`weapon_trait.${tr.id}=${newRank}`);
      } else if (traitMode === "plus_four") {
        // Keep all current traits, set this one to rank 4
        const curRank = state.traitCounts?.[tr.id] || 0;
        lines.push(``);
        lines.push(`copy="${tr.name} (+4 Max Keep Others)","Current_Editor"`);
        lines.push(`weapon_trait.${tr.id}=4`);
      } else {
        // all_ranks or 4_only: strip ALL other traits, test only this one
        const ranks = traitMode === "all_ranks" ? [1, 2, 3, 4] : [4];
        ranks.forEach(r => {
          const label = traitMode === "all_ranks" ? `${tr.name} (R${r})` : `${tr.name} (4/4 Max)`;
          lines.push(``);
          lines.push(`copy="${label}","Current_Editor"`);
          ALL_WEAPON_TRAITS.forEach(other => {
            if (other.id !== tr.id) lines.push(`weapon_trait.${other.id}=0`);
          });
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
        // Keep current sets, add this one on top
        lines.push(``);
        lines.push(`copy="Set: ${gs.name} (+1)","Current_Editor"`);
        lines.push(`sets.${gs.id}=1`);
      } else {
        // single_set: strip ALL sets, test only this one
        lines.push(``);
        lines.push(`copy="Solo Set: ${gs.name}","Current_Editor"`);
        ALL_GEAR_SETS.forEach(other => {
          if (other.id !== gs.id) lines.push(`sets.${other.id}=0`);
        });
        lines.push(`sets.${gs.id}=1`);
      }
    });
    return lines;
  }

  static generateGemsUpgrade(state) {
    const lines = [];
    lines.push(``);
    lines.push(`# ====================================================================`);
    lines.push(`# Upgrade Finder: Gem Powers Evaluation`);
    lines.push(`# ====================================================================`);

    const gemMode = state.upgradeGemTier || "next_tier";
    const curGems = state.gems || {};

    ALL_GEMS.forEach(gem => {
      const curPower = curGems[gem.id] || 0;

      if (gemMode === "next_tier") {
        // Find next engine threshold above curPower
        const nextTier = GEM_TIERS.find(t => t > curPower) || 1500;
        const tierIdx = GEM_TIERS.indexOf(nextTier) + 1;
        lines.push(``);
        lines.push(`copy="${gem.name} (+1 Tier -> T${tierIdx}: ${nextTier} Power)","Current_Editor"`);
        lines.push(`gems.${gem.id}_power=${nextTier}`);
      } else if (gemMode === "capstone_1500") {
        // Keep others, max this one to 1500 Tier 10
        lines.push(``);
        lines.push(`copy="${gem.name} (T10: 1500 Capstone Keep Others)","Current_Editor"`);
        lines.push(`gems.${gem.id}_power=1500`);
      } else if (gemMode === "major_breakpoints") {
        // Clear others, test major spikes: Tier 5 (450), Tier 6 (600), Tier 10 (1500)
        const majorTiers = [
          { tier: 5, power: 450, label: "T5: 450 Major Mechanic" },
          { tier: 6, power: 600, label: "T6: 600 Major Surge" },
          { tier: 10, power: 1500, label: "T10: 1500 Capstone" }
        ];
        majorTiers.forEach(tObj => {
          lines.push(``);
          lines.push(`copy="${gem.name} (${tObj.label})","Current_Editor"`);
          ALL_GEMS.forEach(other => {
            if (other.id !== gem.id) lines.push(`gems.${other.id}_power=0`);
          });
          lines.push(`gems.${gem.id}_power=${tObj.power}`);
        });
      } else {
        // all_tiers: Clear others, test all 10 engine tiers (80 - 1500)
        GEM_TIERS.forEach((pwr, idx) => {
          lines.push(``);
          lines.push(`copy="${gem.name} (T${idx + 1}: ${pwr} Power)","Current_Editor"`);
          ALL_GEMS.forEach(other => {
            if (other.id !== gem.id) lines.push(`gems.${other.id}_power=0`);
          });
          lines.push(`gems.${gem.id}_power=${pwr}`);
        });
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