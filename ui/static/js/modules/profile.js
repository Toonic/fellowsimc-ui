// ============================================================================
// Profile Generator for SimC profiles
// ============================================================================
import { HERO_DEFINITIONS } from "../data/heroes/index.js";
import { applyFellowDR, calculateSheetStats } from "./stat_utils.js";
import { CompareController } from "./compare.js";
import { UpgradeFinderController } from "./upgrade_finder.js";

export { applyFellowDR, calculateSheetStats };

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
    const gearStam = Math.max(0, rawStam - 100);
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
    lines.push(`# Active Sets & Legendary`);
    if (stripSets) {
      lines.push(`# (Sets stripped - Sets Finder is active on a non-"+1" tier;`);
      lines.push(`#  each candidate below supplies its own set.)`);
    } else {
      const activeSets = build.activeSets instanceof Set ? Array.from(build.activeSets) : (build.activeSets || []);
      activeSets.forEach(setId => {
        lines.push(`sets.${setId}=1`);
      });
    }
    if (build.legendary && build.legendary !== "none") {
      lines.push(`legendary.${build.legendary}=1`);
    }
    lines.push(``);

    // Weapon & Weapon Traits
    lines.push(`# Equipped Weapon & Weapon Traits`);
    lines.push(`weapon=${build.weapon || "chronoshift"}`);
    if (stripTraits) {
      lines.push(`# (Weapon traits stripped - Traits Finder is active on a non-"+1" tier;`);
      lines.push(`#  each candidate below supplies its own trait.)`);
    } else if (build.traitCounts) {
      for (const [tname, trank] of Object.entries(build.traitCounts)) {
        lines.push(`weapon_trait.${tname}=${trank}`);
      }
    }
    lines.push(``);

    // Blessings — all consolidated onto trinket2=relic2
    const activeBlessingList = [];
    if (!stripBlessings && build.blessingCounts) {
      for (const [bid, count] of Object.entries(build.blessingCounts)) {
        const cappedCount = Math.min(4, Math.max(0, count));
        for (let i = 0; i < cappedCount; i++) {
          activeBlessingList.push(bid);
        }
      }
    }

    // Gear Items (named slots, no affixes — affixes go on relic2)
    if (build.gearAffixes && build.gearAffixes.length > 0) {
      lines.push(`# Gear Items`);
      build.gearAffixes.forEach(g => lines.push(g));
      lines.push(``);
    } else if (build.gearItemNames && Object.keys(build.gearItemNames).length > 0) {
      lines.push(`# Gear Items`);
      Object.entries(build.gearItemNames).forEach(([slot, name]) => {
        lines.push(`${slot}=${name}`);
      });
      lines.push(``);
    }

    if (stripBlessings) {
      lines.push(`# Blessings (Stripped - Blessings Finder is active on a non-"+1" tier;`);
      lines.push(`#  each candidate below supplies its own full affix list.)`);
      lines.push(`trinket2=relic2`);
      lines.push(``);
    } else if (activeBlessingList.length > 0) {
      lines.push(`# Blessings (All affixes on Relic 2)`);
      lines.push(`trinket2=relic2,affixes=${activeBlessingList.join("/")}`);
      lines.push(``);
    }

    // Build Talents in Simulationcraft format: talents=tal1:1/tal2:1/...
    const selectedTalents = build.selectedTalents instanceof Set ? Array.from(build.selectedTalents) : (build.selectedTalents || []);
    if (selectedTalents.length > 0) {
      lines.push(`# Talents`);
      const activeTalents = selectedTalents.map(id => `${id}:1`);
      lines.push(`talents=${activeTalents.join("/")}`);
      lines.push(``);
    }

    return lines.join("\n");
  }

  static generate(state) {
    const chkEnableCompare = document.getElementById("check-enable-compare");
    const chkEnableUpgrade = document.getElementById("check-enable-upgrade");
    const isUpgrade = chkEnableUpgrade ? chkEnableUpgrade.checked : Boolean(state.enableUpgrade);
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
        if (state.selectedRouteType === "custom_imported" && state.customRouteText) {
          lines.push(`# Encounter: Custom Imported Dungeon Route`);
          lines.push(state.customRouteText);
        } else {
          lines.push(`# Encounter: Dungeon Route - Eternal 62 (Exported from a Wyrmheart 62 route)`);
          lines.push(`apl/routes/wyrmheart_62_solo.simc`);
        }
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

      // Only strip the baseline's own blessings/traits/sets when the matching
      // Finder is active AND its tier is NOT "+1 to Current Build" - that mode
      // still needs the real current loadout since candidates build on top of it.
      const upgradeType = state.upgradeType || "stats";
      const stripBlessings = upgradeType === "blessings" && (state.upgradeBlessingTier || "plus_one") !== "plus_one";
      const stripTraits = upgradeType === "traits" && (state.upgradeTraitTier || "plus_one") !== "plus_one";
      const stripSets = upgradeType === "sets" && (state.upgradeSetTier || "add_one") !== "add_one";

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
        if (state.selectedRouteType === "custom_imported" && state.customRouteText) {
          lines.push(`# Encounter: Custom Imported Dungeon Route`);
          lines.push(state.customRouteText);
        } else {
          lines.push(`# Encounter: Dungeon Route - Eternal 62 (Exported from a Wyrmheart 62 route)`);
          lines.push(`apl/routes/wyrmheart_62_solo.simc`);
        }
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
        if (state.selectedRouteType === "custom_imported" && state.customRouteText) {
          lines.push(`# Encounter: Custom Imported Dungeon Route`);
          lines.push(state.customRouteText);
        } else {
          lines.push(`# Encounter: Dungeon Route - Eternal 62 (Exported from a Wyrmheart 62 route)`);
          lines.push(`apl/routes/wyrmheart_62_solo.simc`);
        }
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

    if (state.enableScale && state.scalePct && state.scalePct !== 100) {
      lines.push(``);
      lines.push(`# Damage Output Scaling`);
      lines.push(`scale_player_damage=${(state.scalePct / 100).toFixed(4)}`);
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