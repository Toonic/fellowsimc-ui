#pragma once

#include "buff/buff.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::talents
{
  /// <summary>
  /// Talent: Soulfrost Torrent. Enhances Freezing Torrent with faster tick rates and guaranteed critical strikes via RPPM procs.
  /// </summary>
  struct SoulfrostTorrent
  {
    static inline constexpr timespan_t BuffDuration         = timespan_t::from_seconds( 18.0 );
    static inline constexpr double     TickRateIncrease          = 1.4;
    static inline constexpr double     TickrateMultiplier        = TickRateIncrease;
    static inline constexpr double     CriticalStrikeChance      = 1.0;
    static inline constexpr double     CriticalStrikeChanceBonus = CriticalStrikeChance;
    static inline constexpr double     RealProcsPerMinute        = 1.2;

    /// <summary>
    /// Creates and configures the Soulfrost Torrent proc buff.
    /// </summary>
    static buff_t* CreateBuff( player_t* player )
    {
      return make_buff( player, "soulfrost_torrent" )
        ->set_duration( BuffDuration )
        ->set_default_value( CriticalStrikeChance );
    }
  };
}
