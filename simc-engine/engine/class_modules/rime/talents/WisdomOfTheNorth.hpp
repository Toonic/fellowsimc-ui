#pragma once

#include "util/timespan.hpp"

namespace fellowship::rime::talents
{
  /// <summary>
  /// Talent: Wisdom of the North. Reduces active ability cooldowns when abilities hit or tick.
  /// </summary>
  struct WisdomOfTheNorth
  {
    static inline constexpr timespan_t CooldownReduction = timespan_t::from_seconds( 0.3 );
  };
}

