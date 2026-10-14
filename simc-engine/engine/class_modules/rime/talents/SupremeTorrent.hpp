#pragma once

#include "util/timespan.hpp"

namespace fellowship::rime::talents
{
  /// <summary>
  /// Talent: Supreme Torrent. Condenses Freezing Torrent channel duration while amplifying its damage.
  /// </summary>
  struct SupremeTorrent
  {
    static inline constexpr timespan_t BonusDuration            = timespan_t::from_seconds( 0.8 );
    static inline constexpr timespan_t ChannelDurationReduction = BonusDuration;
    static inline constexpr double     DamageAmplification      = 0.2;
  };
}

