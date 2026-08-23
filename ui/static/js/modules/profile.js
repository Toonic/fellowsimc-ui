// Profile Generator for SimC profiles
import { HERO_DEFINITIONS } from "../data/heroes.js";

export class ProfileGenerator {
  static generateActorBlock(build, actorName) {
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
    lines.push(``);

    const stats = build.stats || {};
    const rawPrimary = stats.primary || 0;
    const gearPrimary = Math.max(0, rawPrimary - 100);

    lines.push(`# Gear Attributes & Ratings`);
    if (gearPrimary > 0) lines.push(`gear_${heroDef.primaryStat}=${gearPrimary}`);
    if (stats.stamina > 0) lines.push(`gear_stamina=${stats.stamina}`);
    if (stats.haste > 0) lines.push(`gear_haste_rating=${stats.haste}`);
    if (stats.expertise > 0) lines.push(`gear_expertise_rating=${stats.expertise}`);
    if (stats.crit > 0) lines.push(`gear_crit_rating=${stats.crit}`);
    if (stats.spirit > 0) lines.push(`gear_spirit=${stats.spirit}`);
    if (stats.armor > 0) lines.push(`gear_armor=${stats.armor}`);
    lines.push(``);

    // Gem Powers
    if (build.gems) {
      lines.push(`# Gem Powers`);
      for (const [gname, gpow] of Object.entries(build.gems)) {
        if (gpow > 0) lines.push(`gems.${gname}_power=${gpow}`);
      }
      lines.push(``);
    }

    // Sets & Legendary
    lines.push(`# Active Sets & Legendary`);
    const activeSets = build.activeSets instanceof Set ? Array.from(build.activeSets) : (build.activeSets || []);
    if (activeSets.length > 0) {
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
    if (build.traitCounts) {
      for (const [tname, trank] of Object.entries(build.traitCounts)) {
        lines.push(`weapon_trait.${tname}=${trank}`);
      }
    }
    lines.push(``);

    // Gear Items & Blessings (Affixes) - Evenly distributed across gear slots
    const activeBlessingList = [];
    if (build.blessingCounts) {
      for (const [bid, count] of Object.entries(build.blessingCounts)) {
        const cappedCount = Math.min(4, Math.max(0, count));
        for (let i = 0; i < cappedCount; i++) {
          activeBlessingList.push(bid);
        }
      }
    }

    const standardSlots = [
      "head", "shoulder", "chest", "wrists", "hands", "legs",
      "feet", "finger1", "finger2", "neck", "back", "main_hand"
    ];

    if (activeBlessingList.length > 0) {
      lines.push(`# Gear Items & Blessings (Affixes)`);
      const slotMap = {};
      standardSlots.forEach(s => { slotMap[s] = []; });

      let slotIdx = 0;
      activeBlessingList.forEach(blessing => {
        let placed = false;
        for (let i = 0; i < standardSlots.length; i++) {
          const s = standardSlots[(slotIdx + i) % standardSlots.length];
          if (slotMap[s].length < 2) {
            slotMap[s].push(blessing);
            slotIdx = (slotIdx + i + 1) % standardSlots.length;
            placed = true;
            break;
          }
        }
        if (!placed) {
          const s = standardSlots[slotIdx % standardSlots.length];
          slotMap[s].push(blessing);
          slotIdx = (slotIdx + 1) % standardSlots.length;
        }
      });

      standardSlots.forEach(slot => {
        const affs = slotMap[slot];
        if (affs && affs.length > 0) {
          const itemName = build.gearItemNames?.[slot] || `${slot}_item`;
          lines.push(`${slot}=${itemName},affixes=${affs.join("/")}`);
        }
      });
      lines.push(``);
    } else if (build.gearAffixes && build.gearAffixes.length > 0) {
      lines.push(`# Gear Items & Blessings (Affixes)`);
      build.gearAffixes.forEach(g => lines.push(g));
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
    const hasSelectedBuilds = Boolean(state.selectedCompareBuildIds && state.selectedCompareBuildIds.size > 0);
    const isCompare = chkEnableCompare ? chkEnableCompare.checked : (Boolean(state.enableCompare) || hasSelectedBuilds);
    const encounterMode = state.activeMode || "dungeon";

    const lines = [
      `# ====================================================================`,
      `# FellowSimc Profile - ${isCompare ? "Multi-Build Comparison" : (state.selectedPlayerName || "Hero")}`,
      `# Generated via FellowSimc Importer & Build Manager`,
      `# ====================================================================`,
      ``,
      `iterations=${state.iterations || 1000}`,
      `optimal_raid=0`,
      `threads=${state.threads || 12}`,
      ``
    ];

    if (isCompare) {
      lines.push(`single_actor_batch=1`);
      lines.push(`report_details=1`);
      lines.push(`chart_show_relative_difference=1`);
      lines.push(`relative_difference_base="Current_Editor"`);
    }
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

    if (isCompare) {
      // Multi-Actor Compare Mode using full standalone actor definitions
      const usedNames = new Set();

      const sanitizeActorName = (rawName) => {
        let clean = rawName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').trim();
        if (!clean) clean = "Build";
        let finalName = clean;
        let suffix = 2;
        while (usedNames.has(finalName)) {
          finalName = `${clean}_${suffix++}`;
        }
        usedNames.add(finalName);
        return finalName;
      };

      // 1. Baseline Actor: Current Editor
      const baseName = "Current_Editor";
      usedNames.add(baseName);
      lines.push(ProfileGenerator.generateActorBlock(state, baseName));

      // 2. Compared Builds (from savedBuilds and checked checkboxes)
      const domCheckedIds = new Set();
      document.querySelectorAll(".compare-build-checkbox:checked").forEach(cb => {
        if (cb.value && cb.value !== "__current__") {
          domCheckedIds.add(cb.value);
        }
      });

      if (state.savedBuilds && state.savedBuilds.length > 0) {
        state.savedBuilds.forEach(b => {
          const isSelected = (state.selectedCompareBuildIds && (
            (typeof state.selectedCompareBuildIds.has === "function" && (state.selectedCompareBuildIds.has(b.id) || state.selectedCompareBuildIds.has(String(b.id)))) ||
            (Array.isArray(state.selectedCompareBuildIds) && (state.selectedCompareBuildIds.includes(b.id) || state.selectedCompareBuildIds.includes(String(b.id))))
          )) || domCheckedIds.has(b.id) || domCheckedIds.has(String(b.id));

          if (isSelected) {
            const bName = sanitizeActorName(b.name || `Build_${b.id}`);
            lines.push(ProfileGenerator.generateActorBlock(b, bName));
          }
        });
      }
    } else {
      // Single Actor Mode
      const pName = state.selectedPlayerName || (state.characterData?.player?.name) || "Hero";
      lines.push(ProfileGenerator.generateActorBlock(state, pName));
    }

    return lines.join("\n");
  }

  static generateActorCopyBlock(build, actorName, baseActorName, baseState) {
    const heroKey = (build.hero || build.selectedHero || "rime").toLowerCase();
    const baseHeroKey = (baseState.selectedHero || "rime").toLowerCase();
    const heroDef = HERO_DEFINITIONS[heroKey] || HERO_DEFINITIONS["rime"];

    // If different hero class, emit full standalone actor
    if (heroKey !== baseHeroKey) {
      return ProfileGenerator.generateActorBlock(build, actorName);
    }

    const lines = [];
    lines.push(``);
    lines.push(`# ====================================================================`);
    lines.push(`# Compare Variant: ${actorName}`);
    lines.push(`# ====================================================================`);
    lines.push(`copy="${actorName}","${baseActorName}"`);

    // Override APL if custom
    if (build.useCustomApl && build.customAplText) {
      lines.push(build.customAplText);
    } else if (build.aplChoice && build.aplChoice !== "base" && heroKey === "rime") {
      lines.push(`apl/heroes/rime/rime_${build.aplChoice}_apl.simc`);
    }

    // Override Stats
    const stats = build.stats || {};
    const rawPrimary = stats.primary || 0;
    const gearPrimary = Math.max(0, rawPrimary - 100);

    if (gearPrimary > 0) lines.push(`gear_${heroDef.primaryStat}=${gearPrimary}`);
    if (stats.stamina > 0) lines.push(`gear_stamina=${stats.stamina}`);
    if (stats.haste !== undefined) lines.push(`gear_haste_rating=${stats.haste}`);
    if (stats.expertise !== undefined) lines.push(`gear_expertise_rating=${stats.expertise}`);
    if (stats.crit !== undefined) lines.push(`gear_crit_rating=${stats.crit}`);
    if (stats.spirit !== undefined) lines.push(`gear_spirit=${stats.spirit}`);
    if (stats.armor !== undefined) lines.push(`gear_armor=${stats.armor}`);

    // Override Gem Powers
    if (build.gems) {
      for (const [gname, gpow] of Object.entries(build.gems)) {
        if (gpow > 0) lines.push(`gems.${gname}_power=${gpow}`);
      }
    }

    // Override Sets: Reset inactive sets to 0, active to 1
    const rawSets = build.activeSets instanceof Set ? Array.from(build.activeSets) : (build.activeSets || []);
    const activeSets = new Set(rawSets);
    Object.keys(GEAR_SETS).forEach(sKey => {
      if (activeSets.has(sKey)) {
        lines.push(`sets.${sKey}=1`);
      } else {
        lines.push(`sets.${sKey}=0`);
      }
    });

    if (build.legendary && build.legendary !== "none") {
      lines.push(`legendary.${build.legendary}=1`);
    }

    // Override Weapon & Weapon Traits
    if (build.weapon) {
      lines.push(`weapon=${build.weapon}`);
    }
    const traits = build.traitCounts || build.weaponTraits || {};
    for (const [tname, trank] of Object.entries(traits)) {
      if (trank > 0) lines.push(`weapon_trait.${tname}=${trank}`);
    }

    // Override Gear Items & Blessings (Affixes)
    const activeBlessingList = [];
    if (build.blessingCounts) {
      for (const [bid, count] of Object.entries(build.blessingCounts)) {
        const cappedCount = Math.min(4, Math.max(0, count));
        for (let i = 0; i < cappedCount; i++) {
          activeBlessingList.push(bid);
        }
      }
    }

    const standardSlots = [
      "head", "shoulder", "chest", "wrists", "hands", "legs",
      "feet", "finger1", "finger2", "neck", "back", "main_hand"
    ];

    if (activeBlessingList.length > 0) {
      const slotMap = {};
      standardSlots.forEach(s => { slotMap[s] = []; });

      let slotIdx = 0;
      activeBlessingList.forEach(blessing => {
        let placed = false;
        for (let i = 0; i < standardSlots.length; i++) {
          const s = standardSlots[(slotIdx + i) % standardSlots.length];
          if (slotMap[s].length < 2) {
            slotMap[s].push(blessing);
            slotIdx = (slotIdx + i + 1) % standardSlots.length;
            placed = true;
            break;
          }
        }
        if (!placed) {
          const s = standardSlots[slotIdx % standardSlots.length];
          slotMap[s].push(blessing);
          slotIdx = (slotIdx + 1) % standardSlots.length;
        }
      });

      standardSlots.forEach(slot => {
        const affs = slotMap[slot];
        if (affs && affs.length > 0) {
          const itemName = build.gearItemNames?.[slot] || `${slot}_item`;
          lines.push(`${slot}=${itemName},affixes=${affs.join("/")}`);
        }
      });
    } else if (build.gearAffixes && build.gearAffixes.length > 0) {
      build.gearAffixes.forEach(g => lines.push(g));
    }

    // Override Talents
    const selectedTalents = build.selectedTalents instanceof Set ? Array.from(build.selectedTalents) : (build.selectedTalents || []);
    if (selectedTalents.length > 0) {
      const activeTalents = selectedTalents.map(id => `${id}:1`);
      lines.push(`talents=${activeTalents.join("/")}`);
    }

    return lines.join("\n");
  }

  static updateEditor(state) {
    const editor = document.getElementById("raw-profile-editor");
    if (editor) {
      editor.value = ProfileGenerator.generate(state);
    }
  }
}
