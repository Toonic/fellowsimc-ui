#pragma once

namespace fellowship::rime::talents
{
  /// <summary>
  /// Talent: Burstbolter. Causes Frost Bolt to trigger an additional pulse of Bursting Ice.
  /// </summary>
  struct Burstbolter
  {
    static inline constexpr int    AdditionalPulses         = 1;
    static inline constexpr double BurstingIceAmplification = 0.2;
  };
}

