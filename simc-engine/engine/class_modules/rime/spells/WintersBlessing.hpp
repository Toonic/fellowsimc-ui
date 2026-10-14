#pragma once

#include "class_modules/rime/RimeAction.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::spells
{
  /// <summary>
  /// Winter's Blessing: Major cooldown ability granting increased Mastery
  /// and generating Undulating Spirit stacks if legendary power is equipped.
  /// </summary>
  class WintersBlessing : public rime_spell_t
  {
  public:
    // --- Colocated Constants & Tunings ---
    static inline constexpr timespan_t BaseCooldown        = timespan_t::from_seconds( 60.0 );
    static inline constexpr timespan_t BuffDuration        = timespan_t::from_seconds( 20.0 );
    static inline constexpr double     MasteryPercentBonus = 0.20;

    WintersBlessing( util::string_view name, rime_t* player, util::string_view options = {} )
      : rime_spell_t( name, player, options )
    {
      id                 = 7;
      name_str_reporting = "Winters Blessing";

      trigger_gcd = timespan_t::zero();

      cooldown->duration = BaseCooldown;
      cooldown->hasted   = false;
      cooldown->charges  = 1;

      ability_flags |= ability_type_e::ABILITY_MAJOR;
    }

    void execute() override
    {
      p()->buffs.winters_blessing->trigger();
      rime_spell_t::execute();

      if ( p()->legendary.undulating_spirit )
      {
        p()->buffs.undulating_spirit->trigger( p()->legendary.undulating_spirit_stacks );
      }
    }
  };

  using winters_blessing_t = WintersBlessing;
}
