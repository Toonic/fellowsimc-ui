#pragma once

#include "class_modules/rime/RimeAction.hpp"
#include "class_modules/rime/talents/Burstbolter.hpp"
#include "class_modules/rime/talents/RimeTalentId.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::spells
{
  /// <summary>
  /// Primary builder spell. Casts a frost bolt that generates Anima
  /// and triggers Burstbolter if the talent is selected.
  /// </summary>
  class FrostBolt : public rime_spell_t
  {
  public:
    // --- Colocated Constants & Tunings ---
    static inline constexpr double     BaseDamageCoefficient = 2.017;
    static inline constexpr int        AnimaGenerated        = 3;
    static inline constexpr timespan_t BaseCastTime          = timespan_t::from_seconds( 1.5 );

    FrostBolt( util::string_view name, rime_t* player, util::string_view options = {} )
      : rime_spell_t( name, player, options )
    {
      id                 = 2;
      name_str_reporting = "Frost Bolt";

      spell_power_mod.direct = BaseDamageCoefficient;

      energize_type     = action_energize::ON_CAST;
      energize_resource = RESOURCE_ANIMA;
      energize_amount   = AnimaGenerated;

      base_execute_time = BaseCastTime;
      ability_flags |= ability_type_e::ABILITY_BASIC;
    }

    void execute() override
    {
      rime_spell_t::execute();
    }

    void impact( action_state_t* state ) override
    {
      rime_spell_t::impact( state );

      if ( p()->talents_enabled( rime_t::BURSTBOLTER ) )
      {
        if ( p()->actions.bursting_ice_tick )
          p()->actions.bursting_ice_tick->execute_on_target( state->target );
      }
    }
  };

  using frost_bolt_t = FrostBolt;
}
