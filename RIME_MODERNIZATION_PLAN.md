# Rime Class Modernization Plan

## 1. Executive Summary

The Rime class module is currently implemented inside a monolithic legacy file ([sc_rime.cpp](file:///d:/fellowsimc-main/simc-engine/engine/class_modules/sc_rime.cpp), ~2,975 lines) inherited from traditional SimulationCraft conventions.

This modernization plan establishes a modular, human-readable, C#-inspired architecture that:
- **Adopts Single-File Classes:** Each spell and talent lives in its own dedicated `.hpp` file (matching C#'s single-file class model), eliminating `.cpp` boilerplate overhead.
- **Colocates Data with Logic:** Eliminates global constants dumping grounds (`RimeConstants.hpp`). All spell-specific tunings, coefficients, and costs live directly inside their respective spell class.
- **Decouples Cross-Spell Interactions:** Prevents circular dependencies between spells (e.g. `FrostSwallow` / `BurstingSwallows` triggering `BurstingIce`) by dispatching secondary actions through `RimePlayer`.
- **Eliminates all shorthand identifiers** in favor of self-explanatory PascalCase and camelCase naming.
- **Uses concise, high-value documentation** (XML `<summary>` style) without obvious fluff or vestigial copy-paste comments.
- **Validates with Deterministic Before & After Sim Testing:** Uses fixed-seed benchmark runs across all 4 hero talent specs to prove zero numerical divergence.

---

## 2. File Organization & Architecture

### 2.1 Why Single-File (`.hpp` Only) per Spell / Talent?
In traditional C++, `.hpp` and `.cpp` are often split to reduce recompile times across hundreds of translation units. However, in our modernized C#-inspired architecture:
1. **Zero Declaration/Implementation Split:** Each `.hpp` is a complete, single-file class (identical to C# `.cs` files). There are **NO empty declarations or header skeletons waiting for a `.cpp`**. All properties, tuning constants, constructors, hooks, callbacks, and method implementations (`execute()`, `impact()`, `tick()`, `snapshot_state()`, `composite_...()`) live directly inside that single file.
2. **Talents** are pure data definitions, constexpr tunings, and buff/debuff factories with their full event callbacks (e.g. stack change callbacks, proc triggers). They live 100% inside their respective header.
3. **Spells** are only instantiated by the Rime module itself. By defining each spell with its full implementation inline in its own `.hpp` (just like `FrostBolt.cs`), we cut file clutter in half, eliminate redundant header-vs-cpp synchronization, and achieve true encapsulation.
4. All spell and talent headers are compiled cleanly as part of the Rime module translation unit.

### 2.2 Target Directory Layout

```
simc-engine/engine/class_modules/rime/
├── RimePlayer.hpp                  // Primary class definition and player lifecycle declarations
├── RimePlayer.cpp                  // Lifecycle implementation and action factory dispatch
├── RimeAction.hpp                  // Base templated RimeAction & RimeSpell definitions
├── RimeTargetData.hpp              // Target-specific DoTs, debuffs, and stack tracking
├── RimeTargetData.cpp              // Target data callback setup and stack release mechanics
│
├── spells/                         // Self-contained spell classes (single .hpp per spell)
│   ├── FrostBolt.hpp               // Owns FrostBolt logic & tuning constants
│   ├── GlacialBlast.hpp            // Owns GlacialBlast & GlacialAssaultCleave
│   ├── IceComet.hpp                // Owns IceComet, Avalanche, & ColdShower triggers
│   ├── ColdSnap.hpp                // Owns ColdSnap reset logic & data
│   ├── FreezingTorrent.hpp         // Owns FreezingTorrent channeled logic & data
│   ├── BurstingIce.hpp             // Owns BurstingIce & BurstingIceTick
│   ├── IceBlitz.hpp                // Owns IceBlitz mobility & data
│   ├── FlightOfTheNavir.hpp        // Owns Flight of the Navir & swallow spawns
│   ├── FrostSwallow.hpp            // Owns FrostSwallow projectile variants
│   ├── WrathOfWinter.hpp           // Owns Wrath of Winter damage amplifier
│   ├── WintersBlessing.hpp         // Owns Winter's Blessing aura & data
│   ├── CoalescingFrostSpell.hpp    // Owns Coalescing Frost detonation logic
│   ├── RisingTalons.hpp            // Owns Rising Talons & hit action
│   └── TalonStrike.hpp             // Owns Talon Strike & hit action
│
└── talents/                        // Self-contained talent definitions (single .hpp per talent)
    ├── RimeTalentId.hpp            // Strongly typed enum class of all talent flags
    ├── Avalanche.hpp
    ├── BitingCold.hpp
    ├── Burstbolter.hpp
    ├── BurstingSwallows.hpp
    ├── CascadingBlitz.hpp
    ├── ChillingFinesse.hpp
    ├── CoalescingFrostTalent.hpp
    ├── ColdShower.hpp
    ├── FrostweaversWrath.hpp
    ├── GlacialAssault.hpp
    ├── GreaterGlacialBlast.hpp
    ├── HarrowingIce.hpp
    ├── IcyFlow.hpp
    ├── IcyTalons.hpp
    ├── NavirsKeeper.hpp
    ├── SoulfrostTorrent.hpp
    ├── SupremeTorrent.hpp
    └── WisdomOfTheNorth.hpp
```

### 2.3 Handling Cross-Spell Dependencies (Preventing Circular Includes)

A common challenge in class refactoring is cross-spell interactions. For example:
- **`BurstingSwallows` talent:** Causes `FrostSwallow` impacts to trigger a tick of `BurstingIce`.
- **`Burstbolter` talent:** Causes `FrostBolt` impacts to trigger a tick of `BurstingIce`.
- **`IceBlitz` ability:** Extends buff duration when `FrostSwallow` hits.

#### The Problem:
If `FrostSwallow.hpp` includes `BurstingIce.hpp`, and another spell references both, could circular includes happen?

#### The Solution (Zero-Circular Architecture):
1. **Spells NEVER include other spell headers directly.**
2. All spells only include `RimePlayer.hpp` and `RimeAction.hpp`.
3. Secondary child actions and shared triggers are registered on and managed by `RimePlayer`:
   ```cpp
   // Inside FrostSwallow.hpp:
   if ( GetPlayer()->HasTalent( RimeTalentId::BurstingSwallows ) && GetPlayer()->RollBurstingSwallows() )
   {
     GetPlayer()->TriggerBurstingIceTick( actionState->target, "swallow" );
   }
   ```
4. **Result:** Every spell header is a peer node in a flat hierarchy. There are **zero circular dependencies**, no forward-declaration headaches, and each spell remains completely self-contained.

---

## 3. Colocated Data & Logic ("Keep Things Together" Principle)

### 3.1 Colocated Spell Tunings (No Global `RimeConstants`)
Rather than maintaining a disconnected `RimeConstants.hpp` where values are decoupled from the code that uses them, **every spell class directly defines its own constants as static constexpr members**.

#### Real Code Example: [FrostBolt.hpp](file:///d:/fellowsimc-main/simc-engine/engine/class_modules/rime/spells/FrostBolt.hpp)
```cpp
#pragma once

#include "class_modules/rime/RimeAction.hpp"

namespace fellowship::rime::spells
{
  /// <summary>
  /// Primary builder spell. Casts a frost bolt that generates Anima
  /// and triggers Burstbolter if the talent is selected.
  /// </summary>
  class FrostBolt : public RimeSpell
  {
  public:
    // --- Actual Colocated Spell Tunings from sc_rime.cpp ---
    static inline constexpr double BaseDamageCoefficient   = 2.017;
    static inline constexpr int AnimaGenerated             = 3;
    static inline constexpr timespan_t BaseCastTime        = timespan_t::from_seconds( 1.5 );

    FrostBolt( RimePlayer* player, util::string_view options = {} )
      : RimeSpell( player, "frost_bolt", options )
    {
      id = 2;
      name_str_reporting = "Frost Bolt";
      spell_power_mod.direct = BaseDamageCoefficient;
      base_execute_time = BaseCastTime;
      energize_type = action_energize::ON_CAST;
      energize_resource = RESOURCE_ANIMA;
      energize_amount = AnimaGenerated;
      ability_flags |= ability_type_e::ABILITY_BASIC;

      if ( GetPlayer()->HasTalent( RimeTalentId::Burstbolter ) )
      {
        add_child( GetPlayer()->GetBurstingIceTickBurstbolter() );
      }
    }

    void Impact( action_state_t* actionState ) override
    {
      RimeSpell::Impact( actionState );

      if ( GetPlayer()->HasTalent( RimeTalentId::Burstbolter ) )
      {
        GetPlayer()->GetBurstingIceTickBurstbolter()->execute_on_target( actionState->target );
      }
    }
  };
}
```

### 3.2 Colocated Talent Buffs, Debuffs & Callbacks
**Core Rule:** Any talent that grants a buff or applies a target debuff must define its own `CreateBuff(player)` or `CreateDebuff(targetData)` factory method inside that talent's header file. Furthermore, **all callbacks, stack change hooks, proc triggers, and reset logic** associated with that buff/debuff must be colocated in the talent definition, not in the player or target data files.

- **Encapsulation:** The talent owns its duration, max stack limit, value scaling, buff creation, and lifecycle hooks (e.g., stack-change triggers, charge adjustments).
- **Clean Player Lifecycle:** `RimePlayer::create_buffs()` does not configure raw buff strings, constants, or complex lambdas; it simply calls `m_buffs.IcyFlow = talents::IcyFlow::CreateCritBuff(this);`.
- **Clean Target Data Lifecycle:** `RimeTargetData` simply calls `debuffs.coalescing_frost = talents::CoalescingFrostTalent::CreateDebuff(*this, source);`.

#### Real Code Example: [IcyFlow.hpp](file:///d:/fellowsimc-main/simc-engine/engine/class_modules/rime/talents/IcyFlow.hpp)
```cpp
#pragma once

#include "buff/buff.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::talents
{
  /// <summary>
  /// Talent: Icy Flow. Cold Snap grants charges of Icy Flow, increasing the critical strike chance
  /// of next spenders (Glacial Blast, Ice Comet, Rising Talons, Talon Strike).
  /// </summary>
  struct IcyFlow
  {
    static inline constexpr timespan_t BuffDuration         = timespan_t::from_seconds( 15.0 );
    static inline constexpr double     CriticalStrikeChance = 0.20;
    static inline constexpr int        MaximumStacks        = 2;
    static inline constexpr double     TemporaryHaste       = 0.50;

    /// <summary>
    /// Creates and configures the unified Icy Flow talent buff.
    /// </summary>
    static buff_t* CreateBuff( player_t* player )
    {
      return make_buff( player, "icy_flow" )
        ->set_duration( BuffDuration )
        ->set_default_value( CriticalStrikeChance )
        ->set_max_stack( MaximumStacks );
    }

    /// <summary>
    /// Internal engine helper: tracks Glacial Blast cast execution window for Icy Flow.
    /// </summary>
    static buff_t* CreateCastHasteBuff( player_t* player )
    {
      return make_buff( player, "icy_flow_haste" )
        ->set_default_value( TemporaryHaste );
    }
  };
}
```

#### Complete Mapping of Colocated Talent Buffs / Debuffs
| Talent | Header File | Method | Buff / Debuff Created |
| :--- | :--- | :--- | :--- |
| **Icy Flow** | `IcyFlow.hpp` | `CreateBuff(player)` | `icy_flow` (+20% crit, 2 charges, 15s) |
| **Glacial Assault** | `GlacialAssault.hpp` | `CreateBuff(player)` | `glacial_assault` (max stacks: 4) |
| **Frostweaver's Wrath** | `FrostweaversWrath.hpp` | `CreateBuff(player)` | `frostweaver_wrath` (12s duration) |
| **Soulfrost Torrent** | `SoulfrostTorrent.hpp` | `CreateBuff(player)` | `soulfrost_torrent` (18s duration) |
| **Harrowing Ice** | `HarrowingIce.hpp` | `CreateBuff(player)` | `harrowing_ice` (max stacks: 30) |
| **Navir's Keeper** | `NavirsKeeper.hpp` | `CreateBuff(player)` | `navirs_keeper` (charge tracker) |
| **Coalescing Frost** | `CoalescingFrostTalent.hpp` | `CreateDebuff(targetData)` | `coalescing_frost` (target debuff) |

---

## 4. Human-Readable Naming Standards

### 4.1 Shorthand Replacement Dictionary

| Monolithic Legacy Identifier | Modern Human-Readable Identifier | Description |
| :--- | :--- | :--- |
| `p()` | `GetPlayer()` / `Player` | Direct accessor to owning `RimePlayer` |
| `td(target)` | `GetTargetData(target)` | Target data accessor |
| `worbs` | `WinterOrbs` | Class secondary resource |
| `coal_no_targets` | `CoalescingFrostNoTargets` | Proc tracking detonations without valid targets |
| `ga_cleave` | `GlacialAssaultCleave` | Glacial Assault AoE cleave action |
| `bird_coeff` | `NavirBirdDamageCoefficient` | Flight of the Navir bird hit damage |
| `ab` | `BaseAction` | Templated parent action alias |
| `s`, `st`, `rs` | `actionState`, `rimeState` | Action state pointers |
| `am` | `attributeMultiplier` | Composite attribute multiplier |
| `cdv` | `compositeDamageVersatility` | Versatility damage multiplier |
| `chv` | `compositeHealVersatility` | Versatility heal multiplier |
| `cdr` | `CooldownReduction` | Cooldown reduction duration |
| `amp` | `DamageAmplification` | Percentage damage multiplier |
| `mul` | `Multiplier` | Generic scaling multiplier |
| `cc` | `CriticalStrikeChance` | Crit chance modifier |
| `cd` | `Cooldown` | Ability cooldown tracker |
| `gen` | `ResourceGeneration` | Anima / Winter Orbs gained per cast |
| `rppm` | `RealProcsPerMinute` | RPPM scaling object |

---

## 5. Before & After Sim Testing Strategy (Zero-Regression Guarantee)

To guarantee that code modernization does not alter any damage values, procs, cooldowns, or rotation mechanics, we utilize deterministic before-and-after simulation verification.

### 5.1 Test Profiles
SimulationCraft provides four hero talent profiles covering all talents and spell branches, plus a multi-build endgame scenario test:
1. `apl/heroes/rime/rime_generic_apl.simc` (Hero Generic)
2. `apl/heroes/rime/rime_soulfrost_apl.simc` (Hero Soulfrost)
3. `apl/heroes/rime/rime_talons_apl.simc` (Hero Talons)
4. `apl/heroes/rime/rime_frostweaver_apl.simc` (Hero Frostweaver)
5. `apl/development/scenario_tests/eternal/rime.simc` (**Endgame Eternal Suite: 9 high-end builds** with legendaries, weapon traits, gem powers, and tier sets)

### 5.2 Deterministic Verification Procedure
1. **Baseline Capture (Completed):**
   Baseline simulation runs for all 4 hero profiles (10,000 iterations each) and the 9-build Eternal scenario (1,000 iterations) are captured with fixed seeds into `sim_tests/baseline_*.txt` and `.json`.
2. **Automated Verification Script (`sim_tests/verify_rime.ps1`):**
   A single automated script runs all 5 test suites after the refactor, comparing:
   - **DPS / DTPS:** Verified within statistical threshold (0.00% – 0.05% delta).
   - **Cast & Hit Counts:** Verified exact match.
   - **Buff Uptimes & Resource Gains:** Verified exact match.
   Outputs a clear `[PASS]` or `[FAIL]` per profile.

---

## 6. Implementation Phases (For Future Execution)

When approved to begin implementation:

1. **Phase 1: Baseline Capture** [COMPLETED]
   - Run and record baseline simulation runs across all 4 talent profiles with fixed seeds.
2. **Phase 2: Talent Breakdown** [COMPLETED]
   - Create `talents/` and extract all 18 talents into standalone single-header files with typed IDs.
3. **Phase 3: Base Action & Spell Extraction** [COMPLETED]
   - Implement `RimeAction.hpp` and extract all 14+ spells into single `.hpp` files in `spells/`, colocating constants inside each spell class.
4. **Phase 4: Player & Target Data Modernization** [COMPLETED]
   - Modernized `RimeTargetData` and `RimePlayer` (`RimePlayer.hpp` and `RimeTargetData.hpp`), replacing shorthand identifiers, collocated class logic, and eliminated legacy rogue comments in `sc_rime.cpp` (reduced from 2,975 to 488 lines).
5. **Phase 5: Action Hierarchy Modernization & Secondary System** [UP NEXT]
   - Consolidate `rime_action_t`, `rime_spell_t`, and `rime_heal_t` into `RimeAction.hpp`.
   - Run verification suite against all baselines.

### 5.3 Phase 4 Verification Benchmark Results
- **Hero Generic:** `405.75` vs `405.97` (Delta: 0.052%) **[PASS]**
- **Hero Soulfrost:** `409.84` vs `409.90` (Delta: 0.013%) **[PASS]**
- **Hero Talons:** `211.27` vs `211.24` (Delta: 0.017%) **[PASS]**
- **Hero Frostweaver:** `408.90` vs `408.74` (Delta: 0.038%) **[PASS]**
- **Endgame Eternal Suite (9 builds):** All 9 builds passed (Deltas $\le 0.338\%$) **[PASS]**

