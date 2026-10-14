#pragma once

#include "buff/buff.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::talents
{
  /// <summary>
  /// Talent: Harrowing Ice. Stacking damage modifier consumed at max stacks to reduce Flight of the Navir cooldown.
  /// </summary>
  struct HarrowingIce
  {
    static inline constexpr double     DamageMultiplierPerStack          = 0.03;
    static inline constexpr int        MaximumStacks                     = 30;
    static inline constexpr timespan_t BuffDuration                      = timespan_t::from_seconds( 12.0 );
    static inline constexpr timespan_t FlightOfTheNavirCooldownReduction = timespan_t::from_seconds( 5.0 );

    /// <summary>
    /// Creates and configures the Harrowing Ice stacking buff.
    /// </summary>
    static buff_t* CreateBuff( player_t* player )
    {
      return make_buff( player, "harrowing_ice" )
        ->set_max_stack( MaximumStacks )
        ->set_default_value( DamageMultiplierPerStack );
    }
  };
}
