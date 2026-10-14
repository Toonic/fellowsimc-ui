#pragma once

#include "class_modules/rime/RimeAction.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::spells
{
  /// <summary>
  /// Ultimate Spirit ability: Wrath of Winter. Consumes 100 Spirit, activating Spirit of Heroism
  /// and the Wrath of Winter ultimate damage amplification window.
  /// </summary>
  class WrathOfWinter : public rime_spell_t
  {
  public:
    // --- Colocated Constants & Tunings ---
    static inline constexpr timespan_t BaseCastTime   = timespan_t::from_seconds( 1.5 );
    static inline constexpr int        SpiritCost     = 100;
    static inline constexpr timespan_t WindowDuration = timespan_t::from_seconds( 20.0 );
    static inline constexpr timespan_t WindowPeriod   = timespan_t::from_seconds( 4.0 );
    static inline constexpr double     DamageAmplification = 0.20;

    WrathOfWinter( util::string_view name, rime_t* player, util::string_view options = {} )
      : rime_spell_t( name, player, options )
    {
      id                 = 9;
      name_str_reporting = "Wrath of Winter";

      base_execute_time = BaseCastTime;

      resource_current              = RESOURCE_SPIRIT;
      base_costs[ RESOURCE_SPIRIT ] = SpiritCost;

      ability_flags |= ability_type_e::ABILITY_SPIRIT;
    }

    void execute() override
    {
      rime_spell_t::execute();
      p()->fs_buffs.spirit_of_heroism->trigger();
      p()->buffs.ultimate_buff_window->trigger();
      p()->used_ultimate();
    }
  };

  using wrath_of_winter_t = WrathOfWinter;
}
