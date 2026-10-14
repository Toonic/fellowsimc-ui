#pragma once

#include "class_modules/rime/RimeAction.hpp"
#include "class_modules/rime/talents/NavirsKeeper.hpp"
#include "class_modules/rime/talents/RimeTalentId.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::spells
{
  /// <summary>
  /// Flight of the Navir: Major cooldown ability. Summons a flock of frost swallows,
  /// activates Navir's buff window, and restores Cold Snap charges via Navir's Keeper.
  /// </summary>
  class FlightOfTheNavir : public rime_spell_t
  {
  public:
    // --- Colocated Constants & Tunings ---
    static inline constexpr timespan_t BaseCooldown          = timespan_t::from_seconds( 60.0 );
    static inline constexpr timespan_t BuffDuration          = timespan_t::from_seconds( 20.0 );
    static inline constexpr int        BirdsPerColdSnap      = 5;
    static inline constexpr int        BirdsPerTorrentTick   = 1;

    FlightOfTheNavir( util::string_view name, rime_t* player, util::string_view options = {} )
      : rime_spell_t( name, player, options )
    {
      id                 = 8;
      name_str_reporting = "Flight of the Navir";

      cooldown->duration = BaseCooldown;
      cooldown->hasted   = false;
      cooldown->charges  = 1;

      ability_flags |= ability_type_e::ABILITY_MAJOR;
    }

    void execute() override
    {
      p()->buffs.flight_of_the_navir->trigger();
      rime_spell_t::execute();

      if ( p()->talents_enabled( rime_t::NAVIRS_KEEPER ) )
      {
        p()->buffs.navirs_keeper->trigger( talents::NavirsKeeper::AdditionalColdSnapCharges );
      }
    }
  };

  using flight_of_the_navir_t = FlightOfTheNavir;
}
