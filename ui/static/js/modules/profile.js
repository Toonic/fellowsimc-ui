// ============================================================================
// Profile Generator for SimC profiles
// ============================================================================
import { HERO_DEFINITIONS } from "../data/heroes/index.js";
import { applyFellowDR, calculateSheetStats } from "./stat_utils.js";
import { CompareController } from "./compare.js";
import { UpgradeFinderController } from "./upgrade_finder.js";

export { applyFellowDR, calculateSheetStats };

export function scaleSimcRoute(routeText, scalePct) {
  const factor = (scalePct || 100.0) / 100.0;
  if (factor === 1.0) return routeText;
  
  return routeText.split("\n").map(line => {
    if (line.trim().startsWith("#") || !line.trim()) return line;
    
    // Scale enemies in raid_events+=/pull,...,enemies=...
    if (line.includes("enemies=")) {
      line = line.replace(/(enemies=)([^\r\n,]+(?:\(.*?\))?[^\r\n,]*)/, (match, prefix, content) => {
        const parts = content.split("|").map(p => {
          const m = p.trim().match(/^(.*?):(\d+)((?::\d+:\d+)?)$/);
          if (m) {
            const name = m[1];
            const hp = parseInt(m[2], 10);
            const rest = m[3] || "";
            const newHp = Math.round(hp * factor);
            return `${name}:${newHp}${rest}`;
          }
          return p;
        });
        return `${prefix}${parts.join("|")}`;
      });
    }
    
    // Scale health in raid_events+=/adds,...,health=...,...
    if (line.includes("health=")) {
      line = line.replace(/\bhealth=(\d+)\b/g, (match, hpStr) => {
        const hp = parseInt(hpStr, 10);
        return `health=${Math.round(hp * factor)}`;
      });
    }
    
    return line;
  }).join("\n");
}

function getDungeonRouteLines(state) {
  const lines = [];
  if (state.selectedRouteType === "custom_imported" && (state.customRouteText100 || state.customRouteText)) {
    const base100 = state.customRouteText100 || state.customRouteText;
    const finalRoute = state.enableScale ? scaleSimcRoute(base100, state.scalePct) : base100;
    lines.push(`# Encounter: Custom Imported Dungeon Route (Scaled: ${state.enableScale ? state.scalePct + '%' : '100%'})`);
    lines.push(finalRoute);
  } else {
    lines.push(`# Encounter: Dungeon Route - Eternal 62 (Scaled: ${state.enableScale ? state.scalePct + '%' : '100%'})`);
    if (state.enableScale) {
      lines.push(`apl/routes/wyrmheart_62_solo.simc`);
    } else {
      lines.push(`apl/routes/wyrmheart_62_100.simc`);
    }
  }
  return lines;
}

export class ProfileGenerator {
  /**
   * @param {object} build
   * @param {string} actorName
   * @param {object} [opts]
   * @param {boolean} [opts.stripBlessings] - Omit blessing affixes from trinket2 (bare "trinket2=relic2").
   *   Used only for the Current_Editor baseline while a non-"+1" Blessings Finder tier is active,
   *   since every candidate copy supplies its own full affix list.
   * @param {boolean} [opts.stripTraits] - Omit all weapon_trait.* lines entirely.
   *   Used only for the Current_Editor baseline while a non-"+1" Traits Finder tier is active.
   * @param {boolean} [opts.stripSets] - Omit all sets.* lines entirely.
   *   Used only for the Current_Editor baseline while a non-"+1" Sets Finder tier is active.
   */
  static generateActorBlock(build, actorName, opts = {}) {
    const { stripBlessings = false, stripTraits = false, stripSets = false } = opts;
    const heroKey = (build.hero || build.selectedHero || "rime").toLowerCase();
    const heroDef = HERO_DEFINITIONS[heroKey] || HERO_DEFINITIONS["rime"];
    const lines = [];

    lines.push(`# --------------------------------------------------------------------`);
    lines.push(`# Hero & APL: ${actorName} (${heroDef.name.toUpperCase()})`);
    lines.push(`# --------------------------------------------------------------------`);
    lines.push(`${heroDef.simcClass}="${actorName}"`);
    lines.push(`level=80`);

    if (build.useCustomApl && build.customAplText) {
      lines.push(`# Custom Action Priority List`);
      lines.push(build.customAplText);
    } else if (build.aplChoice === "talons" && heroKey === "rime") {
      lines.push(`apl/heroes/rime/rime_talons_apl.simc`);
    } else if (build.aplChoice === "frostweaver" && heroKey === "rime") {
      lines.push(`apl/heroes/rime/rime_frostweaver_apl.simc`);
    } else if (build.aplChoice === "soulfrost" && heroKey === "rime") {
      lines.push(`apl/heroes/rime/rime_soulfrost_apl.simc`);
    } else if (build.aplChoice === "generic" && heroKey === "rime") {
      lines.push(`apl/heroes/rime/rime_generic_apl.simc`);
    } else {
      lines.push(`apl/heroes/${heroKey}/${heroKey}_base_apl.simc`);
    }

    // Base Stats
    const stats = build.stats || {};
    const rawPrimary = stats.primary || 0;
    const gearPrimary = Math.max(0, rawPrimary - 100);
    const rawStam = stats.stamina || 0;
    const gearStam = rawStam;
    const rawArmor = stats.armor || 0;

    lines.push(``);
    lines.push(`# Gear Attributes & Ratings`);
    lines.push(`gear_${heroDef.primaryStat}=${gearPrimary}`);
    lines.push(`gear_stamina=${gearStam}`);
    lines.push(`gear_haste_rating=${stats.haste || 0}`);
    lines.push(`gear_expertise_rating=${stats.expertise || 0}`);
    lines.push(`gear_crit_rating=${stats.crit || 0}`);
    lines.push(`gear_spirit=${stats.spirit || 0}`);
    lines.push(`gear_armor=${rawArmor}`);

    // Gem Powers
    const gems = build.gems || {};
    const gemSapphire = gems.sapphire || 0;
    const gemAmethyst = gems.amethyst || 0;
    const gemEmerald = gems.emerald || 0;
    const gemRuby = gems.ruby || 0;
    const gemDiamond = gems.diamond || 0;
    const gemTopaz = gems.topaz || 0;

    if (gemSapphire > 0 || gemAmethyst > 0 || gemEmerald > 0 || gemRuby > 0 || gemDiamond > 0 || gemTopaz > 0) {
      lines.push(``);
      lines.push(`# Gem Powers`);
      if (gemSapphire > 0) lines.push(`gems.sapphire_power=${gemSapphire}`);
      if (gemAmethyst > 0) lines.push(`gems.amethyst_power=${gemAmethyst}`);
      if (gemEmerald > 0) lines.push(`gems.emerald_power=${gemEmerald}`);
      if (gemRuby > 0) lines.push(`gems.ruby_power=${gemRuby}`);
      if (gemDiamond > 0) lines.push(`gems.diamond_power=${gemDiamond}`);
      if (gemTopaz > 0) lines.push(`gems.topaz_power=${gemTopaz}`);
    }

    // Sets & Legendary
    lines.push(``);
    lines.push(`# Sets & Legendary`);
    if (!stripSets) {
      const activeSets = build.activeSets instanceof Set ? build.activeSets : new Set(build.activeSets || []);
      if (activeSets.size > 0) {
        for (const setName of activeSets) {
          lines.push(`sets.${setName}=1`);
        }
      }
    }
    const leg = build.legendary || "none";
    if (leg && leg !== "none") {
      lines.push(`legendary.${leg}=1`);
    }

    // Equipped Weapon
    const weapon = build.weapon || "chronoshift";
    if (weapon) {
      lines.push(``);
      lines.push(`# Equipped Weapon`);
      lines.push(`weapon=${weapon}`);
    }

    // Weapon Traits
    if (!stripTraits) {
      const traitCounts = build.traitCounts || {};
      const traitEntries = Object.entries(traitCounts).filter(([, rank]) => rank > 0);
      if (traitEntries.length > 0) {
        lines.push(``);
        lines.push(`# Weapon Traits`);
        for (const [traitName, rank] of traitEntries) {
          lines.push(`weapon_trait.${traitName}=${rank}`);
        }
      }
    }

    // Gear Items
    const gearAffixes = build.gearAffixes || [];
    const gearItemNames = build.gearItemNames || {};
    const gearEntries = Object.entries(gearItemNames);
    if (gearEntries.length > 0) {
      lines.push(``);
      lines.push(`# Gear Items`);
      for (const [slot, itemName] of gearEntries) {
        lines.push(`${slot}=${itemName}`);
      }
    }

    // Blessings on Relic 2
    if (!stripBlessings) {
      const blessingCounts = build.blessingCounts || {};
      const allBlessingAffixes = [];
      for (const [bname, count] of Object.entries(blessingCounts)) {
        const capped = Math.min(4, Math.max(0, count));
        for (let i = 0; i < capped; i++) {
          allBlessingAffixes.push(bname);
        }
      }
      if (allBlessingAffixes.length > 0) {
        lines.push(``);
        lines.push(`# Blessings (All affixes on Relic 2)`);
        lines.push(`trinket2=relic2,affixes=${allBlessingAffixes.join("/")}`);
      } else if (gearAffixes.length > 0) {
        lines.push(``);
        lines.push(`# Blessings (All affixes on Relic 2)`);
        lines.push(`trinket2=relic2,affixes=${gearAffixes.join("/")}`);
      }
    }

    // Talents
    const talents = build.selectedTalents instanceof Set ? build.selectedTalents : new Set(build.selectedTalents || []);
    if (talents.size > 0) {
      lines.push(``);
      lines.push(`# Talents`);
      const talentList = Array.from(talents).map(t => `${t}:1`).join("/");
      lines.push(`talents=${talentList}`);
    }

    return lines.join("\n");
  }

  static generate(state) {
    const chkEnableUpgrade = document.getElementById("check-enable-upgrade-finder");
    const isUpgrade = chkEnableUpgrade ? chkEnableUpgrade.checked : Boolean(state.enableUpgrade);
    const chkEnableCompare = document.getElementById("check-enable-compare");
    const hasSelectedBuilds = Boolean(state.selectedCompareBuildIds && state.selectedCompareBuildIds.size > 0);
    const isCompare = !isUpgrade && (chkEnableCompare ? chkEnableCompare.checked : (Boolean(state.enableCompare) || hasSelectedBuilds));
    const encounterMode = state.activeMode || "dungeon";

    const lines = [
      `# ====================================================================`,
      `# FellowSimc Profile - ${isUpgrade ? "Upgrade Finder" : (isCompare ? "Multi-Build Comparison" : (state.selectedPlayerName || "Hero"))}`,
      `# Generated via FellowSimc Importer & Build Manager`,
      `# ====================================================================`,
      ``,
      `iterations=${state.iterations || 1000}`,
      `optimal_raid=0`,
      `threads=${state.threads || ((typeof navigator !== "undefined" && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : 4)}`,
      ``
    ];

    if (isUpgrade) {
      lines.push(`single_actor_batch=1`);
      lines.push(`report_details=1`);
      lines.push(`chart_show_relative_difference=1`);
      lines.push(`relative_difference_base="Current_Editor"`);
      lines.push(``);

      if (encounterMode === "dungeon") {
        lines.push(...getDungeonRouteLines(state));
      } else if (encounterMode === "single_target") {
        const dur = document.getElementById("input-st-duration")?.value || 360;
        lines.push(`# Encounter: Single Target (${dur}s)`);
        lines.push(`max_time=${dur}`);
        lines.push(`vary_combat_length=0.0`);
        lines.push(`fight_style=Patchwerk`);
      } else if (encounterMode === "aoe") {
        const targets = document.getElementById("input-aoe-targets")?.value || 10;
        const dur = document.getElementById("input-aoe-duration")?.value || 360;
        lines.push(`# Encounter: AoE (${targets} Targets, ${dur}s)`);
        lines.push(`max_time=${dur}`);
        lines.push(`vary_combat_length=0.0`);
        lines.push(`fight_style=Patchwerk`);
        lines.push(`desired_targets=${targets}`);
      }
      lines.push(``);

      const upgradeType = state.upgradeType || "stats";
      const blessingTier = state.upgradeBlessingTier || "plus_one";
      const traitTier    = state.upgradeTraitTier    || "plus_one";
      const stripBlessings = upgradeType === "blessings" && blessingTier !== "plus_one" && blessingTier !== "plus_four";
      const stripTraits    = upgradeType === "traits"    && traitTier    !== "plus_one" && traitTier    !== "plus_four";
      const stripSets      = upgradeType === "sets"      && (state.upgradeSetTier || "add_one") !== "add_one";

      // Baseline Actor (Current Editor)
      lines.push(ProfileGenerator.generateActorBlock(state, "Current_Editor", { stripBlessings, stripTraits, stripSets }));

      // Candidate Upgrade Actors
      lines.push(...UpgradeFinderController.generateUpgradeActors(state));

    } else if (isCompare) {
      lines.push(`single_actor_batch=1`);
      lines.push(`report_details=1`);
      lines.push(`chart_show_relative_difference=1`);
      lines.push(`relative_difference_base="Current_Editor"`);
      lines.push(``);

      if (encounterMode === "dungeon") {
        lines.push(...getDungeonRouteLines(state));
      } else if (encounterMode === "single_target") {
        const dur = document.getElementById("input-st-duration")?.value || 360;
        lines.push(`# Encounter: Single Target (${dur}s)`);
        lines.push(`max_time=${dur}`);
        lines.push(`vary_combat_length=0.0`);
        lines.push(`fight_style=Patchwerk`);
      } else if (encounterMode === "aoe") {
        const targets = document.getElementById("input-aoe-targets")?.value || 10;
        const dur = document.getElementById("input-aoe-duration")?.value || 360;
        lines.push(`# Encounter: AoE (${targets} Targets, ${dur}s)`);
        lines.push(`max_time=${dur}`);
        lines.push(`vary_combat_length=0.0`);
        lines.push(`fight_style=Patchwerk`);
        lines.push(`desired_targets=${targets}`);
      }

      lines.push(...CompareController.generateCompareActors(state, ProfileGenerator.generateActorBlock));

    } else {
      // Single Actor Sim Mode
      lines.push(ProfileGenerator.generateActorBlock(state, state.selectedPlayerName || "Hero"));
      lines.push(``);

      if (encounterMode === "dungeon") {
        lines.push(...getDungeonRouteLines(state));
      } else if (encounterMode === "single_target") {
        const dur = document.getElementById("input-st-duration")?.value || 360;
        lines.push(`# Encounter: Single Target (${dur}s)`);
        lines.push(`max_time=${dur}`);
        lines.push(`vary_combat_length=0.0`);
        lines.push(`fight_style=Patchwerk`);
      } else if (encounterMode === "aoe") {
        const targets = document.getElementById("input-aoe-targets")?.value || 10;
        const dur = document.getElementById("input-aoe-duration")?.value || 360;
        lines.push(`# Encounter: AoE (${targets} Targets, ${dur}s)`);
        lines.push(`max_time=${dur}`);
        lines.push(`vary_combat_length=0.0`);
        lines.push(`fight_style=Patchwerk`);
        lines.push(`desired_targets=${targets}`);
      }
    }

    return lines.join("\n");
  }

  static updateEditor(state) {
    const editor = document.getElementById("raw-profile-editor") || document.getElementById("editor-profile");
    if (editor) {
      editor.value = ProfileGenerator.generate(state);
    }
  }
}