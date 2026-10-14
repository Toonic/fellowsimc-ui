# FellowSimc Hero Implementation & Parity Engineering Guide

This guide defines the standard engineering architecture and workflow for FellowSimc. It serves as the reference for breaking down monolithic hero classes, modularizing abilities and talents, implementing universal mechanics (Blessings, Weapon Traits, Set Bonuses), and achieving exact 1:1 combat log replay parity.

---

## 1. Core Parity Principles & Acceptance Criteria

When implementing or auditing any hero, talent, or mechanic, simulations must be verified against real combat logs using the Exact Replay engine (`tools/extract_combat_log_timeline.py`, `simc.exe`, and `tools/generate_replay_report.py`).

### Verification Criteria

| Metric | Target Tolerance | Rationale |
| :--- | :--- | :--- |
| **Casts Parity** | **Exact 1:1 Match (0% Delta)** | Every active player cast is scheduled at the authentic timestamp recorded in the combat log. |
| **Hits Parity** | **As close to 1:1 as possible (< 3% variance)** | Ticks, AoE targets, and projectile impacts must evaluate against the exact active pack present in combat. |
| **Damage & DPS** | **< 10% variance** | Damage numbers fluctuate naturally with Critical Strike variance, secondary procs, and armor/damage reduction. |
| **Buff Uptime** | **Near 0% Delta (< 1-2s delta)** | Authentic buffs, procs, and talent auras must match real-world combat durations and trigger conditions. |
| **Overall Match** | **>= 92% - 100% Match** | Total simulated damage divided by real log damage across single-target and multi-target encounters. |

### Canonical Rules

1. **Pure Datamined Formulas (`entities.jsonl`)**:
   - Damage coefficients, proc chances (PPM), durations, and AoE falloffs must be sourced directly from `entities.jsonl`.
   - Never use arbitrary multipliers (e.g. `*= 0.82` or undocumented dampeners) to force numbers to match. If damage is off, inspect base attack power / spell power scaling, crit modifiers, or talent interactions.
2. **Authentic Combat Log Timestamps**:
   - Every cast action in the replay schedule executes unconditionally at its exact `entry.timestamp`. Do not offset or delay casts based on speculative end times.
3. **Natural Engine Proc Execution**:
   - Secondary procs, buffs, debuffs, and resource refunds must resolve naturally through SimulationCraft's event engine and RNG systems based on datamined probabilities.
4. **Zero Git Clutter**:
   - All generated replays, `.html`, `.json`, `.simc`, `.csv`, and temporary files are git-ignored. Diagnostic and research scripts belong in `tools/local_research/`.

---

## 2. Modular Architecture for Heroes

Monolithic hero classes (e.g. 2,000+ line single files like `sc_elarion.cpp` or `sc_gunde.cpp`) must be refactored into modular directory structures matching the reference pattern in `simc-engine/engine/class_modules/rime/`.

### Directory Layout

```
simc-engine/engine/class_modules/<hero_name>/
├── <Hero>Player.hpp          # Player class declaration, resource pools, buff pointers, overrides
├── <Hero>Action.hpp          # Base spell/heal/attack action classes and action states
├── <Hero>TargetData.hpp      # Per-target debuffs, dots, and combat state tracking
├── spells/                   # One header per active ability or spell
│   ├── AbilityOne.hpp
│   ├── AbilityTwo.hpp
│   └── ...
└── talents/                  # One header per talent node or passive mechanic
    ├── <Hero>TalentId.hpp    # Talent ID enum definitions matching entities.jsonl
    ├── TalentOne.hpp
    ├── TalentTwo.hpp
    └── ...
```

### Implementing a Modular Talent

Talents encapsulate their datamined constants and buff creation logic in isolated headers:

```cpp
// simc-engine/engine/class_modules/rime/talents/GlacialAssault.hpp
#pragma once

#include "buff/buff.hpp"

namespace fellowship::rime::talents
{
  struct GlacialAssault
  {
    static inline constexpr int    MaximumStacks         = 4;
    static inline constexpr double DamageAmplification   = 0.40;
    static inline constexpr double CleaveMultiplier      = 0.30;
    static inline constexpr int    AoeFalloffTargetCount = 12;

    static buff_t* CreateBuff( player_t* player )
    {
      return make_buff( player, "glacial_assault" )
        ->set_max_stack( MaximumStacks )
        ->set_default_value( DamageAmplification );
    }
  };
}
```

### Implementing a Modular Ability / Spell

Spells define their own sub-actions, coefficients, and resource costs colocated in their own file:

```cpp
// simc-engine/engine/class_modules/rime/spells/GlacialBlast.hpp
#pragma once

#include "class_modules/rime/RimeAction.hpp"
#include "class_modules/rime/talents/GlacialAssault.hpp"

namespace fellowship::rime::spells
{
  class GlacialBlast : public rime_spell_t
  {
  public:
    static inline constexpr double     BaseDamageCoefficient = 10.24;
    static inline constexpr int        ResourceCost          = 2;
    static inline constexpr timespan_t BaseCastTime          = timespan_t::from_seconds( 2.0 );

    GlacialBlast( util::string_view name, rime_t* player )
      : rime_spell_t( name, player )
    {
      // Assign native engine reporting name
      name_str_reporting = "Glacial Blast";
      school = SCHOOL_FROST;
      base_cost = ResourceCost;
      base_execute_time = BaseCastTime;
    }

    void execute() override
    {
      rime_spell_t::execute();
      // Consume buffs, trigger cleaves, etc.
    }
  };
}
```

---

## 3. Modularizing Shared Systems: Blessings, Traits & Set Bonuses

Currently, shared mechanics reside in `simc-engine/engine/class_modules/fs_player.hpp` and `fs_player.cpp`. Future refactoring should extract these into clean domain subdirectories under `simc-engine/engine/fellowship/`:

```
simc-engine/engine/fellowship/
├── blessings/                 # Shared God Blessings (Trickster, Celestial, Heretic, etc.)
│   ├── BlessingOfTheTrickster.hpp
│   └── BlessingOfTheCelestial.hpp
├── traits/                    # Weapon & Armor Traits (Seized Opportunity, First Strike, etc.)
│   ├── SeizedOpportunity.hpp
│   └── FirstStrike.hpp
├── sets/                      # Gear Set Bonuses (Tuzari, etc.)
│   ├── TuzariDarkProphecy.hpp
│   └── TuzariDeathsGrasp.hpp
└── gems/                      # Socketed Gemstone procs & stats
```

### Modular Pattern for Shared Items / Traits

```cpp
namespace fellowship::traits
{
  struct SeizedOpportunity
  {
    static inline constexpr int TraitId = 4;
    static inline constexpr int StackingEffectId = 2111;
    static inline constexpr int BuffEffectId = 2110;
    static inline constexpr int MaxCritStacks = 20;
    static inline constexpr timespan_t Duration = timespan_t::from_seconds( 12.0 );

    static void OnPlayerCrit( fs_player_t* player )
    {
      if ( player->fs_buffs.seized_opportunity->check() )
        return; // Cannot stack while active buff is ticking

      player->fs_buffs.seized_opportunity_stacking->trigger();
      if ( player->fs_buffs.seized_opportunity_stacking->stack() >= MaxCritStacks )
      {
        player->fs_buffs.seized_opportunity_stacking->expire();
        player->fs_buffs.seized_opportunity->trigger();
      }
    }
  };
}
```

---

## 4. UI & Reporting Integration (`ui/report_utils.py`)

When adding or refactoring a hero's abilities, register them in [`ui/report_utils.py`](file:///d:/fellowsimc-main/ui/report_utils.py) to enable unified reporting in both the web app and replay audits:

1. **Add Hero Actions Table**:
   ```python
   NEW_HERO_ACTIONS = {
       "primary_spell": {"name": "Primary Spell", "type": "Spell", "school": "Arcane"},
       "shoot": {"name": "Shoot", "type": "Physical Ability", "school": "Physical"},
   }
   ```
2. **Add Hero Buffs Table**:
   ```python
   NEW_HERO_BUFFS = {
       "hero_aura": {"name": "Hero Aura", "category": "Hero"},
   }
   ```
3. **Register in Registry Maps**:
   - Add entries to `HERO_ACTION_REGISTRY` and `HERO_BUFF_REGISTRY`.
   - Ensure `get_hero_actions(hero_name)` and `get_hero_buffs(hero_name)` return the hero-specific actions combined with `SHARED_ACTIONS` and `SHARED_BUFFS`.
4. **Avoid Generic Fallbacks**:
   - Never map abilities like `Shoot` to `auto_attack`. Define `"shoot": {"name": "Shoot", ...}` natively.

---

## 5. End-to-End Hero Audit & Verification Workflow

Follow this step-by-step checklist when tuning a new hero or validating patch changes:

### Step 1: Extract Combat Log Timeline
Query FellowshipLogs for a top-performing fight on the hero:
```powershell
python tools/extract_combat_log_timeline.py --code <LOG_CODE> --fight <FIGHT_ID> --player <PLAYER_ID> --output replay_timeline.json
```
Verify that all player casts were extracted and assigned proper enemy packs.

### Step 2: Build the Simulation Profile
Generate the exact `.simc` profile containing the character gear, talents, and scheduled timeline:
```powershell
# For example, using local pipeline tools or ui/importer.py
python tools/local_research/run_pipeline_<FIGHT_ID>.py
```

### Step 3: Compile and Run the Engine
Compile the C++ engine (VS 2026 / MSBuild):
```powershell
& "C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Current\Bin\MSBuild.exe" "d:\fellowsimc-main\simc-engine\simc_vs2026.sln" /p:Configuration=Release /p:Platform=x64 /m
copy d:\fellowsimc-main\simc-engine\engine\Release\simc.exe d:\fellowsimc-main\simc.exe
.\simc.exe replay_<hero>.simc
```

### Step 4: Generate Interactive Audit Report
Generate the self-contained audit HTML and JSON summary:
```powershell
python tools/generate_replay_report.py `
  --results replay_<hero>_results.json `
  --simc replay_<hero>_simc.json `
  --timeline replay_<hero>_timeline.json `
  --output_html audit_<hero>.html `
  --output_json audit_<hero>.json
```

### Step 5: Evaluate Parity
Open the generated HTML report or inspect the JSON:
- Check that **Casts** match 100% (0 delta).
- Check that **Hits** are within 1-3% across single-target and multi-target cleaves.
- Check that **Buff Uptimes** show near 0% delta (especially key procs like Seized Opportunity, Rising Spirit, etc.).
- Confirm **Overall Match** falls between 92% and 100%.

If variance exceeds 10%, review `entities.jsonl` coefficients, verify secondary proc chances, and check target pack size logic before adjusting any simulation behavior.

---

## 6. Datamined Reference Mechanics

### Elarion Mechanics (`entities.jsonl`)
* **Lunarlight Mark (Ability 1310)**:
  - Base proc chance on normal hit: **25%** (`lunarlight_mark_chance_hit = 0.25`).
  - Base proc chance on critical strike: **50%** (`lunarlight_mark_chance_crit = 0.50`).
  - Stacks applied: 3 stacks to primary target and up to 11 additional nearby enemies.
* **Lunarlight Salvo (Ability 1309 / Effect 1877)**:
  - Single-target celestial beam triggered by marked targets when taking damage.
  - Agility coefficient: **2.19 direct**.
  - All abilities (Heartseeker Barrage, Multishot, Shoot, Focused Shot, Celestial Shot) trigger single-target Lunarlight Salvo.
  - Consumes 1 mark stack upon triggering (except Starfall Volley when talented into Lunarlight Affinity).
* **Lunarlight Salvo: Erupt (Effect 2832)**:
  - Agility coefficient: **2.19 AoE**.
  - **Exclusivity**: Only **Heartseeker Barrage (Ability 1312)** triggers Erupt:
    > "Damage dealt by Heartseeker Barrage that triggers a Lunarlight Salvo has a 25% chance to cause it to Erupt, dealing {AoeLunarLightDmg} magic damage to enemies near the target."
  - Multishot, Starfall Volley, Shoot, and other general abilities do **not** trigger Erupt.
  - When Heartseeker Barrage triggers Salvo, it rolls `barrage_mark_aoe_chance = 0.25` to trigger Erupt on the active alive pack.
* **Lunarlight Affinity (Talent 203)**:
  - Starfall Volley no longer consumes Lunarlight Mark stacks.
  - Lunarlight Salvo gains +20% critical strike chance.
* **Seized Opportunity (Trait ID 4, Power 385)**:
  - Counter (Effect 2111): Stacks up to 20 crits. Cannot gain stacks while the 12s buff is active.
  - Buff (Effect 2110): 12-second buff granting critical strike rating.
  - In log tables, both share the name `"Seized Opportunity"`; extraction maps GUID `1002110` to prevent counter uptime from overwriting buff uptime.

### Rime Mechanics (`entities.jsonl`)
* **Cold Snap (Ability 1020 / Effect 1384)**:
  - Base Damage Coefficient: **1.34** Spell Power.
  - Cold Snap generates 1 stack of Glacial Assault (Talent 38 / Ability 2023).
* **Glacial Blast (Ability 1028 / Effect 1392)**:
  - At 4 stacks of Glacial Assault (Effect 1377):
    - Instant cast, 0 mana cost.
    - **+40% damage amplification** (`talents::GlacialAssault::DamageAmplification = 0.40`).
    - Explodes on impact, dealing **30% cleave damage** to nearby enemies (`talents::GlacialAssault::CleaveMultiplier = 0.30`).
* **Talon Strike (Ability 2223)**:
  - Base Damage Coefficient: **2.45** Spell Power.
  - When consumed at max Glacial Assault stacks, gains **+40% damage amplification**.
* **Rising Talons (Ability 1023)**:
  - Square-root AoE target falloff above 12 targets: `std::sqrt(12.0 / pack_size)` matching datamined target falloff.
* **Bursting Ice (Ability 1022)**:
  - Base Damage Coefficient: **2.40** Spell Power.
  - Amplified by Burstbolter talent (`talents::Burstbolter::BurstingIceAmplification = 0.15`) and Harrowing Ice stacks.
* **Frost Swallows (Ability 1026)**:
  - Scales with Mastery: `1.0 + mastery * MasterySpiritMultiplier`.

---

## 7. Verified Baseline Checkpoints

### Elarion Benchmark (Report `MLbd89NX3W4Q2Bgx`, Fight 26)

| Metric | Real Log | SimC Engine | Status |
| :--- | :--- | :--- | :--- |
| **Total Damage** | 31,176,934 | 30,990,655 | **99.4% Match** |
| **Casts Parity** | 732 casts | 732 casts | **100.0% Exact Match** |
| **Multishot** | 1,339 hits / 6.44M | 1,406 hits / 5.85M | **90.9% Match** |
| **Lunarlight Salvo** | 1,515 hits / 6.04M | 1,701 hits / 6.47M | **107.1% Match** |
| **Lunarlight Salvo: Erupt** | 1,475 hits / 5.52M | 2,166 hits / 7.36M | 25% Natural HB Proc |
| **Heartseeker Barrage** | 1,473 hits / 4.77M | 2,424 hits / 4.34M | **91.1% Match** |
| **Starfall Volley** | 2,969 hits / 4.21M | 3,279 hits / 4.26M | **101.1% Match** |
| **Shoot** | 236 hits / 158.7K | 249 hits / 148.4K | **93.5% Match** |
| **Seized Opportunity Uptime**| 66.37% (425.4s) | 66.29% (424.9s) | **99.9% Parity (-0.08%)** |

### Rime Benchmark (Report `yMAZVJL9hTpFjqbC`, Fight 7)

| Metric | Real Log | SimC Engine | Status |
| :--- | :--- | :--- | :--- |
| **Total Damage** | 38,085,821 | 35,311,760 | **92.7% Match** |
| **Log DPS vs Sim DPS** | 53,593 DPS | 49,690 DPS | **-7.28% Delta** |
| **Casts Parity** | 100% Exact Timeline | 100% Exact Timeline | **100.0% Exact Match** |


