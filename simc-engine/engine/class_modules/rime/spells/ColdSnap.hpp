#pragma once

#include "class_modules/rime/RimeAction.hpp"
#include "class_modules/rime/spells/FlightOfTheNavir.hpp"
#include "class_modules/rime/talents/ChillingFinesse.hpp"
#include "class_modules/rime/talents/GlacialAssault.hpp"
#include "class_modules/rime/talents/IcyFlow.hpp"
#include "class_modules/rime/talents/NavirsKeeper.hpp"
#include "class_modules/rime/talents/RimeTalentId.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::spells
{
  /// <summary>
  /// Cold Snap: Instant generator ability. Deals frost damage, generates a Winter Orb,
  /// triggers Glacial Assault and Icy Flow, and reduces Freezing Torrent cooldown.
  /// </summary>
  class ColdSnap : public rime_spell_t
  {
  public:
    // --- Colocated Constants & Tunings ---
    static inline constexpr double     BaseDamageCoefficient = 3.145;
    static inline constexpr timespan_t BaseCooldown          = timespan_t::from_seconds( 12.0 );
    static inline constexpr int        BaseCharges           = 2;
    static inline constexpr int        WinterOrbsGenerated   = 1;

    ColdSnap( util::string_view name, rime_t* player, util::string_view options = {} )
      : rime_spell_t( name, player, options )
    {
      id                 = 10;
      name_str_reporting = "Cold Snap";

      cooldown->duration = BaseCooldown;
      cooldown->hasted   = true;
      cooldown->charges  = BaseCharges;

      spell_power_mod.direct = BaseDamageCoefficient;

      energize_type     = action_energize::ON_CAST;
      energize_resource = RESOURCE_WINTER_ORB;
      energize_amount   = WinterOrbsGenerated;

      aoe = 1;
      if ( player->legendary.frostwyrms_spite )
      {
        reduced_aoe_targets = 3;
        full_amount_targets = 1;
      }

      ability_flags |= ability_type_e::ABILITY_BASIC;
    }

    void reset() override
    {
      cooldown->charges = BaseCharges;
      rime_spell_t::reset();
    }

    bool ready() override
    {
      if ( p()->buffs.navirs_keeper->up() )
      {
        if ( internal_cooldown->down() )
          return false;
        if ( player->is_moving() && !usable_moving() )
          return false;
        if ( !cost_affordable() )
          return false;
        if ( player->executing )
          return false;
        if ( !target_ready( target ) )
          return false;
        return true;
      }
      return rime_spell_t::ready();
    }

    void update_ready( timespan_t cdDuration ) override
    {
      if ( p()->buffs.navirs_keeper->up() )
      {
        p()->buffs.navirs_keeper->decrement();
      }
      else
      {
        rime_spell_t::update_ready( cdDuration );
      }
    }

    void execute() override
    {
      rime_spell_t::execute();

      if ( p()->legendary.frostwyrms_spite )
      {
        p()->buffs.frostwyrms_spite->expire();
      }

      if ( p()->buffs.flight_of_the_navir->check() )
      {
        for ( auto i = 0; i < FlightOfTheNavir::BirdsPerColdSnap; ++i )
        {
          p()->actions.frost_swallow->execute();
        }
      }

      if ( p()->talents_enabled( rime_t::GLACIAL_ASSAULT ) )
      {
        p()->buffs.glacial_assault->trigger();
      }

      if ( p()->talents_enabled( rime_t::ICY_FLOW ) )
      {
        p()->buffs.icy_flow->trigger();
      }

      if ( p()->talents_enabled( rime_t::CHILLING_FINESSE ) )
      {
        p()->cooldowns.freezing_torrent->adjust( -talents::ChillingFinesse::TorrentCooldownReductionPerSnap );
      }
    }

    int n_targets() const override
    {
      int targetsCount = rime_spell_t::n_targets();
      if ( p()->legendary.frostwyrms_spite )
      {
        targetsCount += p()->buffs.frostwyrms_spite->check();
      }
      return targetsCount;
    }

    double composite_da_multiplier( const action_state_t* state ) const override
    {
      double multiplier = rime_spell_t::composite_da_multiplier( state );
      if ( p()->legendary.frostwyrms_spite )
      {
        multiplier *= 1.0 + p()->buffs.frostwyrms_spite->check_stack_value();
      }
      return multiplier;
    }
  };

  using cold_snap_t = ColdSnap;
}
