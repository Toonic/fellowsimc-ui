#pragma once

#include "buff/buff.hpp"

namespace fellowship::rime::talents
{
  /// <summary>
  /// Talent: Navir's Keeper. Grants additional charges to Cold Snap.
  /// </summary>
  struct NavirsKeeper
  {
    static inline constexpr int AdditionalColdSnapCharges = 2;

    /// <summary>
    /// Creates and configures the Navir's Keeper charge tracking buff with dynamic cooldown charge adjustment.
    /// </summary>
    template <typename TPlayer>
    static buff_t* CreateBuff( TPlayer* player )
    {
      return make_buff( player, "navirs_keeper" )
        ->set_max_stack( AdditionalColdSnapCharges )
        ->set_constant_behavior( buff_constant_behavior::NEVER_CONSTANT );
    }
  };
}
