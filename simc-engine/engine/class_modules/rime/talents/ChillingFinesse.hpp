#pragma once

#include "util/timespan.hpp"

namespace fellowship::rime::talents
{
  /// <summary>
  /// Talent: Chilling Finesse. Reduces Bursting Ice cooldown per tick and Freezing Torrent cooldown per Cold Snap.
  /// </summary>
  struct ChillingFinesse
  {
    static inline constexpr timespan_t BurstingIceCooldownReductionPerTick = timespan_t::from_seconds( 0.2 );
    static inline constexpr timespan_t BurstingIceCooldownReduction        = BurstingIceCooldownReductionPerTick;
    static inline constexpr timespan_t TorrentCooldownReductionPerColdSnap = timespan_t::from_seconds( 1.5 );
    static inline constexpr timespan_t TorrentCooldownReductionPerSnap     = TorrentCooldownReductionPerColdSnap;
  };
}

