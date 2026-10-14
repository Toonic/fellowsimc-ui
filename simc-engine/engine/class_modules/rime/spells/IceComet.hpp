#pragma once

#include "class_modules/rime/RimeAction.hpp"
#include "class_modules/rime/talents/Avalanche.hpp"
#include "class_modules/rime/talents/FrostweaversWrath.hpp"
#include "class_modules/rime/talents/IcyFlow.hpp"
#include "class_modules/rime/talents/IcyTalons.hpp"
#include "class_modules/rime/talents/RimeTalentId.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::spells
{
  /// <summary>
  /// Primary AoE spender. Drops a massive ice comet dealing area damage.
  /// Can trigger Avalanche secondary comet chains or Cold Shower procs.
  /// </summary>
  class IceComet : public rime_spell_t
  {
  public:
    // --- Colocated Constants & Tunings ---
    static inline constexpr double BaseDamageCoefficient = 5.285;
    static inline constexpr int    WinterOrbCost         = 2;
    static inline constexpr double AoeFalloffTargetCount = 12.0;

    IceComet( util::string_view name, rime_t* player, util::string_view options = {},
              secondary_trigger secondaryTrigger = secondary_trigger::NONE )
      : rime_spell_t( name, player, options )
    {
      id                     = 3;
      name_str_reporting     = "Ice Comet";
      secondary_trigger_type = secondaryTrigger;

      resource_current                  = RESOURCE_WINTER_ORB;
      base_costs[ RESOURCE_WINTER_ORB ] = WinterOrbCost;

      spell_power_mod.direct = BaseDamageCoefficient;
      aoe                    = -1;
      reduced_aoe_targets    = AoeFalloffTargetCount;

      if ( secondaryTrigger == secondary_trigger::NONE && !player->talents_enabled( rime_t::ICY_TALONS ) )
      {
        add_child( player->actions.ice_comet_avalanche );
      }

      ability_flags |= ability_type_e::ABILITY_POWER;
    }

    double composite_da_multiplier( const action_state_t* state ) const override
    {
      return rime_spell_t::composite_da_multiplier( state );
    }

    bool ready() override
    {
      if ( p()->talents_enabled( rime_t::ICY_TALONS ) )
        return false;

      return rime_spell_t::ready();
    }

    double composite_crit_chance() const override
    {
      return rime_spell_t::composite_crit_chance() + p()->buffs.icy_flow->check_value() +
             p()->buffs.frostweavers_wrath->check_value();
    }

    void execute() override
    {
      rime_spell_t::execute();

      p()->buffs.frostweavers_wrath->decrement();

      if ( !is_secondary_action() || secondary_trigger_type == secondary_trigger::COLD_SHOWER )
      {
        if ( p()->talents_enabled( rime_t::AVALANCHE ) )
        {
          if ( p()->rngs.avalanche_double->trigger() )
          {
            p()->actions.ice_comet_avalanche->trigger_secondary_action( target, 0.3_s );
          }
          else if ( p()->rngs.avalanche_triple->trigger() )
          {
            p()->actions.ice_comet_avalanche->trigger_secondary_action( target, 0.3_s );
            p()->actions.ice_comet_avalanche->trigger_secondary_action( target, 0.6_s );
          }
        }

        p()->buffs.icy_flow->decrement();
      }
    }
  };

  using ice_comet_t = IceComet;
}
