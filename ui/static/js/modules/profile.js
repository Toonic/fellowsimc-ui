// Profile Generator for SimC profiles
import { HERO_DEFINITIONS } from "../data/heroes.js";

export class ProfileGenerator {
  static generate(state) {
    const pName = state.selectedPlayerName || (state.characterData?.player?.name) || "Hero";
    const heroKey = (state.selectedHero || "rime").toLowerCase();
    const heroDef = HERO_DEFINITIONS[heroKey] || HERO_DEFINITIONS["rime"];

    const lines = [
      `# ====================================================================`,
      `# FellowSimc Profile - ${pName} (${heroDef.name.toUpperCase()})`,
      `# Generated via FellowSimc Importer`,
      `# ====================================================================`,
      ``,
      `iterations=${state.iterations || 1000}`,
      `optimal_raid=0`,
      `threads=${state.threads || 12}`,
      ``
    ];

    if (state.activeMode === "dungeon") {
      if (state.selectedRouteType === "custom_imported" && state.customRouteText) {
        lines.push(`# Encounter: Custom Imported Dungeon Route`);
        lines.push(state.customRouteText);
      } else {
        lines.push(`# Encounter: Dungeon Route - Eternal 62 (Exported from a Wyrmheart 62 route)`);
        lines.push(`apl/routes/wyrmheart_62_solo.simc`);
      }
    } else if (state.activeMode === "single_target") {
      const dur = document.getElementById("input-st-duration")?.value || 360;
      lines.push(`# Encounter: Single Target (${dur}s)`);
      lines.push(`max_time=${dur}`);
      lines.push(`vary_combat_length=0.0`);
      lines.push(`fight_style=Patchwerk`);
    } else if (state.activeMode === "aoe") {
      const targets = document.getElementById("input-aoe-targets")?.value || 10;
      const dur = document.getElementById("input-aoe-duration")?.value || 360;
      lines.push(`# Encounter: AoE (${targets} Targets, ${dur}s)`);
      lines.push(`max_time=${dur}`);
      lines.push(`vary_combat_length=0.0`);
      lines.push(`fight_style=Patchwerk`);
      lines.push(`desired_targets=${targets}`);
    }

    lines.push(``);
    lines.push(`# Hero & APL`);
    lines.push(`${heroDef.simcClass}="${pName}"`);
    lines.push(`level=80`);

    if (state.useCustomApl && state.customAplText) {
      lines.push(`# Custom Action Priority List`);
      lines.push(state.customAplText);
    } else if (state.aplChoice === "talons" && heroKey === "rime") {
      lines.push(`apl/heroes/rime/rime_talons_apl.simc`);
    } else if (state.aplChoice === "frostweaver" && heroKey === "rime") {
      lines.push(`apl/heroes/rime/rime_frostweaver_apl.simc`);
    } else if (state.aplChoice === "soulfrost" && heroKey === "rime") {
      lines.push(`apl/heroes/rime/rime_soulfrost_apl.simc`);
    } else if (state.aplChoice === "generic" && heroKey === "rime") {
      lines.push(`apl/heroes/rime/rime_generic_apl.simc`);
    } else {
      lines.push(`apl/heroes/${heroKey}/${heroKey}_base_apl.simc`);
    }
    lines.push(``);

    const gearPrimary = Math.max(0, state.stats.primary - 100);
    lines.push(`# Gear Attributes & Ratings (Primary -100 for SimC base engine)`);
    if (gearPrimary > 0) lines.push(`gear_${heroDef.primaryStat}=${gearPrimary}`);
    if (state.stats.stamina > 0) lines.push(`gear_stamina=${state.stats.stamina}`);
    if (state.stats.haste > 0) lines.push(`gear_haste_rating=${state.stats.haste}`);
    if (state.stats.expertise > 0) lines.push(`gear_expertise_rating=${state.stats.expertise}`);
    if (state.stats.crit > 0) lines.push(`gear_crit_rating=${state.stats.crit}`);
    if (state.stats.spirit > 0) lines.push(`gear_spirit=${state.stats.spirit}`);
    if (state.stats.armor > 0) lines.push(`gear_armor=${state.stats.armor}`);
    lines.push(``);

    // Gem Powers
    if (state.gems) {
      lines.push(`# Gem Powers`);
      for (const [gname, gpow] of Object.entries(state.gems)) {
        if (gpow > 0) lines.push(`gems.${gname}_power=${gpow}`);
      }
      lines.push(``);
    }

    // Sets & Legendary
    lines.push(`# Active Sets & Legendary`);
    if (state.activeSets && state.activeSets.size > 0) {
      state.activeSets.forEach(setId => {
        lines.push(`sets.${setId}=1`);
      });
    }
    if (state.legendary && state.legendary !== "none") {
      lines.push(`legendary.${state.legendary}=1`);
    }
    lines.push(``);

    // Weapon & Weapon Traits
    lines.push(`# Equipped Weapon & Weapon Traits`);
    lines.push(`weapon=${state.weapon}`);
    if (state.traitCounts) {
      for (const [tname, trank] of Object.entries(state.traitCounts)) {
        lines.push(`weapon_trait.${tname}=${trank}`);
      }
    }
    lines.push(``);

    // Gear Items & Blessings (Affixes) - Evenly distributed across gear slots
    const activeBlessingList = [];
    if (state.blessingCounts) {
      for (const [bid, count] of Object.entries(state.blessingCounts)) {
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
          const itemName = state.gearItemNames?.[slot] || `${slot}_item`;
          lines.push(`${slot}=${itemName},affixes=${affs.join("/")}`);
        }
      });
      lines.push(``);
    } else if (state.gearAffixes && state.gearAffixes.length > 0) {
      lines.push(`# Gear Items & Blessings (Affixes)`);
      state.gearAffixes.forEach(g => lines.push(g));
      lines.push(``);
    }

    // Build Talents in Simulationcraft format: talents=tal1:1/tal2:1/...
    if (state.selectedTalents.size > 0) {
      lines.push(`# Talents`);
      const activeTalents = Array.from(state.selectedTalents).map(id => `${id}:1`);
      lines.push(`talents=${activeTalents.join("/")}`);
      lines.push(``);
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
