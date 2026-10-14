#pragma once

#include "class_modules/rime/RimeAction.hpp"
#include "class_modules/rime/spells/BurstingIce.hpp"
#include "class_modules/rime/talents/BurstingSwallows.hpp"
#include "class_modules/rime/talents/RimeTalentId.hpp"
#include "util/timespan.hpp"
#include <format>

namespace fellowship::rime::spells
{
  /// <summary>
  /// Frost Swallow: Projectile ability spawned in flocks during Flight of the Navir or Ice Blitz.
  /// Modified by Mastery (spirit multiplier) and can trigger Bursting Swallows.
  /// </summary>
  class FrostSwallow : public rime_spell_t
  {
  public:
    // --- Colocated Constants & Tunings ---
    static inline constexpr double     BaseDamageCoefficient = 0.469;
    static inline constexpr double     MasterySpiritMultiplier = 1.5;
    static inline constexpr timespan_t IceBlitzExtensionPerBird = timespan_t::from_seconds( 0.1 );

    FrostSwallow( rime_t* player )
      : rime_spell_t( "frost_swallow", player )
    {
      id                 = 15;
      name_str_reporting = "Frost Swallows";

      background = true;

      spell_power_mod.direct = BaseDamageCoefficient;
    }

    double composite_da_multiplier( const action_state_t* state ) const override
    {
      double multiplier = base_t::composite_da_multiplier( state );
      multiplier *= 1.0 + p()->cache.mastery() * MasterySpiritMultiplier;
      return multiplier;
    }

    void impact( action_state_t* state ) override
    {
      base_t::impact( state );

      if ( p()->talents_enabled( rime_t::BURSTING_SWALLOWS ) && p()->rngs.bursting_swallows )
      {
        if ( p()->rngs.bursting_swallows->trigger() )
        {
          if ( p()->actions.bursting_ice_tick && state && state->target && !state->target->is_sleeping() )
          {
            p()->actions.bursting_ice_tick->execute_on_target( state->target );
          }
        }
      }
    }

    void execute() override
    {
      if ( !target && p()->target )
      {
        set_target( p()->target );
      }
      if ( !target || target->is_sleeping() )
        return;

      base_t::execute();

      if ( p()->buffs.ice_blitz->check() )
      {
        p()->buffs.ice_blitz->extend_duration( p(), IceBlitzExtensionPerBird );
      }
    }
  };

  using frost_swallow_t = FrostSwallow;
}
