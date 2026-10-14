#pragma once

#include "class_modules/rime/RimeAction.hpp"
#include "class_modules/rime/talents/CoalescingFrostTalent.hpp"
#include "class_modules/rime/talents/SupremeTorrent.hpp"

namespace fellowship::rime::spells
{
  /// <summary>
  /// Proc explosion spell: Coalescing Frost. Detonates when target's debuff expires,
  /// reaching max stacks (30) or upon target death. Deals area damage scaling with stack count.
  /// </summary>
  class CoalescingFrostSpell : public rime_spell_t
  {
  public:
    static inline constexpr double BaseDamageCoefficient = talents::CoalescingFrostTalent::BaseDamagePerStack;

    CoalescingFrostSpell( util::string_view name, rime_t* player )
      : rime_spell_t( name, player )
    {
      id                 = 14;
      name_str_reporting = "Coalescing Frost";

      aoe                 = -1;
      reduced_aoe_targets = talents::CoalescingFrostTalent::AoeFalloffTargetCount;

      background = true;

      spell_power_mod.direct = BaseDamageCoefficient;
      if ( player->talents_enabled( rime_t::SUPREME_TORRENT ) )
      {
        spell_power_mod.direct *= 1.0 + talents::SupremeTorrent::DamageAmplification;
      }

      ability_flags |= ability_type_e::ABILITY_CORE;
    }
  };

  using coalescing_frost_t = CoalescingFrostSpell;
}
