#pragma once

#include "class_modules/rime/RimeAction.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::spells
{
  /// <summary>
  /// Ice Blitz: Major damage amplification cooldown. Grants a haste / damage buff
  /// and triggers Cascading Blitz swallows.
  /// </summary>
  class IceBlitz : public rime_spell_t
  {
  public:
    // --- Colocated Constants & Tunings ---
    static inline constexpr timespan_t BaseCooldown          = timespan_t::from_seconds( 60.0 );
    static inline constexpr double     DamageAmplification   = 0.2;
    static inline constexpr timespan_t ExtensionPerBirdPulse = timespan_t::from_seconds( 0.1 );

    IceBlitz( util::string_view name, rime_t* player, util::string_view options = {} )
      : rime_spell_t( name, player, options )
    {
      id                 = 6;
      name_str_reporting = "Ice Blitz";

      trigger_gcd = timespan_t::zero();

      cooldown->duration = BaseCooldown;
      cooldown->hasted   = false;
      cooldown->charges  = 1;

      ability_flags |= ability_type_e::ABILITY_MAJOR;
    }

    void execute() override
    {
      p()->buffs.ice_blitz->trigger();
      rime_spell_t::execute();
    }
  };

  using ice_blitz_t = IceBlitz;
}
