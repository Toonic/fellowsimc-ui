#pragma once

#include "util/timespan.hpp"

namespace fellowship::rime::talents
{
  /// <summary>
  /// Talent: Greater Glacial Blast. Increases Glacial Blast damage at the cost of additional cast time.
  /// </summary>
  struct GreaterGlacialBlast
  {
    static inline constexpr double     DamageAmplification = 0.4;
    static inline constexpr timespan_t AddedCastTime       = timespan_t::from_seconds( 0.5 );
  };
}

