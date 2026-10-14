#pragma once

#include "class_modules/rime/RimeAction.hpp"
#include "class_modules/rime/talents/Burstbolter.hpp"
#include "class_modules/rime/talents/HarrowingIce.hpp"
#include "class_modules/rime/talents/RimeTalentId.hpp"
#include "util/timespan.hpp"

namespace fellowship::rime::spells
{
  /// <summary>
  /// Bursting Ice Tick: Periodic or triggered pulse of Bursting Ice.
  /// Deals AoE damage, generates Anima, and builds Harrowing Ice stacks.
  /// </summary>
  class BurstingIceTick : public rime_spell_t
  {
  public:
    static inline constexpr double BaseDamageCoefficient = 0.498;
    static inline constexpr int    AnimaGenerated        = 1;
    static inline constexpr double AoeFalloffTargetCount = 5.0;

    bool is_main_spell = false;

    BurstingIceTick( rime_t* player )
      : rime_spell_t( "bursting_ice_tick", player ), is_main_spell( true )
    {
      id                 = 11;
      name_str_reporting = "Bursting Ice";
      set_school( SCHOOL_FROST );

      aoe                 = -1;
      reduced_aoe_targets = AoeFalloffTargetCount;
      background          = true;

      spell_power_mod.direct = BaseDamageCoefficient;
      spell_power_mod.tick   = BaseDamageCoefficient;

      energize_type = action_energize::NONE;

      ability_flags |= ability_type_e::ABILITY_CORE;
    }

    double composite_da_multiplier( const action_state_t* state ) const override
    {
      double multiplier = base_t::composite_da_multiplier( state );

      if ( parent_dot )
      {
        multiplier *= parent_dot->get_tick_factor();
      }

      if ( p()->talents_enabled( rime_t::BURSTBOLTER ) )
      {
        multiplier *= 1.0 + talents::Burstbolter::BurstingIceAmplification;
      }

      multiplier *= 1.0 + p()->buffs.harrowing_ice->check_stack_value();
      return multiplier;
    }

    size_t available_targets( std::vector<player_t*>& targetList ) const override
    {
      base_t::available_targets( targetList );
      return targetList.size();
    }

    void execute() override
    {
      if ( pre_execute_state )
      {
        if ( pre_execute_state->spell_power == 0 )
          pre_execute_state->spell_power = composite_total_spell_power();
        if ( pre_execute_state->crit_chance == 0 )
          pre_execute_state->crit_chance = composite_crit_chance() * composite_crit_chance_multiplier();
      }
      base_t::execute();
      p()->resource_gain( RESOURCE_ANIMA, AnimaGenerated, nullptr, this );

      if ( p()->talents_enabled( rime_t::HARROWING_ICE ) )
      {
        if ( p()->buffs.harrowing_ice->at_max_stacks() )
        {
          p()->cooldowns.flight_of_the_navir->adjust( -talents::HarrowingIce::FlightOfTheNavirCooldownReduction );
          p()->buffs.harrowing_ice->expire();
        }
        else
        {
          p()->buffs.harrowing_ice->trigger();
        }
      }
    }
  };

  using bursting_ice_tick_t = BurstingIceTick;

  /// <summary>
  /// Sustained ground AoE: Bursting Ice. Pulses periodic ticks, granting Winter's Embrace.
  /// </summary>
  class BurstingIce : public rime_spell_t
  {
  public:
    // --- Colocated Constants & Tunings ---
    static inline constexpr timespan_t BaseCastTime = timespan_t::from_seconds( 2.0 );
    static inline constexpr timespan_t BaseDuration = timespan_t::from_seconds( 3.0 );
    static inline constexpr timespan_t BasePeriod   = timespan_t::from_seconds( 0.5 );
    static inline constexpr timespan_t BaseCooldown = timespan_t::from_seconds( 10.0 );

    using bursting_ice_tick_t = BurstingIceTick;

    BurstingIce( util::string_view name, rime_t* player, util::string_view options = {} )
      : rime_spell_t( name, player, options )
    {
      id                 = 12;
      name_str_reporting = "Bursting Ice";

      player->actions.bursting_ice = this;

      if ( !player->actions.bursting_ice_tick )
      {
        player->actions.bursting_ice_tick = new BurstingIceTick( player );
      }
      tick_action = player->actions.bursting_ice_tick;
      add_child( tick_action );

      base_execute_time = BaseCastTime;
      dot_duration      = BaseDuration;

      if ( player->legendary.skandis_decree )
      {
        dot_duration += player->legendary.skandis_decree_duration_bonus;
      }

      base_tick_time         = BasePeriod;
      hasted_ticks           = true;
      hasted_dot_duration    = false;
      dot_allow_partial_tick = true;
      update_flags          |= STATE_HASTE;

      cooldown->duration = BaseCooldown;
      cooldown->hasted   = false;
      cooldown->charges  = 1;

      ability_flags |= ability_type_e::ABILITY_CORE;
    }

    void init() override
    {
      rime_spell_t::init();
      if ( tick_action )
      {
        tick_action->init();
      }
    }

    void execute() override
    {
      base_t::execute();
      p()->buffs.winters_embrace->trigger();
    }

    void tick( dot_t* dot ) override
    {
      if ( tick_action )
      {
        tick_action->target_cache.is_valid = false;
      }

      base_t::tick( dot );
    }

    void last_tick( dot_t* dot ) override
    {
      base_t::last_tick( dot );
    }
  };

  using bursting_ice_t      = BurstingIce;
  using bursting_ice_tick_t = BurstingIceTick;
}
