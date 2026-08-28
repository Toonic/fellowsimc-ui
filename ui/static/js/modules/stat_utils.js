// ============================================================================
// Fellowship Stat Calculations & Diminishing Returns (DR) Formulas
// ============================================================================

export function applyFellowDR(percent) {
  const breakPoints = [0.10, 0.15, 0.20, 0.25];
  const breakPointMultipliers = [1, 0.98, 0.96 * 0.98, 0.94 * 0.96 * 0.98, 0.92 * 0.94 * 0.96 * 0.98];

  if (percent <= breakPoints[0]) {
    return percent * breakPointMultipliers[0];
  }

  let out = breakPoints[0] * breakPointMultipliers[0];
  let rem = percent - out;

  let currentBreakpoint = out;
  let previousBreakpoint = 0.0;
  let i = 1;

  for (; i < breakPoints.length; i++) {
    previousBreakpoint = currentBreakpoint;
    currentBreakpoint += (breakPoints[i] - breakPoints[i - 1]) / breakPointMultipliers[i];
    const diff = currentBreakpoint - previousBreakpoint;
    if (rem <= diff) {
      out += rem * breakPointMultipliers[i];
      return out;
    } else {
      out += diff * breakPointMultipliers[i];
      rem -= diff;
    }
  }

  if (rem > 0) {
    out += rem * breakPointMultipliers[i];
  }

  return out;
}

export function calculateSheetStats(critRating, hasteRating, expRating, spiritRating) {
  const coeff = 0.0016;
  const critDR = applyFellowDR((critRating || 0) * coeff);
  const hasteDR = applyFellowDR((hasteRating || 0) * coeff);
  const expDR = applyFellowDR((expRating || 0) * coeff);
  const spiritDR = applyFellowDR((spiritRating || 0) * coeff);

  return {
    critPct: (critDR + 0.05) * 100, // includes base 5%
    hastePct: hasteDR * 100,
    expPct: expDR * 100,
    spiritPct: spiritDR * 100
  };
}

