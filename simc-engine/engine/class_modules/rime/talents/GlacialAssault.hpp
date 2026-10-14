#pragma once

#include "buff/buff.hpp"

namespace fellowship::rime::talents
{
  /// <summary>
  /// Talent: Glacial Assault. Builds stacks to amplify Glacial Blast and trigger cleave damage to secondary targets.
  /// </summary>
  struct GlacialAssault
  {
    static inline constexpr int    MaximumStacks         = 4;
    static inline constexpr double DamageAmplification   = 0.4;
    static inline constexpr double CleaveMultiplier      = 0.30;
    static inline constexpr int    AoeFalloffTargetCount = 12;

    /// <summary>
    /// Creates and configures the Glacial Assault buff.
    /// </summary>
    static buff_t* CreateBuff( player_t* player )
    {
      return make_buff( player, "glacial_assault" )
        ->set_max_stack( MaximumStacks )
        ->set_default_value( DamageAmplification );
    }
  };
}
