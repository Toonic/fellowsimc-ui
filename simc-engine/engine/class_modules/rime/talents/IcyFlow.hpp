#pragma once

#include "buff/buff.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::talents
{
  /// <summary>
  /// Talent: Icy Flow. Cold Snap grants charges of Icy Flow, increasing the critical strike chance
  /// of next spenders (Glacial Blast, Ice Comet, Rising Talons, Talon Strike).
  /// </summary>
  struct IcyFlow
  {
    static inline constexpr timespan_t BuffDuration         = timespan_t::from_seconds( 15.0 );
    static inline constexpr double     CriticalStrikeChance = 0.20;
    static inline constexpr int        MaximumStacks        = 2;
    static inline constexpr double     TemporaryHaste       = 0.50;

    /// <summary>
    /// Creates and configures the unified Icy Flow talent buff.
    /// </summary>
    static buff_t* CreateBuff( player_t* player )
    {
      return make_buff( player, "icy_flow" )
        ->set_duration( BuffDuration )
        ->set_default_value( CriticalStrikeChance )
        ->set_max_stack( MaximumStacks );
    }

    /// <summary>
    /// Internal engine helper: tracks Glacial Blast cast execution window for Icy Flow.
    /// </summary>
    static buff_t* CreateCastHasteBuff( player_t* player )
    {
      return make_buff( player, "icy_flow_haste" )
        ->set_default_value( TemporaryHaste )
        ->set_constant_behavior( buff_constant_behavior::NEVER_CONSTANT )
        ->set_pct_buff_type( STAT_PCT_BUFF_HASTE );
    }
  };
}
