#pragma once

#include "buff/buff.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::talents
{
  /// <summary>
  /// Talent: Frostweaver's Wrath. Consuming Winter Orbs has a chance to grant guaranteed critical strike chance.
  /// </summary>
  struct FrostweaversWrath
  {
    static inline constexpr double     ChancePerOrb              = 0.2;
    static inline constexpr timespan_t BuffDuration              = timespan_t::from_seconds( 12.0 );
    static inline constexpr double     AddedCriticalStrikeChance = 1.0;

    /// <summary>
    /// Creates and configures the Frostweaver's Wrath buff.
    /// </summary>
    static buff_t* CreateBuff( player_t* player )
    {
      return make_buff( player, "frostweaver_wrath" )
        ->set_duration( BuffDuration )
        ->set_default_value( AddedCriticalStrikeChance );
    }
  };
}
