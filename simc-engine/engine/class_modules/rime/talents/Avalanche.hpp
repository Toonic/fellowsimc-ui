#pragma once

namespace fellowship::rime::talents
{
  /// <summary>
  /// Talent: Avalanche. Gives Ice Comet a chance to trigger 2 or 3 additional comets.
  /// </summary>
  struct Avalanche
  {
    static inline constexpr double DoubleProcChance = 0.18;
    static inline constexpr double TripleProcChance = 0.09;
  };
}

