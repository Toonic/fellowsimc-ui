// Aggregated Hero Registry
import { RIME } from "./rime.js";
import { MARA } from "./mara.js";
import { TARIQ } from "./tariq.js";
import { ARDEOS } from "./ardeos.js";
import { ELARION } from "./elarion.js";
import { GUNDE } from "./gunde.js";
import { AEONA } from "./aeona.js";
import { XAVIAN } from "./xavian.js";
import { HELENA } from "./helena.js";
import { MEIKO } from "./meiko.js";
import { SYLVIE } from "./sylvie.js";
import { VIGOUR } from "./vigour.js";

export const MAX_TALENT_POINTS = 14;

export const ALL_HEROES = [
  RIME, MARA, TARIQ, ARDEOS, ELARION, GUNDE, AEONA, XAVIAN,
  HELENA, MEIKO, SYLVIE, VIGOUR
];

export const HERO_DEFINITIONS = Object.fromEntries(
  ALL_HEROES.map(h => [h.id, {
    name: h.name,
    color: h.color,
    primaryStat: h.primaryStat,
    simcClass: h.simcClass,
    implemented: h.implemented
  }])
);

export const HERO_LEGENDARIES = Object.fromEntries(
  ALL_HEROES.map(h => [h.id, h.legendaries || []])
);

export const ALL_HERO_TALENTS = Object.fromEntries(
  ALL_HEROES.map(h => [h.id, {
    hero: h.name,
    tiers: Array.isArray(h.talents) ? h.talents : (h.talents?.tiers || [])
  }])
);
